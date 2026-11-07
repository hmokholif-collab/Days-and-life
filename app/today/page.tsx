'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { TodayWidget } from '@/components/today-widget';
import { useLanguage } from '@/lib/i18n';

// صفحة ودجت مستقلة — من غير AppShell عشان تبقى خفيفة وشبه ودجت الهاتف.
// تنبيه صادق: تطبيق ويب (PWA) لا يستطيع إضافة ودجت حقيقية لشاشة أندرويد الرئيسية؛
// البديل الشغال هو إضافة هذه الصفحة للشاشة الرئيسية من كروم كاختصار.
export default function TodayPage() {
  const { t, locale } = useLanguage();
  return (
    <main className="mx-auto min-h-screen max-w-md p-5">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-coral">
        {locale === 'ar' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}{t('today.back')}
      </Link>
      <div className="mt-4"><TodayWidget detailed /></div>
      <p className="mt-4 text-center text-xs leading-5 text-slate-400">{t('today.widgetNote')}</p>
    </main>
  );
}
