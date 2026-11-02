import { db } from './firebaseAdmin';
import {
  INITIAL_TRAINERS,
  INITIAL_GROUPS,
  INITIAL_PRODUCTS,
  INITIAL_STUDENTS,
  INITIAL_SESSIONS,
  INITIAL_ORDERS,
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
 * Public club content: trainers, classes, shop products.
 * With `demo`, also writes the sample students, sessions, shop orders and material requests.
 * Without `overwrite`, a collection that already has documents is left untouched.
 */
export async function seedDatabase({ overwrite = false, demo = false } = {}) {
  const written: Record<string, number> = {};

  written.trainers = await writeCollection(
    'trainers',
    INITIAL_TRAINERS.map((t) => ({ id: t.id, data: { ...t, email: t.email.toLowerCase() } })),
    overwrite
  );
  written.groups = await writeCollection('groups', INITIAL_GROUPS.map((g) => ({ id: g.id, data: { ...g } })), overwrite);
  written.products = await writeCollection('products', INITIAL_PRODUCTS.map((p) => ({ id: p.id, data: { ...p } })), overwrite);

  if (demo) {
    written.students = await writeCollection(
      'students',
      INITIAL_STUDENTS.map((s) => ({ id: s.id, data: { ...s, parentEmail: s.parentEmail.toLowerCase() } })),
      overwrite
    );
    written.sessions = await writeCollection('sessions', INITIAL_SESSIONS.map((s) => ({ id: s.id, data: { ...s } })), overwrite);
    written.hoodie_distributions = await writeCollection(
      'hoodie_distributions',
      INITIAL_ORDERS.map((h) => ({ id: h.id, data: { ...h } })),
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
