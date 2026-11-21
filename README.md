# Discovery Club Junior

Website and management platform for **Discovery Club Junior**, a robotics, coding and STEM club for kids and teens in Tunisia.

The same app is the club's public website (for parents looking for a club) and the private tool the club runs on every day: students, classes, attendance, monthly fees, the cash book, equipment stock and the club shop. It is available in **English, French and Arabic** (with right-to-left layout).

---

## Who uses it

| Role | What they get |
| --- | --- |
| **Visitor** | Public site: programs and classes with ages, achievements, coaches, FAQ, contact and WhatsApp, free trial booking, map, privacy policy and terms. |
| **Parent** | Signs up with their children, follows attendance and marks (out of 20), the weekly schedule, notifications, shop orders, and edits contact details and photos. |
| **Coach** | Their own classes and week, attendance sheets with marks and remarks, material requests to the office. |
| **Admin** | Everything: students and waitlist, classes and schedule, attendance, monthly payments and arrears, cash book, stock and inventory, shop, team accounts and the editable landing page. |

Roles are decided on the server and never taken from the browser. Admins are the emails in `ADMIN_EMAILS` (the owners) plus accounts promoted on the Team page. Coaches are accounts whose email matches a coach record. Everyone else is a parent.

## Features

- **Students**: registration with a waitlist, several classes per child, custom prices, a trash with restore, and photo consent recorded at sign-up.
- **Classes**: day, time, room, capacity, ages, level, image, several coaches, conflict warnings, one-off courses, events and cancellations.
- **Attendance**: one sheet per class and date, marks /20, teaching remarks, make-up children and trial guests, printable sheets. Parents are notified of absences and new marks.
- **Payments**: monthly fees per child, partial payments, scholarships, arrears, a 12-month trend, CSV export, and "mark several as paid" for siblings.
- **Cash book**: income and expenses by category. Tuition and shop sales are counted automatically.
- **Stock**: equipment with places, states (in use, repair, broken, lost), low-stock alerts and coach requests.
- **Shop**: club merchandise with sizes and stock. Orders go from requested to ready to picked up.
- **Notifications**: a bell in the app plus Web Push on phones and computers, in each person's language.
- **Landing page editor**: texts per language, counters, countdown and the sections to show.

## Tech stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Motion and lucide icons. A single-page app with hash routes (`#/admin/payments`); the portals load only when opened.
- **Backend**: Express in `server/`, one Node process that serves the API, the built site and the uploaded images. Hosted on a VPS behind nginx (see [DEPLOY.md](DEPLOY.md)).
- **Data**: a single SQLite file, `data/club.db` (Node's built-in `node:sqlite`). Documents are stored as JSON through `server/db.ts`, which keeps the Firestore-style API the routes use (collections, queries, batches, transactions), so the data has the same shape it had in Firestore. The browser never reads the database: the API checks every permission.
- **Images**: files in `data/uploads/`, served at `/uploads/…`. The browser resizes a picture and sends it; the server saves it and stores only its URL. Only the club's own uploads are accepted.
- **Auth**: the club's own accounts. Passwords are hashed with scrypt, sessions are random tokens (only their hash is stored), and wrong passwords and sign-ups are rate limited.

## Project structure

```
server/
  index.ts            starts the server (and serves dist/ in production)
  app.ts              Express app (JSON, /uploads, errors)
  db.ts               the SQLite database (Firestore-style documents)
  routes.ts           every API route, per role
  auth.ts             accounts, passwords, sessions, roles
  notify.ts           notifications and Web Push
  storage.ts          image uploads to data/uploads
  money.ts            millimes <-> dinars
  rateLimit.ts        attempt counters
  seed*.ts, setPassword.ts, backup.ts, importFirebase.ts   scripts (see below)
data/                 database and uploads (created on first start, not in git)
src/
  App.tsx             pages and lazy-loaded portals
  context/AppContext.tsx   data loading, actions, routing
  components/         visitor, parent, trainer, admin and common UI
  pages/              login, register, legal pages
  i18n/               EN / FR / AR messages
  data/siteContent.ts contact details, address, FAQ, testimonials, legal info
  types/              shared types (also used by the server)
public/               photos (and WebP versions), robots.txt, sitemap.xml, service worker
```

## Getting started

Requirements: Node.js 22.13 or newer. Nothing else: the database is created in `data/` on first start.

```bash
npm install
cp .env.example .env      # then fill it in (see below)
npm run dev:server        # API on http://localhost:8080
npm run dev               # website on http://localhost:3000 (proxies /api and /uploads to the API)
npm run seed              # optional: classes, coaches and shop items to start with
```

Create the first admin account (its email must be in `ADMIN_EMAILS`):

```bash
npm run set-password -- you@example.com "a-strong-password"
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `ADMIN_EMAILS` | Comma-separated owner emails; they are always admins. |
| `PORT` | Server port (default 8080). |
| `DATA_DIR` | Where the database and uploads are kept (default `./data`). |
| `HOST` | Listening address (default `127.0.0.1` in production, `0.0.0.0` in development). |
| `TRUST_PROXY` | `loopback` behind nginx, so rate limits see each visitor's real address. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push keys (`npx web-push generate-vapid-keys`). |
| `FIREBASE_SERVICE_ACCOUNT_PATH` / `_JSON`, `FIREBASE_STORAGE_BUCKET` | Only for the one-time `npm run import:firebase`. |

Never commit `.env`, `data/` or a Firebase key; all are ignored by git.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm run dev:server` | Website and API in development |
| `npm run build` | Production build into `dist/` |
| `npm run start` | Serves the API, the built site and the uploads from one Node process (production) |
| `npm run lint` | Type check (`tsc --noEmit`) |
| `npm run seed` | Fills empty collections with the club's public content (`--demo` adds sample data, `--overwrite` replaces) |
| `npm run seed:parent1` | Demo parent `parent1@example.com` / `Parent1234` (`--remove` deletes it) |
| `npm run set-password -- <email> <password>` | Creates an account or changes its password |
| `npm run backup` | Consistent copy of the database into `data/backups/` (safe while the site runs) |
| `npm run import:firebase` | One time: copies all Firestore data and Storage images into `data/` (`-- --replace` to start over) |

## Money

Amounts are stored as **whole millimes** (1 DT = 1000 millimes), so sums and comparisons are exact. The API still sends and receives dinars. Each converted document carries `moneyUnit: 'millimes'`; older documents without it are read as dinars.

## Deployment

On a VPS with nginx and HTTPS: step by step in **[DEPLOY.md](DEPLOY.md)** (install, moving the data from Firebase, systemd, nginx, updates and backups).

## Content to fill in

Fill in `src/data/siteContent.ts` with the club's real information. Sections without content stay hidden.

- contact: phone, WhatsApp, email, Instagram
- address and map coordinates
- FAQ answers, testimonials, coaches, achievement years
- legal details for the privacy policy

When the site gets its domain, also update `index.html` (canonical URL, link preview, structured data), `public/robots.txt` and `public/sitemap.xml`. The privacy policy and terms are a template and should be reviewed before you rely on them.

Texts, counters, the countdown and visible sections can also be changed without code from **Admin → Landing page**.
