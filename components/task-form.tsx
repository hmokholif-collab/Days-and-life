'use client';
import { useState } from 'react';
import { Play, Plus } from 'lucide-react';
import type { SessionType } from '@/lib/sessions';
import { typeLabel, useLanguage } from '@/lib/i18n';
const TYPES: SessionType[] = ['مذاكرة', 'واجب', 'مراجعة'];
export function TaskForm() {
  const { t, locale } = useLanguage();
  const [subject, setSubject] = useState('');
  const [minutesInput, setMinutesInput] = useState('');
  const [type, setType] = useState<SessionType>('مذاكرة');
  const [started, setStarted] = useState('');
  const [error, setError] = useState('');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) { setError(t('taskform.subjectRequired')); return; }
    const m = Number(minutesInput);
    if (!m || m <= 0) { setError(t('taskform.durationRequired')); return; }
    setError('');
    const minutes = Math.max(1, Math.min(180, Math.round(m)));
    window.dispatchEvent(new CustomEvent('days-life:start-session', { detail: { subject: subject.trim(), minutes, type } }));
    setStarted(locale === 'ar'
      ? `بدأت جلسة ${subject.trim()} — ${minutes} دقيقة (${type}). المؤقت شغال فوق، ولما يخلص الجلسة هتتسجل لوحدها.`
      : `Started a ${subject.trim()} session — ${minutes} min (${typeLabel(type, locale)}). The timer is running below; when it finishes, the session saves itself.`);
    setSubject(''); setMinutesInput(''); setTimeout(() => setStarted(''), 6000);
  }
  return <form onSubmit={submit} className="card"><div className="mb-4 flex items-center gap-2 font-bold"><Plus className="text-coral"/>{t('taskform.title')}</div><div className="grid gap-3 sm:grid-cols-3"><input className="input" value={subject} onChange={e => { setSubject(e.target.value); setError(''); }} placeholder={t('taskform.subjectPlaceholder')}/><input className="input" value={minutesInput} onChange={e => { setMinutesInput(e.target.value); setError(''); }} type="number" step="1" min="1" max="180" required placeholder={t('taskform.durationPlaceholder')}/><select className="input" value={type} onChange={e => setType(e.target.value as SessionType)}>{TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(ty, locale)}</option>)}</select></div><button className="btn-primary mt-3" type="submit"><Play size={18}/>{t('taskform.start')}</button>{error && <p className="mt-3 font-semibold text-red-600">{error}</p>}{started && <p className="mt-3 font-semibold text-emerald-600">{started}</p>}</form>;
}
