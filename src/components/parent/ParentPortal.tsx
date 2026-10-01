import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  HeartHandshake,
  Calendar,
  Clock,
  MapPin,
  Star,
  CheckCircle2,
  AlertCircle,
  Package,
  User,
  ShoppingBag,
  Sparkles,
  BookOpen,
  Smile,
  Flame,
  Award,
  Heart,
  MessageCircle,
  ExternalLink,
  Camera
} from 'lucide-react';
import { HoodieSize } from '../../types';
import { CLUB_PHOTOS } from '../../data/initialData';

export const ParentPortal: React.FC = () => {
  const {
    students,
    groups,
    trainers,
    programs,
    sessions,
    hoodieStock,
    hoodieDistributions,
    facebookPosts,
    likeFacebookPost,
    activeParentStudentId,
    setActiveParentStudentId,
    requestHoodieOrder,
    currentUser
  } = useApp();

  // Selected student
  const activeStudent = students.find((s) => s.id === activeParentStudentId) || students[0];
  const assignedGroup = groups.find((g) => g.id === activeStudent?.groupId);
  const assignedTrainer = trainers.find((t) => t.id === assignedGroup?.trainerId);
  const studentProgram = programs.find((p) => p.id === activeStudent?.programId);

  // Find all sessions involving this student
  const studentSessions = sessions.filter((sess) => {
    return sess.groupId === activeStudent?.groupId && sess.records[activeStudent.id];
  });

  // Calculate attendance metrics
  const totalAttended = studentSessions.filter(
    (s) => s.records[activeStudent?.id]?.status === 'present'
  ).length;
  const totalLate = studentSessions.filter(
    (s) => s.records[activeStudent?.id]?.status === 'late'
  ).length;
  const averageRating =
    studentSessions.length > 0
      ? (
          studentSessions.reduce(
            (acc, s) => acc + (s.records[activeStudent?.id]?.rating || 5),
            0
          ) / studentSessions.length
        ).toFixed(1)
      : '5.0';

  // Find hoodie orders for this student
  const myHoodieOrders = hoodieDistributions.filter(
    (d) => d.studentId === activeStudent?.id
  );

  // Hoodie order form state
  const [selectedSize, setSelectedSize] = useState<HoodieSize>('8-10Y');
  const [isPersonalized, setIsPersonalized] = useState(true);
  const [customEmbroideryText, setCustomEmbroideryText] = useState(
    activeStudent ? `${activeStudent.studentName} #01` : ''
  );

  const handleOrderHoodie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    requestHoodieOrder({
      studentId: activeStudent.id,
      studentName: activeStudent.studentName,
      parentName: activeStudent.parentName,
      size: selectedSize,
      isPersonalized,
      personalizedText: isPersonalized ? customEmbroideryText : undefined
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner with Child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase mb-1">
            <HeartHandshake className="w-4 h-4" />
            <span>Parent Family Portal · Live Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            {activeStudent?.studentName}'s Learning Journey
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time session presence, teacher remarks, and hoodie merchandise orders.
          </p>
        </div>

        {/* Child switcher dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-500">Child:</label>
          <select
            value={activeParentStudentId}
            onChange={(e) => setActiveParentStudentId(e.target.value)}
            className="px-3 py-2 bg-white border-2 border-slate-200 border-b-4 border-b-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.studentName} ({s.studentAge} yrs)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gamified Superpower Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Streak */}
        <div className="duo-card duo-card-glow-orange p-5 bg-white space-y-1 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-black text-slate-400">
            <span>ATTENDANCE STREAK</span>
            <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-slate-800 font-mono flex items-center gap-1.5">
            <span>{totalAttended}</span>
            <span className="text-sm font-bold text-slate-400">/ {studentSessions.length} Labs</span>
          </div>
          <div className="text-[11px] font-bold text-emerald-600">
            {studentSessions.length > 0
              ? `${Math.round((totalAttended / studentSessions.length) * 100)}% Consistency 🔥`
              : 'Cohort beginning soon'}
          </div>
        </div>

        {/* Skill Rating */}
        <div className="duo-card duo-card-glow-yellow p-5 bg-white space-y-1 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-black text-slate-400">
            <span>MENTOR EVALUATION</span>
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-500 font-mono">
            {averageRating} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
          </div>
          <div className="text-[11px] font-bold text-amber-700">Excellent hands-on participation ⭐</div>
        </div>

        {/* Assigned Cohort */}
        <div className="duo-card duo-card-glow-blue p-5 bg-white space-y-1 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-black text-slate-400">
            <span>ASSIGNED COHORT</span>
            <Clock className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-lg font-black text-slate-800 truncate">
            {assignedGroup?.name || 'Assigned Saturday Alpha'}
          </div>
          <div className="text-[11px] font-bold text-sky-600">
            {assignedGroup ? `${assignedGroup.dayOfWeek} · ${assignedGroup.timeSlot}` : 'Saturday Morning'}
          </div>
        </div>

        {/* Lead Mentor */}
        <div className="duo-card duo-card-glow-purple p-5 bg-white space-y-1 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-black text-slate-400">
            <span>LEAD TRAINER</span>
            <User className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-lg font-black text-slate-800 truncate">
            {assignedTrainer?.name || 'Hassen Ben Ali'}
          </div>
          <div className="text-[11px] font-bold text-purple-600">
            {assignedTrainer?.specialty || assignedTrainer?.specialization || 'Robotics & Computer Vision'}
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Weekly Attendance & Teacher Remarks */}
        <div className="lg:col-span-7 space-y-6">
          <div className="duo-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500" />
                <span>Weekly Lab Attendance & Feedback</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">Firestore Live Log</span>
            </div>

            <div className="space-y-3">
              {studentSessions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  No session logs yet for this cohort. Next session scheduled this weekend!
                </div>
              ) : (
                studentSessions.map((sess) => {
                  const myRecord = sess.records[activeStudent.id];
                  return (
                    <div
                      key={sess.id}
                      className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-black text-sky-600">W{sess.weekNumber}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-black text-slate-800">{sess.topicTaught}</span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            myRecord?.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : myRecord?.status === 'late'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {myRecord?.status || 'Unmarked'}
                        </span>
                      </div>

                      {myRecord?.pedagogicalRemark && (
                        <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-medium">
                          <span className="font-black text-slate-800">Trainer Remark: </span>
                          "{myRecord.pedagogicalRemark}"
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>Date: {sess.date}</span>
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <span>Participation:</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < (myRecord?.rating || 5)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: "Les Capuches" Hoodie Order */}
        <div className="lg:col-span-5 space-y-6">
          <div className="duo-card p-6 bg-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-black text-slate-800">
                  “Les Capuches” Official Club Hoodie
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">Merchandise</span>
            </div>

            {/* Real photo of the hoodie crew */}
            <div className="rounded-2xl overflow-hidden border-2 border-slate-200 relative h-36">
              <img
                src={CLUB_PHOTOS.fbHoodieCrew}
                alt="Students wearing Discovery hoodies"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2.5 text-white">
                <span className="text-[11px] font-black">Official Club Hoodie · 32 DT</span>
              </div>
            </div>

            <form onSubmit={handleOrderHoodie} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1.5 text-slate-600">Select Size:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['6-8Y', '8-10Y', '10-12Y', '12-14Y', 'S', 'M', 'L'] as HoodieSize[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`py-2 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                        selectedSize === sz
                          ? 'bg-sky-50 border-sky-500 text-sky-800 border-b-4 border-b-sky-600'
                          : 'bg-white border-slate-200 border-b-4 border-b-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={isPersonalized}
                    onChange={(e) => setIsPersonalized(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-0"
                  />
                  <span>Add custom name embroidery badge (+6 DT)</span>
                </label>

                {isPersonalized && (
                  <input
                    type="text"
                    value={customEmbroideryText}
                    onChange={(e) => setCustomEmbroideryText(e.target.value)}
                    placeholder="Embroidery text (e.g. Rayen #07)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Submit Hoodie Request ({isPersonalized ? '38' : '32'} DT)</span>
              </button>
            </form>

            {/* My Active Orders */}
            {myHoodieOrders.length > 0 && (
              <div className="pt-3 border-t-2 border-slate-100 space-y-2">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  Your Ordered Hoodies:
                </div>
                {myHoodieOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{ord.size} Hoodie</span>
                      {ord.personalizedText && (
                        <span className="text-slate-500 font-mono text-[11px] block">"{ord.personalizedText}"</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 uppercase">
                      {ord.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Club Life & Facebook Highlights Gallery for Parents */}
      <div className="duo-card p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-500" />
            <h3 className="text-base font-black text-slate-800">
              Club Life & Competition Highlights from Facebook
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Direct from Manouba Lab</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {facebookPosts.slice(0, 4).map((post) => {
            const userKey = currentUser?.uid || 'guest-visitor';
            const isLiked = post.likedBy?.includes(userKey);

            return (
              <div key={post.id} className="rounded-2xl border-2 border-slate-200 overflow-hidden bg-white flex flex-col justify-between">
                <div>
                  <div className="h-40 overflow-hidden relative">
                    <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white font-black text-[10px]">
                      {post.tag}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-slate-700 font-medium line-clamp-2">{post.caption}</p>
                  </div>
                </div>

                <div className="p-3 pt-0 flex items-center justify-between text-xs font-bold text-slate-500 border-t border-slate-100">
                  <button
                    onClick={() => likeFacebookPost(post.id)}
                    className="flex items-center gap-1 hover:text-rose-500 cursor-pointer pt-2"
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                    <span>{post.likes}</span>
                  </button>

                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:underline text-[11px] font-black flex items-center gap-1 pt-2"
                  >
                    <span>Facebook</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
