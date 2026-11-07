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

// استبدال كل الجلسات المحلية (بتستخدمها المزامنة بعد دمج جلسات السحابة).
export function replaceSessions(sessions: StudySession[]) {
  save(sessions);
}

// رفع/حذف في الخلفية من غير ما يوقف واجهة المستخدم؛ dynamic import عشان مفيش استيراد دائري.
function syncInBackground(kind: 'push' | 'delete', payload: StudySession | string) {
  if (typeof window === 'undefined') return;
  void import('@/lib/supabase/sync').then((m) => {
    if (kind === 'push') return m.pushSession(payload as StudySession);
    return m.deleteRemoteSession(payload as string);
  }).catch(() => { /* مفيش Supabase — الجلسة محلية بس */ });
}

// مزامنة كاملة مع Supabase (سحب + دمج + رفع)؛ بترجع 'local-only' لو مفيش إعدادات أو تسجيل دخول.
export function syncWithSupabase(): Promise<'synced' | 'local-only'> {
  return import('@/lib/supabase/sync').then((m) => m.syncSessions()).catch(() => 'local-only' as const);
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
  syncInBackground('push', session);
  return session;
}

export function deleteSession(id: string) {
  save(loadSessions().filter((s) => s.id !== id));
  syncInBackground('delete', id);
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

const DAY_NAMES_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// ساعات آخر 7 أيام (من 6 أيام فاتوا لحد النهاردة)، بالترتيب، لاستخدامها في الرسوم البيانية.
export function weekHours(): { day: string; hours: number }[] {
  const totals = new Map<string, number>();
  for (const s of loadSessions()) totals.set(s.date, (totals.get(s.date) ?? 0) + s.hours);
  const out: { day: string; hours: number }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const iso = d.toISOString().slice(0, 10);
    out.push({ day: DAY_NAMES_AR[d.getDay()], hours: Math.round((totals.get(iso) ?? 0) * 100) / 100 });
  }
  return out;
}

export function weekTotalHours(): number {
  return weekHours().reduce((sum, d) => sum + d.hours, 0);
}

// إجمالي ساعات الشهر الحالي.
export function monthTotalHours(): number {
  const prefix = new Date().toISOString().slice(0, 7);
  return loadSessions().filter((s) => s.date.startsWith(prefix)).reduce((sum, s) => sum + s.hours, 0);
}

// متوسط ساعات اليوم في الشهر الحالي (من أول الشهر لحد النهاردة).
export function dailyAverageThisMonth(): number {
  const dayOfMonth = new Date().getDate();
  return Math.round((monthTotalHours() / dayOfMonth) * 100) / 100;
}

// أطول سلسلة أيام متتالية فيها جلسات، من كل التاريخ.
export function longestStreak(): number {
  const dates = new Set(loadSessions().map((s) => s.date));
  let best = 0;
  for (const iso of dates) {
    const d = new Date(`${iso}T12:00:00`);
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    if (dates.has(prev.toISOString().slice(0, 10))) continue; // مش بداية سلسلة
    let len = 0;
    const cursor = new Date(d);
    while (dates.has(cursor.toISOString().slice(0, 10))) { len++; cursor.setDate(cursor.getDate() + 1); }
    if (len > best) best = len;
  }
  return best;
}

// إجمالي الساعات لكل مادة، مرتبة من الأعلى، مع نسبة كل مادة من الإجمالي.
export function subjectTotals(): { subject: string; hours: number; pct: number }[] {
  const totals = new Map<string, number>();
  let all = 0;
  for (const s of loadSessions()) { totals.set(s.subject, (totals.get(s.subject) ?? 0) + s.hours); all += s.hours; }
  return [...totals.entries()]
    .map(([subject, hours]) => ({ subject, hours: Math.round(hours * 100) / 100, pct: all > 0 ? Math.round((hours / all) * 100) : 0 }))
    .sort((a, b) => b.hours - a.hours);
}

// ملاحظة ذكية من البيانات الحقيقية: أكتر مادة وأقل مادة.
export function smartNote(): string {
  const totals = subjectTotals();
  if (totals.length === 0) return 'لسه مفيش جلسات مسجلة — ابدأ أول جلسة من الرئيسية وهنا هتظهر ملاحظة عن تقدمك.';
  const best = totals[0];
  if (totals.length === 1) return `أداؤك في ${best.subject} ممتاز (${formatHours(best.hours)} ساعة). جرّب تضيف مادة تانية عشان توازن جدولك.`;
  const least = totals[totals.length - 1];
  return `أداؤك في ${best.subject} ممتاز (${formatHours(best.hours)} ساعة). جرّب تخصيص 30 دقيقة إضافية لـ ${least.subject} (${formatHours(least.hours)} ساعة بس) في بداية الأسبوع القادم لتحافظ على توازن المواد.`;
}
