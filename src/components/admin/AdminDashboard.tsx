import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  DollarSign,
  TrendingUp,
  UserPlus,
  Package
} from 'lucide-react';
import { Student, Group, WEEK_DAYS, WeekDay } from '../../types';
import { weekdayName } from '../../utils/schedule';
import { ShopManager } from './ShopManager';
import { PaymentsManager } from './PaymentsManager';
import { PriceModal } from './PriceModal';
import { AttendanceManager } from './AttendanceManager';
import { AdminNav } from './AdminNav';
import { CashManager } from './CashManager';
import { StockManager } from './StockManager';
import { StudentsManager } from './StudentsManager';
import { AdminHub, AdminSection } from './AdminHub';
import { hubMessages } from '../../i18n/messages/hub';

const ADMIN_SECTIONS = ['overview', 'students', 'groups', 'attendance', 'payments', 'cash', 'stock', 'inventory', 'team', 'site'] as const;
import { ClassesManager } from './ClassesManager';
import { TeamManager } from './TeamManager';
import { LandingEditor } from './LandingEditor';
import { teamMessages } from '../../i18n/messages/team';
import { BirthdaysCard } from '../common/BirthdaysCard';
import { birthdayPeople } from '../../utils/birthdays';
import { useConfirm } from '../common/ConfirmProvider';
import { studentsMessages } from '../../i18n/messages/students';
import { ageOf } from '../../utils/age';
import { ltr, useT, useLanguage } from '../../i18n';
import { adminMessages } from '../../i18n/messages/admin';

export const AdminDashboard: React.FC = () => {
  const {
    students,
    trainers,
    groups,
    staffMembers,
    adminProfiles,
    sessions,
    materialRequests,
    updateStudentStatus,
    updateStudentPrice,
    deleteStudent,
    updateMaterialRequestStatus,
    navigateTo,
    isFirebaseConnected,
    showToast
  } = useApp();
  const t = useT(adminMessages);
  const { locale } = useLanguage();

  const paymentStatusLabel = (status: string) =>
    status === 'paid' ? t('payPaid') : status === 'pending' ? t('payPending') : status === 'scholarship' ? t('payScholarship') : status;
  const dayLabel = (day: string) =>
    (WEEK_DAYS as readonly string[]).includes(day) ? weekdayName(day as WeekDay, locale) : day;

  // 'home' is the start screen with one tile per section; the open section is kept in the address bar (#/admin/students)
  const sectionFromHash = (): 'home' | AdminSection => {
    const sub = window.location.hash.replace(/^#\/?/, '').split('/')[1] || '';
    return (ADMIN_SECTIONS as readonly string[]).includes(sub) ? (sub as AdminSection) : 'home';
  };
  const [adminTab, setAdminTabState] = useState<'home' | AdminSection>(sectionFromHash);
  const setAdminTab = (tab: 'home' | AdminSection) => {
    setAdminTabState(tab);
    const hash = tab === 'home' ? '#/admin' : `#/admin/${tab}`;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Browser Back / Forward between sections
  useEffect(() => {
    const onPop = () => setAdminTabState(sectionFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);



  const confirm = useConfirm();
  const tst = useT(studentsMessages);
  const tteam = useT(teamMessages);
  const thub = useT(hubMessages);

  // Price override modal state
  const [editingStudentPrice, setEditingStudentPrice] = useState<Student | null>(null);


  // Computed metrics
  // Enrolled = accepted and placed in at least one class
  const acceptedAll = students.filter((s) => s.status === 'accepted');
  const activeStudents = acceptedAll.filter((s) => s.groupIds.length > 0);
  const waitlistStudents = students.filter((s) => s.status === 'waitlist');
  const acceptedStudents = acceptedAll.filter((s) => s.groupIds.length === 0);

  const totalMonthlyRevenue = activeStudents.reduce((sum, s) => {
    return sum + (s.customMonthlyPrice !== undefined ? s.customMonthlyPrice : s.standardMonthlyPrice);
  }, 0);

  // Occupancy only makes sense for classes with a limit on the number of children
  const limitedGroups = groups.filter((g) => g.maxCapacity);
  const totalCapacity = limitedGroups.reduce((sum, g) => sum + (g.maxCapacity || 0), 0);
  const seatsTaken = limitedGroups.reduce((sum, g) => sum + students.filter((s) => s.groupIds.includes(g.id)).length, 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((seatsTaken / totalCapacity) * 100) : null;




  if (adminTab === 'home') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <AdminNav active="home" onOpen={setAdminTab} />
        <div className="pt-6">
          <AdminHub onOpen={setAdminTab} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      <AdminNav active={adminTab} onOpen={setAdminTab} />
      <div className="pt-6 space-y-8">
      {/* 1. OVERVIEW TAB */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="duo-card duo-card-glow-blue p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>{t('kpiEnrolled')}</span>
                <Users className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-3xl font-black text-slate-800 font-mono">
                {activeStudents.length}
              </div>
              <div className="text-[11px] font-bold text-sky-600">
                {t('kpiEnrolledSub', { count: acceptedStudents.length })}
              </div>
            </div>

            <div className="duo-card duo-card-glow-green p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>{t('kpiRevenue')}</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-600 font-mono">
                {totalMonthlyRevenue.toLocaleString(locale)} <span className="text-sm font-normal text-slate-400">{t('perMonth')}</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-700">
                {t('kpiRevenueSub', { amount: Math.round(totalMonthlyRevenue / (activeStudents.length || 1)) })}
              </div>
            </div>

            <div className="duo-card duo-card-glow-yellow p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>{t('kpiWaitlist')}</span>
                <UserPlus className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-500 font-mono">
                {waitlistStudents.length}
              </div>
              <div className="text-[11px] font-bold text-amber-700">
                {t('kpiWaitlistSub')}
              </div>
            </div>

            <div className="duo-card duo-card-glow-purple p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>{t('kpiOccupancy')}</span>
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-purple-600 font-mono">
                {occupancyRate === null ? '—' : `${occupancyRate}%`}
              </div>
              <div className="text-[11px] font-bold text-purple-700">
                {occupancyRate === null ? t('kpiOccupancyNone') : t('kpiOccupancySub', { active: seatsTaken, total: totalCapacity })}
              </div>
            </div>
          </div>

          {/* Birthdays in the coming week */}
          <BirthdaysCard people={birthdayPeople(students, trainers, staffMembers, adminProfiles)} onManage={() => setAdminTab('team')} />

          {/* Quick Action Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Waitlist Review Widget */}
            <div className="duo-card p-6 bg-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-500" />
                  <span>{t('waitlistWidgetTitle', { count: waitlistStudents.length })}</span>
                </h3>
                <button
                  onClick={() => setAdminTab('students')}
                  className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                >
                  {t('manageAll')} <span className="inline-block rtl:rotate-180">&rarr;</span>
                </button>
              </div>

              {waitlistStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  {t('queueClear')}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {waitlistStudents.slice(0, 3).map((st) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-black text-slate-800 text-xs">
                          {t('studentWithAge', { name: st.studentName, age: ageOf(st) })}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {t('parentLine', { name: st.parentName, phone: ltr(st.parentPhone) })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => updateStudentStatus(st.id, 'accepted')}
                          className="px-3 py-1.5 btn-duo-green text-xs font-black cursor-pointer"
                        >
                          {tst('accept')}
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: tst('confirmDeleteTitle', { name: st.studentName }),
                              message: tst('confirmDeleteText'),
                              confirmLabel: t('decline'),
                              danger: true
                            });
                            if (ok) deleteStudent(st.id);
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-500 text-xs font-bold cursor-pointer"
                        >
                          {t('decline')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Material Requisitions Widget */}
            <div className="duo-card p-6 bg-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-500" />
                  <span>{t('requisitionsTitle', { count: materialRequests.filter((r) => r.status === 'pending').length })}</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">{t('labLogistics')}</span>
              </div>

              {materialRequests.filter((r) => r.status === 'pending').length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  {t('requestsFulfilled')}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {materialRequests
                    .filter((r) => r.status === 'pending')
                    .map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-800 text-xs">
                            {req.itemsNeeded} ({req.quantity})
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {t('requestedBy', { trainer: req.trainerName, group: req.groupName, date: req.sessionDate })}
                          </div>
                        </div>
                        <button
                          onClick={() => updateMaterialRequestStatus(req.id, 'delivered')}
                          className="px-3 py-1.5 btn-duo-blue text-xs font-black cursor-pointer shrink-0"
                        >
                          {t('markDelivered')}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {adminTab === 'team' && <TeamManager />}
      {adminTab === 'site' && <LandingEditor />}

      {/* 2. STUDENTS / WAITLIST TAB */}
      {adminTab === 'students' && (
        <StudentsManager
          onEditPrice={setEditingStudentPrice}
        />
      )}

      {/* 3. CLASSES TAB */}
      {adminTab === 'groups' && <ClassesManager />}

      {/* 4. ATTENDANCE: one sheet per class and date, shared with the trainer portal */}
      {adminTab === 'attendance' && <AttendanceManager />}

      {/* 5. PAYMENTS & TUITION TAB */}
      {adminTab === 'payments' && (
        <PaymentsManager
          onEditPrice={setEditingStudentPrice}
        />
      )}

      {/* Club cash book */}
      {adminTab === 'cash' && <CashManager />}
      {adminTab === 'stock' && <StockManager />}

      {/* 6. CLUB SHOP TAB */}
      {adminTab === 'inventory' && <ShopManager />}

      {/* Monthly fee: follows the classes unless a custom price is set */}
      {editingStudentPrice && <PriceModal student={editingStudentPrice} onClose={() => setEditingStudentPrice(null)} />}
      </div>
    </div>
  );
};
