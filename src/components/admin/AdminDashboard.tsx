import React, { useState } from 'react';
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
  Edit2,
  Trash2,
  Plus,
  Search,
  Filter,
  Check,
  ClipboardList,
  Printer,
  Sparkles,
  BookOpen,
  ArrowRight,
  Flame,
  Star,
  ShoppingBag,
  Share2,
  Heart,
  MessageCircle,
  ExternalLink,
  Database,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { HoodieSize, Student, Group, FacebookPost } from '../../types';
import { CLUB_PHOTOS } from '../../data/initialData';

export const AdminDashboard: React.FC = () => {
  const {
    students,
    programs,
    trainers,
    groups,
    hoodieStock,
    hoodieDistributions,
    sessions,
    materialRequests,
    facebookPosts,
    updateStudentStatus,
    updateStudentPrice,
    assignStudentToGroup,
    removeStudentFromGroup,
    deleteStudent,
    createGroup,
    updateGroup,
    deleteGroup,
    addHoodieStock,
    updateHoodieStatus,
    addProgramObjective,
    updateMaterialRequestStatus,
    navigateTo,
    likeFacebookPost,
    addFacebookPost,
    deleteFacebookPost,
    syncInitialDataToFirestore,
    isFirebaseConnected,
    showToast
  } = useApp();

  const [adminTab, setAdminTab] = useState<
    'overview' | 'students' | 'groups' | 'attendance' | 'payments' | 'curriculum' | 'inventory' | 'facebook'
  >('overview');

  const [studentFilter, setStudentFilter] = useState<'all' | 'waitlist' | 'accepted' | 'active'>('all');
  const [studentSearch, setStudentSearch] = useState('');

  // Group creation modal state
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupProg, setNewGroupProg] = useState(programs[0]?.id || '');
  const [newGroupTrainerIds, setNewGroupTrainerIds] = useState<string[]>(trainers[0] ? [trainers[0].id] : []);
  const [newGroupDay, setNewGroupDay] = useState<'Saturday' | 'Sunday' | 'Wednesday'>('Saturday');
  const [newGroupTime, setNewGroupTime] = useState('09:00 - 11:00');
  const [newGroupRoom, setNewGroupRoom] = useState('Mechatronics Lab A');
  const [newGroupCap, setNewGroupCap] = useState(8);

  // Price override modal state
  const [editingStudentPrice, setEditingStudentPrice] = useState<Student | null>(null);
  const [customPriceVal, setCustomPriceVal] = useState<number>(0);
  const [paymentStatusVal, setPaymentStatusVal] = useState<Student['paymentStatus']>('paid');

  // Call list group selection
  const [selectedCallListGroupId, setSelectedCallListGroupId] = useState(groups[0]?.id || '');

  // Restock modal state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockSize, setRestockSize] = useState<HoodieSize>('8-10Y');
  const [restockAmount, setRestockAmount] = useState(5);

  // Curriculum insertion form state
  const [curriculumProgId, setCurriculumProgId] = useState(programs[0]?.id || '');
  const [newObjWeek, setNewObjWeek] = useState(5);
  const [newObjTitle, setNewObjTitle] = useState('');
  const [newObjDesc, setNewObjDesc] = useState('');
  const [newObjHw, setNewObjHw] = useState('');

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
  const activeStudents = students.filter((s) => s.status === 'active');
  const waitlistStudents = students.filter((s) => s.status === 'waitlist');
  const acceptedStudents = students.filter((s) => s.status === 'accepted');

  const totalMonthlyRevenue = activeStudents.reduce((sum, s) => {
    return sum + (s.customMonthlyPrice !== undefined ? s.customMonthlyPrice : s.standardMonthlyPrice);
  }, 0);

  const totalCapacity = groups.reduce((sum, g) => sum + g.maxCapacity, 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((activeStudents.length / totalCapacity) * 100) : 0;

  // Filtered student list
  const filteredStudents = students.filter((s) => {
    const matchesFilter = studentFilter === 'all' ? true : s.status === studentFilter;
    const matchesSearch =
      s.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.parentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.parentPhone.includes(studentSearch);
    return matchesFilter && matchesSearch;
  });

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    if (newGroupTrainerIds.length === 0) {
      showToast('Choose at least one trainer for this class', 'error');
      return;
    }

    createGroup({
      name: newGroupName,
      programId: newGroupProg,
      trainerIds: newGroupTrainerIds,
      dayOfWeek: newGroupDay,
      timeSlot: newGroupTime,
      room: newGroupRoom,
      maxCapacity: Number(newGroupCap)
    });

    setIsAddGroupOpen(false);
    setNewGroupName('');
  };

  const handleSavePriceOverride = () => {
    if (!editingStudentPrice) return;
    updateStudentPrice(editingStudentPrice.id, customPriceVal, paymentStatusVal);
    setEditingStudentPrice(null);
  };

  const handleAddCurriculumObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjTitle || !newObjDesc) return;

    addProgramObjective(curriculumProgId, {
      week: Number(newObjWeek),
      title: newObjTitle,
      description: newObjDesc,
      hardware: newObjHw || 'Sensors & Circuit kit'
    });

    setNewObjTitle('');
    setNewObjDesc('');
    setNewObjHw('');
  };

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
    showToast('Published Facebook post to Firestore database!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase mb-1">
            <Layers className="w-4 h-4" />
            <span>Administrative Command Space</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Discovery Junior Operations & Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage student rosters, approve waitlists, assign groups, and track hoodie inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Firestore DB Status */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-600">
            <span className={`w-2.5 h-2.5 rounded-full ${isFirebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isFirebaseConnected ? 'Firestore Connected' : 'Connecting to DB...'}</span>
          </div>

          {/* Sync All Initial Data to Firestore */}
          <button
            onClick={syncInitialDataToFirestore}
            className="px-3.5 py-2.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer text-sky-700"
            title="Seed/Sync all Facebook posts and club data to Firestore"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync DB</span>
          </button>

          <button
            onClick={() => navigateTo('schedule-matrix')}
            className="px-4 py-2.5 btn-duo-secondary text-xs font-black flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-sky-500" />
            <span>Schedule Matrix &rarr;</span>
          </button>
        </div>
      </div>

      {/* Admin Subtabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview & KPIs', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'students', label: `Waitlist & Students (${students.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'groups', label: `Classes (${groups.length})`, icon: <Calendar className="w-4 h-4" /> },
          { id: 'attendance', label: 'Attendance Call Lists', icon: <ClipboardList className="w-4 h-4" /> },
          { id: 'payments', label: 'Payments & Tuition', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'inventory', label: '“Les Capuches” Inventory', icon: <Package className="w-4 h-4" /> },
          { id: 'curriculum', label: 'Curriculum Builder', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'facebook', label: `Facebook Feed (${facebookPosts.length})`, icon: <Share2 className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              adminTab === tab.id
                ? 'btn-duo-yellow'
                : 'btn-duo-secondary'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="duo-card duo-card-glow-blue p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>ENROLLED STUDENTS</span>
                <Users className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-3xl font-black text-slate-800 font-mono">
                {activeStudents.length}
              </div>
              <div className="text-[11px] font-bold text-sky-600">
                +{acceptedStudents.length} accepted, awaiting a class
              </div>
            </div>

            <div className="duo-card duo-card-glow-green p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>MONTHLY RECURRING TUITION</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-600 font-mono">
                {totalMonthlyRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-400">DT/mo</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-700">
                Avg. {Math.round(totalMonthlyRevenue / (activeStudents.length || 1))} DT / student
              </div>
            </div>

            <div className="duo-card duo-card-glow-yellow p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>PENDING WAITLIST QUEUE</span>
                <UserPlus className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-500 font-mono">
                {waitlistStudents.length}
              </div>
              <div className="text-[11px] font-bold text-amber-700">
                Awaiting director intake review
              </div>
            </div>

            <div className="duo-card duo-card-glow-purple p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>LAB OCCUPANCY RATE</span>
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-purple-600 font-mono">
                {occupancyRate}%
              </div>
              <div className="text-[11px] font-bold text-purple-700">
                {activeStudents.length} of {totalCapacity} seats occupied
              </div>
            </div>
          </div>

          {/* Quick Action Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Waitlist Review Widget */}
            <div className="duo-card p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-500" />
                  <span>Immediate Waitlist Applications ({waitlistStudents.length})</span>
                </h3>
                <button
                  onClick={() => setAdminTab('students')}
                  className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                >
                  Manage all &rarr;
                </button>
              </div>

              {waitlistStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  Queue is clear. No pending waitlist applications!
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
                          {st.studentName} ({st.studentAge} yrs)
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Parent: {st.parentName} · {st.parentPhone}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => updateStudentStatus(st.id, 'accepted')}
                          className="px-3 py-1.5 btn-duo-green text-xs font-black cursor-pointer"
                        >
                          Admit
                        </button>
                        <button
                          onClick={() => deleteStudent(st.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-500 text-xs font-bold cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Material Requisitions Widget */}
            <div className="duo-card p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-500" />
                  <span>Trainer Equipment Requisitions ({materialRequests.filter((r) => r.status === 'pending').length})</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">Manouba Lab Logistics</span>
              </div>

              {materialRequests.filter((r) => r.status === 'pending').length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  All trainer equipment requests fulfilled.
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
                            Req by {req.trainerName} for {req.groupName} · Needed: {req.sessionDate}
                          </div>
                        </div>
                        <button
                          onClick={() => updateMaterialRequestStatus(req.id, 'delivered')}
                          className="px-3 py-1.5 btn-duo-blue text-xs font-black cursor-pointer shrink-0"
                        >
                          Mark Delivered
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. STUDENTS / WAITLIST TAB */}
      {adminTab === 'students' && (
        <div className="duo-card p-6 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student or parent phone..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white w-64"
                />
              </div>

              <div className="flex items-center gap-1">
                {(['all', 'waitlist', 'accepted', 'active'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStudentFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                      studentFilter === filter
                        ? 'btn-duo-yellow'
                        : 'btn-duo-secondary'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs font-bold text-slate-400">
              Showing {filteredStudents.length} of {students.length} students
            </div>
          </div>

          <div className="scroll-panel max-h-[560px] rounded-2xl border-2 border-slate-100">
            <table className="data-table w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-black">
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3">Age</th>
                  <th className="pb-3">Parent Info</th>
                  <th className="pb-3">Track & Status</th>
                  <th className="pb-3">Class</th>
                  <th className="pb-3">Tuition Override</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => {
                  const program = programs.find((p) => p.id === st.programId);
                  const studentGroups = groups.filter((g) => st.groupIds.includes(g.id));

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-black text-slate-800">
                        {st.studentName}
                        {st.notes && (
                          <span className="block text-[10px] text-slate-400 font-medium italic">
                            {st.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600">{st.studentAge} yrs</td>
                      <td className="py-3">
                        <div className="font-bold text-slate-700">{st.parentName}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{st.parentPhone}</div>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-800 font-black">
                          {[...new Set(studentGroups.map((g) => programs.find((p) => p.id === g.programId)?.title).filter(Boolean))].join(', ') ||
                            program?.title ||
                            'Not placed yet'}
                        </div>
                        <span
                          className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            st.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.status === 'accepted'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="space-y-1.5">
                          {studentGroups.map((g) => (
                            <div
                              key={g.id}
                              className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-sky-50 border border-sky-200"
                            >
                              <div>
                                <span className="font-black text-slate-800">{g.name}</span>
                                <span className="block text-[10px] text-slate-400">
                                  {g.dayOfWeek} · {g.timeSlot}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStudentFromGroup(st.id, g.id)}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer font-black"
                                title={`Remove from ${g.name}`}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          {groups.some((g) => !st.groupIds.includes(g.id)) && (
                            <select
                              value=""
                              onChange={(e) => e.target.value && assignStudentToGroup(st.id, e.target.value)}
                              className="px-2 py-1 bg-white border-2 border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
                            >
                              <option value="" disabled>{studentGroups.length ? '+ Add another class...' : 'Add to class...'}</option>
                              {groups
                                .filter((g) => !st.groupIds.includes(g.id))
                                .map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name} ({g.dayOfWeek})
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => {
                            setEditingStudentPrice(st);
                            setCustomPriceVal(st.customMonthlyPrice !== undefined ? st.customMonthlyPrice : st.standardMonthlyPrice);
                            setPaymentStatusVal(st.paymentStatus);
                          }}
                          className="flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-sky-600 cursor-pointer"
                        >
                          <span>{st.customMonthlyPrice !== undefined ? `${st.customMonthlyPrice} DT` : `${st.standardMonthlyPrice} DT`}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-black ${
                              st.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : st.paymentStatus === 'scholarship'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {st.paymentStatus}
                          </span>
                          <Edit2 className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {st.status === 'waitlist' && (
                            <button
                              onClick={() => updateStudentStatus(st.id, 'accepted')}
                              className="px-2.5 py-1 btn-duo-green text-xs font-black cursor-pointer"
                            >
                              Admit
                            </button>
                          )}
                          {st.status === 'accepted' && (
                            <button
                              onClick={() => updateStudentStatus(st.id, 'active')}
                              className="px-2.5 py-1 btn-duo-blue text-xs font-black cursor-pointer"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => deleteStudent(st.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Remove Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CLASSES TAB */}
      {adminTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800">
              Classes, Schedules & Labs
            </h3>
            <button
              onClick={() => setIsAddGroupOpen(true)}
              className="px-4 py-2 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((grp) => {
              const enrolledInGroup = students.filter((s) => s.groupIds.includes(grp.id));
              const prog = programs.find((p) => p.id === grp.programId);
              const isFull = enrolledInGroup.length >= grp.maxCapacity;

              return (
                <div key={grp.id} className="duo-card p-6 bg-white space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{grp.name}</h4>
                      <span className="text-[11px] text-sky-600 font-bold">{prog?.title}</span>
                    </div>
                    <button
                      onClick={() => deleteGroup(grp.id)}
                      className="text-slate-300 hover:text-rose-500 cursor-pointer p-1"
                      title="Delete class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs font-medium text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400">Day & Time:</span>
                      <span className="font-black text-slate-800">{grp.dayOfWeek} · {grp.timeSlot}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400">Lab Room:</span>
                      <span className="font-bold text-slate-700">{grp.room}</span>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-400">Trainers (click to add / remove):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {trainers.map((t) => {
                          const isAssigned = grp.trainerIds.includes(t.id);
                          const isLastOne = isAssigned && grp.trainerIds.length === 1;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={isLastOne}
                              title={isLastOne ? 'A class needs at least one trainer' : undefined}
                              onClick={() =>
                                updateGroup({
                                  ...grp,
                                  trainerIds: isAssigned
                                    ? grp.trainerIds.filter((id) => id !== t.id)
                                    : [...grp.trainerIds, t.id]
                                })
                              }
                              className={`px-2.5 py-1 rounded-full text-[11px] font-black border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                                isAssigned
                                  ? 'bg-sky-500 text-white border-sky-600'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'
                              }`}
                            >
                              {isAssigned ? '✓ ' : '+ '}
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Roster Capacity:</span>
                      <span className={isFull ? 'text-rose-600 font-black' : 'text-slate-700 font-black'}>
                        {enrolledInGroup.length} / {grp.maxCapacity} seats ({Math.round((enrolledInGroup.length / grp.maxCapacity) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (enrolledInGroup.length / grp.maxCapacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ATTENDANCE CALL LIST TAB */}
      {adminTab === 'attendance' && (
        <div className="duo-card p-6 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Official Printed Call Lists & Pedagogical Records
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Export and inspect weekly student presence and evaluations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCallListGroupId}
                onChange={(e) => setSelectedCallListGroupId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.dayOfWeek})
                  </option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Call List</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase">
              Roster for {groups.find((g) => g.id === selectedCallListGroupId)?.name}
            </h4>

            <div className="scroll-panel max-h-[560px] rounded-2xl border-2 border-slate-100">
              <table className="data-table w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-black">
                    <th className="pb-2">Student Name</th>
                    <th className="pb-2">Age</th>
                    <th className="pb-2">Emergency Phone</th>
                    <th className="pb-2">Attendance Streak</th>
                    <th className="pb-2">Latest Teacher Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => s.groupIds.includes(selectedCallListGroupId))
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 font-black text-slate-800">{s.studentName}</td>
                        <td className="py-3 text-slate-600">{s.studentAge} yrs</td>
                        <td className="py-3 font-mono text-slate-700">{s.parentPhone}</td>
                        <td className="py-3 text-emerald-600 font-bold">100% Present 🔥</td>
                        <td className="py-3 text-slate-500 italic font-medium">
                          Great motor mechanics problem-solving.
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. PAYMENTS & TUITION TAB */}
      {adminTab === 'payments' && (
        <div className="duo-card p-6 bg-white space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Tuition Ledger & Custom Pricing
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Override standard course fees for sibling discounts and full scholarships.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-400">Total Monthly Invoiced</div>
              <div className="text-2xl font-black text-emerald-600 font-mono">
                {totalMonthlyRevenue.toLocaleString()} DT
              </div>
            </div>
          </div>

          <div className="scroll-panel max-h-[560px] rounded-2xl border-2 border-slate-100">
            <table className="data-table w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black">
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Parent Contact</th>
                  <th className="pb-2">Track</th>
                  <th className="pb-2">Standard Fee</th>
                  <th className="pb-2">Effective Fee</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50">
                    <td className="py-3 font-black text-slate-800">{st.studentName}</td>
                    <td className="py-3 text-slate-600">{st.parentName} ({st.parentPhone})</td>
                    <td className="py-3 font-bold text-slate-700">{st.programId || '—'}</td>
                    <td className="py-3 font-mono text-slate-400">{st.standardMonthlyPrice} DT</td>
                    <td className="py-3 font-mono font-black text-emerald-600">
                      {st.customMonthlyPrice !== undefined ? st.customMonthlyPrice : st.standardMonthlyPrice} DT
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          st.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : st.paymentStatus === 'scholarship'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {st.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingStudentPrice(st);
                          setCustomPriceVal(st.customMonthlyPrice !== undefined ? st.customMonthlyPrice : st.standardMonthlyPrice);
                          setPaymentStatusVal(st.paymentStatus);
                        }}
                        className="px-2.5 py-1 btn-duo-secondary text-xs font-black cursor-pointer"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. INVENTORY: "LES CAPUCHES" TAB */}
      {adminTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">
                “Les Capuches” Merchandise & Distribution Warehouse
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Track physical inventory and student custom embroidery orders.
              </p>
            </div>
            <button
              onClick={() => setIsRestockOpen(true)}
              className="px-4 py-2 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Restock Inventory</span>
            </button>
          </div>

          {/* Size Stock Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(hoodieStock).map(([size, count]) => (
              <div key={size} className="duo-card p-4 bg-white text-center space-y-1">
                <span className="text-xs font-bold text-slate-400">Size {size}</span>
                <div className={`text-2xl font-black font-mono ${count < 2 ? 'text-rose-500' : 'text-slate-800'}`}>
                  {count}
                </div>
                <span className={`text-[10px] font-black uppercase ${count < 2 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {count < 2 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            ))}
          </div>

          {/* Distribution Orders List */}
          <div className="duo-card p-6 bg-white space-y-4">
            <h4 className="text-sm font-black text-slate-800">Member Orders & Pickup Queue</h4>
            <div className="scroll-panel max-h-[560px] rounded-2xl border-2 border-slate-100">
              <table className="data-table w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-black">
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Size</th>
                    <th className="pb-2">Custom Name Badge</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Order Status</th>
                    <th className="pb-2 text-right">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hoodieDistributions.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="py-3 font-black text-slate-800">{order.studentName}</td>
                      <td className="py-3 font-mono">{order.size}</td>
                      <td className="py-3">
                        {order.isPersonalized ? (
                          <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                            {order.personalizedText || order.studentName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Standard</span>
                        )}
                      </td>
                      <td className="py-3 font-mono font-bold">{order.price} DT</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            order.status === 'picked_up'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'ready'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {order.status !== 'picked_up' && (
                          <button
                            onClick={() =>
                              updateHoodieStatus(order.id, order.status === 'requested' ? 'ready' : 'picked_up')
                            }
                            className="px-2.5 py-1 btn-duo-yellow text-[11px] font-black cursor-pointer"
                          >
                            Mark {order.status === 'requested' ? 'Ready' : 'Picked Up'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. CURRICULUM BUILDER TAB */}
      {adminTab === 'curriculum' && (
        <div className="duo-card p-6 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">
                STEM Curriculum Builder & Weekly Objectives
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Add progressive coding and engineering milestones synced to the database.
              </p>
            </div>

            <select
              value={curriculumProgId}
              onChange={(e) => setCurriculumProgId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAddCurriculumObjective} className="space-y-4 max-w-xl text-xs font-bold text-slate-700">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block mb-1">Week Number:</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newObjWeek}
                  onChange={(e) => setNewObjWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="block mb-1">Milestone Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ultrasonic Radar Mapping"
                  value={newObjTitle}
                  onChange={(e) => setNewObjTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1">Hardware / Kits Required:</label>
              <input
                type="text"
                placeholder="e.g. ESP32 + HC-SR04 ultrasonic sensor"
                value={newObjHw}
                onChange={(e) => setNewObjHw(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block mb-1">Objective Description:</label>
              <textarea
                rows={2}
                required
                value={newObjDesc}
                onChange={(e) => setNewObjDesc(e.target.value)}
                placeholder="What will the kids build and code?"
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 btn-duo-green text-xs font-black cursor-pointer"
            >
              Save Objective to Syllabus
            </button>
          </form>
        </div>
      )}

      {/* 8. FACEBOOK & PHOTO FEED TAB */}
      {adminTab === 'facebook' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black uppercase mb-1">
                <span>📱 Firestore Collection: facebook_posts</span>
              </div>
              <h3 className="text-lg font-black text-slate-800">
                Official Facebook Posts & Photo Asset Manager
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Publish new community updates, inspect photos, monitor likes & comments in real-time.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAddPostOpen(true)}
                className="px-4 py-2.5 btn-duo-blue text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Publish Post</span>
              </button>

              <button
                onClick={syncInitialDataToFirestore}
                className="px-3.5 py-2.5 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer text-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-sync Scraped Data</span>
              </button>
            </div>
          </div>

          {/* Photo Assets Quick Showcase */}
          <div className="duo-card p-5 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-500" />
                <span>Available Authentic Photo Assets (From Facebook Page)</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-400">Click any photo to use for new post</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {[
                { name: 'Eurobot Champions', img: CLUB_PHOTOS.eurobotSpainChampions, tag: '🏆 Eurobot Champions' },
                { name: 'Trophée Certificat', img: CLUB_PHOTOS.eurobotSpainTrophyCert, tag: '🏆 Eurobot Champions' },
                { name: 'Remise des Prix', img: CLUB_PHOTOS.eurobotSpainStage, tag: '🏆 Eurobot Champions' },
                { name: 'Honneur Ministère', img: CLUB_PHOTOS.ministryHonorCeremony, tag: '🇹🇳 Honneur National' },
                { name: 'RoboCup Vienne', img: CLUB_PHOTOS.robocupViennaMarxHalle, tag: '🌍 Tournoi International' },
                { name: 'RoboCup Égypte', img: CLUB_PHOTOS.robocupJuniorEgypt, tag: '🌍 Tournoi International' },
                { name: 'ODA Robots 2ème Prix', img: CLUB_PHOTOS.odaRobots2ndPrize, tag: '🏆 Podium National' },
                { name: 'Qualif. Eurobot Tunisie', img: CLUB_PHOTOS.eurobotJuniorTunisiaQualif, tag: '🇹🇳 Qualifications Nationales' },
                { name: 'Aéroport Istanbul', img: CLUB_PHOTOS.istanbulAirportEuropeanChamp, tag: '✈️ En Route' },
                { name: 'Départ Tunis', img: CLUB_PHOTOS.airportDepartureTunis, tag: '✈️ En Route' },
                { name: 'Amis Thaïlande', img: CLUB_PHOTOS.internationalFriendsThailand, tag: '🌍 Tournoi International' },
                { name: 'Drapeaux du Monde', img: CLUB_PHOTOS.nationsFlags, tag: '🌍 Tournoi International' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setNewPostImageUrl(item.img);
                    setNewPostTag(item.tag);
                    setIsAddPostOpen(true);
                  }}
                  className="rounded-xl overflow-hidden border-2 border-slate-200 hover:border-sky-400 cursor-pointer transition-all hover:scale-105 group relative h-20"
                  title={`Use photo: ${item.name}`}
                >
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black">
                    Use Photo
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Posts Grid (scrolls inside its panel) */}
          <div className="scroll-panel scroll-fade max-h-[760px] pr-1 py-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facebookPosts.map((post) => (
              <div key={post.id} className="duo-card p-5 bg-white space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-44 rounded-xl overflow-hidden border-2 border-slate-100 relative">
                    <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white font-black text-[10px]">
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
                      title="Open on Facebook"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => deleteFacebookPost(post.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Post"
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
              <h3 className="text-base font-black text-slate-800">Publish New Facebook Post</h3>
              <button
                onClick={() => setIsAddPostOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFacebookPost} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Post Category / Tag:</label>
                <select
                  value={newPostTag}
                  onChange={(e) => setNewPostTag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                >
                  <option value="🏆 Eurobot Champions">🏆 Eurobot Champions</option>
                  <option value="🇹🇳 Honneur National">🇹🇳 Honneur National</option>
                  <option value="🌍 Tournoi International">🌍 Tournoi International</option>
                  <option value="🛠️ Ateliers Manouba">🛠️ Ateliers Manouba</option>
                  <option value="👧 Girls in Tech">👧 Girls in Tech</option>
                  <option value="👕 Les Capuches">👕 Les Capuches</option>
                  <option value="🧠 IA & Vision">🧠 IA & Vision</option>
                </select>
              </div>

              <div>
                <label className="block mb-1">Caption / French Text *</label>
                <textarea
                  rows={4}
                  required
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  placeholder="Écrivez le message de publication..."
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block mb-1">Photo :</label>
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
                    <span>Choisir fichier</span>
                  </button>
                  <input
                    type="text"
                    required
                    placeholder="ou collez l'URL/chemin de la photo..."
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {newPostImageUrl && (
                <div className="h-32 rounded-xl overflow-hidden border border-slate-200">
                  <img src={newPostImageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPostOpen(false)}
                  className="px-4 py-2 btn-duo-secondary text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-duo-blue text-xs font-black cursor-pointer"
                >
                  Publish to Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card p-6 bg-white max-w-sm w-full space-y-4">
            <h3 className="text-base font-black text-slate-800">Restock Hoodie Inventory</h3>
            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Select Size:</label>
                <select
                  value={restockSize}
                  onChange={(e) => setRestockSize(e.target.value as HoodieSize)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                >
                  {(['6-8Y', '8-10Y', '10-12Y', '12-14Y', 'S', 'M', 'L'] as HoodieSize[]).map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">Quantity to Add:</label>
                <input
                  type="number"
                  min={1}
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRestockOpen(false)}
                className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addHoodieStock(restockSize, restockAmount);
                  setIsRestockOpen(false);
                }}
                className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Price Modal */}
      {editingStudentPrice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card p-6 bg-white max-w-sm w-full space-y-4">
            <h3 className="text-base font-black text-slate-800">
              Pricing Override: {editingStudentPrice.studentName}
            </h3>
            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Monthly Tuition (DT):</label>
                <input
                  type="number"
                  value={customPriceVal}
                  onChange={(e) => setCustomPriceVal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block mb-1">Payment Status:</label>
                <select
                  value={paymentStatusVal}
                  onChange={(e) => setPaymentStatusVal(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="scholarship">Scholarship (Free/Sponsored)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingStudentPrice(null)}
                className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePriceOverride}
                className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card p-6 bg-white max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-slate-800">Create New Class</h3>
            <form onSubmit={handleCreateGroupSubmit} className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Saturday Explorers Gamma"
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Program Track:</label>
                  <select
                    value={newGroupProg}
                    onChange={(e) => setNewGroupProg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Trainers:</label>
                  <div className="space-y-1 max-h-28 overflow-y-auto p-2 bg-slate-50 border-2 border-slate-200 rounded-xl">
                    {trainers.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newGroupTrainerIds.includes(t.id)}
                          onChange={(e) =>
                            setNewGroupTrainerIds((prev) =>
                              e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)
                            )
                          }
                        />
                        <span>{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Day of Week:</label>
                  <select
                    value={newGroupDay}
                    onChange={(e) => setNewGroupDay(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Wednesday">Wednesday</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Time Slot:</label>
                  <input
                    type="text"
                    value={newGroupTime}
                    onChange={(e) => setNewGroupTime(e.target.value)}
                    placeholder="09:00 - 11:00"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddGroupOpen(false)}
                  className="px-3.5 py-2 btn-duo-secondary text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 btn-duo-green text-xs font-black cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
