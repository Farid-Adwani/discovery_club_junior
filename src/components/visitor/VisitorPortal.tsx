import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Code2,
  Cpu,
  Trophy,
  Wrench,
  Zap,
  MapPin,
  Clock,
  ArrowRight,
  Users,
  UserPlus,
  Phone,
  Mail,
  Quote,
  ChevronDown,
  Send,
  Facebook
} from 'lucide-react';
import { CLUB_PHOTOS } from '../../data/initialData';
import { hasContactInfo, landingCoaches } from './sections';
import { hasMap, mapsLink, pick, publishedFaq, whatsappLink } from '../../data/siteContent';
import { DEFAULT_HERO_PHOTOS, DEFAULT_HIGHLIGHT, DEFAULT_POLAROID } from '../../data/landingDefaults';
import { useLandingT, useSite } from '../common/siteHooks';
import { CLASS_DEFAULT_IMAGE, WEEK_DAYS, WeekDay } from '../../types';
import { weekdayName } from '../../utils/schedule';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useIntroOpened } from '../common/IntroReveal';
import { WhatsAppIcon } from './WhatsAppButton';
import { photoSrcSet } from './photo';
import { CountUp, Reveal } from './RoboticsArt';
import { FloatingDoodles, GearDoodle, Ribbon, SectionTitle, SparkDoodle, Sticker, Squiggle } from './Decor';
import { CircuitTraces, CodeArt, CompeteArt, ElectronicsArt, MechanicsArt, PanelScrews, RobotMascot } from './LabArt';
import { CodeRobotGame } from './CodeRobotGame';
import { HeroCollage } from './HeroCollage';
import { useLanguage, useT } from '../../i18n';
import { pagesMessages } from '../../i18n/messages/pages';
import type { LandingSection } from '../../data/landing';
import { takeReturn } from '../museum/returnTo';

// The photo timeline (300+ photos listed) loads in its own chunk, after the top of the page
const TimelineSection = lazy(() => import('./TimelineSection').then((m) => ({ default: m.TimelineSection })));

/**
 * The Courses (/cours) and Contact (/contact) pages are this same page with only some sections:
 * the page's own section always shows, the others only if they are not hidden in Admin → Landing page.
 */
export type VisitorFocus = 'courses' | 'contact';
const FOCUS: Record<VisitorFocus, { main: LandingSection; also: LandingSection[] }> = {
  courses: { main: 'programs', also: ['how', 'cta'] },
  contact: { main: 'contact', also: ['faq'] }
};

// "Free trial" on the Courses page opens the Contact page with that class already chosen
let pendingTrialClass = '';

export const VisitorPortal: React.FC<{ focus?: VisitorFocus }> = ({ focus }) => {
  // The hero waits for the start-up intro (if it is playing) and animates in as soon as it opens or is skipped
  const introOpened = useIntroOpened();
  const reduceMotion = useReducedMotion();
  const {
    groups,
    navigateTo,
    landing,
    trainers
  } = useApp();
  // Texts and club details, with the changes made in Admin → Landing page
  const t = useLandingT();
  const site = useSite();
  const { locale, lang } = useLanguage();

  const [dayFilter, setDayFilter] = useState<'all' | WeekDay>('all');
  const [trial, setTrial] = useState(() => {
    const cls = pendingTrialClass;
    pendingTrialClass = '';
    return { parent: '', child: '', age: '', cls, phone: '' };
  });
  const tp = useT(pagesMessages);

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
  const show = (section: LandingSection) => {
    if (focus && section === FOCUS[focus].main) return true;
    if (focus && !FOCUS[focus].also.includes(section)) return false;
    return !landing.hidden?.includes(section) && (section !== 'countdown' || countdownTarget > now);
  };
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
  const goMuseum = () => navigateTo('museum');

  // Back from the 3D museum: scroll to the section the visitor came from (it loads lazily, so wait for it)
  useEffect(() => {
    const id = takeReturn();
    if (!id) return;
    // The sections above it also load lazily and grow: scroll again once they have settled
    const timers: ReturnType<typeof setTimeout>[] = [];
    let tries = 0;
    const find = setInterval(() => {
      const el = document.getElementById(id);
      if (!el && ++tries <= 40) return;
      clearInterval(find);
      // instant: the page has smooth scrolling, which would scroll through everything above
      if (el) [0, 350, 900].forEach((ms) => timers.push(setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'instant' }), ms)));
    }, 100);
    return () => {
      clearInterval(find);
      timers.forEach(clearTimeout);
    };
  }, []);
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Rotating word in the hero headline
  const HERO_WORDS = t('heroWords').split('|');
  const [heroWordIdx, setHeroWordIdx] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setHeroWordIdx((i) => (i + 1) % HERO_WORDS.length), 2200);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  // Club moments that take turns in the hero collage (Admin → Landing page → photos, or the built-in ones)
  const media = landing.media;
  const heroPhotos = (media?.heroPhotos?.length ? media.heroPhotos : DEFAULT_HERO_PHOTOS).map((p) => ({ img: p.img, title: pick(p.title, lang), tag: pick(p.tag, lang) }));

  // Counters set in Admin → Landing page; one without a number is not shown
  const stats = [
    { value: landing.stats?.builders ?? 0, suffix: '+', label: t('statBuilders') },
    { value: landing.stats?.workshops ?? 0, suffix: '+', label: t('statWorkshops') },
    { value: landing.stats?.robots ?? 0, suffix: '+', label: t('statRobots') },
    { value: landing.stats?.trophies ?? 0, suffix: '', label: t('statTrophies') }
  ].filter((s) => s.value > 0);

  // Club details: a section shows only once it has something real in it
  const { contact, address } = site;
  const faq = publishedFaq(site);
  const testimonials = site.testimonials;
  // Same rules as the header's section links (sections.ts)
  const coaches = landingCoaches(trainers);
  const waHref = whatsappLink(site, t('whatsappHello'));
  const canBookTrial = !!(contact.whatsapp || contact.email);
  const hasContact = hasContactInfo(site);
  // The trial form: further down this page, or on the Contact page
  const trialHere = show('contact') && hasContact;
  const trialReachable = trialHere || (focus === 'courses' && !landing.hidden?.includes('contact') && hasContact);
  const goTrial = (cls = '') => {
    if (trialHere) {
      if (cls) setTrial((f) => ({ ...f, cls }));
      scrollToSection('contact');
    } else {
      pendingTrialClass = cls;
      navigateTo('contact');
    }
  };

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
      ? whatsappLink(site, text)
      : `mailto:${contact.email}?subject=${encodeURIComponent(t('trialSubject'))}&body=${encodeURIComponent(text)}`;
    window.open(href, '_blank', 'noopener');
  };
  const inputClass =
    'w-full px-4 py-3 bg-paper border border-line rounded-2xl text-sm font-semibold text-heading placeholder-muted focus:outline-none focus:border-brand focus:bg-white';

  const ageLabel = (min?: number, max?: number) =>
    min && max ? t('ageRange', { min, max }) : min ? t('agePlus', { min }) : max ? t('ageRange', { min: 3, max }) : '';
  const levelLabel = { beginner: t('levelBeginner'), intermediate: t('levelIntermediate'), advanced: t('levelAdvanced') };

  // The four steps, each on its own pastel card with an icon badge sitting on the top edge
  const steps = [
    { n: '01', icon: Wrench, art: <MechanicsArt />, title: t('stepBuildTitle'), text: t('stepBuildText'), bg: 'bg-pastel-rose' },
    { n: '02', icon: Zap, art: <ElectronicsArt />, title: t('stepWireTitle'), text: t('stepWireText'), bg: 'bg-pastel-sun' },
    { n: '03', icon: Code2, art: <CodeArt />, title: t('stepCodeTitle'), text: t('stepCodeText'), bg: 'bg-pastel-mint' },
    { n: '04', icon: Trophy, art: <CompeteArt />, title: t('stepCompeteTitle'), text: t('stepCompeteText'), bg: 'bg-pastel-sky' }
  ];
  const COACH_BG = ['bg-pastel-rose', 'bg-pastel-sky', 'bg-pastel-sun', 'bg-pastel-mint', 'bg-pastel-lilac'];
  const ribbonWords = t('ribbonWords').split('|').map((w) => w.trim()).filter(Boolean);
  const cardSoft = 'rounded-[28px] bg-white soft-shadow';

  return (
    <div className={`${focus ? 'space-y-16' : 'space-y-24'} pb-24 relative overflow-x-hidden bg-paper`}>
      {focus ? (
        // Courses / Contact page: a short title instead of the hero
        <section className="relative overflow-hidden bg-gradient-to-b from-[#fff3f5] via-paper to-paper">
          <div className="absolute inset-0 paper-dots opacity-60" aria-hidden="true" />
          <CircuitTraces sides="end" className="opacity-60" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-2 md:pt-20 text-center space-y-4">
            <p className="font-hand text-2xl text-brand leading-none">{tp(focus === 'courses' ? 'coursesKicker' : 'contactKicker')}</p>
            <h1 className="font-display text-[2.4rem] sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.06] text-heading">
              {tp(focus === 'courses' ? 'coursesTitle' : 'contactTitle')}
            </h1>
            <p className="text-base sm:text-lg text-muted leading-relaxed max-w-2xl mx-auto">{tp(focus === 'courses' ? 'coursesIntro' : 'contactIntro')}</p>
          </div>
        </section>
      ) : (
      <>
      {/* 1. HERO: light paper, serif headline with a handwritten word, the arch of photos */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fff3f5] via-paper to-paper">
        <div className="absolute inset-0 paper-dots opacity-60" aria-hidden="true" />
        <CircuitTraces sides="end" className="opacity-80" />
        <FloatingDoodles />

        <div
          key={introOpened ? 'shown' : 'waiting'}
          className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 md:pt-14 ${introOpened ? '' : 'invisible'}`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
            <div className="lg:col-span-6 space-y-7">
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2.5">
                <Sticker>{t('heroBadgeEurobot')}</Sticker>
                <a
                  href={contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-line text-xs font-semibold text-muted hover:text-brand hover:border-brand/40 transition-colors"
                >
                  <img src={CLUB_PHOTOS.clubLogo} alt="" className="w-4 h-4 rounded-full object-contain" />
                  {t('heroFans')}
                </a>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="font-display text-[2.7rem] sm:text-6xl lg:text-[4.3rem] font-semibold tracking-tight leading-[1.04] text-heading"
              >
                {t('heroLine1')} <br className="hidden sm:inline" />
                {t('heroBeforeWord') && <>{t('heroBeforeWord')} </>}
                <span className="sr-only">{HERO_WORDS[0]}</span>
                <span className="relative inline-flex align-baseline font-hand text-brand text-[1.2em] leading-none px-1" aria-hidden="true">
                  <span className="relative inline-flex overflow-hidden pb-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={HERO_WORDS[heroWordIdx]}
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '-100%', opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="inline-block"
                      >
                        {HERO_WORDS[heroWordIdx]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <Squiggle className="absolute -bottom-1 inset-x-0 h-3 w-full text-gold" />
                </span>
                {t('heroAfterWord') && <> {t('heroAfterWord')}</>}
                <br />
                <span className="italic font-medium text-heading/80">{t('heroLine3')}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="text-base sm:text-lg text-muted leading-relaxed max-w-xl"
              >
                {t('heroIntro')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="flex flex-wrap items-center gap-3.5"
              >
                <button onClick={goRegister} className="pill-primary px-7 py-4 text-sm">
                  <UserPlus className="w-4 h-4" />
                  {t('registerChild')}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
                {canBookTrial && trialHere && (
                  <button onClick={() => goTrial()} className="pill-outline px-6 py-3.5 text-sm">
                    <Send className="w-4 h-4 rtl:-scale-x-100" />
                    {t('tryFree')}
                  </button>
                )}
                <button onClick={() => scrollToSection('programs')} className="pill-outline px-6 py-3.5 text-sm">
                  <GearDoodle className="w-4 h-4" />
                  {t('explorePrograms')}
                </button>
              </motion.div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-muted">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-brand" /> {t('heroLocation')}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-brand" /> {t('chipAges')}</span>
                <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-gold" /> {t('heroPodiums')}</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <HeroCollage
                photos={heroPhotos}
                polaroid={{ img: media?.polaroid || DEFAULT_POLAROID, caption: t('heroPolaroid') }}
                highlight={{ img: media?.highlight || DEFAULT_HIGHLIGHT, tag: t('heroPodiums'), title: t('heroCountries') }}
                ringText={t('heroRingText')}
                note={t('heroHandNote')}
                logo={CLUB_PHOTOS.clubLogo}
                logoAlt="Discovery Club Junior"
              />
            </div>
          </div>

          {/* live counters */}
          {stats.length > 0 && (
            <div className={`mt-12 grid grid-cols-2 gap-3 sm:gap-4 ${stats.length >= 4 ? 'md:grid-cols-4' : stats.length === 3 ? 'md:grid-cols-3' : ''}`}>
              {stats.map((s, i) => (
                <Reveal key={s.label} delay={0.5 + i * 0.08} y={20}>
                  <div className="rounded-3xl bg-white/90 soft-shadow px-5 py-4 text-center">
                    <div className="font-display text-4xl font-semibold text-brand">
                      <CountUp to={s.value} suffix={s.suffix} delay={0.5} />
                    </div>
                    <div className="text-xs font-semibold text-muted mt-1">{s.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* the ribbon of what kids do here */}
      {ribbonWords.length > 0 && (
        <div className="-mt-20">
          <Ribbon words={ribbonWords} />
        </div>
      )}
      </>
      )}

      {/* 2. HOW IT WORKS: build, wire, code, compete */}
      {show('how') && (
        <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 scroll-mt-24">
          <Reveal>
            <SectionTitle kicker={t('howEyebrow')} title={t('howTitle')} text={t('howText')} />
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <div className={`group relative h-full rounded-[28px] ${step.bg} px-6 pt-12 pb-8 text-center transition-transform duration-300 hover:-translate-y-1.5`}>
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 grid place-items-center w-14 h-14 rounded-full bg-white text-brand soft-shadow transition-transform duration-300 group-hover:rotate-[-8deg]">
                    <step.icon className="w-6 h-6" />
                  </span>
                  {/* the step drawn on a little blueprint */}
                  <div className="relative h-32 mb-4 rounded-2xl bg-white/70 border-2 border-dashed border-brand/15 p-2 overflow-hidden">
                    <div className="absolute inset-0 paper-dots opacity-50" aria-hidden="true" />
                    <span className="absolute top-1.5 end-2.5 z-10 font-mono text-[10px] font-semibold text-brand/70" dir="ltr">STEP {step.n}</span>
                    <div className="relative h-full">{step.art}</div>
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-heading">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 3. CLASSES WITH DAY FILTER (the section keeps its "programs" anchor for the menu links) */}
      {show('programs') && (
        <section id="programs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24">
          <Reveal className="space-y-6">
            <SectionTitle kicker={t('programsEyebrow', { count: groups.length })} title={t('programsTitle')} text={t('programsText')} />
            {classDays.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(['all', ...classDays] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDayFilter(d)}
                    aria-pressed={dayFilter === d}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      dayFilter === d ? 'bg-brand text-white shadow-[0_8px_20px_-10px_rgba(193,30,61,0.8)]' : 'bg-white text-heading/75 border border-line hover:border-brand/40 hover:text-brand'
                    }`}
                  >
                    {d === 'all' ? t('allDays') : weekdayName(d, locale)}
                  </button>
                ))}
              </div>
            )}
          </Reveal>

          {shownClasses.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted rounded-[28px] border-2 border-dashed border-line bg-white/60">{t('noClasses')}</p>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              <AnimatePresence mode="popLayout">
                {shownClasses.map((g, i) => (
                  <motion.article
                    layout
                    key={g.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ delay: i * 0.06 }}
                    className={`group relative ${cardSoft} p-2.5 flex flex-col transition-transform duration-300 hover:-translate-y-1.5`}
                  >
                    <div className="relative aspect-[16/10] rounded-[22px] overflow-hidden bg-wash">
                      <img
                        src={g.imageUrl || CLASS_DEFAULT_IMAGE}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-3 start-3 end-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
                        {ageLabel(g.ageMin, g.ageMax) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-heading shadow-sm">
                            <Users className="w-3 h-3 text-brand" />
                            {ageLabel(g.ageMin, g.ageMax)}
                          </span>
                        )}
                        {g.level && <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#fff1d2] text-[#7a4b00] shadow-sm">{levelLabel[g.level]}</span>}
                      </div>
                    </div>
                    <div className="px-3.5 pt-4 pb-3 flex flex-col gap-3 flex-1">
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-paper border border-line">{weekdayName(g.dayOfWeek, locale)}</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper border border-line font-mono text-[11px]" dir="ltr">
                          <Clock className="w-3 h-3" />
                          {g.timeSlot}
                        </span>
                      </div>
                      <h3 className="font-display text-[1.45rem] font-semibold text-heading leading-snug">{g.name}</h3>
                      {g.description && <p className="text-sm text-muted leading-relaxed">{g.description}</p>}
                      {g.room && (
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                          <MapPin className="w-3.5 h-3.5 text-brand" />
                          {g.room}
                        </p>
                      )}
                      <div className="mt-auto pt-4 border-t border-dashed border-line flex items-end justify-between gap-3">
                        <div>
                          <span className="font-display text-3xl font-semibold text-brand">{g.pricePerMonth}</span>{' '}
                          <span className="text-xs font-semibold text-muted">{t('perMonth')}</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 font-hand text-xl text-heading/70">
                          <Cpu className="w-4 h-4 text-brand/70" />
                          {t('kitIncluded')}
                        </span>
                      </div>
                      <button onClick={goRegister} className="pill-primary w-full justify-center py-3 text-sm">
                        {t('registerChild')}
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </button>
                      {canBookTrial && trialReachable && (
                        <button
                          onClick={() => goTrial(g.name)}
                          className="pill-outline w-full justify-center py-2.5 text-sm"
                        >
                          {t('tryFree')}
                        </button>
                      )}
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      )}

      {/* 4. COACHES */}
      {show('coaches') && coaches.length > 0 && (
        <section id="coaches" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <Reveal>
            <SectionTitle kicker={t('coachesEyebrow')} title={t('coachesTitle')} text={t('coachesText')} />
          </Reveal>
          <div className="flex flex-wrap justify-center gap-6">
            {coaches.map((c, i) => (
              <Reveal key={c.name + i} delay={Math.min(i, 6) * 0.06} y={20} className="w-[calc(50%-0.75rem)] sm:w-60">
                <div className={`h-full rounded-[28px] ${COACH_BG[i % COACH_BG.length]} p-6 text-center`}>
                  <div className="mx-auto w-fit rounded-full border-2 border-dashed border-brand/40 p-1.5">
                    {c.photo ? (
                      <img src={c.photo} alt="" loading="lazy" decoding="async" width={112} height={112} className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white" />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white text-brand grid place-items-center font-display text-3xl font-semibold" aria-hidden="true">
                        {c.name.trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold text-heading leading-tight">{c.name}</h3>
                  {c.role && <p className="mt-1 text-sm text-muted">{c.role}</p>}
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 5. MINI GAME: program the robot with blocks */}
      {show('game') && (
        <section id="game" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <Reveal>
            <SectionTitle kicker={t('gameEyebrow')} title={t('gameTitle')} text={t('gameText')} />
          </Reveal>
          <Reveal>
            <CodeRobotGame onRegister={goRegister} />
          </Reveal>
        </section>
      )}

      {/* 6. NEXT CHALLENGE COUNTDOWN */}
      {show('countdown') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className={`relative overflow-hidden ${cardSoft} p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center`}>
              <div className="absolute inset-0 paper-dots opacity-40" aria-hidden="true" />
              <PanelScrews />
              <div className="relative lg:col-span-7 space-y-2">
                <p className="font-hand text-2xl text-brand leading-none">{t('nextEyebrow')}</p>
                <h3 className="font-display text-3xl font-semibold text-heading tracking-tight">{t('nextTitle')}</h3>
                <p className="text-sm text-muted">{t('nextText')}</p>
              </div>
              <div className="relative lg:col-span-5 flex items-center justify-center lg:justify-end gap-1.5 sm:gap-2 rounded-2xl bg-[#1d1316] px-3 sm:px-4 py-3 ring-4 ring-[#f1e4e7] shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)]" dir="ltr">
                {[
                  { v: timeLeft.days, l: t('days') },
                  { v: timeLeft.hours, l: t('hours') },
                  { v: timeLeft.minutes, l: t('mins') },
                  { v: timeLeft.seconds, l: t('secs') }
                ].map((unit, i) => (
                  <React.Fragment key={unit.l}>
                    {i > 0 && <span className="font-mono text-2xl text-[#ff6b81] led-blink">:</span>}
                    <div className="relative w-[3.9rem] sm:w-[4.4rem] py-2.5 rounded-xl bg-[#2a1b1f] text-center overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={unit.v}
                          initial={{ y: -12, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 12, opacity: 0 }}
                          className="block font-mono text-3xl font-semibold text-[#ff6b81] [text-shadow:0_0_12px_rgba(255,107,129,0.75)]"
                        >
                          {String(unit.v).padStart(2, '0')}
                        </motion.span>
                      </AnimatePresence>
                      <span className="font-mono text-[9px] font-semibold text-white/50 uppercase">{unit.l}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* 7. PHOTO TIMELINE: the albums of public/photos/timeline, year by year */}
      {show('timeline') && (
        <Suspense fallback={<div className="min-h-[760px] bg-cream" aria-hidden="true" />}>
          <TimelineSection t={t} onEnterMuseum={show('museum') ? goMuseum : undefined} />
        </Suspense>
      )}

      {/* 8. TESTIMONIALS */}
      {show('testimonials') && testimonials.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <Reveal>
            <SectionTitle kicker={t('testimonialsEyebrow')} title={t('testimonialsTitle')} />
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((q, i) => (
              <Reveal key={i} delay={Math.min(i, 5) * 0.08} y={20}>
                <figure className={`${cardSoft} p-7 space-y-4 h-full`}>
                  <Quote className="w-8 h-8 text-brand/40 rtl:-scale-x-100" aria-hidden="true" />
                  <blockquote className="font-display text-lg text-heading leading-relaxed">{pick(q.quote, lang)}</blockquote>
                  <figcaption className="text-sm">
                    <span className="font-hand text-xl text-brand">{q.author}</span>
                    {pick(q.role, lang) && <span className="text-muted"> · {pick(q.role, lang)}</span>}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 9. FAQ */}
      {show('faq') && faq.length > 0 && (
        <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24">
          <Reveal>
            <SectionTitle kicker={t('faqEyebrow')} title={t('faqTitle')} />
          </Reveal>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <details key={i} className="group rounded-3xl bg-white soft-shadow px-6 py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-display text-lg font-semibold text-heading [&::-webkit-details-marker]:hidden">
                  {pick(f.q, lang)}
                  <ChevronDown className="w-5 h-5 shrink-0 text-brand transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="pt-3 text-sm text-muted leading-relaxed whitespace-pre-line">{pick(f.a, lang)}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* 10. CONTACT: free trial request, WhatsApp / phone / email, map */}
      {show('contact') && hasContact && (
        <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {canBookTrial ? (
              <Reveal>
                <form onSubmit={sendTrial} className={`${cardSoft} p-6 sm:p-8 space-y-5 h-full`}>
                  <div className="space-y-2">
                    <p className="font-hand text-2xl text-brand leading-none">{t('contactEyebrow')}</p>
                    <h2 className="font-display text-3xl font-semibold text-heading tracking-tight">{t('contactTitle')}</h2>
                    <p className="text-sm text-muted">{t('contactText')}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs font-bold text-heading/80 space-y-1">
                      <span>{t('trialParent')}</span>
                      <input required autoComplete="name" value={trial.parent} onChange={(e) => setTrial({ ...trial, parent: e.target.value })} className={inputClass} />
                    </label>
                    <label className="block text-xs font-bold text-heading/80 space-y-1">
                      <span>{t('trialPhone')}</span>
                      <input required type="tel" dir="ltr" autoComplete="tel" value={trial.phone} onChange={(e) => setTrial({ ...trial, phone: e.target.value })} className={inputClass} />
                    </label>
                    <label className="block text-xs font-bold text-heading/80 space-y-1">
                      <span>{t('trialChild')}</span>
                      <input required value={trial.child} onChange={(e) => setTrial({ ...trial, child: e.target.value })} className={inputClass} />
                    </label>
                    <label className="block text-xs font-bold text-heading/80 space-y-1">
                      <span>{t('trialAge')}</span>
                      <input required type="number" min={3} max={22} inputMode="numeric" value={trial.age} onChange={(e) => setTrial({ ...trial, age: e.target.value })} className={inputClass} />
                    </label>
                  </div>
                  {groups.length > 0 && (
                    <label className="block text-xs font-bold text-heading/80 space-y-1">
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
                  <button type="submit" className="pill-primary w-full justify-center py-3.5 text-sm">
                    {contact.whatsapp ? <WhatsAppIcon className="w-5 h-5" /> : <Mail className="w-4 h-4" />}
                    {contact.whatsapp ? t('trialSend') : t('trialSendEmail')}
                  </button>
                </form>
              </Reveal>
            ) : null}

            <Reveal className={canBookTrial ? '' : 'lg:col-span-2'}>
              <div className={`${cardSoft} overflow-hidden h-full flex flex-col`}>
                <div className="p-6 sm:p-8 space-y-4">
                  {!canBookTrial && <h2 className="font-display text-3xl font-semibold text-heading tracking-tight">{t('contactEyebrow')}</h2>}
                  <div className="flex flex-wrap gap-2">
                    {waHref && (
                      <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25d366] text-white text-sm font-bold hover:brightness-95">
                        <WhatsAppIcon className="w-4 h-4" />
                        {t('whatsappUs')}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="pill-outline px-4 py-2 text-sm">
                        <Phone className="w-4 h-4" />
                        <span>{t('callUs')}</span>
                        <span dir="ltr">{contact.phone}</span>
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="pill-outline px-4 py-2 text-sm">
                        <Mail className="w-4 h-4" />
                        {t('emailUs')}
                      </a>
                    )}
                  </div>
                  <a href={mapsLink(site)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm font-semibold text-heading/80 hover:text-brand">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                    <span>
                      {[pick(address.street, lang), pick(address.city, lang)].filter(Boolean).join(', ')}
                      <span className="block text-xs text-brand font-bold">{t('openInMaps')}</span>
                    </span>
                  </a>
                  {pick(site.openingHours, lang) && (
                    <p className="flex items-start gap-2 text-sm font-semibold text-heading/80">
                      <Clock className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                      {pick(site.openingHours, lang)}
                    </p>
                  )}
                </div>
                {hasMap(site) && (
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

      {/* Contact page while no phone, WhatsApp, email or map is filled in: the Facebook page, the town and the hours */}
      {focus === 'contact' && !hasContact && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`${cardSoft} p-6 sm:p-8 space-y-4 text-center`}>
            {contact.facebook && (
              <a href={contact.facebook} target="_blank" rel="noopener noreferrer" className="pill-primary px-6 py-3 text-sm">
                <Facebook className="w-4 h-4" />
                {tp('contactFacebook')}
              </a>
            )}
            {pick(address.city, lang) && (
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-heading/80">
                <MapPin className="w-4 h-4 text-brand" />
                {[pick(address.street, lang), pick(address.city, lang)].filter(Boolean).join(', ')}
              </p>
            )}
            {pick(site.openingHours, lang) && (
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-heading/80">
                <Clock className="w-4 h-4 text-brand" />
                {pick(site.openingHours, lang)}
              </p>
            )}
          </div>
        </section>
      )}

      {/* 11. FINAL CALL TO ACTION */}
      {show('cta') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#d42a4b] via-brand to-[#8f1630] text-white px-8 py-16 sm:px-14 text-center soft-shadow-lg">
              <div className="absolute inset-0 paper-dots-light" aria-hidden="true" />
              <CircuitTraces light />
              <FloatingDoodles light />
              <RobotMascot className="hidden md:block absolute -bottom-10 end-10 w-36 lg:w-44 drop-shadow-[0_18px_24px_rgba(0,0,0,0.25)]" />
              <div className="relative max-w-2xl mx-auto space-y-5">
                <SparkDoodle className="mx-auto w-6 h-6 text-[#ffd27a] anim-twinkle" />
                <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">{t('ctaTitle')}</h2>
                <p className="text-white/85 text-lg">{t('ctaText')}</p>
                <button onClick={goRegister} className="pill-white px-9 py-4 text-sm">
                  <UserPlus className="w-4 h-4" />
                  {t('registerChild')}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </Reveal>
        </section>
      )}
    </div>
  );
};
