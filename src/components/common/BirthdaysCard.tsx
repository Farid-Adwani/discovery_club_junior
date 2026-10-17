import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useLanguage, useT } from '../../i18n';
import { birthdayMessages } from '../../i18n/messages/birthdays';
import { BirthdayKind, BirthdayPerson, upcomingBirthdays } from '../../utils/birthdays';
import { fromISODate } from '../../utils/schedule';

const BALLOONS = [
  { color: '#c11e3d', left: '52%', delay: 0, size: 26 },
  { color: '#c9a227', left: '78%', delay: 1.2, size: 22 },
  { color: '#f472b6', left: '90%', delay: 0.6, size: 18 },
  { color: '#38bdf8', left: '62%', delay: 2, size: 16 }
];

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** A balloon drawn in SVG (string included) */
const Balloon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size * 1.9} viewBox="0 0 20 38" aria-hidden="true">
    <ellipse cx="10" cy="10" rx="9" ry="10" fill={color} />
    <ellipse cx="7" cy="6.5" rx="2.2" ry="3" fill="#fff" opacity="0.45" />
    <path d="M8.5 19.5 L11.5 19.5 L10 22 Z" fill={color} />
    <path d="M10 22 C 7 26, 13 29, 10 33 S 9 36, 10 38" stroke="#94a3b8" strokeWidth="0.8" fill="none" />
  </svg>
);

const KIND_STYLE: Record<BirthdayKind, string> = {
  student: 'bg-sky-100 text-sky-800',
  coach: 'bg-emerald-100 text-emerald-800',
  admin: 'bg-amber-100 text-amber-800',
  worker: 'bg-purple-100 text-purple-800'
};

/** "Birthdays this week": students and team members celebrating in the next 7 days, today's in a big banner. */
export const BirthdaysCard: React.FC<{ people: BirthdayPerson[]; onManage?: () => void }> = ({ people, onManage }) => {
  const t = useT(birthdayMessages);
  const { locale } = useLanguage();
  const reduceMotion = useReducedMotion();
  const list = useMemo(() => upcomingBirthdays(people, 7), [people]);
  const todays = list.filter((b) => b.daysUntil === 0);
  const later = list.filter((b) => b.daysUntil > 0);

  const whenLabel = (daysUntil: number) =>
    daysUntil === 0 ? t('today') : daysUntil === 1 ? t('tomorrow') : t('inDays', { days: daysUntil });

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 via-white to-amber-50 p-5 sm:p-6 shadow-sm">
      {/* Floating balloons */}
      {!reduceMotion &&
        BALLOONS.map((b, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 pointer-events-none opacity-70"
            style={{ left: b.left }}
            initial={{ y: 20 }}
            animate={{ y: [20, -45, 20], rotate: [-4, 4, -4] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
          >
            <Balloon color={b.color} size={b.size} />
          </motion.div>
        ))}

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-2xl bg-white border-2 border-pink-200 shadow-sm flex items-center justify-center text-2xl shrink-0"
            animate={reduceMotion ? {} : { rotate: [0, -8, 8, -4, 0], y: [0, -3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}
            role="img"
            aria-label={t('cakeAlt')}
          >
            🎂
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-slate-900">{t('title')}</h3>
            <p className="text-xs font-semibold text-pink-700/80">{t('subtitle')}</p>
          </div>
          {onManage && (
            <button
              onClick={onManage}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white border-2 border-pink-200 text-pink-700 text-xs font-black hover:bg-pink-50 cursor-pointer"
            >
              {t('manageTeam')}
            </button>
          )}
        </div>

        {list.length === 0 && (
          <div className="py-5 text-center text-sm font-bold text-slate-400 rounded-2xl border-2 border-dashed border-pink-200 bg-white/60">
            {t('none')}
          </div>
        )}

        {/* Today: big celebratory banner */}
        {todays.map((b) => (
          <motion.div
            key={b.person.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r rtl:bg-gradient-to-l from-[#c11e3d] to-pink-500 text-white p-4 flex items-center gap-4 shadow-lg"
          >
            {!reduceMotion &&
              ['🎉', '✨', '🎊', '⭐'].map((c, i) => (
                <motion.span
                  key={c}
                  className="absolute text-lg pointer-events-none"
                  style={{ insetInlineEnd: `${8 + i * 14}%`, top: '10%' }}
                  animate={{ y: [0, 18, 0], opacity: [0.9, 0.4, 0.9], rotate: [0, 20, 0] }}
                  transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                >
                  {c}
                </motion.span>
              ))}
            {b.person.photoURL ? (
              <img src={b.person.photoURL} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/80 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/60 flex items-center justify-center font-black text-lg shrink-0">
                {initialsOf(b.person.name)}
              </div>
            )}
            <div className="relative min-w-0">
              <div className="text-[11px] font-black uppercase tracking-wider text-white/80">{t('today')}</div>
              <div className="text-lg font-black leading-tight">{t('todayBanner', { name: b.person.name.split(' ')[0] })}</div>
              <div className="text-xs font-bold text-white/85 flex flex-wrap items-center gap-2">
                <span>🎈 {t('turns', { age: b.turning })}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-black uppercase">{t(`kind_${b.person.kind}`)}</span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* The rest of the week */}
        {later.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {later.map((b, i) => (
              <motion.li
                key={b.person.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border-2 border-pink-100"
              >
                {b.person.photoURL ? (
                  <img src={b.person.photoURL} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-black shrink-0">
                    {initialsOf(b.person.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-black text-slate-900 truncate">{b.person.name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${KIND_STYLE[b.person.kind]}`}>
                      {t(`kind_${b.person.kind}`)}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    {fromISODate(b.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })} · {t('turns', { age: b.turning })}
                  </div>
                </div>
                <span className="shrink-0 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">{whenLabel(b.daysUntil)}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
