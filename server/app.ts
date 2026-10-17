import express, { type Request, type Response, type NextFunction } from 'express';
import { router } from './routes.js';

/** The API (/api/...). Started by server/index.ts locally, and run as a function by Vercel (api/index.ts). */
export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.use('/api', router);

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Server error, please try again.' : err.message });
});
