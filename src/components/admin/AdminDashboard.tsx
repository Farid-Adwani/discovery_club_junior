import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  DollarSign,
  TrendingUp,
  UserPlus,
  Calendar,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Filter,
  Check,
  ClipboardList,
  Printer,
  Sparkles,
  ArrowRight,
  Flame,
  Star,
  ShoppingBag,
  Share2,
  Heart,
  MessageCircle,
  ExternalLink,
  Database,
  Image as ImageIcon,
  Cake,
  LayoutGrid,
  Landmark
} from 'lucide-react';
import { Student, Group, FacebookPost, WEEK_DAYS, WeekDay } from '../../types';
import { weekdayName } from '../../utils/schedule';
import { ShopManager } from './ShopManager';
import { PaymentsManager } from './PaymentsManager';
import { PriceModal } from './PriceModal';
import { AttendanceManager } from './AttendanceManager';
import { AdminNav } from './AdminNav';
import { CashManager } from './CashManager';
import { StudentsManager } from './StudentsManager';
import { AdminHub, AdminSection } from './AdminHub';
import { hubMessages } from '../../i18n/messages/hub';

const ADMIN_SECTIONS = ['overview', 'students', 'groups', 'attendance', 'payments', 'cash', 'inventory', 'team', 'facebook'] as const;
import { ClassesManager } from './ClassesManager';
import { TeamManager } from './TeamManager';
import { teamMessages } from '../../i18n/messages/team';
import { BirthdaysCard } from '../common/BirthdaysCard';
import { birthdayPeople } from '../../utils/birthdays';
import { useConfirm } from '../common/ConfirmProvider';
import { studentsMessages } from '../../i18n/messages/students';
import { ageOf } from '../../utils/age';
import { CLUB_PHOTOS } from '../../data/initialData';
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
    facebookPosts,
    updateStudentStatus,
    updateStudentPrice,
    deleteStudent,
    updateMaterialRequestStatus,
    navigateTo,
    likeFacebookPost,
    addFacebookPost,
    deleteFacebookPost,
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


  // Facebook post creation state
  const [isAddPostOpen, setIsAddPostOpen] = useState(false);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostTag, setNewPostTag] = useState('🏆 Eurobot Champions');
  const [newPostImageUrl, setNewPostImageUrl] = useState(CLUB_PHOTOS.eurobotSpainChampions);
  const adminFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleAdminFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewPostImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

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




  const handleCreateFacebookPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostCaption.trim()) return;

    await addFacebookPost({
      caption: newPostCaption.trim(),
      date: 'À l’instant',
      imageUrl: newPostImageUrl,
      tag: newPostTag,
      postUrl: 'https://www.facebook.com/DiscoveryClubJunior/'
    });

    setIsAddPostOpen(false);
    setNewPostCaption('');
    showToast(t('toastPostPublished'), 'success');
  };

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

      {/* 6. CLUB SHOP TAB */}
      {adminTab === 'inventory' && <ShopManager />}

      {/* 7. FACEBOOK & PHOTO FEED TAB */}
      {adminTab === 'facebook' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black uppercase mb-1">
                <span>{t('fbCollection')}</span>
              </div>
              <h3 className="text-lg font-black text-slate-800">
                {t('fbTitle')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {t('fbSubtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAddPostOpen(true)}
                className="px-4 py-2.5 btn-duo-blue text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t('publishPost')}</span>
              </button>
            </div>
          </div>

          {/* Photo Assets Quick Showcase */}
          <div className="duo-card p-5 bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-500" />
                <span>{t('photoAssetsTitle')}</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-400">{t('photoAssetsHint')}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {[
                { name: t('photoEurobotChampions'), img: CLUB_PHOTOS.eurobotSpainChampions, tag: '🏆 Eurobot Champions' },
                { name: t('photoTrophyCert'), img: CLUB_PHOTOS.eurobotSpainTrophyCert, tag: '🏆 Eurobot Champions' },
                { name: t('photoAwards'), img: CLUB_PHOTOS.eurobotSpainStage, tag: '🏆 Eurobot Champions' },
                { name: t('photoMinistry'), img: CLUB_PHOTOS.ministryHonorCeremony, tag: '🇹🇳 Honneur National' },
                { name: t('photoRobocupVienna'), img: CLUB_PHOTOS.robocupViennaMarxHalle, tag: '🌍 Tournoi International' },
                { name: t('photoRobocupEgypt'), img: CLUB_PHOTOS.robocupJuniorEgypt, tag: '🌍 Tournoi International' },
                { name: t('photoOda'), img: CLUB_PHOTOS.odaRobots2ndPrize, tag: '🏆 Podium National' },
                { name: t('photoEurobotQualif'), img: CLUB_PHOTOS.eurobotJuniorTunisiaQualif, tag: '🇹🇳 Qualifications Nationales' },
                { name: t('photoIstanbul'), img: CLUB_PHOTOS.istanbulAirportEuropeanChamp, tag: '✈️ En Route' },
                { name: t('photoTunisDeparture'), img: CLUB_PHOTOS.airportDepartureTunis, tag: '✈️ En Route' },
                { name: t('photoThaiFriends'), img: CLUB_PHOTOS.internationalFriendsThailand, tag: '🌍 Tournoi International' },
                { name: t('photoFlags'), img: CLUB_PHOTOS.nationsFlags, tag: '🌍 Tournoi International' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setNewPostImageUrl(item.img);
                    setNewPostTag(item.tag);
                    setIsAddPostOpen(true);
                  }}
                  className="rounded-xl overflow-hidden border-2 border-slate-200 hover:border-sky-400 cursor-pointer transition-all hover:scale-105 group relative h-20"
                  title={t('usePhotoTitle', { name: item.name })}
                >
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black">
                    {t('usePhoto')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Posts Grid (scrolls inside its panel) */}
          <div className="scroll-panel scroll-fade max-h-[760px] pe-1 py-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facebookPosts.map((post) => (
              <div key={post.id} className="duo-card p-5 bg-white space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-44 rounded-xl overflow-hidden border-2 border-slate-100 relative">
                    <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover" />
                    <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white font-black text-[10px]">
                      {post.tag}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>{post.date}</span>
                    <span className="font-mono text-sky-600 font-bold">{post.id}</span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-3">
                    {post.caption}
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <button
                      onClick={() => likeFacebookPost(post.id)}
                      className="flex items-center gap-1 hover:text-rose-500 cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <span>{post.likes}</span>
                    </button>
                    <span className="flex items-center gap-1 text-slate-400">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                      title={t('openOnFacebook')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={async () => {
                        const ok = await confirm({ title: t('confirmDeletePost'), confirmLabel: t('deletePost'), danger: true });
                        if (ok) deleteFacebookPost(post.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title={t('deletePost')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create New Facebook Post Modal */}
      {isAddPostOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card p-6 bg-white max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-100">
              <h3 className="text-base font-black text-slate-800">{t('newPostTitle')}</h3>
              <button
                onClick={() => setIsAddPostOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFacebookPost} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">{t('postTag')}</label>
                <select
                  value={newPostTag}
                  onChange={(e) => setNewPostTag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                >
                  <option value="🏆 Eurobot Champions">{t('tagEurobot')}</option>
                  <option value="🇹🇳 Honneur National">{t('tagNationalHonour')}</option>
                  <option value="🌍 Tournoi International">{t('tagInternational')}</option>
                  <option value="🛠️ Ateliers Manouba">{t('tagWorkshops')}</option>
                  <option value="👧 Girls in Tech">{t('tagGirls')}</option>
                  <option value="👕 Les Capuches">{t('tagHoodies')}</option>
                  <option value="🧠 IA & Vision">{t('tagAi')}</option>
                </select>
              </div>

              <div>
                <label className="block mb-1">{t('captionLabel')}</label>
                <textarea
                  rows={4}
                  required
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  placeholder={t('captionPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block mb-1">{t('photoLabel')}</label>
                <input
                  type="file"
                  ref={adminFileInputRef}
                  accept="image/*"
                  onChange={handleAdminFileSelect}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => adminFileInputRef.current?.click()}
                    className="px-3 py-2 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                    <span>{t('chooseFile')}</span>
                  </button>
                  <input
                    type="text"
                    required
                    placeholder={t('photoUrlPlaceholder')}
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {newPostImageUrl && (
                <div className="h-32 rounded-xl overflow-hidden border border-slate-200">
                  <img src={newPostImageUrl} alt={t('preview')} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPostOpen(false)}
                  className="px-4 py-2 btn-duo-secondary text-xs font-bold cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-duo-blue text-xs font-black cursor-pointer"
                >
                  {t('publishToFeed')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly fee: follows the classes unless a custom price is set */}
      {editingStudentPrice && <PriceModal student={editingStudentPrice} onClose={() => setEditingStudentPrice(null)} />}
      </div>
    </div>
  );
};
