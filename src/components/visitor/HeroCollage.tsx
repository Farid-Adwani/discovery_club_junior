import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Photo = { img: string; title: string; tag: string };

/**
 * Hero visual: a big photo of real club moments that changes every few seconds,
 * two tilted photos behind it, the club logo as a badge and a few floating achievement chips.
 */
export const HeroCollage: React.FC<{
  photos: Photo[];
  back: [string, string];
  logo: string;
  logoAlt: string;
  chips: { icon: React.ReactNode; text: string }[];
  delay: number;
}> = ({ photos, back, logo, logoAlt, chips, delay }) => {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % photos.length), 4500);
    return () => clearInterval(id);
  }, [photos.length]);
  const current = photos[i];

  const float = (d: number, amp = 8) =>
    reduce ? {} : { animate: { y: [0, -amp, 0] }, transition: { duration: 5 + d, repeat: Infinity, ease: 'easeInOut' as const, delay: d } };

  return (
    <div className="relative mx-auto w-full max-w-[520px] h-[400px] sm:h-[500px]">
      {/* Glow */}
      <div className="absolute inset-[12%] rounded-full bg-[#c11e3d]/40 blur-[90px] pointer-events-none" />

      {/* Back photos */}
      <motion.div
        initial={{ opacity: 0, x: 40, rotate: 14 }}
        animate={{ opacity: 1, x: 0, rotate: 7 }}
        transition={{ duration: 0.9, delay: delay + 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 end-0 w-[44%] aspect-[4/5]"
      >
        <motion.img
          {...float(0.6)}
          src={back[0]}
          alt=""
          className="w-full h-full object-cover rounded-3xl border-[5px] border-white shadow-2xl"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -40, rotate: -14 }}
        animate={{ opacity: 1, x: 0, rotate: -7 }}
        transition={{ duration: 0.9, delay: delay + 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-2 start-0 w-[42%] aspect-square"
      >
        <motion.img
          {...float(1.4)}
          src={back[1]}
          alt=""
          className="w-full h-full object-cover rounded-3xl border-[5px] border-white shadow-2xl"
        />
      </motion.div>

      {/* Main photo, changing every few seconds */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, delay: delay + 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-[9%] top-[9%] bottom-[11%] rounded-[30px] overflow-hidden bg-[#191919] ring-1 ring-white/20 shadow-[0_40px_90px_-25px_rgba(193,30,61,0.75)]"
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={current.img}
            src={current.img}
            alt={current.title}
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.9 }, scale: { duration: 5, ease: 'linear' } }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-[11px] font-black text-amber-300 tracking-wide">{current.tag}</div>
              <div className="text-lg sm:text-xl font-black text-white leading-tight">{current.title}</div>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-1.5 mt-3">
            {photos.map((p, n) => (
              <button
                key={p.img}
                onClick={() => setI(n)}
                aria-label={p.title}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${n === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Club logo badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: delay + 0.7 }}
        className="absolute top-[2%] start-[3%] w-20 h-20 sm:w-24 sm:h-24"
      >
        <motion.div
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-dashed border-[#ff6b86]/70"
        />
        <div className="absolute inset-1.5 rounded-full bg-white shadow-xl grid place-items-center overflow-hidden">
          <img src={logo} alt={logoAlt} className="w-[86%] h-[86%] object-contain" />
        </div>
      </motion.div>

      {/* Floating achievement chips */}
      {chips.map((c, n) => (
        <motion.div
          key={c.text}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: delay + 0.9 + n * 0.15 }}
          className={`absolute ${
            n === 0 ? 'bottom-[3%] end-[2%]' : n === 1 ? 'top-[40%] -start-2 sm:-start-6' : 'top-[4%] end-[30%]'
          }`}
        >
          <motion.div
            {...float(n * 0.8, 6)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur text-slate-900 text-xs font-black shadow-xl whitespace-nowrap"
          >
            {c.icon}
            {c.text}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
};
