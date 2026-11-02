import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Trainer } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { scheduleMessages } from '../../i18n/messages/schedule';
import { WeekSchedule } from '../common/WeekSchedule';
import { useConfirm } from '../common/ConfirmProvider';
import { WeekEntry, fromISODate } from '../../utils/schedule';
import { PeoplePicker, ScheduleItemForm } from './ScheduleItemForm';
import { ModalPortal } from '../common/ModalPortal';

/** Admin: one coach's week. Their classes, plus meetings / trainings / events added for them; cancel a class on one day. */
export const CoachScheduleModal: React.FC<{ trainer: Trainer; onClose: () => void }> = ({ trainer, onClose }) => {
  const { trainers, groups, students, scheduleItems, addScheduleItem, removeTrainerFromScheduleItem, deleteScheduleItem } = useApp();
  const t = useT(scheduleMessages);
  const confirm = useConfirm();
  const { locale } = useLanguage();
  const [addDate, setAddDate] = useState<string | null>(null);
  const [trainerIds, setTrainerIds] = useState<string[]>([trainer.id]);

  const classIds = groups.filter((g) => g.trainerIds.includes(trainer.id)).map((g) => g.id);
  const dateLabel = (iso: string) => fromISODate(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  const editing = {
    onAdd: (date: string) => {
      setTrainerIds([trainer.id]);
      setAddDate(date);
    },
    onRemove: async (entry: WeekEntry) => {
      const item = entry.item!;
      const message = item.recurrence === 'weekly' ? 'confirmRemoveWeekly' : 'confirmRemove';
      if (await confirm({ title: t(message, { title: item.title, name: trainer.name }), danger: true, confirmLabel: t('remove') })) {
        removeTrainerFromScheduleItem(item.id, trainer.id);
      }
    },
    // From the coach's calendar, a class is cancelled for the whole class (every child, and the coach)
    onCancelClass: async (entry: WeekEntry) => {
      if (!(await confirm({ title: t('confirmCancelWholeClass', { title: entry.title, date: dateLabel(entry.date) }), danger: true, confirmLabel: t('cancelThisDay') }))) return;
      const kids = students.filter((s) => s.groupIds.includes(entry.groupId!)).map((s) => s.id);
      addScheduleItem({
        studentIds: kids,
        trainerIds: kids.length ? undefined : [trainer.id],
        kind: 'cancellation',
        title: '',
        recurrence: 'once',
        date: entry.date,
        startTime: '',
        endTime: '',
        groupId: entry.groupId
      });
    },
    onRestoreClass: async (entry: WeekEntry) => {
      const cancels = scheduleItems.filter((it) => it.kind === 'cancellation' && it.groupId === entry.groupId && it.date === entry.date);
      for (const c of cancels) await deleteScheduleItem(c.id);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
        <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl w-full max-w-6xl p-4 sm:p-6 space-y-4 max-h-[94vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">{t('scheduleFor', { name: trainer.name })}</h3>
              <p className="text-[11px] font-medium text-slate-500">{t('coachHint')}</p>
            </div>
            <button onClick={onClose} aria-label={t('close')} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <WeekSchedule students={students} classIds={classIds} trainerId={trainer.id} editing={editing} />

          {addDate && (
            <ScheduleItemForm
              date={addDate}
              defaultKind="meeting"
              canSave={trainerIds.length > 0}
              onClose={() => setAddDate(null)}
              onSave={(fields) => addScheduleItem({ ...fields, studentIds: [], trainerIds })}
            >
              <PeoplePicker
                label={t('forCoaches')}
                searchPlaceholder={t('searchCoaches')}
                people={trainers.map((tr) => ({ id: tr.id, name: tr.name }))}
                selected={trainerIds}
                onChange={setTrainerIds}
              />
            </ScheduleItemForm>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
