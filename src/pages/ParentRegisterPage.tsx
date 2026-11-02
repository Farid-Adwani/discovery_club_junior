import React, { useState } from 'react';
import { CLUB_PHOTOS } from '../data/initialData';
import { useApp } from '../context/AppContext';
import {
  HeartHandshake,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  User,
  ShoppingBag,
  Star,
  Zap,
  Smile,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SignInLoader } from '../components/common/SignInLoader';
import { useT } from '../i18n';
import { authMessages } from '../i18n/messages/auth';
import { siteMessages } from '../i18n/messages/site';
import { PHONE_PATTERN } from '../utils/contact';
import { ageOf } from '../utils/age';
import { toISODate } from '../utils/schedule';

export const ParentRegisterPage: React.FC = () => {
  const {
    registerParentAccount,
    navigateTo,
    isFirebaseConnected
  } = useApp();

  const t = useT(authMessages);
  const ts = useT(siteMessages);

  type ChildForm = { name: string; birthDate: string; notes: string };
  const emptyChild = (): ChildForm => ({ name: '', birthDate: '', notes: '' });
  // Children from 3 to 22 years old (same rule as the server)
  const yearsAgo = (n: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return toISODate(d);
  };
  const minBirth = yearsAgo(22);
  const maxBirth = yearsAgo(3);

  const [parentName, setParentName] = useState('');
  const [parentEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [children, setChildren] = useState<ChildForm[]>([emptyChild()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);

  const updateChild = (idx: number, patch: Partial<ChildForm>) => {
    setChildren((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };
  const addChild = () => setChildren((prev) => [...prev, emptyChild()]);
  const removeChild = (idx: number) => setChildren((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledChildren = children.filter((c) => c.name.trim());
    if (!parentName || !parentEmail || !phone || filledChildren.length === 0 || !acceptedTerms) return;

    setIsSubmitting(true);
    await registerParentAccount({
      parentName,
      parentEmail,
      password,
      parentPhone: phone,
      children: filledChildren.map((c) => ({
        name: c.name.trim(),
        birthDate: c.birthDate,
        notes: c.notes.trim() || undefined
      })),
      acceptedTerms,
      photoConsent
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-center relative">
      <AnimatePresence>{isSubmitting && <SignInLoader title={t('creatingAccount')} />}</AnimatePresence>
      {/* Top back navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigateTo('home')}
          className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-sky-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
          <span>{t('backHome')}</span>
        </button>

        <div className="text-xs font-bold text-slate-500">
          {t('alreadyRegistered')}{' '}
          <button
            onClick={() => navigateTo('login')}
            className="text-sky-600 font-black hover:underline cursor-pointer"
          >
            {t('signInHere')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Mascot & Parent Perks */}
        <div className="lg:col-span-5 duo-card p-6 sm:p-8 space-y-6 bg-white text-center">
          <div className="relative mx-auto w-28 h-28">
            <img
              src={CLUB_PHOTOS.clubAvatar}
              alt={t('logoAlt')}
              className="bg-white w-28 h-28 rounded-3xl object-cover border-4 border-emerald-100 shadow-sm"
            />
            <div className="absolute -bottom-1 -end-1 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs border-2 border-white shadow-sm">
              ✓
            </div>
          </div>

          <div className="duo-speech-bubble text-center space-y-1.5">
            <div className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              {t('perksBadge')}
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
              {t('perksTitle')}
            </h1>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {t('perksText')}
            </p>
          </div>

          <div className="space-y-2.5 text-start text-xs">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
              <span className="text-lg">📅</span>
              <div>
                <strong className="text-emerald-900 block font-black">{t('perkAttendanceTitle')}</strong>
                <span className="text-emerald-700 font-medium">{t('perkAttendanceText')}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-2.5">
              <span className="text-lg">⭐</span>
              <div>
                <strong className="text-sky-900 block font-black">{t('perkFeedbackTitle')}</strong>
                <span className="text-sky-700 font-medium">{t('perkFeedbackText')}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <span className="text-lg">🧥</span>
              <div>
                <strong className="text-amber-900 block font-black">{t('perkShopTitle')}</strong>
                <span className="text-amber-700 font-medium">{t('perkShopText')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Step-by-Step Friendly Form */}
        <div className="order-first lg:order-none lg:col-span-7 duo-card p-6 sm:p-10 space-y-6 bg-white">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 uppercase tracking-wider mb-1">
              <HeartHandshake className="w-4 h-4" />
              <span>{t('easyRegistration')}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {t('registerTitle')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {t('registerSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Parent Info */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">1</span>
                <span>{t('step1')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-black mb-1">{t('parentNameLabel')}</label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder={t('parentNamePlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-black mb-1">{t('phoneLabel')}</label>
                  <input
                    type="tel"
                    dir="ltr"
                    required
                    pattern={PHONE_PATTERN}
                    title={t('invalidPhone')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 98 123 456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-black mb-1">{t('regEmailLabel')}</label>
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-black mb-1">{t('regPasswordLabel')}</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('regPasswordPlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Child Info */}
            <div className="space-y-3.5 pt-4 border-t-2 border-slate-100">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-black">2</span>
                <span>{t('step2')}</span>
              </div>

              <p className="text-[11px] text-slate-500 font-medium">
                {t('noCourseNeeded')}
              </p>

              {children.map((child, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-slate-600">
                    <span>{t('childN', { n: idx + 1 })}</span>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(idx)}
                        className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('remove')}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                    <div className="sm:col-span-3">
                      <label className="block text-slate-700 font-black mb-1">{t('childNameLabel')}</label>
                      <input
                        type="text"
                        required
                        value={child.name}
                        onChange={(e) => updateChild(idx, { name: e.target.value })}
                        placeholder={t('childNamePlaceholder')}
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs font-semibold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-black mb-1">{t('ageLabel')}</label>
                      <input
                        type="date"
                        required
                        min={minBirth}
                        max={maxBirth}
                        value={child.birthDate}
                        onChange={(e) => updateChild(idx, { birthDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-sky-500 text-xs"
                      />
                      {child.birthDate && (
                        <p className="mt-1 text-[11px] font-bold text-emerald-700">
                          {t('ageComputed', { age: ageOf({ birthDate: child.birthDate, studentAge: 0 }) })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-black text-xs mb-1">
                      {t('notesLabel')}
                    </label>
                    <textarea
                      rows={2}
                      value={child.notes}
                      onChange={(e) => updateChild(idx, { notes: e.target.value })}
                      placeholder={t('notesPlaceholder')}
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-semibold resize-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addChild}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-sky-300 text-sky-600 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-sky-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addChild')}</span>
              </button>
            </div>

            {/* Consent: terms & privacy (required), publishing photos (optional) */}
            <div className="space-y-3 pt-4 border-t-2 border-slate-100 text-xs">
              <label className="flex items-start gap-2.5 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  onInvalid={(e) => e.currentTarget.setCustomValidity(ts('consentRequired'))}
                  onInput={(e) => e.currentTarget.setCustomValidity('')}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-emerald-600"
                />
                <span>
                  {ts('consentTermsBefore')}{' '}
                  <a href="#/terms" target="_blank" rel="noopener" className="font-black text-sky-700 underline">
                    {ts('terms')}
                  </a>{' '}
                  {ts('consentAnd')}{' '}
                  <a href="#/privacy" target="_blank" rel="noopener" className="font-black text-sky-700 underline">
                    {ts('privacyPolicy')}
                  </a>
                  . *
                </span>
              </label>
              <label className="flex items-start gap-2.5 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={photoConsent}
                  onChange={(e) => setPhotoConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-emerald-600"
                />
                <span>{ts('photoConsent')}</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 btn-duo-green text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>{isSubmitting ? t('creatingAccount') : t('completeRegister')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('alreadyRegistered')}</span>
            <button
              onClick={() => navigateTo('login')}
              className="text-sky-600 font-black hover:underline cursor-pointer"
            >
              {t('signInToSpace')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
