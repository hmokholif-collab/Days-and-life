'use client';
import { ThemeProvider } from 'next-themes';
import { RegisterSW } from './register-sw';
import { ThemeColorSync } from './theme-color';
import { THEMES } from './theme-picker';
export function Providers({ children }: { children: React.ReactNode }) { return <ThemeProvider attribute="class" defaultTheme="light" themes={[...THEMES.map((t) => t.id), 'system']}><RegisterSW/><ThemeColorSync/>{children}</ThemeProvider>; }
