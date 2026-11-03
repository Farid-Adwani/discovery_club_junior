import React, { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useT } from '../../i18n';
import { parentMessages } from '../../i18n/messages/parent';
import { ageOf } from '../../utils/age';
import { isValidPhone } from '../../utils/contact';
import { toISODate } from '../../utils/schedule';
import { ModalPortal } from '../common/ModalPortal';

type ChildForm = { name: string; birthDate: string; notes: string };
const emptyChild = (): ChildForm => ({ name: '', birthDate: '', notes: '' });

// Children from 3 to 22 years old (same rule as the server)
const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return toISODate(d);
};

const inputCls =
  'w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-sm font-semibold';

/**
 * A signed-in parent registers more children. Their name, email and consent are already on the account;
 * the phone is asked only when the club doesn't have one yet.
 */
export const AddChildrenModal: React.FC<{ knownPhone: string; onClose: () => void; onAdded?: () => void }> = ({ knownPhone, onClose, onAdded }) => {
  const { addMyChildren } = useApp();
  const t = useT(parentMessages);
  const [children, setChildren] = useState<ChildForm[]>([emptyChild()]);
  const [phone, setPhone] = useState(knownPhone);
  const [saving, setSaving] = useState(false);
  const minBirth = yearsAgo(22);
  const maxBirth = yearsAgo(3);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (idx: number, patch: Partial<ChildForm>) => setChildren((list) => list.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const phoneOk = isValidPhone(phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = children.filter((c) => c.name.trim() && c.birthDate);
    if (!filled.length || !phoneOk) return;
    setSaving(true);
    const ok = await addMyChildren({
      parentPhone: phone.trim(),
      children: filled.map((c) => ({ name: c.name.trim(), birthDate: c.birthDate, ...(c.notes.trim() ? { notes: c.notes.trim() } : {}) }))
    });
    setSaving(false);
    if (ok) {
      onAdded?.();
      onClose();
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
        <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[92vh] overflow-y-auto duo-card hover:transform-none! bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600" /> {t('acTitle')}
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{t('acSubtitle')}</p>
            </div>
            <button type="button" onClick={onClose} aria-label={t('acCancel')} className="p-1.5 btn-duo-secondary cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {children.map((child, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-600">
                <span>{t('acChildN', { n: idx + 1 })}</span>
                {children.length > 1 && (
                  <button type="button" onClick={() => setChildren((list) => list.filter((_, i) => i !== idx))} className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> {t('acRemove')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <label className="block sm:col-span-3 space-y-1">
                  <span className="block font-black text-slate-700">{t('acName')}</span>
                  <input required autoFocus={idx === children.length - 1} maxLength={120} value={child.name} onChange={(e) => update(idx, { name: e.target.value })} placeholder={t('acNamePh')} className={inputCls} />
                </label>
                <label className="block sm:col-span-2 space-y-1">
                  <span className="block font-black text-slate-700">{t('acBirth')}</span>
                  <input type="date" required min={minBirth} max={maxBirth} value={child.birthDate} onChange={(e) => update(idx, { birthDate: e.target.value })} className={inputCls} />
                  {child.birthDate && <span className="block text-[11px] font-bold text-green-700">{t('acAge', { age: ageOf({ birthDate: child.birthDate, studentAge: 0 }) })}</span>}
                </label>
              </div>
              <label className="block space-y-1 text-xs">
                <span className="block font-black text-slate-700">{t('acNotes')}</span>
                <textarea rows={2} maxLength={1000} value={child.notes} onChange={(e) => update(idx, { notes: e.target.value })} placeholder={t('acNotesPh')} className={`${inputCls} resize-none`} />
              </label>
            </div>
          ))}

          {children.length < 10 && (
            <button type="button" onClick={() => setChildren((list) => [...list, emptyChild()])} className="w-full py-2.5 rounded-2xl border-2 border-dashed border-sky-300 text-sky-600 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-sky-50 cursor-pointer">
              <Plus className="w-4 h-4" /> {t('acAnother')}
            </button>
          )}

          {/* Only when the club has no phone for this parent yet */}
          {!isValidPhone(knownPhone) && (
            <label className="block space-y-1 text-xs">
              <span className="block font-black text-slate-700">{t('acPhone')}</span>
              <input type="tel" required dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('acPhonePh')} className={inputCls} />
              {phone && !phoneOk && <span className="block text-[11px] font-bold text-rose-600">{t('acPhoneBad')}</span>}
            </label>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2.5 btn-duo-secondary text-xs font-black cursor-pointer">
              {t('acCancel')}
            </button>
            <button type="submit" disabled={saving || !phoneOk} className="px-5 py-2.5 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <UserPlus className="w-4 h-4" />
              {children.length > 1 ? t('acSubmitN', { n: children.length }) : t('acSubmit')}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
