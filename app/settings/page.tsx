'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Globe2, Palette, UserRound } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { createClient } from '@/lib/supabase/client';
import { useLanguage, type Locale } from '@/lib/i18n';
export default function Settings() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const [auth, setAuth] = useState<{ configured: boolean; signedIn: boolean; email?: string }>({ configured: false, signedIn: false });
  useEffect(() => {
    void import('@/lib/supabase/sync').then((m) => m.getSyncStatus()).then(setAuth).catch(() => { /* مفيش Supabase */ });
  }, []);
  async function signOut() {
    try { await createClient().auth.signOut(); } catch { /* مفيش Supabase */ }
    setAuth({ configured: auth.configured, signedIn: false });
    router.refresh();
  }
  return <div className="mx-auto max-w-3xl p-5 md:p-10"><h1 className="text-3xl font-black">{t('settings.title')}</h1><div className="mt-6 space-y-4"><section className="card"><div className="flex items-center gap-3"><UserRound className="text-coral"/><div><h2 className="font-bold">{t('settings.account')}</h2><p className="text-sm text-slate-500">{auth.signedIn ? auth.email : auth.configured ? t('settings.notSignedIn') : t('settings.localAccount')}</p></div></div>{auth.signedIn ? <><p className="mt-3 text-sm text-emerald-600">{t('settings.syncOn')}</p><button className="btn mt-4 border border-slate-300" onClick={signOut}>{t('settings.signOut')}</button></> : auth.configured ? <><p className="mt-3 text-sm text-slate-500">{t('settings.signInPrompt')}</p><Link href="/login" className="btn-primary mt-4">{t('settings.signIn')}</Link></> : <p className="mt-3 text-sm text-slate-500">{t('settings.notConfigured')}</p>}</section><section className="card"><div className="flex items-center gap-3"><Globe2 className="text-coral"/><h2 className="font-bold">{t('settings.langAppearance')}</h2></div><div className="mt-4"><label className="mb-2 block text-sm font-bold text-slate-500">{t('settings.language')}</label><select className="input" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}><option value="ar">العربية</option><option value="en">English</option></select></div><div className="mt-5"><div className="mb-3 flex items-center gap-2 font-bold"><Palette className="text-coral" size={18}/>{t('settings.chooseTheme')}</div><ThemePicker/></div><p className="mt-3 text-sm text-slate-500">{t('settings.themeNote')}</p></section><section className="card"><div className="flex items-center gap-3"><Bell className="text-coral"/><div><h2 className="font-bold">{t('settings.reminders')}</h2><p className="text-sm text-slate-500">{t('settings.remindersText')}</p></div></div><button className="btn-primary mt-4" onClick={() => Notification?.requestPermission?.()}>{t('settings.enableReminders')}</button></section></div></div>;
}
