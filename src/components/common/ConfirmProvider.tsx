import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useT } from '../../i18n';
import { commonMessages } from '../../i18n/messages/common';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Red button and warning icon (for deletions) */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** `const confirm = useConfirm(); if (await confirm({ title, danger: true })) …` (a styled window instead of window.confirm) */
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT(commonMessages);
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirmButton = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    []
  );

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  // Escape cancels; focus goes to the confirm button
  useEffect(() => {
    if (!request) return;
    confirmButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {request && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ y: 24, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.97 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onClick={(e) => e.stopPropagation()}
              className="duo-card bg-white w-full max-w-sm p-6 space-y-4 text-center"
            >
              <div
                className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${
                  request.danger ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'
                }`}
              >
                {request.danger ? <AlertTriangle className="w-7 h-7" /> : <HelpCircle className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <h3 id="confirm-title" className="text-base font-black text-slate-900">
                  {request.title}
                </h3>
                {request.message && <p className="text-xs font-medium text-slate-500 leading-relaxed">{request.message}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => close(false)} className="flex-1 py-2.5 btn-duo-secondary text-xs font-bold cursor-pointer">
                  {t('confirmCancel')}
                </button>
                <button
                  ref={confirmButton}
                  onClick={() => close(true)}
                  className={`flex-1 py-2.5 text-xs font-black cursor-pointer ${request.danger ? 'btn-duo-red' : 'btn-duo-green'}`}
                >
                  {request.confirmLabel || t('confirmOk')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
