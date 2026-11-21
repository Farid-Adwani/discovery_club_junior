// Creates an account or changes its password (all sessions of that account are signed out).
//
//   npm run set-password -- someone@example.com "NewPassword"
//
// Admin accounts (ADMIN_EMAILS) and trainer accounts (email of a trainer) are created this way,
// because the website only lets parents register. Works while the server is running.
//
// A parent who signed up before the move off Firebase may still have a profile (and children) under their old
// uid but no account here: the new account takes that uid, so their children stay linked.
import { db } from './db.js';
import { upsertAccount } from './auth.js';

const [email, password] = process.argv.slice(2);
if (!email || !password || !email.includes('@')) {
  console.error('Usage: npm run set-password -- <email> <password>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('The password must have at least 8 characters.');
  process.exit(1);
}

const profiles = (await db.collection('users').where('email', '==', email.trim().toLowerCase()).get()).docs;
let oldUid: string | undefined;
for (const p of profiles) if (!(await db.collection('accounts').doc(p.id).get()).exists) oldUid ??= p.id;

const { account, created } = await upsertAccount(email, password, oldUid);
console.log(`${created ? 'Account created' : 'Password changed'}: ${account.email} (uid ${account.id})`);
process.exit(0);
