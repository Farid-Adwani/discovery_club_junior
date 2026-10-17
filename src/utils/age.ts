import { Student } from '../types';

/** Age in full years today, from the date of birth (older records without one keep their stored age). */
export function ageOf(student: Pick<Student, 'birthDate' | 'studentAge'>, now = new Date()): number {
  if (!student.birthDate) return student.studentAge;
  const [y, m, d] = student.birthDate.split('-').map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}
