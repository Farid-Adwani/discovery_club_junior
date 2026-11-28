import React, { useState } from 'react';
import { CheckCircle2, DatabaseBackup, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../context/AppContext';
import { useLanguage, useT } from '../../i18n';
import { hubMessages } from '../../i18n/messages/hub';
import { useConfirm } from '../common/ConfirmProvider';

/** "Back up now": the nightly Google Drive backup (database + photos), on demand, after a confirmation. */
export const BackupCard: React.FC = () => {
  const { showToast } = useApp();
  const confirm = useConfirm();
  const t = useT(hubMessages);
  const { locale } = useLanguage();
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<{ time: string; size: string } | null>(null);

  const backUp = async () => {
    const ok = await confirm({ title: t('backupConfirmTitle'), message: t('backupConfirmText'), confirmLabel: t('backupConfirmOk') });
    if (!ok) return;
    setRunning(true);
    try {
      const { size } = await api<{ file: string; size: string }>('/admin/backup', { method: 'POST', timeoutMs: 70_000 });
      setLast({ time: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }), size });
      showToast(t('backupDone', { size }), 'success');
    } catch (err) {
      showToast(t('backupFailed', { reason: err instanceof Error ? err.message : String(err) }), 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-700 text-white flex items-center justify-center shadow-md">
        <DatabaseBackup className="w-6 h-6" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <h3 className="text-sm font-black text-slate-900">{t('backupTitle')}</h3>
        <p className="text-xs font-medium text-slate-500">{t('backupText')}</p>
        {last && (
          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('backupDoneAt', last)}
          </p>
        )}
      </div>
      <button
        onClick={backUp}
        disabled={running}
        className="self-start sm:self-center px-4 py-2.5 btn-duo-green text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-60"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />}
        {running ? t('backupRunning') : t('backupNow')}
      </button>
    </section>
  );
};
