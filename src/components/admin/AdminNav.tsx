import React, { useEffect, useRef, useState } from 'react';
import {
  Boxes,
  Cake,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Globe,
  Landmark,
  LayoutGrid,
  Package,
  TrendingUp,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage, useT } from '../../i18n';
import { hubMessages } from '../../i18n/messages/hub';
import { currentMonth, monthRows } from '../../utils/payments';
import type { AdminSection } from './AdminHub';

type Tab = 'home' | AdminSection;

const TABS: { id: Tab; icon: React.ElementType }[] = [
  { id: 'home', icon: LayoutGrid },
  { id: 'overview', icon: TrendingUp },
  { id: 'students', icon: Users },
  { id: 'groups', icon: CalendarDays },
  { id: 'attendance', icon: ClipboardList },
  { id: 'payments', icon: DollarSign },
  { id: 'cash', icon: Landmark },
  { id: 'stock', icon: Boxes },
  { id: 'inventory', icon: Package },
  { id: 'team', icon: Cake },
  { id: 'site', icon: Globe }
];

/**
 * Admin sections as a slim tab bar stuck under the site header.
 * Scrolls sideways on small screens (with arrows), keeps the open tab in view, and shows what is waiting.
 */
export const AdminNav: React.FC<{ active: Tab; onOpen: (tab: Tab) => void }> = ({ active, onOpen }) => {
  const { students, payments, orders, materialRequests, isFirebaseConnected } = useApp();
  const t = useT(hubMessages);
  const { dir } = useLanguage();
  const scroller = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  // Things waiting for the admin, shown as small counters on the tabs
  const badges: Partial<Record<Tab, number>> = {
    students: students.filter((s) => s.status === 'waitlist').length,
    payments: monthRows(currentMonth(), students, payments).filter((r) => r.outstanding > 0).length,
    inventory: orders.filter((o) => o.status === 'requested').length,
    stock: materialRequests.filter((r) => r.status === 'pending').length
  };

  const updateEdges = () => {
    const el = scroller.current;
    if (!el) return;
    // scrollLeft is negative in right-to-left pages
    const pos = Math.abs(el.scrollLeft);
    setEdges({ start: pos > 4, end: pos + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    updateEdges();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    // The tabs get wider once the web fonts are loaded: check again then
    document.fonts?.ready.then(updateEdges);
    const late = setTimeout(updateEdges, 800);
    return () => {
      ro.disconnect();
      clearTimeout(late);
    };
  }, []);
  // Keep the open tab visible
  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  const scrollBy = (towardsEnd: boolean) => {
    const el = scroller.current;
    if (!el) return;
    const sign = (towardsEnd ? 1 : -1) * (dir === 'rtl' ? -1 : 1);
    el.scrollBy({ left: sign * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  return (
    <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-[#f8fafc]/80 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-200">
      {/* Content fades out as it scrolls under the bar */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-[#f8fafc] to-transparent" />
      <div className="relative flex items-center gap-2">
        {edges.start && (
          <button
            onClick={() => scrollBy(false)}
            aria-label={t('scrollLeft')}
            className="absolute start-0 z-10 w-8 h-8 grid place-items-center rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
        <nav
          ref={scroller}
          onScroll={updateEdges}
          aria-label={t('navLabel')}
          className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none"
          style={{
            maskImage: `linear-gradient(to ${dir === 'rtl' ? 'left' : 'right'}, ${edges.start ? 'transparent' : 'black'} 0, black 40px, black calc(100% - 40px), ${edges.end ? 'transparent' : 'black'} 100%)`
          }}
        >
          {TABS.map(({ id, icon: Icon }, i) => {
            const on = active === id;
            const badge = badges[id];
            return (
              <React.Fragment key={id}>
                {i === 1 && <span className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />}
                <button
                  onClick={() => onOpen(id)}
                  aria-current={on ? 'page' : undefined}
                  className={`relative shrink-0 flex items-center gap-1.5 px-2.5 py-3.5 text-[13px] font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                    on ? 'text-[#c11e3d]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${on ? 'text-[#c11e3d]' : 'text-slate-400'}`} />
                  {t(`nav_${id}` as 'nav_home')}
                  {!!badge && (
                    <span className={`min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-black ${on ? 'bg-[#c11e3d] text-white' : 'bg-amber-400 text-amber-950'}`}>
                      {badge}
                    </span>
                  )}
                  {/* Active underline */}
                  <span className={`absolute inset-x-2 -bottom-px h-[3px] rounded-t-full transition-all ${on ? 'bg-[#c11e3d]' : 'bg-transparent'}`} />
                </button>
              </React.Fragment>
            );
          })}
        </nav>
        {edges.end && (
          <button
            onClick={() => scrollBy(true)}
            aria-label={t('scrollRight')}
            className="absolute end-5 max-sm:end-0 z-10 w-8 h-8 grid place-items-center rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
        <span
          className="hidden sm:grid place-items-center shrink-0 w-4 h-4"
          title={isFirebaseConnected ? t('dbOk') : t('dbWait')}
          aria-label={isFirebaseConnected ? t('dbOk') : t('dbWait')}
          role="status"
        >
          <span className={`w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-[#15803d]' : 'bg-amber-400 animate-pulse'}`} />
        </span>
      </div>
    </div>
  );
};
