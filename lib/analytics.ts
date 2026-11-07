export type Session = { session_date: string; hours: number; subject_name: string; completed: boolean };
export function calculateStreak(sessions: Session[], today = new Date()) {
  const days = new Set(sessions.filter(s => s.completed).map(s => s.session_date));
  let streak = 0; const cursor = new Date(today);
  while (days.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}
export function topSubject(sessions: Session[]) {
  const totals = new Map<string, number>();
  sessions.filter(s => s.completed).forEach(s => totals.set(s.subject_name, (totals.get(s.subject_name) ?? 0) + Number(s.hours)));
  return [...totals.entries()].sort((a,b) => b[1] - a[1])[0] ?? null;
}
