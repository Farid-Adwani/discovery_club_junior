import { useApp } from '../../context/AppContext';
import { INITIAL_TRAINERS } from '../../data/initialData';
import { hasMap, publishedFaq, type Site } from '../../data/siteContent';
import { useSite } from '../common/siteHooks';
import type { LandingSection } from '../../data/landing';
import type { Trainer } from '../../types';

/** Coaches on the home page: always the club's trainers of Admin → Team (never the built-in demo ones) */
export const landingCoaches = (trainers: Trainer[]) =>
  (trainers === INITIAL_TRAINERS ? [] : trainers).map((tr) => ({ name: tr.name, role: tr.specialty || tr.specialization, photo: tr.avatar }));

/** The contact section needs at least one way to reach the club */
export const hasContactInfo = (site: Site) => {
  const { whatsapp, email, phone } = site.contact;
  return !!(whatsapp || email || phone || hasMap(site));
};

/** Home page sections the header links to, in page order (id = the section's DOM id) */
const NAV_SECTIONS = [
  { id: 'about', section: 'how' },
  { id: 'programs', section: 'programs' },
  { id: 'coaches', section: 'coaches' },
  { id: 'journey', section: 'timeline' },
  { id: 'faq', section: 'faq' },
  { id: 'contact', section: 'contact' }
] as const satisfies readonly { id: string; section: LandingSection }[];

export type NavSectionId = (typeof NAV_SECTIONS)[number]['id'];

/** The linked sections that are on the page: not hidden in Admin → Landing page, and with something to show */
export function useNavSections(): NavSectionId[] {
  const { landing, trainers } = useApp();
  const site = useSite();
  const hasContent: Partial<Record<NavSectionId, boolean>> = {
    coaches: landingCoaches(trainers).length > 0,
    faq: publishedFaq(site).length > 0,
    contact: hasContactInfo(site)
  };
  return NAV_SECTIONS.filter((s) => !landing.hidden?.includes(s.section) && hasContent[s.id] !== false).map((s) => s.id);
}
