/**
 * The photo timeline of the landing page ("Our journey").
 *
 * The photos come from public/photos/timeline/discovery<YEAR>/<event folder>/ through
 * `npm run timeline`, which writes src/data/timelinePhotos.json. This file gives each folder its
 * title, result and cover photo in the three languages, and the order of the events in a year
 * (the order below). A folder that is not listed here still shows, at the end of its year, under
 * its folder name.
 */
import type { Localized } from './siteContent';
import manifest from './timelinePhotos.json';

const L = (en: string, fr: string, ar: string): Localized => ({ en, fr, ar });

export type TimelineKind = 'competition' | 'workshop' | 'ceremony' | 'team';

export interface TimelinePhoto {
  src: string;
  thumb: string;
  w: number;
  h: number;
}

export interface TimelineEvent {
  id: string;
  title: Localized;
  /** Ranking or prize, shown as a gold label */
  result?: Localized;
  /** Flag and place, the same in every language */
  place?: string;
  kind: TimelineKind;
  cover: TimelinePhoto;
  photos: TimelinePhoto[];
}

export interface TimelineYear {
  year: number;
  tagline?: Localized;
  events: TimelineEvent[];
  photoCount: number;
}

interface EventInfo {
  title: Localized;
  result?: Localized;
  place?: string;
  kind: TimelineKind;
  /** File name of the cover photo (default: the first one) */
  cover?: string;
}

/** One line under each year */
const TAGLINES: Record<number, Localized> = {
  2019: L(
    'Drones, national competitions and the Eurobot qualifiers',
    'Drones, compétitions nationales et qualifications Eurobot',
    'طائرات مسيّرة ومسابقات وطنية وتصفيات يوروبوت'
  ),
  2020: L(
    'The national science fair and long hours in the lab',
    'La foire nationale des sciences et de longues heures au labo',
    'المعرض الوطني للعلوم وساعات طويلة في المختبر'
  ),
  2021: L('Aeroday, Robolympics and ULT Robot', 'Aeroday, Robolympics et ULT Robot', 'Aeroday، Robolympics و ULT Robot'),
  2022: L('A double podium at Eurobot Junior', 'Un double podium à l’Eurobot Junior', 'منصّة تتويج مزدوجة في يوروبوت جونيور'),
  2023: L(
    '1st prize at ODA Robots and RoboCup in South Korea',
    '1er prix à ODA Robots et RoboCup en Corée du Sud',
    'الجائزة الأولى في ODA Robots وروبوكاب في كوريا الجنوبية'
  ),
  2024: L('Aeronautics, Eurobot and RoboCup', 'Aéronautique, Eurobot et RoboCup', 'الطيران ويوروبوت وروبوكاب'),
  2025: L(
    'First places at Eurobot, Aeroday, Robolympics and ISET',
    'Des premières places à l’Eurobot, l’Aeroday, les Robolympics et l’ISET',
    'مراكز أولى في يوروبوت، Aeroday، Robolympics و ISET'
  ),
  2026: L('Eurobot Junior champions in Spain', 'Champions de l’Eurobot Junior en Espagne', 'أبطال يوروبوت جونيور في إسبانيا')
};

/** Events per year, keyed by folder name, in the order they are shown */
const EVENTS: Record<number, Record<string, EventInfo>> = {
  2026: {
    Euro26: {
      title: L('Eurobot Junior 2026', 'Eurobot Junior 2026', 'يوروبوت جونيور 2026'),
      result: L('1st place in Spain', '1re place en Espagne', 'المركز الأول في إسبانيا'),
      place: '🇪🇸',
      kind: 'competition',
      cover: 'champ26.jpg'
    },
    robocup26: {
      title: L('RoboCup · Vienna', 'RoboCup · Vienne', 'روبوكاب · فيينا'),
      place: '🇦🇹',
      kind: 'competition',
      cover: 'autrishe2.jpg'
    },
    Micromous: {
      title: L('Micromouse · National Robotics Week', 'Micromouse · Semaine nationale de la robotique', 'Micromouse · الأسبوع الوطني للروبوتيك'),
      result: L('1st place', '1re place', 'المركز الأول'),
      kind: 'competition',
      cover: 'septembre1.jpg'
    },
    Aeroday26: {
      title: L('Aeroday 2026', 'Aeroday 2026', 'Aeroday 2026'),
      result: L('1st in CAD (junior) · 3rd (senior)', '1re en CAO (junior) · 3e (senior)', 'الأول في التصميم بالحاسوب (ناشئين) · الثالث (كبار)'),
      kind: 'competition'
    },
    ROBOLYMPICS: {
      title: L('Robolympics 2026', 'Robolympics 2026', 'Robolympics 2026'),
      kind: 'competition'
    },
    'CITE DE SC': {
      title: L('Night of the Stars · Cité des Sciences', 'Nuit des étoiles · Cité des Sciences', 'ليلة النجوم · مدينة العلوم'),
      kind: 'ceremony',
      cover: '904605329_1135809422775818_1231271066987240755_n.jpg'
    },
    ENSI: {
      title: L('Robotics competition · ENSI', 'Compétition de robotique · ENSI', 'مسابقة روبوتيك · ENSI'),
      kind: 'competition'
    }
  },
  2025: {
    Euro25: {
      title: L('Eurobot Junior 2025', 'Eurobot Junior 2025', 'يوروبوت جونيور 2025'),
      result: L('1st and 3rd place', '1re et 3e places', 'المركزان الأول والثالث'),
      kind: 'competition',
      cover: '1ere place.jpg'
    },
    'robocup25 ASIA': {
      title: L('RoboCup Asia · Abu Dhabi', 'RoboCup Asie · Abou Dhabi', 'روبوكاب آسيا · أبوظبي'),
      place: '🇦🇪',
      kind: 'competition',
      cover: 'abudhabi.jpg'
    },
    'robocup25 egypt': {
      title: L('RoboCup Junior Egypt', 'RoboCup Junior Égypte', 'روبوكاب جونيور مصر'),
      result: L('Rescue Line SuperTeam champions', 'Champions SuperTeam Rescue Line', 'أبطال SuperTeam في Rescue Line'),
      place: '🇪🇬',
      kind: 'competition',
      cover: '2.jpg'
    },
    aeroday25: {
      title: L('Aeroday 2025', 'Aeroday 2025', 'Aeroday 2025'),
      result: L('1st in aeromodelling · 2nd in CAD', '1re en aéromodélisme · 2e en CAO', 'الأول في الطيران النموذجي · الثاني في التصميم بالحاسوب'),
      kind: 'competition'
    },
    robolympics25: {
      title: L('Robolympics 2025', 'Robolympics 2025', 'Robolympics 2025'),
      result: L('1st place · junior challenge', '1re place · défi junior', 'المركز الأول · تحدّي الناشئين'),
      kind: 'competition',
      cover: '1ER PLACE JN.jpg'
    },
    iset25: {
      title: L('ISET competition', 'Compétition ISET', 'مسابقة ISET'),
      result: L('1st prize', '1er prix', 'الجائزة الأولى'),
      kind: 'competition',
      cover: '1er prix.jpg'
    }
  },
  2024: {
    EURO24: {
      title: L('Eurobot Junior 2024', 'Eurobot Junior 2024', 'يوروبوت جونيور 2024'),
      kind: 'competition',
      cover: '5.jpg'
    },
    ROBOCUP24: {
      title: L('RoboCup 2024', 'RoboCup 2024', 'روبوكاب 2024'),
      kind: 'competition',
      cover: '2.jpg'
    },
    AERODAY24: {
      title: L('Aeroday 2024', 'Aeroday 2024', 'Aeroday 2024'),
      kind: 'competition'
    },
    Aeronautique: {
      title: L('Aeronautics workshop', 'Atelier aéronautique', 'ورشة الطيران'),
      kind: 'workshop',
      cover: '7.jpg'
    },
    WIPO: {
      title: L('Honoured by WIPO', 'Distinction de l’OMPI', 'تكريم من المنظمة العالمية للملكية الفكرية'),
      kind: 'ceremony'
    },
    'takrym masyf': {
      title: L('Honouring ceremony', 'Cérémonie d’honneur', 'حفل تكريم'),
      kind: 'ceremony',
      cover: '1.jpg'
    },
    ALECSO: {
      title: L('At ALECSO', 'À l’ALECSO', 'في الألكسو'),
      kind: 'ceremony',
      cover: '2.jpg'
    }
  },
  2023: {
    'CITE DE SC': {
      title: L('ODA Robots · Cité des Sciences', 'ODA Robots · Cité des Sciences', 'ODA Robots · مدينة العلوم'),
      result: L('1st and 2nd prize', '1er et 2e prix', 'الجائزتان الأولى والثانية'),
      kind: 'competition',
      cover: '1.jpg'
    },
    ROBOCUP23: {
      title: L('RoboCup 2023 · South Korea', 'RoboCup 2023 · Corée du Sud', 'روبوكاب 2023 · كوريا الجنوبية'),
      place: '🇰🇷',
      kind: 'competition',
      cover: '3M.jpg'
    },
    EURO23: {
      title: L('Eurobot Junior 2023', 'Eurobot Junior 2023', 'يوروبوت جونيور 2023'),
      kind: 'competition',
      cover: '2.jpg'
    },
    ENSI: {
      title: L('Robotics competition · ENSI', 'Compétition de robotique · ENSI', 'مسابقة روبوتيك · ENSI'),
      kind: 'competition',
      cover: '4.jpg'
    },
    'prix outstanding negotiator': {
      title: L('Outstanding Negotiator award', 'Prix du meilleur négociateur', 'جائزة أفضل مفاوض'),
      place: '🇦🇪',
      kind: 'ceremony',
      cover: '2.jpg'
    }
  },
  2022: {
    EURO22: {
      title: L('Eurobot Junior 2022', 'Eurobot Junior 2022', 'يوروبوت جونيور 2022'),
      result: L('1st and 2nd place', '1re et 2e places', 'المركزان الأول والثاني'),
      kind: 'competition',
      cover: '2.jpg'
    },
    ENSI: {
      title: L('Robotics competition · ENSI', 'Compétition de robotique · ENSI', 'مسابقة روبوتيك · ENSI'),
      kind: 'competition'
    },
    'COLLEGE LHREYRYA': {
      title: L('Collège El Hrairia', 'Collège El Hrairia', 'إعدادية الحرايرية'),
      kind: 'competition'
    },
    TEAM22: {
      title: L('The 2022 team', 'L’équipe 2022', 'فريق 2022'),
      kind: 'team',
      cover: '3.jpg'
    }
  },
  2021: {
    AERODAY: {
      title: L('Aeroday 2021', 'Aeroday 2021', 'Aeroday 2021'),
      kind: 'competition'
    },
    ULTROBOT: {
      title: L('ULT Robot', 'ULT Robot', 'ULT Robot'),
      kind: 'competition',
      cover: '3.jpg'
    },
    ROBOLYMPICS: {
      title: L('Robolympics 2021', 'Robolympics 2021', 'Robolympics 2021'),
      kind: 'competition',
      cover: '2.jpg'
    }
  },
  2020: {
    'la foire nationale des sc et tech': {
      title: L('National Science and Technology Fair', 'Foire nationale des sciences et des technologies', 'المعرض الوطني للعلوم والتكنولوجيا'),
      kind: 'ceremony'
    },
    'CLEVER LIBRARY': {
      title: L('The “Clever Library” project', 'Le projet « Clever Library »', 'مشروع «Clever Library»'),
      kind: 'workshop'
    },
    FORMATION: {
      title: L('Training sessions', 'Formations', 'دورات تكوينية'),
      kind: 'workshop',
      cover: '4.jpg'
    },
    'WORKING TIME': {
      title: L('Lab time', 'Au labo', 'العمل في المختبر'),
      kind: 'workshop'
    },
    'CEREMONIE DE CLOTURE': {
      title: L('Closing ceremony', 'Cérémonie de clôture', 'حفل الاختتام'),
      kind: 'ceremony'
    }
  },
  2019: {
    'Qualif 1 Eurobot 2019': {
      title: L('Eurobot 2019 qualifiers', 'Qualifications Eurobot 2019', 'تصفيات يوروبوت 2019'),
      kind: 'competition',
      cover: '2..jpg'
    },
    'Compt national 1 ULT robots': {
      title: L('National competition · ULT Robots', 'Compétition nationale · ULT Robots', 'المسابقة الوطنية · ULT Robots'),
      kind: 'competition',
      cover: '3.jpg'
    },
    'Compt national 2 ENSI': {
      title: L('National competition · ENSI', 'Compétition nationale · ENSI', 'المسابقة الوطنية · ENSI'),
      kind: 'competition',
      cover: '4.jpg'
    },
    PRIX: {
      title: L('Prize giving', 'Remise des prix', 'توزيع الجوائز'),
      kind: 'ceremony',
      cover: '3.jpg'
    },
    DRONES: {
      title: L('Drone workshop', 'Atelier drones', 'ورشة الطائرات المسيّرة'),
      kind: 'workshop',
      cover: '9.jpg'
    },
    work: {
      title: L('In the workshop', 'À l’atelier', 'في الورشة'),
      kind: 'workshop'
    },
    SOUVENIR: {
      title: L('Memories', 'Souvenirs', 'ذكريات'),
      kind: 'team',
      cover: '2.jpg'
    }
  }
};

/** "robocup25 egypt" → "Robocup25 Egypt", for folders without a title yet */
const folderTitle = (folder: string) => {
  const name = folder.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return L(name, name, name);
};

type ManifestEvent = { folder: string; photos: (TimelinePhoto & { file: string })[] };

/** Years with their events, newest year last (the order of the rail) */
export const TIMELINE: TimelineYear[] = (manifest as { year: number; events: ManifestEvent[] }[]).map(({ year, events }) => {
  const info = EVENTS[year] || {};
  const order = Object.keys(info);
  const rank = (folder: string) => (order.includes(folder) ? order.indexOf(folder) : order.length);
  const list = [...events]
    .sort((a, b) => rank(a.folder) - rank(b.folder))
    .map(({ folder, photos }): TimelineEvent => {
      const meta = info[folder];
      const strip = photos.map(({ src, thumb, w, h }) => ({ src, thumb, w, h }));
      const coverIndex = Math.max(0, meta?.cover ? photos.findIndex((p) => p.file === meta.cover) : 0);
      return {
        id: `${year}/${folder}`,
        title: meta?.title || folderTitle(folder),
        result: meta?.result,
        place: meta?.place,
        kind: meta?.kind || 'competition',
        cover: strip[coverIndex],
        photos: strip
      };
    });
  return { year, tagline: TAGLINES[year], events: list, photoCount: list.reduce((n, e) => n + e.photos.length, 0) };
});
