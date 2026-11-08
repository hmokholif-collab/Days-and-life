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
  /** جلسة تجريبية (ديمو) — عمرها ما تترفع لـ Supabase. */
  demo?: boolean;
  /** id الخطة المرتبطة بالجلسة (لو اتعملت من مادة ليها خطة) — المطابقة بالاسم بديل احتياطي للبيانات القديمة. */
  planId?: string;
}

const KEY = 'days-life-sessions';
const SEEDED_KEY = 'days-life-sessions-seeded';
export const SESSIONS_EVENT = 'days-life:sessions';
const WEEKLY_GOAL_KEY = 'days-life-weekly-goal';
const PLANS_KEY = 'days-life-plans';

// كل التواريخ بتوقيت القاهرة (Africa/Cairo)، مش UTC —
// عشان الجلسات بعد نص الليل لحد 2 الفجر متتسجلش بتاريخ امبارح.
const cairoFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
export function cairoISOFromDate(d: Date): string {
  return cairoFormatter.format(d);
}
function cairoISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return cairoISOFromDate(d);
}

export function getWeeklyGoal(): number {
  try {
    const v = Number(localStorage.getItem(WEEKLY_GOAL_KEY));
    if (Number.isFinite(v) && v >= 1 && v <= 100) return Math.round(v);
  } catch { /* مفيش إعداد محفوظ */ }
  return 15;
}

export function setWeeklyGoal(hours: number): void {
  try {
    const v = Math.max(1, Math.min(100, Math.round(hours) || 15));
    localStorage.setItem(WEEKLY_GOAL_KEY, String(v));
  } catch { /* التخزين المحلي غير متاح */ }
}

export function isDemoSession(s: StudySession): boolean {
  return s.demo === true || s.id.startsWith('seed-');
}

/** id الخطة اللي اسم مادتها مطابق لاسم الجلسة (لو فيه خطة) — عشان الجلسة ترتبط بالخطة حتى لو اتغير اسم المادة بعد كده. */
function findPlanIdForSubject(subject: string): string | undefined {
  try {
    const plans = JSON.parse(localStorage.getItem(PLANS_KEY) ?? '[]') as { id: string; subject: string }[];
    return plans.find((p) => p.subject.trim() === subject.trim())?.id;
  } catch { return undefined; }
}

function todayISO(offsetDays = 0): string {
  return cairoISO(offsetDays);
}

function seed(): StudySession[] {
  return [
    { id: 'seed-1', date: todayISO(0), subject: 'رياضيات', hours: 1.5, type: 'مذاكرة', notes: 'حل مسائل التفاضل', demo: true },
    { id: 'seed-2', date: todayISO(0), subject: 'فيزياء', hours: 1, type: 'مراجعة', notes: 'الفصل الثالث', demo: true },
    { id: 'seed-3', date: todayISO(1), subject: 'لغة إنجليزية', hours: 2, type: 'واجب', notes: 'كتابة مقال', demo: true },
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

// مزامنة كاملة مع Supabase (سحب + دمج + رفع)؛ بترجع 'local-only' لو مفيش إعدادات أو تسجيل دخول، و'table-missing' لو الجدول مش موجود.
export function syncWithSupabase(): Promise<'synced' | 'local-only' | 'table-missing'> {
  return import('@/lib/supabase/sync').then((m) => m.syncSessions()).catch(() => 'local-only' as const);
}

export function addSession(input: { subject: string; hours: number; type: SessionType; notes?: string; date?: string; planId?: string }): StudySession {
  const session: StudySession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: input.date ?? todayISO(0),
    subject: input.subject,
    hours: input.hours,
    type: input.type,
    notes: input.notes ?? '',
    planId: input.planId ?? findPlanIdForSubject(input.subject),
  };
  // أول جلسة حقيقية بتشيل الجلسات التجريبية — عشان الإحصائيات تبقى حقيقية من أول يوم.
  const rest = loadSessions().filter((s) => !isDemoSession(s));
  save([session, ...rest]);
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
  while (dates.has(cairoISOFromDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatDateAr(iso: string, locale: 'ar' | 'en' = 'ar'): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long' });
  } catch {
    return iso;
  }
}

export function formatHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/\.?0+$/, '');
}

const DAY_NAMES_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ساعات آخر 7 أيام (من 6 أيام فاتوا لحد النهاردة)، بالترتيب، لاستخدامها في الرسوم البيانية.
export function weekHours(locale: 'ar' | 'en' = 'ar'): { day: string; hours: number }[] {
  const names = locale === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;
  const totals = new Map<string, number>();
  for (const s of loadSessions()) totals.set(s.date, (totals.get(s.date) ?? 0) + s.hours);
  const out: { day: string; hours: number }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const iso = cairoISOFromDate(d);
    out.push({ day: names[d.getDay()], hours: Math.round((totals.get(iso) ?? 0) * 100) / 100 });
  }
  return out;
}

export function weekTotalHours(): number {
  return weekHours().reduce((sum, d) => sum + d.hours, 0);
}

// إجمالي ساعات الشهر الحالي.
export function monthTotalHours(): number {
  const prefix = cairoISO(0).slice(0, 7);
  return loadSessions().filter((s) => s.date.startsWith(prefix)).reduce((sum, s) => sum + s.hours, 0);
}

// متوسط ساعات اليوم في الشهر الحالي (من أول الشهر لحد النهاردة).
export function dailyAverageThisMonth(): number {
  const dayOfMonth = Number(cairoISO(0).slice(8, 10));
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
export function smartNote(locale: 'ar' | 'en' = 'ar'): string {
  const totals = subjectTotals();
  if (totals.length === 0) return locale === 'ar' ? 'لسه مفيش جلسات مسجلة — ابدأ أول جلسة من الرئيسية وهنا هتظهر ملاحظة عن تقدمك.' : 'No sessions logged yet — start your first session from the dashboard and a note about your progress will appear here.';
  const best = totals[0];
  if (totals.length === 1) return locale === 'ar' ? `أداؤك في ${best.subject} ممتاز (${formatHours(best.hours)} ساعة). جرّب تضيف مادة تانية عشان توازن جدولك.` : `Your performance in ${best.subject} is excellent (${formatHours(best.hours)} h). Try adding another subject to balance your schedule.`;
  const least = totals[totals.length - 1];
  return locale === 'ar' ? `أداؤك في ${best.subject} ممتاز (${formatHours(best.hours)} ساعة). جرّب تخصيص 30 دقيقة إضافية لـ ${least.subject} (${formatHours(least.hours)} ساعة بس) في بداية الأسبوع القادم لتحافظ على توازن المواد.` : `Your performance in ${best.subject} is excellent (${formatHours(best.hours)} h). Try spending 30 extra minutes on ${least.subject} (only ${formatHours(least.hours)} h) at the start of next week to keep your subjects balanced.`;
}
