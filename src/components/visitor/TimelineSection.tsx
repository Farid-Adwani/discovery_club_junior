import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Award, ChevronLeft, ChevronRight, Images, Landmark, Trophy, Users, Wrench } from 'lucide-react';
import type { TimelineEvent, TimelineKind } from '../../data/timeline';
import { useTimeline } from './useTimeline';
import { useLanguage } from '../../i18n';
import type { visitorMessages } from '../../i18n/messages/visitor';
import { Reveal } from './RoboticsArt';
import { CircuitDivider, SparkDoodle, Wave } from './Decor';
import { CircuitTraces } from './LabArt';
import { PhotoViewer } from './PhotoViewer';

type VisitorT = (key: keyof (typeof visitorMessages)['en'] & string, vars?: Record<string, string | number>) => string;

const KIND_ICON: Record<TimelineKind, React.FC<{ className?: string }>> = {
  competition: Trophy,
  workshop: Wrench,
  ceremony: Award,
  team: Users
};
const KIND_LABEL = { competition: 'kindCompetition', workshop: 'kindWorkshop', ceremony: 'kindCeremony', team: 'kindTeam' } as const;

/**
 * Grid spans so the albums of a year fill the grid without holes or very wide strips: the first
 * album is big (2×2), the one beside it gets taller and the last one wider when a row would
 * otherwise stay incomplete. Two columns on phones, three from `sm`.
 */
function spanClass(i: number, n: number) {
  if (i === 0) return n === 1 ? 'col-span-2 row-span-2 sm:col-span-3' : 'col-span-2 row-span-2';
  const rest = n - 1;
  const last = i === n - 1;
  // Phones: albums go two by two under the big one, an odd last one takes the whole row
  const phone = last && rest % 2 === 1 ? 'col-span-2' : '';
  // Three columns: two albums beside the big one, then rows of three
  const tall = i === 1 && (rest === 1 || rest % 3 === 0);
  const wide = last && rest > 1 && (rest % 3 === 0 || (rest - 2) % 3 === 2);
  return [phone, tall && 'sm:row-span-2', wide ? 'sm:col-span-2' : phone && 'sm:col-span-1'].filter(Boolean).join(' ');
}

/** Landing page: the club's photos year by year, from public/photos/timeline (see src/data/timeline.ts) */
export const TimelineSection: React.FC<{ t: VisitorT; onEnterMuseum?: () => void }> = ({ t, onEnterMuseum }) => {
  const { lang, dir } = useLanguage();
  // The albums with the changes made in Admin → Landing page
  const TIMELINE = useTimeline();
  const rtl = dir === 'rtl';
  const reduceMotion = useReducedMotion();
  const [yearIdx, setYearIdx] = useState(TIMELINE.length - 1);
  const [viewer, setViewer] = useState<{ year: number; event: TimelineEvent; index: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  const current = TIMELINE[yearIdx];
  const totals = {
    years: TIMELINE.length,
    events: TIMELINE.reduce((n, y) => n + y.events.length, 0),
    photos: TIMELINE.reduce((n, y) => n + y.photoCount, 0)
  };

  // Keep the chosen year in the middle of the rail (it scrolls sideways on phones)
  useEffect(() => {
    const rail = railRef.current;
    const tab = rail?.querySelector<HTMLElement>(`[data-year="${current?.year}"]`);
    if (!rail || !tab) return;
    const fromLeft = tab.offsetLeft - (rail.clientWidth - tab.clientWidth) / 2;
    rail.scrollTo({
      left: rtl ? fromLeft - (rail.scrollWidth - rail.clientWidth) : fromLeft,
      behavior: firstScroll.current || reduceMotion ? 'auto' : 'smooth'
    });
    firstScroll.current = false;
  }, [yearIdx, rtl, reduceMotion, current?.year]);

  if (!current) return null;

  const choose = (i: number) => setYearIdx(Math.max(0, Math.min(TIMELINE.length - 1, i)));
  const onRailKey = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    let next: number | null = step ? yearIdx + step : e.key === 'Home' ? 0 : e.key === 'End' ? TIMELINE.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    next = Math.max(0, Math.min(TIMELINE.length - 1, next));
    choose(next);
    railRef.current?.querySelector<HTMLElement>(`[data-year="${TIMELINE[next].year}"]`)?.focus();
  };

  const progress = TIMELINE.length > 1 ? yearIdx / (TIMELINE.length - 1) : 0;
  const yearBtn =
    'grid place-items-center w-10 h-10 rounded-full bg-white border border-line text-heading/70 hover:text-brand hover:border-brand/40 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors';

  return (
    <section id="journey" className="relative bg-cream text-heading overflow-hidden scroll-mt-16" aria-labelledby="journey-title">
      {/* wavy top edge */}
      <Wave flip className="relative z-10 text-paper" />
      <div className="absolute inset-0 paper-dots opacity-50" aria-hidden="true" />
      <CircuitTraces className="opacity-70" />
      <div className="absolute -top-24 end-0 w-[420px] h-[420px] rounded-full bg-[#ffd9e1]/60 blur-[110px] pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-10 -start-32 w-[460px] h-[460px] rounded-full bg-pastel-sun blur-[110px] pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pb-20 space-y-10">
        <Reveal className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-end">
          <div className="lg:col-span-7 space-y-3">
            <p className="font-hand text-2xl sm:text-[1.75rem] leading-none text-brand flex items-center gap-2">
              <SparkDoodle className="w-3 h-3 opacity-70" />
              {t('timelineEyebrow')}
            </p>
            <h2 id="journey-title" className="font-display text-[2.1rem] sm:text-5xl font-semibold tracking-tight leading-[1.08]">
              {t('timelineTitle')}
            </h2>
            <CircuitDivider center={false} />
            <p className="text-[15px] text-muted leading-relaxed max-w-xl">{t('timelineText', { first: TIMELINE[0].year })}</p>
            {/* The two ways to visit, side by side: the albums below (this view) or the 3D museum (full screen) */}
            {onEnterMuseum && (
              <div className="pt-2 space-y-2">
                <p className="font-hand text-xl text-heading/70 leading-none">{t('timelineViews')}</p>
                <div role="group" aria-label={t('timelineViews')} className="inline-flex flex-wrap gap-1 p-1.5 rounded-full bg-white soft-shadow">
                  <span aria-current="true" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-brand text-white text-sm font-bold">
                    <Images className="w-4 h-4" />
                    {t('timelineViewAlbums')}
                  </span>
                  <button
                    type="button"
                    onClick={onEnterMuseum}
                    title={t('timelineView3dHint')}
                    className="group inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-bold text-heading hover:bg-wash hover:text-brand focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer transition-colors"
                  >
                    <Landmark className="w-4 h-4 text-gold" />
                    {t('timelineView3d')}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </button>
                </div>
                <p className="text-xs text-muted">{t('timelineView3dHint')}</p>
              </div>
            )}
          </div>
          <dl className="lg:col-span-5 grid grid-cols-3 gap-3">
            {[
              { v: totals.years, l: t('timelineYears') },
              { v: totals.events, l: t('timelineAlbums') },
              { v: totals.photos, l: t('timelinePhotos') }
            ].map((s) => (
              <div key={s.l} className="rounded-3xl bg-white soft-shadow px-4 py-4 text-center">
                <dd className="font-display text-3xl sm:text-4xl font-semibold text-brand">{s.v}</dd>
                <dt className="text-xs font-semibold text-muted">{s.l}</dt>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* YEAR RAIL: a lit trace runs up to the chosen year */}
        <Reveal y={20}>
          <div
            ref={railRef}
            role="tablist"
            aria-label={t('timelineChooseYear')}
            onKeyDown={onRailKey}
            className="relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            <div className="relative flex justify-between gap-2 min-w-[560px] sm:min-w-0 py-2">
              <div className="absolute top-[22px] start-8 end-8 h-0.5 border-t-2 border-dashed border-brand/25" aria-hidden="true" />
              <div
                className="absolute top-[22px] start-8 h-0.5 rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-brand to-[#e05c75] transition-[width] duration-500 ease-out"
                style={{ width: `calc((100% - 4rem) * ${progress})` }}
                aria-hidden="true"
              />
              {TIMELINE.map((y, i) => {
                const active = i === yearIdx;
                const passed = i < yearIdx;
                return (
                  <button
                    key={y.year}
                    type="button"
                    role="tab"
                    id={`journey-tab-${y.year}`}
                    data-year={y.year}
                    aria-selected={active}
                    aria-controls="journey-panel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => choose(i)}
                    className="group relative z-10 w-16 shrink-0 flex flex-col items-center gap-2 pt-2 pb-1 rounded-xl cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-500"
                  >
                    <span
                      className={`block rounded-full border-2 transition-all duration-300 ${
                        active
                          ? 'w-5 h-5 bg-brand border-white shadow-[0_0_0_6px_rgba(193,30,61,0.18)]'
                          : passed
                            ? 'w-3.5 h-3.5 mt-[3px] bg-brand/80 border-brand/80'
                            : 'w-3.5 h-3.5 mt-[3px] bg-white border-brand/30 group-hover:border-brand/70'
                      }`}
                    />
                    <span
                      className={`font-display font-semibold transition-all duration-300 ${
                        active ? 'text-xl text-heading' : 'text-base text-muted group-hover:text-heading'
                      }`}
                    >
                      {y.year}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* THE CHOSEN YEAR */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.year}
            id="journey-panel"
            role="tabpanel"
            aria-labelledby={`journey-tab-${current.year}`}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
          >
            <aside className="lg:col-span-3 flex flex-row lg:flex-col items-end lg:items-start justify-between lg:justify-start gap-4 lg:gap-6">
              <div className="space-y-2 min-w-0">
                <div
                  className="font-display text-6xl sm:text-7xl xl:text-8xl font-semibold tracking-tight leading-none text-transparent [-webkit-text-stroke:2px_#c11e3d]"
                  aria-hidden="true"
                >
                  {current.year}
                </div>
                {current.tagline && <p className="font-display text-lg sm:text-xl font-semibold text-heading leading-snug">{current.tagline[lang]}</p>}
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <Images className="w-3.5 h-3.5 text-brand" />
                  {t('timelineYearCount', { albums: current.events.length, photos: current.photoCount })}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => choose(yearIdx - 1)} disabled={yearIdx === 0} aria-label={t('timelinePrevYear')} className={yearBtn}>
                  <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => choose(yearIdx + 1)}
                  disabled={yearIdx === TIMELINE.length - 1}
                  aria-label={t('timelineNextYear')}
                  className={yearBtn}
                >
                  <ChevronRight className="w-5 h-5 rtl:rotate-180" />
                </button>
              </div>
            </aside>

            <ul className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 auto-rows-[150px] sm:auto-rows-[170px] lg:auto-rows-[190px] gap-3 sm:gap-4">
              {current.events.map((ev, i) => {
                const big = i === 0;
                const Icon = KIND_ICON[ev.kind];
                const cover = ev.cover;
                return (
                  <motion.li
                    key={ev.id}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.05 }}
                    className={spanClass(i, current.events.length)}
                  >
                    <button
                      type="button"
                      onClick={() => setViewer({ year: current.year, event: ev, index: ev.photos.indexOf(cover) })}
                      aria-label={t('timelineOpenAlbum', { title: ev.title[lang], n: ev.photos.length })}
                      className="group relative block w-full h-full overflow-hidden rounded-[22px] bg-wash border-4 border-white soft-shadow text-start text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <img
                        src={cover.thumb}
                        srcSet={cover.w > 480 ? `${cover.thumb} 480w, ${cover.src} ${cover.w}w` : undefined}
                        sizes={big ? '(min-width: 1024px) 560px, 100vw' : '(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw'}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={cover.w}
                        height={cover.h}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2b1a20]/90 via-[#2b1a20]/20 to-transparent" />
                      <div className="absolute top-2.5 inset-x-2.5 flex items-start justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-[10px] font-black uppercase tracking-wide text-white/90"
                          title={t(KIND_LABEL[ev.kind])}
                        >
                          <Icon className="w-3 h-3 text-sky-400" />
                          {big && <span>{t(KIND_LABEL[ev.kind])}</span>}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-[11px] font-black font-mono text-white/90">
                          <Images className="w-3 h-3" />
                          {ev.photos.length}
                        </span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 space-y-1.5">
                        {ev.result && (
                          <span className="inline-flex max-w-full items-start gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[10px] sm:text-[11px] font-black leading-tight">
                            <Trophy className="w-3 h-3 shrink-0 mt-px" />
                            <span className="line-clamp-2">{ev.result[lang]}</span>
                          </span>
                        )}
                        <h3 className={`font-display font-semibold leading-tight line-clamp-2 ${big ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'}`}>
                          {ev.place && <span className="me-1.5">{ev.place}</span>}
                          {ev.title[lang]}
                        </h3>
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* wavy bottom edge */}
      <Wave className="relative text-paper" />

      <AnimatePresence>
        {viewer && (
          <PhotoViewer
            key={viewer.event.id}
            title={viewer.event.title[lang]}
            subtitle={[String(viewer.year), viewer.event.result?.[lang]].filter(Boolean).join(' · ')}
            photos={viewer.event.photos}
            index={viewer.index}
            onIndex={(index) => setViewer((v) => (v ? { ...v, index } : v))}
            onClose={() => setViewer(null)}
            labels={{
              close: t('close'),
              prev: t('viewerPrev'),
              next: t('viewerNext'),
              count: (i, n) => t('viewerCount', { i, n })
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
