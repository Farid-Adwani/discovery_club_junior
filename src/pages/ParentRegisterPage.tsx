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
import { motion } from 'motion/react';

export const ParentRegisterPage: React.FC = () => {
  const {
    registerParentAccount,
    navigateTo,
    isFirebaseConnected
  } = useApp();

  type ChildForm = { name: string; age: number; notes: string };
  const emptyChild = (): ChildForm => ({ name: '', age: 9, notes: '' });

  const [parentName, setParentName] = useState('');
  const [parentEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [children, setChildren] = useState<ChildForm[]>([emptyChild()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateChild = (idx: number, patch: Partial<ChildForm>) => {
    setChildren((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };
  const addChild = () => setChildren((prev) => [...prev, emptyChild()]);
  const removeChild = (idx: number) => setChildren((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledChildren = children.filter((c) => c.name.trim());
    if (!parentName || !parentEmail || !phone || filledChildren.length === 0) return;

    setIsSubmitting(true);
    await registerParentAccount({
      parentName,
      parentEmail,
      password,
      parentPhone: phone,
      children: filledChildren.map((c) => ({
        name: c.name.trim(),
        age: Number(c.age),
        notes: c.notes.trim() || undefined
      }))
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
              src={CLUB_PHOTOS.clubAvatar}
              alt="Discovery Club Junior logo"
              className="bg-white w-28 h-28 rounded-3xl object-cover border-4 border-emerald-100 shadow-sm"
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
                  <label className="block text-slate-700 font-black mb-1">Password (min. 6 characters) *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
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

              <p className="text-[11px] text-slate-500 font-medium">
                No need to pick a course now — our team will place each child in the right group and contact you.
              </p>

              {children.map((child, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-slate-600">
                    <span>Child {idx + 1}</span>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(idx)}
                        className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="col-span-2">
                      <label className="block text-slate-700 font-black mb-1">Child's Name *</label>
                      <input
                        type="text"
                        required
                        value={child.name}
                        onChange={(e) => updateChild(idx, { name: e.target.value })}
                        placeholder="e.g. Yassine, Nour, Adam..."
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-black mb-1">Age (6-22) *</label>
                      <input
                        type="number"
                        min={6}
                        max={22}
                        required
                        value={child.age}
                        onChange={(e) => updateChild(idx, { age: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-800 font-black focus:outline-none focus:border-sky-500 text-xs text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-black text-xs mb-1">
                      Any special notes for trainers? (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={child.notes}
                      onChange={(e) => updateChild(idx, { notes: e.target.value })}
                      placeholder="e.g. Loves building LEGO, preferred session day..."
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs font-semibold resize-none"
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
                <span>Add another child</span>
              </button>
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
