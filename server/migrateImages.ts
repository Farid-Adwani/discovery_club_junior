// One-off: every image moves to Firebase Storage: base64 data URLs stored inside documents, pictures linked
// from other sites (https://…) and site files (/shop/…, /photos/…). Afterwards documents only hold Storage URLs.
// Usage:
//   npm run migrate:images            -> show what would change
//   npm run migrate:images -- --apply -> upload and write the URLs
// Safe to run again (Storage URLs are skipped) and safe before or after deploying: every screen
// shows a Storage URL the same way as the old values.
import fs from 'fs';
import path from 'path';
import { db } from './firebaseAdmin';
import { uploadDataUrl, uploadBytes, isStoredImage } from './storage';

const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
const EXTS: Record<string, string> = Object.fromEntries(Object.entries(TYPES).map(([e, t]) => [t, e]));

/** Uploads a picture from another site or from public/ and returns its Storage URL. */
async function copyToStorage(value: string, folder: string): Promise<string> {
  if (value.startsWith('/')) {
    const file = path.join(process.cwd(), 'public', path.normalize(value).replace(/^(\.\.[/\\])+/, ''));
    const ext = path.extname(file).slice(1).toLowerCase();
    if (!TYPES[ext]) throw new Error(`unknown image type ${ext}`);
    return uploadBytes(fs.readFileSync(file), TYPES[ext], ext === 'jpeg' ? 'jpg' : ext, folder);
  }
  const res = await fetch(value);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!EXTS[type]) throw new Error(`not an image (${type})`);
  return uploadBytes(Buffer.from(await res.arrayBuffer()), type, EXTS[type], folder);
}

const apply = process.argv.includes('--apply');

/** collection, image field, Storage folder */
const FIELDS: [string, string, string][] = [
  ['users', 'photoURL', 'photos/users'],
  ['students', 'photoURL', 'photos/students'],
  ['groups', 'imageUrl', 'groups'],
  ['products', 'imageUrl', 'products'],
  ['stock_items', 'imageUrl', 'stock'],
  ['trainers', 'avatar', 'photos/trainers']
];

let found = 0;
let bytes = 0;
let failed = 0;

for (const [collection, field, folder] of FIELDS) {
  // Deleted documents too: they can be restored
  const snap = await db.collection(collection).get();
  for (const d of snap.docs) {
    const value = d.get(field);
    if (typeof value !== 'string' || !value || isStoredImage(value)) continue;
    const inline = value.startsWith('data:');
    found++;
    if (inline) bytes += value.length;
    console.log(`${collection.padEnd(12)} ${d.id.padEnd(28)} ${field} ${inline ? `${(value.length / 1024).toFixed(0)} KB inside` : value.slice(0, 70)}`);
    if (!apply) continue;
    try {
      const url = inline ? await uploadDataUrl(value, folder, 5_000_000) : await copyToStorage(value, folder);
      await d.ref.update({ [field]: url });
    } catch (err) {
      failed++;
      console.error(`  failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}

console.log(
  `\n${found} image(s) not in Storage yet (${(bytes / 1024 / 1024).toFixed(2)} MB inside documents).` +
    (apply ? ` Moved ${found - failed}, failed ${failed}.` : ' Nothing written; run again with --apply to move them.')
);
process.exit(failed ? 1 : 0);
