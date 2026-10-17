import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'fr' | 'ar';

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'ar', label: 'العربية', short: 'ع' }
];

/** BCP 47 tag for dates and numbers (toLocaleDateString etc.) */
export const LOCALE_TAG: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-TN' };

const STORAGE_KEY = 'dcj-lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'fr' || saved === 'ar') return saved;
  } catch {
    // storage blocked: fall through to the browser language
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 2);
  return nav === 'fr' || nav === 'ar' ? nav : 'en';
}

// Kept outside React so non-component code (toasts in AppContext) can translate too
let currentLang: Lang = initialLang();

/**
 * One message file per area of the site. English is the reference; French and Arabic
 * must define every key (TypeScript reports a missing translation).
 */
export function defineMessages<T extends Record<string, string>>(m: {
  en: T;
  fr: Record<keyof T, string>;
  ar: Record<keyof T, string>;
}) {
  return m;
}

type MessageSet = { en: Record<string, string>; fr: Record<string, string>; ar: Record<string, string> };
type Vars = Record<string, string | number>;

function format(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/**
 * Keeps a phone number or email left-to-right when it is placed inside a sentence
 * (Unicode isolate marks, so "+216 55 987 654" is not reversed in Arabic).
 */
export const ltr = (s: string) => `\u2066${s}\u2069`;

/** Translate outside React components (uses the current language). */
export function translate<M extends MessageSet>(messages: M, key: keyof M['en'] & string, vars?: Vars): string {
  return format(messages[currentLang][key] ?? messages.en[key] ?? key, vars);
}

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dir: 'ltr' | 'rtl';
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(currentLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // not persisted, still works for this visit
    }
  }, [lang, dir]);

  const setLang = (next: Lang) => {
    currentLang = next;
    setLangState(next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, locale: LOCALE_TAG[lang] }}>{children}</LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};

/** `const t = useT(messages)` then `t('key')` or `t('key', { name: 'Adam' })` for "{name}" placeholders. */
export function useT<M extends MessageSet>(messages: M) {
  const { lang } = useLanguage();
  return (key: keyof M['en'] & string, vars?: Vars): string =>
    format(messages[lang][key] ?? messages.en[key] ?? key, vars);
}
