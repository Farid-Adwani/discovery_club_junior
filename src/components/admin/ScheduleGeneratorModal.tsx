import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calendar, CheckCircle2, AlertTriangle, Sparkles, Clock, MapPin, User } from 'lucide-react';
import { useLanguage, useT } from '../../i18n';
import { WEEK_DAYS, WeekDay } from '../../types';
import { weekdayName } from '../../utils/schedule';
import { adminMessages } from '../../i18n/messages/admin';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleGeneratorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { groups, trainers } = useApp();
  const t = useT(adminMessages);
  const { locale } = useLanguage();
  const dayLabel = (day: 'All' | WeekDay) => (day === 'All' ? t('statusAll') : weekdayName(day, locale));
  const [selectedDay, setSelectedDay] = useState<'All' | WeekDay>('All');
  // Only the days that have classes
  const dayOptions: ('All' | WeekDay)[] = ['All', ...WEEK_DAYS.filter((d) => groups.some((g) => g.dayOfWeek === d))];

  if (!isOpen) return null;

  // Conflict detection algorithm
  const checkConflicts = () => {
    const conflicts: { reason: string; groupA: string; groupB: string }[] = [];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const g1 = groups[i];
        const g2 = groups[j];
        if (g1.dayOfWeek === g2.dayOfWeek && g1.timeSlot === g2.timeSlot) {
          if (g1.trainerIds.some((id) => g2.trainerIds.includes(id))) {
            conflicts.push({
              reason: 'Trainer Double-Booked',
              groupA: g1.name,
              groupB: g2.name
            });
          }
          if (g1.room === g2.room) {
            conflicts.push({
              reason: 'Room Collision',
              groupA: g1.name,
              groupB: g2.name
            });
          }
        }
      }
    }
    return conflicts;
  };

  const detectedConflicts = checkConflicts();

  const filteredGroups = selectedDay === 'All'
    ? groups
    : groups.filter((g) => g.dayOfWeek === selectedDay);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t('sgTitle')}</h2>
              <p className="text-xs text-slate-400">
                {t('sgSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title={t('sgClose')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Status Banner */}
        <div className="my-4 p-3.5 rounded-xl border text-xs flex items-center justify-between ${detectedConflicts.length === 0 ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/40 border-rose-700/50 text-rose-300'}">
          <div className="flex items-center gap-2.5">
            {detectedConflicts.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {detectedConflicts.length === 0
                ? t('sgAllVerified', { count: groups.length })
                : t('sgConflictsFound', { count: detectedConflicts.length })}
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">{t('sgOverlaps', { count: 0 })}</span>
        </div>

        {/* Day Filter */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-400">{t('sgFilterDay')}</span>
          {dayOptions.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedDay === day
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {dayLabel(day)}
            </button>
          ))}
        </div>

        {/* Timetable Matrix */}
        <div className="flex-1 overflow-y-auto pe-1 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredGroups.map((group) => {
              const trainerNames = trainers.filter((tr) => group.trainerIds.includes(tr.id)).map((tr) => tr.name).join(', ');

              return (
                <div
                  key={group.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{group.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800">
                      {dayLabel(group.dayOfWeek)}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{group.timeSlot}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>{group.room}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('sgTrainers', { names: trainerNames || t('sgUnassigned') })}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                    <span className="font-mono">{t('sgPrice', { price: group.pricePerMonth })}</span>
                    <span className="font-mono text-emerald-400">{t('sgScheduled')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            {t('sgClosePreview')}
          </button>
        </div>
      </div>
    </div>
  );
};
