/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CLUB_PHOTOS } from './data/initialData';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider, useT } from './i18n';
import { ConfirmProvider } from './components/common/ConfirmProvider';
import { commonMessages } from './i18n/messages/common';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { IntroReveal } from './components/common/IntroReveal';
import { VisitorPortal } from './components/visitor/VisitorPortal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TrainerPortal } from './components/trainer/TrainerPortal';
import { ParentPortal } from './components/parent/ParentPortal';
import { LoginPage } from './pages/LoginPage';
import { ParentRegisterPage } from './pages/ParentRegisterPage';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, LogIn, ArrowLeft, UserPlus, Sparkles, Lock, KeyRound } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentPage, navigateTo, currentUser, isRestoringSession } = useApp();
  const t = useT(commonMessages);

  // Route security gate: check if user is authorized for protected portal pages
  const renderPage = () => {
    // After a refresh on a protected page, wait for the saved sign-in instead of showing "access denied"
    if (isRestoringSession && ['admin', 'trainer', 'parent'].includes(currentPage)) {
      return (
        <div key="page-restoring" className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
          <span className="w-10 h-10 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin" />
        </div>
      );
    }
    switch (currentPage) {
      case 'login':
        return <LoginPage key="page-login" />;

      case 'register-parent':
        return <ParentRegisterPage key="page-register-parent" />;

      case 'admin':
        if (!currentUser || !currentUser.roles.includes('admin')) {
          return (
            <AccessDeniedGate
              title={t('gateAdminTitle')}
              description={t('gateAdminDesc')}
              requiredRole="admin"
            />
          );
        }
        return <AdminDashboard key="page-admin" />;

      case 'trainer':
        if (!currentUser || !currentUser.roles.includes('trainer')) {
          return (
            <AccessDeniedGate
              title={t('gateTrainerTitle')}
              description={t('gateTrainerDesc')}
              requiredRole="trainer"
            />
          );
        }
        return <TrainerPortal key="page-trainer" />;

      case 'parent':
        if (!currentUser || !currentUser.roles.includes('parent')) {
          return (
            <AccessDeniedGate
              title={t('gateParentTitle')}
              description={t('gateParentDesc')}
              requiredRole="parent"
              allowRegister
            />
          );
        }
        return <ParentPortal key="page-parent" />;

      case 'home':
      default:
        return <VisitorPortal key="page-home" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col relative overflow-x-clip">
      {/* overflow-x-clip, not hidden: "hidden" makes this a scroll box and the header would stop staying on top */}
      {/* Top Header with Brand, Navigation & Live Auth State */}
      <Header />

      {/* Main Content Area with fluid animation transition */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Start-up reveal animation: home page only, once per visit */}
      {currentPage === 'home' && <IntroReveal />}

      {/* Global Notifications */}
      <ToastContainer />

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

// Friendly Duolingo-style Access Denied Gate Component
interface AccessDeniedGateProps {
  title: string;
  description: string;
  requiredRole: 'admin' | 'trainer' | 'parent';
  allowRegister?: boolean;
}

const AccessDeniedGate: React.FC<AccessDeniedGateProps> = ({
  title,
  description,
  requiredRole,
  allowRegister
}) => {
  const { navigateTo } = useApp();
  const t = useT(commonMessages);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="max-w-md w-full mx-auto p-8 rounded-3xl duo-card text-center space-y-6 relative"
      >
        {/* Friendly Mascot Avatar */}
        <div className="relative mx-auto w-24 h-24">
          <img
            src={CLUB_PHOTOS.clubAvatar}
            alt={t('logoAlt')}
            className="bg-white w-24 h-24 rounded-full object-cover shadow-md border-4 border-white"
          />
          <div className="absolute -bottom-1 -end-1 w-8 h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-slate-900 shadow-sm">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Speech Bubble text */}
        <div className="duo-speech-bubble text-center space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
            {t('gateHoldOn')}
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => navigateTo('login')}
            className="w-full py-3.5 px-6 btn-duo-green flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('gateSignIn')}</span>
          </button>

          {allowRegister && (
            <button
              onClick={() => navigateTo('register-parent')}
              className="w-full py-3.5 px-6 btn-duo-blue flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('gateRegister')}</span>
            </button>
          )}

          <button
            onClick={() => navigateTo('home')}
            className="w-full py-3 px-6 btn-duo-secondary flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{t('gateBack')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ConfirmProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ConfirmProvider>
    </LanguageProvider>
  );
}
