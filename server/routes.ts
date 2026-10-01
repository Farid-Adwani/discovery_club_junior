import { Router, type Response, type NextFunction } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';
import { attachUser, requireUser, requireRole, HttpError, type AuthedRequest } from './auth';
import { seedDatabase } from './seedData';
import type {
  AppUser,
  Student,
  Program,
  Trainer,
  Group,
  ClubEvent,
  FacebookPost,
  FacebookComment,
  SessionRecord,
  StudentAttendanceRecord,
  HoodieDistribution,
  HoodieSize,
  MaterialRequest
} from '../src/types';

export const router = Router();
router.use(attachUser);

// ---------- helpers ----------

type Handler = (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>;
const ah = (fn: Handler) => (req: AuthedRequest, res: Response, next: NextFunction) =>
  fn(req, res, next).catch(next);

const col = (name: string) => db.collection(name);
const newId = (prefix: string) => `${prefix}-${col('_ids').doc().id.slice(0, 12)}`;
const today = () => new Date().toISOString().split('T')[0];

/** Older class documents stored a single `trainerId`; always expose `trainerIds`. */
function normalizeGroup(raw: Record<string, unknown>): Group {
  const g = raw as unknown as Group & { trainerId?: string };
  const trainerIds = Array.isArray(g.trainerIds) ? g.trainerIds : g.trainerId ? [g.trainerId] : [];
  const { trainerId: _legacy, ...rest } = g;
  return { ...rest, trainerIds };
}

/** Older student documents stored a single `groupId`; always expose `groupIds`. */
function normalizeStudent(raw: Record<string, unknown>): Student {
  const st = raw as unknown as Student & { groupId?: string };
  const groupIds = Array.isArray(st.groupIds) ? st.groupIds : st.groupId ? [st.groupId] : [];
  const { groupId: _legacy, ...rest } = st;
  return { ...rest, groupIds };
}

/** Students enrolled in any of the given classes. */
async function studentsInClasses(classIds: string[]): Promise<Student[]> {
  const found = new Map<string, Student>();
  for (let i = 0; i < classIds.length; i += 30) {
    const snap = await col('students').where('groupIds', 'array-contains-any', classIds.slice(i, i + 30)).get();
    snap.docs.forEach((d) => found.set(d.id, normalizeStudent(d.data())));
  }
  return [...found.values()];
}

/** Program and standard price follow the classes: first class's program, sum of each distinct program's price. */
async function enrollmentFields(groupIds: string[]) {
  const groups = (await Promise.all(groupIds.map(getGroup))).filter((g): g is Group => !!g);
  const programIds = [...new Set(groups.map((g) => g.programId))];
  const programs = (await Promise.all(programIds.map((id) => col('programs').doc(id).get())))
    .map((d) => d.data() as Program | undefined)
    .filter((p): p is Program => !!p);
  return {
    programId: programIds[0] || '',
    standardMonthlyPrice: programs.reduce((sum, p) => sum + p.pricePerMonth, 0)
  };
}

async function getGroup(id: string): Promise<Group | undefined> {
  const data = (await col('groups').doc(id).get()).data();
  return data ? normalizeGroup(data) : undefined;
}

async function listAll<T>(name: string): Promise<T[]> {
  const snap = await col(name).get();
  return snap.docs.map((d) => d.data() as T);
}

/** Firestore `in` queries accept at most 30 values, so split larger lists. */
async function whereIn<T>(name: string, field: string, values: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += 30) {
    const snap = await col(name).where(field, 'in', values.slice(i, i + 30)).get();
    snap.docs.forEach((d) => out.push(d.data() as T));
  }
  return out;
}

function str(value: unknown, field: string, { max = 500, optional = false } = {}): string {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw new HttpError(400, `${field} is required.`);
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text.`);
  const s = value.trim();
  if (!s && !optional) throw new HttpError(400, `${field} is required.`);
  if (s.length > max) throw new HttpError(400, `${field} is too long.`);
  return s;
}

function num(value: unknown, field: string, { min = -Infinity, max = Infinity } = {}): number {
  const n = Number(value);
  if (value === '' || value === null || !Number.isFinite(n) || n < min || n > max) {
    throw new HttpError(400, `${field} is invalid.`);
  }
  return n;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) throw new HttpError(400, `${field} is invalid.`);
  return value as T;
}

const HOODIE_SIZES: readonly HoodieSize[] = ['6-8Y', '8-10Y', '10-12Y', '12-14Y', 'S', 'M', 'L'];
const STUDENT_STATUSES = ['waitlist', 'accepted', 'active'] as const;
const PAYMENT_STATUSES = ['paid', 'pending', 'scholarship'] as const;
const DAYS = ['Wednesday', 'Saturday', 'Sunday'] as const;

const isAdmin = (user?: AppUser) => !!user?.roles.includes('admin');

/** Children a parent may see: linked by account uid, or by a verified email the club has on file. */
async function parentStudents(req: AuthedRequest): Promise<Student[]> {
  const user = req.user!;
  const byUid = await col('students').where('parentUid', '==', user.uid).get();
  const found = new Map(byUid.docs.map((d) => [d.id, normalizeStudent(d.data())]));

  if (req.token?.email_verified && user.email) {
    const byEmail = await col('students').where('parentEmail', '==', user.email).get();
    byEmail.docs.forEach((d) => found.set(d.id, normalizeStudent(d.data())));
  }
  return [...found.values()];
}

// ---------- public ----------

router.get('/health', (_req, res) => res.json({ ok: true }));

router.get('/me', requireUser, (req: AuthedRequest, res) => res.json(req.user));

/** Everything the current user is allowed to see, in one call. */
router.get(
  '/data',
  ah(async (req, res) => {
    const user = req.user;
    const admin = isAdmin(user);

    const [programs, trainers, groups, events, facebookPosts, stockDocs] = await Promise.all([
      listAll<Program>('programs'),
      listAll<Trainer>('trainers'),
      listAll<Record<string, unknown>>('groups').then((list) => list.map(normalizeGroup)),
      listAll<ClubEvent & { registeredUids?: string[] }>('events'),
      listAll<FacebookPost>('facebook_posts'),
      listAll<{ size: HoodieSize; count: number }>('hoodie_stock')
    ]);

    let students: Student[] = [];
    let sessions: SessionRecord[] = [];
    let hoodieDistributions: HoodieDistribution[] = [];
    let materialRequests: MaterialRequest[] = [];

    if (admin) {
      [students, sessions, hoodieDistributions, materialRequests] = await Promise.all([
        listAll<Record<string, unknown>>('students').then((list) => list.map(normalizeStudent)),
        listAll<SessionRecord>('sessions'),
        listAll<HoodieDistribution>('hoodie_distributions'),
        listAll<MaterialRequest>('material_requests')
      ]);
    } else if (user?.role === 'trainer' && user.trainerId) {
      const myGroupIds = groups.filter((g) => g.trainerIds.includes(user.trainerId!)).map((g) => g.id);
      [students, sessions] = await Promise.all([
        studentsInClasses(myGroupIds),
        whereIn<SessionRecord>('sessions', 'groupId', myGroupIds)
      ]);
      const mats = await col('material_requests').where('trainerId', '==', user.trainerId).get();
      materialRequests = mats.docs.map((d) => d.data() as MaterialRequest);
    } else if (user?.role === 'parent') {
      students = await parentStudents(req);
      const myIds = new Set(students.map((s) => s.id));
      const groupIds = [...new Set(students.flatMap((s) => s.groupIds))];
      const groupSessions = await whereIn<SessionRecord>('sessions', 'groupId', groupIds);
      // Parents only see their own children's attendance lines
      sessions = groupSessions.map((s) => ({
        ...s,
        records: Object.fromEntries(Object.entries(s.records || {}).filter(([id]) => myIds.has(id)))
      }));
      hoodieDistributions = await whereIn<HoodieDistribution>('hoodie_distributions', 'studentId', [...myIds]);
    }

    res.json({
      programs,
      trainers: admin ? trainers : trainers.map((t) => ({ ...t, phone: '' })),
      groups,
      events: events.map(({ registeredUids = [], ...e }) => ({
        ...e,
        isRegistered: !!user && registeredUids.includes(user.uid)
      })),
      facebookPosts: facebookPosts.sort((a, b) => (a.id > b.id ? 1 : -1)),
      hoodieStock: Object.fromEntries(stockDocs.map((s) => [s.size, s.count])),
      students,
      sessions,
      hoodieDistributions,
      materialRequests
    });
  })
);

// ---------- signed-in users ----------

/** Parent sign-up: links one or more children to the signed-in account. No course is chosen here. */
router.post(
  '/parents/register',
  requireUser,
  ah(async (req, res) => {
    const user = req.user!;
    const b = req.body || {};
    const parentName = str(b.parentName, 'Parent name', { max: 120 });
    const parentPhone = str(b.parentPhone, 'Phone', { max: 40 });
    if (!Array.isArray(b.children) || b.children.length === 0 || b.children.length > 10) {
      throw new HttpError(400, 'Please add between 1 and 10 children.');
    }

    const batch = db.batch();
    const ids: string[] = [];
    for (const child of b.children) {
      const id = newId('std');
      ids.push(id);
      const student: Student & { parentUid: string } = {
        id,
        parentUid: user.uid,
        parentName,
        parentPhone,
        parentEmail: user.email,
        studentName: str(child?.name, "Child's name", { max: 120 }),
        studentAge: num(child?.age, "Child's age", { min: 3, max: 22 }),
        programId: '',
        groupIds: [],
        status: 'waitlist',
        registeredAt: today(),
        standardMonthlyPrice: 0,
        paymentStatus: 'pending',
        notes: str(child?.notes, 'Notes', { max: 1000, optional: true }) || 'Registered through Parent Portal Account Registration'
      };
      batch.set(col('students').doc(id), student);
    }
    batch.set(
      col('users').doc(user.uid),
      {
        uid: user.uid,
        email: user.email,
        displayName: parentName,
        parentPhone,
        studentIds: FieldValue.arrayUnion(...ids),
        createdAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    await batch.commit();
    res.status(201).json({ studentIds: ids });
  })
);

router.post(
  '/hoodie-orders',
  requireUser,
  ah(async (req, res) => {
    const b = req.body || {};
    const studentId = str(b.studentId, 'Child', { max: 100 });
    const size = oneOf(b.size, HOODIE_SIZES, 'Size');
    const isPersonalized = b.isPersonalized === true;
    const personalizedText = isPersonalized ? str(b.personalizedText, 'Embroidery text', { max: 40 }) : undefined;

    const student = (await col('students').doc(studentId).get()).data() as Student | undefined;
    if (!student) throw new HttpError(404, 'Child not found.');
    if (!isAdmin(req.user)) {
      const mine = await parentStudents(req);
      if (!mine.some((s) => s.id === studentId)) throw new HttpError(403, 'You can only order for your own children.');
    }

    const order = await db.runTransaction(async (tx) => {
      const stockRef = col('hoodie_stock').doc(size);
      const stock = (await tx.get(stockRef)).data()?.count ?? 0;
      const newOrder: HoodieDistribution = {
        id: newId('hd'),
        studentId,
        studentName: student.studentName,
        parentName: student.parentName,
        size,
        isPersonalized,
        personalizedText,
        status: stock > 0 ? 'ready' : 'requested',
        requestedAt: today(),
        price: isPersonalized ? 38 : 32
      };
      if (stock > 0) tx.set(stockRef, { size, count: stock - 1 });
      tx.set(col('hoodie_distributions').doc(newOrder.id), newOrder);
      return newOrder;
    });
    res.status(201).json(order);
  })
);

/** Parent (or admin) sets or removes a child's profile photo. The browser sends a small resized JPEG. */
router.put(
  '/students/:id/photo',
  requireUser,
  ah(async (req, res) => {
    const studentId = req.params.id;
    if (!isAdmin(req.user)) {
      const mine = await parentStudents(req);
      if (!mine.some((s) => s.id === studentId)) throw new HttpError(403, 'You can only change your own child’s photo.');
    }
    const photo = req.body?.photo;
    if (photo === null) {
      await col('students').doc(studentId).update({ photoURL: FieldValue.delete() });
      return res.json({ ok: true });
    }
    if (typeof photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)) {
      throw new HttpError(400, 'Please choose a JPEG, PNG or WebP image.');
    }
    if (photo.length > 200_000) throw new HttpError(400, 'This photo is too large.');
    await col('students').doc(studentId).update({ photoURL: photo });
    res.json({ ok: true });
  })
);

router.post(
  '/posts/:id/like',
  requireUser,
  ah(async (req, res) => {
    const uid = req.user!.uid;
    const ref = col('facebook_posts').doc(req.params.id);
    await db.runTransaction(async (tx) => {
      const post = (await tx.get(ref)).data() as FacebookPost | undefined;
      if (!post) throw new HttpError(404, 'Post not found.');
      const likedBy = post.likedBy || [];
      const hasLiked = likedBy.includes(uid);
      tx.update(ref, {
        likes: hasLiked ? Math.max(0, post.likes - 1) : post.likes + 1,
        likedBy: hasLiked ? FieldValue.arrayRemove(uid) : FieldValue.arrayUnion(uid)
      });
    });
    res.json({ ok: true });
  })
);

router.post(
  '/posts/:id/comments',
  requireUser,
  ah(async (req, res) => {
    const comment: FacebookComment = {
      id: newId('cm'),
      author: req.user!.displayName,
      text: str(req.body?.text, 'Comment', { max: 1000 }),
      date: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    const ref = col('facebook_posts').doc(req.params.id);
    if (!(await ref.get()).exists) throw new HttpError(404, 'Post not found.');
    await ref.update({ comments: FieldValue.increment(1), commentsList: FieldValue.arrayUnion(comment) });
    res.status(201).json(comment);
  })
);

router.post(
  '/events/:id/rsvp',
  requireUser,
  ah(async (req, res) => {
    const uid = req.user!.uid;
    const ref = col('events').doc(req.params.id);
    const isRegistered = await db.runTransaction(async (tx) => {
      const evt = (await tx.get(ref)).data() as (ClubEvent & { registeredUids?: string[] }) | undefined;
      if (!evt) throw new HttpError(404, 'Event not found.');
      const registered = (evt.registeredUids || []).includes(uid);
      if (!registered && evt.spotsLeft <= 0) throw new HttpError(409, 'This event is full.');
      tx.update(ref, {
        registeredUids: registered ? FieldValue.arrayRemove(uid) : FieldValue.arrayUnion(uid),
        spotsLeft: registered ? evt.spotsLeft + 1 : evt.spotsLeft - 1
      });
      return !registered;
    });
    res.json({ isRegistered });
  })
);

// ---------- trainers (and admins) ----------

router.post(
  '/sessions',
  requireRole('trainer', 'admin'),
  ah(async (req, res) => {
    const b = req.body || {};
    const groupId = str(b.groupId, 'Class', { max: 100 });
    const group = await getGroup(groupId);
    if (!group) throw new HttpError(404, 'Class not found.');
    if (!isAdmin(req.user) && !group.trainerIds.includes(req.user!.trainerId!)) {
      throw new HttpError(403, 'You can only take attendance for your own classes.');
    }

    const date = str(b.date, 'Date', { max: 20 });
    const allowedIds = new Set((await studentsInClasses([groupId])).map((st) => st.id));

    // The mark is credited to the trainer who is signed in
    const trainer = req.user!.trainerId
      ? ((await col('trainers').doc(req.user!.trainerId).get()).data() as Trainer | undefined)
      : undefined;
    const ratedBy = trainer?.name || req.user!.displayName;
    const ratedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const records: Record<string, StudentAttendanceRecord> = {};
    for (const [studentId, r] of Object.entries((b.records || {}) as Record<string, StudentAttendanceRecord>)) {
      if (!allowedIds.has(studentId)) continue;
      const status = oneOf(r?.status, ['present', 'absent', 'late', 'unmarked'] as const, 'Attendance status');
      // Mark out of 20; absent children and empty fields are simply not rated
      const hasMark = status !== 'absent' && r?.rating !== undefined && r?.rating !== null && String(r.rating) !== '';
      const rating = hasMark ? num(r.rating, 'Mark', { min: 0, max: 20 }) : undefined;
      records[studentId] = {
        studentId,
        status,
        rating,
        ratedBy: rating !== undefined ? ratedBy : undefined,
        ratedAt: rating !== undefined ? ratedAt : undefined,
        pedagogicalRemark: str(r?.pedagogicalRemark, 'Remark', { max: 1000, optional: true }) || undefined,
        remarks: str(r?.remarks, 'Remark', { max: 1000, optional: true }) || undefined
      };
    }

    const existing = await col('sessions').where('groupId', '==', groupId).where('date', '==', date).limit(1).get();
    const validate = b.validateSyllabus === true;
    const session: SessionRecord = {
      id: existing.empty ? newId('sess') : existing.docs[0].id,
      groupId,
      date,
      weekNumber: num(b.weekNumber, 'Week', { min: 0, max: 200 }),
      topicTaught: str(b.topicTaught, 'Topic', { max: 300, optional: true }),
      isSyllabusValidated: validate,
      validatedAt: validate ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
      trainerNotes: str(b.trainerNotes, 'Notes', { max: 2000, optional: true }) || undefined,
      records
    };
    await col('sessions').doc(session.id).set(session);
    res.json(session);
  })
);

router.post(
  '/material-requests',
  requireRole('trainer', 'admin'),
  ah(async (req, res) => {
    const b = req.body || {};
    const trainerId = isAdmin(req.user) ? str(b.trainerId, 'Trainer', { max: 100 }) : req.user!.trainerId!;
    const trainer = (await col('trainers').doc(trainerId).get()).data() as Trainer | undefined;
    const group = await getGroup(str(b.groupId, 'Class', { max: 100 }));
    if (!trainer || !group) throw new HttpError(404, 'Trainer or class not found.');

    const request: MaterialRequest = {
      id: newId('mat'),
      trainerId,
      trainerName: trainer.name,
      groupId: group.id,
      groupName: group.name,
      itemsNeeded: str(b.itemsNeeded, 'Items', { max: 1000 }),
      quantity: str(b.quantity, 'Quantity', { max: 100 }),
      urgency: oneOf(b.urgency, ['low', 'medium', 'urgent'] as const, 'Urgency'),
      status: 'pending',
      requestedAt: today(),
      sessionDate: str(b.sessionDate, 'Session date', { max: 20, optional: true })
    };
    await col('material_requests').doc(request.id).set(request);
    res.status(201).json(request);
  })
);

// ---------- admin only ----------

const adminRouter = Router();
adminRouter.use(requireRole('admin'));
router.use('/admin', adminRouter);

adminRouter.patch(
  '/students/:id',
  ah(async (req, res) => {
    const b = req.body || {};
    const update: Record<string, unknown> = {};
    if (b.status !== undefined) update.status = oneOf(b.status, STUDENT_STATUSES, 'Status');
    if (b.paymentStatus !== undefined) update.paymentStatus = oneOf(b.paymentStatus, PAYMENT_STATUSES, 'Payment status');
    if (b.customMonthlyPrice !== undefined) {
      update.customMonthlyPrice =
        b.customMonthlyPrice === null ? FieldValue.delete() : num(b.customMonthlyPrice, 'Price', { min: 0, max: 10000 });
    }
    await col('students').doc(req.params.id).update(update);
    res.json({ ok: true });
  })
);

/** Add a child to a class (a child can be in several classes). */
adminRouter.post(
  '/students/:id/classes',
  ah(async (req, res) => {
    const group = await getGroup(str(req.body?.groupId, 'Class', { max: 100 }));
    if (!group) throw new HttpError(404, 'Class not found.');
    const ref = col('students').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Child not found.');
    const student = normalizeStudent(snap.data()!);
    const groupIds = student.groupIds.includes(group.id) ? student.groupIds : [...student.groupIds, group.id];
    await ref.update({
      groupIds,
      ...(await enrollmentFields(groupIds)),
      ...(student.status === 'waitlist' ? { status: 'accepted' } : {})
    });
    res.json({ groupIds });
  })
);

/** Remove a child from one class. */
adminRouter.delete(
  '/students/:id/classes/:groupId',
  ah(async (req, res) => {
    const ref = col('students').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Child not found.');
    const groupIds = normalizeStudent(snap.data()!).groupIds.filter((id) => id !== req.params.groupId);
    await ref.update({ groupIds, ...(await enrollmentFields(groupIds)) });
    res.json({ groupIds });
  })
);

adminRouter.delete(
  '/students/:id',
  ah(async (req, res) => {
    await col('students').doc(req.params.id).delete();
    res.json({ ok: true });
  })
);

function parseTrainerIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, 'Choose at least one trainer.');
  if (value.length > 20) throw new HttpError(400, 'Too many trainers.');
  return [...new Set(value.map((id) => str(id, 'Trainer', { max: 100 })))];
}

function parseGroup(b: Record<string, unknown>, id: string): Group {
  return {
    id,
    name: str(b.name, 'Class name', { max: 120 }),
    programId: str(b.programId, 'Program', { max: 100 }),
    trainerIds: parseTrainerIds(b.trainerIds),
    dayOfWeek: oneOf(b.dayOfWeek, DAYS, 'Day'),
    timeSlot: str(b.timeSlot, 'Time slot', { max: 60 }),
    room: str(b.room, 'Room', { max: 60, optional: true }),
    maxCapacity: num(b.maxCapacity, 'Capacity', { min: 1, max: 200 })
  };
}

adminRouter.post(
  '/groups',
  ah(async (req, res) => {
    const group = parseGroup(req.body || {}, newId('grp'));
    await col('groups').doc(group.id).set(group);
    res.status(201).json(group);
  })
);

adminRouter.put(
  '/groups/:id',
  ah(async (req, res) => {
    const group = parseGroup(req.body || {}, req.params.id);
    await col('groups').doc(group.id).set(group);
    res.json(group);
  })
);

adminRouter.delete(
  '/groups/:id',
  ah(async (req, res) => {
    const batch = db.batch();
    batch.delete(col('groups').doc(req.params.id));
    const members = await col('students').where('groupIds', 'array-contains', req.params.id).get();
    await batch.commit();
    // Update each child's program and price now that this class is gone
    for (const d of members.docs) {
      const remaining = normalizeStudent(d.data()).groupIds.filter((id) => id !== req.params.id);
      await d.ref.update({ groupIds: remaining, ...(await enrollmentFields(remaining)) });
    }
    res.json({ ok: true });
  })
);

function parseProgram(b: Record<string, unknown>, id: string): Program {
  const syllabus = Array.isArray(b.syllabus) ? b.syllabus : [];
  return {
    id,
    title: str(b.title, 'Title', { max: 150 }),
    ageRange: str(b.ageRange, 'Age range', { max: 40 }),
    description: str(b.description, 'Description', { max: 3000, optional: true }),
    level: oneOf(b.level, ['Beginner', 'Intermediate', 'Advanced', 'Competitive'] as const, 'Level'),
    pricePerMonth: num(b.pricePerMonth, 'Price', { min: 0, max: 10000 }),
    duration: str(b.duration, 'Duration', { max: 60, optional: true }),
    badge: str(b.badge, 'Badge', { max: 60, optional: true }),
    syllabus: syllabus.slice(0, 100).map((w: Record<string, unknown>) => ({
      week: num(w?.week, 'Week', { min: 0, max: 200 }),
      title: str(w?.title, 'Week title', { max: 200 }),
      description: str(w?.description, 'Week description', { max: 2000, optional: true }),
      hardware: str(w?.hardware, 'Hardware', { max: 500, optional: true })
    }))
  };
}

adminRouter.put(
  '/programs/:id',
  ah(async (req, res) => {
    const program = parseProgram(req.body || {}, req.params.id);
    await col('programs').doc(program.id).set(program);
    res.json(program);
  })
);

adminRouter.delete(
  '/programs/:id',
  ah(async (req, res) => {
    await col('programs').doc(req.params.id).delete();
    res.json({ ok: true });
  })
);

adminRouter.post(
  '/programs/:id/objectives',
  ah(async (req, res) => {
    const [objective] = parseProgram({ title: 'x', ageRange: 'x', level: 'Beginner', pricePerMonth: 0, syllabus: [req.body] }, 'x').syllabus;
    await col('programs').doc(req.params.id).update({ syllabus: FieldValue.arrayUnion(objective) });
    res.json(objective);
  })
);

adminRouter.put(
  '/trainers/:id',
  ah(async (req, res) => {
    const b = req.body || {};
    const trainer: Trainer = {
      id: req.params.id,
      name: str(b.name, 'Name', { max: 120 }),
      specialization: str(b.specialization, 'Specialization', { max: 200, optional: true }),
      specialty: str(b.specialty, 'Specialty', { max: 200, optional: true }) || undefined,
      // Lower-cased so it matches the sign-in email (this is how trainers get their role)
      email: str(b.email, 'Email', { max: 200 }).toLowerCase(),
      phone: str(b.phone, 'Phone', { max: 40, optional: true }),
      avatar: str(b.avatar, 'Avatar', { max: 2000, optional: true }),
      bio: str(b.bio, 'Bio', { max: 3000, optional: true })
    };
    await col('trainers').doc(trainer.id).set(trainer);
    res.json(trainer);
  })
);

adminRouter.patch(
  '/material-requests/:id',
  ah(async (req, res) => {
    const status = oneOf(req.body?.status, ['pending', 'approved', 'delivered'] as const, 'Status');
    await col('material_requests').doc(req.params.id).update({ status });
    res.json({ ok: true });
  })
);

adminRouter.patch(
  '/hoodie-orders/:id',
  ah(async (req, res) => {
    const status = oneOf(req.body?.status, ['requested', 'ready', 'picked_up'] as const, 'Status');
    await col('hoodie_distributions').doc(req.params.id).update({
      status,
      ...(status === 'picked_up' ? { pickedUpAt: today() } : {})
    });
    res.json({ ok: true });
  })
);

adminRouter.post(
  '/hoodie-stock/:size',
  ah(async (req, res) => {
    const size = oneOf(req.params.size, HOODIE_SIZES, 'Size');
    const amount = num(req.body?.amount, 'Amount', { min: -1000, max: 1000 });
    const ref = col('hoodie_stock').doc(size);
    const count = await db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data()?.count ?? 0;
      const next = Math.max(0, current + amount);
      tx.set(ref, { size, count: next });
      return next;
    });
    res.json({ size, count });
  })
);

adminRouter.post(
  '/posts',
  ah(async (req, res) => {
    const b = req.body || {};
    const post: FacebookPost = {
      id: `fb-${Date.now()}`,
      caption: str(b.caption, 'Caption', { max: 5000 }),
      date: str(b.date, 'Date', { max: 60, optional: true }) || today(),
      // Firestore documents are limited to 1 MB, so very large pasted images are rejected
      imageUrl: str(b.imageUrl, 'Image', { max: 900_000 }),
      likes: 0,
      comments: 0,
      tag: str(b.tag, 'Tag', { max: 80, optional: true }),
      postUrl: str(b.postUrl, 'Post link', { max: 500, optional: true }),
      likedBy: [],
      commentsList: []
    };
    await col('facebook_posts').doc(post.id).set(post);
    res.status(201).json(post);
  })
);

adminRouter.delete(
  '/posts/:id',
  ah(async (req, res) => {
    await col('facebook_posts').doc(req.params.id).delete();
    res.json({ ok: true });
  })
);

adminRouter.post(
  '/seed',
  ah(async (req, res) => {
    const written = await seedDatabase({ overwrite: req.body?.overwrite === true, demo: req.body?.demo === true });
    res.json({ written });
  })
);

router.use((_req, res) => res.status(404).json({ error: 'Unknown API route.' }));
