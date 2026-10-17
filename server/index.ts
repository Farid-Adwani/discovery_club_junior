import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './app.js';

// In production on a plain Node host, the same server also serves the built React site (npm run build -> dist/).
// On Vercel the site is served as static files and the API runs from api/index.ts instead.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => console.log(`Discovery Club API running on http://localhost:${port}`));
