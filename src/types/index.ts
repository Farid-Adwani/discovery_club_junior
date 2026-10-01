export type UserRole = 'visitor' | 'admin' | 'trainer' | 'parent';

export type AppPage =
  | 'home'
  | 'visitor'
  | 'login'
  | 'register-parent'
  | 'schedule-matrix'
  | 'admin'
  | 'trainer'
  | 'parent';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roles: UserRole[];
  photoURL?: string;
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

export type StudentStatus = 'waitlist' | 'accepted' | 'active';

export interface Student {
  id: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  parentUid?: string; // account of the parent who registered the child
  studentName: string;
  photoURL?: string; // small square JPEG stored as a data URL (resized in the browser)
  studentAge: number;
  programId: string; // program of the first class; '' until the admin places the child in a class
  status: StudentStatus;
  registeredAt: string;
  groupIds: string[]; // a child can attend several classes
  standardMonthlyPrice: number;
  customMonthlyPrice?: number; // admin override
  paymentStatus: 'paid' | 'pending' | 'scholarship';
  notes?: string;
}

export interface Program {
  id: string;
  title: string;
  ageRange: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Competitive';
  pricePerMonth: number;
  duration: string;
  badge: string;
  syllabus: {
    week: number;
    title: string;
    description: string;
    hardware: string;
  }[];
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
}

export interface Group {
  id: string;
  name: string;
  programId: string;
  trainerIds: string[]; // one or more trainers teach this class
  dayOfWeek: 'Wednesday' | 'Saturday' | 'Sunday';
  timeSlot: string;
  room: string;
  maxCapacity: number;
}

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
}

export type HoodieSize = '6-8Y' | '8-10Y' | '10-12Y' | '12-14Y' | 'S' | 'M' | 'L';

export interface HoodieDistribution {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  size: HoodieSize;
  isPersonalized: boolean;
  personalizedText?: string;
  status: 'requested' | 'ready' | 'picked_up';
  requestedAt: string;
  pickedUpAt?: string;
  price: number;
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
