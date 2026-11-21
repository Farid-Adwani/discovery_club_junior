import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  BellRing,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Download,
  Eye,
  EyeOff,
  Hourglass,
  MapPin,
  MessageCircle,
  PartyPopper,
  Pencil,
  Phone,
  Plus,
  Search,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { useApp, type EventFormInput } from '../../context/AppContext';
import { EVENT_REGISTRATION_STATUSES, type ClubEvent, type EventRegistration, type EventRegistrationStatus, type PaymentMethod, type Student } from '../../types';
import { ltr, useLanguage, useT } from '../../i18n';
import { eventsMessages } from '../../i18n/messages/events';
import { useConfirm } from '../common/ConfirmProvider';
import { ModalPortal } from '../common/ModalPortal';
import { DateBadge, PayPill, RegStatusPill, REG_STATUS_STYLE, STATE_STYLE, eventDateLabel, eventTimeLabel } from '../common/EventBits';
import { resizePhoto } from '../../utils/image';
import { toISODate } from '../../utils/schedule';
import { EVENT_DEFAULT_IMAGE, eventPaymentStatus, isActiveRegistration, lastDay, registrationState } from '../../utils/events';
import { ageOf } from '../../utils/age';
import { whatsappLink } from '../../utils/payments';

const METHODS: PaymentMethod[] = ['cash', 'transfer', 'cheque', 'card', 'other'];
const STATUS_ORDER: Record<EventRegistrationStatus, number> = { pending: 0, accepted: 1, waitlist: 2, refused: 3, cancelled: 4 };

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d] focus:bg-white';

/** Totals of one event's registrations (DT) */
function eventTotals(regs: EventRegistration[]) {
  const accepted = regs.filter((r) => r.status === 'accepted');
  return {
    accepted: accepted.length,
    pending: regs.filter((r) => r.status === 'pending').length,
    waitlist: regs.filter((r) => r.status === 'waitlist').length,
    expected: accepted.reduce((s, r) => s + r.amountDue, 0),
    collected: regs.reduce((s, r) => s + r.amountPaid, 0),
    outstanding: accepted.reduce((s, r) => s + Math.max(0, r.amountDue - r.amountPaid), 0),
    toPay: accepted.filter((r) => r.amountPaid < r.amountDue).length
  };
}

/** The open event is kept in the address bar (#/admin/events/<id>) so a refresh reopens it */
const eventFromHash = () => window.location.hash.replace(/^#\/?/, '').split('/')[2] || null;

/** Admin "Events" tab: create events, show or hide them, handle registrations and the money of each event. */
export const EventsManager: React.FC = () => {
  const { events: allEvents, eventRegistrations, setEventVisible } = useApp();
  const t = useT(eventsMessages);
  const { locale } = useLanguage();
  const todayISO = toISODate(new Date());

  const events = useMemo(() => allEvents.filter((e) => !e.deletedAt), [allEvents]);
  const [openId, setOpenIdState] = useState<string | null>(eventFromHash);
  const setOpenId = (id: string | null) => {
    setOpenIdState(id);
    const hash = id ? `#/admin/events/${id}` : '#/admin/events';
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    const onPop = () => setOpenIdState(eventFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [editing, setEditing] = useState<ClubEvent | 'new' | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'hidden' | 'all'>('upcoming');
  const [search, setSearch] = useState('');

  const regsOf = (id: string) => eventRegistrations.filter((r) => r.eventId === id);
  const liveIds = new Set(events.map((e) => e.id));
  const liveRegs = eventRegistrations.filter((r) => liveIds.has(r.eventId));
  const upcoming = events.filter((e) => lastDay(e) >= todayISO);
  const pendingRegs = liveRegs.filter((r) => r.status === 'pending');
  // Money received counts even for deleted events (it is in the cash book)
  const collectedAll = eventRegistrations.reduce((s, r) => s + r.amountPaid, 0);
  const month = todayISO.slice(0, 7);
  const collectedMonth = eventRegistrations.filter((r) => r.paidAt?.startsWith(month)).reduce((s, r) => s + r.amountPaid, 0);
  const totalsLive = eventTotals(liveRegs);
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 3 });

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events
      .filter((e) =>
        filter === 'upcoming' ? lastDay(e) >= todayISO : filter === 'past' ? lastDay(e) < todayISO : filter === 'hidden' ? !e.visible : true
      )
      .filter((e) => !q || e.title.toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q))
      .sort((a, b) => (filter === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  }, [events, filter, search, todayISO]);

  const openEvent = openId ? events.find((e) => e.id === openId) : undefined;

  const form = editing && (
    <EventFormModal
      event={editing === 'new' ? undefined : editing}
      onClose={() => setEditing(null)}
      onSaved={(saved, isNew) => {
        setEditing(null);
        if (isNew) setOpenId(saved.id);
      }}
    />
  );

  if (openEvent) {
    return (
      <>
        <EventDetail event={openEvent} onBack={() => setOpenId(null)} onEdit={() => setEditing(openEvent)} />
        {form}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero + metrics */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-7">
        <div className="absolute -top-20 -end-16 w-72 h-72 rounded-full bg-[#a21caf]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 start-1/4 w-72 h-72 rounded-full bg-[#c11e3d]/30 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-black uppercase tracking-wide">
              <PartyPopper className="w-3.5 h-3.5" />
              {t('heroBadge')}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black mt-2">{t('title')}</h3>
            <p className="text-xs font-medium text-white/60 max-w-xl">{t('heroSub')}</p>
          </div>
          <button onClick={() => setEditing('new')} className="px-4 py-2.5 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer self-start">
            <Plus className="w-4 h-4" />
            {t('newEvent')}
          </button>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-2 mt-5">
          <HeroStat icon={<CalendarDays className="w-4 h-4" />} label={t('kpiUpcoming')} value={String(upcoming.length)}>
            {t('kpiUpcomingSub', { visible: upcoming.filter((e) => e.visible).length, hidden: upcoming.filter((e) => !e.visible).length })}
          </HeroStat>
          <HeroStat
            icon={<Ticket className="w-4 h-4" />}
            label={t('kpiRequests')}
            value={String(pendingRegs.length)}
            alert={pendingRegs.length > 0}
            onClick={pendingRegs.length ? () => setOpenId(pendingRegs[0].eventId) : undefined}
          >
            {pendingRegs.length ? t('kpiRequestsSub') : t('kpiRequestsNone')}
          </HeroStat>
          <HeroStat icon={<Banknote className="w-4 h-4" />} label={t('kpiCollected')} value={fmt(collectedAll)} unit="DT">
            {t('kpiCollectedSub', { amount: fmt(collectedMonth) })}
          </HeroStat>
          <HeroStat icon={<Wallet className="w-4 h-4" />} label={t('kpiOutstanding')} value={fmt(totalsLive.outstanding)} unit="DT" alert={totalsLive.toPay > 0}>
            {t('kpiOutstandingSub', { count: totalsLive.toPay })}
          </HeroStat>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['upcoming', 'past', 'hidden', 'all'] as const).map((f) => {
            const count =
              f === 'upcoming' ? upcoming.length : f === 'past' ? events.length - upcoming.length : f === 'hidden' ? events.filter((e) => !e.visible).length : events.length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border-2 cursor-pointer transition-all ${
                  filter === f ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c11e3d]'
                }`}
              >
                {t(`filter_${f}`)}
                <span className={`px-1.5 rounded-full text-[10px] ${filter === f ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative md:w-72">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchEvents')} className={`${inputCls} ps-9 py-1.5 text-xs`} />
        </div>
      </div>

      {/* Events */}
      {shown.length === 0 ? (
        <div className="py-14 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white space-y-3">
          <PartyPopper className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-500">{events.length ? t('noEventsFilter') : t('noEvents')}</p>
          {!events.length && (
            <button onClick={() => setEditing('new')} className="px-4 py-2 btn-duo-green text-xs font-black inline-flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> {t('newEvent')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((e) => {
            const regs = regsOf(e.id);
            const tot = eventTotals(regs);
            const state = registrationState(e, todayISO, tot.accepted);
            const fill = e.capacity ? Math.min(1, tot.accepted / e.capacity) : 0;
            return (
              <article key={e.id} className={`duo-card hover:transform-none! bg-white overflow-hidden flex flex-col ${!e.visible ? 'opacity-90' : ''}`}>
                <button onClick={() => setOpenId(e.id)} className="relative h-36 bg-slate-100 cursor-pointer text-start">
                  <img src={e.imageUrl || EVENT_DEFAULT_IMAGE} alt="" className={`w-full h-full object-cover ${!e.visible ? 'grayscale-[60%]' : ''}`} />
                  <DateBadge date={e.date} className="absolute top-3 start-3" />
                  <span
                    className={`absolute top-3 end-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                      e.visible ? 'bg-emerald-500 text-white' : 'bg-[#191919]/85 text-white'
                    }`}
                  >
                    {e.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {e.visible ? t('visible') : t('hidden')}
                  </span>
                  {tot.pending > 0 && (
                    <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-900 animate-pulse" />
                      {t('pendingCount', { count: tot.pending })}
                    </span>
                  )}
                </button>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="min-w-0">
                    <h4 className="text-base font-black text-slate-900 leading-tight truncate">{e.title}</h4>
                    <div className="mt-1 text-[11px] font-semibold text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className="capitalize">{eventDateLabel(e, locale)}</span>
                      {eventTimeLabel(e) && (
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {eventTimeLabel(e)}
                        </span>
                      )}
                      {e.location && (
                        <span className="inline-flex items-center gap-0.5 truncate max-w-full">
                          <MapPin className="w-3 h-3 shrink-0" /> {e.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black">{e.fee > 0 ? t('feeValue', { fee: fmt(e.fee) }) : t('free')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${STATE_STYLE[state]}`}>{t(`state_${state}`)}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {e.capacity ? t('placesTaken', { taken: tot.accepted, total: e.capacity }) : t('acceptedCount', { count: tot.accepted })}
                      </span>
                      {tot.waitlist > 0 && <span className="text-sky-700">{t('waitlistCount', { count: tot.waitlist })}</span>}
                    </div>
                    {e.capacity ? (
                      <div className="h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${fill >= 1 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fill * 100}%` }} />
                      </div>
                    ) : null}
                  </div>
                  {e.fee > 0 || tot.collected > 0 ? (
                    <div className="flex items-center justify-between text-[11px] font-bold rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-500">{t('collected')}</span>
                      <span className="font-mono font-black text-slate-900">
                        {fmt(tot.collected)} <span className="text-slate-400">/ {fmt(tot.expected)} DT</span>
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-auto flex items-center gap-1.5 pt-1">
                    <button onClick={() => setOpenId(e.id)} className="flex-1 px-3 py-2 btn-duo-blue text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer">
                      <Ticket className="w-4 h-4" /> {t('manage')}
                    </button>
                    <button
                      onClick={() => setEventVisible(e.id, !e.visible)}
                      title={e.visible ? t('hide') : t('show')}
                      aria-label={e.visible ? t('hide') : t('show')}
                      className="w-9 h-9 grid place-items-center btn-duo-secondary cursor-pointer"
                    >
                      {e.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditing(e)} title={t('edit')} aria-label={t('edit')} className="w-9 h-9 grid place-items-center btn-duo-secondary cursor-pointer">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {form}
    </div>
  );
};

const HeroStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  alert?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ icon, label, value, unit, alert, onClick, children }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`text-start p-3 rounded-2xl bg-white/10 min-w-0 ${onClick ? 'hover:bg-white/15 cursor-pointer' : ''} transition-colors`}>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/60">
        <span className="truncate">{label}</span>
        <span className={alert ? 'text-[#ff8fa3]' : ''}>{icon}</span>
      </div>
      <div className="text-2xl font-black font-mono mt-1 truncate">
        {value} {unit && <span className="text-xs text-white/50">{unit}</span>}
        {alert && <span className="inline-block w-2 h-2 ms-2 rounded-full bg-[#ff6b86] animate-pulse align-middle" />}
      </div>
      <div className="text-[11px] font-semibold text-white/60 leading-snug truncate">{children}</div>
    </Tag>
  );
};

/* ---------- one event: its registrations and money ---------- */

const EventDetail: React.FC<{ event: ClubEvent; onBack: () => void; onEdit: () => void }> = ({ event, onBack, onEdit }) => {
  const {
    eventRegistrations,
    students,
    deletedStudents,
    groups,
    setEventVisible,
    notifyEventFamilies,
    deleteEvent,
    setEventRegistrationsStatus,
    markEventPaid,
    updateEventRegistration
  } = useApp();
  const t = useT(eventsMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();
  const todayISO = toISODate(new Date());
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 3 });

  const regs = useMemo(() => eventRegistrations.filter((r) => r.eventId === event.id), [eventRegistrations, event.id]);
  const tot = eventTotals(regs);
  const state = registrationState(event, todayISO, tot.accepted);
  const studentById = useMemo(() => new Map([...students, ...deletedStudents].map((s) => [s.id, s])), [students, deletedStudents]);
  const nameOf = (r: EventRegistration) => studentById.get(r.studentId)?.studentName || r.studentName;

  const [statusFilter, setStatusFilter] = useState<'all' | EventRegistrationStatus>(() => (regs.some((r) => r.status === 'pending') ? 'pending' : 'all'));
  const [payFilter, setPayFilter] = useState<'all' | 'topay' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<EventRegistration | null>(null);
  const [bulkMethod, setBulkMethod] = useState<PaymentMethod>('cash');
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => {
        if (payFilter === 'all') return true;
        const pay = eventPaymentStatus(r.amountDue, r.amountPaid);
        return payFilter === 'paid' ? pay === 'paid' || pay === 'free' : pay === 'unpaid' || pay === 'partial';
      })
      .filter((r) => !q || nameOf(r).toLowerCase().includes(q) || (r.parentName || '').toLowerCase().includes(q) || (r.parentPhone || '').includes(q))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || nameOf(a).localeCompare(nameOf(b)));
  }, [regs, statusFilter, payFilter, search, studentById]);

  // The selection only keeps rows that are still listed
  const selectedIds = shown.filter((r) => selected.has(r.id)).map((r) => r.id);
  const toggle = (id: string) => setSelected((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
  const allShownSelected = shown.length > 0 && selectedIds.length === shown.length;

  const runBulk = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (ok) setSelected(new Set());
  };

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = [t('colChild'), t('colAge'), t('colParent'), t('colPhone'), t('colStatus'), t('colDue'), t('colPaid'), t('colMethod'), t('colPaidOn'), t('colParentNote'), t('colClubNote'), t('colRegistered')];
    const rows = [head.map(esc).join(',')];
    for (const r of shown) {
      const st = studentById.get(r.studentId);
      rows.push(
        [nameOf(r), st ? ageOf(st) : '', r.parentName || '', r.parentPhone || '', t(`st_${r.status}`), r.amountDue, r.amountPaid, r.method ? t(`m_${r.method}`) : '', r.paidAt || '', r.parentNote || '', r.adminNote || '', r.createdAt.slice(0, 10)]
          .map(esc)
          .join(',')
      );
    }
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${event.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'event'}-${event.date}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const removeEvent = async () => {
    const ok = await confirm({
      title: t('confirmDeleteEvent', { title: event.title }),
      message: tot.collected > 0 ? t('confirmDeleteEventPaid', { amount: fmt(tot.collected) }) : t('confirmDeleteEventText', { count: regs.filter(isActiveRegistration).length }),
      confirmLabel: t('delete'),
      danger: true
    });
    if (ok && (await deleteEvent(event.id))) onBack();
  };

  const tellFamilies = async () => {
    const ok = await confirm({
      title: t('confirmNotify', { title: event.title }),
      message: event.notifiedAt ? t('confirmNotifyAgain', { date: new Date(event.notifiedAt).toLocaleDateString(locale) }) : t('confirmNotifyText'),
      confirmLabel: t('notifyFamilies')
    });
    if (ok) await notifyEventFamilies(event.id);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#c11e3d] cursor-pointer">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('backToEvents')}
      </button>

      {/* Event header */}
      <section className="duo-card hover:transform-none! bg-white overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr]">
          <div className="relative h-44 md:h-full min-h-44 bg-slate-100">
            <img src={event.imageUrl || EVENT_DEFAULT_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <DateBadge date={event.date} className="absolute top-3 start-3" />
          </div>
          <div className="p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${event.visible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                    {event.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {event.visible ? t('visible') : t('hidden')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${STATE_STYLE[state]}`}>{t(`state_${state}`)}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{event.title}</h3>
                <div className="mt-1.5 text-xs font-semibold text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1 capitalize">
                    <CalendarDays className="w-3.5 h-3.5" /> {eventDateLabel(event, locale)}
                  </span>
                  {eventTimeLabel(event) && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {eventTimeLabel(event)}
                    </span>
                  )}
                  {event.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {event.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 font-black text-slate-800">
                    <Banknote className="w-3.5 h-3.5" /> {event.fee > 0 ? t('feeValue', { fee: fmt(event.fee) }) : t('free')}
                  </span>
                </div>
                {event.registrationDeadline && (
                  <div className="mt-1 text-[11px] font-bold text-slate-400">{t('deadlineOn', { date: eventDateLabel({ date: event.registrationDeadline }, locale) })}</div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setEventVisible(event.id, !event.visible)}
                  className={`px-3 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer ${event.visible ? 'btn-duo-secondary' : 'btn-duo-green'}`}
                >
                  {event.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {event.visible ? t('hide') : t('show')}
                </button>
                {event.visible && (
                  <button onClick={tellFamilies} className="px-3 py-2 btn-duo-blue text-xs font-black flex items-center gap-1.5 cursor-pointer">
                    <BellRing className="w-4 h-4" /> {t('notifyFamilies')}
                  </button>
                )}
                <button onClick={onEdit} className="px-3 py-2 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer">
                  <Pencil className="w-4 h-4" /> {t('edit')}
                </button>
                <button onClick={removeEvent} title={t('delete')} aria-label={t('delete')} className="w-9 h-9 grid place-items-center btn-duo-secondary text-[#c11e3d] cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {event.description && <p className="text-sm text-slate-600 font-medium whitespace-pre-line line-clamp-4">{event.description}</p>}
            {event.notifiedAt && <p className="text-[11px] font-bold text-slate-400">{t('notifiedOn', { date: new Date(event.notifiedAt).toLocaleDateString(locale) })}</p>}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={<Users className="w-4 h-4 text-emerald-600" />} label={t('kpiAccepted')} value={event.capacity ? `${tot.accepted}/${event.capacity}` : String(tot.accepted)}>
          {event.capacity ? t('placesLeft', { count: Math.max(0, event.capacity - tot.accepted) }) : t('noLimit')}
        </StatTile>
        <StatTile icon={<Hourglass className="w-4 h-4 text-amber-500" />} label={t('kpiRequests')} value={String(tot.pending)} alert={tot.pending > 0}>
          {t('waitlistCount', { count: tot.waitlist })}
        </StatTile>
        <StatTile icon={<Banknote className="w-4 h-4 text-emerald-600" />} label={t('collected')} value={`${fmt(tot.collected)} DT`}>
          {t('expectedOf', { amount: fmt(tot.expected) })}
        </StatTile>
        <StatTile icon={<Wallet className="w-4 h-4 text-rose-500" />} label={t('kpiOutstanding')} value={`${fmt(tot.outstanding)} DT`} alert={tot.outstanding > 0}>
          {t('kpiOutstandingSub', { count: tot.toPay })}
        </StatTile>
      </div>

      {/* Registrations */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white overflow-hidden">
        <div className="p-4 sm:p-5 space-y-3 border-b-2 border-slate-100 bg-slate-50/60">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#a21caf]" /> {t('registrations')}
              <span className="text-xs font-bold text-slate-400">{regs.length}</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchRegs')} className={`${inputCls} ps-9 py-1.5 text-xs w-52`} />
              </div>
              <button onClick={exportCsv} disabled={!shown.length} className="px-3 py-1.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={() => setAdding(true)} className="px-3 py-1.5 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer">
                <UserPlus className="w-4 h-4" /> {t('addChildren')}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', ...EVENT_REGISTRATION_STATUSES] as const).map((f) => {
              const count = f === 'all' ? regs.length : regs.filter((r) => r.status === f).length;
              if (f !== 'all' && f !== 'pending' && f !== 'accepted' && count === 0) return null;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer ${
                    statusFilter === f ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {f === 'all' ? t('filter_all') : t(`st_${f}`)}
                  <span className={`px-1.5 rounded-full text-[10px] ${statusFilter === f ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
                </button>
              );
            })}
            <span className="w-px h-5 bg-slate-200 mx-1" />
            {(['all', 'topay', 'paid'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setPayFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer ${
                  payFilter === f ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {t(`payFilter_${f}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="sticky top-[7.5rem] z-10 flex flex-wrap items-center gap-1.5 px-4 sm:px-5 py-2.5 bg-[#191919] text-white">
            <span className="text-xs font-black me-1">{t('selectedCount', { count: selectedIds.length })}</span>
            <button disabled={busy} onClick={() => runBulk(() => setEventRegistrationsStatus(event.id, selectedIds, 'accepted'))} className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[11px] font-black cursor-pointer disabled:opacity-50">
              {t('accept')}
            </button>
            <button disabled={busy} onClick={() => runBulk(() => setEventRegistrationsStatus(event.id, selectedIds, 'waitlist'))} className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-[11px] font-black cursor-pointer disabled:opacity-50">
              {t('toWaitlist')}
            </button>
            <button disabled={busy} onClick={() => runBulk(() => setEventRegistrationsStatus(event.id, selectedIds, 'refused'))} className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-black cursor-pointer disabled:opacity-50">
              {t('refuse')}
            </button>
            {event.fee > 0 || regs.some((r) => r.amountDue > 0) ? (
              <span className="flex items-center gap-1 ms-auto">
                <select value={bulkMethod} onChange={(e) => setBulkMethod(e.target.value as PaymentMethod)} className="px-2 py-1 rounded-lg bg-white/10 text-[11px] font-black border border-white/20 cursor-pointer">
                  {METHODS.map((m) => (
                    <option key={m} value={m} className="text-slate-900">
                      {t(`m_${m}`)}
                    </option>
                  ))}
                </select>
                <button disabled={busy} onClick={() => runBulk(() => markEventPaid(event.id, selectedIds, bulkMethod))} className="px-2.5 py-1 rounded-lg bg-[#15803d] hover:bg-[#166534] text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-50">
                  <Check className="w-3.5 h-3.5" /> {t('markPaid')}
                </button>
              </span>
            ) : null}
            <button onClick={() => setSelected(new Set())} aria-label={t('clearSelection')} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-white/15 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-400">{regs.length ? t('noRegsFilter') : t('noRegs')}</p>
            {!regs.length && (
              <button onClick={() => setAdding(true)} className="px-4 py-2 btn-duo-green text-xs font-black inline-flex items-center gap-1.5 cursor-pointer">
                <UserPlus className="w-4 h-4" /> {t('addChildren')}
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            <li className="hidden lg:grid grid-cols-[28px_minmax(0,1.5fr)_150px_minmax(0,1fr)_auto] gap-3 px-5 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
              <input
                type="checkbox"
                checked={allShownSelected}
                onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((r) => r.id)))}
                aria-label={t('selectAll')}
                className="w-4 h-4 accent-[#c11e3d] cursor-pointer"
              />
              <span>{t('colChild')}</span>
              <span>{t('colStatus')}</span>
              <span>{t('colPayment')}</span>
              <span />
            </li>
            {shown.map((r) => {
              const st = studentById.get(r.studentId);
              const pay = eventPaymentStatus(r.amountDue, r.amountPaid);
              const classes = st ? groups.filter((g) => st.groupIds.includes(g.id)).map((g) => g.name).join(', ') : '';
              return (
                <li key={r.id} className={`grid grid-cols-[28px_1fr_auto] lg:grid-cols-[28px_minmax(0,1.5fr)_150px_minmax(0,1fr)_auto] gap-x-3 gap-y-2 items-center px-4 sm:px-5 py-3 ${selected.has(r.id) ? 'bg-[#fdf2f4]' : 'hover:bg-slate-50/70'}`}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={nameOf(r)} className="w-4 h-4 accent-[#c11e3d] cursor-pointer" />
                  <div className="min-w-0 flex items-center gap-2.5">
                    {st?.photoURL ? (
                      <img src={st.photoURL} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c11e3d] to-[#6a0d1f] text-white grid place-items-center text-sm font-black shrink-0">{nameOf(r).slice(0, 1).toUpperCase()}</span>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">
                        {nameOf(r)}
                        {st && <span className="ms-1.5 text-[11px] font-bold text-slate-400">{t('age', { age: ageOf(st) })}</span>}
                        {!st && <span className="ms-1.5 text-[10px] font-bold text-rose-500">{t('studentDeleted')}</span>}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 truncate">
                        {r.parentName || '—'}
                        {r.parentPhone && <span dir="ltr"> · {r.parentPhone}</span>}
                        {classes && <span className="text-slate-400"> · {classes}</span>}
                      </div>
                      {(r.parentNote || r.adminNote) && (
                        <div className="text-[11px] font-semibold text-slate-500 truncate flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 shrink-0 text-slate-400" />
                          {r.parentNote && <span className="italic">“{r.parentNote}”</span>}
                          {r.adminNote && <span className="text-[#a21caf]">{r.parentNote ? ' · ' : ''}{r.adminNote}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Status: one tap to accept a request, a menu for everything else */}
                  <div className="col-start-2 lg:col-start-auto flex items-center gap-1.5 flex-wrap">
                    {r.status === 'pending' ? (
                      <>
                        <button onClick={() => updateEventRegistration(r.id, { status: 'accepted' })} className="px-2.5 py-1 btn-duo-green text-[11px] font-black cursor-pointer">
                          {t('accept')}
                        </button>
                        <StatusMenu value={r.status} onChange={(status) => updateEventRegistration(r.id, { status })} />
                      </>
                    ) : (
                      <StatusMenu value={r.status} onChange={(status) => updateEventRegistration(r.id, { status })} />
                    )}
                  </div>
                  <div className="col-start-2 lg:col-start-auto flex items-center gap-1.5 flex-wrap min-w-0">
                    {/* Only confirmed children owe something; for the others the amount is just shown */}
                    {r.status === 'accepted' || r.amountPaid > 0 ? (
                      <PayPill status={pay} due={r.amountDue} paid={r.amountPaid} />
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">{r.amountDue > 0 ? `${fmt(r.amountDue)} DT` : t('free')}</span>
                    )}
                    {r.customFee !== undefined && <span className="text-[10px] font-black text-[#a21caf]">{t('customAmount')}</span>}
                    {r.paidAt && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(`${r.paidAt}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                        {r.method ? ` · ${t(`m_${r.method}`)}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="row-start-1 col-start-3 lg:row-start-auto lg:col-start-auto flex justify-end gap-1">
                    {(pay === 'unpaid' || pay === 'partial') && r.status === 'accepted' && (
                      <button onClick={() => markEventPaid(event.id, [r.id], 'cash')} title={t('markPaidCash')} className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border-2 border-emerald-200 hover:bg-emerald-100 text-[11px] font-black cursor-pointer whitespace-nowrap">
                        {t('markPaid')}
                      </button>
                    )}
                    <button onClick={() => setDetail(r)} title={t('details')} aria-label={t('details')} className="w-8 h-8 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {adding && <AddChildrenModal event={event} registrations={regs} onClose={() => setAdding(false)} />}
      {detail && <RegistrationModal reg={regs.find((r) => r.id === detail.id) || detail} event={event} name={nameOf(detail)} onClose={() => setDetail(null)} />}
    </div>
  );
};

const StatTile: React.FC<{ icon: React.ReactNode; label: string; value: string; alert?: boolean; children: React.ReactNode }> = ({ icon, label, value, alert, children }) => (
  <div className={`p-4 rounded-2xl bg-white border-2 ${alert ? 'border-amber-200' : 'border-slate-200'} min-w-0`}>
    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
      <span className="truncate">{label}</span>
      {icon}
    </div>
    <div className="text-xl font-black font-mono text-slate-900 mt-1 truncate">{value}</div>
    <div className="text-[11px] font-semibold text-slate-500 truncate">{children}</div>
  </div>
);

const StatusMenu: React.FC<{ value: EventRegistrationStatus; onChange: (s: EventRegistrationStatus) => void }> = ({ value, onChange }) => {
  const t = useT(eventsMessages);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EventRegistrationStatus)}
      aria-label={t('colStatus')}
      className={`px-2 py-1 rounded-full border-2 text-[10px] font-black uppercase cursor-pointer focus:outline-none ${REG_STATUS_STYLE[value].cls}`}
    >
      {EVENT_REGISTRATION_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-white text-slate-900 normal-case">
          {t(`st_${s}`)}
        </option>
      ))}
    </select>
  );
};

/* ---------- modals ---------- */

const Modal: React.FC<{ onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ onClose, wide, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className={`duo-card hover:transform-none! bg-white w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-5 sm:p-6 max-h-[92vh] overflow-y-auto`}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
};

const ModalHeader: React.FC<{ title: string; sub?: string; onClose: () => void }> = ({ title, sub, onClose }) => {
  const t = useT(eventsMessages);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="text-lg font-black text-slate-900">{title}</h4>
        {sub && <p className="text-xs font-semibold text-slate-500 truncate">{sub}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label={t('cancel')} className="p-1.5 btn-duo-secondary cursor-pointer shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <label className="flex items-start gap-3 p-3 rounded-2xl border-2 border-slate-200 cursor-pointer hover:border-slate-300">
    <span className={`relative mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors ${checked ? 'bg-[#15803d]' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'start-[18px]' : 'start-0.5'}`} />
    </span>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
    <span className="min-w-0">
      <span className="block text-sm font-black text-slate-800">{label}</span>
      {hint && <span className="block text-[11px] font-semibold text-slate-500">{hint}</span>}
    </span>
  </label>
);

type EventDraft = Omit<EventFormInput, 'fee' | 'capacity'> & { fee: string; capacity: string };

const EventFormModal: React.FC<{ event?: ClubEvent; onClose: () => void; onSaved: (e: ClubEvent, isNew: boolean) => void }> = ({ event, onClose, onSaved }) => {
  const { saveEvent, notifyEventFamilies, showToast } = useApp();
  const t = useT(eventsMessages);
  const [d, setD] = useState<EventDraft>(() => ({
    title: event?.title || '',
    description: event?.description || '',
    imageUrl: event?.imageUrl || '',
    date: event?.date || '',
    endDate: event?.endDate || '',
    startTime: event?.startTime || '',
    endTime: event?.endTime || '',
    location: event?.location || '',
    fee: event ? String(event.fee) : '',
    capacity: event?.capacity ? String(event.capacity) : '',
    registrationDeadline: event?.registrationDeadline || '',
    visible: event?.visible ?? false,
    registrationOpen: event?.registrationOpen ?? true
  }));
  const [tellFamilies, setTellFamilies] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      set('imageUrl', await resizePhoto(file, 960, 540));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('imageError'), 'error');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const saved = await saveEvent(
      {
        ...d,
        title: d.title.trim(),
        fee: d.fee === '' ? 0 : Number(d.fee),
        capacity: d.capacity === '' ? undefined : Number(d.capacity)
      },
      event?.id
    );
    if (saved && tellFamilies && saved.visible) await notifyEventFamilies(saved.id);
    setSaving(false);
    if (saved) onSaved(saved, !event);
  };

  return (
    <Modal onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4 text-xs font-bold text-slate-700">
        <ModalHeader title={event ? t('editEvent') : t('newEvent')} onClose={onClose} />

        {/* Picture */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[16/7] group">
          <img src={d.imageUrl || EVENT_DEFAULT_IMAGE} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-end justify-end gap-1.5 p-2 bg-gradient-to-t from-black/40 to-transparent">
            {d.imageUrl && (
              <button type="button" onClick={() => set('imageUrl', '')} className="px-2.5 py-1.5 rounded-xl bg-white/90 text-[11px] font-black text-rose-600 cursor-pointer">
                {t('removePicture')}
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="px-2.5 py-1.5 rounded-xl bg-white text-[11px] font-black text-slate-900 flex items-center gap-1 cursor-pointer">
              <Camera className="w-3.5 h-3.5" /> {d.imageUrl ? t('changePicture') : t('addPicture')}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </div>

        <label className="block space-y-1">
          <span>{t('fTitle')} *</span>
          <input required maxLength={120} value={d.title} onChange={(e) => set('title', e.target.value)} placeholder={t('fTitlePh')} className={inputCls} autoFocus={!event} />
        </label>
        <label className="block space-y-1">
          <span>{t('fDescription')}</span>
          <textarea rows={3} maxLength={3000} value={d.description} onChange={(e) => set('description', e.target.value)} placeholder={t('fDescriptionPh')} className={`${inputCls} resize-y`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span>{t('fDate')} *</span>
            <input type="date" required value={d.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span>{t('fEndDate')}</span>
            <input type="date" min={d.date || undefined} value={d.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span>{t('fStart')}</span>
            <input type="time" value={d.startTime} onChange={(e) => set('startTime', e.target.value)} className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span>{t('fEnd')}</span>
            <input type="time" value={d.endTime} onChange={(e) => set('endTime', e.target.value)} className={inputCls} />
          </label>
        </div>
        <label className="block space-y-1">
          <span>{t('fPlace')}</span>
          <input maxLength={160} value={d.location} onChange={(e) => set('location', e.target.value)} placeholder={t('fPlacePh')} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="block space-y-1">
            <span>{t('fFee')}</span>
            <input type="number" min={0} step="0.001" value={d.fee} onChange={(e) => set('fee', e.target.value)} placeholder="0" className={`${inputCls} font-mono`} />
            <span className="block text-[10px] font-semibold text-slate-400">{t('fFeeHint')}</span>
          </label>
          <label className="block space-y-1">
            <span>{t('fCapacity')}</span>
            <input type="number" min={1} step={1} value={d.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="∞" className={`${inputCls} font-mono`} />
            <span className="block text-[10px] font-semibold text-slate-400">{t('fCapacityHint')}</span>
          </label>
          <label className="block space-y-1 col-span-2 sm:col-span-1">
            <span>{t('fDeadline')}</span>
            <input type="date" max={d.date || undefined} value={d.registrationDeadline} onChange={(e) => set('registrationDeadline', e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <Toggle checked={d.visible} onChange={(v) => set('visible', v)} label={t('fVisible')} hint={t('fVisibleHint')} />
          <Toggle checked={d.registrationOpen} onChange={(v) => set('registrationOpen', v)} label={t('fOpen')} hint={t('fOpenHint')} />
        </div>
        {d.visible && (
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-[#fdf4ff] border-2 border-[#f0abfc] cursor-pointer">
            <input type="checkbox" checked={tellFamilies} onChange={(e) => setTellFamilies(e.target.checked)} className="w-4 h-4 accent-[#a21caf]" />
            <BellRing className="w-4 h-4 text-[#a21caf]" />
            <span className="text-xs font-black text-slate-800">{event?.notifiedAt ? t('fNotifyAgain') : t('fNotify')}</span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t-2 border-slate-100">
          <button type="button" onClick={onClose} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving || !d.title.trim() || !d.date} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-50">
            {saving ? '…' : t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const AddChildrenModal: React.FC<{ event: ClubEvent; registrations: EventRegistration[]; onClose: () => void }> = ({ event, registrations, onClose }) => {
  const { students, groups, addEventStudents } = useApp();
  const t = useT(eventsMessages);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState<string>('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'accepted' | 'pending' | 'waitlist'>('accepted');
  const [saving, setSaving] = useState(false);

  const regOf = new Map(registrations.filter(isActiveRegistration).map((r) => [r.studentId, r]));
  const accepted = registrations.filter((r) => r.status === 'accepted').length;
  const left = event.capacity ? Math.max(0, event.capacity - accepted) : null;
  const q = search.trim().toLowerCase();
  const list = students
    .filter((s) => classId === 'all' || (classId === 'none' ? s.groupIds.length === 0 : s.groupIds.includes(classId)))
    .filter((s) => !q || s.studentName.toLowerCase().includes(q) || s.parentName.toLowerCase().includes(q))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
  const free = list.filter((s) => !regOf.has(s.id));
  const allPicked = free.length > 0 && free.every((s) => picked.has(s.id));
  const tooMany = status === 'accepted' && left !== null && picked.size > left;

  const submit = async () => {
    setSaving(true);
    const ok = await addEventStudents(event.id, [...picked], status);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-3">
        <ModalHeader title={t('addChildrenTitle')} sub={event.title} onClose={onClose} />
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchChildren')} className={`${inputCls} ps-9 py-1.5 text-xs`} autoFocus />
          </div>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${inputCls} py-1.5 text-xs sm:w-56`}>
            <option value="all">{t('allClasses')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value="none">{t('noClass')}</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allPicked}
              disabled={!free.length}
              onChange={() =>
                setPicked((p) => {
                  const next = new Set(p);
                  free.forEach((s) => (allPicked ? next.delete(s.id) : next.add(s.id)));
                  return next;
                })
              }
              className="w-4 h-4 accent-[#c11e3d]"
            />
            {t('selectAllShown', { count: free.length })}
          </label>
          <span>{t('pickedCount', { count: picked.size })}</span>
        </div>
        <ul className="scroll-panel max-h-[45vh] rounded-2xl border-2 border-slate-100 divide-y divide-slate-100">
          {list.length === 0 && <li className="p-6 text-center text-xs font-medium text-slate-400">{t('noChildFound')}</li>}
          {list.map((s: Student) => {
            const reg = regOf.get(s.id);
            const classes = groups.filter((g) => s.groupIds.includes(g.id)).map((g) => g.name).join(', ');
            return (
              <li key={s.id}>
                <label className={`flex items-center gap-3 px-3 py-2 ${reg ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    disabled={!!reg}
                    checked={!!reg || picked.has(s.id)}
                    onChange={() => setPicked((p) => (p.has(s.id) ? new Set([...p].filter((x) => x !== s.id)) : new Set([...p, s.id])))}
                    className="w-4 h-4 accent-[#c11e3d]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-800 truncate">
                      {s.studentName} <span className="text-[11px] font-bold text-slate-400">{t('age', { age: ageOf(s) })}</span>
                    </span>
                    <span className="block text-[11px] font-semibold text-slate-500 truncate">
                      {s.parentName || '—'}
                      {classes ? ` · ${classes}` : ''}
                      {s.status === 'waitlist' ? ` · ${t('childPending')}` : ''}
                    </span>
                  </span>
                  {reg && <RegStatusPill status={reg.status} />}
                </label>
              </li>
            );
          })}
        </ul>
        <div className="space-y-1">
          <div className="text-xs font-black text-slate-700">{t('registerAs')}</div>
          <div className="flex flex-wrap gap-1.5">
            {(['accepted', 'pending', 'waitlist'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-black cursor-pointer ${status === s ? REG_STATUS_STYLE[s].cls : 'bg-white border-slate-200 text-slate-500'}`}
              >
                {t(`st_${s}`)}
              </button>
            ))}
          </div>
          {left !== null && <p className={`text-[11px] font-bold ${tooMany ? 'text-rose-600' : 'text-slate-400'}`}>{t('placesLeft', { count: left })}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t-2 border-slate-100">
          <button type="button" onClick={onClose} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="button" onClick={submit} disabled={saving || picked.size === 0 || tooMany} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-50">
            {t('registerCount', { count: picked.size })}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/** One registration: status, amount (discount, free place), payment and the club's note */
const RegistrationModal: React.FC<{ reg: EventRegistration; event: ClubEvent; name: string; onClose: () => void }> = ({ reg, event, name, onClose }) => {
  const { updateEventRegistration, saveEventPayment, removeEventRegistration } = useApp();
  const t = useT(eventsMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 3 });
  const [status, setStatus] = useState<EventRegistrationStatus>(reg.status);
  const [custom, setCustom] = useState(reg.customFee !== undefined ? String(reg.customFee) : '');
  const [paid, setPaid] = useState(String(reg.amountPaid || ''));
  const [method, setMethod] = useState<PaymentMethod | undefined>(reg.method || 'cash');
  const [paidAt, setPaidAt] = useState(reg.paidAt || toISODate(new Date()));
  const [note, setNote] = useState(reg.adminNote || '');
  const [saving, setSaving] = useState(false);

  const due = custom === '' ? event.fee : Number(custom) || 0;
  const paidNum = paid === '' ? 0 : Number(paid) || 0;

  const save = async () => {
    setSaving(true);
    const patch: { status?: EventRegistrationStatus; customFee?: number | null; adminNote?: string } = {};
    if (status !== reg.status) patch.status = status;
    const newCustom = custom === '' ? null : Number(custom);
    if (newCustom !== (reg.customFee ?? null)) patch.customFee = newCustom;
    if (note.trim() !== (reg.adminNote || '')) patch.adminNote = note.trim();
    let ok = true;
    if (Object.keys(patch).length) ok = await updateEventRegistration(reg.id, patch);
    const payChanged = paidNum !== reg.amountPaid || (paidNum > 0 && (method !== reg.method || paidAt !== reg.paidAt));
    if (ok && payChanged) ok = await saveEventPayment(reg.id, { amountPaid: paidNum, method: paidNum > 0 ? method : undefined, paidAt: paidNum > 0 ? paidAt : undefined });
    setSaving(false);
    if (ok) onClose();
  };

  const remove = async () => {
    const ok = await confirm({ title: t('confirmRemoveReg', { name }), message: t('confirmRemoveRegText'), confirmLabel: t('remove'), danger: true });
    if (ok && (await removeEventRegistration(reg.id))) onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4 text-xs font-bold text-slate-700">
        <ModalHeader title={name} sub={event.title} onClose={onClose} />

        {(reg.parentName || reg.parentPhone) && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-50">
            <span className="text-slate-800">{reg.parentName}</span>
            {reg.parentPhone && (
              <>
                <a href={`tel:${reg.parentPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline" dir="ltr">
                  <Phone className="w-3 h-3" /> {ltr(reg.parentPhone)}
                </a>
                <a
                  href={whatsappLink(reg.parentPhone, t('waMessage', { child: name, event: event.title }))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                >
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              </>
            )}
            <span className="ms-auto text-[10px] text-slate-400">{reg.source === 'parent' ? t('byParent') : t('byClub')}</span>
          </div>
        )}
        {reg.parentNote && <p className="px-3 py-2 rounded-2xl bg-amber-50 border-2 border-amber-100 italic font-semibold text-slate-700">“{reg.parentNote}”</p>}

        <div className="space-y-1">
          <span>{t('colStatus')}</span>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_REGISTRATION_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-2.5 py-1.5 rounded-xl border-2 text-[11px] font-black cursor-pointer ${status === s ? REG_STATUS_STYLE[s].cls : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                {t(`st_${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span>{t('amountDue')}</span>
          <div className="flex items-center gap-2">
            <input type="number" min={0} step="0.001" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={fmt(event.fee)} className={`${inputCls} font-mono`} />
            <button type="button" onClick={() => setCustom('0')} className="px-2.5 py-2 btn-duo-secondary text-[11px] font-black whitespace-nowrap cursor-pointer">
              {t('freePlace')}
            </button>
            {custom !== '' && (
              <button type="button" onClick={() => setCustom('')} className="px-2.5 py-2 btn-duo-secondary text-[11px] font-black whitespace-nowrap cursor-pointer">
                {t('useEventFee')}
              </button>
            )}
          </div>
          <span className="block text-[10px] font-semibold text-slate-400">{t('amountDueHint', { fee: fmt(event.fee) })}</span>
        </div>

        <div className="space-y-2 p-3 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center justify-between">
            <span>{t('payment')}</span>
            <PayPill status={eventPaymentStatus(due, paidNum)} due={due} paid={paidNum} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[11px]">{t('amountPaid')}</span>
              <div className="flex gap-1">
                <input type="number" min={0} step="0.001" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" className={`${inputCls} font-mono`} />
                {due > 0 && paidNum !== due && (
                  <button type="button" onClick={() => setPaid(String(due))} className="px-2 btn-duo-secondary text-[10px] font-black cursor-pointer" title={t('fullAmount')}>
                    {t('full')}
                  </button>
                )}
              </div>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px]">{t('paidOn')}</span>
              <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} disabled={paidNum <= 0} className={`${inputCls} disabled:opacity-50`} />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                disabled={paidNum <= 0}
                onClick={() => setMethod(m)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black border-2 cursor-pointer disabled:opacity-40 ${
                  method === m && paidNum > 0 ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {t(`m_${m}`)}
              </button>
            ))}
          </div>
          {reg.amountPaid > 0 && <p className="text-[10px] font-semibold text-slate-400">{t('refundHint')}</p>}
        </div>

        <label className="block space-y-1">
          <span>{t('clubNote')}</span>
          <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('clubNotePh')} className={`${inputCls} resize-y`} />
        </label>

        <div className="flex items-center gap-2 pt-2 border-t-2 border-slate-100">
          {reg.amountPaid === 0 && (
            <button type="button" onClick={remove} className="px-3 py-2 btn-duo-secondary text-xs font-bold text-[#c11e3d] cursor-pointer">
              {t('remove')}
            </button>
          )}
          <button type="button" onClick={onClose} className="ms-auto px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="button" onClick={save} disabled={saving} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-50">
            {t('save')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
