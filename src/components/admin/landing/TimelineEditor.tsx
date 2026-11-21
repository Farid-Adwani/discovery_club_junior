import React, { useMemo, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Plus, RotateCcw, Star, Trash2, X } from 'lucide-react';
import { useT, useLanguage } from '../../../i18n';
import { landingMessages } from '../../../i18n/messages/landing';
import { visitorMessages } from '../../../i18n/messages/visitor';
import { TIMELINE, type TimelineEvent, type TimelineKind, type TimelinePhoto } from '../../../data/timeline';
import { TIMELINE_KINDS, TIMELINE_LIMITS, type AlbumEdit, type NewAlbum, type TimelineEdits } from '../../../data/timelineEdits';
import type { LandingLang, LText } from '../../../data/landing';
import { AddButton, ItemTools, LInput, SubBlock, TextInput, emptyL, inputCls, labelCls, labelText, moveItem, uploadSiteImage, useFilePicker } from './parts';

/**
 * "Our journey" albums: the photo folders, with the admins' changes on top (saved as TimelineEdits).
 * Albums of the folders are hidden rather than deleted (they can be shown again); albums made here can be deleted.
 */

type Props = { edits: TimelineEdits; setEdits: React.Dispatch<React.SetStateAction<TimelineEdits>>; lang: LandingLang };

const KIND_KEY = { competition: 'kindCompetition', workshop: 'kindWorkshop', ceremony: 'kindCeremony', team: 'kindTeam' } as const;
const newId = () => `new-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Drops the empty parts of an album edit (an edit with nothing left is removed) */
function clean(edit: AlbumEdit): AlbumEdit | undefined {
  const out = Object.fromEntries(Object.entries(edit).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))) as AlbumEdit;
  return Object.keys(out).length ? out : undefined;
}

/** Uploads a photo twice: full size (viewer, museum) and a small one (album grid) */
async function uploadAlbumPhoto(file: File): Promise<TimelinePhoto> {
  const [full, small] = await Promise.all([uploadSiteImage(file, 'timeline', 1600), uploadSiteImage(file, 'timeline', 520)]);
  return { src: full.url, thumb: small.url, w: full.w, h: full.h };
}

export const TimelineEditor: React.FC<Props> = ({ edits, setEdits, lang }) => {
  const t = useT(landingMessages);
  const { lang: uiLang } = useLanguage();
  const tv = (k: keyof typeof KIND_KEY) => visitorMessages[uiLang][KIND_KEY[k]];
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const years = useMemo(
    () => [...new Set([...TIMELINE.map((y) => y.year), ...(edits.newAlbums || []).map((a) => a.year), ...extraYears])].sort((a, b) => a - b),
    [edits.newAlbums, extraYears]
  );
  const [year, setYear] = useState(years[years.length - 1]);
  const [open, setOpen] = useState<string | null>(null);
  const [yearInput, setYearInput] = useState('');

  const base = TIMELINE.find((y) => y.year === year);
  const news = (edits.newAlbums || []).filter((a) => a.year === year);
  const defaultOrder = [...(base?.events || []).map((e) => e.id), ...news.map((a) => a.id)];
  const order = edits.years?.[String(year)]?.order;
  const ids = order ? [...order.filter((id) => defaultOrder.includes(id)), ...defaultOrder.filter((id) => !order.includes(id))] : defaultOrder;

  const setYearEntry = (patch: { tagline?: LText; order?: string[] }) =>
    setEdits((e) => ({ ...e, years: { ...e.years, [String(year)]: { ...e.years?.[String(year)], ...patch } } }));
  const setAlbum = (id: string, patch: Partial<AlbumEdit>) =>
    setEdits((e) => {
      const albums = { ...e.albums };
      const next = clean({ ...albums[id], ...patch });
      if (next) albums[id] = next;
      else delete albums[id];
      return { ...e, albums };
    });
  const setNew = (id: string, patch: Partial<NewAlbum>) => setEdits((e) => ({ ...e, newAlbums: (e.newAlbums || []).map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

  const addAlbum = () => {
    const album: NewAlbum = { id: newId(), year, title: emptyL(), kind: 'competition', place: '', photos: [] };
    setEdits((e) => ({ ...e, newAlbums: [...(e.newAlbums || []), album] }));
    setOpen(album.id);
  };
  const addYear = () => {
    const y = Math.round(Number(yearInput));
    if (!y || y < 1990 || y > 2100) return;
    if (!years.includes(y)) setExtraYears((list) => [...list, y]);
    setYear(y);
    setYearInput('');
  };

  return (
    <SubBlock title={t('albums')} hint={t('albumsHint')}>
      {/* years */}
      <div className="flex flex-wrap items-center gap-1.5">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => {
              setYear(y);
              setOpen(null);
            }}
            aria-pressed={y === year}
            className={`px-3 py-1.5 rounded-lg font-mono text-sm font-black cursor-pointer ${y === year ? 'bg-[#c11e3d] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#c11e3d]'}`}
          >
            {y}
          </button>
        ))}
        <span className="flex items-center gap-1 ms-2">
          <input
            type="number"
            min={1990}
            max={2100}
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addYear())}
            placeholder={String(new Date().getFullYear() + 1)}
            aria-label={t('addYear')}
            className={`${inputCls} w-24 py-1.5!`}
          />
          <button type="button" onClick={addYear} className="whitespace-nowrap px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-600 hover:border-[#c11e3d] cursor-pointer">
            <Plus className="inline w-3.5 h-3.5" /> {t('addYear')}
          </button>
        </span>
      </div>

      <LInput label={`${t('tagline')} · ${year}`} lang={lang} value={edits.years?.[String(year)]?.tagline} placeholder={base?.tagline?.[lang] || ''} onChange={(tagline) => setYearEntry({ tagline })} max={200} />

      {/* the year's albums */}
      <div className="space-y-2">
        {ids.map((id, i) => {
          const ev = base?.events.find((e) => e.id === id);
          const nu = news.find((a) => a.id === id);
          if (!ev && !nu) return null;
          return (
            <AlbumRow
              key={id}
              ev={ev}
              nu={nu}
              edit={edits.albums?.[id]}
              lang={lang}
              kindLabel={tv}
              expanded={open === id}
              onToggle={() => setOpen(open === id ? null : id)}
              tools={<ItemTools index={i} count={ids.length} onMove={(to) => setYearEntry({ order: moveItem(ids, i, to) })} onRemove={() => (nu ? setEdits((e) => ({ ...e, newAlbums: (e.newAlbums || []).filter((a) => a.id !== id) })) : setAlbum(id, { hidden: true }))} />}
              setAlbum={(patch) => setAlbum(id, patch)}
              setNew={(patch) => setNew(id, patch)}
            />
          );
        })}
      </div>
      {(edits.newAlbums || []).length < TIMELINE_LIMITS.newAlbums && (
        <AddButton onClick={addAlbum}>
          <Plus className="w-4 h-4" /> {t('newAlbum')} · {year}
        </AddButton>
      )}
    </SubBlock>
  );
};

/** One album: a summary line, and when opened, its fields and photos */
const AlbumRow: React.FC<{
  ev?: TimelineEvent;
  nu?: NewAlbum;
  edit?: AlbumEdit;
  lang: LandingLang;
  kindLabel: (k: TimelineKind) => string;
  expanded: boolean;
  onToggle: () => void;
  tools: React.ReactNode;
  setAlbum: (patch: Partial<AlbumEdit>) => void;
  setNew: (patch: Partial<NewAlbum>) => void;
}> = ({ ev, nu, edit, lang, kindLabel, expanded, onToggle, tools, setAlbum, setNew }) => {
  const t = useT(landingMessages);
  const isNew = !!nu;
  const hidden = isNew ? !!nu!.hidden : !!edit?.hidden;
  const removed = new Set(edit?.removed || []);
  // every photo of the album, with what can be done to it
  const photos: { p: TimelinePhoto; removed: boolean; own: boolean }[] = isNew
    ? nu!.photos.map((p) => ({ p, removed: false, own: true }))
    : [...ev!.photos.map((p) => ({ p, removed: removed.has(p.src), own: false })), ...(edit?.added || []).map((p) => ({ p, removed: false, own: true }))];
  const live = photos.filter((x) => !x.removed).map((x) => x.p);
  const coverSrc = isNew ? nu!.cover : edit?.cover || ev!.cover.src;
  const cover = live.find((p) => p.src === coverSrc) || live[0];
  const title = isNew ? nu!.title : edit?.title;
  const shownTitle = title?.[lang] || title?.en || ev?.title[lang] || '…';
  const result = isNew ? nu!.result : edit?.result === null ? undefined : edit?.result;
  const kind = (isNew ? nu!.kind : edit?.kind || ev!.kind) as TimelineKind;
  const place = isNew ? nu!.place || '' : edit?.place ?? ev!.place ?? '';

  const add = useFilePicker(async (files) => {
    const uploaded: TimelinePhoto[] = [];
    for (const f of files) uploaded.push(await uploadAlbumPhoto(f));
    if (isNew) setNew({ photos: [...nu!.photos, ...uploaded].slice(0, TIMELINE_LIMITS.photosPerAlbum) });
    else setAlbum({ added: [...(edit?.added || []), ...uploaded].slice(0, TIMELINE_LIMITS.photosPerAlbum) });
  }, true);

  const set = (patch: Partial<AlbumEdit & NewAlbum>) => (isNew ? setNew(patch as Partial<NewAlbum>) : setAlbum(patch as Partial<AlbumEdit>));
  const togglePhoto = (x: { p: TimelinePhoto; removed: boolean; own: boolean }) => {
    if (isNew) setNew({ photos: nu!.photos.filter((p) => p !== x.p) });
    else if (x.own) setAlbum({ added: (edit?.added || []).filter((p) => p !== x.p) });
    else setAlbum({ removed: x.removed ? [...removed].filter((s) => s !== x.p.src) : [...removed, x.p.src] });
  };

  return (
    <div className={`rounded-2xl border bg-white ${hidden ? 'border-dashed border-slate-300 opacity-70' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 p-2.5">
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex flex-1 min-w-0 items-center gap-3 text-start cursor-pointer">
          <span className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-slate-100">{cover && <img src={cover.thumb} alt="" className="w-full h-full object-cover" />}</span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-slate-800 truncate">{shownTitle}</span>
            <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
              {kindLabel(kind)} · {t('photosCount', { n: live.length })}
              {isNew && <span className="px-1.5 rounded bg-[#e1f5e9] text-[#14532d]">{t('albumNew')}</span>}
              {hidden && <span className="px-1.5 rounded bg-slate-100 text-slate-600">{t('hiddenAlbum')}</span>}
            </span>
          </span>
          <ChevronDown className={`ms-auto w-4 h-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => set({ hidden: hidden ? undefined : true })}
          title={hidden ? t('showAlbum') : t('hideAlbum')}
          aria-label={hidden ? t('showAlbum') : t('hideAlbum')}
          className="grid place-items-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#c11e3d] hover:border-[#c11e3d] cursor-pointer"
        >
          {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        {tools}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LInput label={t('albumTitle')} lang={lang} value={title} placeholder={ev?.title[lang]} onChange={(v) => set({ title: v })} max={160} />
            <div className="space-y-1">
              <LInput label={t('albumResult')} lang={lang} value={result || undefined} placeholder={edit?.result === null ? '' : ev?.result?.[lang]} onChange={(v) => set({ result: v })} max={160} />
              {!isNew && ev?.result && edit?.result !== null && (
                <button type="button" onClick={() => setAlbum({ result: null })} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-[#c11e3d] cursor-pointer">
                  <X className="w-3 h-3" /> {t('remove')}
                </button>
              )}
              {!isNew && edit?.result === null && (
                <button type="button" onClick={() => setAlbum({ result: undefined })} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-[#c11e3d] cursor-pointer">
                  <RotateCcw className="w-3 h-3" /> {t('restore')}
                </button>
              )}
            </div>
            <TextInput label={t('albumPlace')} value={place} onChange={(v) => set({ place: v })} placeholder="🇹🇳 Tunis" max={80} />
            <label className={labelCls}>
              <span className={labelText}>{t('albumKind')}</span>
              <select value={kind} onChange={(e) => set({ kind: e.target.value as TimelineKind })} className={inputCls}>
                {TIMELINE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kindLabel(k)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <span className={labelText}>
              {t('showPhotos')} · {t('photosCount', { n: live.length })}
            </span>
            {!live.length && <p className="text-[11px] font-bold text-amber-700">{t('noPhotosYet')}</p>}
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
              {photos.map((x) => {
                const isCover = !x.removed && cover?.src === x.p.src;
                return (
                  <div key={x.p.src} className={`relative aspect-square rounded-xl overflow-hidden bg-slate-100 ${isCover ? 'ring-4 ring-[#e2a52c]' : ''}`}>
                    <img src={x.p.thumb} alt="" loading="lazy" className={`w-full h-full object-cover ${x.removed ? 'opacity-30 grayscale' : ''}`} />
                    {x.removed && <span className="absolute top-1 start-1 px-1.5 rounded bg-white/90 text-[9px] font-black text-slate-600">{t('removedPhoto')}</span>}
                    <div className="absolute bottom-1 inset-x-1 flex justify-between gap-1">
                      {!x.removed ? (
                        <button
                          type="button"
                          onClick={() => set({ cover: x.p.src })}
                          title={t('setCover')}
                          aria-label={t('setCover')}
                          aria-pressed={isCover}
                          className={`grid place-items-center w-7 h-7 rounded-lg cursor-pointer ${isCover ? 'bg-[#e2a52c] text-white' : 'bg-white/90 text-slate-600 hover:text-[#e2a52c]'}`}
                        >
                          <Star className="w-3.5 h-3.5" fill={isCover ? 'currentColor' : 'none'} />
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => togglePhoto(x)}
                        title={x.removed ? t('restore') : t('remove')}
                        aria-label={x.removed ? t('restore') : t('remove')}
                        className="grid place-items-center w-7 h-7 rounded-lg bg-white/90 text-slate-600 hover:text-[#c11e3d] cursor-pointer"
                      >
                        {x.removed ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {live.length < TIMELINE_LIMITS.photosPerAlbum && (
              <AddButton onClick={add.open} busy={add.busy} photo>
                {add.busy ? t('uploading') : t('addPhotos')}
              </AddButton>
            )}
            {add.input}
          </div>
        </div>
      )}
    </div>
  );
};
