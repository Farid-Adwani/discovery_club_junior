import React, { useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useT } from '../../i18n';
import { parentMessages } from '../../i18n/messages/parent';

/** Admin preview of the parent space: pick a family to open its account exactly as the parent sees it */
export const ViewAsFamilyPicker: React.FC = () => {
  const { students, viewAsParent } = useApp();
  const t = useT(parentMessages);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');

  // One row per parent account, with its children's first names
  const families = useMemo(() => {
    const map = new Map<string, { uid: string; parent: string; email: string; kids: string[] }>();
    for (const s of students) {
      if (!s.parentUid) continue;
      const f = map.get(s.parentUid) || { uid: s.parentUid, parent: s.parentName, email: s.parentEmail, kids: [] };
      f.kids.push(s.studentName.split(' ')[0]);
      map.set(s.parentUid, f);
    }
    return [...map.values()].sort((a, b) => a.parent.localeCompare(b.parent));
  }, [students]);

  const needle = q.trim().toLowerCase();
  const shown = families.filter((f) => !needle || [f.parent, f.email, ...f.kids].some((x) => x.toLowerCase().includes(needle))).slice(0, 8);

  const open = async (uid: string) => {
    setBusy(uid);
    await viewAsParent(uid);
    setBusy('');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div className="duo-card hover:transform-none! bg-amber-50 border-amber-200 p-4 sm:p-5 space-y-3">
        <div>
          <h2 className="text-sm font-black text-amber-950 flex items-center gap-2">
            <Eye className="w-4 h-4" /> {t('vaTitle')}
          </h2>
          <p className="text-xs font-medium text-amber-900/80">{t('vaText')}</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('vaSearch')} className="w-full ps-9 pe-3 py-2 bg-white border-2 border-amber-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
        {families.length === 0 ? (
          <p className="text-xs font-semibold text-amber-900/70">{t('vaNone')}</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {shown.map((f) => (
              <li key={f.uid}>
                <button
                  type="button"
                  onClick={() => open(f.uid)}
                  disabled={!!busy}
                  className="w-full h-full text-start p-3 rounded-xl bg-white border-2 border-amber-100 hover:border-amber-400 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span className="block text-sm font-black text-slate-900 truncate">{f.parent}</span>
                  <span className="block text-[11px] font-semibold text-slate-500 truncate">{f.kids.join(', ')}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-amber-700">
                    <Eye className="w-3 h-3" /> {busy === f.uid ? '…' : t('vaOpen')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
