// مخزن الخطة الأسبوعية — محلي على الجهاز (localStorage)، بنفس نمط lib/sessions.ts.
// كل خطة = مادة + هدف يومي (ساعات) و/أو هدف أسبوعي (ساعات)؛ الأسبوع من السبت للجمعة.

import { loadSessions } from '@/lib/sessions';

export interface PlanItem {
  id: string;
  subject: string;
  dailyTarget?: number; // ساعات في اليوم
  weeklyTarget?: number; // ساعات في الأسبوع
  createdAt: number;
}

const KEY = 'days-life-plans';
export const PLANS_EVENT = 'days-life:plans';

export function loadPlans(): PlanItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlanItem[]) : [];
  } catch {
    return [];
  }
}

function save(plans: PlanItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(plans));
    window.dispatchEvent(new Event(PLANS_EVENT));
  } catch { /* التخزين المحلي غير متاح */ }
}

export function addPlan(input: { subject: string; dailyTarget?: number; weeklyTarget?: number }): PlanItem {
  const plan: PlanItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subject: input.subject.trim(),
    dailyTarget: input.dailyTarget,
    weeklyTarget: input.weeklyTarget,
    createdAt: Date.now(),
  };
  save([...loadPlans(), plan]);
  return plan;
}

export function updatePlan(id: string, input: { subject: string; dailyTarget?: number; weeklyTarget?: number }) {
  save(loadPlans().map((p) => (p.id === id ? { ...p, subject: input.subject.trim(), dailyTarget: input.dailyTarget, weeklyTarget: input.weeklyTarget } : p)));
}

export function deletePlan(id: string) {
  save(loadPlans().filter((p) => p.id !== id));
}

const DAY_NAMES_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// أيام الأسبوع الحالي من السبت للجمعة، بالترتيب.
export function weekDays(locale: 'ar' | 'en' = 'ar'): { iso: string; label: string }[] {
  const names = locale === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;
  const today = new Date();
  const daysSinceSaturday = (today.getDay() + 1) % 7; // السبت = 0
  const saturday = new Date(today);
  saturday.setDate(today.getDate() - daysSinceSaturday);
  const out: { iso: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() + i);
    // T12:00:00 عشان التاريخ ميتغيرش بسبب فرق التوقيت (نفس نمط lib/sessions.ts).
    const iso = new Date(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T12:00:00`).toISOString().slice(0, 10);
    out.push({ iso, label: names[d.getDay()] });
  }
  return out;
}

// مجموع ساعات مادة معينة في يوم معين (المطابقة بعد trim).
export function hoursForDay(subject: string, iso: string): number {
  const target = subject.trim();
  return loadSessions()
    .filter((s) => s.date === iso && s.subject.trim() === target)
    .reduce((sum, s) => sum + s.hours, 0);
}

// مجموع ساعات مادة معينة في الأسبوع الحالي (السبت–الجمعة).
export function hoursForWeek(subject: string): number {
  const isos = new Set(weekDays().map((d) => d.iso));
  const target = subject.trim();
  return loadSessions()
    .filter((s) => isos.has(s.date) && s.subject.trim() === target)
    .reduce((sum, s) => sum + s.hours, 0);
}

// علامات إنجاز يدوية لكل مادة ويوم — تدوس على علامة الصح فتتحدد كمكتملة (100%).
// مثال: هدف اليوم ساعتين، ذاكرت ساعة = 50%، ساعة ونص = 75%، والصح = 100%.
const CHECKS_KEY = 'days-life-plan-checks';
export type PlanChecks = Record<string, Record<string, boolean>>;

export function loadChecks(): PlanChecks {
  try {
    const raw = localStorage.getItem(CHECKS_KEY);
    return raw ? (JSON.parse(raw) as PlanChecks) : {};
  } catch {
    return {};
  }
}

function saveChecks(checks: PlanChecks) {
  try {
    localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
    window.dispatchEvent(new Event(PLANS_EVENT));
  } catch { /* التخزين المحلي غير متاح */ }
}

export function isChecked(planId: string, iso: string): boolean {
  return loadChecks()[planId]?.[iso] === true;
}

export function toggleCheck(planId: string, iso: string): void {
  const checks = loadChecks();
  const days = { ...(checks[planId] ?? {}) };
  if (days[iso]) delete days[iso];
  else days[iso] = true;
  if (Object.keys(days).length === 0) delete checks[planId];
  else checks[planId] = days;
  saveChecks(checks);
}

// نسبة إنجاز يوم معين من الهدف اليومي: علامة الصح = 100%، غير كده الساعات ÷ الهدف.
export function dayPct(plan: PlanItem, iso: string): number | null {
  if (!plan.dailyTarget) return null;
  if (isChecked(plan.id, iso)) return 100;
  return Math.min(100, Math.round((hoursForDay(plan.subject, iso) / plan.dailyTarget) * 100));
}
