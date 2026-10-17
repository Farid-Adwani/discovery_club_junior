export type UserRole = 'visitor' | 'admin' | 'trainer' | 'parent';

export type AppPage =
  | 'home'
  | 'visitor'
  | 'login'
  | 'register-parent'
  | 'admin'
  | 'trainer'
  | 'parent';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roles: UserRole[];
  photoURL?: string; // own profile photo (small JPEG data URL)
  birthDate?: string; // own date of birth, YYYY-MM-DD
  trainerId?: string;
  studentId?: string; // first child (kept for older accounts)
  studentIds?: string[]; // all children linked to this parent
  parentPhone?: string;
  childName?: string;
}

export interface FacebookComment {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface FacebookPost {
  id: string;
  caption: string;
  date: string;
  imageUrl: string;
  likes: number;
  comments: number;
  tag: string;
  postUrl: string;
  likedBy?: string[];
  commentsList?: FacebookComment[];
}

/** 'waitlist' = pending (shown as "Pending"); older 'active' records are read as 'accepted' */
export type StudentStatus = 'waitlist' | 'accepted';

export interface Student {
  id: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  parentUid?: string; // account of the parent who registered the child
  studentName: string;
  photoURL?: string; // small square JPEG stored as a data URL (resized in the browser)
  birthDate?: string; // YYYY-MM-DD; the age shown on the site is computed from it
  studentAge: number; // age when registered (only used when birthDate is missing, for older records)
  status: StudentStatus;
  registeredAt: string;
  groupIds: string[]; // a child can attend several classes
  standardMonthlyPrice: number;
  customMonthlyPrice?: number; // admin override
  /** 'scholarship' = free every month; 'paid'/'pending' mirror the current month's payment (see PaymentRecord) */
  paymentStatus: 'paid' | 'pending' | 'scholarship';
  notes?: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'cheque' | 'card' | 'other';
export type MonthlyPaymentStatus = 'paid' | 'partial' | 'pending' | 'scholarship';

/** What one child owes and paid for one month (`payments` collection, id = `${month}_${studentId}`). */
export interface PaymentRecord {
  id: string;
  studentId: string;
  month: string; // YYYY-MM
  amountDue: number; // DT, frozen when the record is saved (later price changes don't rewrite history)
  amountPaid: number; // DT
  status: MonthlyPaymentStatus; // derived from the amounts, except 'scholarship'
  method?: PaymentMethod;
  paidAt?: string; // YYYY-MM-DD
  note?: string;
  updatedAt: string; // ISO
  updatedBy?: string;
}

export interface Trainer {
  id: string;
  name: string;
  specialization: string;
  specialty?: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  birthDate?: string; // YYYY-MM-DD (only sent to admins and trainers)
}

export type CashType = 'income' | 'expense';

/** A category of the club cash book. `system` ones are filled automatically (fees, shop) and can't be deleted. */
export interface CashCategory {
  id: string;
  name: string;
  type: CashType;
  color: string; // hex
  system?: 'tuition' | 'shop';
  deletedAt?: string; // archived: kept so old entries still show their category
}

/** Money in or out of the club cash book, entered by an admin */
export interface CashEntry {
  id: string;
  type: CashType;
  amount: number; // DT, always positive
  date: string; // YYYY-MM-DD
  categoryId: string;
  label: string;
  note?: string;
  method?: PaymentMethod;
  createdAt: string;
  createdBy?: string;
}

/** A sign-in account as the admin sees it on the Team page (never the password) */
export interface AccountSummary {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'trainer' | 'parent';
  /** Club owner (ADMIN_EMAILS): always admin, can't be removed */
  owner: boolean;
  createdAt: string;
  phone?: string;
  photoURL?: string;
  trainerId?: string;
  children: { id: string; name: string }[];
}

/** An admin account's public side, for the team birthdays */
export interface AdminProfile {
  id: string;
  name: string;
  photoURL?: string;
  birthDate?: string;
}

/** Club team members who are not trainers (admins, office, cleaning, drivers…), mainly for birthdays. */
export interface StaffMember {
  id: string;
  name: string;
  role: 'admin' | 'worker';
  jobTitle?: string;
  birthDate: string; // YYYY-MM-DD
  createdAt: string;
}

/** Days a class can take place on, Monday first */
export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export interface Group {
  id: string;
  name: string;
  description?: string; // what the children do in this class, shown to parents and on the public site
  pricePerMonth: number; // a child's standard monthly price is the sum of their classes' prices
  trainerIds: string[]; // one or more trainers teach this class
  dayOfWeek: WeekDay;
  timeSlot: string;
  room: string;
  maxCapacity?: number; // missing = no limit on the number of children
  imageUrl?: string; // wide JPEG data URL; missing = the default class picture (CLASS_DEFAULT_IMAGE)
}

/** Picture shown for a class that has no image of its own */
export const CLASS_DEFAULT_IMAGE = '/photos/class_default.svg';

export interface StudentAttendanceRecord {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'unmarked';
  rating?: number; // mark out of 20; missing = not rated (e.g. absent)
  ratedBy?: string; // trainer who gave the mark
  ratedAt?: string; // when the mark was saved (YYYY-MM-DD HH:MM)
  pedagogicalRemark?: string;
  remarks?: string;
}

export interface SessionRecord {
  id: string;
  groupId: string;
  date: string;
  weekNumber: number;
  topicTaught: string;
  isSyllabusValidated: boolean;
  validatedAt?: string;
  trainerNotes?: string;
  records: Record<string, StudentAttendanceRecord>; // studentId -> record
  /** Children from other classes who came to this session (make-up); their line is in `records` */
  extraStudentIds?: string[];
  /** People without a student record (trial, visitor), added by hand; only the club team sees them */
  guests?: SessionGuest[];
  updatedAt?: string; // ISO
  updatedBy?: string; // name of who saved it
}

export interface SessionGuest {
  id: string;
  name: string;
  phone?: string;
  status: StudentAttendanceRecord['status'];
  remarks?: string;
}

export type ProductCategory = 'tshirt' | 'hoodie' | 'jacket' | 'hat' | 'bag' | 'other';

/** Club merchandise. Parents and visitors only see products the admin has activated. */
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number; // DT
  imageUrl: string; // URL or small resized data URL
  sizes: string[]; // e.g. ['8-10Y', 'S', 'M']; empty = one size
  stock: Record<string, number>; // size (or 'ONE') -> units in the warehouse
  isActive: boolean; // on sale
  createdAt: string;
}

/** A parent's order for one product (stored in `hoodie_distributions` for older data). */
export interface ProductOrder {
  id: string;
  productId?: string; // missing on orders placed before the shop supported several products
  productName?: string;
  studentId: string;
  studentName: string;
  parentName: string;
  size: string;
  isPersonalized?: boolean; // legacy embroidery option
  personalizedText?: string;
  /** ready and picked_up hold one unit of stock; requested and cancelled don't */
  status: 'requested' | 'ready' | 'picked_up' | 'cancelled';
  requestedAt: string; // YYYY-MM-DD
  createdAt?: string; // exact time (ISO), missing on older orders
  pickedUpAt?: string;
  price: number;
}

export type ScheduleItemKind = 'course' | 'event' | 'meeting' | 'other' | 'cancellation';

/**
 * Something the admin added to (or removed from) one or more students' weekly schedule.
 * Regular classes come from Group.dayOfWeek/timeSlot; a 'cancellation' skips one class (groupId) on one date.
 */
export interface ScheduleItem {
  id: string;
  studentIds: string[];
  /** Coaches it is for (meetings, trainings…); shown in their week schedule. Only the club team sees it. */
  trainerIds?: string[];
  kind: ScheduleItemKind;
  title: string; // '' for a cancellation
  recurrence: 'once' | 'weekly';
  date: string; // YYYY-MM-DD: the day (once) or the first day (weekly, repeats on that weekday)
  startTime: string; // HH:MM ('' for a cancellation)
  endTime: string;
  location?: string;
  notes?: string;
  groupId?: string; // cancellation only
  createdAt: string;
}

export interface MaterialRequest {
  id: string;
  trainerId: string;
  trainerName: string;
  groupId: string;
  groupName: string;
  itemsNeeded: string;
  quantity: string;
  urgency: 'low' | 'medium' | 'urgent';
  status: 'pending' | 'approved' | 'delivered';
  requestedAt: string;
  sessionDate: string;
}

export interface ClubEvent {
  id: string;
  title: string;
  category: 'Competition' | 'Hackathon' | 'Exhibition' | 'Masterclass';
  date: string;
  time: string;
  location: string;
  description: string;
  spotsLeft: number;
  isRegistered: boolean;
}
