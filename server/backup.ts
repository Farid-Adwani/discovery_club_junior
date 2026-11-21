// A copy of the database, safe to make while the site runs:
//
//   npm run backup            -> data/backups/club-YYYY-MM-DD-HHMM.db
//   npm run backup -- <file>  -> that file
//
// Copy data/uploads too (the images): e.g. rsync -a data/uploads/ <backup place>/uploads/
import path from 'path';
import { DATA_DIR, backupTo } from './db.js';

const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
const file = path.resolve(process.argv[2] || path.join(DATA_DIR, 'backups', `club-${stamp}.db`));
backupTo(file);
console.log(`Database copied to ${file}`);
process.exit(0);
