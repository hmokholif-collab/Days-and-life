'use client';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { THEMES } from './theme-picker';

// لون حواف الموبايل (شريط الحالة فوق وشريط التنقل تحت) بيتبع الثيم اللي مختاره،
// بدل اللون الأحمر الثابت اللي كان في الـ manifest.
export function ThemeColorSync() {
  const { theme, resolvedTheme } = useTheme();
  useEffect(() => {
    const id = resolvedTheme ?? theme ?? 'light';
    const color = THEMES.find((t) => t.id === id)?.bar ?? '#f7f8fc';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  }, [theme, resolvedTheme]);
  return null;
}
