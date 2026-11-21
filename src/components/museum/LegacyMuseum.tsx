import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Hand,
  Images,
  Minus,
  MousePointerClick,
  Move,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trophy,
  UserPlus,
  X,
  ZoomIn
} from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';
import { PhotoViewer } from '../visitor/PhotoViewer';
import { useTimeline } from '../visitor/useTimeline';
import { useLandingT } from '../common/siteHooks';
import { CLUB_PHOTOS } from '../../data/initialData';
import { useApp } from '../../context/AppContext';
import { useLanguage, useT } from '../../i18n';
import { museumMessages } from '../../i18n/messages/museum';
import { visitorMessages } from '../../i18n/messages/visitor';
import { createMuseum, type MuseumAlbum, type MuseumApi, type MuseumRoom, type MuseumStop } from './museumScene';
import { rememberReturn } from './returnTo';

const KIND_LABEL = { competition: 'kindCompetition', workshop: 'kindWorkshop', ceremony: 'kindCeremony', team: 'kindTeam' } as const;

/** #/museum: the club's photo timeline as a 3D gallery hall, full screen */
const LegacyMuseum: React.FC = () => {
  const { navigateTo } = useApp();
  const { lang, dir } = useLanguage();
  const t = useT(museumMessages);
  const tv = useLandingT();
  const TIMELINE = useTimeline();
  const reduceMotion = !!useReducedMotion();
  const coarse = useMemo(() => window.matchMedia?.('(pointer: coarse)').matches ?? false, []);

  const holderRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<MuseumApi | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef('museum');

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [room, setRoom] = useState(-1);
  const [stop, setStop] = useState<MuseumStop | null>(null);
  const [touring, setTouring] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [hint, setHint] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [viewer, setViewer] = useState<{ album: MuseumAlbum; index: number } | null>(null);

  const first = TIMELINE[0]?.year ?? new Date().getFullYear();
  const last = TIMELINE[TIMELINE.length - 1]?.year ?? first;

  const rooms: MuseumRoom[] = useMemo(
    () =>
      TIMELINE.map((y, r) => ({
        year: y.year,
        tagline: y.tagline?.[lang] || '',
        albums: y.events.map((ev) => ({
          id: ev.id,
          year: y.year,
          room: r,
          title: ev.title[lang],
          result: ev.result?.[lang],
          kind: tv(KIND_LABEL[ev.kind]),
          cover: ev.cover,
          photos: ev.photos
        }))
      })),
    [lang, TIMELINE]
  );

  const leave = (to: 'museum' | 'journey' = 'museum') => {
    returnTo.current = to;
    navigateTo('home');
  };
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  // Tab title, no page scroll behind, and back to the right section of the home page afterwards
  useEffect(() => {
    const title = document.title;
    document.title = t('pageTitle');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.title = title;
      document.body.style.overflow = overflow;
      if (returnTo.current) rememberReturn(returnTo.current);
    };
  }, []);

  // The 3D scene (rebuilt when the language changes, for the labels)
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    let museum: MuseumApi | null = null;
    let cancelled = false;
    setReady(false);
    setProgress(0);
    setStop(null);
    setZoom(1);
    const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const start = () => {
      if (cancelled) return;
      try {
        museum = createMuseum(holder, {
          rooms,
          rtl: dir === 'rtl',
          font,
          logo: CLUB_PHOTOS.clubLogo,
          reducedMotion: reduceMotion,
          texts: {
            entranceTitle: t('entranceTitle'),
            entranceSub: t('entranceSub', { first, last }),
            endTitle: t('endWallTitle'),
            endSub: t('endWallSub', { next: last + 1 }),
            photos: (n) => (n === 1 ? t('onePhoto') : t('photos', { n }))
          },
          on: {
            progress: (loaded, total) => setProgress(total ? loaded / total : 1),
            ready: () => setReady(true),
            room: setRoom,
            stop: setStop,
            along: (p) => {
              if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
            },
            end: setAtEnd,
            tour: setTouring,
            zoom: setZoom,
            interact: () => setHint(false),
            exit: () => leaveRef.current(),
            openAlbum: (album) => setViewer({ album, index: Math.max(0, album.photos.indexOf(album.cover)) })
          }
        });
        apiRef.current = museum;
      } catch (err) {
        console.error('3D museum', err);
        setFailed(true);
      }
    };
    // The labels are drawn with the site's fonts: wait for them, but not forever
    const fonts = document.fonts
      ? Promise.all([600, 800, 900].map((w) => document.fonts.load(`${w} 40px ${font}`, 'Aa 2026 عربي')))
      : Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))])
      .catch(() => undefined)
      .then(start);
    return () => {
      cancelled = true;
      museum?.dispose();
      apiRef.current = null;
    };
  }, [lang]);

  // The album viewer takes the keyboard while it is open
  useEffect(() => {
    apiRef.current?.setPaused(!!viewer);
  }, [viewer]);

  // The how-to hint goes away by itself
  useEffect(() => {
    if (!ready || !hint) return;
    const timer = setTimeout(() => setHint(false), 9000);
    return () => clearTimeout(timer);
  }, [ready, hint]);

  const api = () => apiRef.current;
  const album = stop?.kind === 'album' ? stop.album : null;
  const showEnd = (stop?.kind === 'end' || (atEnd && !stop)) && !touring;
  const current = room >= 0 ? rooms[room] : null;
  const glass = 'bg-black/45 backdrop-blur-xl border border-white/10';
  const roundBtn = `grid place-items-center w-10 h-10 rounded-full ${glass} text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer transition-colors`;
  const sideBtn = `absolute top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 sm:w-14 sm:h-14 rounded-full ${glass} text-white/90 hover:text-white hover:bg-white/15 hover:scale-105 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer transition-all`;
  const zoomBtn = 'grid place-items-center w-10 h-10 text-white/90 hover:text-white hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer disabled:cursor-default transition-colors';
  const zoomed = zoom > 1.01;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] bg-[#0b0b0d] text-white select-none overflow-hidden" dir={dir}>
        <div ref={holderRef} className="absolute inset-0" role="img" aria-label={t('canvasLabel', { first, last })} />
        {/* lens vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6))]" />

        {/* TOP: where you are, guided tour, exit (above the opening screen, so leaving works while it loads) */}
        <div className="pointer-events-none absolute z-20 top-0 inset-x-0 flex items-start justify-between gap-3 p-3 sm:p-5 bg-gradient-to-b from-black/70 via-black/25 to-transparent">
          <div className={`flex items-center gap-3 min-w-0 ${ready ? '' : 'invisible'}`}>
            <img src={CLUB_PHOTOS.clubLogo} alt="" className="w-10 h-10 shrink-0 rounded-full bg-white object-contain ring-2 ring-[#d9b45a]/70" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#e9c46a]">{t('name')}</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={room}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm sm:text-base font-black truncate"
                >
                  {current ? (
                    <>
                      <span className="font-mono">{current.year}</span>
                      {current.tagline && <span className="text-white/70 font-bold"> · {current.tagline}</span>}
                    </>
                  ) : (
                    t('entrance')
                  )}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-2 shrink-0">
            {ready && (
              <button
                type="button"
                onClick={() => api()?.setTour(!touring)}
                aria-pressed={touring}
                className={`h-10 px-3 sm:px-4 rounded-full ${glass} text-xs font-black flex items-center gap-2 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer transition-colors ${touring ? 'ring-1 ring-[#e9c46a]/70' : ''}`}
              >
                {touring ? <Pause className="w-4 h-4 text-[#e9c46a]" /> : <Play className="w-4 h-4 text-[#e9c46a]" />}
                <span className="hidden sm:inline">{touring ? t('stopTour') : t('tour')}</span>
              </button>
            )}
            <button type="button" onClick={() => leave()} aria-label={t('exit')} title={t('exit')} className={roundBtn}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PICTURE YOU ARE LOOKING AT */}
        <AnimatePresence>
          {album && !viewer && (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute inset-x-3 bottom-[5.5rem] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-28 sm:w-[540px] rounded-3xl ${glass} p-4 sm:p-5 shadow-2xl`}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-400">
                <span className="font-mono">{album.year}</span> · {album.kind}
              </p>
              <h2 className="mt-1 text-lg sm:text-2xl font-black leading-tight">{album.title}</h2>
              {album.result && (
                <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-900 text-xs font-black">
                  <Trophy className="w-3.5 h-3.5" />
                  {album.result}
                </span>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewer({ album, index: Math.max(0, album.photos.indexOf(album.cover)) })}
                  className="basis-full sm:basis-auto px-4 py-2.5 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Images className="w-4 h-4" />
                  {album.photos.length === 1 ? t('viewPhoto') : t('viewAlbum', { n: album.photos.length })}
                </button>
                <button type="button" onClick={() => api()?.back()} className="px-3 py-2 text-xs font-bold text-white/70 hover:text-white cursor-pointer">
                  {t('back')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* END OF THE HALL */}
        <AnimatePresence>
          {showEnd && !album && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.45, delay: 0.3 }}
              className={`absolute inset-x-3 bottom-[5.5rem] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-28 sm:w-[480px] rounded-3xl ${glass} p-5 text-center shadow-2xl`}
            >
              <h2 className="text-xl sm:text-2xl font-black">{t('endTitle')}</h2>
              <p className="mt-1 text-sm text-white/75 font-medium">{t('endText')}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    returnTo.current = '';
                    navigateTo('register-parent');
                  }}
                  className="px-5 py-3 btn-duo-green text-sm font-black flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('endCta')}
                </button>
                <button
                  type="button"
                  onClick={() => api()?.goToStart()}
                  className={`px-4 py-3 rounded-2xl ${glass} text-sm font-black flex items-center gap-2 hover:bg-white/15 cursor-pointer`}
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('restart')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HOW TO MOVE */}
        <AnimatePresence>
          {ready && hint && !album && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: reduceMotion ? 0 : 2.2, duration: 0.5 }}
              className="pointer-events-none absolute inset-x-3 bottom-[5.5rem] sm:bottom-28 flex flex-wrap justify-center gap-2"
            >
              {[
                ...(coarse
                  ? [
                      { icon: Hand, text: t('hintSwipe') },
                      { icon: ArrowLeftRight, text: t('hintStepTouch') }
                    ]
                  : [
                      { icon: Move, text: t('hintWalk') },
                      { icon: ArrowLeftRight, text: t('hintStep') }
                    ]),
                { icon: MousePointerClick, text: coarse ? t('hintTap') : t('hintClick') },
                ...(coarse ? [] : [{ icon: Hand, text: t('hintLook') }]),
                { icon: ZoomIn, text: coarse ? t('hintZoomTouch') : t('hintZoom') }
              ].map(({ icon: Icon, text }) => (
                <span key={text} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full ${glass} text-xs font-bold text-white/90`}>
                  <Icon className="w-4 h-4 text-[#e9c46a]" />
                  {text}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM: the years, and how far along the hall you are */}
        <nav aria-label={t('yearNav')} className="absolute bottom-0 inset-x-0 px-3 sm:px-6 pb-3 sm:pb-5 pt-12 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="min-w-0">
              <div className="h-1 rounded-full bg-white/12 overflow-hidden">
                <div
                  ref={barRef}
                  className="h-full rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-sky-700 via-sky-500 to-[#e9c46a] origin-left rtl:origin-right"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
              <div className="mt-1.5 grid" style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(0, 1fr))` }}>
                {rooms.map((r, i) => (
                  <button
                    key={r.year}
                    type="button"
                    onClick={() => api()?.goToRoom(i)}
                    aria-current={i === room ? 'step' : undefined}
                    className={`py-1.5 rounded-lg font-mono font-black text-[11px] sm:text-xs cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 ${
                      i === room ? 'text-white' : 'text-white/45 hover:text-white/85'
                    }`}
                  >
                    {r.year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* SIDES: from one stop to the next (like ← →) */}
        {ready && (
          <>
            <button
              type="button"
              onClick={() => api()?.prev()}
              aria-label={t('prev')}
              title={`${t('prev')} (${dir === 'rtl' ? '→' : '←'})`}
              className={`${sideBtn} start-2 sm:start-5`}
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => api()?.next()}
              aria-label={t('next')}
              title={`${t('next')} (${dir === 'rtl' ? '←' : '→'})`}
              className={`${sideBtn} end-2 sm:end-5`}
            >
              <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 rtl:rotate-180" />
            </button>

            {/* ZOOM: under the "next" arrow (also Ctrl + wheel, a pinch, + − and 0) */}
            <div
              role="group"
              aria-label={t('zoomGroup')}
              className={`absolute end-2.5 sm:end-7 top-[calc(50%+2.25rem)] sm:top-[calc(50%+2.75rem)] flex flex-col items-center rounded-full ${glass} overflow-hidden`}
            >
              <button type="button" onClick={() => api()?.zoomIn()} disabled={zoom >= 3.99} aria-label={t('zoomIn')} title={`${t('zoomIn')} (+)`} className={zoomBtn}>
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => api()?.zoomReset()}
                disabled={!zoomed}
                aria-label={t('zoomReset')}
                title={zoomed ? `${t('zoomReset')} (0)` : undefined}
                className={`h-7 w-10 font-mono text-[11px] font-black transition-colors cursor-pointer disabled:cursor-default ${zoomed ? 'text-[#e9c46a] hover:bg-white/15' : 'text-white/55'}`}
                dir="ltr"
              >
                {zoom.toFixed(1)}×
              </button>
              <button type="button" onClick={() => api()?.zoomOut()} disabled={!zoomed} aria-label={t('zoomOut')} title={`${t('zoomOut')} (−)`} className={zoomBtn}>
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        <p className="sr-only" aria-live="polite">
          {album ? `${album.year}, ${album.title}${album.result ? `, ${album.result}` : ''}` : current ? `${current.year}, ${current.tagline}` : ''}
        </p>

        {/* OPENING */}
        <AnimatePresence>
          {!ready && !failed && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.2 : 0.9 }}
              className="absolute inset-0 z-10 grid place-items-center bg-[#0b0b0d]"
              role="status"
            >
              <div className="w-64 text-center space-y-5">
                <motion.img
                  src={CLUB_PHOTOS.clubLogo}
                  alt=""
                  className="mx-auto w-20 h-20 rounded-full bg-white object-contain ring-4 ring-[#d9b45a]/60"
                  animate={reduceMotion ? undefined : { scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#e9c46a]">{t('name')}</p>
                  <p className="mt-1 text-sm font-bold text-white/70">{t('loading')}</p>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-600 to-[#e9c46a] transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <p className="font-mono text-xs text-white/50" dir="ltr">
                  {Math.round(progress * 100)}%
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {failed && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#0b0b0d] p-6 text-center">
            <div className="max-w-sm space-y-4">
              <p className="text-base font-bold text-white/85">{t('noWebgl')}</p>
              <button
                type="button"
                onClick={() => leave('journey')}
                className="px-5 py-3 btn-duo-green text-sm font-black cursor-pointer"
              >
                {t('noWebglLink')}
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {viewer && (
            <PhotoViewer
              key={viewer.album.id}
              title={viewer.album.title}
              subtitle={[String(viewer.album.year), viewer.album.result].filter(Boolean).join(' · ')}
              photos={viewer.album.photos}
              index={viewer.index}
              onIndex={(index) => setViewer((v) => (v ? { ...v, index } : v))}
              onClose={() => setViewer(null)}
              labels={{ close: tv('close'), prev: tv('viewerPrev'), next: tv('viewerNext'), count: (i, n) => tv('viewerCount', { i, n }) }}
            />
          )}
        </AnimatePresence>
      </div>
    </ModalPortal>
  );
};

export default LegacyMuseum;
