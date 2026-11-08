'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { dailyAverageThisMonth, formatHours, longestStreak, monthTotalHours, smartNote, subjectTotals, weekHours } from '@/lib/sessions';
import { useLanguage } from '@/lib/i18n';
// الرسم البياني (recharts) بيتحمّل لما الصفحة تفتح بس — عشان صفحة الإحصائيات تبقى أخف على الموبايل.
const WeeklyChart = dynamic(() => import('@/components/weekly-chart'), { ssr: false, loading: () => <div className="mt-6 h-72" /> });
export default function Stats() {
  const { t, locale } = useLanguage();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready) return <div className="mx-auto max-w-6xl p-5 md:p-10"><h1 className="text-3xl font-black">{t('stats.title')}</h1><p className="mt-2 text-slate-500">{t('stats.subtitle')}</p></div>;
  const weekly = weekHours(locale);
  const subjects = subjectTotals();
  const hasData = subjects.length > 0;
  return <div className="mx-auto max-w-6xl p-5 md:p-10"><h1 className="text-3xl font-black">{t('stats.title')}</h1><p className="mt-2 text-slate-500">{t('stats.subtitle')}</p>{!hasData && <p className="card mt-6 text-slate-500">{t('stats.noData')}</p>}<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3"><div className="card"><p className="text-slate-500">{t('stats.monthTotal')}</p><b className="mt-2 block text-3xl">{formatHours(monthTotalHours())} {t('common.hoursShort')}</b></div><div className="card"><p className="text-slate-500">{t('stats.dailyAvg')}</p><b className="mt-2 block text-3xl">{formatHours(dailyAverageThisMonth())} {t('common.hoursShort')}</b></div><div className="card col-span-2 sm:col-span-1"><p className="text-slate-500">{t('stats.longestStreak')}</p><b className="mt-2 block text-3xl">{longestStreak()} {t('stats.days')}</b></div></div><section className="card mt-5"><h2 className="font-black">{t('stats.weeklyHours')}</h2><WeeklyChart data={weekly} hoursWord={t('common.hoursWord')} hoursLabel={t('stats.hoursLabel')} /></section><div className="mt-5 grid gap-5 md:grid-cols-2"><section className="card"><h2 className="font-black">{t('stats.topSubjects')}</h2>{subjects.length === 0 ? <p className="mt-4 text-slate-500">{t('stats.emptySubjects')}</p> : subjects.slice(0, 3).map(({subject, hours, pct})=><div className="mt-5" key={subject}><div className="mb-2 flex justify-between"><b>{subject}</b><span className="text-slate-500">{formatHours(hours)} {t('common.hoursShort')} · {pct}%</span></div><div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-mint" style={{width:`${pct}%`}}/></div></div>)}</section><section className="card"><h2 className="font-black">{t('stats.smartNoteTitle')}</h2><p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">{smartNote(locale)}</p><Link href="/timer" className="btn-primary mt-5">{t('stats.startFocus')}</Link></section></div></div>;
}
