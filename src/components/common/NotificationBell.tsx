import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Banknote,
  Bell,
  BellOff,
  BellRing,
  CalendarPlus,
  CalendarX,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  MessageCircle,
  Package,
  PackageCheck,
  ShoppingBag,
  Star,
  UserCheck,
  UserPlus,
  UserX,
  XCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api';
import { useLanguage, useT } from '../../i18n';
import { notificationMessages, renderNotification, type NotificationLang, type NotificationType } from '../../i18n/messages/notifications';

interface Notif {
  id: string;
  type: NotificationType;
  params: Record<string, string | number>;
  link: string;
  createdAt: string;
  readAt?: string;
}

const ICON: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  registration_new: { icon: UserPlus, color: '#c11e3d' },
  order_new: { icon: ShoppingBag, color: '#7c3aed' },
  order_ready: { icon: PackageCheck, color: '#15803d' },
  request_new: { icon: ClipboardList, color: '#d97706' },
  request_approved: { icon: CheckCircle2, color: '#2563eb' },
  request_delivered: { icon: Package, color: '#15803d' },
  request_refused: { icon: XCircle, color: '#c11e3d' },
  request_comment: { icon: MessageCircle, color: '#191919' },
  child_accepted: { icon: UserCheck, color: '#15803d' },
  child_class: { icon: GraduationCap, color: '#0284c7' },
  payment_received: { icon: Banknote, color: '#15803d' },
  attendance_absent: { icon: UserX, color: '#c11e3d' },
  attendance_mark: { icon: Star, color: '#c9a227' },
  schedule_added: { icon: CalendarPlus, color: '#0d9488' },
  class_cancelled: { icon: CalendarX, color: '#c11e3d' },
  stock_low: { icon: AlertTriangle, color: '#d97706' }
};

type PushState = 'loading' | 'unsupported' | 'ios' | 'blocked' | 'off' | 'on' | 'noserver';
const POLL_MS = 30_000;

const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIosBrowser = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone;

function keyToBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Header bell: history of notifications (unread ones disappear from the count once seen) and push on this device. */
export const NotificationBell: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { currentUser, showToast } = useApp();
  const t = useT(notificationMessages);
  const { lang, locale } = useLanguage();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(60);
  const [total, setTotal] = useState(0);
  // Unread when the panel was opened: they stay highlighted while it is open
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [push, setPush] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const known = useRef<Set<string> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api<{ items: Notif[]; unread: number; total: number }>(`/notifications?limit=${limit}`);
      // A small pop-up for what arrived since the last check (not on the first load)
      if (known.current) {
        const arrived = data.items.filter((n) => !n.readAt && !known.current!.has(n.id));
        if (arrived.length === 1) showToast(renderNotification(lang as NotificationLang, arrived[0].type, arrived[0].params).title, 'info');
        else if (arrived.length > 1) showToast(t('unread', { count: arrived.length }), 'info');
      }
      known.current = new Set(data.items.map((n) => n.id));
      setItems(data.items);
      setUnread(data.unread);
      setTotal(data.total);
    } catch {
      // offline or signed out: try again on the next tick
    }
  }, [currentUser?.uid, limit, lang]);

  // First load, polling while the tab is visible, and refresh when coming back to the tab
  useEffect(() => {
    known.current = null;
    setItems([]);
    setUnread(0);
    if (!currentUser) return;
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser?.uid]);
  useEffect(() => {
    if (currentUser) load();
  }, [limit]);

  // Unread count in the browser tab and on the installed app icon
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = unread ? `(${unread}) ${base}` : base;
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    (unread ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.())?.catch(() => {});
  }, [unread]);

  // Service worker: a push arrived (refresh), or a notification was clicked (go to its page)
  useEffect(() => {
    if (!pushSupported()) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'notification') load();
      if (e.data?.type === 'open' && e.data.url) openLink(e.data.url);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [load]);

  // Push state of this device
  const checkPush = useCallback(async () => {
    if (!pushSupported()) return setPush(isIosBrowser() ? 'ios' : 'unsupported');
    if (Notification.permission === 'denied') return setPush('blocked');
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    setPush(sub ? 'on' : 'off');
    // Keep the server in sync (and in the current language)
    if (sub && currentUser) api('/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), lang } }).catch(() => {});
  }, [currentUser?.uid, lang]);
  useEffect(() => {
    if (currentUser) checkPush();
  }, [currentUser?.uid, lang]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => boxRef.current && !boxRef.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = async (ids?: string[]) => {
    const at = new Date().toISOString();
    setItems((list) => list.map((n) => (!n.readAt && (!ids || ids.includes(n.id)) ? { ...n, readAt: at } : n)));
    setUnread((u) => (ids ? Math.max(0, u - ids.length) : 0));
    await api('/notifications/read', { method: 'POST', body: ids ? { ids } : {} }).catch(() => {});
  };

  // Opening the panel: what is unread is now seen (the count clears); it stays highlighted until the panel closes
  const toggle = () => {
    if (open) return setOpen(false);
    const unseen = items.filter((n) => !n.readAt).map((n) => n.id);
    setFresh(new Set(unseen));
    setOpen(true);
    if (unseen.length) markRead(unseen);
  };

  const openLink = (link: string) => {
    setOpen(false);
    if (!link) return;
    if (window.location.hash === link) window.dispatchEvent(new PopStateEvent('popstate'));
    else window.location.hash = link;
  };

  const enablePush = async () => {
    setBusy(true);
    try {
      const { publicKey } = await api<{ publicKey: string | null }>('/push/key');
      if (!publicKey) return setPush('noserver');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setPush(permission === 'denied' ? 'blocked' : 'off');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
      await api('/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), lang } });
      setPush('on');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Push error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe();
      }
      setPush('off');
    } finally {
      setBusy(false);
    }
  };

  const testPush = async () => {
    setBusy(true);
    try {
      await api('/push/test', { method: 'POST' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Push error', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!currentUser) return null;

  const ago = (iso: string) => {
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return t('justNow');
    if (min < 60) return t('minutesAgo', { n: min });
    if (min < 24 * 60 && new Date(iso).toDateString() === new Date().toDateString()) return t('hoursAgo', { n: Math.floor(min / 60) });
    return new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  const todayStr = new Date().toDateString();
  const groups = [
    { label: t('today'), list: items.filter((n) => new Date(n.createdAt).toDateString() === todayStr) },
    { label: t('earlier'), list: items.filter((n) => new Date(n.createdAt).toDateString() !== todayStr) }
  ].filter((g) => g.list.length);

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={toggle}
        aria-label={unread ? `${t('bell')} (${unread})` : t('bell')}
        aria-expanded={open}
        className={`relative ${compact ? 'w-10 h-10' : 'w-10 h-10'} grid place-items-center rounded-xl transition-colors cursor-pointer ${
          open ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        } ${compact ? 'border border-slate-200' : ''}`}
      >
        <Bell className={`w-5 h-5 ${unread ? 'origin-top animate-[bellRing_1s_ease-in-out_2]' : ''}`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-[#c11e3d] text-white text-[10px] font-black ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-[68px] sm:top-auto sm:end-0 sm:mt-2 sm:w-[400px] max-h-[calc(100dvh-84px)] sm:max-h-[min(640px,calc(100dvh-90px))] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden"
            role="dialog"
            aria-label={t('title')}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">{t('title')}</h3>
              {items.some((n) => !n.readAt) && (
                <button onClick={() => markRead()} className="flex items-center gap-1 text-[11px] font-black text-[#c11e3d] hover:underline cursor-pointer">
                  <CheckCheck className="w-3.5 h-3.5" /> {t('markAll')}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 mx-auto text-slate-200" />
                  <p className="mt-2 text-xs font-semibold text-slate-400">{t('empty')}</p>
                </div>
              ) : (
                groups.map((g) => (
                  <div key={g.label}>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{g.label}</div>
                    <ul>
                      {g.list.map((n) => {
                        const { title, body } = renderNotification(lang as NotificationLang, n.type, n.params);
                        const meta = ICON[n.type] || { icon: Bell, color: '#191919' };
                        const Icon = meta.icon;
                        const isFresh = fresh.has(n.id);
                        return (
                          <li key={n.id}>
                            <button
                              onClick={() => openLink(n.link)}
                              className={`w-full text-start flex gap-3 px-4 py-3 transition-colors cursor-pointer ${isFresh ? 'bg-[#fdf2f4] hover:bg-[#fbe3e7]' : 'hover:bg-slate-50'}`}
                            >
                              <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `${meta.color}1a`, color: meta.color }}>
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-2">
                                  <span className="text-[13px] font-black text-slate-900 leading-snug">{title}</span>
                                  {isFresh && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#c11e3d] shrink-0" />}
                                </span>
                                <span className="block text-xs font-medium text-slate-600 leading-snug mt-0.5">{body}</span>
                                <span className="block text-[10px] font-bold text-slate-400 mt-1">{ago(n.createdAt)}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
              {total > items.length && (
                <button onClick={() => setLimit((l) => l + 60)} className="w-full py-3 text-[11px] font-black text-slate-500 hover:text-slate-900 cursor-pointer">
                  {t('loadMore')}
                </button>
              )}
            </div>

            {/* Push on this device */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${push === 'on' ? 'bg-[#dcf5e4] text-[#15803d]' : 'bg-white text-slate-400 border border-slate-200'}`}>
                  {push === 'on' ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-900">{t('pushTitle')}</div>
                  <div className="text-[11px] font-semibold text-slate-500 leading-snug">
                    {push === 'on'
                      ? t('pushOn')
                      : push === 'blocked'
                      ? t('pushBlocked')
                      : push === 'ios'
                      ? t('pushIos')
                      : push === 'unsupported' || push === 'noserver'
                      ? t('pushUnsupported')
                      : t('pushOff')}
                  </div>
                </div>
                {push === 'off' && (
                  <button onClick={enablePush} disabled={busy} className="px-3 py-1.5 btn-duo-green text-[11px] font-black cursor-pointer disabled:opacity-60 shrink-0">
                    {t('pushEnable')}
                  </button>
                )}
              </div>
              {push === 'on' && (
                <div className="flex gap-3 mt-2 ps-12">
                  <button onClick={testPush} disabled={busy} className="text-[11px] font-black text-slate-600 hover:text-slate-900 hover:underline cursor-pointer disabled:opacity-50">
                    {t('testPush')}
                  </button>
                  <button onClick={disablePush} disabled={busy} className="text-[11px] font-black text-slate-400 hover:text-[#c11e3d] hover:underline cursor-pointer disabled:opacity-50">
                    {t('pushDisable')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
