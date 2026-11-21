import React, { useId } from 'react';
import { BoltDoodle, ChipDoodle, CodeDoodle, LedDoodle, ResistorDoodle } from './LabArt';

/**
 * The public site's visual vocabulary: an engineer's notebook with doodles.
 * Section titles (handwritten kicker, serif title, gear divider), stickers, a rotating badge,
 * the word ribbon, wavy section edges and floating doodles. Purely decorative parts are aria-hidden.
 */

/** A small gear, drawn as an outline */
export const GearDoodle: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M10.3 2.5h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9-2.6-.5v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

/** A four-point spark */
export const SparkDoodle: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 0c.7 6.6 4.9 10.8 12 12-7.1 1.2-11.3 5.4-12 12-.7-6.6-4.9-10.8-12-12C7.1 10.8 11.3 6.6 12 0z" />
  </svg>
);

/** Hand-drawn underline */
export const Squiggle: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 200 16" fill="none" preserveAspectRatio="none" className={className} aria-hidden="true">
    <path d="M3 11c22-7 40-7 58-2s34 6 56 0 40-7 54-3 17 4 26 3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

/** Handwritten kicker, serif title and a little gear divider: every section of the page starts like this */
export const SectionTitle: React.FC<{
  kicker?: string;
  title: string;
  text?: string;
  id?: string;
  align?: 'center' | 'start';
  light?: boolean;
  className?: string;
}> = ({ kicker, title, text, id, align = 'center', light = false, className = '' }) => {
  const center = align === 'center';
  return (
    <div className={`${center ? 'text-center mx-auto' : 'text-start'} max-w-2xl space-y-3 ${className}`}>
      {kicker && (
        <p className={`font-hand text-2xl sm:text-[1.75rem] leading-none flex items-center gap-2 ${center ? 'justify-center' : ''} ${light ? 'text-white/90' : 'text-brand'}`}>
          <SparkDoodle className="w-3 h-3 opacity-70" />
          {kicker}
          <SparkDoodle className="w-3 h-3 opacity-70" />
        </p>
      )}
      <h2 id={id} className={`font-display text-[2.1rem] sm:text-5xl font-semibold tracking-tight leading-[1.08] ${light ? 'text-white' : 'text-heading'}`}>
        {title}
      </h2>
      <CircuitDivider light={light} center={center} />
      {text && <p className={`text-[15px] leading-relaxed ${light ? 'text-white/80' : 'text-muted'}`}>{text}</p>}
    </div>
  );
};

/** A short printed-circuit trace with a pad at each end and a gear in the middle */
export const CircuitDivider: React.FC<{ light?: boolean; center?: boolean }> = ({ light = false, center = true }) => (
  <div className={`flex items-center ${center ? 'justify-center' : ''} ${light ? 'text-white/70' : 'text-brand/60'}`} aria-hidden="true">
    <span className="w-2.5 h-2.5 rounded-full border-2 border-current" />
    <span className="h-0.5 w-10 bg-current opacity-60" />
    <span className="h-0.5 w-3 bg-current opacity-60 translate-y-[-3px] rotate-[-35deg]" />
    <GearDoodle className="mx-1.5 w-5 h-5 anim-spin-slow" />
    <span className="h-0.5 w-3 bg-current opacity-60 translate-y-[-3px] rotate-[35deg]" />
    <span className="h-0.5 w-10 bg-current opacity-60" />
    <span className="w-2.5 h-2.5 rounded-full border-2 border-current" />
  </div>
);

/** A dashed sticker, like the labels on a lab drawer */
export const Sticker: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border-2 border-dashed border-brand/35 bg-white/90 px-4 py-1.5 text-[13px] font-bold text-brand shadow-sm ${className}`}
  >
    {children}
  </span>
);

/** The club logo inside a slowly turning ring of words */
export const RotatingBadge: React.FC<{ text: string; logo: string; logoAlt: string; className?: string }> = ({ text, logo, logoAlt, className = '' }) => {
  const id = useId().replace(/:/g, '');
  // Arabic letters must stay joined: no letter spacing, and the path is read left to right (the text still shapes right to left)
  const arabic = /[\u0600-\u06ff]/.test(text);
  return (
    <div className={`relative grid place-items-center rounded-full bg-white soft-shadow ${className}`}>
      <svg viewBox="0 0 120 120" style={{ direction: 'ltr' }} className="absolute inset-0 w-full h-full anim-spin-slow" aria-hidden="true">
        <defs>
          <path id={`ring-${id}`} d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" />
        </defs>
        <text className="fill-brand" style={arabic ? { fontSize: 11, fontWeight: 700 } : { fontSize: 9.5, fontWeight: 700, letterSpacing: 2.2 }}>
          <textPath href={`#ring-${id}`}>{text}</textPath>
        </text>
      </svg>
      <span className="absolute inset-[22%] rounded-full border-2 border-dashed border-brand/30" aria-hidden="true" />
      <img src={logo} alt={logoAlt} className="relative w-[46%] h-[46%] object-contain" />
    </div>
  );
};

/** Two tilted bands of words gliding by (decorative: the words are also said elsewhere) */
export const Ribbon: React.FC<{ words: string[] }> = ({ words }) => {
  const row = (light: boolean) => (
    <div className="flex w-max anim-ribbon">
      {[0, 1].map((copy) => (
        <div key={copy} className="flex shrink-0 items-center">
          {words.map((w, i) => (
            <span key={`${copy}-${i}`} className="flex items-center">
              <span className={`font-display italic text-2xl sm:text-[1.9rem] px-6 sm:px-8 whitespace-nowrap ${light ? 'text-brand/80' : 'text-white'}`}>{w}</span>
              {(() => {
                const Part = [GearDoodle, ChipDoodle, CodeDoodle, BoltDoodle][i % 4];
                return <Part className={`w-6 h-6 ${light ? 'text-brand/45' : 'text-[#ffd27a]'}`} />;
              })()}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
  return (
    <div className="relative h-[120px] sm:h-[140px] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-[-5%] top-4 sm:top-5 rotate-[1.8deg] bg-wash border-y-2 border-dashed border-brand/25 py-2.5">{row(true)}</div>
      <div className="absolute inset-x-[-5%] top-[46px] sm:top-[54px] -rotate-[2.2deg] bg-gradient-to-r from-[#d42a4b] via-brand to-[#a1172f] py-3 shadow-[0_18px_30px_-18px_rgba(193,30,61,0.7)]">
        {row(false)}
      </div>
    </div>
  );
};

/** A soft wavy edge between two sections: `color` is the colour of the section it belongs to */
export const Wave: React.FC<{ className?: string; flip?: boolean }> = ({ className = '', flip = false }) => (
  <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className={`block w-full h-8 sm:h-12 ${flip ? 'rotate-180' : ''} ${className}`} aria-hidden="true">
    <path d="M0 48V24c60-16 120-24 180-16s120 22 180 22 120-14 180-22 120 0 180 10 120 18 180 16 120-12 180-18 120-4 180 4 120 18 180 18V48z" fill="currentColor" />
  </svg>
);

/** Gears and sparks drifting along the edges of a section (behind its content, away from the text) */
export const FloatingDoodles: React.FC<{ light?: boolean }> = ({ light = false }) => {
  const c = light ? 'text-white/40' : 'text-brand/25';
  const s = light ? 'text-[#ffd27a]' : 'text-gold';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden hidden sm:block" aria-hidden="true">
      <GearDoodle className={`absolute top-[5%] start-[1.5%] w-9 h-9 ${c} anim-float`} />
      <ChipDoodle className={`absolute bottom-[7%] start-[2.5%] w-8 h-8 ${c} anim-float [animation-delay:-3s]`} />
      <CodeDoodle className={`absolute top-[6%] end-[2%] w-7 h-7 ${c} anim-float [animation-delay:-1.5s]`} />
      <LedDoodle className={`absolute top-[44%] start-[1%] w-7 h-7 ${c} anim-float [animation-delay:-4s]`} />
      <ResistorDoodle className={`absolute bottom-[10%] end-[2.5%] w-10 h-5 ${c} anim-float [animation-delay:-2s]`} />
      <BoltDoodle className={`absolute top-[55%] end-[1.5%] w-6 h-6 ${c} anim-float [animation-delay:-5s]`} />
      <SparkDoodle className={`absolute top-[28%] end-[5%] w-3.5 h-3.5 ${s} anim-twinkle`} />
    </div>
  );
};
