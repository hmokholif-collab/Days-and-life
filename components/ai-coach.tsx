'use client';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { currentStreak, getWeeklyGoal, isDemoSession, loadSessions, subjectTotals, weekTotalHours } from '@/lib/sessions';
import { hoursForWeek, loadPlans } from '@/lib/plans';

// بطاقة "المدرب الذكي" في الرئيسية — بتبعت ملخص حقيقي من بيانات الجهاز لـ /api/ai/plan
// وبتعرض النصيحة. المفتاح مش موجود عند المستخدم؟ النصيحة الجاهزة بتظهر مع ملاحظة صريحة إنها مش ذكاء اصطناعي.
export function AiCoach() {
  const { t, locale } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [advice, setAdvice] = useState('');
  const [source, setSource] = useState<'grok' | 'built-in'>('built-in');

  const realSessions = loadSessions().filter((s) => !isDemoSession(s));

  async function ask() {
    setStatus('loading');
    setAdvice('');
    try {
      const plans = loadPlans().map((p) => {
        const weekHours = hoursForWeek(p.subject, p.id);
        return {
          subject: p.subject,
          dailyTarget: p.dailyTarget,
          weeklyTarget: p.weeklyTarget,
          weekHours: Math.round(weekHours * 100) / 100,
        };
      });
      const recent = realSessions.slice(0, 7).map((s) => ({ subject: s.subject, hours: s.hours, date: s.date, type: s.type }));
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyHours: weekTotalHours(),
          weeklyGoal: getWeeklyGoal(),
          streak: currentStreak(),
          topSubject: subjectTotals()[0]?.subject ?? '',
          plans,
          recent,
          locale,
        }),
      });
      if (!res.ok) throw new Error('coach request failed');
      const data = (await res.json()) as { advice?: string; source?: 'grok' | 'built-in' };
      if (!data.advice) throw new Error('empty advice');
      setAdvice(data.advice);
      setSource(data.source === 'grok' ? 'grok' : 'built-in');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="card">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-2xl bg-gradient-to-br from-coral to-amber-500 p-2.5 text-white shadow-sm">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black">{t('coach.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('coach.subtitle')}</p>
        </div>
      </div>

      {realSessions.length === 0 && status === 'idle' && (
        <p className="mt-4 text-sm font-semibold text-slate-500">{t('coach.noData')}</p>
      )}

      {status === 'done' && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${source === 'grok' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              {source === 'grok' ? t('coach.grokBadge') : t('coach.builtinBadge')}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">{advice}</p>
          {source === 'built-in' && (
            <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">{t('coach.builtinNote')}</p>
          )}
        </div>
      )}

      {status === 'error' && (
        <p className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:bg-red-950/50 dark:text-red-300">{t('coach.error')}</p>
      )}

      <button
        type="button"
        onClick={ask}
        disabled={status === 'loading'}
        className="btn-primary mt-4 w-full disabled:opacity-60"
      >
        {status === 'loading' ? t('coach.asking') : status === 'done' ? t('coach.again') : status === 'error' ? t('coach.retry') : t('coach.ask')}
      </button>
    </section>
  );
}
