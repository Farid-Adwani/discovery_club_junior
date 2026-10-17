import { Group, ScheduleItem, ScheduleItemKind, Student, WeekDay } from '../types';

/** JavaScript weekday number (Sunday = 0) of each class day */
export const DAY_INDEX: Record<WeekDay, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

/** The day's name in the current language, e.g. "samedi" (4 Jan 2026 was a Sunday) */
export function weekdayName(day: WeekDay, locale: string, style: 'long' | 'short' = 'long'): string {
  return new Date(2026, 0, 4 + DAY_INDEX[day], 12).toLocaleDateString(locale, { weekday: style });
}

/** Local calendar day as YYYY-MM-DD (not UTC, so late evenings don't jump a day) */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Monday of the week containing `d` (weeks run Monday to Sunday) */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** "09:00 - 11:00" -> ["09:00", "11:00"] */
export function parseTimeSlot(slot: string): [string, string] {
  const [start = '', end = ''] = slot.split(/\s*[-–]\s*/);
  return [start.trim(), end.trim()];
}

export type WeekEntryKind = 'class' | Exclude<ScheduleItemKind, 'cancellation'>;

export interface WeekEntry {
  key: string;
  date: string;
  kind: WeekEntryKind;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  studentId: string;
  groupId?: string; // regular class
  item?: ScheduleItem; // added by the admin
  cancellation?: ScheduleItem; // the class is cancelled that day
  childCount?: number; // coach view: children in the class
  excusedCount?: number; // coach view: children whose class was cancelled that day (the class still happens)
}

/** Does a (non-cancellation) item take place on this day? Weekly items repeat on their weekday from their first date. */
const itemOccurs = (it: ScheduleItem, date: string) =>
  it.recurrence === 'once' ? it.date === date : it.date <= date && fromISODate(it.date).getDay() === fromISODate(date).getDay();

/**
 * A coach's week: each of the given classes once per occurrence, with how many children come,
 * plus what the office added for this coach (`trainerId`).
 * The class shows as cancelled when it was cancelled for every child in it.
 */
export function buildClassWeek(
  weekStart: Date,
  classIds: string[],
  groups: Group[],
  items: ScheduleItem[],
  students: Student[],
  trainerId?: string
): WeekEntry[][] {
  const days: WeekEntry[][] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const date = toISODate(day);
    const entries: WeekEntry[] = [];
    for (const g of groups) {
      if (!classIds.includes(g.id) || DAY_INDEX[g.dayOfWeek] !== day.getDay()) continue;
      const [startTime, endTime] = parseTimeSlot(g.timeSlot);
      const kids = students.filter((s) => s.groupIds.includes(g.id));
      const cancels = items.filter((it) => it.kind === 'cancellation' && it.groupId === g.id && it.date === date);
      const excused = new Set(cancels.flatMap((it) => it.studentIds));
      const allCancelled = cancels.length > 0 && (kids.length === 0 || kids.every((k) => excused.has(k.id)));
      entries.push({
        key: `class:${g.id}:${date}`,
        date,
        kind: 'class',
        title: g.name,
        startTime,
        endTime,
        location: g.room,
        studentId: '',
        groupId: g.id,
        cancellation: allCancelled ? cancels[0] : undefined,
        childCount: kids.length,
        excusedCount: allCancelled ? 0 : kids.filter((k) => excused.has(k.id)).length
      });
    }
    if (trainerId) {
      for (const it of items) {
        if (it.kind === 'cancellation' || !it.trainerIds?.includes(trainerId) || !itemOccurs(it, date)) continue;
        entries.push({
          key: `item:${it.id}:${date}`,
          date,
          kind: it.kind,
          title: it.title,
          startTime: it.startTime,
          endTime: it.endTime,
          location: it.location,
          notes: it.notes,
          studentId: '',
          item: it
        });
      }
    }
    entries.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title));
    days.push(entries);
  }
  return days;
}

/** Everything the given students have on each day of the week starting at `weekStart` (7 arrays, Monday first). */
export function buildWeek(weekStart: Date, students: Student[], groups: Group[], items: ScheduleItem[]): WeekEntry[][] {
  const days: WeekEntry[][] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const date = toISODate(day);
    const weekday = day.getDay();
    const entries: WeekEntry[] = [];

    for (const st of students) {
      // Regular classes
      for (const g of groups) {
        if (!st.groupIds.includes(g.id) || DAY_INDEX[g.dayOfWeek] !== weekday) continue;
        const [startTime, endTime] = parseTimeSlot(g.timeSlot);
        const cancellation = items.find(
          (it) => it.kind === 'cancellation' && it.groupId === g.id && it.date === date && it.studentIds.includes(st.id)
        );
        entries.push({
          key: `class:${g.id}:${st.id}:${date}`,
          date,
          kind: 'class',
          title: g.name,
          startTime,
          endTime,
          location: g.room,
          studentId: st.id,
          groupId: g.id,
          cancellation
        });
      }
      // Items added by the admin
      for (const it of items) {
        if (it.kind === 'cancellation' || !it.studentIds.includes(st.id)) continue;
        const occurs =
          it.recurrence === 'once' ? it.date === date : it.date <= date && fromISODate(it.date).getDay() === weekday;
        if (!occurs) continue;
        entries.push({
          key: `item:${it.id}:${st.id}:${date}`,
          date,
          kind: it.kind,
          title: it.title,
          startTime: it.startTime,
          endTime: it.endTime,
          location: it.location,
          notes: it.notes,
          studentId: st.id,
          item: it
        });
      }
    }
    entries.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title));
    days.push(entries);
  }
  return days;
}
