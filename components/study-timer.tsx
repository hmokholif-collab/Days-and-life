'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { BellRing, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { addSession, type SessionType } from '@/lib/sessions';
import { useLanguage, type DictKey } from '@/lib/i18n';

type Mode = 'focus' | 'short' | 'long' | 'custom';
const MODES: { id: Mode; labelKey: DictKey; minutes: number }[] = [
  { id: 'focus', labelKey: 'timer.focus', minutes: 25 },
  { id: 'short', labelKey: 'timer.shortBreak', minutes: 5 },
  { id: 'long', labelKey: 'timer.longBreak', minutes: 15 },
];
const STORAGE_KEY = 'days-life-timer';
const LOG_KEY = 'days-life-timer-sessions';

function todayKey() { return new Date().toISOString().slice(0, 10); }
function loadTodayMinutes(): { sessions: number; minutes: number } {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as { date: string; minutes: number }[];
    const today = log.filter((s) => s.date === todayKey());
    return { sessions: today.length, minutes: today.reduce((a, s) => a + s.minutes, 0) };
  } catch { return { sessions: 0, minutes: 0 }; }
}
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch { /* الصوت اختياري */ }
}

export function StudyTimer() {
  const { t, locale } = useLanguage();
  const [mode, setMode] = useState<Mode>('focus');
  const [customMinutes, setCustomMinutes] = useState(45);
  const [total, setTotal] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [subject, setSubject] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('مذاكرة');
  const [today, setToday] = useState({ sessions: 0, minutes: 0 });
  const deadlineRef = useRef<number | null>(null);

  // بدء جلسة من نموذج «جلسة جديدة»: ييجي بالمادة والمدة والتصنيف، والمؤقت يشتغل على طول.
  useEffect(() => {
    const onStart = (e: Event) => {
      const d = (e as CustomEvent<{ subject?: string; minutes?: number; type?: SessionType }>).detail ?? {};
      const minutes = Math.max(1, Math.min(180, Math.round(d.minutes ?? 25)));
      const subj = d.subject?.trim() ?? '';
      setSubject(subj);
      if (d.type) setSessionType(d.type);
      setMode('custom');
      setCustomMinutes(minutes);
      setTotal(minutes * 60); setRemaining(minutes * 60);
      setFinished(false);
      const deadline = Date.now() + minutes * 60 * 1000;
      deadlineRef.current = deadline; setRunning(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ deadline, total: minutes * 60, mode: 'custom', subject: subj }));
      document.getElementById('study-timer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.addEventListener('days-life:start-session', onStart);
    return () => window.removeEventListener('days-life:start-session', onStart);
  }, []);

  useEffect(() => { setToday(loadTodayMinutes()); }, []);
  // استرجاع مؤقت كان شغال قبل ما الصفحة تتقفل
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { deadline: number; total: number; mode: Mode; subject: string } | null;
      if (saved && saved.deadline > Date.now()) {
        setMode(saved.mode); setTotal(saved.total); setSubject(saved.subject ?? '');
        setRemaining(Math.ceil((saved.deadline - Date.now()) / 1000));
        deadlineRef.current = saved.deadline; setRunning(true);
      }
    } catch { /* تجاهل بيانات تالفة */ }
  }, []);

  const finish = useCallback(() => {
    setRunning(false); setFinished(true); deadlineRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
    const minutes = Math.round(total / 60);
    try {
      const log = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as { date: string; minutes: number; mode: string; subject: string }[];
      log.push({ date: todayKey(), minutes, mode, subject });
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch { /* التسجيل محلي فقط */ }
    setToday(loadTodayMinutes());
    // جلسة التركيز (مش الاستراحة) بتتسجل كمان في سجل المذاكرة عشان تظهر في الرئيسية والسجل.
    if (mode === 'focus' || mode === 'custom') {
      addSession({ subject: subject.trim() || (locale === 'ar' ? 'مذاكرة' : 'Study'), hours: Math.round((total / 3600) * 100) / 100, type: sessionType, notes: locale === 'ar' ? `مؤقت ${minutes} دقيقة` : `Timer ${minutes} min` });
    }
    beep();
    if (mode === 'focus') confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 }, colors: ['#ff6b5f', '#70d6b0', '#19213a'] });
    if (Notification?.permission === 'granted') new Notification('Days and Life', { body: mode === 'focus' ? `${t('timer.focusDoneNotif')} ${minutes} ${locale === 'ar' ? 'دقيقة' : 'min'} 👏` : t('timer.breakDoneNotif') });
  }, [mode, sessionType, subject, total, t, locale]);

  useEffect(() => {
    if (!running || deadlineRef.current === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) finish();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [running, finish]);

  useEffect(() => {
    const m = Math.floor(remaining / 60); const s = remaining % 60;
    document.title = running ? `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} — Days and Life` : 'Days and Life';
    return () => { document.title = 'Days and Life'; };
  }, [remaining, running]);

  function pickMode(id: Mode, minutes: number) {
    setMode(id); setTotal(minutes * 60); setRemaining(minutes * 60);
    setRunning(false); setFinished(false); deadlineRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
  }
  function start() {
    const deadline = Date.now() + remaining * 1000;
    deadlineRef.current = deadline; setRunning(true); setFinished(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ deadline, total, mode, subject }));
  }
  function pause() { setRunning(false); deadlineRef.current = null; localStorage.removeItem(STORAGE_KEY); }
  function reset() { pause(); setRemaining(total); setFinished(false); }

  const progress = total > 0 ? 1 - remaining / total : 0;
  const R = 84; const CIRC = 2 * Math.PI * R;
  const mm = Math.floor(remaining / 60); const ss = remaining % 60;

  return (
    <section className="card" id="study-timer">
      <div className="flex items-center gap-2 font-bold"><Timer className="text-coral" />{t('timer.timerTitle')}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.id} type="button" onClick={() => pickMode(m.id, m.minutes)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${mode === m.id ? 'bg-ink text-white dark:bg-coral' : 'border border-slate-200 dark:border-slate-700'}`}>
            {t(m.labelKey)} {m.minutes} {t('timer.min')}
          </button>
        ))}
        <label className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
          {t('timer.custom')}
          <input className="w-14 bg-transparent text-center font-bold outline-none" type="number" min={1} max={180} value={customMinutes}
            onChange={(e) => { const v = Math.max(1, Math.min(180, Number(e.target.value) || 1)); setCustomMinutes(v); pickMode('custom', v); }} />
          {t('timer.min')}
        </label>
      </div>
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:justify-around">
        <div className="relative h-44 w-44">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={R} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
            <circle cx="100" cy="100" r={R} fill="none" strokeWidth="10" strokeLinecap="round"
              className="stroke-coral transition-all duration-500" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black tabular-nums" dir="ltr">{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</span>
            <span className="text-sm text-slate-500">{running ? t('timer.running') : finished ? t('timer.finished') : t('timer.ready')}</span>
          </div>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('timer.subjectPlaceholder')} />
          <div className="flex gap-2">
            {running
              ? <button type="button" className="btn-primary flex-1" onClick={pause}><Pause size={18} />{t('timer.pause')}</button>
              : <button type="button" className="btn-primary flex-1" onClick={start}><Play size={18} />{remaining < total ? t('timer.resume') : t('timer.start')}</button>}
            <button type="button" className="btn border border-slate-300" onClick={reset} aria-label={t('timer.reset')}><RotateCcw size={18} /></button>
          </div>
          {finished && <p className="font-semibold text-emerald-600">{locale === 'ar' ? `خلصت الجلسة 👏 اتسجلت في يومك: ${Math.round(total / 60)} دقيقة.` : `Session done 👏 Added to your day: ${Math.round(total / 60)} min.`}</p>}
          <p className="text-sm text-slate-500">{t('timer.todaySessions')} <b>{today.sessions}</b> · <b>{today.minutes}</b> {t('timer.minutesWord')}</p>
          <button type="button" className="flex items-center gap-2 text-sm font-semibold text-slate-500" onClick={() => Notification?.requestPermission?.()}>
            <BellRing size={16} />{t('timer.enableNotif')}
          </button>
        </div>
      </div>
    </section>
  );
}
