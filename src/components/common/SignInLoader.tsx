import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CLUB_PHOTOS } from '../../data/initialData';
import { useT } from '../../i18n';
import { authMessages } from '../../i18n/messages/auth';

const STEP_KEYS = ['loaderStep1', 'loaderStep2', 'loaderStep3'] as const;

/** Full-screen overlay while a sign-in or registration is running: club logo powering up inside spinning rings. */
export const SignInLoader: React.FC<{ title?: string }> = ({ title }) => {
  const t = useT(authMessages);
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  // Walk through the steps, then stay on the last one until the portal opens
  useEffect(() => {
    if (step >= STEP_KEYS.length - 1) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 1100);
    return () => clearTimeout(timer);
  }, [step]);

  const spin = (duration: number, reverse = false) =>
    reduceMotion ? {} : { animate: { rotate: reverse ? -360 : 360 }, transition: { duration, repeat: Infinity, ease: 'linear' as const } };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md px-4"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 0.9, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col items-center text-center gap-7"
      >
        {/* Logo inside rotating rings */}
        <div className="relative w-44 h-44">
          {/* soft pulsing glow */}
          <motion.div
            className="absolute inset-4 rounded-full bg-[#c11e3d]/25 blur-2xl"
            animate={reduceMotion ? {} : { scale: [0.85, 1.15, 0.85], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* outer dashed ring */}
          <motion.svg viewBox="0 0 176 176" className="absolute inset-0" {...spin(9)}>
            <circle cx="88" cy="88" r="84" fill="none" stroke="#c11e3d" strokeWidth="3" strokeDasharray="10 9" strokeLinecap="round" />
          </motion.svg>
          {/* gold arc */}
          <motion.svg viewBox="0 0 176 176" className="absolute inset-0" {...spin(1.6)}>
            <circle cx="88" cy="88" r="72" fill="none" stroke="#c9a227" strokeWidth="6" strokeDasharray="120 400" strokeLinecap="round" />
          </motion.svg>
          {/* inner dark arc, opposite direction */}
          <motion.svg viewBox="0 0 176 176" className="absolute inset-0" {...spin(2.4, true)}>
            <circle cx="88" cy="88" r="62" fill="none" stroke="#191919" strokeWidth="3" strokeDasharray="60 330" strokeLinecap="round" />
          </motion.svg>
          {/* orbiting sparks */}
          {!reduceMotion &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: -i }}
              >
                <span
                  className="absolute left-1/2 -top-1 -ml-1.5 w-3 h-3 rounded-full shadow-md"
                  style={{ background: ['#c11e3d', '#c9a227', '#6a0d1f'][i] }}
                />
              </motion.div>
            ))}
          {/* logo */}
          <motion.div
            className="absolute inset-[30px] rounded-full overflow-hidden bg-white border-4 border-white shadow-xl"
            animate={reduceMotion ? {} : { scale: [1, 1.06, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src={CLUB_PHOTOS.clubAvatar} alt="" className="w-full h-full object-cover" />
          </motion.div>
        </div>

        <div className="space-y-2 min-h-[64px]">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{title || t('loaderTitle')}</h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-sm font-bold text-slate-500"
            >
              {t(STEP_KEYS[step])}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* step dots */}
        <div className="flex items-center gap-2">
          {STEP_KEYS.map((key, i) => (
            <motion.span
              key={key}
              className="h-2 rounded-full"
              animate={{ width: i === step ? 28 : 8, backgroundColor: i <= step ? '#c11e3d' : '#e2e8f0' }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
