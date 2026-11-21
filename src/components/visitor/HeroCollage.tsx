import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { photoSrcSet } from './photo';
import { RotatingBadge, SparkDoodle } from './Decor';

type Photo = { img: string; title: string; tag: string };

/**
 * Hero visual: club moments taking turns in an arch with a dashed outline, a tilted polaroid,
 * the logo in a turning ring of words, a small "highlight" card and a handwritten note.
 */
export const HeroCollage: React.FC<{
  photos: Photo[];
  polaroid: { img: string; caption: string };
  highlight: { img: string; tag: string; title: string };
  ringText: string;
  note: string;
  logo: string;
  logoAlt: string;
}> = ({ photos, polaroid, highlight, ringText, note, logo, logoAlt }) => {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (photos.length < 2 || reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % photos.length), 5000);
    return () => clearInterval(id);
  }, [photos.length, reduce]);
  const current = photos[i];
  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const }
  });

  return (
    <div className="relative mx-auto w-full max-w-[540px] h-[460px] sm:h-[560px]">
      {/* soft blob behind everything */}
      <div className="absolute inset-x-[6%] top-[8%] bottom-[6%] bg-gradient-to-br from-[#ffd9e1] via-wash to-pastel-sun anim-blob" aria-hidden="true" />

      {/* the arch: dashed outline and the photos */}
      <motion.div {...enter(0.1)} className="absolute inset-x-[15%] top-[3%] bottom-[11%] rounded-t-full border-2 border-dashed border-brand/40" aria-hidden="true" />
      <motion.figure {...enter(0.15)} className="absolute inset-x-[19%] top-[7%] bottom-[15%] m-0 rounded-t-full overflow-hidden border-[6px] border-white bg-wash soft-shadow-lg">
        <AnimatePresence initial={false}>
          <motion.img
            key={current.img}
            src={current.img}
            srcSet={photoSrcSet(current.img)}
            sizes="(min-width: 1024px) 340px, 70vw"
            alt={current.title}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.9 }, scale: { duration: 6, ease: 'linear' } }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#2b1a20]/80 to-transparent" />
        <figcaption className="absolute bottom-0 inset-x-0 p-4 sm:p-5 text-center text-white">
          <AnimatePresence mode="wait">
            <motion.div key={current.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }}>
              <div className="text-[11px] font-bold text-[#ffd27a]">{current.tag}</div>
              <div className="font-display text-lg sm:text-xl font-semibold leading-tight">{current.title}</div>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-1.5 mt-2.5">
            {photos.map((p, n) => (
              <button
                key={p.img}
                type="button"
                onClick={() => setI(n)}
                aria-label={p.title}
                aria-current={n === i || undefined}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${n === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </figcaption>
      </motion.figure>

      {/* tilted polaroid */}
      <motion.div {...enter(0.45)} className="absolute bottom-[3%] start-0 w-[34%] sm:w-[32%]">
        <div className="-rotate-6 bg-white p-2 pb-1 rounded-md soft-shadow-lg">
          <img src={polaroid.img} srcSet={photoSrcSet(polaroid.img)} sizes="180px" alt="" className="w-full aspect-[4/5] object-cover rounded-sm" />
          <p className="font-hand text-base sm:text-xl text-heading text-center leading-tight py-1.5 line-clamp-2">{polaroid.caption}</p>
        </div>
      </motion.div>

      {/* logo in its ring of words */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.6 }}
        className="absolute top-0 end-0 sm:end-[2%]"
      >
        <RotatingBadge text={ringText} logo={logo} logoAlt={logoAlt} className="w-28 h-28 sm:w-32 sm:h-32" />
      </motion.div>

      {/* highlight card */}
      <motion.div {...enter(0.7)} className="absolute bottom-0 end-0 flex items-center gap-2.5 sm:gap-3 rounded-2xl bg-white p-2 sm:p-2.5 pe-3 sm:pe-4 soft-shadow-lg max-w-[66%]">
        <img src={highlight.img} srcSet={photoSrcSet(highlight.img)} sizes="56px" alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0" />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[11px] font-bold text-gold">
            <Trophy className="w-3.5 h-3.5" />
            {highlight.tag}
          </p>
          <p className="font-display text-[13px] sm:text-base font-semibold text-heading leading-tight line-clamp-2">{highlight.title}</p>
        </div>
      </motion.div>

      {/* the robot's program, in a little editor */}
      {/* (placed by the outer box: the code itself always reads left to right) */}
      <motion.div {...enter(0.55)} className="absolute top-[1%] start-0" aria-hidden="true">
        <div className="-rotate-3 rounded-xl bg-white/95 soft-shadow-lg px-3 py-2 font-mono text-[10.5px] sm:text-[11.5px] leading-[1.6] text-heading" dir="ltr">
        <div className="flex gap-1 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#ff6b81]" />
          <span className="w-2 h-2 rounded-full bg-[#ffd27a]" />
          <span className="w-2 h-2 rounded-full bg-[#7bd88f]" />
        </div>
        <div>
          <span className="text-[#2563eb]">robot</span>.forward(<span className="text-[#b45309]">3</span>);
        </div>
        <div>
          <span className="text-[#2563eb]">robot</span>.turnLeft();
        </div>
        <div className="text-[#15803d]">
          // mission complete ✓<span className="inline-block w-[6px] h-[12px] -mb-0.5 ms-0.5 bg-brand led-blink" />
        </div>
        </div>
      </motion.div>

      {/* handwritten note */}
      <motion.p {...enter(0.85)} className="absolute top-[30%] start-0 sm:-start-4 rotate-[-8deg] font-hand text-xl sm:text-2xl text-brand bg-white/85 rounded-full px-3 py-0.5 shadow-sm">
        {note}
      </motion.p>

      <SparkDoodle className="absolute top-[12%] start-[12%] w-5 h-5 text-gold anim-twinkle" />
      <SparkDoodle className="absolute bottom-[30%] end-[4%] w-3.5 h-3.5 text-brand/50 anim-twinkle [animation-delay:-1.4s]" />
    </div>
  );
};
