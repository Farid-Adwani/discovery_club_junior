import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  History,
  ImagePlus,
  LayoutGrid,
  Link2,
  List,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlink,
  Wrench,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MaterialRequest, StockItem, StockStatus } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { stockMessages } from '../../i18n/messages/stock';
import { api } from '../../api';
import { resizePhoto } from '../../utils/image';
import { fromISODate } from '../../utils/schedule';
import { useConfirm } from '../common/ConfirmProvider';
import { ModalPortal } from '../common/ModalPortal';
import { UNAVAILABLE_STATES, availableOf, unitBreakdown } from '../../utils/stock';
import { RequestDetail } from '../trainer/MyRequests';

type Tab = 'inventory' | 'requests' | 'places' | 'history';
const STATUSES: StockStatus[] = ['available', 'in_use', 'maintenance', 'broken', 'lost'];
/** Status colours always come with the label */
const STATUS_STYLE: Record<StockStatus, { bg: string; ink: string; dot: string }> = {
  available: { bg: '#dcf5e4', ink: '#14532d', dot: '#15803d' },
  in_use: { bg: '#e0ecff', ink: '#1e3a8a', dot: '#2563eb' },
  maintenance: { bg: '#fdf3d1', ink: '#6b5310', dot: '#c9a227' },
  broken: { bg: '#fbe3e7', ink: '#861529', dot: '#c11e3d' },
  lost: { bg: '#efefef', ink: '#3d3d3d', dot: '#888888' }
};
const REQ_STYLE: Record<MaterialRequest['status'], { bg: string; ink: string }> = {
  pending: { bg: '#fdf3d1', ink: '#6b5310' },
  approved: { bg: '#e0ecff', ink: '#1e3a8a' },
  delivered: { bg: '#dcf5e4', ink: '#14532d' },
  refused: { bg: '#fbe3e7', ink: '#861529' }
};
const SWATCHES = ['#c11e3d', '#ea580c', '#d97706', '#65a30d', '#15803d', '#0d9488', '#0284c7', '#4f46e5', '#7c3aed', '#db2777', '#475569', '#191919'];
const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d] focus:bg-white';

const isLow = (it: StockItem) => it.minQuantity !== undefined && availableOf(it) <= it.minQuantity;

/** Admin "Stock" tab: equipment with photos, categories, statuses and places, the trainers' requests and the history. */
export const StockManager: React.FC = () => {
  const { stockItems, stockCategories, stockLocations, stockMovements, materialRequests, updateMaterialRequestStatus, showToast, refreshData } = useApp();
  const t = useT(stockMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>('inventory');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [status, setStatus] = useState<'all' | StockStatus>('all');
  const [place, setPlace] = useState<string>('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<Partial<StockItem> | null>(null);
  const [reqFilter, setReqFilter] = useState<'all' | MaterialRequest['status']>('pending');

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      const out = await fn();
      showToast(ok);
      await refreshData();
      return out ?? true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
      return null;
    }
  };

  const catById = useMemo(() => new Map(stockCategories.map((c) => [c.id, c])), [stockCategories]);
  const placeById = useMemo(() => new Map(stockLocations.map((l) => [l.id, l])), [stockLocations]);
  const activeCats = stockCategories.filter((c) => !c.deletedAt);
  const activePlaces = stockLocations.filter((l) => !l.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
  const itemById = useMemo(() => new Map(stockItems.map((i) => [i.id, i])), [stockItems]);

  // ---------- metrics ----------
  const units = stockItems.reduce((s, i) => s + i.quantity, 0);
  const low = stockItems.filter(isLow);
  const attention = stockItems.filter((i) => {
    const b = unitBreakdown(i);
    return b.broken + b.maintenance + b.lost > 0;
  });
  const pendingReqs = materialRequests.filter((r) => r.status === 'pending');

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stockItems
      .filter(
        (i) =>
          (cat === 'all' || (cat === 'none' ? !i.categoryId : i.categoryId === cat)) &&
          (status === 'all' || unitBreakdown(i)[status] > 0) &&
          (place === 'all' || (place === 'none' ? !i.locationId : i.locationId === place)) &&
          (!lowOnly || isLow(i)) &&
          (!q ||
            i.name.toLowerCase().includes(q) ||
            (i.reference || '').toLowerCase().includes(q) ||
            (placeById.get(i.locationId || '')?.name || '').toLowerCase().includes(q))
      )
      .sort((a, b) => Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name));
  }, [stockItems, search, cat, status, place, lowOnly, placeById]);

  const countBy = (key: (i: StockItem) => string) => {
    const m = new Map<string, number>();
    stockItems.forEach((i) => m.set(key(i), (m.get(key(i)) || 0) + 1));
    return m;
  };
  const byCat = countBy((i) => i.categoryId || 'none');
  // Pieces (not items) in each state
  const byStatus = new Map<string, number>();
  stockItems.forEach((i) => {
    const b = unitBreakdown(i);
    STATUSES.forEach((st) => b[st] && byStatus.set(st, (byStatus.get(st) || 0) + b[st]));
  });
  const byPlace = countBy((i) => i.locationId || 'none');

  // One stock change (taps of the −/+ buttons are grouped into one) with an optional reason for the history
  const [moving, setMoving] = useState<StockItem | null>(null);
  const adjust = (it: StockItem, delta: number, note = '') =>
    run(
      () => api(`/admin/stock/items/${it.id}/quantity`, { method: 'PATCH', body: { delta, note } }),
      t('movedToast', { name: it.name, from: it.quantity, to: Math.max(0, it.quantity + delta), unit: it.unit || '' })
    );

  const removeItem = async (it: Partial<StockItem>) => {
    if (!it.id) return;
    const ok = await confirm({ title: t('confirmDelete', { name: it.name || '' }), message: t('confirmDeleteText'), confirmLabel: t('delete'), danger: true });
    if (ok && (await run(() => api(`/admin/stock/items/${it.id}`, { method: 'DELETE' }), t('deleted')))) setEditing(null);
  };

  /** The pieces not available, e.g. "2 In repair · 1 Broken" (nothing when all are available) */
  const UnitChips: React.FC<{ it: StockItem }> = ({ it }) => {
    const b = unitBreakdown(it);
    return (
      <>
        {UNAVAILABLE_STATES.filter((st) => b[st] > 0).map((st) => (
          <span key={st} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap" style={{ background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].ink }}>
            <span className="font-mono">{b[st]}</span> {t(`st_${st}`)}
          </span>
        ))}
      </>
    );
  };

  const Thumb: React.FC<{ it: StockItem; size: string }> = ({ it, size }) => {
    const c = catById.get(it.categoryId || '');
    return it.imageUrl ? (
      <img src={it.imageUrl} alt="" className={`${size} object-cover`} />
    ) : (
      <span className={`${size} grid place-items-center`} style={{ background: `${c?.color || '#94a3b8'}1f`, color: c?.color || '#94a3b8' }}>
        <Package className="w-1/3 h-1/3" />
      </span>
    );
  };

  const Bars: React.FC<{ title: string; rows: { key: string; label: string; color: string; count: number; onClick: () => void; on: boolean }[] }> = ({ title, rows }) => {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
      <div>
        <h4 className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2">{title}</h4>
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.key}>
              <button onClick={r.onClick} className={`w-full text-start px-2 py-1 rounded-lg cursor-pointer ${r.on ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="truncate">{r.label}</span>
                  <span className="ms-auto font-mono font-black text-slate-900">{r.count}</span>
                </div>
                <div className="h-1.5 mt-1 ms-[18px] rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.count / max) * 100}%`, background: r.color }} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'inventory', label: t('tabInventory'), icon: Boxes },
    { id: 'requests', label: t('tabRequests'), icon: ClipboardList, badge: pendingReqs.length },
    { id: 'places', label: t('tabPlaces'), icon: MapPin },
    { id: 'history', label: t('tabHistory'), icon: History }
  ];

  return (
    <div className="space-y-5">
      {/* Header + metrics */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-7">
        <div className="absolute -top-20 -end-16 w-72 h-72 rounded-full bg-[#c11e3d]/40 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-black uppercase tracking-wide">
              <Boxes className="w-3.5 h-3.5" /> {t('badge')}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black mt-2">{t('title')}</h3>
            <p className="text-xs font-medium text-white/60 max-w-xl">{t('subtitle')}</p>
          </div>
          <button onClick={() => setEditing({ quantity: 1, unit: '' })} className="self-start px-4 py-2.5 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> {t('addItem')}
          </button>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-2 mt-5">
          {[
            { icon: <Boxes className="w-4 h-4" />, label: t('statItems'), value: stockItems.length, sub: t('statItemsSub', { units: units.toLocaleString(locale) }), onClick: () => { setTab('inventory'); setLowOnly(false); setStatus('all'); } },
            { icon: <AlertTriangle className="w-4 h-4" />, label: t('statLow'), value: low.length, sub: t('statLowSub'), alert: low.length > 0, onClick: () => { setTab('inventory'); setLowOnly(true); } },
            { icon: <Wrench className="w-4 h-4" />, label: t('statRepair'), value: attention.length, sub: t('statRepairSub'), alert: attention.length > 0, onClick: () => { setTab('inventory'); setStatus('broken'); } },
            { icon: <ClipboardList className="w-4 h-4" />, label: t('statRequests'), value: pendingReqs.length, sub: t('statRequestsSub'), alert: pendingReqs.length > 0, onClick: () => { setTab('requests'); setReqFilter('pending'); } }
          ].map((s) => (
            <button key={s.label} onClick={s.onClick} className="text-start p-3 rounded-2xl bg-white/10 hover:bg-white/15 transition-colors cursor-pointer">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/60">
                <span className="truncate">{s.label}</span>
                <span className={s.alert ? 'text-[#ff8fa3]' : ''}>{s.icon}</span>
              </div>
              <div className="text-2xl font-black font-mono mt-1">
                {s.value}
                {s.alert && <span className="inline-block w-2 h-2 ms-2 rounded-full bg-[#ff6b86] animate-pulse align-middle" />}
              </div>
              <div className="text-[11px] font-semibold text-white/60 truncate">{s.sub}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-2xl bg-slate-100 overflow-x-auto max-w-full">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black whitespace-nowrap cursor-pointer transition-all ${tab === id ? 'bg-white text-[#c11e3d] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {!!badge && <span className="min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-amber-400 text-amber-950 text-[10px]">{badge}</span>}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5 items-start">
          <div className="space-y-4">
            {/* Filters */}
            <div className="duo-card hover:transform-none! bg-white p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className={`${inputCls} ps-9 py-1.5`} />
                </div>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | StockStatus)} className={`${inputCls} md:w-44 py-1.5 cursor-pointer`}>
                  <option value="all">{t('anyStatus')}</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`st_${s}`)}
                    </option>
                  ))}
                </select>
                <select value={place} onChange={(e) => setPlace(e.target.value)} className={`${inputCls} md:w-48 py-1.5 cursor-pointer`}>
                  <option value="all">{t('allPlaces')}</option>
                  <option value="none">{t('noPlace')}</option>
                  {activePlaces.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 shrink-0 self-start">
                  {(
                    [
                      ['grid', LayoutGrid, t('viewGrid')],
                      ['list', List, t('viewList')]
                    ] as const
                  ).map(([v, Icon, label]) => (
                    <button key={v} onClick={() => setView(v)} title={label} aria-label={label} className={`w-8 h-8 grid place-items-center rounded-lg cursor-pointer ${view === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[{ id: 'all', name: t('allCategories'), color: '#191919' }, ...activeCats].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCat(c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer transition-colors ${cat === c.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {c.id !== 'all' && <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />}
                    {c.name}
                    <span className="opacity-60">{c.id === 'all' ? stockItems.length : byCat.get(c.id) || 0}</span>
                  </button>
                ))}
                <button
                  onClick={() => setLowOnly((v) => !v)}
                  className={`ms-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer ${lowOnly ? 'bg-amber-400 border-amber-400 text-amber-950' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  <AlertTriangle className="w-3 h-3" /> {t('lowOnly')} ({low.length})
                </button>
              </div>
            </div>

            {shown.length === 0 ? (
              <div className="py-14 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white">
                <Boxes className="w-8 h-8 mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-500">{stockItems.length ? t('empty') : t('emptyAll')}</p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {shown.map((it) => {
                  const c = catById.get(it.categoryId || '');
                  const l = placeById.get(it.locationId || '');
                  return (
                    <article key={it.id} className="duo-card bg-white overflow-hidden flex flex-col">
                      <button onClick={() => setEditing(it)} className="relative aspect-[16/10] overflow-hidden cursor-pointer group">
                        <Thumb it={it} size="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                        {it.hiddenFromTrainers && (
                          <span className="absolute top-2 end-2 w-7 h-7 grid place-items-center rounded-full bg-black/60 text-white" title={t('hiddenBadge')}>
                            <EyeOff className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </button>
                      <div className="p-3.5 flex flex-col gap-2 flex-1">
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 truncate">{it.name}</div>
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-slate-500">
                            {c && (
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                                {c.name}
                              </span>
                            )}
                            {it.reference && <span className="font-mono text-slate-400 truncate">{it.reference}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <MapPin className="w-3 h-3 text-[#c11e3d]" />
                          <span className="truncate">{l ? l.name : t('noPlace')}</span>
                        </div>
                        <UnitsBar it={it} />
                        <div className="flex flex-wrap gap-1 empty:hidden">
                          <UnitChips it={it} />
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t-2 border-slate-100">
                          {isLow(it) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                              <AlertTriangle className="w-3 h-3" /> {t('low')}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400">{t('inStock')}</span>
                          )}
                          <QuantityStepper key={it.id} it={it} onCommit={(d) => adjust(it, d)} onOpen={() => setMoving(it)} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <ul className="rounded-3xl border-2 border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                {shown.map((it) => {
                  const c = catById.get(it.categoryId || '');
                  const l = placeById.get(it.locationId || '');
                  return (
                    <li key={it.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/70">
                      <span className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                        <Thumb it={it} size="w-full h-full" />
                      </span>
                      <button onClick={() => setEditing(it)} className="min-w-0 flex-1 text-start cursor-pointer">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-slate-900 truncate">{it.name}</span>
                          {it.hiddenFromTrainers && <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 truncate">
                          {c ? c.name : t('noCategory')} · {l ? l.name : t('noPlace')}
                        </div>
                      </button>
                      <div className="hidden md:flex flex-wrap justify-end gap-1 max-w-56">
                        <UnitChips it={it} />
                      </div>
                      <QuantityStepper key={it.id} compact it={it} onCommit={(d) => adjust(it, d)} onOpen={() => setMoving(it)} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Stats */}
          <aside className="duo-card hover:transform-none! bg-white p-4 space-y-5 xl:sticky xl:top-32">
            <Bars
              title={t('byCategory')}
              rows={[...activeCats.map((c) => ({ key: c.id, label: c.name, color: c.color, count: byCat.get(c.id) || 0 })), { key: 'none', label: t('noCategory'), color: '#cbd5e1', count: byCat.get('none') || 0 }]
                .filter((r) => r.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((r) => ({ ...r, on: cat === r.key, onClick: () => setCat(cat === r.key ? 'all' : r.key) }))}
            />
            <Bars
              title={t('byStatus')}
              rows={STATUSES.filter((s) => byStatus.get(s)).map((s) => ({
                key: s,
                label: t(`st_${s}`),
                color: STATUS_STYLE[s].dot,
                count: byStatus.get(s) || 0,
                on: status === s,
                onClick: () => setStatus(status === s ? 'all' : s)
              }))}
            />
            <Bars
              title={t('byPlace')}
              rows={[...activePlaces.map((l) => ({ key: l.id, label: l.name, count: byPlace.get(l.id) || 0 })), { key: 'none', label: t('noPlace'), count: byPlace.get('none') || 0 }]
                .filter((r) => r.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((r) => ({ ...r, color: '#191919', on: place === r.key, onClick: () => setPlace(place === r.key ? 'all' : r.key) }))}
            />
          </aside>
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['pending', 'approved', 'delivered', 'refused', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReqFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black border-2 cursor-pointer ${reqFilter === f ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {f === 'all' ? t('filterAllReq') : t(`req_${f}`)} <span className="opacity-60">{f === 'all' ? materialRequests.length : materialRequests.filter((r) => r.status === f).length}</span>
              </button>
            ))}
          </div>
          {materialRequests.filter((r) => reqFilter === 'all' || r.status === reqFilter).length === 0 ? (
            <div className="py-14 text-center text-sm font-medium text-slate-400 rounded-3xl border-2 border-dashed border-slate-200 bg-white">{t('reqEmpty')}</div>
          ) : (
            <ul className="space-y-2">
              {[...materialRequests]
                .filter((r) => reqFilter === 'all' || r.status === reqFilter)
                .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
                .map((r) => (
                  <RequestRow key={r.id} r={r} item={r.stockItemId ? itemById.get(r.stockItemId) : undefined} items={stockItems} onChange={updateMaterialRequestStatus} Thumb={Thumb} />
                ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'places' && <PlacesPanel byPlace={byPlace} onOpen={(id) => { setPlace(id); setTab('inventory'); }} run={run} />}

      {tab === 'history' && (
        <div className="duo-card hover:transform-none! bg-white p-4 sm:p-5">
          <h4 className="text-sm font-black text-slate-800 mb-3">{t('histTitle')}</h4>
          {stockMovements.length === 0 ? (
            <p className="text-sm font-medium text-slate-400">{t('histEmpty')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stockMovements.map((m) => {
                const it = itemById.get(m.itemId);
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <span className={`w-14 text-center font-mono font-black text-sm ${m.delta >= 0 ? 'text-[#15803d]' : 'text-[#c11e3d]'}`}>
                      {m.delta > 0 ? '+' : ''}
                      {m.delta}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 truncate">{it?.name || '—'}</div>
                      <div className="text-[11px] font-semibold text-slate-400 truncate">
                        {t(`mv_${m.reason}`)}
                        {m.note ? ` · ${m.note}` : ''} · {m.by}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                      {new Date(m.at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {moving && (
        <StockMoveDialog
          it={stockItems.find((i) => i.id === moving.id) || moving}
          onClose={() => setMoving(null)}
          onSave={(delta, note) => adjust(stockItems.find((i) => i.id === moving.id) || moving, delta, note)}
        />
      )}
      {editing && <ItemModal draft={editing} onClose={() => setEditing(null)} onDelete={editing.id ? () => removeItem(editing) : undefined} run={run} />}
    </div>
  );
};

/** One trainer request: status, the stock item it uses (or link one), what delivering will take */
const RequestRow: React.FC<{
  r: MaterialRequest;
  item?: StockItem;
  items: StockItem[];
  onChange: (id: string, status?: MaterialRequest['status'], stockItemId?: string | null, reason?: string) => Promise<boolean>;
  Thumb: React.FC<{ it: StockItem; size: string }>;
}> = ({ r, item, items, onChange, Thumb }) => {
  const t = useT(stockMessages);
  const { locale } = useLanguage();
  const { stockCategories } = useApp();
  const [linking, setLinking] = useState(false);
  const [talking, setTalking] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const closed = r.status === 'delivered' || r.status === 'refused';
  const qty = parseInt(r.quantity, 10);
  const lastComment = r.comments?.[r.comments.length - 1];
  return (
    <li className="duo-card hover:transform-none! bg-white p-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 grid place-items-center">
          {item ? <Thumb it={item} size="w-full h-full" /> : <Package className="w-5 h-5 text-slate-400" />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-black text-slate-900 truncate">{r.itemsNeeded}</span>
            <span className="text-[11px] font-black text-slate-500">{t('qty', { qty: r.quantity })}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${r.urgency === 'urgent' ? 'bg-[#fbe3e7] text-[#861529]' : r.urgency === 'low' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
              {t(`urgency_${r.urgency}`)}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-slate-500 truncate">
            {t('reqFrom', { trainer: r.trainerName, class: r.groupName })}
            {r.sessionDate ? ` · ${t('reqFor', { date: fromISODate(r.sessionDate.slice(0, 10)).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}` : ''}
          </div>
          <div className="text-[11px] font-bold mt-0.5 flex flex-wrap items-center gap-2">
            {item ? (
              <>
                <span className="text-[#15803d] inline-flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> {t('reqStock')} · {t('inStockNow', { count: availableOf(item) })}
                </span>
                {r.stockDeducted ? (
                  <span className="text-slate-500">{t('deducted', { qty: r.stockDeducted })}</span>
                ) : (
                  !closed &&
                  qty > 0 &&
                  (qty > availableOf(item) ? (
                    <span className="text-[#c11e3d] inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {t('notEnough', { count: availableOf(item) })}
                    </span>
                  ) : (
                    <span className="text-slate-400">{t('deliverHint', { qty })}</span>
                  ))
                )}
                {!r.stockDeducted && (
                  <button onClick={() => onChange(r.id, undefined, null)} className="text-slate-400 hover:text-[#c11e3d] inline-flex items-center gap-0.5 cursor-pointer">
                    <Unlink className="w-3 h-3" /> {t('unlink')}
                  </button>
                )}
              </>
            ) : linking ? (
              <select
                autoFocus
                defaultValue=""
                onChange={async (e) => {
                  if (e.target.value && (await onChange(r.id, undefined, e.target.value))) setLinking(false);
                }}
                onBlur={() => setLinking(false)}
                className="px-2 py-1 bg-white border-2 border-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                <option value="" disabled>
                  {t('linkItem')}
                </option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({availableOf(i)} {i.unit || ''})
                  </option>
                ))}
              </select>
            ) : (
              <>
                <span className="text-slate-400">{t('reqManual')}</span>
                {!closed && items.length > 0 && (
                  <button onClick={() => setLinking(true)} className="text-[#c11e3d] inline-flex items-center gap-0.5 cursor-pointer hover:underline">
                    <Link2 className="w-3 h-3" /> {t('linkItem')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Conversation with the coach */}
      <button
        onClick={() => setTalking(true)}
        title={lastComment ? `${lastComment.authorName}: ${lastComment.text}` : undefined}
        className={`self-start md:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black cursor-pointer border-2 ${
          r.comments?.length ? 'border-[#191919] bg-[#191919] text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400'
        }`}
      >
        <MessageCircle className="w-3.5 h-3.5" /> {r.comments?.length || 0}
      </button>
      {talking && (
        <RequestDetail request={r} item={item} color={stockCategories.find((c) => c.id === item?.categoryId)?.color} onClose={() => setTalking(false)} />
      )}
      {refusing && <RefuseDialog r={r} onClose={() => setRefusing(false)} onRefuse={(reason) => onChange(r.id, 'refused', undefined, reason)} />}
      {/* Any status, including going back */}
      <div className="flex flex-wrap p-1 rounded-2xl bg-slate-100 self-start md:self-auto">
        {(['pending', 'approved', 'delivered', 'refused'] as const).map((s) => {
          const on = r.status === s;
          return (
            <button
              key={s}
              onClick={() => !on && (s === 'refused' ? setRefusing(true) : onChange(r.id, s))}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer transition-all ${on ? 'shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              style={on ? { background: REQ_STYLE[s].bg, color: REQ_STYLE[s].ink } : undefined}
            >
              {on && <Check className="w-3.5 h-3.5" />}
              {t(`req_${s}`)}
            </button>
          );
        })}
      </div>
    </li>
  );
};

/** Places: list, add, rename, archive; open one to filter the inventory */
const PlacesPanel: React.FC<{ byPlace: Map<string, number>; onOpen: (id: string) => void; run: (fn: () => Promise<unknown>, ok: string) => Promise<unknown> }> = ({ byPlace, onOpen, run }) => {
  const { stockLocations } = useApp();
  const t = useT(stockMessages);
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const places = stockLocations.filter((l) => !l.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="duo-card hover:transform-none! bg-white p-4 sm:p-5 space-y-4">
      <div>
        <h4 className="text-base font-black text-slate-900">{t('placesTitle')}</h4>
        <p className="text-xs font-medium text-slate-500">{t('placesSub')}</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim() && (await run(() => api('/admin/stock/locations', { method: 'POST', body: { name: name.trim() } }), t('saved')))) setName('');
        }}
        className="flex gap-2"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t('placePh')} className={inputCls} />
        <button type="submit" disabled={!name.trim()} className="px-4 btn-duo-blue text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0">
          <Plus className="w-4 h-4" /> {t('addPlace')}
        </button>
      </form>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {places.map((l) => (
          <PlaceRow key={`${l.id}:${l.name}`} id={l.id} name={l.name} count={byPlace.get(l.id) || 0} onOpen={() => onOpen(l.id)}
            onRename={(n) => run(() => api(`/admin/stock/locations/${l.id}`, { method: 'PUT', body: { name: n } }), t('saved'))}
            onArchive={async () => {
              const ok = await confirm({ title: t('confirmArchivePlace', { name: l.name }), message: t('confirmArchivePlaceText'), confirmLabel: t('archive'), danger: true });
              if (ok) run(() => api(`/admin/stock/locations/${l.id}`, { method: 'DELETE' }), t('archived'));
            }}
          />
        ))}
      </ul>
    </div>
  );
};

const PlaceRow: React.FC<{ id: string; name: string; count: number; onOpen: () => void; onRename: (n: string) => void; onArchive: () => void }> = ({ name, count, onOpen, onRename, onArchive }) => {
  const t = useT(stockMessages);
  const [value, setValue] = useState(name);
  return (
    <li className="flex items-center gap-2 p-2.5 rounded-2xl border-2 border-slate-100 hover:border-slate-200">
      <span className="w-9 h-9 rounded-xl bg-[#fbe3e7] text-[#c11e3d] grid place-items-center shrink-0">
        <MapPin className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <input
          value={value}
          maxLength={80}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value.trim() && value.trim() !== name && onRename(value.trim())}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-full px-1.5 py-0.5 bg-transparent border-2 border-transparent hover:border-slate-200 focus:border-[#c11e3d] rounded-lg text-sm font-black focus:outline-none"
        />
        <button onClick={onOpen} className="px-1.5 text-[11px] font-bold text-slate-500 hover:text-[#c11e3d] cursor-pointer">
          {t('placeItems', { count })} · {t('showItems')} →
        </button>
      </div>
      <button onClick={onArchive} title={t('archive')} aria-label={t('archive')} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-[#fbe3e7] hover:text-[#c11e3d] cursor-pointer">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
};

/** Searchable place picker that can create the place on the spot */
const PlacePicker: React.FC<{ value?: string; onChange: (id?: string) => void; run: (fn: () => Promise<unknown>, ok: string) => Promise<unknown> }> = ({ value, onChange, run }) => {
  const { stockLocations } = useApp();
  const t = useT(stockMessages);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const current = stockLocations.find((l) => l.id === value);
  const options = stockLocations.filter((l) => !l.deletedAt && l.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const exact = stockLocations.some((l) => !l.deletedAt && l.name.trim().toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[#c11e3d] pointer-events-none" />
        <input
          value={open ? q : current?.name || ''}
          onFocus={() => {
            setQ('');
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('placeSearch')}
          className={`${inputCls} ps-9`}
        />
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-white border-2 border-slate-200 shadow-xl p-1">
          <li>
            <button type="button" onMouseDown={() => onChange(undefined)} className="w-full text-start px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-50 cursor-pointer">
              {t('noPlaceOption')}
            </button>
          </li>
          {options.map((l) => (
            <li key={l.id}>
              <button type="button" onMouseDown={() => onChange(l.id)} className={`w-full text-start px-3 py-2 rounded-lg text-sm font-bold cursor-pointer ${l.id === value ? 'bg-[#fdf2f4] text-[#c11e3d]' : 'text-slate-700 hover:bg-slate-50'}`}>
                {l.name}
              </button>
            </li>
          ))}
          {q.trim() && !exact && (
            <li>
              <button
                type="button"
                onMouseDown={async () => {
                  const created = (await run(() => api<{ id: string }>('/admin/stock/locations', { method: 'POST', body: { name: q.trim() } }), t('saved'))) as { id: string } | null;
                  if (created?.id) onChange(created.id);
                }}
                className="w-full text-start px-3 py-2 rounded-lg text-sm font-black text-[#15803d] hover:bg-[#dcf5e4] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('createPlace', { name: q.trim() })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

const ItemModal: React.FC<{
  draft: Partial<StockItem>;
  onClose: () => void;
  onDelete?: () => void;
  run: (fn: () => Promise<unknown>, ok: string) => Promise<unknown>;
}> = ({ draft: initial, onClose, onDelete, run }) => {
  const { stockCategories, showToast } = useApp();
  const t = useT(stockMessages);
  // Old items had one status for all their pieces: open them with that as the per-piece split
  const [d, setD] = useState<Partial<StockItem>>(() => {
    const { status: _legacy, ...rest } = initial;
    const b = unitBreakdown({ quantity: initial.quantity || 0, units: initial.units, status: initial.status });
    return { ...rest, units: Object.fromEntries(UNAVAILABLE_STATES.map((st) => [st, b[st]])) };
  });
  const [newCat, setNewCat] = useState<{ name: string; color: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const set = (patch: Partial<StockItem>) => setD((x) => ({ ...x, ...patch }));
  const cats = stockCategories.filter((c) => !c.deletedAt || c.id === d.categoryId);
  const total = d.quantity ?? 0;
  const taken = UNAVAILABLE_STATES.reduce((sum, st) => sum + (d.units?.[st] || 0), 0);
  const setUnits = (st: (typeof UNAVAILABLE_STATES)[number], n: number) => set({ units: { ...d.units, [st]: Math.max(0, Math.floor(n)) } });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name?.trim() || taken > total) return;
    setSaving(true);
    const body = { ...d, name: d.name.trim() };
    const ok = await run(() => (d.id ? api(`/admin/stock/items/${d.id}`, { method: 'PUT', body }) : api('/admin/stock/items', { method: 'POST', body })), t('saved'));
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="duo-card hover:transform-none! bg-white w-full max-w-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg font-black text-slate-900">{d.id ? t('editItem') : t('newItem')}</h4>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="p-1.5 btn-duo-secondary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
          {/* Photo */}
          <div className="space-y-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-[#c11e3d] grid place-items-center bg-slate-50 cursor-pointer">
              {d.imageUrl ? (
                <img src={d.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-slate-400 text-xs font-black">
                  <ImagePlus className="w-7 h-7" /> {t('addPhoto')}
                </span>
              )}
            </button>
            {d.imageUrl && (
              <div className="flex gap-1.5">
                <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 py-1.5 btn-duo-secondary text-[11px] font-black cursor-pointer">
                  {t('changePhoto')}
                </button>
                <button type="button" onClick={() => set({ imageUrl: undefined })} className="flex-1 py-1.5 btn-duo-secondary text-[11px] font-black text-[#c11e3d] cursor-pointer">
                  {t('removePhoto')}
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  set({ imageUrl: await resizePhoto(file, 480) });
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'Image error', 'error');
                }
              }}
            />
          </div>

          <div className="space-y-3 text-xs font-bold text-slate-700">
            <label className="block space-y-1">
              <span>{t('name')}</span>
              <input required autoFocus maxLength={120} value={d.name || ''} onChange={(e) => set({ name: e.target.value })} placeholder={t('namePh')} className={inputCls} />
            </label>
            <label className="block space-y-1">
              <span>{t('reference')}</span>
              <input maxLength={80} value={d.reference || ''} onChange={(e) => set({ reference: e.target.value })} className={`${inputCls} font-mono`} />
            </label>
            <div className="space-y-1">
              <span>{t('category')}</span>
              <div className="flex flex-wrap gap-1.5">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set({ categoryId: d.categoryId === c.id ? undefined : c.id })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 text-[11px] font-black cursor-pointer ${d.categoryId === c.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </button>
                ))}
                {newCat ? (
                  <span className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-slate-50 border-2 border-slate-200">
                    <input autoFocus value={newCat.name} maxLength={80} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder={t('catName')} className="w-36 px-2 py-1 bg-white border-2 border-slate-200 rounded-lg text-[11px] font-bold focus:outline-none focus:border-[#c11e3d]" />
                    {SWATCHES.slice(0, 8).map((c) => (
                      <button key={c} type="button" onClick={() => setNewCat({ ...newCat, color: c })} aria-label={c} className={`w-4 h-4 rounded-full cursor-pointer ${newCat.color === c ? 'ring-2 ring-offset-1 ring-slate-900' : ''}`} style={{ background: c }} />
                    ))}
                    <button
                      type="button"
                      disabled={!newCat.name.trim()}
                      onClick={async () => {
                        const created = (await run(() => api<{ id: string }>('/admin/stock/categories', { method: 'POST', body: { name: newCat.name.trim(), color: newCat.color } }), t('saved'))) as { id: string } | null;
                        if (created?.id) {
                          set({ categoryId: created.id });
                          setNewCat(null);
                        }
                      }}
                      className="px-2 py-1 btn-duo-blue text-[11px] font-black cursor-pointer disabled:opacity-40"
                    >
                      {t('add')}
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setNewCat({ name: '', color: SWATCHES[cats.length % SWATCHES.length] })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 border-dashed border-slate-300 text-[11px] font-black text-slate-500 hover:border-[#c11e3d] hover:text-[#c11e3d] cursor-pointer">
                    <Plus className="w-3 h-3" /> {t('newCategory')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700">
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <label className="block space-y-1">
              <span>{t('quantity')}</span>
              <input type="number" min={0} required value={d.quantity ?? 0} onChange={(e) => set({ quantity: Math.max(0, Number(e.target.value)) })} className={`${inputCls} font-mono font-black`} />
            </label>
            <label className="block space-y-1">
              <span>{t('unit')}</span>
              <input maxLength={20} value={d.unit || ''} onChange={(e) => set({ unit: e.target.value })} placeholder={t('unitPh')} className={inputCls} />
            </label>
            <label className="block space-y-1">
              <span>{t('minQuantity')}</span>
              <input type="number" min={0} value={d.minQuantity ?? ''} onChange={(e) => set({ minQuantity: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })} placeholder={t('minPh')} className={`${inputCls} font-mono`} />
            </label>
          </div>
          {/* How many of the pieces are in each state */}
          <div className="sm:col-span-2 rounded-2xl border-2 border-slate-200 p-3 space-y-2.5">
            <div>
              <div className="text-xs font-black text-slate-800">{t('unitsTitle')}</div>
              <p className="text-[11px] font-medium text-slate-500">{t('unitsHint')}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: STATUS_STYLE.available.bg, color: STATUS_STYLE.available.ink }}>
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_STYLE.available.dot }} />
              <span className="flex-1 text-xs font-black">{t('st_available')}</span>
              <span className="font-mono font-black text-base">{Math.max(0, total - taken)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {UNAVAILABLE_STATES.map((st) => {
                const n = d.units?.[st] || 0;
                return (
                  <div key={st} className="flex items-center gap-2 ps-3 pe-1 py-1 rounded-xl bg-slate-50">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_STYLE[st].dot }} />
                    <span className="flex-1 text-xs font-bold text-slate-700 truncate">{t(`st_${st}`)}</span>
                    <button type="button" onClick={() => setUnits(st, n - 1)} disabled={n <= 0} aria-label={t('minusOne')} className="w-7 h-7 grid place-items-center rounded-lg bg-white hover:bg-slate-200 cursor-pointer disabled:opacity-30">
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={n}
                      onChange={(e) => setUnits(st, Number(e.target.value) || 0)}
                      className="w-12 py-1 bg-white border-2 border-slate-200 rounded-lg text-center font-mono font-black text-sm focus:outline-none focus:border-[#c11e3d]"
                    />
                    <button type="button" onClick={() => setUnits(st, n + 1)} disabled={taken >= total} aria-label={t('plusOne')} className="w-7 h-7 grid place-items-center rounded-lg bg-white hover:bg-slate-200 cursor-pointer disabled:opacity-30">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            {taken > total && <p className="text-[11px] font-bold text-[#c11e3d]">{t('unitsTooMany', { total })}</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <span>{t('place')}</span>
            <PlacePicker value={d.locationId} onChange={(locationId) => set({ locationId })} run={run} />
          </div>
          <label className="sm:col-span-2 flex items-start gap-3 p-3 rounded-2xl border-2 border-slate-200 cursor-pointer">
            <input type="checkbox" checked={!d.hiddenFromTrainers} onChange={(e) => set({ hiddenFromTrainers: !e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#c11e3d]" />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                {d.hiddenFromTrainers ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-[#15803d]" />}
                {t('visibleTrainers')}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 mt-0.5">{t('visibleTrainersSub')}</span>
            </span>
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span>{t('notes')}</span>
            <textarea rows={2} maxLength={2000} value={d.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder={t('notesPh')} className={inputCls} />
          </label>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t-2 border-slate-100">
          {onDelete && (
            <button type="button" onClick={onDelete} className="px-3 py-2 btn-duo-secondary text-xs font-bold text-[#c11e3d] flex items-center gap-1 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
            </button>
          )}
          <button type="button" onClick={onClose} className="ms-auto px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving || !d.name?.trim()} className="px-5 py-2 btn-duo-green text-sm font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <Pencil className="w-4 h-4" /> {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
};

/** One bar split by piece state (available, in use, in repair…) */
const UnitsBar: React.FC<{ it: StockItem }> = ({ it }) => {
  const t = useT(stockMessages);
  const b = unitBreakdown(it);
  if (!it.quantity) return null;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100" role="img" aria-label={STATUSES.filter((st) => b[st]).map((st) => `${b[st]} ${t(`st_${st}`)}`).join(', ')}>
      {STATUSES.filter((st) => b[st] > 0).map((st) => (
        <span key={st} style={{ width: `${(b[st] / it.quantity) * 100}%`, background: STATUS_STYLE[st].dot }} />
      ))}
    </div>
  );
};

/**
 * Quantity with −/+ buttons. Taps add up locally and are saved as one change once the admin stops tapping,
 * so receiving 10 pieces is one history line and one toast, not ten. Clicking the number opens the full move dialog.
 */
const QuantityStepper: React.FC<{
  it: StockItem;
  compact?: boolean;
  onCommit: (delta: number) => Promise<unknown>;
  onOpen: () => void;
}> = ({ it, compact, onCommit, onOpen }) => {
  const t = useT(stockMessages);
  const [pending, setPending] = useState(0);
  const pendingRef = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const flush = async () => {
    window.clearTimeout(timer.current);
    const delta = pendingRef.current;
    if (!delta) return;
    await onCommit(delta);
    pendingRef.current -= delta;
    setPending(pendingRef.current);
  };
  // Save what is still pending if the card goes away (filter, tab change)
  useEffect(() => () => void flush(), []);

  const tap = (step: number) => {
    if (availableOf(it) + pendingRef.current + step < 0) return;
    pendingRef.current += step;
    setPending(pendingRef.current);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 1200);
  };

  // −/+ add or remove available pieces; the ones in use, in repair… are shown as "/ total"
  const free = availableOf(it) + pending;
  const total = it.quantity + pending;
  const low = it.minQuantity !== undefined && free <= it.minQuantity;
  const btn = compact ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl';

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => tap(-1)} disabled={free <= 0} aria-label={t('minusOne')} title={t('minusOne')} className={`${btn} grid place-items-center bg-slate-100 hover:bg-slate-200 active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-default`}>
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => { void flush(); onOpen(); }}
        title={t('moveOpen')}
        className={`relative ${compact ? 'min-w-12 h-7' : 'min-w-16 h-9'} px-2 rounded-xl border-2 border-dashed border-transparent hover:border-slate-300 flex items-baseline justify-center gap-1 cursor-pointer`}
      >
        <span className={`${compact ? 'text-sm' : 'text-xl'} font-black font-mono leading-none self-center ${low ? 'text-[#c11e3d]' : 'text-slate-900'}`}>{free}</span>
        {total !== free && <span className="text-[11px] font-black font-mono text-slate-400 self-center">/{total}</span>}
        <span className="text-[10px] font-bold text-slate-400 self-center">{it.unit || ''}</span>
        {pending !== 0 && (
          <span className={`absolute -top-2 -end-2 px-1.5 rounded-full text-[10px] font-black font-mono text-white ${pending > 0 ? 'bg-[#15803d]' : 'bg-[#c11e3d]'}`}>
            {pending > 0 ? '+' : ''}
            {pending}
          </span>
        )}
      </button>
      <button type="button" onClick={() => tap(1)} aria-label={t('plusOne')} title={t('plusOne')} className={`${btn} grid place-items-center bg-slate-100 hover:bg-slate-200 active:scale-95 cursor-pointer`}>
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

type MoveMode = 'in' | 'out' | 'count';
const MOVE_REASONS = {
  in: ['reason_received', 'reason_returned', 'reason_donation'],
  out: ['reason_workshop', 'reason_broken', 'reason_lent'],
  count: []
} as const satisfies Record<MoveMode, readonly string[]>;
type MoveReason = (typeof MOVE_REASONS)[MoveMode][number];

/** Add, remove or count an item in one step, with a reason that goes to the history. */
const StockMoveDialog: React.FC<{
  it: StockItem;
  onClose: () => void;
  onSave: (delta: number, note: string) => Promise<unknown>;
}> = ({ it, onClose, onSave }) => {
  const t = useT(stockMessages);
  const [mode, setMode] = useState<MoveMode>('in');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<MoveReason | ''>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const n = amount === '' ? NaN : Math.floor(Number(amount));
  const valid = Number.isFinite(n) && (mode === 'count' ? n >= 0 : n > 0);
  // Only available pieces are added, removed or counted; the others stay as they are
  const free = availableOf(it);
  const afterFree = !valid ? free : mode === 'in' ? free + n : mode === 'out' ? Math.max(0, free - n) : n;
  const delta = afterFree - free;
  const tooMany = mode === 'out' && valid && n > free;
  const unit = it.unit || '';

  const pickMode = (m: MoveMode) => {
    setMode(m);
    setReason('');
    setAmount(m === 'count' ? String(availableOf(it)) : '');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || delta === 0) return;
    setSaving(true);
    const label = mode === 'count' ? t('reason_count') : reason ? t(reason) : '';
    const ok = await onSave(delta, [label, note.trim()].filter(Boolean).join(' · '));
    setSaving(false);
    if (ok) onClose();
  };

  const modes: { key: MoveMode; icon: React.ElementType; label: string }[] = [
    { key: 'in', icon: Plus, label: t('moveIn') },
    { key: 'out', icon: Minus, label: t('moveOut') },
    { key: 'count', icon: ClipboardList, label: t('moveCount') }
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4" onClick={onClose}>
        <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="duo-card hover:transform-none! bg-white w-full max-w-md p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-base font-black text-slate-900 truncate">{it.name}</h4>
              <p className="text-xs font-semibold text-slate-500">
                {t('moveInStock', { qty: `${free} ${unit}`.trim() })}
                {free !== it.quantity && ` · ${t('moveOthersKept', { n: it.quantity - free })}`}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label={t('cancel')} className="p-1.5 btn-duo-secondary cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div role="tablist" className="grid grid-cols-3 p-1 rounded-xl bg-slate-100">
            {modes.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => pickMode(key)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black cursor-pointer transition-colors ${mode === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700">{t(mode === 'count' ? 'moveCountLabel' : 'moveAmountLabel')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={mode === 'count' ? 0 : 1}
                step={1}
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} font-mono text-lg! text-center`}
              />
              {unit && <span className="text-sm font-bold text-slate-400">{unit}</span>}
            </div>
            {mode !== 'count' && (
              <div className="flex flex-wrap gap-1.5">
                {[1, 5, 10, 25].map((q) => (
                  <button key={q} type="button" onClick={() => setAmount(String((Number(amount) || 0) + q))} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-black font-mono text-slate-700 cursor-pointer">
                    +{q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {MOVE_REASONS[mode].length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-700">{t('moveReason')}</div>
              <div className="flex flex-wrap gap-1.5">
                {(MOVE_REASONS[mode] as readonly MoveReason[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(reason === r ? '' : r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer border-2 transition-colors ${reason === r ? 'border-[#c11e3d] bg-[#fdf2f4] text-[#c11e3d]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {t(r)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input type="text" maxLength={150} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('moveNotePh')} className={inputCls} />

          {/* Before → after */}
          <div className="flex items-center justify-center gap-3 py-3 rounded-2xl bg-slate-50 font-mono font-black">
            <span className="text-lg text-slate-400">{free}</span>
            <span className="text-slate-300">→</span>
            <span className={`text-2xl ${delta > 0 ? 'text-[#15803d]' : delta < 0 ? 'text-[#c11e3d]' : 'text-slate-900'}`}>{afterFree}</span>
            <span className="text-xs text-slate-400">{unit}</span>
            {delta !== 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${delta > 0 ? 'bg-[#dcf5e4] text-[#14532d]' : 'bg-[#fdf2f4] text-[#c11e3d]'}`}>
                {delta > 0 ? '+' : ''}
                {delta}
              </span>
            )}
          </div>
          {tooMany && <p className="text-xs font-semibold text-amber-700">{t('moveTooMany', { qty: free })}</p>}

          <button type="submit" disabled={!valid || delta === 0 || saving} className="w-full py-3 btn-duo-green text-sm font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {delta === 0 ? t('moveNoChange') : t(delta > 0 ? 'moveConfirmIn' : 'moveConfirmOut', { qty: `${Math.abs(delta)} ${unit}`.trim() })}
          </button>
        </form>
      </div>
    </ModalPortal>
  );
};

/** Refuse a request, with an optional reason that is posted in the conversation for the coach */
const RefuseDialog: React.FC<{ r: MaterialRequest; onClose: () => void; onRefuse: (reason: string) => Promise<boolean> }> = ({ r, onClose, onRefuse }) => {
  const t = useT(stockMessages);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onRefuse(reason.trim());
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4" onClick={onClose}>
        <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="duo-card hover:transform-none! bg-white w-full max-w-md p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-base font-black text-slate-900">{t('refuseTitle')}</h4>
              <p className="text-xs font-semibold text-slate-500 truncate">
                {r.itemsNeeded} · {t('qty', { qty: r.quantity })} · {r.trainerName}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label={t('cancel')} className="p-1.5 btn-duo-secondary cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <label className="block space-y-1.5">
            <span className="block text-xs font-black text-slate-700">{t('refuseReason')}</span>
            <textarea rows={3} maxLength={1000} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('refuseReasonPh')} className={inputCls} />
            <span className="block text-[11px] font-semibold text-slate-400">{t('refuseHint')}</span>
          </label>
          {!!r.stockDeducted && <p className="text-xs font-semibold text-amber-700">{t('refuseGivesBack', { qty: r.stockDeducted })}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2.5 btn-duo-secondary text-xs font-black cursor-pointer">
              {t('cancel')}
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-50">
              {t('refuseConfirm')}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
