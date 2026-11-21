// Images live on the server's disk (data/uploads) and are served at /uploads/…; documents only keep that URL,
// so /api/data stays small. The browser sends a resized data URL: the server saves the file and stores its URL.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './db.js';
import { HttpError } from './auth.js';

export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
/** Public address of the folder (app.ts serves it) */
export const UPLOAD_URL = '/uploads/';

const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' } as const;
/**
 * folder/…/name.ext with plain names only (no "..", no hidden files). Uploads from the site are only ever
 * JPEG, PNG or WebP; .svg is accepted for images brought over from Firebase (app.ts serves them sandboxed).
 */
const SAFE_PATH = /^(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.(?:jpe?g|png|webp|svg)$/i;

/** The file path inside data/uploads when the URL is one of our own uploads */
function ownPath(url: string): string | null {
  if (!url.startsWith(UPLOAD_URL)) return null;
  const rel = url.slice(UPLOAD_URL.length).split(/[?#]/)[0];
  if (!SAFE_PATH.test(rel) || rel.split('/').some((s) => s === '..')) return null;
  return rel;
}

/** Saves a base64 data URL and returns its URL. */
export async function uploadDataUrl(dataUrl: string, folder: string, maxBytes: number): Promise<string> {
  const m = dataUrl.match(DATA_URL_RE);
  if (!m) throw new HttpError(400, 'Please choose a JPEG, PNG or WebP image.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > maxBytes) throw new HttpError(400, 'This image is too large.');
  const type = m[1] as keyof typeof EXT;
  return uploadBytes(bytes, `image/${type}`, EXT[type], folder);
}

/** Saves an image file's bytes under a new name and returns its URL. */
export async function uploadBytes(bytes: Buffer, _contentType: string, ext: string, folder: string): Promise<string> {
  return saveUpload(`${folder}/${crypto.randomUUID()}.${ext}`, bytes);
}

/** Writes a file at `rel` inside data/uploads (also used by the Firebase import, which keeps the old names) */
export async function saveUpload(rel: string, bytes: Buffer): Promise<string> {
  if (!SAFE_PATH.test(rel)) throw new Error(`Unsafe upload path: ${rel}`);
  const file = path.join(UPLOAD_DIR, rel);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  // Written next to it first, then renamed: a half-written image is never served
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, bytes);
  await fs.promises.rename(tmp, file);
  return UPLOAD_URL + rel;
}

/** True for the URL of one of our uploads */
export const isStoredImage = (value: unknown) => typeof value === 'string' && ownPath(value) !== null;

/**
 * An image field from a form. Every image lives in our uploads: a new data URL is saved,
 * a URL of an image already uploaded is kept, anything else (other sites, site files) is refused.
 * Empty gives undefined.
 */
export async function imageField(value: unknown, folder: string, { maxBytes = 700_000, field = 'Image' } = {}): Promise<string | undefined> {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${field} is invalid.`);
  if (value.startsWith('data:')) return uploadDataUrl(value, folder, maxBytes);
  if (value.length <= 2000 && isStoredImage(value)) return value;
  throw new HttpError(400, `${field} must be an uploaded image.`);
}

/** Removes an uploaded image that is no longer used. Never throws (a leftover file is harmless). */
export async function deleteImage(url: unknown) {
  if (typeof url !== 'string') return;
  const rel = ownPath(url);
  if (!rel) return;
  await fs.promises.rm(path.join(UPLOAD_DIR, rel), { force: true }).catch((err) => console.error('Image delete failed:', rel, err));
}

/** Deletes the old image when it was replaced or removed. */
export async function replacedImage(before: unknown, after: unknown) {
  if (before && before !== after) await deleteImage(before);
}
