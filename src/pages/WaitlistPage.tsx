import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HeartHandshake,
  Star,
  Zap,
  Smile
} from 'lucide-react';
import { motion } from 'motion/react';

export const WaitlistPage: React.FC = () => {
  const {
    programs,
    registerWaitlist,
    navigateTo,
    selectedProgramForWaitlist
  } = useApp();

  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState<number>(9);
  const [programId, setProgramId] = useState(selectedProgramForWaitlist || 'prog-robotics-starter');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProgram = programs.find((p) => p.id === programId) || programs[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName || !studentName || !parentPhone || !parentEmail) return;

    setIsSubmitting(true);
    await registerWaitlist({
      parentName,
      parentPhone,
      parentEmail,
      studentName,
      studentAge: Number(studentAge),
      programId,
      notes
    });
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col justify-center relative">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigateTo('home')}
          className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-sky-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        <div className="text-xs font-bold text-slate-500">
          Want immediate portal access?{' '}
          <button
            onClick={() => navigateTo('register-parent')}
            className="text-emerald-600 font-black hover:underline cursor-pointer"
          >
            Register as Parent &rarr;
          </button>
        </div>
      </div>

      <div className="duo-card p-6 sm:p-10 bg-white">
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-start gap-4">
              <img
                src="/src/assets/images/duo_junior_mascot_1790795302958.jpg"
                alt="Junior Mascot"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shrink-0 hidden sm:block"
              />
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider">
                  <span>⚡ Priority Cohort Queue</span>
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Join Discovery Junior's Waitlist
                </h1>
                <p className="text-xs text-slate-500 font-medium max-w-xl">
                  We maintain small classes (maximum 8 kids per mentor) to ensure every child builds and learns at their own pace.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Left Column */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Parent / Guardian Contact
                </h3>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Parent Full Name *</label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. Ines Ben Salem"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Phone Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+216 55 987 654"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Child & Program Choice
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-700 mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Rayen Ben Salem"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Age *</label>
                    <input
                      type="number"
                      min={6}
                      max={17}
                      required
                      value={studentAge}
                      onChange={(e) => setStudentAge(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 font-black focus:outline-none focus:border-amber-500 focus:bg-white text-xs text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Preferred STEM Track *</label>
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold cursor-pointer"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.ageRange}) — ${p.pricePerMonth}/mo
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Schedule Preference (Optional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Saturday mornings, beginner to coding..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Selected program highlight */}
            {selectedProgram && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-black text-amber-900">{selectedProgram.title}</div>
                  <div className="text-amber-700 font-medium">{selectedProgram.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-base text-amber-900">${selectedProgram.pricePerMonth}/mo</div>
                  <div className="text-[10px] text-emerald-600 font-bold">All Kits Included</div>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-medium">
                🔒 Saved safely in real-time Discovery Club Junior database
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 btn-duo-yellow text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>{isSubmitting ? 'Reserving Spot...' : 'Reserve Spot on Waitlist ⭐'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Celebratory Confirmation Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 text-center space-y-6 max-w-md mx-auto"
          >
            <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden shadow-md border-4 border-emerald-100">
              <img
                src="/src/assets/images/duo_robot_trophy_1790795316867.jpg"
                alt="Celebration Trophy"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                <span>🎉 Reserved in Queue!</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                High Five, {parentName}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                <strong className="text-slate-900">{studentName}</strong> has been added to our priority waitlist for <strong className="text-emerald-700">{selectedProgram.title}</strong>!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xs text-left space-y-1.5 text-slate-600 font-medium">
              <div><strong className="text-slate-800">WhatsApp Phone:</strong> {parentPhone}</div>
              <div><strong className="text-slate-800">Confirmation Email:</strong> {parentEmail}</div>
              <div><strong className="text-slate-800">Campus:</strong> Manouba STEM Lab, Tunisia</div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigateTo('register-parent')}
                className="w-full sm:w-auto px-6 py-3.5 btn-duo-green text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Create Full Parent Account Now</span>
              </button>

              <button
                onClick={() => navigateTo('home')}
                className="w-full sm:w-auto px-5 py-3 btn-duo-secondary text-xs font-bold cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
