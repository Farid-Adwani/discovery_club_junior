import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

export const ScheduleMatrixPage: React.FC = () => {
  const { groups, trainers, programs, navigateTo } = useApp();
  const [selectedDay, setSelectedDay] = useState<'All' | 'Saturday' | 'Sunday' | 'Wednesday'>('All');

  // Conflict detection algorithm
  const checkConflicts = () => {
    const conflicts: { reason: string; groupA: string; groupB: string }[] = [];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const g1 = groups[i];
        const g2 = groups[j];
        if (g1.dayOfWeek === g2.dayOfWeek && g1.timeSlot === g2.timeSlot) {
          if (g1.trainerId === g2.trainerId) {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-6">
        <div>
          <button
            onClick={() => navigateTo('admin')}
            className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-sky-600 transition-colors cursor-pointer mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Admin Dashboard</span>
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-black uppercase mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Automated Timetable Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Schedule Conflict Detector & Room Matrix
          </h1>
        </div>

        {/* Day Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-white border-2 border-slate-200 rounded-2xl text-xs">
          {(['All', 'Wednesday', 'Saturday', 'Sunday'] as const).map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                selectedDay === day
                  ? 'btn-duo-blue'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict Status Card */}
      <div className={`p-4 rounded-2xl border-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        detectedConflicts.length === 0
          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
          : 'bg-rose-50 border-rose-300 text-rose-900'
      }`}>
        <div className="flex items-center gap-2.5">
          {detectedConflicts.length === 0 ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
              ✓
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-black">
              !
            </div>
          )}
          <div>
            <span className="font-black block text-sm">
              {detectedConflicts.length === 0
                ? 'Timetable Conflict-Free: All Rooms & Trainers Clear!'
                : `${detectedConflicts.length} Timetable Collision(s) Detected`}
            </span>
            <span className="text-[11px] text-slate-600 font-medium">
              {detectedConflicts.length === 0
                ? 'No overlapping trainer slots or duplicate room allocations detected.'
                : 'Please reassign rooms or time slots to avoid overlapping.'}
            </span>
          </div>
        </div>

        {detectedConflicts.length > 0 && (
          <div className="space-y-1">
            {detectedConflicts.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-mono text-[10px] block font-bold">
                {c.reason}: {c.groupA} & {c.groupB}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((g) => {
          const trainer = trainers.find((t) => t.id === g.trainerId);
          const program = programs.find((p) => p.id === g.programId);

          return (
            <motion.div
              key={g.id}
              whileHover={{ y: -3 }}
              className="duo-card p-5 bg-white space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-black text-[10px] uppercase">
                    {g.dayOfWeek}
                  </span>
                  <h3 className="text-sm font-black text-slate-800 mt-1">{g.name}</h3>
                </div>

                <span className="font-mono text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {g.timeSlot}
                </span>
              </div>

              <div className="text-xs text-slate-500 font-medium">{program?.title}</div>

              <div className="pt-2 border-t-2 border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{g.room}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-sky-500" />
                  <span>Trainer: <strong className="text-slate-800 font-bold">{trainer?.name}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Max Capacity: <strong className="text-emerald-700 font-bold">{g.maxCapacity} students</strong></span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
