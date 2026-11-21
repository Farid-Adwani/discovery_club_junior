import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AppPage, UserRole } from '../../types';
import { CLUB_PHOTOS } from '../../data/initialData';
import {
  CalendarDays,
  ChevronDown,
  CircleHelp,
  GraduationCap,
  HeartHandshake,
  Home,
  Lightbulb,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { useT } from '../../i18n';
import { commonMessages } from '../../i18n/messages/common';
import { siteMessages } from '../../i18n/messages/site';
import { NavSectionId, useNavSections } from '../visitor/sections';
import { rememberReturn } from '../museum/returnTo';

type Space = 'admin' | 'trainer' | 'parent';
const SPACE_ICON: Record<Space, React.ElementType> = { admin: ShieldCheck, trainer: GraduationCap, parent: HeartHandshake };
const SPACE_COLOR: Record<Space, string> = { admin: '#c11e3d', trainer: '#191919', parent: '#b08a1e' };
const HEADER_H = 64;
const NAV_GAP = 2; // gap-0.5 between the section links
const TRACK_EXTRA = 10; // padding (p-1) and border of the bar around the section links

/** Each section link has its own little icon, on the site's pastel colours (solid while the section is on screen) */
const SECTION_LOOK: Record<NavSectionId, { icon: React.ElementType; soft: string; ink: string }> = {
  about: { icon: Lightbulb, soft: '#fff1d2', ink: '#c98a12' },
  programs: { icon: CalendarDays, soft: '#ffe9ee', ink: '#c11e3d' },
  coaches: { icon: Users, soft: '#e1f5e9', ink: '#2f8a57' },
  journey: { icon: Trophy, soft: '#efe9fd', ink: '#7050c8' },
  faq: { icon: CircleHelp, soft: '#e3efff', ink: '#2f6fbf' },
  contact: { icon: MessageCircle, soft: '#ffe9ee', ink: '#c11e3d' }
};

const SectionIcon: React.FC<{ id: NavSectionId; on: boolean; className?: string }> = ({ id, on, className = 'w-6 h-6' }) => {
  const { icon: Icon, soft, ink } = SECTION_LOOK[id];
  return (
    <span
      aria-hidden
      className={`${className} grid place-items-center rounded-full shrink-0 transition-colors duration-300`}
      style={on ? { background: ink, color: '#fff' } : { background: soft, color: ink }}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />
    </span>
  );
};

/** Closes a popup on a click outside it or Escape */
function useDismiss(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
}

/**
 * Site header (64px, sticky). Visitors see links to the home page sections and sign-in; signed-in people
 * switch between their spaces (Admin / Coach / Parents) and open their profile menu.
 */
export const Header: React.FC = () => {
  const { currentPage, navigateTo, currentUser, logout } = useApp();
  const t = useT(commonMessages);
  const ts = useT(siteMessages);
  const sectionIds = useNavSections();
  const sectionsKey = sectionIds.join(',');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSectionId | null>(null);
  // How many section links fit in the bar; the others go under "More"
  const [fitCount, setFitCount] = useState(sectionIds.length);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsMoreOpen(false);
  }, [currentPage, currentUser]);

  // Shadow once the page scrolls; on the home page, the link of the section in view lights up
  // and a thin line under the header shows how far down the page the visitor is
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 4);
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${room > 0 ? Math.min(1, window.scrollY / room) : 0})`;
      if (currentPage !== 'home') return setActiveSection(null);
      const line = HEADER_H + window.innerHeight * 0.3;
      let on: NavSectionId | null = null;
      for (const id of sectionIds) {
        const box = document.getElementById(id)?.getBoundingClientRect();
        // (+1: a section scrolled exactly under the header can still end a fraction of a pixel below it)
        if (box && box.top <= line && box.bottom > HEADER_H + 1) on = id;
      }
      setActiveSection(on);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    // The lower sections load late and push the page down without any scroll: check again when the page grows
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [currentPage, sectionsKey]);

  useDismiss(menuRef, isUserMenuOpen, () => setIsUserMenuOpen(false));
  useDismiss(moreRef, isMoreOpen, () => setIsMoreOpen(false));

  const roleName: Record<UserRole, string> = {
    admin: t('roleAdmin'),
    trainer: t('roleTrainer'),
    parent: t('roleParent'),
    visitor: t('roleVisitor')
  };
  const spaceLabel: Record<Space, string> = { admin: t('adminSpace'), trainer: t('trainerSpace'), parent: t('parentPortal') };
  const spaces = (['admin', 'trainer', 'parent'] as Space[]).filter((s) => currentUser?.roles.includes(s));
  const inSpace = (['admin', 'trainer', 'parent'] as AppPage[]).includes(currentPage);

  const sectionLabel: Record<NavSectionId, string> = {
    about: t('navMethod'),
    programs: t('navClasses'),
    journey: t('navJourney'),
    coaches: t('navCoaches'),
    faq: t('navFaq'),
    contact: ts('contactUs')
  };

  const goToSection = (id: NavSectionId) => {
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);
    if (currentPage === 'home') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else {
      // The home page scrolls there once it has loaded (its lower sections load lazily)
      rememberReturn(id);
      navigateTo('home');
    }
  };

  const showSectionNav = !currentUser || !inSpace;
  const shownSections = sectionIds.slice(0, fitCount);
  const moreSections = sectionIds.slice(fitCount);

  // Fit as many section links as the bar has room for (labels change width with the language)
  useLayoutEffect(() => {
    const nav = navRef.current;
    const measure = measureRef.current;
    if (!nav || !measure) return;
    const fit = () => {
      const items = [...measure.children] as HTMLElement[];
      const moreWidth = (items.pop()?.offsetWidth ?? 0) + NAV_GAP;
      const widths = items.map((el) => el.offsetWidth + NAV_GAP);
      const room = nav.clientWidth - TRACK_EXTRA;
      if (widths.reduce((a, b) => a + b, 0) <= room) return setFitCount(widths.length);
      let used = moreWidth;
      let n = 0;
      while (n < widths.length && used + widths[n] <= room) used += widths[n++];
      setFitCount(n);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(nav);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [sectionsKey, showSectionNav]);

  // A section link: its icon (from xl up, where there is room) and its name; a white pill slides under the one in view
  const linkClass = (active: boolean, icon = true) =>
    `group relative flex items-center gap-2 h-9 ${icon ? 'ps-3.5 xl:ps-1.5' : 'ps-3.5'} pe-3.5 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
      active ? 'text-heading' : 'text-heading/60 hover:text-heading hover:bg-white/60'
    }`;
  const mobileLink = (active: boolean) =>
    `min-w-0 flex items-center gap-2.5 p-2 pe-3 rounded-2xl border text-sm font-semibold text-start cursor-pointer transition-colors ${
      active ? 'bg-white border-brand/30 text-heading shadow-[0_4px_12px_-6px_rgba(193,30,61,0.35)]' : 'bg-paper border-line text-heading/75 hover:bg-white'
    }`;
  // (called as a function, not used as a component, so it is not remounted on every render)
  const activePill = () => (
    <motion.span
      layoutId="nav-active-pill"
      aria-hidden
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
      className="absolute inset-0 rounded-full bg-white ring-1 ring-line shadow-[0_4px_12px_-4px_rgba(193,30,61,0.28)]"
    />
  );

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
      {/* How far down the home page the visitor is: a thin "signal" line along the bottom edge */}
      {currentPage === 'home' && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px]">
          <div
            ref={progressRef}
            className={`h-full origin-left rtl:origin-right bg-gradient-to-r rtl:bg-gradient-to-l from-brand via-[#e05c75] to-gold transition-opacity duration-300 ${
              scrolled ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
      )}
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3 lg:gap-6">
        {/* Brand */}
        <button onClick={() => navigateTo('home')} className="flex items-center gap-2.5 shrink-0 cursor-pointer group" aria-label={t('navHome')}>
          <img src={CLUB_PHOTOS.clubAvatar} alt={t('logoAlt')} className="w-10 h-10 rounded-full object-cover border-2 border-dashed border-brand/30 bg-white p-0.5" />
          <span className="font-display text-[19px] font-semibold tracking-tight text-heading group-hover:text-brand transition-colors whitespace-nowrap">
            Discovery Junior
          </span>
        </button>

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

        {/* Links to the home page sections (visitors, and the public pages); takes the free space of the bar */}
        <div ref={navRef} className="flex-1 min-w-0 flex items-center justify-center">
          {showSectionNav && sectionIds.length > 0 && (
            <nav aria-label={t('navSections')} className="hidden lg:flex items-center gap-0.5 p-1 rounded-full bg-cream/80 border border-line">
              {shownSections.map((id) => {
                const on = activeSection === id;
                return (
                  <button key={id} onClick={() => goToSection(id)} aria-current={on ? 'location' : undefined} className={linkClass(on)}>
                    {on && activePill()}
                    <span className="hidden xl:contents">
                      <SectionIcon id={id} on={on} className="relative w-6 h-6" />
                    </span>
                    <span className="relative">{sectionLabel[id]}</span>
                  </button>
                );
              })}
              {moreSections.length > 0 && (
                <div className="relative" ref={moreRef}>
                  <button
                    onClick={() => setIsMoreOpen((o) => !o)}
                    aria-expanded={isMoreOpen}
                    aria-haspopup="menu"
                    className={linkClass(isMoreOpen || moreSections.some((id) => id === activeSection), false)}
                  >
                    {moreSections.some((id) => id === activeSection) && activePill()}
                    <span className="relative">{t('navMore')}</span>
                    <ChevronDown className={`relative w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isMoreOpen && (
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.14 }}
                        className="absolute start-0 mt-2.5 min-w-52 rounded-2xl bg-white border border-line soft-shadow p-1.5 z-50"
                      >
                        {moreSections.map((id) => {
                          const on = activeSection === id;
                          return (
                            <button
                              key={id}
                              role="menuitem"
                              onClick={() => goToSection(id)}
                              aria-current={on ? 'location' : undefined}
                              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-start text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                                on ? 'bg-wash text-heading' : 'text-heading/70 hover:bg-paper hover:text-heading'
                              }`}
                            >
                              <SectionIcon id={id} on={on} className="w-7 h-7" />
                              {sectionLabel[id]}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </nav>
          )}
        </div>
        {/* Invisible copy of the links, measured to know how many fit */}
        <div aria-hidden className="absolute w-0 h-0 overflow-hidden invisible pointer-events-none">
          <div ref={measureRef} className="flex w-max gap-0.5">
            {sectionIds.map((id) => (
              <span key={id} className={linkClass(false)}>
                <span className="hidden xl:contents">
                  <SectionIcon id={id} on={false} />
                </span>
                {sectionLabel[id]}
              </span>
            ))}
            <span className={linkClass(false, false)}>
              {t('navMore')}
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Desktop right side */}
        {/* One bell for every screen size (two would check for news twice) */}
        <NotificationBell />

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
              <button onClick={() => navigateTo('register-parent')} className="pill-primary h-10 px-5 text-[13px]">
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

              <nav aria-label={t('navSections')} className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    navigateTo('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={mobileLink(currentPage === 'home' && !activeSection)}
                >
                  <span
                    aria-hidden
                    className={`w-8 h-8 grid place-items-center rounded-full shrink-0 transition-colors ${
                      currentPage === 'home' && !activeSection ? 'bg-heading text-white' : 'bg-cream text-heading'
                    }`}
                  >
                    <Home className="w-4 h-4" strokeWidth={2.4} />
                  </span>
                  {t('navHome')}
                </button>
                {sectionIds.map((id) => (
                  <button key={id} onClick={() => goToSection(id)} aria-current={activeSection === id ? 'location' : undefined} className={mobileLink(activeSection === id)}>
                    <SectionIcon id={id} on={activeSection === id} className="w-8 h-8" />
                    <span className="truncate">{sectionLabel[id]}</span>
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
