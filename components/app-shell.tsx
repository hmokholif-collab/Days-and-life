'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, BookOpenCheck, CalendarDays, LayoutDashboard, LogOut, Settings, Sun, Timer } from 'lucide-react';
import { ThemePicker } from './theme-picker';
import { createClient } from '@/lib/supabase/client';
import { useLanguage, type DictKey } from '@/lib/i18n';
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const links: { href: string; labelKey: DictKey; icon: typeof LayoutDashboard }[] = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/plan', labelKey: 'nav.plan', icon: CalendarDays },
    { href: '/timer', labelKey: 'nav.timer', icon: Timer },
    { href: '/log', labelKey: 'nav.log', icon: BookOpenCheck },
    { href: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
    { href: '/settings', labelKey: 'nav.settings', icon: Settings },
  ];
  // شريط الموبايل اللي تحت — فيه /today كمان (القايمة الجانبية مخفية على الموبايل).
  const mobileLinks: { href: string; labelKey: DictKey; icon: typeof LayoutDashboard }[] = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/plan', labelKey: 'nav.plan', icon: CalendarDays },
    { href: '/timer', labelKey: 'nav.timer', icon: Timer },
    { href: '/today', labelKey: 'nav.today', icon: Sun },
    { href: '/log', labelKey: 'nav.log', icon: BookOpenCheck },
    { href: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
    { href: '/settings', labelKey: 'nav.settings', icon: Settings },
  ];
  async function signOut() {
    try { await createClient().auth.signOut(); } catch { /* مفيش Supabase — الخروج محلي بس */ }
    router.push('/');
    router.refresh();
  }
  return <div className="min-h-screen md:flex"><aside className="hidden w-64 shrink-0 border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 md:flex md:flex-col"><Link href="/dashboard" className="mb-10 text-xl font-black">Days <span className="text-coral">and</span> Life</Link><nav className="space-y-2">{links.map(({ href, labelKey, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${path === href ? 'bg-ink text-white dark:bg-coral' : 'hover:bg-slate-100 dark:hover:bg-slate-900'}`}><Icon size={19}/>{t(labelKey)}</Link>)}</nav><div className="mt-auto space-y-2"><Link href="/today" className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${path === '/today' ? 'bg-ink text-white dark:bg-coral' : 'hover:bg-slate-100 dark:hover:bg-slate-900'}`}><Sun size={19}/>{t('today.openTodayPage')}</Link><ThemePicker variant="select"/><button type="button" onClick={signOut} className="btn w-full justify-start text-slate-500"><LogOut size={18}/>{t('nav.logout')}</button></div></aside><main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main><nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-slate-200 bg-white/95 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">{mobileLinks.map(({ href, labelKey, icon: Icon }) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-1 text-[11px] ${path === href ? 'text-coral' : 'text-slate-500'}`}><Icon size={19}/>{t(labelKey)}</Link>)}</nav></div>;
}
