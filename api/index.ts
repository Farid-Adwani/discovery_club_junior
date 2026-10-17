// Vercel serverless function: every /api/* request is sent here (see vercel.json) and handled by the Express app.
// The app is loaded on the first request, so a setup problem (e.g. a missing or broken Firebase key)
// answers with a clear message instead of crashing the function with FUNCTION_INVOCATION_FAILED.
import type { IncomingMessage, ServerResponse } from 'http';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let appPromise: Promise<Handler> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    appPromise ??= import('../server/app.js').then((m) => m.app as unknown as Handler);
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    appPromise = null; // try again on the next request (e.g. after fixing the environment variables)
    const message = err instanceof Error ? err.message : String(err);
    console.error('The API could not start:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Server setup error: ${message.slice(0, 400)}` }));
  }
}
