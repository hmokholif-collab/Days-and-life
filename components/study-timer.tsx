'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { BellRing, Clock3, Pause, Play, RotateCcw, Timer } from 'lucide-react';
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
    <motion.section
      className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-white via-[#fff8f6] to-[#eefdf6] p-6 shadow-[0_16px_50px_rgb(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:bg-none sm:p-8"
      id="study-timer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-center gap-2 font-black">
        <span className="rounded-2xl bg-gradient-to-br from-coral to-amber-500 p-2 text-white shadow-md shadow-coral/30"><Timer size={18} /></span>
        {t('timer.timerTitle')}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-1 rounded-full bg-slate-100/80 p-1 dark:bg-slate-800/80">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button key={m.id} type="button" onClick={() => pickMode(m.id, m.minutes)}
              className={`relative rounded-full px-4 py-2 text-sm font-bold transition ${active ? 'text-ink dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {active && <motion.span layoutId="timer-mode-pill" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-slate-900" transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} />}
              <span className="relative">{t(m.labelKey)} {m.minutes} {t('timer.min')}</span>
            </button>
          );
        })}
        <label
          className={`relative flex cursor-pointer items-center rounded-full px-4 py-2 text-sm font-bold transition ${mode === 'custom' ? 'text-ink dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => { if (mode !== 'custom') pickMode('custom', customMinutes); }}
        >
          {mode === 'custom' && <motion.span layoutId="timer-mode-pill" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-slate-900" transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} />}
          <span className="relative flex items-center gap-1.5">
            {t('timer.custom')}
            <input className="w-12 bg-transparent text-center font-black outline-none" type="number" min={1} max={180} value={customMinutes}
              onChange={(e) => { const v = Math.max(1, Math.min(180, Number(e.target.value) || 1)); setCustomMinutes(v); pickMode('custom', v); }} />
            {t('timer.min')}
          </span>
        </label>
      </div>

      <div className="mt-7 flex flex-col items-center">
        <div className="relative h-60 w-60 sm:h-64 sm:w-64">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="timer-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6b5f" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r={R} fill="none" strokeWidth="12" className="stroke-slate-200/70 dark:stroke-slate-800" />
            <circle cx="100" cy="100" r={R} fill="none" strokeWidth="12" strokeLinecap="round" stroke="url(#timer-ring-grad)"
              className="transition-all duration-500" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
              style={{ filter: 'drop-shadow(0 6px 12px rgb(255 107 95 / 0.3))' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black tabular-nums tracking-tight" dir="ltr">{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</span>
            <span className="mt-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{running ? t('timer.running') : finished ? t('timer.finished') : t('timer.ready')}</span>
          </div>
        </div>

        <div className="mt-6 w-full max-w-xs space-y-3">
          <input className="input !rounded-full text-center" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('timer.subjectPlaceholder')} />
          <div className="flex items-center gap-2">
            {running
              ? <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-amber-500 py-3 font-black text-white shadow-lg shadow-coral/30 transition hover:opacity-95" onClick={pause}><Pause size={18} />{t('timer.pause')}</button>
              : <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-amber-500 py-3 font-black text-white shadow-lg shadow-coral/30 transition hover:opacity-95" onClick={start}><Play size={18} />{remaining < total ? t('timer.resume') : t('timer.start')}</button>}
            <button type="button" className="rounded-full border border-slate-200 bg-white/70 p-3 text-slate-500 transition hover:bg-white dark:border-slate-700 dark:bg-slate-800" onClick={reset} aria-label={t('timer.reset')}><RotateCcw size={18} /></button>
          </div>
          {finished && <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-600 dark:bg-emerald-950/50">{locale === 'ar' ? `خلصت الجلسة 👏 اتسجلت في يومك: ${Math.round(total / 60)} دقيقة.` : `Session done 👏 Added to your day: ${Math.round(total / 60)} min.`}</p>}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"><Play size={13} className="text-coral" />{today.sessions} {t('today.sessionsWord')}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"><Clock3 size={13} className="text-coral" />{today.minutes} {t('timer.minutesShort')}</span>
          </div>
          <button type="button" className="mx-auto flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-coral" onClick={() => Notification?.requestPermission?.()}>
            <BellRing size={16} />{t('timer.enableNotif')}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
