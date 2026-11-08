'use client';
import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { RegisterSW } from './register-sw';
import { ThemeColorSync } from './theme-color';
import { LanguageProvider } from '@/lib/i18n';
import { THEMES } from './theme-picker';
import { scheduleDailyReminder } from '@/lib/reminders';
// بيشغّل التذكير اليومي (لو متظبط) أول ما التطبيق يفتح.
function ReminderScheduler() {
  useEffect(() => { scheduleDailyReminder(); }, []);
  return null;
}
export function Providers({ children }: { children: React.ReactNode }) { return <LanguageProvider><ThemeProvider attribute="class" defaultTheme="light" themes={[...THEMES.map((t) => t.id), 'system']}><RegisterSW/><ThemeColorSync/><ReminderScheduler/>{children}</ThemeProvider></LanguageProvider>; }
