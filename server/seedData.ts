import { db } from './firebaseAdmin';
import {
  INITIAL_PROGRAMS,
  INITIAL_TRAINERS,
  INITIAL_GROUPS,
  INITIAL_EVENTS,
  FACEBOOK_POSTS,
  INITIAL_HOODIE_STOCK,
  INITIAL_STUDENTS,
  INITIAL_SESSIONS,
  INITIAL_HOODIE_DISTRIBUTIONS,
  INITIAL_MATERIAL_REQUESTS
} from '../src/data/initialData';

type Doc = { id: string; data: Record<string, unknown> };

async function writeCollection(name: string, docs: Doc[], overwrite: boolean) {
  const ref = db.collection(name);
  if (!overwrite) {
    const existing = await ref.limit(1).get();
    if (!existing.empty) return 0;
  }
  const batch = db.batch();
  for (const d of docs) batch.set(ref.doc(d.id), d.data);
  await batch.commit();
  return docs.length;
}

/**
 * Public club content: programs, trainers, groups, events, posts, hoodie stock.
 * With `demo`, also writes the sample students, sessions, hoodie orders and material requests.
 * Without `overwrite`, a collection that already has documents is left untouched.
 */
export async function seedDatabase({ overwrite = false, demo = false } = {}) {
  const written: Record<string, number> = {};

  written.programs = await writeCollection('programs', INITIAL_PROGRAMS.map((p) => ({ id: p.id, data: { ...p } })), overwrite);
  written.trainers = await writeCollection(
    'trainers',
    INITIAL_TRAINERS.map((t) => ({ id: t.id, data: { ...t, email: t.email.toLowerCase() } })),
    overwrite
  );
  written.groups = await writeCollection('groups', INITIAL_GROUPS.map((g) => ({ id: g.id, data: { ...g } })), overwrite);
  written.events = await writeCollection(
    'events',
    INITIAL_EVENTS.map(({ isRegistered: _ignored, ...e }) => ({ id: e.id, data: { ...e, registeredUids: [] } })),
    overwrite
  );
  written.facebook_posts = await writeCollection(
    'facebook_posts',
    FACEBOOK_POSTS.map((p) => ({ id: p.id, data: { likedBy: [], commentsList: [], ...p } })),
    overwrite
  );
  written.hoodie_stock = await writeCollection(
    'hoodie_stock',
    Object.entries(INITIAL_HOODIE_STOCK).map(([size, count]) => ({ id: size, data: { size, count } })),
    overwrite
  );

  if (demo) {
    written.students = await writeCollection(
      'students',
      INITIAL_STUDENTS.map((s) => ({ id: s.id, data: { ...s, parentEmail: s.parentEmail.toLowerCase() } })),
      overwrite
    );
    written.sessions = await writeCollection('sessions', INITIAL_SESSIONS.map((s) => ({ id: s.id, data: { ...s } })), overwrite);
    written.hoodie_distributions = await writeCollection(
      'hoodie_distributions',
      INITIAL_HOODIE_DISTRIBUTIONS.map((h) => ({ id: h.id, data: { ...h } })),
      overwrite
    );
    written.material_requests = await writeCollection(
      'material_requests',
      INITIAL_MATERIAL_REQUESTS.map((m) => ({ id: m.id, data: { ...m } })),
      overwrite
    );
  }

  return written;
}
