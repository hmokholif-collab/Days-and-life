'use client';
import { useEffect, useMemo, useState } from 'react';
import { Check, Filter, Pencil, Trash2, X } from 'lucide-react';
import { SESSIONS_EVENT, deleteSession, formatDateAr, formatHours, isDemoSession, loadSessions, syncWithSupabase, updateSession, type StudySession, type SessionType } from '@/lib/sessions';
import { typeLabel, useLanguage } from '@/lib/i18n';
const TYPES: SessionType[] = ['مذاكرة', 'واجب', 'مراجعة'];
export default function Log() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<StudySession[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editType, setEditType] = useState<SessionType>('مذاكرة');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState('');
  useEffect(() => {
    const refresh = () => setItems(loadSessions());
    refresh();
    void syncWithSupabase().then(() => refresh());
    window.addEventListener(SESSIONS_EVENT, refresh);
    return () => window.removeEventListener(SESSIONS_EVENT, refresh);
  }, []);
  const subjects = useMemo(() => [...Array.from(new Set(items.map((i) => i.subject)))], [items]);
  const filtered = items.filter((i) =>
    (!dateFilter || i.date === dateFilter) &&
    (!subjectFilter || i.subject === subjectFilter) &&
    (!typeFilter || i.type === typeFilter));
  function startEdit(item: StudySession) {
    setEditingId(item.id);
    setEditSubject(item.subject);
    setEditHours(String(item.hours));
    setEditType(item.type);
    setEditNotes(item.notes);
    setEditDate(item.date);
    setEditError('');
  }
  function saveEdit(item: StudySession) {
    // الساعات الفاضية أو الغلط كانت بتتحفظ 0.25 في صمت — دلوقتي بتترفض برسالة واضحة.
    const raw = Number(editHours);
    if (!editSubject.trim() || !Number.isFinite(raw) || raw < 0.25 || raw > 24) { setEditError(t('log.invalidHours')); return; }
    setEditError('');
    updateSession(item.id, { subject: editSubject.trim(), hours: Math.round(raw * 100) / 100, type: editType, notes: editNotes.trim(), date: editDate });
    setEditingId(null);
  }
  return <div className="mx-auto max-w-6xl p-5 md:p-10"><h1 className="text-3xl font-black">{t('log.title')}</h1><p className="mt-2 text-slate-500">{t('log.subtitle')}</p><div className="card mt-6 flex flex-wrap gap-3"><div className="flex items-center gap-2 font-bold"><Filter size={18}/> {t('log.filter')}</div><input className="input max-w-xs" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}/><select className="input max-w-xs" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}><option value="">{t('log.allSubjects')}</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select><select className="input max-w-xs" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">{t('log.allTypes')}</option>{TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(ty, locale)}</option>)}</select></div><div className="card mt-5 overflow-x-auto p-0"><table className="w-full min-w-[680px] text-right"><thead className="bg-slate-50 text-sm text-slate-500 dark:bg-slate-800"><tr><th className="p-4">{t('log.date')}</th><th>{t('log.subject')}</th><th>{t('log.hours')}</th><th>{t('log.type')}</th><th>{t('log.notes')}</th><th/></tr></thead><tbody>{filtered.length === 0 ? <tr><td className="p-4 text-slate-500" colSpan={6}>{t('log.empty')}</td></tr> : filtered.map((item) => {
    const editing = editingId === item.id;
    if (editing) {
      return <tr className="border-t border-slate-100 bg-amber-50/50 dark:border-slate-800 dark:bg-amber-950/20" key={item.id}><td className="p-4"><input className="input w-36" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></td><td><input className="input w-full min-w-28" value={editSubject} onChange={e => setEditSubject(e.target.value)} /></td><td><input className="input w-20" type="number" step="0.25" min="0.25" max="24" value={editHours} onChange={e => setEditHours(e.target.value)} /></td><td><select className="input" value={editType} onChange={e => setEditType(e.target.value as SessionType)}>{TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(ty, locale)}</option>)}</select></td><td><input className="input w-full min-w-28" value={editNotes} onChange={e => setEditNotes(e.target.value)} /></td><td className="flex gap-2 p-3"><button aria-label={t('log.save')} onClick={() => saveEdit(item)} className="text-emerald-600"><Check size={18}/></button><button aria-label={t('log.cancel')} onClick={() => setEditingId(null)} className="text-slate-400"><X size={18}/></button></td></tr>;
    }
    return <tr className="border-t border-slate-100 dark:border-slate-800" key={item.id}><td className="p-4">{formatDateAr(item.date, locale)}</td><td className="font-bold">{item.subject}{isDemoSession(item) && <span className="ms-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">{t('log.demo')}</span>}</td><td>{formatHours(item.hours)} {t('common.hoursShort')}</td><td><span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">{typeLabel(item.type, locale)}</span></td><td className="text-slate-500">{item.notes}</td><td className="flex gap-2 p-3"><button aria-label={t('log.edit')} onClick={() => startEdit(item)} className="text-slate-400 hover:text-coral"><Pencil size={17}/></button><button aria-label={t('log.delete')} onClick={() => { if (window.confirm(t('common.confirmDelete'))) deleteSession(item.id); }} className="text-red-500"><Trash2 size={17}/></button></td></tr>;
  })}</tbody></table></div>{editError && <p className="mt-3 font-semibold text-red-600">{editError}</p>}</div>;
}
