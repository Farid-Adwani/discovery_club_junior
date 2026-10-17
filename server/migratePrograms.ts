// One-off: programs were removed, classes now carry their own price and description.
// Usage:
//   npm run migrate:programs            -> show what would change
//   npm run migrate:programs -- --apply -> write it
// Each class gets the price and description of its former program (unless it already has its own),
// then loses `programId`. Students lose `programId`. The `programs` collection itself is left as is.
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';

const apply = process.argv.includes('--apply');

const [programsSnap, groupsSnap, studentsSnap] = await Promise.all([
  db.collection('programs').get(),
  db.collection('groups').get(),
  db.collection('students').get()
]);
const programs = new Map(programsSnap.docs.map((d) => [d.id, d.data() as { pricePerMonth?: number; description?: string }]));

const batch = db.batch();
let changes = 0;
let studentChanges = 0;

for (const d of groupsSnap.docs) {
  const g = d.data();
  if (g.pricePerMonth !== undefined && g.programId === undefined) continue;
  const program = g.programId ? programs.get(g.programId) : undefined;
  const update: Record<string, unknown> = { programId: FieldValue.delete() };
  if (g.pricePerMonth === undefined) update.pricePerMonth = Number(program?.pricePerMonth) || 0;
  if (!g.description && program?.description) update.description = program.description;
  console.log(`class   ${d.id.padEnd(24)} price ${update.pricePerMonth ?? g.pricePerMonth}${update.description ? ', description copied' : ''}`);
  batch.update(d.ref, update);
  changes++;
}

for (const d of studentsSnap.docs) {
  if (d.data().programId === undefined) continue;
  batch.update(d.ref, { programId: FieldValue.delete() });
  studentChanges++;
  changes++;
}
console.log(`students with a programId: ${studentChanges}`);

if (!changes) console.log('Nothing to migrate.');
else if (apply) {
  await batch.commit();
  console.log(`${changes} documents updated.`);
} else console.log(`${changes} documents would change. Run again with --apply to write them.`);
process.exit(0);
