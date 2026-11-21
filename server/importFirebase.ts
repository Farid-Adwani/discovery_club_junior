// One-time move from Firebase to the server's own database and disk:
//
//   npm run import:firebase              (stops if the local database already has data)
//   npm run import:firebase -- --replace (empties the local database first)
//
// Reads every Firestore collection and every image of Firebase Storage the documents point to
// (Firebase itself is never changed) and writes them to data/club.db and data/uploads.
// Needs the Firebase key in .env (FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON).
import crypto from 'crypto';
import { DocumentReference as FirestoreRef, GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { firestore, storageBucket } from './firebaseAdmin.js';
import { DB_FILE, documentCount, importDocuments, type DocumentData } from './db.js';
import { UPLOAD_DIR, saveUpload } from './storage.js';

const replace = process.argv.includes('--replace');
if (documentCount() > 0 && !replace) {
  console.error(`${DB_FILE} already has data. Run with --replace to empty it and import again.`);
  process.exit(1);
}

const bucket = storageBucket();
const PREFIXES = [`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/`, `https://storage.googleapis.com/${bucket.name}/`];
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const SAFE_PATH = /^(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.(?:jpe?g|png|webp|svg)$/i;
const EXT: Record<string, string> = { jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp', svg: 'svg' };

/** Object path in the bucket when the string is a link to one of our Firebase uploads */
function storagePath(value: string): string | null {
  const prefix = PREFIXES.find((p) => value.startsWith(p));
  return prefix ? decodeURIComponent(value.slice(prefix.length).split('?')[0]) : null;
}

const links = new Set<string>(); // Firebase Storage links found in the documents
const inline = new Set<string>(); // images still stored inside a document as a data URL

/** Firestore values as plain JSON (dates become ISO strings), noting the images to bring over */
function plain(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof GeoPoint) return { latitude: v.latitude, longitude: v.longitude };
  if (v instanceof FirestoreRef) return v.path;
  if (v instanceof Uint8Array) return Buffer.from(v).toString('base64');
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  if (typeof v === 'string') {
    if (storagePath(v)) links.add(v);
    else if (DATA_URL.test(v)) inline.add(v);
  }
  return v;
}

function swap(v: unknown, map: Map<string, string>): unknown {
  if (Array.isArray(v)) return v.map((x) => swap(x, map));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x, map)]));
  return typeof v === 'string' && map.has(v) ? map.get(v) : v;
}

/** Runs `fn` on every item, `n` at a time */
async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

// 1. Every collection and document
const docs: { collection: string; id: string; data: DocumentData }[] = [];
const collections = await firestore.listCollections();
for (const col of collections) {
  const snap = await col.get();
  for (const d of snap.docs) docs.push({ collection: col.id, id: d.id, data: plain(d.data()) as DocumentData });
  console.log(`  ${col.id}: ${snap.size} documents`);
}

// 2. The images, from Firebase Storage to data/uploads (same names when they are simple ones)
const map = new Map<string, string>();
let missing = 0;
await pool([...links], 8, async (url) => {
  const objectPath = storagePath(url)!;
  try {
    const [bytes] = await bucket.file(objectPath).download();
    const ext = (objectPath.split('.').pop() || 'jpg').toLowerCase();
    const rel = SAFE_PATH.test(objectPath) ? objectPath : `imported/${crypto.randomUUID()}.${EXT[ext] || 'jpg'}`;
    map.set(url, await saveUpload(rel, bytes));
  } catch (err) {
    missing++;
    console.warn(`  ! not found in Storage, link kept: ${objectPath} (${err instanceof Error ? err.message : err})`);
  }
});
for (const dataUrl of inline) {
  const m = dataUrl.match(DATA_URL)!;
  map.set(dataUrl, await saveUpload(`imported/${crypto.randomUUID()}.${EXT[m[1]]}`, Buffer.from(m[2], 'base64')));
}

// 3. Into the local database, in one go
importDocuments(
  docs.map((d) => ({ ...d, data: swap(d.data, map) as DocumentData })),
  { replace }
);

console.log(`\nImported ${docs.length} documents from ${collections.length} collections into ${DB_FILE}`);
console.log(`Copied ${map.size - inline.size} images from Firebase Storage and ${inline.size} inline images into ${UPLOAD_DIR}`);
if (missing) console.log(`${missing} image links could not be copied (see above); they still point to Firebase.`);
process.exit(0);
