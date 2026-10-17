import React, { useEffect, useState } from 'react';
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
  MessageCircle,
  Camera,
  Hourglass,
  PartyPopper,
  X,
  Phone,
  Mail,
  Pencil
} from 'lucide-react';
import { CLASS_DEFAULT_IMAGE, Group, Product, ProductOrder, SessionRecord, Student, StudentAttendanceRecord, Trainer } from '../../types';
import { CircuitBackground, Gear } from '../visitor/RoboticsArt';
import { CLUB_PHOTOS } from '../../data/initialData';
import { resizePhoto } from '../../utils/image';
import { WeekSchedule } from '../common/WeekSchedule';
import { DAY_INDEX } from '../../utils/schedule';
import { scheduleMessages } from '../../i18n/messages/schedule';
import { isValidEmail, isValidPhone } from '../../utils/contact';
import { CATEGORY_EMOJI, ONE_SIZE, orderTime } from '../../utils/shop';
import { ltr, useLanguage, useT } from '../../i18n';
import { ageOf } from '../../utils/age';
import { parentMessages } from '../../i18n/messages/parent';
import { shopMessages } from '../../i18n/messages/shop';

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

type ParentKey = keyof typeof parentMessages.en;

// Labels are message keys, translated at render
const STATUS_STYLE: Record<StudentAttendanceRecord['status'], { label: ParentKey; cls: string }> = {
  present: { label: 'statusPresent', cls: 'bg-slate-900 text-white' },
  late: { label: 'statusLate', cls: 'bg-amber-100 text-amber-800 border border-amber-300' },
  absent: { label: 'statusAbsent', cls: 'bg-rose-100 text-rose-700 border border-rose-300' },
  unmarked: { label: 'statusUnmarked', cls: 'bg-slate-100 text-slate-500' }
};

/** One session, compact: date tile, class + topic + remark, mark gauge and status. */
const SessionRow: React.FC<{
  sess: SessionRecord;
  record?: StudentAttendanceRecord;
  className: string;
  classColor: string;
  index?: number;
}> = ({ sess, record, className, classColor, index = 0 }) => {
  const t = useT(parentMessages);
  const { locale } = useLanguage();
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
          {d.toLocaleDateString(locale, { weekday: 'short' })}
        </div>
        <div className="text-xl font-black leading-none">{d.getDate()}</div>
        <div className="text-[9px] font-black uppercase tracking-wider text-sky-400">
          {d.toLocaleDateString(locale, { month: 'short' })}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: classColor }} />
          <span className="truncate">{className}</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-sky-600">{t('weekShort', { n: sess.weekNumber })}</span>
        </div>
        <div className="text-sm font-black text-slate-900 truncate">{sess.topicTaught}</div>
        {remark && <p className="text-xs text-slate-500 font-medium italic line-clamp-2">“{remark}”</p>}
        {record?.ratedBy && <div className="text-[10px] font-bold text-slate-400">{t('ratedBy', { name: record.ratedBy })}</div>}
      </div>

      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <MarkRing mark={record?.rating} />
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${status.cls}`}>{t(status.label)}</span>
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


/** Next date (today included) that falls on the class's weekday. */
function nextSessionDate(day: Group['dayOfWeek']): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== DAY_INDEX[day]) d.setDate(d.getDate() + 1);
  return d;
}

const STATUS_BADGE: Record<Student['status'], { label: ParentKey; dot: string; cls: string }> = {
  waitlist: { label: 'badgeWaitlist', dot: 'bg-amber-400', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  accepted: { label: 'badgeAccepted', dot: 'bg-emerald-500', cls: 'bg-slate-900 text-white border-slate-900' }
};

/** One product on sale: photo, size picker and order button (which opens the confirmation). */
const ShopItem: React.FC<{ product: Product; onOrder: (size: string) => void }> = ({ product, onOrder }) => {
  const t = useT(parentMessages);
  const [size, setSize] = useState(product.sizes[0] || ONE_SIZE);
  const inStock = (product.stock?.[size] ?? 0) > 0;

  return (
    <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
      <div className="relative h-36 bg-slate-100">
        <img
          src={product.imageUrl || CLUB_PHOTOS.teamInClubColors}
          alt={product.name}
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2.5 text-white">
          <span className="text-[11px] font-black">
            {CATEGORY_EMOJI[product.category]} {product.name} · {t('priceDT', { price: product.price })}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-3 text-xs font-bold text-slate-700">
        {product.description && <p className="font-medium text-slate-500">{product.description}</p>}
        {product.sizes.length > 0 && (
          <div>
            <label className="block mb-1.5 text-slate-600">{t('selectSize')}</label>
            <div className="grid grid-cols-4 gap-2">
              {product.sizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSize(sz)}
                  className={`py-2 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                    size === sz
                      ? 'bg-sky-50 border-sky-500 text-sky-800 border-b-4 border-b-sky-600'
                      : 'bg-white border-slate-200 border-b-4 border-b-slate-200 hover:border-slate-300'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className={`text-[11px] ${inStock ? 'text-emerald-600' : 'text-amber-600'}`}>
          {inStock ? t('inStock') : t('outOfStock')}
        </p>
        <button
          type="button"
          onClick={() => onOrder(size)}
          className="w-full py-3 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{t('orderFor', { price: product.price })}</span>
        </button>
      </div>
    </div>
  );
};

const ORDER_STATUS_STYLE: Record<ProductOrder['status'], string> = {
  requested: 'bg-amber-100 text-amber-800 border-amber-200',
  ready: 'bg-sky-100 text-sky-800 border-sky-200',
  picked_up: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200'
};

/** Asks the parent to confirm an order and choose which child it is for. */
const OrderConfirmModal: React.FC<{
  product: Product;
  size: string;
  kids: Student[];
  defaultChildId: string;
  onCancel: () => void;
  onConfirm: (child: Student) => Promise<boolean>;
}> = ({ product, size, kids, defaultChildId, onCancel, onConfirm }) => {
  const t = useT(parentMessages);
  const [childId, setChildId] = useState(defaultChildId);
  const [isPlacing, setIsPlacing] = useState(false);
  const child = kids.find((c) => c.id === childId);
  const inStock = (product.stock?.[size] ?? 0) > 0;

  const handleConfirm = async () => {
    if (!child) return;
    setIsPlacing(true);
    const ok = await onConfirm(child);
    setIsPlacing(false);
    if (ok) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
      onClick={() => !isPlacing && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="duo-card bg-white w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900">{t('confirmOrderTitle')}</h3>
          <button onClick={onCancel} disabled={isPlacing} aria-label={t('cancel')} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <img
            src={product.imageUrl || CLUB_PHOTOS.teamInClubColors}
            alt=""
            className="w-20 h-20 rounded-xl object-contain bg-white border border-slate-200 shrink-0"
          />
          <div className="min-w-0 text-xs space-y-1">
            <div className="text-sm font-black text-slate-900">
              {CATEGORY_EMOJI[product.category]} {product.name}
            </div>
            {size !== ONE_SIZE && (
              <div className="font-bold text-slate-600">
                {t('orderSize')}: <span className="font-mono">{size}</span>
              </div>
            )}
            <div className="font-black text-slate-900">{t('priceDT', { price: product.price })}</div>
            <div className={`text-[11px] font-bold ${inStock ? 'text-emerald-600' : 'text-amber-600'}`}>
              {inStock ? t('inStock') : t('outOfStock')}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-black text-slate-700">{t('orderForWhichChild')}</div>
          <div className="grid gap-2">
            {kids.map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  childId === c.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="order-child"
                  checked={childId === c.id}
                  onChange={() => setChildId(c.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-black text-slate-800">{c.studentName}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPlacing}
            className="flex-1 py-3 btn-duo-secondary text-xs font-bold cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPlacing || !child}
            className="flex-[2] py-3 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isPlacing ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
            <span>{t('confirmOrderFor', { price: product.price })}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const ParentPortal: React.FC = () => {
  const {
    students,
    groups,
    trainers,
    sessions,
    products,
    orders,
    activeParentStudentId,
    setActiveParentStudentId,
    placeOrder,
    updateStudentPhoto,
    updateParentContact,
    updateStudentNotes,
    showToast,
    currentUser
  } = useApp();
  const t = useT(parentMessages);
  const ts = useT(shopMessages);
  const { locale } = useLanguage();

  // Only this parent's children (admins previewing the portal see everyone)
  const isAdminViewer = !!currentUser?.roles.includes('admin');
  const parentEmail = currentUser?.email.toLowerCase() || '';
  const linkedIds = currentUser?.studentIds || (currentUser?.studentId ? [currentUser.studentId] : []);
  const myChildren = isAdminViewer
    ? students
    : students.filter(
        (s) => linkedIds.includes(s.id) || s.parentUid === currentUser?.uid || s.parentEmail.toLowerCase() === parentEmail
      );

  // Selected student
  const activeStudent = myChildren.find((s) => s.id === activeParentStudentId) || myChildren[0];
  // A child can attend several classes; their trainers are combined across them
  const assignedGroups = groups.filter((g) => activeStudent?.groupIds.includes(g.id));
  const assignedTrainers = trainers.filter((tr) => assignedGroups.some((g) => g.trainerIds.includes(tr.id)));
  const classNameOf = (groupId: string) => groups.find((g) => g.id === groupId)?.name || t('defaultClass');

  // Find all sessions involving this student
  const studentSessions = sessions.filter((sess) => {
    // Includes make-up sessions in other classes; the server only sends the child's own lines
    return !!activeStudent && !!sess.records[activeStudent.id];
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

  // Editing the parent's phone and contact email
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [contactError, setContactError] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const startEditContact = () => {
    setPhoneInput(activeStudent?.parentPhone || '');
    setEmailInput(activeStudent?.parentEmail || '');
    setContactError('');
    setIsEditingContact(true);
  };
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    const phone = phoneInput.trim();
    const email = emailInput.trim().toLowerCase();
    if (!isValidPhone(phone)) return setContactError(t('invalidPhone'));
    if (!isValidEmail(email)) return setContactError(t('invalidEmail'));
    setIsSavingContact(true);
    const ok = await updateParentContact(activeStudent.id, phone, email);
    setIsSavingContact(false);
    if (ok) setIsEditingContact(false);
  };
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeStudent) return;
    setIsUploadingPhoto(true);
    try {
      await updateStudentPhoto(activeStudent.id, await resizePhoto(file));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('photoReadError'), 'error');
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

  // Club shop: the server only sends products the admin has put on sale (admins get all, so filter again)
  const productsOnSale = products.filter((p) => p.isActive);
  // Orders of all this parent's children, newest first
  const familyOrders = orders
    .filter((o) => myChildren.some((c) => c.id === o.studentId))
    .sort((a, b) => orderTime(b).localeCompare(orderTime(a)));
  const showShop = productsOnSale.length > 0 || familyOrders.length > 0;
  const tsch = useT(scheduleMessages);
  const [scheduleAll, setScheduleAll] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{ product: Product; size: string } | null>(null);

  // Editing the notes for trainers
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  // Close any open edit form when the parent switches to another child
  useEffect(() => {
    setIsEditingNotes(false);
    setIsEditingContact(false);
  }, [activeStudent?.id]);
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    setIsSavingNotes(true);
    const ok = await updateStudentNotes(activeStudent.id, notesInput.trim());
    setIsSavingNotes(false);
    if (ok) setIsEditingNotes(false);
  };

  if (!activeStudent) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-2">
        <h1 className="text-2xl font-black text-slate-800">{t('noChildrenTitle')}</h1>
        <p className="text-xs text-slate-500 font-medium">
          {t('noChildrenText', { email: currentUser?.email ? ltr(currentUser.email) : t('thisAccount') })}
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
                <div className="text-xs font-black text-amber-600 uppercase tracking-wider">{t('mentorEvaluation')}</div>
                <h3 className="text-lg font-black text-slate-800">
                  {t('marksModalTitle', { name: activeStudent.studentName, avg: averageMark ?? '—' })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMarksOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {markHistory.length === 0 ? (
              <p className="py-6 text-center text-xs font-medium text-slate-400">{t('noMarksGiven')}</p>
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
            <span>{t('parentPortal')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('journeyTitle', { name: activeStudent.studentName.split(' ')[0] })}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{t('journeySubtitle')}</p>
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
                  className={`relative shrink-0 flex items-center gap-2.5 ps-1.5 pe-4 py-1.5 rounded-full border-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#191919] border-[#191919] text-white shadow-lg'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                  }`}
                >
                  <span className="relative">
                    <ChildAvatar student={s} size={34} />
                    <span className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-white ${STATUS_BADGE[s.status].dot}`} />
                  </span>
                  <span className="text-start leading-tight">
                    <span className="block text-xs font-black">{s.studentName.split(' ')[0]}</span>
                    <span className={`block text-[10px] font-bold ${active ? 'text-white/55' : 'text-slate-400'}`}>
                      {t('ageShort', { age: ageOf(s) })} · {t(STATUS_BADGE[s.status].label)}
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
            <div className="absolute -top-16 -end-10 w-48 h-48 rounded-full bg-sky-600/40 blur-3xl" />
          </div>
          <div className="px-6 pb-6 -mt-14 relative">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <ChildAvatar student={activeStudent} size={112} className="ring-4 ring-white shadow-xl" />
                <label
                  className="absolute bottom-0 end-0 w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white cursor-pointer hover:bg-sky-700 transition-colors"
                  title={t('changePhoto')}
                >
                  {isUploadingPhoto ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Camera className="w-4 h-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
              <h2 className="mt-3 text-xl font-black text-slate-900">{activeStudent.studentName}</h2>
              <p className="text-xs font-semibold text-slate-500">
                {t('ageMemberSince', {
                  age: ageOf(activeStudent),
                  date: new Date(`${activeStudent.registeredAt}T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
                })}
              </p>
              <span className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black ${STATUS_BADGE[activeStudent.status].cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_BADGE[activeStudent.status].dot}`} />
                {t(STATUS_BADGE[activeStudent.status].label)}
              </span>
              {activeStudent.photoURL && (
                <button
                  type="button"
                  onClick={() => updateStudentPhoto(activeStudent.id, null)}
                  className="mt-1.5 text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  {t('removePhoto')}
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { v: assignedGroups.length, l: assignedGroups.length === 1 ? t('statClass') : t('statClasses') },
                { v: studentSessions.length ? `${Math.round((totalAttended / studentSessions.length) * 100)}%` : '—', l: t('statAttendance') },
                { v: averageMark ?? '—', l: t('statAvg') }
              ].map((st) => (
                <div key={st.l} className="rounded-2xl bg-slate-50 border border-slate-100 py-3 text-center">
                  <div className="text-lg font-black font-mono text-slate-900">{st.v}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{st.l}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('contactDetails')}</span>
              {!isEditingContact && (
                <button
                  type="button"
                  onClick={startEditContact}
                  className="flex items-center gap-1 text-[11px] font-black text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{t('editContact')}</span>
                </button>
              )}
            </div>

            {isEditingContact ? (
              <form onSubmit={handleSaveContact} className="mt-3 space-y-3 text-xs font-bold text-slate-700">
                <div>
                  <label className="block mb-1">{t('labelPhone')}</label>
                  <input
                    type="tel"
                    dir="ltr"
                    required
                    autoComplete="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+216 55 123 456"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold font-mono focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t('labelEmail')}</label>
                  <input
                    type="email"
                    dir="ltr"
                    required
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                  <p className="mt-1 text-[10px] font-medium text-slate-400">{t('contactEmailHint')}</p>
                </div>
                {contactError && <p className="text-[11px] font-bold text-rose-600">{contactError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(false)}
                    className="px-3 py-1.5 btn-duo-secondary text-xs font-bold cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingContact}
                    className="px-4 py-1.5 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60"
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-3 space-y-3 text-xs">
                {[
                  { icon: <User className="w-4 h-4" />, label: t('labelParent'), value: activeStudent.parentName },
                  // Phone numbers and emails always read left to right, also in Arabic
                  { icon: <Phone className="w-4 h-4" />, label: t('labelPhone'), value: <span dir="ltr">{activeStudent.parentPhone}</span> },
                  { icon: <Mail className="w-4 h-4" />, label: t('labelEmail'), value: <span dir="ltr">{activeStudent.parentEmail}</span> },
                  { icon: <Award className="w-4 h-4" />, label: t('labelMemberId'), value: activeStudent.id.replace(/^std-/, '').toUpperCase() }
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
            )}

            <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">{t('notesForTrainers')}</div>
                {!isEditingNotes && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotesInput(activeStudent.notes || '');
                      setIsEditingNotes(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-black text-amber-800 hover:text-amber-950 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{t('editContact')}</span>
                  </button>
                )}
              </div>
              {isEditingNotes ? (
                <form onSubmit={handleSaveNotes} className="space-y-2">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    autoFocus
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder={t('notesPlaceholder')}
                    className="w-full px-3 py-2 bg-white border-2 border-amber-200 rounded-xl text-xs font-semibold text-amber-950 focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(false)}
                      className="px-3 py-1.5 btn-duo-secondary text-xs font-bold cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingNotes}
                      className="px-4 py-1.5 btn-duo-green text-xs font-black cursor-pointer disabled:opacity-60"
                    >
                      {t('save')}
                    </button>
                  </div>
                </form>
              ) : activeStudent.notes ? (
                <p className="text-xs font-semibold text-amber-900 leading-relaxed whitespace-pre-line">{activeStudent.notes}</p>
              ) : (
                <p className="text-xs font-medium text-amber-700/80">{t('notesEmpty')}</p>
              )}
            </div>
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
                <div className="text-xs font-black uppercase tracking-wider text-amber-700">{t('statusWaitlistHeading')}</div>
                <h2 className="text-lg font-black text-amber-950">{t('notRegisteredYet', { name: activeStudent.studentName })}</h2>
                <p className="text-xs font-semibold text-amber-800 mt-0.5">
                  {t('waitlistText', {
                    date: new Date(`${activeStudent.registeredAt}T12:00:00`).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }),
                    first: activeStudent.studentName.split(' ')[0]
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden p-5 rounded-3xl bg-[#191919] text-white flex items-start gap-4">
              <Gear teeth={16} duration={24} color="rgba(255,255,255,0.06)" windows={4} className="absolute -end-8 -top-10 w-40 h-40" />
              <div className="relative w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center shrink-0">
                {assignedGroups.length ? <PartyPopper className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>
              <div className="relative">
                <div className="text-xs font-black uppercase tracking-wider text-sky-400">
                  {assignedGroups.length ? t('statusActiveHeading') : t('statusAcceptedHeading')}
                </div>
                <h2 className="text-lg font-black">
                  {assignedGroups.length
                    ? t('registeredInClub', { name: activeStudent.studentName.split(' ')[0] })
                    : t('goodNewsAccepted', { name: activeStudent.studentName.split(' ')[0] })}
                </h2>
                <p className="text-xs font-semibold text-white/60 mt-0.5">
                  {assignedGroups.length
                    ? assignedGroups.length > 1
                      ? t('enrolledMany', { count: assignedGroups.length })
                      : t('enrolledOne')
                    : t('clubWillConfirm')}
                </p>
              </div>
            </div>
          )}

          {/* Key numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="duo-card p-5 bg-white space-y-1">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>{t('attendanceCaps')}</span>
                <Flame className="w-5 h-5 text-sky-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono flex items-baseline gap-1.5">
                <span>{totalAttended}</span>
                <span className="text-sm font-bold text-slate-400">{t('ofSessions', { count: studentSessions.length })}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-sky-500 to-sky-800"
                  initial={{ width: 0 }}
                  animate={{ width: `${studentSessions.length ? (totalAttended / studentSessions.length) * 100 : 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="text-[11px] font-bold text-slate-500">
                {studentSessions.length
                  ? t('lateAbsent', { late: totalLate, absent: studentSessions.length - totalAttended - totalLate })
                  : t('classesStartingSoon')}
              </div>
            </div>

            <button type="button" onClick={() => setIsMarksOpen(true)} className="duo-card p-5 bg-white text-start cursor-pointer flex items-center gap-4">
              <MarkRing mark={averageMark ? Number(averageMark) : undefined} size={76} />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-400">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  {t('mentorEvaluationCaps')}
                </div>
                <div className="text-sm font-black text-slate-900">
                  {markHistory.length
                    ? markHistory.length > 1
                      ? t('averageOfMany', { count: markHistory.length })
                      : t('averageOfOne')
                    : t('noMarksYet')}
                </div>
                {markHistory.length > 0 && <div className="text-[11px] font-bold text-sky-600">
                    {t('tapToSee')} <span className="inline-block rtl:rotate-180">→</span>
                  </div>}
              </div>
            </button>
          </div>

          {/* Classes & trainers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-600" />
                {t('classesTrainers')}
              </h3>
              {assignedTrainers.length > 0 && (
                <div className="flex -space-x-2">
                  {assignedTrainers.map((tr) => (
                    <TrainerAvatar key={tr.id} trainer={tr} size={30} />
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
                  <div className="text-sm font-black text-slate-900">{t('awaitingPlacement')}</div>
                  <p className="text-xs font-semibold text-slate-500">
                    {t('awaitingPlacementText', { name: activeStudent.studentName.split(' ')[0] })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedGroups.map((g, i) => {
                  const classTrainers = trainers.filter((tr) => g.trainerIds.includes(tr.id));
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
                      <div className="relative px-5 pt-16 pb-4 text-white overflow-hidden bg-slate-900">
                        <img src={g.imageUrl || CLASS_DEFAULT_IMAGE} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                        <div
                          className="absolute inset-0"
                          style={{ background: `linear-gradient(to top, ${classColorOf(g.id)} 0%, ${classColorOf(g.id)}cc 40%, transparent 100%)` }}
                        />
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-black uppercase tracking-wider font-mono">
                            {t('priceDT', { price: g.pricePerMonth })}
                          </span>
                        </div>
                        <h4 className="relative mt-2 text-lg font-black leading-tight">{g.name}</h4>
                        {g.description && <p className="relative text-xs font-semibold text-white/70 line-clamp-2">{g.description}</p>}
                      </div>

                      <div className="p-5 space-y-4 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              <Clock className="w-3 h-3" /> {t('when')}
                            </div>
                            <div className="font-black text-slate-900">{next.toLocaleDateString(locale, { weekday: 'long' })}</div>
                            <div className="font-semibold text-slate-500">{g.timeSlot}</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              <MapPin className="w-3 h-3" /> {t('where')}
                            </div>
                            <div className="font-black text-slate-900 leading-snug">{g.room || t('mainLab')}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100 text-xs">
                          <span className="relative flex w-2.5 h-2.5">
                            <span className="absolute inset-0 rounded-full bg-sky-500 animate-ping opacity-60" />
                            <span className="relative w-2.5 h-2.5 rounded-full bg-sky-600" />
                          </span>
                          <span className="font-bold text-slate-600">{t('nextSession')}</span>
                          <span className="ms-auto font-black text-sky-700">
                            {isToday ? t('today') : next.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <div className="space-y-2.5 mt-auto">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {classTrainers.length > 1 ? t('trainers') : t('trainer')}
                          </div>
                          {classTrainers.map((tr) => (
                            <div key={tr.id} className="flex items-center gap-3">
                              <TrainerAvatar trainer={tr} size={42} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-slate-900 truncate">{tr.name}</div>
                                <div className="text-[11px] font-semibold text-slate-500 truncate">{tr.specialty || tr.specialization}</div>
                              </div>
                              {tr.email && (
                                <a
                                  href={`mailto:${tr.email}`}
                                  className="w-8 h-8 rounded-full border-2 border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-300 flex items-center justify-center shrink-0"
                                  title={t('emailTrainer', { name: tr.name })}
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

      {/* Week schedule: classes + what the club added */}
      <section className="duo-card p-6 bg-white space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b-2 border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-500" />
              {tsch('title')}
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{tsch('subtitle')}</p>
          </div>
          {myChildren.length > 1 && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 text-xs font-black">
              <button
                onClick={() => setScheduleAll(false)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer ${!scheduleAll ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                {activeStudent.studentName.split(' ')[0]}
              </button>
              <button
                onClick={() => setScheduleAll(true)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer ${scheduleAll ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                {tsch('allChildren')}
              </button>
            </div>
          )}
        </div>
        <WeekSchedule students={scheduleAll ? myChildren : [activeStudent]} showStudentNames={scheduleAll} />
      </section>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Weekly Attendance & Teacher Remarks */}
        <div className={`${showShop ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6`}>
          <div className="duo-card p-6 bg-white space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-600" />
                  <span>{t('attendanceFeedback')}</span>
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {t('sessionsSummary', { sessions: studentSessions.length, present: totalAttended, late: totalLate })}
                </p>
              </div>
              {marksOldestFirst.length > 1 && (
                <div className="w-full sm:w-60 rounded-xl bg-slate-50 border border-slate-100 px-2 pt-1">
                  <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <span>{t('marksTrend')}</span>
                    <span className="text-amber-600">{t('avgValue', { avg: averageMark ?? '—' })}</span>
                  </div>
                  <MarkSparkline marks={marksOldestFirst} />
                </div>
              )}
            </div>

            {assignedGroups.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {[{ id: 'all', name: t('allClasses') }, ...assignedGroups].map((g) => {
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
                {t('noSessions')}
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

        {/* Right Column: club shop (only when the admin has products on sale) */}
        {showShop && (
          <div className="lg:col-span-5 space-y-6">
            <div className="duo-card p-6 bg-white space-y-5">
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-rose-500" />
                  <h3 className="text-base font-black text-slate-800">{t('clubShop')}</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">{t('merchandise')}</span>
              </div>

              {productsOnSale.length === 0 ? (
                <p className="text-xs font-medium text-slate-500">{t('nothingOnSale')}</p>
              ) : (
                <div className="scroll-panel max-h-[640px] space-y-4 pe-1">
                  {productsOnSale.map((product) => (
                    <ShopItem
                      key={product.id}
                      product={product}
                      onOrder={(size) => setPendingOrder({ product, size })}
                    />
                  ))}
                </div>
              )}

              {/* Orders of all the children, with their state */}
              {familyOrders.length > 0 && (
                <div className="pt-3 border-t-2 border-slate-100 space-y-2">
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{t('yourOrders')}</div>
                  <div className="scroll-panel max-h-72 space-y-2 pe-1">
                    {familyOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate">{ord.productName || ts('defaultProductName')}</span>
                          <span className="text-slate-500 text-[11px] block">
                            {t('orderedFor', { name: ord.studentName })}
                            {ord.size !== ONE_SIZE && ` · ${ord.size}`} · {t('priceDT', { price: ord.price })}
                          </span>
                          <span className="text-slate-400 text-[10px] block">
                            {ord.createdAt
                              ? new Date(ord.createdAt).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : new Date(ord.requestedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${ORDER_STATUS_STYLE[ord.status]}`}
                        >
                          {ts(`status_${ord.status}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {pendingOrder && (
        <OrderConfirmModal
          product={pendingOrder.product}
          size={pendingOrder.size}
          kids={myChildren}
          defaultChildId={activeStudent.id}
          onCancel={() => setPendingOrder(null)}
          onConfirm={(child) =>
            placeOrder({
              studentId: child.id,
              studentName: child.studentName,
              productId: pendingOrder.product.id,
              size: pendingOrder.size
            })
          }
        />
      )}
    </div>
  );
};
