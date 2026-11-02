import React from 'react';
import { CLUB_PHOTOS } from '../../data/initialData';
import { useApp } from '../../context/AppContext';
import { AppPage } from '../../types';
import { useLanguage, useT } from '../../i18n';
import { commonMessages } from '../../i18n/messages/common';
import { siteMessages } from '../../i18n/messages/site';
import { visitorMessages } from '../../i18n/messages/visitor';
import { SITE_CONTENT, mapsLink, whatsappLink } from '../../data/siteContent';
import { WhatsAppIcon } from '../visitor/WhatsAppButton';
import { ArrowUp, ArrowUpRight, Clock, Cpu, Code2, Facebook, Instagram, Mail, MapPin, Phone, Trophy, Bot } from 'lucide-react';

const TRACKS = [
  { name: 'track1', ages: 'track1Ages', icon: Bot },
  { name: 'track2', ages: 'track2Ages', icon: Cpu },
  { name: 'track3', ages: 'track3Ages', icon: Code2 },
  { name: 'track4', ages: 'track4Ages', icon: Trophy }
] as const;

/** Site footer: brand, quick links, programs and contact on a charcoal band with a crimson accent. */
export const Footer: React.FC = () => {
  const { navigateTo } = useApp();
  const t = useT(commonMessages);
  const ts = useT(siteMessages);
  const tv = useT(visitorMessages);
  const { lang } = useLanguage();
  const { contact, address, openingHours } = SITE_CONTENT;
  const wa = whatsappLink(tv('whatsappHello'));

  const links: { page: AppPage; label: string }[] = [
    { page: 'home', label: t('portalPublic') },
    { page: 'register-parent', label: t('portalRegister') },
    { page: 'login', label: t('portalSignIn') }
  ];

  const heading = 'text-[11px] font-black uppercase tracking-[0.18em] text-white/70 mb-5';

  return (
    <footer className="relative bg-ink text-white/70 text-sm">
      <div className="h-1 bg-gradient-to-r from-brand-dark via-brand to-brand-dark" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-10 gap-y-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-5">
            <div className="flex items-center gap-3">
              <img
                src={CLUB_PHOTOS.clubAvatar}
                alt={t('logoAlt')}
                className="w-12 h-12 rounded-2xl object-cover bg-white ring-2 ring-white/10"
              />
              <span className="text-lg font-black tracking-tight text-white">Discovery Junior</span>
            </div>
            <p className="max-w-sm leading-relaxed text-white/60">{t('footerTagline')}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={contact.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-white/5 hover:bg-brand px-4 py-2 text-xs font-bold text-white ring-1 ring-white/10 hover:ring-brand transition-colors"
              >
                <Facebook className="w-4 h-4" />
                <span>{t('followFacebook')}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 rtl:-scale-x-100" />
              </a>
              {contact.instagram && (
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center rounded-full bg-white/5 hover:bg-brand px-3 py-2 text-white ring-1 ring-white/10 hover:ring-brand transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick links */}
          <nav className="lg:col-span-2">
            <h4 className={heading}>{t('clubPortals')}</h4>
            <ul className="space-y-3 font-semibold">
              {links.map((l) => (
                <li key={l.page}>
                  <button
                    onClick={() => navigateTo(l.page)}
                    className="text-start text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Programs */}
          <div className="lg:col-span-3">
            <h4 className={heading}>{t('learningTracks')}</h4>
            <ul className="space-y-3">
              {TRACKS.map(({ name, ages, icon: Icon }) => (
                <li key={name} className="flex items-center gap-3">
                  <span className="grid place-items-center w-8 h-8 shrink-0 rounded-lg bg-brand/15 text-brand">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 font-semibold text-white/80 leading-snug">{t(name)}</span>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-bold text-white/70 ring-1 ring-white/10">
                    {t(ages)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <address className="lg:col-span-3 not-italic">
            <h4 className={heading}>{t('campusLocation')}</h4>
            <ul className="space-y-4">
              <li>
                <a
                  href={mapsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 hover:text-white transition-colors"
                >
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                  <span>{[address.street[lang], address.city[lang]].filter(Boolean).join(', ')}</span>
                </a>
              </li>
              {openingHours[lang] && (
                <li className="flex items-start gap-3">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                  <span>{openingHours[lang]}</span>
                </li>
              )}
              {contact.phone && (
                <li>
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="flex items-start gap-3 hover:text-white transition-colors">
                    <Phone className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                    <span dir="ltr" className="font-semibold">{contact.phone}</span>
                  </a>
                </li>
              )}
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-white transition-colors">
                    <WhatsAppIcon className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                    <span>WhatsApp</span>
                  </a>
                </li>
              )}
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className="flex items-start gap-3 hover:text-white transition-colors">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                    <span dir="ltr" className="font-semibold break-all">{contact.email}</span>
                  </a>
                </li>
              )}
            </ul>
          </address>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
          <p className="text-center sm:text-start">{t('copyright', { year: new Date().getFullYear() })}</p>
          <nav aria-label={ts('legal')} className="flex items-center gap-4 font-bold">
            <button onClick={() => navigateTo('privacy')} className="hover:text-white transition-colors cursor-pointer">
              {ts('privacyPolicy')}
            </button>
            <button onClick={() => navigateTo('terms')} className="hover:text-white transition-colors cursor-pointer">
              {ts('terms')}
            </button>
          </nav>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 font-bold text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            {t('backToTop')}
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
