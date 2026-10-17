import React from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES, useLanguage } from '../../i18n';

/** EN / FR / ع toggle. Arabic switches the whole page to right-to-left. */
export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex items-center gap-0.5 h-10 px-1 rounded-xl bg-slate-100" role="group" aria-label="Language">
      <Languages className="w-3.5 h-3.5 text-slate-400 mx-1 hidden sm:block" />
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.label}
          aria-pressed={lang === l.code}
          className={`min-w-[30px] h-8 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
            lang === l.code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
};
