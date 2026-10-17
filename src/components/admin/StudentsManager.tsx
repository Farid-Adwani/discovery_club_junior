import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  GraduationCap,
  Hourglass,
  Layers,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Wand2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MonthlyPaymentStatus, Student } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { studentsMessages } from '../../i18n/messages/students';
import { ageOf } from '../../utils/age';
import { fromISODate, weekdayName } from '../../utils/schedule';
import { currentMonth, monthRows, PaymentRow } from '../../utils/payments';
import { useConfirm } from '../common/ConfirmProvider';
import { StudentScheduleModal } from './StudentScheduleModal';
import { classPriceOf } from './PriceModal';

type Filter = 'all' | 'waitlist' | 'noClass' | 'enrolled' | 'trash';
type Sort = 'smart' | 'newest' | 'name' | 'age';
const VIEW_KEY = 'dcj-students-view';
/** List view columns (written out in full so Tailwind generates the class): child, parent, classes, fee, actions */
const LIST_GRID = 'lg:grid-cols-[minmax(0,1.25fr)_auto_minmax(0,1fr)_minmax(0,1.5fr)_minmax(140px,0.8fr)_auto]';

/** Light icon button for the list rows */
const IconAction: React.FC<{ onClick: () => void; label: string; danger?: boolean; children: React.ReactNode }> = ({
  onClick,
  label,
  danger,
  children
}) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`w-9 h-9 grid place-items-center rounded-xl text-slate-400 cursor-pointer transition-colors ${
      danger ? 'hover:bg-[#fbe3e7] hover:text-[#c11e3d]' : 'hover:bg-slate-100 hover:text-slate-800'
    }`}
  >
    {children}
  </button>
);

const AVATAR_COLORS = ['#c11e3d', '#191919', '#6a0d1f', '#c9a227', '#4f4f4f'];
const colorOf = (id: string) => AVATAR_COLORS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** This month's payment, with an icon and a label (never colour alone) */
const PAY: Record<MonthlyPaymentStatus, { bg: string; ink: string; icon: React.ElementType; key: 'paid' | 'payPartial' | 'paymentPending' | 'scholarship' }> = {
  paid: { bg: '#dcf5e4', ink: '#14532d', icon: CheckCircle2, key: 'paid' },
  partial: { bg: '#fdf3d1', ink: '#6b5310', icon: Hourglass, key: 'payPartial' },
  pending: { bg: '#fbe3e7', ink: '#861529', icon: AlertCircle, key: 'paymentPending' },
  scholarship: { bg: '#efefef', ink: '#3d3d3d', icon: GraduationCap, key: 'scholarship' }
};

/** Admin "Students & waitlist" tab: one card per child with status, parent, classes, fee and actions; plus the trash. */
export const StudentsManager: React.FC<{ onEditPrice: (student: Student) => void }> = ({ onEditPrice }) => {
  const {
    students,
    groups,
    payments,
    deletedStudents,
    updateStudentStatus,
    updateStudentPrice,
    assignStudentToGroup,
    removeStudentFromGroup,
    deleteStudent,
    restoreStudent
  } = useApp();
  const t = useT(studentsMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();

  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('smart');
  const [search, setSearch] = useState('');
  const [scheduleStudent, setScheduleStudent] = useState<Student | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  // Cards or compact list, remembered in this browser
  const [view, setViewState] = useState<'cards' | 'list'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const setView = (v: 'cards' | 'list') => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // not remembered
    }
  };

  const isNoClass = (s: Student) => s.status === 'accepted' && s.groupIds.length === 0;
  const counts: Record<Filter, number> = {
    all: students.length,
    waitlist: students.filter((s) => s.status === 'waitlist').length,
    noClass: students.filter(isNoClass).length,
    enrolled: students.filter((s) => s.status === 'accepted' && s.groupIds.length > 0).length,
    trash: deletedStudents.length
  };

  // This month's bill of each child
  const payOf = useMemo(() => {
    const map = new Map<string, PaymentRow>();
    monthRows(currentMonth(), students, payments).forEach((r) => map.set(r.student.id, r));
    return map;
  }, [students, payments]);

  const matchesSearch = (s: Student) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      s.studentName.toLowerCase().includes(q) ||
      s.parentName.toLowerCase().includes(q) ||
      s.parentEmail.toLowerCase().includes(q) ||
      s.parentPhone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
  };

  const visible = useMemo(() => {
    const needsAction = (s: Student) => (s.status === 'waitlist' ? 0 : isNoClass(s) ? 1 : 2);
    return students
      .filter(
        (s) =>
          filter === 'all' ||
          (filter === 'waitlist' && s.status === 'waitlist') ||
          (filter === 'noClass' && isNoClass(s)) ||
          (filter === 'enrolled' && s.status === 'accepted' && s.groupIds.length > 0)
      )
      .filter(matchesSearch)
      .sort((a, b) => {
        if (sort === 'name') return a.studentName.localeCompare(b.studentName);
        if (sort === 'age') return ageOf(a) - ageOf(b) || a.studentName.localeCompare(b.studentName);
        if (sort === 'newest') return b.registeredAt.localeCompare(a.registeredAt);
        return needsAction(a) - needsAction(b) || b.registeredAt.localeCompare(a.registeredAt) || a.studentName.localeCompare(b.studentName);
      });
  }, [students, filter, search, sort]);

  const trash = useMemo(
    () => deletedStudents.filter(matchesSearch).sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')),
    [deletedStudents, search]
  );

  const formatDate = (iso: string, withYear = true) =>
    fromISODate(iso.slice(0, 10)).toLocaleDateString(locale, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });

  const handleDelete = async (st: Student) => {
    const ok = await confirm({
      title: t('confirmDeleteTitle', { name: st.studentName }),
      message: t('confirmDeleteText'),
      confirmLabel: t('delete'),
      danger: true
    });
    if (ok) deleteStudent(st.id);
  };

  const handleRemoveClass = async (st: Student, groupId: string, className: string) => {
    const ok = await confirm({
      title: t('confirmRemoveClassTitle', { name: st.studentName, className }),
      message: t('confirmRemoveClassText'),
      confirmLabel: t('removeLabel'),
      danger: true
    });
    if (ok) removeStudentFromGroup(st.id, groupId);
  };

  const handleRestore = async (id: string) => {
    setRestoring(id);
    await restoreStudent(id);
    setRestoring(null);
  };

  const Avatar: React.FC<{ st: Student; size: string; text: string }> = ({ st, size, text }) =>
    st.photoURL ? (
      <img src={st.photoURL} alt="" className={`${size} rounded-2xl object-cover shrink-0`} />
    ) : (
      <div className={`${size} ${text} rounded-2xl text-white flex items-center justify-center font-black shrink-0`} style={{ background: colorOf(st.id) }}>
        {initialsOf(st.studentName)}
      </div>
    );

  const StatusPill: React.FC<{ st: Student }> = ({ st }) => {
    const pending = st.status === 'waitlist';
    const noClass = isNoClass(st);
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
          pending ? 'bg-amber-100 text-amber-800' : noClass ? 'bg-slate-100 text-slate-600' : 'bg-[#dcf5e4] text-[#14532d]'
        }`}
      >
        {pending ? <Clock className="w-3 h-3" /> : noClass ? <Layers className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        {pending ? t('statusPending') : noClass ? t('filterNoClass') : t('statusAccepted')}
      </span>
    );
  };

  /** Pending / Accepted, one click to change (both directions) */
  const StatusSwitch: React.FC<{ st: Student }> = ({ st }) => (
    <div className="inline-flex p-0.5 rounded-xl bg-slate-100 shrink-0" role="radiogroup" aria-label={t('colStatus')}>
      {(
        [
          { id: 'waitlist', label: t('statusPending'), icon: <Clock className="w-3.5 h-3.5" />, on: 'bg-amber-400 text-amber-950' },
          { id: 'accepted', label: t('statusAccepted'), icon: <Check className="w-3.5 h-3.5" />, on: 'bg-[#15803d] text-white' }
        ] as const
      ).map((o) => {
        const active = st.status === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && updateStudentStatus(st.id, o.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-[11px] font-black whitespace-nowrap transition-all ${
              active ? `${o.on} shadow-sm cursor-default` : 'text-slate-500 hover:text-slate-900 hover:bg-white cursor-pointer'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );

  /** Fee: automatic (from the classes) or custom, plus this month's payment */
  const Fee: React.FC<{ st: Student; compact?: boolean }> = ({ st, compact }) => {
    const classPrice = classPriceOf(st, groups);
    const custom = st.customMonthlyPrice !== undefined;
    const price = custom ? st.customMonthlyPrice! : classPrice;
    const row = payOf.get(st.id);
    const pay = row ? PAY[row.status] : null;
    const PayIcon = pay?.icon;
    return (
      <div className={`flex ${compact ? 'flex-col items-start gap-1' : 'flex-wrap items-center gap-2'}`}>
        <button
          type="button"
          onClick={() => onEditPrice(st)}
          title={t('editFee')}
          className="group/fee flex items-center gap-1.5 cursor-pointer text-start"
        >
          <span className="font-mono text-sm font-black text-slate-900">{t('perMonth', { price })}</span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
              custom ? 'bg-[#fdf3d1] text-[#6b5310]' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {custom ? <Sparkles className="w-2.5 h-2.5" /> : <Wand2 className="w-2.5 h-2.5" />}
            {custom ? t('feeCustom') : t('feeAuto')}
          </span>
          <Edit2 className="w-3 h-3 text-slate-300 group-hover/fee:text-[#c11e3d]" />
        </button>
        {custom && (
          <span className="text-[10px] font-semibold text-slate-400">
            {t('feeWas', { price: classPrice })} ·{' '}
            <button
              type="button"
              onClick={() => updateStudentPrice(st.id, null)}
              className="font-black text-[#c11e3d] hover:underline cursor-pointer"
            >
              {t('resetFee')}
            </button>
          </span>
        )}
        {pay && PayIcon && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase"
            style={{ background: pay.bg, color: pay.ink }}
            title={t('thisMonth')}
          >
            <PayIcon className="w-2.5 h-2.5" />
            {t(pay.key)}
          </span>
        )}
      </div>
    );
  };

  const ClassPicker: React.FC<{ st: Student; compact?: boolean }> = ({ st, compact }) => {
    const others = groups.filter((g) => !st.groupIds.includes(g.id));
    if (!others.length) return null;
    return (
      <select
        value=""
        onChange={(e) => e.target.value && assignStudentToGroup(st.id, e.target.value)}
        className={
          compact
            ? 'px-1.5 py-0.5 bg-white border border-dashed border-slate-300 rounded-md text-[10px] font-bold text-slate-500 focus:outline-none cursor-pointer'
            : 'w-full px-2 py-1.5 bg-white border-2 border-dashed border-slate-200 hover:border-[#c11e3d] rounded-lg text-[11px] font-bold text-slate-500 focus:outline-none cursor-pointer'
        }
      >
        <option value="" disabled>
          {t('addClass')}
        </option>
        {others.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name} · {g.pricePerMonth} DT
          </option>
        ))}
      </select>
    );
  };

  /** Small "+" chip: a transparent select over it lists the classes the child is not in */
  const AddClassButton: React.FC<{ st: Student }> = ({ st }) => {
    const others = groups.filter((g) => !st.groupIds.includes(g.id));
    if (!others.length) return null;
    return (
      <span
        className="relative inline-flex items-center gap-1 h-7 px-2 rounded-lg border-2 border-dashed border-slate-200 text-[11px] font-black text-slate-400 hover:border-[#c11e3d] hover:text-[#c11e3d] transition-colors"
        title={t('addClass')}
      >
        <Plus className="w-3.5 h-3.5" />
        {st.groupIds.length === 0 && <span>{t('addClass').replace(/^\+\s*/, '').replace(/…$/, '')}</span>}
        <select
          value=""
          aria-label={t('addClass')}
          onChange={(e) => e.target.value && assignStudentToGroup(st.id, e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        >
          <option value="" disabled>
            {t('addClass')}
          </option>
          {others.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} · {weekdayName(g.dayOfWeek, locale, 'short')} {g.timeSlot} · {g.pricePerMonth} DT
            </option>
          ))}
        </select>
      </span>
    );
  };

  const stats: { id: Filter; label: string; icon: React.ReactNode; tone: string }[] = [
    { id: 'all', label: t('statTotal'), icon: <Users className="w-4 h-4" />, tone: 'text-slate-800' },
    { id: 'waitlist', label: t('statPending'), icon: <UserPlus className="w-4 h-4" />, tone: 'text-amber-600' },
    { id: 'noClass', label: t('statNoClass'), icon: <Layers className="w-4 h-4" />, tone: 'text-[#c11e3d]' },
    { id: 'enrolled', label: t('statEnrolled'), icon: <CheckCircle2 className="w-4 h-4" />, tone: 'text-[#15803d]' },
    { id: 'trash', label: t('statTrash'), icon: <Trash2 className="w-4 h-4" />, tone: 'text-slate-500' }
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-6">
        <div className="absolute -top-20 -end-16 w-72 h-72 rounded-full bg-[#c11e3d]/40 blur-3xl pointer-events-none" />
        <div className="relative">
          <h3 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Users className="w-6 h-6 text-[#ff6b86]" />
            {t('title')}
          </h3>
          <p className="text-xs font-medium text-white/60 mt-0.5">{t('subtitle')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
            {stats.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilter(s.id)}
                aria-pressed={filter === s.id}
                className={`text-start p-3 rounded-2xl transition-all cursor-pointer ${
                  filter === s.id ? 'bg-white text-slate-900 shadow-lg -translate-y-0.5' : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                <div className={`flex items-center justify-between text-[10px] font-black uppercase tracking-wide ${filter === s.id ? 'text-slate-400' : 'text-white/60'}`}>
                  <span className="truncate">{s.label}</span>
                  <span className={filter === s.id ? s.tone : ''}>{s.icon}</span>
                </div>
                <div className="text-2xl font-black font-mono mt-1">
                  {counts[s.id]}
                  {s.id === 'waitlist' && counts.waitlist > 0 && filter !== 'waitlist' && (
                    <span className="inline-block w-2 h-2 ms-2 rounded-full bg-amber-400 animate-pulse align-middle" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="w-full ps-10 pe-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d]"
          />
        </div>
        {filter !== 'trash' && (
          <>
            <label className="flex items-center gap-2 px-3 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-slate-500">
              {t('sortLabel')}
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="py-2.5 bg-transparent text-slate-800 focus:outline-none cursor-pointer">
                <option value="smart">{t('sortSmart')}</option>
                <option value="newest">{t('sortNewest')}</option>
                <option value="name">{t('sortName')}</option>
                <option value="age">{t('sortAge')}</option>
              </select>
            </label>
            <div className="flex p-1 rounded-xl bg-slate-100 shrink-0" role="group" aria-label={t('view')}>
              {(
                [
                  { id: 'cards', icon: <LayoutGrid className="w-4 h-4" />, label: t('viewCards') },
                  { id: 'list', icon: <List className="w-4 h-4" />, label: t('viewList') }
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  aria-pressed={view === v.id}
                  title={v.label}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black cursor-pointer ${
                    view === v.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {v.icon}
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {filter === 'trash' ? (
        /* Trash */
        <div className="duo-card hover:transform-none! bg-white p-4 sm:p-5 space-y-3">
          <div>
            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-slate-500" /> {t('trashTitle')}
            </h4>
            <p className="text-xs font-medium text-slate-500">{t('trashSub')}</p>
          </div>
          {trash.length === 0 ? (
            <div className="py-10 text-center text-sm font-medium text-slate-400 rounded-2xl border-2 border-dashed border-slate-200">{t('trashEmpty')}</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {trash.map((st) => (
                <li key={st.id} className="flex items-center gap-3 py-3">
                  <div className="grayscale opacity-70">
                    <Avatar st={st} size="w-10 h-10" text="text-xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-700 truncate">{st.studentName}</div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {st.parentName} · {st.groupIds.map((id) => groups.find((g) => g.id === id)?.name).filter(Boolean).join(', ') || t('noClass')}
                    </div>
                  </div>
                  {st.deletedAt && <span className="hidden sm:inline text-[11px] font-semibold text-slate-400">{t('deletedOn', { date: formatDate(st.deletedAt) })}</span>}
                  <button
                    onClick={() => handleRestore(st.id)}
                    disabled={restoring === st.id}
                    className="px-3 py-2 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${restoring === st.id ? 'animate-spin' : ''}`} />
                    {t('restore')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className="py-14 text-center text-slate-400 text-sm font-medium rounded-3xl border-2 border-dashed border-slate-200 bg-white">
          {students.length === 0 ? t('emptyAll') : t('emptySearch')}
        </div>
      ) : view === 'list' ? (
        <div className="rounded-3xl border-2 border-slate-200 bg-white overflow-hidden">
          {/* Column titles (wide screens only; on phones each row stacks) */}
          <div className={`hidden lg:grid ${LIST_GRID} gap-4 px-5 py-3 bg-slate-50 border-b-2 border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400`}>
            <span>{t('colChild')}</span>
            <span>{t('colStatus')}</span>
            <span>{t('parent')}</span>
            <span>{t('classes')}</span>
            <span className="text-end">{t('tuition')}</span>
            <span className="text-end">{t('colActions')}</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {visible.map((st) => {
              const pending = st.status === 'waitlist';
              const noClass = isNoClass(st);
              const studentGroups = groups.filter((g) => st.groupIds.includes(g.id));
              const classPrice = classPriceOf(st, groups);
              const custom = st.customMonthlyPrice !== undefined;
              const price = custom ? st.customMonthlyPrice! : classPrice;
              const pay = payOf.get(st.id);
              const payMeta = pay ? PAY[pay.status] : null;
              return (
                <li
                  key={st.id}
                  className={`group/row relative grid grid-cols-1 ${LIST_GRID} gap-3 lg:gap-4 items-center px-4 lg:px-5 py-3.5 transition-colors hover:bg-[#fdf2f4]/60 ${
                    pending ? 'bg-amber-50/50' : ''
                  }`}
                >
                  {/* Accent on rows that need something */}
                  {(pending || noClass) && (
                    <span className={`absolute inset-y-2 start-0 w-1 rounded-e-full ${pending ? 'bg-amber-400' : 'bg-[#c11e3d]'}`} />
                  )}

                  {/* Child */}
                  <div className="flex items-center gap-3 min-w-0 pe-28 lg:pe-0">
                    <Avatar st={st} size="w-10 h-10" text="text-xs" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-black text-sm text-slate-900 truncate">{st.studentName}</span>
                        {noClass && <StatusPill st={st} />}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 truncate">
                        {t('years', { age: ageOf(st) })} · {t('registered', { date: formatDate(st.registeredAt, false) })}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="ps-[52px] lg:ps-0">
                    <StatusSwitch st={st} />
                  </div>

                  {/* Parent */}
                  <div className="min-w-0 ps-[52px] lg:ps-0">
                    <div className="text-xs font-bold text-slate-700 truncate">{st.parentName}</div>
                    <a
                      href={`tel:${st.parentPhone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-[#c11e3d]"
                      dir="ltr"
                    >
                      <Phone className="w-3 h-3" />
                      {st.parentPhone}
                    </a>
                  </div>

                  {/* Classes */}
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0 ps-[52px] lg:ps-0">
                    {studentGroups.length === 0 && (
                      <span className="text-[11px] font-semibold italic text-slate-400">{st.status === 'accepted' ? t('placeInClass') : t('noClass')}</span>
                    )}
                    {studentGroups.map((g) => (
                      <span
                        key={g.id}
                        title={`${weekdayName(g.dayOfWeek, locale)} · ${g.timeSlot} · ${g.pricePerMonth} DT`}
                        className="group/chip inline-flex items-center gap-1.5 h-7 ps-2.5 pe-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-700 max-w-full"
                      >
                        <span className="truncate">{g.name}</span>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">{weekdayName(g.dayOfWeek, locale, 'short')}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClass(st, g.id, g.name)}
                          aria-label={t('removeLabel')}
                          className="w-5 h-5 grid place-items-center rounded-md text-slate-400 hover:text-white hover:bg-[#c11e3d] cursor-pointer shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <AddClassButton st={st} />
                  </div>

                  {/* Fee */}
                  <div className="flex lg:flex-col items-center lg:items-end gap-x-2 gap-y-0.5 ps-[52px] lg:ps-0">
                    <button
                      type="button"
                      onClick={() => onEditPrice(st)}
                      title={t('editFee')}
                      className="font-mono text-sm font-black text-slate-900 hover:text-[#c11e3d] cursor-pointer whitespace-nowrap tabular-nums"
                    >
                      {price} <span className="text-[10px] text-slate-400">DT</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold whitespace-nowrap">
                      {custom ? (
                        <>
                          <span className="inline-flex items-center gap-0.5 text-[#6b5310]" title={t('feeWas', { price: classPrice })}>
                            <Sparkles className="w-3 h-3" />
                            {t('feeCustom')}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateStudentPrice(st.id, null)}
                            title={`${t('resetFee')} (${classPrice} DT)`}
                            aria-label={t('resetFee')}
                            className="w-5 h-5 grid place-items-center rounded-md text-slate-400 hover:text-[#c11e3d] hover:bg-white cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-slate-400">
                          <Wand2 className="w-3 h-3" />
                          {t('feeAuto')}
                        </span>
                      )}
                      {payMeta && (
                        <span className="inline-flex items-center gap-0.5" style={{ color: payMeta.ink }} title={t('thisMonth')}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: payMeta.ink }} />
                          {t(payMeta.key)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions (top corner on phones) */}
                  <div className="absolute top-2.5 end-2 lg:static flex items-center justify-end gap-0.5">
                    <IconAction onClick={() => setScheduleStudent(st)} label={t('schedule')}>
                      <CalendarDays className="w-4 h-4" />
                    </IconAction>
                    <IconAction onClick={() => handleDelete(st)} label={t('delete')} danger>
                      <Trash2 className="w-4 h-4" />
                    </IconAction>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visible.map((st) => {
            const pending = st.status === 'waitlist';
            const studentGroups = groups.filter((g) => st.groupIds.includes(g.id));
            return (
              <article key={st.id} className={`duo-card bg-white overflow-hidden flex flex-col ${pending ? 'ring-2 ring-amber-300/70' : ''}`}>
                {pending && (
                  <div className="px-4 sm:px-5 py-1.5 bg-amber-100 text-amber-900 text-[11px] font-black flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" /> {t('newRegistration')} · {formatDate(st.registeredAt)}
                  </div>
                )}
                {/* Identity */}
                <div className="p-4 sm:p-5 flex items-start gap-3.5">
                  <Avatar st={st} size="w-14 h-14" text="text-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-slate-900 truncate">{st.studentName}</h4>
                      {isNoClass(st) && <StatusPill st={st} />}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      {t('years', { age: ageOf(st) })}
                      {st.birthDate && <span> · {t('born', { date: formatDate(st.birthDate) })}</span>}
                    </div>
                    {!pending && <div className="text-[11px] font-medium text-slate-400">{t('registered', { date: formatDate(st.registeredAt) })}</div>}
                  </div>
                </div>

                <div className="px-4 sm:px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Parent */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('parent')}</div>
                    <div className="font-black text-slate-800 truncate">{st.parentName}</div>
                    <a href={`tel:${st.parentPhone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-slate-600 hover:text-[#c11e3d] font-semibold">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span dir="ltr">{st.parentPhone}</span>
                    </a>
                    <a href={`mailto:${st.parentEmail}`} className="flex items-center gap-1.5 text-slate-600 hover:text-[#c11e3d] font-semibold min-w-0">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span dir="ltr" className="truncate">
                        {st.parentEmail}
                      </span>
                    </a>
                  </div>

                  {/* Classes */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('classes')}</div>
                    {studentGroups.length === 0 && (
                      <div className="text-slate-400 font-medium italic">{st.status === 'accepted' ? t('placeInClass') : t('noClass')}</div>
                    )}
                    {studentGroups.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white border border-slate-200">
                        <div className="min-w-0">
                          <div className="font-black text-slate-800 truncate">{g.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {weekdayName(g.dayOfWeek, locale)} · <span dir="ltr">{g.timeSlot}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] font-black text-slate-500 shrink-0">{g.pricePerMonth} DT</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClass(st, g.id, g.name)}
                          aria-label={t('removeLabel')}
                          className="p-1 rounded-md text-slate-400 hover:text-[#c11e3d] hover:bg-[#fdf2f4] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <ClassPicker st={st} />
                  </div>
                </div>

                {st.notes && (
                  <div className="mx-4 sm:mx-5 mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    <span className="font-black">{t('notes')}: </span>
                    <span className="font-medium whitespace-pre-line">{st.notes}</span>
                  </div>
                )}

                {/* Footer: fee + actions */}
                <div className="mt-auto px-4 sm:px-5 py-3 border-t-2 border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
                  <Fee st={st} />
                  <div className="flex items-center gap-1.5">
                    <StatusSwitch st={st} />
                    <button onClick={() => setScheduleStudent(st)} title={t('schedule')} aria-label={t('schedule')} className="p-2 btn-duo-secondary cursor-pointer">
                      <CalendarDays className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(st)} title={t('delete')} aria-label={t('delete')} className="p-2 btn-duo-secondary text-[#c11e3d] cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {scheduleStudent && <StudentScheduleModal student={scheduleStudent} onClose={() => setScheduleStudent(null)} />}
    </div>
  );
};
