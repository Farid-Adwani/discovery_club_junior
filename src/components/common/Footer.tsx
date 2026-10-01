import React from 'react';
import { CLUB_PHOTOS } from '../../data/initialData';
import { useApp } from '../../context/AppContext';
import { ExternalLink, Heart, MapPin, Phone, Mail, Clock, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <footer className="border-t-2 border-slate-200 bg-white text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src={CLUB_PHOTOS.clubAvatar}
                alt="Discovery Club Junior logo"
                className="bg-white w-10 h-10 rounded-2xl object-cover border-2 border-slate-200"
              />
              <span className="text-base font-black tracking-tight text-slate-800">
                Discovery Junior
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Igniting the passion for robotics, coding, electronics, and AI in children and teenagers. Training the creators of tomorrow in Manouba, Tunisia! 🤖✨
            </p>
            <div className="pt-1">
              <a
                href="https://www.facebook.com/DiscoveryClubJunior/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-black transition-colors cursor-pointer"
              >
                <span>Follow on Facebook</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Spaces */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Club Portals</h4>
            <ul className="space-y-2 text-xs font-bold text-slate-600">
              <li>
                <button
                  onClick={() => navigateTo('home')}
                  className="hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Public Website & Admissions
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('register-parent')}
                  className="hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  Parent Portal Registration
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('login')}
                  className="hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Member Sign In (RBAC)
                </button>
              </li>
            </ul>
          </div>

          {/* STEM Pathways */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Learning Tracks</h4>
            <ul className="space-y-2 text-xs font-medium text-slate-500">
              <li>🤖 Junior Robotics Explorer (Ages 6-9)</li>
              <li>⚡ Electronics & Microcontrollers (Ages 10-14)</li>
              <li>💻 Creative Coding & Kids AI (Ages 11-16)</li>
              <li>🏆 Competitive Robotics Squad (Ages 12-17)</li>
              <li>👕 Official "Les Capuches" Club Hoodies</li>
            </ul>
          </div>

          {/* Campus Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Campus Location</h4>
            <div className="space-y-2 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Manouba STEM Hub, Tunisia</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>Wed: 2pm - 6pm · Sat/Sun: 9am - 5pm</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>+216 55 987 654</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t-2 border-slate-100 mt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-bold text-slate-400 gap-3">
          <div>
            &copy; {new Date().getFullYear()} Discovery Club Junior. Built with joy for young makers.
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-black">
            <span>Happy Learning & Creating! 🚀</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
