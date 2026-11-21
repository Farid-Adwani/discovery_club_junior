import React from 'react';
import { CheckCircle2, CircleDashed, Hourglass, Ban, XCircle } from 'lucide-react';
import type { ClubEvent, EventPaymentStatus, EventRegistrationStatus } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { eventsMessages } from '../../i18n/messages/events';
import { fromISODate } from '../../utils/schedule';
import type { RegistrationState } from '../../utils/events';

// The site's theme maps Tailwind's palettes to the club colours (index.css), so each status gets a distinct
// treatment: pending amber (to answer), confirmed solid charcoal, waiting list pale crimson, not accepted outlined.
export const REG_STATUS_STYLE: Record<EventRegistrationStatus, { cls: string; icon: React.ElementType }> = {
  pending: { cls: 'bg-amber-100 text-amber-800 border-amber-300', icon: CircleDashed },
  accepted: { cls: 'bg-[#191919] text-white border-[#191919]', icon: CheckCircle2 },
  waitlist: { cls: 'bg-[#fdf2f4] text-[#a1172f] border-[#f6c4cd]', icon: Hourglass },
  refused: { cls: 'bg-white text-rose-700 border-rose-300 border-dashed', icon: XCircle },
  cancelled: { cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: Ban }
};

export const PAY_STYLE: Record<EventPaymentStatus, string> = {
  free: 'bg-slate-100 text-slate-600 border-slate-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  unpaid: 'bg-rose-50 text-rose-700 border-rose-200'
};

export const STATE_STYLE: Record<RegistrationState, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  full: 'bg-amber-100 text-amber-800',
  hidden: 'bg-slate-200 text-slate-700',
  closed: 'bg-slate-200 text-slate-700',
  deadline: 'bg-slate-200 text-slate-700',
  past: 'bg-slate-100 text-slate-500'
};

/** "Sat 12 Dec 2026", or "12 Dec – 14 Dec 2026" for an event over several days */
export function eventDateLabel(e: Pick<ClubEvent, 'date' | 'endDate'>, locale: string): string {
  const start = fromISODate(e.date);
  if (!e.endDate) return start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const end = fromISODate(e.endDate);
  return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export const eventTimeLabel = (e: Pick<ClubEvent, 'startTime' | 'endTime'>) => (e.startTime ? (e.endTime ? `${e.startTime} – ${e.endTime}` : e.startTime) : '');

export const RegStatusPill: React.FC<{ status: EventRegistrationStatus; className?: string }> = ({ status, className = '' }) => {
  const t = useT(eventsMessages);
  const { cls, icon: Icon } = REG_STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${cls} ${className}`}>
      <Icon className="w-3 h-3" />
      {t(`st_${status}`)}
    </span>
  );
};

export const PayPill: React.FC<{ status: EventPaymentStatus; due: number; paid: number }> = ({ status, due, paid }) => {
  const t = useT(eventsMessages);
  const { locale } = useLanguage();
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 3 });
  const text =
    status === 'free' ? t('pay_free') : status === 'paid' ? t('pay_paid') : status === 'partial' ? t('pay_partial', { paid: fmt(paid), due: fmt(due) }) : t('pay_unpaid', { due: fmt(due) });
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black whitespace-nowrap ${PAY_STYLE[status]}`}>{text}</span>;
};

/** A small calendar sheet: month on top, day number below */
export const DateBadge: React.FC<{ date: string; className?: string }> = ({ date, className = '' }) => {
  const { locale } = useLanguage();
  const d = fromISODate(date);
  return (
    <div className={`w-12 rounded-xl bg-white shadow-md overflow-hidden text-center leading-none ${className}`}>
      <div className="bg-[#c11e3d] text-white text-[9px] font-black uppercase py-1">{d.toLocaleDateString(locale, { month: 'short' })}</div>
      <div className="text-lg font-black text-slate-900 py-1">{d.getDate()}</div>
    </div>
  );
};
