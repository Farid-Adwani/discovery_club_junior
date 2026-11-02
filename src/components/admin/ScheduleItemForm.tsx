import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ScheduleItem } from '../../types';
import { useT } from '../../i18n';
import { scheduleMessages } from '../../i18n/messages/schedule';
import { ModalPortal } from '../common/ModalPortal';

type AddableKind = Exclude<ScheduleItem['kind'], 'cancellation'>;
const KINDS: AddableKind[] = ['course', 'event', 'meeting', 'other'];

export type ScheduleItemFields = Pick<ScheduleItem, 'kind' | 'title' | 'recurrence' | 'date' | 'startTime' | 'endTime' | 'location' | 'notes'>;

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white';

/**
 * Admin: add a course / event / meeting to a calendar (children's or coaches').
 * `children` is where the caller lets the admin choose who it is for.
 */
export const ScheduleItemForm: React.FC<{
  date: string;
  defaultKind?: AddableKind;
  canSave: boolean;
  onClose: () => void;
  onSave: (fields: ScheduleItemFields) => Promise<boolean>;
  children: React.ReactNode;
}> = ({ date: initialDate, defaultKind = 'event', canSave, onClose, onSave, children }) => {
  const t = useT(scheduleMessages);
  const [date, setDate] = useState(initialDate);
  const [kind, setKind] = useState<AddableKind>(defaultKind);
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'weekly'>('once');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endTime <= startTime) return setError(t('endBeforeStart'));
    setIsSaving(true);
    const ok = await onSave({
      kind,
      title: title.trim(),
      recurrence,
      date,
      startTime,
      endTime,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined
    });
    setIsSaving(false);
    if (ok) onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
        <form
          role="dialog"
          aria-modal="true"
          onSubmit={submit}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border-2 border-slate-200 shadow-2xl overflow-hidden text-xs font-bold text-slate-700"
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
            <h4 className="text-base font-black text-slate-900">{t('addToSchedule')}</h4>
            <button type="button" onClick={onClose} aria-label={t('cancel')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1">{t('type')}</label>
                <select value={kind} onChange={(e) => setKind(e.target.value as AddableKind)} className={`${inputCls} cursor-pointer`}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`kind_${k}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1">{t('repeat')}</label>
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as 'once' | 'weekly')} className={`${inputCls} cursor-pointer`}>
                  <option value="once">{t('once')}</option>
                  <option value="weekly">{t('everyWeek')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1">{t('titleLabel')}</label>
              <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titlePlaceholder')} className={inputCls} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 sm:col-span-1">
                <label className="block mb-1">{recurrence === 'weekly' ? t('firstDate') : t('date')}</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block mb-1">{t('start')}</label>
                <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block mb-1">{t('end')}</label>
                <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block mb-1">{t('location')}</label>
              <input maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block mb-1">{t('notes')}</label>
              <textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
            </div>

            {children}

            {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
              {t('cancel')}
            </button>
            <button type="submit" disabled={isSaving || !canSave} className="px-5 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60">
              {t('add')}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};

/** Searchable checklist of people for the form above */
export const PeoplePicker: React.FC<{
  label: string;
  searchPlaceholder: string;
  people: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}> = ({ label, searchPlaceholder, people, selected, onChange }) => {
  const [search, setSearch] = useState('');
  const matching = people.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div>
      <label className="block mb-1">
        {label} ({selected.length})
      </label>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} className={`${inputCls} mb-1.5`} />
      <div className="scroll-panel max-h-36 rounded-xl border-2 border-slate-100 p-1.5 space-y-0.5">
        {matching.map((p) => (
          <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={(e) => onChange(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))}
              className="w-3.5 h-3.5"
            />
            <span className="font-semibold">{p.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
