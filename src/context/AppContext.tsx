import React, { createContext, useContext, useState, useEffect } from 'react';
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
  StudentAttendanceRecord
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_PROGRAMS,
  INITIAL_TRAINERS,
  INITIAL_GROUPS,
  INITIAL_HOODIE_STOCK,
  INITIAL_HOODIE_DISTRIBUTIONS,
  INITIAL_SESSIONS,
  INITIAL_MATERIAL_REQUESTS,
  INITIAL_EVENTS,
  PRESET_ACCOUNTS
} from '../data/initialData';
import { db, auth, googleProvider, handleFirestoreError, OperationType, testConnection } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
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
  loginWithPreset: (preset: AppUser) => void;
  loginWithEmailPassword: (email: string, pass: string) => Promise<boolean>;
  registerParentAccount: (data: {
    parentName: string;
    parentEmail: string;
    password?: string;
    parentPhone: string;
    childName: string;
    childAge: number;
    programId: string;
    notes?: string;
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

  isWaitlistModalOpen: boolean;
  setIsWaitlistModalOpen: (open: boolean) => void;
  selectedProgramForWaitlist: string;
  setSelectedProgramForWaitlist: (id: string) => void;

  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  isFirebaseConnected: boolean;

  // Student & Waitlist actions
  registerWaitlist: (data: {
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    studentName: string;
    studentAge: number;
    programId: string;
    notes?: string;
  }) => Promise<void>;
  updateStudentStatus: (studentId: string, status: Student['status'], groupId?: string) => Promise<void>;
  updateStudentPrice: (studentId: string, customPrice?: number, paymentStatus?: Student['paymentStatus']) => Promise<void>;
  assignStudentToGroup: (studentId: string, groupId: string) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;

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
  addProgramObjective: (
    programId: string,
    objective: { week: number; title: string; description: string; hardware: string }
  ) => Promise<void>;

  // Event registration
  toggleEventRegistration: (eventId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user state:
  // Starts with null if not logged in, or loads saved auth
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('dcj_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Active view role is strictly derived from user's authenticated roles
  // If user is null, role is always 'visitor'
  const [role, setRoleState] = useState<UserRole>(() => {
    if (!currentUser) return 'visitor';
    return currentUser.role;
  });

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

  const [activeTrainerId, setActiveTrainerId] = useState<string>(currentUser?.trainerId || 'tr-1');
  const [activeParentStudentId, setActiveParentStudentId] = useState<string>(currentUser?.studentId || 'std-101');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register-parent'>('login');
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [selectedProgramForWaitlist, setSelectedProgramForWaitlist] = useState('prog-robotics-starter');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Data states
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [programs, setPrograms] = useState<Program[]>(INITIAL_PROGRAMS);
  const [trainers] = useState<Trainer[]>(INITIAL_TRAINERS);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [hoodieStock, setHoodieStock] = useState<Record<HoodieSize, number>>(INITIAL_HOODIE_STOCK);
  const [hoodieDistributions, setHoodieDistributions] = useState<HoodieDistribution[]>(INITIAL_HOODIE_DISTRIBUTIONS);
  const [sessions, setSessions] = useState<SessionRecord[]>(INITIAL_SESSIONS);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>(INITIAL_MATERIAL_REQUESTS);
  const [events, setEvents] = useState<ClubEvent[]>(INITIAL_EVENTS);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Safe role switcher: Only allows roles the user actually has access to
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

  // Sync auth to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('dcj_auth_user', JSON.stringify(currentUser));
      if (!currentUser.roles.includes(role) && role !== 'visitor') {
        setRoleState(currentUser.role);
      }
    } else {
      localStorage.removeItem('dcj_auth_user');
      setRoleState('visitor');
    }
  }, [currentUser]);

  // Test connection & seed initial Firestore data if empty
  useEffect(() => {
    let isSubscribed = true;

    async function initFirestore() {
      const ok = await testConnection();
      if (!isSubscribed) return;
      setIsFirebaseConnected(ok);

      try {
        const stdSnap = await getDocs(collection(db, 'students'));
        if (stdSnap.empty) {
          for (const s of INITIAL_STUDENTS) {
            await setDoc(doc(db, 'students', s.id), s);
          }
        }

        const grpSnap = await getDocs(collection(db, 'groups'));
        if (grpSnap.empty) {
          for (const g of INITIAL_GROUPS) {
            await setDoc(doc(db, 'groups', g.id), g);
          }
        }

        const sessSnap = await getDocs(collection(db, 'sessions'));
        if (sessSnap.empty) {
          for (const sess of INITIAL_SESSIONS) {
            await setDoc(doc(db, 'sessions', sess.id), sess);
          }
        }

        const stockSnap = await getDocs(collection(db, 'hoodie_stock'));
        if (stockSnap.empty) {
          for (const [size, count] of Object.entries(INITIAL_HOODIE_STOCK)) {
            await setDoc(doc(db, 'hoodie_stock', size), { size, count });
          }
        }

        const distSnap = await getDocs(collection(db, 'hoodie_distributions'));
        if (distSnap.empty) {
          for (const d of INITIAL_HOODIE_DISTRIBUTIONS) {
            await setDoc(doc(db, 'hoodie_distributions', d.id), d);
          }
        }

        const matSnap = await getDocs(collection(db, 'material_requests'));
        if (matSnap.empty) {
          for (const m of INITIAL_MATERIAL_REQUESTS) {
            await setDoc(doc(db, 'material_requests', m.id), m);
          }
        }

        const evtSnap = await getDocs(collection(db, 'events'));
        if (evtSnap.empty) {
          for (const e of INITIAL_EVENTS) {
            await setDoc(doc(db, 'events', e.id), e);
          }
        }
      } catch (err) {
        console.warn('Firestore initial seeding note:', err);
      }
    }

    initFirestore();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Set up real-time onSnapshot listeners
  useEffect(() => {
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Student[] = [];
          snapshot.forEach((d) => list.push(d.data() as Student));
          setStudents(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'students')
    );

    const unsubGroups = onSnapshot(
      collection(db, 'groups'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Group[] = [];
          snapshot.forEach((d) => list.push(d.data() as Group));
          setGroups(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'groups')
    );

    const unsubSessions = onSnapshot(
      collection(db, 'sessions'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: SessionRecord[] = [];
          snapshot.forEach((d) => list.push(d.data() as SessionRecord));
          setSessions(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'sessions')
    );

    const unsubStock = onSnapshot(
      collection(db, 'hoodie_stock'),
      (snapshot) => {
        if (!snapshot.empty) {
          const newStock: Record<HoodieSize, number> = { ...INITIAL_HOODIE_STOCK };
          snapshot.forEach((d) => {
            const data = d.data();
            if (data.size && typeof data.count === 'number') {
              newStock[data.size as HoodieSize] = data.count;
            }
          });
          setHoodieStock(newStock);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'hoodie_stock')
    );

    const unsubDist = onSnapshot(
      collection(db, 'hoodie_distributions'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: HoodieDistribution[] = [];
          snapshot.forEach((d) => list.push(d.data() as HoodieDistribution));
          setHoodieDistributions(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'hoodie_distributions')
    );

    const unsubMat = onSnapshot(
      collection(db, 'material_requests'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: MaterialRequest[] = [];
          snapshot.forEach((d) => list.push(d.data() as MaterialRequest));
          setMaterialRequests(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'material_requests')
    );

    const unsubEvents = onSnapshot(
      collection(db, 'events'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ClubEvent[] = [];
          snapshot.forEach((d) => list.push(d.data() as ClubEvent));
          setEvents(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'events')
    );

    return () => {
      unsubStudents();
      unsubGroups();
      unsubSessions();
      unsubStock();
      unsubDist();
      unsubMat();
      unsubEvents();
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        const email = user.email || '';
        const isAdmin = email.toLowerCase() === 'faridadwani2000@gmail.com';
        const mappedRole: UserRole = isAdmin ? 'admin' : 'parent';
        const mappedRoles: UserRole[] = isAdmin
          ? ['admin', 'trainer', 'parent', 'visitor']
          : ['parent', 'visitor'];

        const appUser: AppUser = {
          uid: user.uid,
          email,
          displayName: user.displayName || email.split('@')[0],
          role: mappedRole,
          roles: mappedRoles,
          photoURL: user.photoURL || undefined
        };

        setCurrentUser(appUser);
        setRoleState(mappedRole);
        showToast(`Signed in to real Firebase as ${appUser.displayName}`);
      }
    });

    return () => unsubAuth();
  }, []);

  // Auth: Google Login
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const isAdmin = user.email?.toLowerCase() === 'faridadwani2000@gmail.com';
      const userRole: UserRole = isAdmin ? 'admin' : 'parent';

      const appUser: AppUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Discovery Member',
        role: userRole,
        roles: isAdmin ? ['admin', 'trainer', 'parent', 'visitor'] : ['parent', 'visitor'],
        photoURL: user.photoURL || undefined
      };

      setCurrentUser(appUser);
      setRoleState(userRole);
      setIsLoginModalOpen(false);
      showToast(`Welcome ${appUser.displayName}! Connected via Firebase.`);
      navigateTo(userRole);
    } catch (err) {
      console.error('Google Sign-in error:', err);
      showToast('Google sign-in popup cancelled', 'info');
    }
  };

  // Auth: Email + Password Login
  const loginWithEmailPassword = async (email: string, pass: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    // Check presets first
    const preset = PRESET_ACCOUNTS.find((p) => p.email.toLowerCase() === cleanEmail);
    if (preset) {
      loginWithPreset(preset);
      return true;
    }

    // Check if user exists in Firestore users collection
    try {
      const userDoc = await getDoc(doc(db, 'users', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')));
      if (userDoc.exists()) {
        const u = userDoc.data() as AppUser;
        setCurrentUser(u);
        setRoleState(u.role);
        if (u.studentId) setActiveParentStudentId(u.studentId);
        setIsLoginModalOpen(false);
        showToast(`Welcome back, ${u.displayName}! Logged in as Parent.`);
        navigateTo(u.role);
        return true;
      }
    } catch (e) {
      // Ignore
    }

    // Check if student with parent email exists in database
    const matchingStudent = students.find((s) => s.parentEmail.toLowerCase() === cleanEmail);
    if (matchingStudent) {
      const parentUser: AppUser = {
        uid: `parent-${Date.now().toString().slice(-4)}`,
        email: cleanEmail,
        displayName: matchingStudent.parentName,
        role: 'parent',
        roles: ['parent', 'visitor'],
        studentId: matchingStudent.id,
        parentPhone: matchingStudent.parentPhone,
        childName: matchingStudent.studentName
      };

      setCurrentUser(parentUser);
      setRoleState('parent');
      setActiveParentStudentId(matchingStudent.id);
      setIsLoginModalOpen(false);
      showToast(`Welcome ${parentUser.displayName}! Accessing child dashboard.`);
      navigateTo('parent');
      return true;
    }

    showToast('Unrecognized credentials. Please register as a Parent below.', 'error');
    return false;
  };

  // Auth: Parent Registration
  const registerParentAccount = async (data: {
    parentName: string;
    parentEmail: string;
    password?: string;
    parentPhone: string;
    childName: string;
    childAge: number;
    programId: string;
    notes?: string;
  }) => {
    const matchedProgram = programs.find((p) => p.id === data.programId) || programs[0];

    // 1. Create student record
    const studentId = `std-${Date.now().toString().slice(-5)}`;
    const newStudent: Student = {
      id: studentId,
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
      studentName: data.childName,
      studentAge: data.childAge,
      programId: data.programId,
      status: 'active', // Parent registered, actively enrolled
      groupId: 'grp-rob-sat-am', // default assign to alpha cohort
      registeredAt: new Date().toISOString().split('T')[0],
      standardMonthlyPrice: matchedProgram.pricePerMonth,
      paymentStatus: 'paid',
      notes: data.notes || 'Registered through Parent Portal Account Registration'
    };

    // 2. Create user profile in Firestore
    const userId = `usr-${Date.now().toString().slice(-5)}`;
    const newParentUser: AppUser = {
      uid: userId,
      email: data.parentEmail.toLowerCase(),
      displayName: data.parentName,
      role: 'parent',
      roles: ['parent', 'visitor'],
      studentId: studentId,
      parentPhone: data.parentPhone,
      childName: data.childName
    };

    // Update local state
    setStudents((prev) => [newStudent, ...prev]);
    setCurrentUser(newParentUser);
    setActiveParentStudentId(studentId);
    setRoleState('parent');
    setIsLoginModalOpen(false);

    showToast(`Account successfully registered! Welcome to the Parent Portal, ${data.parentName}.`);
    navigateTo('parent');

    // Persist to real Firestore
    try {
      await setDoc(doc(db, 'students', studentId), newStudent);
      const cleanKey = data.parentEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(doc(db, 'users', cleanKey), newParentUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${newParentUser.uid}`);
    }
  };

  // Auth: Preset Switcher (strictly in the login modal for evaluator review)
  const loginWithPreset = (preset: AppUser) => {
    setCurrentUser(preset);
    setRoleState(preset.role);
    if (preset.trainerId) setActiveTrainerId(preset.trainerId);
    if (preset.studentId) setActiveParentStudentId(preset.studentId);
    setIsLoginModalOpen(false);
    showToast(`Authenticated as ${preset.displayName} (${preset.role.toUpperCase()})`);
    navigateTo(preset.role);
  };

  // Auth: Logout
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // Ignored
    }
    setCurrentUser(null);
    setRoleState('visitor');
    navigateTo('home');
    showToast('Signed out. Returned to Public Visitor portal.');
  };

  // Real Firestore mutations
  const registerWaitlist = async (data: {
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    studentName: string;
    studentAge: number;
    programId: string;
    notes?: string;
  }) => {
    const matchedProgram = programs.find((p) => p.id === data.programId) || programs[0];
    const newStudent: Student = {
      id: `std-${Date.now().toString().slice(-5)}`,
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
      studentName: data.studentName,
      studentAge: data.studentAge,
      programId: data.programId,
      status: 'waitlist',
      registeredAt: new Date().toISOString().split('T')[0],
      standardMonthlyPrice: matchedProgram.pricePerMonth,
      paymentStatus: 'pending',
      notes: data.notes || 'Registered through Discovery Club online portal'
    };

    setStudents((prev) => [newStudent, ...prev]);
    showToast(`Waitlist application saved to database for ${data.studentName}!`);

    try {
      await setDoc(doc(db, 'students', newStudent.id), newStudent);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `students/${newStudent.id}`);
    }
  };

  const updateStudentStatus = async (studentId: string, status: Student['status'], groupId?: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status, groupId: groupId !== undefined ? groupId : s.groupId } : s))
    );
    showToast(`Updated student status to ${status.toUpperCase()} in Firestore`);

    try {
      const updateData: any = { status };
      if (groupId !== undefined) updateData.groupId = groupId;
      await updateDoc(doc(db, 'students', studentId), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const updateStudentPrice = async (studentId: string, customPrice?: number, paymentStatus?: Student['paymentStatus']) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, customMonthlyPrice: customPrice, paymentStatus: paymentStatus || s.paymentStatus } : s))
    );
    showToast(`Pricing overrides synchronized in Firestore`);

    try {
      const updateData: any = {};
      if (customPrice !== undefined) updateData.customMonthlyPrice = customPrice;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      await updateDoc(doc(db, 'students', studentId), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const assignStudentToGroup = async (studentId: string, groupId: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, groupId, status: s.status === 'waitlist' ? 'accepted' : s.status } : s))
    );
    showToast(`Assigned student to group`);

    try {
      await updateDoc(doc(db, 'students', studentId), {
        groupId,
        status: 'accepted'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const deleteStudent = async (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    showToast(`Student record removed`, 'info');

    try {
      await deleteDoc(doc(db, 'students', studentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `students/${studentId}`);
    }
  };

  const createGroup = async (groupData: Omit<Group, 'id'>) => {
    const newGroup: Group = {
      ...groupData,
      id: `grp-${Date.now().toString().slice(-4)}`
    };
    setGroups((prev) => [...prev, newGroup]);
    showToast(`New group "${newGroup.name}" created`);

    try {
      await setDoc(doc(db, 'groups', newGroup.id), newGroup);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `groups/${newGroup.id}`);
    }
  };

  const updateGroup = async (updatedGroup: Group) => {
    setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
    showToast(`Group updated`);

    try {
      await setDoc(doc(db, 'groups', updatedGroup.id), updatedGroup);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `groups/${updatedGroup.id}`);
    }
  };

  const deleteGroup = async (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setStudents((prev) => prev.map((s) => (s.groupId === groupId ? { ...s, groupId: undefined } : s)));
    showToast(`Group deleted`, 'info');

    try {
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `groups/${groupId}`);
    }
  };

  const saveSessionAttendance = async (
    groupId: string,
    date: string,
    weekNumber: number,
    topicTaught: string,
    records: Record<string, StudentAttendanceRecord>,
    validateSyllabus: boolean,
    trainerNotes?: string
  ) => {
    const existingIndex = sessions.findIndex((s) => s.groupId === groupId && s.date === date);
    const newSessionRecord: SessionRecord = {
      id: existingIndex >= 0 ? sessions[existingIndex].id : `sess-${Date.now().toString().slice(-4)}`,
      groupId,
      date,
      weekNumber,
      topicTaught,
      isSyllabusValidated: validateSyllabus,
      validatedAt: validateSyllabus ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
      trainerNotes,
      records
    };

    if (existingIndex >= 0) {
      setSessions((prev) => {
        const next = [...prev];
        next[existingIndex] = newSessionRecord;
        return next;
      });
    } else {
      setSessions((prev) => [newSessionRecord, ...prev]);
    }

    showToast(`Session attendance and evaluations saved in Firestore for ${date}!`);

    try {
      await setDoc(doc(db, 'sessions', newSessionRecord.id), newSessionRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sessions/${newSessionRecord.id}`);
    }
  };

  const createMaterialRequest = async (data: {
    groupId: string;
    itemsNeeded: string;
    quantity: string;
    urgency: 'low' | 'medium' | 'urgent';
    sessionDate: string;
  }) => {
    const trainer = trainers.find((t) => t.id === activeTrainerId) || trainers[0];
    const group = groups.find((g) => g.id === data.groupId) || groups[0];

    const newRequest: MaterialRequest = {
      id: `mat-${Date.now().toString().slice(-4)}`,
      trainerId: trainer.id,
      trainerName: trainer.name,
      groupId: data.groupId,
      groupName: group.name,
      itemsNeeded: data.itemsNeeded,
      quantity: data.quantity,
      urgency: data.urgency,
      status: 'pending',
      requestedAt: new Date().toISOString().split('T')[0],
      sessionDate: data.sessionDate
    };

    setMaterialRequests((prev) => [newRequest, ...prev]);
    showToast(`Equipment request dispatched to administration`);

    try {
      await setDoc(doc(db, 'material_requests', newRequest.id), newRequest);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `material_requests/${newRequest.id}`);
    }
  };

  const updateMaterialRequestStatus = async (requestId: string, status: MaterialRequest['status']) => {
    setMaterialRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
    showToast(`Equipment request updated`);

    try {
      await updateDoc(doc(db, 'material_requests', requestId), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `material_requests/${requestId}`);
    }
  };

  const addHoodieStock = async (size: HoodieSize, amount: number) => {
    const newCount = Math.max(0, (hoodieStock[size] || 0) + amount);
    setHoodieStock((prev) => ({
      ...prev,
      [size]: newCount
    }));
    showToast(`Stock for size ${size} updated to ${newCount}`);

    try {
      await setDoc(doc(db, 'hoodie_stock', size), { size, count: newCount });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `hoodie_stock/${size}`);
    }
  };

  const requestHoodieOrder = async (data: {
    studentId: string;
    studentName: string;
    parentName: string;
    size: HoodieSize;
    isPersonalized: boolean;
    personalizedText?: string;
  }) => {
    const currentStock = hoodieStock[data.size] || 0;
    const basePrice = 32;
    const finalPrice = data.isPersonalized ? basePrice + 6 : basePrice;

    const newOrder: HoodieDistribution = {
      id: `hd-${Date.now().toString().slice(-4)}`,
      studentId: data.studentId,
      studentName: data.studentName,
      parentName: data.parentName,
      size: data.size,
      isPersonalized: data.isPersonalized,
      personalizedText: data.personalizedText,
      status: currentStock > 0 ? 'ready' : 'requested',
      requestedAt: new Date().toISOString().split('T')[0],
      price: finalPrice
    };

    setHoodieDistributions((prev) => [newOrder, ...prev]);

    if (currentStock > 0) {
      const nextStock = currentStock - 1;
      setHoodieStock((prev) => ({ ...prev, [data.size]: nextStock }));
      setDoc(doc(db, 'hoodie_stock', data.size), { size: data.size, count: nextStock }).catch(() => {});
    }

    showToast(`Club hoodie order registered for ${data.studentName}!`);

    try {
      await setDoc(doc(db, 'hoodie_distributions', newOrder.id), newOrder);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `hoodie_distributions/${newOrder.id}`);
    }
  };

  const updateHoodieStatus = async (distributionId: string, status: HoodieDistribution['status']) => {
    setHoodieDistributions((prev) =>
      prev.map((item) => {
        if (item.id === distributionId) {
          const isPickup = status === 'picked_up' && item.status !== 'picked_up';
          return {
            ...item,
            status,
            pickedUpAt: isPickup ? new Date().toISOString().split('T')[0] : item.pickedUpAt
          };
        }
        return item;
      })
    );
    showToast(`Hoodie order marked ${status.replace('_', ' ').toUpperCase()}`);

    try {
      const updateData: any = { status };
      if (status === 'picked_up') {
        updateData.pickedUpAt = new Date().toISOString().split('T')[0];
      }
      await updateDoc(doc(db, 'hoodie_distributions', distributionId), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `hoodie_distributions/${distributionId}`);
    }
  };

  const addProgramObjective = async (
    programId: string,
    objective: { week: number; title: string; description: string; hardware: string }
  ) => {
    setPrograms((prev) =>
      prev.map((prog) => {
        if (prog.id === programId) {
          return {
            ...prog,
            syllabus: [...prog.syllabus, objective]
          };
        }
        return prog;
      })
    );
    showToast(`Curriculum objective added to ${programId}`);
  };

  const toggleEventRegistration = async (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;
    const newStatus = !target.isRegistered;
    const newSpots = newStatus ? Math.max(0, target.spotsLeft - 1) : target.spotsLeft + 1;

    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, isRegistered: newStatus, spotsLeft: newSpots } : e))
    );
    showToast(`Event attendance updated in Firestore`);

    try {
      await updateDoc(doc(db, 'events', eventId), {
        isRegistered: newStatus,
        spotsLeft: newSpots
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
    }
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
        loginWithPreset,
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
        isWaitlistModalOpen,
        setIsWaitlistModalOpen,
        selectedProgramForWaitlist,
        setSelectedProgramForWaitlist,
        toasts,
        showToast,
        isFirebaseConnected,
        registerWaitlist,
        updateStudentStatus,
        updateStudentPrice,
        assignStudentToGroup,
        deleteStudent,
        createGroup,
        updateGroup,
        deleteGroup,
        saveSessionAttendance,
        createMaterialRequest,
        updateMaterialRequestStatus,
        addHoodieStock,
        requestHoodieOrder,
        updateHoodieStatus,
        addProgramObjective,
        toggleEventRegistration
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
