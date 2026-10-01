import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Star,
  User,
  Package,
  Layers,
  Sparkles,
  AlertCircle,
  Smile,
  Check
} from 'lucide-react';
import { StudentAttendanceRecord } from '../../types';

export const TrainerPortal: React.FC = () => {
  const {
    trainers,
    groups,
    students,
    programs,
    sessions,
    activeTrainerId,
    setActiveTrainerId,
    saveSessionAttendance,
    createMaterialRequest
  } = useApp();

  const currentTrainer = trainers.find((t) => t.id === activeTrainerId) || trainers[0];

  // Filter groups assigned to this trainer
  const trainerGroups = groups.filter((g) => g.trainerIds.includes(currentTrainer.id));
  const [selectedGroupId, setSelectedGroupId] = useState(trainerGroups[0]?.id || groups[0]?.id || '');

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const activeProgram = programs.find((p) => p.id === activeGroup?.programId);
  const groupStudents = students.filter((s) => !!activeGroup && s.groupIds.includes(activeGroup.id));

  // Form states for attendance & evaluation
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekNumber, setWeekNumber] = useState(3);
  const [topicTaught, setTopicTaught] = useState(
    activeProgram?.syllabus[2]?.title || 'Autonomous Sensor Feedback Loops'
  );
  const [validateSyllabus, setValidateSyllabus] = useState(true);
  const [trainerGlobalNotes, setTrainerGlobalNotes] = useState('');

  // Per-student attendance and mark (/20). Only edited students are stored here;
  // everyone else in the group uses the default (present, not rated yet).
  const [studentRecords, setStudentRecords] = useState<Record<string, StudentAttendanceRecord>>({});
  const recordFor = (studentId: string): StudentAttendanceRecord =>
    studentRecords[studentId] || { studentId, status: 'present', remarks: '' };

  // Material request state
  const [itemsNeeded, setItemsNeeded] = useState('');
  const [quantity, setQuantity] = useState('5 units');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'urgent'>('medium');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const updateRecord = (studentId: string, patch: Partial<StudentAttendanceRecord>) => {
    setStudentRecords((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { studentId, status: 'present', remarks: '' }), ...patch }
    }));
  };

  const handleStatusChange = (studentId: string, status: StudentAttendanceRecord['status']) => {
    // An absent child is not rated
    updateRecord(studentId, status === 'absent' ? { status, rating: undefined } : { status });
  };

  const handleRatingChange = (studentId: string, value: string) => {
    if (value === '') return updateRecord(studentId, { rating: undefined });
    const mark = Math.min(20, Math.max(0, Number(value)));
    if (Number.isFinite(mark)) updateRecord(studentId, { rating: mark });
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    updateRecord(studentId, { remarks });
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;

    await saveSessionAttendance(
      activeGroup.id,
      sessionDate,
      weekNumber,
      topicTaught,
      // Send every child in the group, not only the ones that were edited
      Object.fromEntries(groupStudents.map((st) => [st.id, recordFor(st.id)])),
      validateSyllabus,
      trainerGlobalNotes
    );
  };

  const handleMaterialRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemsNeeded || !activeGroup) return;

    await createMaterialRequest({
      groupId: activeGroup.id,
      itemsNeeded,
      quantity,
      urgency,
      sessionDate
    });

    setItemsNeeded('');
    setRequestSubmitted(true);
    setTimeout(() => setRequestSubmitted(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-black uppercase mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Trainer Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Session Check-In & Student Evaluation
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Mark attendance, validate syllabus modules, and share remarks with parents in Firestore.
          </p>
        </div>

        {/* Trainer & Group selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={activeTrainerId}
            onChange={(e) => setActiveTrainerId(e.target.value)}
            className="px-3 py-2 bg-white border-2 border-slate-200 border-b-4 border-b-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
          >
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                Trainer: {t.name}
              </option>
            ))}
          </select>

          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-2 bg-white border-2 border-slate-200 border-b-4 border-b-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.dayOfWeek})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 2-Column Trainer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Student Roster & Live Grading */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSaveAttendance} className="duo-card duo-card-glow-blue p-6 sm:p-8 bg-white space-y-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    {activeGroup?.name || 'Class'} Session Attendance
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {groupStudents.length} students enrolled in this lab
                  </div>
                </div>
              </div>

              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                Week {weekNumber}
              </span>
            </div>

            {/* Session Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Session Date:</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block mb-1">Topic / Module Taught:</label>
                <input
                  type="text"
                  value={topicTaught}
                  onChange={(e) => setTopicTaught(e.target.value)}
                  placeholder="e.g. Ultrasonic obstacle avoidance algorithm"
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Student List with Easy 1-Tap Buttons */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Student Check-In & Marks (/20)
              </div>

              {groupStudents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  No students in this class yet. Add students from the Admin dashboard!
                </div>
              ) : (
                <div className="scroll-panel scroll-fade max-h-[620px] space-y-3 pr-1 py-2">
                {groupStudents.map((student) => {
                  const record = recordFor(student.id);

                  return (
                    <div
                      key={student.id}
                      className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 transition-all space-y-3 cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white font-black flex items-center justify-center text-xs shadow-xs">
                            {student.studentName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-black text-slate-800 text-xs">
                              {student.studentName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              Age {student.studentAge} · Parent: {student.parentName}
                            </div>
                          </div>
                        </div>

                        {/* 1-Tap Attendance Buttons */}
                        <div className="flex items-center gap-1.5">
                          {(['present', 'late', 'absent'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(student.id, st)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer ${
                                record.status === st
                                  ? st === 'present'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : st === 'late'
                                    ? 'bg-amber-400 text-amber-950 border-b-2 border-amber-600 shadow-xs'
                                    : 'bg-rose-500 text-white border-b-2 border-rose-700 shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {st === 'present' && '😊 Present'}
                              {st === 'late' && '⏱️ Late'}
                              {st === 'absent' && '❌ Absent'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mark /20 & Remarks */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1 border-t border-slate-200/80">
                        <label className="sm:col-span-4 flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-500">Mark:</span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            step={0.5}
                            value={record.rating ?? ''}
                            disabled={record.status === 'absent'}
                            onChange={(e) => handleRatingChange(student.id, e.target.value)}
                            placeholder={record.status === 'absent' ? 'absent' : '—'}
                            className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 text-center focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                          <span className="font-black text-slate-400">/ 20</span>
                        </label>

                        <div className="sm:col-span-8">
                          <input
                            type="text"
                            value={record.remarks || ''}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            placeholder="Add positive pedagogical feedback for parent..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>

            {/* Validation & Save */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={validateSyllabus}
                  onChange={(e) => setValidateSyllabus(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                />
                <span>Validate & Check-Off Syllabus Module for Week {weekNumber}</span>
              </label>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Save Attendance & Sync to Parents 🚀</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Lab Hardware Request Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="duo-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📦</span>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Request Lab Equipment
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Need extra sensors, Arduino boards, or servos?
                </p>
              </div>
            </div>

            <form onSubmit={handleMaterialRequestSubmit} className="space-y-3.5 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Equipment / Components Needed:</label>
                <input
                  type="text"
                  required
                  value={itemsNeeded}
                  onChange={(e) => setItemsNeeded(e.target.value)}
                  placeholder="e.g. 5x ESP32 boards, 10x SG90 Servos"
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Quantity:</label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 5 units"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block mb-1">Urgency:</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="low">Standard</option>
                    <option value="medium">Medium</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 btn-duo-blue text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Admin</span>
              </button>

              {requestSubmitted && (
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-center text-xs font-black">
                  ✓ Request sent to Lab Admin!
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
