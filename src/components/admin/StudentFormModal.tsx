import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Search, UserPlus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AccountSummary, Student } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { studentsMessages } from '../../i18n/messages/students';
import { api } from '../../api';
import { ageOf } from '../../utils/age';
import { isValidEmail, isValidPhone } from '../../utils/contact';
import { resizePhoto } from '../../utils/image';
import { toISODate, weekdayName } from '../../utils/schedule';
import { ModalPortal } from '../common/ModalPortal';

type ParentMode = 'account' | 'contact' | 'none';

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-[#c11e3d] focus:bg-white';

// Children from 3 to 22 years old (same rule as the server)
const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return toISODate(d);
};

/**
 * Admin → Students: add a child (no `student`) or edit one, with every field of their file:
 * photo, name, birth date, notes, photo consent, registration date, parent (optional), classes, status, fee.
 */
export const StudentFormModal: React.FC<{ student?: Student; initialStatus?: 'waitlist' | 'accepted'; onClose: () => void }> = ({ student, initialStatus = 'waitlist', onClose }) => {
  const { groups, students, saveStudent, showToast } = useApp();
  const t = useT(studentsMessages);
  const { locale } = useLanguage();
  const editing = !!student;

  const [name, setName] = useState(student?.studentName || '');
  const [birthDate, setBirthDate] = useState(student?.birthDate || '');
  const [notes, setNotes] = useState(student?.notes || '');
  const [photoConsent, setPhotoConsent] = useState(!!student?.photoConsent);
  const [registeredAt, setRegisteredAt] = useState(student?.registeredAt || toISODate(new Date()));
  // undefined = unchanged, null = removed, string = new picture
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const startMode: ParentMode = student?.parentUid ? 'account' : student && (student.parentName || student.parentPhone || student.parentEmail) ? 'contact' : editing ? 'none' : 'account';
  const [mode, setMode] = useState<ParentMode>(startMode);
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null);
  const [parentQuery, setParentQuery] = useState('');
  const [parentUid, setParentUid] = useState(student?.parentUid || '');
  const [contact, setContact] = useState({
    name: student && !student.parentUid ? student.parentName : '',
    phone: student && !student.parentUid ? student.parentPhone : '',
    email: student && !student.parentUid ? student.parentEmail : ''
  });

  const [groupIds, setGroupIds] = useState<string[]>(student?.groupIds || []);
  const [status, setStatus] = useState<'waitlist' | 'accepted'>(student?.status || initialStatus);
  const [customFee, setCustomFee] = useState(student?.customMonthlyPrice !== undefined ? String(student.customMonthlyPrice) : '');
  const [scholarship, setScholarship] = useState(student?.paymentStatus === 'scholarship');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<AccountSummary[]>('/admin/accounts')
      .then((list) => setAccounts(list.filter((a) => a.role === 'parent')))
      .catch(() => setAccounts([]));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const q = parentQuery.trim().toLowerCase();
  const parentOptions = (accounts || [])
    .filter((a) => !q || a.id === parentUid || [a.name, a.email, ...a.children.map((c) => c.name)].some((x) => x.toLowerCase().includes(q)))
    .sort((a, b) => Number(b.id === parentUid) - Number(a.id === parentUid) || a.name.localeCompare(b.name))
    .slice(0, 6);
  const previousParent = editing && student?.parentUid && parentUid && parentUid !== student.parentUid ? accounts?.find((a) => a.id === student.parentUid) : undefined;

  // Places taken in each class, without counting this child
  const enrolled = useMemo(() => {
    const m = new Map<string, number>();
    students.forEach((s) => s.id !== student?.id && s.groupIds.forEach((g) => m.set(g, (m.get(g) || 0) + 1)));
    return m;
  }, [students, student?.id]);
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  const toggleGroup = (id: string) => setGroupIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const classPrice = groups.filter((g) => groupIds.includes(g.id)).reduce((sum, g) => sum + g.pricePerMonth, 0);

  const phoneOk = mode !== 'contact' || !contact.phone.trim() || isValidPhone(contact.phone);
  const emailOk = mode !== 'contact' || !contact.email.trim() || isValidEmail(contact.email);
  const feeOk = customFee.trim() === '' || (Number.isFinite(Number(customFee)) && Number(customFee) >= 0);
  const valid = name.trim() && birthDate && registeredAt && (mode !== 'account' || parentUid) && phoneOk && emailOk && feeOk;

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await resizePhoto(file));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image error', 'error');
    }
  };
  const shownPhoto = photo === undefined ? student?.photoURL : photo || undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    const ok = await saveStudent(
      {
        name: name.trim(),
        birthDate,
        notes: notes.trim(),
        photoConsent,
        registeredAt,
        groupIds,
        status: groupIds.length ? 'accepted' : status,
        ...(mode === 'account' ? { parentUid } : {}),
        ...(mode === 'contact' ? { parentName: contact.name.trim(), parentPhone: contact.phone.trim(), parentEmail: contact.email.trim() } : {}),
        customMonthlyPrice: customFee.trim() === '' ? null : Number(customFee),
        scholarship
      },
      student?.id,
      photo
    );
    setSaving(false);
    if (ok) onClose();
  };

  const section = 'text-[11px] font-black uppercase tracking-wider text-slate-400';
  const label = 'block space-y-1 text-xs font-bold text-slate-700';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4" onClick={onClose}>
        <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto duo-card hover:transform-none! bg-white p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#c11e3d]" /> {editing ? t('nsEditTitle', { name: student!.studentName }) : t('nsTitle')}
              </h4>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{editing ? t('nsEditSubtitle') : t('nsSubtitle')}</p>
            </div>
            <button type="button" onClick={onClose} aria-label={t('nsCancel')} className="p-1.5 btn-duo-secondary cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Child */}
          <div className="space-y-3">
            <div className={section}>{t('nsChild')}</div>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Photo */}
              <div className="flex sm:flex-col items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label={t('nsPhoto')}
                  className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-[#c11e3d] bg-slate-50 grid place-items-center cursor-pointer"
                >
                  {shownPhoto ? (
                    <img src={shownPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-[10px] font-black text-slate-400">
                      <Camera className="w-6 h-6" /> {t('nsPhotoAdd')}
                    </span>
                  )}
                </button>
                {shownPhoto && (
                  <div className="flex sm:flex-col gap-1 text-[11px] font-black">
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-slate-600 hover:text-slate-900 cursor-pointer">
                      {t('nsPhotoChange')}
                    </button>
                    <button type="button" onClick={() => setPhoto(null)} className="text-[#c11e3d] hover:underline cursor-pointer">
                      {t('nsPhotoRemove')}
                    </button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    pickPhoto(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                <label className={`${label} sm:col-span-2`}>
                  <span>{t('nsName')}</span>
                  <input required autoFocus={!editing} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                </label>
                <label className={label}>
                  <span>{t('nsBirth')}</span>
                  <input type="date" required min={yearsAgo(22)} max={yearsAgo(3)} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
                  {birthDate && <span className="block text-[11px] text-green-700">{t('nsAge', { age: ageOf({ birthDate, studentAge: 0 }) })}</span>}
                </label>
                <label className={label}>
                  <span>{t('nsRegistered')}</span>
                  <input type="date" required max={toISODate(new Date())} value={registeredAt} onChange={(e) => setRegisteredAt(e.target.value)} className={inputCls} />
                </label>
              </div>
            </div>
            <label className={label}>
              <span>{t('nsNotes')}</span>
              <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('nsNotesPh')} className={`${inputCls} resize-none`} />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} className="w-4 h-4 accent-[#c11e3d]" />
              {t('nsPhotoConsent')}
            </label>
          </div>

          {/* Parent */}
          <div className="space-y-3">
            <div className={section}>{t('nsParent')}</div>
            <div role="tablist" className="grid grid-cols-3 p-1 rounded-xl bg-slate-100">
              {(['account', 'contact', 'none'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`py-2 px-1 rounded-lg text-[11px] sm:text-xs font-black cursor-pointer transition-colors ${mode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t(m === 'account' ? 'nsParentAccount' : m === 'contact' ? 'nsParentContact' : 'nsParentNone')}
                </button>
              ))}
            </div>

            {mode === 'account' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input value={parentQuery} onChange={(e) => setParentQuery(e.target.value)} placeholder={t('nsSearchParent')} className={`${inputCls} ps-9 text-xs`} />
                </div>
                {accounts === null ? (
                  <p className="text-[11px] font-semibold text-slate-400">{t('nsLoading')}</p>
                ) : parentOptions.length === 0 ? (
                  <p className="text-[11px] font-semibold text-slate-400">{t('nsNoAccounts')}</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parentOptions.map((a) => {
                      const on = a.id === parentUid;
                      return (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => setParentUid(on ? '' : a.id)}
                            className={`w-full text-start p-2.5 rounded-xl border-2 cursor-pointer transition-colors ${on ? 'border-[#c11e3d] bg-[#fdf2f4]' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <span className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                              {on && <Check className="w-4 h-4 text-[#c11e3d]" />}
                              <span className="truncate">{a.name}</span>
                            </span>
                            <span className="block text-[11px] font-semibold text-slate-500 truncate" dir="ltr">
                              {a.email}
                            </span>
                            {a.children.length > 0 && <span className="block text-[11px] font-semibold text-slate-400 truncate">{a.children.map((c) => c.name.split(' ')[0]).join(', ')}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {previousParent ? (
                  <p className="text-[11px] font-bold text-amber-700">{t('nsMoveParentWarn', { from: previousParent.name })}</p>
                ) : (
                  <p className="text-[11px] font-semibold text-slate-400">{t('nsAccountHint')}</p>
                )}
              </div>
            )}

            {mode === 'contact' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={label}>
                    <span>{t('nsParentName')}</span>
                    <input maxLength={120} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={inputCls} />
                  </label>
                  <label className={label}>
                    <span>{t('nsParentPhone')}</span>
                    <input type="tel" dir="ltr" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inputCls} />
                    {!phoneOk && <span className="block text-[11px] text-rose-600">{t('nsPhoneBad')}</span>}
                  </label>
                  <label className={label}>
                    <span>{t('nsParentEmail')}</span>
                    <input type="email" dir="ltr" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inputCls} />
                    {!emailOk && <span className="block text-[11px] text-rose-600">{t('nsEmailBad')}</span>}
                  </label>
                </div>
                <p className="text-[11px] font-semibold text-slate-400">{t('nsContactHint')}</p>
              </div>
            )}

            {mode === 'none' && <p className="text-[11px] font-semibold text-slate-400">{t('nsNoneHint')}</p>}
          </div>

          {/* Classes */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <div className={section}>{t('nsClasses')}</div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedGroups.map((g) => {
                  const on = groupIds.includes(g.id);
                  const count = enrolled.get(g.id) || 0;
                  const full = !!g.maxCapacity && count >= g.maxCapacity && !on;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        disabled={full}
                        onClick={() => toggleGroup(g.id)}
                        className={`w-full text-start p-2.5 rounded-xl border-2 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'border-[#c11e3d] bg-[#fdf2f4]' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                          {on && <Check className="w-4 h-4 text-[#c11e3d] shrink-0" />}
                          <span className="truncate">{g.name}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                          <span className="truncate">
                            {weekdayName(g.dayOfWeek, locale)} · {g.timeSlot} · {g.pricePerMonth} DT
                          </span>
                          {g.maxCapacity ? <span className={full ? 'text-[#c11e3d] font-black' : ''}>{full ? t('nsFull') : t('nsPlaces', { n: count, max: g.maxCapacity })}</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Status: picking a class enrolls the child */}
          <div className="space-y-2">
            <div className={section}>{t('nsStatus')}</div>
            {groupIds.length ? (
              <p className="text-xs font-bold text-green-700">{t('nsStatusWithClass', { n: groupIds.length })}</p>
            ) : (
              <div className="inline-flex p-1 rounded-xl bg-slate-100">
                {(['waitlist', 'accepted'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    aria-pressed={status === s}
                    className={`px-4 py-2 rounded-lg text-xs font-black cursor-pointer ${status === s ? (s === 'waitlist' ? 'bg-amber-400 text-amber-950' : 'bg-[#191919] text-white') : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {t(s === 'waitlist' ? 'nsWaitlist' : 'nsAccepted')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fee */}
          <div className="space-y-2">
            <div className={section}>{t('nsFee')}</div>
            <div className="flex flex-wrap items-end gap-3">
              <label className={`${label} w-44`}>
                <span>{t('nsCustomFee')}</span>
                <input type="number" min={0} step="0.001" inputMode="decimal" value={customFee} disabled={scholarship} onChange={(e) => setCustomFee(e.target.value)} placeholder={String(classPrice)} className={`${inputCls} font-mono disabled:opacity-50`} />
              </label>
              <label className="flex items-center gap-2 pb-2.5 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={scholarship} onChange={(e) => setScholarship(e.target.checked)} className="w-4 h-4 accent-[#c11e3d]" />
                {t('nsScholarship')}
              </label>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">{t('nsFeeHint', { price: classPrice })}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t-2 border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 btn-duo-secondary text-xs font-black cursor-pointer">
              {t('nsCancel')}
            </button>
            <button type="submit" disabled={!valid || saving} className="px-5 py-2.5 btn-duo-green text-sm font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <UserPlus className="w-4 h-4" /> {editing ? t('nsSaveEdit') : t('nsSave')}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
