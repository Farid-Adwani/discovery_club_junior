import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border-2 border-b-4 shadow-xl text-xs font-bold transition-all transform animate-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-300 border-b-rose-400 text-rose-900'
              : toast.type === 'info'
              ? 'bg-sky-50 border-sky-300 border-b-sky-400 text-sky-900'
              : 'bg-emerald-50 border-emerald-300 border-b-emerald-400 text-emerald-900'
          }`}
        >
          {toast.type === 'error' ? (
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
          ) : toast.type === 'info' ? (
            <span className="text-base shrink-0 mt-0.5">💡</span>
          ) : (
            <span className="text-base shrink-0 mt-0.5">🎉</span>
          )}
          <span className="flex-1 leading-relaxed">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
