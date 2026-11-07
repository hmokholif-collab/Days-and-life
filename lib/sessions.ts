// مخزن جلسات المذاكرة — محلي على الجهاز (localStorage) لحد ما يتوصل بـ Supabase.
// قبل كده نموذج الإضافة كان بيعرض رسالة نجاح بس من غير ما يحفظ حاجة، فالإضافة كانت بتضيع.

export type SessionType = 'مذاكرة' | 'واجب' | 'مراجعة';
export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  hours: number;
  type: SessionType;
  notes: string;
}

const KEY = 'days-life-sessions';
const SEEDED_KEY = 'days-life-sessions-seeded';
export const SESSIONS_EVENT = 'days-life:sessions';

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function seed(): StudySession[] {
  return [
    { id: 'seed-1', date: todayISO(0), subject: 'رياضيات', hours: 1.5, type: 'مذاكرة', notes: 'حل مسائل التفاضل' },
    { id: 'seed-2', date: todayISO(0), subject: 'فيزياء', hours: 1, type: 'مراجعة', notes: 'الفصل الثالث' },
    { id: 'seed-3', date: todayISO(1), subject: 'لغة إنجليزية', hours: 2, type: 'واجب', notes: 'كتابة مقال' },
  ];
}

export function loadSessions(): StudySession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as StudySession[];
    if (!localStorage.getItem(SEEDED_KEY)) {
      const initial = seed();
      localStorage.setItem(KEY, JSON.stringify(initial));
      localStorage.setItem(SEEDED_KEY, '1');
      return initial;
    }
    return [];
  } catch {
    return [];
  }
}

function save(sessions: StudySession[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event(SESSIONS_EVENT));
  } catch { /* التخزين المحلي غير متاح */ }
}

export function addSession(input: { subject: string; hours: number; type: SessionType; notes?: string; date?: string }): StudySession {
  const session: StudySession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: input.date ?? todayISO(0),
    subject: input.subject,
    hours: input.hours,
    type: input.type,
    notes: input.notes ?? '',
  };
  save([session, ...loadSessions()]);
  return session;
}

export function deleteSession(id: string) {
  save(loadSessions().filter((s) => s.id !== id));
}

export function todaySessions(): StudySession[] {
  const today = todayISO(0);
  return loadSessions().filter((s) => s.date === today);
}

export function todayHours(): number {
  return todaySessions().reduce((sum, s) => sum + s.hours, 0);
}

export function bestSubjectToday(): { subject: string; hours: number } | null {
  const totals = new Map<string, number>();
  for (const s of todaySessions()) totals.set(s.subject, (totals.get(s.subject) ?? 0) + s.hours);
  let best: { subject: string; hours: number } | null = null;
  for (const [subject, hours] of totals) if (!best || hours > best.hours) best = { subject, hours };
  return best;
}

// عدد الأيام المتتالية اللي فيها جلسات، لحد النهاردة (أو امبارح لو النهاردة لسه مفيش).
export function currentStreak(): number {
  const dates = new Set(loadSessions().map((s) => s.date));
  let streak = 0;
  let cursor = new Date();
  if (!dates.has(todayISO(0))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatDateAr(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
  } catch {
    return iso;
  }
}

export function formatHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/\.?0+$/, '');
}
