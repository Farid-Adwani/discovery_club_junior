import React, { useEffect, useMemo, useState } from 'react';
import {
  Baby,
  CalendarDays,
  Briefcase,
  Cake,
  Check,
  Copy,
  Crown,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Layers,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AccountSummary, StaffMember, Trainer } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { teamMessages } from '../../i18n/messages/team';
import { api } from '../../api';
import { ageOf } from '../../utils/age';
import { fromISODate, weekdayName } from '../../utils/schedule';
import { isValidEmail, isValidPhone } from '../../utils/contact';
import { whatsappLink } from '../../utils/payments';
import { useConfirm } from '../common/ConfirmProvider';
import { CoachScheduleModal } from './CoachScheduleModal';
import { ModalPortal } from '../common/ModalPortal';

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#c11e3d] focus:bg-white';

type Role = AccountSummary['role'];
type StaffDraft = { id?: string; name: string; role: StaffMember['role']; jobTitle: string; birthDate: string };
type NewChild = { name: string; birthDate: string };
type AccountDraft = { role: Role; name: string; email: string; phone: string; specialization: string; password: string; studentIds: string[]; newChildren: NewChild[] };

const ROLE_META: Record<Role, { icon: React.ElementType; bg: string; ink: string; key: 'roleAdmin' | 'roleCoach' | 'roleParent'; sub: 'roleAdminSub' | 'roleCoachSub' | 'roleParentSub' }> = {
  admin: { icon: ShieldCheck, bg: '#191919', ink: '#ffffff', key: 'roleAdmin', sub: 'roleAdminSub' },
  trainer: { icon: GraduationCap, bg: '#c11e3d', ink: '#ffffff', key: 'roleCoach', sub: 'roleCoachSub' },
  parent: { icon: Users, bg: '#fdf3d1', ink: '#6b5310', key: 'roleParent', sub: 'roleParentSub' }
};

const AVATAR_COLORS = ['#c11e3d', '#191919', '#6a0d1f', '#c9a227', '#4f4f4f'];
const colorOf = (id: string) => AVATAR_COLORS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Easy to read and type: no 0/O, 1/l */
function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  const s = [...bytes].map((b) => chars[b % chars.length]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

const Avatar: React.FC<{ id: string; name: string; photo?: string; size?: string }> = ({ id, name, photo, size = 'w-11 h-11' }) =>
  photo ? (
    <img src={photo} alt="" className={`${size} rounded-2xl object-cover shrink-0`} />
  ) : (
    <span className={`${size} rounded-2xl grid place-items-center text-white text-xs font-black shrink-0`} style={{ background: colorOf(id) }}>
      {initialsOf(name)}
    </span>
  );

const RoleBadge: React.FC<{ role: Role; owner?: boolean }> = ({ role, owner }) => {
  const t = useT(teamMessages);
  const m = ROLE_META[role];
  const Icon = owner ? Crown : m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap" style={{ background: m.bg, color: m.ink }}>
      <Icon className="w-3 h-3" />
      {owner ? t('owner') : t(m.key)}
    </span>
  );
};

/** Coach date of birth, editable in place */
const BirthDateField: React.FC<{ trainer: Trainer }> = ({ trainer }) => {
  const { setTrainerBirthDate } = useApp();
  const t = useT(teamMessages);
  const [value, setValue] = useState(trainer.birthDate || '');
  const changed = value !== (trainer.birthDate || '');
  return (
    <div className="flex items-center gap-1.5">
      <Cake className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t('birthDate')}
        className="px-2 py-1 bg-slate-50 border-2 border-slate-200 rounded-lg text-[11px] font-bold focus:outline-none focus:border-[#c11e3d]"
      />
      {changed ? (
        <button onClick={() => setTrainerBirthDate(trainer.id, value || null)} className="px-2.5 py-1 btn-duo-green text-[11px] font-black cursor-pointer">
          {value ? t('save') : t('clear')}
        </button>
      ) : (
        trainer.birthDate && <span className="text-[10px] font-bold text-slate-400">{t('age', { age: ageOf({ birthDate: trainer.birthDate, studentAge: 0 }) })}</span>
      )}
    </div>
  );
};

/** Admin "Team" tab: the club team, and every sign-in account (create admins, coaches and parents). */
export const TeamManager: React.FC = () => {
  const { trainers, staffMembers, groups, students, currentUser, saveStaffMember, deleteStaffMember, showToast, refreshData, viewAsParent } = useApp();
  const t = useT(teamMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();

  const [tab, setTab] = useState<'team' | 'accounts'>('team');
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [search, setSearch] = useState('');
  const [staffDraft, setStaffDraft] = useState<StaffDraft | null>(null);
  const [accountDraft, setAccountDraft] = useState<AccountDraft | null>(null);
  const [created, setCreated] = useState<{ account: AccountSummary; password: string } | null>(null);
  const [passwordFor, setPasswordFor] = useState<AccountSummary | null>(null);
  const [childrenFor, setChildrenFor] = useState<AccountSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<Trainer | null>(null);

  const loadAccounts = async () => {
    try {
      setAccounts(await api<AccountSummary[]>('/admin/accounts'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('loadError'), 'error');
      setAccounts([]);
    }
  };
  useEffect(() => {
    loadAccounts();
  }, []);

  /** Runs an account change, then reloads the list (and the club data, since roles and coaches may change) */
  const run = async (fn: () => Promise<unknown>, okMessage: string) => {
    try {
      await fn();
      showToast(okMessage);
      await Promise.all([loadAccounts(), refreshData()]);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('loadError'), 'error');
      return false;
    }
  };

  const accountByEmail = useMemo(() => new Map((accounts || []).map((a) => [a.email.toLowerCase(), a])), [accounts]);
  const admins = (accounts || []).filter((a) => a.role === 'admin');
  const counts = {
    all: accounts?.length ?? 0,
    admin: admins.length,
    trainer: (accounts || []).filter((a) => a.role === 'trainer').length,
    parent: (accounts || []).filter((a) => a.role === 'parent').length
  };
  const shownAccounts = (accounts || []).filter((a) => {
    const q = search.trim().toLowerCase();
    return (
      (roleFilter === 'all' || a.role === roleFilter) &&
      (!q || a.name.toLowerCase().includes(q) || a.email.includes(q) || (a.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')))
    );
  });

  const classesOf = (trainerId: string) => groups.filter((g) => g.trainerIds.includes(trainerId));
  const sortedStaff = [...staffMembers].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  const today = new Date();
  const maxBirth = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate()).toISOString().slice(0, 10);

  // ---------- actions ----------
  const openCreate = (preset: Partial<AccountDraft> = {}) =>
    setAccountDraft({ role: 'parent', name: '', email: '', phone: '', specialization: '', password: generatePassword(), studentIds: [], newChildren: [], ...preset });

  const createAccount = async (draft: AccountDraft) => {
    setIsSaving(true);
    try {
      const account = await api<AccountSummary>('/admin/accounts', {
        method: 'POST',
        body: {
          role: draft.role,
          name: draft.name.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim() || undefined,
          specialization: draft.specialization.trim() || undefined,
          password: draft.password,
          studentIds: draft.role === 'parent' ? draft.studentIds : undefined,
          newChildren: draft.role === 'parent' ? draft.newChildren.filter((c) => c.name.trim() && c.birthDate).map((c) => ({ ...c, name: c.name.trim() })) : undefined
        }
      });
      setAccountDraft(null);
      setCreated({ account, password: draft.password });
      showToast(t('accountCreated'));
      await Promise.all([loadAccounts(), refreshData()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('loadError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAdmin = async (a: AccountSummary) => {
    const makeAdmin = a.role !== 'admin';
    const ok = await confirm({
      title: makeAdmin ? t('confirmMakeAdmin', { name: a.name }) : t('confirmRemoveAdmin', { name: a.name }),
      message: makeAdmin ? t('confirmMakeAdminText') : undefined,
      confirmLabel: makeAdmin ? t('makeAdmin') : t('removeAdmin'),
      danger: makeAdmin
    });
    if (ok) await run(() => api(`/admin/accounts/${a.id}/admin`, { method: 'PATCH', body: { admin: makeAdmin } }), t('roleChanged'));
  };

  const removeAccount = async (a: AccountSummary) => {
    const ok = await confirm({
      title: t('confirmDeleteAccount', { name: a.name }),
      message: t('confirmDeleteAccountText'),
      confirmLabel: t('deleteAccount'),
      danger: true
    });
    if (ok) await run(() => api(`/admin/accounts/${a.id}`, { method: 'DELETE' }), t('accountDeleted'));
  };

  const saveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffDraft) return;
    setIsSaving(true);
    const ok = await saveStaffMember({ ...staffDraft, name: staffDraft.name.trim(), jobTitle: staffDraft.jobTitle.trim() || undefined });
    setIsSaving(false);
    if (ok) setStaffDraft(null);
  };

  const removeStaff = async (m: StaffMember) => {
    const ok = await confirm({ title: t('confirmDelete', { name: m.name }), message: t('confirmDeleteText'), confirmLabel: t('delete'), danger: true });
    if (ok) deleteStaffMember(m.id);
  };

  const LoginBadge: React.FC<{ email: string; onCreate: () => void }> = ({ email, onCreate }) =>
    accountByEmail.has(email.toLowerCase()) ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#15803d]">
        <KeyRound className="w-3 h-3" /> {t('hasLogin')}
      </span>
    ) : (
      <button onClick={onCreate} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 border-dashed border-slate-300 text-[10px] font-black text-slate-500 hover:border-[#c11e3d] hover:text-[#c11e3d] cursor-pointer">
        <KeyRound className="w-3 h-3" /> {t('createLogin')}
      </button>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-[#191919] text-white p-5 sm:p-6">
        <div className="absolute -top-20 -end-16 w-72 h-72 rounded-full bg-[#c11e3d]/40 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black flex items-center gap-2">
              <Users className="w-6 h-6 text-[#ff6b86]" /> {t('title')}
            </h3>
            <p className="text-xs font-medium text-white/60 mt-0.5">{t('heroSub')}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                { label: t('statAdmins'), value: counts.admin, icon: <ShieldCheck className="w-4 h-4" /> },
                { label: t('statCoaches'), value: trainers.length, icon: <GraduationCap className="w-4 h-4" /> },
                { label: t('statStaff'), value: staffMembers.length, icon: <Briefcase className="w-4 h-4" /> },
                { label: t('statParents'), value: counts.parent, icon: <Users className="w-4 h-4" /> }
              ].map((s) => (
                <div key={s.label} className="px-3 py-2 rounded-2xl bg-white/10 min-w-[110px]">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-white/60">
                    {s.icon} {s.label}
                  </div>
                  <div className="text-xl font-black font-mono">{accounts === null && s.label !== t('statCoaches') && s.label !== t('statStaff') ? '…' : s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => openCreate()} className="self-start lg:self-end px-4 py-2.5 btn-duo-green text-sm font-black flex items-center gap-2 cursor-pointer">
            <UserPlus className="w-4 h-4" /> {t('createAccount')}
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-2xl bg-slate-100">
        {(
          [
            ['team', t('tabTeam'), <Users key="t" className="w-4 h-4" />],
            ['accounts', t('tabAccounts'), <KeyRound key="a" className="w-4 h-4" />]
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black cursor-pointer transition-all ${
              tab === id ? 'bg-white text-[#c11e3d] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {icon}
            {label}
            {id === 'accounts' && accounts && <span className="px-1.5 rounded-full bg-slate-200 text-[10px] text-slate-600">{accounts.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'team' ? (
        <div className="space-y-6">
          {/* Admins */}
          <section className="space-y-3">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> {t('statAdmins')} <span className="text-slate-400 font-mono">({admins.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {admins.map((a) => (
                <div key={a.id} className="duo-card bg-white p-4 flex items-center gap-3">
                  <Avatar id={a.id} name={a.name} photo={a.photoURL} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 truncate">{a.name}</span>
                      {a.id === currentUser?.uid && <span className="text-[10px] font-black text-slate-400">({t('you')})</span>}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate" dir="ltr">
                      {a.email}
                    </div>
                    <div className="mt-1">
                      <RoleBadge role="admin" owner={a.owner} />
                    </div>
                  </div>
                </div>
              ))}
              {accounts === null && <div className="text-xs font-semibold text-slate-400">{t('loading')}</div>}
            </div>
          </section>

          {/* Coaches */}
          <section className="space-y-3">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#c11e3d]" /> {t('coaches')} <span className="text-slate-400 font-mono">({trainers.length})</span>
            </h4>
            {trainers.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400 font-medium rounded-2xl border-2 border-dashed border-slate-200">{t('noCoaches')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {trainers.map((tr) => {
                  const classes = classesOf(tr.id);
                  return (
                    <article key={`${tr.id}:${tr.birthDate || ''}`} className="duo-card bg-white p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar id={tr.id} name={tr.name} photo={tr.avatar || undefined} size="w-14 h-14" />
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 truncate">{tr.name}</div>
                          <div className="text-[11px] font-semibold text-slate-500 truncate">{tr.specialty || tr.specialization || t('roleCoach')}</div>
                          <div className="mt-1">
                            <LoginBadge email={tr.email} onCreate={() => openCreate({ role: 'trainer', name: tr.name, email: tr.email, phone: tr.phone || '' })} />
                          </div>
                        </div>
                        <button
                          onClick={() => setScheduleFor(tr)}
                          className="shrink-0 px-2.5 py-1.5 btn-duo-secondary text-[11px] font-black flex items-center gap-1 cursor-pointer"
                        >
                          <CalendarDays className="w-3.5 h-3.5 text-[#c11e3d]" /> {t('schedule')}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {classes.length === 0 ? (
                          <span className="text-[11px] italic font-semibold text-slate-400">{t('noClassesTaught')}</span>
                        ) : (
                          classes.map((g) => (
                            <span key={g.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700">
                              <Layers className="w-3 h-3 text-slate-400" />
                              {g.name} <span className="text-slate-400">{weekdayName(g.dayOfWeek, locale, 'short')}</span>
                            </span>
                          ))
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-slate-100">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 min-w-0">
                          {tr.phone && (
                            <a href={`tel:${tr.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:text-[#c11e3d]" dir="ltr">
                              <Phone className="w-3 h-3" /> {tr.phone}
                            </a>
                          )}
                          {tr.email && (
                            <a href={`mailto:${tr.email}`} title={tr.email} className="inline-flex items-center gap-1 hover:text-[#c11e3d]">
                              <Mail className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <BirthDateField trainer={tr} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Workers */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" /> {t('staff')} <span className="text-slate-400 font-mono">({staffMembers.length})</span>
              </h4>
              <button
                onClick={() => setStaffDraft({ name: '', role: 'worker', jobTitle: '', birthDate: '' })}
                className="px-3 py-1.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('addMember')}
              </button>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">{t('staffHint')}</p>
            {sortedStaff.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400 font-medium rounded-2xl border-2 border-dashed border-slate-200">{t('noStaff')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {sortedStaff.map((m) => (
                  <div key={m.id} className="duo-card bg-white p-4 flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl grid place-items-center bg-slate-100 text-slate-600 shrink-0">
                      {m.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-sm text-slate-900 truncate">{m.name}</div>
                      <div className="text-[11px] font-semibold text-slate-500 truncate">
                        {m.jobTitle || t(`role_${m.role}`)} · {fromISODate(m.birthDate).toLocaleDateString(locale, { day: 'numeric', month: 'long' })}
                      </div>
                    </div>
                    <button
                      onClick={() => setStaffDraft({ id: m.id, name: m.name, role: m.role, jobTitle: m.jobTitle || '', birthDate: m.birthDate })}
                      aria-label={t('edit')}
                      title={t('edit')}
                      className="w-8 h-8 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeStaff(m)}
                      aria-label={t('delete')}
                      title={t('delete')}
                      className="w-8 h-8 grid place-items-center rounded-xl text-slate-400 hover:bg-[#fbe3e7] hover:text-[#c11e3d] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Accounts */
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'admin', 'trainer', 'parent'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 cursor-pointer transition-all ${
                    roleFilter === r ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c11e3d]'
                  }`}
                >
                  {r === 'all' ? t('accFilterAll') : t(ROLE_META[r].key)}
                  <span className={`px-1.5 rounded-full text-[10px] ${roleFilter === r ? 'bg-white/20' : 'bg-slate-100'}`}>{counts[r]}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className={`${inputCls} ps-9 bg-white`} />
            </div>
          </div>

          <div className="rounded-3xl border-2 border-slate-200 bg-white overflow-hidden">
            {accounts === null ? (
              <div className="p-10 text-center text-sm font-medium text-slate-400">{t('loading')}</div>
            ) : shownAccounts.length === 0 ? (
              <div className="p-10 text-center text-sm font-medium text-slate-400">{t('accountsEmpty')}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {shownAccounts.map((a) => {
                  const me = a.id === currentUser?.uid;
                  const locked = a.owner || me;
                  return (
                    <li key={a.id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto] gap-3 items-center px-4 sm:px-5 py-3.5 hover:bg-[#fdf2f4]/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar id={a.id} name={a.name} photo={a.photoURL} size="w-10 h-10" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-black text-sm text-slate-900 truncate">{a.name}</span>
                            {me && <span className="text-[10px] font-black text-slate-400">({t('you')})</span>}
                            <RoleBadge role={a.role} owner={a.owner} />
                          </div>
                          <div className="text-[11px] font-semibold text-slate-400 truncate" dir="ltr">
                            {a.email}
                            {a.phone ? ` · ${a.phone}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold text-slate-500 min-w-0 ps-[52px] lg:ps-0">
                        {a.role === 'parent' ? (
                          a.children.length ? (
                            <span className="inline-flex flex-wrap items-center gap-1">
                              <Baby className="w-3.5 h-3.5 text-slate-400" />
                              {a.children.map((c) => (
                                <span key={c.id} className="px-1.5 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                                  {c.name}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">{t('noChildren')}</span>
                          )
                        ) : a.trainerId ? (
                          <span className="inline-flex flex-wrap gap-1">
                            {classesOf(a.trainerId).map((g) => (
                              <span key={g.id} className="px-1.5 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                                {g.name}
                              </span>
                            ))}
                          </span>
                        ) : null}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {t('createdOn', { date: new Date(a.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-0.5 ps-[52px] lg:ps-0">
                        {a.role === 'parent' && (
                          <>
                            <IconBtn label={t('viewAsParent')} onClick={() => viewAsParent(a.id)}>
                              <Eye className="w-4 h-4" />
                            </IconBtn>
                            <IconBtn label={t('linkChildren')} onClick={() => setChildrenFor(a)}>
                              <Baby className="w-4 h-4" />
                            </IconBtn>
                          </>
                        )}
                        <IconBtn label={t('resetPassword')} onClick={() => setPasswordFor(a)}>
                          <KeyRound className="w-4 h-4" />
                        </IconBtn>
                        {!locked && (
                          <IconBtn label={a.role === 'admin' ? t('removeAdmin') : t('makeAdmin')} onClick={() => toggleAdmin(a)}>
                            {a.role === 'admin' ? <ShieldOff className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                          </IconBtn>
                        )}
                        {!locked && (
                          <IconBtn label={t('deleteAccount')} onClick={() => removeAccount(a)} danger>
                            <Trash2 className="w-4 h-4" />
                          </IconBtn>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Create account */}
      {accountDraft && (
        <CreateAccountModal
          draft={accountDraft}
          setDraft={setAccountDraft}
          onClose={() => setAccountDraft(null)}
          onSubmit={createAccount}
          saving={isSaving}
          students={students}
        />
      )}

      {/* A coach's week: add meetings / trainings, cancel a class on one day */}
      {scheduleFor && <CoachScheduleModal trainer={scheduleFor} onClose={() => setScheduleFor(null)} />}

      {/* Login details, shown once */}
      {created && <CreatedModal account={created.account} password={created.password} onClose={() => setCreated(null)} />}

      {/* New password */}
      {passwordFor && (
        <PasswordModal
          account={passwordFor}
          onClose={() => setPasswordFor(null)}
          onSave={async (pw) => {
            const ok = await run(() => api(`/admin/accounts/${passwordFor.id}/password`, { method: 'PUT', body: { password: pw } }), t('passwordSaved'));
            if (ok) {
              setCreated({ account: passwordFor, password: pw });
              setPasswordFor(null);
            }
          }}
        />
      )}

      {/* Parent's children */}
      {childrenFor && (
        <ChildrenModal
          account={childrenFor}
          students={students}
          onClose={() => setChildrenFor(null)}
          onSave={async (ids) => {
            const ok = await run(() => api(`/admin/accounts/${childrenFor.id}/children`, { method: 'PUT', body: { studentIds: ids } }), t('saved'));
            if (ok) setChildrenFor(null);
          }}
        />
      )}

      {/* Add / edit worker */}
      {staffDraft && (
        <Modal onClose={() => setStaffDraft(null)}>
          <form onSubmit={saveStaff} className="space-y-3 text-xs font-bold text-slate-700">
            <h4 className="text-base font-black text-slate-900">{staffDraft.id ? t('editMember') : t('addMember')}</h4>
            <label className="block space-y-1">
              <span>{t('name')}</span>
              <input required maxLength={120} value={staffDraft.name} onChange={(e) => setStaffDraft({ ...staffDraft, name: e.target.value })} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span>{t('role')}</span>
                <select value={staffDraft.role} onChange={(e) => setStaffDraft({ ...staffDraft, role: e.target.value as StaffMember['role'] })} className={`${inputCls} cursor-pointer`}>
                  <option value="admin">{t('role_admin')}</option>
                  <option value="worker">{t('role_worker')}</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span>{t('birthDate')}</span>
                <input type="date" required max={maxBirth} value={staffDraft.birthDate} onChange={(e) => setStaffDraft({ ...staffDraft, birthDate: e.target.value })} className={inputCls} />
              </label>
            </div>
            <label className="block space-y-1">
              <span>{t('jobTitle')}</span>
              <input maxLength={80} value={staffDraft.jobTitle} onChange={(e) => setStaffDraft({ ...staffDraft, jobTitle: e.target.value })} placeholder={t('jobTitlePlaceholder')} className={inputCls} />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setStaffDraft(null)} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
                {t('cancel')}
              </button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60">
                {t('save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const IconBtn: React.FC<{ label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }> = ({ label, onClick, danger, children }) => (
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

const Modal: React.FC<{ onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ onClose, wide, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          className={`duo-card hover:transform-none! bg-white w-full ${wide ? 'max-w-lg' : 'max-w-sm'} p-5 sm:p-6 max-h-[92vh] overflow-y-auto`}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
};

const PasswordInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const t = useT(teamMessages);
  const [show, setShow] = useState(true);
  return (
    <div className="flex gap-1.5">
      <div className="relative flex-1">
        <input
          type={show ? 'text' : 'password'}
          required
          minLength={6}
          maxLength={128}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} font-mono pe-10`}
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t('hide') : t('show')}
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <button type="button" onClick={() => onChange(generatePassword())} className="px-3 btn-duo-secondary text-xs font-black flex items-center gap-1 cursor-pointer">
        <Sparkles className="w-3.5 h-3.5" /> {t('generate')}
      </button>
    </div>
  );
};

const CreateAccountModal: React.FC<{
  draft: AccountDraft;
  setDraft: (d: AccountDraft) => void;
  onClose: () => void;
  onSubmit: (d: AccountDraft) => void;
  saving: boolean;
  students: { id: string; studentName: string; parentName: string; parentEmail: string; parentUid?: string; status: string }[];
}> = ({ draft, setDraft, onClose, onSubmit, saving, students }) => {
  const t = useT(teamMessages);
  const [childSearch, setChildSearch] = useState('');
  const set = (patch: Partial<AccountDraft>) => setDraft({ ...draft, ...patch });

  // Children registered with this email (and not linked to another account) are pre-selected
  const emailLower = draft.email.trim().toLowerCase();
  useEffect(() => {
    if (draft.role !== 'parent' || !isValidEmail(emailLower)) return;
    const matching = students.filter((s) => s.parentEmail?.toLowerCase() === emailLower && !s.parentUid).map((s) => s.id);
    if (matching.length) setDraft({ ...draft, studentIds: [...new Set([...draft.studentIds, ...matching])] });
  }, [emailLower, draft.role]);

  const phoneOk = draft.role === 'parent' ? isValidPhone(draft.phone) : !draft.phone.trim() || isValidPhone(draft.phone);
  // A new child row is either complete or left empty
  const childrenOk = draft.newChildren.every((c) => (c.name.trim() && c.birthDate) || (!c.name.trim() && !c.birthDate));
  const valid = draft.name.trim() && isValidEmail(draft.email) && draft.password.length >= 6 && phoneOk && childrenOk;
  const setChild = (idx: number, patch: Partial<NewChild>) => set({ newChildren: draft.newChildren.map((c, i) => (i === idx ? { ...c, ...patch } : c)) });
  // Same ages as the parents' registration form (3 to 22)
  const now = new Date();
  const childMin = new Date(now.getFullYear() - 22, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const childMax = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const q = childSearch.trim().toLowerCase();
  const childOptions = students
    .filter((s) => !q || s.studentName.toLowerCase().includes(q) || s.parentName.toLowerCase().includes(q))
    .sort((a, b) => Number(draft.studentIds.includes(b.id)) - Number(draft.studentIds.includes(a.id)) || a.studentName.localeCompare(b.studentName));

  return (
    <Modal onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(draft);
        }}
        className="space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg font-black text-slate-900">{t('createAccount')}</h4>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="p-1.5 btn-duo-secondary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role */}
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {(['admin', 'trainer', 'parent'] as const).map((r) => {
            const m = ROLE_META[r];
            const Icon = m.icon;
            const active = draft.role === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ role: r })}
                className={`text-start p-3 rounded-2xl border-2 cursor-pointer transition-all ${active ? 'border-[#c11e3d] bg-[#fdf2f4] shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <span className="w-8 h-8 rounded-xl grid place-items-center mb-1.5" style={{ background: m.bg, color: m.ink }}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="text-sm font-black text-slate-900">{t(m.key)}</div>
                <div className="text-[10px] font-semibold text-slate-500 leading-snug">{t(m.sub)}</div>
              </button>
            );
          })}
        </div>
        {draft.role === 'admin' && <p className="px-3 py-2 rounded-xl bg-[#fdf3d1] text-[11px] font-semibold text-[#6b5310]">{t('adminWarning')}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700">
          <label className="block space-y-1 sm:col-span-2">
            <span>{t('fName')}</span>
            <input required maxLength={120} value={draft.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} autoFocus />
          </label>
          <label className="block space-y-1">
            <span>{t('fEmail')}</span>
            <input type="email" required value={draft.email} onChange={(e) => set({ email: e.target.value })} className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span>{draft.role === 'parent' ? t('fPhone') : t('fPhoneOptional')}</span>
            <input type="tel" required={draft.role === 'parent'} value={draft.phone} onChange={(e) => set({ phone: e.target.value })} className={inputCls} />
          </label>
          {draft.role === 'trainer' && (
            <label className="block space-y-1 sm:col-span-2">
              <span>{t('fSpecialty')}</span>
              <input maxLength={200} value={draft.specialization} onChange={(e) => set({ specialization: e.target.value })} placeholder={t('fSpecialtyPh')} className={inputCls} />
            </label>
          )}
          <label className="block space-y-1 sm:col-span-2">
            <span>{t('fPassword')}</span>
            <PasswordInput value={draft.password} onChange={(password) => set({ password })} />
          </label>
        </div>

        {draft.role === 'parent' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">{t('fChildren')}</span>
              <span className="text-[10px] font-black text-slate-400">{t('selectedCount', { count: draft.studentIds.length })}</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">{t('childrenHint')}</p>
            {students.length === 0 ? (
              <p className="text-[11px] italic text-slate-400">{t('noChildrenToLink')}</p>
            ) : (
              <>
                <input value={childSearch} onChange={(e) => setChildSearch(e.target.value)} placeholder={t('searchChild')} className={`${inputCls} text-xs py-1.5`} />
                <ChildChecklist options={childOptions} selected={draft.studentIds} onChange={(studentIds) => set({ studentIds })} />
              </>
            )}

            {/* Children not registered yet: created with the account, on the waitlist */}
            <div className="pt-2 space-y-2">
              <span className="block text-xs font-bold text-slate-700">{t('newChildrenTitle')}</span>
              {draft.newChildren.map((c, idx) => (
                <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-slate-50 border-2 border-slate-100">
                  <input
                    value={c.name}
                    maxLength={120}
                    autoFocus={idx === draft.newChildren.length - 1}
                    onChange={(e) => setChild(idx, { name: e.target.value })}
                    placeholder={t('newChildName')}
                    aria-label={t('newChildName')}
                    className={`${inputCls} text-xs py-1.5 flex-1 min-w-40`}
                  />
                  <input
                    type="date"
                    min={childMin}
                    max={childMax}
                    value={c.birthDate}
                    onChange={(e) => setChild(idx, { birthDate: e.target.value })}
                    aria-label={t('newChildBirth')}
                    title={t('newChildBirth')}
                    className={`${inputCls} text-xs py-1.5 w-40`}
                  />
                  {c.birthDate && <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{t('newChildAge', { age: ageOf({ birthDate: c.birthDate, studentAge: 0 }) })}</span>}
                  <button type="button" onClick={() => set({ newChildren: draft.newChildren.filter((_, i) => i !== idx) })} aria-label={t('newChildRemove')} title={t('newChildRemove')} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {!childrenOk && <p className="text-[11px] font-bold text-rose-600">{t('newChildIncomplete')}</p>}
              {draft.newChildren.length < 10 && (
                <button
                  type="button"
                  onClick={() => set({ newChildren: [...draft.newChildren, { name: '', birthDate: '' }] })}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> {t('newChildAdd')}
                </button>
              )}
              {draft.newChildren.length > 0 && <p className="text-[11px] font-semibold text-slate-400">{t('newChildrenHint')}</p>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t-2 border-slate-100">
          <button type="button" onClick={onClose} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="submit" disabled={!valid || saving} className="px-4 py-2 btn-duo-green text-sm font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <UserPlus className="w-4 h-4" /> {t('create')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const ChildChecklist: React.FC<{
  options: { id: string; studentName: string; parentName: string; parentUid?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  ownUid?: string;
}> = ({ options, selected, onChange, ownUid }) => {
  const t = useT(teamMessages);
  return (
    <ul className="scroll-panel max-h-48 rounded-xl border-2 border-slate-100 divide-y divide-slate-100">
      {options.map((s) => {
        const on = selected.includes(s.id);
        const elsewhere = !!s.parentUid && s.parentUid !== ownUid;
        return (
          <li key={s.id}>
            <label className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer ${on ? 'bg-[#fdf2f4]' : 'hover:bg-slate-50'}`}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => onChange(e.target.checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))}
                className="w-4 h-4 accent-[#c11e3d]"
              />
              <span className="text-xs font-black text-slate-800">{s.studentName}</span>
              <span className="text-[10px] font-semibold text-slate-400 truncate">· {s.parentName}</span>
              {elsewhere && <span className="ms-auto text-[9px] font-black uppercase text-amber-700">{t('linkedElsewhere')}</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
};

const CreatedModal: React.FC<{ account: AccountSummary; password: string; onClose: () => void }> = ({ account, password, onClose }) => {
  const t = useT(teamMessages);
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/#/login`;
  const text = t('credentialsText', { name: account.name, url, email: account.email, password });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the details stay visible to copy by hand
    }
  };
  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl grid place-items-center bg-[#dcf5e4] text-[#15803d]">
            <Check className="w-6 h-6" />
          </span>
          <div>
            <h4 className="text-lg font-black text-slate-900">{t('createdTitle')}</h4>
            <p className="text-xs font-semibold text-slate-500">{t('createdSub', { name: account.name })}</p>
          </div>
        </div>
        <dl className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-4 space-y-2 text-sm" dir="ltr">
          {[
            [t('loginPage'), url],
            [t('fEmail'), account.email],
            [t('fPassword'), password]
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="font-mono font-black text-slate-900 truncate select-all">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <button onClick={copy} className="px-3.5 py-2 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer">
            {copied ? <Check className="w-4 h-4 text-[#15803d]" /> : <Copy className="w-4 h-4" />} {copied ? t('copied') : t('copy')}
          </button>
          {account.phone && (
            <a href={whatsappLink(account.phone, text)} target="_blank" rel="noreferrer" className="px-3.5 py-2 btn-duo-secondary text-xs font-black flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-[#15803d]" /> {t('sendWhatsapp')}
            </a>
          )}
          <button onClick={onClose} className="ms-auto px-4 py-2 btn-duo-green text-xs font-black cursor-pointer">
            {t('done')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const PasswordModal: React.FC<{ account: AccountSummary; onClose: () => void; onSave: (pw: string) => void }> = ({ account, onClose, onSave }) => {
  const t = useT(teamMessages);
  const [pw, setPw] = useState(generatePassword);
  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pw.length >= 6) onSave(pw);
        }}
        className="space-y-3"
      >
        <h4 className="text-base font-black text-slate-900">{t('resetTitle', { name: account.name })}</h4>
        <p className="text-[11px] font-semibold text-slate-500">{t('resetSub')}</p>
        <PasswordInput value={pw} onChange={setPw} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="submit" disabled={pw.length < 6} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-50">
            {t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const ChildrenModal: React.FC<{
  account: AccountSummary;
  students: { id: string; studentName: string; parentName: string; parentUid?: string }[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}> = ({ account, students, onClose, onSave }) => {
  const t = useT(teamMessages);
  const [ids, setIds] = useState(account.children.map((c) => c.id));
  const [q, setQ] = useState('');
  const options = students
    .filter((s) => !q.trim() || s.studentName.toLowerCase().includes(q.trim().toLowerCase()) || s.parentName.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(ids.includes(b.id)) - Number(ids.includes(a.id)) || a.studentName.localeCompare(b.studentName));
  return (
    <Modal onClose={onClose}>
      <div className="space-y-3">
        <h4 className="text-base font-black text-slate-900">{t('linkTitle', { name: account.name })}</h4>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchChild')} className={`${inputCls} text-xs py-1.5`} />
        <ChildChecklist options={options} selected={ids} onChange={setIds} ownUid={account.id} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button onClick={() => onSave(ids)} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer">
            {t('save')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
