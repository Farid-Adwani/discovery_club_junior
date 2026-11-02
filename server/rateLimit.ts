// Attempt counters (wrong passwords, sign-ups) kept in Firestore, so every server instance shares them.
// On Vercel each request can land on a different instance, which made in-memory counters useless.
import crypto from 'crypto';
import type { Request } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin.js';

const ref = (key: string) => db.collection('rate_limits').doc(crypto.createHash('sha256').update(key).digest('hex').slice(0, 40));

interface Counter {
  count: number;
  until: number; // ms; the window ends then
  expireAt: Timestamp; // for a Firestore TTL policy (old counters are deleted automatically)
}

/** The visitor's address. Vercel sets x-real-ip / x-forwarded-for itself, so the browser can't fake it there. */
export function clientIp(req: Request): string {
  if (process.env.VERCEL) {
    const forwarded = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || 'unknown';
}

/** False when one of the keys already reached its limit in the current window. */
export async function allowAttempt(limits: { key: string; max: number }[]): Promise<boolean> {
  const now = Date.now();
  const snaps = await db.getAll(...limits.map((l) => ref(l.key)));
  return snaps.every((snap, i) => {
    const c = snap.data() as Counter | undefined;
    return !c || c.until <= now || c.count < limits[i].max;
  });
}

/** Counts one attempt for each key (a new window starts when the old one is over). */
export async function recordAttempt(keys: string[], windowMs: number) {
  const now = Date.now();
  await Promise.all(
    keys.map((key) =>
      db.runTransaction(async (tx) => {
        const r = ref(key);
        const c = (await tx.get(r)).data() as Counter | undefined;
        const until = c && c.until > now ? c.until : now + windowMs;
        tx.set(r, { count: c && c.until > now ? c.count + 1 : 1, until, expireAt: Timestamp.fromMillis(until + 86_400_000) });
      })
    )
  ).catch((err) => console.error('Rate limit counter failed:', err));
}

export async function clearAttempts(key: string) {
  await ref(key).delete().catch(() => {});
}
