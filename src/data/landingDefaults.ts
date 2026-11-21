/** The built-in photos of the hero, used until an admin changes them in Admin → Landing page */
import { CLUB_PHOTOS } from './initialData';
import { visitorMessages } from '../i18n/messages/visitor';
import type { LandingPhoto, LText } from './landing';

type VisitorKey = keyof (typeof visitorMessages)['en'];
const tri = (key: VisitorKey): LText => ({ en: visitorMessages.en[key], fr: visitorMessages.fr[key], ar: visitorMessages.ar[key] });
const same = (text: string): LText => ({ en: text, fr: text, ar: text });

export const DEFAULT_HERO_PHOTOS: LandingPhoto[] = [
  { img: CLUB_PHOTOS.eurobotSpainChampions, tag: tri('belt1Tag'), title: tri('belt1Title') },
  { img: CLUB_PHOTOS.ministryHonorCeremony, tag: tri('belt4Tag'), title: tri('belt4Title') },
  { img: CLUB_PHOTOS.robocupViennaMarxHalle, tag: same('🇦🇹 Marx Halle'), title: tri('belt3Title') },
  { img: CLUB_PHOTOS.odaRobots2ndPrize, tag: tri('belt6Tag'), title: tri('belt6Title') },
  { img: CLUB_PHOTOS.nationsFlags, tag: tri('belt11Tag'), title: tri('belt11Title') }
];
export const DEFAULT_POLAROID = CLUB_PHOTOS.eurobotSpainTrophyCert;
export const DEFAULT_HIGHLIGHT = CLUB_PHOTOS.robocupViennaMarxHalle;
