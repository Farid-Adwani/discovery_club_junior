import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { CLUB_PHOTOS } from '../../data/initialData';
import {
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  Sparkles,
  LogIn,
  LogOut,
  UserPlus,
  Calendar,
  Flame,
  ChevronDown,
  Star,
  Zap,
  Home,
  BookOpen,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Header: React.FC = () => {
  const {
    currentPage,
    navigateTo,
    currentUser,
    logout,
    isFirebaseConnected
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleNavAnchor = (hash: string) => {
    if (currentPage !== 'home') {
      navigateTo('home');
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const roleStyles: Record<UserRole, { badge: string; text: string; color: string }> = {
    admin: { badge: 'bg-amber-100 text-amber-800 border-amber-300', text: 'Admin Hero', color: '#ffc800' },
    trainer: { badge: 'bg-sky-100 text-sky-800 border-sky-300', text: 'Trainer Coach', color: '#1cb0f6' },
    parent: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Parent Guide', color: '#58cc02' },
    visitor: { badge: 'bg-slate-100 text-slate-700 border-slate-300', text: 'Explorer', color: '#94a3b8' }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b-2 border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Zone 1: Brand wordmark & Mascot */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
          >
            <motion.div
              whileHover={{ rotate: [-4, 4, -4], scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 15 }}
              className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 bg-sky-50 flex items-center justify-center"
            >
              <img
                src={CLUB_PHOTOS.realFbLogo}
                alt="Discovery Club Junior Official Logo"
                className="w-full h-full object-cover"
              />
            </motion.div>

            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-800 group-hover:text-sky-600 transition-colors flex items-center gap-1.5">
                <span>Discovery Junior</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black">
                  STEM
                </span>
              </span>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span>Manouba, Tunisia</span>
                {isFirebaseConnected && (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-100 border border-emerald-300 px-2 py-0.2 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Cloud Synced
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Zone 2: Playful Navigation Links */}
        <nav className="hidden lg:flex items-center gap-2 text-sm font-extrabold text-slate-600">
          <button
            onClick={() => navigateTo('home')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              currentPage === 'home'
                ? 'bg-sky-100 text-sky-700 font-black'
                : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleNavAnchor('programs')}
            className="px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Courses</span>
          </button>

          <button
            onClick={() => handleNavAnchor('events')}
            className="px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Olympiads</span>
          </button>

          <button
            onClick={() => handleNavAnchor('facebook-feed')}
            className="px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>Community</span>
          </button>

          <button
            onClick={() => navigateTo('waitlist')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              currentPage === 'waitlist'
                ? 'bg-amber-100 text-amber-800 font-black'
                : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Waitlist</span>
          </button>
        </nav>

        {/* Zone 3: Authentication & Authorized Spaces */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            /* Logged in state */
            <div className="flex items-center gap-2.5">
              {/* Authorized space buttons */}
              <div className="hidden sm:flex items-center gap-1.5">
                {currentUser.roles.includes('admin') && (
                  <button
                    onClick={() => navigateTo('admin')}
                    className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentPage === 'admin'
                        ? 'btn-duo-yellow'
                        : 'btn-duo-secondary'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Admin</span>
                  </button>
                )}

                {currentUser.roles.includes('trainer') && (
                  <button
                    onClick={() => navigateTo('trainer')}
                    className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentPage === 'trainer'
                        ? 'btn-duo-blue'
                        : 'btn-duo-secondary'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-sky-600" />
                    <span>Trainer</span>
                  </button>
                )}

                {currentUser.roles.includes('parent') && (
                  <button
                    onClick={() => navigateTo('parent')}
                    className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentPage === 'parent'
                        ? 'btn-duo-green'
                        : 'btn-duo-secondary'
                    }`}
                  >
                    <HeartHandshake className="w-4 h-4 text-emerald-600" />
                    <span>Parent Portal</span>
                  </button>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-2xl bg-white border-2 border-slate-200 border-b-4 border-b-slate-300 hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 text-white flex items-center justify-center font-black text-xs shadow-sm">
                    {currentUser.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-black text-slate-800 leading-tight max-w-[120px] truncate">
                      {currentUser.displayName}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600 leading-tight capitalize">
                      {currentUser.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border-2 border-slate-200 border-b-4 border-b-slate-300 shadow-xl p-3 z-50 space-y-2"
                    >
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="text-xs font-black text-slate-800">{currentUser.displayName}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</div>
                        <div className="pt-1 flex flex-wrap gap-1">
                          {currentUser.roles.map((r) => (
                            <span
                              key={r}
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                roleStyles[r]?.badge || ''
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        {currentUser.roles.includes('admin') && (
                          <button
                            onClick={() => {
                              navigateTo('admin');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                            <span>Admin Space</span>
                          </button>
                        )}
                        {currentUser.roles.includes('trainer') && (
                          <button
                            onClick={() => {
                              navigateTo('trainer');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <GraduationCap className="w-4 h-4 text-sky-500" />
                            <span>Trainer Space</span>
                          </button>
                        )}
                        {currentUser.roles.includes('parent') && (
                          <button
                            onClick={() => {
                              navigateTo('parent');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <HeartHandshake className="w-4 h-4 text-emerald-500" />
                            <span>Parent Portal</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs font-black text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-2 border-slate-200 border-b-4 border-b-slate-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Unauthenticated state - Duolingo 3D Chunky buttons */
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigateTo('register-parent')}
                className="px-4 py-2.5 btn-duo-green text-xs font-black tracking-wide flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Parent Register</span>
                <span className="sm:hidden">Join</span>
              </button>

              <button
                onClick={() => navigateTo('login')}
                className="px-4.5 py-2.5 btn-duo-blue text-xs font-black tracking-wide flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
