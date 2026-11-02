import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Banknote,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory, ProductOrder } from '../../types';
import { addMonths, monthOf } from '../../utils/payments';
import { resizePhoto } from '../../utils/image';
import { CATEGORY_EMOJI, ONE_SIZE, PRODUCT_CATEGORIES, orderTime, stockKeys, totalStock } from '../../utils/shop';
import { useLanguage, useT } from '../../i18n';
import { useConfirm } from '../common/ConfirmProvider';
import { shopMessages } from '../../i18n/messages/shop';
import { ModalPortal } from '../common/ModalPortal';

// Labels are message keys, translated at render
const SIZE_PRESETS: { label: 'presetKidsAdult' | 'presetAdult' | 'presetOneSize'; sizes: string[] }[] = [
  { label: 'presetKidsAdult', sizes: ['6-8Y', '8-10Y', '10-12Y', '12-14Y', 'S', 'M', 'L'] },
  { label: 'presetAdult', sizes: ['S', 'M', 'L', 'XL'] },
  { label: 'presetOneSize', sizes: [] }
];

type Draft = Omit<Product, 'stock' | 'createdAt'> & { sizesText: string };

const emptyDraft = (): Draft => ({
  id: `prod-${Date.now()}`,
  name: '',
  category: 'tshirt',
  description: '',
  price: 30,
  imageUrl: '',
  sizes: [],
  sizesText: SIZE_PRESETS[0].sizes.join(', '),
  isActive: false
});

/** Order statuses in their usual order; each has an icon and a label, never colour alone */
const ORDER_FLOW: ProductOrder['status'][] = ['requested', 'ready', 'picked_up', 'cancelled'];
const ORDER_STATUS: Record<ProductOrder['status'], { bg: string; ink: string; icon: React.ElementType }> = {
  requested: { bg: '#fdf3d1', ink: '#6b5310', icon: Clock },
  ready: { bg: '#e7e7e7', ink: '#191919', icon: PackageCheck },
  picked_up: { bg: '#dcf5e4', ink: '#14532d', icon: CheckCircle2 },
  cancelled: { bg: '#fbe3e7', ink: '#861529', icon: Ban }
};

/** A metric tile on the dark header */
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
    <Tag onClick={onClick} className={`text-start p-3 rounded-2xl bg-white/10 ${onClick ? 'hover:bg-white/15 cursor-pointer' : ''} transition-colors`}>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/60">
        <span className="truncate">{label}</span>
        <span className={alert ? 'text-[#ff8fa3]' : ''}>{icon}</span>
      </div>
      <div className="text-2xl font-black font-mono mt-1">
        {value} {unit && <span className="text-xs text-white/50">{unit}</span>}
        {alert && <span className="inline-block w-2 h-2 ms-2 rounded-full bg-[#ff6b86] animate-pulse align-middle" />}
      </div>
      <div className="text-[11px] font-semibold text-white/60 leading-snug">{children}</div>
    </Tag>
  );
};

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white';

/** Admin tab: create club products, put them on sale, manage stock per size and the pickup queue. */
export const ShopManager: React.FC = () => {
  const { products, orders, saveProduct, setProductActive, deleteProduct, addProductStock, updateOrderStatus, showToast } =
    useApp();
  const t = useT(shopMessages);
  const confirm = useConfirm();
  const { locale } = useLanguage();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const productName = (id?: string, fallback?: string) =>
    products.find((p) => p.id === id)?.name || fallback || t('defaultProductName');

  const openEdit = (p: Product) => setDraft({ ...p, sizesText: p.sizes.join(', ') });

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draft) return;
    try {
      const imageUrl = await resizePhoto(file, 600);
      setDraft((d) => (d ? { ...d, imageUrl } : d));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('imageReadError'), 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const { sizesText, ...product } = draft;
    const sizes = [...new Set(sizesText.split(',').map((s) => s.trim()).filter(Boolean))];
    if (sizes.some((s) => s === ONE_SIZE)) {
      showToast(t('oneSizeReserved', { value: ONE_SIZE }), 'error');
      return;
    }
    setIsSaving(true);
    await saveProduct({ ...product, sizes });
    setIsSaving(false);
    setDraft(null);
  };

  // ---------- metrics ----------
  const month = monthOf(new Date());
  const prevMonth = addMonths(month, -1);
  const saleMonth = (o: ProductOrder) => (o.pickedUpAt || o.requestedAt || '').slice(0, 7);
  const picked = orders.filter((o) => o.status === 'picked_up');
  const salesOf = (m: string) => picked.filter((o) => saleMonth(o) === m);
  const salesNow = salesOf(month).reduce((sum, o) => sum + o.price, 0);
  const salesPrev = salesOf(prevMonth).reduce((sum, o) => sum + o.price, 0);
  const salesAll = picked.reduce((sum, o) => sum + o.price, 0);
  const waiting = orders.filter((o) => o.status === 'requested');
  const ready = orders.filter((o) => o.status === 'ready');
  const pendingValue = [...waiting, ...ready].reduce((sum, o) => sum + o.price, 0);
  const stockUnits = products.reduce((sum, p) => sum + totalStock(p), 0);
  const stockValue = products.reduce((sum, p) => sum + totalStock(p) * p.price, 0);

  // Sizes of products on sale with 1 or 0 left; sizes people are waiting for come first
  const lowStock = products
    .filter((p) => p.isActive)
    .flatMap((p) => stockKeys(p).map((k) => ({ p, k, count: p.stock?.[k] ?? 0, wanted: waiting.filter((o) => o.productId === p.id && o.size === k).length })))
    .filter((x) => x.count <= 1)
    .sort((a, b) => b.wanted - a.wanted || a.count - b.count);

  const unitsByProduct = new Map<string, number>();
  orders.filter((o) => o.status !== 'cancelled').forEach((o) => {
    // Older orders have no product id: they are counted by name (or as the default product)
    const k = o.productId || `name:${o.productName || ''}`;
    unitsByProduct.set(k, (unitsByProduct.get(k) || 0) + 1);
  });
  const best = [...unitsByProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const bestMax = best[0]?.[1] || 1;

  // ---------- orders ----------
  const [orderFilter, setOrderFilter] = useState<'all' | ProductOrder['status']>('requested');
  const [orderSearch, setOrderSearch] = useState('');
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const statusCount = (st: ProductOrder['status']) => orders.filter((o) => o.status === st).length;
  const shownOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return [...orders]
      .filter((o) => orderFilter === 'all' || o.status === orderFilter)
      .filter(
        (o) =>
          !q ||
          o.studentName.toLowerCase().includes(q) ||
          o.parentName.toLowerCase().includes(q) ||
          productName(o.productId, o.productName).toLowerCase().includes(q)
      )
      .sort((a, b) => orderTime(b).localeCompare(orderTime(a)));
  }, [orders, orderFilter, orderSearch, products]);

  const changeStatus = async (o: ProductOrder, status: ProductOrder['status']) => {
    if (o.status === status) return;
    // Going back from ready / picked up returns the unit to the stock: ask first
    const releases = (o.status === 'ready' || o.status === 'picked_up') && (status === 'requested' || status === 'cancelled');
    if (releases) {
      const ok = await confirm({
        title: t('confirmBackTitle', { status: t(`status_${status}`) }),
        message: t('confirmBackText'),
        confirmLabel: t('confirmBackOk')
      });
      if (!ok) return;
    }
    setBusyOrder(o.id);
    await updateOrderStatus(o.id, status);
    setBusyOrder(null);
  };

  const fmt = (n: number) => Math.round(n).toLocaleString(locale);
  const delta = salesNow - salesPrev;

  return (
    <div className="space-y-6">
      {/* Hero + metrics */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-7">
        <div className="absolute -top-20 -end-16 w-72 h-72 rounded-full bg-[#c11e3d]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 start-1/4 w-72 h-72 rounded-full bg-[#c9a227]/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-black uppercase tracking-wide">
              <ShoppingBag className="w-3.5 h-3.5" />
              {t('heroBadge')}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black mt-2">{t('title')}</h3>
            <p className="text-xs font-medium text-white/60">{t('heroSub')}</p>
          </div>
          <button onClick={() => setDraft(emptyDraft())} className="px-4 py-2.5 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer self-start">
            <Plus className="w-4 h-4" />
            <span>{t('newProduct')}</span>
          </button>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-5 gap-2 mt-5">
          <HeroStat icon={<Banknote className="w-4 h-4" />} label={t('kpiSales')} value={`${fmt(salesNow)}`} unit={t('currency')}>
            {salesPrev || salesNow ? (
              <span className={`inline-flex items-center gap-1 ${delta >= 0 ? 'text-[#7ee2a1]' : 'text-[#ff8fa3]'}`}>
                {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {t('kpiVsPrev', { sign: delta >= 0 ? '+' : '−', amount: fmt(Math.abs(delta)) })}
              </span>
            ) : (
              t('kpiSalesSub', { count: salesOf(month).length })
            )}
          </HeroStat>
          <HeroStat
            icon={<ClipboardList className="w-4 h-4" />}
            label={t('kpiToHandle')}
            value={`${waiting.length + ready.length}`}
            alert={waiting.length > 0}
            onClick={() => setOrderFilter(waiting.length ? 'requested' : 'ready')}
          >
            {t('kpiToHandleSub', { waiting: waiting.length, ready: ready.length })}
          </HeroStat>
          <HeroStat icon={<Boxes className="w-4 h-4" />} label={t('kpiStock')} value={`${stockUnits}`}>
            {t('kpiStockSub', { amount: fmt(stockValue) })}
          </HeroStat>
          <HeroStat icon={<AlertTriangle className="w-4 h-4" />} label={t('kpiLow')} value={`${lowStock.length}`} alert={lowStock.length > 0}>
            {lowStock.length ? t('kpiLowSub') : t('kpiLowNone')}
          </HeroStat>
          <HeroStat icon={<Wallet className="w-4 h-4" />} label={t('kpiAllTime')} value={`${fmt(salesAll)}`} unit={t('currency')}>
            {pendingValue > 0 ? t('kpiPendingValue', { amount: fmt(pendingValue) }) : t('kpiAllTimeSub', { count: picked.length })}
          </HeroStat>
        </div>
      </section>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="duo-card hover:transform-none! p-5 bg-white">
          <h4 className="text-sm font-black text-slate-800">{t('bestTitle')}</h4>
          <p className="text-[11px] font-semibold text-slate-500 mb-3">{t('bestSub')}</p>
          {best.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">{t('bestEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {best.map(([id, units]) => {
                const p = products.find((x) => x.id === id);
                return (
                  <li key={id} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 grid place-items-center text-base shrink-0 overflow-hidden">
                      {p?.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : p ? CATEGORY_EMOJI[p.category] : '🛍️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="truncate">{p ? p.name : productName(undefined, id.slice(5) || undefined)}</span>
                        <span className="font-mono font-black text-slate-900 ms-2">{units}</span>
                      </div>
                      <div className="h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#191919] transition-all duration-700" style={{ width: `${(units / bestMax) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="duo-card hover:transform-none! p-5 bg-white">
          <h4 className="text-sm font-black text-slate-800 mb-3">{t('lowTitle')}</h4>
          {lowStock.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium">{t('lowEmpty')}</p>
          ) : (
            <ul className="space-y-1.5 scroll-panel max-h-56">
              {lowStock.map(({ p, k, count, wanted }) => (
                <li key={`${p.id}-${k}`} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50">
                  <span className="text-xs font-black text-slate-800 truncate flex-1">
                    {p.name} {k !== ONE_SIZE && <span className="font-mono text-slate-400">· {k}</span>}
                  </span>
                  {wanted > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                      {wanted} {t('status_requested').toLowerCase()}
                    </span>
                  )}
                  <span className={`text-[11px] font-black ${count === 0 ? 'text-[#c11e3d]' : 'text-amber-600'}`}>{t('left', { count })}</span>
                  <button onClick={() => addProductStock(p.id, k, 1)} className="px-2 py-0.5 btn-duo-secondary text-[11px] font-black cursor-pointer">
                    {t('restock')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Orders */}
      <div className="duo-card hover:transform-none! p-4 sm:p-6 bg-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h4 className="text-base font-black text-slate-800">{t('ordersTitle')}</h4>
          <div className="relative md:w-72">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full ps-9 pe-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#c11e3d]"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['requested', 'ready', 'picked_up', 'cancelled', 'all'] as const).map((f) => {
            const st = f === 'all' ? null : ORDER_STATUS[f];
            const Icon = st?.icon;
            return (
              <button
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border-2 cursor-pointer transition-all ${
                  orderFilter === f ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c11e3d]'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {f === 'all' ? t('filterAll') : t(`status_${f}`)}
                <span className={`px-1.5 rounded-full text-[10px] ${orderFilter === f ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {f === 'all' ? orders.length : statusCount(f)}
                </span>
              </button>
            );
          })}
        </div>

        {shownOrders.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 font-medium rounded-2xl border-2 border-dashed border-slate-200">{t('noOrders')}</div>
        ) : (
          <ul className="divide-y divide-slate-100 scroll-panel max-h-[620px]">
            {shownOrders.map((o) => {
              const p = products.find((x) => x.id === o.productId);
              return (
                <li key={o.id} className={`flex flex-col md:flex-row md:items-center gap-3 py-3 px-1 ${o.status === 'cancelled' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-11 h-11 rounded-2xl bg-slate-100 grid place-items-center text-xl shrink-0 overflow-hidden">
                      {p?.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : p ? CATEGORY_EMOJI[p.category] : '🛍️'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-800 truncate">
                        {productName(o.productId, o.productName)}
                        {o.size !== ONE_SIZE && <span className="ms-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] text-slate-600">{o.size}</span>}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 truncate">{t('orderedBy', { student: o.studentName, parent: o.parentName })}</div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : new Date(o.requestedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                        {' · '}
                        <span className="font-mono font-black text-slate-600">
                          {o.price} {t('currency')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Any status can be chosen, including going back */}
                  <div className="flex p-1 rounded-2xl bg-slate-100 self-start md:self-auto" role="radiogroup" aria-label={t('setStatus')}>
                    {ORDER_FLOW.map((s) => {
                      const meta = ORDER_STATUS[s];
                      const Icon = meta.icon;
                      const active = o.status === s;
                      return (
                        <button
                          key={s}
                          role="radio"
                          aria-checked={active}
                          disabled={busyOrder === o.id}
                          onClick={() => changeStatus(o, s)}
                          title={t(`status_${s}`)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black cursor-pointer transition-all disabled:opacity-50 ${
                            active ? 'shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          style={active ? { background: meta.bg, color: meta.ink } : undefined}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className={active ? '' : 'hidden sm:inline'}>{t(`status_${s}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Products */}
      <h4 className="text-base font-black text-slate-800">{t('productsTitle')}</h4>
      {products.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs font-medium rounded-2xl border-2 border-dashed border-slate-200">
          {t('noProducts')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className={`duo-card bg-white overflow-hidden ${p.isActive ? '' : 'opacity-80'}`}>
              <div className="relative h-36 bg-slate-100 flex items-center justify-center text-5xl">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" /> : <span>{CATEGORY_EMOJI[p.category]}</span>}
                <span
                  className={`absolute top-2 start-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    p.isActive ? 'bg-[#15803d] text-white' : 'bg-slate-700 text-white'
                  }`}
                >
                  {p.isActive ? t('onSale') : t('hidden')}
                </span>
                {(unitsByProduct.get(p.id) || 0) > 0 && (
                  <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-black text-slate-700">
                    {t('soldCount', { count: unitsByProduct.get(p.id)! })}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-slate-800 text-sm">{p.name}</div>
                    <div className="text-slate-500 font-semibold">
                      {t(`cat_${p.category}`)} · {p.price} {t('currency')} · {t('inStockCount', { count: totalStock(p) })}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(p)} title={t('edit')} className="p-1.5 btn-duo-secondary cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        confirm({ title: t('confirmDelete', { name: p.name }), danger: true, confirmLabel: t('deleteLabel') }).then((ok) => {
                          if (ok) deleteProduct(p.id);
                        });
                      }}
                      title={t('delete')}
                      className="p-1.5 btn-duo-secondary text-[#c11e3d] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stock per size */}
                <div className="grid grid-cols-2 gap-1.5">
                  {stockKeys(p).map((k) => {
                    const count = p.stock?.[k] ?? 0;
                    return (
                      <div
                        key={k}
                        className={`flex items-center justify-between gap-1 px-2 py-1 rounded-lg border ${
                          count === 0 ? 'bg-[#fdf2f4] border-[#f6c4cd]' : count < 2 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span className="font-bold text-slate-600">{k === ONE_SIZE ? t('stock') : k}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => addProductStock(p.id, k, -1)} disabled={count === 0} className="p-0.5 rounded hover:bg-slate-200 cursor-pointer disabled:opacity-30">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`font-mono font-black w-6 text-center ${count < 2 ? 'text-[#c11e3d]' : 'text-slate-800'}`}>{count}</span>
                          <button onClick={() => addProductStock(p.id, k, 1)} className="p-0.5 rounded hover:bg-slate-200 cursor-pointer">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setProductActive(p.id, !p.isActive)}
                  className={`w-full py-2 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${p.isActive ? 'btn-duo-secondary' : 'btn-duo-green'}`}
                >
                  {p.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{p.isActive ? t('stopSelling') : t('putOnSale')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit product modal */}
      {draft && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handleSave} className="duo-card hover:transform-none! p-6 bg-white max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-black text-slate-800">
                {products.some((p) => p.id === draft.id) ? t('editProduct') : t('newProduct')}
              </h3>
              <div className="space-y-3 text-xs font-bold text-slate-700">
                <div>
                  <label className="block mb-1">{t('fieldName')}</label>
                  <input
                    required
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder={t('namePlaceholder')}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">{t('fieldType')}</label>
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value as ProductCategory })}
                      className={`${inputCls} cursor-pointer`}
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_EMOJI[c]} {t(`cat_${c}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">{t('fieldPrice')}</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={draft.price}
                      onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1">{t('fieldDescription')}</label>
                  <textarea
                    rows={2}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block mb-1">{t('fieldSizes')}</label>
                  <input
                    value={draft.sizesText}
                    onChange={(e) => setDraft({ ...draft, sizesText: e.target.value })}
                    placeholder="S, M, L"
                    className={`${inputCls} font-mono`}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {SIZE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDraft({ ...draft, sizesText: preset.sizes.join(', ') })}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[10px] font-black cursor-pointer"
                      >
                        {t(preset.label)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block mb-1">{t('fieldPhoto')}</label>
                  <div className="flex items-center gap-3">
                    {draft.imageUrl && <img src={draft.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover border" />}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="px-3 py-2 btn-duo-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{draft.imageUrl ? t('change') : t('upload')}</span>
                    </button>
                    {draft.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, imageUrl: '' })}
                        className="text-rose-600 text-xs font-bold cursor-pointer"
                      >
                        {t('remove')}
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span>{t('onSaleCheckbox')}</span>
                </label>
                <p className="text-[11px] font-medium text-slate-500">{t('stockHint')}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDraft(null)} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60">
                  {t('saveProduct')}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
