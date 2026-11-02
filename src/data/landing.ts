/**
 * What the admin can change on the public landing page (Admin → Landing page).
 * Texts are overrides of the visitor messages: an empty field keeps the default wording.
 * Shared by the server (validation) and the app.
 */

/** Sections that can be hidden (the hero always shows) */
export const LANDING_SECTIONS = ['belt', 'how', 'lab', 'countdown', 'fame', 'programs', 'coaches', 'testimonials', 'shop', 'faq', 'contact', 'cta'] as const;
export type LandingSection = (typeof LANDING_SECTIONS)[number];

export const LANDING_LANGS = ['fr', 'en', 'ar'] as const;
export type LandingLang = (typeof LANDING_LANGS)[number];

/** Editable texts, grouped by section, in page order */
export const LANDING_TEXT_GROUPS: { id: 'hero' | 'stats' | LandingSection; keys: readonly string[] }[] = [
  {
    id: 'hero',
    keys: ['heroBadgeEurobot', 'heroFans', 'heroLine1', 'heroBeforeWord', 'heroWords', 'heroAfterWord', 'heroLine3', 'heroIntro', 'heroLocation', 'heroHardware', 'heroPodiums', 'chipTrophy', 'chipWorld', 'chipAges']
  },
  { id: 'stats', keys: ['statBuilders', 'statWorkshops', 'statRobots', 'statTrophies'] },
  { id: 'belt', keys: ['beltEyebrow', 'beltTitle'] },
  {
    id: 'how',
    keys: ['howEyebrow', 'howTitle', 'howText', 'stepBuildTitle', 'stepBuildText', 'stepWireTitle', 'stepWireText', 'stepCodeTitle', 'stepCodeText', 'stepCompeteTitle', 'stepCompeteText']
  },
  { id: 'lab', keys: ['labEyebrow', 'labTitleBefore', 'labTitleHighlight', 'labText', 'handsOnTitle', 'handsOnText', 'parentsLoopTitle', 'parentsLoopText'] },
  { id: 'countdown', keys: ['nextEyebrow', 'nextTitle', 'nextText'] },
  { id: 'fame', keys: ['fameEyebrow', 'fameTitle', 'fameText', 'fameFirstPlace'] },
  { id: 'programs', keys: ['programsTitle', 'programsText'] },
  { id: 'coaches', keys: ['coachesEyebrow', 'coachesTitle', 'coachesText'] },
  { id: 'testimonials', keys: ['testimonialsEyebrow', 'testimonialsTitle'] },
  { id: 'shop', keys: ['shopBadge', 'shopTitle'] },
  { id: 'faq', keys: ['faqEyebrow', 'faqTitle'] },
  { id: 'contact', keys: ['contactEyebrow', 'contactTitle', 'contactText'] },
  { id: 'cta', keys: ['ctaTitle', 'ctaText'] }
];

export const LANDING_TEXT_KEYS: ReadonlySet<string> = new Set(LANDING_TEXT_GROUPS.flatMap((g) => g.keys));

/** Shown as a multi-line field */
export const LANDING_LONG_KEYS: ReadonlySet<string> = new Set(['heroIntro', 'howText', 'labText', 'nextText', 'fameText', 'programsText', 'ctaText', 'stepBuildText', 'stepWireText', 'stepCodeText', 'stepCompeteText', 'coachesText', 'contactText']);

export const LANDING_STAT_KEYS = ['builders', 'workshops', 'robots', 'trophies'] as const;
export type LandingStat = (typeof LANDING_STAT_KEYS)[number];

export interface LandingContent {
  /** Sections not shown on the page */
  hidden?: LandingSection[];
  /** Numbers of the hero counters (missing = the built-in figures) */
  stats?: Partial<Record<LandingStat, number>>;
  /** Day of the next challenge (YYYY-MM-DD); the countdown hides without a future date */
  countdownDate?: string;
  /** Text overrides per language */
  text?: Partial<Record<LandingLang, Record<string, string>>>;
  updatedAt?: string;
  updatedBy?: string;
}
