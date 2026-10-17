import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  GraduationCap,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Search,
  ShoppingBag,
  Table2,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CashCategory, CashEntry, CashType, PaymentMethod } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { cashMessages } from '../../i18n/messages/cash';
import { api } from '../../api';
import { useConfirm } from '../common/ConfirmProvider';
import { addMonths, currentMonth, monthLabel, monthRange } from '../../utils/payments';
import { fromISODate, toISODate } from '../../utils/schedule';

type Source = 'manual' | 'tuition' | 'shop';
type Mode = 'month' | 'year';
/** One line of the cash book: an entry typed by an admin, or money that came in through fees or the shop */
type Line = {
  id: string;
  type: CashType;
  amount: number;
  date: string;
  categoryId: string;
  label: string;
  note?: string;
  method?: PaymentMethod;
  source: Source;
  entry?: CashEntry;
};

const INCOME = '#15803d';
const EXPENSE = '#c11e3d';
const METHODS: PaymentMethod[] = ['cash', 'transfer', 'cheque', 'card', 'other'];
const METHOD_KEYS = { cash: 'mCash', transfer: 'mTransfer', cheque: 'mCheque', card: 'mCard', other: 'mOther' } as const;
const SWATCHES = ['#15803d', '#0f766e', '#65a30d', '#c9a227', '#7c3aed', '#64748b', '#c11e3d', '#6a0d1f', '#ea580c', '#d97706', '#0284c7', '#4f46e5', '#0d9488', '#db2777', '#9333ea', '#475569'];

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d] focus:bg-white';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function useCountUp(target: number, duration = 600): number {
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

/** Admin "Caisse" tab: the club's money in and out, by month or year, with categories, filters and a PDF report. */
export const CashManager: React.FC = () => {
  const { payments, orders, products, students, deletedStudents, currentUser, showToast } = useApp();
  const t = useT(cashMessages);
  const { lang, locale } = useLanguage();
  const confirm = useConfirm();

  const [categories, setCategories] = useState<CashCategory[] | null>(null);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const load = async () => {
    try {
      const data = await api<{ categories: CashCategory[]; entries: CashEntry[] }>(`/admin/cash?lang=${lang}`);
      // Income first, the automatic categories (fees, shop) first, then in the order they were created
      setCategories(
        [...data.categories].sort(
          (x, y) => (x.type === y.type ? 0 : x.type === 'income' ? -1 : 1) || Number(!!y.system) - Number(!!x.system) || x.id.localeCompare(y.id)
        )
      );
      setEntries(data.entries);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('loadError'), 'error');
      setCategories([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      showToast(ok);
      await load();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('loadError'), 'error');
      return false;
    }
  };

  // ---------- period ----------
  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState(currentMonth());
  const year = month.slice(0, 4);
  const periodKey = mode === 'month' ? month : year;
  const prevKey = mode === 'month' ? addMonths(month, -1) : String(Number(year) - 1);
  const periodLabel = (key: string) => (key.length === 4 ? key : monthLabel(key, locale));
  const step = (d: number) => setMonth(mode === 'month' ? addMonths(month, d) : `${Number(year) + d}${month.slice(4)}`);

  // ---------- filters ----------
  const [typeFilter, setTypeFilter] = useState<'all' | CashType>('all');
  const [catFilter, setCatFilter] = useState<string[]>([]);
  const [sources, setSources] = useState<Record<Source, boolean>>({ manual: true, tuition: true, shop: true });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<CashEntry> | null>(null);
  const [showCats, setShowCats] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfParts, setPdfParts] = useState({ summary: true, categories: true, ledger: true, signatures: true });

  // ---------- all lines ----------
  const catById = useMemo(() => new Map((categories || []).map((c) => [c.id, c])), [categories]);
  const systemCat = (s: 'tuition' | 'shop') => (categories || []).find((c) => c.system === s)?.id || `cat-${s}`;
  const studentName = useMemo(() => {
    const m = new Map([...students, ...deletedStudents].map((s) => [s.id, s.studentName]));
    return (id: string) => m.get(id) || '';
  }, [students, deletedStudents]);

  const lines: Line[] = useMemo(() => {
    const out: Line[] = entries.map((e) => ({ ...e, source: 'manual' as const, entry: e }));
    // Fee payments: counted on the day they were paid
    for (const p of payments) {
      if (p.amountPaid <= 0) continue;
      out.push({
        id: `pay-${p.id}`,
        type: 'income',
        amount: p.amountPaid,
        date: p.paidAt || `${p.month}-01`,
        categoryId: systemCat('tuition'),
        label: `${studentName(p.studentId)} · ${monthLabel(p.month, locale)}`,
        method: p.method,
        source: 'tuition'
      });
    }
    // Shop: money comes in when the order is picked up
    for (const o of orders) {
      if (o.status !== 'picked_up') continue;
      const product = products.find((x) => x.id === o.productId)?.name || o.productName || '';
      out.push({
        id: `ord-${o.id}`,
        type: 'income',
        amount: o.price,
        date: o.pickedUpAt || o.requestedAt,
        categoryId: systemCat('shop'),
        label: `${product}${o.size && o.size !== 'ONE' ? ` (${o.size})` : ''} · ${o.studentName}`,
        source: 'shop'
      });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date) || a.label.localeCompare(b.label));
  }, [entries, payments, orders, products, categories, studentName, locale]);

  const sum = (list: Line[], type: CashType) => list.filter((l) => l.type === type).reduce((s, l) => s + l.amount, 0);
  const inPeriod = (key: string) => lines.filter((l) => l.date.startsWith(key));
  const periodLines = useMemo(() => inPeriod(periodKey), [lines, periodKey]);
  const prevLines = useMemo(() => inPeriod(prevKey), [lines, prevKey]);

  const totals = { income: sum(periodLines, 'income'), expense: sum(periodLines, 'expense') };
  const prevTotals = { income: sum(prevLines, 'income'), expense: sum(prevLines, 'expense') };
  const netNow = totals.income - totals.expense;
  const netPrev = prevTotals.income - prevTotals.expense;
  const periodEnd = mode === 'month' ? `${month}-31` : `${year}-12-31`;
  const upToEnd = lines.filter((l) => l.date <= periodEnd);
  const cashOnHand = sum(upToEnd, 'income') - sum(upToEnd, 'expense');
  const tuitionTotal = periodLines.filter((l) => l.source === 'tuition').reduce((s, l) => s + l.amount, 0);
  const shopTotal = periodLines.filter((l) => l.source === 'shop').reduce((s, l) => s + l.amount, 0);
  const monthsInPeriod = mode === 'year' ? (year === currentMonth().slice(0, 4) ? Number(currentMonth().slice(5)) : 12) : 1;

  const breakdown = (list: Line[], type: CashType) => {
    const m = new Map<string, number>();
    list.filter((l) => l.type === type).forEach((l) => m.set(l.categoryId, (m.get(l.categoryId) || 0) + l.amount));
    const total = [...m.values()].reduce((s, v) => s + v, 0);
    return [...m.entries()].map(([id, amount]) => ({ id, amount, share: total ? amount / total : 0 })).sort((a, b) => b.amount - a.amount);
  };
  const biggest = breakdown(periodLines, 'expense')[0];

  // Filtered lines: ledger, breakdown and PDF
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodLines.filter(
      (l) =>
        sources[l.source] &&
        (typeFilter === 'all' || l.type === typeFilter) &&
        (catFilter.length === 0 || catFilter.includes(l.categoryId)) &&
        (!q || l.label.toLowerCase().includes(q) || (l.note || '').toLowerCase().includes(q))
    );
  }, [periodLines, sources, typeFilter, catFilter, search]);
  const fIncome = sum(filtered, 'income');
  const fExpense = sum(filtered, 'expense');
  const filtersOn = typeFilter !== 'all' || catFilter.length > 0 || !sources.manual || !sources.tuition || !sources.shop || !!search.trim();

  // Chart: the 12 months of the year, or the last 12 months
  const chartMonths = mode === 'year' ? monthRange(`${year}-01`, `${year}-12`) : monthRange(addMonths(month, -11), month);
  const chart = chartMonths.map((m) => {
    const ls = inPeriod(m);
    return { month: m, income: sum(ls, 'income'), expense: sum(ls, 'expense') };
  });

  const fmt = (n: number) => Math.round(n).toLocaleString(locale);
  const aNet = useCountUp(netNow);
  const aIncome = useCountUp(totals.income);
  const aExpense = useCountUp(totals.expense);
  const aCash = useCountUp(cashOnHand);

  const catName = (id: string) => catById.get(id)?.name || '—';
  const catColor = (id: string) => catById.get(id)?.color || '#94a3b8';
  const sourceLabel = (s: Source) => (s === 'tuition' ? t('srcTuition') : s === 'shop' ? t('srcShop') : t('srcManual'));

  // ---------- actions ----------
  const openNew = (type: CashType) => {
    const first = (categories || []).find((c) => c.type === type && !c.system && !c.deletedAt);
    setEditing({ type, date: toISODate(new Date()), categoryId: first?.id || '', label: '', amount: undefined, method: 'cash' });
  };

  const removeEntry = async (e: CashEntry) => {
    const ok = await confirm({ title: t('confirmDelete', { label: e.label }), message: t('confirmDeleteText'), confirmLabel: t('delete'), danger: true });
    if (ok) await run(() => api(`/admin/cash/entries/${e.id}`, { method: 'DELETE' }), t('deleted'));
  };

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [[t('colDate'), t('colLabel'), t('colCategory'), t('colMethod'), t('colIn'), t('colOut'), t('colSource'), t('note')].map(esc).join(',')];
    for (const l of filtered) {
      rows.push(
        [l.date, l.label, catName(l.categoryId), l.method ? t(METHOD_KEYS[l.method]) : '', l.type === 'income' ? l.amount : '', l.type === 'expense' ? l.amount : '', sourceLabel(l.source), l.note || '']
          .map(esc)
          .join(',')
      );
    }
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `caisse-${periodKey}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const generatePdf = () => {
    setShowPdf(false);
    setTimeout(() => window.print(), 80);
  };

  if (categories === null) {
    return <div className="py-14 text-center text-sm font-medium text-slate-400">…</div>;
  }

  const delta = (now: number, before: number) => {
    const d = now - before;
    return (
      <span className={`inline-flex items-center gap-1 ${d >= 0 ? 'text-[#7ee2a1]' : 'text-[#ff8fa3]'}`}>
        {d >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {t('vsPrev', { sign: d >= 0 ? '+' : '−', amount: fmt(Math.abs(d)), period: periodLabel(prevKey) })}
      </span>
    );
  };
  const hasPrev = prevLines.length > 0;

  const CategoryBars: React.FC<{ type: CashType; title: string }> = ({ type, title }) => {
    const rows = breakdown(filtered, type);
    return (
      <div>
        <h4 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-1.5">
          {type === 'income' ? <ArrowDownLeft className="w-4 h-4" style={{ color: INCOME }} /> : <ArrowUpRight className="w-4 h-4" style={{ color: EXPENSE }} />}
          {title}
          <span className="ms-auto font-mono text-xs text-slate-500">{fmt(type === 'income' ? fIncome : fExpense)} DT</span>
        </h4>
        {rows.length === 0 ? (
          <p className="text-[11px] font-semibold text-slate-400">{t('noData')}</p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((r) => {
              const on = catFilter.includes(r.id);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setCatFilter((f) => (on ? f.filter((x) => x !== r.id) : [...f, r.id]))}
                    className={`w-full text-start px-2 py-1 rounded-lg cursor-pointer transition-colors ${on ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: catColor(r.id) }} />
                      <span className="truncate">{catName(r.id)}</span>
                      <span className="ms-auto text-[10px] text-slate-400">{Math.round(r.share * 100)}%</span>
                      <span className="font-mono font-black text-slate-900 w-20 text-end">{fmt(r.amount)}</span>
                    </div>
                    <div className="h-1.5 mt-1 ms-[18px] rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.share * 100}%`, background: catColor(r.id) }} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-7">
        <div className="absolute -top-20 -end-16 w-72 h-72 rounded-full bg-[#c11e3d]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 start-1/4 w-72 h-72 rounded-full bg-[#15803d]/25 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-black uppercase tracking-wide">
              <Landmark className="w-3.5 h-3.5" /> {t('badge')}
            </div>
            <div className="inline-flex p-1 rounded-xl bg-white/10">
              {(['month', 'year'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer ${mode === m ? 'bg-white text-[#191919]' : 'text-white/70 hover:text-white'}`}
                >
                  {t(m)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => step(-1)} aria-label={t('prev')} className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 grid place-items-center cursor-pointer">
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <h2 key={periodKey} className="text-2xl sm:text-4xl font-black tracking-tight capitalize min-w-[9ch] text-center animate-[fadeIn_.35s_ease]">
                {periodLabel(periodKey)}
              </h2>
              <button onClick={() => step(1)} aria-label={t('next')} className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 grid place-items-center cursor-pointer">
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
              {month !== currentMonth() && (
                <button onClick={() => setMonth(currentMonth())} className="ms-1 px-2.5 py-1 rounded-full bg-white text-[#191919] text-[11px] font-black cursor-pointer">
                  {t('today')}
                </button>
              )}
            </div>
          </div>
          <div className="lg:text-end">
            <div className="text-[11px] font-black uppercase tracking-wide text-white/60">{t('net')}</div>
            <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${netNow < 0 ? 'text-[#ff8fa3]' : ''}`}>
              {netNow < 0 ? '−' : ''}
              {fmt(Math.abs(aNet))} <span className="text-lg text-white/60">DT</span>
            </div>
            <div className="text-xs font-semibold mt-1">{hasPrev ? delta(netNow, netPrev) : <span className="text-white/50">{t('noPrev')}</span>}</div>
            <div className="flex lg:justify-end gap-2 mt-3">
              <button onClick={() => openNew('income')} className="px-3.5 py-2 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" /> {t('addIncome')}
              </button>
              <button onClick={() => openNew('expense')} className="px-3.5 py-2 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" /> {t('addExpense')}
              </button>
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-2 mt-5">
          {[
            { icon: <ArrowDownLeft className="w-4 h-4" />, label: t('income'), value: `${fmt(aIncome)} DT`, sub: hasPrev ? delta(totals.income, prevTotals.income) : null },
            { icon: <ArrowUpRight className="w-4 h-4" />, label: t('expense'), value: `${fmt(aExpense)} DT`, sub: biggest ? `${t('biggestExpense')}: ${catName(biggest.id)}` : null },
            { icon: <PiggyBank className="w-4 h-4" />, label: t('cashOnHand'), value: `${cashOnHand < 0 ? '−' : ''}${fmt(Math.abs(aCash))} DT`, sub: t('cashOnHandSub') },
            {
              icon: <GraduationCap className="w-4 h-4" />,
              label: `${t('tuition')} · ${t('shop')}`,
              value: `${fmt(tuitionTotal)} · ${fmt(shopTotal)}`,
              sub: mode === 'year' ? `${t('avgMonth')}: ${fmt((totals.income - totals.expense) / Math.max(1, monthsInPeriod))} DT` : t('entriesCount', { count: periodLines.length })
            }
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-2xl bg-white/10 min-w-0">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/60">
                <span className="truncate">{s.label}</span>
                {s.icon}
              </div>
              <div className="text-xl font-black font-mono mt-1 truncate">{s.value}</div>
              {s.sub && <div className="text-[11px] font-semibold text-white/60 truncate">{s.sub}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Chart + categories */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 duo-card hover:transform-none! bg-white p-5">
          <FlowChart
            data={chart}
            selected={mode === 'month' ? month : ''}
            onSelect={(m) => {
              setMonth(m);
              setMode('month');
            }}
            title={mode === 'year' ? t('chartTitleYear', { year }) : t('chartTitleMonth')}
            locale={locale}
            t={t}
          />
        </div>
        <div className="xl:col-span-2 duo-card hover:transform-none! bg-white p-5 space-y-5">
          <CategoryBars type="income" title={t('incomeByCat')} />
          <CategoryBars type="expense" title={t('expenseByCat')} />
        </div>
      </div>

      {/* Filters */}
      <div className="duo-card hover:transform-none! bg-white p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 shrink-0">
            {(['all', 'income', 'expense'] as const).map((ty) => (
              <button
                key={ty}
                onClick={() => setTypeFilter(ty)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${typeFilter === ty ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              >
                {ty === 'all' ? t('all') : t(ty)}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className={`${inputCls} ps-9 py-1.5`} />
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => setShowCats(true)} className="px-3 py-1.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer">
              <Tags className="w-3.5 h-3.5" /> {t('manageCategories')}
            </button>
            <button onClick={exportCsv} className="px-3 py-1.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer">
              <Download className="w-3.5 h-3.5" /> {t('exportCsv')}
            </button>
            <button onClick={() => setShowPdf(true)} className="px-3 py-1.5 btn-duo-blue text-xs font-black flex items-center gap-1.5 cursor-pointer">
              <FileText className="w-3.5 h-3.5" /> {t('exportPdf')}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400 me-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> {t('sources')}
          </span>
          {(['manual', 'tuition', 'shop'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSources((x) => ({ ...x, [s]: !x[s] }))}
              aria-pressed={sources[s]}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer ${
                sources[s] ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-400 border-slate-200 line-through'
              }`}
            >
              {s === 'manual' ? <Wallet className="w-3 h-3" /> : s === 'tuition' ? <GraduationCap className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
              {sourceLabel(s)}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400 me-1">{t('categories')}</span>
          {categories
            .filter((c) => !c.deletedAt && (typeFilter === 'all' || c.type === typeFilter))
            .map((c) => {
              const on = catFilter.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setCatFilter((f) => (on ? f.filter((x) => x !== c.id) : [...f, c.id]))}
                  aria-pressed={on}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border-2 cursor-pointer transition-colors ${
                    on ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </button>
              );
            })}
          {filtersOn && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setCatFilter([]);
                setSources({ manual: true, tuition: true, shop: true });
                setSearch('');
              }}
              className="ms-1 px-2 py-1 text-[11px] font-black text-[#c11e3d] hover:underline cursor-pointer"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="rounded-3xl border-2 border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-slate-50 border-b-2 border-slate-100">
          <h4 className="text-sm font-black text-slate-800">{t('ledger')}</h4>
          <span className="text-[11px] font-bold text-slate-400">{t('entriesCount', { count: filtered.length })}</span>
          <span className="ms-auto flex gap-3 text-xs font-black font-mono">
            <span style={{ color: INCOME }}>+{fmt(fIncome)}</span>
            <span style={{ color: EXPENSE }}>−{fmt(fExpense)}</span>
            <span className="text-slate-900">= {fmt(fIncome - fExpense)} DT</span>
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm font-medium text-slate-400">{t('ledgerEmpty')}</div>
        ) : (
          <ul className="divide-y divide-slate-100 scroll-panel max-h-[640px]">
            {filtered.map((l) => (
              <li key={l.id} className="grid grid-cols-[auto_1fr_auto] lg:grid-cols-[90px_minmax(0,1.6fr)_minmax(0,1fr)_110px_auto] gap-3 items-center px-4 sm:px-5 py-3 hover:bg-slate-50/70">
                <span className="text-[11px] font-black text-slate-500 capitalize w-16 lg:w-auto">
                  {fromISODate(l.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{l.label}</div>
                  <div className="text-[10px] font-semibold text-slate-400 truncate">
                    {l.source !== 'manual' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 rounded bg-slate-100 text-slate-500 font-black uppercase me-1">{t('auto')}</span>
                    ) : null}
                    {l.method ? t(METHOD_KEYS[l.method]) : ''}
                    {l.note ? ` · ${l.note}` : ''}
                  </div>
                </div>
                <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: catColor(l.categoryId) }} />
                  <span className="truncate">{catName(l.categoryId)}</span>
                </span>
                <span className="font-mono text-sm font-black text-end tabular-nums" style={{ color: l.type === 'income' ? INCOME : EXPENSE }}>
                  {l.type === 'income' ? '+' : '−'}
                  {l.amount.toLocaleString(locale, { maximumFractionDigits: 3 })}
                </span>
                <div className="hidden lg:flex justify-end gap-0.5 w-[76px]">
                  {l.entry ? (
                    <>
                      <button onClick={() => setEditing(l.entry!)} aria-label={t('edit')} title={t('edit')} className="w-8 h-8 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeEntry(l.entry!)} aria-label={t('delete')} title={t('delete')} className="w-8 h-8 grid place-items-center rounded-xl text-slate-400 hover:bg-[#fbe3e7] hover:text-[#c11e3d] cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-300 self-center" title={t('autoHint', { source: sourceLabel(l.source) })}>
                      {sourceLabel(l.source)}
                    </span>
                  )}
                </div>
                {l.entry && (
                  <button onClick={() => setEditing(l.entry!)} className="lg:hidden col-span-3 -mt-1 text-start text-[11px] font-black text-[#c11e3d] cursor-pointer">
                    {t('edit')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <EntryModal
          draft={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onDelete={editing.id ? () => removeEntry(editing as CashEntry).then(() => setEditing(null)) : undefined}
          onCreateCategory={async (cat) => {
            try {
              const created = await api<CashCategory>('/admin/cash/categories', { method: 'POST', body: cat });
              setCategories((c) => [...(c || []), created]);
              return created;
            } catch (err) {
              showToast(err instanceof Error ? err.message : t('loadError'), 'error');
              return null;
            }
          }}
          onSave={async (d) => {
            const ok = await run(
              () => (d.id ? api(`/admin/cash/entries/${d.id}`, { method: 'PUT', body: d }) : api('/admin/cash/entries', { method: 'POST', body: d })),
              t('saved')
            );
            if (ok) setEditing(null);
          }}
        />
      )}

      {showCats && (
        <CategoriesModal
          categories={categories}
          onClose={() => setShowCats(false)}
          onAdd={(c) => run(() => api('/admin/cash/categories', { method: 'POST', body: c }), t('saved'))}
          onUpdate={(id, c) => run(() => api(`/admin/cash/categories/${id}`, { method: 'PUT', body: c }), t('saved'))}
          onArchive={async (c) => {
            const ok = await confirm({ title: t('confirmArchive', { name: c.name }), message: t('confirmArchiveText'), confirmLabel: t('catArchive'), danger: true });
            if (ok) await run(() => api(`/admin/cash/categories/${c.id}`, { method: 'DELETE' }), t('saved'));
          }}
        />
      )}

      {showPdf && (
        <Modal onClose={() => setShowPdf(false)}>
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#c11e3d]" /> {t('pdfTitle')}
              </h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">{t('pdfSub')}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-3 text-xs font-bold text-slate-700 space-y-1">
              <div>
                {t('rPeriod')}: <span className="capitalize">{periodLabel(periodKey)}</span>
              </div>
              <div>
                {t('rFilters')}: {filtersOn ? describeFilters() : t('rNoFilter')}
              </div>
            </div>
            <div className="space-y-2">
              {(
                [
                  ['summary', t('pdfSummary')],
                  ['categories', t('pdfCategories')],
                  ['ledger', t('pdfLedger')],
                  ['signatures', t('pdfSign')]
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 cursor-pointer text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={pdfParts[k]} onChange={(e) => setPdfParts((p) => ({ ...p, [k]: e.target.checked }))} className="w-4 h-4 accent-[#c11e3d]" />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPdf(false)} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
                {t('cancel')}
              </button>
              <button onClick={generatePdf} className="px-4 py-2 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer">
                <FileText className="w-4 h-4" /> {t('pdfGenerate')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printed report (only visible when printing) */}
      {createPortal(
        <div className="print-sheet text-black bg-white text-[11px]" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-3">
            <div>
              <div className="text-[18px] font-black uppercase">{t('rTitle')}</div>
              <div className="text-[12px] font-bold">Discovery Club Junior</div>
              <div className="text-[12px] mt-1">
                {t('rPeriod')}: <b className="capitalize">{periodLabel(periodKey)}</b>
              </div>
              <div className="text-[10px]">
                {t('rFilters')}: {filtersOn ? describeFilters() : t('rNoFilter')}
              </div>
            </div>
            <img src="/favicon.png" alt="" className="w-12 h-12 object-contain" />
          </div>

          {pdfParts.summary && (
            <table className="w-full border-collapse mb-4">
              <tbody>
                <tr>
                  {[
                    [t('income'), fIncome],
                    [t('expense'), fExpense],
                    [t('net'), fIncome - fExpense],
                    [t('cashOnHand'), cashOnHand]
                  ].map(([label, v]) => (
                    <td key={label as string} className="border border-black p-2 w-1/4">
                      <div className="text-[10px] uppercase font-bold">{label}</div>
                      <div className="text-[15px] font-black">{fmt(v as number)} DT</div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}

          {pdfParts.categories && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {(['income', 'expense'] as const).map((ty) => (
                <table key={ty} className="w-full border-collapse self-start">
                  <thead>
                    <tr className="bg-[#eeeeee]">
                      <th className="border border-black px-1.5 py-1 text-start">{ty === 'income' ? t('incomeByCat') : t('expenseByCat')}</th>
                      <th className="border border-black px-1.5 py-1 w-14">{t('rShare')}</th>
                      <th className="border border-black px-1.5 py-1 w-20 text-end">DT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown(filtered, ty).map((r) => (
                      <tr key={r.id}>
                        <td className="border border-black px-1.5 py-1">{catName(r.id)}</td>
                        <td className="border border-black px-1.5 py-1 text-center">{Math.round(r.share * 100)}%</td>
                        <td className="border border-black px-1.5 py-1 text-end">{fmt(r.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-black">
                      <td className="border border-black px-1.5 py-1" colSpan={2}>
                        {t('rTotal')}
                      </td>
                      <td className="border border-black px-1.5 py-1 text-end">{fmt(ty === 'income' ? fIncome : fExpense)}</td>
                    </tr>
                  </tbody>
                </table>
              ))}
            </div>
          )}

          {pdfParts.ledger && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#eeeeee]">
                  <th className="border border-black px-1.5 py-1 w-[11%]">{t('colDate')}</th>
                  <th className="border border-black px-1.5 py-1 text-start">{t('colLabel')}</th>
                  <th className="border border-black px-1.5 py-1 w-[20%] text-start">{t('colCategory')}</th>
                  <th className="border border-black px-1.5 py-1 w-[10%]">{t('colMethod')}</th>
                  <th className="border border-black px-1.5 py-1 w-[10%] text-end">{t('colIn')}</th>
                  <th className="border border-black px-1.5 py-1 w-[10%] text-end">{t('colOut')}</th>
                </tr>
              </thead>
              <tbody>
                {[...filtered].reverse().map((l) => (
                  <tr key={l.id} style={{ breakInside: 'avoid' }}>
                    <td className="border border-black px-1.5 py-0.5 text-center whitespace-nowrap">{fromISODate(l.date).toLocaleDateString(locale)}</td>
                    <td className="border border-black px-1.5 py-0.5">
                      {l.label}
                      {l.note ? <span className="text-[9px] italic"> ({l.note})</span> : null}
                    </td>
                    <td className="border border-black px-1.5 py-0.5">{catName(l.categoryId)}</td>
                    <td className="border border-black px-1.5 py-0.5 text-center">{l.method ? t(METHOD_KEYS[l.method]) : ''}</td>
                    <td className="border border-black px-1.5 py-0.5 text-end">{l.type === 'income' ? fmt(l.amount) : ''}</td>
                    <td className="border border-black px-1.5 py-0.5 text-end">{l.type === 'expense' ? fmt(l.amount) : ''}</td>
                  </tr>
                ))}
                <tr className="font-black bg-[#eeeeee]">
                  <td className="border border-black px-1.5 py-1" colSpan={4}>
                    {t('rTotal')} ({t('net')}: {fmt(fIncome - fExpense)} DT)
                  </td>
                  <td className="border border-black px-1.5 py-1 text-end">{fmt(fIncome)}</td>
                  <td className="border border-black px-1.5 py-1 text-end">{fmt(fExpense)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {pdfParts.signatures && (
            <div className="grid grid-cols-2 gap-10 mt-10">
              {[t('rTreasurer'), t('rDirector')].map((s) => (
                <div key={s}>
                  <div className="border-b border-black h-10" />
                  <div className="mt-1 font-bold">{s}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 text-[9px] text-[#777]">
            {t('rGenerated', {
              date: new Date().toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              name: currentUser?.displayName || ''
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  function describeFilters() {
    const parts: string[] = [];
    if (typeFilter !== 'all') parts.push(t(typeFilter));
    const off = (['manual', 'tuition', 'shop'] as const).filter((s) => sources[s]);
    if (off.length < 3) parts.push(off.map(sourceLabel).join(' + '));
    if (catFilter.length) parts.push(catFilter.map(catName).join(', '));
    if (search.trim()) parts.push(`“${search.trim()}”`);
    return parts.join(' · ');
  }
};

const Modal: React.FC<{ onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ onClose, wide, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`duo-card hover:transform-none! bg-white w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-5 sm:p-6 max-h-[92vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  );
};

const EntryModal: React.FC<{
  draft: Partial<CashEntry>;
  categories: CashCategory[];
  onClose: () => void;
  onSave: (d: Partial<CashEntry>) => void;
  onDelete?: () => void;
  onCreateCategory: (c: { name: string; type: CashType; color: string }) => Promise<CashCategory | null>;
}> = ({ draft: initial, categories, onClose, onSave, onDelete, onCreateCategory }) => {
  const t = useT(cashMessages);
  const [d, setD] = useState<Partial<CashEntry>>(initial);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const type = d.type || 'expense';
  const options = categories.filter((c) => c.type === type && !c.system && (!c.deletedAt || c.id === d.categoryId));
  const valid = !!d.amount && d.amount > 0 && !!d.date && !!d.categoryId && !!d.label?.trim();
  const color = type === 'income' ? INCOME : EXPENSE;

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setSaving(true);
          await onSave({ ...d, label: d.label!.trim(), note: d.note?.trim() || undefined });
          setSaving(false);
        }}
        className="space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg font-black text-slate-900">{d.id ? t('modalEdit') : t('modalAdd')}</h4>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="p-1.5 btn-duo-secondary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('type')}>
          {(['income', 'expense'] as const).map((ty) => {
            const on = type === ty;
            return (
              <button
                key={ty}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  const first = categories.find((c) => c.type === ty && !c.system && !c.deletedAt);
                  setD({ ...d, type: ty, categoryId: first?.id || '' });
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-sm font-black cursor-pointer transition-all ${
                  on ? 'text-white shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
                style={on ? { background: ty === 'income' ? INCOME : EXPENSE, borderColor: ty === 'income' ? INCOME : EXPENSE } : undefined}
              >
                {ty === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                {t(ty)}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
          <label className="block space-y-1">
            <span>{t('amount')}</span>
            <input
              type="number"
              min={0}
              step="0.001"
              required
              autoFocus
              value={d.amount ?? ''}
              onChange={(e) => setD({ ...d, amount: e.target.value === '' ? undefined : Number(e.target.value) })}
              className={`${inputCls} text-lg font-black font-mono`}
              style={{ color }}
            />
          </label>
          <label className="block space-y-1">
            <span>{t('date')}</span>
            <input type="date" required value={d.date || ''} onChange={(e) => setD({ ...d, date: e.target.value })} className={inputCls} />
          </label>
          <label className="block space-y-1 col-span-2">
            <span>{t('label')}</span>
            <input required maxLength={200} value={d.label || ''} onChange={(e) => setD({ ...d, label: e.target.value })} placeholder={t('labelPh')} className={inputCls} />
          </label>
          <div className="col-span-2 space-y-1">
            <span>{t('category')}</span>
            <div className="flex flex-wrap gap-1.5">
              {options.map((c) => {
                const on = d.categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setD({ ...d, categoryId: c.id })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 text-[11px] font-black cursor-pointer transition-all ${
                      on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </button>
                );
              })}
              {newCat === null ? (
                <button type="button" onClick={() => setNewCat('')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 border-dashed border-slate-300 text-[11px] font-black text-slate-500 hover:border-[#c11e3d] hover:text-[#c11e3d] cursor-pointer">
                  <Plus className="w-3 h-3" /> {t('newCategory')}
                </button>
              ) : (
                <span className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    maxLength={80}
                    placeholder={t('catName')}
                    className="w-40 px-2 py-1.5 bg-white border-2 border-slate-300 rounded-xl text-[11px] font-bold focus:outline-none focus:border-[#c11e3d]"
                    onKeyDown={async (e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      if (!newCat.trim()) return;
                      const created = await onCreateCategory({ name: newCat.trim(), type, color: SWATCHES[(options.length + 6) % SWATCHES.length] });
                      if (created) {
                        setD({ ...d, categoryId: created.id });
                        setNewCat(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!newCat.trim()}
                    onClick={async () => {
                      const created = await onCreateCategory({ name: newCat.trim(), type, color: SWATCHES[(options.length + 6) % SWATCHES.length] });
                      if (created) {
                        setD({ ...d, categoryId: created.id });
                        setNewCat(null);
                      }
                    }}
                    className="px-2.5 py-1.5 btn-duo-blue text-[11px] font-black cursor-pointer disabled:opacity-40"
                  >
                    {t('catAdd')}
                  </button>
                </span>
              )}
            </div>
          </div>
          <div className="col-span-2 space-y-1">
            <span>{t('method')}</span>
            <div className="flex flex-wrap gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setD({ ...d, method: d.method === m ? undefined : m })}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border-2 cursor-pointer ${
                    d.method === m ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {t(METHOD_KEYS[m])}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1 col-span-2">
            <span>{t('note')}</span>
            <input maxLength={1000} value={d.note || ''} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder={t('notePh')} className={inputCls} />
          </label>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t-2 border-slate-100">
          {onDelete && (
            <button type="button" onClick={onDelete} className="px-3 py-2 btn-duo-secondary text-xs font-bold text-[#c11e3d] cursor-pointer">
              {t('delete')}
            </button>
          )}
          <button type="button" onClick={onClose} className="ms-auto px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="submit" disabled={!valid || saving} className="px-4 py-2 text-white rounded-2xl text-xs font-black cursor-pointer disabled:opacity-50" style={{ background: color }}>
            {t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const CategoriesModal: React.FC<{
  categories: CashCategory[];
  onClose: () => void;
  onAdd: (c: { name: string; type: CashType; color: string }) => Promise<boolean>;
  onUpdate: (id: string, c: { name: string; color: string }) => Promise<boolean>;
  onArchive: (c: CashCategory) => void;
}> = ({ categories, onClose, onAdd, onUpdate, onArchive }) => {
  const t = useT(cashMessages);
  const [adding, setAdding] = useState<{ type: CashType; name: string; color: string } | null>(null);
  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Tags className="w-5 h-5 text-[#c11e3d]" /> {t('catTitle')}
            </h4>
            <p className="text-xs font-semibold text-slate-500">{t('catSub')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="p-1.5 btn-duo-secondary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['income', 'expense'] as const).map((ty) => (
            <div key={ty} className="space-y-2">
              <h5 className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5" style={{ color: ty === 'income' ? INCOME : EXPENSE }}>
                {ty === 'income' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                {t(ty)}
              </h5>
              <ul className="space-y-1">
                {categories
                  .filter((c) => c.type === ty && !c.deletedAt)
                  .map((c) => (
                    <CategoryRow key={`${c.id}:${c.name}:${c.color}`} cat={c} onUpdate={onUpdate} onArchive={onArchive} />
                  ))}
              </ul>
              {adding?.type === ty ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (adding.name.trim() && (await onAdd({ ...adding, name: adding.name.trim() }))) setAdding(null);
                  }}
                  className="space-y-1.5 p-2 rounded-xl bg-slate-50"
                >
                  <input autoFocus value={adding.name} maxLength={80} onChange={(e) => setAdding({ ...adding, name: e.target.value })} placeholder={t('catName')} className={`${inputCls} text-xs py-1.5`} />
                  <Swatches value={adding.color} onChange={(color) => setAdding({ ...adding, color })} />
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => setAdding(null)} className="px-2.5 py-1 btn-duo-secondary text-[11px] font-bold cursor-pointer">
                      {t('cancel')}
                    </button>
                    <button type="submit" disabled={!adding.name.trim()} className="px-2.5 py-1 btn-duo-blue text-[11px] font-black cursor-pointer disabled:opacity-40">
                      {t('catAdd')}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAdding({ type: ty, name: '', color: SWATCHES[ty === 'income' ? 2 : 9] })}
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-xl border-2 border-dashed border-slate-300 text-[11px] font-black text-slate-500 hover:border-[#c11e3d] hover:text-[#c11e3d] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> {t('newCategory')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

const Swatches: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-1">
    {SWATCHES.map((c) => (
      <button
        key={c}
        type="button"
        onClick={() => onChange(c)}
        aria-label={c}
        aria-pressed={value === c}
        className={`w-5 h-5 rounded-full cursor-pointer ${value === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`}
        style={{ background: c }}
      />
    ))}
  </div>
);

const CategoryRow: React.FC<{
  cat: CashCategory;
  onUpdate: (id: string, c: { name: string; color: string }) => Promise<boolean>;
  onArchive: (c: CashCategory) => void;
}> = ({ cat, onUpdate, onArchive }) => {
  const t = useT(cashMessages);
  const [name, setName] = useState(cat.name);
  const [open, setOpen] = useState(false);
  const save = (patch: Partial<{ name: string; color: string }>) => {
    const next = { name: (patch.name ?? name).trim(), color: patch.color ?? cat.color };
    if (next.name && (next.name !== cat.name || next.color !== cat.color)) onUpdate(cat.id, next);
  };
  return (
    <li className="p-1.5 rounded-xl hover:bg-slate-50">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={t('edit')} className="w-5 h-5 rounded-full shrink-0 cursor-pointer ring-1 ring-black/10" style={{ background: cat.color }} />
        <input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => save({ name })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="flex-1 min-w-0 px-2 py-1 bg-transparent border-2 border-transparent hover:border-slate-200 focus:border-[#c11e3d] focus:bg-white rounded-lg text-xs font-bold focus:outline-none"
        />
        {cat.system ? (
          <span className="text-[9px] font-black uppercase text-slate-400 px-1.5">{t('catSystem')}</span>
        ) : (
          <button type="button" onClick={() => onArchive(cat)} title={t('catArchive')} aria-label={t('catArchive')} className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-[#fbe3e7] hover:text-[#c11e3d] cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-1.5 ms-7">
          <Swatches
            value={cat.color}
            onChange={(color) => {
              setOpen(false);
              save({ color });
            }}
          />
        </div>
      )}
    </li>
  );
};

/** Income and expenses per month: two bars side by side, hover for the details, click to open the month */
const FlowChart: React.FC<{
  data: { month: string; income: number; expense: number }[];
  selected: string;
  onSelect: (m: string) => void;
  title: string;
  locale: string;
  t: (key: keyof (typeof cashMessages)['en'], vars?: Record<string, string | number>) => string;
}> = ({ data, selected, onSelect, title, locale, t }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [asTable]);
  const H = 230;
  const pad = { top: 12, right: 8, bottom: 26, left: 46 };
  const W = Math.max(width, 280);
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const raw = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const max = (raw / p <= 1 ? 1 : raw / p <= 2 ? 2 : raw / p <= 5 ? 5 : 10) * p;
  const slot = innerW / data.length;
  const barW = Math.min(14, (slot - 10) / 2);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const fmt = (n: number) => Math.round(n).toLocaleString(locale);
  const fmtK = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })}k` : fmt(v));
  const short = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 15).toLocaleDateString(locale, { month: 'short' });

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-slate-400" /> {title}
          </h3>
          <p className="text-[11px] font-semibold text-slate-500">{t('chartSub')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: INCOME }} /> {t('income')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: EXPENSE }} /> {t('expense')}
            </span>
          </div>
          <button onClick={() => setAsTable((v) => !v)} className="p-1.5 btn-duo-secondary cursor-pointer" title={asTable ? t('showChart') : t('showTable')} aria-label={asTable ? t('showChart') : t('showTable')}>
            {asTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {asTable ? (
        <div className="scroll-panel max-h-[230px]">
          <table className="data-table w-full text-xs font-semibold">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-2 text-start">{t('colMonth')}</th>
                <th className="pb-2 text-end">{t('income')}</th>
                <th className="pb-2 text-end">{t('expense')}</th>
                <th className="pb-2 text-end">{t('net')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.month} onClick={() => onSelect(d.month)} className={`cursor-pointer ${d.month === selected ? 'bg-[#fdf2f4]' : ''}`}>
                  <td className="py-1.5 capitalize">{monthLabel(d.month, locale)}</td>
                  <td className="py-1.5 text-end font-mono">{fmt(d.income)}</td>
                  <td className="py-1.5 text-end font-mono">{fmt(d.expense)}</td>
                  <td className="py-1.5 text-end font-mono font-black">{fmt(d.income - d.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" dir="ltr" onMouseLeave={() => setHover(null)}>
          {width > 0 && (
            <svg width={W} height={H} className="block" role="img" aria-label={title}>
              {[0, max / 2, max].map((v) => (
                <g key={v}>
                  <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#cbd5e1' : '#eef2f6'} />
                  <text x={pad.left - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fontWeight="700" fill="#94a3b8">
                    {fmtK(v)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const cx = pad.left + slot * i + slot / 2;
                const sel = d.month === selected;
                return (
                  <g key={d.month}>
                    {(sel || hover === i) && <rect x={cx - slot / 2 + 2} y={pad.top} width={slot - 4} height={innerH} rx={8} fill={sel ? '#fdf2f4' : '#f8fafc'} />}
                    {/* 2px surface gap between the two bars */}
                    <rect x={cx - barW - 1} y={y(d.income)} width={barW} height={Math.max(0, pad.top + innerH - y(d.income))} rx={3} fill={INCOME} style={{ transition: 'all .5s ease' }} />
                    <rect x={cx + 1} y={y(d.expense)} width={barW} height={Math.max(0, pad.top + innerH - y(d.expense))} rx={3} fill={EXPENSE} style={{ transition: 'all .5s ease' }} />
                    <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fontWeight={sel ? 900 : 700} fill={sel ? '#c11e3d' : '#94a3b8'}>
                      {short(d.month)}
                    </text>
                    <rect x={cx - slot / 2} y={0} width={slot} height={H} fill="transparent" className="cursor-pointer" onMouseEnter={() => setHover(i)} onClick={() => onSelect(d.month)} />
                  </g>
                );
              })}
            </svg>
          )}
          {hover !== null && width > 0 && (
            <div
              className="absolute pointer-events-none z-10 px-3 py-2 rounded-xl bg-white shadow-lg border border-slate-200 text-[11px] font-semibold text-slate-600 whitespace-nowrap"
              style={{ left: Math.min(Math.max(pad.left + slot * hover + slot / 2, 90), W - 90), top: 0, transform: 'translateX(-50%)' }}
            >
              <div className="font-black text-slate-800 capitalize mb-0.5">{monthLabel(data[hover].month, locale)}</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: INCOME }} /> {t('income')} <b className="font-mono text-slate-800 ms-auto ps-3">{fmt(data[hover].income)} DT</b>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: EXPENSE }} /> {t('expense')} <b className="font-mono text-slate-800 ms-auto ps-3">{fmt(data[hover].expense)} DT</b>
              </div>
              <div className="text-slate-500 mt-0.5">{t('tipNet', { amount: fmt(data[hover].income - data[hover].expense) })}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
