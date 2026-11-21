/**
 * The club's database: one SQLite file on the server (data/club.db), no outside service.
 *
 * Documents are stored as JSON, one row per document, with the small part of the Firestore API that the
 * routes were written against: collections and documents, where / orderBy / limit, batches, transactions,
 * getAll and the FieldValue helpers. So the data keeps exactly the shape it had in Firestore (and could be
 * imported from it unchanged, see importFirebase.ts).
 *
 * Transactions work like Firestore's: their reads are checked again when they commit, and the whole
 * function runs again if a document it read was changed meanwhile.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import 'dotenv/config';

/** Everything the server keeps: the database and the uploaded images (back it up, keep it out of git) */
export const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.DATA_DIR || 'data');
export const DB_FILE = path.join(DATA_DIR, 'club.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
const sql = new DatabaseSync(DB_FILE);
sql.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS docs (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  ) WITHOUT ROWID;
`);

const q = {
  one: sql.prepare('SELECT data, rev FROM docs WHERE collection = ? AND id = ?'),
  rev: sql.prepare('SELECT rev FROM docs WHERE collection = ? AND id = ?'),
  put: sql.prepare(
    `INSERT INTO docs (collection, id, data, rev, updated_at) VALUES (?, ?, ?, 1, ?)
     ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, rev = docs.rev + 1, updated_at = excluded.updated_at`
  ),
  del: sql.prepare('DELETE FROM docs WHERE collection = ? AND id = ?')
};

// ---------- values ----------

export type DocumentData = Record<string, any>;

type SentinelKind = 'delete' | 'serverTimestamp' | 'arrayUnion' | 'arrayRemove' | 'increment';
class Sentinel {
  constructor(
    readonly kind: SentinelKind,
    readonly values: unknown[] = []
  ) {}
}

/** Special values for set / update, like Firestore's */
export const FieldValue = {
  delete: () => new Sentinel('delete'),
  serverTimestamp: () => new Sentinel('serverTimestamp'),
  arrayUnion: (...values: unknown[]) => new Sentinel('arrayUnion', values),
  arrayRemove: (...values: unknown[]) => new Sentinel('arrayRemove', values),
  increment: (n: number) => new Sentinel('increment', [n])
};

/** A field inside nested maps (`new FieldPath('stock', 'M')`), or the document id */
export class FieldPath {
  readonly segments: string[];
  constructor(...segments: string[]) {
    if (!segments.length || segments.some((s) => !s)) throw new Error('A field path needs non-empty names.');
    this.segments = segments;
  }
  static documentId() {
    return DOCUMENT_ID;
  }
}
const DOCUMENT_ID = new FieldPath('__name__');

/** Errors carry Firestore's codes, which the routes check (6 = already exists) */
export class DbError extends Error {
  constructor(
    readonly code: number,
    message: string
  ) {
    super(message);
  }
}
const NOT_FOUND = 5;
const ALREADY_EXISTS = 6;
const ABORTED = 10;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Sentinel) && !(v instanceof Date) && !(v instanceof FieldPath);

const same = (a: unknown, b: unknown) => a === b || (typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));

/** A value as it is stored: dates become ISO strings, undefined disappears, special values are applied to `before` */
function resolve(value: unknown, before: unknown): unknown {
  if (value instanceof Sentinel) {
    switch (value.kind) {
      case 'serverTimestamp':
        return new Date().toISOString();
      case 'increment':
        return (typeof before === 'number' ? before : 0) + (value.values[0] as number);
      case 'arrayUnion': {
        const list = Array.isArray(before) ? [...before] : [];
        for (const v of value.values) if (!list.some((x) => same(x, v))) list.push(resolve(v, undefined));
        return list;
      }
      case 'arrayRemove':
        return Array.isArray(before) ? before.filter((x) => !value.values.some((v) => same(x, v))) : [];
      case 'delete':
        return undefined;
    }
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : resolve(v, undefined)));
  if (isPlainObject(value)) {
    const out: DocumentData = {};
    for (const [k, v] of Object.entries(value)) {
      const r = resolve(v, undefined);
      if (r !== undefined) out[k] = r;
    }
    return out;
  }
  return value;
}

/** set(…, { merge: true }): nested maps are merged, other values replace what was there */
function merge(target: DocumentData, data: DocumentData): DocumentData {
  const out: DocumentData = { ...target };
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = merge(out[k], v);
    else {
      const r = resolve(v, out[k]);
      if (r === undefined) delete out[k];
      else out[k] = r;
    }
  }
  return out;
}

const segmentsOf = (field: string | FieldPath) => (field instanceof FieldPath ? field.segments : field.split('.'));

function readPath(data: DocumentData | undefined, segments: string[]): unknown {
  let v: unknown = data;
  for (const s of segments) {
    if (!isPlainObject(v)) return undefined;
    v = v[s];
  }
  return v;
}

/** update(): each key is a field path ('a.b' or a FieldPath); its value replaces that field */
function writePath(data: DocumentData, segments: string[], value: unknown) {
  let obj = data;
  for (const s of segments.slice(0, -1)) {
    if (!isPlainObject(obj[s])) obj[s] = {};
    obj = obj[s];
  }
  const last = segments[segments.length - 1];
  const r = resolve(value, obj[last]);
  if (r === undefined) delete obj[last];
  else obj[last] = r;
}

// ---------- reads ----------

export class DocumentSnapshot<T = DocumentData> {
  constructor(
    readonly ref: DocumentReference<T>,
    protected readonly raw: DocumentData | undefined,
    /** Version of the document when it was read (0: it didn't exist), for transactions */
    readonly rev = 0
  ) {}
  get id() {
    return this.ref.id;
  }
  get exists() {
    return this.raw !== undefined;
  }
  data(): T | undefined {
    return this.raw as T | undefined;
  }
  get(field: string | FieldPath): any {
    return readPath(this.raw, segmentsOf(field));
  }
}

export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
  data(): T {
    return this.raw as T;
  }
}

export class QuerySnapshot<T = DocumentData> {
  constructor(readonly docs: QueryDocumentSnapshot<T>[]) {}
  get size() {
    return this.docs.length;
  }
  get empty() {
    return this.docs.length === 0;
  }
  forEach(fn: (doc: QueryDocumentSnapshot<T>) => void) {
    this.docs.forEach(fn);
  }
}

function readDoc<T>(ref: DocumentReference<T>): DocumentSnapshot<T> {
  const row = q.one.get(ref.parent.id, ref.id) as { data: string; rev: number } | undefined;
  return new DocumentSnapshot(ref, row ? JSON.parse(row.data) : undefined, row?.rev ?? 0);
}

type WhereOp = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';
interface Filter {
  field: FieldPath;
  op: WhereOp;
  value: any;
}

const comparable = (a: unknown, b: unknown) => typeof a === typeof b && (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean');

function matches(id: string, data: DocumentData, f: Filter): boolean {
  const isId = f.field === DOCUMENT_ID;
  const v = isId ? id : readPath(data, f.field.segments);
  // Like Firestore, a document without the field never matches
  if (v === undefined) return false;
  switch (f.op) {
    case '==':
      return same(v, f.value);
    case '!=':
      return !same(v, f.value);
    case '<':
      return comparable(v, f.value) && (v as never) < f.value;
    case '<=':
      return comparable(v, f.value) && (v as never) <= f.value;
    case '>':
      return comparable(v, f.value) && (v as never) > f.value;
    case '>=':
      return comparable(v, f.value) && (v as never) >= f.value;
    case 'in':
      return (f.value as unknown[]).some((x) => same(v, x));
    case 'not-in':
      return !(f.value as unknown[]).some((x) => same(v, x));
    case 'array-contains':
      return Array.isArray(v) && v.some((x) => same(x, f.value));
    case 'array-contains-any':
      return Array.isArray(v) && v.some((x) => (f.value as unknown[]).some((y) => same(x, y)));
  }
}

const SIMPLE_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class Query<T = DocumentData> {
  constructor(
    readonly collectionId: string,
    protected readonly filters: Filter[] = [],
    protected readonly order: { field: FieldPath; desc: boolean }[] = [],
    protected readonly max?: number
  ) {}

  where(field: string | FieldPath, op: WhereOp, value: unknown): Query<T> {
    const fp = field instanceof FieldPath ? field : new FieldPath(...field.split('.'));
    return new Query(this.collectionId, [...this.filters, { field: fp, op, value }], this.order, this.max);
  }
  orderBy(field: string | FieldPath, direction: 'asc' | 'desc' = 'asc'): Query<T> {
    const fp = field instanceof FieldPath ? field : new FieldPath(...field.split('.'));
    return new Query(this.collectionId, this.filters, [...this.order, { field: fp, desc: direction === 'desc' }], this.max);
  }
  limit(n: number): Query<T> {
    return new Query(this.collectionId, this.filters, this.order, n);
  }

  /** Runs the query now (synchronous: SQLite reads don't wait) */
  run(): QueryDocumentSnapshot<T>[] {
    // The simple filters narrow the rows in SQL; every filter is checked again on the parsed documents
    let where = 'collection = ?';
    const params: (string | number)[] = [this.collectionId];
    for (const f of this.filters) {
      const key = f.field.segments[0];
      if (f.field === DOCUMENT_ID && f.op === '==' && typeof f.value === 'string') {
        where += ' AND id = ?';
        params.push(f.value);
      } else if (f.field === DOCUMENT_ID && f.op === 'in' && Array.isArray(f.value) && f.value.length && f.value.every((x) => typeof x === 'string')) {
        where += ` AND id IN (${f.value.map(() => '?').join(',')})`;
        params.push(...f.value);
      } else if (f.field.segments.length === 1 && SIMPLE_KEY.test(key) && f.op === '==' && (typeof f.value === 'string' || typeof f.value === 'number')) {
        where += ` AND json_extract(data, '$.${key}') = ?`;
        params.push(f.value);
      } else if (f.field.segments.length === 1 && SIMPLE_KEY.test(key) && f.op === 'array-contains' && typeof f.value === 'string') {
        where += ` AND EXISTS (SELECT 1 FROM json_each(data, '$.${key}') WHERE value = ?)`;
        params.push(f.value);
      }
    }
    const rows = sql.prepare(`SELECT id, data, rev FROM docs WHERE ${where} ORDER BY id`).all(...params) as { id: string; data: string; rev: number }[];
    const col = new CollectionReference<T>(this.collectionId);
    let docs = rows
      .map((r) => ({ id: r.id, data: JSON.parse(r.data) as DocumentData, rev: r.rev }))
      .filter((d) => this.filters.every((f) => matches(d.id, d.data, f)));
    if (this.order.length) {
      // Like Firestore, documents without the ordered field are left out
      docs = docs.filter((d) => this.order.every((o) => o.field === DOCUMENT_ID || readPath(d.data, o.field.segments) !== undefined));
      docs.sort((a, b) => {
        for (const o of this.order) {
          const va = o.field === DOCUMENT_ID ? a.id : (readPath(a.data, o.field.segments) as never);
          const vb = o.field === DOCUMENT_ID ? b.id : (readPath(b.data, o.field.segments) as never);
          if (va < vb) return o.desc ? 1 : -1;
          if (va > vb) return o.desc ? -1 : 1;
        }
        return 0;
      });
    }
    if (this.max !== undefined) docs = docs.slice(0, this.max);
    return docs.map((d) => new QueryDocumentSnapshot(col.doc(d.id), d.data, d.rev));
  }

  async get(): Promise<QuerySnapshot<T>> {
    return new QuerySnapshot(this.run());
  }
}

const AUTO_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
/** 20 random letters and digits, like Firestore's automatic ids */
function autoId() {
  const bytes = crypto.randomBytes(20);
  let id = '';
  for (const b of bytes) id += AUTO_ID_CHARS[b % AUTO_ID_CHARS.length];
  return id;
}

export class CollectionReference<T = DocumentData> extends Query<T> {
  constructor(readonly id: string) {
    super(id);
    if (!id || id.includes('/')) throw new Error(`Invalid collection name "${id}".`);
  }
  doc(id: string = autoId()): DocumentReference<T> {
    return new DocumentReference<T>(this, id);
  }
  async add(data: DocumentData): Promise<DocumentReference<T>> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

// ---------- writes ----------

type Write =
  | { kind: 'set'; ref: DocumentReference<any>; data: DocumentData; merge: boolean }
  | { kind: 'update'; ref: DocumentReference<any>; fields: [string[], unknown][] }
  | { kind: 'create'; ref: DocumentReference<any>; data: DocumentData }
  | { kind: 'delete'; ref: DocumentReference<any> };

/** update(data) or update(field, value, field, value…) */
function updateFields(args: unknown[]): [string[], unknown][] {
  if (args.length === 1 && isPlainObject(args[0])) return Object.entries(args[0]).filter(([, v]) => v !== undefined).map(([k, v]) => [k.split('.'), v]);
  const out: [string[], unknown][] = [];
  for (let i = 0; i + 1 < args.length; i += 2) out.push([segmentsOf(args[i] as string | FieldPath), args[i + 1]]);
  return out;
}

/** Applies writes atomically; with `reads`, first checks that none of the documents read has changed since */
function commit(writes: Write[], reads?: Map<string, { ref: DocumentReference<any>; rev: number }>) {
  const now = new Date().toISOString();
  sql.exec('BEGIN IMMEDIATE');
  try {
    if (reads) {
      for (const { ref, rev } of reads.values()) {
        const row = q.rev.get(ref.parent.id, ref.id) as { rev: number } | undefined;
        if ((row?.rev ?? 0) !== rev) throw new DbError(ABORTED, 'A document changed during the transaction.');
      }
    }
    for (const w of writes) {
      const { parent, id } = w.ref;
      if (w.kind === 'delete') {
        q.del.run(parent.id, id);
        continue;
      }
      const before = q.one.get(parent.id, id) as { data: string } | undefined;
      let data: DocumentData;
      if (w.kind === 'create') {
        if (before) throw new DbError(ALREADY_EXISTS, `Document already exists: ${parent.id}/${id}`);
        data = resolve(w.data, undefined) as DocumentData;
      } else if (w.kind === 'set') {
        data = w.merge ? merge(before ? JSON.parse(before.data) : {}, w.data) : (resolve(w.data, undefined) as DocumentData);
      } else {
        if (!before) throw new DbError(NOT_FOUND, `No document to update: ${parent.id}/${id}`);
        data = JSON.parse(before.data);
        for (const [segments, value] of w.fields) writePath(data, segments, value);
      }
      q.put.run(parent.id, id, JSON.stringify(data), now);
    }
    sql.exec('COMMIT');
  } catch (err) {
    sql.exec('ROLLBACK');
    throw err;
  }
}

export class DocumentReference<T = DocumentData> {
  constructor(
    readonly parent: CollectionReference<T>,
    readonly id: string
  ) {
    if (!id || id.includes('/')) throw new Error(`Invalid document id "${id}".`);
  }
  get path() {
    return `${this.parent.id}/${this.id}`;
  }
  async get(): Promise<DocumentSnapshot<T>> {
    return readDoc(this);
  }
  async set(data: DocumentData, options?: { merge?: boolean }) {
    commit([{ kind: 'set', ref: this, data, merge: !!options?.merge }]);
  }
  async update(...args: unknown[]) {
    commit([{ kind: 'update', ref: this, fields: updateFields(args) }]);
  }
  async create(data: DocumentData) {
    commit([{ kind: 'create', ref: this, data }]);
  }
  async delete() {
    commit([{ kind: 'delete', ref: this }]);
  }
}

export class WriteBatch {
  protected writes: Write[] = [];
  set(ref: DocumentReference<any>, data: DocumentData, options?: { merge?: boolean }) {
    this.writes.push({ kind: 'set', ref, data, merge: !!options?.merge });
    return this;
  }
  update(ref: DocumentReference<any>, ...args: unknown[]) {
    this.writes.push({ kind: 'update', ref, fields: updateFields(args) });
    return this;
  }
  create(ref: DocumentReference<any>, data: DocumentData) {
    this.writes.push({ kind: 'create', ref, data });
    return this;
  }
  delete(ref: DocumentReference<any>) {
    this.writes.push({ kind: 'delete', ref });
    return this;
  }
  async commit() {
    commit(this.writes);
  }
}

export class Transaction extends WriteBatch {
  readonly reads = new Map<string, { ref: DocumentReference<any>; rev: number }>();
  get<T>(target: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
  get<T>(target: Query<T>): Promise<QuerySnapshot<T>>;
  async get<T>(target: DocumentReference<T> | Query<T>): Promise<DocumentSnapshot<T> | QuerySnapshot<T>> {
    if (target instanceof DocumentReference) {
      const snap = readDoc(target);
      this.reads.set(target.path, { ref: target, rev: snap.rev });
      return snap;
    }
    const docs = target.run();
    for (const d of docs) this.reads.set(d.ref.path, { ref: d.ref, rev: d.rev });
    return new QuerySnapshot(docs);
  }
  async getAll(...refs: DocumentReference<any>[]): Promise<DocumentSnapshot[]> {
    return Promise.all(refs.map((r) => this.get(r)));
  }
  /** @internal */
  apply() {
    commit(this.writes, this.reads);
  }
}

export const db = {
  collection: <T = DocumentData>(name: string) => new CollectionReference<T>(name),
  batch: () => new WriteBatch(),
  async getAll(...refs: DocumentReference<any>[]): Promise<DocumentSnapshot[]> {
    return refs.map((r) => readDoc(r));
  },
  /** Runs `fn` and commits its writes; runs it again (up to 5 times) when a document it read changed meanwhile */
  async runTransaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R> {
    for (let attempt = 1; ; attempt++) {
      const tx = new Transaction();
      const result = await fn(tx);
      try {
        tx.apply();
        return result;
      } catch (err) {
        if (err instanceof DbError && err.code === ABORTED && attempt < 5) continue;
        throw err;
      }
    }
  }
};

// ---------- upkeep ----------

/** Drops rate-limit counters whose window ended more than a day ago */
export function purgeExpired() {
  sql.prepare(`DELETE FROM docs WHERE collection = 'rate_limits' AND json_extract(data, '$.expireAt') < ?`).run(Date.now());
}

/** A consistent copy of the database into `file` (safe while the server runs) */
export function backupTo(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) fs.rmSync(file);
  sql.prepare('VACUUM INTO ?').run(file);
}

/** Number of documents (the import refuses to write into a database that already has some) */
export const documentCount = () => (sql.prepare('SELECT COUNT(*) AS n FROM docs').get() as { n: number }).n;

/** Writes many documents in one go (import) */
export function importDocuments(docs: { collection: string; id: string; data: DocumentData }[], { replace = false } = {}) {
  const now = new Date().toISOString();
  sql.exec('BEGIN IMMEDIATE');
  try {
    if (replace) sql.exec('DELETE FROM docs');
    for (const d of docs) q.put.run(d.collection, d.id, JSON.stringify(d.data), now);
    sql.exec('COMMIT');
  } catch (err) {
    sql.exec('ROLLBACK');
    throw err;
  }
}
