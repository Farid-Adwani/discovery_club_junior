import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UserRole,
  AppPage,
  AppUser,
  Student,
  Trainer,
  Group,
  Product,
  ProductOrder,
  ScheduleItem,
  StaffMember,
  AdminProfile,
  SessionRecord,
  MaterialRequest,
  StudentAttendanceRecord,
  PaymentRecord,
  PaymentMethod,
  SessionGuest,
  StockCategory,
  StockItem,
  StockLocation,
  StockMovement
} from '../types';
import type { LandingContent } from '../data/landing';
import {
  INITIAL_TRAINERS,
  INITIAL_GROUPS,
} from '../data/initialData';
import { api, ApiError } from '../api';
import { clearSessionToken, getSessionToken, setSessionToken } from '../session';
import { translate } from '../i18n';
import { toastMessages } from '../i18n/messages/toasts';

const tt = (key: keyof (typeof toastMessages)['en'], vars?: Record<string, string | number>) =>
  translate(toastMessages, key, vars);

const ROLE_KEYS = { admin: 'roleAdmin', trainer: 'roleTrainer', parent: 'roleParent', visitor: 'roleVisitor' } as const;
const STUDENT_STATUS_KEYS = { waitlist: 'statusWaitlist', accepted: 'statusAccepted', active: 'statusActive' } as const;
const ORDER_STATUS_KEYS = { requested: 'orderRequested', ready: 'orderReady', picked_up: 'orderPickedUp', cancelled: 'orderCancelled' } as const;

interface Toast {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface ClubData {
  trainers: Trainer[];
  groups: Group[];
  products: Product[];
  students: Student[];
  sessions: SessionRecord[];
  /** Admin: attendance sheets are loaded from this date (YYYY-MM-DD) */
  sessionsFrom?: string;
  orders: ProductOrder[];
  materialRequests: MaterialRequest[];
  scheduleItems?: ScheduleItem[];
  payments?: PaymentRecord[];
  deletedStudents?: Student[];
  stockItems?: StockItem[];
  stockCategories?: StockCategory[];
  stockLocations?: StockLocation[];
  stockMovements?: StockMovement[];
  staffMembers?: StaffMember[];
  adminProfiles?: AdminProfile[];
  landing?: LandingContent;
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  navigateTo: (page: AppPage) => void;
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  loginWithEmailPassword: (email: string, pass: string) => Promise<boolean>;
  /** Public landing page texts, hidden sections, counters (Admin → Landing page) */
  landing: LandingContent;
  saveLanding: (content: LandingContent) => Promise<boolean>;
  /** A signed-in parent registers more children on their account (they start on the waitlist) */
  addMyChildren: (data: { parentPhone: string; children: { name: string; birthDate: string; notes?: string }[] }) => Promise<boolean>;
  registerParentAccount: (data: {
    parentName: string;
    parentEmail: string;
    password: string;
    parentPhone: string;
    children: { name: string; birthDate: string; notes?: string }[];
    /** Ticked "I accept the terms & privacy policy" (required) */
    acceptedTerms: boolean;
    /** Allows the club to publish photos of the children */
    photoConsent: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  authModalInitialTab: 'login' | 'register-parent';
  setAuthModalInitialTab: (tab: 'login' | 'register-parent') => void;

  activeTrainerId: string;
  setActiveTrainerId: (id: string) => void;
  activeParentStudentId: string;
  setActiveParentStudentId: (id: string) => void;

  students: Student[];
  trainers: Trainer[];
  groups: Group[];
  /** Admins and workers (not trainers), for the team birthdays; only loaded for the team */
  staffMembers: StaffMember[];
  /** Admin accounts (name, photo, date of birth), for the team birthdays; only loaded for the team */
  adminProfiles: AdminProfile[];
  /** The signed-in user edits their own name / photo (data URL, null = remove) / date of birth (null = remove) */
  updateMyProfile: (data: { displayName?: string; photo?: string | null; birthDate?: string | null }) => Promise<boolean>;
  /** Courses, events, meetings and class cancellations the admin added to students' weeks */
  scheduleItems: ScheduleItem[];
  /** Admin: every product. Everyone else: only products on sale. */
  products: Product[];
  orders: ProductOrder[];
  sessions: SessionRecord[];
  /** Admin: the oldest date of the loaded attendance sheets ('' = all of them, e.g. for coaches and parents) */
  sessionsFrom: string;
  /** Admin: also load attendance sheets from this date (YYYY-MM-DD), when it is older than the ones loaded */
  loadSessionsFrom: (date: string) => Promise<void>;
  materialRequests: MaterialRequest[];


  /** Reload everything from the server (after changes made outside these helpers) */
  refreshData: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  /** True once the backend API has answered */
  isFirebaseConnected: boolean;
  /** True while a saved sign-in is being restored after a page load (protected pages wait for it) */
  isRestoringSession: boolean;

  // Student actions
  updateStudentStatus: (studentId: string, status: Student['status']) => Promise<void>;
  /** customPrice: a number = custom fee, null = follow the class prices, undefined = unchanged */
  updateStudentPrice: (studentId: string, customPrice?: number | null, paymentStatus?: Student['paymentStatus']) => Promise<void>;
  /** Admin: monthly payment records of every child */
  payments: PaymentRecord[];
  /** Admin: save what a child owes / paid for a month (YYYY-MM). Returns true on success. */
  savePayment: (
    month: string,
    studentId: string,
    data: { amountDue: number; amountPaid: number; method?: PaymentMethod; paidAt?: string; note?: string; scholarship?: boolean }
  ) => Promise<boolean>;
  /** Admin: mark children fully paid for a month */
  markPaymentsPaid: (month: string, studentIds: string[], method?: PaymentMethod) => Promise<boolean>;
  /** Admin: remove a month's record (back to unpaid) */
  resetPayment: (month: string, studentId: string) => Promise<boolean>;
  /** Adds the child to a class (children can be in several classes) */
  assignStudentToGroup: (studentId: string, groupId: string) => Promise<void>;
  removeStudentFromGroup: (studentId: string, groupId: string) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  /** Admin: deleted children (the trash), newest first */
  deletedStudents: (Student & { deletedAt?: string })[];
  /** Admin: take a child out of the trash */
  restoreStudent: (studentId: string) => Promise<boolean>;
  /** Parent or admin: set (data URL) or remove (null) a child's profile photo */
  updateStudentPhoto: (studentId: string, photo: string | null) => Promise<void>;
  /** Parent: change the phone and contact email the club uses (all their children). Returns true on success. */
  updateParentContact: (studentId: string, parentPhone: string, parentEmail: string) => Promise<boolean>;
  /** Parent or admin: notes for trainers; '' removes them. Returns true on success. */
  updateStudentNotes: (studentId: string, notes: string) => Promise<boolean>;

  // Group actions
  /** Return true when saved */
  createGroup: (group: Omit<Group, 'id'>) => Promise<boolean>;
  updateGroup: (group: Group) => Promise<boolean>;
  deleteGroup: (groupId: string) => Promise<boolean>;

  // Session & Attendance
  saveSessionAttendance: (
    groupId: string,
    date: string,
    weekNumber: number,
    topicTaught: string,
    records: Record<string, StudentAttendanceRecord>,
    validateSyllabus: boolean,
    trainerNotes?: string,
    extras?: { extraStudentIds?: string[]; guests?: SessionGuest[] }
  ) => Promise<boolean>;

  // Material requests
  createMaterialRequest: (data: {
    groupId: string;
    itemsNeeded: string;
    quantity: string;
    urgency: 'low' | 'medium' | 'urgent';
    sessionDate: string;
    stockItemId?: string;
    comment?: string;
  }) => Promise<void>;
  /** Coach (own requests) or admin: add a message to a request */
  addRequestComment: (requestId: string, text: string) => Promise<boolean>;
  /** Admin: change a request's status and/or its stock item (null = unlink). Delivering takes it from the stock. */
  updateMaterialRequestStatus: (requestId: string, status?: MaterialRequest['status'], stockItemId?: string | null, reason?: string) => Promise<boolean>;
  /** Stock (admin: everything; coaches: the items visible to them) */
  stockItems: StockItem[];
  stockCategories: StockCategory[];
  stockLocations: StockLocation[];
  stockMovements: StockMovement[];

  // Team (admin)
  saveStaffMember: (member: Omit<StaffMember, 'id' | 'createdAt'> & { id?: string }) => Promise<boolean>;
  deleteStaffMember: (id: string) => Promise<boolean>;
  setTrainerBirthDate: (trainerId: string, birthDate: string | null) => Promise<boolean>;

  // Weekly schedule (admin)
  addScheduleItem: (item: Omit<ScheduleItem, 'id' | 'createdAt'>) => Promise<boolean>;
  deleteScheduleItem: (itemId: string) => Promise<boolean>;
  removeStudentFromScheduleItem: (itemId: string, studentId: string) => Promise<boolean>;
  removeTrainerFromScheduleItem: (itemId: string, trainerId: string) => Promise<boolean>;

  // Club shop
  saveProduct: (product: Omit<Product, 'stock' | 'createdAt'>) => Promise<void>;
  setProductActive: (productId: string, isActive: boolean) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addProductStock: (productId: string, size: string, amount: number) => Promise<void>;
  /** Returns true when the order was saved */
  placeOrder: (data: { studentId: string; studentName: string; productId: string; size: string }) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: ProductOrder['status']) => Promise<void>;

  // Trainer management
  addTrainer: (trainer: Trainer) => Promise<void>;
  updateTrainer: (trainer: Trainer) => Promise<void>;

  // Event registration

}

const AppContext = createContext<AppContextType | undefined>(undefined);

// The current page lives in the address bar (#/admin, #/login…) so a refresh reopens the same page
const PAGES: AppPage[] = ['home', 'login', 'register-parent', 'admin', 'trainer', 'parent', 'privacy', 'terms'];
const PORTALS: AppPage[] = ['admin', 'trainer', 'parent'];

function pageFromHash(): AppPage {
  // "#/admin/students" -> "admin" (the admin dashboard keeps its open section in the rest)
  const name = window.location.hash.replace(/^#\/?/, '').split('/')[0];
  return (PAGES as string[]).includes(name) ? (name as AppPage) : 'home';
}

const hashFor = (page: AppPage) => (page === 'home' ? '' : `#/${page}`);

const REFRESH_INTERVAL_MS = 30_000;

function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return tt('wrongCredentials');
    if (err.status === 409) return tt('emailInUse');
    if (err.status === 429) return tt('tooManyRequests');
    if (err.status === 403) return tt('staffEmail');
  }
  return err instanceof Error ? err.message : tt('signInFailed');
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user state (the session token is kept in the browser; the profile comes from /api/me)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentPage, setCurrentPageState] = useState<AppPage>(pageFromHash);
  const [role, setRoleState] = useState<UserRole>(() =>
    PORTALS.includes(currentPage) ? (currentPage as UserRole) : 'visitor'
  );
  const [isRestoringSession, setIsRestoringSession] = useState(() => !!getSessionToken());

  // Keep the address bar in sync with the page (new history entry, so Back works)
  const pageFromHistory = useRef(false);
  useEffect(() => {
    if (pageFromHistory.current) {
      pageFromHistory.current = false;
      return;
    }
    if (pageFromHash() !== currentPage || (currentPage === 'home' && window.location.hash)) {
      window.history.pushState(null, '', hashFor(currentPage) || window.location.pathname + window.location.search);
    }
  }, [currentPage]);
  // Browser Back / Forward
  useEffect(() => {
    const onPop = () => {
      const page = pageFromHash();
      if (page === currentPageRef.current) return;
      pageFromHistory.current = true;
      setCurrentPageState(page);
      setRoleState(PORTALS.includes(page) ? (page as UserRole) : 'visitor');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // Read by the auth listener, which is created once and would otherwise see the first value
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const setCurrentPage = (page: AppPage) => {
    setCurrentPageState(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateTo = (page: AppPage) => {
    const dest: AppPage = page === 'visitor' ? 'home' : page;

    if (dest === 'admin') {
      if (!currentUser || !currentUser.roles.includes('admin')) {
        showToast(tt('needAdmin'), 'error');
        setCurrentPageState('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setRoleState('admin');
    } else if (dest === 'trainer') {
      if (!currentUser || !currentUser.roles.includes('trainer')) {
        showToast(tt('needTrainer'), 'error');
        setCurrentPageState('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setRoleState('trainer');
    } else if (dest === 'parent') {
      if (!currentUser || !currentUser.roles.includes('parent')) {
        showToast(tt('needParent'), 'info');
        setCurrentPageState('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setRoleState('parent');
    } else if (dest === 'home') {
      setRoleState('visitor');
    }

    setCurrentPageState(dest);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Opens a user's own portal right after sign-in (navigateTo would still see the old currentUser). */
  const openPortalFor = (profile: AppUser) => {
    setRoleState(profile.role);
    setCurrentPageState(profile.role === 'visitor' ? 'home' : profile.role);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [activeTrainerId, setActiveTrainerId] = useState<string>('');
  const [activeParentStudentId, setActiveParentStudentId] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register-parent'>('login');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Data states. Public content starts with the built-in defaults until the API answers;
  // private data (students, attendance, orders) only ever comes from the API.
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>(INITIAL_TRAINERS);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [products, setProducts] = useState<Product[]>([]);
  const [landing, setLanding] = useState<LandingContent>({});
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockCategories, setStockCategories] = useState<StockCategory[]>([]);
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [deletedStudents, setDeletedStudents] = useState<(Student & { deletedAt?: string })[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [sessionsFrom, setSessionsFrom] = useState('');
  // Older attendance sheets the admin asked for; the server sends the last few months by default
  const sessionsFromRequest = useRef('');
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Safe role switcher
  const setRole = (newRole: UserRole) => {
    if (newRole === 'visitor') {
      setRoleState('visitor');
      return;
    }

    if (!currentUser) {
      showToast(tt('needSignInSpace'), 'info');
      setAuthModalInitialTab(newRole === 'parent' ? 'register-parent' : 'login');
      setIsLoginModalOpen(true);
      return;
    }

    if (currentUser.roles.includes(newRole)) {
      setRoleState(newRole);
      showToast(tt('navigatedTo', { role: tt(ROLE_KEYS[newRole]).toUpperCase() }));
    } else {
      showToast(tt('accessRestricted', { role: tt(ROLE_KEYS[newRole]).toUpperCase() }), 'error');
    }
  };

  // ---------- loading data ----------

  // Only the newest request may update state, so a slow old response never overwrites fresh data
  const refreshSeq = useRef(0);
  const profileSeq = useRef(0);

  const refresh = async () => {
    const seq = ++refreshSeq.current;
    try {
      const data = await api<ClubData>(sessionsFromRequest.current ? `/data?sessionsFrom=${sessionsFromRequest.current}` : '/data');
      if (seq !== refreshSeq.current) return;
      setTrainers(data.trainers);
      setGroups(data.groups);
      setProducts(data.products || []);
      setLanding(data.landing || {});
      setStudents(data.students);
      setSessions(data.sessions);
      setSessionsFrom(data.sessionsFrom || '');
      setOrders(data.orders || []);
      setScheduleItems(data.scheduleItems || []);
      setPayments(data.payments || []);
      setStockItems(data.stockItems || []);
      setStockCategories(data.stockCategories || []);
      setStockLocations(data.stockLocations || []);
      setStockMovements(data.stockMovements || []);
      setDeletedStudents(data.deletedStudents || []);
      setStaffMembers(data.staffMembers || []);
      setAdminProfiles(data.adminProfiles || []);
      setMaterialRequests(data.materialRequests);
      setIsFirebaseConnected(true);
    } catch (err) {
      if (seq !== refreshSeq.current) return;
      console.warn('Could not load club data from the API:', err);
      setIsFirebaseConnected(false);
    }
  };

  const loadProfile = async (): Promise<AppUser | null> => {
    const seq = ++profileSeq.current;
    let profile: AppUser | null = null;
    if (getSessionToken()) {
      try {
        profile = await api<AppUser>('/me');
      } catch (err) {
        // Expired or revoked session: forget it
        if (err instanceof ApiError && err.status === 401) clearSessionToken();
        else throw err;
      }
    }
    if (seq !== profileSeq.current) return profile;

    setCurrentUser(profile);
    if (profile?.trainerId) setActiveTrainerId(profile.trainerId);
    const firstChild = profile?.studentIds?.[0] || profile?.studentId;
    if (firstChild) setActiveParentStudentId(firstChild);
    if (!profile) setRoleState('visitor');
    else if (!profile.roles.includes(role)) setRoleState(profile.role);
    return profile;
  };

  const loadSessionsFrom = async (date: string) => {
    if (!sessionsFrom || date >= sessionsFrom) return;
    sessionsFromRequest.current = date;
    await refresh();
  };

  /** Runs an API write, then reloads data. Errors are shown as a toast. */
  const mutate = async (fn: () => Promise<unknown>, successMessage?: string): Promise<boolean> => {
    try {
      await fn();
      if (successMessage) showToast(successMessage);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : tt('somethingWrong'), 'error');
      return false;
    } finally {
      await refresh();
    }
  };

  // Restores the session after a page reload
  useEffect(() => {
    (async () => {
      try {
        const profile = await loadProfile();
        // A parent who comes back already signed in goes straight to their space
        // (unless they already moved away from the home page while it loaded)
        if (profile?.role === 'parent' && currentPageRef.current === 'home') openPortalFor(profile);
      } catch (err) {
        console.warn('Could not load profile:', err);
        setCurrentUser(null);
      } finally {
        setIsRestoringSession(false);
      }
      await refresh();
    })();
  }, []);

  // Periodic refresh so changes made by others show up without reloading
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // ---------- auth ----------

  const finishSignIn = async (token: string, welcome: 'welcomeBack' | 'accountCreated') => {
    setSessionToken(token);
    const [profile] = await Promise.all([loadProfile(), refresh()]);
    setIsLoginModalOpen(false);
    if (profile) {
      showToast(tt(welcome, { name: profile.displayName }));
      openPortalFor(profile);
    }
  };

  const loginWithEmailPassword = async (email: string, pass: string): Promise<boolean> => {
    try {
      const { token } = await api<{ token: string }>('/auth/login', { method: 'POST', body: { email: email.trim(), password: pass } });
      await finishSignIn(token, 'welcomeBack');
      return true;
    } catch (err) {
      showToast(authErrorMessage(err), 'error');
      return false;
    }
  };

  const addMyChildren = async (data: { parentPhone: string; children: { name: string; birthDate: string; notes?: string }[] }) => {
    if (!currentUser) return false;
    const ok = await mutate(
      () =>
        api('/parents/register', {
          method: 'POST',
          body: { parentName: currentUser.displayName, parentPhone: data.parentPhone, children: data.children }
        }),
      tt('childrenAdded', { count: data.children.length })
    );
    // The account's list of children changed
    if (ok) await loadProfile();
    return ok;
  };

  // A parent can register several children at once. No course is picked here:
  // each child lands on the waitlist and the admin places them in a group.
  const registerParentAccount = async (data: {
    parentName: string;
    parentEmail: string;
    password: string;
    parentPhone: string;
    children: { name: string; birthDate: string; notes?: string }[];
    acceptedTerms: boolean;
    photoConsent: boolean;
  }) => {
    const form = {
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      children: data.children,
      acceptedTerms: data.acceptedTerms,
      photoConsent: data.photoConsent
    };
    try {
      if (currentUser) {
        // Already signed in: just add the children to this account
        await api('/parents/register', { method: 'POST', body: form });
        await finishSignIn(getSessionToken() || '', 'accountCreated');
      } else {
        const { token } = await api<{ token: string }>('/auth/register', {
          method: 'POST',
          body: { ...form, email: data.parentEmail.trim(), password: data.password }
        });
        await finishSignIn(token, 'accountCreated');
      }
    } catch (err) {
      showToast(authErrorMessage(err), 'error');
    }
  };

  const logout = async () => {
    // Stop this device's notifications for this account. The browser keeps its permission,
    // so the next sign-in registers the device again without asking (NotificationBell).
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration('/sw.js') : undefined;
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
    } catch {
      // Never block signing out
    }
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Signed out locally anyway
    }
    clearSessionToken();
    setCurrentUser(null);
    setRoleState('visitor');
    navigateTo('login');
    showToast(tt('signedOut'));
    refresh();
  };

  // ---------- students & waitlist ----------

  const updateStudentStatus = async (studentId: string, status: Student['status']) => {
    await mutate(
      () => api(`/admin/students/${studentId}`, { method: 'PATCH', body: { status } }),
      tt('studentStatusUpdated', { status: tt(STUDENT_STATUS_KEYS[status]).toUpperCase() })
    );
  };

  const updateStudentPrice = async (studentId: string, customPrice?: number | null, paymentStatus?: Student['paymentStatus']) => {
    await mutate(
      () =>
        api(`/admin/students/${studentId}`, {
          method: 'PATCH',
          body: { customMonthlyPrice: customPrice, paymentStatus }
        }),
      tt('pricingUpdated')
    );
  };

  const savePayment: AppContextType['savePayment'] = (month, studentId, data) =>
    mutate(() => api(`/admin/payments/${month}/${studentId}`, { method: 'PUT', body: data }), tt('paymentSaved'));

  const markPaymentsPaid: AppContextType['markPaymentsPaid'] = (month, studentIds, method = 'cash') =>
    mutate(
      () => api(`/admin/payments/${month}/mark-paid`, { method: 'POST', body: { studentIds, method } }),
      tt('paymentsMarkedPaid', { count: studentIds.length })
    );

  const resetPayment: AppContextType['resetPayment'] = (month, studentId) =>
    mutate(() => api(`/admin/payments/${month}/${studentId}`, { method: 'DELETE' }), tt('paymentReset'));

  const assignStudentToGroup = async (studentId: string, groupId: string) => {
    await mutate(
      () => api(`/admin/students/${studentId}/classes`, { method: 'POST', body: { groupId } }),
      tt('childAdded')
    );
  };

  const removeStudentFromGroup = async (studentId: string, groupId: string) => {
    await mutate(
      () => api(`/admin/students/${studentId}/classes/${groupId}`, { method: 'DELETE' }),
      tt('childRemoved')
    );
  };

  const restoreStudent = async (studentId: string) => {
    let dropped: string[] = [];
    const ok = await mutate(async () => {
      ({ droppedClasses: dropped } = await api<{ droppedClasses: string[] }>(`/admin/students/${studentId}/restore`, { method: 'POST' }));
    });
    if (ok) showToast(dropped.length ? tt('studentRestoredFull', { classes: dropped.join(', ') }) : tt('studentRestored'), dropped.length ? 'info' : 'success');
    return ok;
  };

  const deleteStudent = async (studentId: string) => {
    await mutate(() => api(`/admin/students/${studentId}`, { method: 'DELETE' }), tt('studentRemoved'));
  };

  const updateStudentPhoto = async (studentId: string, photo: string | null) => {
    await mutate(
      () => api(`/students/${studentId}/photo`, { method: 'PUT', body: { photo } }),
      photo ? tt('photoUpdated') : tt('photoRemoved')
    );
  };

  const updateStudentNotes = async (studentId: string, notes: string) =>
    mutate(() => api(`/students/${studentId}/notes`, { method: 'PUT', body: { notes } }), tt('notesUpdated'));

  const updateParentContact = async (studentId: string, parentPhone: string, parentEmail: string) =>
    mutate(
      () => api('/parents/contact', { method: 'PUT', body: { studentId, parentPhone, parentEmail } }),
      tt('contactUpdated')
    );

  // ---------- groups ----------

  const createGroup = async (groupData: Omit<Group, 'id'>) =>
    mutate(() => api('/admin/groups', { method: 'POST', body: groupData }), tt('classCreated', { name: groupData.name }));

  const updateGroup = async (updatedGroup: Group) =>
    mutate(() => api(`/admin/groups/${updatedGroup.id}`, { method: 'PUT', body: updatedGroup }), tt('classUpdated'));

  const deleteGroup = async (groupId: string) =>
    mutate(() => api(`/admin/groups/${groupId}`, { method: 'DELETE' }), tt('classDeleted'));

  // ---------- sessions & attendance ----------

  const saveSessionAttendance = async (
    groupId: string,
    date: string,
    weekNumber: number,
    topicTaught: string,
    records: Record<string, StudentAttendanceRecord>,
    validateSyllabus: boolean,
    trainerNotes?: string,
    extras: { extraStudentIds?: string[]; guests?: SessionGuest[] } = {}
  ) =>
    mutate(
      () =>
        api('/sessions', {
          method: 'POST',
          body: { groupId, date, weekNumber, topicTaught, records, validateSyllabus, trainerNotes, ...extras }
        }),
      tt('attendanceSaved', { date })
    );

  // ---------- material requests ----------

  const createMaterialRequest = async (data: {
    groupId: string;
    itemsNeeded: string;
    quantity: string;
    urgency: 'low' | 'medium' | 'urgent';
    sessionDate: string;
    stockItemId?: string;
    comment?: string;
  }) => {
    await mutate(
      () => api('/material-requests', { method: 'POST', body: { ...data, trainerId: activeTrainerId } }),
      tt('equipmentSent')
    );
  };

  const addRequestComment = (requestId: string, text: string) =>
    mutate(() => api(`/material-requests/${requestId}/comments`, { method: 'POST', body: { text } }));

  const updateMaterialRequestStatus = (requestId: string, status?: MaterialRequest['status'], stockItemId?: string | null, reason?: string) =>
    mutate(
      () => api(`/admin/material-requests/${requestId}`, { method: 'PATCH', body: { status, stockItemId, reason } }),
      tt('equipmentUpdated')
    );

  // ---------- own profile ----------

  const updateMyProfile = async (data: { displayName?: string; photo?: string | null; birthDate?: string | null }) => {
    const ok = await mutate(() => api('/me/profile', { method: 'PUT', body: data }), tt('profileSaved'));
    if (ok) await loadProfile().catch(() => {});
    return ok;
  };

  // ---------- team ----------

  const saveStaffMember = async (member: Omit<StaffMember, 'id' | 'createdAt'> & { id?: string }) =>
    mutate(
      () =>
        member.id
          ? api(`/admin/staff/${member.id}`, { method: 'PUT', body: member })
          : api('/admin/staff', { method: 'POST', body: member }),
      tt('teamMemberSaved', { name: member.name })
    );

  const deleteStaffMember = async (id: string) =>
    mutate(() => api(`/admin/staff/${id}`, { method: 'DELETE' }), tt('teamMemberDeleted'));

  const setTrainerBirthDate = async (trainerId: string, birthDate: string | null) =>
    mutate(() => api(`/admin/trainers/${trainerId}/birth-date`, { method: 'PATCH', body: { birthDate } }), tt('birthDateSaved'));

  // ---------- weekly schedule ----------

  const addScheduleItem = async (item: Omit<ScheduleItem, 'id' | 'createdAt'>) =>
    mutate(
      () => api('/admin/schedule-items', { method: 'POST', body: item }),
      tt(item.kind === 'cancellation' ? 'classCancelledForDay' : 'scheduleItemAdded')
    );

  const deleteScheduleItem = async (itemId: string) =>
    mutate(() => api(`/admin/schedule-items/${itemId}`, { method: 'DELETE' }), tt('scheduleItemRemoved'));

  const removeTrainerFromScheduleItem = async (itemId: string, trainerId: string) =>
    mutate(() => api(`/admin/schedule-items/${itemId}/trainers/${trainerId}`, { method: 'DELETE' }), tt('scheduleItemRemoved'));

  const removeStudentFromScheduleItem = async (itemId: string, studentId: string) =>
    mutate(
      () => api(`/admin/schedule-items/${itemId}/students/${studentId}`, { method: 'DELETE' }),
      tt('scheduleItemRemoved')
    );

  // ---------- club shop ----------

  const saveProduct = async (product: Omit<Product, 'stock' | 'createdAt'>) => {
    await mutate(() => api(`/admin/products/${product.id}`, { method: 'PUT', body: product }), tt('productSaved', { name: product.name }));
  };

  const setProductActive = async (productId: string, isActive: boolean) => {
    await mutate(
      () => api(`/admin/products/${productId}/active`, { method: 'PATCH', body: { isActive } }),
      isActive ? tt('productOnSale') : tt('productHidden')
    );
  };

  const deleteProduct = async (productId: string) => {
    await mutate(() => api(`/admin/products/${productId}`, { method: 'DELETE' }), tt('productDeleted'));
  };

  const addProductStock = async (productId: string, size: string, amount: number) => {
    await mutate(() => api(`/admin/products/${productId}/stock`, { method: 'POST', body: { size, amount } }), tt('stockUpdated'));
  };

  // The new order is shown as soon as the server confirms it; the full reload (stock etc.) runs in the background
  const placeOrder = async (data: { studentId: string; studentName: string; productId: string; size: string }) => {
    try {
      const order = await api<ProductOrder>('/orders', {
        method: 'POST',
        body: { studentId: data.studentId, productId: data.productId, size: data.size }
      });
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      showToast(tt('orderRegistered', { name: data.studentName }));
      void refresh();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : tt('somethingWrong'), 'error');
      void refresh();
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, status: ProductOrder['status']) => {
    await mutate(
      () => api(`/admin/orders/${orderId}`, { method: 'PATCH', body: { status } }),
      tt('orderMarked', { status: tt(ORDER_STATUS_KEYS[status]).toUpperCase() })
    );
  };

  // ---------- trainers ----------

  const addTrainer = async (trainer: Trainer) => {
    await mutate(() => api(`/admin/trainers/${trainer.id}`, { method: 'PUT', body: trainer }), tt('trainerAdded', { name: trainer.name }));
  };

  const updateTrainer = async (trainer: Trainer) => {
    await mutate(() => api(`/admin/trainers/${trainer.id}`, { method: 'PUT', body: trainer }), tt('trainerUpdated', { name: trainer.name }));
  };

  // ---------- landing page ----------

  const saveLanding = (content: LandingContent) =>
    mutate(() => api('/admin/site-content/landing', { method: 'PUT', body: content }), tt('landingSaved'));

  return (
    <AppContext.Provider
      value={{
        landing,
        saveLanding,
        role,
        setRole,
        currentPage,
        setCurrentPage,
        navigateTo,
        currentUser,
        setCurrentUser,
        loginWithEmailPassword,
        registerParentAccount,
        addMyChildren,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen,
        authModalInitialTab,
        setAuthModalInitialTab,
        activeTrainerId,
        setActiveTrainerId,
        activeParentStudentId,
        setActiveParentStudentId,
        students,
        trainers,
        groups,
        products,
        orders,
        scheduleItems,
        staffMembers,
        adminProfiles,
        updateMyProfile,
        saveStaffMember,
        deleteStaffMember,
        setTrainerBirthDate,
        addScheduleItem,
        deleteScheduleItem,
        removeStudentFromScheduleItem,
        removeTrainerFromScheduleItem,
        sessions,
        sessionsFrom,
        loadSessionsFrom,
        materialRequests,
        toasts,
        showToast,
        isFirebaseConnected,
        isRestoringSession,
        updateStudentStatus,
        updateStudentPrice,
        payments,
        addRequestComment,
        stockItems,
        stockCategories,
        stockLocations,
        stockMovements,
        refreshData: refresh,
        savePayment,
        markPaymentsPaid,
        resetPayment,
        deletedStudents,
        restoreStudent,
        assignStudentToGroup,
        removeStudentFromGroup,
        deleteStudent,
        updateStudentPhoto,
        updateParentContact,
        updateStudentNotes,
        createGroup,
        updateGroup,
        deleteGroup,
        saveSessionAttendance,
        createMaterialRequest,
        updateMaterialRequestStatus,
        saveProduct,
        setProductActive,
        deleteProduct,
        addProductStock,
        placeOrder,
        updateOrderStatus,
        addTrainer,
        updateTrainer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
