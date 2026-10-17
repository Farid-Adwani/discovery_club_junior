// Creates an account or changes its password (all sessions of that account are signed out).
//
//   npm run set-password -- someone@example.com "NewPassword"
//
// Admin accounts (ADMIN_EMAILS) and trainer accounts (email of a trainer) are created this way,
// because the website only lets parents register. An account that existed in Firebase Authentication
// keeps its old uid, so its children and orders stay linked.
import { adminAuth } from './firebaseAdmin';
import { upsertAccount } from './auth';

const [email, password] = process.argv.slice(2);
if (!email || !password || !email.includes('@')) {
  console.error('Usage: npm run set-password -- <email> <password>');
  process.exit(1);
}
if (password.length < 6) {
  console.error('The password must have at least 6 characters.');
  process.exit(1);
}

const oldFirebaseUser = await adminAuth.getUserByEmail(email.trim().toLowerCase()).catch(() => null);
const { account, created } = await upsertAccount(email, password, oldFirebaseUser?.uid);
console.log(`${created ? 'Account created' : 'Password changed'}: ${account.email} (uid ${account.id})`);
process.exit(0);
