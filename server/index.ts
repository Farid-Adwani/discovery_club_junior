import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router } from './routes';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.use('/api', router);

// In production the same server also serves the built React site (npm run build -> dist/)
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Server error, please try again.' : err.message });
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => console.log(`Discovery Club API running on http://localhost:${port}`));
