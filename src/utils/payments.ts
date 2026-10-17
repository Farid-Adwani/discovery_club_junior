import { Group, MonthlyPaymentStatus, PaymentRecord, Student } from '../types';

/** Month as YYYY-MM in local time */
export const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const currentMonth = () => monthOf(new Date());

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthOf(new Date(y, m - 1 + delta, 1));
}

/** "October 2026" / "oct. 2026" in the current language */
export function monthLabel(month: string, locale: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 15).toLocaleDateString(locale, { month: style, year: 'numeric' });
}

/** Months from `from` to `to` included, oldest first */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

export const effectiveFee = (s: Student) => s.customMonthlyPrice ?? s.standardMonthlyPrice;

/** One child's bill for one month */
export interface PaymentRow {
  student: Student;
  month: string;
  record?: PaymentRecord;
  due: number;
  paid: number;
  outstanding: number;
  status: MonthlyPaymentStatus;
  /** Standard price minus what is billed (sibling discounts, scholarships) */
  discount: number;
}

/** A child is billed from the month they registered, while accepted and in at least one class. */
const isBillable = (s: Student, month: string) =>
  s.status === 'accepted' && s.groupIds.length > 0 && (s.registeredAt || '').slice(0, 7) <= month;

/**
 * Every child's bill for `month`. A saved record wins (its amount is frozen); otherwise the bill
 * is built from the child's current price. Before monthly records existed, the student's own
 * `paymentStatus` described the current month only, so it is still honoured there.
 */
export function monthRows(month: string, students: Student[], payments: PaymentRecord[], today = currentMonth()): PaymentRow[] {
  const records = new Map(payments.filter((p) => p.month === month).map((p) => [p.studentId, p]));
  const rows: PaymentRow[] = [];
  for (const student of students) {
    const record = records.get(student.id);
    if (!record && !isBillable(student, month)) continue;
    let due: number;
    let paid: number;
    let status: MonthlyPaymentStatus;
    if (record) {
      ({ amountDue: due, amountPaid: paid, status } = record);
    } else if (student.paymentStatus === 'scholarship') {
      [due, paid, status] = [0, 0, 'scholarship'];
    } else {
      due = effectiveFee(student);
      const legacyPaid = month === today && student.paymentStatus === 'paid';
      paid = legacyPaid ? due : 0;
      status = legacyPaid || due === 0 ? 'paid' : 'pending';
    }
    rows.push({
      student,
      month,
      record,
      due,
      paid,
      outstanding: status === 'scholarship' ? 0 : Math.max(0, due - paid),
      status,
      discount: Math.max(0, student.standardMonthlyPrice - due)
    });
  }
  return rows;
}

export interface MonthTotals {
  due: number;
  paid: number;
  outstanding: number;
  discount: number;
  /** Paid / due, 0..1 (1 when nothing is due) */
  rate: number;
  children: number;
  counts: Record<MonthlyPaymentStatus, number>;
}

export function totalsOf(rows: PaymentRow[]): MonthTotals {
  const counts: Record<MonthlyPaymentStatus, number> = { paid: 0, partial: 0, pending: 0, scholarship: 0 };
  let due = 0, paid = 0, outstanding = 0, discount = 0;
  for (const r of rows) {
    counts[r.status]++;
    due += r.due;
    paid += r.paid; // overpayments still count as cash in
    outstanding += r.outstanding;
    discount += r.discount;
  }
  return { due, paid, outstanding, discount, rate: due > 0 ? Math.min(1, (due - outstanding) / due) : 1, children: rows.length, counts };
}

/**
 * The first month anything is billed: the earliest registration or saved record.
 * Months before a child registered are never billed (see isBillable).
 */
export function billingStart(students: Student[], payments: PaymentRecord[], today = currentMonth()): string {
  const months = [
    ...students.map((s) => (s.registeredAt || '').slice(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m)),
    ...payments.map((p) => p.month)
  ];
  return months.reduce((min, m) => (m < min ? m : min), today);
}

/** The first month with a saved payment record (earlier months were never marked in this page) */
export function firstRecordMonth(payments: PaymentRecord[], today = currentMonth()): string {
  return payments.reduce((min, p) => (p.month < min ? p.month : min), today);
}

/**
 * What each child still owes for the months before `month` (studentId -> DT and the months).
 * Every month since the child registered counts: a month without a saved payment is unpaid.
 */
export function arrearsBefore(
  month: string,
  students: Student[],
  payments: PaymentRecord[],
  today = currentMonth()
): Map<string, { amount: number; months: string[] }> {
  const out = new Map<string, { amount: number; months: string[] }>();
  for (const m of monthRange(billingStart(students, payments, today), addMonths(month, -1))) {
    for (const r of monthRows(m, students, payments, today)) {
      if (r.outstanding <= 0) continue;
      const entry = out.get(r.student.id) || { amount: 0, months: [] };
      entry.amount += r.outstanding;
      entry.months.push(m);
      out.set(r.student.id, entry);
    }
  }
  return out;
}

/**
 * A class's part of a child's bill: the bill is split between the child's classes in proportion
 * to their prices (so class totals add up to the club total).
 */
export function classShare(row: PaymentRow, group: Group, groups: Group[]): { due: number; paid: number } {
  const mine = row.student.groupIds.map((id) => groups.find((g) => g.id === id)).filter((g): g is Group => !!g);
  const total = mine.reduce((s, g) => s + g.pricePerMonth, 0);
  const ratio = total > 0 ? group.pricePerMonth / total : 1 / (mine.length || 1);
  return { due: row.due * ratio, paid: Math.min(row.paid, row.due) * ratio };
}

/** Same family = same parent account, else same phone number */
export const familyKey = (s: Student) => s.parentUid || s.parentPhone.replace(/\D/g, '') || s.parentName.trim().toLowerCase();

/** wa.me link with a ready-made message; Tunisian 8-digit numbers get the +216 prefix */
export function whatsappLink(phone: string, text: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `216${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Rounded DT amount in the current language, e.g. "1 250" */
export const dt = (n: number, locale: string) => Math.round(n).toLocaleString(locale);
