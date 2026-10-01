/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CLUB_PHOTOS } from './data/initialData';
import { AppProvider, useApp } from './context/AppContext';
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
import { ScheduleMatrixPage } from './pages/ScheduleMatrixPage';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, LogIn, ArrowLeft, UserPlus, Sparkles, Lock, KeyRound } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentPage, navigateTo, currentUser } = useApp();

  // Route security gate: check if user is authorized for protected portal pages
  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage key="page-login" />;

      case 'register-parent':
        return <ParentRegisterPage key="page-register-parent" />;

      case 'schedule-matrix':
        if (!currentUser || (!currentUser.roles.includes('admin') && !currentUser.roles.includes('trainer'))) {
          return (
            <AccessDeniedGate
              title="Trainer & Admin Timetable Matrix"
              description="This view checks schedule conflicts for all classes and rooms. Please sign in as an Administrator or Trainer."
              requiredRole="admin"
            />
          );
        }
        return <ScheduleMatrixPage key="page-schedule-matrix" />;

      case 'admin':
        if (!currentUser || !currentUser.roles.includes('admin')) {
          return (
            <AccessDeniedGate
              title="Admin Space Needs Sign In"
              description="Welcome! To view student rosters, approve waitlists, and manage lab hoodies, please sign in with an Admin account."
              requiredRole="admin"
            />
          );
        }
        return <AdminDashboard key="page-admin" />;

      case 'trainer':
        if (!currentUser || !currentUser.roles.includes('trainer')) {
          return (
            <AccessDeniedGate
              title="Trainer Space Needs Sign In"
              description="Hello Trainer! Sign in to validate syllabus steps, mark attendance, and grade your awesome robotics builders."
              requiredRole="trainer"
            />
          );
        }
        return <TrainerPortal key="page-trainer" />;

      case 'parent':
        if (!currentUser || !currentUser.roles.includes('parent')) {
          return (
            <AccessDeniedGate
              title="Parent Portal Needs Sign In"
              description="Welcome Parents! Sign in or register in 30 seconds to track your child's weekly attendance, remarks, and order club hoodies."
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col relative overflow-x-hidden">
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

      {/* Start-up reveal animation (once per session) */}
      <IntroReveal />

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
            alt="Discovery Club Junior logo"
            className="bg-white w-24 h-24 rounded-full object-cover shadow-md border-4 border-white"
          />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-slate-900 shadow-sm">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Speech Bubble text */}
        <div className="duo-speech-bubble text-center space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
            Hold on there, Friend! 🤖
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
            <span>Sign In to Continue</span>
          </button>

          {allowRegister && (
            <button
              onClick={() => navigateTo('register-parent')}
              className="w-full py-3.5 px-6 btn-duo-blue flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register as a Parent (Instant)</span>
            </button>
          )}

          <button
            onClick={() => navigateTo('home')}
            className="w-full py-3 px-6 btn-duo-secondary flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Fun Page</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
