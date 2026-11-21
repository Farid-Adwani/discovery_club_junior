import { useApp } from '../../context/AppContext';
import { INITIAL_TRAINERS } from '../../data/initialData';
import { hasMap, publishedFaq, type Site } from '../../data/siteContent';
import { useSite } from '../common/siteHooks';
import type { LandingSection } from '../../data/landing';
import type { Trainer } from '../../types';
import type { PublicPage } from '../../utils/routes';

/** Coaches on the home page: always the club's trainers of Admin → Team (never the built-in demo ones) */
export const landingCoaches = (trainers: Trainer[]) =>
  (trainers === INITIAL_TRAINERS ? [] : trainers).map((tr) => ({ name: tr.name, role: tr.specialty || tr.specialization, photo: tr.avatar }));

/** The contact section needs at least one way to reach the club */
export const hasContactInfo = (site: Site) => {
  const { whatsapp, email, phone } = site.contact;
  return !!(whatsapp || email || phone || hasMap(site));
};

/** The header links, in page order: home page sections (id = the section's DOM id) and the Events page */
const NAV_SECTIONS = [
  { id: 'about', section: 'how' },
  { id: 'programs', section: 'programs' },
  { id: 'events' },
  { id: 'coaches', section: 'coaches' },
  { id: 'journey', section: 'timeline' },
  { id: 'faq', section: 'faq' },
  { id: 'contact', section: 'contact' }
] as const satisfies readonly { id: string; section?: LandingSection }[];

export type NavSectionId = (typeof NAV_SECTIONS)[number]['id'];

/** Links that open a page of their own (a real address search engines can list); the others scroll the home page */
export const NAV_PAGE: Partial<Record<NavSectionId, PublicPage>> = { programs: 'courses', events: 'events', contact: 'contact' };

/** The linked sections that are on the page: not hidden in Admin → Landing page, and with something to show */
export function useNavSections(): NavSectionId[] {
  const { landing, trainers, events } = useApp();
  const site = useSite();
  const hasContent: Partial<Record<NavSectionId, boolean>> = {
    coaches: landingCoaches(trainers).length > 0,
    faq: publishedFaq(site).length > 0,
    contact: hasContactInfo(site),
    events: events.some((e) => e.visible && !e.deletedAt)
  };
  return NAV_SECTIONS.filter((s) => (!('section' in s) || !landing.hidden?.includes(s.section)) && hasContent[s.id] !== false).map((s) => s.id);
}
