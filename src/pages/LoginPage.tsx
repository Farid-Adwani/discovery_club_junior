import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CLUB_PHOTOS } from '../data/initialData';
import {
  LogIn,
  ArrowLeft,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  Trophy,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  Star,
  Zap,
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SignInLoader } from '../components/common/SignInLoader';
import { useT } from '../i18n';
import { authMessages } from '../i18n/messages/auth';

export const LoginPage: React.FC = () => {
  const {
    loginWithEmailPassword,
    navigateTo,
    isFirebaseConnected
  } = useApp();

  const t = useT(authMessages);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    await loginWithEmailPassword(email, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-center relative">
      <AnimatePresence>{isLoading && <SignInLoader />}</AnimatePresence>
      {/* Top Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigateTo('home')}
          className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-sky-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
          <span>{t('backHome')}</span>
        </button>

        <div className="text-xs font-bold text-slate-500">
          {t('newParent')}{' '}
          <button
            onClick={() => navigateTo('register-parent')}
            className="text-emerald-600 font-black hover:underline cursor-pointer"
          >
            {t('createParentAccount')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Friendly Mascot Card */}
        <div className="lg:col-span-5 duo-card p-6 sm:p-8 space-y-6 text-center bg-white">
          <div className="relative mx-auto w-32 h-32">
            <motion.img
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              src={CLUB_PHOTOS.clubAvatar}
              alt={t('logoAlt')}
              className="bg-white w-32 h-32 rounded-3xl object-cover border-4 border-slate-100 shadow-md"
            />
            <div className="absolute -bottom-2 -end-2 w-10 h-10 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-amber-950 font-black text-xs shadow-md">
              ⚡
            </div>
          </div>

          <div className="duo-speech-bubble text-center space-y-2">
            <div className="text-xs font-black uppercase text-sky-600 tracking-wider">
              {t('helloMaker')}
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-snug">
              {t('welcomeTitle')}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {t('welcomeText')}
            </p>
          </div>

          {/* Trophy badge */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 border-b-4 border-b-amber-300 text-start flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shrink-0 text-lg shadow-xs">
              🏆
            </div>
            <div>
              <div className="text-xs font-black text-amber-900">{t('championsTitle')}</div>
              <div className="text-[11px] text-amber-700 font-medium">{t('championsText')}</div>
            </div>
          </div>
        </div>

        {/* Right Side: Relaxing Clean Form */}
        <div className="order-first lg:order-none lg:col-span-7 duo-card p-6 sm:p-10 space-y-6 bg-white">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {t('signInTitle')}
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {t('signInSubtitle')}
            </p>
          </div>

            <div className="space-y-4">
              <form onSubmit={handleEmailSignIn} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-black mb-1.5">{t('emailLabel')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-black">{t('passwordLabel')}</label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                      className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 btn-duo-green text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? t('checking') : t('signInNow')}</span>
                </button>
              </form>

            </div>

          {/* Card footer */}
          <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('needEnroll')}</span>
            <button
              onClick={() => navigateTo('register-parent')}
              className="text-emerald-600 font-black hover:underline cursor-pointer"
            >
              {t('parentRegistrationLink')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
