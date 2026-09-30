import React, { useState, useEffect } from 'react';
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
  ThumbsUp,
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
  Compass
} from 'lucide-react';
import { CLUB_STATS, CLUB_ACHIEVEMENTS_TIMELINE, FACEBOOK_POSTS } from '../../data/initialData';
import { motion, AnimatePresence } from 'motion/react';

const MASCOT_MESSAGES = [
  "Hi there! Tap me anytime for robotics tips! 🤖",
  "Did you know our Eurobot rover has 4 ultrasonic sensors? 🚀",
  "Every student gets their own microcontrollers & servo kit! 🛠️",
  "We won 1st Place at Eurobot Junior 2026 in France! 🥇",
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
    showToast
  } = useApp();

  const [activeProgramTab, setActiveProgramTab] = useState(programs[0]?.id || 'prog-robotics-starter');
  const [ageFilter, setAgeFilter] = useState<'all' | '6-9' | '10-13' | '14-17'>('all');
  const [mascotMessageIdx, setMascotMessageIdx] = useState(0);

  // Dynamic Facebook post likes state
  const [postLikes, setPostLikes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    FACEBOOK_POSTS.forEach((p) => {
      initial[p.id] = p.likes;
    });
    return initial;
  });
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // Dynamic countdown timer to next STEM Olympiad (38 days, 14 hours, 22 mins)
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

  const handleLikePost = (postId: string) => {
    const isCurrentlyLiked = likedPosts[postId];
    setLikedPosts((prev) => ({ ...prev, [postId]: !isCurrentlyLiked }));
    setPostLikes((prev) => ({
      ...prev,
      [postId]: isCurrentlyLiked ? prev[postId] - 1 : prev[postId] + 1
    }));
    if (!isCurrentlyLiked) {
      showToast('Loved post! +1 community cheer ❤️', 'success');
    }
  };

  const cycleMascotMessage = () => {
    setMascotMessageIdx((prev) => (prev + 1) % MASCOT_MESSAGES.length);
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
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-800 text-xs font-black tracking-wide shadow-sm hover:scale-105 transition-transform cursor-pointer"
              onClick={cycleMascotMessage}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>🏆 Eurobot Junior 2026 World Champions · Admissions Open</span>
            </motion.div>

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

          {/* Right Column: Interactive Mascot Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <motion.div
              whileHover={{ y: -4 }}
              className="duo-card duo-card-glow-blue p-6 sm:p-8 bg-white text-center space-y-5 relative"
            >
              {/* Mascot Image with breathing hover animation */}
              <div
                onClick={cycleMascotMessage}
                className="relative mx-auto w-48 h-48 sm:w-56 sm:h-56 cursor-pointer group"
                title="Click me for robotics fun facts!"
              >
                <motion.img
                  animate={{ y: [0, -8, 0], rotate: [0, 1, -1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.08 }}
                  src="/src/assets/images/duo_junior_mascot_1790795302958.jpg"
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

      {/* 2. DYNAMIC STEM OLYMPIAD COUNTDOWN BANNER */}
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

      {/* 3. ABOUT US & MISSION ROADMAP */}
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

      {/* 4. DYNAMIC PROGRAMS & COURSES WITH AGE FILTER & GLOW */}
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

        {/* Course Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {filteredPrograms.map((prog) => (
            <motion.button
              key={prog.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveProgramTab(prog.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeProgramTab === prog.id
                  ? 'btn-duo-blue'
                  : 'btn-duo-secondary'
              }`}
            >
              {prog.title}
            </motion.button>
          ))}
        </div>

        {/* Selected Program Spotlight with Glowing Aura */}
        <motion.div
          key={selectedProgram.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="duo-card duo-card-glow-blue p-6 sm:p-10 bg-white"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 font-black">
                  {selectedProgram.ageRange}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black">
                  {selectedProgram.level}
                </span>
              </div>

              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {selectedProgram.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                {selectedProgram.description}
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Standard Monthly Tuition:</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">${selectedProgram.pricePerMonth} / mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Session Frequency:</span>
                  <span className="font-bold text-slate-800">{selectedProgram.duration}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">All Kits Included:</span>
                  <span className="text-emerald-700 font-black">Yes, 100% Provided in Lab!</span>
                </div>
              </div>

              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEnrollClick(selectedProgram.id)}
                  className="w-full py-4 btn-duo-green text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Reserve Spot in {selectedProgram.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Syllabus 4-week module with interactive hover */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-sky-500" />
                  <span>Curriculum Milestones</span>
                </h4>
                <span className="text-[11px] font-bold text-slate-400">4-Week Foundation</span>
              </div>

              <div className="space-y-2.5">
                {selectedProgram.syllabus.map((item) => (
                  <motion.div
                    key={item.week}
                    whileHover={{ y: -2, x: 4 }}
                    className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-6 h-6 rounded-full bg-sky-500 text-white font-black text-[11px] flex items-center justify-center">
                        W{item.week}
                      </span>
                      <span className="font-black text-slate-800">{item.title}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium pl-8">{item.description}</p>
                    <div className="text-[11px] text-sky-700 font-bold pl-8 flex items-center gap-1">
                      <span>Hardware:</span>
                      <span className="text-slate-700 font-medium">{item.hardware}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 5. OFFICIAL FACEBOOK FEED & PHOTO GALLERY WITH DYNAMIC LIKES */}
      <section id="facebook-feed" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black uppercase mb-1">
              <span>📱 Official Community</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Live from Discovery Club Junior's Facebook Page
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Over 15,000+ followers celebrate our young makers in Manouba! (Tap heart to cheer them on!)
            </p>
          </div>

          <a
            href="https://www.facebook.com/DiscoveryClubJunior/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 btn-duo-blue text-xs font-black flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>Visit Facebook Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Facebook Cards Grid with Glowing Hover Effects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FACEBOOK_POSTS.map((post) => {
            const isLiked = likedPosts[post.id];
            const currentLikes = postLikes[post.id] || post.likes;

            return (
              <motion.div
                key={post.id}
                whileHover={{ y: -6 }}
                className="duo-card duo-card-glow-blue overflow-hidden bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="overflow-hidden h-48 relative group">
                    <img
                      src={post.imageUrl}
                      alt={post.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-slate-900/70 text-white backdrop-blur-xs font-black text-[10px]">
                      {post.tag}
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400">{post.date}</div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-3">
                      {post.caption}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t-2 border-slate-100 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-3">
                    {/* Interactive Like Button */}
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                        isLiked
                          ? 'bg-rose-100 text-rose-600 font-black scale-105'
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                      <span>{currentLikes}</span>
                    </button>

                    <span className="flex items-center gap-1 text-slate-400">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.comments}</span>
                    </span>
                  </div>

                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:underline font-black text-[11px] flex items-center gap-1"
                  >
                    <span>View Post</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 6. CLUB HOODIE MERCHANDISE SPOTLIGHT - "LES CAPUCHES" */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          whileHover={{ y: -4 }}
          className="duo-card duo-card-glow-green p-6 sm:p-10 bg-white flex flex-col md:flex-row items-center gap-8"
        >
          <div className="w-full md:w-1/3">
            <motion.img
              whileHover={{ rotate: [-2, 2, -2], scale: 1.05 }}
              src="/src/assets/images/discovery_club_hoodie_1790790624273.jpg"
              alt="Discovery Club Official Hoodie"
              className="w-full h-64 object-cover rounded-2xl border-2 border-slate-200 shadow-sm cursor-pointer"
            />
          </div>

          <div className="w-full md:w-2/3 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase">
              <span>👕 Official Club Merch</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Official "Les Capuches" Club Hoodies
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Every Discovery Club Junior member wears our signature navy tech hoodie with custom embroidered name badges during lab sessions and championships. Order or track yours in the Parent Portal!
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigateTo('parent')}
                className="px-6 py-3.5 btn-duo-green text-xs font-black cursor-pointer shadow-sm"
              >
                Order Hoodie in Parent Portal
              </button>
              <button
                onClick={() => navigateTo('admin')}
                className="px-5 py-3.5 btn-duo-secondary text-xs font-bold cursor-pointer"
              >
                Admin Inventory Management
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};
