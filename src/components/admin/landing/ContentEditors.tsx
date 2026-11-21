import React from 'react';
import { ArrowRight, Database, Plus } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useLanguage, useT } from '../../../i18n';
import { landingMessages } from '../../../i18n/messages/landing';
import { resolveSite } from '../../../data/siteContent';
import { DEFAULT_HERO_PHOTOS, DEFAULT_HIGHLIGHT, DEFAULT_POLAROID } from '../../../data/landingDefaults';
import { CLASS_DEFAULT_IMAGE, WEEK_DAYS } from '../../../types';
import { weekdayName } from '../../../utils/schedule';
import { landingCoaches } from '../../visitor/sections';
import { LANDING_LIMITS, type LandingContent, type LandingLang, type LandingPhoto, type SiteInfo } from '../../../data/landing';
import { AddButton, ImagePick, ItemTools, LInput, SubBlock, TextInput, emptyL, inputCls, labelCls, labelText, moveItem, uploadSiteImage, useFilePicker } from './parts';

/**
 * The structured parts of Admin → Landing page: hero photos, club details, FAQ, testimonials, legal details,
 * and the preview of the classes and coaches (which are changed in their own admin sections)
 */

type EditorProps = {
  draft: LandingContent;
  setDraft: React.Dispatch<React.SetStateAction<LandingContent>>;
  lang: LandingLang;
};

const card = 'p-3 rounded-2xl bg-white border border-slate-200 space-y-3';

/** Sets one part of the club details (the part then replaces the default one) */
const patchSite = (setDraft: EditorProps['setDraft'], patch: Partial<SiteInfo>) => setDraft((d) => ({ ...d, site: { ...d.site, ...patch } }));

// ---------- hero photos ----------

export const HeroPhotosEditor: React.FC<EditorProps> = ({ draft, setDraft, lang }) => {
  const t = useT(landingMessages);
  const photos = draft.media?.heroPhotos ?? DEFAULT_HERO_PHOTOS;
  const custom = !!draft.media?.heroPhotos;
  const setMedia = (patch: Partial<NonNullable<LandingContent['media']>>) => setDraft((d) => ({ ...d, media: { ...d.media, ...patch } }));
  const setPhotos = (list: LandingPhoto[]) => setMedia({ heroPhotos: list });
  const update = (i: number, patch: Partial<LandingPhoto>) => setPhotos(photos.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const add = useFilePicker(async (files) => {
    const uploaded: LandingPhoto[] = [];
    for (const file of files) uploaded.push({ img: (await uploadSiteImage(file, 'landing')).url, tag: emptyL(), title: emptyL() });
    setPhotos([...photos, ...uploaded].slice(0, LANDING_LIMITS.heroPhotos));
  }, true);

  return (
    <SubBlock title={t('photos')} hint={t('heroPhotosHint')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <div key={`${p.img}-${i}`} className={card}>
            <ImagePick label={t('photoN', { n: i + 1 })} value={p.img} onChange={(url) => url && update(i, { img: url })} aspect="aspect-[4/5]" />
            <LInput label={t('photoTag')} lang={lang} value={p.tag} onChange={(tag) => update(i, { tag })} max={120} />
            <LInput label={t('photoTitle')} lang={lang} value={p.title} onChange={(title) => update(i, { title })} max={160} />
            <ItemTools index={i} count={photos.length} onMove={(to) => setPhotos(moveItem(photos, i, to))} onRemove={() => setPhotos(photos.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      {photos.length < LANDING_LIMITS.heroPhotos && (
        <AddButton onClick={add.open} busy={add.busy} photo>
          {add.busy ? t('uploading') : t('addPhoto')}
        </AddButton>
      )}
      {add.input}
      {custom && (
        <button type="button" onClick={() => setMedia({ heroPhotos: undefined })} className="text-[11px] font-bold text-slate-400 hover:text-[#c11e3d] cursor-pointer">
          ↺ {t('builtIn')}
        </button>
      )}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <ImagePick label={t('polaroid')} value={draft.media?.polaroid} fallback={DEFAULT_POLAROID} onChange={(polaroid) => setMedia({ polaroid })} aspect="aspect-[4/5]" />
        <ImagePick label={t('highlight')} value={draft.media?.highlight} fallback={DEFAULT_HIGHLIGHT} onChange={(highlight) => setMedia({ highlight })} aspect="aspect-square" maxSide={600} />
      </div>
    </SubBlock>
  );
};

// ---------- club details: contact, address, opening hours ----------

export const ClubDetailsEditor: React.FC<EditorProps> = ({ draft, setDraft, lang }) => {
  const t = useT(landingMessages);
  const site = resolveSite(draft.site);
  const contact = (key: keyof typeof site.contact, value: string) => patchSite(setDraft, { contact: { ...site.contact, [key]: value } });
  const address = (patch: Partial<typeof site.address>) => patchSite(setDraft, { address: { ...site.address, ...patch } });
  return (
    <SubBlock title={t('clubDetails')} hint={t('emptyHides')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextInput label={t('phone')} value={site.contact.phone} onChange={(v) => contact('phone', v)} type="tel" dir="ltr" max={40} />
        <TextInput label={t('whatsapp')} value={site.contact.whatsapp} onChange={(v) => contact('whatsapp', v)} type="tel" dir="ltr" max={30} />
        <TextInput label={t('email')} value={site.contact.email} onChange={(v) => contact('email', v)} type="email" dir="ltr" max={200} />
        <TextInput label={t('facebook')} value={site.contact.facebook} onChange={(v) => contact('facebook', v)} dir="ltr" placeholder="https://www.facebook.com/…" />
        <TextInput label={t('instagram')} value={site.contact.instagram} onChange={(v) => contact('instagram', v)} dir="ltr" placeholder="https://www.instagram.com/…" />
        <LInput label={t('openingHours')} lang={lang} value={site.openingHours} onChange={(openingHours) => patchSite(setDraft, { openingHours })} max={200} />
        <LInput label={t('street')} lang={lang} value={site.address.street} onChange={(street) => address({ street })} max={200} />
        <LInput label={t('city')} lang={lang} value={site.address.city} onChange={(city) => address({ city })} max={120} />
        <TextInput label={t('lat')} value={String(site.address.lat || '')} onChange={(v) => address({ lat: Number(v) || 0 })} type="number" dir="ltr" placeholder="36.8100" />
        <TextInput label={t('lng')} value={String(site.address.lng || '')} onChange={(v) => address({ lng: Number(v) || 0 })} type="number" dir="ltr" placeholder="10.0970" />
      </div>
      <p className="text-[11px] font-medium text-slate-500">{t('mapHint')}</p>
    </SubBlock>
  );
};

// ---------- FAQ ----------

export const FaqEditor: React.FC<EditorProps> = ({ draft, setDraft, lang }) => {
  const t = useT(landingMessages);
  // The built-in questions are unfinished drafts: the list starts empty
  const faq = draft.site?.faq ?? [];
  const set = (list: typeof faq) => patchSite(setDraft, { faq: list });
  return (
    <SubBlock title={t('faqList')}>
      {faq.map((f, i) => (
        <div key={i} className={card}>
          <LInput label={`${t('question')} ${i + 1}`} lang={lang} value={f.q} onChange={(q) => set(faq.map((x, j) => (j === i ? { ...x, q } : x)))} max={300} />
          <LInput label={t('answer')} lang={lang} value={f.a} long onChange={(a) => set(faq.map((x, j) => (j === i ? { ...x, a } : x)))} max={3000} />
          <ItemTools index={i} count={faq.length} onMove={(to) => set(moveItem(faq, i, to))} onRemove={() => set(faq.filter((_, j) => j !== i))} />
        </div>
      ))}
      {faq.length < LANDING_LIMITS.faq && (
        <AddButton onClick={() => set([...faq, { q: emptyL(), a: emptyL() }])}>
          <Plus className="w-4 h-4" /> {t('addQuestion')}
        </AddButton>
      )}
    </SubBlock>
  );
};

// ---------- testimonials ----------

export const TestimonialsEditor: React.FC<EditorProps> = ({ draft, setDraft, lang }) => {
  const t = useT(landingMessages);
  const list = draft.site?.testimonials ?? resolveSite(undefined).testimonials;
  const set = (next: typeof list) => patchSite(setDraft, { testimonials: next });
  return (
    <SubBlock title={t('testimonialList')}>
      {list.map((q, i) => (
        <div key={i} className={card}>
          <LInput label={t('quote')} lang={lang} value={q.quote} long onChange={(quote) => set(list.map((x, j) => (j === i ? { ...x, quote } : x)))} max={1000} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput label={t('author')} value={q.author} onChange={(author) => set(list.map((x, j) => (j === i ? { ...x, author } : x)))} max={100} />
            <LInput label={t('authorRole')} lang={lang} value={q.role} onChange={(role) => set(list.map((x, j) => (j === i ? { ...x, role } : x)))} max={160} />
          </div>
          <ItemTools index={i} count={list.length} onMove={(to) => set(moveItem(list, i, to))} onRemove={() => set(list.filter((_, j) => j !== i))} />
        </div>
      ))}
      {list.length < LANDING_LIMITS.testimonials && (
        <AddButton onClick={() => set([...list, { quote: emptyL(), author: '', role: emptyL() }])}>
          <Plus className="w-4 h-4" /> {t('addTestimonial')}
        </AddButton>
      )}
    </SubBlock>
  );
};

// ---------- classes and coaches: not edited here ----------

/**
 * Classes and coaches come from the database: the page shows those of Admin → Classes and Admin → Team.
 * This block only previews them and opens the place where they are changed.
 */
export const FromDatabase: React.FC<{ kind: 'classes' | 'coaches'; onOpen?: () => void }> = ({ kind, onOpen }) => {
  const t = useT(landingMessages);
  const { groups, trainers } = useApp();
  const { locale } = useLanguage();
  const items =
    kind === 'classes'
      ? [...groups]
          .sort((a, b) => WEEK_DAYS.indexOf(a.dayOfWeek) - WEEK_DAYS.indexOf(b.dayOfWeek) || a.timeSlot.localeCompare(b.timeSlot))
          .map((g) => ({ key: g.id, name: g.name, sub: `${weekdayName(g.dayOfWeek, locale, 'short')} · ${g.timeSlot}`, photo: g.imageUrl || CLASS_DEFAULT_IMAGE }))
      : landingCoaches(trainers).map((c, i) => ({ key: `${i}-${c.name}`, name: c.name, sub: c.role, photo: c.photo }));
  const shown = items.slice(0, 12);
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
      <span className="grid place-items-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#c11e3d] shrink-0">
        <Database className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0 space-y-2.5">
        <div>
          <p className="text-sm font-black text-slate-800">{t(kind === 'classes' ? 'classesFromDb' : 'coachesFromDb')}</p>
          <p className="text-[11px] font-medium text-slate-500">{t(kind === 'classes' ? 'classesFromDbHint' : 'coachesFromDbHint')}</p>
        </div>
        {items.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {shown.map((it) => (
              <li key={it.key} className="flex items-center gap-2 ps-1 pe-3 py-1 rounded-full bg-white border border-slate-200 max-w-full">
                {it.photo ? (
                  <img src={it.photo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded-full grid place-items-center bg-[#191919] text-white text-[11px] font-black shrink-0">{it.name.slice(0, 1).toUpperCase()}</span>
                )}
                <span className="min-w-0 leading-tight">
                  <span className="block text-xs font-bold text-slate-800 truncate">{it.name}</span>
                  {it.sub && <span className="block text-[10px] font-semibold text-slate-400 truncate">{it.sub}</span>}
                </span>
              </li>
            ))}
            {items.length > shown.length && (
              <li className="self-center px-2 text-xs font-black text-slate-400" dir="ltr">
                +{items.length - shown.length}
              </li>
            )}
          </ul>
        ) : (
          <p className="text-xs font-bold text-amber-700">{t(kind === 'classes' ? 'noClassesYet' : 'noCoachesYet')}</p>
        )}
      </div>
      {onOpen && (
        <button type="button" onClick={onOpen} className="self-start shrink-0 px-4 py-2.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer">
          {t(kind === 'classes' ? 'openClasses' : 'openTeam')}
          <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
        </button>
      )}
    </div>
  );
};

// ---------- legal details ----------

export const LegalEditor: React.FC<EditorProps> = ({ draft, setDraft, lang }) => {
  const t = useT(landingMessages);
  const site = resolveSite(draft.site);
  const legal = { ...site.legal, legalName: site.legalName };
  const set = (patch: Partial<typeof legal>) => patchSite(setDraft, { legal: { ...legal, ...patch } });
  return (
    <SubBlock title={t('g_legal')} hint={t('emptyHides')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextInput label={t('legalName')} value={legal.legalName} onChange={(legalName) => set({ legalName })} max={200} />
        <TextInput label={t('controller')} value={legal.controller} onChange={(controller) => set({ controller })} max={300} />
        <TextInput label={t('registration')} value={legal.registration} onChange={(registration) => set({ registration })} max={100} />
        <TextInput label={t('privacyEmail')} value={legal.privacyEmail} onChange={(privacyEmail) => set({ privacyEmail })} type="email" dir="ltr" max={200} />
        <LInput label={t('retention')} lang={lang} value={legal.retention} onChange={(retention) => set({ retention })} max={100} />
        <LInput label={t('courts')} lang={lang} value={legal.courts} onChange={(courts) => set({ courts })} max={100} />
        <label className={labelCls}>
          <span className={labelText}>{t('lastUpdated')}</span>
          <input type="date" value={legal.lastUpdated} onChange={(e) => set({ lastUpdated: e.target.value })} className={`${inputCls} w-48`} />
        </label>
      </div>
    </SubBlock>
  );
};
