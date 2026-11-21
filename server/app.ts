import express, { type Request, type Response, type NextFunction } from 'express';
import { router } from './routes.js';
import { UPLOAD_DIR, UPLOAD_URL } from './storage.js';

/** The API (/api/...) and the uploaded images (/uploads/...). Started by server/index.ts. */
export const app = express();
app.disable('x-powered-by');
// Behind a reverse proxy (nginx on the VPS), the visitor's address comes from it: see TRUST_PROXY in .env.example
if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
// Landing page photos may be up to 1.8 MB (routes.ts), about 2.4 MB once sent as text: that route gets more room
/**
 * What the pages may load: our own files, plus Google Fonts, the coach placeholder photos (Unsplash) and the
 * Google Maps frame. Photos being prepared for upload are data: and blob: images. No other site may show
 * our pages in a frame (clickjacking).
 */
const PAGE_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com",
  "connect-src 'self'",
  'frame-src https://maps.google.com https://www.google.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', PAGE_POLICY);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // HTTPS only from now on (nginx tells us the visit came over HTTPS: TRUST_PROXY + X-Forwarded-Proto)
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});

app.use('/api/admin/uploads', express.json({ limit: '4mb' }));
app.use(express.json({ limit: '2mb' }));

// Answers hold personal data: never kept in the browser's or a proxy's cache
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', router);

// Each upload gets a new name, so browsers may keep it forever; nosniff: it is only ever shown as an image.
// The sandbox policy keeps an SVG opened on its own from running anything.
app.use(
  UPLOAD_URL,
  express.static(UPLOAD_DIR, {
    immutable: true,
    maxAge: '365d',
    index: false,
    dotfiles: 'deny',
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
    }
  })
);

app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Server error, please try again.' : err.message });
});
