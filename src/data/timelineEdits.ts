/**
 * Changes the admins make to the photo albums of "Our journey" (Admin → Landing page → Our journey).
 *
 * The albums themselves come from the photo folders (src/data/timeline.ts). These edits sit on top:
 * new titles, results and covers, hidden albums or photos, photos and albums added from the admin,
 * year taglines and the order of the albums. Shared by the server (validation) and the app.
 */
import type { LText } from './landing';
import type { TimelineEvent, TimelineKind, TimelinePhoto, TimelineYear } from './timeline';

export const TIMELINE_KINDS = ['competition', 'workshop', 'ceremony', 'team'] as const satisfies readonly TimelineKind[];

/** Changes to one album of the photo folders */
export interface AlbumEdit {
  title?: LText;
  /** null: the folder's result is removed */
  result?: LText | null;
  place?: string;
  kind?: TimelineKind;
  /** src of the cover photo */
  cover?: string;
  hidden?: boolean;
  /** src of the photos taken out */
  removed?: string[];
  /** photos uploaded from the admin, after the folder's ones */
  added?: TimelinePhoto[];
}

/** An album created in the admin (its photos are uploads) */
export interface NewAlbum {
  id: string;
  year: number;
  title: LText;
  result?: LText;
  place?: string;
  kind: TimelineKind;
  cover?: string;
  hidden?: boolean;
  photos: TimelinePhoto[];
}

export interface TimelineEdits {
  /** by year ("2026"): its tagline, and the order of its albums (album ids) */
  years?: Record<string, { tagline?: LText; order?: string[] }>;
  /** by album id ("2026/robocup vienna") */
  albums?: Record<string, AlbumEdit>;
  newAlbums?: NewAlbum[];
  updatedAt?: string;
  updatedBy?: string;
}

export const TIMELINE_LIMITS = { photosPerAlbum: 80, newAlbums: 60 } as const;

const filled = (t?: LText | null) => !!t && !!(t.en || t.fr || t.ar);

/** The albums as visitors see them: the folders with the admins' changes applied */
export function applyTimelineEdits(base: TimelineYear[], edits?: TimelineEdits | null): TimelineYear[] {
  if (!edits) return base;
  const byYear = new Map<number, TimelineEvent[]>();
  const taglines = new Map<number, TimelineYear['tagline']>();

  for (const y of base) {
    taglines.set(y.year, y.tagline);
    const events: TimelineEvent[] = [];
    for (const ev of y.events) {
      const e = edits.albums?.[ev.id];
      if (e?.hidden) continue;
      const removed = new Set(e?.removed || []);
      const photos = [...ev.photos.filter((p) => !removed.has(p.src)), ...(e?.added || [])];
      if (!photos.length) continue;
      events.push({
        ...ev,
        title: filled(e?.title) ? (e!.title as TimelineEvent['title']) : ev.title,
        result: e?.result === null ? undefined : filled(e?.result) ? (e!.result as TimelineEvent['title']) : ev.result,
        place: e?.place !== undefined ? e.place || undefined : ev.place,
        kind: e?.kind || ev.kind,
        cover: photos.find((p) => p.src === e?.cover) || (photos.includes(ev.cover) ? ev.cover : photos[0]),
        photos
      });
    }
    byYear.set(y.year, events);
  }

  for (const a of edits.newAlbums || []) {
    if (a.hidden || !a.photos.length) continue;
    const list = byYear.get(a.year) || [];
    list.push({
      id: a.id,
      title: a.title,
      result: filled(a.result) ? a.result : undefined,
      place: a.place || undefined,
      kind: a.kind,
      cover: a.photos.find((p) => p.src === a.cover) || a.photos[0],
      photos: a.photos
    });
    byYear.set(a.year, list);
  }

  return [...byYear.entries()]
    .filter(([, events]) => events.length)
    .sort(([a], [b]) => a - b)
    .map(([year, events]) => {
      const y = edits.years?.[String(year)];
      const order = y?.order || [];
      const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
      const sorted = order.length ? events.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e.id) - rank(b.e.id) || a.i - b.i).map((x) => x.e) : events;
      return {
        year,
        tagline: filled(y?.tagline) ? y!.tagline : taglines.get(year),
        events: sorted,
        photoCount: sorted.reduce((n, e) => n + e.photos.length, 0)
      };
    });
}
