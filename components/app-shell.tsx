'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpenCheck, CalendarDays, LayoutDashboard, LogOut, Settings, Timer } from 'lucide-react';
import { ThemePicker } from './theme-picker';
import { useLanguage, type DictKey } from '@/lib/i18n';
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t } = useLanguage();
  const links: { href: string; labelKey: DictKey; icon: typeof LayoutDashboard }[] = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/plan', labelKey: 'nav.plan', icon: CalendarDays },
    { href: '/timer', labelKey: 'nav.timer', icon: Timer },
    { href: '/log', labelKey: 'nav.log', icon: BookOpenCheck },
    { href: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
    { href: '/settings', labelKey: 'nav.settings', icon: Settings },
  ];
  return <div className="min-h-screen md:flex"><aside className="hidden w-64 shrink-0 border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 md:flex md:flex-col"><Link href="/dashboard" className="mb-10 text-xl font-black">Days <span className="text-coral">and</span> Life</Link><nav className="space-y-2">{links.map(({ href, labelKey, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${path === href ? 'bg-ink text-white dark:bg-coral' : 'hover:bg-slate-100 dark:hover:bg-slate-900'}`}><Icon size={19}/>{t(labelKey)}</Link>)}</nav><div className="mt-auto space-y-2"><ThemePicker variant="select"/><Link href="/" className="btn w-full justify-start text-slate-500"><LogOut size={18}/>{t('nav.logout')}</Link></div></aside><main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main><nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-slate-200 bg-white/95 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">{links.map(({ href, labelKey, icon: Icon }) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-2 text-xs ${path === href ? 'text-coral' : 'text-slate-500'}`}><Icon size={19}/>{t(labelKey)}</Link>)}</nav></div>;
}
