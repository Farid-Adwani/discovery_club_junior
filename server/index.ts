import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './app.js';
import { DB_FILE, purgeExpired } from './db.js';
import { ownerCount } from './auth.js';

if (!ownerCount()) console.warn('Warning: ADMIN_EMAILS is empty in .env, so nobody is the club owner (admin).');
// Behind nginx every visitor would share nginx's address: wrong-password and sign-up limits would hit everyone at once
if (process.env.NODE_ENV === 'production' && !process.env.TRUST_PROXY) {
  console.warn('Warning: TRUST_PROXY is not set. Behind nginx, set TRUST_PROXY="loopback" in .env (see DEPLOY.md).');
}

// In production the same server also serves the built React site (npm run build -> dist/).
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(distDir, { index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// Old rate-limit counters, now and every hour
purgeExpired();
setInterval(purgeExpired, 3_600_000).unref();

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
app.listen(port, host, () => console.log(`Discovery Club running on http://${host}:${port} (database: ${DB_FILE})`));
