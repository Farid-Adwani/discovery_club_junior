import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarX, ChevronLeft, ChevronRight, MapPin, Plus, RotateCcw, Repeat, Trash2, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { scheduleMessages } from '../../i18n/messages/schedule';
import { WeekEntry, WeekEntryKind, addDays, buildClassWeek, buildWeek, startOfWeek, toISODate } from '../../utils/schedule';

const KIND_STYLE: Record<WeekEntryKind, string> = {
  class: 'bg-rose-50 border-rose-200 text-rose-900',
  course: 'bg-sky-50 border-sky-200 text-sky-900',
  event: 'bg-purple-50 border-purple-200 text-purple-900',
  meeting: 'bg-amber-50 border-amber-200 text-amber-900',
  other: 'bg-slate-50 border-slate-200 text-slate-800'
};

const KIND_DOT: Record<WeekEntryKind, string> = {
  class: 'bg-rose-500',
  course: 'bg-sky-500',
  event: 'bg-purple-500',
  meeting: 'bg-amber-500',
  other: 'bg-slate-400'
};

export interface WeekScheduleEditing {
  onAdd: (date: string) => void;
  onRemove: (entry: WeekEntry) => void;
  onCancelClass: (entry: WeekEntry) => void;
  onRestoreClass: (entry: WeekEntry) => void;
}

/**
 * Monday-to-Sunday calendar of the given students: their regular classes plus what the admin added.
 * With `classIds` (coach view) it shows those classes instead, once each, with their number of children.
 * Seven columns on large screens, a list of days on phones. With `editing`, shows the admin's buttons.
 */
export const WeekSchedule: React.FC<{
  students: Student[];
  classIds?: string[];
  /** Coach view: also shows what was added for this coach */
  trainerId?: string;
  showStudentNames?: boolean;
  editing?: WeekScheduleEditing;
}> = ({ students, classIds, trainerId, showStudentNames = false, editing }) => {
  const { groups, scheduleItems } = useApp();
  const t = useT(scheduleMessages);
  const { locale } = useLanguage();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () =>
      classIds
        ? buildClassWeek(weekStart, classIds, groups, scheduleItems, students, trainerId)
        : buildWeek(weekStart, students, groups, scheduleItems),
    [weekStart, students, classIds, trainerId, groups, scheduleItems]
  );
  const todayISO = toISODate(new Date());
  const isThisWeek = toISODate(startOfWeek(new Date())) === toISODate(weekStart);
  const nameOf = (id: string) => students.find((s) => s.id === id)?.studentName || '';
  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = `${weekStart.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })}`;
  const isEmpty = days.every((d) => d.length === 0);

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-slate-800">
          <CalendarDays className="w-4 h-4 text-rose-500" />
          <span>{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            title={t('prevWeek')}
            aria-label={t('prevWeek')}
            className="p-2 btn-duo-secondary cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            disabled={isThisWeek}
            className="px-3 py-2 btn-duo-secondary text-xs font-black cursor-pointer disabled:opacity-50"
          >
            {t('thisWeek')}
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            title={t('nextWeek')}
            aria-label={t('nextWeek')}
            className="p-2 btn-duo-secondary cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {isEmpty && !editing && (
        <div className="py-8 text-center text-slate-400 text-xs font-medium rounded-2xl border-2 border-dashed border-slate-200">
          {t('noActivities')}
        </div>
      )}

      {(!isEmpty || editing) && (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
          {days.map((entries, i) => {
            const day = addDays(weekStart, i);
            const iso = toISODate(day);
            const isToday = iso === todayISO;
            return (
              <div
                key={iso}
                // On phones, days without anything are hidden (unless the admin can add to them)
                className={`rounded-2xl border-2 p-2 space-y-2 min-h-[64px] ${
                  isToday ? 'border-rose-300 bg-rose-50/40' : 'border-slate-100 bg-white'
                } ${entries.length === 0 && !editing ? 'hidden lg:block' : ''}`}
              >
                <div className="flex items-center justify-between gap-1 px-1">
                  <div className="flex items-baseline gap-1.5 lg:flex-col lg:gap-0">
                    <span className={`text-[11px] font-black uppercase tracking-wide ${isToday ? 'text-rose-600' : 'text-slate-400'}`}>
                      {day.toLocaleDateString(locale, { weekday: 'short' })}
                    </span>
                    <span className={`text-sm font-black ${isToday ? 'text-rose-700' : 'text-slate-800'}`}>
                      {day.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {editing && (
                    <button
                      onClick={() => editing.onAdd(iso)}
                      title={t('add')}
                      aria-label={t('add')}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {entries.map((e) => {
                  const cancelled = !!e.cancellation;
                  return (
                    <div
                      key={e.key}
                      className={`rounded-xl border p-2 text-[11px] space-y-0.5 ${
                        cancelled ? 'bg-slate-50 border-slate-200 text-slate-400' : KIND_STYLE[e.kind]
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-1">
                        <span className="font-mono font-bold whitespace-nowrap" dir="ltr">
                          {e.startTime}–{e.endTime}
                        </span>
                        <span className="flex items-center gap-1 font-black uppercase text-[9px] tracking-wide">
                          <span className={`w-1.5 h-1.5 rounded-full ${cancelled ? 'bg-slate-300' : KIND_DOT[e.kind]}`} />
                          {cancelled ? t('cancelled') : t(`kind_${e.kind}`)}
                        </span>
                      </div>
                      <div className={`font-black text-xs leading-snug ${cancelled ? 'line-through' : ''}`}>{e.title}</div>
                      {e.location && (
                        <div className="flex items-center gap-1 opacity-80">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{e.location}</span>
                        </div>
                      )}
                      {e.notes && <div className="opacity-80 whitespace-pre-line">{e.notes}</div>}
                      {e.childCount !== undefined && !cancelled && (
                        <div className="flex items-center gap-1 opacity-80">
                          <Users className="w-3 h-3 shrink-0" />
                          <span>
                            {t('childrenCount', { count: e.childCount })}
                            {e.excusedCount ? ` · ${t('excusedCount', { count: e.excusedCount })}` : ''}
                          </span>
                        </div>
                      )}
                      {e.item?.recurrence === 'weekly' && (
                        <div className="flex items-center gap-1 opacity-70">
                          <Repeat className="w-3 h-3" />
                          <span>{t('weekly')}</span>
                        </div>
                      )}
                      {showStudentNames && (
                        <div className="pt-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-white/70 border border-current/10 font-bold text-[10px]">
                            {nameOf(e.studentId)}
                          </span>
                        </div>
                      )}

                      {editing && (
                        <div className="pt-1 flex justify-end">
                          {e.kind === 'class' ? (
                            cancelled ? (
                              <button
                                onClick={() => editing.onRestoreClass(e)}
                                className="flex items-center gap-1 font-black text-emerald-700 hover:underline cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{t('restore')}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => editing.onCancelClass(e)}
                                className="flex items-center gap-1 font-black text-rose-700 hover:underline cursor-pointer"
                              >
                                <CalendarX className="w-3 h-3" />
                                <span>{t('cancelThisDay')}</span>
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => editing.onRemove(e)}
                              className="flex items-center gap-1 font-black text-rose-700 hover:underline cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{t('remove')}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
