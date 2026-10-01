import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  Cpu,
  Trophy,
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
import { FacebookPost } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { INTRO_DELAY } from '../common/IntroReveal';
import { CircuitBackground, CodeTyper, CountUp, Gear, LogoMechanism, Oscilloscope, Reveal, RobotArm } from './RoboticsArt';


export const VisitorPortal: React.FC = () => {
  const {
    programs,
    events,
    toggleEventRegistration,
    navigateTo,
    showToast,
    facebookPosts,
    likeFacebookPost,
    addFacebookPost,
    addFacebookComment,
    currentUser
  } = useApp();

  const [activeProgramTab, setActiveProgramTab] = useState(programs[0]?.id || 'prog-robotics-starter');
  const [ageFilter, setAgeFilter] = useState<'all' | '6-9' | '10-13' | '14-17'>('all');

  const [postFilter, setPostFilter] = useState<string>('all');
  const [lightboxPost, setLightboxPost] = useState<FacebookPost | null>(null);
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
      showToast('Please select or upload a photo first', 'error');
      return;
    }
    if (!uploadCaption.trim()) {
      showToast('Please enter a caption for the photo', 'error');
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
    showToast('Photo successfully added to live feed and saved to database!', 'success');
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    await addFacebookComment(
      postId,
      commentInput,
      commentAuthor.trim() || currentUser?.displayName || 'Club Supporter'
    );
    setCommentInput('');

    // Keep active lightbox updated
    if (lightboxPost && lightboxPost.id === postId) {
      const updated = facebookPosts.find((p) => p.id === postId);
      if (updated) setLightboxPost(updated);
    }
  };

  // Filter programs based on selected age
  const filteredPrograms = programs.filter((p) => {
    if (ageFilter === 'all') return true;
    if (ageFilter === '6-9') return p.ageRange.includes('6-9') || p.ageRange.includes('6 to 9');
    if (ageFilter === '10-13') return p.ageRange.includes('10-14') || p.ageRange.includes('11-16');
    if (ageFilter === '14-17') return p.ageRange.includes('12-17') || p.ageRange.includes('11-16');
    return true;
  });

  const selectedProgram = programs.find((p) => p.id === activeProgramTab) || programs[0];

  const isAdmin = !!currentUser?.roles.includes('admin');
  const goRegister = () => navigateTo('register-parent');
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Rotating word in the hero headline
  const HERO_WORDS = ['robots', 'rovers', 'circuits', 'inventions'];
  const [heroWordIdx, setHeroWordIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHeroWordIdx((i) => (i + 1) % HERO_WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  // Photo conveyor belt: every club photo, linked to its post when there is one
  const beltPhotos = [
    { img: CLUB_PHOTOS.eurobotSpainChampions, title: 'Victoire Eurobot Junior', tag: '🏆 1ère Place' },
    { img: CLUB_PHOTOS.eurobotSpainTrophyCert, title: 'Trophée Don Quichotte', tag: '📜 Alcalá de Henares' },
    { img: CLUB_PHOTOS.robocupViennaMarxHalle, title: 'RoboCup Vienna', tag: '🇦🇹 Marx Halle' },
    { img: CLUB_PHOTOS.ministryHonorCeremony, title: 'Honneur Ministère', tag: '🇹🇳 Réception Officielle' },
    { img: CLUB_PHOTOS.robocupJuniorEgypt, title: 'RoboCup Egypt', tag: '🇪🇬 RoboCup Junior' },
    { img: CLUB_PHOTOS.odaRobots2ndPrize, title: 'ODA Robots', tag: '🥈 2ème Prix' },
    { img: CLUB_PHOTOS.eurobotSpainStage, title: 'Remise des prix', tag: '🎉 Eurobot Spain' },
    { img: CLUB_PHOTOS.eurobotJuniorTunisiaQualif, title: 'Qualifications Eurobot', tag: '🇹🇳 ATR · INSAT' },
    { img: CLUB_PHOTOS.istanbulAirportEuropeanChamp, title: 'En route pour l’Europe', tag: '✈️ Istanbul' },
    { img: CLUB_PHOTOS.robocupEgyptTeam, title: 'Équipe RoboCup', tag: '🤖 Égypte' },
    { img: CLUB_PHOTOS.nationsFlags, title: 'Drapeaux du monde', tag: '🌍 International' },
    { img: CLUB_PHOTOS.officialTrophyReception, title: 'Réception du trophée', tag: '🏅 Officiel' },
    { img: CLUB_PHOTOS.internationalFriendsThailand, title: 'Amis de Thaïlande', tag: '🤝 Amitié' },
    { img: CLUB_PHOTOS.airportDepartureTunis, title: 'Départ de Tunis', tag: '✈️ Tunis-Carthage' },
    { img: CLUB_PHOTOS.airportDeparturePalestine, title: 'Toute la délégation', tag: '🇹🇳 Ensemble' }
  ].map((p) => ({ ...p, post: facebookPosts.find((fp) => fp.imageUrl === p.img) }));

  const stats = [
    { value: CLUB_STATS.activeStudents, suffix: '+', label: 'Young builders' },
    { value: CLUB_STATS.workshopsCompleted, suffix: '+', label: 'Workshops run' },
    { value: CLUB_STATS.projectsBuilt, suffix: '+', label: 'Robots built' },
    { value: CLUB_STATS.competitionsWon, suffix: '', label: 'Trophies won' }
  ];

  const steps = [
    {
      n: '01',
      title: 'Build',
      text: 'Gears, motors and chassis: kids assemble real mechanisms with their own hands.',
      art: (
        <div className="relative w-[190px] h-full mx-auto">
          <Gear size={104} teeth={16} duration={16} color="#c11e3d" className="absolute left-[8px] top-[4px]" />
          <Gear size={68} teeth={10} duration={10} reverse color="#191919" windows={4} className="absolute left-[100px] top-[6px]" />
        </div>
      )
    },
    {
      n: '02',
      title: 'Wire',
      text: 'Breadboards, sensors and LEDs: they learn how electricity really flows.',
      art: <Oscilloscope className="w-full h-full" />
    },
    {
      n: '03',
      title: 'Code',
      text: 'Arduino, ESP32 and Python bring every robot to life, line by line.',
      art: <CodeTyper className="w-full h-full" />
    },
    {
      n: '04',
      title: 'Compete',
      text: 'From Manouba to Eurobot and RoboCup podiums across the world.',
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
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-sky-600/25 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-48 right-0 w-[560px] h-[560px] rounded-full bg-sky-900/40 blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-7">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: INTRO_DELAY }}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-black tracking-wide backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-sky-500 led-blink" />
                  🏆 Eurobot Junior 2026 · 1st place in Spain
                </span>
                <a
                  href="https://www.facebook.com/DiscoveryClubJunior/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <img src={CLUB_PHOTOS.clubLogo} alt="" className="w-4 h-4 rounded-full bg-white object-contain" />
                  @DiscoveryClubJunior · 4,200+ fans
                </a>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: INTRO_DELAY + 0.1 }}
                className="text-4xl sm:text-5xl lg:text-[4.2rem] font-black tracking-tight leading-[1.05]"
              >
                Where kids build <br className="hidden sm:inline" />
                real{' '}
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
                <br />
                <span className="text-white/90">and dream big.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: INTRO_DELAY + 0.25 }}
                className="text-base sm:text-lg text-white/65 font-medium leading-relaxed max-w-xl"
              >
                Discovery Club Junior is Manouba’s hands-on robotics, electronics and coding club. Kids and teens design,
                wire and program real robots, and take them to international competitions.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: INTRO_DELAY + 0.4 }}
                className="flex flex-wrap items-center gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={goRegister}
                  className="px-8 py-4 btn-duo-green text-sm font-black flex items-center gap-2.5 cursor-pointer shadow-[0_10px_40px_-8px_rgba(193,30,61,0.7)]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register your child</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => scrollToSection('programs')}
                  className="px-7 py-4 rounded-2xl border-2 border-white/20 text-sm font-black text-white hover:bg-white/10 hover:border-white/40 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>Explore programs</span>
                </motion.button>
              </motion.div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-white/50">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-sky-500" /> Manouba, Tunisia</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-sky-500" /> Real hardware from day one</span>
                <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-sky-500" /> International podiums</span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: INTRO_DELAY + 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5 py-6"
            >
              <LogoMechanism logoSrc={CLUB_PHOTOS.clubLogo} />
            </motion.div>
          </div>

          {/* live counters */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={INTRO_DELAY + 0.5 + i * 0.08} y={20}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur px-5 py-4 hover:border-sky-500/60 hover:bg-white/[0.07] transition-colors">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white">
                    <CountUp to={s.value} suffix={s.suffix} delay={INTRO_DELAY + 0.5} />
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
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Moments en direct</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">From the workshop to the world stage</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter une photo</span>
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
                <div className="absolute bottom-3 left-3 right-3 text-left text-white">
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
          <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">How we learn</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">From the first gear to the podium</h2>
          <p className="text-sm text-slate-600 font-medium">
            No passive screen time. Every session ends with something that moves, blinks or beeps.
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
                <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">Inside the lab</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Real hardware, <span className="text-sky-500">real engineering</span>
                </h2>
                <p className="text-sm text-white/65 font-medium leading-relaxed">
                  Our makers work with the same parts engineers use: microcontrollers, servo motors, sensors and 3D-printed
                  mechanisms. Parents follow every step from their own account: attendance, trainer marks out of 20 and remarks.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Arduino', 'ESP32', 'Servo motors', 'Ultrasonic sensors', 'Infrared', '3D printing', 'C++', 'Python', 'Computer vision'].map((t, i) => (
                    <motion.span
                      key={t}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-black font-mono text-white/80 hover:border-sky-500 hover:text-white transition-colors"
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <Bot className="w-5 h-5 text-sky-400 mb-2" />
                    <h4 className="text-sm font-black">100% hands-on</h4>
                    <p className="text-xs text-white/55 font-medium">Every kid gets their own kit and builds from day one.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <HeartHandshake className="w-5 h-5 text-sky-400 mb-2" />
                    <h4 className="text-sm font-black">Parents in the loop</h4>
                    <p className="text-xs text-white/55 font-medium">Attendance, marks and remarks in the parent portal.</p>
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
              <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Next international challenge</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Eurobot Junior 2026 qualification round</h3>
              <p className="text-sm text-slate-600 font-medium">Our young engineers are building autonomous rovers for the championship arena.</p>
            </div>
            <div className="lg:col-span-4 flex items-center justify-center lg:justify-end gap-2 font-mono">
              {[
                { v: timeLeft.days, l: 'Days' },
                { v: timeLeft.hours, l: 'Hours' },
                { v: timeLeft.minutes, l: 'Mins' },
                { v: timeLeft.seconds, l: 'Secs' }
              ].map((t, i) => (
                <React.Fragment key={t.l}>
                  {i > 0 && <span className="text-xl font-black text-sky-600 led-blink">:</span>}
                  <div className="relative w-16 py-3 rounded-2xl bg-[#191919] text-center shadow-lg overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={t.v}
                        initial={{ y: -12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        className="block text-2xl font-black text-white"
                      >
                        {String(t.v).padStart(2, '0')}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-[10px] font-bold text-white/45 uppercase font-sans">{t.l}</span>
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
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Hall of fame</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              A garage club that became a podium team
            </h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Based in Manouba with partners across Tunis, our club turns curious kids into confident makers, one robot at a time.
            </p>
            <div className="relative rounded-3xl overflow-hidden shadow-xl">
              <img src={CLUB_PHOTOS.eurobotSpainChampions} alt="Eurobot champions" className="w-full h-56 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#191919]/85 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <div className="text-xs font-black text-amber-300 uppercase">Eurobot Spain Junior</div>
                <div className="text-lg font-black">1st place · “Discovery 2”</div>
              </div>
            </div>
          </Reveal>

          <div className="lg:col-span-7 relative pl-8">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />
            <motion.div
              className="absolute left-3 top-2 w-0.5 bg-sky-600 origin-top"
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
                    <span className="absolute -left-[26px] top-5 w-4 h-4 rounded-full bg-white border-4 border-sky-600 shadow" />
                    <motion.div whileHover={{ x: 6 }} className="duo-card p-5 bg-white">
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

      {/* 7. PROGRAMS WITH AGE FILTER */}
      <section id="programs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Reveal className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{programs.length} hands-on pathways</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Pick a robotics learning track</h2>
          <p className="text-sm text-slate-600 font-medium">Filter by age to find the right match for your future engineer.</p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { id: 'all', label: 'All tracks' },
              { id: '6-9', label: 'Starter · 6-9' },
              { id: '10-13', label: 'Junior · 10-13' },
              { id: '14-17', label: 'Senior · 14+' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAgeFilter(f.id as typeof ageFilter)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  ageFilter === f.id ? 'btn-duo-green' : 'btn-duo-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPrograms.map((prog, i) => (
              <motion.div
                layout
                key={prog.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -8 }}
                onClick={() => setActiveProgramTab(prog.id)}
                className={`duo-card group relative overflow-hidden p-6 bg-white flex flex-col justify-between gap-5 cursor-pointer ${
                  activeProgramTab === prog.id ? '!border-sky-600 ring-4 ring-sky-100' : ''
                }`}
              >
                <Gear
                  teeth={14}
                  duration={20}
                  color="#c11e3d"
                  windows={4}
                  className="absolute -top-8 -right-8 w-28 h-28 opacity-[0.07] group-hover:opacity-20 transition-opacity"
                />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-black">{prog.ageRange}</span>
                    <span className="text-xs font-mono font-black text-slate-400">{prog.duration.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">{prog.title}</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{prog.description}</p>
                </div>
                <div className="relative pt-4 border-t-2 border-slate-100 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black text-slate-900 font-mono">
                      {prog.pricePerMonth} <span className="text-xs font-bold text-slate-400">DT/mo</span>
                    </div>
                    <span className="text-xs font-bold text-sky-700">Kit included</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goRegister();
                    }}
                    className="w-full py-3 btn-duo-green text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Register your child</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {selectedProgram && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedProgram.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="duo-card p-6 sm:p-8 bg-white space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Curriculum preview</span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">{selectedProgram.title}: the journey</h3>
                </div>
                <button onClick={goRegister} className="px-6 py-3 btn-duo-blue text-xs font-black flex items-center gap-2 cursor-pointer self-start sm:self-auto">
                  <span>Register your child</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedProgram.syllabus.map((item, i) => (
                  <motion.div
                    key={item.week}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2 hover:border-sky-300 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-black text-sky-600">Week {item.week}</span>
                      <span className="w-2 h-2 rounded-full bg-sky-500 led-blink" />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.description}</p>
                    <div className="pt-2 border-t border-slate-200 text-[10px] font-bold text-slate-600">
                      Hardware: <span className="text-sky-700">{item.hardware}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </section>

      {/* 8. OFFICIAL FACEBOOK FEED & PHOTO GALLERY */}
      <section id="facebook-feed" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black uppercase mb-1">
              <span>📱 Page Officielle Facebook · En Direct</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Actualités & Photos de Discovery Club Junior
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Plus de 4 200 parents et passionnés suivent nos ateliers de robotique à Manouba !
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
                <span>Ajouter une photo</span>
              </button>
            )}

            <a
              href="https://www.facebook.com/DiscoveryClubJunior/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 btn-duo-blue text-xs font-black flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Page Facebook</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `Tous les posts (${facebookPosts.length})` },
            { id: 'champions', label: '🏆 Eurobot Champions' },
            { id: 'workshops', label: '🛠️ Ateliers Manouba' },
            { id: 'girls', label: '👧 Girls in Tech' },
            { id: 'hoodies', label: '👕 Les Capuches' },
            { id: 'ia', label: '🧠 IA & Vision' }
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
          {filteredFacebookPosts.map((post) => {
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
                    title="Cliquer pour agrandir la photo"
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/15 group-hover:bg-slate-950/0 transition-colors" />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/85 text-white backdrop-blur-xs font-black text-[10px]">
                      {post.tag}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      🔍 Agrandir
                    </div>
                  </div>
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>{post.date}</span>
                      <span className="text-sky-600 font-mono text-[10px]">Firestore Live Synced</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-3">
                      {post.caption}
                    </p>

                    {/* Recent comments preview */}
                    {post.commentsList && post.commentsList.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Dernier commentaire:</span>
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
                      title={isLiked ? 'Je n’aime plus' : 'J’aime ce post'}
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
                    <span>Voir sur Facebook</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

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
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="overflow-y-auto space-y-4 pr-1">
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
                        <span>{lightboxPost.likes} J'aime</span>
                      </button>

                      <span className="text-xs font-bold text-slate-400">
                        💬 {lightboxPost.comments} commentaires
                      </span>
                    </div>

                    <a
                      href={lightboxPost.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-sky-600 flex items-center gap-1 hover:underline"
                    >
                      <span>Post original sur Facebook</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Real-time Comments List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-700 uppercase">Commentaires de la communauté:</h4>
                    {lightboxPost.commentsList && lightboxPost.commentsList.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
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
                      <p className="text-xs text-slate-400 italic">Soyez le premier à commenter ce post !</p>
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
                        placeholder="Votre nom (ex: Parent, Visiteur...)"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-sky-400"
                      />
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Écrire un mot d'encouragement aux élèves..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-medium focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 btn-duo-blue text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publier</span>
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
                      Ajouter Vos Photos au Feed
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                  {/* File Upload Box */}
                  <div>
                    <label className="block mb-1.5">Choisir une image depuis votre appareil :</label>
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
                        Cliquez pour parcourir vos fichiers
                      </div>
                      <span className="text-[10px] text-slate-400">
                        PNG, JPG, WEBP jusqu'à 5 Mo
                      </span>
                    </div>
                  </div>

                  {/* Or Paste URL */}
                  <div>
                    <label className="block mb-1">Ou collez une URL d'image :</label>
                    <input
                      type="text"
                      placeholder="https://... photo URL"
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
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setUploadImagePreview('')}
                        className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white rounded-lg text-[10px] font-bold"
                      >
                        Changer
                      </button>
                    </div>
                  )}

                  {/* Tag */}
                  <div>
                    <label className="block mb-1">Catégorie :</label>
                    <select
                      value={uploadTag}
                      onChange={(e) => setUploadTag(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                    >
                      <option value="🏆 Eurobot Champions">🏆 Eurobot Champions</option>
                      <option value="🇹🇳 Honneur National">🇹🇳 Honneur National</option>
                      <option value="🌍 Tournoi International">🌍 Tournoi International</option>
                      <option value="🛠️ Ateliers Manouba">🛠️ Ateliers Manouba</option>
                      <option value="👧 Girls in Tech">👧 Girls in Tech</option>
                      <option value="👕 Les Capuches">👕 Les Capuches</option>
                      <option value="🧠 IA & Vision">🧠 IA & Vision</option>
                    </select>
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block mb-1">Description / Légende *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Décrivez cette photo..."
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
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 btn-duo-green text-xs font-black cursor-pointer"
                    >
                      Publier la photo
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* 9. LES CAPUCHES HOODIES */}
      <Reveal>
      <section id="hoodies" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="duo-card duo-card-glow-blue p-8 sm:p-10 bg-white border-2 border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase">
                <span>👕 Official Club Merchandise</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                “Les Capuches” Discovery Junior
              </h2>

              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                The signature dark navy & burgundy hoodie worn by our Eurobot world champions and Saturday makers! Personalized with the student’s embroidered name badge and club member ID.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => navigateTo('parent')}
                  className="px-6 py-3.5 btn-duo-yellow text-xs font-black flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Order in Parent Portal (32 DT)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-xs font-bold text-slate-500">
                  ⚡ Custom embroidery badge (+6 DT)
                </div>
              </div>
            </div>

            {/* Real photo of the hoodie crew */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden border-4 border-slate-100 shadow-xl group">
                <img
                  src={CLUB_PHOTOS.teamInClubColors}
                  alt="Students wearing Discovery Junior Hoodies"
                  className="w-full h-72 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-xs font-black text-amber-300 uppercase">Official Delivery Day</span>
                  <h4 className="text-sm font-black">Nos élèves fiers de porter l'uniforme officiel du club</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </Reveal>

      {/* 10. UPCOMING EVENTS */}
      <Reveal>
      <section id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-black uppercase mb-1">
              <span>📅 Tournaments & Challenges</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Upcoming Club Events & Hackathons
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
                  <span className="text-emerald-600 font-mono">{evt.spotsLeft} spots left</span>
                </div>

                <button
                  onClick={() => toggleEventRegistration(evt.id)}
                  className={`w-full py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    evt.isRegistered ? 'btn-duo-secondary text-slate-600' : 'btn-duo-purple'
                  }`}
                >
                  {evt.isRegistered ? 'Registered (Click to cancel)' : 'RSVP for Event'}
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
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Ready to build the future?</h2>
              <p className="text-white/75 font-medium">
                Create your parent account in one minute, add all your children, and we’ll place each one in the right class.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={goRegister}
                className="inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl bg-white text-sky-700 font-black text-sm shadow-xl cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Register your child
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
