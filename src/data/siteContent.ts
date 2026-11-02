/**
 * ============================================================================
 *  PUBLIC WEBSITE CONTENT — EDIT THIS FILE
 * ============================================================================
 * Contact details, map, FAQ, testimonials, coaches, achievements and the
 * club-specific parts of the privacy policy and terms.
 *
 * Rules:
 *  - An empty string '' or an empty list [] means "not filled in yet": the
 *    matching button, section or line is hidden on the site (nothing fake is shown).
 *  - Texts shown to visitors have an English, French and Arabic version.
 *  - Lines marked TODO still need real information.
 *
 * Wording of the existing landing sections, the counters and the countdown date
 * are edited by admins in Admin → Landing page, not here.
 * ============================================================================
 */

import { CLUB_PHOTOS } from './initialData';

export type Localized = { en: string; fr: string; ar: string };

const L = (en: string, fr: string, ar: string): Localized => ({ en, fr, ar });
const EMPTY: Localized = { en: '', fr: '', ar: '' };

export const SITE_CONTENT = {
  /** Public address of the website, without a trailing slash. Used for sharing previews and search engines. */
  siteUrl: 'https://www.discoveryclubjunior.com',

  /** Official name used in the legal pages */
  legalName: 'Discovery Club Junior',

  contact: {
    /** Phone as you want it displayed, e.g. '+216 22 123 456' */
    phone: '', // TODO
    /** WhatsApp number in international format, digits only, e.g. '21622123456' */
    whatsapp: '', // TODO
    email: '', // TODO, e.g. 'contact@your-domain.tn'
    facebook: 'https://www.facebook.com/DiscoveryClubJunior/',
    instagram: '' // optional, full URL
  },

  address: {
    /** Street address, shown in the footer, the contact section and the legal pages */
    street: EMPTY, // TODO: L('12 Rue …, Manouba 2010', '12 Rue …, Manouba 2010', '…')
    city: L('Manouba, Tunisia', 'Manouba, Tunisie', 'منوبة، تونس'),
    /** Map position (right-click the place in Google Maps to copy the numbers). Leave 0 to hide the map. */
    lat: 0, // TODO
    lng: 0 // TODO
  },

  /** Opening hours line. Empty hides it. */
  openingHours: L(
    'Wed: 2pm – 6pm · Sat/Sun: 9am – 5pm', // TODO: check
    'Mer : 14h – 18h · Sam/Dim : 9h – 17h',
    'الأربعاء: 14:00 – 18:00 · السبت/الأحد: 9:00 – 17:00'
  ),

  /** Frequently asked questions. Empty list hides the section. */
  faq: [
    // TODO: replace the examples with your real answers, then remove `draft: true`
    {
      draft: true,
      q: L('From what age can my child join?', 'À partir de quel âge mon enfant peut-il s’inscrire ?', 'من أي عمر يمكن لطفلي الالتحاق؟'),
      a: L('…', '…', '…')
    },
    {
      draft: true,
      q: L('Does my child need a computer or a kit?', 'Mon enfant a-t-il besoin d’un ordinateur ou d’un kit ?', 'هل يحتاج طفلي إلى حاسوب أو عُدّة؟'),
      a: L('…', '…', '…')
    },
    {
      draft: true,
      q: L('Can we try a class before registering?', 'Peut-on essayer une séance avant de s’inscrire ?', 'هل يمكن تجربة حصة قبل التسجيل؟'),
      a: L('…', '…', '…')
    },
    {
      draft: true,
      q: L('How do I pay the monthly fee?', 'Comment payer les frais mensuels ?', 'كيف أدفع المعلوم الشهري؟'),
      a: L('…', '…', '…')
    }
  ] as { q: Localized; a: Localized; draft?: boolean }[],

  /** Parent testimonials (with their permission). Empty list hides the section. */
  testimonials: [
    // { quote: L('…', '…', '…'), author: 'Sana B.', role: L('Mother of Adam, 11', 'Maman d’Adam, 11 ans', 'أم آدم، 11 سنة') }
  ] as { quote: Localized; author: string; role: Localized }[],

  /**
   * Coaches shown on the home page. Empty list = the trainers added in Admin → Team are shown
   * (name, specialty and photo only).
   */
  coaches: [
    // { name: 'Karim', role: L('Robotics coach', 'Coach robotique', 'مدرب روبوتيك'), photo: '/photos/coach_karim.jpg' }
  ] as { name: string; role: Localized; photo?: string }[],

  /** Hall of fame, newest first. Leave `year` empty to hide the badge. */
  achievements: [
    {
      year: '2026',
      photo: CLUB_PHOTOS.eurobotSpainChampions,
      title: L('Eurobot Junior Spain — 1st place', 'Eurobot Junior Espagne — 1re place', 'يوروبوت جونيور إسبانيا — المركز الأول'),
      text: L(
        'Our team “Discovery 2” won the international Eurobot Junior final in Alcalá de Henares.',
        'Notre équipe « Discovery 2 » a remporté la finale internationale Eurobot Junior à Alcalá de Henares.',
        'فاز فريقنا «Discovery 2» بالنهائي الدولي ليوروبوت جونيور في ألكالا دي إيناريس.'
      )
    },
    {
      year: '', // TODO
      photo: CLUB_PHOTOS.ministryHonorCeremony,
      title: L('Honoured by the Ministry', 'Honorés par le Ministère', 'تكريم من الوزارة'),
      text: L(
        'An official reception to celebrate our young champions.',
        'Une réception officielle pour féliciter nos jeunes champions.',
        'استقبال رسمي للاحتفاء بأبطالنا الصغار.'
      )
    },
    {
      year: '', // TODO
      photo: CLUB_PHOTOS.eurobotJuniorTunisiaQualif,
      title: L('Eurobot Junior Tunisia qualifiers', 'Qualifications Eurobot Junior Tunisie', 'تصفيات يوروبوت جونيور تونس'),
      text: L(
        'Qualified at the national round organised by ATR at INSAT.',
        'Qualifiés lors de la sélection nationale organisée par l’ATR à l’INSAT.',
        'التأهل في التصفيات الوطنية التي نظمتها ATR بالمعهد الوطني للعلوم التطبيقية والتكنولوجيا.'
      )
    },
    {
      year: '', // TODO
      photo: CLUB_PHOTOS.robocupViennaMarxHalle,
      title: L('RoboCup in Vienna', 'RoboCup à Vienne', 'روبوكاب في فيينا'),
      text: L(
        'Competing with teams from around the world at the Marx Halle.',
        'Face aux équipes du monde entier, à la Marx Halle.',
        'منافسة فرق من مختلف أنحاء العالم في قاعة ماركس.'
      )
    },
    {
      year: '', // TODO
      photo: CLUB_PHOTOS.robocupJuniorEgypt,
      title: L('RoboCup Junior Egypt', 'RoboCup Junior Égypte', 'روبوكاب جونيور مصر'),
      text: L(
        'Our team represented Tunisia at RoboCup Junior in Egypt.',
        'Notre équipe a représenté la Tunisie à la RoboCup Junior en Égypte.',
        'مثّل فريقنا تونس في روبوكاب جونيور بمصر.'
      )
    },
    {
      year: '', // TODO
      photo: CLUB_PHOTOS.odaRobots2ndPrize,
      title: L('ODA Robots — 2nd prize', 'ODA Robots — 2e prix', 'ODA Robots — الجائزة الثانية'),
      text: L('A podium finish for our young builders.', 'Un podium pour nos jeunes constructeurs.', 'منصة تتويج لبنّائينا الصغار.')
    }
  ] as { year: string; photo?: string; title: Localized; text: Localized }[],

  /** Club-specific details used in the privacy policy and terms */
  legal: {
    /** Date of the last change to the policies, YYYY-MM-DD */
    lastUpdated: '2026-11-02',
    /** Person or body responsible for the data (association, company…) */
    controller: '', // TODO: e.g. 'Association Discovery Club Junior, represented by …'
    /** Registration number (RNE / association register), if any */
    registration: '', // TODO
    /** Email for privacy requests. Falls back to contact.email. */
    privacyEmail: '', // TODO
    /** How long data is kept after a child leaves the club */
    retention: L('2 years', '2 ans', 'سنتان'), // TODO: check
    /** City whose courts are competent */
    courts: L('Manouba', 'Manouba', 'منوبة')
  }
};

/** WhatsApp link, optionally with a prefilled message */
export const whatsappLink = (text?: string) =>
  SITE_CONTENT.contact.whatsapp ? `https://wa.me/${SITE_CONTENT.contact.whatsapp.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '';

export const hasMap = () => !!(SITE_CONTENT.address.lat && SITE_CONTENT.address.lng);

export const mapsLink = () =>
  hasMap()
    ? `https://www.google.com/maps/search/?api=1&query=${SITE_CONTENT.address.lat},${SITE_CONTENT.address.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE_CONTENT.address.street.en || 'Discovery Club Junior Manouba')}`;

/** FAQ entries that are filled in (drafts are hidden) */
export const publishedFaq = () => SITE_CONTENT.faq.filter((f) => !f.draft && f.q.en && f.a.en);
