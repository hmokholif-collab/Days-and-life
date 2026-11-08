// تذكير يومي بسيط — وقت واحد في اليوم، إشعار محلي.
// صادق: ده بيشتغل لما التطبيق مفتوح (مفيش push من السيرفر)، فهو تذكير خفيف مش منبّه مضمون.
import { showNotification } from '@/lib/notifications';
import { translateKey } from '@/lib/i18n';

const KEY = 'days-life-reminder-time'; // 'HH:MM' أو '' (مفيش تذكير)

export function getReminderTime(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setReminderTime(hhmm: string): void {
  try {
    if (hhmm) localStorage.setItem(KEY, hhmm);
    else localStorage.removeItem(KEY);
  } catch { /* التخزين المحلي غير متاح */ }
  scheduleDailyReminder();
}

let timer: ReturnType<typeof setTimeout> | null = null;

export function scheduleDailyReminder(): void {
  if (typeof window === 'undefined') return;
  if (timer) clearTimeout(timer);
  const hhmm = getReminderTime();
  if (!hhmm) return;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return;
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  timer = setTimeout(() => {
    void showNotification('Days and Life', translateKey('reminders.dailyText'));
    scheduleDailyReminder();
  }, delay);
}
