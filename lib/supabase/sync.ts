// مزامنة جلسات المذاكرة مع Supabase (جدول study_sessions).
// بتشتغل بس لما المستخدم مسجّل دخول والمشروع متظبط؛
// ولو مفيش إعدادات Supabase أو مفيش تسجيل دخول، الجلسات بتفضل محلية بس ومفيش أي خطأ يظهر للمستخدم.
import { createClient } from './client';
import { loadSessions, replaceSessions, type StudySession, type SessionType } from '@/lib/sessions';

const MAP_KEY = 'days-life-session-map'; // localId -> supabase uuid
const DELETED_KEY = 'days-life-deleted-uuids'; // uuids اتحذفت محليًا — مينفعش ترجع من السحابة تاني

const TYPE_TO_DB: Record<SessionType, 'study' | 'homework' | 'review'> = { 'مذاكرة': 'study', 'واجب': 'homework', 'مراجعة': 'review' };
const TYPE_FROM_DB: Record<string, SessionType> = { study: 'مذاكرة', homework: 'واجب', review: 'مراجعة' };

function loadDeletedUuids(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]') as string[]); } catch { return new Set(); }
}
function saveDeletedUuids(set: Set<string>) {
  try { localStorage.setItem(DELETED_KEY, JSON.stringify([...set])); } catch { /* التخزين غير متاح */ }
}
function markDeleted(uuid: string) {
  const set = loadDeletedUuids();
  set.add(uuid);
  saveDeletedUuids(set);
}
function unmarkDeleted(uuid: string) {
  const set = loadDeletedUuids();
  if (set.delete(uuid)) saveDeletedUuids(set);
}

// هل الخطأ ده معناه إن عمود plan_id مش موجود؟ (الـ migration 002 لسه متنفذش)
function isMissingPlanIdError(error: { code?: string; message?: string }): boolean {
  return error.code === '42703' || (error.message ?? '').includes('plan_id');
}

async function writeRow(supabase: NonNullable<ReturnType<typeof getClientOrNull>>, row: Record<string, unknown>, existing?: string): Promise<string | null> {
  // المحاولة الأولى بالـ plan_id؛ لو العمود مش موجود، نعيد من غيره من غير ما نكسر المزامنة.
  try {
    if (existing) {
      const { error } = await supabase.from('study_sessions').update(row).eq('id', existing);
      if (error) throw error;
      return existing;
    }
    const { data, error } = await supabase.from('study_sessions').insert(row).select('id').single();
    if (error) throw error;
    return (data?.id as string) ?? null;
  } catch (error) {
    if (!isMissingPlanIdError(error as { code?: string; message?: string })) throw error;
    const fallback = { ...row };
    delete fallback.plan_id;
    if (existing) {
      const { error: err2 } = await supabase.from('study_sessions').update(fallback).eq('id', existing);
      if (err2) throw err2;
      return existing;
    }
    const { data, error: err2 } = await supabase.from('study_sessions').insert(fallback).select('id').single();
    if (err2) throw err2;
    return (data?.id as string) ?? null;
  }
}

function getClientOrNull() {
  try { return createClient(); } catch { return null; }
}

function loadMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(MAP_KEY) ?? '{}') as Record<string, string>; } catch { return {}; }
}
function saveMap(map: Record<string, string>) {
  try { localStorage.setItem(MAP_KEY, JSON.stringify(map)); } catch { /* التخزين غير متاح */ }
}

async function currentUserId(): Promise<string | null> {
  const supabase = getClientOrNull();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch { return null; }
}

// رفع جلسة محلية واحدة لـ Supabase (insert أول مرة، وبعدها update).
// الجلسات التجريبية (الديمو) عمرها ما تترفع — دي للعرض بس.
export async function pushSession(session: StudySession): Promise<void> {
  if (session.demo === true || session.id.startsWith('seed-')) return;
  const supabase = getClientOrNull();
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const map = loadMap();
  const row: Record<string, unknown> = {
    user_id: userId,
    subject_name: session.subject,
    hours: session.hours,
    type: TYPE_TO_DB[session.type],
    notes: session.notes || null,
    session_date: session.date,
    completed: true,
    plan_id: session.planId ?? null,
  };
  try {
    const existing = map[session.id];
    const uuid = await writeRow(supabase, row, existing);
    if (uuid && !existing) { map[session.id] = uuid; saveMap(map); }
  } catch { /* المزامنة فشلت — الجلسة محفوظة محليًا وهتتحاول تاني عند الفتح */ }
}

export async function deleteRemoteSession(localId: string): Promise<void> {
  const supabase = getClientOrNull();
  if (!supabase) return;
  const map = loadMap();
  const uuid = map[localId];
  if (!uuid) return;
  // علّم الـ uuid إنه محذوف الأول — لو النت قاطع، المزامنة الجاية مش هترجّعه، وهتعيد محاولة الحذف.
  markDeleted(uuid);
  delete map[localId];
  saveMap(map);
  try {
    const { error } = await supabase.from('study_sessions').delete().eq('id', uuid);
    if (error) throw error;
    unmarkDeleted(uuid); // اتحذف من السحابة فعلًا — مش محتاجين نفتكره
  } catch { /* الحذف من السحابة هيتحاول تاني في المزامنة الجاية */ }
}

// مزامنة كاملة عند فتح التطبيق: سحب جلسات السحابة ودمجها مع المحلي، ورفع الجلسات المحلية اللي لسه مرفوعة.
// بترجع 'table-missing' لو جدول study_sessions مش موجود (الـ migration لسه متنفذش).
export async function syncSessions(): Promise<'synced' | 'local-only' | 'table-missing'> {
  const supabase = getClientOrNull();
  if (!supabase) return 'local-only';
  const userId = await currentUserId();
  if (!userId) return 'local-only';
  try {
    // سحب جلسات السحابة — بالـ plan_id لو العمود موجود، ومن غيره لو الـ migration 002 لسه متنفذش.
    let data: { id: string; subject_name: string; hours: number; type: string; notes: string | null; session_date: string; plan_id?: string | null }[] | null = null;
    try {
      const res = await supabase.from('study_sessions').select('id, subject_name, hours, type, notes, session_date, plan_id').eq('user_id', userId).order('session_date', { ascending: false });
      if (res.error) throw res.error;
      data = res.data;
    } catch (error) {
      if (isMissingTableError(error as { code?: string; message?: string })) return 'table-missing';
      if (!isMissingPlanIdError(error as { code?: string; message?: string })) throw error;
      const res = await supabase.from('study_sessions').select('id, subject_name, hours, type, notes, session_date').eq('user_id', userId).order('session_date', { ascending: false });
      if (res.error) {
        if (isMissingTableError(res.error)) return 'table-missing';
        throw res.error;
      }
      data = res.data;
    }
    const map = loadMap();
    const deleted = loadDeletedUuids();
    // إعادة محاولة حذف الصفوف اللي اتحذفت محليًا ولسه موجودة على السحابة.
    for (const uuid of [...deleted]) {
      try {
        const { error } = await supabase.from('study_sessions').delete().eq('id', uuid);
        if (error) throw error;
        unmarkDeleted(uuid);
      } catch { /* هيتحاول تاني المرة الجاية */ }
    }
    const uuidToLocal: Record<string, string> = {};
    for (const [localId, uuid] of Object.entries(map)) uuidToLocal[uuid] = localId;
    const byId = new Map(loadSessions().map((s) => [s.id, s]));
    let changed = false;
    for (const row of data ?? []) {
      // صف اتحذف محليًا قبل كده — مينفعش يرجع تاني.
      if (deleted.has(row.id as string)) continue;
      const localId = uuidToLocal[row.id as string] ?? `sb-${row.id as string}`;
      const incoming: StudySession = { id: localId, date: row.session_date as string, subject: row.subject_name as string, hours: Number(row.hours), type: TYPE_FROM_DB[row.type as string] ?? 'مذاكرة', notes: (row.notes as string | null) ?? '', planId: (row.plan_id as string | null) ?? undefined };
      const existing = byId.get(localId);
      if (!existing) { byId.set(localId, incoming); changed = true; }
      else if (existing.subject !== incoming.subject || existing.hours !== incoming.hours || existing.type !== incoming.type || existing.date !== incoming.date || existing.notes !== incoming.notes || existing.planId !== incoming.planId) { byId.set(localId, incoming); changed = true; }
      if (!map[localId]) map[localId] = row.id as string;
    }
    saveMap(map);
    const merged = [...byId.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (changed) replaceSessions(merged);
    for (const s of merged) if (!map[s.id] && !s.demo && !s.id.startsWith('seed-')) await pushSession(s);
    return 'synced';
  } catch {
    return 'local-only';
  }
}

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  // PostgREST: 42P01 = undefined_table — الجدول مش موجود (الـ migration متنفذش).
  return error.code === '42P01' || (error.message ?? '').includes('does not exist');
}

export async function getSyncStatus(): Promise<{ configured: boolean; signedIn: boolean; email?: string; tableOk?: boolean; tableMissing?: boolean }> {
  const supabase = getClientOrNull();
  if (!supabase) return { configured: false, signedIn: false };
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { configured: true, signedIn: false };
    // فحص حقيقي: هل جدول study_sessions موجود فعلًا؟ مش كفاية إنك مسجّل دخول.
    const { error } = await supabase.from('study_sessions').select('id').limit(1);
    if (error) return { configured: true, signedIn: true, email: data.user.email, tableOk: false, tableMissing: isMissingTableError(error) };
    return { configured: true, signedIn: true, email: data.user.email, tableOk: true };
  } catch { return { configured: true, signedIn: false }; }
}
