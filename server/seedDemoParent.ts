// Demo parent account with realistic data (children, classes, trainers, attendance, marks /20, hoodie order).
//
//   npm run seed:parent1            -> create / refresh the demo
//   npm run seed:parent1 -- --remove -> delete everything this script created
//
// Login: parent1@example.com / Parent1234
// Every document written here has `demo: true`, so it is easy to find and remove.
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, db } from './firebaseAdmin';
import type { Group, Program, SessionRecord, StudentAttendanceRecord, Student, Trainer } from '../src/types';

const EMAIL = 'parent1@example.com';
const PASSWORD = 'Parent1234';
const PARENT_NAME = 'Sonia Ben Ali';
const PARENT_PHONE = '+216 98 765 432';

const DAY_INDEX: Record<Group['dayOfWeek'], number> = { Sunday: 0, Wednesday: 3, Saturday: 6 };

/** The last `count` dates (YYYY-MM-DD) falling on `day`, oldest first, up to today. */
function pastWeekdays(day: Group['dayOfWeek'], count: number): string[] {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== DAY_INDEX[day]) d.setDate(d.getDate() - 1);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.unshift(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() - 7);
  }
  return dates;
}

const REMARKS = [
  'Excellent focus today, the rover followed the line perfectly.',
  'Great teamwork while wiring the ultrasonic sensor.',
  'Understood gear ratios quickly, explained them to a classmate.',
  'Good progress, needs to double-check wiring before powering on.',
  'Very creative solution for the obstacle challenge!',
  'A bit distracted at the start, finished strong.',
  'Wrote clean code with clear comments, well done.',
  'Debugged the servo jitter on their own, impressive.'
];

async function removeDemo() {
  const user = await adminAuth.getUserByEmail(EMAIL).catch(() => null);
  for (const name of ['students', 'sessions', 'hoodie_distributions']) {
    const snap = await db.collection(name).where('demo', '==', true).get();
    for (const d of snap.docs) await d.ref.delete();
    console.log(`${name.padEnd(22)} ${snap.size} demo documents deleted`);
  }
  if (user) {
    await db.collection('users').doc(user.uid).delete();
    const events = await db.collection('events').where('registeredUids', 'array-contains', user.uid).get();
    for (const e of events.docs) {
      await e.ref.update({ registeredUids: FieldValue.arrayRemove(user.uid), spotsLeft: FieldValue.increment(1) });
    }
    await adminAuth.deleteUser(user.uid);
    console.log(`account                deleted (${EMAIL})`);
  }
}

async function createDemo() {
  // Start clean so the script can be re-run safely
  await removeDemo();

  const [programsSnap, groupsSnap, trainersSnap] = await Promise.all([
    db.collection('programs').get(),
    db.collection('groups').get(),
    db.collection('trainers').get()
  ]);
  const programs = new Map(programsSnap.docs.map((d) => [d.id, d.data() as Program]));
  const groups = new Map(
    groupsSnap.docs.map((d) => {
      const g = d.data() as Group & { trainerId?: string };
      return [d.id, { ...g, trainerIds: g.trainerIds || (g.trainerId ? [g.trainerId] : []) }];
    })
  );
  const trainers = new Map(trainersSnap.docs.map((d) => [d.id, d.data() as Trainer]));

  const need = ['grp-rob-sat-am', 'grp-ai-sun-am', 'grp-ard-sat-pm'];
  for (const id of need) if (!groups.has(id)) throw new Error(`Class ${id} not found. Run "npm run seed" first.`);

  // Robotics Juniors Alpha gets a second trainer, to show several trainers per class
  const alpha = groups.get('grp-rob-sat-am')!;
  if (!alpha.trainerIds.includes('tr-1')) {
    alpha.trainerIds = [...alpha.trainerIds, 'tr-1'];
    await db.collection('groups').doc(alpha.id).update({ trainerIds: alpha.trainerIds });
  }

  // 1. Account + profile
  const user = await adminAuth.createUser({ email: EMAIL, password: PASSWORD, displayName: PARENT_NAME, emailVerified: true });

  const priceOf = (groupIds: string[]) =>
    [...new Set(groupIds.map((g) => groups.get(g)!.programId))].reduce((sum, p) => sum + (programs.get(p)?.pricePerMonth || 0), 0);

  type KidBase = Pick<Student, 'id' | 'studentName' | 'studentAge' | 'groupIds' | 'status' | 'paymentStatus' | 'registeredAt' | 'notes'>;
  const kidBases: KidBase[] = [
    {
      id: 'std-demo-yassine',
      studentName: 'Yassine Ben Ali',
      studentAge: 10,
      groupIds: ['grp-rob-sat-am', 'grp-ai-sun-am'],
      status: 'active',
      paymentStatus: 'paid',
      registeredAt: '2026-06-14',
      notes: 'Loves building LEGO rovers. Allergic to peanuts.'
    },
    {
      id: 'std-demo-nour',
      studentName: 'Nour Ben Ali',
      studentAge: 13,
      groupIds: ['grp-ard-sat-pm'],
      status: 'accepted',
      paymentStatus: 'pending',
      registeredAt: '2026-07-02',
      notes: 'Interested in electronics competitions.'
    },
    {
      id: 'std-demo-adam',
      studentName: 'Adam Ben Ali',
      studentAge: 7,
      groupIds: [],
      status: 'waitlist',
      paymentStatus: 'pending',
      registeredAt: '2026-09-20',
      notes: 'First time in a robotics club.'
    }
  ];
  const kids: (Student & { parentUid: string; demo: true })[] = kidBases.map((k) => ({
    ...k,
    parentUid: user.uid,
    parentName: PARENT_NAME,
    parentPhone: PARENT_PHONE,
    parentEmail: EMAIL,
    programId: k.groupIds.length ? groups.get(k.groupIds[0])!.programId : '',
    standardMonthlyPrice: priceOf(k.groupIds),
    demo: true as const
  }));

  const batch = db.batch();
  for (const k of kids) batch.set(db.collection('students').doc(k.id), k);
  batch.set(db.collection('users').doc(user.uid), {
    uid: user.uid,
    email: EMAIL,
    displayName: PARENT_NAME,
    parentPhone: PARENT_PHONE,
    studentIds: kids.map((k) => k.id),
    createdAt: FieldValue.serverTimestamp(),
    demo: true
  });

  // 2. Six weeks of sessions per class, with attendance, marks /20 and remarks
  let sessionCount = 0;
  let r = 7; // tiny deterministic "random" so re-runs produce the same story
  const next = () => (r = (r * 9301 + 49297) % 233280) / 233280;

  for (const groupId of new Set(kids.flatMap((k) => k.groupIds))) {
    const group = groups.get(groupId)!;
    const program = programs.get(group.programId);
    const members = kids.filter((k) => k.groupIds.includes(groupId));
    const dates = pastWeekdays(group.dayOfWeek, 6);

    dates.forEach((date, w) => {
      const trainer = trainers.get(group.trainerIds[w % group.trainerIds.length]);
      const syllabus = program?.syllabus || [];
      const topic = syllabus.length ? syllabus[w % syllabus.length] : undefined;
      const records: Record<string, StudentAttendanceRecord> = {};

      for (const kid of members) {
        const roll = next();
        const status: StudentAttendanceRecord['status'] = w === 2 && kid.id === 'std-demo-yassine' && groupId === 'grp-ai-sun-am' ? 'absent' : roll < 0.15 ? 'late' : 'present';
        const rating = status === 'absent' ? undefined : Math.round((12 + next() * 7.5) * 2) / 2; // 12 – 19.5, half points
        records[kid.id] = {
          studentId: kid.id,
          status,
          rating,
          ratedBy: rating !== undefined ? trainer?.name : undefined,
          ratedAt: rating !== undefined ? `${date} ${group.timeSlot.slice(0, 5)}` : undefined,
          remarks: status === 'absent' ? 'Absent: missed the sensor calibration lab.' : REMARKS[Math.floor(next() * REMARKS.length)]
        };
      }

      const session: SessionRecord & { demo: true } = {
        id: `sess-demo-${groupId}-${date}`,
        groupId,
        date,
        weekNumber: (topic?.week ?? w + 1),
        topicTaught: topic?.title || 'Robotics workshop',
        isSyllabusValidated: true,
        validatedAt: `${date} 18:00`,
        trainerNotes: 'Great energy in the lab today.',
        records,
        demo: true
      };
      batch.set(db.collection('sessions').doc(session.id), JSON.parse(JSON.stringify(session)));
      sessionCount++;
    });
  }

  // 3. A hoodie that was already picked up (does not touch the stock)
  batch.set(db.collection('hoodie_distributions').doc('hd-demo-yassine'), {
    id: 'hd-demo-yassine',
    studentId: 'std-demo-yassine',
    studentName: 'Yassine Ben Ali',
    parentName: PARENT_NAME,
    size: '10-12Y',
    isPersonalized: true,
    personalizedText: 'YASSINE #07',
    status: 'picked_up',
    requestedAt: '2026-09-06',
    pickedUpAt: '2026-09-13',
    price: 38,
    demo: true
  });

  await batch.commit();

  // 4. Registered for one upcoming event
  const firstEvent = (await db.collection('events').limit(1).get()).docs[0];
  if (firstEvent) {
    await firstEvent.ref.update({ registeredUids: FieldValue.arrayUnion(user.uid), spotsLeft: FieldValue.increment(-1) });
  }

  console.log('\nDemo parent created:');
  console.log(`  login     ${EMAIL} / ${PASSWORD}`);
  for (const k of kids) {
    const classes = k.groupIds.map((g) => groups.get(g)!.name).join(' + ') || '(no class yet)';
    console.log(`  ${k.studentName.padEnd(16)} ${k.status.padEnd(9)} ${classes}`);
  }
  console.log(`  sessions  ${sessionCount} with attendance and marks /20`);
  console.log(`  trainers  ${alpha.name}: ${alpha.trainerIds.map((t) => trainers.get(t)?.name).join(', ')}`);
}

if (process.argv.includes('--remove')) await removeDemo();
else await createDemo();
process.exit(0);
