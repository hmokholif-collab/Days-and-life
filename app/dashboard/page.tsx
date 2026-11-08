'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Clock3, Flame, Trophy } from 'lucide-react';
import { StudyTimer } from '@/components/study-timer';
import { TaskForm } from '@/components/task-form';
import { TodayWidget } from '@/components/today-widget';
import { SESSIONS_EVENT, bestSubjectToday, currentStreak, formatHours, getWeeklyGoal, syncWithSupabase, todayHours, todaySessions, weekHours, weekTotalHours, type StudySession } from '@/lib/sessions';
import { typeLabel, useLanguage } from '@/lib/i18n';

// لون باستيل ثابت لكل مادة — يتحدد من اسم المادة نفسه عشان يفضل ثابت.
const SUBJECT_ACCENTS = [
  'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
  'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300',
  'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300',
  'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300',
  'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
  'bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300',
];
function accentFor(subject: string): string {
  let h = 0;
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return SUBJECT_ACCENTS[h % SUBJECT_ACCENTS.length];
}
export default function Dashboard() {
  const { t, locale } = useLanguage();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(15);
  useEffect(() => {
    const refresh = () => { setSessions(todaySessions()); setWeeklyGoal(getWeeklyGoal()); };
    refresh();
    void syncWithSupabase().then(() => refresh());
    window.addEventListener(SESSIONS_EVENT, refresh);
    return () => window.removeEventListener(SESSIONS_EVENT, refresh);
  }, []);
  const hours = todayHours();
  const best = bestSubjectToday();
  const streak = currentStreak();
  const week = weekHours(locale);
  const weekTotal = weekTotalHours();
  const weekMax = Math.max(...week.map((d) => d.hours), 1);
  const WEEKLY_GOAL = weeklyGoal;
  const weekRemaining = Math.max(0, WEEKLY_GOAL - weekTotal);
  const cards = [
    { label: t('dashboard.hoursToday'), value: formatHours(hours), suffix: t('common.hoursWord'), icon: Clock3, color: 'text-coral' },
    { label: t('dashboard.bestSubject'), value: best ? best.subject : '—', suffix: best ? `${formatHours(best.hours)} ${t('common.hoursWord')}` : t('dashboard.noSessions'), icon: Trophy, color: 'text-amber-500' },
    { label: t('dashboard.streak'), value: String(streak), suffix: t('dashboard.daysSuffix'), icon: Flame, color: 'text-orange-500' },
  ];
  return <div className="mx-auto max-w-6xl p-5 md:p-10"><header className="mb-8"><p className="text-slate-500">{new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1 className="mt-1 text-3xl font-black">{t('dashboard.greeting')}</h1><p className="mt-2 text-slate-600 dark:text-slate-300">{t('dashboard.subtitle')}</p></header><div className="mb-5"><TodayWidget /></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{cards.map(({label,value,suffix,icon:Icon,color},i)=><div className={i === 2 ? 'card col-span-2 sm:col-span-1' : 'card'} key={label}><div className="w-fit rounded-xl bg-slate-100 p-2 dark:bg-slate-800"><Icon className={color}/></div><p className="mt-6 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="text-sm text-slate-500">{suffix}</p></div>)}</div><div className="mt-5"><StudyTimer/></div><div className="mt-5"><TaskForm/></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="card"><div className="flex items-center justify-between"><h2 className="font-black">{t('dashboard.sessionsToday')}</h2>{sessions.length > 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">{t('dashboard.excellent')}</span>}</div>{sessions.length === 0 ? <div className="mt-4 flex flex-col items-center rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700"><span className="rounded-full bg-orange-100 p-3 text-coral dark:bg-orange-950/60"><BookOpen size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-500">{t('dashboard.noSessions')}</p></div> : <div className="mt-4 space-y-3">{sessions.map(s=><div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/50" key={s.id}><div className={`shrink-0 rounded-2xl p-2.5 ${accentFor(s.subject)}`}><BookOpen size={18}/></div><div className="min-w-0 flex-1"><p className="truncate font-bold">{s.subject}</p><p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500"><span className="rounded-full bg-white px-2 py-0.5 font-bold ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-700">{typeLabel(s.type, locale)}</span>{s.notes && <span className="truncate">{s.notes}</span>}</p></div><span className="shrink-0 rounded-full bg-gradient-to-r from-coral to-amber-500 px-3 py-1.5 text-sm font-black text-white shadow-sm">{formatHours(s.hours)} {t('common.hoursShort')}</span></div>)}</div>}</section><section className="card bg-ink text-white"><p className="text-slate-300">{t('dashboard.weekSummary')}</p><p className="mt-3 text-4xl font-black">{formatHours(weekTotal)} <small className="text-base">{t('common.hoursWord')}</small></p><div className="mt-7 flex h-24 items-end justify-between gap-2">{week.map((d,i)=><div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t-lg bg-mint/80" style={{height:`${Math.max(d.hours > 0 ? 8 : 2, (d.hours / weekMax) * 100)}%`}} title={`${d.day}: ${formatHours(d.hours)} ${t('common.hoursWord')}`}/><span className="text-[10px] text-slate-300">{d.day}</span></div>)}</div><p className="mt-3 text-sm text-slate-300">{weekRemaining > 0 ? (locale === 'ar' ? `بقي ${formatHours(weekRemaining)} ساعة للوصول إلى هدفك الأسبوعي (${WEEKLY_GOAL} ساعة).` : `${formatHours(weekRemaining)} h left to reach your weekly goal (${WEEKLY_GOAL} h).`) : t('dashboard.weekGoalDone')}</p></section></div></div>; }
