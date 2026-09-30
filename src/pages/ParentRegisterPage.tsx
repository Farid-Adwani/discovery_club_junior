import React, { useState } from 'react';
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
  Smile
} from 'lucide-react';
import { motion } from 'motion/react';

export const ParentRegisterPage: React.FC = () => {
  const {
    programs,
    registerParentAccount,
    navigateTo,
    isFirebaseConnected
  } = useApp();

  const [parentName, setParentName] = useState('');
  const [parentEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<number>(9);
  const [programId, setProgramId] = useState(programs[0]?.id || 'prog-robotics-starter');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProgram = programs.find((p) => p.id === programId) || programs[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName || !parentEmail || !phone || !childName) return;

    setIsSubmitting(true);
    await registerParentAccount({
      parentName,
      parentEmail,
      password,
      parentPhone: phone,
      childName,
      childAge: Number(childAge),
      programId,
      notes
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-center relative">
      {/* Top back navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigateTo('home')}
          className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-sky-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        <div className="text-xs font-bold text-slate-500">
          Already registered?{' '}
          <button
            onClick={() => navigateTo('login')}
            className="text-sky-600 font-black hover:underline cursor-pointer"
          >
            Sign in here &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Mascot & Parent Perks */}
        <div className="lg:col-span-5 duo-card p-6 sm:p-8 space-y-6 bg-white text-center">
          <div className="relative mx-auto w-28 h-28">
            <img
              src="/src/assets/images/duo_junior_mascot_1790795302958.jpg"
              alt="Junior Mascot"
              className="w-28 h-28 rounded-3xl object-cover border-4 border-emerald-100 shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs border-2 border-white shadow-sm">
              ✓
            </div>
          </div>

          <div className="duo-speech-bubble text-center space-y-1.5">
            <div className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Parent Portal Perks 🌟
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
              Track Your Kid's Robotics Superpowers!
            </h1>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              No stress, full transparency. Here is what you get as a Discovery Junior parent:
            </p>
          </div>

          <div className="space-y-2.5 text-left text-xs">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
              <span className="text-lg">📅</span>
              <div>
                <strong className="text-emerald-900 block font-black">Live Attendance Check</strong>
                <span className="text-emerald-700 font-medium">See session dates, arrivals, and weekly syllabus topics.</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-2.5">
              <span className="text-lg">⭐</span>
              <div>
                <strong className="text-sky-900 block font-black">Trainer Feedback & Stars</strong>
                <span className="text-sky-700 font-medium">Read constructive notes from certified STEM trainers.</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <span className="text-lg">🧥</span>
              <div>
                <strong className="text-amber-900 block font-black">Official Club Hoodie Shop</strong>
                <span className="text-amber-700 font-medium">Order "Les Capuches" with your child's embroidered name.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Step-by-Step Friendly Form */}
        <div className="lg:col-span-7 duo-card p-6 sm:p-10 space-y-6 bg-white">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 uppercase tracking-wider mb-1">
              <HeartHandshake className="w-4 h-4" />
              <span>Easy Parent Registration</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Let's Get Your Family Started!
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Takes less than 1 minute. An account is created immediately.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Parent Info */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">1</span>
                <span>Parent / Guardian Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-black mb-1">Parent Full Name *</label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. Sonia Khelifi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-black mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 98 123 456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-black mb-1">Email (Your Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-black mb-1">Password (Optional)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Child Info */}
            <div className="space-y-3.5 pt-4 border-t-2 border-slate-100">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-black">2</span>
                <span>Meet Your Future Robotics Star!</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-black mb-1">Child's Name *</label>
                  <input
                    type="text"
                    required
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="e.g. Yassine, Nour, Adam..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-black mb-1">Age (6-17) *</label>
                  <input
                    type="number"
                    min={6}
                    max={17}
                    required
                    value={childAge}
                    onChange={(e) => setChildAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 font-black focus:outline-none focus:border-sky-500 focus:bg-white text-xs text-center"
                  />
                </div>
              </div>

              {/* STEM Program Track Selection */}
              <div className="space-y-1.5 text-xs">
                <label className="block text-slate-700 font-black">Choose a STEM Track</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {programs.map((prog) => {
                    const isSelected = prog.id === programId;
                    return (
                      <button
                        key={prog.id}
                        type="button"
                        onClick={() => setProgramId(prog.id)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50 border-sky-400 border-b-4 border-b-sky-500'
                            : 'bg-white border-slate-200 border-b-4 border-b-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-black text-slate-800 text-xs mb-0.5">
                          <span>{prog.title}</span>
                          <span className="text-[10px] text-sky-600 bg-sky-100 px-1.5 py-0.2 rounded-full font-bold">
                            {prog.ageRange}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium line-clamp-1">{prog.description}</div>
                        <div className="text-[10px] font-black text-emerald-600 mt-1">
                          ${prog.pricePerMonth} / month · All kits included
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-black text-xs mb-1">
                  Any special notes for trainers? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Loves building LEGO, preferred session day..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 btn-duo-green text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>{isSubmitting ? 'Creating Family Account...' : 'Complete & Open Parent Portal 🚀'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Already registered?</span>
            <button
              onClick={() => navigateTo('login')}
              className="text-sky-600 font-black hover:underline cursor-pointer"
            >
              Sign In to Your Space &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
