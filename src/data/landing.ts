/**
 * What the admin can change on the public landing page (Admin → Landing page).
 * Texts are overrides of the visitor messages: an empty field keeps the default wording.
 * Shared by the server (validation) and the app.
 */

/** Sections that can be hidden (the hero always shows) */
export const LANDING_SECTIONS = ['how', 'programs', 'coaches', 'game', 'countdown', 'timeline', 'museum', 'testimonials', 'faq', 'contact', 'cta'] as const;
export type LandingSection = (typeof LANDING_SECTIONS)[number];

export const LANDING_LANGS = ['fr', 'en', 'ar'] as const;
export type LandingLang = (typeof LANDING_LANGS)[number];

/** Editor sections: the hero, the counters, every landing section, and two that are not on the page itself */
export type LandingGroupId = 'hero' | 'stats' | 'seo' | 'legal' | LandingSection;

/** Editable texts, grouped by section, in page order (every text of the public page is here) */
export const LANDING_TEXT_GROUPS: { id: LandingGroupId; keys: readonly string[] }[] = [
  {
    id: 'hero',
    keys: ['heroBadgeEurobot', 'heroFans', 'heroLine1', 'heroBeforeWord', 'heroWords', 'heroAfterWord', 'heroLine3', 'heroIntro', 'heroLocation', 'chipAges', 'heroPodiums', 'heroHandNote', 'heroRingText', 'heroPolaroid', 'heroCountries', 'ribbonWords', 'registerChild', 'explorePrograms', 'tryFree']
  },
  { id: 'stats', keys: ['statBuilders', 'statWorkshops', 'statRobots', 'statTrophies'] },
  {
    id: 'how',
    keys: ['howEyebrow', 'howTitle', 'howText', 'stepBuildTitle', 'stepBuildText', 'stepWireTitle', 'stepWireText', 'stepCodeTitle', 'stepCodeText', 'stepCompeteTitle', 'stepCompeteText']
  },
  {
    id: 'programs',
    keys: ['programsEyebrow', 'programsTitle', 'programsText', 'allDays', 'noClasses', 'perMonth', 'kitIncluded', 'ageRange', 'agePlus', 'levelBeginner', 'levelIntermediate', 'levelAdvanced']
  },
  { id: 'coaches', keys: ['coachesEyebrow', 'coachesTitle', 'coachesText'] },
  { id: 'game', keys: ['gameEyebrow', 'gameTitle', 'gameText'] },
  { id: 'countdown', keys: ['nextEyebrow', 'nextTitle', 'nextText', 'days', 'hours', 'mins', 'secs'] },
  {
    id: 'timeline',
    keys: [
      'timelineEyebrow', 'timelineTitle', 'timelineText', 'timelineViews', 'timelineViewAlbums', 'timelineView3d', 'timelineView3dHint',
      'timelineYears', 'timelineAlbums', 'timelinePhotos', 'timelineYearCount', 'kindCompetition', 'kindWorkshop', 'kindCeremony', 'kindTeam',
      'timelineChooseYear', 'timelinePrevYear', 'timelineNextYear', 'timelineOpenAlbum', 'viewerPrev', 'viewerNext', 'viewerCount', 'close'
    ]
  },
  // the 3D museum button of the timeline: no texts of its own, only its switch
  { id: 'museum', keys: [] },
  { id: 'testimonials', keys: ['testimonialsEyebrow', 'testimonialsTitle'] },
  { id: 'faq', keys: ['faqEyebrow', 'faqTitle'] },
  {
    id: 'contact',
    keys: [
      'contactEyebrow', 'contactTitle', 'contactText', 'trialParent', 'trialPhone', 'trialChild', 'trialAge', 'trialClass', 'trialAnyClass',
      'trialSend', 'trialSendEmail', 'trialMessage', 'trialSubject', 'whatsappUs', 'callUs', 'emailUs', 'openInMaps', 'mapTitle', 'whatsappHello', 'whatsappFloat'
    ]
  },
  { id: 'cta', keys: ['ctaTitle', 'ctaText'] },
  // Not sections of the page: the club's legal details, and the title and description shown by search engines
  { id: 'legal', keys: [] },
  { id: 'seo', keys: ['metaTitle', 'metaDescription'] }
];

export const LANDING_TEXT_KEYS: ReadonlySet<string> = new Set(LANDING_TEXT_GROUPS.flatMap((g) => g.keys));

/** Shown as a multi-line field */
export const LANDING_LONG_KEYS: ReadonlySet<string> = new Set(['heroIntro', 'howText', 'nextText', 'programsText', 'ctaText', 'stepBuildText', 'stepWireText', 'stepCodeText', 'stepCompeteText', 'coachesText', 'contactText', 'gameText', 'timelineText', 'timelineView3dHint', 'trialMessage', 'metaDescription']);

export const LANDING_STAT_KEYS = ['builders', 'workshops', 'robots', 'trophies'] as const;
export type LandingStat = (typeof LANDING_STAT_KEYS)[number];

/** A text in the three languages */
export type LText = { en: string; fr: string; ar: string };

/** One of the photos taking turns in the hero arch, with its two caption lines */
export interface LandingPhoto {
  img: string;
  tag: LText;
  title: LText;
}

/** Photos of the hero (missing = the built-in ones) */
export interface LandingMedia {
  heroPhotos?: LandingPhoto[];
  /** The tilted polaroid */
  polaroid?: string;
  /** The small picture of the highlight card */
  highlight?: string;
}

/**
 * The club's details shown on the site; a part that is missing keeps the defaults of src/data/siteContent.ts.
 * (Classes and coaches are not here: the page shows those of Admin → Classes and Admin → Team.)
 */
export interface SiteInfo {
  contact?: { phone: string; whatsapp: string; email: string; facebook: string; instagram: string };
  address?: { street: LText; city: LText; lat: number; lng: number };
  openingHours?: LText;
  faq?: { q: LText; a: LText }[];
  testimonials?: { quote: LText; author: string; role: LText }[];
  legal?: {
    legalName: string;
    controller: string;
    registration: string;
    privacyEmail: string;
    retention: LText;
    courts: LText;
    lastUpdated: string;
  };
}

/** Limits, shared by the editor and the server */
export const LANDING_LIMITS = { heroPhotos: 12, faq: 30, testimonials: 30 } as const;

export interface LandingContent {
  /** Sections not shown on the page */
  hidden?: LandingSection[];
  /** Numbers of the hero counters (missing = the built-in figures) */
  stats?: Partial<Record<LandingStat, number>>;
  /** Day of the next challenge (YYYY-MM-DD); the countdown hides without a future date */
  countdownDate?: string;
  /** Text overrides per language */
  text?: Partial<Record<LandingLang, Record<string, string>>>;
  media?: LandingMedia;
  site?: SiteInfo;
  updatedAt?: string;
  updatedBy?: string;
}
