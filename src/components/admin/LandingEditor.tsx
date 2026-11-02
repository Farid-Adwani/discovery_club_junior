import React, { useEffect, useState } from 'react';
import { CalendarClock, Eye, EyeOff, ExternalLink, Globe, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage, useT } from '../../i18n';
import { landingMessages } from '../../i18n/messages/landing';
import { visitorMessages } from '../../i18n/messages/visitor';
import { CLUB_STATS } from '../../data/initialData';
import {
  LANDING_LANGS,
  LANDING_LONG_KEYS,
  LANDING_SECTIONS,
  LANDING_STAT_KEYS,
  LANDING_TEXT_GROUPS,
  type LandingContent,
  type LandingLang,
  type LandingSection,
  type LandingStat
} from '../../data/landing';

const LANG_NAMES: Record<LandingLang, string> = { fr: 'Français', en: 'English', ar: 'العربية' };
const DEFAULT_STATS: Record<LandingStat, number> = {
  builders: CLUB_STATS.activeStudents,
  workshops: CLUB_STATS.workshopsCompleted,
  robots: CLUB_STATS.projectsBuilt,
  trophies: CLUB_STATS.competitionsWon
};
// Counter labels, in the order of LANDING_STAT_KEYS
const STAT_LABEL_KEYS = ['statBuilders', 'statWorkshops', 'statRobots', 'statTrophies'];

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-[#c11e3d] focus:bg-white';

const isSection = (id: string): id is LandingSection => (LANDING_SECTIONS as readonly string[]).includes(id);

/** Admin → Landing page: texts per language, sections shown or hidden, counters and the next challenge date */
export const LandingEditor: React.FC = () => {
  const { landing, saveLanding, navigateTo } = useApp();
  const t = useT(landingMessages);
  const { lang: uiLang, locale } = useLanguage();
  const [lang, setLang] = useState<LandingLang>(uiLang);
  const [draft, setDraft] = useState<LandingContent>(landing);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(landing));
  // Take in what the server has, unless the admin is in the middle of changes
  useEffect(() => {
    if (!dirty) setDraft(landing);
  }, [landing]);

  const texts = draft.text?.[lang] || {};
  const setText = (key: string, value: string) =>
    setDraft((d) => ({ ...d, text: { ...d.text, [lang]: { ...d.text?.[lang], [key]: value } } }));
  const isHidden = (s: LandingSection) => !!draft.hidden?.includes(s);
  const toggleSection = (s: LandingSection) =>
    setDraft((d) => ({ ...d, hidden: isHidden(s) ? (d.hidden || []).filter((x) => x !== s) : [...(d.hidden || []), s] }));
  const changedIn = (l: LandingLang) => Object.values(draft.text?.[l] || {}).filter((v) => v.trim()).length;

  const save = async () => {
    setSaving(true);
    await saveLanding(normalize(draft));
    setSaving(false);
  };

  const countdownFuture = !!draft.countdownDate && new Date(`${draft.countdownDate}T09:00`).getTime() > Date.now();

  const field = (key: string) => {
    const value = texts[key] || '';
    const fallback = visitorMessages[lang][key as keyof (typeof visitorMessages)['fr']] || '';
    const changed = !!value.trim();
    const common = {
      value,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      placeholder: fallback,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(key, e.target.value)
    } as const;
    return (
      <label key={key} className={`block space-y-1 ${LANDING_LONG_KEYS.has(key) ? 'sm:col-span-2' : ''}`}>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
          {t(`f_${key}` as keyof (typeof landingMessages)['en'])}
          {changed && <span className="px-1.5 py-0.5 rounded-md bg-[#fdf2f4] text-[#c11e3d] text-[9px] font-black uppercase">{t('changed')}</span>}
          {changed && (
            <button type="button" onClick={() => setText(key, '')} title={t('reset')} aria-label={t('reset')} className="ms-auto text-slate-400 hover:text-[#c11e3d] cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
        {LANDING_LONG_KEYS.has(key) ? <textarea rows={3} maxLength={1000} {...common} className={inputCls} /> : <input maxLength={1000} {...common} className={inputCls} />}
        {key === 'heroWords' && <span className="block text-[11px] font-medium text-slate-400">{t('wordsHint')}</span>}
      </label>
    );
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <section className="duo-card hover:transform-none! bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#c11e3d]" /> {t('title')}
          </h3>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">{t('subtitle')}</p>
          {landing.updatedAt && (
            <p className="text-[11px] font-semibold text-slate-400">
              {t('lastSaved', {
                when: new Date(landing.updatedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
                name: landing.updatedBy || '—'
              })}
            </p>
          )}
        </div>
        <button type="button" onClick={() => navigateTo('home')} className="self-start px-4 py-2.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer">
          <ExternalLink className="w-4 h-4 rtl:-scale-x-100" /> {t('viewPage')}
        </button>
      </section>

      {/* Language being edited */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-black text-slate-500">{t('editingLang')}</span>
        <div className="inline-flex p-1 rounded-2xl bg-slate-100">
          {LANDING_LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black cursor-pointer transition-colors ${lang === l ? 'bg-white text-[#c11e3d] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {LANG_NAMES[l]}
              {changedIn(l) > 0 && <span className="px-1.5 rounded-full bg-[#fdf2f4] text-[#c11e3d] text-[10px]">{t('changedCount', { n: changedIn(l) })}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5 items-start">
        {/* Section list */}
        <nav className="hidden lg:block duo-card hover:transform-none! bg-white p-3 sticky top-32">
          <div className="px-2 pb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{t('sections')}</div>
          <ul className="space-y-0.5">
            {LANDING_TEXT_GROUPS.map((g) => (
              <li key={g.id}>
                <a href={`#landing-${g.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`landing-${g.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <span className="flex-1 truncate">{t(`g_${g.id}`)}</span>
                  {isSection(g.id) && (isHidden(g.id) || (g.id === 'countdown' && !countdownFuture)) && <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4">
          {LANDING_TEXT_GROUPS.map((g) => {
            const hideable = isSection(g.id);
            const off = hideable && isHidden(g.id as LandingSection);
            return (
              <section key={g.id} id={`landing-${g.id}`} className={`duo-card hover:transform-none! bg-white p-5 space-y-4 scroll-mt-32 ${off ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-black text-slate-900">{t(`g_${g.id}`)}</h4>
                    <p className="text-xs font-medium text-slate-500">{t(`gd_${g.id}`)}</p>
                  </div>
                  {hideable && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!off}
                      onClick={() => toggleSection(g.id as LandingSection)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black cursor-pointer border-2 transition-colors ${off ? 'border-slate-200 text-slate-500' : 'border-[#15803d] bg-[#dcf5e4] text-[#14532d]'}`}
                    >
                      {off ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {off ? t('hiddenLabel') : t('visible')}
                    </button>
                  )}
                </div>

                {!off && (
                  <>
                    {g.id === 'stats' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {LANDING_STAT_KEYS.map((k, i) => (
                            <label key={k} className="block space-y-1">
                              <span className="text-xs font-bold text-slate-600">
                                {t('statValue')} {i + 1}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={draft.stats?.[k] ?? ''}
                                placeholder={String(DEFAULT_STATS[k])}
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, stats: { ...d.stats, [k]: e.target.value === '' ? undefined : Math.max(0, Math.floor(Number(e.target.value))) } }))
                                }
                                className={`${inputCls} font-mono text-lg! text-center`}
                              />
                              <span className="block text-[11px] font-semibold text-slate-400 truncate text-center">
                                {texts[STAT_LABEL_KEYS[i]] || visitorMessages[lang][STAT_LABEL_KEYS[i] as keyof (typeof visitorMessages)['fr']]}
                              </span>
                            </label>
                          ))}
                        </div>
                        <p className="text-[11px] font-medium text-slate-400">{t('statsHint')}</p>
                      </div>
                    )}

                    {g.id === 'countdown' && (
                      <div className="flex flex-wrap items-end gap-3 p-3 rounded-2xl bg-slate-50">
                        <label className="block space-y-1">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <CalendarClock className="w-3.5 h-3.5" /> {t('countdownDate')}
                          </span>
                          <input type="date" value={draft.countdownDate || ''} onChange={(e) => setDraft((d) => ({ ...d, countdownDate: e.target.value || undefined }))} className={`${inputCls} w-48`} />
                        </label>
                        <p className={`flex-1 min-w-48 text-[11px] font-semibold ${countdownFuture ? 'text-slate-500' : 'text-amber-700'}`}>
                          {countdownFuture ? t('countdownHint') : t('countdownOff')}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{g.keys.map(field)}</div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="fixed bottom-4 inset-x-4 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 ps-5 pe-2 py-2 rounded-2xl bg-[#191919] text-white shadow-2xl">
            <span className="text-sm font-black">{t('unsaved')}</span>
            <button type="button" onClick={() => setDraft(landing)} className="px-3 py-2 rounded-xl text-xs font-black text-white/70 hover:text-white cursor-pointer">
              {t('discard')}
            </button>
            <button type="button" onClick={save} disabled={saving} className="px-4 py-2 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <Save className="w-4 h-4" /> {t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Drops empty texts and counters so "typed then erased" doesn't count as a change */
function normalize(c: LandingContent): LandingContent {
  const text: NonNullable<LandingContent['text']> = {};
  for (const l of LANDING_LANGS) {
    const kept = Object.fromEntries(Object.entries(c.text?.[l] || {}).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
    if (Object.keys(kept).length) text[l] = kept;
  }
  const stats = Object.fromEntries(Object.entries(c.stats || {}).filter(([, v]) => v !== undefined && v !== null)) as LandingContent['stats'];
  return {
    hidden: LANDING_SECTIONS.filter((s) => c.hidden?.includes(s)),
    stats,
    ...(c.countdownDate ? { countdownDate: c.countdownDate } : {}),
    text
  };
}
