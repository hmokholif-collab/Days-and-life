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

// هل فيه خطة لمادة بالاسم ده أصلاً؟ (مقارنة بعد إزالة المسافات وتجاهل حالة الحروف)
export function planExists(subject: string, excludeId?: string): boolean {
  const name = subject.trim().toLowerCase();
  if (!name) return false;
  return loadPlans().some((p) => p.id !== excludeId && p.subject.trim().toLowerCase() === name);
}

// دمج خطط من نسخة احتياطية — بيتخطى المكرر بالـ id أو بالاسم.
export function mergePlans(incoming: unknown): number {
  if (!Array.isArray(incoming)) return 0;
  const existing = loadPlans();
  const ids = new Set(existing.map((p) => p.id));
  const names = new Set(existing.map((p) => p.subject.trim().toLowerCase()));
  const valid: PlanItem[] = [];
  for (const raw of incoming as Record<string, unknown>[]) {
    if (!raw || typeof raw !== 'object') continue;
    if (typeof raw.id !== 'string' || !raw.id || ids.has(raw.id)) continue;
    if (typeof raw.subject !== 'string' || !raw.subject.trim()) continue;
    const name = raw.subject.trim().toLowerCase();
    if (names.has(name)) continue;
    valid.push({ id: raw.id, subject: raw.subject.trim(), dailyTarget: typeof raw.dailyTarget === 'number' && raw.dailyTarget > 0 ? raw.dailyTarget : undefined, weeklyTarget: typeof raw.weeklyTarget === 'number' && raw.weeklyTarget > 0 ? raw.weeklyTarget : undefined, createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now() });
    ids.add(raw.id);
    names.add(name);
  }
  if (valid.length > 0) save([...existing, ...valid]);
  return valid.length;
}

// دمج علامات الإنجاز من نسخة احتياطية — بيتخطى العلامات الموجودة أصلاً.
export function mergeChecks(incoming: unknown): number {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return 0;
  const checks = loadChecks();
  let added = 0;
  for (const [planId, days] of Object.entries(incoming as Record<string, unknown>)) {
    if (!days || typeof days !== 'object' || Array.isArray(days)) continue;
    const target = { ...(checks[planId] ?? {}) };
    for (const [iso, value] of Object.entries(days as Record<string, unknown>)) {
      if (value === true && !target[iso] && /^\d{4}-\d{2}-\d{2}$/.test(iso)) { target[iso] = true; added++; }
    }
    if (Object.keys(target).length > 0) checks[planId] = target;
  }
  if (added > 0) saveChecks(checks);
  return added;
}

export function updatePlan(id: string, input: { subject: string; dailyTarget?: number; weeklyTarget?: number }) {
  save(loadPlans().map((p) => (p.id === id ? { ...p, subject: input.subject.trim(), dailyTarget: input.dailyTarget, weeklyTarget: input.weeklyTarget } : p)));
}

export function deletePlan(id: string) {
  save(loadPlans().filter((p) => p.id !== id));
  deleteChecks(id);
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

// مجموع ساعات مادة معينة في يوم معين.
// الأولوية للمطابقة بـ planId (عشان تغيير اسم المادة ميفقدش التاريخ)؛
// والجلسات القديمة اللي مفيهاش planId بتتطابق بالاسم زي الأول.
function sessionMatchesPlan(s: { subject: string; planId?: string }, subject: string, planId?: string): boolean {
  if (planId && s.planId) return s.planId === planId;
  if (s.planId && planId) return false; // الجلسة مربوطة بخطة تانية — الاسم وحده مش كفاية
  return s.subject.trim() === subject.trim();
}

export function hoursForDay(subject: string, iso: string, planId?: string): number {
  return loadSessions()
    .filter((s) => s.date === iso && sessionMatchesPlan(s, subject, planId))
    .reduce((sum, s) => sum + s.hours, 0);
}

// مجموع ساعات مادة معينة في الأسبوع الحالي (السبت–الجمعة).
export function hoursForWeek(subject: string, planId?: string): number {
  const isos = new Set(weekDays().map((d) => d.iso));
  return loadSessions()
    .filter((s) => isos.has(s.date) && sessionMatchesPlan(s, subject, planId))
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

// مسح علامات خطة محذوفة عشان متفضلش يتيمة في التخزين.
export function deleteChecks(planId: string): void {
  const checks = loadChecks();
  if (checks[planId]) {
    delete checks[planId];
    saveChecks(checks);
  }
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
  return Math.min(100, Math.round((hoursForDay(plan.subject, iso, plan.id) / plan.dailyTarget) * 100));
}
