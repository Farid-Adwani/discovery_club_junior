import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AppPage, UserRole } from '../../types';
import { CLUB_PHOTOS } from '../../data/initialData';
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  HeartHandshake,
  Home,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useT } from '../../i18n';
import { commonMessages } from '../../i18n/messages/common';

type Space = 'admin' | 'trainer' | 'parent';
const SPACE_ICON: Record<Space, React.ElementType> = { admin: ShieldCheck, trainer: GraduationCap, parent: HeartHandshake };
const SPACE_COLOR: Record<Space, string> = { admin: '#c11e3d', trainer: '#191919', parent: '#b08a1e' };

/**
 * Site header (64px, sticky). Visitors see the public links and sign-in; signed-in people switch between
 * their spaces (Admin / Coach / Parents) and open their profile menu.
 */
export const Header: React.FC = () => {
  const { currentPage, navigateTo, currentUser, logout } = useApp();
  const t = useT(commonMessages);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [currentPage, currentUser]);

  // Shadow once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The profile menu closes on a click elsewhere or Escape
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsUserMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isUserMenuOpen]);

  const roleName: Record<UserRole, string> = {
    admin: t('roleAdmin'),
    trainer: t('roleTrainer'),
    parent: t('roleParent'),
    visitor: t('roleVisitor')
  };
  const spaceLabel: Record<Space, string> = { admin: t('adminSpace'), trainer: t('trainerSpace'), parent: t('parentPortal') };
  const spaces = (['admin', 'trainer', 'parent'] as Space[]).filter((s) => currentUser?.roles.includes(s));
  const inSpace = (['admin', 'trainer', 'parent'] as AppPage[]).includes(currentPage);

  const goToSection = (id: string) => {
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    if (currentPage !== 'home') {
      navigateTo('home');
      setTimeout(scroll, 100);
    } else scroll();
  };

  const publicLinks = [
    { key: 'home', icon: Home, label: t('navHome'), onClick: () => navigateTo('home'), active: currentPage === 'home' },
    { key: 'programs', icon: BookOpen, label: t('navCourses'), onClick: () => goToSection('programs') },
    { key: 'events', icon: Trophy, label: t('navOlympiads'), onClick: () => goToSection('events') },
    { key: 'feed', icon: Sparkles, label: t('navCommunity'), onClick: () => goToSection('facebook-feed') }
  ];

  const Avatar: React.FC<{ size: string }> = ({ size }) =>
    currentUser?.photoURL ? (
      <img src={currentUser.photoURL} alt="" className={`${size} rounded-xl object-cover shrink-0`} />
    ) : (
      <span className={`${size} rounded-xl grid place-items-center bg-[#191919] text-white font-black text-xs shrink-0`}>
        {currentUser?.displayName.slice(0, 1).toUpperCase()}
      </span>
    );

  return (
    <header
      className={`sticky top-0 z-40 w-full h-16 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b transition-[box-shadow,border-color] ${
        scrolled ? 'border-slate-200 shadow-[0_6px_20px_-12px_rgba(25,25,25,0.25)]' : 'border-slate-100'
      }`}
    >
      {/* Soft fade under the header while scrolling (the admin tab bar has its own) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-[#f8fafc] to-transparent transition-opacity duration-300 ${
          scrolled && currentPage !== 'admin' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3 lg:gap-6">
        {/* Brand */}
        <button onClick={() => navigateTo('home')} className="flex items-center gap-2.5 shrink-0 cursor-pointer group" aria-label={t('navHome')}>
          <img src={CLUB_PHOTOS.clubAvatar} alt={t('logoAlt')} className="w-9 h-9 rounded-xl object-cover border border-slate-200 bg-white" />
          <span className="text-[15px] font-black tracking-tight text-slate-900 group-hover:text-[#c11e3d] transition-colors whitespace-nowrap">
            Discovery Junior
          </span>
        </button>

        {/* Public links (visitors, and the public pages) */}
        {(!currentUser || !inSpace) && (
          <nav className="hidden lg:flex items-center gap-0.5">
            {publicLinks.map(({ key, icon: Icon, label, onClick, active }) => (
              <button
                key={key}
                onClick={onClick}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-extrabold transition-colors cursor-pointer ${
                  active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        )}

        {/* Space switcher (signed in) */}
        {currentUser && spaces.length > 0 && (
          <div className="hidden lg:flex items-center p-1 rounded-2xl bg-slate-100" role="navigation" aria-label={t('menu')}>
            {inSpace && (
              <button
                onClick={() => navigateTo('home')}
                title={t('navHome')}
                aria-label={t('navHome')}
                className="w-8 h-8 grid place-items-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white cursor-pointer"
              >
                <Home className="w-4 h-4" />
              </button>
            )}
            {spaces.map((s) => {
              const Icon = SPACE_ICON[s];
              const on = currentPage === s;
              return (
                <button
                  key={s}
                  onClick={() => navigateTo(s)}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 h-8 rounded-xl text-[12px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" style={{ color: on ? SPACE_COLOR[s] : undefined }} />
                  {roleName[s]}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1" />

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-2">
          <LanguageSwitcher />
          {currentUser ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen((o) => !o)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-2 h-10 ps-1 pe-2.5 rounded-2xl border transition-colors cursor-pointer ${
                  isUserMenuOpen ? 'bg-slate-100 border-slate-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <Avatar size="w-8 h-8" />
                <span className="text-start leading-tight">
                  <span className="block text-xs font-black text-slate-900 max-w-[130px] truncate">{currentUser.displayName}</span>
                  <span className="block text-[10px] font-bold text-slate-400">{roleName[currentUser.role]}</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute end-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50"
                  >
                    <div className="flex items-center gap-3 p-2.5">
                      <Avatar size="w-11 h-11" />
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 truncate">{currentUser.displayName}</div>
                        <div className="text-[11px] text-slate-500 truncate" dir="ltr">
                          {currentUser.email}
                        </div>
                      </div>
                    </div>
                    {spaces.length > 0 && (
                      <div className="py-1 border-t border-slate-100">
                        {spaces.map((s) => {
                          const Icon = SPACE_ICON[s];
                          return (
                            <button
                              key={s}
                              role="menuitem"
                              onClick={() => navigateTo(s)}
                              className={`w-full px-2.5 py-2 rounded-xl text-start text-[13px] font-bold flex items-center gap-2.5 cursor-pointer transition-colors ${
                                currentPage === s ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <Icon className="w-4 h-4" style={{ color: SPACE_COLOR[s] }} />
                              {spaceLabel[s]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        role="menuitem"
                        onClick={logout}
                        className="w-full px-2.5 py-2 rounded-xl text-start text-[13px] font-black text-[#c11e3d] hover:bg-[#fdf2f4] flex items-center gap-2.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('signOut')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <button
                onClick={() => navigateTo('login')}
                className={`h-10 px-4 rounded-xl text-[13px] font-black flex items-center gap-1.5 cursor-pointer transition-colors ${
                  currentPage === 'login' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LogIn className="w-4 h-4" />
                {t('signIn')}
              </button>
              <button onClick={() => navigateTo('register-parent')} className="h-10 px-4 btn-duo-green text-[13px] font-black flex items-center gap-1.5 cursor-pointer">
                <UserPlus className="w-4 h-4" />
                {t('parentRegister')}
              </button>
            </>
          )}
        </div>

        {/* Phone / tablet: avatar shortcut + menu button */}
        <div className="lg:hidden flex items-center gap-2">
          {currentUser && <Avatar size="w-8 h-8" />}
          <button
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-label={t('menu')}
            className="w-10 h-10 grid place-items-center rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Phone / tablet menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="lg:hidden absolute top-full inset-x-0 bg-white border-b border-slate-200 shadow-xl max-h-[calc(100dvh-4rem)] overflow-y-auto"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
              {currentUser && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                  <Avatar size="w-11 h-11" />
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 truncate">{currentUser.displayName}</div>
                    <div className="text-[11px] text-slate-500 truncate" dir="ltr">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
              )}

              {spaces.length > 0 && (
                <div className="grid gap-1.5">
                  {spaces.map((s) => {
                    const Icon = SPACE_ICON[s];
                    const on = currentPage === s;
                    return (
                      <button
                        key={s}
                        onClick={() => navigateTo(s)}
                        className={`w-full px-4 py-3 rounded-2xl text-sm font-black flex items-center gap-2.5 border cursor-pointer ${
                          on ? 'bg-white border-slate-900 text-slate-900' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" style={{ color: SPACE_COLOR[s] }} />
                        {spaceLabel[s]}
                      </button>
                    );
                  })}
                </div>
              )}

              <nav className="grid grid-cols-2 gap-1.5">
                {publicLinks.map(({ key, icon: Icon, label, onClick, active }) => (
                  <button
                    key={key}
                    onClick={() => {
                      onClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-3 rounded-xl text-sm font-extrabold flex items-center gap-2 cursor-pointer ${
                      active ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>

              {currentUser ? (
                <button onClick={logout} className="w-full px-4 py-3 rounded-2xl text-sm font-black text-[#c11e3d] bg-[#fdf2f4] flex items-center gap-2 cursor-pointer">
                  <LogOut className="w-4 h-4" />
                  {t('signOut')}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => navigateTo('login')} className="py-3 btn-duo-secondary text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer">
                    <LogIn className="w-4 h-4" />
                    {t('signIn')}
                  </button>
                  <button onClick={() => navigateTo('register-parent')} className="py-3 btn-duo-green text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer">
                    <UserPlus className="w-4 h-4" />
                    {t('join')}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs font-black text-slate-500">{t('language')}</span>
                <LanguageSwitcher />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
