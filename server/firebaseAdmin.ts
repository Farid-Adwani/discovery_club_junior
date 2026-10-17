import 'dotenv/config';
import fs from 'fs';
import { initializeApp, cert, applicationDefault, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Reads a service-account key and forgives the usual copy-paste accidents:
 * surrounding quotes, base64-encoded JSON, and "\n" written as text inside the private key.
 * Errors say what to fix (they are shown in the hosting logs).
 */
function parseServiceAccount(raw: string, source: string): ServiceAccount {
  let text = raw.trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) text = text.slice(1, -1).trim();
  if (!text.startsWith('{')) {
    const decoded = Buffer.from(text, 'base64').toString('utf8').trim();
    if (decoded.startsWith('{')) text = decoded;
  }
  let key: Record<string, string>;
  try {
    key = JSON.parse(text);
  } catch {
    throw new Error(`${source} is not valid JSON. Paste the whole content of the Firebase service-account key file.`);
  }
  if (!key.project_id || !key.client_email || !key.private_key) {
    throw new Error(`${source} is missing project_id, client_email or private_key. Paste the whole key file.`);
  }
  return { projectId: key.project_id, clientEmail: key.client_email, privateKey: key.private_key.replace(/\\n/g, '\n') };
}

// Credentials, in order of preference:
//  1. FIREBASE_SERVICE_ACCOUNT_JSON  – the key file's JSON pasted into an env var (Vercel, Render, Railway…)
//  2. FIREBASE_SERVICE_ACCOUNT_PATH  – path to the key file on disk (local development)
//  3. Application Default Credentials (Google Cloud Run / Cloud Functions)
function loadCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  let account: ServiceAccount | null = null;
  if (json?.trim()) account = parseServiceAccount(json, 'FIREBASE_SERVICE_ACCOUNT_JSON');
  else if (keyPath?.trim() && fs.existsSync(keyPath)) account = parseServiceAccount(fs.readFileSync(keyPath, 'utf8'), keyPath);
  else if (keyPath?.trim()) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_PATH points to "${keyPath}", which doesn't exist on this server. ` +
        'On Vercel, set FIREBASE_SERVICE_ACCOUNT_JSON to the content of the key file instead (and remove FIREBASE_SERVICE_ACCOUNT_PATH).'
    );
  } else if (process.env.VERCEL) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set. Add it in Vercel > Settings > Environment Variables, then redeploy.');
  }
  if (!account) return applicationDefault();
  try {
    return cert(account);
  } catch (err) {
    throw new Error(`The Firebase private key could not be read (${err instanceof Error ? err.message : err}). Paste the key file again, unchanged.`);
  }
}

if (!getApps().length) {
  initializeApp({ credential: loadCredential() });
}

export const adminAuth = getAuth();
export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
