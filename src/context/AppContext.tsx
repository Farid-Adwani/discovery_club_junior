import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UserRole,
  AppPage,
  AppUser,
  Student,
  Program,
  Trainer,
  Group,
  HoodieSize,
  HoodieDistribution,
  SessionRecord,
  MaterialRequest,
  ClubEvent,
  StudentAttendanceRecord,
  FacebookPost
} from '../types';
import {
  INITIAL_PROGRAMS,
  INITIAL_TRAINERS,
  INITIAL_GROUPS,
  INITIAL_HOODIE_STOCK,
  INITIAL_EVENTS,
  FACEBOOK_POSTS
} from '../data/initialData';
import { auth, googleProvider } from '../firebase';
import { api } from '../api';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface ClubData {
  programs: Program[];
  trainers: Trainer[];
  groups: Group[];
  events: ClubEvent[];
  facebookPosts: FacebookPost[];
  hoodieStock: Partial<Record<HoodieSize, number>>;
  students: Student[];
  sessions: SessionRecord[];
  hoodieDistributions: HoodieDistribution[];
  materialRequests: MaterialRequest[];
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  navigateTo: (page: AppPage) => void;
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPassword: (email: string, pass: string) => Promise<boolean>;
  registerParentAccount: (data: {
    parentName: string;
    parentEmail: string;
    password: string;
    parentPhone: string;
    children: { name: string; age: number; notes?: string }[];
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
  programs: Program[];
  trainers: Trainer[];
  groups: Group[];
  hoodieStock: Record<HoodieSize, number>;
  hoodieDistributions: HoodieDistribution[];
  sessions: SessionRecord[];
  materialRequests: MaterialRequest[];
  events: ClubEvent[];
  facebookPosts: FacebookPost[];


  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  /** True once the backend API has answered */
  isFirebaseConnected: boolean;

  // Student actions
  updateStudentStatus: (studentId: string, status: Student['status']) => Promise<void>;
  updateStudentPrice: (studentId: string, customPrice?: number, paymentStatus?: Student['paymentStatus']) => Promise<void>;
  /** Adds the child to a class (children can be in several classes) */
  assignStudentToGroup: (studentId: string, groupId: string) => Promise<void>;
  removeStudentFromGroup: (studentId: string, groupId: string) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  /** Parent or admin: set (data URL) or remove (null) a child's profile photo */
  updateStudentPhoto: (studentId: string, photo: string | null) => Promise<void>;

  // Group actions
  createGroup: (group: Omit<Group, 'id'>) => Promise<void>;
  updateGroup: (group: Group) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;

  // Session & Attendance
  saveSessionAttendance: (
    groupId: string,
    date: string,
    weekNumber: number,
    topicTaught: string,
    records: Record<string, StudentAttendanceRecord>,
    validateSyllabus: boolean,
    trainerNotes?: string
  ) => Promise<void>;

  // Material requests
  createMaterialRequest: (data: {
    groupId: string;
    itemsNeeded: string;
    quantity: string;
    urgency: 'low' | 'medium' | 'urgent';
    sessionDate: string;
  }) => Promise<void>;
  updateMaterialRequestStatus: (requestId: string, status: MaterialRequest['status']) => Promise<void>;

  // Inventory / Hoodies ("Les Capuches")
  addHoodieStock: (size: HoodieSize, amount: number) => Promise<void>;
  requestHoodieOrder: (data: {
    studentId: string;
    studentName: string;
    parentName: string;
    size: HoodieSize;
    isPersonalized: boolean;
    personalizedText?: string;
  }) => Promise<void>;
  updateHoodieStatus: (distributionId: string, status: HoodieDistribution['status']) => Promise<void>;

  // Curriculum management
  addProgram: (program: Program) => Promise<void>;
  updateProgram: (program: Program) => Promise<void>;
  deleteProgram: (programId: string) => Promise<void>;
  addProgramObjective: (
    programId: string,
    objective: { week: number; title: string; description: string; hardware: string }
  ) => Promise<void>;

  // Trainer management
  addTrainer: (trainer: Trainer) => Promise<void>;
  updateTrainer: (trainer: Trainer) => Promise<void>;

  // Event registration
  toggleEventRegistration: (eventId: string) => Promise<void>;

  // Facebook & Community Feed
  likeFacebookPost: (postId: string) => Promise<void>;
  addFacebookPost: (post: Omit<FacebookPost, 'id' | 'likes' | 'comments'>) => Promise<void>;
  deleteFacebookPost: (postId: string) => Promise<void>;
  addFacebookComment: (postId: string, text: string, authorName?: string) => Promise<void>;
  syncInitialDataToFirestore: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const REFRESH_INTERVAL_MS = 30_000;

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'This sign-in method is not enabled in Firebase yet.';
    case 'auth/unauthorized-domain':
      return 'This website address is not authorized in Firebase Authentication settings.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return err instanceof Error ? err.message : 'Sign-in failed.';
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user state (Firebase keeps the session; the profile comes from /api/me)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [role, setRoleState] = useState<UserRole>('visitor');
  const [currentPage, setCurrentPageState] = useState<AppPage>('home');

  const setCurrentPage = (page: AppPage) => {
    setCurrentPageState(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateTo = (page: AppPage) => {
    const dest: AppPage = page === 'visitor' ? 'home' : page;

    if (dest === 'admin') {
      if (!currentUser || !currentUser.roles.includes('admin')) {
        showToast('Administrator credentials required. Please sign in.', 'error');
        setCurrentPageState('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setRoleState('admin');
    } else if (dest === 'trainer') {
      if (!currentUser || !currentUser.roles.includes('trainer')) {
        showToast('Trainer account required. Please sign in.', 'error');
        setCurrentPageState('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setRoleState('trainer');
    } else if (dest === 'parent') {
      if (!currentUser || !currentUser.roles.includes('parent')) {
        showToast('Please sign in or register to access the Parent Portal.', 'info');
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
  const [programs, setPrograms] = useState<Program[]>(INITIAL_PROGRAMS);
  const [trainers, setTrainers] = useState<Trainer[]>(INITIAL_TRAINERS);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [hoodieStock, setHoodieStock] = useState<Record<HoodieSize, number>>(INITIAL_HOODIE_STOCK);
  const [hoodieDistributions, setHoodieDistributions] = useState<HoodieDistribution[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>(INITIAL_EVENTS);
  const [facebookPosts, setFacebookPosts] = useState<FacebookPost[]>(FACEBOOK_POSTS);

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
      showToast('Please sign in or register to access this space', 'info');
      setAuthModalInitialTab(newRole === 'parent' ? 'register-parent' : 'login');
      setIsLoginModalOpen(true);
      return;
    }

    if (currentUser.roles.includes(newRole)) {
      setRoleState(newRole);
      showToast(`Navigated to ${newRole.toUpperCase()} space`);
    } else {
      showToast(`Access restricted: Your account does not have ${newRole.toUpperCase()} privileges`, 'error');
    }
  };

  // ---------- loading data ----------

  // Only the newest request may update state, so a slow old response never overwrites fresh data
  const refreshSeq = useRef(0);
  const profileSeq = useRef(0);

  const refresh = async () => {
    const seq = ++refreshSeq.current;
    try {
      const data = await api<ClubData>('/data');
      if (seq !== refreshSeq.current) return;
      if (data.programs.length) setPrograms(data.programs);
      setTrainers(data.trainers);
      setGroups(data.groups);
      setEvents(data.events);
      setFacebookPosts(data.facebookPosts);
      setHoodieStock({ ...INITIAL_HOODIE_STOCK, ...data.hoodieStock });
      setStudents(data.students);
      setSessions(data.sessions);
      setHoodieDistributions(data.hoodieDistributions);
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
    const profile = auth.currentUser ? await api<AppUser>('/me') : null;
    if (seq !== profileSeq.current) return profile;

    setCurrentUser(profile);
    if (profile?.trainerId) setActiveTrainerId(profile.trainerId);
    const firstChild = profile?.studentIds?.[0] || profile?.studentId;
    if (firstChild) setActiveParentStudentId(firstChild);
    if (!profile) setRoleState('visitor');
    else if (!profile.roles.includes(role)) setRoleState(profile.role);
    return profile;
  };

  /** Runs an API write, then reloads data. Errors are shown as a toast. */
  const mutate = async (fn: () => Promise<unknown>, successMessage?: string): Promise<boolean> => {
    try {
      await fn();
      if (successMessage) showToast(successMessage);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
      return false;
    } finally {
      await refresh();
    }
  };

  const requireSignIn = (action: string) => {
    if (currentUser) return true;
    showToast(`Please sign in to ${action}.`, 'info');
    return false;
  };

  // Sign-in state (also restores the session after a page reload)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async () => {
      try {
        await loadProfile();
      } catch (err) {
        console.warn('Could not load profile:', err);
        setCurrentUser(null);
      }
      await refresh();
    });
    return () => unsubAuth();
  }, []);

  // Periodic refresh so changes made by others show up without reloading
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // ---------- auth ----------

  const finishSignIn = async (welcome: string) => {
    const profile = await loadProfile();
    await refresh();
    setIsLoginModalOpen(false);
    if (profile) {
      showToast(`${welcome}, ${profile.displayName}!`);
      openPortalFor(profile);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      await finishSignIn('Welcome');
    } catch (err) {
      showToast(authErrorMessage(err), 'error');
    }
  };

  const loginWithEmailPassword = async (email: string, pass: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      await finishSignIn('Welcome back');
      return true;
    } catch (err) {
      showToast(authErrorMessage(err), 'error');
      return false;
    }
  };

  // A parent can register several children at once. No course is picked here:
  // each child lands on the waitlist and the admin places them in a group.
  const registerParentAccount = async (data: {
    parentName: string;
    parentEmail: string;
    password: string;
    parentPhone: string;
    children: { name: string; age: number; notes?: string }[];
  }) => {
    try {
      // Already signed in (e.g. with Google): just add the children to this account
      if (!auth.currentUser) {
        const cred = await createUserWithEmailAndPassword(auth, data.parentEmail.trim(), data.password);
        sendEmailVerification(cred.user).catch(() => {});
      }
      await api('/parents/register', {
        method: 'POST',
        body: { parentName: data.parentName, parentPhone: data.parentPhone, children: data.children }
      });
      await finishSignIn('Account created! Welcome to the Parent Portal');
    } catch (err) {
      showToast(authErrorMessage(err), 'error');
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignored
    }
    setCurrentUser(null);
    setRoleState('visitor');
    navigateTo('home');
    showToast('Signed out. Returned to Public Visitor portal.');
  };

  // ---------- students & waitlist ----------

  const updateStudentStatus = async (studentId: string, status: Student['status']) => {
    await mutate(
      () => api(`/admin/students/${studentId}`, { method: 'PATCH', body: { status } }),
      `Updated student status to ${status.toUpperCase()}`
    );
  };

  const updateStudentPrice = async (studentId: string, customPrice?: number, paymentStatus?: Student['paymentStatus']) => {
    await mutate(
      () =>
        api(`/admin/students/${studentId}`, {
          method: 'PATCH',
          body: { customMonthlyPrice: customPrice, paymentStatus }
        }),
      'Pricing updated'
    );
  };

  const assignStudentToGroup = async (studentId: string, groupId: string) => {
    await mutate(
      () => api(`/admin/students/${studentId}/classes`, { method: 'POST', body: { groupId } }),
      'Child added to class'
    );
  };

  const removeStudentFromGroup = async (studentId: string, groupId: string) => {
    await mutate(
      () => api(`/admin/students/${studentId}/classes/${groupId}`, { method: 'DELETE' }),
      'Child removed from class'
    );
  };

  const deleteStudent = async (studentId: string) => {
    await mutate(() => api(`/admin/students/${studentId}`, { method: 'DELETE' }), 'Student record removed');
  };

  const updateStudentPhoto = async (studentId: string, photo: string | null) => {
    await mutate(
      () => api(`/students/${studentId}/photo`, { method: 'PUT', body: { photo } }),
      photo ? 'Profile photo updated' : 'Profile photo removed'
    );
  };

  // ---------- groups ----------

  const createGroup = async (groupData: Omit<Group, 'id'>) => {
    await mutate(() => api('/admin/groups', { method: 'POST', body: groupData }), `New class "${groupData.name}" created`);
  };

  const updateGroup = async (updatedGroup: Group) => {
    await mutate(() => api(`/admin/groups/${updatedGroup.id}`, { method: 'PUT', body: updatedGroup }), 'Class updated');
  };

  const deleteGroup = async (groupId: string) => {
    await mutate(() => api(`/admin/groups/${groupId}`, { method: 'DELETE' }), 'Class deleted');
  };

  // ---------- sessions & attendance ----------

  const saveSessionAttendance = async (
    groupId: string,
    date: string,
    weekNumber: number,
    topicTaught: string,
    records: Record<string, StudentAttendanceRecord>,
    validateSyllabus: boolean,
    trainerNotes?: string
  ) => {
    await mutate(
      () =>
        api('/sessions', {
          method: 'POST',
          body: { groupId, date, weekNumber, topicTaught, records, validateSyllabus, trainerNotes }
        }),
      `Session attendance and evaluations saved for ${date}!`
    );
  };

  // ---------- material requests ----------

  const createMaterialRequest = async (data: {
    groupId: string;
    itemsNeeded: string;
    quantity: string;
    urgency: 'low' | 'medium' | 'urgent';
    sessionDate: string;
  }) => {
    await mutate(
      () => api('/material-requests', { method: 'POST', body: { ...data, trainerId: activeTrainerId } }),
      'Equipment request sent to administration'
    );
  };

  const updateMaterialRequestStatus = async (requestId: string, status: MaterialRequest['status']) => {
    await mutate(
      () => api(`/admin/material-requests/${requestId}`, { method: 'PATCH', body: { status } }),
      'Equipment request updated'
    );
  };

  // ---------- hoodies ----------

  const addHoodieStock = async (size: HoodieSize, amount: number) => {
    await mutate(() => api(`/admin/hoodie-stock/${size}`, { method: 'POST', body: { amount } }), `Stock for size ${size} updated`);
  };

  const requestHoodieOrder = async (data: {
    studentId: string;
    studentName: string;
    parentName: string;
    size: HoodieSize;
    isPersonalized: boolean;
    personalizedText?: string;
  }) => {
    await mutate(
      () =>
        api('/hoodie-orders', {
          method: 'POST',
          body: {
            studentId: data.studentId,
            size: data.size,
            isPersonalized: data.isPersonalized,
            personalizedText: data.personalizedText
          }
        }),
      `Club hoodie order registered for ${data.studentName}!`
    );
  };

  const updateHoodieStatus = async (distributionId: string, status: HoodieDistribution['status']) => {
    await mutate(
      () => api(`/admin/hoodie-orders/${distributionId}`, { method: 'PATCH', body: { status } }),
      `Hoodie order marked ${status.replace('_', ' ').toUpperCase()}`
    );
  };

  // ---------- programs & curriculum ----------

  const addProgram = async (program: Program) => {
    await mutate(() => api(`/admin/programs/${program.id}`, { method: 'PUT', body: program }), `Program "${program.title}" created`);
  };

  const updateProgram = async (program: Program) => {
    await mutate(() => api(`/admin/programs/${program.id}`, { method: 'PUT', body: program }), `Program "${program.title}" updated`);
  };

  const deleteProgram = async (programId: string) => {
    await mutate(() => api(`/admin/programs/${programId}`, { method: 'DELETE' }), 'Program deleted');
  };

  const addProgramObjective = async (
    programId: string,
    objective: { week: number; title: string; description: string; hardware: string }
  ) => {
    await mutate(
      () => api(`/admin/programs/${programId}/objectives`, { method: 'POST', body: objective }),
      'Curriculum objective added'
    );
  };

  // ---------- trainers ----------

  const addTrainer = async (trainer: Trainer) => {
    await mutate(() => api(`/admin/trainers/${trainer.id}`, { method: 'PUT', body: trainer }), `Trainer ${trainer.name} added`);
  };

  const updateTrainer = async (trainer: Trainer) => {
    await mutate(() => api(`/admin/trainers/${trainer.id}`, { method: 'PUT', body: trainer }), `Trainer ${trainer.name} updated`);
  };

  // ---------- events ----------

  const toggleEventRegistration = async (eventId: string) => {
    if (!requireSignIn('register for events')) return;
    await mutate(() => api(`/events/${eventId}/rsvp`, { method: 'POST' }), 'Event registration updated');
  };

  // ---------- community feed ----------

  const likeFacebookPost = async (postId: string) => {
    if (!requireSignIn('like posts')) return;
    await mutate(() => api(`/posts/${postId}/like`, { method: 'POST' }));
  };

  const addFacebookPost = async (postData: Omit<FacebookPost, 'id' | 'likes' | 'comments'>) => {
    await mutate(() => api('/admin/posts', { method: 'POST', body: postData }), 'New post published to the club feed!');
  };

  const deleteFacebookPost = async (postId: string) => {
    await mutate(() => api(`/admin/posts/${postId}`, { method: 'DELETE' }), 'Post deleted');
  };

  // The author name always comes from the signed-in account
  const addFacebookComment = async (postId: string, text: string, _authorName?: string) => {
    if (!text.trim() || !requireSignIn('comment')) return;
    await mutate(() => api(`/posts/${postId}/comments`, { method: 'POST', body: { text } }), 'Comment added!');
  };

  // Admin button: rewrite the default club content (programs, trainers, posts…) in the database
  const syncInitialDataToFirestore = async () => {
    await mutate(
      () => api('/admin/seed', { method: 'POST', body: { overwrite: true } }),
      'Default club content written to the database'
    );
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentPage,
        setCurrentPage,
        navigateTo,
        currentUser,
        setCurrentUser,
        loginWithGoogle,
        loginWithEmailPassword,
        registerParentAccount,
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
        programs,
        trainers,
        groups,
        hoodieStock,
        hoodieDistributions,
        sessions,
        materialRequests,
        events,
        facebookPosts,
        toasts,
        showToast,
        isFirebaseConnected,
        updateStudentStatus,
        updateStudentPrice,
        assignStudentToGroup,
        removeStudentFromGroup,
        deleteStudent,
        updateStudentPhoto,
        createGroup,
        updateGroup,
        deleteGroup,
        saveSessionAttendance,
        createMaterialRequest,
        updateMaterialRequestStatus,
        addHoodieStock,
        requestHoodieOrder,
        updateHoodieStatus,
        addProgram,
        updateProgram,
        deleteProgram,
        addProgramObjective,
        addTrainer,
        updateTrainer,
        toggleEventRegistration,
        likeFacebookPost,
        addFacebookPost,
        deleteFacebookPost,
        addFacebookComment,
        syncInitialDataToFirestore
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
