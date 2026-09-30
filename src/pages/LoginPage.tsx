import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PRESET_ACCOUNTS } from '../data/initialData';
import { UserRole } from '../types';
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
import { motion } from 'motion/react';

export const LoginPage: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithPreset,
    loginWithEmailPassword,
    navigateTo,
    currentUser,
    logout,
    isFirebaseConnected
  } = useApp();

  const [activeTab, setActiveTab] = useState<'signin' | 'demo'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const roleStyles: Record<UserRole, { badge: string; text: string; bg: string; icon: any }> = {
    admin: {
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      text: 'Super Admin',
      bg: 'bg-amber-400',
      icon: ShieldCheck
    },
    trainer: {
      badge: 'bg-sky-100 text-sky-900 border-sky-300',
      text: 'Lead Trainer',
      bg: 'bg-sky-400',
      icon: GraduationCap
    },
    parent: {
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      text: 'Parent Guardian',
      bg: 'bg-emerald-500',
      icon: HeartHandshake
    },
    visitor: {
      badge: 'bg-slate-100 text-slate-900 border-slate-300',
      text: 'Visitor',
      bg: 'bg-slate-400',
      icon: Sparkles
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    await loginWithEmailPassword(email, password);
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await loginWithGoogle();
    setIsLoading(false);
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-center relative">
      {/* Top Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigateTo('home')}
          className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-sky-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        <div className="text-xs font-bold text-slate-500">
          New Parent?{' '}
          <button
            onClick={() => navigateTo('register-parent')}
            className="text-emerald-600 font-black hover:underline cursor-pointer"
          >
            Create Parent Account &rarr;
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
              src="/src/assets/images/duo_junior_mascot_1790795302958.jpg"
              alt="Junior Robot Mascot"
              className="w-32 h-32 rounded-3xl object-cover border-4 border-slate-100 shadow-md"
            />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-amber-950 font-black text-xs shadow-md">
              ⚡
            </div>
          </div>

          <div className="duo-speech-bubble text-center space-y-2">
            <div className="text-xs font-black uppercase text-sky-600 tracking-wider">
              Hello Maker! 👋
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-snug">
              Welcome to Discovery Junior!
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Log in to see your child's weekly robotics achievements, check attendance, or test different spaces!
            </p>
          </div>

          {/* Trophy badge */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 border-b-4 border-b-amber-300 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shrink-0 text-lg shadow-xs">
              🏆
            </div>
            <div>
              <div className="text-xs font-black text-amber-900">Eurobot Junior Champions</div>
              <div className="text-[11px] text-amber-700 font-medium">World 1st Place 2026 · Manouba, Tunisia</div>
            </div>
          </div>
        </div>

        {/* Right Side: Relaxing Clean Form */}
        <div className="lg:col-span-7 duo-card p-6 sm:p-10 space-y-6 bg-white">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Sign In to Your Space
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Your role (Parent, Trainer, Admin) opens automatically!
            </p>
          </div>

          {/* If already logged in */}
          {currentUser && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 border-b-4 border-b-emerald-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center text-sm shadow-sm">
                  {currentUser.displayName.slice(0, 1)}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <span>{currentUser.displayName}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 uppercase">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{currentUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo(currentUser.role)}
                  className="px-3.5 py-2 btn-duo-green text-xs font-black cursor-pointer"
                >
                  Open {currentUser.role} &rarr;
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-2 btn-duo-secondary text-xs font-bold cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Toggle between Direct Sign In & Evaluator 1-Click Directory */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setActiveTab('signin')}
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Email & Google
            </button>
            <button
              onClick={() => setActiveTab('demo')}
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'demo'
                  ? 'bg-amber-400 text-amber-950 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>⭐ Evaluator Presets</span>
            </button>
          </div>

          {/* TAB 1: Direct Sign In */}
          {activeTab === 'signin' && (
            <div className="space-y-4">
              <form onSubmit={handleEmailSignIn} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-black mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. faridadwani2000@gmail.com, sonia.khelifi@gmail.com..."
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-black">Password</label>
                    <span className="text-[11px] text-slate-400 font-medium">Any test password accepted</span>
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                  <span>{isLoading ? 'Checking...' : 'Sign In Now'}</span>
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-slate-100" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black">
                  <span className="bg-white px-3 text-slate-400">Or easy sign in</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3 px-4 btn-duo-secondary text-xs font-black flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* TAB 2: Evaluator Demo Directory */}
          {activeTab === 'demo' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-2xl text-xs text-amber-900 font-semibold">
                Tap any role persona below to test that portal instantly with 1 click:
              </div>

              <div className="space-y-2.5">
                {PRESET_ACCOUNTS.map((account) => {
                  const isCurrent = currentUser?.uid === account.uid;
                  const Icon = roleStyles[account.role]?.icon || Sparkles;

                  return (
                    <button
                      key={account.uid}
                      onClick={() => loginWithPreset(account)}
                      className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-50 border-sky-400 border-b-4 border-b-sky-500 shadow-sm'
                          : 'bg-white border-slate-200 border-b-4 border-b-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white ${roleStyles[account.role]?.bg || 'bg-slate-500'} shadow-sm`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        <div>
                          <div className="font-black text-slate-800 text-xs flex items-center gap-2">
                            <span>{account.displayName}</span>
                            {isCurrent && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{account.email}</div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {account.role === 'admin' && 'Supervises all rosters, payments & hoodies'}
                            {account.role === 'trainer' && 'Alpha group trainer · Takes attendance & grades'}
                            {account.role === 'parent' && 'Parent of Yassine · View attendance & order hoodie'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${roleStyles[account.role]?.badge || ''}`}>
                          {roleStyles[account.role]?.text}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card footer */}
          <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Need to enroll your kid?</span>
            <button
              onClick={() => navigateTo('register-parent')}
              className="text-emerald-600 font-black hover:underline cursor-pointer"
            >
              Parent Registration &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
