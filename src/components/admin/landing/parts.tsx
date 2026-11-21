import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { api } from '../../../api';
import { shrinkPhoto } from '../../../utils/image';
import { useApp } from '../../../context/AppContext';
import { useT } from '../../../i18n';
import { landingMessages } from '../../../i18n/messages/landing';
import type { LandingLang, LText } from '../../../data/landing';

/** Small building blocks of the landing page editor: photo pickers, three-language fields, list buttons */

export const inputCls =
  'w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-[#c11e3d] focus:bg-white';
export const labelCls = 'block space-y-1';
export const labelText = 'block text-xs font-bold text-slate-600';

export const emptyL = (): LText => ({ en: '', fr: '', ar: '' });
export const sameL = (text: string): LText => ({ en: text, fr: text, ar: text });

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Shrinks the photo in the browser, uploads it to the server and returns its address and size */
export async function uploadSiteImage(file: File, folder: 'landing' | 'timeline', maxSide = 1600) {
  const { dataUrl, w, h } = await shrinkPhoto(file, maxSide);
  const { url } = await api<{ url: string }>('/admin/uploads', { method: 'POST', body: { image: dataUrl, folder } });
  return { url, w, h };
}

/** A hidden file input and a function to open it (several files when `multiple`) */
export function useFilePicker(onFiles: (files: File[]) => Promise<void>, multiple = false) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useApp();
  const t = useT(landingMessages);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple={multiple}
      className="hidden"
      onChange={async (e) => {
        const files = [...(e.target.files || [])];
        e.target.value = '';
        if (!files.length) return;
        setBusy(true);
        try {
          await onFiles(files);
        } catch (err) {
          showToast(err instanceof Error && err.message ? err.message : t('uploadFailed'), 'error');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
  return { open: () => ref.current?.click(), busy, input };
}

/** One photo: a preview with a "change" button (and "back to the built-in one" when there is one) */
export const ImagePick: React.FC<{
  label: string;
  value?: string;
  /** shown when there is no value, and restored by the reset button */
  fallback?: string;
  onChange: (url: string | undefined) => void;
  folder?: 'landing' | 'timeline';
  aspect?: string;
  maxSide?: number;
}> = ({ label, value, fallback, onChange, folder = 'landing', aspect = 'aspect-[4/3]', maxSide = 1600 }) => {
  const t = useT(landingMessages);
  const { open, busy, input } = useFilePicker(async ([file]) => onChange((await uploadSiteImage(file, folder, maxSide)).url));
  const shown = value || fallback;
  return (
    <div className="space-y-1.5">
      <span className={labelText}>{label}</span>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className={`group relative block w-full ${aspect} rounded-xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 hover:border-[#c11e3d] cursor-pointer`}
      >
        {shown && <img src={shown} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <span
          className={`absolute inset-0 grid place-items-center text-xs font-black transition-opacity ${
            shown ? 'bg-black/45 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100' : 'text-slate-500'
          } ${busy ? 'opacity-100!' : ''}`}
        >
          <span className="flex items-center gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {busy ? t('uploading') : shown ? t('changePhoto') : t('choosePhoto')}
          </span>
        </span>
      </button>
      {value && fallback && (
        <button type="button" onClick={() => onChange(undefined)} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-[#c11e3d] cursor-pointer">
          <RotateCcw className="w-3 h-3" /> {t('builtIn')}
        </button>
      )}
      {input}
    </div>
  );
};

/** A text in the three languages; edits the language chosen at the top of the editor */
export const LInput: React.FC<{
  label: string;
  value?: LText;
  lang: LandingLang;
  onChange: (value: LText) => void;
  placeholder?: string;
  long?: boolean;
  max?: number;
}> = ({ label, value, lang, onChange, placeholder, long = false, max = 300 }) => {
  const v = value || emptyL();
  const common = {
    value: v[lang],
    maxLength: max,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    placeholder: placeholder ?? (lang !== 'en' ? v.en : v.fr),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...v, [lang]: e.target.value }),
    className: inputCls
  } as const;
  return (
    <label className={labelCls}>
      <span className={labelText}>
        {label} <span className="font-mono text-[10px] text-slate-400 uppercase">{lang}</span>
      </span>
      {long ? <textarea rows={3} {...common} /> : <input {...common} />}
    </label>
  );
};

/** A plain text field (the same in every language) */
export const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
  max?: number;
}> = ({ label, value, onChange, type = 'text', placeholder, dir, max = 300 }) => (
  <label className={labelCls}>
    <span className={labelText}>{label}</span>
    <input type={type} value={value} dir={dir} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
  </label>
);

/** Move up / move down / remove, for the items of a list */
export const ItemTools: React.FC<{ index: number; count: number; onMove: (to: number) => void; onRemove: () => void }> = ({ index, count, onMove, onRemove }) => {
  const t = useT(landingMessages);
  const btn = 'grid place-items-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#c11e3d] hover:border-[#c11e3d] disabled:opacity-30 disabled:pointer-events-none cursor-pointer';
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={t('moveUp')} title={t('moveUp')} className={btn}>
        <ArrowUp className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => onMove(index + 1)} disabled={index === count - 1} aria-label={t('moveDown')} title={t('moveDown')} className={btn}>
        <ArrowDown className="w-4 h-4" />
      </button>
      <button type="button" onClick={onRemove} aria-label={t('remove')} title={t('remove')} className={`${btn} hover:bg-[#fdf2f4]`}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

/** "Add …" button under a list (with a photo icon when it adds photos) */
export const AddButton: React.FC<{ onClick: () => void; children: React.ReactNode; busy?: boolean; disabled?: boolean; photo?: boolean }> = ({ onClick, children, busy, disabled, photo }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy || disabled}
    className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-xs font-black text-slate-500 hover:border-[#c11e3d] hover:text-[#c11e3d] disabled:opacity-50 cursor-pointer"
  >
    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : photo && <ImagePlus className="w-4 h-4" />}
    {children}
  </button>
);

/** A sub-part of an editor section, with its little title */
export const SubBlock: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
    <div>
      <h5 className="text-sm font-black text-slate-800">{title}</h5>
      {hint && <p className="text-[11px] font-medium text-slate-500">{hint}</p>}
    </div>
    {children}
  </div>
);
