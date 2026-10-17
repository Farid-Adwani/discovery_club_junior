import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  Cpu,
  Trophy,
  Globe2,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Zap,
  Users,
  BookOpen,
  MessageCircle,
  Share2,
  Sparkles,
  HeartHandshake,
  UserPlus,
  LogIn,
  Star,
  Award,
  Smile,
  Flame,
  Heart,
  Volume2,
  Send,
  Eye,
  Camera,
  Plus,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { CLUB_STATS, CLUB_ACHIEVEMENTS_TIMELINE, CLUB_PHOTOS } from '../../data/initialData';
import { CLASS_DEFAULT_IMAGE, FacebookPost, WEEK_DAYS, WeekDay } from '../../types';
import { weekdayName } from '../../utils/schedule';
import { CATEGORY_EMOJI } from '../../utils/shop';
import { motion, AnimatePresence } from 'motion/react';
import { getIntroDelay } from '../common/IntroReveal';
import { CircuitBackground, CodeTyper, CountUp, Gear, Oscilloscope, Reveal, RobotArm } from './RoboticsArt';
import { HeroCollage } from './HeroCollage';
import { useT, useLanguage } from '../../i18n';
import { visitorMessages } from '../../i18n/messages/visitor';


export const VisitorPortal: React.FC = () => {
  // Wait for the start-up intro only when it is playing right now
  const [introDelay] = useState(getIntroDelay);
  const {
    groups,
    events,
    toggleEventRegistration,
    navigateTo,
    showToast,
    facebookPosts,
    likeFacebookPost,
    addFacebookPost,
    addFacebookComment,
    currentUser,
    products
  } = useApp();
  const t = useT(visitorMessages);
  const { dir, locale } = useLanguage();
  // Admins receive hidden products too; the public page only shows what is on sale
  const productsOnSale = products.filter((p) => p.isActive);

  const [dayFilter, setDayFilter] = useState<'all' | WeekDay>('all');

  const [postFilter, setPostFilter] = useState<string>('all');
  const [lightboxPost, setLightboxPost] = useState<FacebookPost | null>(null);
  // The feed starts with 6 posts so the page doesn't end in a very long list
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');

  // Upload Photo Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadTag, setUploadTag] = useState('🛠️ Ateliers Manouba');
  const [uploadImagePreview, setUploadImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter Facebook posts based on selected category
  const filteredFacebookPosts = facebookPosts.filter((p) => {
    if (postFilter === 'all') return true;
    if (postFilter === 'champions') return p.tag.includes('Eurobot') || p.tag.includes('Champions');
    if (postFilter === 'workshops') return p.tag.includes('Atelier') || p.tag.includes('Makers') || p.tag.includes('Sciences');
    if (postFilter === 'girls') return p.tag.includes('Girls');
    if (postFilter === 'hoodies') return p.tag.includes('Capuches');
    if (postFilter === 'ia') return p.tag.includes('IA') || p.tag.includes('Vision');
    return true;
  });

  // Dynamic countdown timer to next STEM Olympiad
  const [timeLeft, setTimeLeft] = useState({
    days: 38,
    hours: 14,
    minutes: 22,
    seconds: 45
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadImagePreview) {
      showToast(t('toastSelectPhoto'), 'error');
      return;
    }
    if (!uploadCaption.trim()) {
      showToast(t('toastEnterCaption'), 'error');
      return;
    }

    await addFacebookPost({
      caption: uploadCaption.trim(),
      date: 'À l’instant',
      imageUrl: uploadImagePreview,
      tag: uploadTag,
      postUrl: 'https://www.facebook.com/DiscoveryClubJunior/'
    });

    setIsUploadModalOpen(false);
    setUploadCaption('');
    setUploadImagePreview('');
    showToast(t('toastPhotoAdded'), 'success');
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    await addFacebookComment(
      postId,
      commentInput,
      commentAuthor.trim() || currentUser?.displayName || t('defaultCommentAuthor')
    );
    setCommentInput('');

    // Keep active lightbox updated
    if (lightboxPost && lightboxPost.id === postId) {
      const updated = facebookPosts.find((p) => p.id === postId);
      if (updated) setLightboxPost(updated);
    }
  };

  // Public classes, sorted by day of the week then start time
  const classDays = WEEK_DAYS.filter((d) => groups.some((g) => g.dayOfWeek === d));
  const shownClasses = groups
    .filter((g) => dayFilter === 'all' || g.dayOfWeek === dayFilter)
    .sort((a, b) => WEEK_DAYS.indexOf(a.dayOfWeek) - WEEK_DAYS.indexOf(b.dayOfWeek) || a.timeSlot.localeCompare(b.timeSlot));

  const isAdmin = !!currentUser?.roles.includes('admin');
  const goRegister = () => navigateTo('register-parent');
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Rotating word in the hero headline
  const HERO_WORDS = t('heroWords').split('|');
  const [heroWordIdx, setHeroWordIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setHeroWordIdx((i) => (i + 1) % HERO_WORDS.length), 2200);
    return () => clearInterval(timer);
  }, []);

  // Photo conveyor belt: every club photo, linked to its post when there is one
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
  ].map((p) => ({ ...p, post: facebookPosts.find((fp) => fp.imageUrl === p.img) }));

  const stats = [
    { value: CLUB_STATS.activeStudents, suffix: '+', label: t('statBuilders') },
    { value: CLUB_STATS.workshopsCompleted, suffix: '+', label: t('statWorkshops') },
    { value: CLUB_STATS.projectsBuilt, suffix: '+', label: t('statRobots') },
    { value: CLUB_STATS.competitionsWon, suffix: '', label: t('statTrophies') }
  ];

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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-7">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: introDelay }}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-black tracking-wide backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-sky-500 led-blink" />
                  {t('heroBadgeEurobot')}
                </span>
                <a
                  href="https://www.facebook.com/DiscoveryClubJunior/"
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
                transition={{ duration: 0.7, delay: introDelay + 0.1 }}
                className="text-4xl sm:text-5xl lg:text-[4.2rem] font-black tracking-tight leading-[1.05]"
              >
                {t('heroLine1')} <br className="hidden sm:inline" />
                {t('heroBeforeWord') && <>{t('heroBeforeWord')} </>}
                <span className="relative inline-flex overflow-hidden align-bottom text-sky-500 pb-1">
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
                transition={{ duration: 0.7, delay: introDelay + 0.25 }}
                className="text-base sm:text-lg text-white/65 font-medium leading-relaxed max-w-xl"
              >
                {t('heroIntro')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: introDelay + 0.4 }}
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

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-white/50">
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
                delay={introDelay}
                chips={[
                  { icon: <Trophy className="w-4 h-4 text-amber-500" />, text: t('chipTrophy') },
                  { icon: <Globe2 className="w-4 h-4 text-[#c11e3d]" />, text: t('chipWorld') },
                  { icon: <Users className="w-4 h-4 text-slate-700" />, text: t('chipAges') }
                ]}
              />
            </div>
          </div>

          {/* live counters */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={introDelay + 0.5 + i * 0.08} y={20}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur px-5 py-4 hover:border-sky-500/60 hover:bg-white/[0.07] transition-colors">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white">
                    <CountUp to={s.value} suffix={s.suffix} delay={introDelay + 0.5} />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/45 mt-1">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        {/* angled bottom edge */}
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="relative block w-full h-10 sm:h-14 text-[#f8fafc]" aria-hidden="true">
          <path d="M0 60 L0 30 L1440 0 L1440 60 Z" fill="currentColor" />
        </svg>
      </section>

      {/* 2. PHOTO CONVEYOR BELT */}
      <section className="-mt-16 space-y-5">
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{t('beltEyebrow')}</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('beltTitle')}</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addPhoto')}</span>
            </button>
          )}
        </Reveal>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="marquee-track flex w-max gap-4 py-2">
            {[...beltPhotos, ...beltPhotos].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => item.post && setLightboxPost(item.post)}
                className="group relative w-64 sm:w-72 h-44 sm:h-48 shrink-0 rounded-2xl overflow-hidden border-2 border-white shadow-lg cursor-pointer"
              >
                <img src={item.img} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#191919]/90 via-[#191919]/10 to-transparent" />
                <div className="absolute bottom-3 start-3 end-3 text-start text-white">
                  <span className="text-[10px] font-black text-amber-300 block truncate">{item.tag}</span>
                  <span className="text-sm font-black leading-tight block truncate">{item.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS: build, wire, code, compete */}
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

      {/* 4. ROBOT LAB: animated arm soldering a board */}
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
                <p className="text-sm text-white/65 font-medium leading-relaxed">
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
                    <p className="text-xs text-white/55 font-medium">{t('handsOnText')}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <HeartHandshake className="w-5 h-5 text-sky-400 mb-2" />
                    <h4 className="text-sm font-black">{t('parentsLoopTitle')}</h4>
                    <p className="text-xs text-white/55 font-medium">{t('parentsLoopText')}</p>
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

      {/* 5. NEXT CHALLENGE COUNTDOWN */}
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
                    <span className="text-[10px] font-bold text-white/45 uppercase font-sans">{unit.l}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* 6. HALL OF FAME TIMELINE */}
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
              <img src={CLUB_PHOTOS.eurobotSpainChampions} alt={t('fameImgAlt')} className="w-full h-56 object-cover" />
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
              {CLUB_ACHIEVEMENTS_TIMELINE.map((item, idx) => (
                <Reveal key={idx} delay={idx * 0.1} y={24}>
                  <div className="relative">
                    <span className="absolute -start-[26px] top-5 w-4 h-4 rounded-full bg-white border-4 border-sky-600 shadow" />
                    <motion.div whileHover={{ x: dir === 'rtl' ? -6 : 6 }} className="duo-card p-5 bg-white">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2.5 py-1 rounded-lg bg-[#191919] text-white text-xs font-mono font-black">{item.year}</span>
                        <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">{item.description}</p>
                    </motion.div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. CLASSES WITH DAY FILTER (the section keeps its "programs" anchor for the menu links) */}
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
          <p className="py-12 text-center text-sm font-medium text-slate-400 rounded-3xl border-2 border-dashed border-slate-200">{t('noClasses')}</p>
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
                          {g.pricePerMonth} <span className="text-xs font-bold text-slate-400">{t('perMonth')}</span>
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
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* 8. OFFICIAL FACEBOOK FEED & PHOTO GALLERY */}
      <section id="facebook-feed" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black uppercase mb-1">
              <span>{t('fbBadge')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t('fbTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {t('fbText')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Only admins can publish photos */}
            {isAdmin && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-3 btn-duo-green text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addPhoto')}</span>
              </button>
            )}

            <a
              href="https://www.facebook.com/DiscoveryClubJunior/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 btn-duo-blue text-xs font-black flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>{t('fbPage')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: t('filterAll', { count: facebookPosts.length }) },
            { id: 'champions', label: t('filterChampions') },
            { id: 'workshops', label: t('filterWorkshops') },
            { id: 'girls', label: t('filterGirls') },
            { id: 'hoodies', label: t('filterHoodies') },
            { id: 'ia', label: t('filterIa') }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setPostFilter(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                postFilter === cat.id ? 'btn-duo-blue' : 'btn-duo-secondary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Facebook Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(showAllPosts ? filteredFacebookPosts : filteredFacebookPosts.slice(0, 6)).map((post) => {
            const userKey = currentUser?.uid || 'guest-visitor';
            const isLiked = post.likedBy?.includes(userKey);

            return (
              <motion.div
                key={post.id}
                whileHover={{ y: -6 }}
                className="duo-card duo-card-glow-blue overflow-hidden bg-white flex flex-col justify-between"
              >
                <div>
                  <div
                    onClick={() => setLightboxPost(post)}
                    className="overflow-hidden h-56 relative group cursor-pointer"
                    title={t('clickToEnlarge')}
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/15 group-hover:bg-slate-950/0 transition-colors" />
                    <div className="absolute top-3 end-3 px-2.5 py-1 rounded-full bg-slate-900/85 text-white backdrop-blur-xs font-black text-[10px]">
                      {post.tag}
                    </div>
                    <div className="absolute bottom-3 end-3 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {t('enlarge')}
                    </div>
                  </div>
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>{post.date}</span>
                      <span className="text-sky-600 font-mono text-[10px]">{t('liveSynced')}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-3">
                      {post.caption}
                    </p>

                    {/* Recent comments preview */}
                    {post.commentsList && post.commentsList.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">{t('lastComment')}</span>
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl">
                          <span className="font-bold text-slate-800">{post.commentsList[post.commentsList.length - 1].author}: </span>
                          <span>{post.commentsList[post.commentsList.length - 1].text}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 flex items-center justify-between border-t-2 border-slate-100 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-3">
                    {/* Interactive Like Button connected to real Firestore */}
                    <button
                      onClick={() => likeFacebookPost(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isLiked
                          ? 'bg-rose-100 text-rose-600 font-black scale-105'
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                      title={isLiked ? t('unlike') : t('like')}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                      <span>{post.likes}</span>
                    </button>

                    <button
                      onClick={() => setLightboxPost(post)}
                      className="flex items-center gap-1 text-slate-500 hover:text-sky-600 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.comments}</span>
                    </button>
                  </div>

                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:underline font-black text-[11px] flex items-center gap-1"
                  >
                    <span>{t('viewOnFacebook')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
        {filteredFacebookPosts.length > 6 && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAllPosts((v) => !v)}
              className="px-6 py-3 btn-duo-secondary text-sm font-black flex items-center gap-2 cursor-pointer"
            >
              {showAllPosts ? t('showLessPosts') : t('showMorePosts', { count: filteredFacebookPosts.length - 6 })}
            </button>
          </div>
        )}

        {/* Lightbox Photo Preview & Interactive Commenting Modal */}
        <AnimatePresence>
          {lightboxPost && (
            <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="duo-card max-w-3xl w-full bg-white overflow-hidden shadow-2xl space-y-4 p-6 max-h-[90vh] flex flex-col"
              >
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-sky-600 uppercase">{lightboxPost.tag}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs font-bold text-slate-400">{lightboxPost.date}</span>
                  </div>
                  <button
                    onClick={() => setLightboxPost(null)}
                    aria-label={t('close')}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="overflow-y-auto space-y-4 pe-1">
                  {/* High-res Photo */}
                  <div className="overflow-hidden rounded-2xl max-h-[50vh] bg-slate-100 flex items-center justify-center">
                    <img
                      src={lightboxPost.imageUrl}
                      alt={lightboxPost.caption}
                      className="w-full h-full object-contain max-h-[50vh] rounded-2xl"
                    />
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                    {lightboxPost.caption}
                  </p>

                  {/* Actions & Likes */}
                  <div className="flex items-center justify-between py-2 border-y-2 border-slate-100">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => likeFacebookPost(lightboxPost.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                          lightboxPost.likedBy?.includes(currentUser?.uid || 'guest-visitor')
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-current text-rose-500" />
                        <span>{t('likesCount', { count: lightboxPost.likes })}</span>
                      </button>

                      <span className="text-xs font-bold text-slate-400">
                        {t('commentsCount', { count: lightboxPost.comments })}
                      </span>
                    </div>

                    <a
                      href={lightboxPost.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-sky-600 flex items-center gap-1 hover:underline"
                    >
                      <span>{t('originalPost')}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Real-time Comments List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-700 uppercase">{t('communityComments')}</h4>
                    {lightboxPost.commentsList && lightboxPost.commentsList.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pe-1">
                        {lightboxPost.commentsList.map((c) => (
                          <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-slate-800">{c.author}</span>
                              <span className="text-[10px] text-slate-400">{c.date}</span>
                            </div>
                            <p className="text-slate-600">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">{t('beFirstComment')}</p>
                    )}
                  </div>

                  {/* Comment Input Form */}
                  <form
                    onSubmit={(e) => handleCommentSubmit(e, lightboxPost.id)}
                    className="pt-2 space-y-2"
                  >
                    {!currentUser && (
                      <input
                        type="text"
                        placeholder={t('namePlaceholder')}
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-sky-400"
                      />
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('commentPlaceholder')}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-medium focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 btn-duo-blue text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{t('publish')}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Upload User Photo Modal */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="duo-card max-w-lg w-full bg-white overflow-hidden shadow-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-black text-slate-800">
                      {t('uploadTitle')}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    aria-label={t('close')}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                  {/* File Upload Box */}
                  <div>
                    <label className="block mb-1.5">{t('chooseImage')}</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 flex flex-col items-center justify-center gap-2"
                    >
                      <Upload className="w-8 h-8 text-slate-400" />
                      <div className="font-black text-slate-700">
                        {t('browseFiles')}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {t('fileLimits')}
                      </span>
                    </div>
                  </div>

                  {/* Or Paste URL */}
                  <div>
                    <label className="block mb-1">{t('pasteUrl')}</label>
                    <input
                      type="text"
                      placeholder={t('urlPlaceholder')}
                      value={uploadImagePreview}
                      onChange={(e) => setUploadImagePreview(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:bg-white"
                    />
                  </div>

                  {/* Preview */}
                  {uploadImagePreview && (
                    <div className="h-40 rounded-2xl overflow-hidden border-2 border-slate-200 relative">
                      <img
                        src={uploadImagePreview}
                        alt={t('previewAlt')}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setUploadImagePreview('')}
                        className="absolute top-2 end-2 px-2 py-1 bg-black/70 text-white rounded-lg text-[10px] font-bold"
                      >
                        {t('change')}
                      </button>
                    </div>
                  )}

                  {/* Tag */}
                  <div>
                    <label className="block mb-1">{t('category')}</label>
                    <select
                      value={uploadTag}
                      onChange={(e) => setUploadTag(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                    >
                      <option value="🏆 Eurobot Champions">{t('tagChampions')}</option>
                      <option value="🇹🇳 Honneur National">{t('tagNational')}</option>
                      <option value="🌍 Tournoi International">{t('tagInternational')}</option>
                      <option value="🛠️ Ateliers Manouba">{t('tagWorkshops')}</option>
                      <option value="👧 Girls in Tech">{t('tagGirls')}</option>
                      <option value="👕 Les Capuches">{t('tagHoodies')}</option>
                      <option value="🧠 IA & Vision">{t('tagIa')}</option>
                    </select>
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block mb-1">{t('captionLabel')}</label>
                    <textarea
                      rows={3}
                      required
                      placeholder={t('captionPlaceholder')}
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="px-4 py-2 btn-duo-secondary text-xs font-bold cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 btn-duo-green text-xs font-black cursor-pointer"
                    >
                      {t('publishPhoto')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* 9. CLUB SHOP (only when the admin has products on sale) */}
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
                    <p className="text-[11px] font-bold text-slate-400">{product.sizes.join(' · ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </Reveal>
      )}

      {/* 10. UPCOMING EVENTS */}
      <Reveal>
      <section id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-black uppercase mb-1">
              <span>{t('eventsBadge')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t('eventsTitle')}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((evt) => (
            <motion.div
              key={evt.id}
              whileHover={{ y: -4 }}
              className="duo-card p-6 bg-white space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
                    {evt.category}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{evt.date}</span>
                </div>

                <h3 className="text-base font-black text-slate-800 leading-snug">
                  {evt.title}
                </h3>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {evt.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>{evt.location.split(',')[0]}</span>
                  </span>
                  <span className="text-emerald-600 font-mono">{t('spotsLeft', { count: evt.spotsLeft })}</span>
                </div>

                <button
                  onClick={() => toggleEventRegistration(evt.id)}
                  className={`w-full py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    evt.isRegistered ? 'btn-duo-secondary text-slate-600' : 'btn-duo-purple'
                  }`}
                >
                  {evt.isRegistered ? t('registeredCancel') : t('rsvp')}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      </Reveal>
      {/* 11. FINAL CALL TO ACTION */}
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
    </div>
  );
};
