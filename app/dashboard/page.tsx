'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Clock3, Flame, Trophy } from 'lucide-react';
import { StudyTimer } from '@/components/study-timer';
import { TaskForm } from '@/components/task-form';
import { SESSIONS_EVENT, bestSubjectToday, currentStreak, formatHours, syncWithSupabase, todayHours, todaySessions, weekHours, weekTotalHours, type StudySession } from '@/lib/sessions';
export default function Dashboard() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  useEffect(() => {
    const refresh = () => setSessions(todaySessions());
    refresh();
    void syncWithSupabase().then(() => refresh());
    window.addEventListener(SESSIONS_EVENT, refresh);
    return () => window.removeEventListener(SESSIONS_EVENT, refresh);
  }, []);
  const hours = todayHours();
  const best = bestSubjectToday();
  const streak = currentStreak();
  const week = weekHours();
  const weekTotal = weekTotalHours();
  const weekMax = Math.max(...week.map((d) => d.hours), 1);
  const WEEKLY_GOAL = 15;
  const weekRemaining = Math.max(0, WEEKLY_GOAL - weekTotal);
  const cards = [
    { label: 'ساعات اليوم', value: formatHours(hours), suffix: 'ساعة', icon: Clock3, color: 'text-coral' },
    { label: 'أفضل مادة', value: best ? best.subject : '—', suffix: best ? `${formatHours(best.hours)} ساعة` : 'لسه مفيش جلسات', icon: Trophy, color: 'text-amber-500' },
    { label: 'الـ Streak', value: String(streak), suffix: 'أيام متتالية', icon: Flame, color: 'text-orange-500' },
  ];
  return <div className="mx-auto max-w-6xl p-5 md:p-10"><header className="mb-8"><p className="text-slate-500">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1 className="mt-1 text-3xl font-black">أهلًا يا بطل 👋</h1><p className="mt-2 text-slate-600 dark:text-slate-300">خلّينا ننجز خطوة مفيدة اليوم.</p></header><div className="grid gap-4 sm:grid-cols-3">{cards.map(({label,value,suffix,icon:Icon,color})=><div className="card" key={label}><div className="w-fit rounded-xl bg-slate-100 p-2 dark:bg-slate-800"><Icon className={color}/></div><p className="mt-6 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="text-sm text-slate-500">{suffix}</p></div>)}</div><div className="mt-5"><StudyTimer/></div><div className="mt-5"><TaskForm/></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="card"><div className="flex items-center justify-between"><h2 className="font-black">جلسات اليوم</h2><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">ممتاز!</span></div><div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{sessions.length === 0 ? <p className="py-4 text-slate-500">لسه مفيش جلسات النهاردة — ضيف أول جلسة من فوق.</p> : sessions.map(s=><div className="flex items-center justify-between py-4" key={s.id}><div className="flex items-center gap-3"><div className="rounded-xl bg-orange-100 p-2 text-coral"><BookOpen size={18}/></div><div><p className="font-bold">{s.subject}</p><p className="text-sm text-slate-500">{s.type}{s.notes ? ` · ${s.notes}` : ''}</p></div></div><b>{formatHours(s.hours)} س</b></div>)}</div></section><section className="card bg-ink text-white"><p className="text-slate-300">ملخص هذا الأسبوع</p><p className="mt-3 text-4xl font-black">{formatHours(weekTotal)} <small className="text-base">ساعة</small></p><div className="mt-7 flex h-24 items-end justify-between gap-2">{week.map((d,i)=><div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t-lg bg-mint/80" style={{height:`${Math.max(d.hours > 0 ? 8 : 2, (d.hours / weekMax) * 100)}%`}} title={`${d.day}: ${formatHours(d.hours)} ساعة`}/><span className="text-[10px] text-slate-300">{d.day}</span></div>)}</div><p className="mt-3 text-sm text-slate-300">{weekRemaining > 0 ? `بقي ${formatHours(weekRemaining)} ساعة للوصول إلى هدفك الأسبوعي (${WEEKLY_GOAL} ساعة).` : 'وصلت لهدفك الأسبوعي 🎉'}</p></section></div></div>; }
