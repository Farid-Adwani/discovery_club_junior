import React, { useEffect, useState } from 'react';
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
  Check,
  X
} from 'lucide-react';
import { StudentAttendanceRecord } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { ageOf } from '../../utils/age';
import { BirthdaysCard } from '../common/BirthdaysCard';
import { WeekSchedule } from '../common/WeekSchedule';
import { MyRequests, StockCatalog } from './MyRequests';
import { scheduleMessages } from '../../i18n/messages/schedule';
import { birthdayPeople } from '../../utils/birthdays';
import { trainerMessages, dayKey } from '../../i18n/messages/trainer';

// Attendance colors use Tailwind's green (not remapped by the brand theme), amber and rose
const STATUS_STYLE = {
  present: { icon: Check, active: 'bg-green-600 text-white', card: 'bg-white border-slate-200 border-s-green-500' },
  late: { icon: Clock, active: 'bg-amber-400 text-amber-950', card: 'bg-amber-50/40 border-amber-200 border-s-amber-400' },
  absent: { icon: X, active: 'bg-rose-500 text-white', card: 'bg-rose-50/40 border-rose-200 border-s-rose-500' },
  unmarked: { icon: Clock, active: '', card: 'bg-slate-50 border-slate-200 border-s-slate-300' }
} as const;

export const TrainerPortal: React.FC = () => {
  const {
    trainers,
    groups,
    students,
    staffMembers,
    adminProfiles,
    sessions,
    activeTrainerId,
    setActiveTrainerId,
    saveSessionAttendance,
    createMaterialRequest,
    stockItems: allStockItems,
    stockCategories,
    materialRequests
  } = useApp();
  // Admins previewing this space receive every item: keep only what coaches can see
  const stockItems = allStockItems.filter((i) => !i.hiddenFromTrainers);
  const t = useT(trainerMessages);
  const { locale } = useLanguage();
  const tsch = useT(scheduleMessages);
  const dayLabel = (day: string) => {
    const key = dayKey(day);
    return key ? t(key) : day;
  };

  const currentTrainer = trainers.find((tr) => tr.id === activeTrainerId) || trainers[0];

  // Filter groups assigned to this trainer
  const trainerGroups = groups.filter((g) => g.trainerIds.includes(currentTrainer.id));
  const [selectedGroupId, setSelectedGroupId] = useState(trainerGroups[0]?.id || groups[0]?.id || '');

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const groupStudents = students.filter((s) => !!activeGroup && s.groupIds.includes(activeGroup.id));

  // Form states for attendance & evaluation
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekNumber, setWeekNumber] = useState(3);
  const [topicTaught, setTopicTaught] = useState(t('defaultTopic'));
  const [trainerGlobalNotes, setTrainerGlobalNotes] = useState('');
  // Edited since the sheet was opened or last saved
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Per-student attendance and mark (/20). Only edited students are stored here;
  // everyone else in the group uses the default (present, not rated yet).
  const [studentRecords, setStudentRecords] = useState<Record<string, StudentAttendanceRecord>>({});
  const recordFor = (studentId: string): StudentAttendanceRecord =>
    studentRecords[studentId] || { studentId, status: 'present', remarks: '' };

  // Open the sheet already saved for this class and date (by the office or another trainer), so everyone fills the same one
  const savedSession = sessions.find((sess) => sess.groupId === activeGroup?.id && sess.date === sessionDate);
  useEffect(() => {
    setStudentRecords(savedSession ? { ...savedSession.records } : {});
    if (savedSession) {
      setWeekNumber(savedSession.weekNumber);
      if (savedSession.topicTaught) setTopicTaught(savedSession.topicTaught);
      setTrainerGlobalNotes(savedSession.trainerNotes || '');
    }
    setDirty(false);
  }, [savedSession?.id, savedSession?.updatedAt, activeGroup?.id, sessionDate]);

  // Material request state
  const [itemsNeeded, setItemsNeeded] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'urgent'>('medium');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  // A request is either an item of the stock (the ones the admin made visible) or typed by hand
  const [requestMode, setRequestMode] = useState<'stock' | 'manual'>(stockItems.length ? 'stock' : 'manual');
  const [stockItemId, setStockItemId] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [requestComment, setRequestComment] = useState('');
  // The stock arrives after the first render: start on it once it is there, unless the coach is already typing
  const hasStock = stockItems.length > 0;
  useEffect(() => {
    if (hasStock && !itemsNeeded) setRequestMode('stock');
  }, [hasStock]);
  const [showCatalog, setShowCatalog] = useState(false);

  const updateRecord = (studentId: string, patch: Partial<StudentAttendanceRecord>) => {
    setDirty(true);
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

    setSaving(true);
    const ok = await saveSessionAttendance(
      activeGroup.id,
      sessionDate,
      weekNumber,
      topicTaught,
      // Send every child in the group, not only the ones that were edited
      Object.fromEntries(groupStudents.map((st) => [st.id, recordFor(st.id)])),
      // Saving the sheet means the session took place, so its module counts as done
      true,
      trainerGlobalNotes
    );
    setSaving(false);
    if (ok) setDirty(false);
  };

  // Save button: send a new sheet, re-send after changes, or show it is already with the parents
  const saveState: 'new' | 'changed' | 'sent' = !savedSession ? 'new' : dirty ? 'changed' : 'sent';
  const sentAt = savedSession?.updatedAt
    ? new Date(savedSession.updatedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const handleMaterialRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fromStock = requestMode === 'stock';
    if (!activeGroup || (fromStock ? !stockItemId : !itemsNeeded)) return;

    await createMaterialRequest({
      groupId: activeGroup.id,
      itemsNeeded: fromStock ? '' : itemsNeeded,
      quantity,
      urgency,
      sessionDate,
      ...(fromStock ? { stockItemId } : {}),
      ...(requestComment.trim() ? { comment: requestComment.trim() } : {})
    });

    setItemsNeeded('');
    setRequestComment('');
    setStockItemId('');
    setQuantity('1');
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
            <span>{t('workspaceBadge')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            {t('portalTitle')}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {t('portalSubtitle')}
          </p>
        </div>

        {/* Trainer & Group selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={activeTrainerId}
            onChange={(e) => setActiveTrainerId(e.target.value)}
            className="px-3 py-2 bg-white border-2 border-slate-200 border-b-4 border-b-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
          >
            {trainers.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {t('trainerOption', { name: tr.name })}
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
                {g.name} ({dayLabel(g.dayOfWeek)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Birthdays of this trainer's students in the coming week */}
      <BirthdaysCard people={birthdayPeople(students, trainers, staffMembers, adminProfiles)} />

      {/* This coach's week: their classes, like the parents' schedule */}
      <section className="duo-card p-6 bg-white space-y-4">
        <div className="pb-3 border-b-2 border-slate-100">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-500" />
            {tsch('coachTitle')}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">{tsch('coachSubtitle')}</p>
        </div>
        <WeekSchedule students={students} classIds={trainerGroups.map((g) => g.id)} trainerId={currentTrainer.id} />
      </section>

      {/* Main 2-Column Trainer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Student Roster & Live Grading */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSaveAttendance} className="duo-card p-6 sm:p-8 bg-white space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b-2 border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {t('sessionAttendance', { group: activeGroup?.name || t('classFallback') })}
                </h3>
                <div className="text-xs text-slate-500 font-medium">
                  {t('studentsEnrolled', { count: groupStudents.length })}
                </div>
              </div>

              {/* Whether this date already has a saved sheet */}
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full ${
                  savedSession ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {savedSession ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {t(savedSession ? 'sheetSaved' : 'sheetNew')}
              </span>
            </div>

            {/* Session Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs font-bold text-slate-700">
              <div className="sm:col-span-2">
                <label className="block mb-1">{t('sessionDate')}</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block mb-1">{t('weekLabel')}</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={weekNumber}
                  onChange={(e) => { setWeekNumber(Math.max(1, Number(e.target.value) || 1)); setDirty(true); }}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <div className="col-span-2 sm:col-span-3">
                <label className="block mb-1">{t('topicTaught')}</label>
                <input
                  type="text"
                  value={topicTaught}
                  onChange={(e) => { setTopicTaught(e.target.value); setDirty(true); }}
                  placeholder={t('topicPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Student list */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('checkInMarks')}</div>
                  {groupStudents.length > 0 && (
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {t('summaryCounts', {
                        present: groupStudents.filter((s) => recordFor(s.id).status === 'present').length,
                        late: groupStudents.filter((s) => recordFor(s.id).status === 'late').length,
                        absent: groupStudents.filter((s) => recordFor(s.id).status === 'absent').length
                      })}
                      {' · '}
                      {t('marksCount', {
                        n: groupStudents.filter((s) => recordFor(s.id).rating !== undefined).length,
                        total: groupStudents.filter((s) => recordFor(s.id).status !== 'absent').length
                      })}
                    </div>
                  )}
                </div>
                {groupStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => groupStudents.forEach((s) => handleStatusChange(s.id, 'present'))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('allPresent')}
                  </button>
                )}
              </div>

              {groupStudents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  {t('noStudents')}
                </div>
              ) : (
                <div className="scroll-panel scroll-fade max-h-[620px] space-y-3 pe-1 py-2">
                {groupStudents.map((student) => {
                  const record = recordFor(student.id);
                  const isAbsent = record.status === 'absent';

                  return (
                    <div
                      key={student.id}
                      className={`p-4 rounded-2xl border-2 border-s-[6px] transition-colors space-y-3 ${STATUS_STYLE[record.status].card}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white font-black flex items-center justify-center text-sm uppercase">
                            {student.studentName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-black text-slate-800 text-sm">{student.studentName}</div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {t('ageParent', { age: ageOf(student), parent: student.parentName })}
                            </div>
                          </div>
                        </div>

                        {/* Attendance: one segmented control, the selected option is filled with its color */}
                        <div role="radiogroup" className="inline-flex p-1 rounded-xl bg-white border-2 border-slate-200 self-start sm:self-auto">
                          {(['present', 'late', 'absent'] as const).map((st) => {
                            const Icon = STATUS_STYLE[st].icon;
                            const active = record.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => handleStatusChange(student.id, st)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                                  active ? STATUS_STYLE[st].active : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {st === 'present' && t('statusPresent')}
                                {st === 'late' && t('statusLate')}
                                {st === 'absent' && t('statusAbsent')}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mark /20 & comment (an absent child is not rated) */}
                      {isAbsent ? (
                        <div className="pt-3 border-t border-rose-200/70 text-xs font-semibold text-rose-600">
                          {t('notRated')}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center pt-3 border-t border-slate-200/80">
                          <label className="flex items-center gap-2 text-xs shrink-0">
                            <span className="font-bold text-slate-500">{t('markLabel')}</span>
                            <span className="inline-flex items-center rounded-xl bg-white border-2 border-slate-200 focus-within:border-sky-500 overflow-hidden">
                              <input
                                type="number"
                                min={0}
                                max={20}
                                step={0.5}
                                value={record.rating ?? ''}
                                onChange={(e) => handleRatingChange(student.id, e.target.value)}
                                placeholder={t('absentPlaceholder')}
                                className="w-14 py-1.5 bg-transparent text-sm font-black text-slate-800 text-center focus:outline-none"
                              />
                              <span className="pe-3 text-xs font-black text-slate-400">/20</span>
                            </span>
                          </label>

                          <input
                            type="text"
                            value={record.remarks || ''}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            placeholder={t('remarksPlaceholder')}
                            className="flex-1 min-w-0 px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              )}
            </div>

            {/* Save */}
            <div className="pt-4 border-t-2 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs font-semibold text-slate-500">
                {saveState === 'new' && t('saveHintNew')}
                {saveState === 'changed' && <span className="text-amber-700">{t('saveHintChanged')}</span>}
                {saveState === 'sent' && (sentAt ? t('saveHintSent', { when: sentAt }) : t('saveHintSentNoDate'))}
              </p>

              {saveState === 'sent' ? (
                <span className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-2xl bg-green-50 text-green-700 ring-2 ring-green-200 text-sm font-black flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('sentToParents')}
                </span>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto shrink-0 px-6 py-3 btn-duo-green text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <Send className="w-4 h-4 rtl:-scale-x-100" />
                  <span>{t(saveState === 'new' ? 'saveAttendance' : 'saveChanges')}</span>
                </button>
              )}
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
                  {t('requestTitle')}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {t('requestSubtitle')}
                </p>
              </div>
            </div>

            <form onSubmit={handleMaterialRequestSubmit} className="space-y-3.5 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100">
                {(['stock', 'manual'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRequestMode(m)}
                    className={`py-1.5 rounded-lg text-[11px] font-black cursor-pointer ${requestMode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                  >
                    {m === 'stock' ? t('fromStock') : t('somethingElse')}
                  </button>
                ))}
              </div>

              {requestMode === 'stock' ? (
                stockItems.length === 0 ? (
                  <p className="p-3 rounded-xl bg-slate-50 text-[11px] font-semibold text-slate-500">{t('noStockItems')}</p>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowCatalog(true)}
                      className="w-full py-2 rounded-xl border-2 border-dashed border-slate-300 text-[11px] font-black text-slate-600 hover:border-[#c11e3d] hover:text-[#c11e3d] cursor-pointer"
                    >
                      🔎 {t('browseStock')}
                    </button>
                    <input
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder={t('searchStock')}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                    />
                    <ul className="scroll-panel max-h-56 space-y-1 rounded-xl border-2 border-slate-100 p-1">
                      {stockItems
                        .filter((it) => it.name.toLowerCase().includes(stockSearch.trim().toLowerCase()))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((it) => {
                          const on = stockItemId === it.id;
                          const cat = stockCategories.find((c) => c.id === it.categoryId);
                          return (
                            <li key={it.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setStockItemId(on ? '' : it.id);
                                }}
                                className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg text-start cursor-pointer ${on ? 'bg-[#fdf2f4] ring-2 ring-[#c11e3d]' : 'hover:bg-slate-50'}`}
                              >
                                {it.imageUrl ? (
                                  <img src={it.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                ) : (
                                  <span className="w-9 h-9 rounded-lg shrink-0 grid place-items-center text-base" style={{ background: `${cat?.color || '#94a3b8'}22` }}>
                                    📦
                                  </span>
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-black text-slate-800 truncate">{it.name}</span>
                                  <span className={`block text-[10px] font-bold ${it.quantity > 0 ? 'text-[#15803d]' : 'text-[#c11e3d]'}`}>
                                    {it.quantity > 0 ? t('availableCount', { count: `${it.quantity}${it.unit ? ` ${it.unit}` : ''}` }) : t('outOfStock')}
                                    {cat ? <span className="text-slate-400"> · {cat.name}</span> : null}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                    {!stockItemId && <p className="text-[10px] font-semibold text-slate-400">{t('chooseItem')}</p>}
                  </div>
                )
              ) : (
                <div>
                  <label className="block mb-1">{t('itemsNeeded')}</label>
                  <input
                    type="text"
                    required
                    value={itemsNeeded}
                    onChange={(e) => setItemsNeeded(e.target.value)}
                    placeholder={t('itemsPlaceholder')}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">{t('quantity')}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block mb-1">{t('urgency')}</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="low">{t('urgencyLow')}</option>
                    <option value="medium">{t('urgencyMedium')}</option>
                    <option value="urgent">{t('urgencyUrgent')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1">{t('comment')}</label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={requestComment}
                  onChange={(e) => setRequestComment(e.target.value)}
                  placeholder={t('commentPh')}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={requestMode === 'stock' && !stockItemId}
                className="w-full py-3 btn-duo-blue text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('submitToAdmin')}</span>
              </button>

              {requestSubmitted && (
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-center text-xs font-black">
                  {t('requestSent')}
                </div>
              )}
            </form>

            {/* What happened to this coach's requests */}
            <div className="pt-4 border-t-2 border-slate-100">
              <MyRequests trainerId={currentTrainer.id} />
            </div>
            {showCatalog && (
              <StockCatalog
                onClose={() => setShowCatalog(false)}
                onPick={(id) => {
                  setRequestMode('stock');
                  setStockItemId(id);
                  if (!/^\d+$/.test(quantity.trim())) setQuantity('1');
                  setShowCatalog(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
