import 'dotenv/config';
import fs from 'fs';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Credentials, in order of preference:
//  1. FIREBASE_SERVICE_ACCOUNT_JSON  – the key file's JSON pasted into an env var (Render, Railway…)
//  2. FIREBASE_SERVICE_ACCOUNT_PATH  – path to the key file on disk (local development)
//  3. Application Default Credentials (Google Cloud Run / Cloud Functions)
function loadCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) return cert(JSON.parse(json));

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (keyPath) return cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')));

  return applicationDefault();
}

if (!getApps().length) {
  initializeApp({ credential: loadCredential() });
}

export const adminAuth = getAuth();
export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
