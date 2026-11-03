import React from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useT } from '../../i18n';
import { commonMessages } from '../../i18n/messages/common';

/** Shown on every page while an admin is inside a parent's account ("View as this parent") */
export const ViewAsBanner: React.FC = () => {
  const { currentUser, stopViewingAs } = useApp();
  const t = useT(commonMessages);
  if (!currentUser?.viewedBy) return null;
  return (
    <div className="sticky top-16 z-30 bg-amber-400 text-amber-950 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <p className="flex items-center gap-2 text-xs sm:text-sm font-bold">
          <Eye className="w-4 h-4 shrink-0" />
          <span>{t('viewAsBanner', { name: currentUser.displayName })}</span>
        </p>
        <button type="button" onClick={stopViewingAs} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#191919] text-white text-xs font-black hover:bg-black cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t('viewAsBack')}
        </button>
      </div>
    </div>
  );
};
