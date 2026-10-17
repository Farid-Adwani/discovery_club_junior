import React, { useEffect, useState } from 'react';
import { GraduationCap, Layers, Sparkles, Wand2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { studentsMessages } from '../../i18n/messages/students';
import { weekdayName } from '../../utils/schedule';

/** The sum of the child's class prices (what they pay unless the admin sets a custom price) */
export const classPriceOf = (st: Student, groups: { id: string; pricePerMonth: number }[]) =>
  groups.filter((g) => st.groupIds.includes(g.id)).reduce((sum, g) => sum + g.pricePerMonth, 0);

/**
 * A child's monthly fee: by default the sum of their classes' prices (kept automatically in sync);
 * a custom price only when the admin chooses one. Also sets a lasting scholarship.
 */
export const PriceModal: React.FC<{ student: Student; onClose: () => void }> = ({ student, onClose }) => {
  const { groups, updateStudentPrice } = useApp();
  const t = useT(studentsMessages);
  const { locale } = useLanguage();
  const classes = groups.filter((g) => student.groupIds.includes(g.id));
  const classPrice = classPriceOf(student, groups);

  const [mode, setMode] = useState<'auto' | 'custom'>(student.customMonthlyPrice !== undefined ? 'custom' : 'auto');
  const [custom, setCustom] = useState<number>(student.customMonthlyPrice ?? classPrice);
  const [scholarship, setScholarship] = useState(student.paymentStatus === 'scholarship');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const diff = custom - classPrice;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const nextStatus: Student['paymentStatus'] | undefined = scholarship
      ? 'scholarship'
      : student.paymentStatus === 'scholarship'
      ? 'pending'
      : undefined;
    // A custom price equal to the classes' total is no custom price: the fee keeps following the classes
    await updateStudentPrice(student.id, mode === 'auto' || custom === classPrice ? null : custom, nextStatus);
    setSaving(false);
    onClose();
  };

  const option = (active: boolean) =>
    `w-full text-start p-3 rounded-2xl border-2 cursor-pointer transition-all ${
      active ? 'border-[#c11e3d] bg-[#fdf2f4] shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
    }`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="duo-card hover:transform-none! p-6 bg-white max-w-md w-full space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-black text-slate-800">{t('priceTitle', { name: student.studentName })}</h3>
          <button type="button" onClick={onClose} className="p-1.5 btn-duo-secondary cursor-pointer" aria-label={t('cancel')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Where the automatic price comes from */}
        <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-3 space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" /> {t('priceBreakdown')}
          </div>
          {classes.length === 0 ? (
            <p className="text-xs font-semibold text-slate-500">{t('priceNoClass')}</p>
          ) : (
            classes.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 truncate">
                  {g.name} <span className="text-slate-400 font-semibold">· {weekdayName(g.dayOfWeek, locale, 'short')}</span>
                </span>
                <span className="font-mono font-black text-slate-700">{g.pricePerMonth} DT</span>
              </div>
            ))
          )}
          <div className="flex items-center justify-between pt-1.5 border-t-2 border-dashed border-slate-200 text-xs">
            <span className="font-black text-slate-800">{t('priceTotal')}</span>
            <span className="font-mono font-black text-slate-900">{classPrice} DT</span>
          </div>
        </div>

        {/* Automatic or custom */}
        <div className="space-y-2">
          <button type="button" onClick={() => setMode('auto')} className={option(mode === 'auto')}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Wand2 className="w-4 h-4 text-[#c11e3d]" />
                {t('modeAuto')}
              </span>
              <span className="font-mono text-sm font-black text-slate-900">{classPrice} DT</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 ps-6">{t('modeAutoSub')}</p>
          </button>

          <div className={option(mode === 'custom')} onClick={() => setMode('custom')} role="button" tabIndex={0}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Sparkles className="w-4 h-4 text-[#c9a227]" />
                {t('modeCustom')}
              </span>
              {mode !== 'custom' && student.customMonthlyPrice === undefined && (
                <span className="text-[11px] font-semibold text-slate-400">—</span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 ps-6">{t('modeCustomSub')}</p>
            {mode === 'custom' && (
              <div className="mt-3 ps-6 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={custom}
                    autoFocus
                    onChange={(e) => setCustom(Number(e.target.value))}
                    className="w-28 px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-black font-mono focus:outline-none focus:border-[#c11e3d]"
                  />
                  <span className="text-xs font-black text-slate-500">DT</span>
                  {diff !== 0 && classPrice > 0 && (
                    <span className={`text-[11px] font-black ${diff < 0 ? 'text-[#15803d]' : 'text-[#c11e3d]'}`}>
                      {diff < 0
                        ? t('diffLess', { amount: -diff, pct: Math.round((-diff / classPrice) * 100) })
                        : t('diffMore', { amount: diff })}
                    </span>
                  )}
                </div>
                {classPrice > 0 && (
                  <div className="flex gap-1.5">
                    {[10, 20, 50].map((pct) => {
                      const v = Math.round(classPrice * (1 - pct / 100));
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustom(v);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-black border-2 cursor-pointer ${
                            custom === v ? 'bg-[#191919] text-white border-[#191919]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c11e3d]'
                          }`}
                        >
                          −{pct}%
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 cursor-pointer text-xs font-bold text-slate-700">
          <input type="checkbox" checked={scholarship} onChange={(e) => setScholarship(e.target.checked)} className="w-4 h-4 accent-[#c11e3d]" />
          <GraduationCap className="w-4 h-4 text-slate-500" />
          {t('scholarshipAll')}
        </label>

        <p className="text-[11px] font-semibold text-slate-400">{t('priceNote')}</p>

        <div className="flex justify-end gap-2 pt-2 border-t-2 border-slate-100">
          <button type="button" onClick={onClose} className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer">
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60">
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
};
