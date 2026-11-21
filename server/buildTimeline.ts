/**
 * Builds the photo timeline of the landing page from public/photos/timeline:
 *
 *   public/photos/timeline/discovery<YEAR>/<event folder>/<photo>.jpg
 *
 * For every photo it makes a small WebP copy in public/photos/webp/timeline/<year>/<event>/ (for the
 * cards and the strip under the viewer) and writes the list to src/data/timelinePhotos.json.
 * Titles, results and cover photos of the events are in src/data/timeline.ts; a new folder shows
 * with its folder name until it is given a title there.
 *
 * Run it after adding, renaming or removing photos:  npm run timeline   (needs ffmpeg and ffprobe)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'public/photos/timeline');
const THUMBS = path.join(ROOT, 'public/photos/webp/timeline');
const MANIFEST = path.join(ROOT, 'src/data/timelinePhotos.json');
const THUMB_WIDTH = 480;
const PHOTO = /\.(jpe?g|png|webp)$/i;

const byName = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'photo';
/** Public URL of a file under public/ */
const url = (file: string) => encodeURI('/' + path.relative(path.join(ROOT, 'public'), file).split(path.sep).join('/'));

function size(file: string): { w: number; h: number } {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim();
  const [w, h] = out.split(',').map(Number);
  if (!w || !h) throw new Error(`Cannot read the size of ${file}`);
  return { w, h };
}

function makeThumb(src: string, dest: string) {
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `scale='min(${THUMB_WIDTH},iw)':-2`, '-c:v', 'libwebp', '-quality', '72', dest]);
  return true;
}

const keep = new Set<string>();
let made = 0;
const years = fs
  .readdirSync(SOURCE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^discovery\d{4}$/i.test(d.name))
  .map((d) => d.name)
  .sort(byName)
  .map((yearDir) => {
    const year = Number(yearDir.slice(-4));
    const events = fs
      .readdirSync(path.join(SOURCE, yearDir), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort(byName)
      .map((folder) => {
        const dir = path.join(SOURCE, yearDir, folder);
        const thumbDir = path.join(THUMBS, String(year), slug(folder));
        const used = new Set<string>();
        const photos = fs
          .readdirSync(dir)
          .filter((f) => PHOTO.test(f))
          .sort(byName)
          .map((file) => {
            // "1.jpg" and "1..jpg" give the same slug: number the second one
            let name = slug(file);
            for (let i = 2; used.has(name); i++) name = `${slug(file)}-${i}`;
            used.add(name);
            const src = path.join(dir, file);
            const thumb = path.join(thumbDir, `${name}.webp`);
            if (makeThumb(src, thumb)) made++;
            keep.add(thumb);
            return { file, src: url(src), thumb: url(thumb), ...size(src) };
          });
        return { folder, photos };
      })
      .filter((e) => e.photos.length > 0);
    return { year, events };
  })
  .filter((y) => y.events.length > 0);

// Thumbnails of photos that are gone
let removed = 0;
const sweep = (dir: string) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      sweep(p);
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    } else if (!keep.has(p)) {
      fs.unlinkSync(p);
      removed++;
    }
  }
};
sweep(THUMBS);

fs.writeFileSync(MANIFEST, JSON.stringify(years, null, 1) + '\n');
const count = years.reduce((n, y) => n + y.events.reduce((m, e) => m + e.photos.length, 0), 0);
console.log(`${years.length} years, ${years.reduce((n, y) => n + y.events.length, 0)} events, ${count} photos`);
console.log(`${made} thumbnails made, ${removed} removed → ${path.relative(ROOT, MANIFEST)}`);
