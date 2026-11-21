import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CalendarDays, Clock, Facebook, LogIn, MapPin, Ticket, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage, useT } from '../i18n';
import { eventsMessages } from '../i18n/messages/events';
import { pagesMessages } from '../i18n/messages/pages';
import { commonMessages } from '../i18n/messages/common';
import { DateBadge, STATE_STYLE, eventDateLabel, eventTimeLabel } from '../components/common/EventBits';
import { PageLink } from '../components/common/PageLink';
import { useSite } from '../components/common/siteHooks';
import { CircuitTraces } from '../components/visitor/LabArt';
import { EVENT_DEFAULT_IMAGE, canRequest, lastDay, registrationState } from '../utils/events';
import { toISODate } from '../utils/schedule';
import { PAGE_PATHS, SITE_URL as SITE } from '../utils/routes';
import type { ClubEvent } from '../types';


/** Google's description of an upcoming event (it can show it in its event listings) */
function eventJsonLd(e: ClubEvent) {
  const at = (date: string, time?: string) => (time ? `${date}T${time}:00+01:00` : date);
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    ...(e.description ? { description: e.description } : {}),
    startDate: at(e.date, e.startTime),
    endDate: at(lastDay(e), e.endTime),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: e.location || 'Discovery Club Junior',
      address: { '@type': 'PostalAddress', addressLocality: 'Manouba', addressCountry: 'TN' }
    },
    image: [new URL(e.imageUrl || '/og-card.jpg', SITE).href],
    organizer: { '@type': 'Organization', name: 'Discovery Club Junior', url: `${SITE}/` },
    offers: {
      '@type': 'Offer',
      price: e.fee,
      priceCurrency: 'TND',
      url: `${SITE}${PAGE_PATHS.events}`,
      availability: e.capacity && (e.acceptedCount || 0) >= e.capacity ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock'
    }
  };
}

const EventCard: React.FC<{ e: ClubEvent; index: number; past?: boolean }> = ({ e, index, past }) => {
  const { currentUser, navigateTo } = useApp();
  const t = useT(eventsMessages);
  const tp = useT(pagesMessages);
  const tc = useT(commonMessages);
  const { locale } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 3 });
  const state = registrationState(e, toISODate(new Date()));
  const placesLeft = e.capacity ? Math.max(0, e.capacity - (e.acceptedCount || 0)) : null;
  const isParent = !!currentUser?.roles.includes('parent');

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
      className={`rounded-[28px] bg-white soft-shadow p-2.5 flex flex-col ${past ? 'opacity-80' : ''}`}
    >
      <div className="relative aspect-[16/10] rounded-[22px] overflow-hidden bg-wash">
        <img src={e.imageUrl || EVENT_DEFAULT_IMAGE} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover ${past ? 'grayscale-[40%]' : ''}`} />
        <DateBadge date={e.date} className="absolute top-3 start-3" />
        <span className="absolute top-3 end-3 px-2.5 py-1 rounded-full bg-[#191919]/85 text-white text-[11px] font-black">
          {e.fee > 0 ? t('p_feePerChild', { fee: fmt(e.fee) }) : t('free')}
        </span>
      </div>
      <div className="px-3.5 pt-4 pb-3 flex flex-col gap-3 flex-1">
        <h3 className="font-display text-[1.4rem] font-semibold text-heading leading-snug">{e.title}</h3>
        <div className="text-xs font-semibold text-muted flex flex-wrap gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1 capitalize">
            <CalendarDays className="w-3.5 h-3.5 text-brand" /> {eventDateLabel(e, locale)}
          </span>
          {eventTimeLabel(e) && (
            <span className="inline-flex items-center gap-1" dir="ltr">
              <Clock className="w-3.5 h-3.5 text-brand" /> {eventTimeLabel(e)}
            </span>
          )}
          {e.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-brand" /> {e.location}
            </span>
          )}
        </div>
        {e.description && (
          <div>
            <p className={`text-sm text-muted leading-relaxed whitespace-pre-line ${expanded ? '' : 'line-clamp-4'}`}>{e.description}</p>
            {e.description.length > 200 && (
              <button onClick={() => setExpanded((v) => !v)} className="text-xs font-bold text-brand hover:underline cursor-pointer">
                {expanded ? t('p_less') : t('p_more')}
              </button>
            )}
          </div>
        )}
        {!past && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${STATE_STYLE[state]}`}>{t(`state_${state}`)}</span>
            {placesLeft !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
                <Users className="w-3 h-3" /> {placesLeft > 0 ? t('placesLeft', { count: placesLeft }) : t('p_full')}
              </span>
            )}
            {e.registrationDeadline && state === 'open' && (
              <span className="text-[10px] font-bold text-slate-400">{t('deadlineOn', { date: eventDateLabel({ date: e.registrationDeadline }, locale) })}</span>
            )}
          </div>
        )}
        {!past && canRequest(state) && (
          <div className="mt-auto pt-3 border-t border-dashed border-line space-y-2">
            {isParent ? (
              <button onClick={() => navigateTo('parent')} className="pill-primary w-full justify-center py-3 text-sm">
                <Ticket className="w-4 h-4" />
                {tp('eventsOpenSpace')}
              </button>
            ) : (
              <>
                <PageLink page="register-parent" className="pill-primary w-full justify-center py-3 text-sm">
                  <Ticket className="w-4 h-4" />
                  {tp('eventsRegister')}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </PageLink>
                {!currentUser && (
                  <PageLink page="login" className="pill-outline w-full justify-center py-2.5 text-sm">
                    <LogIn className="w-4 h-4" />
                    {tc('signIn')}
                  </PageLink>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
};

/** /evenements: the club's visible events for everyone; parents register their children from their space */
export const EventsPage: React.FC = () => {
  const { events, isFirebaseConnected } = useApp();
  const tp = useT(pagesMessages);
  const site = useSite();
  const today = toISODate(new Date());

  const { upcoming, past } = useMemo(() => {
    const shown = events.filter((e) => e.visible && !e.deletedAt);
    return {
      upcoming: shown.filter((e) => lastDay(e) >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || '')),
      past: shown.filter((e) => lastDay(e) < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
    };
  }, [events, today]);

  return (
    <div className="pb-24 bg-paper min-h-[70vh]">
      {upcoming.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(upcoming.map(eventJsonLd)).replace(/</g, '\\u003c') }} />
      )}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fff3f5] via-paper to-paper">
        <div className="absolute inset-0 paper-dots opacity-60" aria-hidden="true" />
        <CircuitTraces sides="end" className="opacity-60" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20 text-center space-y-4">
          <p className="font-hand text-2xl text-brand leading-none">{tp('eventsKicker')}</p>
          <h1 className="font-display text-[2.4rem] sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.06] text-heading">{tp('eventsTitle')}</h1>
          <p className="text-base sm:text-lg text-muted leading-relaxed max-w-2xl mx-auto">{tp('eventsIntro')}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {!isFirebaseConnected && events.length === 0 ? (
          <div className="py-16 flex justify-center" role="status" aria-live="polite">
            <span className="w-10 h-10 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin" />
            <span className="sr-only">{tp('eventsLoading')}</span>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="max-w-xl mx-auto text-center rounded-[28px] border-2 border-dashed border-line bg-white/60 px-6 py-12 space-y-5">
            <p className="text-sm text-muted leading-relaxed">{tp('eventsNone')}</p>
            {site.contact.facebook && (
              <a href={site.contact.facebook} target="_blank" rel="noopener noreferrer" className="pill-primary px-6 py-3 text-sm">
                <Facebook className="w-4 h-4" />
                {tp('eventsFollow')}
              </a>
            )}
          </div>
        ) : (
          <section aria-labelledby="events-upcoming" className="space-y-6">
            <h2 id="events-upcoming" className="font-display text-3xl font-semibold text-heading tracking-tight">
              {tp('eventsUpcoming')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {upcoming.map((e, i) => (
                <EventCard key={e.id} e={e} index={i} />
              ))}
            </div>
            <p className="text-center text-xs font-semibold text-muted">{tp('eventsSignUpHint')}</p>
          </section>
        )}

        {past.length > 0 && (
          <section aria-labelledby="events-past" className="space-y-6">
            <h2 id="events-past" className="font-display text-2xl font-semibold text-heading/80 tracking-tight">
              {tp('eventsPast')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {past.map((e, i) => (
                <EventCard key={e.id} e={e} index={i} past />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
