import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  Cpu,
  Trophy,
  Globe2,
  MapPin,
  Clock,
  ArrowRight,
  Zap,
  Users,
  HeartHandshake,
  UserPlus,
  Phone,
  Mail,
  Quote,
  ChevronDown,
  Send
} from 'lucide-react';
import { CLUB_PHOTOS, INITIAL_TRAINERS } from '../../data/initialData';
import { SITE_CONTENT, hasMap, mapsLink, publishedFaq, whatsappLink } from '../../data/siteContent';
import { CLASS_DEFAULT_IMAGE, WEEK_DAYS, WeekDay } from '../../types';
import { weekdayName } from '../../utils/schedule';
import { CATEGORY_EMOJI } from '../../utils/shop';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useIntroOpened } from '../common/IntroReveal';
import { WhatsAppIcon } from './WhatsAppButton';
import { photoSrcSet } from './photo';
import { CircuitBackground, CodeTyper, CountUp, Gear, Oscilloscope, Reveal, RobotArm } from './RoboticsArt';
import { HeroCollage } from './HeroCollage';
import { useT, useLanguage } from '../../i18n';
import { visitorMessages } from '../../i18n/messages/visitor';
import type { LandingSection } from '../../data/landing';


export const VisitorPortal: React.FC = () => {
  // The hero waits for the start-up intro (if it is playing) and animates in as soon as it opens or is skipped
  const introOpened = useIntroOpened();
  const reduceMotion = useReducedMotion();
  const {
    groups,
    navigateTo,
    products,
    landing,
    trainers
  } = useApp();
  const tDefault = useT(visitorMessages);
  const { dir, locale, lang } = useLanguage();
  // Texts the admin changed in Admin → Landing page win over the default wording
  const t = ((key, vars) => {
    const custom = landing.text?.[lang]?.[key];
    return custom ? custom.replace(/\{(\w+)\}/g, (m: string, name: string) => (vars && name in vars ? String(vars[name]) : m)) : tDefault(key, vars);
  }) as typeof tDefault;
  // Admins receive hidden products too; the public page only shows what is on sale
  const productsOnSale = products.filter((p) => p.isActive);

  const [dayFilter, setDayFilter] = useState<'all' | WeekDay>('all');
  const [trial, setTrial] = useState({ parent: '', child: '', age: '', cls: '', phone: '' });

  // Countdown to the next challenge (date set in Admin → Landing page, 9:00 that day)
  const countdownTarget = (() => {
    const [y, m, d] = (landing.countdownDate || '').split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d, 9).getTime() : 0;
  })();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!countdownTarget) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [countdownTarget]);
  const secondsLeft = Math.max(0, Math.floor((countdownTarget - now) / 1000));
  // Hidden by the admin; the countdown also hides without a date to come
  const show = (section: LandingSection) => !landing.hidden?.includes(section) && (section !== 'countdown' || countdownTarget > now);
  const timeLeft = {
    days: Math.floor(secondsLeft / 86400),
    hours: Math.floor(secondsLeft / 3600) % 24,
    minutes: Math.floor(secondsLeft / 60) % 60,
    seconds: secondsLeft % 60
  };

  // Public classes, sorted by day of the week then start time
  const classDays = WEEK_DAYS.filter((d) => groups.some((g) => g.dayOfWeek === d));
  const shownClasses = groups
    .filter((g) => dayFilter === 'all' || g.dayOfWeek === dayFilter)
    .sort((a, b) => WEEK_DAYS.indexOf(a.dayOfWeek) - WEEK_DAYS.indexOf(b.dayOfWeek) || a.timeSlot.localeCompare(b.timeSlot));

  const shownClassesAll = [...groups].sort((a, b) => WEEK_DAYS.indexOf(a.dayOfWeek) - WEEK_DAYS.indexOf(b.dayOfWeek) || a.timeSlot.localeCompare(b.timeSlot));

  const goRegister = () => navigateTo('register-parent');
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Rotating word in the hero headline
  const HERO_WORDS = t('heroWords').split('|');
  const [heroWordIdx, setHeroWordIdx] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setHeroWordIdx((i) => (i + 1) % HERO_WORDS.length), 2200);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  // Photo conveyor belt: the club's photos
  const beltPhotos = [
    { img: CLUB_PHOTOS.eurobotSpainChampions, title: t('belt1Title'), tag: t('belt1Tag') },
    { img: CLUB_PHOTOS.eurobotSpainTrophyCert, title: t('belt2Title'), tag: '📜 Alcalá de Henares' },
    { img: CLUB_PHOTOS.robocupViennaMarxHalle, title: t('belt3Title'), tag: '🇦🇹 Marx Halle' },
    { img: CLUB_PHOTOS.ministryHonorCeremony, title: t('belt4Title'), tag: t('belt4Tag') },
    { img: CLUB_PHOTOS.robocupJuniorEgypt, title: t('belt5Title'), tag: '🇪🇬 RoboCup Junior' },
    { img: CLUB_PHOTOS.odaRobots2ndPrize, title: t('belt6Title'), tag: t('belt6Tag') },
    { img: CLUB_PHOTOS.eurobotSpainStage, title: t('belt7Title'), tag: '🎉 Eurobot Spain' },
    { img: CLUB_PHOTOS.eurobotJuniorTunisiaQualif, title: t('belt8Title'), tag: '🇹🇳 ATR · INSAT' },
    { img: CLUB_PHOTOS.istanbulAirportEuropeanChamp, title: t('belt9Title'), tag: '✈️ Istanbul' },
    { img: CLUB_PHOTOS.robocupEgyptTeam, title: t('belt10Title'), tag: t('belt10Tag') },
    { img: CLUB_PHOTOS.nationsFlags, title: t('belt11Title'), tag: t('belt11Tag') },
    { img: CLUB_PHOTOS.officialTrophyReception, title: t('belt12Title'), tag: t('belt12Tag') },
    { img: CLUB_PHOTOS.internationalFriendsThailand, title: t('belt13Title'), tag: t('belt13Tag') },
    { img: CLUB_PHOTOS.airportDepartureTunis, title: t('belt14Title'), tag: '✈️ Tunis-Carthage' },
    { img: CLUB_PHOTOS.airportDeparturePalestine, title: t('belt15Title'), tag: t('belt15Tag') }
  ];

  // Counters set in Admin → Landing page; one without a number is not shown
  const stats = [
    { value: landing.stats?.builders ?? 0, suffix: '+', label: t('statBuilders') },
    { value: landing.stats?.workshops ?? 0, suffix: '+', label: t('statWorkshops') },
    { value: landing.stats?.robots ?? 0, suffix: '+', label: t('statRobots') },
    { value: landing.stats?.trophies ?? 0, suffix: '', label: t('statTrophies') }
  ].filter((s) => s.value > 0);

  // Content from src/data/siteContent.ts: a section shows only once it has something real in it
  const { contact, address } = SITE_CONTENT;
  const achievements = SITE_CONTENT.achievements;
  const faq = publishedFaq();
  const testimonials = SITE_CONTENT.testimonials;
  // The built-in demo trainers are never shown: only the ones loaded from the club's data
  const coaches = SITE_CONTENT.coaches.length
    ? SITE_CONTENT.coaches.map((c) => ({ name: c.name, role: c.role[lang], photo: c.photo }))
    : (trainers === INITIAL_TRAINERS ? [] : trainers).map((tr) => ({ name: tr.name, role: tr.specialty || tr.specialization, photo: tr.avatar }));
  const waHref = whatsappLink(t('whatsappHello'));
  const canBookTrial = !!(contact.whatsapp || contact.email);
  const hasContact = canBookTrial || !!contact.phone || hasMap();
  const goTrial = () => scrollToSection('contact');

  // The trial request goes out as a prefilled WhatsApp message (or an email): nothing is stored on the site
  const sendTrial = (e: React.FormEvent) => {
    e.preventDefault();
    const text = t('trialMessage', {
      parent: trial.parent.trim(),
      child: trial.child.trim(),
      age: trial.age,
      cls: trial.cls || t('trialAnyClass'),
      phone: trial.phone.trim()
    });
    const href = contact.whatsapp
      ? whatsappLink(text)
      : `mailto:${contact.email}?subject=${encodeURIComponent(t('trialSubject'))}&body=${encodeURIComponent(text)}`;
    window.open(href, '_blank', 'noopener');
  };
  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-600 focus:bg-white';

  const ageLabel = (min?: number, max?: number) =>
    min && max ? t('ageRange', { min, max }) : min ? t('agePlus', { min }) : max ? t('ageRange', { min: 3, max }) : '';
  const levelLabel = { beginner: t('levelBeginner'), intermediate: t('levelIntermediate'), advanced: t('levelAdvanced') };

  const steps = [
    {
      n: '01',
      title: t('stepBuildTitle'),
      text: t('stepBuildText'),
      art: (
        <div className="relative w-[190px] h-full mx-auto">
          <Gear size={104} teeth={16} duration={16} color="#c11e3d" className="absolute left-[8px] top-[4px]" />
          <Gear size={68} teeth={10} duration={10} reverse color="#191919" windows={4} className="absolute left-[100px] top-[6px]" />
        </div>
      )
    },
    {
      n: '02',
      title: t('stepWireTitle'),
      text: t('stepWireText'),
      art: <Oscilloscope className="w-full h-full" />
    },
    {
      n: '03',
      title: t('stepCodeTitle'),
      text: t('stepCodeText'),
      art: <CodeTyper className="w-full h-full" />
    },
    {
      n: '04',
      title: t('stepCompeteTitle'),
      text: t('stepCompeteText'),
      art: (
        <div className="shine w-full h-full rounded-xl bg-gradient-to-br from-sky-700 via-sky-900 to-[#191919] flex items-center justify-center">
          <Trophy className="w-14 h-14 text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.6)]" />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-24 pb-24 relative overflow-x-hidden">
      {/* 1. HERO: circuit board, gear train and the club logo */}
      <section className="relative overflow-hidden bg-[#141414] text-white">
        <CircuitBackground className="absolute inset-0 w-full h-full" />
        {/* Keeps the circuit lines from crossing the headline */}
        <div className="absolute inset-y-0 start-0 w-full lg:w-[68%] bg-gradient-to-r rtl:bg-gradient-to-l from-[#141414] via-[#141414]/90 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-sky-600/25 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-48 right-0 w-[560px] h-[560px] rounded-full bg-sky-900/40 blur-[120px] pointer-events-none" />

        <div
          key={introOpened ? 'shown' : 'waiting'}
          className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20 ${introOpened ? '' : 'invisible'}`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-7">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-black tracking-wide backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-sky-500 led-blink" />
                  {t('heroBadgeEurobot')}
                </span>
                <a
                  href={contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <img src={CLUB_PHOTOS.clubLogo} alt="" className="w-4 h-4 rounded-full bg-white object-contain" />
                  {t('heroFans')}
                </a>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-[4.2rem] font-black tracking-tight leading-[1.05]"
              >
                {t('heroLine1')} <br className="hidden sm:inline" />
                {t('heroBeforeWord') && <>{t('heroBeforeWord')} </>}
                <span className="sr-only">{HERO_WORDS[0]}</span>
                <span className="relative inline-flex overflow-hidden align-bottom text-sky-500 pb-1" aria-hidden="true">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={HERO_WORDS[heroWordIdx]}
                      initial={{ y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: '-100%', opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block"
                    >
                      {HERO_WORDS[heroWordIdx]}
                    </motion.span>
                  </AnimatePresence>
                </span>
                {t('heroAfterWord') && <> {t('heroAfterWord')}</>}
                <br />
                <span className="text-white/90">{t('heroLine3')}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="text-base sm:text-lg text-white/75 font-medium leading-relaxed max-w-xl"
              >
                {t('heroIntro')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="flex flex-wrap items-center gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={goRegister}
                  className="px-8 py-4 btn-duo-green text-sm font-black flex items-center gap-2.5 cursor-pointer shadow-[0_10px_40px_-8px_rgba(193,30,61,0.7)]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('registerChild')}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </motion.button>
                {canBookTrial && show('contact') && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={goTrial}
                    className="px-7 py-4 rounded-2xl bg-white text-[#191919] text-sm font-black hover:bg-white/90 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-sky-600 rtl:-scale-x-100" />
                    <span>{t('tryFree')}</span>
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => scrollToSection('programs')}
                  className="px-7 py-4 rounded-2xl border-2 border-white/20 text-sm font-black text-white hover:bg-white/10 hover:border-white/40 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>{t('explorePrograms')}</span>
                </motion.button>
              </motion.div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-white/70">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-sky-500" /> {t('heroLocation')}</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-sky-500" /> {t('heroHardware')}</span>
                <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-sky-500" /> {t('heroPodiums')}</span>
              </div>
            </div>

            <div className="lg:col-span-5 py-2">
              <HeroCollage
                photos={[beltPhotos[0], beltPhotos[3], beltPhotos[2], beltPhotos[5], beltPhotos[10]]}
                back={[CLUB_PHOTOS.eurobotSpainTrophyCert, CLUB_PHOTOS.robocupEgyptTeam]}
                logo={CLUB_PHOTOS.clubLogo}
                logoAlt="Discovery Club Junior"
                delay={0}
                chips={[
                  { icon: <Trophy className="w-4 h-4 text-amber-500" />, text: t('chipTrophy') },
                  { icon: <Globe2 className="w-4 h-4 text-[#c11e3d]" />, text: t('chipWorld') },
                  { icon: <Users className="w-4 h-4 text-slate-700" />, text: t('chipAges') }
                ]}
              />
            </div>
          </div>

          {/* live counters */}
          {stats.length > 0 && (
          <div className={`mt-14 grid grid-cols-2 gap-3 sm:gap-4 ${stats.length >= 4 ? 'md:grid-cols-4' : stats.length === 3 ? 'md:grid-cols-3' : ''}`}>
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={0.5 + i * 0.08} y={20}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur px-5 py-4 hover:border-sky-500/60 hover:bg-white/[0.07] transition-colors">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white">
                    <CountUp to={s.value} suffix={s.suffix} delay={0.5} />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/70 mt-1">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
          )}
        </div>
        {/* angled bottom edge */}
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="relative block w-full h-10 sm:h-14 text-[#f8fafc]" aria-hidden="true">
          <path d="M0 60 L0 30 L1440 0 L1440 60 Z" fill="currentColor" />
        </svg>
      </section>

      {/* 2. PHOTO CONVEYOR BELT */}
      {show('belt') && (
        <>
      <section className="-mt-16 space-y-5">
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('beltEyebrow')}</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('beltTitle')}</h2>
          </div>
        </Reveal>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="marquee-track flex w-max gap-4 py-2">
            {[...beltPhotos, ...beltPhotos].map((item, idx) => (
              <div
                key={idx}
                className="group relative w-64 sm:w-72 h-44 sm:h-48 shrink-0 rounded-2xl overflow-hidden border-2 border-white shadow-lg"
              >
                <img
                  src={item.img}
                  srcSet={photoSrcSet(item.img)}
                  sizes="288px"
                  alt={idx < beltPhotos.length ? item.title : ''}
                  aria-hidden={idx >= beltPhotos.length || undefined}
                  loading="lazy"
                  decoding="async"
                  width={288}
                  height={192}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#191919]/90 via-[#191919]/10 to-transparent" />
                <div className="absolute bottom-3 start-3 end-3 text-start text-white">
                  <span className="text-[10px] font-black text-amber-300 block truncate">{item.tag}</span>
                  <span className="text-sm font-black leading-tight block truncate">{item.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
        </>
      )}

      {/* 3. HOW IT WORKS: build, wire, code, compete */}
      {show('how') && (
        <>
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <Reveal className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('howEyebrow')}</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{t('howTitle')}</h2>
          <p className="text-sm text-slate-600 font-medium">
            {t('howText')}
          </p>
        </Reveal>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* circuit trace connecting the steps */}
          <svg className="hidden lg:block absolute left-[12%] right-[12%] top-[86px] h-4 w-[76%] pointer-events-none" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="2" x2="100" y2="2" stroke="#e2e8f0" strokeWidth="0.6" />
            <line x1="0" y1="2" x2="100" y2="2" stroke="#c11e3d" strokeWidth="0.9" pathLength={100} className="pcb-signal" style={{ animationDuration: '3s' }} />
          </svg>
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.12}>
              <motion.div whileHover={{ y: -8 }} className="duo-card relative h-full p-5 bg-white space-y-4">
                <div className="h-32 rounded-xl bg-slate-50 border border-slate-100 p-2 overflow-hidden">{step.art}</div>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#191919] text-white font-mono font-black text-sm flex items-center justify-center shadow-md">
                    {step.n}
                  </span>
                  <h3 className="text-xl font-black text-slate-900">{step.title}</h3>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{step.text}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>
        </>
      )}

      {/* 4. ROBOT LAB: animated arm soldering a board */}
      {show('lab') && (
        <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#141414] text-white p-8 sm:p-12">
            <CircuitBackground className="absolute inset-0 w-full h-full opacity-60" />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">{t('labEyebrow')}</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  {t('labTitleBefore')} <span className="text-sky-500">{t('labTitleHighlight')}</span>
                </h2>
                <p className="text-sm text-white/75 font-medium leading-relaxed">
                  {t('labText')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Arduino', 'ESP32', t('techServo'), t('techUltrasonic'), t('techInfrared'), t('tech3d'), 'C++', 'Python', t('techVision')].map((tech, i) => (
                    <motion.span
                      key={tech}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-black font-mono text-white/80 hover:border-sky-500 hover:text-white transition-colors"
                    >
                      {tech}
                    </motion.span>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <Bot className="w-5 h-5 text-sky-400 mb-2" />
                    <h4 className="text-sm font-black">{t('handsOnTitle')}</h4>
                    <p className="text-xs text-white/70 font-medium">{t('handsOnText')}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <HeartHandshake className="w-5 h-5 text-sky-400 mb-2" />
                    <h4 className="text-sm font-black">{t('parentsLoopTitle')}</h4>
                    <p className="text-xs text-white/70 font-medium">{t('parentsLoopText')}</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-10 rounded-full bg-sky-600/20 blur-3xl" />
                <RobotArm className="relative w-full max-w-md mx-auto" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
        </>
      )}

      {/* 5. NEXT CHALLENGE COUNTDOWN */}
      {show('countdown') && (
        <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="duo-card p-6 sm:p-8 bg-white grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-4">
              <Oscilloscope className="w-full h-auto rounded-xl" />
            </div>
            <div className="lg:col-span-4 space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('nextEyebrow')}</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('nextTitle')}</h3>
              <p className="text-sm text-slate-600 font-medium">{t('nextText')}</p>
            </div>
            <div className="lg:col-span-4 flex items-center justify-center lg:justify-end gap-2 font-mono">
              {[
                { v: timeLeft.days, l: t('days') },
                { v: timeLeft.hours, l: t('hours') },
                { v: timeLeft.minutes, l: t('mins') },
                { v: timeLeft.seconds, l: t('secs') }
              ].map((unit, i) => (
                <React.Fragment key={unit.l}>
                  {i > 0 && <span className="text-xl font-black text-sky-600 led-blink">:</span>}
                  <div className="relative w-16 py-3 rounded-2xl bg-[#191919] text-center shadow-lg overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={unit.v}
                        initial={{ y: -12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        className="block text-2xl font-black text-white"
                      >
                        {String(unit.v).padStart(2, '0')}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-[10px] font-bold text-white/70 uppercase font-sans">{unit.l}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
        </>
      )}

      {/* 6. HALL OF FAME TIMELINE */}
      {show('fame') && (
        <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <Reveal className="lg:col-span-5 space-y-5 lg:sticky lg:top-28">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('fameEyebrow')}</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t('fameTitle')}
            </h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {t('fameText')}
            </p>
            <div className="relative rounded-3xl overflow-hidden shadow-xl">
              <img
                src={CLUB_PHOTOS.eurobotSpainChampions}
                srcSet={photoSrcSet(CLUB_PHOTOS.eurobotSpainChampions)}
                sizes="(min-width: 1024px) 480px, 100vw"
                alt={t('fameImgAlt')}
                loading="lazy"
                decoding="async"
                width={600}
                height={224}
                className="w-full h-56 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#191919]/85 to-transparent" />
              <div className="absolute bottom-4 start-4 text-white">
                <div className="text-xs font-black text-amber-300 uppercase">Eurobot Spain Junior</div>
                <div className="text-lg font-black">{t('fameFirstPlace')}</div>
              </div>
            </div>
          </Reveal>

          <div className="lg:col-span-7 relative ps-8">
            <div className="absolute start-3 top-2 bottom-2 w-0.5 bg-slate-200" />
            <motion.div
              className="absolute start-3 top-2 w-0.5 bg-sky-600 origin-top"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
              style={{ bottom: '0.5rem' }}
            />
            <div className="space-y-5">
              {achievements.map((item, idx) => (
                <Reveal key={idx} delay={Math.min(idx, 4) * 0.08} y={24}>
                  <div className="relative">
                    <span className="absolute -start-[26px] top-5 w-4 h-4 rounded-full bg-white border-4 border-sky-600 shadow" />
                    <motion.div whileHover={{ x: dir === 'rtl' ? -6 : 6 }} className="duo-card p-4 bg-white flex items-center gap-4">
                      {item.photo && (
                        <img
                          src={item.photo}
                          srcSet={photoSrcSet(item.photo)}
                          sizes="96px"
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width={96}
                          height={72}
                          className="w-24 h-18 shrink-0 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {item.year && <span className="px-2.5 py-1 rounded-lg bg-[#191919] text-white text-xs font-mono font-black">{item.year}</span>}
                          <h3 className="text-sm font-black text-slate-900">{item.title[lang]}</h3>
                        </div>
                        <p className="text-sm text-slate-600 font-medium">{item.text[lang]}</p>
                      </div>
                    </motion.div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      {/* 7. CLASSES WITH DAY FILTER (the section keeps its "programs" anchor for the menu links) */}
      {show('programs') && (
        <>
      <section id="programs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Reveal className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('programsEyebrow', { count: groups.length })}</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{t('programsTitle')}</h2>
          <p className="text-sm text-slate-600 font-medium">{t('programsText')}</p>

          {classDays.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {(['all', ...classDays] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDayFilter(d)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    dayFilter === d ? 'btn-duo-green' : 'btn-duo-secondary'
                  }`}
                >
                  {d === 'all' ? t('allDays') : weekdayName(d, locale)}
                </button>
              ))}
            </div>
          )}
        </Reveal>

        {shownClasses.length === 0 ? (
          <p className="py-12 text-center text-sm font-medium text-slate-500 rounded-3xl border-2 border-dashed border-slate-200">{t('noClasses')}</p>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {shownClasses.map((g, i) => (
                <motion.article
                  layout
                  key={g.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -8 }}
                  className="duo-card group relative overflow-hidden bg-white flex flex-col"
                >
                  <div className="relative aspect-[2/1] bg-slate-900 overflow-hidden">
                    <img
                      src={g.imageUrl || CLASS_DEFAULT_IMAGE}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 flex flex-wrap gap-1.5 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] font-black">
                      {ageLabel(g.ageMin, g.ageMax) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">
                          <Users className="w-3 h-3" />
                          {ageLabel(g.ageMin, g.ageMax)}
                        </span>
                      )}
                      {g.level && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">{levelLabel[g.level]}</span>}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                        {weekdayName(g.dayOfWeek, locale)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm" dir="ltr">
                        <Clock className="w-3 h-3" />
                        {g.timeSlot}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col gap-5 flex-1">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-lg font-black text-slate-900 leading-snug">{g.name}</h3>
                      {g.description && <p className="text-xs text-slate-600 font-medium leading-relaxed">{g.description}</p>}
                      {g.room && (
                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {g.room}
                        </p>
                      )}
                    </div>
                    <div className="pt-4 border-t-2 border-slate-100 space-y-4">
                      <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-black text-slate-900 font-mono">
                          {g.pricePerMonth} <span className="text-xs font-bold text-slate-600">{t('perMonth')}</span>
                        </div>
                        <span className="text-xs font-bold text-sky-700">{t('kitIncluded')}</span>
                      </div>
                      <button
                        onClick={goRegister}
                        className="w-full py-3 btn-duo-green text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{t('registerChild')}</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                      {canBookTrial && show('contact') && (
                        <button
                          onClick={() => {
                            setTrial((f) => ({ ...f, cls: g.name }));
                            goTrial();
                          }}
                          className="w-full py-2.5 btn-duo-secondary text-xs font-black cursor-pointer"
                        >
                          {t('tryFree')}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
        </>
      )}

      {/* 8. COACHES */}
      {show('coaches') && coaches.length > 0 && (
        <section id="coaches" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Reveal className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('coachesEyebrow')}</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{t('coachesTitle')}</h2>
            <p className="text-sm text-slate-600 font-medium">{t('coachesText')}</p>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {coaches.map((c, i) => (
              <Reveal key={c.name + i} delay={Math.min(i, 6) * 0.06} y={20}>
                <div className="duo-card bg-white p-5 text-center space-y-3 h-full">
                  {c.photo ? (
                    <img src={c.photo} alt="" loading="lazy" decoding="async" width={96} height={96} className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-slate-100" />
                  ) : (
                    <div className="w-24 h-24 mx-auto rounded-full bg-[#191919] text-white grid place-items-center text-2xl font-black" aria-hidden="true">
                      {c.name.trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{c.name}</h3>
                    {c.role && <p className="text-xs font-semibold text-slate-600">{c.role}</p>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 9. TESTIMONIALS */}
      {show('testimonials') && testimonials.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Reveal className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('testimonialsEyebrow')}</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{t('testimonialsTitle')}</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((q, i) => (
              <Reveal key={i} delay={Math.min(i, 5) * 0.08} y={20}>
                <figure className="duo-card bg-white p-6 space-y-4 h-full">
                  <Quote className="w-7 h-7 text-sky-600 rtl:-scale-x-100" aria-hidden="true" />
                  <blockquote className="text-sm text-slate-700 font-medium leading-relaxed">{q.quote[lang]}</blockquote>
                  <figcaption className="text-xs">
                    <span className="font-black text-slate-900">{q.author}</span>
                    {q.role[lang] && <span className="text-slate-600"> · {q.role[lang]}</span>}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 10. CLUB SHOP (only when the admin has products on sale) */}
      {show('shop') && (
        <>
      {productsOnSale.length > 0 && (
      <Reveal>
      <section id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="duo-card duo-card-glow-blue p-8 sm:p-10 bg-white border-2 border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase">
                <span>{t('shopBadge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {t('shopTitle')}
              </h2>
            </div>
            <button
              onClick={() => navigateTo('parent')}
              className="px-6 py-3.5 btn-duo-yellow text-xs font-black flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
            >
              <span>{t('orderInPortal')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {productsOnSale.map((product) => (
              <div key={product.id} className="rounded-3xl overflow-hidden border-4 border-slate-100 shadow-md group bg-white">
                <div className="relative h-56 bg-slate-100">
                  <img
                    src={product.imageUrl || CLUB_PHOTOS.teamInClubColors}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 end-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-xs font-black">
                    {t('priceDt', { price: product.price })}
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="text-sm font-black text-slate-900">
                    {CATEGORY_EMOJI[product.category]} {product.name}
                  </h3>
                  {product.description && <p className="text-xs text-slate-600 font-medium">{product.description}</p>}
                  {product.sizes.length > 0 && (
                    <p className="text-[11px] font-bold text-slate-500">{product.sizes.join(' · ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </Reveal>
      )}
        </>
      )}

      {/* 11. FAQ */}
      {show('faq') && faq.length > 0 && (
        <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Reveal className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('faqEyebrow')}</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{t('faqTitle')}</h2>
          </Reveal>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <details key={i} className="group duo-card hover:transform-none! bg-white px-5 py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-black text-slate-900 text-sm [&::-webkit-details-marker]:hidden">
                  {f.q[lang]}
                  <ChevronDown className="w-4 h-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="pt-3 text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">{f.a[lang]}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* 12. CONTACT: free trial request, WhatsApp / phone / email, map */}
      {show('contact') && hasContact && (
        <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {canBookTrial ? (
              <Reveal>
                <form onSubmit={sendTrial} className="duo-card hover:transform-none! bg-white p-6 sm:p-8 space-y-5 h-full">
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('contactEyebrow')}</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('contactTitle')}</h2>
                    <p className="text-sm text-slate-600 font-medium">{t('contactText')}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs font-black text-slate-700 space-y-1">
                      <span>{t('trialParent')}</span>
                      <input required autoComplete="name" value={trial.parent} onChange={(e) => setTrial({ ...trial, parent: e.target.value })} className={inputClass} />
                    </label>
                    <label className="block text-xs font-black text-slate-700 space-y-1">
                      <span>{t('trialPhone')}</span>
                      <input required type="tel" dir="ltr" autoComplete="tel" value={trial.phone} onChange={(e) => setTrial({ ...trial, phone: e.target.value })} className={inputClass} />
                    </label>
                    <label className="block text-xs font-black text-slate-700 space-y-1">
                      <span>{t('trialChild')}</span>
                      <input required value={trial.child} onChange={(e) => setTrial({ ...trial, child: e.target.value })} className={inputClass} />
                    </label>
                    <label className="block text-xs font-black text-slate-700 space-y-1">
                      <span>{t('trialAge')}</span>
                      <input required type="number" min={3} max={22} inputMode="numeric" value={trial.age} onChange={(e) => setTrial({ ...trial, age: e.target.value })} className={inputClass} />
                    </label>
                  </div>
                  {groups.length > 0 && (
                    <label className="block text-xs font-black text-slate-700 space-y-1">
                      <span>{t('trialClass')}</span>
                      <select value={trial.cls} onChange={(e) => setTrial({ ...trial, cls: e.target.value })} className={inputClass}>
                        <option value="">{t('trialAnyClass')}</option>
                        {shownClassesAll.map((g) => (
                          <option key={g.id} value={g.name}>
                            {g.name} · {weekdayName(g.dayOfWeek, locale)} {g.timeSlot}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button type="submit" className="w-full py-3.5 btn-duo-green text-sm font-black flex items-center justify-center gap-2 cursor-pointer">
                    {contact.whatsapp ? <WhatsAppIcon className="w-5 h-5" /> : <Mail className="w-4 h-4" />}
                    {contact.whatsapp ? t('trialSend') : t('trialSendEmail')}
                  </button>
                </form>
              </Reveal>
            ) : null}

            <Reveal className={canBookTrial ? '' : 'lg:col-span-2'}>
              <div className="duo-card hover:transform-none! bg-white overflow-hidden h-full flex flex-col">
                <div className="p-6 sm:p-8 space-y-4">
                  {!canBookTrial && (
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('contactEyebrow')}</h2>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {waHref && (
                      <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25d366] text-white text-xs font-black hover:brightness-95">
                        <WhatsAppIcon className="w-4 h-4" />
                        {t('whatsappUs')}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-duo-secondary text-xs font-black">
                        <Phone className="w-4 h-4" />
                        <span>{t('callUs')}</span>
                        <span dir="ltr" className="font-mono">{contact.phone}</span>
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-duo-secondary text-xs font-black">
                        <Mail className="w-4 h-4" />
                        {t('emailUs')}
                      </a>
                    )}
                  </div>
                  <a href={mapsLink()} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm font-semibold text-slate-700 hover:text-sky-700">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                    <span>
                      {[address.street[lang], address.city[lang]].filter(Boolean).join(', ')}
                      <span className="block text-xs text-sky-700 font-bold">{t('openInMaps')}</span>
                    </span>
                  </a>
                  {SITE_CONTENT.openingHours[lang] && (
                    <p className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                      <Clock className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                      {SITE_CONTENT.openingHours[lang]}
                    </p>
                  )}
                </div>
                {hasMap() && (
                  <iframe
                    title={t('mapTitle')}
                    src={`https://maps.google.com/maps?q=${address.lat},${address.lng}&z=16&hl=${lang}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full flex-1 min-h-[260px] border-0"
                  />
                )}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* 13. FINAL CALL TO ACTION */}
      {show('cta') && (
        <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-600 via-sky-800 to-sky-950 text-white px-8 py-14 sm:px-14 text-center">
            <Gear teeth={24} duration={40} color="rgba(255,255,255,0.08)" windows={6} className="absolute -left-20 -bottom-24 w-72 h-72" />
            <Gear teeth={12} duration={20} reverse color="rgba(255,255,255,0.1)" windows={4} className="absolute -right-10 -top-12 w-48 h-48" />
            <div className="relative max-w-2xl mx-auto space-y-5">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">{t('ctaTitle')}</h2>
              <p className="text-white/75 font-medium">
                {t('ctaText')}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={goRegister}
                className="inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl bg-white text-sky-700 font-black text-sm shadow-xl cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {t('registerChild')}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </motion.button>
            </div>
          </div>
        </Reveal>
      </section>
        </>
      )}

    </div>
  );
};
