'use client';
import { useEffect, useMemo, useState } from 'react';
import { Filter, Trash2 } from 'lucide-react';
import { SESSIONS_EVENT, deleteSession, formatDateAr, formatHours, loadSessions, syncWithSupabase, type StudySession } from '@/lib/sessions';
export default function Log() {
  const [items, setItems] = useState<StudySession[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('كل المواد');
  const [typeFilter, setTypeFilter] = useState('كل التصنيفات');
  useEffect(() => {
    const refresh = () => setItems(loadSessions());
    refresh();
    void syncWithSupabase().then(() => refresh());
    window.addEventListener(SESSIONS_EVENT, refresh);
    return () => window.removeEventListener(SESSIONS_EVENT, refresh);
  }, []);
  const subjects = useMemo(() => ['كل المواد', ...Array.from(new Set(items.map((i) => i.subject)))], [items]);
  const filtered = items.filter((i) =>
    (!dateFilter || i.date === dateFilter) &&
    (subjectFilter === 'كل المواد' || i.subject === subjectFilter) &&
    (typeFilter === 'كل التصنيفات' || i.type === typeFilter));
  return <div className="mx-auto max-w-6xl p-5 md:p-10"><h1 className="text-3xl font-black">سجل المذاكرة</h1><p className="mt-2 text-slate-500">كل مجهودك، في مكان واحد.</p><div className="card mt-6 flex flex-wrap gap-3"><div className="flex items-center gap-2 font-bold"><Filter size={18}/> فلترة</div><input className="input max-w-xs" type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/><select className="input max-w-xs" value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}>{subjects.map(s=><option key={s}>{s}</option>)}</select><select className="input max-w-xs" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option>كل التصنيفات</option><option>مذاكرة</option><option>واجب</option><option>مراجعة</option></select></div><div className="card mt-5 overflow-x-auto p-0"><table className="w-full min-w-[620px] text-right"><thead className="bg-slate-50 text-sm text-slate-500 dark:bg-slate-800"><tr><th className="p-4">التاريخ</th><th>المادة</th><th>الساعات</th><th>التصنيف</th><th>ملاحظات</th><th/></tr></thead><tbody>{filtered.length === 0 ? <tr><td className="p-4 text-slate-500" colSpan={6}>مفيش جلسات مطابقة — ضيف جلسة من الرئيسية.</td></tr> : filtered.map((item)=><tr className="border-t border-slate-100 dark:border-slate-800" key={item.id}><td className="p-4">{formatDateAr(item.date)}</td><td className="font-bold">{item.subject}</td><td>{formatHours(item.hours)} س</td><td><span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">{item.type}</span></td><td className="text-slate-500">{item.notes}</td><td className="flex gap-2 p-3"><button aria-label="حذف" onClick={()=>deleteSession(item.id)} className="text-red-500"><Trash2 size={17}/></button></td></tr>)}</tbody></table></div></div>; }
