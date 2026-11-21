import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Clock, Info, MapPin, PartyPopper, Send, Ticket, Users, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ClubEvent, EventRegistration, Student } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { eventsMessages } from '../../i18n/messages/events';
import { useConfirm } from '../common/ConfirmProvider';
import { ModalPortal } from '../common/ModalPortal';
import { DateBadge, PayPill, RegStatusPill, STATE_STYLE, eventDateLabel, eventTimeLabel } from '../common/EventBits';
import { toISODate } from '../../utils/schedule';
import { EVENT_DEFAULT_IMAGE, canRequest, eventPaymentStatus, isActiveRegistration, lastDay, registrationState } from '../../utils/events';

/**
 * Parent space: the club's events. Parents ask to register their children; the club confirms,
 * and the family pays at the club. Shown only when there is an event to show.
 */
export const ParentEvents: React.FC<{ kids: Student[]; activeStudentId: string; readOnly?: boolean }> = ({ kids, activeStudentId, readOnly }) => {
  const { events, eventRegistrations } = useApp();
  const t = useT(eventsMessages);
  const { locale } = useLanguage();
  const todayISO = toISODate(new Date());
  const [registering, setRegistering] = useState<ClubEvent | null>(null);
  const [showPast, setShowPast] = useState(false);

  const kidIds = new Set(kids.map((k) => k.id));
  const familyRegs = eventRegistrations.filter((r) => kidIds.has(r.studentId));
  const regsOf = (e: ClubEvent) => familyRegs.filter((r) => r.eventId === e.id);
  const live = events.filter((e) => !e.deletedAt);
  const upcoming = live.filter((e) => lastDay(e) >= todayISO).sort((a, b) => a.date.localeCompare(b.date));
  // Past events only when a child took part
  const past = live
    .filter((e) => lastDay(e) < todayISO && regsOf(e).some((r) => r.status === 'accepted'))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!upcoming.length && !past.length) return null;

  return (
    <section className="duo-card p-6 bg-white space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b-2 border-slate-100">
        <div>
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-[#a21caf]" />
            {t('p_title')}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">{t('p_sub')}</p>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <p className="py-6 text-center text-xs font-medium text-slate-400">{t('p_noUpcoming')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcoming.map((e, i) => (
            <EventCard key={e.id} event={e} regs={regsOf(e)} kids={kids} index={i} readOnly={readOnly} onRegister={() => setRegistering(e)} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="pt-3 border-t-2 border-slate-100">
          <button onClick={() => setShowPast((v) => !v)} className="text-[11px] font-black text-slate-400 uppercase tracking-wider hover:text-slate-700 cursor-pointer">
            {t('p_past', { count: past.length })} {showPast ? '▴' : '▾'}
          </button>
          {showPast && (
            <ul className="mt-2 space-y-1.5">
              {past.map((e) => (
                <li key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 text-xs">
                  <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-black text-slate-800 truncate">{e.title}</span>
                  <span className="text-slate-500 capitalize shrink-0">{eventDateLabel(e, locale)}</span>
                  <span className="ms-auto text-slate-500 truncate">
                    {regsOf(e)
                      .filter((r) => r.status === 'accepted')
                      .map((r) => kids.find((k) => k.id === r.studentId)?.studentName.split(' ')[0] || r.studentName)
                      .join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {registering && <RegisterModal event={registering} kids={kids} regs={regsOf(registering)} defaultChildId={activeStudentId} onClose={() => setRegistering(null)} />}
    </section>
  );
};

const EventCard: React.FC<{ event: ClubEvent; regs: EventRegistration[]; kids: Student[]; index: number; readOnly?: boolean; onRegister: () => void }> = ({
  event: e,
  regs,
  kids,
  index,
  readOnly,
  onRegister
}) => {
  const { cancelEventRegistration } = useApp();
  const t = useT(eventsMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();
  const todayISO = toISODate(new Date());
  const [expanded, setExpanded] = useState(false);
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 3 });

  const state = registrationState(e, todayISO);
  const placesLeft = e.capacity ? Math.max(0, e.capacity - (e.acceptedCount || 0)) : null;
  const shownRegs = regs.filter((r) => r.status !== 'cancelled');
  const activeKidIds = new Set(regs.filter(isActiveRegistration).map((r) => r.studentId));
  const someoneLeft = kids.some((k) => !activeKidIds.has(k.id));
  const nameOf = (r: EventRegistration) => kids.find((k) => k.id === r.studentId)?.studentName || r.studentName;
  const toPay = shownRegs.filter((r) => r.status === 'accepted').reduce((s, r) => s + Math.max(0, r.amountDue - r.amountPaid), 0);

  const cancel = async (r: EventRegistration) => {
    const ok = await confirm({ title: t('p_confirmCancel', { name: nameOf(r) }), message: t('p_confirmCancelText', { event: e.title }), confirmLabel: t('p_cancelReg'), danger: true });
    if (ok) await cancelEventRegistration(e.id, r.studentId);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-3xl border-2 border-slate-200 overflow-hidden flex flex-col bg-white"
    >
      <div className="relative h-40 bg-slate-100">
        <img src={e.imageUrl || EVENT_DEFAULT_IMAGE} alt="" className="w-full h-full object-cover" />
        <DateBadge date={e.date} className="absolute top-3 start-3" />
        <span className="absolute top-3 end-3 px-2.5 py-1 rounded-full bg-[#191919]/85 text-white text-[11px] font-black">
          {e.fee > 0 ? t('p_feePerChild', { fee: fmt(e.fee) }) : t('free')}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h4 className="text-base font-black text-slate-900 leading-tight">{e.title}</h4>
          <div className="mt-1 text-[11px] font-semibold text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="inline-flex items-center gap-1 capitalize">
              <CalendarDays className="w-3.5 h-3.5" /> {eventDateLabel(e, locale)}
            </span>
            {eventTimeLabel(e) && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {eventTimeLabel(e)}
              </span>
            )}
            {e.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {e.location}
              </span>
            )}
          </div>
        </div>
        {e.description && (
          <div>
            <p className={`text-xs font-medium text-slate-600 whitespace-pre-line ${expanded ? '' : 'line-clamp-3'}`}>{e.description}</p>
            {e.description.length > 160 && (
              <button onClick={() => setExpanded((v) => !v)} className="text-[11px] font-black text-sky-700 hover:underline cursor-pointer">
                {expanded ? t('p_less') : t('p_more')}
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${STATE_STYLE[state]}`}>{t(`state_${state}`)}</span>
          {placesLeft !== null && state !== 'past' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
              <Users className="w-3 h-3" /> {placesLeft > 0 ? t('placesLeft', { count: placesLeft }) : t('p_full')}
            </span>
          )}
          {e.registrationDeadline && state === 'open' && (
            <span className="text-[10px] font-bold text-slate-400">{t('deadlineOn', { date: eventDateLabel({ date: e.registrationDeadline }, locale) })}</span>
          )}
        </div>

        {/* This family's registrations */}
        {shownRegs.length > 0 && (
          <ul className="space-y-1.5">
            {shownRegs.map((r) => {
              const pay = eventPaymentStatus(r.amountDue, r.amountPaid);
              const canCancel = !readOnly && isActiveRegistration(r) && r.amountPaid === 0 && e.date >= todayISO;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-black text-slate-800 me-auto">{nameOf(r)}</span>
                  <RegStatusPill status={r.status} />
                  {r.status === 'accepted' && pay !== 'free' && <PayPill status={pay} due={r.amountDue} paid={r.amountPaid} />}
                  {canCancel && (
                    <button onClick={() => cancel(r)} className="text-[10px] font-black text-rose-600 hover:underline cursor-pointer">
                      {t('p_cancelReg')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {toPay > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" /> {t('p_toPayAtClub', { amount: fmt(toPay) })}
          </p>
        )}

        <div className="mt-auto pt-1">
          {canRequest(state) && someoneLeft && !readOnly ? (
            <button onClick={onRegister} className="w-full py-2.5 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer">
              <Ticket className="w-4 h-4" /> {shownRegs.length ? t('p_registerAnother') : t('p_register')}
            </button>
          ) : canRequest(state) && !someoneLeft ? (
            <p className="text-center text-[11px] font-bold text-slate-400">{t('p_allRegistered')}</p>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
};

const RegisterModal: React.FC<{ event: ClubEvent; kids: Student[]; regs: EventRegistration[]; defaultChildId: string; onClose: () => void }> = ({
  event,
  kids,
  regs,
  defaultChildId,
  onClose
}) => {
  const { registerForEvent } = useApp();
  const t = useT(eventsMessages);
  const { locale } = useLanguage();
  const regOf = new Map(regs.filter(isActiveRegistration).map((r) => [r.studentId, r]));
  const free = kids.filter((k) => !regOf.has(k.id));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(free.some((k) => k.id === defaultChildId) ? [defaultChildId] : free.length === 1 ? [free[0].id] : []));
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const full = registrationState(event, toISODate(new Date())) === 'full';
  const total = event.fee * picked.size;
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 3 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sending && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const send = async () => {
    setSending(true);
    const ok = await registerForEvent(event.id, [...picked], note.trim() || undefined);
    setSending(false);
    if (ok) onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4" onClick={() => !sending && onClose()}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className="duo-card hover:transform-none! bg-white w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900">{t('p_registerTitle')}</h3>
              <p className="text-xs font-semibold text-slate-500 truncate">
                {event.title} · <span className="capitalize">{eventDateLabel(event, locale)}</span>
              </p>
            </div>
            <button onClick={onClose} disabled={sending} aria-label={t('cancel')} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {full && <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border-2 border-amber-100 rounded-xl px-3 py-2">{t('p_fullWarning')}</p>}

          <div className="space-y-2">
            <div className="text-xs font-black text-slate-700">{t('p_whichChildren')}</div>
            <div className="grid gap-2">
              {kids.map((k) => {
                const reg = regOf.get(k.id);
                const on = picked.has(k.id);
                return (
                  <label
                    key={k.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      reg ? 'border-slate-100 bg-slate-50 opacity-70' : on ? 'border-emerald-500 bg-emerald-50 cursor-pointer' : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!!reg}
                      checked={!!reg || on}
                      onChange={() => setPicked((p) => (p.has(k.id) ? new Set([...p].filter((x) => x !== k.id)) : new Set([...p, k.id])))}
                      className="w-4 h-4 accent-[#15803d]"
                    />
                    <span className="text-sm font-black text-slate-800 me-auto">{k.studentName}</span>
                    {reg && <RegStatusPill status={reg.status} />}
                  </label>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-black text-slate-700">{t('p_note')}</span>
            <textarea
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('p_notePh')}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white resize-y"
            />
          </label>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 space-y-1">
            {event.fee > 0 && (
              <div className="flex justify-between font-black text-slate-900">
                <span>{t('p_total', { count: picked.size })}</span>
                <span className="font-mono">{fmt(total)} DT</span>
              </div>
            )}
            <p className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
              {event.fee > 0 ? t('p_howItWorksPaid') : t('p_howItWorks')}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={sending} className="flex-1 py-3 btn-duo-secondary text-xs font-bold cursor-pointer">
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending || picked.size === 0}
              className="flex-[2] py-3 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {sending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Send className="w-4 h-4" />}
              {t('p_send')}
            </button>
          </div>
        </motion.div>
      </div>
    </ModalPortal>
  );
};
