'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Flame, Play, Timer } from 'lucide-react';
import { SESSIONS_EVENT, cairoISOFromDate, currentStreak, formatHours, todayHours, todaySessions, type StudySession } from '@/lib/sessions';
import { PLANS_EVENT, hoursForDay, isChecked, loadPlans, toggleCheck, type PlanItem } from '@/lib/plans';
import { typeLabel, useLanguage } from '@/lib/i18n';

export interface TopPlanItem {
  plan: PlanItem;
  todayH: number;
  remaining: number;
  pct: number;
  checked: boolean;
}

function useTodayData() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  useEffect(() => {
    const refresh = () => { setPlans(loadPlans()); setSessions(todaySessions()); };
    refresh();
    window.addEventListener(PLANS_EVENT, refresh);
    window.addEventListener(SESSIONS_EVENT, refresh);
    return () => {
      window.removeEventListener(PLANS_EVENT, refresh);
      window.removeEventListener(SESSIONS_EVENT, refresh);
    };
  }, []);
  const todayIso = cairoISOFromDate(new Date());
  const hours = todayHours();
  const streak = currentStreak();
  // أهم مهام اليوم: الخطط اللي لها هدف يومي، مرتبة حسب المتبقي (الأكبر أولًا)، أول 4.
  // الخطط المخلصة (100%) بتنزل تحت الخطط اللي لسه مخلصتش.
  const topPlans: TopPlanItem[] = plans
    .filter((p) => p.dailyTarget !== undefined)
    .map((plan) => {
      const todayH = Math.round(hoursForDay(plan.subject, todayIso, plan.id) * 100) / 100;
      const target = plan.dailyTarget as number;
      const checked = isChecked(plan.id, todayIso);
      return { plan, todayH, remaining: Math.max(0, Math.round((target - todayH) * 100) / 100), pct: checked ? 100 : Math.min(100, Math.round((todayH / target) * 100)), checked };
    })
    .sort((a, b) => (a.checked === b.checked ? b.remaining - a.remaining : a.checked ? 1 : -1))
    .slice(0, 4);
  return { sessions, hours, streak, topPlans, todayIso };
}

export function TodayWidget({ detailed = false }: { detailed?: boolean }) {
  const { t, locale } = useLanguage();
  const { sessions, hours, streak, topPlans, todayIso } = useTodayData();
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-white via-[#fff8f6] to-[#eefdf6] p-5 shadow-[0_16px_50px_rgb(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:bg-none sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2 className="mt-1 text-2xl font-black">{t('today.title')}</h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-black text-orange-600 dark:bg-orange-950/60 dark:text-orange-300"><Flame size={16} />{streak}</span>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-500">{t('dashboard.hoursToday')}</p>
      <div className="flex items-end gap-2">
        <span className="text-5xl font-black tabular-nums leading-none">{formatHours(hours)}</span>
        <span className="pb-0.5 text-base font-bold text-slate-500">{t('common.hoursWord')}</span>
      </div>

      <p className="mt-5 text-sm font-black text-slate-500">{t('today.topToday')}</p>
      <div className="mt-2 space-y-3">
        {topPlans.length === 0 ? (
          <p className="text-sm text-slate-500">{t('today.noPlans')}</p>
        ) : (
          topPlans.map(({ plan, remaining, pct, checked }) => (
            <div key={plan.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-bold">
                  <button
                    type="button"
                    onClick={() => toggleCheck(plan.id, todayIso)}
                    aria-label={checked ? t('plan.unmarkDone') : t('plan.markDone')}
                    aria-pressed={checked}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400 dark:border-slate-600'}`}
                  >
                    <Check size={13} strokeWidth={3.5} />
                  </button>
                  <span className="truncate">{plan.subject}</span>
                </span>
                <span className="shrink-0 text-slate-500">{checked ? t('plan.done') : remaining > 0 ? `${t('plan.remaining')} ${formatHours(remaining)} ${t('common.hoursShort')}` : t('plan.done')}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-coral to-amber-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      {detailed ? (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-500">{t('dashboard.sessionsToday')}</p>
            <Link href="/log" className="text-xs font-bold text-coral">{t('today.viewAll')}</Link>
          </div>
          {sessions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t('dashboard.noSessions')}</p>
          ) : (
            <div className="mt-2 space-y-2">
              {sessions.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm ring-1 ring-slate-200/60 dark:bg-slate-800/60 dark:ring-slate-700/60">
                  <span className="min-w-0 flex-1 truncate font-bold">{s.subject}</span>
                  <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">{typeLabel(s.type, locale)}{s.notes ? ` · ${s.notes}` : ''}</span>
                  <b className="shrink-0">{formatHours(s.hours)} {t('common.hoursShort')}</b>
                </div>
              ))}
            </div>
          )}
          <Link href="/timer" className="mt-5 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-amber-500 py-3 font-black text-white shadow-lg shadow-coral/30 transition hover:opacity-95">
            <Timer size={18} />{t('today.openTimer')}
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              <b className="text-slate-700 dark:text-slate-200">{sessions.length}</b> {t('today.sessionsWord')} · <b className="text-slate-700 dark:text-slate-200">{formatHours(hours)}</b> {t('common.hoursWord')}
            </p>
            <Link href="/today" className="text-xs font-bold text-coral">{t('today.openTodayPage')}</Link>
          </div>
          <Link href="/timer" className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-coral to-amber-500 px-4 py-2 text-sm font-black text-white shadow-md shadow-coral/30 transition hover:opacity-95">
            <Play size={15} />{t('today.openTimer')}
          </Link>
        </div>
      )}
    </div>
  );
}
