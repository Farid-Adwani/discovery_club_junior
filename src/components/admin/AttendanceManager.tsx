import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  Clock,
  Eraser,
  FileText,
  History,
  Printer,
  Save,
  TrendingUp,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Group, SessionGuest, SessionRecord, Student, StudentAttendanceRecord } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { attendanceMessages } from '../../i18n/messages/attendance';
import { useConfirm } from '../common/ConfirmProvider';
import { ageOf } from '../../utils/age';
import { addDays, DAY_INDEX, fromISODate, startOfWeek, toISODate, weekdayName } from '../../utils/schedule';

type Status = StudentAttendanceRecord['status'];
type Draft = {
  records: Record<string, StudentAttendanceRecord>;
  extraIds: string[];
  guests: SessionGuest[];
  topic: string;
  week: number;
  notes: string;
  validated: boolean;
};

/** Each status has an icon and a label, never colour alone */
const STATUS: Record<Exclude<Status, 'unmarked'>, { key: 'stPresent' | 'stLate' | 'stAbsent'; short: 'colP' | 'colL' | 'colA'; on: string; dot: string; icon: React.ElementType }> = {
  present: { key: 'stPresent', short: 'colP', on: 'bg-[#15803d] text-white', dot: '#15803d', icon: Check },
  late: { key: 'stLate', short: 'colL', on: 'bg-amber-400 text-amber-950', dot: '#c9a227', icon: Clock },
  absent: { key: 'stAbsent', short: 'colA', on: 'bg-[#c11e3d] text-white', dot: '#c11e3d', icon: X }
};
const MARKS: Exclude<Status, 'unmarked'>[] = ['present', 'late', 'absent'];

const AVATAR_COLORS = ['#c11e3d', '#191919', '#6a0d1f', '#c9a227', '#4f4f4f'];
const colorOf = (id: string) => AVATAR_COLORS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** The class's most recent day (today when it is on today) */
const lastClassDate = (g: Group, today = new Date()) => {
  const back = (today.getDay() - DAY_INDEX[g.dayOfWeek] + 7) % 7;
  return toISODate(addDays(today, -back));
};
const nextClassDate = (g: Group, today = new Date()) => {
  const ahead = (DAY_INDEX[g.dayOfWeek] - today.getDay() + 7) % 7 || 7;
  return toISODate(addDays(today, ahead));
};

const emptyDraft = (week: number): Draft => ({ records: {}, extraIds: [], guests: [], topic: '', week, notes: '', validated: false });

const draftFrom = (s: SessionRecord): Draft => ({
  records: { ...s.records },
  extraIds: s.extraStudentIds || [],
  guests: s.guests || [],
  topic: s.topicTaught || '',
  week: s.weekNumber,
  notes: s.trainerNotes || '',
  validated: s.isSyllabusValidated
});

/** Admin "Attendance" tab: one sheet per class and date, shared with the trainer portal; prints a real paper sheet. */
export const AttendanceManager: React.FC = () => {
  const { groups, students, sessions, sessionsFrom, loadSessionsFrom, trainers, saveSessionAttendance } = useApp();
  const t = useT(attendanceMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();
  const now = new Date();
  const todayIso = toISODate(now);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => DAY_INDEX[a.dayOfWeek] - DAY_INDEX[b.dayOfWeek] || a.timeSlot.localeCompare(b.timeSlot)),
    [groups]
  );
  // Start on a class that meets today, else the first one
  const [groupId, setGroupIdState] = useState(
    () => sortedGroups.find((g) => DAY_INDEX[g.dayOfWeek] === now.getDay())?.id || sortedGroups[0]?.id || ''
  );
  const group = groups.find((g) => g.id === groupId);
  const [date, setDateState] = useState(() => (group ? lastClassDate(group) : todayIso));

  const classSessions = useMemo(
    () => sessions.filter((s) => s.groupId === groupId).sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, groupId]
  );
  const saved = classSessions.find((s) => s.date === date);
  // Older sheets may not be loaded, so the week follows the last sheet before this date
  const lastBefore = classSessions.find((s) => s.date < date);
  const defaultWeek = lastBefore ? lastBefore.weekNumber + 1 : 1;

  const [draft, setDraft] = useState<Draft>(() => (saved ? draftFrom(saved) : emptyDraft(defaultWeek)));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState<null | 'student' | 'guest'>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [printBlank, setPrintBlank] = useState(false);

  // Open the saved sheet (or a fresh one) when the class or date changes, and pick up saves made elsewhere
  useEffect(() => {
    setDraft(saved ? draftFrom(saved) : emptyDraft(defaultWeek));
    setDirty(false);
  }, [groupId, date]);
  useEffect(() => {
    if (dirty) return;
    if (saved) setDraft(draftFrom(saved));
    // A new sheet's week follows the sheets already saved for the class (they may load after the page)
    else setDraft((d) => ({ ...d, week: defaultWeek }));
  }, [saved?.id, saved?.updatedAt, defaultWeek]);

  const leaveOk = async () =>
    !dirty || (await confirm({ title: t('confirmLeave'), confirmLabel: t('confirmLeaveOk'), danger: true }));
  const setGroupId = async (id: string) => {
    if (id === groupId || !(await leaveOk())) return;
    const g = groups.find((x) => x.id === id);
    setGroupIdState(id);
    if (g) setDateState(lastClassDate(g));
  };
  const setDate = async (d: string) => {
    if (!d || d === date || !(await leaveOk())) return;
    setDateState(d);
    // A date before the loaded sheets: fetch the older ones too
    loadSessionsFrom(d);
  };
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadOlder = async () => {
    const d = new Date(`${sessionsFrom}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 6);
    setLoadingOlder(true);
    await loadSessionsFrom(d.toISOString().slice(0, 10));
    setLoadingOlder(false);
  };

  const change = (fn: (d: Draft) => Draft) => {
    setDraft(fn);
    setDirty(true);
  };
  const recordOf = (id: string): StudentAttendanceRecord => draft.records[id] || { studentId: id, status: 'unmarked' };
  const setRecord = (id: string, patch: Partial<StudentAttendanceRecord>) =>
    change((d) => ({ ...d, records: { ...d.records, [id]: { ...recordOf(id), ...patch, studentId: id } } }));

  // ---------- roster ----------
  const members = useMemo(
    () => students.filter((s) => s.groupIds.includes(groupId)).sort((a, b) => a.studentName.localeCompare(b.studentName)),
    [students, groupId]
  );
  const extras = draft.extraIds.map((id) => students.find((s) => s.id === id)).filter((s): s is Student => !!s);
  const roster = [...members, ...extras];
  const addable = students
    .filter((s) => s.status === 'accepted' && !roster.some((r) => r.id === s.id))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  const statusCounts = (list: Status[]) => ({
    present: list.filter((s) => s === 'present').length,
    late: list.filter((s) => s === 'late').length,
    absent: list.filter((s) => s === 'absent').length,
    unmarked: list.filter((s) => s === 'unmarked').length
  });
  const counts = statusCounts([...roster.map((s) => recordOf(s.id).status), ...draft.guests.map((g) => g.status)]);
  const total = roster.length + draft.guests.length;

  // Last sessions of this class, for the dots next to each child
  const recentOf = (id: string) =>
    classSessions
      .filter((s) => s.date < date && s.records[id])
      .slice(0, 5)
      .reverse()
      .map((s) => ({ date: s.date, status: s.records[id].status }));

  // ---------- metrics ----------
  const month = todayIso.slice(0, 7);
  const since30 = toISODate(addDays(now, -30));
  const monthSessions = sessions.filter((s) => s.date.startsWith(month));
  const lines30 = sessions.filter((s) => s.date >= since30).flatMap((s) => Object.values(s.records)).filter((r) => r.status !== 'unmarked');
  const rate30 = lines30.length ? Math.round((lines30.filter((r) => r.status !== 'absent').length / lines30.length) * 100) : null;
  const absencesMonth = monthSessions.flatMap((s) => Object.values(s.records)).filter((r) => r.status === 'absent').length;
  const weekStartIso = toISODate(startOfWeek(now));
  const missing = sortedGroups.filter((g) => {
    const d = lastClassDate(g);
    return d >= weekStartIso && !sessions.some((s) => s.groupId === g.id && s.date === d);
  });

  const classRate = (g: Group) => {
    const lines = sessions.filter((s) => s.groupId === g.id).flatMap((s) => Object.values(s.records)).filter((r) => r.status !== 'unmarked');
    return lines.length ? Math.round((lines.filter((r) => r.status !== 'absent').length / lines.length) * 100) : null;
  };

  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
    fromISODate(iso).toLocaleDateString(locale, opts);
  const trainerNames = group ? group.trainerIds.map((id) => trainers.find((tr) => tr.id === id)?.name).filter(Boolean).join(', ') : '';

  // ---------- actions ----------
  const save = async () => {
    if (!group) return;
    setSaving(true);
    const records = Object.fromEntries(roster.map((s) => [s.id, recordOf(s.id)]));
    const ok = await saveSessionAttendance(group.id, date, draft.week, draft.topic, records, draft.validated, draft.notes, {
      extraStudentIds: draft.extraIds,
      guests: draft.guests
    });
    setSaving(false);
    if (ok) setDirty(false);
  };

  const markAll = (status: Status) =>
    change((d) => ({
      ...d,
      records: Object.fromEntries(
        roster.map((s) => {
          const r = d.records[s.id] || { studentId: s.id, status: 'unmarked' as Status };
          return [s.id, { ...r, status, ...(status === 'absent' || status === 'unmarked' ? { rating: undefined } : {}) }];
        })
      ),
      guests: d.guests.map((g) => ({ ...g, status }))
    }));

  const toggleStatus = (id: string, status: Status) => {
    const next = recordOf(id).status === status ? 'unmarked' : status;
    // An absent child is not rated
    setRecord(id, next === 'absent' ? { status: next, rating: undefined } : { status: next });
  };

  const addGuest = () => {
    if (!guestName.trim()) return;
    change((d) => ({
      ...d,
      guests: [...d.guests, { id: `guest-${Date.now()}`, name: guestName.trim(), ...(guestPhone.trim() ? { phone: guestPhone.trim() } : {}), status: 'present' }]
    }));
    setGuestName('');
    setGuestPhone('');
    setAdding(null);
  };

  const print = (blank: boolean) => {
    setPrintBlank(blank);
    // Let the sheet render with the right content before the print dialog opens
    setTimeout(() => window.print(), 60);
  };

  if (!group) {
    return <div className="py-14 text-center text-sm font-medium text-slate-400 rounded-3xl border-2 border-dashed border-slate-200 bg-white">{t('noClasses')}</div>;
  }

  const isClassDay = fromISODate(date).getDay() === DAY_INDEX[group.dayOfWeek];
  const last = lastClassDate(group);
  const next = nextClassDate(group);

  const StatusButtons: React.FC<{ status: Status; onPick: (s: Status) => void }> = ({ status, onPick }) => (
    <div className="inline-flex p-0.5 rounded-xl bg-slate-100 shrink-0" role="radiogroup">
      {MARKS.map((m) => {
        const meta = STATUS[m];
        const Icon = meta.icon;
        const active = status === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(meta.key)}
            onClick={() => onPick(m)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-[11px] font-black cursor-pointer transition-all ${
              active ? `${meta.on} shadow-sm` : 'text-slate-500 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className={active ? '' : 'lg:hidden xl:inline'}>{t(meta.key)}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header + metrics */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-6">
        <div className="absolute -top-20 -end-16 w-72 h-72 rounded-full bg-[#c11e3d]/40 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-black uppercase tracking-wide">
            <ClipboardList className="w-3.5 h-3.5" /> {t('badge')}
          </div>
          <h3 className="text-2xl font-black mt-2">{t('title')}</h3>
          <p className="text-xs font-medium text-white/60">{t('subtitle')}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
            {[
              { icon: <FileText className="w-4 h-4" />, label: t('statSessions'), value: String(monthSessions.length), sub: '' },
              { icon: <TrendingUp className="w-4 h-4" />, label: t('statRate'), value: rate30 === null ? '—' : `${rate30}%`, sub: t('statRateSub') },
              { icon: <AlertCircle className="w-4 h-4" />, label: t('statAbsences'), value: String(absencesMonth), sub: '' },
              {
                icon: <CalendarCheck className="w-4 h-4" />,
                label: t('statMissing'),
                value: String(missing.length),
                sub: missing.length ? missing.map((g) => g.name).join(', ') : t('statMissingNone'),
                alert: missing.length > 0
              }
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-2xl bg-white/10">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/60">
                  <span className="truncate">{s.label}</span>
                  <span className={'alert' in s && s.alert ? 'text-[#ff8fa3]' : ''}>{s.icon}</span>
                </div>
                <div className="text-2xl font-black font-mono mt-1">{s.value}</div>
                {s.sub && <div className="text-[11px] font-semibold text-white/60 truncate">{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* One tile per class */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {sortedGroups.map((g) => {
          const active = g.id === groupId;
          const kids = students.filter((s) => s.groupIds.includes(g.id)).length;
          const lastSheet = sessions.filter((s) => s.groupId === g.id).sort((a, b) => b.date.localeCompare(a.date))[0];
          const rate = classRate(g);
          const today = DAY_INDEX[g.dayOfWeek] === now.getDay();
          const todo = missing.some((m) => m.id === g.id);
          return (
            <button
              key={g.id}
              onClick={() => setGroupId(g.id)}
              aria-pressed={active}
              className={`relative shrink-0 w-56 text-start p-4 rounded-3xl border-2 transition-all cursor-pointer ${
                active ? 'bg-white border-[#c11e3d] shadow-lg -translate-y-0.5' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {todo && <span className="absolute top-3 end-3 w-2.5 h-2.5 rounded-full bg-[#c11e3d] animate-pulse" title={t('statMissing')} />}
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                <CalendarDays className="w-3 h-3" />
                {weekdayName(g.dayOfWeek, locale)} · {g.timeSlot}
                {today && <span className="ms-1 px-1.5 rounded bg-[#c11e3d] text-white normal-case">{t('classToday')}</span>}
              </div>
              <div className="font-black text-slate-900 mt-1 truncate">{g.name}</div>
              <div className="flex items-center justify-between mt-2 text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t('classKids', { count: kids })}
                </span>
                {rate !== null && <span className="text-slate-700">{t('classRate', { rate })}</span>}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {lastSheet ? t('classLast', { date: fmt(lastSheet.date, { day: 'numeric', month: 'short' }) }) : t('classNever')}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        {/* The sheet */}
        <div className="duo-card hover:transform-none! bg-white overflow-hidden">
          {/* Date bar */}
          <div className="p-4 sm:p-5 border-b-2 border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 me-1">{t('dateLabel')}</span>
              {[
                { iso: last, label: last === todayIso ? t('classToday') : t('lastClass') },
                { iso: next, label: t('nextClass') }
              ].map((c) => (
                <button
                  key={c.iso}
                  onClick={() => setDate(c.iso)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 cursor-pointer transition-all ${
                    date === c.iso ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c11e3d]'
                  }`}
                >
                  {c.label} · <span className="font-semibold capitalize">{fmt(c.iso)}</span>
                </button>
              ))}
              <label
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border-2 transition-all ${
                  date !== last && date !== next ? 'border-[#c11e3d] text-slate-800' : 'border-slate-200 text-slate-500'
                }`}
              >
                {t('customDate')}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent font-bold focus:outline-none cursor-pointer"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold">
              {saved ? (
                <span className="inline-flex items-center gap-1 text-[#15803d]">
                  <CheckCheck className="w-3.5 h-3.5" />
                  {saved.updatedAt
                    ? saved.updatedBy
                      ? t('savedInfo', { date: new Date(saved.updatedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), name: saved.updatedBy })
                      : t('savedInfoShort', { date: new Date(saved.updatedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })
                    : t('savedInfoShort', { date: fmt(saved.date) })}
                </span>
              ) : (
                <span className="text-slate-400">{t('newSheet')}</span>
              )}
              {dirty && <span className="inline-flex items-center gap-1 text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{t('unsaved')}</span>}
              {!isClassDay && <span className="text-amber-700">{t('notClassDay', { day: weekdayName(group.dayOfWeek, locale) })}</span>}
              <span className="text-slate-400">{t('sharedNote')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] gap-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('week')}</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={draft.week}
                  onChange={(e) => change((d) => ({ ...d, week: Number(e.target.value) }))}
                  className="w-full mt-0.5 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black font-mono focus:outline-none focus:border-[#c11e3d]"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('topic')}</span>
                <input
                  value={draft.topic}
                  onChange={(e) => change((d) => ({ ...d, topic: e.target.value }))}
                  placeholder={t('topicPh')}
                  maxLength={300}
                  className="w-full mt-0.5 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d] focus:bg-white"
                />
              </label>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 bg-slate-50/70 border-b-2 border-slate-100">
            <div className="flex flex-wrap gap-1.5 text-[11px] font-black">
              {MARKS.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS[m].dot }} />
                  {counts[m]} {t(STATUS[m].key)}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-400">
                {counts.unmarked} {t('stUnmarked')}
              </span>
            </div>
            <div className="flex gap-1.5 ms-auto">
              <button onClick={() => markAll('present')} className="px-3 py-1.5 btn-duo-secondary text-[11px] font-black flex items-center gap-1 cursor-pointer">
                <CheckCheck className="w-3.5 h-3.5 text-[#15803d]" /> {t('allPresent')}
              </button>
              <button onClick={() => markAll('unmarked')} className="px-3 py-1.5 btn-duo-secondary text-[11px] font-black flex items-center gap-1 cursor-pointer">
                <Eraser className="w-3.5 h-3.5" /> {t('clearAll')}
              </button>
            </div>
          </div>

          {/* Rows */}
          {roster.length === 0 && draft.guests.length === 0 ? (
            <div className="p-10 text-center text-sm font-medium text-slate-400">{t('noKids')}</div>
          ) : (
            <ol className="divide-y divide-slate-100">
              {roster.map((st, i) => {
                const r = recordOf(st.id);
                const extra = draft.extraIds.includes(st.id);
                const recent = recentOf(st.id);
                return (
                  <li
                    key={st.id}
                    className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.6fr)] gap-x-4 gap-y-2 items-center px-4 sm:px-5 py-3 hover:bg-[#fdf2f4]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-end text-[11px] font-black font-mono text-slate-300 shrink-0">{i + 1}</span>
                      {st.photoURL ? (
                        <img src={st.photoURL} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                      ) : (
                        <span className="w-9 h-9 rounded-xl grid place-items-center text-white text-[11px] font-black shrink-0" style={{ background: colorOf(st.id) }}>
                          {initialsOf(st.studentName)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-slate-900 truncate">{st.studentName}</span>
                          {extra && <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-black uppercase text-slate-500">{t('extraTag')}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                          <span>{t('years', { age: ageOf(st) })}</span>
                          {recent.length > 0 && (
                            <span className="flex items-center gap-0.5" title={t('recent')}>
                              ·
                              {recent.map((x) => (
                                <span
                                  key={x.date}
                                  title={`${fmt(x.date)}: ${x.status === 'unmarked' ? t('stUnmarked') : t(STATUS[x.status].key)}`}
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: x.status === 'unmarked' ? '#e2e8f0' : STATUS[x.status].dot }}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                      {extra && (
                        <button
                          onClick={() => change((d) => ({ ...d, extraIds: d.extraIds.filter((id) => id !== st.id) }))}
                          title={t('remove')}
                          aria-label={t('remove')}
                          className="ms-auto lg:hidden p-1 rounded-lg text-slate-400 hover:text-[#c11e3d] cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <StatusButtons status={r.status} onPick={(s) => toggleStatus(st.id, s)} />

                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step="0.5"
                        value={r.rating ?? ''}
                        disabled={r.status === 'absent'}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRecord(st.id, { rating: v === '' ? undefined : Math.min(20, Math.max(0, Number(v))) });
                        }}
                        placeholder={t('markPh')}
                        title={r.ratedBy ? t('markBy', { name: r.ratedBy }) : t('colMark')}
                        aria-label={t('colMark')}
                        className="w-16 shrink-0 px-2 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-lg text-xs font-black font-mono text-center focus:outline-none focus:border-[#c11e3d] focus:bg-white disabled:opacity-40"
                      />
                      <input
                        value={r.remarks || ''}
                        onChange={(e) => setRecord(st.id, { remarks: e.target.value })}
                        placeholder={t('commentPh')}
                        aria-label={t('colComment')}
                        maxLength={1000}
                        className="flex-1 min-w-0 px-3 py-1.5 bg-slate-50 border-2 border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#c11e3d] focus:bg-white"
                      />
                      {extra && (
                        <button
                          onClick={() => change((d) => ({ ...d, extraIds: d.extraIds.filter((id) => id !== st.id) }))}
                          title={t('remove')}
                          aria-label={t('remove')}
                          className="hidden lg:grid w-8 h-8 place-items-center rounded-lg text-slate-400 hover:text-[#c11e3d] hover:bg-[#fbe3e7] cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}

              {draft.guests.map((g, i) => (
                <li
                  key={g.id}
                  className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.6fr)] gap-x-4 gap-y-2 items-center px-4 sm:px-5 py-3 bg-slate-50/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-end text-[11px] font-black font-mono text-slate-300 shrink-0">{roster.length + i + 1}</span>
                    <span className="w-9 h-9 rounded-xl grid place-items-center bg-white border-2 border-dashed border-slate-300 text-slate-400 shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-slate-900 truncate">{g.name}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-[#fdf3d1] text-[9px] font-black uppercase text-[#6b5310]">{t('guestTag')}</span>
                      </div>
                      {g.phone && (
                        <div className="text-[10px] font-semibold text-slate-400" dir="ltr">
                          {g.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <StatusButtons
                    status={g.status}
                    onPick={(s) => change((d) => ({ ...d, guests: d.guests.map((x) => (x.id === g.id ? { ...x, status: x.status === s ? 'unmarked' : s } : x)) }))}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      value={g.remarks || ''}
                      onChange={(e) => change((d) => ({ ...d, guests: d.guests.map((x) => (x.id === g.id ? { ...x, remarks: e.target.value } : x)) }))}
                      placeholder={t('remarkPh')}
                      maxLength={500}
                      className="flex-1 min-w-0 px-3 py-1.5 bg-white border-2 border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#c11e3d]"
                    />
                    <button
                      onClick={() => change((d) => ({ ...d, guests: d.guests.filter((x) => x.id !== g.id) }))}
                      title={t('remove')}
                      aria-label={t('remove')}
                      className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-[#c11e3d] hover:bg-[#fbe3e7] cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Add someone by hand */}
          <div className="px-4 sm:px-5 py-3 border-t-2 border-slate-100">
            {adding === null ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAdding('student')}
                  disabled={addable.length === 0}
                  className="px-3 py-2 rounded-xl border-2 border-dashed border-slate-300 text-xs font-black text-slate-500 hover:border-[#c11e3d] hover:text-[#c11e3d] cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" /> {t('addStudent')}
                </button>
                <button
                  onClick={() => setAdding('guest')}
                  className="px-3 py-2 rounded-xl border-2 border-dashed border-slate-300 text-xs font-black text-slate-500 hover:border-[#c11e3d] hover:text-[#c11e3d] cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> {t('addGuest')}
                </button>
              </div>
            ) : adding === 'student' ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  autoFocus
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    change((d) => ({ ...d, extraIds: [...d.extraIds, id], records: { ...d.records, [id]: { studentId: id, status: 'present' } } }));
                    setAdding(null);
                  }}
                  className="flex-1 min-w-[220px] px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#c11e3d] cursor-pointer"
                >
                  <option value="">{t('addStudentPh')}</option>
                  {addable.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentName} · {s.groupIds.map((id) => groups.find((g) => g.id === id)?.name).filter(Boolean).join(', ') || '—'}
                    </option>
                  ))}
                </select>
                <button onClick={() => setAdding(null)} className="px-3 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addGuest();
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  autoFocus
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t('guestName')}
                  maxLength={120}
                  className="flex-1 min-w-[160px] px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#c11e3d]"
                />
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder={t('guestPhone')}
                  maxLength={30}
                  className="w-44 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#c11e3d]"
                />
                <button type="submit" disabled={!guestName.trim()} className="px-3 py-2 btn-duo-blue text-xs font-black cursor-pointer disabled:opacity-50">
                  {t('add')}
                </button>
                <button type="button" onClick={() => setAdding(null)} className="px-3 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
                  {t('cancel')}
                </button>
              </form>
            )}
          </div>

          {/* Notes + save */}
          <div className="p-4 sm:p-5 border-t-2 border-slate-100 space-y-3 bg-slate-50/50">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('notes')}</span>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => change((d) => ({ ...d, notes: e.target.value }))}
                placeholder={t('notesPh')}
                maxLength={2000}
                className="w-full mt-0.5 px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d]"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => print(false)} className="px-3.5 py-2.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-4 h-4" /> {t('print')}
              </button>
              <button onClick={() => print(true)} className="px-3.5 py-2.5 btn-duo-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer text-slate-500">
                <FileText className="w-4 h-4" /> {t('printBlank')}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className={`ms-auto px-5 py-2.5 btn-duo-green text-sm font-black flex items-center gap-2 cursor-pointer disabled:opacity-60 ${dirty ? 'animate-pulse-glow' : ''}`}
              >
                <Save className="w-4 h-4" /> {t('save')}
              </button>
            </div>
          </div>
        </div>

        {/* Previous sheets */}
        <aside className="duo-card hover:transform-none! bg-white p-4 space-y-3 xl:sticky xl:top-4">
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-400" /> {t('historyTitle')}
          </h4>
          {classSessions.length === 0 ? (
            <p className="text-xs font-medium text-slate-400">{t('historyEmpty')}</p>
          ) : (
            <ul className="space-y-1 scroll-panel max-h-[520px]">
              {classSessions.map((s) => {
                const lines = Object.values(s.records);
                const c = statusCounts(lines.map((r) => r.status));
                const marked = lines.length - c.unmarked;
                const pct = marked ? Math.round(((c.present + c.late) / marked) * 100) : 0;
                const active = s.date === date;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setDate(s.date)}
                      className={`w-full text-start px-3 py-2 rounded-xl transition-colors cursor-pointer ${active ? 'bg-[#fdf2f4] ring-2 ring-[#c11e3d]/30' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between text-xs font-black text-slate-800">
                        <span className="capitalize">{fmt(s.date)}</span>
                        <span className="font-mono text-slate-500">
                          {c.present + c.late}/{lines.length + (s.guests?.length || 0)}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 truncate">
                        {t('week')} {s.weekNumber}
                        {s.topicTaught ? ` · ${s.topicTaught}` : ''}
                      </div>
                      <div className="h-1 mt-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#15803d]" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {sessionsFrom && (
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="w-full text-xs font-black text-slate-500 hover:text-slate-800 py-2 rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-60"
            >
              {loadingOlder ? t('historyLoading') : t('historyOlder')}
            </button>
          )}
        </aside>
      </div>

      {/* Paper sheet, only visible when printing */}
      {createPortal(
        <PrintSheet
          group={group}
          date={date}
          week={draft.week}
          topic={draft.topic}
          trainerNames={trainerNames}
          rows={roster.map((s) => ({ name: s.studentName, age: ageOf(s), phone: s.parentPhone, record: recordOf(s.id), extra: draft.extraIds.includes(s.id) }))}
          guests={draft.guests}
          blank={printBlank}
        />,
        document.body
      )}
    </div>
  );
};

/** A4 attendance sheet: header, one line per child with P / L / A boxes, mark, comment and signature, blank lines for walk-ins */
const PrintSheet: React.FC<{
  group: Group;
  date: string;
  week: number;
  topic: string;
  trainerNames: string;
  rows: { name: string; age: number; phone: string; record: StudentAttendanceRecord; extra: boolean }[];
  guests: SessionGuest[];
  blank: boolean;
}> = ({ group, date, week, topic, trainerNames, rows, guests, blank }) => {
  const t = useT(attendanceMessages);
  const { locale } = useLanguage();
  const lines = [
    ...rows.map((r) => ({ name: r.name, age: String(r.age), phone: r.phone, status: r.record.status, mark: r.record.rating, comment: r.record.remarks, tag: r.extra ? t('extraTag') : '' })),
    ...guests.map((g) => ({ name: g.name, age: '', phone: g.phone || '', status: g.status, mark: undefined, comment: g.remarks, tag: t('guestTag') }))
  ];
  const shown = (s: Status, box: Status) => !blank && s === box;
  const c = (s: Status) => lines.filter((l) => l.status === s).length;
  const box = (on: boolean) => (
    <span className="inline-flex w-4 h-4 border-[1.5px] border-black items-center justify-center text-[11px] leading-none font-black">{on ? '✓' : ''}</span>
  );
  const cell = 'border border-black px-1.5 py-1';

  return (
    <div className="print-sheet text-black bg-white text-[11px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-2">
        <div>
          <div className="text-[18px] font-black uppercase tracking-wide">{t('printTitle')}</div>
          <div className="text-[12px] font-bold">{t('printClub')}</div>
        </div>
        <img src="/favicon.png" alt="" className="w-12 h-12 object-contain" />
      </div>

      <table className="w-full border-collapse mb-3 text-[11px]">
        <tbody>
          <tr>
            <td className={`${cell} font-bold w-[16%]`}>{t('printClass')}</td>
            <td className={`${cell} w-[34%]`}>{group.name}</td>
            <td className={`${cell} font-bold w-[16%]`}>{t('printDate')}</td>
            <td className={`${cell} w-[34%] capitalize`}>
              {blank ? '' : fromISODate(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </td>
          </tr>
          <tr>
            <td className={`${cell} font-bold`}>{t('printDay')}</td>
            <td className={`${cell} capitalize`}>
              {weekdayName(group.dayOfWeek, locale)} · {group.timeSlot}
            </td>
            <td className={`${cell} font-bold`}>{t('printWeek')}</td>
            <td className={cell}>{blank ? '' : week}</td>
          </tr>
          <tr>
            <td className={`${cell} font-bold`}>{t('printTrainer')}</td>
            <td className={cell}>{trainerNames}</td>
            <td className={`${cell} font-bold`}>{t('printRoom')}</td>
            <td className={cell}>{group.room}</td>
          </tr>
          <tr>
            <td className={`${cell} font-bold`}>{t('printTopic')}</td>
            <td className={cell} colSpan={3} style={{ height: 22 }}>
              {blank ? '' : topic}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#eeeeee]">
            <th className={`${cell} w-[4%]`}>{t('colNo')}</th>
            <th className={`${cell} w-[22%] text-start`}>{t('colName')}</th>
            <th className={`${cell} w-[5%]`}>{t('colAge')}</th>
            <th className={`${cell} w-[16%] whitespace-nowrap`}>{t('colPhone')}</th>
            <th className={`${cell} w-[4%]`}>{t('colP')}</th>
            <th className={`${cell} w-[4%]`}>{t('colL')}</th>
            <th className={`${cell} w-[4%]`}>{t('colA')}</th>
            <th className={`${cell} w-[6%]`}>{t('colMark')}</th>
            <th className={`${cell} text-start`}>{t('colComment')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} style={{ height: 26 }}>
              <td className={`${cell} text-center`}>{i + 1}</td>
              <td className={`${cell} font-bold`}>
                {l.name}
                {l.tag && <span className="font-normal italic"> ({l.tag})</span>}
              </td>
              <td className={`${cell} text-center`}>{l.age}</td>
              <td className={`${cell} text-center whitespace-nowrap`} dir="ltr">
                {l.phone}
              </td>
              <td className={`${cell} text-center`}>{box(shown(l.status, 'present'))}</td>
              <td className={`${cell} text-center`}>{box(shown(l.status, 'late'))}</td>
              <td className={`${cell} text-center`}>{box(shown(l.status, 'absent'))}</td>
              <td className={`${cell} text-center`}>{!blank && l.mark !== undefined ? `${l.mark}/20` : ''}</td>
              <td className={cell}>{blank ? '' : l.comment}</td>
            </tr>
          ))}
          {/* Empty lines for children who turn up without being on the list */}
          {Array.from({ length: 4 }, (_, i) => (
            <tr key={`walkin-${i}`} style={{ height: 26 }}>
              <td className={`${cell} text-center`}>{lines.length + i + 1}</td>
              <td className={`${cell} italic text-[#777]`}>{t('printWalkIn')}</td>
              <td className={cell} />
              <td className={cell} />
              <td className={`${cell} text-center`}>{box(false)}</td>
              <td className={`${cell} text-center`}>{box(false)}</td>
              <td className={`${cell} text-center`}>{box(false)}</td>
              <td className={cell} />
              <td className={cell} />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between mt-2 text-[10px]">
        <span>{t('printLegend')}</span>
        {!blank && <span className="font-bold">{t('printTotals', { present: c('present'), late: c('late'), absent: c('absent'), total: lines.length })}</span>}
      </div>

      <div className="grid grid-cols-2 gap-10 mt-10 text-[11px]">
        {[t('printTrainerSign'), t('printOfficeSign')].map((label) => (
          <div key={label}>
            <div className="border-b border-black h-10" />
            <div className="mt-1 font-bold">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-[9px] text-[#777]">
        {t('printPrinted', { date: new Date().toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}
      </div>
    </div>
  );
};
