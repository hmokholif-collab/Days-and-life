'use client';
import { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';

export const THEMES = [
  { id: 'light', label: 'فاتح', swatch: '#ff6b5f', swatch2: '#f7f8fc', bar: '#f7f8fc' },
  { id: 'dark', label: 'داكن', swatch: '#101522', swatch2: '#ff6b5f', bar: '#101522' },
  { id: 'ocean', label: 'محيط', swatch: '#0e7490', swatch2: '#e0f2fe', bar: '#eef7f9' },
  { id: 'forest', label: 'غابة', swatch: '#15803d', swatch2: '#dcfce7', bar: '#eef7ee' },
  { id: 'sunset', label: 'غروب', swatch: '#ea580c', swatch2: '#ffedd5', bar: '#fdf3ec' },
  { id: 'violet', label: 'بنفسجي', swatch: '#7c3aed', swatch2: '#ede9fe', bar: '#f5f1fd' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export function ThemePicker({ variant = 'grid' }: { variant?: 'grid' | 'select' }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (variant === 'select') {
    return (
      <label className="btn w-full justify-start gap-2 hover:bg-slate-100 dark:hover:bg-slate-900">
        <Palette size={18} />
        <select
          aria-label="المظهر"
          className="w-full cursor-pointer bg-transparent text-sm font-semibold outline-none"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
          <option value="system">تلقائي</option>
        </select>
      </label>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            aria-pressed={active}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-right transition hover:opacity-90 ${active ? 'border-coral ring-2 ring-coral/40' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <span className="flex -space-x-2" dir="ltr">
              <span className="h-6 w-6 rounded-full border border-white" style={{ background: t.swatch }} />
              <span className="h-6 w-6 rounded-full border border-white" style={{ background: t.swatch2 }} />
            </span>
            <span className="flex-1 text-sm font-bold">{t.label}</span>
            {active && <Check size={16} className="text-coral" />}
          </button>
        );
      })}
    </div>
  );
}
