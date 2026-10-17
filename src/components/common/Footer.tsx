import React from 'react';
import { CLUB_PHOTOS } from '../../data/initialData';
import { useApp } from '../../context/AppContext';
import { useT } from '../../i18n';
import { commonMessages } from '../../i18n/messages/common';
import { ExternalLink, Heart, MapPin, Phone, Mail, Clock, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo } = useApp();
  const t = useT(commonMessages);

  return (
    <footer className="border-t-2 border-slate-200 bg-white text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src={CLUB_PHOTOS.clubAvatar}
                alt={t('logoAlt')}
                className="bg-white w-10 h-10 rounded-2xl object-cover border-2 border-slate-200"
              />
              <span className="text-base font-black tracking-tight text-slate-800">
                Discovery Junior
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {t('footerTagline')}
            </p>
            <div className="pt-1">
              <a
                href="https://www.facebook.com/DiscoveryClubJunior/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-black transition-colors cursor-pointer"
              >
                <span>{t('followFacebook')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Spaces */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('clubPortals')}</h4>
            <ul className="space-y-2 text-xs font-bold text-slate-600">
              <li>
                <button
                  onClick={() => navigateTo('home')}
                  className="hover:text-sky-600 transition-colors cursor-pointer"
                >
                  {t('portalPublic')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('register-parent')}
                  className="hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  {t('portalRegister')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('login')}
                  className="hover:text-sky-600 transition-colors cursor-pointer"
                >
                  {t('portalSignIn')}
                </button>
              </li>
            </ul>
          </div>

          {/* STEM Pathways */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('learningTracks')}</h4>
            <ul className="space-y-2 text-xs font-medium text-slate-500">
              <li>{t('track1')}</li>
              <li>{t('track2')}</li>
              <li>{t('track3')}</li>
              <li>{t('track4')}</li>
            </ul>
          </div>

          {/* Campus Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('campusLocation')}</h4>
            <div className="space-y-2 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{t('campusAddress')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>{t('openingHours')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span dir="ltr">+216 55 987 654</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t-2 border-slate-100 mt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-bold text-slate-400 gap-3">
          <div>
            {t('copyright', { year: new Date().getFullYear() })}
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-black">
            <span>{t('happyLearning')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
