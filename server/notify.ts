// Notifications: stored per person (history in the bell) and sent as Web Push to their devices.
// notify() never throws: a failed notification must not break the action that triggered it.
import crypto from 'crypto';
import webpush from 'web-push';
import { FieldPath } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin.js';
import { adminProfiles, findAccountByEmail } from './auth.js';
import { renderNotification, type NotificationLang, type NotificationType } from '../src/i18n/messages/notifications.js';

const col = (name: string) => db.collection(name);

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY?.trim() || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY?.trim() || '';
export const pushEnabled = !!(VAPID_PUBLIC && VAPID_PRIVATE);
if (pushEnabled) webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@example.com', VAPID_PUBLIC, VAPID_PRIVATE);
export const vapidPublicKey = () => (pushEnabled ? VAPID_PUBLIC : null);

export interface StoredNotification {
  id: string;
  userId: string;
  type: NotificationType;
  params: Record<string, string | number>;
  link: string;
  createdAt: string;
  readAt?: string;
}

interface PushSubscriptionDoc {
  id: string;
  userId: string;
  subscription: webpush.PushSubscription;
  lang: NotificationLang;
  createdAt: string;
}

export const subscriptionId = (endpoint: string) => crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 40);

async function subscriptionsOf(userIds: string[]): Promise<PushSubscriptionDoc[]> {
  const out: PushSubscriptionDoc[] = [];
  for (let i = 0; i < userIds.length; i += 30) {
    const snap = await col('push_subscriptions').where('userId', 'in', userIds.slice(i, i + 30)).get();
    snap.docs.forEach((d) => out.push(d.data() as PushSubscriptionDoc));
  }
  return out;
}

/** Sends one push message to every device of these subscriptions; forgets devices that are gone. */
export async function sendPush(subs: PushSubscriptionDoc[], message: (lang: NotificationLang) => { title: string; body: string; url: string; tag?: string }) {
  if (!pushEnabled || !subs.length) return;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify({ ...message(s.lang), icon: '/favicon.png' }), { TTL: 60 * 60 * 24, timeout: 8000 });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404 / 410: the browser dropped this subscription
        if (status === 404 || status === 410) await col('push_subscriptions').doc(s.id).delete().catch(() => {});
        else console.error('Push failed:', status || err);
      }
    })
  );
}

/** Saves a notification for each person and pushes it to their devices. */
export async function notify(
  userIds: (string | undefined | null)[],
  type: NotificationType,
  params: Record<string, string | number>,
  link: string,
  { except }: { except?: string } = {}
) {
  try {
    const ids = [...new Set(userIds.filter((u): u is string => !!u && u !== except))];
    if (!ids.length) return;
    const createdAt = new Date().toISOString();
    const batch = db.batch();
    for (const userId of ids) {
      const ref = col('notifications').doc();
      const n: StoredNotification = { id: ref.id, userId, type, params, link, createdAt };
      batch.set(ref, n);
    }
    await batch.commit();
    const subs = await subscriptionsOf(ids);
    await sendPush(subs, (lang) => ({ ...renderNotification(lang, type, params), url: link, tag: `${type}-${createdAt}` }));
  } catch (err) {
    console.error('Notification failed:', type, err);
  }
}

// ---------- who to notify ----------

export async function adminUserIds(): Promise<string[]> {
  return (await adminProfiles()).map((a) => a.id);
}

/** Sign-in accounts of these coaches (matched by email) */
export async function trainerUserIds(trainerIds: (string | undefined)[]): Promise<string[]> {
  const ids = [...new Set(trainerIds.filter((t): t is string => !!t))];
  if (!ids.length) return [];
  const out: string[] = [];
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await col('trainers').where(FieldPath.documentId(), 'in', ids.slice(i, i + 30)).get();
    for (const d of snap.docs) {
      const email = d.get('email') as string | undefined;
      const account = email ? await findAccountByEmail(email) : undefined;
      if (account) out.push(account.id);
    }
  }
  return out;
}

/** Parents (accounts) of these children, with each child's name */
export async function parentsOf(studentIds: string[]): Promise<{ studentId: string; name: string; parentUid?: string }[]> {
  const ids = [...new Set(studentIds)];
  const out: { studentId: string; name: string; parentUid?: string }[] = [];
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await col('students').where(FieldPath.documentId(), 'in', ids.slice(i, i + 30)).get();
    snap.docs.forEach((d) => out.push({ studentId: d.id, name: d.get('studentName'), parentUid: d.get('parentUid') }));
  }
  return out;
}

/** "2026-11-07" -> "07/11/2026" (readable in every language) */
export const shortDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);
