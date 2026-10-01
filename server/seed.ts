// Usage:
//   npm run seed                 -> fill empty collections with the club's public content
//   npm run seed -- --demo       -> also add sample students, sessions and orders (for testing)
//   npm run seed -- --overwrite  -> replace existing documents with the defaults
import { seedDatabase } from './seedData';

const args = process.argv.slice(2);
const written = await seedDatabase({
  overwrite: args.includes('--overwrite'),
  demo: args.includes('--demo')
});

for (const [collection, count] of Object.entries(written)) {
  console.log(`${collection.padEnd(22)} ${count ? `${count} documents written` : 'already has data, skipped'}`);
}
process.exit(0);
