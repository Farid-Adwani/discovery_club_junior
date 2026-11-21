// Attempt counters (wrong passwords, sign-ups) kept in the database, so they survive a restart
// and are shared with the command-line scripts.
import crypto from 'crypto';
import type { Request } from 'express';
import { db } from './db.js';

const ref = (key: string) => db.collection('rate_limits').doc(crypto.createHash('sha256').update(key).digest('hex').slice(0, 40));

interface Counter {
  count: number;
  until: number; // ms; the window ends then
  expireAt: number; // ms; purgeExpired() (db.ts) deletes the counter after that
}

/**
 * The visitor's address. Behind nginx every request comes from 127.0.0.1: with TRUST_PROXY set (app.ts),
 * Express reads the address nginx puts in X-Forwarded-For, which the browser can't fake.
 */
export function clientIp(req: Request): string {
  return (req.app.get('trust proxy') ? req.ip : req.socket.remoteAddress) || 'unknown';
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
        tx.set(r, { count: c && c.until > now ? c.count + 1 : 1, until, expireAt: until + 86_400_000 });
      })
    )
  ).catch((err) => console.error('Rate limit counter failed:', err));
}

/**
 * Checks and counts one action in a single step (so a burst of requests sent together can't all pass):
 * false when `key` already reached `max` in the current window. Refuses when the counter can't be saved.
 */
export async function takeAttempt(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  try {
    return await db.runTransaction(async (tx) => {
      const r = ref(key);
      const c = (await tx.get(r)).data() as Counter | undefined;
      const active = !!c && c.until > now;
      if (active && c!.count >= max) return false;
      const until = active ? c!.until : now + windowMs;
      tx.set(r, { count: active ? c!.count + 1 : 1, until, expireAt: until + 86_400_000 });
      return true;
    });
  } catch (err) {
    console.error('Rate limit counter failed:', err);
    return false;
  }
}

export async function clearAttempts(key: string) {
  await ref(key).delete().catch(() => {});
}
