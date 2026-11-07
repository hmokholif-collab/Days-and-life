'use client';
import { ThemeProvider } from 'next-themes';
import { RegisterSW } from './register-sw';
import { THEMES } from './theme-picker';
export function Providers({ children }: { children: React.ReactNode }) { return <ThemeProvider attribute="class" defaultTheme="light" themes={[...THEMES.map((t) => t.id), 'system']}><RegisterSW/>{children}</ThemeProvider>; }
