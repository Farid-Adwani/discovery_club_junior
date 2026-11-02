import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ltr, useLanguage, useT } from '../i18n';
import { siteMessages } from '../i18n/messages/site';
import { PRIVACY, TERMS } from '../i18n/messages/legal';
import { SITE_CONTENT } from '../data/siteContent';

/** Privacy policy or terms of use, with the club's details from siteContent filled in. */
export const LegalPage: React.FC<{ kind: 'privacy' | 'terms' }> = ({ kind }) => {
  const { navigateTo } = useApp();
  const { lang, locale } = useLanguage();
  const t = useT(siteMessages);
  const doc = (kind === 'privacy' ? PRIVACY : TERMS)[lang];
  const { contact, address, legal, legalName } = SITE_CONTENT;

  useEffect(() => window.scrollTo({ top: 0 }), [kind]);

  const fullAddress = [address.street[lang], address.city[lang]].filter(Boolean).join(', ');
  const values: Record<string, string> = {
    club: legalName,
    controller: legal.controller,
    registration: legal.registration,
    address: address.street[lang] ? fullAddress : '',
    email: legal.privacyEmail || contact.email,
    phone: contact.phone ? ltr(contact.phone) : '',
    retention: legal.retention[lang],
    courts: legal.courts[lang]
  };

  // Splits "{name}" placeholders; a missing value is shown as a highlighted "to be completed"
  const fill = (text: string) =>
    text.split(/(\{\w+\})/g).map((part, i) => {
      const m = part.match(/^\{(\w+)\}$/);
      if (!m) return part;
      const v = values[m[1]];
      return v ? (
        <React.Fragment key={i}>{v}</React.Fragment>
      ) : (
        <mark key={i} className="rounded bg-amber-100 px-1 text-amber-900">
          [{t('toBeCompleted')}]
        </mark>
      );
    });

  const updated = new Date(`${legal.lastUpdated}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <button
        onClick={() => navigateTo('home')}
        className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-sky-700 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('backHome')}
      </button>

      <header className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{doc.title}</h1>
        <p className="text-xs font-bold text-slate-500">{t('lastUpdated', { date: updated })}</p>
        <p className="text-sm text-slate-700 leading-relaxed">{fill(doc.intro)}</p>
      </header>

      {doc.sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="text-lg font-black text-slate-900">{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">
              {fill(p)}
            </p>
          ))}
        </section>
      ))}

      <nav className="pt-6 border-t border-slate-200 flex gap-4 text-sm font-bold">
        <button onClick={() => navigateTo(kind === 'privacy' ? 'terms' : 'privacy')} className="text-sky-700 hover:underline cursor-pointer">
          {kind === 'privacy' ? t('terms') : t('privacyPolicy')}
        </button>
      </nav>
    </article>
  );
};

export default LegalPage;
