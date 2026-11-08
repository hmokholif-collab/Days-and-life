'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Trash2 } from 'lucide-react';
import { PLANS_EVENT, addPlan, dayPct, deletePlan, hoursForDay, hoursForWeek, isChecked, loadPlans, planExists, toggleCheck, updatePlan, weekDays, type PlanItem } from '@/lib/plans';
import { SESSIONS_EVENT, cairoISOFromDate, formatDateAr, formatHours } from '@/lib/sessions';
import { useLanguage } from '@/lib/i18n';

type EditField = 'subject' | 'dailyTarget' | 'weeklyTarget';

function parseTarget(v: string): number | undefined {
  const n = Number(v);
  if (!v.trim() || Number.isNaN(n) || n <= 0) return undefined;
  return Math.round(n * 100) / 100;
}

// خلية قابلة للتعديل بالنقر عليها — Enter أو الخروج يحفظ، Esc يلغي.
function EditableCell({ editing, value, editValue, type, ariaLabel, placeholder, alignClass, onEdit, onSave, onCancel, children }: {
  editing: boolean;
  value: string;
  editValue: string;
  type: 'text' | 'number';
  ariaLabel: string;
  placeholder?: string;
  alignClass?: string;
  onEdit: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState(editValue);
  const settledRef = useRef(false);
  useEffect(() => {
    if (editing) { setDraft(editValue); settledRef.current = false; }
  }, [editing, editValue]);
  function commit(v: string) {
    if (settledRef.current) return;
    settledRef.current = true;
    onSave(v);
  }
  function cancel() {
    settledRef.current = true;
    onCancel();
  }
  if (!editing) {
    return (
      <button type="button" onClick={onEdit} aria-label={ariaLabel} className={`w-full rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 ${alignClass ?? 'text-center'}`}>
        {children}
      </button>
    );
  }
  return (
    <input
      autoFocus
      className="input w-full px-2 py-1 text-center"
      type={type}
      step={type === 'number' ? '0.5' : undefined}
      min={type === 'number' ? '0' : undefined}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(draft);
        if (e.key === 'Escape') cancel();
      }}
    />
  );
}

export default function Plan() {
  const { t, locale } = useLanguage();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [dupMsg, setDupMsg] = useState(false);

  useEffect(() => {
    // صفوف فاضية متسابة من زيارة فاتت — تتحذف أول ما الصفحة تفتح.
    for (const p of loadPlans()) if (!p.subject.trim()) deletePlan(p.id);
    const refresh = () => setPlans(loadPlans());
    refresh();
    window.addEventListener(PLANS_EVENT, refresh);
    window.addEventListener(SESSIONS_EVENT, refresh);
    return () => {
      window.removeEventListener(PLANS_EVENT, refresh);
      window.removeEventListener(SESSIONS_EVENT, refresh);
      // لو ساب صف فاضي ومشي من الصفحة، الصف بيتمسح.
      for (const p of loadPlans()) if (!p.subject.trim()) deletePlan(p.id);
    };
  }, []);

  const week = weekDays(locale);
  const todayIso = cairoISOFromDate(new Date());
  const daysLeft = Math.max(1, week.filter((d) => d.iso >= todayIso).length);

  function saveSubject(plan: PlanItem, v: string) {
    const name = v.trim();
    // صف من غير اسم مش بيتسجل — لو سابه فاضي، الصف بيتمسح.
    if (!name) { deletePlan(plan.id); setEditing(null); return; }
    // مينفعش خطتين لنفس المادة — التانية هتفضل صفر على طول.
    if (planExists(name, plan.id)) {
      setDupMsg(true);
      setTimeout(() => setDupMsg(false), 3000);
      if (!plan.subject.trim()) deletePlan(plan.id);
      setEditing(null);
      return;
    }
    if (name !== plan.subject) updatePlan(plan.id, { subject: name, dailyTarget: plan.dailyTarget, weeklyTarget: plan.weeklyTarget });
    setEditing(null);
  }
  function saveDaily(plan: PlanItem, v: string) {
    const target = parseTarget(v);
    if (target !== plan.dailyTarget) updatePlan(plan.id, { subject: plan.subject, dailyTarget: target, weeklyTarget: plan.weeklyTarget });
    setEditing(null);
  }
  function saveWeekly(plan: PlanItem, v: string) {
    const target = parseTarget(v);
    if (target !== plan.weeklyTarget) updatePlan(plan.id, { subject: plan.subject, dailyTarget: plan.dailyTarget, weeklyTarget: target });
    setEditing(null);
  }

  function addRow() {
    // صف جديد باسم فاضي — لازم يكتب اسم المادة قبل ما يتسجل، ولو سابه فاضي الصف بيتمسح (شوف saveSubject).
    const plan = addPlan({ subject: '' });
    setEditing({ id: plan.id, field: 'subject' });
  }

  function removeRow(plan: PlanItem) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    if (editing?.id === plan.id) setEditing(null);
    deletePlan(plan.id);
  }

  return (
    <div className="mx-auto max-w-6xl p-5 md:p-10">
      <h1 className="text-3xl font-black">{t('plan.title')}</h1>
      <p className="mt-2 text-slate-500">{t('plan.subtitle')}</p>
      {dupMsg && <p className="mt-2 text-sm font-semibold text-red-500">{t('plan.duplicate')}</p>}
      <p className="mt-1 text-sm text-slate-500">{formatDateAr(week[0].iso, locale)} – {formatDateAr(week[6].iso, locale)}</p>

      {plans.length === 0 ? (
        <p className="card mt-6 text-slate-500">{t('plan.empty')}</p>
      ) : (
        <div className="mt-6 max-h-[70vh] overflow-auto rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[1080px] text-center">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-sm text-slate-500 backdrop-blur dark:bg-slate-800/95">
              <tr>
                <th className="p-4 text-right">{t('plan.subject')}</th>
                <th className="p-2">{t('plan.dailyTarget')}</th>
                <th className="p-2">{t('plan.weeklyTarget')}</th>
                <th className="p-2">{t('plan.todayDone')}</th>
                <th className="p-2">{t('plan.weekDone')}</th>
                <th className="p-2">{t('plan.remaining')}</th>
                <th className="p-2">{t('plan.progress')}</th>
                <th className="p-2">{t('plan.status')}</th>
                {week.map((d) => (
                  <th key={d.iso} className={`p-2 ${d.iso === todayIso ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : ''}`}>
                    <span className="block">{d.label}</span>
                    <span className="text-xs font-normal">{Number(d.iso.slice(8, 10))}</span>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {plans.map((plan, idx) => {
                const todayH = Math.round(hoursForDay(plan.subject, todayIso, plan.id) * 100) / 100;
                const weekH = Math.round(hoursForWeek(plan.subject, plan.id) * 100) / 100;
                const remaining = plan.weeklyTarget ? Math.max(0, Math.round((plan.weeklyTarget - weekH) * 100) / 100) : null;
                const pct = plan.weeklyTarget ? Math.min(100, Math.round((weekH / plan.weeklyTarget) * 100)) : null;
                const done = plan.weeklyTarget !== undefined && weekH >= plan.weeklyTarget;
                const inProgress = !done && weekH > 0;
                return (
                  <motion.tr
                    key={plan.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-2 text-right font-bold">
                      <EditableCell
                        editing={editing?.id === plan.id && editing.field === 'subject'}
                        value={plan.subject}
                        editValue={plan.subject}
                        type="text"
                        ariaLabel={t('plan.subject')}
                        placeholder={t('plan.subjectPlaceholder')}
                        alignClass="text-right font-bold"
                        onEdit={() => setEditing({ id: plan.id, field: 'subject' })}
                        onSave={(v) => saveSubject(plan, v)}
                        onCancel={() => setEditing(null)}
                      >
                        {plan.subject}
                      </EditableCell>
                    </td>
                    <td className="p-2">
                      <EditableCell
                        editing={editing?.id === plan.id && editing.field === 'dailyTarget'}
                        value={plan.dailyTarget ? String(plan.dailyTarget) : ''}
                        editValue={plan.dailyTarget ? String(plan.dailyTarget) : ''}
                        type="number"
                        ariaLabel={t('plan.dailyTarget')}
                        placeholder="2"
                        onEdit={() => setEditing({ id: plan.id, field: 'dailyTarget' })}
                        onSave={(v) => saveDaily(plan, v)}
                        onCancel={() => setEditing(null)}
                      >
                        {plan.dailyTarget ? `${formatHours(plan.dailyTarget)} ${t('common.hoursShort')}` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </EditableCell>
                    </td>
                    <td className="p-2">
                      <EditableCell
                        editing={editing?.id === plan.id && editing.field === 'weeklyTarget'}
                        value={plan.weeklyTarget ? String(plan.weeklyTarget) : ''}
                        editValue={plan.weeklyTarget ? String(plan.weeklyTarget) : ''}
                        type="number"
                        ariaLabel={t('plan.weeklyTarget')}
                        placeholder="10"
                        onEdit={() => setEditing({ id: plan.id, field: 'weeklyTarget' })}
                        onSave={(v) => saveWeekly(plan, v)}
                        onCancel={() => setEditing(null)}
                      >
                        {plan.weeklyTarget ? `${formatHours(plan.weeklyTarget)} ${t('common.hoursShort')}` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </EditableCell>
                    </td>
                    <td className="p-2">{todayH > 0 ? `${formatHours(todayH)} ${t('common.hoursShort')}` : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                    <td className="p-2 font-bold">{formatHours(weekH)} {t('common.hoursShort')}</td>
                    <td className="p-2">{remaining === null ? '—' : `${formatHours(remaining)} ${t('common.hoursShort')}`}</td>
                    <td className="p-2">
                      {pct === null ? (
                        '—'
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-2 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <span className="block h-full rounded-full bg-gradient-to-r from-coral to-amber-400" style={{ width: `${Math.min(100, pct)}%` }} />
                          </span>
                          <span className="text-sm font-bold">{pct}%</span>
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      {done ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800">{t('plan.done')}</span>
                      ) : inProgress ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200 dark:ring-amber-800">{t('plan.statusInProgress')}</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">{t('plan.statusNotStarted')}</span>
                      )}
                    </td>
                    {week.map((d) => {
                      const h = hoursForDay(plan.subject, d.iso, plan.id);
                      const checked = isChecked(plan.id, d.iso);
                      const pct = dayPct(plan, d.iso);
                      const isToday = d.iso === todayIso;
                      return (
                        <td key={d.iso} className={`p-1 ${isToday ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''} ${checked ? 'bg-emerald-100/70 dark:bg-emerald-900/40' : ''}`}>
                          <button
                            type="button"
                            onClick={() => toggleCheck(plan.id, d.iso)}
                            aria-label={checked ? t('plan.unmarkDone') : t('plan.markDone')}
                            aria-pressed={checked}
                            className="flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <span className="font-bold">{h > 0 ? formatHours(h) : <span className="text-slate-300 dark:text-slate-600">—</span>}</span>
                            <span className="flex items-center gap-1">
                              <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'}`}>
                                <Check size={11} strokeWidth={3.5} />
                              </span>
                              {pct !== null && (h > 0 || checked) && (
                                <span className={`text-[11px] font-bold ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>{pct}%</span>
                              )}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-3">
                      <button aria-label={t('plan.delete')} onClick={() => removeRow(plan)} className="text-red-500"><Trash2 size={17} /></button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" onClick={addRow} className="mt-2 flex w-full items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-3 py-2.5 text-slate-500 hover:border-coral/50 hover:bg-slate-50 hover:text-coral dark:border-slate-700 dark:hover:bg-slate-800">
        <Plus size={18} />{t('plan.addRow')}
      </button>

      {plans.length > 0 && (
        <div className="mt-5 space-y-4">
          {plans.map((plan, idx) => {
            const todayH = Math.round(hoursForDay(plan.subject, todayIso, plan.id) * 100) / 100;
            const weekH = Math.round(hoursForWeek(plan.subject, plan.id) * 100) / 100;
            const remaining = plan.weeklyTarget ? Math.max(0, plan.weeklyTarget - weekH) : null;
            const todayPct = dayPct(plan, todayIso);
            const todayDone = todayPct === 100;
            const weekDone = plan.weeklyTarget !== undefined && weekH >= plan.weeklyTarget;
            const daysStudied = week.filter((d) => hoursForDay(plan.subject, d.iso, plan.id) > 0 || isChecked(plan.id, d.iso)).length;
            const pct = plan.weeklyTarget ? Math.min(100, Math.round((weekH / plan.weeklyTarget) * 100)) : null;
            return (
              <motion.section
                className="card"
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.35 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-black">{plan.subject}</h2>
                  {(todayDone || weekDone) && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">{t('plan.done')}</span>}
                </div>
                <p className="mt-4 text-sm font-bold text-slate-500">{t('plan.summary')}</p>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">{t('plan.totalWeek')}</p>
                    <p className="mt-1 text-xl font-black">{formatHours(weekH)} {t('common.hoursShort')}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">{t('plan.weeklyTarget')}</p>
                    <p className="mt-1 text-xl font-black">{plan.weeklyTarget ? `${formatHours(plan.weeklyTarget)} ${t('common.hoursShort')}` : '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">{t('plan.achieved')}</p>
                    <p className="mt-1 text-xl font-black">{pct === null ? '—' : `${pct}%`}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">{t('plan.daysStudied')}</p>
                    <p className="mt-1 text-xl font-black">{daysStudied} / 7</p>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  {plan.dailyTarget !== undefined && (
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-500">{t('plan.todayProgress')}</span>
                        <b>{todayPct === 100 ? t('plan.done') : `${formatHours(todayH)} / ${formatHours(plan.dailyTarget)} ${t('common.hoursShort')}`}{todayPct !== null && todayPct < 100 ? ` · ${todayPct}%` : ''}</b>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-mint to-emerald-400 transition-all" style={{ width: `${todayPct ?? 0}%` }} />
                      </div>
                    </div>
                  )}
                  {plan.weeklyTarget !== undefined && (
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-500">{t('plan.weekProgress')}</span>
                        <b>{formatHours(weekH)} / {formatHours(plan.weeklyTarget)} {t('common.hoursShort')}</b>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-coral to-amber-400 transition-all" style={{ width: `${Math.min(100, (weekH / plan.weeklyTarget) * 100)}%` }} />
                      </div>
                      {remaining !== null && remaining > 0 && (
                        <p className="mt-2 text-sm text-slate-500">{t('plan.pace').replace('{h}', formatHours(Math.round((remaining / daysLeft) * 100) / 100))}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.section>
            );
          })}
        </div>
      )}
    </div>
  );
}
