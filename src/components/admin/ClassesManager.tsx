import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  ImagePlus,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CLASS_DEFAULT_IMAGE, Group, Student, WEEK_DAYS, WeekDay } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { classesMessages } from '../../i18n/messages/classes';
import { ageOf } from '../../utils/age';
import { parseTimeSlot, weekdayName } from '../../utils/schedule';
import { resizePhoto } from '../../utils/image';
import { useConfirm } from '../common/ConfirmProvider';

const VIEW_KEY = 'dcj-classes-view';
const CLASS_COLORS = ['#c11e3d', '#191919', '#6a0d1f', '#c9a227', '#4f4f4f', '#0f766e'];

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-400 focus:bg-white';

/** Children of a class in a stable order, so each one keeps the same number (1, 2, 3…) */
const byName = (a: Student, b: Student) => a.studentName.localeCompare(b.studentName);

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Do two "HH:MM - HH:MM" slots on the same day overlap? */
function overlaps(a: string, b: string) {
  const [as, ae] = parseTimeSlot(a).map(toMinutes);
  const [bs, be] = parseTimeSlot(b).map(toMinutes);
  return as < be && bs < ae;
}

type Draft = Omit<Group, 'id' | 'timeSlot'> & { id?: string; start: string; end: string };

/** Room and trainer double bookings for a class (existing or being edited) */
function findConflicts(draft: Pick<Group, 'dayOfWeek' | 'room' | 'trainerIds'> & { id?: string; timeSlot: string }, groups: Group[]) {
  const out: { kind: 'room' | 'trainer'; other: Group; trainerId?: string }[] = [];
  for (const g of groups) {
    if (g.id === draft.id || g.dayOfWeek !== draft.dayOfWeek || !overlaps(g.timeSlot, draft.timeSlot)) continue;
    if (draft.room && g.room.trim().toLowerCase() === draft.room.trim().toLowerCase()) out.push({ kind: 'room', other: g });
    for (const id of draft.trainerIds) if (g.trainerIds.includes(id)) out.push({ kind: 'trainer', other: g, trainerId: id });
  }
  return out;
}

/** Admin "Classes" tab: cards or list, create / edit with conflict checks, roster per class. */
export const ClassesManager: React.FC = () => {
  const {
    groups,
    trainers,
    students,
    createGroup,
    updateGroup,
    deleteGroup,
    assignStudentToGroup,
    removeStudentFromGroup,
    showToast
  } = useApp();
  const t = useT(classesMessages);
  const { locale } = useLanguage();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState<'all' | WeekDay>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [rosterId, setRosterId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
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

  const membersOf = (groupId: string) => students.filter((s) => s.groupIds.includes(groupId));
  const classColor = (id: string) => CLASS_COLORS[Math.max(0, groups.findIndex((g) => g.id === id)) % CLASS_COLORS.length];
  const trainerName = (id: string) => trainers.find((tr) => tr.id === id)?.name || '';
  const dayOrder = (d: WeekDay) => WEEK_DAYS.indexOf(d);

  // Sorted by day of the week, then start time
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => dayFilter === 'all' || g.dayOfWeek === dayFilter)
      .filter(
        (g) =>
          !q ||
          g.name.toLowerCase().includes(q) ||
          g.room.toLowerCase().includes(q) ||
          (g.description || '').toLowerCase().includes(q) ||
          g.trainerIds.some((id) => trainerName(id).toLowerCase().includes(q))
      )
      .sort((a, b) => dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek) || a.timeSlot.localeCompare(b.timeSlot));
  }, [groups, search, dayFilter, trainers]);

  const usedDays = WEEK_DAYS.filter((d) => groups.some((g) => g.dayOfWeek === d));

  const openNew = () => {
    setFormError('');
    setDraft({
      name: '',
      description: '',
      pricePerMonth: 0,
      trainerIds: [],
      dayOfWeek: 'Saturday',
      start: '09:00',
      end: '11:00',
      room: '',
      maxCapacity: undefined,
      imageUrl: undefined
    });
  };

  const openEdit = (g: Group) => {
    const [start, end] = parseTimeSlot(g.timeSlot);
    setFormError('');
    setDraft({ ...g, start, end });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imageUrl = await resizePhoto(file, 800, 400);
      setDraft((d) => (d ? { ...d, imageUrl } : d));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('imageReadError'), 'error');
    }
  };

  const draftSlot = draft ? `${draft.start} - ${draft.end}` : '';
  const draftConflicts = draft && draft.start && draft.end && draft.end > draft.start ? findConflicts({ ...draft, timeSlot: draftSlot }, groups) : [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (draft.end <= draft.start) return setFormError(t('endBeforeStart'));
    if (draft.trainerIds.length === 0) return setFormError(t('chooseTrainer'));
    const enrolled = draft.id ? membersOf(draft.id).length : 0;
    if (draft.maxCapacity && draft.maxCapacity < enrolled) return setFormError(t('capacityTooLow', { count: enrolled }));
    const { start: _s, end: _e, id, ...rest } = draft;
    const group = {
      ...rest,
      name: rest.name.trim(),
      description: rest.description?.trim() || undefined,
      room: rest.room.trim(),
      timeSlot: draftSlot,
      imageUrl: rest.imageUrl || undefined
    };
    setIsSaving(true);
    const ok = id ? await updateGroup({ ...group, id }) : await createGroup(group);
    setIsSaving(false);
    if (ok) setDraft(null);
  };

  const handleDelete = async (g: Group) => {
    const ok = await confirm({
      title: t('delete') + ` "${g.name}"?`,
      message: seatsText(membersOf(g.id).length, g.maxCapacity),
      confirmLabel: t('delete'),
      danger: true
    });
    if (ok) deleteGroup(g.id);
  };

  /** "3 / 12 children", or "3 children" for a class without a limit */
  const seatsText = (enrolled: number, max?: number) =>
    max ? t('seats', { enrolled, max }) : t('childrenCount', { count: enrolled });

  const capacityInfo = (g: Group) => {
    const enrolled = membersOf(g.id).length;
    if (!g.maxCapacity) {
      return { enrolled, ratio: 0, limited: false, label: t('noLimit'), tone: 'text-slate-400', bar: '' };
    }
    const ratio = enrolled / g.maxCapacity;
    const left = g.maxCapacity - enrolled;
    return {
      limited: true,
      enrolled,
      ratio,
      label: left <= 0 ? t('full') : ratio >= 0.8 ? t('almostFull') : t('placesLeft', { count: left }),
      tone: left <= 0 ? 'text-rose-600' : ratio >= 0.8 ? 'text-amber-600' : 'text-emerald-600',
      bar: left <= 0 ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
    };
  };

  const ConflictBadge: React.FC<{ g: Group }> = ({ g }) => {
    const conflicts = findConflicts(g, groups);
    if (!conflicts.length) return null;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black"
        title={conflicts
          .map((c) => (c.kind === 'room' ? t('conflictRoom', { room: g.room, name: c.other.name }) : t('conflictTrainer', { trainer: trainerName(c.trainerId!), name: c.other.name })))
          .join('\n')}
      >
        <AlertTriangle className="w-3 h-3" />
        {conflicts.length}
      </span>
    );
  };

  const rosterGroup = groups.find((g) => g.id === rosterId) || null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="duo-card p-5 sm:p-6 bg-white space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-rose-500" />
              {t('title')} <span className="text-slate-400 font-mono text-sm">({groups.length})</span>
            </h3>
            <p className="text-xs font-medium text-slate-500">{t('subtitle')}</p>
          </div>
          <button onClick={openNew} className="px-4 py-2.5 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" />
            {t('newClass')}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sky-400 focus:bg-white"
            />
          </div>
          <div className="flex p-1 rounded-xl bg-slate-100 shrink-0">
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
        </div>

        {/* Day chips */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...usedDays] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDayFilter(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-black border-2 cursor-pointer transition-colors ${
                dayFilter === d ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {d === 'all' ? t('allDays') : weekdayName(d, locale)}
              <span className="ms-1.5 opacity-60 font-mono">{d === 'all' ? groups.length : groups.filter((g) => g.dayOfWeek === d).length}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-14 text-center text-slate-400 text-sm font-medium rounded-3xl border-2 border-dashed border-slate-200 bg-white">
          {groups.length === 0 ? t('emptyAll') : t('emptySearch')}
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((g) => {
            const cap = capacityInfo(g);
            const members = membersOf(g.id);
            return (
              <article key={g.id} className="duo-card bg-white overflow-hidden flex flex-col">
                <div className="relative p-4 pt-20 text-white bg-slate-900 overflow-hidden">
                  <img src={g.imageUrl || CLASS_DEFAULT_IMAGE} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  {/* Keeps the text readable on any picture, tinted with the class colour */}
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(to top, ${classColor(g.id)} 0%, ${classColor(g.id)}cc 38%, transparent 100%)` }}
                  />
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-white/70 font-mono">{t('pricePerMonthValue', { price: g.pricePerMonth })}</div>
                      <h4 className="text-base font-black leading-snug">{g.name}</h4>
                    </div>
                    <ConflictBadge g={g} />
                  </div>
                  <div className="relative mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15">
                      <CalendarDays className="w-3 h-3" />
                      {weekdayName(g.dayOfWeek, locale)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15" dir="ltr">
                      <Clock className="w-3 h-3" />
                      {g.timeSlot}
                    </span>
                    {g.room && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15">
                        <MapPin className="w-3 h-3" />
                        {g.room}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs flex-1">
                  {g.description && <p className="text-slate-600 font-medium leading-relaxed line-clamp-2">{g.description}</p>}
                  {/* Trainers */}
                  <div className="flex flex-wrap gap-1.5">
                    {g.trainerIds.length === 0 && <span className="text-rose-600 font-bold">{t('noTrainer')}</span>}
                    {g.trainerIds.map((id) => {
                      const tr = trainers.find((x) => x.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1.5 ps-0.5 pe-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                          {tr?.avatar ? (
                            <img src={tr.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-slate-300" />
                          )}
                          {tr?.name || id}
                        </span>
                      );
                    })}
                  </div>

                  {/* Capacity */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-500">{seatsText(cap.enrolled, g.maxCapacity)}</span>
                      <span className={`font-black ${cap.tone}`}>{cap.label}</span>
                    </div>
                    {cap.limited && (
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${cap.bar}`} style={{ width: `${Math.min(100, cap.ratio * 100)}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Children preview */}
                  <button
                    type="button"
                    onClick={() => setRosterId(g.id)}
                    className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer"
                  >
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                      {[...members].sort(byName).slice(0, 6).map((s) =>
                        s.photoURL ? (
                          <img key={s.id} src={s.photoURL} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-white" />
                        ) : (
                          <span key={s.id} className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 border-2 border-white flex items-center justify-center text-[9px] font-black">
                            {s.studentName.slice(0, 1)}
                          </span>
                        )
                      )}
                      {members.length === 0 && <span className="text-slate-400 font-medium ps-1">{t('noChildren')}</span>}
                    </div>
                    <span className="flex items-center gap-1 font-black text-sky-700 shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      {t('roster')}
                    </span>
                  </button>
                </div>

                <div className="px-4 py-3 border-t-2 border-slate-100 bg-slate-50/60 flex justify-end gap-1.5">
                  <button onClick={() => openEdit(g)} className="px-3 py-1.5 btn-duo-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(g)}
                    aria-label={t('delete')}
                    title={t('delete')}
                    className="p-2 btn-duo-secondary text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="duo-card bg-white overflow-hidden">
          <div className="scroll-panel max-h-[70vh]">
            <table className="data-table w-full text-start text-xs font-semibold">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-black">
                  <th className="py-2">{t('colClass')}</th>
                  <th className="py-2">{t('colWhen')}</th>
                  <th className="py-2">{t('colRoom')}</th>
                  <th className="py-2">{t('colTrainers')}</th>
                  <th className="py-2">{t('colChildren')}</th>
                  <th className="py-2 text-end">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((g) => {
                  const cap = capacityInfo(g);
                  return (
                    <tr key={g.id}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="relative w-14 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                            <img src={g.imageUrl || CLASS_DEFAULT_IMAGE} alt="" loading="lazy" className="w-full h-full object-cover" />
                            <span className="absolute inset-y-0 start-0 w-1" style={{ background: classColor(g.id) }} />
                          </span>
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 flex items-center gap-1.5">
                              {g.name} <ConflictBadge g={g} />
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[16rem]">
                              <span className="font-mono font-black">{t('pricePerMonthValue', { price: g.pricePerMonth })}</span>
                              {g.description && ` · ${g.description}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-700">{weekdayName(g.dayOfWeek, locale)}</div>
                        <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                          {g.timeSlot}
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-600">{g.room || '—'}</td>
                      <td className="py-2.5 text-slate-600">{g.trainerIds.map(trainerName).join(', ') || t('noTrainer')}</td>
                      <td className="py-2.5">
                        <button type="button" onClick={() => setRosterId(g.id)} className="text-start cursor-pointer group">
                          <div className="font-black text-slate-800 group-hover:text-sky-700">{seatsText(cap.enrolled, g.maxCapacity)}</div>
                          <div className={`text-[10px] font-black ${cap.tone}`}>{cap.label}</div>
                        </button>
                      </td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(g)} aria-label={t('edit')} title={t('edit')} className="p-1.5 btn-duo-secondary cursor-pointer">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(g)}
                            aria-label={t('delete')}
                            title={t('delete')}
                            className="p-1.5 btn-duo-secondary text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / edit */}
      {draft && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setDraft(null)}>
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="duo-card bg-white w-full max-w-lg p-5 space-y-3 max-h-[92vh] overflow-y-auto text-xs font-bold text-slate-700"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-slate-900">{draft.id ? t('editClass') : t('newClass')}</h4>
              <button type="button" onClick={() => setDraft(null)} aria-label={t('close')} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block mb-1">{t('image')}</label>
              <div className="relative aspect-[2/1] rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200">
                <img src={draft.imageUrl || CLASS_DEFAULT_IMAGE} alt="" className="w-full h-full object-cover" />
                {!draft.imageUrl && (
                  <span className="absolute top-2 start-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-black text-slate-600">
                    {t('defaultImage')}
                  </span>
                )}
                <div className="absolute bottom-2 end-2 flex gap-1.5">
                  {draft.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, imageUrl: undefined })}
                      className="px-2.5 py-1.5 rounded-lg bg-white/95 text-rose-600 text-[11px] font-black shadow cursor-pointer hover:bg-white"
                    >
                      {t('useDefaultImage')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-white/95 text-slate-800 text-[11px] font-black shadow flex items-center gap-1 cursor-pointer hover:bg-white"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {draft.imageUrl ? t('changeImage') : t('uploadImage')}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </div>
            </div>

            <div>
              <label className="block mb-1">{t('name')}</label>
              <input
                required
                maxLength={120}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t('namePlaceholder')}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block mb-1">{t('description')}</label>
              <textarea
                rows={3}
                maxLength={3000}
                value={draft.description || ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                className={`${inputCls} resize-y`}
              />
            </div>
            <div>
              <label className="block mb-1">{t('price')}</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={0}
                  max={10000}
                  value={draft.pricePerMonth}
                  onChange={(e) => setDraft({ ...draft, pricePerMonth: Number(e.target.value) })}
                  className={`${inputCls} font-mono pe-20`}
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">{t('perMonthUnit')}</span>
              </div>
            </div>

            <div>
              <label className="block mb-1">{t('day')}</label>
              <div className="grid grid-cols-7 gap-1">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDraft({ ...draft, dayOfWeek: d })}
                    className={`py-2 rounded-lg text-[11px] font-black border-2 cursor-pointer ${
                      draft.dayOfWeek === d ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {weekdayName(d, locale, 'short')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block mb-1">{t('start')}</label>
                <input type="time" required value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block mb-1">{t('end')}</label>
                <input type="time" required value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block mb-1">{t('capacity')}</label>
                <input
                  type="number"
                  min={Math.max(1, draft.id ? membersOf(draft.id).length : 1)}
                  max={500}
                  value={draft.maxCapacity ?? ''}
                  onChange={(e) => setDraft({ ...draft, maxCapacity: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder={t('noLimit')}
                  title={t('capacityHint')}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>

            <div>
              <label className="block mb-1">{t('room')}</label>
              <input
                maxLength={60}
                value={draft.room}
                onChange={(e) => setDraft({ ...draft, room: e.target.value })}
                placeholder={t('roomPlaceholder')}
                list="class-rooms"
                className={inputCls}
              />
              {/* Rooms already used, to keep names consistent (and conflicts detectable) */}
              <datalist id="class-rooms">
                {[...new Set(groups.map((g) => g.room).filter(Boolean))].map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block mb-1">{t('trainers')}</label>
              <div className="flex flex-wrap gap-1.5">
                {trainers.map((tr) => {
                  const on = draft.trainerIds.includes(tr.id);
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, trainerIds: on ? draft.trainerIds.filter((id) => id !== tr.id) : [...draft.trainerIds, tr.id] })
                      }
                      className={`px-2.5 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer ${
                        on ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'
                      }`}
                    >
                      {on ? '✓ ' : '+ '}
                      {tr.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {draftConflicts.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-black">
                  <AlertTriangle className="w-4 h-4" />
                  {t('conflictsTitle')}
                </div>
                {draftConflicts.map((c, i) => (
                  <div key={i} className="font-semibold">
                    {c.kind === 'room'
                      ? t('conflictRoom', { room: draft.room, name: c.other.name })
                      : t('conflictTrainer', { trainer: trainerName(c.trainerId!), name: c.other.name })}
                  </div>
                ))}
              </div>
            )}

            {formError && <p className="text-[11px] font-bold text-rose-600">{formError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setDraft(null)} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
                {t('cancel')}
              </button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60">
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Roster */}
      {rosterGroup && (
        <RosterModal
          group={rosterGroup}
          color={classColor(rosterGroup.id)}
          members={membersOf(rosterGroup.id)}
          candidates={students.filter((s) => !s.groupIds.includes(rosterGroup.id))}
          onClose={() => setRosterId(null)}
          onAdd={async (studentIds) => {
            // One at a time: the server checks the capacity on each addition
            for (const id of studentIds) await assignStudentToGroup(id, rosterGroup.id);
          }}
          onRemove={async (s) => {
            const ok = await confirm({
              title: t('confirmRemoveChild', { child: s.studentName, name: rosterGroup.name }),
              confirmLabel: t('removeChild'),
              danger: true
            });
            if (ok) removeStudentFromGroup(s.id, rosterGroup.id);
          }}
        />
      )}
    </div>
  );
};

/** Most empty seats drawn after the numbered children (a big class shows the rest as a count) */
const MAX_EMPTY_SEATS = 8;

const Avatar: React.FC<{ student: Student; className: string }> = ({ student, className }) =>
  student.photoURL ? (
    <img src={student.photoURL} alt="" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs`}>
      {student.studentName.slice(0, 1)}
    </span>
  );

/** The children of one class: a numbered register on one side, a multi-select picker to add children on the other */
const RosterModal: React.FC<{
  group: Group;
  color: string;
  members: Student[];
  candidates: Student[];
  onClose: () => void;
  onAdd: (studentIds: string[]) => Promise<void>;
  onRemove: (student: Student) => void;
}> = ({ group, color, members, candidates, onClose, onAdd, onRemove }) => {
  const t = useT(classesMessages);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const register = [...members].sort(byName);
  const freeSeats = group.maxCapacity ? Math.max(0, group.maxCapacity - members.length) : Infinity;
  const isFull = freeSeats === 0;

  const q = query.trim().toLowerCase();
  const shown = candidates
    .filter((s) => !q || s.studentName.toLowerCase().includes(q) || s.parentName.toLowerCase().includes(q))
    .sort(byName);

  const toggle = (id: string) =>
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : sel.length < freeSeats ? [...sel, id] : sel));

  const handleAdd = async () => {
    setIsAdding(true);
    await onAdd(selected);
    setIsAdding(false);
    setSelected([]);
    setQuery('');
  };

  const emptySeats = group.maxCapacity ? Math.min(freeSeats, MAX_EMPTY_SEATS) : 0;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('rosterTitle', { name: group.name })}
        onClick={(e) => e.stopPropagation()}
        className="duo-card bg-white w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Banner */}
        <div className="relative px-5 pt-14 pb-4 text-white bg-slate-900 shrink-0">
          <img src={group.imageUrl || CLASS_DEFAULT_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${color} 0%, ${color}cc 45%, transparent 100%)` }} />
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="absolute top-3 end-3 p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/70 font-mono">{t('pricePerMonthValue', { price: group.pricePerMonth })}</div>
              <h4 className="text-lg font-black leading-snug">{t('rosterTitle', { name: group.name })}</h4>
            </div>
            <div className="text-end">
              <div className="text-2xl font-black font-mono leading-none">
                {members.length}
                {group.maxCapacity && <span className="text-white/60 text-base"> / {group.maxCapacity}</span>}
              </div>
              <div className="text-[11px] font-bold text-white/80">
                {isFull ? t('full') : group.maxCapacity ? t('placesLeft', { count: freeSeats }) : t('noLimit')}
              </div>
            </div>
          </div>
          {group.maxCapacity && (
            <div className="relative mt-3 h-1.5 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (members.length / group.maxCapacity) * 100)}%` }} />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 flex-1 min-h-0 divide-y-2 md:divide-y-0 md:divide-x-2 rtl:divide-x-reverse divide-slate-100">
          {/* Numbered register */}
          <section className="flex flex-col min-h-0">
            <h5 className="px-5 pt-4 pb-2 text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {t('inClass')}
            </h5>
            <ol className="px-5 pb-5 space-y-1.5 overflow-y-auto">
              {register.length === 0 && (
                <li className="py-6 text-center text-xs text-slate-400 font-medium rounded-2xl border-2 border-dashed border-slate-200">{t('noChildren')}</li>
              )}
              {register.map((s, i) => (
                <li key={s.id} className="group flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span
                    className="w-8 h-8 rounded-lg text-white font-black font-mono text-xs flex items-center justify-center shrink-0"
                    style={{ background: color }}
                    title={t('numberN', { n: i + 1 })}
                  >
                    {pad(i + 1)}
                  </span>
                  <Avatar student={s} className="w-9 h-9 rounded-lg shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 truncate">{s.studentName}</div>
                    <div className="text-[11px] text-slate-500 font-semibold truncate">
                      {t('years', { age: ageOf(s) })} · {s.parentName}
                      {s.status === 'waitlist' && <span className="ms-1 text-amber-700">· {t('pending')}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(s)}
                    aria-label={t('removeChild')}
                    title={t('removeChild')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {/* Free seats keep counting after the last child */}
              {Array.from({ length: emptySeats }, (_, i) => (
                <li key={`seat-${i}`} className="flex items-center gap-2.5 p-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-300">
                  <span className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 font-black font-mono text-xs flex items-center justify-center shrink-0">
                    {pad(register.length + i + 1)}
                  </span>
                  <span className="text-xs font-bold">{t('freeSeat')}</span>
                </li>
              ))}
              {freeSeats !== Infinity && freeSeats > emptySeats && (
                <li className="text-center text-[11px] font-bold text-slate-400 pt-1">{t('moreFreeSeats', { count: freeSeats - emptySeats })}</li>
              )}
            </ol>
          </section>

          {/* Picker */}
          <section className="flex flex-col min-h-0 bg-slate-50/60">
            <h5 className="px-5 pt-4 pb-2 text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              {t('addChildren')}
            </h5>
            {isFull ? (
              <p className="mx-5 mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold text-center">{t('classFullHint')}</p>
            ) : candidates.length === 0 ? (
              <p className="mx-5 mb-5 py-6 text-center text-xs text-slate-400 font-medium rounded-2xl border-2 border-dashed border-slate-200">
                {t('noCandidates')}
              </p>
            ) : (
              <>
                <div className="px-5 pb-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('searchChild')}
                      className="w-full ps-9 pe-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
                <ul className="px-5 pb-3 space-y-1.5 overflow-y-auto flex-1 min-h-[8rem]">
                  {shown.length === 0 && <li className="py-6 text-center text-xs text-slate-400 font-medium">{t('noCandidateMatch')}</li>}
                  {shown.map((s) => {
                    const on = selected.includes(s.id);
                    const blocked = !on && selected.length >= freeSeats;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => toggle(s.id)}
                          disabled={blocked}
                          aria-pressed={on}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl border-2 text-start transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            on ? 'bg-sky-50 border-sky-400' : 'bg-white border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                              on ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {on && <Check className="w-3.5 h-3.5" />}
                          </span>
                          <Avatar student={s} className="w-8 h-8 rounded-lg shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-slate-900 truncate">{s.studentName}</div>
                            <div className="text-[10px] text-slate-500 font-semibold truncate">
                              {t('years', { age: ageOf(s) })} · {s.parentName}
                              {s.groupIds.length > 0 && ` · ${t('inOtherClasses', { count: s.groupIds.length })}`}
                            </div>
                          </div>
                          {s.status === 'waitlist' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black shrink-0">{t('pending')}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="px-5 py-3 border-t-2 border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500">
                    {selected.length === 0
                      ? t('selectHint')
                      : freeSeats !== Infinity && selected.length >= freeSeats
                        ? t('selectionFillsClass')
                        : t('selectedCount', { count: selected.length })}
                  </span>
                  <button
                    onClick={handleAdd}
                    disabled={selected.length === 0 || isAdding}
                    className="px-4 py-2 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {t('addSelected', { count: selected.length })}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
