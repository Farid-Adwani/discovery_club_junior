import { Router, type Response, type NextFunction } from 'express';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin.js';
import {
  attachUser,
  requireUser,
  requireRole,
  HttpError,
  forgetProfile,
  forgetAllProfiles,
  hashPassword,
  checkPassword,
  findAccountByEmail,
  isStaffEmail,
  createSession,
  deleteSession,
  resolveProfile,
  accountEmailRef,
  adminProfiles,
  deleteAccount,
  deleteSessionsOf,
  isOwnerEmail,
  type Account,
  type AuthedRequest
} from './auth.js';
import type {
  AppUser,
  Student,
  Trainer,
  Group,
  SessionRecord,
  StudentAttendanceRecord,
  Product,
  ProductCategory,
  ProductOrder,
  ScheduleItem,
  ScheduleItemKind,
  StaffMember,
  SessionGuest,
  MaterialRequest,
  PaymentRecord,
  PaymentMethod,
  AccountSummary,
  CashCategory,
  CashEntry,
  StockCategory,
  StockItem,
  StockLocation,
  StockMovement,
  RequestComment
} from '../src/types/index.js';
import { WEEK_DAYS, GROUP_LEVELS } from '../src/types/index.js';
import { UNAVAILABLE_STATES, unitBreakdown, unitsField } from '../src/utils/stock.js';
import { LANDING_LANGS, LANDING_SECTIONS, LANDING_STAT_KEYS, LANDING_TEXT_KEYS, type LandingContent } from '../src/data/landing.js';

import { imageField, replacedImage } from './storage.js';
import { readMoney, writeMoney, sendMoney, upgradeMoney, toMillimes, toDinars, type MoneyCollection } from './money.js';
import { allowAttempt, recordAttempt, clearAttempts, clientIp } from './rateLimit.js';
import { notify, adminUserIds, trainerUserIds, parentsOf, shortDate, sendPush, subscriptionId, vapidPublicKey, type StoredNotification } from './notify.js';
import { notificationMessages } from '../src/i18n/messages/notifications.js';

export const router = Router();
router.use(attachUser);

// ---------- helpers ----------

type Handler = (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>;
const ah = (fn: Handler) => (req: AuthedRequest, res: Response, next: NextFunction) =>
  fn(req, res, next).catch(next);

const col = (name: string) => db.collection(name);
const newId = (prefix: string) => `${prefix}-${col('_ids').doc().id.slice(0, 12)}`;
const today = () => new Date().toISOString().split('T')[0];

/**
 * Older class documents stored a single `trainerId` and a `programId` (programs no longer exist);
 * always expose `trainerIds` and a price.
 */
function normalizeGroup(raw: Record<string, unknown>): Group {
  const g = readMoney('groups', raw) as unknown as Group & { trainerId?: string; programId?: string };
  const trainerIds = Array.isArray(g.trainerIds) ? g.trainerIds : g.trainerId ? [g.trainerId] : [];
  const { trainerId: _legacy, programId: _program, ...rest } = g;
  return { ...rest, trainerIds, pricePerMonth: Number(g.pricePerMonth) || 0 };
}

/**
 * Older student documents stored a single `groupId`; always expose `groupIds`.
 * The former 'active' status is the same as 'accepted' now (a child is either pending or accepted).
 */
function normalizeStudent(raw: Record<string, unknown>): Student {
  const st = readMoney('students', raw) as unknown as Omit<Student, 'status'> & { groupId?: string; programId?: string; status: string };
  const groupIds = Array.isArray(st.groupIds) ? st.groupIds : st.groupId ? [st.groupId] : [];
  const { groupId: _legacy, programId: _program, ...rest } = st;
  return { ...rest, groupIds, status: st.status === 'waitlist' ? 'waitlist' : 'accepted' };
}

// ---------- soft delete ----------
// Documents are never erased: a delete stamps `deletedAt`, and every read below skips stamped documents.

type Snap = FirebaseFirestore.DocumentSnapshot;
const isLive = (d: Snap) => d.exists && !d.get('deletedAt');
/** The document's data, or undefined when it doesn't exist or was deleted */
const liveData = <T>(d: Snap): T | undefined => (isLive(d) ? (d.data() as T) : undefined);

async function softDelete(ref: FirebaseFirestore.DocumentReference, req: AuthedRequest, extra: Record<string, unknown> = {}) {
  const snap = await ref.get();
  if (!isLive(snap)) throw new HttpError(404, 'Already deleted or not found.');
  await ref.update({ deletedAt: new Date().toISOString(), deletedBy: req.user?.uid || '', ...extra });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Age in full years on `today` for a YYYY-MM-DD birth date */
function ageFromBirthDate(birthDate: string, now = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

/** A child's date of birth (3 to 22 years old) */
function birthDate(value: unknown): string {
  return dateOfBirth(value, 3, 22);
}

function dateOfBirth(value: unknown, minAge: number, maxAge: number): string {
  const s = str(value, 'Date of birth', { max: 10 });
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (!DATE_RE.test(s) || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new HttpError(400, 'Date of birth is invalid.');
  }
  const age = ageFromBirthDate(s);
  if (age < minAge || age > maxAge) {
    throw new HttpError(400, minAge === 3 ? 'The child must be between 3 and 22 years old.' : 'Date of birth is invalid.');
  }
  return s;
}

/** Students enrolled in any of the given classes. */
async function studentsInClasses(classIds: string[]): Promise<Student[]> {
  const found = new Map<string, Student>();
  for (let i = 0; i < classIds.length; i += 30) {
    const snap = await col('students').where('groupIds', 'array-contains-any', classIds.slice(i, i + 30)).get();
    snap.docs.filter(isLive).forEach((d) => found.set(d.id, normalizeStudent(d.data()!)));
  }
  return [...found.values()];
}

/**
 * The standard price follows the classes: the sum of each class's monthly price (millimes).
 * `stored` is the student document being updated (an older one gets its money converted too).
 */
async function enrollmentFields(groupIds: string[], stored?: Record<string, unknown>) {
  const groups = (await Promise.all(groupIds.map(getGroup))).filter((g): g is Group => !!g);
  return {
    ...upgradeMoney('students', stored),
    standardMonthlyPrice: groups.reduce((sum, g) => sum + g.pricePerMonth, 0),
    // Older documents also stored the program of the first class
    programId: FieldValue.delete()
  };
}

async function getGroup(id: string): Promise<Group | undefined> {
  const data = liveData<Record<string, unknown>>(await col('groups').doc(id).get());
  return data ? normalizeGroup(data) : undefined;
}

async function listAll<T>(name: string): Promise<T[]> {
  const snap = await col(name).get();
  return snap.docs.filter(isLive).map((d) => d.data() as T);
}

/** Like listAll, with money in millimes */
async function listMoney<T>(name: MoneyCollection): Promise<T[]> {
  return (await listAll<T>(name)).map((d) => readMoney(name, d));
}

/** Firestore `in` queries accept at most 30 values, so split larger lists. */
async function whereIn<T>(name: string, field: string, values: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += 30) {
    const snap = await col(name).where(field, 'in', values.slice(i, i + 30)).get();
    snap.docs.filter(isLive).forEach((d) => out.push(d.data() as T));
  }
  return out;
}

/** Runs many writes in batches of at most 450 (Firestore allows 500 per batch). */
async function commitInChunks(writes: ((batch: FirebaseFirestore.WriteBatch) => void)[]) {
  for (let i = 0; i < writes.length; i += 450) {
    const batch = db.batch();
    writes.slice(i, i + 450).forEach((w) => w(batch));
    await batch.commit();
  }
}

function str(value: unknown, field: string, { max = 500, optional = false } = {}): string {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw new HttpError(400, `${field} is required.`);
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text.`);
  const s = value.trim();
  if (!s && !optional) throw new HttpError(400, `${field} is required.`);
  if (s.length > max) throw new HttpError(400, `${field} is too long.`);
  return s;
}

function num(value: unknown, field: string, { min = -Infinity, max = Infinity } = {}): number {
  const n = Number(value);
  if (value === '' || value === null || !Number.isFinite(n) || n < min || n > max) {
    throw new HttpError(400, `${field} is invalid.`);
  }
  return n;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) throw new HttpError(400, `${field} is invalid.`);
  return value as T;
}

const PRODUCT_CATEGORIES: readonly ProductCategory[] = ['tshirt', 'hoodie', 'jacket', 'hat', 'bag', 'other'];
/** Stock key for products sold without sizes */
const ONE_SIZE = 'ONE';
const STUDENT_STATUSES = ['waitlist', 'accepted'] as const;
const PAYMENT_STATUSES = ['paid', 'pending', 'scholarship'] as const;
const DAYS = WEEK_DAYS;

const isAdmin = (user?: AppUser) => !!user?.roles.includes('admin');

/** Digits, spaces, + - ( ) and at least 8 digits, e.g. "+216 55 987 654" */
function phone(value: unknown): string {
  const s = str(value, 'Phone', { max: 30 });
  if (!/^\+?[0-9 ()-]+$/.test(s) || s.replace(/\D/g, '').length < 8) {
    throw new HttpError(400, 'Please enter a valid phone number.');
  }
  return s;
}

function email(value: unknown): string {
  const s = str(value, 'Email', { max: 200 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw new HttpError(400, 'Please enter a valid email address.');
  return s;
}

/**
 * Children a parent may see: the ones linked to their account (students.parentUid).
 * Emails are not verified, so a matching parentEmail alone never gives access.
 */
async function parentStudents(req: AuthedRequest): Promise<Student[]> {
  const snap = await col('students').where('parentUid', '==', req.user!.uid).get();
  return snap.docs.filter(isLive).map((d) => normalizeStudent(d.data()!));
}

/** Schedule items concerning any of these students; other students' ids are removed from each item. */
async function scheduleItemsFor(studentIds: string[]): Promise<ScheduleItem[]> {
  const found = new Map<string, ScheduleItem>();
  for (let i = 0; i < studentIds.length; i += 30) {
    const snap = await col('schedule_items').where('studentIds', 'array-contains-any', studentIds.slice(i, i + 30)).get();
    snap.docs.filter(isLive).forEach((d) => found.set(d.id, d.data() as ScheduleItem));
  }
  const mine = new Set(studentIds);
  return [...found.values()].map(({ trainerIds: _coaches, ...it }) => ({ ...it, studentIds: it.studentIds.filter((id) => mine.has(id)) }));
}

/** A parent's children, their classes' sessions (only their own attendance lines), shop orders and schedule. */
async function loadParentData(req: AuthedRequest) {
  const students = await parentStudents(req);
  const myIds = new Set(students.map((s) => s.id));
  const groupIds = [...new Set(students.flatMap((s) => s.groupIds))];
  const [classSessions, makeUpSessions, orders, scheduleItems] = await Promise.all([
    whereIn<SessionRecord>('sessions', 'groupId', groupIds),
    // Sessions of other classes the children attended as extras (make-up)
    (async () => {
      const ids = [...myIds];
      const out: SessionRecord[] = [];
      for (let i = 0; i < ids.length; i += 30) {
        const snap = await col('sessions').where('extraStudentIds', 'array-contains-any', ids.slice(i, i + 30)).get();
        snap.docs.filter(isLive).forEach((d) => out.push(d.data() as SessionRecord));
      }
      return out;
    })(),
    whereIn<ProductOrder>('hoodie_distributions', 'studentId', [...myIds]).then((list) => list.map((o) => readMoney('hoodie_distributions', o))),
    scheduleItemsFor([...myIds])
  ]);
  const unique = new Map([...classSessions, ...makeUpSessions].map((s) => [s.id, s]));
  // Parents only see their own children's lines, never other children, guests or the coach's internal notes
  const sessions = [...unique.values()].map(({ guests: _guests, extraStudentIds: _extra, trainerNotes: _notes, ...s }) => ({
    ...s,
    records: Object.fromEntries(Object.entries(s.records || {}).filter(([id]) => myIds.has(id)))
  }));
  return { students, sessions, orders, scheduleItems };
}

// ---------- public ----------

router.get('/health', (_req, res) => res.json({ ok: true }));

router.get('/me', requireUser, (req: AuthedRequest, res) => res.json(req.user));

/** Any signed-in user edits their own name, photo (small JPEG data URL, uploaded to Storage; null removes it) and date of birth (null removes it). */
router.put(
  '/me/profile',
  requireUser,
  ah(async (req, res) => {
    if (req.user!.viewedBy) throw new HttpError(403, 'Not available while viewing a parent’s account.');
    const user = req.user!;
    const b = req.body || {};
    const update: Record<string, unknown> = {};
    if (b.displayName !== undefined) update.displayName = str(b.displayName, 'Name', { max: 120 });
    if (b.birthDate !== undefined) update.birthDate = b.birthDate === null || b.birthDate === '' ? FieldValue.delete() : dateOfBirth(b.birthDate, 14, 100);
    const before = b.photo !== undefined ? (await col('users').doc(user.uid).get()).get('photoURL') : undefined;
    if (b.photo !== undefined) {
      if (b.photo !== null && (typeof b.photo !== 'string' || !b.photo.startsWith('data:'))) throw new HttpError(400, 'Please choose a JPEG, PNG or WebP image.');
      update.photoURL = b.photo === null ? FieldValue.delete() : await imageField(b.photo, 'photos/users', { maxBytes: 150_000, field: 'Photo' });
    }
    await col('users').doc(user.uid).set(update, { merge: true });
    if (b.photo !== undefined) await replacedImage(before, update.photoURL);
    forgetProfile(user.uid);
    res.json({ ok: true });
  })
);

// ---------- notifications & push ----------

/** The signed-in person's notifications (newest first) and how many are unread. Keeps the 200 newest. */
router.get(
  '/notifications',
  requireUser,
  ah(async (req, res) => {
    const snap = await col('notifications').where('userId', '==', req.user!.uid).get();
    const all = snap.docs.map((d) => d.data() as StoredNotification).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    // Trimmed only once well over the limit, so most loads don't write anything
    if (all.length > 250) await commitInChunks(all.slice(200).map((n) => (batch) => batch.delete(col('notifications').doc(n.id))));
    const limit = Math.min(200, Number(req.query.limit) || 60);
    res.json({ items: all.slice(0, limit), unread: all.filter((n) => !n.readAt).length, total: Math.min(all.length, 200) });
  })
);

/** Mark some (ids) or all of the person's notifications as read */
router.post(
  '/notifications/read',
  requireUser,
  ah(async (req, res) => {
    const ids: unknown = req.body?.ids;
    const at = new Date().toISOString();
    const snap = await col('notifications').where('userId', '==', req.user!.uid).get();
    const wanted = Array.isArray(ids) ? new Set(ids.map(String)) : null;
    const unread = snap.docs.filter((d) => !d.get('readAt') && (!wanted || wanted.has(d.id)));
    await commitInChunks(unread.map((d) => (batch) => batch.update(d.ref, { readAt: at })));
    res.json({ count: unread.length });
  })
);

router.get('/push/key', (_req, res) => res.json({ publicKey: vapidPublicKey() }));

/** Remember this browser for push (one document per device), in the person's language */
router.post(
  '/push/subscribe',
  requireUser,
  ah(async (req, res) => {
    // An admin viewing a parent's account must not receive that family's notifications
    if (req.user!.viewedBy) return res.json({ ok: true });
    const sub = req.body?.subscription;
    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
      throw new HttpError(400, 'Subscription is invalid.');
    }
    const lang = oneOf(req.body?.lang ?? 'fr', ['en', 'fr', 'ar'] as const, 'Language');
    const id = subscriptionId(sub.endpoint);
    await col('push_subscriptions').doc(id).set({
      id,
      userId: req.user!.uid,
      subscription: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } },
      lang,
      createdAt: new Date().toISOString()
    });
    res.json({ ok: true });
  })
);

router.post(
  '/push/unsubscribe',
  requireUser,
  ah(async (req, res) => {
    const endpoint = str(req.body?.endpoint, 'Endpoint', { max: 2000 });
    const ref = col('push_subscriptions').doc(subscriptionId(endpoint));
    if ((await ref.get()).get('userId') === req.user!.uid) await ref.delete();
    res.json({ ok: true });
  })
);

/** A test message to the person's own devices */
router.post(
  '/push/test',
  requireUser,
  ah(async (req, res) => {
    if (req.user!.viewedBy) throw new HttpError(403, 'Not available while viewing a parent’s account.');
    if (!vapidPublicKey()) throw new HttpError(503, 'Push notifications are not configured on the server (VAPID keys).');
    const subs = (await col('push_subscriptions').where('userId', '==', req.user!.uid).get()).docs.map((d) => d.data());
    if (!subs.length) throw new HttpError(404, 'No device is registered for push yet.');
    await sendPush(subs as Parameters<typeof sendPush>[0], (lang) => {
      const m = notificationMessages[lang] || notificationMessages.en;
      return { title: m.testTitle, body: m.testBody, url: '/', tag: 'test' };
    });
    res.json({ devices: subs.length });
  })
);

/** Attendance sheets the admin loads by default: from the first day of the month, this many months back */
const SESSION_MONTHS = 6;

function defaultSessionsFrom(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (SESSION_MONTHS - 1), 1));
  return d.toISOString().slice(0, 10);
}

/** What a coach needs about a child: no money, no parent contact details */
function forTrainer({ standardMonthlyPrice: _s, customMonthlyPrice: _c, paymentStatus: _p, parentPhone: _ph, parentEmail: _e, ...st }: Student) {
  return { ...st, parentPhone: '', parentEmail: '', standardMonthlyPrice: 0, paymentStatus: 'pending' as const };
}

/**
 * Everything the current user is allowed to see, in one call.
 * The admin gets attendance sheets from `?sessionsFrom=YYYY-MM-DD` (default: the last few months), the rest is complete.
 */
router.get(
  '/data',
  ah(async (req, res) => {
    const user = req.user;
    const sessionsFrom = typeof req.query.sessionsFrom === 'string' && DATE_RE.test(req.query.sessionsFrom) ? req.query.sessionsFrom : defaultSessionsFrom();
    const admin = isAdmin(user);
    // A parent's own data does not depend on the public lists, so load both at the same time
    const parentData = !admin && user?.role === 'parent' ? loadParentData(req) : null;
    // Awaited below; this only stops Node treating an early failure as unhandled (which would crash the server)
    parentData?.catch(() => {});

    const [trainers, groups, allProducts, landingSnap] = await Promise.all([
      listAll<Trainer>('trainers'),
      listAll<Record<string, unknown>>('groups').then((list) => list.map(normalizeGroup)),
      listMoney<Product>('products'),
      col('site_content').doc('landing').get()
    ]);

    let students: Student[] = [];
    let sessions: SessionRecord[] = [];
    let orders: ProductOrder[] = [];
    let materialRequests: MaterialRequest[] = [];
    let scheduleItems: ScheduleItem[] = [];
    let payments: PaymentRecord[] = [];
    let deletedStudents: Student[] = [];
    let stock: { stockItems: Partial<StockItem>[]; stockCategories: StockCategory[]; stockLocations: StockLocation[]; stockMovements: StockMovement[] } | null = null;
    // Team birthdays are only for the club team
    const isTeam = admin || (user?.role === 'trainer' && !!user.trainerId);
    const [staffMembers, admins] = isTeam ? await Promise.all([listAll<StaffMember>('staff_members'), adminProfiles()]) : [[], []];

    if (admin) {
      [students, sessions, orders, materialRequests, scheduleItems, payments] = await Promise.all([
        listAll<Record<string, unknown>>('students').then((list) => list.map(normalizeStudent)),
        // Older sign-in sessions (server/auth.ts) have no date, so the query only returns attendance sheets
        col('sessions').where('date', '>=', sessionsFrom).get().then((snap) => snap.docs.filter(isLive).map((d) => d.data() as SessionRecord).filter((s) => !!s.groupId)),
        listMoney<ProductOrder>('hoodie_distributions'),
        listAll<MaterialRequest>('material_requests'),
        listAll<ScheduleItem>('schedule_items'),
        // Complete: the arrears of each child are computed from every month
        listMoney<PaymentRecord>('payments')
      ]);
      const [items, cats, locs, moves] = await Promise.all([
        listAll<StockItem>('stock_items'),
        col('stock_categories').get(),
        col('stock_locations').get(),
        col('stock_movements').orderBy('at', 'desc').limit(300).get()
      ]);
      stock = {
        stockItems: items,
        stockCategories: cats.docs.map((d) => d.data() as StockCategory),
        stockLocations: locs.docs.map((d) => d.data() as StockLocation),
        stockMovements: moves.docs.map((d) => d.data() as StockMovement)
      };
      // The trash: deleted children can be restored
      deletedStudents = (await col('students').where('deletedAt', '>', '').get()).docs.map((d) => normalizeStudent(d.data()));
    } else if (user?.role === 'trainer' && user.trainerId) {
      const myGroupIds = groups.filter((g) => g.trainerIds.includes(user.trainerId!)).map((g) => g.id);
      let mats: FirebaseFirestore.QuerySnapshot;
      let classItems: ScheduleItem[];
      let mine: FirebaseFirestore.QuerySnapshot;
      [students, sessions, mats, classItems, mine] = await Promise.all([
        studentsInClasses(myGroupIds).then((list) => list.map(forTrainer)),
        whereIn<SessionRecord>('sessions', 'groupId', myGroupIds),
        col('material_requests').where('trainerId', '==', user.trainerId).get(),
        // For the coach's week schedule: cancelled classes, and what the office added for this coach
        whereIn<ScheduleItem>('schedule_items', 'groupId', myGroupIds),
        col('schedule_items').where('trainerIds', 'array-contains', user.trainerId).get()
      ]);
      // Stock items the coach may request (no location or internal notes)
      const [items, cats] = await Promise.all([listAll<StockItem>('stock_items'), listAll<StockCategory>('stock_categories')]);
      stock = {
        stockItems: items
          .filter((it) => !it.hiddenFromTrainers)
          .map((it) => ({ id: it.id, name: it.name, categoryId: it.categoryId, imageUrl: it.imageUrl, quantity: unitBreakdown(it).available, unit: it.unit })),
        stockCategories: cats,
        stockLocations: [],
        stockMovements: []
      };
      scheduleItems = [
        ...classItems.filter((it) => it.kind === 'cancellation'),
        ...mine.docs.filter(isLive).map((d) => d.data() as ScheduleItem)
      ];
      materialRequests = mats.docs.map((d) => d.data() as MaterialRequest);
    } else if (parentData) {
      ({ students, sessions, orders, scheduleItems } = await parentData);
    }

    // The standard fee always follows the classes' current prices (a stored value can be outdated,
    // e.g. after class prices were re-synced), so it is recomputed on every load
    const classPrice = new Map(groups.map((g) => [g.id, g.pricePerMonth]));
    const withClassPrice = (st: Student): Student => ({
      ...st,
      standardMonthlyPrice: st.groupIds.reduce((sum, id) => sum + (classPrice.get(id) ?? 0), 0)
    });
    students = students.map(withClassPrice);
    deletedStudents = deletedStudents.map(withClassPrice);

    // Coach emails: the team sees all of them, a parent only their children's coaches, visitors none
    const parentCoachIds = new Set(
      user?.role === 'parent' ? groups.filter((g) => students.some((st) => st.groupIds.includes(g.id))).flatMap((g) => g.trainerIds) : []
    );
    res.json({
      // Phone numbers only for the admin, birth dates only for the team
      trainers: admin
        ? trainers
        : trainers.map(({ birthDate: _b, ...t }) => ({
            ...t,
            phone: '',
            email: isTeam || parentCoachIds.has(t.id) ? t.email : '',
            ...(isTeam ? { birthDate: _b } : {})
          })),
      staffMembers,
      adminProfiles: admins,
      groups: groups.map((g) => sendMoney('groups', g)),
      landing: (landingSnap.data() as LandingContent | undefined) || {},
      // Only the admin sees products that are not on sale
      products: (admin ? allProducts : allProducts.filter((p) => p.isActive))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((p) => sendMoney('products', p)),
      students: students.map((st) => sendMoney('students', st)),
      sessions,
      ...(admin ? { sessionsFrom } : {}),
      orders: orders.map((o) => sendMoney('hoodie_distributions', o)),
      materialRequests,
      scheduleItems,
      ...(admin
        ? { payments: payments.map((p) => sendMoney('payments', p)), deletedStudents: deletedStudents.map((st) => sendMoney('students', st)) }
        : {}),
      ...(stock || {})
    });
  })
);

// ---------- signed-in users ----------

/**
 * Validates a parent sign-up form and adds its writes (children + profile) to `batch`. No course is chosen here.
 * A new account must accept the terms and privacy policy. Publishing photos of the child is a separate, optional
 * choice; a parent adding a child later keeps their earlier choice unless the form gives a new one.
 */
/** New children on the waitlist, linked to a parent account (registration, parent space, admin) */
function addChildren(
  batch: FirebaseFirestore.WriteBatch,
  uid: string,
  parent: { parentName: string; parentPhone: string; parentEmail: string; photoConsent: boolean },
  children: unknown,
  defaultNote: string
): string[] {
  if (!Array.isArray(children) || children.length === 0 || children.length > 10) {
    throw new HttpError(400, 'Please add between 1 and 10 children.');
  }
  const ids: string[] = [];
  for (const child of children) {
    const id = newId('std');
    ids.push(id);
    const student: Student & { parentUid: string } = {
      id,
      parentUid: uid,
      ...parent,
      studentName: str(child?.name, "Child's name", { max: 120 }),
      ...(() => {
        const dob = birthDate(child?.birthDate);
        // studentAge is kept for older screens; the site always shows the age computed from birthDate
        return { birthDate: dob, studentAge: ageFromBirthDate(dob) };
      })(),
      groupIds: [],
      status: 'waitlist',
      registeredAt: today(),
      standardMonthlyPrice: 0,
      paymentStatus: 'pending',
      notes: str(child?.notes, 'Notes', { max: 1000, optional: true }) || defaultNote
    };
    batch.set(col('students').doc(id), student);
  }
  return ids;
}

function addParentRegistration(
  batch: FirebaseFirestore.WriteBatch,
  uid: string,
  accountEmail: string,
  b: Record<string, any>,
  existing?: { photoConsent?: boolean }
) {
  const parentName = str(b.parentName, 'Parent name', { max: 120 });
  const parentPhone = phone(b.parentPhone);
  if (!existing && b.acceptedTerms !== true) throw new HttpError(400, 'Please accept the terms and the privacy policy.');
  const photoConsent = typeof b.photoConsent === 'boolean' ? b.photoConsent : existing?.photoConsent === true;
  const consentAt = new Date().toISOString();
  const ids = addChildren(batch, uid, { parentName, parentPhone, parentEmail: accountEmail, photoConsent }, b.children, 'Registered through Parent Portal Account Registration');
  batch.set(
    col('users').doc(uid),
    {
      uid,
      email: accountEmail,
      displayName: parentName,
      parentPhone,
      studentIds: FieldValue.arrayUnion(...ids),
      ...(!existing ? { termsAcceptedAt: consentAt } : {}),
      ...(!existing || typeof b.photoConsent === 'boolean' ? { photoConsent, photoConsentAt: consentAt } : {}),
      createdAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return ids;
}

/** A signed-in parent adds more children to their account. */
router.post(
  '/parents/register',
  requireUser,
  ah(async (req, res) => {
    const user = req.user!;
    const batch = db.batch();
    const stored = (await col('users').doc(user.uid).get()).data() || {};
    const ids = addParentRegistration(batch, user.uid, user.email, req.body || {}, { photoConsent: stored.photoConsent });
    await batch.commit();
    forgetProfile(user.uid);
    await notifyRegistration(req.body || {});
    res.status(201).json({ studentIds: ids });
  })
);

// ---------- sign-in (accounts are stored in our own database) ----------

function password(value: unknown): string {
  if (typeof value !== 'string' || value.length < 6) throw new HttpError(400, 'The password must have at least 6 characters.');
  if (value.length > 128) throw new HttpError(400, 'The password is too long.');
  return value;
}

// Slows down password guessing: after 8 wrong passwords for an email (or 30 from one address), wait 15 minutes.
// The counters are in Firestore (server/rateLimit.ts) because serverless instances share no memory.
const FAIL_WINDOW_MS = 15 * 60_000;
const loginLimits = (accountEmail: string, ip: string) => [
  { key: `login:email:${accountEmail}`, max: 8 },
  { key: `login:ip:${ip}`, max: 30 }
];
// Sign-ups: 5 per hour from one address (each one notifies every admin)
const REGISTER_WINDOW_MS = 60 * 60_000;
const REGISTER_MAX = 5;

/** New parent account + their children, in one step. Returns a session token. */
router.post(
  '/auth/register',
  ah(async (req, res) => {
    const b = req.body || {};
    const accountEmail = email(b.email);
    const pw = password(b.password);
    const ipKey = `register:ip:${clientIp(req)}`;
    if (!(await allowAttempt([{ key: ipKey, max: REGISTER_MAX }]))) {
      throw new HttpError(429, 'Too many sign-ups from this connection. Please try again in an hour.');
    }
    if (await isStaffEmail(accountEmail)) {
      throw new HttpError(403, 'This email belongs to club staff. Please ask the club administrator for your password.');
    }
    if (await findAccountByEmail(accountEmail)) throw new HttpError(409, 'An account already exists with this email. Please sign in.');

    const uid = col('accounts').doc().id;
    const batch = db.batch();
    addParentRegistration(batch, uid, accountEmail, b); // validates the form before anything is written
    const account: Account = { id: uid, email: accountEmail, passwordHash: await hashPassword(pw), createdAt: new Date().toISOString() };
    batch.create(accountEmailRef(accountEmail), { accountId: uid }); // fails if the email was taken meanwhile
    batch.set(col('accounts').doc(uid), account);
    try {
      await batch.commit();
    } catch (err) {
      if ((err as { code?: number }).code === 6) throw new HttpError(409, 'An account already exists with this email. Please sign in.');
      throw err;
    }
    await recordAttempt([ipKey], REGISTER_WINDOW_MS);
    await notifyRegistration(b);
    const token = await createSession(uid);
    res.status(201).json({ token, user: await resolveProfile(account) });
  })
);

/** Admins: a parent registered children (they wait on the Students page) */
async function notifyRegistration(b: Record<string, any>) {
  const children = (Array.isArray(b.children) ? b.children : []).map((c: { name?: string }) => String(c?.name || '').trim()).filter(Boolean);
  await notify(await adminUserIds(), 'registration_new', { parent: String(b.parentName || '').trim(), children: children.join(', ') }, '#/admin/students');
}

router.post(
  '/auth/login',
  ah(async (req, res) => {
    const b = req.body || {};
    const accountEmail = str(b.email, 'Email', { max: 200 }).toLowerCase();
    const pw = str(b.password, 'Password', { max: 128 });
    const limits = loginLimits(accountEmail, clientIp(req));
    if (!(await allowAttempt(limits))) throw new HttpError(429, 'Too many wrong passwords. Please wait 15 minutes and try again.');

    const account = await findAccountByEmail(accountEmail);
    if (!account || !(await checkPassword(pw, account.passwordHash))) {
      await recordAttempt(limits.map((l) => l.key), FAIL_WINDOW_MS);
      throw new HttpError(401, 'Wrong email or password.');
    }
    await clearAttempts(limits[0].key);
    const token = await createSession(account.id);
    res.json({ token, user: await resolveProfile(account) });
  })
);

router.post(
  '/auth/logout',
  ah(async (req, res) => {
    if (req.sessionId) await deleteSession(req.sessionId);
    res.json({ ok: true });
  })
);

router.post(
  '/orders',
  requireUser,
  ah(async (req, res) => {
    const b = req.body || {};
    const studentId = str(b.studentId, 'Child', { max: 100 });
    const productId = str(b.productId, 'Product', { max: 100 });

    const student = liveData<Student>(await col('students').doc(studentId).get());
    if (!student) throw new HttpError(404, 'Child not found.');
    if (!isAdmin(req.user)) {
      const mine = await parentStudents(req);
      if (!mine.some((s) => s.id === studentId)) throw new HttpError(403, 'You can only order for your own children.');
    }

    // Every order starts as "requested"; stock is only taken when the admin marks it ready
    const stored = liveData<Product>(await col('products').doc(productId).get());
    const product = stored ? readMoney('products', stored) : undefined;
    if (!product || !product.isActive) throw new HttpError(404, 'This product is not on sale.');
    const size = product.sizes.length ? oneOf(b.size, product.sizes, 'Size') : ONE_SIZE;
    const order: ProductOrder = {
        id: newId('ord'),
        productId,
        productName: product.name,
        studentId,
        studentName: student.studentName,
        parentName: student.parentName,
      size,
      status: 'requested',
      requestedAt: today(),
      createdAt: new Date().toISOString(),
      price: product.price
    };
    await col('hoodie_distributions').doc(order.id).set(writeMoney(order));
    await notify(await adminUserIds(), 'order_new', { parent: student.parentName, product: `${product.name}${size !== ONE_SIZE ? ` (${size})` : ''}`, child: student.studentName }, '#/admin/inventory', { except: req.user!.uid });
    res.status(201).json(sendMoney('hoodie_distributions', order));
  })
);

/** Parent (or admin) sets or removes a child's profile photo. The browser sends a small resized JPEG. */
router.put(
  '/students/:id/photo',
  requireUser,
  ah(async (req, res) => {
    const studentId = req.params.id;
    if (!isAdmin(req.user)) {
      const mine = await parentStudents(req);
      if (!mine.some((s) => s.id === studentId)) throw new HttpError(403, 'You can only change your own child’s photo.');
    }
    const ref = col('students').doc(studentId);
    const snap = await ref.get();
    if (!isLive(snap)) throw new HttpError(404, 'Child not found.');
    const photo = req.body?.photo;
    if (photo !== null && (typeof photo !== 'string' || !photo.startsWith('data:'))) throw new HttpError(400, 'Please choose a JPEG, PNG or WebP image.');
    const photoURL = photo === null ? undefined : await imageField(photo, 'photos/students', { maxBytes: 150_000, field: 'Photo' });
    await ref.update({ photoURL: photoURL ?? FieldValue.delete() });
    await replacedImage(snap.get('photoURL'), photoURL);
    res.json({ ok: true, photoURL });
  })
);

/** Parent (or admin) edits the child's notes for trainers (allergies, preferences…). Empty text clears them. */
router.put(
  '/students/:id/notes',
  requireUser,
  ah(async (req, res) => {
    const studentId = req.params.id;
    if (!isAdmin(req.user)) {
      const mine = await parentStudents(req);
      if (!mine.some((s) => s.id === studentId)) throw new HttpError(403, 'You can only edit your own child’s notes.');
    }
    const notes = str(req.body?.notes, 'Notes', { max: 1000, optional: true });
    const ref = col('students').doc(studentId);
    if (!isLive(await ref.get())) throw new HttpError(404, 'Child not found.');
    await ref.update({ notes: notes || FieldValue.delete() });
    res.json({ notes });
  })
);

/**
 * Parent updates the phone and contact email the club uses. Applied to all of the parent's children;
 * parentUid is set so a child linked only by the old email stays linked to this account.
 * The sign-in email of the account is not changed. An admin updates the one child given.
 */
router.put(
  '/parents/contact',
  requireUser,
  ah(async (req, res) => {
    const user = req.user!;
    const b = req.body || {};
    const parentPhone = phone(b.parentPhone);
    const parentEmail = email(b.parentEmail);

    const batch = db.batch();
    if (isAdmin(user)) {
      const studentId = str(b.studentId, 'Child', { max: 100 });
      const ref = col('students').doc(studentId);
      if (!isLive(await ref.get())) throw new HttpError(404, 'Child not found.');
      batch.update(ref, { parentPhone, parentEmail });
    } else {
      const mine = await parentStudents(req);
      if (mine.length === 0) throw new HttpError(404, 'No children are linked to this account.');
      for (const s of mine) batch.update(col('students').doc(s.id), { parentPhone, parentEmail, parentUid: user.uid });
      batch.set(col('users').doc(user.uid), { parentPhone, contactEmail: parentEmail }, { merge: true });
    }
    await batch.commit();
    if (!isAdmin(user)) forgetProfile(user.uid);
    res.json({ parentPhone, parentEmail });
  })
);

// ---------- trainers (and admins) ----------

router.post(
  '/sessions',
  requireRole('trainer', 'admin'),
  ah(async (req, res) => {
    const b = req.body || {};
    const groupId = str(b.groupId, 'Class', { max: 100 });
    const group = await getGroup(groupId);
    if (!group) throw new HttpError(404, 'Class not found.');
    if (!isAdmin(req.user) && !group.trainerIds.includes(req.user!.trainerId!)) {
      throw new HttpError(403, 'You can only take attendance for your own classes.');
    }

    const date = str(b.date, 'Date', { max: 10 });
    if (!DATE_RE.test(date)) throw new HttpError(400, 'Date is invalid.');
    const classIds = new Set((await studentsInClasses([groupId])).map((st) => st.id));

    // The trainer who is signed in gets the marks (read before the transaction: it doesn't change)
    const trainer = req.user!.trainerId
      ? ((await col('trainers').doc(req.user!.trainerId).get()).data() as Trainer | undefined)
      : undefined;
    const ratedBy = trainer?.name || req.user!.displayName;
    const ratedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // One sheet per class and date. New sheets get a fixed id and the read + write run in a transaction,
    // so two people saving the same class at once update one sheet instead of creating two.
    const { session, previous } = await db.runTransaction(async (tx) => {
      const fixedRef = col('sessions').doc(`sess-${groupId}-${date}`);
      const fixed = await tx.get(fixedRef);
      // Older sheets have a random id
      const legacy = fixed.exists ? null : await tx.get(col('sessions').where('groupId', '==', groupId).where('date', '==', date).limit(1));
      const existingDoc = fixed.exists ? fixed : legacy?.docs[0];
      const previous = existingDoc ? (existingDoc.data() as SessionRecord) : undefined;
      const allowedIds = new Set(classIds);
      // Children of other classes added by hand for this session (make-up). Only the office adds new ones;
      // a save that doesn't send extras / guests (e.g. the trainer portal) keeps the ones already saved.
      const previousExtras = previous?.extraStudentIds ?? [];
      const extraInput: unknown[] = b.extraStudentIds === undefined || !isAdmin(req.user) ? previousExtras : b.extraStudentIds;
      if (!Array.isArray(extraInput) || extraInput.length > 50) throw new HttpError(400, 'Too many extra children.');
      const extraStudentIds: string[] = [];
      const candidates = [...new Set(extraInput.map((v: unknown) => str(v, 'Child', { max: 100 })))].filter((id) => !allowedIds.has(id));
      const extraSnaps = candidates.length ? await tx.getAll(...candidates.map((id) => col('students').doc(id))) : [];
      extraSnaps.forEach((snap) => {
        if (!isLive(snap)) return;
        extraStudentIds.push(snap.id);
        allowedIds.add(snap.id);
      });
      // People without a student record (trial, visitor)
      const guestInput: unknown[] = b.guests === undefined ? previous?.guests ?? [] : b.guests;
      if (!Array.isArray(guestInput) || guestInput.length > 30) throw new HttpError(400, 'Too many guests.');
      const guests: SessionGuest[] = (guestInput as Record<string, unknown>[]).map((g: Record<string, unknown>, i: number) => ({
        id: str(g?.id, 'Guest', { max: 60, optional: true }) || `guest-${i + 1}`,
        name: str(g?.name, 'Guest name', { max: 120 }),
        ...(str(g?.phone, 'Phone', { max: 30, optional: true }) ? { phone: str(g?.phone, 'Phone', { max: 30 }) } : {}),
        status: oneOf(g?.status ?? 'unmarked', ['present', 'absent', 'late', 'unmarked'] as const, 'Attendance status'),
        ...(str(g?.remarks, 'Remark', { max: 500, optional: true }) ? { remarks: str(g?.remarks, 'Remark', { max: 500 }) } : {})
      }));
  
      const records: Record<string, StudentAttendanceRecord> = {};
      for (const [studentId, r] of Object.entries((b.records || {}) as Record<string, StudentAttendanceRecord>)) {
        if (!allowedIds.has(studentId)) continue;
        const status = oneOf(r?.status, ['present', 'absent', 'late', 'unmarked'] as const, 'Attendance status');
        // Mark out of 20; absent children and empty fields are simply not rated
        const hasMark = status !== 'absent' && r?.rating !== undefined && r?.rating !== null && String(r.rating) !== '';
        const rating = hasMark ? num(r.rating, 'Mark', { min: 0, max: 20 }) : undefined;
        // A mark that didn't change keeps who gave it and when (e.g. the office saving the trainer's sheet)
        const before = previous?.records?.[studentId];
        const sameMark = rating !== undefined && before?.rating === rating;
        records[studentId] = {
          studentId,
          status,
          rating,
          ratedBy: rating !== undefined ? (sameMark ? before?.ratedBy ?? ratedBy : ratedBy) : undefined,
          ratedAt: rating !== undefined ? (sameMark ? before?.ratedAt ?? ratedAt : ratedAt) : undefined,
          pedagogicalRemark: str(r?.pedagogicalRemark, 'Remark', { max: 1000, optional: true }) || undefined,
          remarks: str(r?.remarks, 'Remark', { max: 1000, optional: true }) || undefined
        };
      }
  
      // Marks of make-up children are kept when the save didn't send them (trainer portal)
      if (b.extraStudentIds === undefined || !isAdmin(req.user)) {
        for (const id of extraStudentIds) if (!records[id] && previous?.records?.[id]) records[id] = previous.records[id];
      }
      const validate = b.validateSyllabus === true;
      const session: SessionRecord = {
        id: existingDoc ? existingDoc.id : fixedRef.id,
        groupId,
        date,
        weekNumber: num(b.weekNumber, 'Week', { min: 0, max: 200 }),
        topicTaught: str(b.topicTaught, 'Topic', { max: 300, optional: true }),
        isSyllabusValidated: validate,
        validatedAt: validate ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
        trainerNotes: str(b.trainerNotes, 'Notes', { max: 2000, optional: true }) || undefined,
        records,
        ...(extraStudentIds.length ? { extraStudentIds } : {}),
        ...(guests.length ? { guests } : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: ratedBy
      };
      tx.set(col('sessions').doc(session.id), session);
      return { session, previous };
    });
    await notifyAttendance(session, previous, group.name);
    res.json(session);
  })
);

/** Parents: their child was marked absent, or got a new mark (only what changed since the last save) */
async function notifyAttendance(session: SessionRecord, previous: SessionRecord | undefined, className: string) {
  const changes = Object.values(session.records).filter((r) => {
    const before = previous?.records?.[r.studentId];
    return (r.status === 'absent' && before?.status !== 'absent') || (r.rating !== undefined && r.rating !== before?.rating);
  });
  if (!changes.length) return;
  const parents = new Map((await parentsOf(changes.map((r) => r.studentId))).map((p) => [p.studentId, p]));
  const date = shortDate(session.date);
  for (const r of changes) {
    const p = parents.get(r.studentId);
    if (!p?.parentUid) continue;
    const before = previous?.records?.[r.studentId];
    if (r.status === 'absent' && before?.status !== 'absent') await notify([p.parentUid], 'attendance_absent', { child: p.name, class: className, date }, '#/parent');
    if (r.rating !== undefined && r.rating !== before?.rating) await notify([p.parentUid], 'attendance_mark', { child: p.name, mark: r.rating, class: className, date }, '#/parent');
  }
}

router.post(
  '/material-requests',
  requireRole('trainer', 'admin'),
  ah(async (req, res) => {
    const b = req.body || {};
    const trainerId = isAdmin(req.user) ? str(b.trainerId, 'Trainer', { max: 100 }) : req.user!.trainerId!;
    const trainer = (await col('trainers').doc(trainerId).get()).data() as Trainer | undefined;
    const group = await getGroup(str(b.groupId, 'Class', { max: 100 }));
    if (!trainer || !group) throw new HttpError(404, 'Trainer or class not found.');

    let stockItem: StockItem | undefined;
    if (b.stockItemId) {
      stockItem = liveData<StockItem>(await col('stock_items').doc(str(b.stockItemId, 'Item', { max: 100 })).get());
      if (!stockItem || (stockItem.hiddenFromTrainers && !isAdmin(req.user))) throw new HttpError(404, 'This item is not in the stock.');
    }
    const request: MaterialRequest = {
      id: newId('mat'),
      trainerId,
      trainerName: trainer.name,
      groupId: group.id,
      groupName: group.name,
      ...(stockItem ? { stockItemId: stockItem.id } : {}),
      itemsNeeded: stockItem ? str(b.itemsNeeded, 'Items', { max: 1000, optional: true }) || stockItem.name : str(b.itemsNeeded, 'Items', { max: 1000 }),
      quantity: str(b.quantity, 'Quantity', { max: 100 }),
      urgency: oneOf(b.urgency, ['low', 'medium', 'urgent'] as const, 'Urgency'),
      status: 'pending',
      requestedAt: today(),
      sessionDate: str(b.sessionDate, 'Session date', { max: 20, optional: true })
    };
    // Optional first message, e.g. what it is for
    const first = str(b.comment, 'Comment', { max: 1000, optional: true });
    if (first) request.comments = [requestComment(req, first)];
    await col('material_requests').doc(request.id).set(request);
    await notify(await adminUserIds(), 'request_new', { trainer: request.trainerName, item: request.itemsNeeded, qty: request.quantity, class: request.groupName }, '#/admin/stock', { except: req.user!.uid });
    res.status(201).json(request);
  })
);

function requestComment(req: AuthedRequest, text: string): RequestComment {
  return {
    id: newId('cmt'),
    authorName: req.user!.displayName,
    role: isAdmin(req.user) ? 'admin' : 'trainer',
    text,
    at: new Date().toISOString()
  };
}

/** The coach who asked, or an admin, adds a message to a request. */
router.post(
  '/material-requests/:id/comments',
  requireRole('trainer', 'admin'),
  ah(async (req, res) => {
    const ref = col('material_requests').doc(req.params.id);
    const request = (await ref.get()).data() as MaterialRequest | undefined;
    if (!request) throw new HttpError(404, 'Request not found.');
    if (!isAdmin(req.user) && request.trainerId !== req.user!.trainerId) throw new HttpError(403, 'This request is not yours.');
    const comment = requestComment(req, str(req.body?.text, 'Comment', { max: 1000 }));
    if ((request.comments?.length || 0) >= 100) throw new HttpError(400, 'Too many comments on this request.');
    await ref.update({ comments: FieldValue.arrayUnion(comment) });
    const params = { author: comment.authorName, item: request.itemsNeeded, text: comment.text.length > 90 ? `${comment.text.slice(0, 90)}…` : comment.text };
    if (comment.role === 'admin') await notify(await trainerUserIds([request.trainerId]), 'request_comment', params, '#/trainer', { except: req.user!.uid });
    else await notify(await adminUserIds(), 'request_comment', params, '#/admin/stock', { except: req.user!.uid });
    res.status(201).json(comment);
  })
);

// ---------- admin only ----------

const adminRouter = Router();
adminRouter.use(requireRole('admin'));
router.use('/admin', adminRouter);

adminRouter.patch(
  '/students/:id',
  ah(async (req, res) => {
    const b = req.body || {};
    const update: Record<string, unknown> = {};
    if (b.status !== undefined) update.status = oneOf(b.status, STUDENT_STATUSES, 'Status');
    if (b.paymentStatus !== undefined) update.paymentStatus = oneOf(b.paymentStatus, PAYMENT_STATUSES, 'Payment status');
    const ref = col('students').doc(req.params.id);
    const snap = await ref.get();
    if (!isLive(snap)) throw new HttpError(404, 'Child not found.');
    const wasWaiting = snap.get('status') === 'waitlist';
    if (b.customMonthlyPrice !== undefined) {
      // The fee follows the classes; a custom price is kept only when it really differs from them
      const custom = b.customMonthlyPrice === null ? null : toMillimes(num(b.customMonthlyPrice, 'Price', { min: 0, max: 10000 }));
      const fields = await enrollmentFields(normalizeStudent(snap.data()!).groupIds, snap.data());
      Object.assign(update, fields);
      update.customMonthlyPrice = custom === null || custom === fields.standardMonthlyPrice ? FieldValue.delete() : custom;
    }
    await ref.update(update);
    if (wasWaiting && update.status === 'accepted') {
      await notify([snap.get('parentUid')], 'child_accepted', { child: snap.get('studentName') }, '#/parent');
    }
    res.json({ ok: true });
  })
);

// ---------- monthly payments ----------

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'transfer', 'cheque', 'card', 'other'];
const thisMonth = () => today().slice(0, 7);

function monthParam(value: unknown): string {
  if (typeof value !== 'string' || !MONTH_RE.test(value)) throw new HttpError(400, 'Month is invalid.');
  return value;
}

const paymentRef = (month: string, studentId: string) => col('payments').doc(`${month}_${studentId}`);

function paymentStatusFor(amountDue: number, amountPaid: number, scholarship: boolean): PaymentRecord['status'] {
  if (scholarship) return 'scholarship';
  if (amountPaid >= amountDue) return 'paid';
  return amountPaid > 0 ? 'partial' : 'pending';
}

/** The student's own status mirrors the current month, so other screens (hub tile) stay right. */
function mirrorStatus(record: PaymentRecord): Student['paymentStatus'] {
  return record.status === 'scholarship' ? 'scholarship' : record.status === 'paid' ? 'paid' : 'pending';
}

/** Save what a child owes and paid for one month. */
adminRouter.put(
  '/payments/:month/:studentId',
  ah(async (req, res) => {
    const month = monthParam(req.params.month);
    const b = req.body || {};
    const studentRef = col('students').doc(req.params.studentId);
    const studentSnap = await studentRef.get();
    if (!isLive(studentSnap)) throw new HttpError(404, 'Child not found.');
    const scholarship = b.scholarship === true;
    const amountDue = scholarship ? 0 : toMillimes(num(b.amountDue, 'Amount due', { min: 0, max: 100000 }));
    const amountPaid = scholarship ? 0 : toMillimes(num(b.amountPaid ?? 0, 'Amount paid', { min: 0, max: 100000 }));
    const paidAt = str(b.paidAt, 'Payment date', { max: 10, optional: true });
    if (paidAt && !DATE_RE.test(paidAt)) throw new HttpError(400, 'Payment date is invalid.');
    const note = str(b.note, 'Note', { max: 500, optional: true });
    const record: PaymentRecord = {
      id: `${month}_${req.params.studentId}`,
      studentId: req.params.studentId,
      month,
      amountDue,
      amountPaid,
      status: paymentStatusFor(amountDue, amountPaid, scholarship),
      ...(amountPaid > 0 && b.method ? { method: oneOf(b.method, PAYMENT_METHODS, 'Payment method') } : {}),
      ...(amountPaid > 0 ? { paidAt: paidAt || today() } : {}),
      ...(note ? { note } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.uid || ''
    };
    // Read and written in one transaction, so two saves at once can't both count the same money as received
    const before = await db.runTransaction(async (tx) => {
      const stored = liveData<PaymentRecord>(await tx.get(paymentRef(month, record.studentId)));
      tx.set(paymentRef(month, record.studentId), writeMoney(record));
      if (month === thisMonth()) tx.update(studentRef, { paymentStatus: mirrorStatus(record) });
      return stored ? readMoney('payments', stored) : undefined;
    });
    // The parent hears about money received (not about a note or a corrected due amount)
    const received = amountPaid - (before?.amountPaid || 0);
    if (received > 0) {
      await notify([studentSnap.get('parentUid')], 'payment_received', { amount: toDinars(received), child: studentSnap.get('studentName'), month: `${month.slice(5)}/${month.slice(0, 4)}` }, '#/parent');
    }
    res.json(sendMoney('payments', record));
  })
);

/** Mark several children as fully paid for one month (e.g. a parent paying for all siblings). */
adminRouter.post(
  '/payments/:month/mark-paid',
  ah(async (req, res) => {
    const month = monthParam(req.params.month);
    const b = req.body || {};
    if (!Array.isArray(b.studentIds) || b.studentIds.length === 0 || b.studentIds.length > 200) {
      throw new HttpError(400, 'Choose between 1 and 200 children.');
    }
    const method = b.method ? oneOf(b.method, PAYMENT_METHODS, 'Payment method') : 'cash';
    const ids = [...new Set(b.studentIds.map((id: unknown) => str(id, 'Child', { max: 100 })))] as string[];
    const [studentSnaps, paymentSnaps] = await Promise.all([
      db.getAll(...ids.map((id) => col('students').doc(id))),
      db.getAll(...ids.map((id) => paymentRef(month, id)))
    ]);
    // Fees follow the current class prices
    const classTotals = new Map<string, number>();
    for (let i = 0; i < ids.length; i++) {
      const data = liveData<Record<string, unknown>>(studentSnaps[i]);
      if (data) classTotals.set(ids[i], (await enrollmentFields(normalizeStudent(data).groupIds)).standardMonthlyPrice);
    }
    const batch = db.batch();
    let count = 0;
    const paid: { parentUid?: string; child: string; amount: number }[] = [];
    ids.forEach((id, i) => {
      const student = liveData<Record<string, unknown>>(studentSnaps[i]);
      if (!student) return;
      const st = normalizeStudent(student);
      const stored = liveData<PaymentRecord>(paymentSnaps[i]);
      const existing = stored ? readMoney('payments', stored) : undefined;
      if (existing?.status === 'scholarship' || (!existing && st.paymentStatus === 'scholarship')) return;
      const amountDue = existing ? existing.amountDue : st.customMonthlyPrice ?? classTotals.get(id) ?? 0;
      const record: PaymentRecord = {
        id: `${month}_${id}`,
        studentId: id,
        month,
        amountDue,
        amountPaid: amountDue,
        status: 'paid',
        method,
        paidAt: today(),
        ...(existing?.note ? { note: existing.note } : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.uid || ''
      };
      batch.set(paymentRef(month, id), writeMoney(record));
      if (month === thisMonth()) batch.update(col('students').doc(id), { paymentStatus: 'paid' });
      count++;
      const received = amountDue - (existing?.amountPaid || 0);
      if (received > 0) paid.push({ parentUid: st.parentUid, child: st.studentName, amount: received });
    });
    await batch.commit();
    const label = `${month.slice(5)}/${month.slice(0, 4)}`;
    for (const p of paid) await notify([p.parentUid], 'payment_received', { amount: toDinars(p.amount), child: p.child, month: label }, '#/parent');
    res.json({ count });
  })
);

/** Forget a month's record (the child goes back to "not paid" at the current price). */
adminRouter.delete(
  '/payments/:month/:studentId',
  ah(async (req, res) => {
    const month = monthParam(req.params.month);
    await softDelete(paymentRef(month, req.params.studentId), req);
    if (month === thisMonth()) {
      const ref = col('students').doc(req.params.studentId);
      const st = liveData<Student>(await ref.get());
      if (st && st.paymentStatus === 'paid') await ref.update({ paymentStatus: 'pending' });
    }
    res.json({ ok: true });
  })
);

/** The admin's student form (add and edit): every field of a child, the parent and the classes. */
async function readStudentForm(b: Record<string, any>, current?: Student) {
  const optional = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && !v.trim());

  // Parent: an account, contact details only, or nobody
  let parent = { parentName: '', parentPhone: '', parentEmail: '' };
  let parentUid: string | undefined;
  if (!optional(b.parentUid)) {
    parentUid = str(b.parentUid, 'Parent', { max: 100 });
    const account = (await col('accounts').doc(parentUid).get()).data() as Account | undefined;
    if (!account) throw new HttpError(404, 'Parent account not found.');
    const stored = (await col('users').doc(parentUid).get()).data() || {};
    parent = { parentName: String(stored.displayName || ''), parentPhone: String(stored.parentPhone || ''), parentEmail: account.email };
  } else {
    parent = {
      parentName: optional(b.parentName) ? '' : str(b.parentName, 'Parent name', { max: 120 }),
      parentPhone: optional(b.parentPhone) ? '' : phone(b.parentPhone),
      parentEmail: optional(b.parentEmail) ? '' : email(b.parentEmail)
    };
  }

  // Classes: a class the child joins must have a free place
  const groups: Group[] = [];
  for (const gid of Array.isArray(b.groupIds) ? b.groupIds.slice(0, 10) : []) {
    const group = await getGroup(str(gid, 'Class', { max: 100 }));
    if (!group) throw new HttpError(404, 'Class not found.');
    const joining = !current?.groupIds.includes(group.id);
    if (joining && group.maxCapacity && (await enrolledCount(group.id)) >= group.maxCapacity) {
      throw new HttpError(409, `"${group.name}" is full (${group.maxCapacity} places).`);
    }
    if (!groups.some((g) => g.id === group.id)) groups.push(group);
  }

  const registeredAt = optional(b.registeredAt) ? current?.registeredAt || today() : str(b.registeredAt, 'Registration date', { max: 10 });
  if (!DATE_RE.test(registeredAt)) throw new HttpError(400, 'Registration date is invalid.');
  const dob = birthDate(b.birthDate);

  return {
    parentUid,
    parent,
    groups,
    fields: {
      studentName: str(b.name, "Child's name", { max: 120 }),
      birthDate: dob,
      studentAge: ageFromBirthDate(dob),
      notes: str(b.notes, 'Notes', { max: 1000, optional: true }),
      photoConsent: b.photoConsent === true,
      registeredAt,
      // With a class the child is accepted; without one the admin chooses
      status: (groups.length || b.status === 'accepted' ? 'accepted' : 'waitlist') as Student['status']
    },
    // Dinars from the form, millimes in the database; null = follow the classes
    customPrice: optional(b.customMonthlyPrice) ? null : toMillimes(num(b.customMonthlyPrice, 'Price', { min: 0, max: 10000 })),
    scholarship: b.scholarship === true
  };
}

/**
 * The admin registers a child directly. The parent is optional: an existing parent account,
 * just contact details (no account), or nobody yet. Classes are optional too; with a class the child is accepted.
 */
adminRouter.post(
  '/students',
  ah(async (req, res) => {
    const form = await readStudentForm(req.body || {});
    const id = newId('std');
    // Prices are in millimes here (getGroup reads them that way); writeMoney marks the document
    const standardMonthlyPrice = form.groups.reduce((sum, g) => sum + g.pricePerMonth, 0);
    const student: Student = {
      id,
      ...(form.parentUid ? { parentUid: form.parentUid } : {}),
      ...form.parent,
      ...form.fields,
      notes: form.fields.notes || 'Registered by the club',
      groupIds: form.groups.map((g) => g.id),
      standardMonthlyPrice,
      ...(form.customPrice !== null && form.customPrice !== standardMonthlyPrice ? { customMonthlyPrice: form.customPrice } : {}),
      paymentStatus: form.scholarship ? 'scholarship' : 'pending'
    };
    const batch = db.batch();
    batch.set(col('students').doc(id), writeMoney(student));
    if (form.parentUid) batch.set(col('users').doc(form.parentUid), { studentIds: FieldValue.arrayUnion(id) }, { merge: true });
    await batch.commit();
    if (form.parentUid) {
      forgetProfile(form.parentUid);
      for (const g of form.groups) await notify([form.parentUid], 'child_class', { child: student.studentName, class: g.name }, '#/parent');
    }
    res.status(201).json({ id });
  })
);

/** The admin edits a child: every field, the parent (moving the child between accounts) and the classes. */
adminRouter.put(
  '/students/:id',
  ah(async (req, res) => {
    const ref = col('students').doc(req.params.id);
    const snap = await ref.get();
    if (!isLive(snap)) throw new HttpError(404, 'Child not found.');
    const current = normalizeStudent(snap.data()!);
    const form = await readStudentForm(req.body || {}, current);
    const groupIds = form.groups.map((g) => g.id);
    const enrollment = await enrollmentFields(groupIds, snap.data());

    const update: Record<string, unknown> = {
      ...enrollment,
      ...form.parent,
      ...form.fields,
      notes: form.fields.notes || FieldValue.delete(),
      groupIds,
      parentUid: form.parentUid ?? FieldValue.delete(),
      customMonthlyPrice: form.customPrice === null || form.customPrice === enrollment.standardMonthlyPrice ? FieldValue.delete() : form.customPrice,
      // A scholarship lasts; taking it away goes back to "to pay" for this month
      ...(form.scholarship ? { paymentStatus: 'scholarship' } : current.paymentStatus === 'scholarship' ? { paymentStatus: 'pending' } : {})
    };

    const batch = db.batch();
    batch.update(ref, update);
    if (current.parentUid !== form.parentUid) {
      if (current.parentUid) batch.set(col('users').doc(current.parentUid), { studentIds: FieldValue.arrayRemove(current.id) }, { merge: true });
      if (form.parentUid) batch.set(col('users').doc(form.parentUid), { studentIds: FieldValue.arrayUnion(current.id) }, { merge: true });
    }
    await batch.commit();
    for (const uid of [current.parentUid, form.parentUid]) if (uid) forgetProfile(uid);

    if (form.parentUid) {
      if (current.status === 'waitlist' && form.fields.status === 'accepted') {
        await notify([form.parentUid], 'child_accepted', { child: form.fields.studentName }, '#/parent');
      }
      for (const g of form.groups.filter((g) => !current.groupIds.includes(g.id))) {
        await notify([form.parentUid], 'child_class', { child: form.fields.studentName, class: g.name }, '#/parent');
      }
    }
    res.json({ ok: true });
  })
);

/** Add a child to a class (a child can be in several classes). */
adminRouter.post(
  '/students/:id/classes',
  ah(async (req, res) => {
    const group = await getGroup(str(req.body?.groupId, 'Class', { max: 100 }));
    if (!group) throw new HttpError(404, 'Class not found.');
    const ref = col('students').doc(req.params.id);
    const snap = await ref.get();
    if (!isLive(snap)) throw new HttpError(404, 'Child not found.');
    const student = normalizeStudent(snap.data()!);
    if (group.maxCapacity && !student.groupIds.includes(group.id) && (await enrolledCount(group.id)) >= group.maxCapacity) {
      throw new HttpError(409, `"${group.name}" is full (${group.maxCapacity} places).`);
    }
    const groupIds = student.groupIds.includes(group.id) ? student.groupIds : [...student.groupIds, group.id];
    await ref.update({
      groupIds,
      ...(await enrollmentFields(groupIds, snap.data())),
      ...(student.status === 'waitlist' ? { status: 'accepted' } : {})
    });
    if (!student.groupIds.includes(group.id)) {
      await notify([student.parentUid], 'child_class', { child: student.studentName, class: group.name }, '#/parent');
    }
    res.json({ groupIds });
  })
);

/** Remove a child from one class. */
adminRouter.delete(
  '/students/:id/classes/:groupId',
  ah(async (req, res) => {
    const ref = col('students').doc(req.params.id);
    const snap = await ref.get();
    if (!isLive(snap)) throw new HttpError(404, 'Child not found.');
    const groupIds = normalizeStudent(snap.data()!).groupIds.filter((id) => id !== req.params.groupId);
    await ref.update({ groupIds, ...(await enrollmentFields(groupIds, snap.data())) });
    res.json({ groupIds });
  })
);

adminRouter.delete(
  '/students/:id',
  ah(async (req, res) => {
    await softDelete(col('students').doc(req.params.id), req);
    res.json({ ok: true });
  })
);

// ---------- club cash book (caisse) ----------

const CASH_TYPES = ['income', 'expense'] as const;
const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Default categories, created the first time the cash book is opened (in the admin's language) */
const DEFAULT_CASH_CATEGORIES: Record<'en' | 'fr' | 'ar', [CashCategory['type'], string, string, CashCategory['system']?][]> = {
  en: [
    ['income', 'Tuition fees', '#15803d', 'tuition'], ['income', 'Club shop', '#0f766e', 'shop'], ['income', 'Registration fees', '#65a30d'],
    ['income', 'Sponsors & donations', '#c9a227'], ['income', 'Events & competitions', '#7c3aed'], ['income', 'Other income', '#64748b'],
    ['expense', 'Rent', '#c11e3d'], ['expense', 'Salaries', '#6a0d1f'], ['expense', 'Robotics equipment', '#ea580c'], ['expense', 'Supplies', '#d97706'],
    ['expense', 'Electricity & water', '#0284c7'], ['expense', 'Internet & phone', '#4f46e5'], ['expense', 'Transport', '#0d9488'],
    ['expense', 'Marketing', '#db2777'], ['expense', 'Competitions & trips', '#9333ea'], ['expense', 'Shop stock', '#475569'], ['expense', 'Other expenses', '#78716c']
  ],
  fr: [
    ['income', 'Frais de scolarité', '#15803d', 'tuition'], ['income', 'Boutique du club', '#0f766e', 'shop'], ['income', 'Frais d’inscription', '#65a30d'],
    ['income', 'Sponsors et dons', '#c9a227'], ['income', 'Événements et compétitions', '#7c3aed'], ['income', 'Autres revenus', '#64748b'],
    ['expense', 'Loyer', '#c11e3d'], ['expense', 'Salaires', '#6a0d1f'], ['expense', 'Matériel robotique', '#ea580c'], ['expense', 'Fournitures', '#d97706'],
    ['expense', 'Électricité et eau', '#0284c7'], ['expense', 'Internet et téléphone', '#4f46e5'], ['expense', 'Transport', '#0d9488'],
    ['expense', 'Marketing', '#db2777'], ['expense', 'Compétitions et sorties', '#9333ea'], ['expense', 'Stock boutique', '#475569'], ['expense', 'Autres dépenses', '#78716c']
  ],
  ar: [
    ['income', 'رسوم الدراسة', '#15803d', 'tuition'], ['income', 'متجر النادي', '#0f766e', 'shop'], ['income', 'رسوم التسجيل', '#65a30d'],
    ['income', 'رعاة وتبرعات', '#c9a227'], ['income', 'فعاليات ومسابقات', '#7c3aed'], ['income', 'مداخيل أخرى', '#64748b'],
    ['expense', 'الكراء', '#c11e3d'], ['expense', 'الأجور', '#6a0d1f'], ['expense', 'معدات الروبوتيك', '#ea580c'], ['expense', 'لوازم', '#d97706'],
    ['expense', 'الكهرباء والماء', '#0284c7'], ['expense', 'الإنترنت والهاتف', '#4f46e5'], ['expense', 'النقل', '#0d9488'],
    ['expense', 'التسويق', '#db2777'], ['expense', 'مسابقات ورحلات', '#9333ea'], ['expense', 'مخزون المتجر', '#475569'], ['expense', 'مصاريف أخرى', '#78716c']
  ]
};

/** Categories (archived ones too, so old entries keep their name) and entries. */
adminRouter.get(
  '/cash',
  ah(async (req, res) => {
    let snap = await col('cash_categories').get();
    if (snap.empty) {
      const lang = req.query.lang === 'fr' || req.query.lang === 'ar' ? req.query.lang : 'en';
      const batch = db.batch();
      DEFAULT_CASH_CATEGORIES[lang].forEach(([type, name, color, system], i) => {
        const id = system ? `cat-${system}` : `cat-${String(i).padStart(2, '0')}-${col('_ids').doc().id.slice(0, 6)}`;
        batch.set(col('cash_categories').doc(id), { id, type, name, color, ...(system ? { system } : {}) });
      });
      await batch.commit();
      snap = await col('cash_categories').get();
    }
    const categories = snap.docs.map((d) => d.data() as CashCategory);
    res.json({ categories, entries: (await listMoney<CashEntry>('cash_entries')).map((e) => sendMoney('cash_entries', e)) });
  })
);

function parseCategory(b: Record<string, unknown>) {
  const color = str(b.color, 'Color', { max: 7 });
  if (!HEX_RE.test(color)) throw new HttpError(400, 'Color is invalid.');
  return { name: str(b.name, 'Name', { max: 80 }), color };
}

adminRouter.post(
  '/cash/categories',
  ah(async (req, res) => {
    const b = req.body || {};
    const category: CashCategory = { id: newId('cat'), type: oneOf(b.type, CASH_TYPES, 'Type'), ...parseCategory(b) };
    await col('cash_categories').doc(category.id).set(category);
    res.status(201).json(category);
  })
);

adminRouter.put(
  '/cash/categories/:id',
  ah(async (req, res) => {
    const ref = col('cash_categories').doc(req.params.id);
    if (!isLive(await ref.get())) throw new HttpError(404, 'Category not found.');
    await ref.update(parseCategory(req.body || {}));
    res.json({ ok: true });
  })
);

/** Archive a category (its entries keep it); the automatic ones (fees, shop) stay. */
adminRouter.delete(
  '/cash/categories/:id',
  ah(async (req, res) => {
    const ref = col('cash_categories').doc(req.params.id);
    const cat = liveData<CashCategory>(await ref.get());
    if (!cat) throw new HttpError(404, 'Category not found.');
    if (cat.system) throw new HttpError(403, 'This category is filled automatically and can’t be removed.');
    await softDelete(ref, req);
    res.json({ ok: true });
  })
);

async function parseCashEntry(b: Record<string, unknown>) {
  const type = oneOf(b.type, CASH_TYPES, 'Type');
  const category = liveData<CashCategory>(await col('cash_categories').doc(str(b.categoryId, 'Category', { max: 100 })).get());
  if (!category) throw new HttpError(404, 'Category not found.');
  if (category.type !== type) throw new HttpError(400, 'This category is for the other type of entry.');
  // Fees and shop sales come from the Payments and Shop pages; adding them here would count them twice
  if (category.system) throw new HttpError(400, 'This category is filled automatically.');
  const date = str(b.date, 'Date', { max: 10 });
  if (!DATE_RE.test(date)) throw new HttpError(400, 'Date is invalid.');
  const note = str(b.note, 'Note', { max: 1000, optional: true });
  return {
    type,
    amount: toMillimes(num(b.amount, 'Amount', { min: 0.001, max: 10_000_000 })),
    date,
    categoryId: category.id,
    label: str(b.label, 'Label', { max: 200 }),
    ...(note ? { note } : {}),
    ...(b.method ? { method: oneOf(b.method, PAYMENT_METHODS, 'Payment method') } : {})
  };
}

adminRouter.post(
  '/cash/entries',
  ah(async (req, res) => {
    const entry: CashEntry = {
      id: newId('cash'),
      ...(await parseCashEntry(req.body || {})),
      createdAt: new Date().toISOString(),
      createdBy: req.user!.displayName
    };
    await col('cash_entries').doc(entry.id).set(writeMoney(entry));
    res.status(201).json(sendMoney('cash_entries', entry));
  })
);

adminRouter.put(
  '/cash/entries/:id',
  ah(async (req, res) => {
    const ref = col('cash_entries').doc(req.params.id);
    const existing = liveData<CashEntry>(await ref.get());
    if (!existing) throw new HttpError(404, 'Entry not found.');
    const fields = await parseCashEntry(req.body || {});
    // set() replaces the document, so optional fields that were cleared disappear
    await ref.set(writeMoney({ id: existing.id, createdAt: existing.createdAt, createdBy: existing.createdBy, ...fields, updatedAt: new Date().toISOString() }));
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/cash/entries/:id',
  ah(async (req, res) => {
    await softDelete(col('cash_entries').doc(req.params.id), req);
    res.json({ ok: true });
  })
);

// ---------- sign-in accounts (Team page) ----------

/** Every account with its role, name and links (coach record, children). */
async function accountSummaries(): Promise<AccountSummary[]> {
  const [accounts, users, trainers, students] = await Promise.all([
    col('accounts').get(),
    col('users').get(),
    listAll<Trainer>('trainers'),
    listAll<Record<string, unknown>>('students').then((l) => l.map(normalizeStudent))
  ]);
  const userById = new Map(users.docs.map((d) => [d.id, d.data()]));
  const trainerByEmail = new Map(trainers.map((tr) => [tr.email.toLowerCase(), tr]));
  return accounts.docs
    .map((d) => d.data() as Account)
    .map((a) => {
      const u = userById.get(a.id) || {};
      const owner = isOwnerEmail(a.email);
      const trainer = trainerByEmail.get(a.email);
      const role: AccountSummary['role'] = owner || a.role === 'admin' ? 'admin' : trainer ? 'trainer' : 'parent';
      const children = students.filter((s) => s.parentUid === a.id).map((s) => ({ id: s.id, name: s.studentName }));
      const phoneNumber = (u.parentPhone as string | undefined) || trainer?.phone;
      return {
        id: a.id,
        email: a.email,
        name: (u.displayName as string) || trainer?.name || a.email.split('@')[0],
        role,
        owner,
        createdAt: a.createdAt,
        ...(phoneNumber ? { phone: phoneNumber } : {}),
        ...(u.photoURL ? { photoURL: u.photoURL as string } : {}),
        ...(trainer ? { trainerId: trainer.id } : {}),
        children
      };
    })
    .sort((x, y) => x.name.localeCompare(y.name));
}

adminRouter.get(
  '/accounts',
  ah(async (_req, res) => res.json(await accountSummaries()))
);

/** Gives children to a parent account (students.parentUid); returns their ids. */
async function linkChildren(
  batch: FirebaseFirestore.WriteBatch,
  uid: string,
  studentIds: unknown,
  known?: { parentName: string; parentPhone: string; parentEmail: string }
) {
  if (!Array.isArray(studentIds) || studentIds.length > 20) throw new HttpError(400, 'Too many children.');
  const ids = [...new Set(studentIds.map((v) => str(v, 'Child', { max: 100 })))];
  // Children registered by the club without a parent get this account's name, phone and email
  let contact: { parentName: string; parentPhone: string; parentEmail: string } | null = known ?? null;
  for (const id of ids) {
    const snap = await col('students').doc(id).get();
    if (!isLive(snap)) throw new HttpError(404, 'Child not found.');
    const st = snap.data() as Partial<Student>;
    const missing = !st.parentName || !st.parentPhone || !st.parentEmail;
    if (missing && !contact) {
      const [account, user] = await Promise.all([col('accounts').doc(uid).get(), col('users').doc(uid).get()]);
      contact = { parentName: String(user.get('displayName') || ''), parentPhone: String(user.get('parentPhone') || ''), parentEmail: String(account.get('email') || '') };
    }
    batch.update(col('students').doc(id), {
      parentUid: uid,
      ...(missing && contact
        ? {
            ...(!st.parentName && contact.parentName ? { parentName: contact.parentName } : {}),
            ...(!st.parentPhone && contact.parentPhone ? { parentPhone: contact.parentPhone } : {}),
            ...(!st.parentEmail && contact.parentEmail ? { parentEmail: contact.parentEmail } : {})
          }
        : {})
    });
  }
  return ids;
}

/** The admin creates an account for an admin, a coach or a parent. */
adminRouter.post(
  '/accounts',
  ah(async (req, res) => {
    const b = req.body || {};
    const role = oneOf(b.role, ['admin', 'trainer', 'parent'] as const, 'Role');
    const accountEmail = email(b.email);
    const pw = password(b.password);
    const name = str(b.name, 'Name', { max: 120 });
    const phoneNumber = role === 'parent' ? phone(b.phone) : b.phone ? phone(b.phone) : '';
    if (await findAccountByEmail(accountEmail)) throw new HttpError(409, 'An account already exists with this email.');
    // A parent email must not be a coach's or owner's email (it would sign in as them)
    const trainerSnap = await col('trainers').where('email', '==', accountEmail).limit(1).get();
    const existingTrainer = trainerSnap.docs.find(isLive);
    if (role === 'parent' && (existingTrainer || isOwnerEmail(accountEmail))) {
      throw new HttpError(409, 'This email belongs to club staff.');
    }

    const uid = col('accounts').doc().id;
    const batch = db.batch();
    const account: Account = {
      id: uid,
      email: accountEmail,
      passwordHash: await hashPassword(pw),
      createdAt: new Date().toISOString(),
      createdBy: req.user!.uid,
      ...(role === 'admin' ? { role: 'admin' as const } : {})
    };
    batch.create(accountEmailRef(accountEmail), { accountId: uid }); // fails if the email was taken meanwhile
    batch.set(col('accounts').doc(uid), account);

    const studentIds = role === 'parent' ? await linkChildren(batch, uid, b.studentIds ?? [], { parentName: name, parentPhone: phoneNumber, parentEmail: accountEmail }) : [];
    // Children the admin registers here for the first time (they start on the waitlist, like any registration)
    if (role === 'parent' && Array.isArray(b.newChildren) && b.newChildren.length) {
      studentIds.push(
        ...addChildren(batch, uid, { parentName: name, parentPhone: phoneNumber, parentEmail: accountEmail, photoConsent: false }, b.newChildren, 'Registered by the club')
      );
    }
    batch.set(
      col('users').doc(uid),
      {
        uid,
        email: accountEmail,
        displayName: name,
        ...(phoneNumber ? { parentPhone: phoneNumber } : {}),
        ...(role === 'parent' ? { studentIds } : {}),
        createdAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    // A coach signs in as the coach record with the same email; create it when there is none yet
    if (role === 'trainer' && !existingTrainer) {
      const trainer: Trainer = {
        id: newId('trn'),
        name,
        email: accountEmail,
        phone: phoneNumber,
        specialization: str(b.specialization, 'Specialization', { max: 200, optional: true }),
        avatar: '',
        bio: ''
      };
      batch.set(col('trainers').doc(trainer.id), trainer);
    }
    try {
      await batch.commit();
    } catch (err) {
      if ((err as { code?: number }).code === 6) throw new HttpError(409, 'An account already exists with this email.');
      throw err;
    }
    forgetAllProfiles();
    res.status(201).json((await accountSummaries()).find((a) => a.id === uid));
  })
);

/** "View as this parent": a session on a parent's account, marked with the admin's name, for 2 hours. */
adminRouter.post(
  '/accounts/:id/view-as',
  ah(async (req, res) => {
    const account = (await col('accounts').doc(req.params.id).get()).data() as Account | undefined;
    if (!account) throw new HttpError(404, 'Account not found.');
    const profile = await resolveProfile(account);
    // Only families: never another admin's or a coach's account
    if (profile.roles.some((r) => r !== 'parent')) throw new HttpError(403, 'Only parent accounts can be viewed.');
    res.json({ token: await createSession(account.id, req.user!.displayName) });
  })
);

/** New password (the person is signed out everywhere else). */
adminRouter.put(
  '/accounts/:id/password',
  ah(async (req, res) => {
    const pw = password(req.body?.password);
    const ref = col('accounts').doc(req.params.id);
    const account = (await ref.get()).data() as Account | undefined;
    if (!account) throw new HttpError(404, 'Account not found.');
    // Another admin must not be able to lock the club owner out
    if (isOwnerEmail(account.email) && req.params.id !== req.user!.uid) throw new HttpError(403, 'Only the club owner can change the owner’s password.');
    await ref.update({ passwordHash: await hashPassword(pw) });
    if (req.params.id !== req.user!.uid) await deleteSessionsOf(req.params.id);
    res.json({ ok: true });
  })
);

/** Make an account admin, or take the admin role back. */
adminRouter.patch(
  '/accounts/:id/admin',
  ah(async (req, res) => {
    const ref = col('accounts').doc(req.params.id);
    const account = (await ref.get()).data() as Account | undefined;
    if (!account) throw new HttpError(404, 'Account not found.');
    if (isOwnerEmail(account.email)) throw new HttpError(403, 'The club owner is always an admin.');
    if (req.params.id === req.user!.uid) throw new HttpError(403, 'You can’t change your own role.');
    await ref.update({ role: req.body?.admin === true ? 'admin' : FieldValue.delete() });
    forgetAllProfiles();
    res.json({ ok: true });
  })
);

/** Change which children a parent account sees. */
adminRouter.put(
  '/accounts/:id/children',
  ah(async (req, res) => {
    const uid = req.params.id;
    if (!(await col('accounts').doc(uid).get()).exists) throw new HttpError(404, 'Account not found.');
    const batch = db.batch();
    const ids = await linkChildren(batch, uid, req.body?.studentIds ?? []);
    // Children no longer chosen are unlinked from this account
    const current = await col('students').where('parentUid', '==', uid).get();
    current.docs.filter((d) => !ids.includes(d.id)).forEach((d) => batch.update(d.ref, { parentUid: FieldValue.delete() }));
    batch.set(col('users').doc(uid), { studentIds: ids }, { merge: true });
    await batch.commit();
    forgetProfile(uid);
    res.json({ ok: true });
  })
);

/** Remove a sign-in account. The coach record, the children and their history stay. */
adminRouter.delete(
  '/accounts/:id',
  ah(async (req, res) => {
    const account = (await col('accounts').doc(req.params.id).get()).data() as Account | undefined;
    if (!account) throw new HttpError(404, 'Account not found.');
    if (isOwnerEmail(account.email)) throw new HttpError(403, 'The club owner’s account can’t be deleted.');
    if (req.params.id === req.user!.uid) throw new HttpError(403, 'You can’t delete your own account.');
    await deleteAccount(req.params.id);
    forgetAllProfiles();
    res.json({ ok: true });
  })
);

/**
 * Take a child out of the trash. They get back the classes that still exist and still have room;
 * the names of the others are returned so the admin can place the child again.
 */
adminRouter.post(
  '/students/:id/restore',
  ah(async (req, res) => {
    const ref = col('students').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists || !snap.get('deletedAt')) throw new HttpError(404, 'This child is not in the trash.');
    const student = normalizeStudent(snap.data()!);
    const kept: string[] = [];
    const dropped: string[] = [];
    for (const id of student.groupIds) {
      const group = await getGroup(id);
      if (!group) continue;
      if (group.maxCapacity && (await enrolledCount(group.id)) >= group.maxCapacity) dropped.push(group.name);
      else kept.push(id);
    }
    await ref.update({
      deletedAt: FieldValue.delete(),
      deletedBy: FieldValue.delete(),
      restoredAt: new Date().toISOString(),
      groupIds: kept,
      ...(await enrollmentFields(kept, snap.data()))
    });
    res.json({ groupIds: kept, droppedClasses: dropped });
  })
);

function parseTrainerIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, 'Choose at least one trainer.');
  if (value.length > 20) throw new HttpError(400, 'Too many trainers.');
  return [...new Set(value.map((id) => str(id, 'Trainer', { max: 100 })))];
}

/** "9:00-11:00" / "09:00 - 11:00" -> "09:00 - 11:00"; the end must be after the start */
function timeSlot(value: unknown): string {
  const m = str(value, 'Time', { max: 30 }).match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
  if (!m) throw new HttpError(400, 'The time must look like 09:00 - 11:00.');
  const [sh, sm, eh, em] = m.slice(1).map(Number);
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) throw new HttpError(400, 'The time is invalid.');
  if (eh * 60 + em <= sh * 60 + sm) throw new HttpError(400, 'The end time must be after the start time.');
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(sh)}:${pad(sm)} - ${pad(eh)}:${pad(em)}`;
}

async function enrolledCount(groupId: string): Promise<number> {
  const snap = await col('students').where('groupIds', 'array-contains', groupId).get();
  return snap.docs.filter(isLive).length;
}

const optionalNum = (value: unknown, field: string, range: { min: number; max: number }) =>
  value === undefined || value === null || value === '' ? undefined : num(value, field, range);

/** A class from the form (money in millimes). A new image (data URL) is uploaded to Storage. */
async function parseGroup(b: Record<string, unknown>, id: string): Promise<Group> {
  const ageMin = optionalNum(b.ageMin, 'Minimum age', { min: 3, max: 22 });
  const ageMax = optionalNum(b.ageMax, 'Maximum age', { min: 3, max: 22 });
  if (ageMin !== undefined && ageMax !== undefined && ageMax < ageMin) throw new HttpError(400, 'The maximum age must not be below the minimum age.');
  return {
    id,
    name: str(b.name, 'Class name', { max: 120 }),
    description: str(b.description, 'Description', { max: 3000, optional: true }),
    pricePerMonth: toMillimes(num(b.pricePerMonth, 'Price', { min: 0, max: 10000 })),
    trainerIds: parseTrainerIds(b.trainerIds),
    dayOfWeek: oneOf(b.dayOfWeek, DAYS, 'Day'),
    timeSlot: timeSlot(b.timeSlot),
    room: str(b.room, 'Room', { max: 60, optional: true }),
    // Optional: empty or 0 means no limit
    maxCapacity:
      b.maxCapacity === undefined || b.maxCapacity === null || b.maxCapacity === '' || Number(b.maxCapacity) === 0
        ? undefined
        : num(b.maxCapacity, 'Capacity', { min: 1, max: 500 }),
    // Optional: empty means the default class picture
    imageUrl: await imageField(b.imageUrl, 'groups'),
    ageMin,
    ageMax,
    level: b.level === undefined || b.level === null || b.level === '' ? undefined : oneOf(b.level, GROUP_LEVELS, 'Level')
  };
}

adminRouter.post(
  '/groups',
  ah(async (req, res) => {
    const group = await parseGroup(req.body || {}, newId('grp'));
    await col('groups').doc(group.id).set(writeMoney(group));
    res.status(201).json(sendMoney('groups', group));
  })
);

adminRouter.put(
  '/groups/:id',
  ah(async (req, res) => {
    const before = await getGroup(req.params.id);
    if (!before) throw new HttpError(404, 'Class not found.');
    const group = await parseGroup(req.body || {}, req.params.id);
    const enrolled = await enrolledCount(group.id);
    if (group.maxCapacity && group.maxCapacity < enrolled) {
      throw new HttpError(400, `${enrolled} students are already in this class: the capacity can't be lower.`);
    }
    await col('groups').doc(group.id).set(writeMoney(group));
    await replacedImage(before.imageUrl, group.imageUrl);
    // A new price changes the standard price of every child in the class
    if (before.pricePerMonth !== group.pricePerMonth) {
      const members = (await col('students').where('groupIds', 'array-contains', group.id).get()).docs.filter(isLive);
      await Promise.all(members.map(async (d) => d.ref.update(await enrollmentFields(normalizeStudent(d.data()!).groupIds, d.data()))));
    }
    res.json(sendMoney('groups', group));
  })
);

adminRouter.delete(
  '/groups/:id',
  ah(async (req, res) => {
    const members = (await col('students').where('groupIds', 'array-contains', req.params.id).get()).docs.filter(isLive);
    // The class is kept (soft delete) with the list of its students, so it could be restored later
    await softDelete(col('groups').doc(req.params.id), req, { studentIdsAtDeletion: members.map((d) => d.id) });
    // Update each child's price now that this class is gone
    for (const d of members) {
      const remaining = normalizeStudent(d.data()!).groupIds.filter((id) => id !== req.params.id);
      await d.ref.update({ groupIds: remaining, ...(await enrollmentFields(remaining, d.data())) });
    }
    res.json({ ok: true });
  })
);

/** Sets (or clears with null) a trainer's date of birth, used for the birthdays card. */
adminRouter.patch(
  '/trainers/:id/birth-date',
  ah(async (req, res) => {
    const ref = col('trainers').doc(req.params.id);
    if (!isLive(await ref.get())) throw new HttpError(404, 'Trainer not found.');
    const value = req.body?.birthDate;
    await ref.update({ birthDate: value === null || value === '' ? FieldValue.delete() : dateOfBirth(value, 16, 100) });
    res.json({ ok: true });
  })
);

function parseStaff(b: Record<string, unknown>, id: string, createdAt: string): StaffMember {
  return {
    id,
    name: str(b.name, 'Name', { max: 120 }),
    role: oneOf(b.role, ['admin', 'worker'] as const, 'Role'),
    jobTitle: str(b.jobTitle, 'Job title', { max: 80, optional: true }) || undefined,
    birthDate: dateOfBirth(b.birthDate, 14, 100),
    createdAt
  };
}

adminRouter.post(
  '/staff',
  ah(async (req, res) => {
    const member = parseStaff(req.body || {}, newId('stf'), new Date().toISOString());
    await col('staff_members').doc(member.id).set(member);
    res.status(201).json(member);
  })
);

adminRouter.put(
  '/staff/:id',
  ah(async (req, res) => {
    const ref = col('staff_members').doc(req.params.id);
    const existing = liveData<StaffMember>(await ref.get());
    if (!existing) throw new HttpError(404, 'Team member not found.');
    const member = parseStaff(req.body || {}, existing.id, existing.createdAt);
    await ref.set(member);
    res.json(member);
  })
);

adminRouter.delete(
  '/staff/:id',
  ah(async (req, res) => {
    await softDelete(col('staff_members').doc(req.params.id), req);
    res.json({ ok: true });
  })
);

adminRouter.put(
  '/trainers/:id',
  ah(async (req, res) => {
    const b = req.body || {};
    const trainer: Trainer = {
      id: req.params.id,
      name: str(b.name, 'Name', { max: 120 }),
      specialization: str(b.specialization, 'Specialization', { max: 200, optional: true }),
      specialty: str(b.specialty, 'Specialty', { max: 200, optional: true }) || undefined,
      // Lower-cased so it matches the sign-in email (this is how trainers get their role)
      email: str(b.email, 'Email', { max: 200 }).toLowerCase(),
      phone: str(b.phone, 'Phone', { max: 40, optional: true }),
      avatar: (await imageField(b.avatar, 'photos/trainers', { maxBytes: 150_000, field: 'Photo' })) || '',
      bio: str(b.bio, 'Bio', { max: 3000, optional: true })
    };
    // Keep the date of birth (set separately) unless a new one is given
    const previous = liveData<Trainer>(await col('trainers').doc(trainer.id).get());
    const dob = b.birthDate ? dateOfBirth(b.birthDate, 16, 100) : previous?.birthDate;
    if (dob) trainer.birthDate = dob;
    await col('trainers').doc(trainer.id).set(trainer);
    await replacedImage(previous?.avatar, trainer.avatar);
    forgetAllProfiles();
    res.json(trainer);
  })
);

adminRouter.patch(
  '/material-requests/:id',
  ah(async (req, res) => {
    const b = req.body || {};
    const ref = col('material_requests').doc(req.params.id);
    let changed: { request: MaterialRequest; status: MaterialRequest['status']; reason: string } | null = null;
    let lowItem: { name: string; left: number } | null = null;
    await db.runTransaction(async (tx) => {
      const request = (await tx.get(ref)).data() as MaterialRequest | undefined;
      if (!request) throw new HttpError(404, 'Request not found.');
      const status = b.status === undefined ? request.status : oneOf(b.status, ['pending', 'approved', 'delivered', 'refused'] as const, 'Status');
      // The admin can link (or unlink with null) a request to a stock item, e.g. one that was typed by hand
      let stockItemId = request.stockItemId;
      if (b.stockItemId !== undefined) {
        if (request.stockDeducted) throw new HttpError(409, 'Put the request back to “approved” before changing its item.');
        stockItemId = b.stockItemId === null ? undefined : str(b.stockItemId, 'Item', { max: 100 });
      }
      const at = new Date().toISOString();
      const update: Record<string, unknown> = {
        status,
        stockItemId: stockItemId ?? FieldValue.delete(),
        ...(status !== request.status ? { statusChangedAt: at } : {})
      };
      const by = req.user!.displayName;
      // Refused: the reason (optional) goes to the conversation, so the coach reads why
      const reason = status === 'refused' && status !== request.status ? str(b.reason, 'Reason', { max: 1000, optional: true }) : '';
      if (reason) update.comments = FieldValue.arrayUnion(requestComment(req, reason));
      // Delivered: the units leave the stock (once). Back to pending/approved: they come back.
      if (status === 'delivered' && !request.stockDeducted && stockItemId) {
        const qty = parseInt(String(request.quantity), 10);
        if (qty > 0) {
          const itemRef = col('stock_items').doc(stockItemId);
          const item = liveData<StockItem>(await tx.get(itemRef));
          if (!item) throw new HttpError(404, 'Stock item not found.');
          const breakdown = unitBreakdown(item);
          if (breakdown.available < qty) throw new HttpError(409, `Only ${breakdown.available} ${item.unit || ''} available of “${item.name}”.`.replace('  ', ' '));
          tx.update(itemRef, { quantity: item.quantity - qty, units: unitsField(breakdown), status: FieldValue.delete(), updatedAt: at });
          const mv: StockMovement = { id: newId('mv'), itemId: item.id, delta: -qty, reason: 'request', requestId: request.id, note: `${request.trainerName} · ${request.groupName}`, at, by };
          tx.set(col('stock_movements').doc(mv.id), mv);
          update.stockDeducted = qty;
          const left = item.quantity - qty;
          if (item.minQuantity !== undefined && left <= item.minQuantity && item.quantity > item.minQuantity) lowItem = { name: item.name, left };
        }
      } else if (status !== 'delivered' && request.stockDeducted && request.stockItemId) {
        const itemRef = col('stock_items').doc(request.stockItemId);
        const item = liveData<StockItem>(await tx.get(itemRef));
        if (item) {
          tx.update(itemRef, { quantity: item.quantity + request.stockDeducted, units: unitsField(unitBreakdown(item)), status: FieldValue.delete(), updatedAt: at });
          const mv: StockMovement = { id: newId('mv'), itemId: item.id, delta: request.stockDeducted, reason: 'request_undo', requestId: request.id, at, by };
          tx.set(col('stock_movements').doc(mv.id), mv);
        }
        update.stockDeducted = FieldValue.delete();
      }
      tx.update(ref, update);
      changed = status !== request.status ? { request, status, reason } : null;
    });
    // The coach hears when the request is approved, delivered or refused
    const c = changed as { request: MaterialRequest; status: MaterialRequest['status']; reason: string } | null;
    if (c && c.status !== 'pending') {
      const type = c.status === 'approved' ? 'request_approved' : c.status === 'delivered' ? 'request_delivered' : 'request_refused';
      await notify(await trainerUserIds([c.request.trainerId]), type, { item: c.request.itemsNeeded, qty: c.request.quantity, reason: c.reason }, '#/trainer', { except: req.user!.uid });
    }
    const low = lowItem as { name: string; left: number } | null;
    if (low) await notify(await adminUserIds(), 'stock_low', { item: low.name, qty: low.left }, '#/admin/stock');
    res.json({ ok: true });
  })
);

// ---------- stock (equipment) ----------


function parseNamed(b: Record<string, unknown>, withColor: boolean) {
  const out: Record<string, string> = { name: str(b.name, 'Name', { max: 80 }) };
  if (withColor) {
    const color = str(b.color, 'Color', { max: 7 });
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new HttpError(400, 'Color is invalid.');
    out.color = color;
  }
  return out;
}

for (const [path, collection, withColor, prefix] of [
  ['categories', 'stock_categories', true, 'scat'],
  ['locations', 'stock_locations', false, 'sloc']
] as const) {
  adminRouter.post(
    `/stock/${path}`,
    ah(async (req, res) => {
      const doc = { id: newId(prefix), ...parseNamed(req.body || {}, withColor) };
      await col(collection).doc(doc.id).set(doc);
      res.status(201).json(doc);
    })
  );
  adminRouter.put(
    `/stock/${path}/:id`,
    ah(async (req, res) => {
      const ref = col(collection).doc(req.params.id);
      if (!isLive(await ref.get())) throw new HttpError(404, 'Not found.');
      await ref.update(parseNamed(req.body || {}, withColor));
      res.json({ ok: true });
    })
  );
  // Archived, not erased: items keep showing the name
  adminRouter.delete(
    `/stock/${path}/:id`,
    ah(async (req, res) => {
      await softDelete(col(collection).doc(req.params.id), req);
      res.json({ ok: true });
    })
  );
}

async function parseStockItem(b: Record<string, unknown>) {
  const opt = (v: unknown, field: string, max = 200) => str(v, field, { max, optional: true }) || undefined;
  const categoryId = opt(b.categoryId, 'Category', 100);
  const locationId = opt(b.locationId, 'Location', 100);
  if (categoryId && !isLive(await col('stock_categories').doc(categoryId).get())) throw new HttpError(404, 'Category not found.');
  if (locationId && !isLive(await col('stock_locations').doc(locationId).get())) throw new HttpError(404, 'Place not found.');
  const imageUrl = await imageField(b.imageUrl, 'stock', { maxBytes: 300_000, field: 'Photo' });
  const quantity = num(b.quantity ?? 0, 'Quantity', { min: 0, max: 1_000_000 });
  // Pieces in use, in repair, broken or lost; the others are available
  const rawUnits = (b.units && typeof b.units === 'object' ? b.units : {}) as Record<string, unknown>;
  const counts = Object.fromEntries(UNAVAILABLE_STATES.map((s) => [s, rawUnits[s] === undefined ? 0 : num(rawUnits[s], 'Pieces', { min: 0, max: 1_000_000 })]));
  const breakdown = unitBreakdown({ quantity, units: counts });
  if (UNAVAILABLE_STATES.reduce((sum, s) => sum + breakdown[s], 0) > quantity) throw new HttpError(400, 'More pieces in use, in repair, broken or lost than the total quantity.');
  return {
    name: str(b.name, 'Name', { max: 120 }),
    reference: opt(b.reference, 'Reference', 80),
    categoryId,
    locationId,
    quantity,
    units: unitsField(breakdown),
    unit: opt(b.unit, 'Unit', 20),
    minQuantity: b.minQuantity === undefined || b.minQuantity === null || b.minQuantity === '' ? undefined : num(b.minQuantity, 'Minimum', { min: 0, max: 1_000_000 }),
    imageUrl,
    notes: opt(b.notes, 'Notes', 2000),
    hiddenFromTrainers: b.hiddenFromTrainers === true ? true : undefined
  };
}

adminRouter.post(
  '/stock/items',
  ah(async (req, res) => {
    const at = new Date().toISOString();
    const item: StockItem = { id: newId('stk'), ...(await parseStockItem(req.body || {})), createdAt: at };
    const mv: StockMovement = { id: newId('mv'), itemId: item.id, delta: item.quantity, reason: 'created', at, by: req.user!.displayName };
    const batch = db.batch();
    // JSON round trip: Firestore rejects undefined fields
    batch.set(col('stock_items').doc(item.id), JSON.parse(JSON.stringify(item)));
    if (item.quantity) batch.set(col('stock_movements').doc(mv.id), mv);
    await batch.commit();
    res.status(201).json(item);
  })
);

adminRouter.put(
  '/stock/items/:id',
  ah(async (req, res) => {
    const ref = col('stock_items').doc(req.params.id);
    const existing = liveData<StockItem>(await ref.get());
    if (!existing) throw new HttpError(404, 'Item not found.');
    const fields = await parseStockItem(req.body || {});
    const at = new Date().toISOString();
    const item = JSON.parse(JSON.stringify({ id: existing.id, createdAt: existing.createdAt, ...fields, updatedAt: at }));
    const batch = db.batch();
    batch.set(ref, item);
    if (fields.quantity !== existing.quantity) {
      const mv: StockMovement = { id: newId('mv'), itemId: existing.id, delta: fields.quantity - existing.quantity, reason: 'adjust', at, by: req.user!.displayName };
      batch.set(col('stock_movements').doc(mv.id), mv);
    }
    await batch.commit();
    await replacedImage(existing.imageUrl, fields.imageUrl);
    res.json(item);
  })
);

/** Quick +/- from the inventory */
adminRouter.patch(
  '/stock/items/:id/quantity',
  ah(async (req, res) => {
    const delta = num(req.body?.delta, 'Change', { min: -1_000_000, max: 1_000_000 });
    const ref = col('stock_items').doc(req.params.id);
    const at = new Date().toISOString();
    let low: { name: string; left: number } | null = null;
    await db.runTransaction(async (tx) => {
      const item = liveData<StockItem>(await tx.get(ref));
      if (!item) throw new HttpError(404, 'Item not found.');
      // Only available pieces come and go here; the ones in use, in repair… stay counted
      const breakdown = unitBreakdown(item);
      const quantity = Math.max(item.quantity - breakdown.available, item.quantity + delta);
      tx.update(ref, { quantity, units: unitsField(breakdown), status: FieldValue.delete(), updatedAt: at });
      const mv: StockMovement = { id: newId('mv'), itemId: item.id, delta: quantity - item.quantity, reason: 'adjust', note: str(req.body?.note, 'Note', { max: 200, optional: true }) || undefined, at, by: req.user!.displayName };
      tx.set(col('stock_movements').doc(mv.id), JSON.parse(JSON.stringify(mv)));
      if (item.minQuantity !== undefined && quantity <= item.minQuantity && item.quantity > item.minQuantity) low = { name: item.name, left: quantity };
    });
    const dropped = low as { name: string; left: number } | null;
    if (dropped) await notify(await adminUserIds(), 'stock_low', { item: dropped.name, qty: dropped.left }, '#/admin/stock', { except: req.user!.uid });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/stock/items/:id',
  ah(async (req, res) => {
    await softDelete(col('stock_items').doc(req.params.id), req);
    res.json({ ok: true });
  })
);

const SCHEDULE_KINDS: readonly ScheduleItemKind[] = ['course', 'event', 'meeting', 'other', 'cancellation'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Add a course, event or meeting to students' schedules, or cancel one class on one date (kind 'cancellation'). */
adminRouter.post(
  '/schedule-items',
  ah(async (req, res) => {
    const b = req.body || {};
    // An item is for children, coaches, or both
    const ids = (value: unknown, field: string) => {
      if (value === undefined) return [];
      if (!Array.isArray(value) || value.length > 200) throw new HttpError(400, `${field} are invalid.`);
      return [...new Set(value.map((id: unknown) => str(id, field, { max: 100 })))] as string[];
    };
    const studentIds = ids(b.studentIds, 'Students');
    const trainerIds = ids(b.trainerIds, 'Coaches');
    if (studentIds.length + trainerIds.length === 0) throw new HttpError(400, 'Choose at least one child or coach.');
    if (studentIds.length && (await db.getAll(...studentIds.map((id) => col('students').doc(id)))).some((d) => !isLive(d))) {
      throw new HttpError(404, 'Student not found.');
    }
    if (trainerIds.length && (await db.getAll(...trainerIds.map((id) => col('trainers').doc(id)))).some((d) => !isLive(d))) {
      throw new HttpError(404, 'Coach not found.');
    }

    const kind = oneOf(b.kind, SCHEDULE_KINDS, 'Type');
    const date = str(b.date, 'Date', { max: 10 });
    if (!DATE_RE.test(date)) throw new HttpError(400, 'Date is invalid.');

    let item: ScheduleItem;
    if (kind === 'cancellation') {
      const groupId = str(b.groupId, 'Class', { max: 100 });
      if (!(await getGroup(groupId))) throw new HttpError(404, 'Class not found.');
      item = { id: newId('sch'), studentIds, kind, title: '', recurrence: 'once', date, startTime: '', endTime: '', groupId, createdAt: new Date().toISOString() };
    } else {
      const startTime = str(b.startTime, 'Start time', { max: 5 });
      const endTime = str(b.endTime, 'End time', { max: 5 });
      if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) throw new HttpError(400, 'Time is invalid.');
      if (endTime <= startTime) throw new HttpError(400, 'The end time must be after the start time.');
      item = {
        id: newId('sch'),
        studentIds,
        kind,
        title: str(b.title, 'Title', { max: 120 }),
        recurrence: oneOf(b.recurrence, ['once', 'weekly'] as const, 'Repeat'),
        date,
        startTime,
        endTime,
        location: str(b.location, 'Location', { max: 120, optional: true }) || undefined,
        notes: str(b.notes, 'Notes', { max: 500, optional: true }) || undefined,
        ...(trainerIds.length ? { trainerIds } : {}),
        createdAt: new Date().toISOString()
      };
    }
    // Firestore rejects undefined fields
    await col('schedule_items').doc(item.id).set(JSON.parse(JSON.stringify(item)));
    await notifySchedule(item, req.user!.uid);
    res.status(201).json(item);
  })
);

/** Parents (and coaches) hear about what was added to their week, or a cancelled class */
async function notifySchedule(item: ScheduleItem, actor: string) {
  const parents = (await parentsOf(item.studentIds)).map((p) => p.parentUid);
  const date = shortDate(item.date);
  if (item.kind === 'cancellation') {
    const group = item.groupId ? await getGroup(item.groupId) : undefined;
    if (!group) return;
    // The coach only when the whole class is off (not when one child is excused)
    const kids = (await studentsInClasses([group.id])).map((s) => s.id);
    const whole = kids.length === 0 || kids.every((id) => item.studentIds.includes(id));
    await notify(parents, 'class_cancelled', { class: group.name, date }, '#/parent', { except: actor });
    if (whole) await notify(await trainerUserIds(group.trainerIds), 'class_cancelled', { class: group.name, date }, '#/trainer', { except: actor });
    return;
  }
  const params = { title: item.title, date, time: item.startTime };
  await notify(parents, 'schedule_added', params, '#/parent', { except: actor });
  if (item.trainerIds?.length) await notify(await trainerUserIds(item.trainerIds), 'schedule_added', params, '#/trainer', { except: actor });
}

/** Takes one student off an item; the item is deleted when nobody is left on it. */
adminRouter.delete(
  '/schedule-items/:id/students/:studentId',
  ah(async (req, res) => {
    const ref = col('schedule_items').doc(req.params.id);
    await db.runTransaction(async (tx) => {
      const item = liveData<ScheduleItem>(await tx.get(ref));
      if (!item) return;
      const rest = item.studentIds.filter((id) => id !== req.params.studentId);
      if (rest.length === 0 && !item.trainerIds?.length) tx.update(ref, { deletedAt: new Date().toISOString(), deletedBy: req.user?.uid || '' });
      else tx.update(ref, { studentIds: rest });
    });
    res.json({ ok: true });
  })
);

/** Takes one coach off an item; the item is deleted when nobody is left on it. */
adminRouter.delete(
  '/schedule-items/:id/trainers/:trainerId',
  ah(async (req, res) => {
    const ref = col('schedule_items').doc(req.params.id);
    await db.runTransaction(async (tx) => {
      const item = liveData<ScheduleItem>(await tx.get(ref));
      if (!item) return;
      const rest = (item.trainerIds || []).filter((id) => id !== req.params.trainerId);
      if (rest.length === 0 && item.studentIds.length === 0) tx.update(ref, { deletedAt: new Date().toISOString(), deletedBy: req.user?.uid || '' });
      else tx.update(ref, { trainerIds: rest });
    });
    res.json({ ok: true });
  })
);

/** Removes an added item for everyone it was added to (or restores a cancelled class). */
adminRouter.delete(
  '/schedule-items/:id',
  ah(async (req, res) => {
    await softDelete(col('schedule_items').doc(req.params.id), req);
    res.json({ ok: true });
  })
);

adminRouter.patch(
  '/orders/:id',
  ah(async (req, res) => {
    const status = oneOf(req.body?.status, ['requested', 'ready', 'picked_up', 'cancelled'] as const, 'Status');
    const orderRef = col('hoodie_distributions').doc(req.params.id);
    // Ready and picked-up orders hold one unit of stock; waiting and cancelled ones don't
    const holdsStock = (s: ProductOrder['status']) => s === 'ready' || s === 'picked_up';
    let becameReady: ProductOrder | null = null;
    await db.runTransaction(async (tx) => {
      const order = (await tx.get(orderRef)).data() as ProductOrder | undefined;
      if (!order) throw new HttpError(404, 'Order not found.');
      if (order.status === status) return;
      becameReady = status === 'ready' ? order : null;
      // Older orders without a product don't touch the stock
      const change = order.productId ? Number(holdsStock(status)) - Number(holdsStock(order.status)) : 0;
      if (change !== 0) {
        const productRef = col('products').doc(order.productId!);
        const product = (await tx.get(productRef)).data() as Product | undefined;
        const stock = product?.stock?.[order.size] ?? 0;
        if (product && change < 0 && stock <= 0) {
          throw new HttpError(409, `No ${order.size === ONE_SIZE ? '' : `size ${order.size} `}left in stock for "${product.name}". Restock it first.`);
        }
        if (product) tx.update(productRef, new FieldPath('stock', order.size), stock - change);
      }
      tx.update(orderRef, {
        status,
        statusChangedAt: new Date().toISOString(),
        // The pickup date only describes picked-up orders
        pickedUpAt: status === 'picked_up' ? today() : FieldValue.delete()
      });
    });
    // The parent can come and pick it up
    const ready = becameReady as ProductOrder | null;
    if (ready) {
      const [p] = await parentsOf([ready.studentId]);
      await notify([p?.parentUid], 'order_ready', { product: `${ready.productName || ''}${ready.size && ready.size !== ONE_SIZE ? ` (${ready.size})` : ''}`, child: ready.studentName }, '#/parent');
    }
    res.json({ ok: true });
  })
);

/** Create or edit a product. Stock is kept from the stored product and only changed through /stock. */
adminRouter.put(
  '/products/:id',
  ah(async (req, res) => {
    const b = req.body || {};
    const ref = col('products').doc(req.params.id);
    const stored = (await ref.get()).data() as Product | undefined;
    const existing = stored ? readMoney('products', stored) : undefined;
    if (!Array.isArray(b.sizes ?? []) || (b.sizes ?? []).length > 20) throw new HttpError(400, 'Sizes are invalid.');
    const sizes = [...new Set((b.sizes ?? []).map((sz: unknown) => str(sz, 'Size', { max: 20 })))] as string[];
    const oldStock = existing?.stock || {};
    const keys = sizes.length ? sizes : [ONE_SIZE];
    const product: Product = {
      id: req.params.id,
      name: str(b.name, 'Name', { max: 120 }),
      category: oneOf(b.category, PRODUCT_CATEGORIES, 'Category'),
      description: str(b.description, 'Description', { max: 2000, optional: true }),
      price: toMillimes(num(b.price, 'Price', { min: 0, max: 10000 })),
      imageUrl: (await imageField(b.imageUrl, 'products')) || '',
      sizes,
      stock: Object.fromEntries(keys.map((k) => [k, oldStock[k] ?? 0])),
      isActive: b.isActive === true,
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    await ref.set(writeMoney(product));
    await replacedImage(existing?.imageUrl, product.imageUrl);
    res.json(sendMoney('products', product));
  })
);

adminRouter.patch(
  '/products/:id/active',
  ah(async (req, res) => {
    const ref = col('products').doc(req.params.id);
    if (!isLive(await ref.get())) throw new HttpError(404, 'Product not found.');
    await ref.update({ isActive: req.body?.isActive === true });
    res.json({ ok: true });
  })
);

adminRouter.post(
  '/products/:id/stock',
  ah(async (req, res) => {
    const ref = col('products').doc(req.params.id);
    const amount = num(req.body?.amount, 'Amount', { min: -1000, max: 1000 });
    const count = await db.runTransaction(async (tx) => {
      const product = liveData<Product>(await tx.get(ref));
      if (!product) throw new HttpError(404, 'Product not found.');
      const size = product.sizes.length ? oneOf(req.body?.size, product.sizes, 'Size') : ONE_SIZE;
      const next = Math.max(0, (product.stock?.[size] ?? 0) + amount);
      tx.update(ref, new FieldPath('stock', size), next);
      return next;
    });
    res.json({ count });
  })
);

adminRouter.delete(
  '/products/:id',
  ah(async (req, res) => {
    await softDelete(col('products').doc(req.params.id), req);
    res.json({ ok: true });
  })
);

/** Landing page: texts per language, hidden sections, counters and the next challenge date */
adminRouter.put(
  '/site-content/landing',
  ah(async (req, res) => {
    const b = req.body || {};
    const hidden = Array.isArray(b.hidden) ? LANDING_SECTIONS.filter((s) => b.hidden.includes(s)) : [];
    const stats: NonNullable<LandingContent['stats']> = {};
    for (const k of LANDING_STAT_KEYS) {
      const v = b.stats?.[k];
      if (v !== undefined && v !== null && v !== '') stats[k] = num(v, 'Counter', { min: 0, max: 1_000_000 });
    }
    const countdownDate = str(b.countdownDate, 'Date', { max: 10, optional: true });
    if (countdownDate && !/^\d{4}-\d{2}-\d{2}$/.test(countdownDate)) throw new HttpError(400, 'Date is invalid.');
    // Only the known texts; empty ones fall back to the default wording
    const text: NonNullable<LandingContent['text']> = {};
    for (const lang of LANDING_LANGS) {
      const given = b.text?.[lang];
      if (!given || typeof given !== 'object') continue;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(given as Record<string, unknown>)) {
        if (!LANDING_TEXT_KEYS.has(k)) continue;
        const value = str(v, 'Text', { max: 1000, optional: true }).trim();
        if (value) out[k] = value;
      }
      if (Object.keys(out).length) text[lang] = out;
    }
    const content: LandingContent = {
      hidden,
      stats,
      ...(countdownDate ? { countdownDate } : {}),
      text,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user!.displayName
    };
    await col('site_content').doc('landing').set(content);
    res.json(content);
  })
);

router.use((_req, res) => res.status(404).json({ error: 'Unknown API route.' }));
