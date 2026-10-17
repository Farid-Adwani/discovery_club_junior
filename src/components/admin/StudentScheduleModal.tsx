import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { PeoplePicker, ScheduleItemForm } from './ScheduleItemForm';
import { useLanguage, useT } from '../../i18n';
import { scheduleMessages } from '../../i18n/messages/schedule';
import { WeekSchedule } from '../common/WeekSchedule';
import { useConfirm } from '../common/ConfirmProvider';
import { WeekEntry, fromISODate } from '../../utils/schedule';

/** Admin: one student's week. Add courses / events / meetings, remove them, or cancel a class on one day. */
export const StudentScheduleModal: React.FC<{ student: Student; onClose: () => void }> = ({ student, onClose }) => {
  const { students, addScheduleItem, removeStudentFromScheduleItem, deleteScheduleItem } = useApp();
  const t = useT(scheduleMessages);
  const confirm = useConfirm();
  const { locale } = useLanguage();

  const [addDate, setAddDate] = useState<string | null>(null);
  const [studentIds, setStudentIds] = useState<string[]>([student.id]);

  // Keep the student object fresh after each save (the list is reloaded)
  const current = students.find((s) => s.id === student.id) || student;
  const dateLabel = (iso: string) =>
    fromISODate(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  const openAdd = (date: string) => {
    setAddDate(date);
    setStudentIds([student.id]);
  };

  const editing = {
    onAdd: openAdd,
    onRemove: async (entry: WeekEntry) => {
      const item = entry.item!;
      const message = item.recurrence === 'weekly' ? 'confirmRemoveWeekly' : 'confirmRemove';
      if (await confirm({ title: t(message, { title: item.title, name: current.studentName }), danger: true, confirmLabel: t('remove') })) {
        removeStudentFromScheduleItem(item.id, current.id);
      }
    },
    onCancelClass: async (entry: WeekEntry) => {
      if (
        await confirm({
          title: t('confirmCancelClass', { title: entry.title, name: current.studentName, date: dateLabel(entry.date) }),
          danger: true,
          confirmLabel: t('cancelThisDay')
        })
      ) {
        addScheduleItem({
          studentIds: [current.id],
          kind: 'cancellation',
          title: '',
          recurrence: 'once',
          date: entry.date,
          startTime: '',
          endTime: '',
          groupId: entry.groupId
        });
      }
    },
    onRestoreClass: (entry: WeekEntry) => {
      const c = entry.cancellation!;
      if (c.studentIds.length > 1) removeStudentFromScheduleItem(c.id, current.id);
      else deleteScheduleItem(c.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="duo-card bg-white w-full max-w-6xl p-4 sm:p-6 space-y-4 max-h-[94vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">{t('scheduleFor', { name: current.studentName })}</h3>
            <p className="text-[11px] font-medium text-slate-500">{t('classesHint')}</p>
          </div>
          <button onClick={onClose} aria-label={t('close')} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <WeekSchedule students={[current]} editing={editing} />

        {/* Add form */}
        {addDate && (
          <ScheduleItemForm
            date={addDate}
            canSave={studentIds.length > 0}
            onClose={() => setAddDate(null)}
            onSave={(fields) => addScheduleItem({ ...fields, studentIds })}
          >
            <PeoplePicker
              label={t('forStudents')}
              searchPlaceholder={t('searchStudents')}
              people={students.map((s) => ({ id: s.id, name: s.studentName }))}
              selected={studentIds}
              onChange={setStudentIds}
            />
          </ScheduleItemForm>
        )}
      </div>
    </div>
  );
};
