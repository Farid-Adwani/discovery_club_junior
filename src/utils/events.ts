// Rules about club events shared by the website and the server (no React here).
import type { ClubEvent, EventPaymentStatus, EventRegistration, ScheduleItem } from '../types';

/** Picture shown for an event that has no image of its own */
export const EVENT_DEFAULT_IMAGE = '/photos/class_default.svg';

/** Schedule items made from events start with this (they can't be removed from the week view) */
export const EVENT_ITEM_PREFIX = 'evt-item:';

/** Last day of the event (the first day for a one-day event) */
export const lastDay = (e: Pick<ClubEvent, 'date' | 'endDate'>) => e.endDate || e.date;

/**
 * Can parents register a child right now?
 * 'open', or why not: hidden, closed by the club, deadline passed, event already started, or full.
 * A full event still takes requests: they go to the club, who can put the child on the waiting list.
 */
export type RegistrationState = 'open' | 'full' | 'hidden' | 'closed' | 'deadline' | 'past';

export function registrationState(e: ClubEvent, today: string, acceptedCount = e.acceptedCount ?? 0): RegistrationState {
  if (!e.visible) return 'hidden';
  if (e.date < today) return 'past';
  if (!e.registrationOpen) return 'closed';
  if (e.registrationDeadline && today > e.registrationDeadline) return 'deadline';
  if (e.capacity && acceptedCount >= e.capacity) return 'full';
  return 'open';
}

/** Parents may send a request while it is open or full (full requests can wait for a place) */
export const canRequest = (state: RegistrationState) => state === 'open' || state === 'full';

export function eventPaymentStatus(amountDue: number, amountPaid: number): EventPaymentStatus {
  if (amountDue <= 0) return 'free';
  if (amountPaid >= amountDue) return 'paid';
  return amountPaid > 0 ? 'partial' : 'unpaid';
}

/** A registration that still takes a place or a decision (not refused or cancelled) */
export const isActiveRegistration = (r: Pick<EventRegistration, 'status'>) => r.status === 'pending' || r.status === 'accepted' || r.status === 'waitlist';

/** The days of an event, at most 31 (YYYY-MM-DD) */
export function eventDays(e: Pick<ClubEvent, 'date' | 'endDate'>): string[] {
  const days: string[] = [];
  const [y, m, d] = e.date.split('-').map(Number);
  const end = lastDay(e);
  for (let i = 0; i < 31; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    if (day > end) break;
    days.push(day);
  }
  return days;
}

/** Accepted registrations as one-day schedule items, so they show in the children's week */
export function eventScheduleItems(events: ClubEvent[], registrations: EventRegistration[]): ScheduleItem[] {
  const out: ScheduleItem[] = [];
  for (const e of events) {
    if (e.deletedAt) continue;
    const studentIds = registrations.filter((r) => r.eventId === e.id && r.status === 'accepted').map((r) => r.studentId);
    if (!studentIds.length) continue;
    for (const date of eventDays(e)) {
      out.push({
        id: `${EVENT_ITEM_PREFIX}${e.id}:${date}`,
        studentIds,
        kind: 'event',
        title: e.title,
        recurrence: 'once',
        date,
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        location: e.location,
        createdAt: e.createdAt
      });
    }
  }
  return out;
}
