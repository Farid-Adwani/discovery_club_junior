import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  HandCoins,
  History,
  Hourglass,
  Info,
  Layers,
  MessageCircle,
  Pencil,
  Percent,
  Phone,
  Search,
  Table2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Group, MonthlyPaymentStatus, PaymentMethod, Student, WEEK_DAYS } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { paymentsMessages } from '../../i18n/messages/payments';
import { useConfirm } from '../common/ConfirmProvider';
import { fromISODate, toISODate, weekdayName } from '../../utils/schedule';
import {
  PaymentRow,
  addMonths,
  arrearsBefore,
  classShare,
  currentMonth,
  dt,
  effectiveFee,
  familyKey,
  monthLabel,
  monthRange,
  monthRows,
  billingStart,
  totalsOf,
  whatsappLink
} from '../../utils/payments';

type GroupBy = 'all' | 'parent' | 'class';
type Filter = 'all' | 'due' | 'paid' | 'scholarship' | 'arrears';
type Arrears = { amount: number; months: string[] };
/** A row in the list; `notBilled` = a former member shown only for their earlier balance */
type ViewRow = PaymentRow & { arrears?: Arrears; notBilled?: boolean };

const GROUP_KEY = 'dcj-payments-group';
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const METHODS: PaymentMethod[] = ['cash', 'transfer', 'cheque', 'card', 'other'];
const METHOD_KEYS = { cash: 'mCash', transfer: 'mTransfer', cheque: 'mCheque', card: 'mCard', other: 'mOther' } as const;

/** Status colours always come with an icon and a label (never colour alone) */
const STATUS: Record<MonthlyPaymentStatus, { color: string; bg: string; ink: string; icon: React.ElementType; key: 'stPaid' | 'stPartial' | 'stPending' | 'stScholarship' }> = {
  pending: { color: '#c11e3d', bg: '#fbe3e7', ink: '#861529', icon: AlertCircle, key: 'stPending' },
  partial: { color: '#c9a227', bg: '#fdf3d1', ink: '#6b5310', icon: Hourglass, key: 'stPartial' },
  paid: { color: '#15803d', bg: '#dcf5e4', ink: '#14532d', icon: CheckCircle2, key: 'stPaid' },
  scholarship: { color: '#888888', bg: '#efefef', ink: '#3d3d3d', icon: GraduationCap, key: 'stScholarship' }
};
const STATUS_ORDER: MonthlyPaymentStatus[] = ['pending', 'partial', 'paid', 'scholarship'];

const AVATAR_COLORS = ['#c11e3d', '#191919', '#6a0d1f', '#c9a227', '#4f4f4f'];
const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
const colorOf = (id: string) => AVATAR_COLORS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Numbers glide to their new value when the month changes */
function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const v = from + (target - from) * (1 - Math.pow(1 - p, 3));
      current.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const monthFromHash = () => {
  const m = window.location.hash.replace(/^#\/?/, '').split('/')[2] || '';
  return MONTH_RE.test(m) ? m : currentMonth();
};

/** Admin "Payments" tab: one month at a time, with history, metrics and grouping by parent or class. */
export const PaymentsManager: React.FC<{ onEditPrice: (student: Student) => void }> = ({ onEditPrice }) => {
  const { students, groups, payments, markPaymentsPaid } = useApp();
  const t = useT(paymentsMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();
  const today = currentMonth();

  // The month is kept in the address bar (#/admin/payments/2026-09) so a past month can be bookmarked
  const [month, setMonthState] = useState(monthFromHash);
  const setMonth = (m: string) => {
    setMonthState(m);
    window.history.replaceState(null, '', m === today ? '#/admin/payments' : `#/admin/payments/${m}`);
  };

  const [groupBy, setGroupByState] = useState<GroupBy>(() => {
    try {
      const v = localStorage.getItem(GROUP_KEY);
      return v === 'parent' || v === 'class' ? v : 'all';
    } catch {
      return 'all';
    }
  });
  const setGroupBy = (g: GroupBy) => {
    setGroupByState(g);
    try {
      localStorage.setItem(GROUP_KEY, g);
    } catch {
      // not remembered
    }
  };
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ViewRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // ---------- figures ----------

  const firstMonth = useMemo(() => {
    const b = billingStart(students, payments, today);
    const yearAgo = addMonths(today, -11);
    return b < yearAgo ? b : yearAgo;
  }, [students, payments, today]);
  const lastMonth = addMonths(today, 1);
  const allMonths = useMemo(() => monthRange(firstMonth, lastMonth).reverse(), [firstMonth, lastMonth]);

  const rows = useMemo(() => monthRows(month, students, payments, today), [month, students, payments, today]);
  const totals = useMemo(() => totalsOf(rows), [rows]);
  const prevTotals = useMemo(() => totalsOf(monthRows(addMonths(month, -1), students, payments, today)), [month, students, payments, today]);
  const arrears = useMemo(() => arrearsBefore(month, students, payments, today), [month, students, payments, today]);
  const arrearsTotal = [...arrears.values()].reduce((s, a) => s + a.amount, 0);

  const trend = useMemo(
    () => monthRange(addMonths(month, -11), month).map((m) => ({ month: m, ...totalsOf(monthRows(m, students, payments, today)) })),
    [month, students, payments, today]
  );

  const viewRows: ViewRow[] = useMemo(() => {
    const list: ViewRow[] = rows.map((r) => ({ ...r, arrears: arrears.get(r.student.id) }));
    // Children who left but still owe earlier months
    if (filter === 'arrears') {
      const billed = new Set(rows.map((r) => r.student.id));
      for (const [id, a] of arrears) {
        const student = students.find((s) => s.id === id);
        if (student && !billed.has(id)) {
          list.push({ student, month, due: 0, paid: 0, outstanding: 0, status: 'pending', discount: 0, arrears: a, notBilled: true });
        }
      }
    }
    return list;
  }, [rows, arrears, filter, students, month]);

  const families = useMemo(() => {
    const map = new Map<string, ViewRow[]>();
    viewRows.filter((r) => !r.notBilled).forEach((r) => {
      const k = familyKey(r.student);
      map.set(k, [...(map.get(k) || []), r]);
    });
    return map;
  }, [viewRows]);

  const owingFamilies = [...families.values()].filter((f) => f.some((r) => r.outstanding > 0)).length;

  const matches = (r: ViewRow) => {
    const q = search.trim().toLowerCase();
    const okSearch =
      !q ||
      r.student.studentName.toLowerCase().includes(q) ||
      r.student.parentName.toLowerCase().includes(q) ||
      r.student.parentPhone.replace(/\s/g, '').includes(q.replace(/\s/g, ''));
    const okFilter =
      filter === 'all' ||
      (filter === 'due' && r.outstanding > 0) ||
      (filter === 'paid' && r.status === 'paid') ||
      (filter === 'scholarship' && r.status === 'scholarship') ||
      (filter === 'arrears' && !!r.arrears);
    return okSearch && okFilter;
  };

  const sortRows = (list: ViewRow[]) =>
    [...list].sort(
      (a, b) =>
        Number(!!a.notBilled) - Number(!!b.notBilled) ||
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        a.student.studentName.localeCompare(b.student.studentName)
    );
  const visible = useMemo(() => sortRows(viewRows.filter(matches)), [viewRows, filter, search]);

  const filterCounts: Record<Filter, number> = {
    all: rows.length,
    due: rows.filter((r) => r.outstanding > 0).length,
    paid: totals.counts.paid,
    scholarship: totals.counts.scholarship,
    arrears: arrears.size
  };

  // Families to chase first: this month + earlier months
  const toChase = useMemo(() => {
    const byFamily = new Map<string, { name: string; phone: string; amount: number; kids: Set<string>; rows: ViewRow[] }>();
    for (const r of viewRows) {
      const owed = r.outstanding + (r.arrears?.amount || 0);
      if (owed <= 0) continue;
      const k = familyKey(r.student);
      const f = byFamily.get(k) || { name: r.student.parentName, phone: r.student.parentPhone, amount: 0, kids: new Set<string>(), rows: [] };
      f.amount += owed;
      f.kids.add(r.student.studentName);
      f.rows.push(r);
      byFamily.set(k, f);
    }
    // Former members with only earlier balances are not in viewRows unless filtered; add them here too
    if (filter !== 'arrears') {
      const billed = new Set(rows.map((r) => r.student.id));
      for (const [id, a] of arrears) {
        const st = students.find((s) => s.id === id);
        if (!st || billed.has(id)) continue;
        const k = familyKey(st);
        const f = byFamily.get(k) || { name: st.parentName, phone: st.parentPhone, amount: 0, kids: new Set<string>(), rows: [] };
        f.amount += a.amount;
        f.kids.add(st.studentName);
        f.rows.push({ student: st, month, due: 0, paid: 0, outstanding: 0, status: 'pending', discount: 0, arrears: a, notBilled: true });
        byFamily.set(k, f);
      }
    }
    return [...byFamily.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [viewRows, rows, arrears, students, filter, month]);

  const methodTotals = useMemo(() => {
    const sums = new Map<string, number>();
    for (const r of rows) {
      if (r.paid <= 0) continue;
      const k = r.record?.method || 'unknown';
      sums.set(k, (sums.get(k) || 0) + r.paid);
    }
    return [...sums.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  // ---------- actions ----------

  const reminderLink = (list: ViewRow[]) => {
    const st = list[0].student;
    const amount = list.reduce((s, r) => s + r.outstanding + (r.arrears?.amount || 0), 0);
    const months = new Set<string>();
    list.forEach((r) => {
      r.arrears?.months.forEach((m) => months.add(m));
      if (r.outstanding > 0) months.add(r.month);
    });
    return whatsappLink(
      st.parentPhone,
      t('reminderText', {
        parent: st.parentName,
        amount: dt(amount, locale),
        children: [...new Set(list.map((r) => r.student.studentName))].join(', '),
        months: [...months].sort().map((m) => monthLabel(m, locale)).join(', ')
      })
    );
  };

  const markPaid = async (list: ViewRow[], key: string) => {
    const ids = list.filter((r) => r.outstanding > 0 && !r.notBilled).map((r) => r.student.id);
    if (!ids.length) return;
    if (ids.length > 1) {
      const ok = await confirm({
        title: t('confirmBulkTitle', { count: ids.length, month: monthLabel(month, locale) }),
        message: t('confirmBulkText'),
        confirmLabel: t('confirmBulkOk')
      });
      if (!ok) return;
    }
    setBusy(key);
    await markPaymentsPaid(month, ids);
    setBusy(null);
  };

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ['csvStudent', 'csvParent', 'csvPhone', 'csvClasses', 'csvDue', 'csvPaid', 'csvLeft', 'csvStatus', 'csvMethod', 'csvDate', 'csvArrears', 'csvNote'] as const;
    const lines = [head.map((k) => esc(t(k))).join(',')];
    for (const r of visible) {
      lines.push(
        [
          r.student.studentName,
          r.student.parentName,
          r.student.parentPhone,
          r.student.groupIds.map((id) => groups.find((g) => g.id === id)?.name).filter(Boolean).join(' + '),
          r.due,
          r.paid,
          r.outstanding,
          r.notBilled ? '' : t(STATUS[r.status].key),
          r.record?.method ? t(METHOD_KEYS[r.record.method]) : '',
          r.record?.paidAt || '',
          r.arrears?.amount || 0,
          r.record?.note || ''
        ]
          .map(esc)
          .join(',')
      );
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payments-${month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ---------- render ----------

  const phase = month === today ? 'phaseCurrent' : month < today ? 'phasePast' : 'phaseFuture';
  const collected = useCountUp(totals.paid);
  const expected = useCountUp(totals.due);
  const outstanding = useCountUp(totals.outstanding);
  const discounts = useCountUp(totals.discount);
  const arrearsAnim = useCountUp(arrearsTotal);
  const ratePct = Math.round(totals.rate * 100);
  const delta = totals.paid - prevTotals.paid;
  const hasPrev = prevTotals.children > 0;

  const className = (id: string) => groups.find((g) => g.id === id)?.name;
  const dayLabel = (g: Group) => ((WEEK_DAYS as readonly string[]).includes(g.dayOfWeek) ? weekdayName(g.dayOfWeek, locale, 'short') : g.dayOfWeek);

  const renderRow = (r: ViewRow, showParent = true) => {
    const s = STATUS[r.status];
    const Icon = s.icon;
    const pct = r.due > 0 ? Math.min(100, (r.paid / r.due) * 100) : r.status === 'scholarship' ? 0 : 100;
    return (
      <li
        key={r.student.id}
        className="group/row flex flex-col sm:flex-row sm:items-center gap-3 px-3 sm:px-4 py-3 rounded-2xl hover:bg-[#fdf2f4] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {r.student.photoURL ? (
            <img src={r.student.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <span
              className="w-10 h-10 rounded-xl grid place-items-center text-white text-xs font-black shrink-0"
              style={{ background: colorOf(r.student.id) }}
            >
              {initialsOf(r.student.studentName)}
            </span>
          )}
          <div className="min-w-0">
            <div className="font-black text-slate-800 text-sm truncate">{r.student.studentName}</div>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              {showParent && <span className="text-[11px] font-semibold text-slate-500 truncate me-1">{r.student.parentName}</span>}
              {r.student.groupIds.map((id) =>
                className(id) ? (
                  <span key={id} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                    {className(id)}
                  </span>
                ) : null
              )}
              {r.discount > 0 && r.status !== 'scholarship' && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#fdf3d1] text-[10px] font-bold text-[#6b5310]">
                  {t('discountBadge', { amount: dt(r.discount, locale) })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap ps-[52px] sm:ps-0">
          {!r.notBilled && (
            <div className="w-32">
              <div className="flex items-baseline justify-between text-[11px] font-black font-mono text-slate-700">
                <span>{t('paidOf', { paid: dt(r.paid, locale), due: dt(r.due, locale) })}</span>
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
              </div>
              {r.record?.paidAt && r.paid > 0 && (
                <div className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">
                  {t('paidOn', { date: fromISODate(r.record.paidAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}
                  {r.record.method ? ` · ${t(METHOD_KEYS[r.record.method])}` : ''}
                </div>
              )}
            </div>
          )}

          {!r.notBilled && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap"
              style={{ background: s.bg, color: s.ink }}
            >
              <Icon className="w-3 h-3" style={{ color: s.color }} />
              {t(s.key)}
            </span>
          )}

          {r.arrears && (
            <button
              onClick={() => setMonth(r.arrears!.months[0])}
              title={t('arrearsTitle', { months: r.arrears.months.map((m) => monthLabel(m, locale, 'short')).join(', ') })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-[#191919] text-white whitespace-nowrap cursor-pointer hover:bg-[#c11e3d] transition-colors"
            >
              <History className="w-3 h-3" />
              {t('arrearsBadge', { amount: dt(r.arrears.amount, locale) })}
            </button>
          )}

          <div className="flex items-center gap-1.5 ms-auto">
            {r.outstanding > 0 && !r.notBilled && (
              <button
                onClick={() => markPaid([r], r.student.id)}
                disabled={busy === r.student.id}
                className="px-2.5 py-1.5 btn-duo-green text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('markPaid')}</span>
              </button>
            )}
            {!r.notBilled && (
              <button
                onClick={() => setEditing(r)}
                className="p-1.5 btn-duo-secondary cursor-pointer"
                title={t('edit')}
                aria-label={t('edit')}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </li>
    );
  };

  const groupHeaderStats = (paid: number, due: number) => {
    const pct = due > 0 ? Math.min(100, Math.round((paid / due) * 100)) : 100;
    return (
      <div className="w-full sm:w-48">
        <div className="flex justify-between text-[11px] font-black font-mono text-slate-700">
          <span>{t('paidOf', { paid: dt(paid, locale), due: dt(due, locale) })}</span>
          <span className="text-slate-400">{pct}%</span>
        </div>
        <div className="h-2 mt-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: pct >= 100 ? STATUS.paid.color : pct > 0 ? STATUS.partial.color : STATUS.pending.color }}
          />
        </div>
      </div>
    );
  };

  const renderList = () => {
    if (rows.length === 0 && filter !== 'arrears') {
      return <EmptyState text={t('emptyMonth')} />;
    }
    if (visible.length === 0) return <EmptyState text={t('empty')} />;

    if (groupBy === 'parent') {
      const fams = new Map<string, ViewRow[]>();
      visible.forEach((r) => {
        const k = familyKey(r.student);
        fams.set(k, [...(fams.get(k) || []), r]);
      });
      const list = [...fams.entries()].sort(
        (a, b) =>
          b[1].reduce((s, r) => s + r.outstanding + (r.arrears?.amount || 0), 0) -
            a[1].reduce((s, r) => s + r.outstanding + (r.arrears?.amount || 0), 0) ||
          a[1][0].student.parentName.localeCompare(b[1][0].student.parentName)
      );
      return (
        <div className="space-y-3">
          {list.map(([key, fam]) => {
            const st = fam[0].student;
            const due = fam.reduce((s, r) => s + r.due, 0);
            const paid = fam.reduce((s, r) => s + r.paid, 0);
            const owed = fam.reduce((s, r) => s + r.outstanding + (r.arrears?.amount || 0), 0);
            const canPay = fam.filter((r) => r.outstanding > 0 && !r.notBilled).length;
            return (
              <section key={key} className="rounded-3xl border-2 border-slate-100 bg-white overflow-hidden">
                <header className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-slate-50/80 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-[#191919] text-white grid place-items-center shrink-0">
                      <Users className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 truncate">{st.parentName}</div>
                      <div className="text-[11px] font-semibold text-slate-500 flex flex-wrap gap-x-2">
                        <span dir="ltr">{st.parentPhone}</span>
                        <span>· {t('familyKids', { count: fam.length })}</span>
                        {owed > 0 && <span className="font-black text-[#c11e3d]">· {t('familyOwes', { amount: dt(owed, locale) })}</span>}
                      </div>
                    </div>
                  </div>
                  {groupHeaderStats(paid, due)}
                  <div className="flex items-center gap-1.5">
                    {owed > 0 && (
                      <a
                        href={reminderLink(fam)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 btn-duo-secondary text-[11px] font-black flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#15803d]" />
                        <span>{t('remind')}</span>
                      </a>
                    )}
                    <a href={`tel:${st.parentPhone.replace(/[^\d+]/g, '')}`} className="p-1.5 btn-duo-secondary" title={t('call')} aria-label={t('call')}>
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    {canPay > 1 && (
                      <button
                        onClick={() => markPaid(fam, `fam-${key}`)}
                        disabled={busy === `fam-${key}`}
                        className="px-2.5 py-1.5 btn-duo-blue text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('markFamilyPaid')}</span>
                      </button>
                    )}
                  </div>
                </header>
                <ul className="p-1.5">{fam.map((r) => renderRow(r, false))}</ul>
              </section>
            );
          })}
        </div>
      );
    }

    if (groupBy === 'class') {
      const sections: { id: string; group?: Group; rows: ViewRow[]; due: number; paid: number }[] = [];
      for (const g of [...groups].sort(
        (a, b) => WEEK_DAYS.indexOf(a.dayOfWeek) - WEEK_DAYS.indexOf(b.dayOfWeek) || a.timeSlot.localeCompare(b.timeSlot)
      )) {
        const inClass = rows.filter((r) => r.student.groupIds.includes(g.id));
        const shown = visible.filter((r) => r.student.groupIds.includes(g.id));
        if (!shown.length) continue;
        let due = 0, paid = 0;
        inClass.forEach((r) => {
          const sh = classShare(r, g, groups);
          due += sh.due;
          paid += sh.paid;
        });
        sections.push({ id: g.id, group: g, rows: shown, due, paid });
      }
      const orphan = visible.filter((r) => !r.student.groupIds.some((id) => groups.some((g) => g.id === id)));
      if (orphan.length) {
        const all = rows.filter((r) => !r.student.groupIds.some((id) => groups.some((g) => g.id === id)));
        sections.push({ id: '_none', rows: orphan, due: all.reduce((s, r) => s + r.due, 0), paid: all.reduce((s, r) => s + Math.min(r.paid, r.due), 0) });
      }
      return (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Info className="w-3.5 h-3.5" />
            {t('classShareNote')}
          </p>
          {sections.map((sec) => {
            const canPay = sec.rows.filter((r) => r.outstanding > 0 && !r.notBilled).length;
            return (
              <section key={sec.id} className="rounded-3xl border-2 border-slate-100 bg-white overflow-hidden">
                <header className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-slate-50/80 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-[#c11e3d] text-white grid place-items-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 truncate">{sec.group ? sec.group.name : t('noClass')}</div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {sec.group && `${dayLabel(sec.group)} · ${sec.group.timeSlot} · ${dt(sec.group.pricePerMonth, locale)} DT · `}
                        {t('perChild', { count: sec.rows.length })}
                      </div>
                    </div>
                  </div>
                  {groupHeaderStats(sec.paid, sec.due)}
                  {canPay > 1 && (
                    <button
                      onClick={() => markPaid(sec.rows, `cls-${sec.id}`)}
                      disabled={busy === `cls-${sec.id}`}
                      className="px-2.5 py-1.5 btn-duo-blue text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('markClassPaid')}</span>
                    </button>
                  )}
                </header>
                <ul className="p-1.5">{sec.rows.map((r) => renderRow(r))}</ul>
              </section>
            );
          })}
        </div>
      );
    }

    return (
      <ul className="rounded-3xl border-2 border-slate-100 bg-white p-1.5 divide-y divide-slate-100">
        {visible.map((r) => renderRow(r))}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero: month navigation and the month's headline */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-7">
        <div className="absolute -top-20 -end-16 w-72 h-72 rounded-full bg-[#c11e3d]/45 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 start-1/4 w-72 h-72 rounded-full bg-[#c9a227]/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end gap-6 justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-black uppercase tracking-wide">
              <Wallet className="w-3.5 h-3.5" />
              {t('badge')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonth(addMonths(month, -1))}
                disabled={month <= firstMonth}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 grid place-items-center cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
                aria-label={t('prevMonth')}
                title={t('prevMonth')}
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <h2 key={month} className="text-2xl sm:text-4xl font-black tracking-tight capitalize min-w-[11ch] text-center animate-[fadeIn_.35s_ease]">
                {monthLabel(month, locale)}
              </h2>
              <button
                onClick={() => setMonth(addMonths(month, 1))}
                disabled={month >= lastMonth}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 grid place-items-center cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
                aria-label={t('nextMonth')}
                title={t('nextMonth')}
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${
                  phase === 'phaseCurrent' ? 'bg-[#c11e3d] text-white' : 'bg-white/10 text-white/80'
                }`}
              >
                {phase === 'phaseCurrent' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                {t(phase)}
              </span>
              <label className="relative inline-flex items-center">
                <CalendarDays className="w-3.5 h-3.5 absolute start-2.5 text-white/60 pointer-events-none" />
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  aria-label={t('pickMonth')}
                  className="appearance-none ps-8 pe-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-black text-white cursor-pointer focus:outline-none capitalize"
                >
                  {allMonths.map((m) => (
                    <option key={m} value={m} className="text-slate-800">
                      {monthLabel(m, locale)}
                    </option>
                  ))}
                </select>
              </label>
              {month !== today && (
                <button
                  onClick={() => setMonth(today)}
                  className="px-2.5 py-1 rounded-full bg-white text-[#191919] text-[11px] font-black cursor-pointer hover:bg-[#fbe3e7] transition-colors"
                >
                  {t('thisMonth')}
                </button>
              )}
            </div>
          </div>

          <div className="lg:text-end min-w-[16rem]">
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight">
              {dt(collected, locale)} <span className="text-lg text-white/60">DT</span>
            </div>
            <div className="text-xs font-semibold text-white/60 mt-1">{t('collectedOf', { due: dt(expected, locale) })}</div>
            <div className="mt-3 h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#c11e3d] to-[#ff6b86] transition-all duration-700 ease-out"
                style={{ width: `${ratePct}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11px] font-black text-white/80">{t('tipRate', { rate: ratePct })}</div>
          </div>
        </div>
      </section>

      {rows.length > 0 && rows.every((r) => !r.record) && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-[#fdf3d1] text-[#6b5310] text-xs font-semibold">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t('noHistory')}</span>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={<Banknote className="w-4 h-4" />} label={t('kpiExpected')} value={`${dt(expected, locale)}`} unit="DT" sub={t('kpiExpectedSub', { count: totals.children })} />
        <Kpi
          icon={<HandCoins className="w-4 h-4" />}
          label={t('kpiCollected')}
          value={`${dt(collected, locale)}`}
          unit="DT"
          sub={
            hasPrev ? (
              <span className={`inline-flex items-center gap-1 ${delta >= 0 ? 'text-[#15803d]' : 'text-[#c11e3d]'}`}>
                {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {delta >= 0 ? '+' : '−'}
                {dt(Math.abs(delta), locale)} DT {t('kpiVsPrev', { month: monthLabel(addMonths(month, -1), locale, 'short') })}
              </span>
            ) : (
              t('kpiNoPrev')
            )
          }
        />
        <Kpi
          icon={<AlertCircle className="w-4 h-4" />}
          label={t('kpiOutstanding')}
          value={`${dt(outstanding, locale)}`}
          unit="DT"
          accent={totals.outstanding > 0}
          sub={t('kpiOutstandingSub', { children: filterCounts.due, families: owingFamilies })}
          onClick={() => setFilter('due')}
        />
        <div className="duo-card p-4 bg-white flex items-center gap-3">
          <RateRing value={totals.rate} />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Percent className="w-3 h-3" /> {t('kpiRate')}
            </div>
            <div className="text-[11px] font-bold text-slate-600 mt-1">
              {t('kpiRateSub', { paid: totals.counts.paid, total: totals.children - totals.counts.scholarship })}
            </div>
          </div>
        </div>
        <Kpi
          icon={<GraduationCap className="w-4 h-4" />}
          label={t('kpiDiscounts')}
          value={`${dt(discounts, locale)}`}
          unit="DT"
          sub={t('kpiDiscountsSub', { count: totals.counts.scholarship })}
          onClick={() => setFilter('scholarship')}
        />
        <Kpi
          icon={<History className="w-4 h-4" />}
          label={t('kpiArrears')}
          value={`${dt(arrearsAnim, locale)}`}
          unit="DT"
          accent={arrearsTotal > 0}
          sub={arrearsTotal > 0 ? t('kpiArrearsSub', { count: arrears.size }) : t('kpiArrearsNone')}
          onClick={arrearsTotal > 0 ? () => setFilter('arrears') : undefined}
        />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 duo-card p-5 bg-white">
          <TrendChart data={trend} selected={month} onSelect={setMonth} locale={locale} t={t} />
        </div>

        <div className="duo-card p-5 bg-white space-y-5">
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-2">{t('statusTitle')}</h3>
            <div className="flex h-3 rounded-full overflow-hidden gap-[2px] bg-white">
              {STATUS_ORDER.map((k) =>
                totals.counts[k] ? (
                  <div
                    key={k}
                    className="h-full transition-all duration-700 first:rounded-s-full last:rounded-e-full"
                    style={{ flexGrow: totals.counts[k], background: STATUS[k].color }}
                    title={`${t(STATUS[k].key)}: ${totals.counts[k]}`}
                  />
                ) : null
              )}
              {totals.children === 0 && <div className="h-full flex-1 bg-slate-100 rounded-full" />}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
              {STATUS_ORDER.map((k) => {
                const Icon = STATUS[k].icon;
                return (
                  <div key={k} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <Icon className="w-3.5 h-3.5" style={{ color: STATUS[k].color }} />
                    <span className="truncate">{t(STATUS[k].key)}</span>
                    <span className="ms-auto font-mono font-black text-slate-800">{totals.counts[k]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-800 mb-2">{t('methodsTitle')}</h3>
            {methodTotals.length === 0 ? (
              <p className="text-[11px] font-semibold text-slate-400">{t('methodsEmpty')}</p>
            ) : (
              <div className="space-y-1.5">
                {methodTotals.map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span>{k === 'unknown' ? t('methodUnknown') : t(METHOD_KEYS[k as PaymentMethod])}</span>
                      <span className="font-mono font-black text-slate-800">{dt(v, locale)} DT</span>
                    </div>
                    <div className="h-1.5 mt-0.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[#191919] transition-all duration-700" style={{ width: `${(v / (totals.paid || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-800 mb-2">{t('chaseTitle')}</h3>
            {toChase.length === 0 ? (
              <p className="text-[11px] font-semibold text-slate-500">{t('chaseEmpty')}</p>
            ) : (
              <ul className="space-y-1.5">
                {toChase.map((f) => (
                  <li key={f.name + f.phone} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-800 truncate">{f.name}</div>
                      <div className="text-[10px] font-semibold text-slate-400 truncate">{[...f.kids].join(', ')}</div>
                    </div>
                    <span className="font-mono text-xs font-black text-[#c11e3d]">{dt(f.amount, locale)} DT</span>
                    <a
                      href={reminderLink(f.rows)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 btn-duo-secondary"
                      title={t('remind')}
                      aria-label={t('remind')}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#15803d]" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="duo-card p-3 sm:p-4 bg-white space-y-3 hover:transform-none!">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400 shrink-0">{t('groupBy')}</span>
            <div className="inline-flex p-1 rounded-2xl bg-slate-100">
              {(
                [
                  ['all', t('groupAll'), <Users key="a" className="w-3.5 h-3.5" />],
                  ['parent', t('groupParent'), <Wallet key="p" className="w-3.5 h-3.5" />],
                  ['class', t('groupClass'), <Layers key="c" className="w-3.5 h-3.5" />]
                ] as [GroupBy, string, React.ReactNode][]
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  onClick={() => setGroupBy(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    groupBy === id ? 'bg-white text-[#c11e3d] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full ps-9 pe-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#c11e3d]"
            />
          </div>
          <button onClick={exportCsv} className="px-3 py-2 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0">
            <Download className="w-3.5 h-3.5" />
            {t('exportCsv')}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', t('filterAll')],
              ['due', t('filterDue')],
              ['paid', t('filterPaid')],
              ['scholarship', t('filterScholarship')],
              ['arrears', t('filterArrears')]
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black cursor-pointer transition-all border-2 ${
                filter === id ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c11e3d]'
              }`}
            >
              {label}
              <span className={`ms-1.5 px-1.5 rounded-full text-[10px] ${filter === id ? 'bg-white/20' : 'bg-slate-100'}`}>{filterCounts[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {renderList()}

      {editing && (
        <PaymentModal
          row={editing}
          month={month}
          onClose={() => setEditing(null)}
          onEditPrice={(st) => {
            setEditing(null);
            onEditPrice(st);
          }}
        />
      )}
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 py-14 text-center">
    <Wallet className="w-8 h-8 mx-auto text-slate-300" />
    <p className="mt-2 text-sm font-bold text-slate-500">{text}</p>
  </div>
);

const Kpi: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub: React.ReactNode;
  accent?: boolean;
  onClick?: () => void;
}> = ({ icon, label, value, unit, sub, accent, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`duo-card p-4 bg-white text-start space-y-1 ${onClick ? 'cursor-pointer duo-card-interactive' : ''}`}
    >
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
        <span className="truncate">{label}</span>
        <span className={accent ? 'text-[#c11e3d]' : 'text-slate-400'}>{icon}</span>
      </div>
      <div className={`text-2xl font-black font-mono ${accent ? 'text-[#c11e3d]' : 'text-slate-800'}`}>
        {value} {unit && <span className="text-xs font-bold text-slate-400">{unit}</span>}
      </div>
      <div className="text-[11px] font-bold text-slate-500 leading-snug">{sub}</div>
    </Tag>
  );
};

const RateRing: React.FC<{ value: number }> = ({ value }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? STATUS.paid.color : pct >= 50 ? STATUS.partial.color : STATUS.pending.color;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.34,1.2,.64,1), stroke .3s' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-black font-mono text-slate-800">{pct}%</span>
    </div>
  );
};

/** Width of an element, kept up to date (for the chart) */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

const niceMax = (v: number) => {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

const TrendChart: React.FC<{
  data: { month: string; due: number; paid: number; rate: number }[];
  selected: string;
  onSelect: (m: string) => void;
  locale: string;
  t: (key: keyof (typeof paymentsMessages)['en'], vars?: Record<string, string | number>) => string;
}> = ({ data, selected, onSelect, locale, t }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const H = 220;
  const pad = { top: 12, right: 8, bottom: 26, left: 44 };
  const W = Math.max(width, 280);
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.due, d.paid))));
  const ticks = [0, max / 2, max];
  const slot = innerW / data.length;
  const barW = Math.min(28, slot * 0.62);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const fmtK = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })}k` : dt(v, locale));

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-black text-slate-800">{t('trendTitle')}</h3>
          <p className="text-[11px] font-semibold text-slate-500">{t('trendSub')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#e7e7e7]" /> {t('legendExpected')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#191919]" /> {t('legendCollected')}
            </span>
          </div>
          <button
            onClick={() => setAsTable((v) => !v)}
            className="p-1.5 btn-duo-secondary cursor-pointer"
            title={asTable ? t('showChart') : t('showTable')}
            aria-label={asTable ? t('showChart') : t('showTable')}
          >
            {asTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {asTable ? (
        <div className="scroll-panel max-h-[220px]">
          <table className="data-table w-full text-xs font-semibold text-start">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-2 text-start">{t('colMonth')}</th>
                <th className="pb-2 text-end">{t('legendExpected')}</th>
                <th className="pb-2 text-end">{t('legendCollected')}</th>
                <th className="pb-2 text-end">%</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.month} onClick={() => onSelect(d.month)} className={`cursor-pointer ${d.month === selected ? 'bg-[#fdf2f4]' : ''}`}>
                  <td className="py-1.5 capitalize">{monthLabel(d.month, locale)}</td>
                  <td className="py-1.5 text-end font-mono">{dt(d.due, locale)}</td>
                  <td className="py-1.5 text-end font-mono font-black">{dt(d.paid, locale)}</td>
                  <td className="py-1.5 text-end font-mono">{Math.round(d.rate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" dir="ltr" onMouseLeave={() => setHover(null)}>
          {width > 0 && (
            <svg width={W} height={H} className="block" role="img" aria-label={t('trendTitle')}>
              {ticks.map((v) => (
                <g key={v}>
                  <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#cbd5e1' : '#eef2f6'} strokeWidth={1} />
                  <text x={pad.left - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fontWeight="700" fill="#94a3b8">
                    {fmtK(v)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const cx = pad.left + slot * i + slot / 2;
                const isSel = d.month === selected;
                const dueH = (d.due / max) * innerH;
                const paidH = (Math.min(d.paid, max) / max) * innerH;
                return (
                  <g key={d.month}>
                    {(isSel || hover === i) && (
                      <rect x={cx - slot / 2 + 2} y={pad.top} width={slot - 4} height={innerH} rx={8} fill={isSel ? '#fdf2f4' : '#f8fafc'} />
                    )}
                    {/* expected: ghost bar; collected: solid bar in front, separated by a 2px surface ring */}
                    <rect x={cx - barW / 2} y={y(d.due)} width={barW} height={dueH} rx={4} fill="#e7e7e7" style={{ transition: 'all .6s ease' }} />
                    <rect
                      x={cx - barW / 2 + 4}
                      y={y(Math.min(d.paid, max))}
                      width={Math.max(0, barW - 8)}
                      height={paidH}
                      rx={4}
                      fill={isSel ? '#c11e3d' : '#191919'}
                      stroke="#ffffff"
                      strokeWidth={2}
                      style={{ transition: 'all .6s ease' }}
                    />
                    <text
                      x={cx}
                      y={H - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isSel ? 900 : 700}
                      fill={isSel ? '#c11e3d' : '#94a3b8'}
                    >
                      {new Date(Number(d.month.slice(0, 4)), Number(d.month.slice(5)) - 1, 15).toLocaleDateString(locale, { month: 'short' })}
                    </text>
                    <rect
                      x={cx - slot / 2}
                      y={0}
                      width={slot}
                      height={H}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHover(i)}
                      onClick={() => onSelect(d.month)}
                    />
                  </g>
                );
              })}
            </svg>
          )}
          {hover !== null && width > 0 && (
            <div
              className="absolute pointer-events-none z-10 px-3 py-2 rounded-xl bg-white shadow-lg border border-slate-200 text-[11px] font-semibold text-slate-600 whitespace-nowrap"
              style={{
                left: Math.min(Math.max(pad.left + slot * hover + slot / 2, 80), W - 80),
                top: 0,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="font-black text-slate-800 capitalize mb-0.5">{monthLabel(data[hover].month, locale)}</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#191919]" />
                {t('legendCollected')} <b className="font-mono text-slate-800 ms-auto ps-3">{dt(data[hover].paid, locale)} DT</b>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#e7e7e7]" />
                {t('legendExpected')} <b className="font-mono text-slate-800 ms-auto ps-3">{dt(data[hover].due, locale)} DT</b>
              </div>
              <div className="text-slate-400 mt-0.5">{t('tipRate', { rate: Math.round(data[hover].rate * 100) })}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Edit one child's payment for the month */
const PaymentModal: React.FC<{
  row: ViewRow;
  month: string;
  onClose: () => void;
  onEditPrice: (st: Student) => void;
}> = ({ row, month, onClose, onEditPrice }) => {
  const { savePayment, resetPayment } = useApp();
  const t = useT(paymentsMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();
  const [scholarship, setScholarship] = useState(row.status === 'scholarship');
  const [due, setDue] = useState(row.status === 'scholarship' && !row.record ? effectiveFee(row.student) : row.due);
  const [paid, setPaid] = useState(row.paid);
  const [method, setMethod] = useState<PaymentMethod>(row.record?.method || 'cash');
  const [paidAt, setPaidAt] = useState(row.record?.paidAt || toISODate(new Date()));
  const [note, setNote] = useState(row.record?.note || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const left = due - paid;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await savePayment(month, row.student.id, {
      amountDue: due,
      amountPaid: paid,
      method,
      paidAt,
      note: note.trim(),
      scholarship
    });
    setSaving(false);
    if (ok) onClose();
  };
  const clear = async () => {
    const ok = await confirm({
      title: t('confirmClearTitle', { name: row.student.studentName, month: monthLabel(month, locale) }),
      message: t('confirmClearText'),
      confirmLabel: t('clearRecord'),
      danger: true
    });
    if (ok && (await resetPayment(month, row.student.id))) onClose();
  };

  const input = 'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:bg-white focus:border-[#c11e3d]';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="duo-card hover:transform-none! p-6 bg-white max-w-md w-full space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-800">
              {t('modalTitle', { name: row.student.studentName, month: monthLabel(month, locale) })}
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              {row.student.parentName} · <span dir="ltr">{row.student.parentPhone}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 btn-duo-secondary cursor-pointer" aria-label={t('cancel')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 cursor-pointer text-xs font-bold text-slate-700">
          <input type="checkbox" checked={scholarship} onChange={(e) => setScholarship(e.target.checked)} className="w-4 h-4 accent-[#c11e3d]" />
          <GraduationCap className="w-4 h-4 text-slate-500" />
          {t('scholarshipMonth')}
        </label>

        {!scholarship && (
          <>
            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
              <label className="space-y-1">
                <span>{t('amountDue')}</span>
                <input type="number" min={0} step="any" value={due} onChange={(e) => setDue(Number(e.target.value))} className={`${input} font-mono`} />
              </label>
              <label className="space-y-1">
                <span>{t('amountPaid')}</span>
                <input type="number" min={0} step="any" value={paid} onChange={(e) => setPaid(Number(e.target.value))} className={`${input} font-mono`} autoFocus />
              </label>
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  ['full', due],
                  ['half', Math.round(due / 2)],
                  ['nothing', 0]
                ] as const
              ).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPaid(v)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer transition-colors ${
                    paid === v ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c11e3d]'
                  }`}
                >
                  {t(k)}
                </button>
              ))}
              <span
                className="ms-auto self-center text-[11px] font-black"
                style={{ color: left > 0 ? STATUS.pending.color : STATUS.paid.color }}
              >
                {left > 0 ? t('balanceLeft', { amount: dt(left, locale) }) : left < 0 ? t('overpaid', { amount: dt(-left, locale) }) : t('settled')}
              </span>
            </div>

            {paid > 0 && (
              <>
                <div className="space-y-1 text-xs font-bold text-slate-700">
                  <span>{t('method')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black border-2 cursor-pointer transition-colors ${
                          method === m ? 'bg-[#c11e3d] text-white border-[#c11e3d]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c11e3d]'
                        }`}
                      >
                        {t(METHOD_KEYS[m])}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block space-y-1 text-xs font-bold text-slate-700">
                  <span>{t('paidAt')}</span>
                  <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={input} />
                </label>
              </>
            )}
          </>
        )}

        <label className="block space-y-1 text-xs font-bold text-slate-700">
          <span>{t('note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t('notePlaceholder')} className={input} />
        </label>

        <button
          type="button"
          onClick={() => onEditPrice(row.student)}
          className="text-[11px] font-black text-[#c11e3d] hover:underline cursor-pointer"
        >
          {t('changePrice')} <span className="inline-block rtl:rotate-180">&rarr;</span>
        </button>

        <div className="flex items-center gap-2 pt-2 border-t-2 border-slate-100">
          {row.record && (
            <button type="button" onClick={clear} className="px-3 py-2 btn-duo-secondary text-xs font-bold cursor-pointer text-[#c11e3d]">
              {t('clearRecord')}
            </button>
          )}
          <button type="button" onClick={onClose} className="ms-auto px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60">
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
};
