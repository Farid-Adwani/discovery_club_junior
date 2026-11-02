import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, MessageCircle, Package, PackageCheck, Search, Send, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MaterialRequest, StockItem } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { trainerMessages } from '../../i18n/messages/trainer';
import { stockMessages } from '../../i18n/messages/stock';
import { fromISODate } from '../../utils/schedule';

const STEPS: MaterialRequest['status'][] = ['pending', 'approved', 'delivered'];
const STATUS_STYLE: Record<MaterialRequest['status'], { bg: string; ink: string }> = {
  pending: { bg: '#fdf3d1', ink: '#6b5310' },
  approved: { bg: '#e0ecff', ink: '#1e3a8a' },
  delivered: { bg: '#dcf5e4', ink: '#14532d' },
  refused: { bg: '#fbe3e7', ink: '#861529' }
};
const isOpen = (r: MaterialRequest) => r.status === 'pending' || r.status === 'approved';
const URGENCY_STYLE: Record<MaterialRequest['urgency'], string> = {
  low: 'bg-slate-100 text-slate-500',
  medium: 'bg-amber-100 text-amber-800',
  urgent: 'bg-[#fbe3e7] text-[#861529]'
};

const ItemPhoto: React.FC<{ item?: Partial<StockItem>; color?: string; className: string }> = ({ item, color, className }) =>
  item?.imageUrl ? (
    <img src={item.imageUrl} alt="" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center`} style={{ background: `${color || '#94a3b8'}22`, color: color || '#94a3b8' }}>
      <Package className="w-1/3 h-1/3" />
    </span>
  );

/** Sent → approved → delivered (or sent → refused) */
const Progress: React.FC<{ status: MaterialRequest['status']; big?: boolean }> = ({ status, big }) => {
  const t = useT(trainerMessages);
  if (status === 'refused') {
    return (
      <div className="flex items-center gap-1" aria-label={t('req_refused')}>
        <span className={`flex items-center gap-1 ${big ? 'text-[11px]' : 'text-[9px]'} font-black whitespace-nowrap text-slate-500`}>
          <span className={`${big ? 'w-5 h-5' : 'w-3.5 h-3.5'} rounded-full grid place-items-center bg-slate-300 text-white`}>
            <Check className={big ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
          </span>
          {big && t('step_pending')}
        </span>
        <span className="h-[3px] flex-1 rounded-full bg-[#c11e3d]" />
        <span className={`flex items-center gap-1 ${big ? 'text-[11px]' : 'text-[9px]'} font-black whitespace-nowrap text-[#c11e3d]`}>
          <span className={`${big ? 'w-5 h-5' : 'w-3.5 h-3.5'} rounded-full grid place-items-center bg-[#c11e3d] text-white`}>
            <X className={big ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
          </span>
          {big && t('step_refused')}
        </span>
      </div>
    );
  }
  const reached = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1" aria-label={t(`req_${status}`)}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className={`h-[3px] flex-1 rounded-full ${i <= reached ? 'bg-[#15803d]' : 'bg-slate-200'}`} />}
          <span className={`flex items-center gap-1 ${big ? 'text-[11px]' : 'text-[9px]'} font-black whitespace-nowrap ${i <= reached ? 'text-[#15803d]' : 'text-slate-400'}`}>
            <span className={`${big ? 'w-5 h-5' : 'w-3.5 h-3.5'} rounded-full grid place-items-center ${i <= reached ? 'bg-[#15803d] text-white' : 'bg-slate-200 text-slate-400'}`}>
              {i <= reached && <Check className={big ? 'w-3 h-3' : 'w-2.5 h-2.5'} />}
            </span>
            {big && t(`step_${s}`)}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

/** The coach's requests: cards with the component, progress and messages; a detail window with the conversation. */
export const MyRequests: React.FC<{ trainerId: string }> = ({ trainerId }) => {
  const { materialRequests, stockItems, stockCategories } = useApp();
  const t = useT(trainerMessages);
  const ts = useT(stockMessages);
  const { locale } = useLanguage();
  const [filter, setFilter] = useState<'open' | 'delivered' | 'all'>('open');
  const [openId, setOpenId] = useState<string | null>(null);

  // Only this coach's requests (an admin browsing the coach space receives everyone's)
  const mine = materialRequests.filter((r) => r.trainerId === trainerId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  // "Closed" holds the delivered and the refused ones
  const shown = mine.filter((r) => filter === 'all' || (filter === 'open') === isOpen(r));
  const itemOf = (r: MaterialRequest) => stockItems.find((i) => i.id === r.stockItemId);
  const colorOf = (it?: StockItem) => stockCategories.find((c) => c.id === it?.categoryId)?.color;
  const date = (iso: string) => fromISODate(iso.slice(0, 10)).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const open = mine.find((r) => r.id === openId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-black text-slate-800">{t('myRequests')}</h4>
        <div className="inline-flex p-0.5 rounded-lg bg-slate-100">
          {(['open', 'delivered', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer ${filter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              {t(f === 'open' ? 'tabOpen' : f === 'delivered' ? 'tabDelivered' : 'tabAll')}
              <span className="ms-1 opacity-60">{f === 'all' ? mine.length : mine.filter((r) => (f === 'open') === isOpen(r)).length}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-[11px] font-semibold text-slate-400 rounded-2xl border-2 border-dashed border-slate-200">{t('noRequests')}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((r) => {
            const it = itemOf(r);
            const s = STATUS_STYLE[r.status];
            return (
              <li key={r.id}>
                <button
                  onClick={() => setOpenId(r.id)}
                  className="w-full text-start p-2.5 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <ItemPhoto item={it} color={colorOf(it)} className="w-12 h-12 rounded-xl shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-slate-900 leading-snug line-clamp-2">{r.itemsNeeded}</span>
                        <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase" style={{ background: s.bg, color: s.ink }}>
                          {t(`req_${r.status}`)}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 mt-0.5 flex flex-wrap gap-x-1.5">
                        <span className="font-black text-slate-700">× {r.quantity}</span>
                        <span>· {r.groupName}</span>
                        {r.sessionDate && <span>· {date(r.sessionDate)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1">
                      <Progress status={r.status} />
                    </div>
                    {!!r.comments?.length && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-slate-500">
                        <MessageCircle className="w-3 h-3" /> {r.comments.length}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${URGENCY_STYLE[r.urgency]}`}>{ts(`urgency_${r.urgency}`)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && <RequestDetail request={open} item={itemOf(open)} color={colorOf(itemOf(open))} onClose={() => setOpenId(null)} />}
    </div>
  );
};

/** One request: the component, where it stands, and the conversation with the office */
export const RequestDetail: React.FC<{ request: MaterialRequest; item?: StockItem; color?: string; onClose: () => void }> = ({ request: r, item, color, onClose }) => {
  const { addRequestComment, stockCategories, currentUser } = useApp();
  const t = useT(trainerMessages);
  const ts = useT(stockMessages);
  const { locale } = useLanguage();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const category = stockCategories.find((c) => c.id === item?.categoryId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [r.comments?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    if (await addRequestComment(r.id, text.trim())) setText('');
    setSending(false);
  };
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const isMe = (role: string, name: string) => (currentUser?.roles.includes('admin') ? role === 'admin' : role === 'trainer' && name === currentUser?.displayName);

  // Rendered on <body>: a parent card that moves on hover must not move this window
  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Component */}
        <div className="relative h-44 shrink-0">
          <ItemPhoto item={item} color={color} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button onClick={onClose} aria-label={t('close')} className="absolute top-3 end-3 w-9 h-9 grid place-items-center rounded-full bg-white/90 text-slate-700 hover:bg-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 start-4 end-4 text-white">
            <div className="text-[11px] font-black text-white/70">{item ? category?.name || ts('noCategory') : t('manualItem')}</div>
            <div className="text-lg font-black leading-tight">{r.itemsNeeded}</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-2 py-1 rounded-lg bg-slate-900 text-white font-black">× {r.quantity}</span>
            <span className={`px-2 py-1 rounded-lg font-black ${URGENCY_STYLE[r.urgency]}`}>{ts(`urgency_${r.urgency}`)}</span>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <CalendarDays className="w-3.5 h-3.5" /> {r.groupName}
              {r.sessionDate ? ` · ${fromISODate(r.sessionDate.slice(0, 10)).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50">
            <Progress status={r.status} big />
            <div className="text-[10px] font-semibold text-slate-400 mt-2">
              {t('requestedOn', { date: fromISODate(r.requestedAt).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) })}
              {r.statusChangedAt ? ` · ${t('updatedOn', { date: when(r.statusChangedAt) })}` : ''}
            </div>
          </div>

          {item && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
              <PackageCheck className="w-4 h-4 text-[#15803d]" />
              <span>{item.quantity > 0 ? ts('inStockNow', { count: `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` }) : t('outOfStock')}</span>
            </div>
          )}

          {/* Conversation */}
          <div className="space-y-2">
            <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-slate-400" /> {t('comments')}
            </h5>
            {!r.comments?.length ? (
              <p className="text-[11px] font-semibold text-slate-400">{t('noComments')}</p>
            ) : (
              <ul className="space-y-2">
                {r.comments.map((c) => {
                  const me = isMe(c.role, c.authorName);
                  return (
                    <li key={c.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${me ? 'bg-[#191919] text-white rounded-ee-md' : 'bg-slate-100 text-slate-800 rounded-es-md'}`}>
                        <div className={`text-[10px] font-black mb-0.5 ${me ? 'text-white/60' : 'text-slate-500'}`}>
                          {c.role === 'admin' ? t('office') : c.authorName} · {when(c.at)}
                        </div>
                        <div className="font-medium whitespace-pre-line leading-relaxed">{c.text}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form onSubmit={send} className="p-3 border-t border-slate-100 flex gap-2 shrink-0">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder={t('writeComment')}
            className="flex-1 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d] focus:bg-white"
          />
          <button type="submit" disabled={sending || !text.trim()} aria-label={t('send')} className="w-11 grid place-items-center btn-duo-green cursor-pointer disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

/** What the coach can ask for: the stock items the admin made visible */
export const StockCatalog: React.FC<{ onPick: (itemId: string) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  const { stockItems, stockCategories } = useApp();
  const t = useT(trainerMessages);
  const ts = useT(stockMessages);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  // Admins previewing the coach space receive every item: show only what coaches can see
  const visible = stockItems.filter((i) => !i.hiddenFromTrainers);
  const usedCats = stockCategories.filter((c) => !c.deletedAt && visible.some((i) => i.categoryId === c.id));
  const shown = visible
    .filter((i) => (cat === 'all' || i.categoryId === cat) && i.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-4xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-slate-900">{t('catalogTitle')}</h4>
              <p className="text-xs font-medium text-slate-500">{t('catalogSub')}</p>
            </div>
            <button onClick={onClose} aria-label={t('close')} className="p-1.5 btn-duo-secondary cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchStock')} className="w-full ps-9 pe-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d] focus:bg-white" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[{ id: 'all', name: t('tabAll'), color: '#191919' }, ...usedCats].map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer ${cat === c.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {c.id !== 'all' && <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />}
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto">
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shown.map((it) => {
              const c = stockCategories.find((x) => x.id === it.categoryId);
              const out = it.quantity <= 0;
              return (
                <li key={it.id} className="rounded-2xl border-2 border-slate-100 overflow-hidden flex flex-col bg-white">
                  <div className="relative aspect-square">
                    <ItemPhoto item={it} color={c?.color} className="w-full h-full" />
                    <span className={`absolute top-2 start-2 px-2 py-0.5 rounded-full text-[10px] font-black ${out ? 'bg-[#fbe3e7] text-[#861529]' : 'bg-white/90 text-[#14532d]'}`}>
                      {out ? t('outOfStock') : ts('inStockNow', { count: `${it.quantity}${it.unit ? ` ${it.unit}` : ''}` })}
                    </span>
                  </div>
                  <div className="p-2.5 flex flex-col gap-2 flex-1">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 leading-snug line-clamp-2">{it.name}</div>
                      {c && <div className="text-[10px] font-semibold text-slate-400 truncate">{c.name}</div>}
                    </div>
                    <button
                      onClick={() => onPick(it.id)}
                      disabled={out}
                      className="mt-auto py-1.5 btn-duo-blue text-[11px] font-black cursor-pointer disabled:opacity-40"
                    >
                      {t('requestThis')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
};
