'use client';
import { ThemeProvider } from 'next-themes';
import { RegisterSW } from './register-sw';
export function Providers({ children }: { children: React.ReactNode }) { return <ThemeProvider attribute="class" defaultTheme="system" enableSystem><RegisterSW/>{children}</ThemeProvider>; }
