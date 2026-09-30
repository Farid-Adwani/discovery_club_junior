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
  ShoppingBag
} from 'lucide-react';
import { HoodieSize, Student, Group } from '../../types';

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
    updateStudentStatus,
    updateStudentPrice,
    assignStudentToGroup,
    deleteStudent,
    createGroup,
    deleteGroup,
    addHoodieStock,
    updateHoodieStatus,
    addProgramObjective,
    updateMaterialRequestStatus,
    navigateTo
  } = useApp();

  const [adminTab, setAdminTab] = useState<
    'overview' | 'students' | 'groups' | 'attendance' | 'payments' | 'curriculum' | 'inventory'
  >('overview');

  const [studentFilter, setStudentFilter] = useState<'all' | 'waitlist' | 'accepted' | 'active'>('all');
  const [studentSearch, setStudentSearch] = useState('');

  // Group creation modal state
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupProg, setNewGroupProg] = useState(programs[0]?.id || '');
  const [newGroupTrainer, setNewGroupTrainer] = useState(trainers[0]?.id || '');
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

    createGroup({
      name: newGroupName,
      programId: newGroupProg,
      trainerId: newGroupTrainer,
      dayOfWeek: newGroupDay,
      timeSlot: newGroupTime,
      room: newGroupRoom,
      maxCapacity: Number(newGroupCap)
    });
    setNewGroupName('');
    setIsAddGroupOpen(false);
  };

  const handleSavePriceOverride = () => {
    if (!editingStudentPrice) return;
    updateStudentPrice(
      editingStudentPrice.id,
      customPriceVal > 0 ? customPriceVal : undefined,
      paymentStatusVal
    );
    setEditingStudentPrice(null);
  };

  const handleAddCurriculumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjTitle || !newObjDesc) return;
    addProgramObjective(curriculumProgId, {
      week: Number(newObjWeek),
      title: newObjTitle,
      description: newObjDesc,
      hardware: newObjHw || 'Sensors & Controllers'
    });
    setNewObjTitle('');
    setNewObjDesc('');
    setNewObjHw('');
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

        <div className="flex items-center gap-2.5">
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
          { id: 'groups', label: `Groups & Cohorts (${groups.length})`, icon: <Calendar className="w-4 h-4" /> },
          { id: 'attendance', label: 'Attendance Call Lists', icon: <ClipboardList className="w-4 h-4" /> },
          { id: 'payments', label: 'Payments & Tuition', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'inventory', label: '“Les Capuches” Inventory', icon: <Package className="w-4 h-4" /> },
          { id: 'curriculum', label: 'Curriculum Builder', icon: <BookOpen className="w-4 h-4" /> }
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
                +{acceptedStudents.length} admitted pending cohort
              </div>
            </div>

            <div className="duo-card duo-card-glow-green p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>MONTHLY RECURRING TUITION</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-600 font-mono">
                ${totalMonthlyRevenue}
              </div>
              <div className="text-[11px] font-bold text-emerald-700">
                Avg ${(totalMonthlyRevenue / (activeStudents.length || 1)).toFixed(0)} / student / mo
              </div>
            </div>

            <div className="duo-card duo-card-glow-yellow p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>LAB OCCUPANCY RATE</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-600 font-mono">
                {occupancyRate}%
              </div>
              <div className="text-[11px] font-bold text-amber-700">
                {activeStudents.length} of {totalCapacity} seats filled
              </div>
            </div>

            <div className="duo-card duo-card-glow-orange p-5 bg-white space-y-1 cursor-pointer">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>PENDING WAITLIST</span>
                <UserPlus className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-3xl font-black text-orange-600 font-mono">
                {waitlistStudents.length}
              </div>
              <div className="text-[11px] font-bold text-orange-700">
                Queue awaiting confirmation
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & Material Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="duo-card p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-500" />
                  <span>Trainer Equipment Requests</span>
                </h3>
                <span className="font-mono text-xs font-bold text-slate-400">
                  {materialRequests.filter((r) => r.status === 'pending').length} Pending
                </span>
              </div>

              <div className="space-y-2.5">
                {materialRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-black text-slate-800">{req.groupName} · {req.trainerName}</div>
                      <div className="text-slate-600 font-semibold">{req.itemsNeeded} ({req.quantity})</div>
                      <div className="text-[10px] text-slate-400">Needed by {req.sessionDate}</div>
                    </div>

                    <div>
                      {req.status === 'pending' ? (
                        <button
                          onClick={() => updateMaterialRequestStatus(req.id, 'approved')}
                          className="px-3 py-1.5 btn-duo-green text-xs font-black cursor-pointer"
                        >
                          Approve
                        </button>
                      ) : req.status === 'approved' ? (
                        <button
                          onClick={() => updateMaterialRequestStatus(req.id, 'delivered')}
                          className="px-3 py-1.5 btn-duo-blue text-xs font-black cursor-pointer"
                        >
                          Delivered
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          ✓ Delivered
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="duo-card p-6 bg-white space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Quick Operations</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs font-black">
                <button
                  onClick={() => setAdminTab('students')}
                  className="p-4 rounded-2xl bg-sky-50 border-2 border-sky-200 hover:border-sky-300 text-sky-800 text-left transition-all cursor-pointer space-y-1"
                >
                  <Users className="w-5 h-5 text-sky-600 mb-1" />
                  <div>Review Waitlist Queue</div>
                  <div className="text-[10px] text-sky-600 font-medium">{waitlistStudents.length} awaiting approval</div>
                </button>

                <button
                  onClick={() => setAdminTab('inventory')}
                  className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 hover:border-amber-300 text-amber-900 text-left transition-all cursor-pointer space-y-1"
                >
                  <Package className="w-5 h-5 text-amber-600 mb-1" />
                  <div>Restock Club Hoodies</div>
                  <div className="text-[10px] text-amber-700 font-medium">Log shipments & sizes</div>
                </button>

                <button
                  onClick={() => setAdminTab('groups')}
                  className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-300 text-emerald-900 text-left transition-all cursor-pointer space-y-1"
                >
                  <Calendar className="w-5 h-5 text-emerald-600 mb-1" />
                  <div>Manage Cohort Groups</div>
                  <div className="text-[10px] text-emerald-700 font-medium">{groups.length} active classes</div>
                </button>

                <button
                  onClick={() => navigateTo('schedule-matrix')}
                  className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-200 hover:border-purple-300 text-purple-900 text-left transition-all cursor-pointer space-y-1"
                >
                  <Sparkles className="w-5 h-5 text-purple-600 mb-1" />
                  <div>Schedule Matrix</div>
                  <div className="text-[10px] text-purple-700 font-medium">Automated room solver</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. STUDENTS & WAITLIST TAB */}
      {adminTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['all', 'waitlist', 'accepted', 'active'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStudentFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer ${
                    studentFilter === filter
                      ? 'btn-duo-blue'
                      : 'btn-duo-secondary'
                  }`}
                >
                  {filter} ({students.filter((s) => filter === 'all' || s.status === filter).length})
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students, parents, phone..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 pr-3.5 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Student Table in Clean Duo-Card */}
          <div className="duo-card overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead>
                <tr className="border-b-2 border-slate-100 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student & Age</th>
                  <th className="py-3 px-4">Parent Contact</th>
                  <th className="py-3 px-4">STEM Track</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Cohort</th>
                  <th className="py-3 px-4 text-right">Tuition</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 text-xs font-medium">
                      No student records found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const prog = programs.find((p) => p.id === student.programId);
                    const effectivePrice =
                      student.customMonthlyPrice !== undefined
                        ? student.customMonthlyPrice
                        : student.standardMonthlyPrice;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-800">{student.studentName}</div>
                          <div className="text-[11px] text-slate-400">
                            {student.studentAge} yrs · Joined {student.registeredAt}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{student.parentName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{student.parentPhone}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-sky-700">{prog?.title || student.programId}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            student.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.status === 'accepted'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {student.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={student.groupId || ''}
                            onChange={(e) => assignStudentToGroup(student.id, e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Unassigned --</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name} ({g.dayOfWeek})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-black text-slate-800">${effectivePrice}</div>
                          {student.customMonthlyPrice !== undefined && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">Override</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {student.status === 'waitlist' && (
                              <button
                                onClick={() => updateStudentStatus(student.id, 'accepted')}
                                className="px-2 py-1 bg-sky-100 text-sky-800 hover:bg-sky-200 rounded-lg text-[11px] font-black cursor-pointer"
                              >
                                Accept
                              </button>
                            )}
                            {student.status === 'accepted' && (
                              <button
                                onClick={() => updateStudentStatus(student.id, 'active')}
                                className="px-2 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-[11px] font-black cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingStudentPrice(student);
                                setCustomPriceVal(effectivePrice);
                                setPaymentStatusVal(student.paymentStatus);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              title="Edit Price"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteStudent(student.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. GROUPS & COHORTS TAB */}
      {adminTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-800">Cohort Groups & Room Allocations</h2>
              <p className="text-xs text-slate-500 font-medium">Max 8 students per bench mentor.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateTo('schedule-matrix')}
                className="px-3.5 py-2 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-sky-500" />
                <span>Schedule Matrix</span>
              </button>
              <button
                onClick={() => setIsAddGroupOpen(true)}
                className="px-3.5 py-2 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => {
              const assignedStudents = students.filter((s) => s.groupId === group.id);
              const trainer = trainers.find((t) => t.id === group.trainerId);
              const program = programs.find((p) => p.id === group.programId);
              const isFull = assignedStudents.length >= group.maxCapacity;

              return (
                <div key={group.id} className="duo-card p-5 bg-white space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{group.name}</h4>
                      <div className="text-xs text-slate-500 font-medium">{program?.title}</div>
                    </div>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium text-slate-600">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block">SCHEDULE:</span>
                      <span className="font-bold text-slate-800">{group.dayOfWeek} · {group.timeSlot}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block">ROOM:</span>
                      <span className="font-bold text-slate-800">{group.room}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block">TRAINER:</span>
                      <span className="font-bold text-sky-700">{trainer?.name || 'Assigned'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block">CAPACITY:</span>
                      <span className={`font-mono font-bold ${isFull ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {assignedStudents.length} / {group.maxCapacity} Seats
                      </span>
                    </div>
                  </div>

                  {/* Enrolled Students */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-black text-slate-400">
                      Enrolled Students ({assignedStudents.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {assignedStudents.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No students assigned yet.</span>
                      ) : (
                        assignedStudents.map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-xs font-bold text-sky-800"
                          >
                            {s.studentName}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ATTENDANCE & CALL LISTS TAB */}
      {adminTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Automated Attendance & Call Lists</h2>
              <p className="text-xs text-slate-500 font-medium">Select cohort to view official roster.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCallListGroupId}
                onChange={(e) => setSelectedCallListGroupId(e.target.value)}
                className="px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.dayOfWeek})
                  </option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="px-3 py-2 btn-duo-secondary text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Call List</span>
              </button>
            </div>
          </div>

          {/* Call Sheet Table */}
          <div className="duo-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {groups.find((g) => g.id === selectedCallListGroupId)?.name} Roll Call Sheet
                </h3>
                <div className="text-xs text-slate-500 font-medium">
                  {groups.find((g) => g.id === selectedCallListGroupId)?.dayOfWeek} · Room:{' '}
                  {groups.find((g) => g.id === selectedCallListGroupId)?.room}
                </div>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                Active Session Roster
              </span>
            </div>

            <div className="space-y-2">
              {students.filter((s) => s.groupId === selectedCallListGroupId).map((st, idx) => (
                <div
                  key={st.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-slate-400">#{idx + 1}</span>
                    <div>
                      <div className="font-black text-slate-800">{st.studentName}</div>
                      <div className="text-[11px] text-slate-500 font-medium">Parent: {st.parentName} ({st.parentPhone})</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                    Enrolled Member
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. INVENTORY / "LES CAPUCHES" TAB */}
      {adminTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">"Les Capuches" Hoodie Stock & Distribution</h2>
              <p className="text-xs text-slate-500 font-medium">Track warehouse units and parent orders.</p>
            </div>
            <button
              onClick={() => setIsRestockOpen(true)}
              className="px-4 py-2.5 btn-duo-green text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock / Restock</span>
            </button>
          </div>

          {/* Stock by size */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(hoodieStock).map(([size, count]) => (
              <div key={size} className="duo-card p-4 bg-white text-center space-y-1">
                <div className="text-xs font-black text-slate-400 font-mono">SIZE {size}</div>
                <div className="text-2xl font-black text-slate-800 font-mono">{count}</div>
                <div className="text-[10px] font-bold text-emerald-600">Available In Lab</div>
              </div>
            ))}
          </div>

          {/* Orders log */}
          <div className="duo-card p-6 bg-white space-y-4">
            <h3 className="text-sm font-black text-slate-800">Parent Orders & Pickup Log</h3>
            <div className="space-y-2">
              {hoodieDistributions.map((dist) => (
                <div
                  key={dist.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-black text-slate-800">{dist.studentName}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="font-mono text-sky-700 font-bold">{dist.size}</span>
                    {dist.personalizedText && (
                      <span className="block text-[11px] text-slate-500 font-mono">
                        Embroidery: "{dist.personalizedText}"
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      dist.status === 'picked_up'
                        ? 'bg-emerald-100 text-emerald-800'
                        : dist.status === 'ready'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {dist.status}
                    </span>

                    {dist.status === 'requested' && (
                      <button
                        onClick={() => updateHoodieStatus(dist.id, 'ready')}
                        className="px-2.5 py-1 bg-sky-100 text-sky-800 font-black rounded-lg text-[10px] cursor-pointer"
                      >
                        Mark Ready
                      </button>
                    )}
                    {dist.status === 'ready' && (
                      <button
                        onClick={() => updateHoodieStatus(dist.id, 'picked_up')}
                        className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[10px] cursor-pointer"
                      >
                        Mark Picked Up
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. PAYMENTS & PRICING TAB */}
      {adminTab === 'payments' && (
        <div className="space-y-4">
          <div className="duo-card p-6 bg-white space-y-4">
            <h3 className="text-sm font-black text-slate-800">Student Pricing & Custom Overrides</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-slate-400 font-black uppercase text-[10px]">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Standard Price</th>
                    <th className="py-2.5 px-3">Active Price</th>
                    <th className="py-2.5 px-3">Payment Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students.map((st) => {
                    const price = st.customMonthlyPrice !== undefined ? st.customMonthlyPrice : st.standardMonthlyPrice;
                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-800">{st.studentName}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">${st.standardMonthlyPrice}/mo</td>
                        <td className="py-3 px-3 font-mono font-black text-emerald-600">${price}/mo</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            st.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.paymentStatus === 'scholarship'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {st.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setEditingStudentPrice(st);
                              setCustomPriceVal(price);
                              setPaymentStatusVal(st.paymentStatus);
                            }}
                            className="px-2.5 py-1 btn-duo-secondary text-xs font-black cursor-pointer"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. CURRICULUM BUILDER TAB */}
      {adminTab === 'curriculum' && (
        <div className="space-y-4">
          <div className="duo-card p-6 bg-white space-y-4">
            <h3 className="text-sm font-black text-slate-800">Add Syllabus Milestone / Objective</h3>

            <form onSubmit={handleAddCurriculumSubmit} className="space-y-3.5 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1">STEM Program:</label>
                  <select
                    value={curriculumProgId}
                    onChange={(e) => setCurriculumProgId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Week Number:</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={newObjWeek}
                    onChange={(e) => setNewObjWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block mb-1">Module Title:</label>
                  <input
                    type="text"
                    required
                    value={newObjTitle}
                    onChange={(e) => setNewObjTitle(e.target.value)}
                    placeholder="e.g. OpenCV Computer Vision Rover"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
                  />
                </div>
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
                  {(['6-8Y', '8-10Y', '10-12Y', '12-14Y', 'S-Adult'] as HoodieSize[]).map((sz) => (
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
                <label className="block mb-1">Monthly Tuition ($):</label>
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
            <h3 className="text-base font-black text-slate-800">Create New Cohort Group</h3>
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
                  <label className="block mb-1">Trainer:</label>
                  <select
                    value={newGroupTrainer}
                    onChange={(e) => setNewGroupTrainer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white cursor-pointer"
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
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
