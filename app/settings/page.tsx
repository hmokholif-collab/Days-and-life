'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Download, Globe2, Palette, Target, UserRound } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { createClient } from '@/lib/supabase/client';
import { useLanguage, type Locale } from '@/lib/i18n';
import { getNotificationState, requestNotificationPermission, type NotifState } from '@/lib/notifications';
import { getWeeklyGoal, setWeeklyGoal, loadSessions } from '@/lib/sessions';
import { loadPlans, loadChecks } from '@/lib/plans';
import { getReminderTime, setReminderTime } from '@/lib/reminders';

export default function Settings() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const [auth, setAuth] = useState<{ configured: boolean; signedIn: boolean; email?: string; tableOk?: boolean; tableMissing?: boolean }>({ configured: false, signedIn: false });
  const [notif, setNotif] = useState<NotifState>('default');
  const [goal, setGoal] = useState(15);
  const [reminder, setReminder] = useState('');
  const [reminderSaved, setReminderSaved] = useState(false);
  const [exported, setExported] = useState(false);
  useEffect(() => {
    setNotif(getNotificationState());
    setGoal(getWeeklyGoal());
    setReminder(getReminderTime());
    void import('@/lib/supabase/sync').then((m) => m.getSyncStatus()).then(setAuth).catch(() => { /* مفيش Supabase */ });
  }, []);
  async function enableNotifications() {
    setNotif(await requestNotificationPermission());
  }
  async function signOut() {
    try { await createClient().auth.signOut(); } catch { /* مفيش Supabase */ }
    setAuth({ configured: auth.configured, signedIn: false });
    router.refresh();
  }
  function saveGoal(v: string) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1) return;
    setWeeklyGoal(n);
    setGoal(Math.max(1, Math.min(100, Math.round(n))));
  }
  function saveReminder(v: string) {
    setReminder(v);
    setReminderTime(v);
    setReminderSaved(true);
    setTimeout(() => setReminderSaved(false), 3000);
  }
  function exportBackup() {
    try {
      const data = { app: 'days-and-life', exportedAt: new Date().toISOString(), sessions: loadSessions(), plans: loadPlans(), checks: loadChecks() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'days-and-life-backup.json';
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch { /* التنزيل غير متاح */ }
  }
  return <div className="mx-auto max-w-3xl p-5 md:p-10"><h1 className="text-3xl font-black">{t('settings.title')}</h1><div className="mt-6 space-y-4"><section className="card"><div className="flex items-center gap-3"><UserRound className="text-coral"/><div><h2 className="font-bold">{t('settings.account')}</h2><p className="text-sm text-slate-500">{auth.signedIn ? auth.email : auth.configured ? t('settings.notSignedIn') : t('settings.localAccount')}</p></div></div>{auth.signedIn ? <>{auth.tableMissing ? <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 dark:bg-amber-950/50">{t('settings.syncTableMissing')}</p> : auth.tableOk ? <p className="mt-3 text-sm text-emerald-600">{t('settings.syncOn')}</p> : <p className="mt-3 text-sm text-slate-500">{t('settings.syncOn')}</p>}<button className="btn mt-4 border border-slate-300" onClick={signOut}>{t('settings.signOut')}</button></> : auth.configured ? <><p className="mt-3 text-sm text-slate-500">{t('settings.signInPrompt')}</p><Link href="/login" className="btn-primary mt-4">{t('settings.signIn')}</Link></> : <p className="mt-3 text-sm text-slate-500">{t('settings.notConfigured')}</p>}</section><section className="card"><div className="flex items-center gap-3"><Target className="text-coral"/><h2 className="font-bold">{t('settings.weeklyGoal')}</h2></div><p className="mt-2 text-sm text-slate-500">{t('settings.weeklyGoalHint')}</p><div className="mt-3 flex items-center gap-2"><input className="input max-w-32" type="number" min={1} max={100} value={goal} onChange={(e) => saveGoal(e.target.value)} /><span className="text-sm text-slate-500">{t('common.hoursWord')}</span></div></section><section className="card"><div className="flex items-center gap-3"><Download className="text-coral"/><div><h2 className="font-bold">{t('settings.exportData')}</h2><p className="text-sm text-slate-500">{t('settings.exportHint')}</p></div></div><button className="btn-primary mt-4" onClick={exportBackup}>{t('settings.exportData')}</button>{exported && <p className="mt-3 text-sm font-semibold text-emerald-600">{t('settings.exportDone')}</p>}</section><section className="card"><div className="flex items-center gap-3"><Globe2 className="text-coral"/><h2 className="font-bold">{t('settings.langAppearance')}</h2></div><div className="mt-4"><label className="mb-2 block text-sm font-bold text-slate-500">{t('settings.language')}</label><select className="input" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}><option value="ar">العربية</option><option value="en">English</option></select></div><div className="mt-5"><div className="mb-3 flex items-center gap-2 font-bold"><Palette className="text-coral" size={18}/>{t('settings.chooseTheme')}</div><ThemePicker/></div><p className="mt-3 text-sm text-slate-500">{t('settings.themeNote')}</p></section><section className="card"><div className="flex items-center gap-3"><Bell className="text-coral"/><div><h2 className="font-bold">{t('settings.reminders')}</h2><p className="text-sm text-slate-500">{t('settings.remindersText')}</p></div></div>{notif === 'granted' ? <p className="mt-3 text-sm font-semibold text-emerald-600">{t('settings.notifGranted')}</p> : notif === 'denied' ? <p className="mt-3 text-sm font-semibold text-red-600">{t('settings.notifDenied')}</p> : notif === 'unsupported' ? <p className="mt-3 text-sm text-slate-500">{t('settings.notifUnsupported')}</p> : <><button className="btn-primary mt-4" onClick={enableNotifications}>{t('settings.enableReminders')}</button></>}<div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800"><label className="mb-2 block text-sm font-bold text-slate-500">{t('settings.dailyReminder')}</label><p className="text-sm text-slate-500">{t('settings.dailyReminderHint')}</p><div className="mt-3 flex items-center gap-2"><input className="input max-w-40" type="time" value={reminder} onChange={(e) => saveReminder(e.target.value)} /><button className="btn border border-slate-300" onClick={() => saveReminder('')}>{t('settings.reminderOff')}</button></div>{reminderSaved && <p className="mt-3 text-sm font-semibold text-emerald-600">{t('settings.reminderSaved')}</p>}</div></section></div></div>;
}
