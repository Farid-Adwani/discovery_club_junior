import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PAGE_META, PAGE_PATHS, SITE_URL, pageForPath, type PublicPage } from '../src/utils/routes.js';
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
  const pageHtml = pageHtmlFor(fs.readFileSync(path.join(distDir, 'index.html'), 'utf8'));
  app.get('*', (req, res) => {
    // Each public page (/cours, /connexion…) gets its own title, description and address, for search engines
    // and link previews; an unknown address is a 404 (the app then shows the home page)
    const page = pageForPath(req.path);
    res.status(page ? 200 : 404).type('html').send(pageHtml(page ?? 'home', !page));
  });
}

/** index.html with the title, description and canonical address of a page (French: the site's main language) */
function pageHtmlFor(template: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cache = new Map<string, string>();
  return (page: PublicPage, notFound: boolean): string => {
    const key = `${page}:${notFound}`;
    let html = cache.get(key);
    if (html) return html;
    html = template;
    if (page !== 'home') {
      const { title, description } = PAGE_META[page].fr;
      const url = `${SITE_URL}${PAGE_PATHS[page]}`;
      const content = (attr: string, value: string) => {
        html = html!.replace(new RegExp(`(<meta ${attr} content=")[^"]*(")`), `$1${esc(value)}$2`);
      };
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
      html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
      content('name="description"', description);
      content('property="og:title"', title);
      content('property="og:description"', description);
      content('property="og:url"', url);
      content('name="twitter:title"', title);
      content('name="twitter:description"', description);
    }
    if (notFound) html = html.replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex"');
    cache.set(key, html);
    return html;
  };
}

// Old rate-limit counters, now and every hour
purgeExpired();
setInterval(purgeExpired, 3_600_000).unref();

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
app.listen(port, host, () => console.log(`Discovery Club running on http://${host}:${port} (database: ${DB_FILE})`));
