// Images live in Firebase Storage; documents only keep their URL, so /api/data stays small.
// The browser still sends a resized data URL: the server uploads it and stores the download URL.
import crypto from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { getApp } from 'firebase-admin/app';
import './firebaseAdmin.js';
import { HttpError } from './auth.js';

function bucketName(): string {
  if (process.env.FIREBASE_STORAGE_BUCKET?.trim()) return process.env.FIREBASE_STORAGE_BUCKET.trim();
  const projectId = getApp().options.projectId || (getApp().options.credential as { projectId?: string } | undefined)?.projectId;
  if (!projectId) throw new Error('FIREBASE_STORAGE_BUCKET is not set and the project id is unknown.');
  return `${projectId}.firebasestorage.app`;
}

const bucket = () => getStorage().bucket(bucketName());

const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' } as const;

/** Download URL of an object (the token makes it readable without Storage rules). */
const downloadUrl = (path: string, token: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucketName()}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

/** The object path when the URL points to one of our own uploads */
function ownPath(url: string): string | null {
  const prefix = `https://firebasestorage.googleapis.com/v0/b/${bucketName()}/o/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length).split('?')[0]);
}

/** Uploads a base64 data URL and returns its download URL. */
export async function uploadDataUrl(dataUrl: string, folder: string, maxBytes: number): Promise<string> {
  const m = dataUrl.match(DATA_URL_RE);
  if (!m) throw new HttpError(400, 'Please choose a JPEG, PNG or WebP image.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > maxBytes) throw new HttpError(400, 'This image is too large.');
  const type = m[1] as keyof typeof EXT;
  return uploadBytes(bytes, `image/${type}`, EXT[type], folder);
}

/** Uploads an image file's bytes and returns its download URL. */
export async function uploadBytes(bytes: Buffer, contentType: string, ext: string, folder: string): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const token = crypto.randomUUID();
  await bucket()
    .file(path)
    .save(bytes, {
      resumable: false,
      contentType,
      metadata: {
        // Each upload gets a new name, so browsers may keep it forever
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
  return downloadUrl(path, token);
}

/** True for a download URL of our own bucket */
export const isStoredImage = (value: unknown) => typeof value === 'string' && ownPath(value) !== null;

/**
 * An image field from a form. Every image lives in our Storage bucket: a new data URL is uploaded,
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
  const path = ownPath(url);
  if (!path) return;
  await bucket().file(path).delete({ ignoreNotFound: true }).catch((err) => console.error('Image delete failed:', path, err));
}

/** Deletes the old image when it was replaced or removed. */
export async function replacedImage(before: unknown, after: unknown) {
  if (before && before !== after) await deleteImage(before);
}
