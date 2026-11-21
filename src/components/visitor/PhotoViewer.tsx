import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';
import { useLanguage } from '../../i18n';

export interface ViewerPhoto {
  src: string;
  thumb: string;
  w: number;
  h: number;
}

interface Props {
  title: string;
  subtitle?: string;
  photos: ViewerPhoto[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  labels: { close: string; prev: string; next: string; count: (i: number, n: number) => string };
}

/**
 * Full-screen album viewer: arrows, keyboard (← → Esc), swipe, and a strip of thumbnails.
 * The thumbnail is the background of the big photo, so something shows while the photo loads.
 */
export const PhotoViewer: React.FC<Props> = ({ title, subtitle, photos, index, onIndex, onClose, labels }) => {
  const { dir } = useLanguage();
  const rtl = dir === 'rtl';
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const swipeX = useRef<number | null>(null);
  const swiped = useRef(false);
  const n = photos.length;
  const photo = photos[index];
  const go = (step: number) => onIndex((index + step + n) % n);

  // Body scroll lock, focus on open and back on the album card when closed
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      before?.focus?.();
    };
  }, []);

  // Keyboard: arrows follow the reading direction, Tab stays inside the viewer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(rtl ? -1 : 1);
      else if (e.key === 'ArrowLeft') go(rtl ? 1 : -1);
      else if (e.key === 'Tab' && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>('button:not([tabindex="-1"])');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Load the neighbours ahead, and keep the current thumbnail in view in the strip
  useEffect(() => {
    if (n > 1) [photos[(index + 1) % n], photos[(index - 1 + n) % n]].forEach((p) => (new Image().src = p.src));
    const strip = stripRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-i="${index}"]`);
    if (strip && thumb) {
      const fromLeft = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
      // In right-to-left, scrollLeft runs from 0 (right edge) to negative values
      strip.scrollTo({ left: rtl ? fromLeft - (strip.scrollWidth - strip.clientWidth) : fromLeft, behavior: 'smooth' });
    }
  }, [index, photos, n, rtl]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') swipeX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (swipeX.current === null) return;
    const dx = e.clientX - swipeX.current;
    swipeX.current = null;
    swiped.current = Math.abs(dx) > 50;
    if (swiped.current) go((dx < 0 ? 1 : -1) * (rtl ? -1 : 1));
  };
  // A tap on the dark area around the photo closes the viewer, a swipe does not
  const onStageClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !swiped.current) onClose();
    swiped.current = false;
  };

  const arrow =
    'absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer transition-colors';

  return (
    <ModalPortal>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex flex-col bg-[#0b0b0b]/95 backdrop-blur-sm text-white"
      >
        <header className="flex items-start gap-3 px-4 sm:px-6 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            {subtitle && <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-400">{subtitle}</p>}
            <h2 className="text-base sm:text-lg font-black leading-tight truncate">{title}</h2>
          </div>
          <span className="shrink-0 pt-1 font-mono text-sm font-bold text-white/70" dir="ltr" aria-live="polite">
            <span className="sr-only">{labels.count(index + 1, n)}</span>
            <span aria-hidden="true">
              {index + 1} / {n}
            </span>
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div
          className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-20 touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeX.current = null)}
          onClick={onStageClick}
        >
          <motion.img
            key={photo.src}
            src={photo.src}
            alt=""
            width={photo.w}
            height={photo.h}
            draggable={false}
            initial={{ opacity: 0.4, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            style={{ backgroundImage: `url("${photo.thumb}")`, backgroundSize: 'cover' }}
            className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
          />
          {n > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label={labels.prev} className={`${arrow} start-2 sm:start-5`}>
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label={labels.next} className={`${arrow} end-2 sm:end-5`}>
                <ChevronRight className="w-6 h-6 rtl:rotate-180" />
              </button>
            </>
          )}
        </div>

        {n > 1 && (
          <div ref={stripRef} className="relative flex gap-2 overflow-x-auto px-4 sm:px-6 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.map((p, i) => (
              <button
                key={p.src}
                type="button"
                data-i={i}
                tabIndex={-1}
                onClick={() => onIndex(i)}
                aria-label={labels.count(i + 1, n)}
                aria-current={i === index || undefined}
                className={`relative shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden cursor-pointer transition-all ${
                  i === index ? 'ring-2 ring-sky-500 opacity-100' : 'opacity-45 hover:opacity-80'
                }`}
              >
                <img src={p.thumb} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </ModalPortal>
  );
};
