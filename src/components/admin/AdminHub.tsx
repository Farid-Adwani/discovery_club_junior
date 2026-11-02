import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Boxes,
  Cake,
  CalendarDays,
  Camera,
  ClipboardList,
  DollarSign,
  Globe,
  Landmark,
  Package,
  Pencil,
  ShieldCheck,
  TrendingUp,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage, useT } from '../../i18n';
import { hubMessages } from '../../i18n/messages/hub';
import { ageOf } from '../../utils/age';
import { resizePhoto } from '../../utils/image';
import { fromISODate } from '../../utils/schedule';
import { birthdayPeople } from '../../utils/birthdays';
import { currentMonth, monthRows } from '../../utils/payments';
import { BirthdaysCard } from '../common/BirthdaysCard';
import { ModalPortal } from '../common/ModalPortal';

export type AdminSection =
  | 'overview'
  | 'students'
  | 'groups'
  | 'attendance'
  | 'payments'
  | 'inventory'
  | 'team'
  | 'cash'
  | 'stock'
  | 'site';

type Tone = { bg: string; icon: string; ring: string };
const TONES: Record<string, Tone> = {
  rose: { bg: 'from-rose-500 to-[#c11e3d]', icon: 'text-white', ring: 'hover:ring-rose-200' },
  ink: { bg: 'from-slate-700 to-[#191919]', icon: 'text-white', ring: 'hover:ring-slate-300' },
  gold: { bg: 'from-amber-400 to-[#c9a227]', icon: 'text-amber-950', ring: 'hover:ring-amber-200' },
  wine: { bg: 'from-[#8b1a30] to-[#6a0d1f]', icon: 'text-white', ring: 'hover:ring-rose-200' },
  sky: { bg: 'from-sky-400 to-sky-700', icon: 'text-white', ring: 'hover:ring-sky-200' },
  green: { bg: 'from-emerald-400 to-emerald-700', icon: 'text-white', ring: 'hover:ring-emerald-200' },
  pink: { bg: 'from-pink-400 to-pink-600', icon: 'text-white', ring: 'hover:ring-pink-200' },
  violet: { bg: 'from-violet-400 to-violet-700', icon: 'text-white', ring: 'hover:ring-violet-200' },
  teal: { bg: 'from-teal-400 to-teal-700', icon: 'text-white', ring: 'hover:ring-teal-200' }
};

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sky-400 focus:bg-white';

/** The admin's start screen: profile, birthdays and one big tile per section. */
export const AdminHub: React.FC<{ onOpen: (section: AdminSection) => void }> = ({ onOpen }) => {
  const {
    currentUser,
    students,
    payments,
    groups,
    trainers,
    orders,
    staffMembers,
    adminProfiles,
    materialRequests,
    navigateTo,
    updateMyProfile,
    showToast
  } = useApp();
  const t = useT(hubMessages);
  const { locale } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null | undefined>(undefined); // undefined = unchanged
  const [birthDate, setBirthDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!currentUser) return null;

  const openEdit = () => {
    setName(currentUser.displayName);
    setPhoto(undefined);
    setBirthDate(currentUser.birthDate || '');
    setIsEditing(true);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto(await resizePhoto(file, 320));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image error', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const ok = await updateMyProfile({
      displayName: name.trim(),
      ...(photo !== undefined ? { photo } : {}),
      birthDate: birthDate || null
    });
    setIsSaving(false);
    if (ok) setIsEditing(false);
  };

  const shownPhoto = photo === undefined ? currentUser.photoURL : photo || undefined;
  const pending = students.filter((s) => s.status === 'waitlist').length;
  // Children who still owe something for the current month
  const unpaid = monthRows(currentMonth(), students, payments).filter((r) => r.outstanding > 0).length;
  const toPrepare = orders.filter((o) => o.status === 'requested').length;
  const enrolled = students.filter((s) => s.status === 'accepted' && s.groupIds.length > 0).length;
  const openRequests = materialRequests.filter((r) => r.status === 'pending').length;

  const tiles: { id: AdminSection; icon: React.ReactNode; tone: Tone; stat: string; alert?: boolean }[] = [
    { id: 'overview', icon: <TrendingUp className="w-6 h-6" />, tone: TONES.rose, stat: t('s_enrolled', { count: enrolled }) },
    { id: 'students', icon: <Users className="w-6 h-6" />, tone: TONES.gold, stat: pending ? t('s_pending', { count: pending }) : t('s_allAccepted'), alert: pending > 0 },
    { id: 'groups', icon: <CalendarDays className="w-6 h-6" />, tone: TONES.ink, stat: t('s_classes', { count: groups.length }) },
    { id: 'attendance', icon: <ClipboardList className="w-6 h-6" />, tone: TONES.sky, stat: openRequests ? t('s_requests', { count: openRequests }) : t('s_open') },
    { id: 'payments', icon: <DollarSign className="w-6 h-6" />, tone: TONES.green, stat: unpaid ? t('s_unpaid', { count: unpaid }) : t('s_allPaid'), alert: unpaid > 0 },
    { id: 'inventory', icon: <Package className="w-6 h-6" />, tone: TONES.wine, stat: toPrepare ? t('s_orders', { count: toPrepare }) : t('s_noOrders'), alert: toPrepare > 0 },
    { id: 'team', icon: <Cake className="w-6 h-6" />, tone: TONES.pink, stat: t('s_team', { count: trainers.length + staffMembers.length + adminProfiles.length }) },
    { id: 'cash', icon: <Landmark className="w-6 h-6" />, tone: TONES.teal, stat: t('s_open') },
    { id: 'site', icon: <Globe className="w-6 h-6" />, tone: TONES.violet, stat: t('s_site') },
    { id: 'stock', icon: <Boxes className="w-6 h-6" />, tone: TONES.ink, stat: openRequests ? t('s_requests', { count: openRequests }) : t('s_open'), alert: openRequests > 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-7">
        <div className="absolute -top-16 -end-16 w-64 h-64 rounded-full bg-[#c11e3d]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 start-1/3 w-64 h-64 rounded-full bg-[#c9a227]/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative shrink-0">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="" className="w-24 h-24 rounded-3xl object-cover border-4 border-white/20 shadow-xl" />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#c11e3d] to-[#6a0d1f] flex items-center justify-center text-4xl font-black border-4 border-white/20 shadow-xl">
                {currentUser.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-2 -end-2 w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{t('greeting', { name: currentUser.displayName.split(' ')[0] })}</h2>
            <p className="text-sm font-semibold text-white/60">{t('greetingSub')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-full bg-white/10" dir="ltr">
                {currentUser.email}
              </span>
              {currentUser.birthDate ? (
                <span className="px-2.5 py-1 rounded-full bg-white/10">
                  🎂 {t('born', { date: fromISODate(currentUser.birthDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) })} ·{' '}
                  {t('age', { age: ageOf({ birthDate: currentUser.birthDate, studentAge: 0 }) })}
                </span>
              ) : (
                <button onClick={openEdit} className="px-2.5 py-1 rounded-full bg-amber-400/90 text-amber-950 cursor-pointer">
                  🎂 {t('noBirthDate')}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={openEdit}
            className="self-start sm:self-center px-4 py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-black flex items-center gap-2 hover:bg-slate-100 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            {t('editProfile')}
          </button>
        </div>
      </section>

      {/* Sections */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{t('sections')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {tiles.map((tile, i) => (
            <motion.button
              key={tile.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpen(tile.id)}
              className={`group relative text-start p-4 sm:p-5 rounded-3xl bg-white border-2 border-slate-200 border-b-4 shadow-sm hover:shadow-lg ring-4 ring-transparent ${tile.tone.ring} transition-shadow cursor-pointer flex flex-col gap-3 min-h-[150px]`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tile.tone.bg} ${tile.tone.icon} flex items-center justify-center shadow-md`}>
                  {tile.icon}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors rtl:rotate-180" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-black text-slate-900 leading-tight">{t(`t_${tile.id}`)}</div>
                <div className="text-[11px] font-medium text-slate-500 leading-snug hidden sm:block">{t(`d_${tile.id}`)}</div>
              </div>
              <span
                className={`mt-auto self-start px-2 py-0.5 rounded-full text-[10px] font-black ${
                  tile.alert ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tile.alert && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 me-1 align-middle" />}
                {tile.stat}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Birthdays */}
      <BirthdaysCard people={birthdayPeople(students, trainers, staffMembers, adminProfiles)} onManage={() => onOpen('team')} />

      {/* Edit profile */}
      {isEditing && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setIsEditing(false)}>
            <form
              onSubmit={handleSave}
              onClick={(e) => e.stopPropagation()}
              className="duo-card hover:transform-none! bg-white w-full max-w-sm p-5 space-y-4 text-xs font-bold text-slate-700"
            >
              <h4 className="text-base font-black text-slate-900">{t('profileTitle')}</h4>

              <div className="flex items-center gap-4">
                {shownPhoto ? (
                  <img src={shownPhoto} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#c11e3d] to-[#6a0d1f] text-white flex items-center justify-center text-3xl font-black">
                    {(name || currentUser.displayName).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="px-3 py-2 btn-duo-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    {t('changePhoto')}
                  </button>
                  {shownPhoto && (
                    <button type="button" onClick={() => setPhoto(null)} className="text-[11px] font-bold text-rose-600 cursor-pointer">
                      {t('removePhoto')}
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>
              </div>

              <div>
                <label className="block mb-1">{t('name')}</label>
                <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block mb-1">{t('birthDate')}</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
                <p className="mt-1 text-[11px] font-medium text-slate-400">{t('birthDateHint')}</p>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditing(false)} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
