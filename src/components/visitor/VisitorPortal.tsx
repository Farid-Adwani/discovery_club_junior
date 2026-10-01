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

const MASCOT_MESSAGES = [
  "Hi there! Tap me anytime for robotics tips! 🤖",
  "Did you know our Eurobot rover has 4 ultrasonic sensors? 🚀",
  "Every student gets their own microcontrollers & servo kit! 🛠️",
  "We won 1st Place at Eurobot Junior 2026 in Spain! 🥇",
  "No boring theory! Kids build working rovers from Day 1! ⭐",
  "Manouba's friendliest tech family welcomes you! 🇹🇳"
];

export const VisitorPortal: React.FC = () => {
  const {
    programs,
    events,
    toggleEventRegistration,
    setSelectedProgramForWaitlist,
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
  const [mascotMessageIdx, setMascotMessageIdx] = useState(0);

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

  const cycleMascotMessage = () => {
    setMascotMessageIdx((prev) => (prev + 1) % MASCOT_MESSAGES.length);
  };

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

  const handleEnrollClick = (progId: string) => {
    setSelectedProgramForWaitlist(progId);
    navigateTo('waitlist');
  };

  return (
    <div className="space-y-20 pb-24 relative overflow-x-hidden">
      {/* 1. HERO SECTION WITH GLOW & ANIMATION */}
      <section className="relative pt-8 md:pt-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto section-glow-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headlines & 3D CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-800 text-xs font-black tracking-wide shadow-sm hover:scale-105 transition-transform cursor-pointer"
                onClick={cycleMascotMessage}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>🏆 Eurobot Junior 2026 World Champions · Admissions Open</span>
              </motion.div>

              {/* Official Facebook Verified Page Badge */}
              <a
                href="https://www.facebook.com/DiscoveryClubJunior/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black hover:bg-blue-100 transition-colors"
              >
                <img
                  src={CLUB_PHOTOS.realFbLogo}
                  alt="Discovery Club Junior Logo"
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span>@DiscoveryClubJunior · 4,200+ Fans</span>
              </a>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Where Kids Build <br className="hidden sm:inline" />
              <span className="text-sky-500 drop-shadow-sm">Real Robots</span> &{' '}
              <span className="text-emerald-500 drop-shadow-sm">Dream Big!</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-xl">
              Discovery Club Junior is Tunisia’s friendliest hands-on robotics, coding, and maker academy in Manouba for children and teens ages 6 to 17. No scary tech jargon — just pure hands-on fun! 🤖✨
            </p>

            {/* 3D Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedProgramForWaitlist('prog-robotics-starter');
                  navigateTo('waitlist');
                }}
                className="px-8 py-4 btn-duo-green text-sm font-black flex items-center gap-2.5 cursor-pointer shadow-lg"
              >
                <span>Join Priority Waitlist 🚀</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigateTo('register-parent')}
                className="px-7 py-4 btn-duo-blue text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Parent Portal Registration</span>
              </motion.button>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-4 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer text-slate-700"
              >
                <Camera className="w-4 h-4 text-sky-500" />
                <span>+ Upload Photo</span>
              </button>
            </div>

            {/* Gamified Stat Badges with Dynamic Glowing Hover */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <motion.div
                whileHover={{ y: -6, scale: 1.04 }}
                className="duo-card duo-card-glow-blue p-4 text-center space-y-1 bg-white"
              >
                <div className="text-2xl sm:text-3xl font-black text-sky-600 font-mono">
                  {CLUB_STATS.activeStudents}+
                </div>
                <div className="text-xs font-black text-slate-500">Young Builders</div>
              </motion.div>

              <motion.div
                whileHover={{ y: -6, scale: 1.04 }}
                className="duo-card duo-card-glow-green p-4 text-center space-y-1 bg-white"
              >
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                  {CLUB_STATS.workshopsCompleted}+
                </div>
                <div className="text-xs font-black text-slate-500">Workshops Run</div>
              </motion.div>

              <motion.div
                whileHover={{ y: -6, scale: 1.04 }}
                className="duo-card duo-card-glow-yellow p-4 text-center space-y-1 bg-white"
              >
                <div className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
                  {CLUB_STATS.projectsBuilt}+
                </div>
                <div className="text-xs font-black text-slate-500">Robots Built</div>
              </motion.div>

              <motion.div
                whileHover={{ y: -6, scale: 1.04 }}
                className="duo-card duo-card-glow-purple p-4 text-center space-y-1 bg-white"
              >
                <div className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">
                  {CLUB_STATS.competitionsWon}
                </div>
                <div className="text-xs font-black text-slate-500">Trophies Won</div>
              </motion.div>
            </div>
          </div>

          {/* Right Column: Official Badge & Interactive Mascot */}
          <div className="lg:col-span-5 relative">
            <motion.div
              whileHover={{ y: -4 }}
              className="duo-card duo-card-glow-blue p-6 sm:p-8 bg-white text-center space-y-5 relative"
            >
              {/* Official Facebook Profile Picture Badge */}
              <div className="flex items-center justify-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <img
                  src={CLUB_PHOTOS.realFbLogo}
                  alt="Discovery Club Junior Official Profile Photo"
                  className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                />
                <div className="text-left">
                  <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <span>Discovery Club Junior</span>
                    <span className="text-sky-500">✓</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    Club de Robotique pour Enfants · Manouba
                  </div>
                </div>
              </div>

              {/* Mascot Image with breathing hover animation */}
              <div
                onClick={cycleMascotMessage}
                className="relative mx-auto w-40 h-40 sm:w-48 sm:h-48 cursor-pointer group"
                title="Click me for robotics fun facts!"
              >
                <motion.img
                  animate={{ y: [0, -8, 0], rotate: [0, 1, -1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.08 }}
                  src={CLUB_PHOTOS.duoJuniorMascot}
                  alt="Junior the Robot Mascot"
                  className="w-full h-full object-cover rounded-3xl border-4 border-sky-100 shadow-md group-hover:border-sky-300 transition-all"
                />
                <div className="absolute -bottom-2 -right-2 px-3 py-1.5 rounded-2xl bg-amber-400 text-amber-950 font-black text-xs shadow-md border-2 border-white flex items-center gap-1 group-hover:scale-110 transition-transform">
                  <span>⭐ Level 1 Junior</span>
                </div>
              </div>

              {/* Dynamic Speech Bubble that updates on click */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mascotMessageIdx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={cycleMascotMessage}
                  className="duo-speech-bubble text-center space-y-1 cursor-pointer hover:border-sky-400 transition-colors"
                >
                  <div className="text-xs font-black uppercase text-sky-600 flex items-center justify-center gap-1">
                    <span>Junior Speaks</span>
                    <span className="text-[10px] text-slate-400 font-bold">(tap to chat!)</span>
                  </div>
                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                    "{MASCOT_MESSAGES[mascotMessageIdx]}"
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <span>📍 Manouba Campus, Tunisia</span>
                <span>·</span>
                <span className="text-emerald-600 font-black">Ages 6 - 17</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. AUTHENTIC FACEBOOK PHOTO HIGHLIGHTS STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="duo-card p-6 bg-white border-2 border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-sky-500" />
              <h3 className="text-base font-black text-slate-800">
                Moments en Direct : Compétitions & Ateliers Discovery Junior
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter Vos Photos</span>
              </button>
              <span className="text-xs font-black text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                📸 Scraped from Facebook
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              {
                img: CLUB_PHOTOS.fbEurobotChamps,
                title: 'Victoire Eurobot Junior',
                tag: '🏆 1ère Place Mondiale',
                post: facebookPosts[0]
              },
              {
                img: CLUB_PHOTOS.fbTrophyCert,
                title: 'Trophée Don Quichotte',
                tag: '📜 Alcalá de Henares',
                post: facebookPosts[1]
              },
              {
                img: CLUB_PHOTOS.fbMinisterHonor,
                title: 'Honneur Ministère',
                tag: '🇹🇳 Réception Officielle',
                post: facebookPosts[2]
              },
              {
                img: CLUB_PHOTOS.fbViennaRobocup,
                title: 'RoboCup Vienna',
                tag: '🇦🇹 Marx Halle Vienne',
                post: facebookPosts[3]
              },
              {
                img: CLUB_PHOTOS.fbKidsRobotLab,
                title: 'Ateliers Enfants',
                tag: '🛠️ Lab Manouba',
                post: facebookPosts[4]
              },
              {
                img: CLUB_PHOTOS.fbGirlsStem,
                title: 'Girls in STEM',
                tag: '👧 Code & Capteurs',
                post: facebookPosts[5]
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05, y: -4 }}
                onClick={() => {
                  if (item.post) setLightboxPost(item.post);
                }}
                className="group relative rounded-2xl overflow-hidden cursor-pointer border-2 border-slate-200 shadow-sm h-32"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-90 group-hover:opacity-100" />
                <div className="absolute bottom-2 left-2 right-2 text-left text-white">
                  <span className="text-[9px] font-black text-amber-300 block truncate">{item.tag}</span>
                  <span className="text-[11px] font-black leading-tight block truncate">{item.title}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC STEM OLYMPIAD COUNTDOWN BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          className="duo-card duo-card-glow-yellow p-6 sm:p-8 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-300 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-3xl shadow-sm shrink-0">
              🏆
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-black uppercase mb-1">
                <span>Next International Challenge</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Eurobot Junior 2026 Qualification Round
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Our young engineers are building autonomous rovers for the international championship arena!
              </p>
            </div>
          </div>

          {/* Live Ticking Countdown */}
          <div className="flex items-center gap-2 font-mono shrink-0">
            <div className="p-3 bg-white rounded-2xl border-2 border-amber-200 border-b-4 border-b-amber-300 text-center min-w-[64px]">
              <span className="text-xl sm:text-2xl font-black text-slate-800">{timeLeft.days}</span>
              <span className="text-[10px] font-bold text-slate-400 block font-sans">DAYS</span>
            </div>
            <span className="text-xl font-black text-amber-400">:</span>
            <div className="p-3 bg-white rounded-2xl border-2 border-amber-200 border-b-4 border-b-amber-300 text-center min-w-[64px]">
              <span className="text-xl sm:text-2xl font-black text-slate-800">{timeLeft.hours}</span>
              <span className="text-[10px] font-bold text-slate-400 block font-sans">HOURS</span>
            </div>
            <span className="text-xl font-black text-amber-400">:</span>
            <div className="p-3 bg-white rounded-2xl border-2 border-amber-200 border-b-4 border-b-amber-300 text-center min-w-[64px]">
              <span className="text-xl sm:text-2xl font-black text-slate-800">{timeLeft.minutes}</span>
              <span className="text-[10px] font-bold text-slate-400 block font-sans">MINS</span>
            </div>
            <span className="text-xl font-black text-amber-400">:</span>
            <div className="p-3 bg-white rounded-2xl border-2 border-amber-200 border-b-4 border-b-amber-300 text-center min-w-[64px]">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">{timeLeft.seconds}</span>
              <span className="text-[10px] font-bold text-slate-400 block font-sans">SECS</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 4. ABOUT US & MISSION ROADMAP */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-black uppercase">
              <Zap className="w-3.5 h-3.5 text-sky-600" />
              <span>Our Superpower Philosophy</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Learning Through Real Creation, Play & Teamwork
            </h2>

            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              At Discovery Club Junior, we reject passive screen scrolling. Every kid builds hands-on hardware from day one. Based in Manouba with partnerships across Cité des Sciences à Tunis, our club turns curious kids into confident makers.
            </p>

            <div className="space-y-3 pt-2">
              <motion.div
                whileHover={{ x: 6 }}
                className="p-4 rounded-2xl bg-white border-2 border-slate-200 border-b-4 border-b-slate-200 hover:border-sky-300 flex items-start gap-3 transition-colors cursor-pointer"
              >
                <span className="text-2xl">🛠️</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">100% Real Hardware</h4>
                  <p className="text-xs text-slate-500 font-medium">Arduino, ESP32, servos, infrared sensors, and 3D printing.</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ x: 6 }}
                className="p-4 rounded-2xl bg-white border-2 border-slate-200 border-b-4 border-b-slate-200 hover:border-emerald-300 flex items-start gap-3 transition-colors cursor-pointer"
              >
                <span className="text-2xl">👨‍👩‍👧</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Relaxing Parent Tracking</h4>
                  <p className="text-xs text-slate-500 font-medium">Weekly attendance, teacher feedback, and milestone check-ins in your pocket.</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Timeline of Achievements with Glowing Cards */}
          <div className="lg:col-span-7 duo-card duo-card-glow-yellow p-6 sm:p-8 bg-white space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>🏆</span>
                <span>Our Trophy Hall of Fame</span>
              </h3>
              <span className="text-xs font-bold text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                International Podium
              </span>
            </div>

            <div className="space-y-3">
              {CLUB_ACHIEVEMENTS_TIMELINE.map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 flex items-start gap-3.5 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    {idx + 1}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-sky-600">{item.year}</span>
                      <span className="text-slate-300">·</span>
                      <h4 className="text-xs font-black text-slate-800">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. DYNAMIC PROGRAMS & COURSES WITH AGE FILTER & GLOW */}
      <section id="programs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
            <span>🚀 4 Hands-On STEM Pathways</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Pick Your Robotics Learning Track
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Filter by age to find the perfect hands-on match for your future innovator:
          </p>

          {/* Dynamic Age Filter Selector */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[
              { id: 'all', label: 'All Tracks (Ages 6-17)' },
              { id: '6-9', label: '👶 Starter (Ages 6-9)' },
              { id: '10-13', label: '⚡ Junior (Ages 10-13)' },
              { id: '14-17', label: '🤖 Senior Squad (Ages 14-17)' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAgeFilter(f.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  ageFilter === f.id
                    ? 'btn-duo-green'
                    : 'btn-duo-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPrograms.map((prog) => (
            <motion.div
              key={prog.id}
              whileHover={{ y: -6 }}
              className={`duo-card p-6 bg-white flex flex-col justify-between space-y-5 transition-all cursor-pointer ${
                activeProgramTab === prog.id
                  ? 'border-sky-400 ring-4 ring-sky-100 duo-card-glow-blue'
                  : 'hover:border-slate-300'
              }`}
              onClick={() => setActiveProgramTab(prog.id)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-[11px] font-black">
                    {prog.ageRange}
                  </span>
                  <span className="text-xs font-mono font-black text-slate-400">
                    {prog.duration.split(' ')[0]} {prog.duration.split(' ')[1]}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-800 leading-snug">
                  {prog.title}
                </h3>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {prog.description}
                </p>
              </div>

              <div className="pt-4 border-t-2 border-slate-100 space-y-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-slate-800 font-mono">
                    {prog.pricePerMonth} <span className="text-xs font-bold text-slate-400">DT/mo</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">Kit Included</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEnrollClick(prog.id);
                  }}
                  className="w-full py-3 btn-duo-green text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Select Track</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Program Syllabus Spotlight */}
        {selectedProgram && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="duo-card duo-card-glow-blue p-6 sm:p-8 bg-white space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5">
              <div>
                <span className="text-xs font-black uppercase text-sky-600">Curriculum Preview</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800">
                  {selectedProgram.title} — Syllabus Journey
                </h3>
              </div>
              <button
                onClick={() => handleEnrollClick(selectedProgram.id)}
                className="px-6 py-3 btn-duo-yellow text-xs font-black flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <span>Reserve Seat in {selectedProgram.title.split(' ')[0]}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedProgram.syllabus.map((item) => (
                <div
                  key={item.week}
                  className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2 hover:border-sky-300 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-black text-sky-600">Week {item.week}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 leading-snug">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.description}</p>
                  <div className="pt-2 border-t border-slate-200 text-[10px] font-bold text-slate-600">
                    Hardware: <span className="text-sky-700">{item.hardware}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </section>

      {/* 6. OFFICIAL FACEBOOK FEED & PHOTO GALLERY WITH FIRESTORE PERSISTENCE */}
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
            {/* Upload/Add User Photo Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-3 btn-duo-green text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une photo</span>
            </button>

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

      {/* 7. LES CAPUCHES HOODIE MERCHANDISE SECTION WITH REAL PHOTOS */}
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
                  src={CLUB_PHOTOS.fbHoodieCrew}
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

      {/* 8. UPCOMING COMPETITIONS & HACKATHONS */}
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
    </div>
  );
};
