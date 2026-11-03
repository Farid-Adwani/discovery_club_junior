import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { promisify } from 'util';
import { db } from './firebaseAdmin.js';
import type { AppUser, UserRole } from '../src/types/index.js';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'faridadwani2000@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** A sign-in stays valid this long (a new sign-in is needed after) */
const SESSION_DAYS = 30;
const VIEW_AS_MS = 2 * 3_600_000;

/** Stored in `accounts/{id}`. The id is the account's uid (older accounts kept their Firebase uid). */
export interface Account {
  id: string;
  email: string; // lower-case, unique
  passwordHash: string; // "scrypt$<salt>$<hash>" (never the password itself)
  createdAt: string;
  /** Admin given by another admin from the Team page (ADMIN_EMAILS are always admins) */
  role?: 'admin';
  createdBy?: string; // uid of the admin who created the account from the Team page
}

/** The club owners (ADMIN_EMAILS): always admins, can't be removed from the website */
export const isOwnerEmail = (email: string) => ADMIN_EMAILS.includes(email.trim().toLowerCase());

export interface AuthedRequest extends Request {
  user?: AppUser;
  sessionId?: string;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- passwords ----------

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hex] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// ---------- accounts & sessions ----------

/** `account_emails/{email}` -> { accountId }: makes each email unique (created together with the account). */
export const accountEmailRef = (email: string) => db.collection('account_emails').doc(email.trim().toLowerCase());

export async function findAccountByEmail(email: string): Promise<Account | undefined> {
  const link = (await accountEmailRef(email).get()).data();
  if (!link) return undefined;
  return (await db.collection('accounts').doc(link.accountId).get()).data() as Account | undefined;
}

/** Admin accounts that exist, with their profile (name, photo, date of birth) for the team birthdays */
export async function adminProfiles() {
  const out: { id: string; name: string; photoURL?: string; birthDate?: string }[] = [];
  const owners = (await Promise.all(ADMIN_EMAILS.map(findAccountByEmail))).filter((a): a is Account => !!a);
  const given = (await db.collection('accounts').where('role', '==', 'admin').get()).docs.map((d) => d.data() as Account);
  const accounts = [...new Map([...owners, ...given].map((a) => [a.id, a])).values()];
  for (const account of accounts) {
    const email = account.email;
    const stored = (await db.collection('users').doc(account.id).get()).data() || {};
    out.push({ id: account.id, name: stored.displayName || email.split('@')[0], photoURL: stored.photoURL, birthDate: stored.birthDate });
  }
  return out;
}

/** Admin and trainer emails can't be registered from the website: the admin creates them on the Team page. */
export async function isStaffEmail(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(e)) return true;
  const trainer = await db.collection('trainers').where('email', '==', e).limit(1).get();
  return !trainer.empty;
}

/**
 * Creates the account for `email` (with `preferredId` as uid when given) or changes its password.
 * Used by the set-password and demo scripts; the website itself only creates parent accounts.
 */
export async function upsertAccount(email: string, password: string, preferredId?: string): Promise<{ account: Account; created: boolean }> {
  const e = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const existing = await findAccountByEmail(e);
  if (existing) {
    await db.collection('accounts').doc(existing.id).update({ passwordHash });
    await deleteSessionsOf(existing.id);
    return { account: { ...existing, passwordHash }, created: false };
  }
  const id = preferredId || db.collection('accounts').doc().id;
  const account: Account = { id, email: e, passwordHash, createdAt: new Date().toISOString() };
  const batch = db.batch();
  batch.create(accountEmailRef(e), { accountId: id });
  batch.set(db.collection('accounts').doc(id), account);
  await batch.commit();
  return { account, created: true };
}

/** Deletes an account, its email reservation and its sessions. */
export async function deleteAccount(accountId: string) {
  const account = (await db.collection('accounts').doc(accountId).get()).data() as Account | undefined;
  await deleteSessionsOf(accountId);
  if (account) await accountEmailRef(account.email).delete();
  await db.collection('accounts').doc(accountId).delete();
}

/** Only a hash of the token is stored, so a database leak doesn't give working sessions. */
const sessionDocId = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/** `viewedBy`: an admin looking at a parent's account ("View as this parent"); such sessions last 2 hours. */
export async function createSession(accountId: string, viewedBy?: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  await db.collection('sessions').doc(sessionDocId(token)).set({
    accountId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (viewedBy ? VIEW_AS_MS : SESSION_DAYS * 86_400_000)).toISOString(),
    ...(viewedBy ? { viewedBy } : {})
  });
  return token;
}

export async function deleteSession(sessionId: string) {
  sessionCache.delete(sessionId);
  await db.collection('sessions').doc(sessionId).delete();
}

/** Signs an account out everywhere (e.g. after its password changed). */
export async function deleteSessionsOf(accountId: string) {
  const snap = await db.collection('sessions').where('accountId', '==', accountId).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  for (const [k, v] of sessionCache) if (v.accountId === accountId) sessionCache.delete(k);
}

// ---------- roles ----------

/**
 * Works out who the account is. Roles are never taken from the browser:
 *  - admin:   email listed in ADMIN_EMAILS, or made admin by an admin (accounts.role)
 *  - trainer: email matching a document in `trainers`
 *  - parent:  everyone else (children are linked through students.parentUid)
 */
export async function resolveProfile(account: Pick<Account, 'id' | 'email' | 'role'>): Promise<AppUser> {
  const email = account.email;
  const isAdminEmail = ADMIN_EMAILS.includes(email) || account.role === 'admin';
  // Read the user document and look for a trainer with this email at the same time
  const [userSnap, trainerSnap] = await Promise.all([
    db.collection('users').doc(account.id).get(),
    !isAdminEmail ? db.collection('trainers').where('email', '==', email).limit(1).get() : Promise.resolve(null)
  ]);
  const stored = userSnap.exists ? userSnap.data() || {} : {};

  const base = {
    uid: account.id,
    email,
    displayName: stored.displayName || email.split('@')[0] || 'Discovery Member',
    photoURL: stored.photoURL || undefined,
    birthDate: stored.birthDate || undefined
  };

  if (isAdminEmail) {
    const roles: UserRole[] = ['admin', 'trainer', 'parent', 'visitor'];
    return { ...base, role: 'admin', roles };
  }

  if (trainerSnap && !trainerSnap.empty) {
    return { ...base, role: 'trainer', roles: ['trainer', 'visitor'], trainerId: trainerSnap.docs[0].id };
  }

  const studentIds: string[] = stored.studentIds || [];
  return {
    ...base,
    role: 'parent',
    roles: ['parent', 'visitor'],
    studentIds,
    studentId: studentIds[0],
    parentPhone: stored.parentPhone
  };
}

// Who a user is barely changes, and the browser sends /me and /data together right after sign-in,
// so the session and profile are kept for a short time instead of reading Firestore on every request.
const CACHE_TTL_MS = 30_000;
const sessionCache = new Map<string, { expires: number; accountId: string; user: Promise<AppUser | null> }>();

async function loadSessionUser(sessionId: string): Promise<{ accountId: string; user: AppUser } | null> {
  const session = (await db.collection('sessions').doc(sessionId).get()).data();
  if (!session || session.expiresAt < new Date().toISOString()) return null;
  const account = (await db.collection('accounts').doc(session.accountId).get()).data() as Account | undefined;
  if (!account) return null;
  const user = await resolveProfile(account);
  return { accountId: account.id, user: session.viewedBy ? { ...user, viewedBy: session.viewedBy } : user };
}

function cachedSessionUser(sessionId: string): Promise<AppUser | null> {
  const hit = sessionCache.get(sessionId);
  if (hit && hit.expires > Date.now()) return hit.user;
  const loaded = loadSessionUser(sessionId);
  const entry = { expires: Date.now() + CACHE_TTL_MS, accountId: '', user: loaded.then((r) => r?.user ?? null) };
  loaded.then((r) => (entry.accountId = r?.accountId ?? '')).catch(() => sessionCache.delete(sessionId));
  sessionCache.set(sessionId, entry);
  if (sessionCache.size > 1000) {
    for (const [k, v] of sessionCache) if (v.expires <= Date.now()) sessionCache.delete(k);
  }
  return entry.user;
}

/** Call after changing anything resolveProfile reads for this user (users doc, children links). */
export function forgetProfile(uid: string) {
  for (const [k, v] of sessionCache) if (v.accountId === uid) sessionCache.delete(k);
}

/** Call when roles may change for anyone (trainer list edited). */
export function forgetAllProfiles() {
  sessionCache.clear();
}

/** Reads the session token if present. Requests without a valid one are treated as public visitors. */
export async function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const sessionId = sessionDocId(header.slice(7));
      const user = await cachedSessionUser(sessionId);
      if (user) {
        req.user = user;
        req.sessionId = sessionId;
      }
    } catch {
      // Unknown or expired session: continue as an anonymous visitor
    }
  }
  next();
}

export function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in first.' });
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in first.' });
    if (!roles.some((r) => req.user!.roles.includes(r))) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    next();
  };
}
