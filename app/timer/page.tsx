'use client';
import { StudyTimer } from '@/components/study-timer';
import { useLanguage } from '@/lib/i18n';
export default function TimerPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-3xl p-5 md:p-10">
      <h1 className="text-3xl font-black">{t('timer.title')}</h1>
      <p className="mt-2 text-slate-500">{t('timer.subtitle')}</p>
      <div className="mt-6"><StudyTimer /></div>
    </div>
  );
}
