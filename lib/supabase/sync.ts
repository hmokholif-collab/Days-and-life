// مزامنة جلسات المذاكرة مع Supabase (جدول study_sessions).
// بتشتغل بس لما المستخدم مسجّل دخول والمشروع متظبط؛
// ولو مفيش إعدادات Supabase أو مفيش تسجيل دخول، الجلسات بتفضل محلية بس ومفيش أي خطأ يظهر للمستخدم.
import { createClient } from './client';
import { loadSessions, replaceSessions, type StudySession, type SessionType } from '@/lib/sessions';

const MAP_KEY = 'days-life-session-map'; // localId -> supabase uuid

const TYPE_TO_DB: Record<SessionType, 'study' | 'homework' | 'review'> = { 'مذاكرة': 'study', 'واجب': 'homework', 'مراجعة': 'review' };
const TYPE_FROM_DB: Record<string, SessionType> = { study: 'مذاكرة', homework: 'واجب', review: 'مراجعة' };

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
export async function pushSession(session: StudySession): Promise<void> {
  const supabase = getClientOrNull();
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const map = loadMap();
  const row = {
    user_id: userId,
    subject_name: session.subject,
    hours: session.hours,
    type: TYPE_TO_DB[session.type],
    notes: session.notes || null,
    session_date: session.date,
    completed: true,
  };
  try {
    const existing = map[session.id];
    if (existing) {
      const { error } = await supabase.from('study_sessions').update(row).eq('id', existing);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('study_sessions').insert(row).select('id').single();
      if (error) throw error;
      if (data?.id) { map[session.id] = data.id as string; saveMap(map); }
    }
  } catch { /* المزامنة فشلت — الجلسة محفوظة محليًا وهتتحاول تاني عند الفتح */ }
}

export async function deleteRemoteSession(localId: string): Promise<void> {
  const supabase = getClientOrNull();
  if (!supabase) return;
  const map = loadMap();
  const uuid = map[localId];
  if (!uuid) return;
  try {
    await supabase.from('study_sessions').delete().eq('id', uuid);
    delete map[localId];
    saveMap(map);
  } catch { /* الجلسة اتحذفت محليًا؛ الحذف من السحابة هيتحاول تاني */ }
}

// مزامنة كاملة عند فتح التطبيق: سحب جلسات السحابة ودمجها مع المحلي، ورفع الجلسات المحلية اللي لسه مرفوعة.
export async function syncSessions(): Promise<'synced' | 'local-only'> {
  const supabase = getClientOrNull();
  if (!supabase) return 'local-only';
  const userId = await currentUserId();
  if (!userId) return 'local-only';
  try {
    const { data, error } = await supabase.from('study_sessions').select('id, subject_name, hours, type, notes, session_date').eq('user_id', userId).order('session_date', { ascending: false });
    if (error) throw error;
    const map = loadMap();
    const uuidToLocal: Record<string, string> = {};
    for (const [localId, uuid] of Object.entries(map)) uuidToLocal[uuid] = localId;
    const byId = new Map(loadSessions().map((s) => [s.id, s]));
    let changed = false;
    for (const row of data ?? []) {
      const localId = uuidToLocal[row.id as string] ?? `sb-${row.id as string}`;
      const incoming: StudySession = { id: localId, date: row.session_date as string, subject: row.subject_name as string, hours: Number(row.hours), type: TYPE_FROM_DB[row.type as string] ?? 'مذاكرة', notes: (row.notes as string | null) ?? '' };
      const existing = byId.get(localId);
      if (!existing) { byId.set(localId, incoming); changed = true; }
      else if (existing.subject !== incoming.subject || existing.hours !== incoming.hours || existing.type !== incoming.type || existing.date !== incoming.date || existing.notes !== incoming.notes) { byId.set(localId, incoming); changed = true; }
      if (!map[localId]) map[localId] = row.id as string;
    }
    saveMap(map);
    const merged = [...byId.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (changed) replaceSessions(merged);
    for (const s of merged) if (!map[s.id]) await pushSession(s);
    return 'synced';
  } catch {
    return 'local-only';
  }
}

export async function getSyncStatus(): Promise<{ configured: boolean; signedIn: boolean; email?: string }> {
  const supabase = getClientOrNull();
  if (!supabase) return { configured: false, signedIn: false };
  try {
    const { data } = await supabase.auth.getUser();
    return { configured: true, signedIn: !!data.user, email: data.user?.email };
  } catch { return { configured: true, signedIn: false }; }
}
