import { AdminProfile, StaffMember, Student, Trainer } from '../types';
import { fromISODate, toISODate } from './schedule';

export type BirthdayKind = 'student' | 'coach' | 'admin' | 'worker';

/** Anyone whose birthday the club celebrates */
export interface BirthdayPerson {
  id: string;
  name: string;
  birthDate?: string;
  photoURL?: string;
  kind: BirthdayKind;
}

export interface UpcomingBirthday {
  person: BirthdayPerson;
  date: string; // YYYY-MM-DD of the coming birthday
  daysUntil: number; // 0 = today
  turning: number; // age reached that day
}

/** Students, coaches and other team members in one list */
export function birthdayPeople(
  students: Student[],
  trainers: Trainer[] = [],
  staff: StaffMember[] = [],
  admins: AdminProfile[] = []
): BirthdayPerson[] {
  return [
    ...admins.map((a) => ({ id: a.id, name: a.name, birthDate: a.birthDate, photoURL: a.photoURL, kind: 'admin' as const })),
    ...students.map((s) => ({ id: s.id, name: s.studentName, birthDate: s.birthDate, photoURL: s.photoURL, kind: 'student' as const })),
    ...trainers.map((t) => ({ id: t.id, name: t.name, birthDate: t.birthDate, photoURL: t.avatar || undefined, kind: 'coach' as const })),
    ...staff.map((m) => ({ id: m.id, name: m.name, birthDate: m.birthDate, kind: m.role }))
  ];
}

/** People whose birthday falls within the next `days` days (today included), soonest first. */
export function upcomingBirthdays(people: BirthdayPerson[], days = 7, now = new Date()): UpcomingBirthday[] {
  const today = fromISODate(toISODate(now));
  const out: UpcomingBirthday[] = [];
  for (const person of people) {
    if (!person.birthDate) continue;
    const [y, m, d] = person.birthDate.split('-').map(Number);
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
      // Born on 29 February: celebrated on 28 February in other years
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const day = m === 2 && d === 29 && !isLeap ? 28 : d;
      const birthday = new Date(year, m - 1, day, 12);
      const daysUntil = Math.round((birthday.getTime() - today.getTime()) / 86_400_000);
      if (daysUntil >= 0) {
        if (daysUntil < days) out.push({ person, date: toISODate(birthday), daysUntil, turning: year - y });
        break;
      }
    }
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil || a.person.name.localeCompare(b.person.name));
}
