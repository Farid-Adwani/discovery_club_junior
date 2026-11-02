// One-off: money moves from dinars (decimals) to whole millimes (see server/money.ts).
// Usage:
//   npm run migrate:money            -> show what would change
//   npm run migrate:money -- --apply -> write it
// Run it only AFTER the new server code is deployed: the old code would read millimes as dinars.
// Until then nothing is lost, because the new code also reads documents that are still in dinars.
// Safe to run again: documents marked `moneyUnit: 'millimes'` are skipped.
import { db } from './firebaseAdmin';
import { MONEY_FIELDS, MONEY_UNIT, toMillimes, type MoneyCollection } from './money';

const apply = process.argv.includes('--apply');
let total = 0;

for (const collection of Object.keys(MONEY_FIELDS) as MoneyCollection[]) {
  const snap = await db.collection(collection).get();
  const todo = snap.docs.filter((d) => d.get('moneyUnit') !== MONEY_UNIT);
  for (const d of todo.slice(0, 3)) {
    const sample = MONEY_FIELDS[collection].map((f) => `${f} ${d.get(f) ?? '-'} -> ${typeof d.get(f) === 'number' ? toMillimes(d.get(f)) : '-'}`);
    console.log(`  ${collection} ${d.id}: ${sample.join(', ')}`);
  }
  console.log(`${collection.padEnd(22)} ${todo.length} of ${snap.size} document(s) to convert`);
  total += todo.length;
  if (!apply) continue;
  for (let i = 0; i < todo.length; i += 400) {
    const batch = db.batch();
    for (const d of todo.slice(i, i + 400)) {
      const update: Record<string, unknown> = { moneyUnit: MONEY_UNIT };
      for (const f of MONEY_FIELDS[collection]) {
        const v = d.get(f);
        if (typeof v === 'number') update[f] = toMillimes(v);
      }
      // Fails if the website changed the document since it was read; running the script again finishes it
      batch.update(d.ref, update, { lastUpdateTime: d.updateTime });
    }
    try {
      await batch.commit();
    } catch (err) {
      console.error(`A ${collection} document changed while converting (${err instanceof Error ? err.message : err}). Run the script again.`);
      process.exit(1);
    }
  }
}

console.log(apply ? `\nConverted ${total} document(s).` : `\n${total} document(s) to convert. Nothing written; run again with --apply.`);
process.exit(0);
