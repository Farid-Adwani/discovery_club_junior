import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  HeartHandshake,
  Calendar,
  Clock,
  MapPin,
  Star,
  CheckCircle2,
  AlertCircle,
  Package,
  User,
  ShoppingBag,
  Sparkles,
  BookOpen,
  Smile,
  Flame,
  Award,
  Heart,
  MessageCircle,
  ExternalLink,
  Camera,
  Hourglass,
  PartyPopper,
  X,
  Phone,
  Mail
} from 'lucide-react';
import { Group, HoodieSize, SessionRecord, Student, StudentAttendanceRecord, Trainer } from '../../types';
import { CircuitBackground, Gear } from '../visitor/RoboticsArt';
import { CLUB_PHOTOS } from '../../data/initialData';

/* ---------- attendance & marks building blocks ---------- */

const CLASS_COLORS = ['#c11e3d', '#191919', '#c9a227', '#6a0d1f', '#4f4f4f'];

/** Circular gauge for a mark out of 20: gold from 16, crimson from 12, grey below. */
const MarkRing: React.FC<{ mark?: number; size?: number }> = ({ mark, size = 52 }) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  const hasMark = typeof mark === 'number';
  const color = !hasMark ? '#e2e8f0' : mark >= 16 ? '#c9a227' : mark >= 12 ? '#c11e3d' : '#888888';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
        {hasMark && (
          <motion.circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - mark / 20) }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {hasMark ? (
          <>
            <span className="font-mono font-black text-slate-900" style={{ fontSize: size * 0.27 }}>{mark}</span>
            <span className="text-[8px] font-bold text-slate-400">/20</span>
          </>
        ) : (
          <span className="text-[9px] font-black text-slate-400">—</span>
        )}
      </div>
    </div>
  );
};

/** Little line chart of marks over time, with the average as a dashed line. */
const MarkSparkline: React.FC<{ marks: number[] }> = ({ marks }) => {
  if (marks.length < 2) return null;
  const w = 240;
  const h = 56;
  const x = (i: number) => 6 + (i / (marks.length - 1)) * (w - 12);
  const y = (m: number) => h - 6 - (m / 20) * (h - 12);
  const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
  const line = marks.map((m, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(m).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" aria-hidden="true">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c11e3d" stopOpacity="0.25" />
          <stop offset="1" stopColor="#c11e3d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${x(marks.length - 1)} ${h} L${x(0)} ${h} Z`} fill="url(#spark-fill)" />
      <line x1="0" x2={w} y1={y(avg)} y2={y(avg)} stroke="#c9a227" strokeDasharray="4 4" strokeWidth="1.5" />
      <motion.path
        d={line}
        fill="none"
        stroke="#c11e3d"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {marks.map((m, i) => (
        <circle key={i} cx={x(i)} cy={y(m)} r="3" fill="#fff" stroke="#c11e3d" strokeWidth="2" />
      ))}
    </svg>
  );
};

const STATUS_STYLE: Record<StudentAttendanceRecord['status'], { label: string; cls: string }> = {
  present: { label: 'Present', cls: 'bg-slate-900 text-white' },
  late: { label: 'Late', cls: 'bg-amber-100 text-amber-800 border border-amber-300' },
  absent: { label: 'Absent', cls: 'bg-rose-100 text-rose-700 border border-rose-300' },
  unmarked: { label: 'Unmarked', cls: 'bg-slate-100 text-slate-500' }
};

/** One session, compact: date tile, class + topic + remark, mark gauge and status. */
const SessionRow: React.FC<{
  sess: SessionRecord;
  record?: StudentAttendanceRecord;
  className: string;
  classColor: string;
  index?: number;
}> = ({ sess, record, className, classColor, index = 0 }) => {
  const d = new Date(`${sess.date}T12:00:00`);
  const status = STATUS_STYLE[record?.status || 'unmarked'];
  const remark = record?.remarks || record?.pedagogicalRemark;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
      className="group flex items-center gap-3.5 p-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-sky-200 hover:shadow-[0_8px_24px_-12px_rgba(193,30,61,0.35)] transition-all"
    >
      <div className="w-14 shrink-0 rounded-xl bg-[#191919] text-white text-center py-1.5">
        <div className="text-[9px] font-black uppercase tracking-wider text-white/50">
          {d.toLocaleDateString('en-GB', { weekday: 'short' })}
        </div>
        <div className="text-xl font-black leading-none">{d.getDate()}</div>
        <div className="text-[9px] font-black uppercase tracking-wider text-sky-400">
          {d.toLocaleDateString('en-GB', { month: 'short' })}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: classColor }} />
          <span className="truncate">{className}</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-sky-600">W{sess.weekNumber}</span>
        </div>
        <div className="text-sm font-black text-slate-900 truncate">{sess.topicTaught}</div>
        {remark && <p className="text-xs text-slate-500 font-medium italic line-clamp-2">“{remark}”</p>}
        {record?.ratedBy && <div className="text-[10px] font-bold text-slate-400">by {record.ratedBy}</div>}
      </div>

      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <MarkRing mark={record?.rating} />
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${status.cls}`}>{status.label}</span>
      </div>
    </motion.div>
  );
};

/* ---------- profile building blocks ---------- */

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** Child photo, or initials on a brand gradient when there is no photo yet. */
const ChildAvatar: React.FC<{ student: Student; size: number; className?: string }> = ({ student, size, className = '' }) =>
  student.photoURL ? (
    <img
      src={student.photoURL}
      alt={student.studentName}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-black text-white bg-gradient-to-br from-sky-500 to-sky-900 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsOf(student.studentName)}
    </div>
  );

/** Trainer photo with an initials fallback if the image is missing or fails to load. */
const TrainerAvatar: React.FC<{ trainer: Trainer; size?: number }> = ({ trainer, size = 44 }) => {
  const [failed, setFailed] = useState(false);
  return trainer.avatar && !failed ? (
    <img
      src={trainer.avatar}
      alt={trainer.name}
      onError={() => setFailed(true)}
      className="rounded-full object-cover shrink-0 ring-2 ring-white shadow"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-black text-white bg-[#191919] ring-2 ring-white shadow"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsOf(trainer.name)}
    </div>
  );
};

/** Center-crops and shrinks an image file to a small square JPEG data URL (about 20–40 KB). */
function resizePhoto(file: File, size = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('This file is not an image'));
    img.src = url;
  });
}

const DAY_INDEX: Record<Group['dayOfWeek'], number> = { Sunday: 0, Wednesday: 3, Saturday: 6 };

/** Next date (today included) that falls on the class's weekday. */
function nextSessionDate(day: Group['dayOfWeek']): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== DAY_INDEX[day]) d.setDate(d.getDate() + 1);
  return d;
}

const STATUS_BADGE: Record<Student['status'], { label: string; dot: string; cls: string }> = {
  waitlist: { label: 'Waiting list', dot: 'bg-amber-400', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  accepted: { label: 'Accepted', dot: 'bg-sky-500', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  active: { label: 'Active member', dot: 'bg-emerald-500', cls: 'bg-slate-900 text-white border-slate-900' }
};

export const ParentPortal: React.FC = () => {
  const {
    students,
    groups,
    trainers,
    programs,
    sessions,
    hoodieStock,
    hoodieDistributions,
    facebookPosts,
    likeFacebookPost,
    activeParentStudentId,
    setActiveParentStudentId,
    requestHoodieOrder,
    updateStudentPhoto,
    showToast,
    currentUser
  } = useApp();

  // Only this parent's children (admins previewing the portal see everyone)
  const isAdminViewer = !!currentUser?.roles.includes('admin');
  const parentEmail = currentUser?.email.toLowerCase() || '';
  const linkedIds = currentUser?.studentIds || (currentUser?.studentId ? [currentUser.studentId] : []);
  const myChildren = isAdminViewer
    ? students
    : students.filter((s) => linkedIds.includes(s.id) || s.parentEmail.toLowerCase() === parentEmail);

  // Selected student
  const activeStudent = myChildren.find((s) => s.id === activeParentStudentId) || myChildren[0];
  // A child can attend several classes; trainers and programs are combined across them
  const assignedGroups = groups.filter((g) => activeStudent?.groupIds.includes(g.id));
  const assignedTrainers = trainers.filter((t) => assignedGroups.some((g) => g.trainerIds.includes(t.id)));
  const classNameOf = (groupId: string) => groups.find((g) => g.id === groupId)?.name || 'Class';

  // Find all sessions involving this student
  const studentSessions = sessions.filter((sess) => {
    return !!activeStudent && activeStudent.groupIds.includes(sess.groupId) && sess.records[activeStudent.id];
  });

  // Calculate attendance metrics
  const totalAttended = studentSessions.filter(
    (s) => s.records[activeStudent?.id]?.status === 'present'
  ).length;
  const totalLate = studentSessions.filter(
    (s) => s.records[activeStudent?.id]?.status === 'late'
  ).length;
  // Mentor marks (/20): every session where the trainer gave this child a mark, newest first
  const markHistory = studentSessions
    .map((sess) => ({ sess, record: sess.records[activeStudent.id] }))
    .filter((m) => typeof m.record?.rating === 'number')
    .sort((a, b) => (a.sess.date < b.sess.date ? 1 : -1));
  const averageMark =
    markHistory.length > 0
      ? (markHistory.reduce((acc, m) => acc + (m.record.rating as number), 0) / markHistory.length).toFixed(1)
      : null;
  const [isMarksOpen, setIsMarksOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeStudent) return;
    setIsUploadingPhoto(true);
    try {
      await updateStudentPhoto(activeStudent.id, await resizePhoto(file));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not read this photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };
  const [classFilter, setClassFilter] = useState<string>('all');
  const classColorOf = (groupId: string) => {
    const i = groups.findIndex((g) => g.id === groupId);
    return CLASS_COLORS[(i < 0 ? 0 : i) % CLASS_COLORS.length];
  };
  const sessionsNewestFirst = [...studentSessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const visibleSessions = sessionsNewestFirst.filter((s) => classFilter === 'all' || s.groupId === classFilter);
  const marksOldestFirst = [...markHistory].reverse().map((m) => m.record.rating as number);

  // Find hoodie orders for this student
  const myHoodieOrders = hoodieDistributions.filter(
    (d) => d.studentId === activeStudent?.id
  );

  // Hoodie order form state
  const [selectedSize, setSelectedSize] = useState<HoodieSize>('8-10Y');
  const [isPersonalized, setIsPersonalized] = useState(true);
  const [customEmbroideryText, setCustomEmbroideryText] = useState(
    activeStudent ? `${activeStudent.studentName} #01` : ''
  );

  const handleOrderHoodie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    requestHoodieOrder({
      studentId: activeStudent.id,
      studentName: activeStudent.studentName,
      parentName: activeStudent.parentName,
      size: selectedSize,
      isPersonalized,
      personalizedText: isPersonalized ? customEmbroideryText : undefined
    });
  };

  if (!activeStudent) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-2">
        <h1 className="text-2xl font-black text-slate-800">No children linked yet</h1>
        <p className="text-xs text-slate-500 font-medium">
          We could not find a child registered with {currentUser?.email || 'this account'}. Please contact the club.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* All mentor marks */}
      {isMarksOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setIsMarksOpen(false)}
        >
          <div
            className="w-full max-w-xl duo-card bg-white p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black text-amber-600 uppercase tracking-wider">Mentor evaluation</div>
                <h3 className="text-lg font-black text-slate-800">
                  {activeStudent.studentName}'s marks · average {averageMark ?? '—'} / 20
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMarksOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {markHistory.length === 0 ? (
              <p className="py-6 text-center text-xs font-medium text-slate-400">No marks have been given yet.</p>
            ) : (
              <>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-2 pt-1">
                  <MarkSparkline marks={marksOldestFirst} />
                </div>
                <div className="scroll-panel scroll-fade max-h-[52vh] -mx-1 px-1 py-2 space-y-2.5">
                  {markHistory.map(({ sess, record }, i) => (
                    <SessionRow
                      key={sess.id}
                      sess={sess}
                      record={record}
                      className={classNameOf(sess.groupId)}
                      classColor={classColorOf(sess.groupId)}
                      index={i}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header + child switcher (photo tabs) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-black uppercase mb-1.5">
            <HeartHandshake className="w-4 h-4" />
            <span>Parent portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {activeStudent.studentName.split(' ')[0]}'s learning journey
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Classes, trainers, attendance, marks and club orders, all in one place.</p>
        </div>

        {myChildren.length > 1 && (
          <div className="scroll-panel flex gap-2 pb-1 -mb-1">
            {myChildren.map((s) => {
              const active = s.id === activeStudent.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveParentStudentId(s.id)}
                  className={`relative shrink-0 flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#191919] border-[#191919] text-white shadow-lg'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                  }`}
                >
                  <span className="relative">
                    <ChildAvatar student={s} size={34} />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${STATUS_BADGE[s.status].dot}`} />
                  </span>
                  <span className="text-left leading-tight">
                    <span className="block text-xs font-black">{s.studentName.split(' ')[0]}</span>
                    <span className={`block text-[10px] font-bold ${active ? 'text-white/55' : 'text-slate-400'}`}>
                      {s.studentAge} yrs · {STATUS_BADGE[s.status].label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Child profile card */}
        <motion.aside
          key={activeStudent.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-4 lg:sticky lg:top-24 duo-card bg-white overflow-hidden"
        >
          <div className="relative h-28 bg-[#141414] overflow-hidden">
            <CircuitBackground className="absolute inset-0 w-full h-full opacity-70" />
            <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-sky-600/40 blur-3xl" />
          </div>
          <div className="px-6 pb-6 -mt-14 relative">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <ChildAvatar student={activeStudent} size={112} className="ring-4 ring-white shadow-xl" />
                <label
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white cursor-pointer hover:bg-sky-700 transition-colors"
                  title="Change photo"
                >
                  {isUploadingPhoto ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Camera className="w-4 h-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
              <h2 className="mt-3 text-xl font-black text-slate-900">{activeStudent.studentName}</h2>
              <p className="text-xs font-semibold text-slate-500">
                {activeStudent.studentAge} years old · member since{' '}
                {new Date(`${activeStudent.registeredAt}T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
              <span className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black ${STATUS_BADGE[activeStudent.status].cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_BADGE[activeStudent.status].dot}`} />
                {STATUS_BADGE[activeStudent.status].label}
              </span>
              {activeStudent.photoURL && (
                <button
                  type="button"
                  onClick={() => updateStudentPhoto(activeStudent.id, null)}
                  className="mt-1.5 text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  Remove photo
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { v: assignedGroups.length, l: assignedGroups.length === 1 ? 'Class' : 'Classes' },
                { v: studentSessions.length ? `${Math.round((totalAttended / studentSessions.length) * 100)}%` : '—', l: 'Attendance' },
                { v: averageMark ?? '—', l: 'Avg /20' }
              ].map((st) => (
                <div key={st.l} className="rounded-2xl bg-slate-50 border border-slate-100 py-3 text-center">
                  <div className="text-lg font-black font-mono text-slate-900">{st.v}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{st.l}</div>
                </div>
              ))}
            </div>

            <dl className="mt-5 space-y-3 text-xs">
              {[
                { icon: <User className="w-4 h-4" />, label: 'Parent', value: activeStudent.parentName },
                { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: activeStudent.parentPhone },
                { icon: <Mail className="w-4 h-4" />, label: 'Email', value: activeStudent.parentEmail },
                { icon: <Award className="w-4 h-4" />, label: 'Member ID', value: activeStudent.id.replace(/^std-/, '').toUpperCase() }
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">{row.icon}</span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">{row.label}</dt>
                    <dd className="font-bold text-slate-800 truncate">{row.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {activeStudent.notes && (
              <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">Notes for trainers</div>
                <p className="text-xs font-semibold text-amber-900 leading-relaxed">{activeStudent.notes}</p>
              </div>
            )}
          </div>
        </motion.aside>

        <div className="lg:col-span-8 space-y-6">
          {/* Registration status: impossible to miss */}
          {activeStudent.status === 'waitlist' ? (
            <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 border-b-4 border-b-amber-400 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0">
                <Hourglass className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-700">Status: On the waiting list</div>
                <h2 className="text-lg font-black text-amber-950">{activeStudent.studentName} is not registered yet</h2>
                <p className="text-xs font-semibold text-amber-800 mt-0.5">
                  Your request was received on {activeStudent.registeredAt}. The club will place {activeStudent.studentName.split(' ')[0]} in a
                  class and contact you as soon as a spot is available.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden p-5 rounded-3xl bg-[#191919] text-white flex items-start gap-4">
              <Gear teeth={16} duration={24} color="rgba(255,255,255,0.06)" windows={4} className="absolute -right-8 -top-10 w-40 h-40" />
              <div className="relative w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center shrink-0">
                {activeStudent.status === 'active' ? <PartyPopper className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>
              <div className="relative">
                <div className="text-xs font-black uppercase tracking-wider text-sky-400">
                  Status: {activeStudent.status === 'active' ? 'Registered & active' : 'Accepted'}
                </div>
                <h2 className="text-lg font-black">
                  {activeStudent.status === 'active'
                    ? `${activeStudent.studentName.split(' ')[0]} is registered in the club!`
                    : `Good news: ${activeStudent.studentName.split(' ')[0]} has been accepted!`}
                </h2>
                <p className="text-xs font-semibold text-white/60 mt-0.5">
                  {assignedGroups.length
                    ? `Enrolled in ${assignedGroups.length} class${assignedGroups.length > 1 ? 'es' : ''}. See the schedule and trainers below.`
                    : 'The club will confirm the class and schedule with you.'}
                </p>
              </div>
            </div>
          )}

          {/* Key numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="duo-card p-5 bg-white space-y-1">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>ATTENDANCE</span>
                <Flame className="w-5 h-5 text-sky-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono flex items-baseline gap-1.5">
                <span>{totalAttended}</span>
                <span className="text-sm font-bold text-slate-400">/ {studentSessions.length} sessions</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-800"
                  initial={{ width: 0 }}
                  animate={{ width: `${studentSessions.length ? (totalAttended / studentSessions.length) * 100 : 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="text-[11px] font-bold text-slate-500">
                {studentSessions.length ? `${totalLate} late · ${studentSessions.length - totalAttended - totalLate} absent` : 'Classes starting soon'}
              </div>
            </div>

            <button type="button" onClick={() => setIsMarksOpen(true)} className="duo-card p-5 bg-white text-left cursor-pointer flex items-center gap-4">
              <MarkRing mark={averageMark ? Number(averageMark) : undefined} size={76} />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-400">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  MENTOR EVALUATION
                </div>
                <div className="text-sm font-black text-slate-900">
                  {markHistory.length ? `Average of ${markHistory.length} mark${markHistory.length > 1 ? 's' : ''}` : 'No marks yet'}
                </div>
                {markHistory.length > 0 && <div className="text-[11px] font-bold text-sky-600">Tap to see every mark →</div>}
              </div>
            </button>
          </div>

          {/* Classes & trainers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-600" />
                Classes & trainers
              </h3>
              {assignedTrainers.length > 0 && (
                <div className="flex -space-x-2">
                  {assignedTrainers.map((t) => (
                    <TrainerAvatar key={t.id} trainer={t} size={30} />
                  ))}
                </div>
              )}
            </div>

            {assignedGroups.length === 0 ? (
              <div className="duo-card p-6 bg-white flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Hourglass className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">Awaiting placement</div>
                  <p className="text-xs font-semibold text-slate-500">
                    The club will choose the right class and trainers for {activeStudent.studentName.split(' ')[0]} and let you know.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedGroups.map((g, i) => {
                  const program = programs.find((p) => p.id === g.programId);
                  const classTrainers = trainers.filter((t) => g.trainerIds.includes(t.id));
                  const next = nextSessionDate(g.dayOfWeek);
                  const isToday = next.toDateString() === new Date().toDateString();
                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ y: -4 }}
                      className="duo-card bg-white overflow-hidden flex flex-col"
                    >
                      <div className="relative px-5 pt-5 pb-4 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${classColorOf(g.id)}, #141414)` }}>
                        <Gear teeth={12} duration={18} color="rgba(255,255,255,0.08)" windows={3} className="absolute -right-6 -top-6 w-28 h-28" />
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-black uppercase tracking-wider">
                            {program?.ageRange || 'Class'}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-white/60">{program?.level}</span>
                        </div>
                        <h4 className="relative mt-2 text-lg font-black leading-tight">{g.name}</h4>
                        <p className="relative text-xs font-semibold text-white/70">{program?.title}</p>
                      </div>

                      <div className="p-5 space-y-4 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              <Clock className="w-3 h-3" /> When
                            </div>
                            <div className="font-black text-slate-900">{g.dayOfWeek}</div>
                            <div className="font-semibold text-slate-500">{g.timeSlot}</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              <MapPin className="w-3 h-3" /> Where
                            </div>
                            <div className="font-black text-slate-900 leading-snug">{g.room || 'Main lab'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100 text-xs">
                          <span className="relative flex w-2.5 h-2.5">
                            <span className="absolute inset-0 rounded-full bg-sky-500 animate-ping opacity-60" />
                            <span className="relative w-2.5 h-2.5 rounded-full bg-sky-600" />
                          </span>
                          <span className="font-bold text-slate-600">Next session</span>
                          <span className="ml-auto font-black text-sky-700">
                            {isToday ? 'Today' : next.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <div className="space-y-2.5 mt-auto">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {classTrainers.length > 1 ? 'Trainers' : 'Trainer'}
                          </div>
                          {classTrainers.map((t) => (
                            <div key={t.id} className="flex items-center gap-3">
                              <TrainerAvatar trainer={t} size={42} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-slate-900 truncate">{t.name}</div>
                                <div className="text-[11px] font-semibold text-slate-500 truncate">{t.specialty || t.specialization}</div>
                              </div>
                              {t.email && (
                                <a
                                  href={`mailto:${t.email}`}
                                  className="w-8 h-8 rounded-full border-2 border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-300 flex items-center justify-center shrink-0"
                                  title={`Email ${t.name}`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Weekly Attendance & Teacher Remarks */}
        <div className="lg:col-span-7 space-y-6">
          <div className="duo-card p-6 bg-white space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-600" />
                  <span>Attendance & feedback</span>
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {studentSessions.length} sessions · {totalAttended} present · {totalLate} late
                </p>
              </div>
              {marksOldestFirst.length > 1 && (
                <div className="w-full sm:w-60 rounded-xl bg-slate-50 border border-slate-100 px-2 pt-1">
                  <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <span>Marks trend</span>
                    <span className="text-amber-600">avg {averageMark}</span>
                  </div>
                  <MarkSparkline marks={marksOldestFirst} />
                </div>
              )}
            </div>

            {assignedGroups.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {[{ id: 'all', name: 'All classes' }, ...assignedGroups].map((g) => {
                  const count = g.id === 'all' ? studentSessions.length : studentSessions.filter((s) => s.groupId === g.id).length;
                  const active = classFilter === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setClassFilter(g.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all cursor-pointer ${
                        active ? 'bg-[#191919] border-[#191919] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {g.id !== 'all' && <span className="w-2 h-2 rounded-full" style={{ background: classColorOf(g.id) }} />}
                      {g.name}
                      <span className={`text-[10px] ${active ? 'text-white/60' : 'text-slate-400'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {visibleSessions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium rounded-2xl border-2 border-dashed border-slate-200">
                No sessions logged yet. The next session is coming up soon!
              </div>
            ) : (
              <div className="scroll-panel scroll-fade max-h-[460px] -mx-1 px-1 py-2 space-y-2.5">
                {visibleSessions.map((sess, i) => (
                  <SessionRow
                    key={sess.id}
                    sess={sess}
                    record={sess.records[activeStudent.id]}
                    className={classNameOf(sess.groupId)}
                    classColor={classColorOf(sess.groupId)}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: "Les Capuches" Hoodie Order */}
        <div className="lg:col-span-5 space-y-6">
          <div className="duo-card p-6 bg-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-black text-slate-800">
                  “Les Capuches” Official Club Hoodie
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">Merchandise</span>
            </div>

            {/* Real photo of the hoodie crew */}
            <div className="rounded-2xl overflow-hidden border-2 border-slate-200 relative h-36">
              <img
                src={CLUB_PHOTOS.teamInClubColors}
                alt="Students wearing Discovery hoodies"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2.5 text-white">
                <span className="text-[11px] font-black">Official Club Hoodie · 32 DT</span>
              </div>
            </div>

            <form onSubmit={handleOrderHoodie} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1.5 text-slate-600">Select Size:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['6-8Y', '8-10Y', '10-12Y', '12-14Y', 'S', 'M', 'L'] as HoodieSize[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`py-2 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                        selectedSize === sz
                          ? 'bg-sky-50 border-sky-500 text-sky-800 border-b-4 border-b-sky-600'
                          : 'bg-white border-slate-200 border-b-4 border-b-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={isPersonalized}
                    onChange={(e) => setIsPersonalized(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-0"
                  />
                  <span>Add custom name embroidery badge (+6 DT)</span>
                </label>

                {isPersonalized && (
                  <input
                    type="text"
                    value={customEmbroideryText}
                    onChange={(e) => setCustomEmbroideryText(e.target.value)}
                    placeholder="Embroidery text (e.g. Rayen #07)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Submit Hoodie Request ({isPersonalized ? '38' : '32'} DT)</span>
              </button>
            </form>

            {/* My Active Orders */}
            {myHoodieOrders.length > 0 && (
              <div className="pt-3 border-t-2 border-slate-100 space-y-2">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  Your Ordered Hoodies:
                </div>
                <div className="scroll-panel max-h-44 space-y-2 pr-1">
                {myHoodieOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{ord.size} Hoodie</span>
                      {ord.personalizedText && (
                        <span className="text-slate-500 font-mono text-[11px] block">"{ord.personalizedText}"</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 uppercase">
                      {ord.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Club Life & Facebook Highlights Gallery for Parents */}
      <div className="duo-card p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-500" />
            <h3 className="text-base font-black text-slate-800">
              Club Life & Competition Highlights from Facebook
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Direct from Manouba Lab</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {facebookPosts.slice(0, 4).map((post) => {
            const userKey = currentUser?.uid || 'guest-visitor';
            const isLiked = post.likedBy?.includes(userKey);

            return (
              <div key={post.id} className="rounded-2xl border-2 border-slate-200 overflow-hidden bg-white flex flex-col justify-between">
                <div>
                  <div className="h-40 overflow-hidden relative">
                    <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white font-black text-[10px]">
                      {post.tag}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-slate-700 font-medium line-clamp-2">{post.caption}</p>
                  </div>
                </div>

                <div className="p-3 pt-0 flex items-center justify-between text-xs font-bold text-slate-500 border-t border-slate-100">
                  <button
                    onClick={() => likeFacebookPost(post.id)}
                    className="flex items-center gap-1 hover:text-rose-500 cursor-pointer pt-2"
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                    <span>{post.likes}</span>
                  </button>

                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:underline text-[11px] font-black flex items-center gap-1 pt-2"
                  >
                    <span>Facebook</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
