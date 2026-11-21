// Real addresses of the public pages (shared by the website and the server, no React here).
// Each one is a page of its own for search engines: Google can list them under the site's result.
// The private spaces (admin, coach, parents) stay on "/#/admin…" addresses.
import type { AppPage } from '../types';

/** Public address of the site, without a trailing slash. Keep in sync with siteUrl in src/data/siteContent.ts. */
export const SITE_URL = 'https://www.discoveryclubjunior.com';

export const PAGE_PATHS = {
  home: '/',
  courses: '/cours',
  events: '/evenements',
  museum: '/musee',
  contact: '/contact',
  login: '/connexion',
  'register-parent': '/inscription',
  privacy: '/confidentialite',
  terms: '/conditions'
} as const satisfies Partial<Record<AppPage, string>>;

export type PublicPage = keyof typeof PAGE_PATHS;

export const isPublicPage = (page: string): page is PublicPage => Object.prototype.hasOwnProperty.call(PAGE_PATHS, page);

/** "/cours" or "/cours/" -> "courses"; an unknown address gives null */
export function pageForPath(pathname: string): PublicPage | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const hit = (Object.keys(PAGE_PATHS) as PublicPage[]).find((p) => PAGE_PATHS[p] === path);
  return hit ?? null;
}

type Meta = { title: string; description: string };
type PageMeta = { en: Meta; fr: Meta; ar: Meta };

/**
 * Title and description of each page (the home page uses the ones written in Admin → Landing page).
 * The server puts the French ones in the page itself, for search engines and link previews.
 */
export const PAGE_META: Record<Exclude<PublicPage, 'home'>, PageMeta> = {
  courses: {
    fr: {
      title: 'Cours de robotique, d’électronique et de code pour enfants | Discovery Club Junior',
      description: 'Nos cours hebdomadaires pour les 6–17 ans à Manouba : robotique, électronique et programmation sur du vrai matériel. Jours, horaires, âges et niveaux de chaque groupe.'
    },
    en: {
      title: 'Robotics, electronics and coding classes for kids | Discovery Club Junior',
      description: 'Weekly classes for ages 6–17 in Manouba, Tunisia: robotics, electronics and programming on real hardware. Days, times, ages and levels of every group.'
    },
    ar: {
      title: 'حصص الروبوتيك والإلكترونيك والبرمجة للأطفال | Discovery Club Junior',
      description: 'حصص أسبوعية للأطفال من 6 إلى 17 سنة في منوبة: روبوتيك وإلكترونيك وبرمجة على معدات حقيقية. أيام وتوقيت وأعمار ومستويات كل مجموعة.'
    }
  },
  events: {
    fr: {
      title: 'Événements, stages et compétitions | Discovery Club Junior',
      description: 'Les prochains événements du Discovery Club Junior à Manouba : ateliers, stages et compétitions de robotique pour enfants. Dates, lieux, prix et inscription.'
    },
    en: {
      title: 'Events, camps and competitions | Discovery Club Junior',
      description: 'Upcoming Discovery Club Junior events in Manouba: robotics workshops, camps and competitions for kids. Dates, places, prices and registration.'
    },
    ar: {
      title: 'الفعاليات والتربصات والمسابقات | Discovery Club Junior',
      description: 'الفعاليات القادمة لنادي ديسكفري جونيور في منوبة: ورشات وتربصات ومسابقات روبوتيك للأطفال. التواريخ والأماكن والأسعار والتسجيل.'
    }
  },
  museum: {
    fr: {
      title: 'Notre histoire : le musée du club en 3D | Discovery Club Junior',
      description: 'Visitez le musée du Discovery Club Junior : nos robots, nos trophées et nos compétitions depuis 2019, année par année.'
    },
    en: {
      title: 'Our story: the club’s 3D museum | Discovery Club Junior',
      description: 'Walk through the Discovery Club Junior museum: our robots, trophies and competitions since 2019, year by year.'
    },
    ar: {
      title: 'قصتنا: متحف النادي ثلاثي الأبعاد | Discovery Club Junior',
      description: 'تجوّل في متحف نادي ديسكفري جونيور: روبوتاتنا وكؤوسنا ومسابقاتنا منذ 2019، سنة بعد سنة.'
    }
  },
  contact: {
    fr: {
      title: 'Contact et séance d’essai gratuite | Discovery Club Junior',
      description: 'Contactez le Discovery Club Junior à Manouba et demandez une séance d’essai gratuite pour votre enfant. Horaires, adresse et questions fréquentes.'
    },
    en: {
      title: 'Contact us and book a free trial class | Discovery Club Junior',
      description: 'Get in touch with Discovery Club Junior in Manouba and book a free trial class for your child. Opening hours, address and frequently asked questions.'
    },
    ar: {
      title: 'اتصل بنا واحجز حصة تجريبية مجانية | Discovery Club Junior',
      description: 'تواصل مع نادي ديسكفري جونيور في منوبة واطلب حصة تجريبية مجانية لطفلك. التوقيت والعنوان والأسئلة الشائعة.'
    }
  },
  login: {
    fr: { title: 'Connexion | Discovery Club Junior', description: 'Connectez-vous à votre espace Discovery Club Junior : parents, coachs et administration du club.' },
    en: { title: 'Sign in | Discovery Club Junior', description: 'Sign in to your Discovery Club Junior space: parents, coaches and club staff.' },
    ar: { title: 'تسجيل الدخول | Discovery Club Junior', description: 'سجّل الدخول إلى فضائك في نادي ديسكفري جونيور: الأولياء والمدربون وإدارة النادي.' }
  },
  'register-parent': {
    fr: {
      title: 'Inscription des parents | Discovery Club Junior',
      description: 'Créez votre compte parent pour inscrire votre enfant aux cours de robotique et de code du Discovery Club Junior à Manouba.'
    },
    en: {
      title: 'Parent sign-up | Discovery Club Junior',
      description: 'Create your parent account to register your child for Discovery Club Junior robotics and coding classes in Manouba.'
    },
    ar: {
      title: 'تسجيل الأولياء | Discovery Club Junior',
      description: 'أنشئ حساب وليّ لتسجيل طفلك في حصص الروبوتيك والبرمجة بنادي ديسكفري جونيور في منوبة.'
    }
  },
  privacy: {
    fr: { title: 'Politique de confidentialité | Discovery Club Junior', description: 'Comment le Discovery Club Junior protège les données des familles et des enfants.' },
    en: { title: 'Privacy policy | Discovery Club Junior', description: 'How Discovery Club Junior protects the data of families and children.' },
    ar: { title: 'سياسة الخصوصية | Discovery Club Junior', description: 'كيف يحمي نادي ديسكفري جونيور معطيات العائلات والأطفال.' }
  },
  terms: {
    fr: { title: 'Conditions d’utilisation | Discovery Club Junior', description: 'Les conditions d’utilisation du site et des espaces du Discovery Club Junior.' },
    en: { title: 'Terms of use | Discovery Club Junior', description: 'The terms of use of the Discovery Club Junior website and spaces.' },
    ar: { title: 'شروط الاستخدام | Discovery Club Junior', description: 'شروط استخدام موقع نادي ديسكفري جونيور وفضاءاته.' }
  }
};
