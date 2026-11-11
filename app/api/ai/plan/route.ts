import { NextResponse } from 'next/server';

// مدرب الدراسة — بيبعت ملخص حقيقي من بيانات المستخدم لـ Google Gemini مباشرة وبيرجع نصيحة.
// Gemini API من Google AI Studio — مجاني (Free tier)، والموديل الافتراضي gemini-2.5-flash.
// مفتاح Gemini من process.env بس (server-side) — عمره ما بيطلع للعميل ولا بيتسجل في أي لوج.
// لو مفيش مفتاح أو النداء فشل لأي سبب، بيرجع نصيحة جاهزة من البيانات نفسها، مش خطأ 500.

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// الموديل الافتراضي gemini-2.5-flash (مجاني على Google AI Studio) — يتغير من Vercel بمتغير GEMINI_MODEL من غير تعديل كود.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

type PlanSummary = { subject: string; dailyTarget?: number; weeklyTarget?: number; weekHours?: number };
type SessionSummary = { subject: string; hours: number; date: string; type: string };

interface CoachInput {
  weeklyHours: number;
  weeklyGoal: number;
  streak: number;
  topSubject: string;
  plans: PlanSummary[];
  recent: SessionSummary[];
  locale: 'ar' | 'en';
}

function num(v: unknown, max = 1000): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Math.round(n * 100) / 100);
}

function text(v: unknown, maxLen = 40): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, maxLen);
}

function parseInput(body: unknown): CoachInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const plans = Array.isArray(b.plans)
    ? (b.plans as Record<string, unknown>[]).slice(0, 10).map((p) => ({
        subject: text(p.subject),
        dailyTarget: p.dailyTarget === undefined ? undefined : num(p.dailyTarget, 24),
        weeklyTarget: p.weeklyTarget === undefined ? undefined : num(p.weeklyTarget, 168),
        weekHours: p.weekHours === undefined ? undefined : num(p.weekHours, 168),
      })).filter((p) => p.subject)
    : [];
  const recent = Array.isArray(b.recent)
    ? (b.recent as Record<string, unknown>[]).slice(0, 7).map((s) => ({
        subject: text(s.subject),
        hours: num(s.hours, 24),
        date: text(s.date, 10),
        type: text(s.type, 10),
      })).filter((s) => s.subject)
    : [];
  return {
    weeklyHours: num(b.weeklyHours, 168),
    weeklyGoal: num(b.weeklyGoal, 168) || 15,
    streak: num(b.streak, 3650),
    topSubject: text(b.topSubject) || '',
    plans,
    recent,
    locale: b.locale === 'en' ? 'en' : 'ar',
  };
}

// نصيحة جاهزة مبنية على الأرقام الفعلية (من غير ذكاء اصطناعي).
function builtinAdvice(d: CoachInput): string {
  const remaining = Math.max(0, d.weeklyGoal - d.weeklyHours);
  if (d.locale === 'en') {
    if (d.weeklyHours <= 0) return 'No study logged this week yet — start with one short 25-minute focus session today, then come back and ask the coach again.';
    const behind = d.plans.filter((p) => p.weeklyTarget && (p.weekHours ?? 0) < p.weeklyTarget * 0.5).map((p) => p.subject);
    let advice = `You studied ${d.weeklyHours} h this week of your ${d.weeklyGoal} h goal — ${remaining > 0 ? `${remaining} h left.` : 'goal reached, well done!'}`;
    if (behind.length > 0) advice += ` ${behind[0]} is the furthest behind — give it the first session tomorrow.`;
    else if (d.streak >= 3) advice += ` Your ${d.streak}-day streak is your biggest asset — keep it alive with at least one small session a day.`;
    if (d.topSubject) advice += ` Most of your time went to ${d.topSubject}.`;
    return advice;
  }
  if (d.weeklyHours <= 0) return 'لسه مفيش مذاكرة مسجلة الأسبوع ده — ابدأ النهاردة بجلسة تركيز واحدة 25 دقيقة، وبعدين اسأل المدرب تاني.';
  const behind = d.plans.filter((p) => p.weeklyTarget && (p.weekHours ?? 0) < p.weeklyTarget * 0.5).map((p) => p.subject);
  let advice = `ذاكرت ${d.weeklyHours} ساعة الأسبوع ده من هدفك (${d.weeklyGoal} ساعة) — ${remaining > 0 ? `بقي ${remaining} ساعة.` : 'وصلت لهدفك، ممتاز!'}`;
  if (behind.length > 0) advice += ` ${behind[0]} هي أكتر مادة متأخرة — اديها أول جلسة بكرة.`;
  else if (d.streak >= 3) advice += ` الـ streak بتاعك ${d.streak} أيام هو أقوى حاجة عندك — حافظ عليه بجلسة صغيرة كل يوم.`;
  if (d.topSubject) advice += ` أكتر وقتك راح لـ ${d.topSubject}.`;
  return advice;
}

function geminiSystemPrompt(locale: 'ar' | 'en'): string {
  return locale === 'en'
    ? 'You are a friendly, practical study coach inside a study-tracking app. Reply in English. Give 2-3 short, practical suggestions based only on the numbers given. Keep the whole reply under 80 words. Be encouraging and concrete, no generic fluff, no markdown headings.'
    : 'أنت مدرب مذاكرة ودود وعملي داخل تطبيق لتتبع المذاكرة. رد بالعربية (مصري مبسط). أعطِ 2-3 اقتراحات قصيرة وعملية مبنية على الأرقام المعطاة فقط. اجعل الرد كله أقل من 80 كلمة. كن مشجعًا ومحددًا، بدون كلام عام، وبدون عناوين ماركداون.';
}

function geminiUserPrompt(d: CoachInput): string {
  const plansLine = d.plans.length === 0
    ? (d.locale === 'en' ? 'No weekly plans set.' : 'لا توجد خطط أسبوعية.')
    : d.plans.map((p) => {
        const target = p.weeklyTarget ? `${p.weekHours ?? 0}/${p.weeklyTarget}h` : `${p.weekHours ?? 0}h`;
        return `${p.subject}: ${target}`;
      }).join(' | ');
  const recentLine = d.recent.length === 0
    ? (d.locale === 'en' ? 'No recent sessions.' : 'لا توجد جلسات حديثة.')
    : d.recent.map((s) => `${s.date} ${s.subject} ${s.hours}h`).join(' | ');
  return d.locale === 'en'
    ? `This week: ${d.weeklyHours}h studied of a ${d.weeklyGoal}h goal. Streak: ${d.streak} days. Top subject: ${d.topSubject || 'none'}. Plans: ${plansLine}. Recent sessions: ${recentLine}.`
    : `هذا الأسبوع: ${d.weeklyHours} ساعة مذاكرة من هدف ${d.weeklyGoal} ساعة. الـ streak: ${d.streak} أيام. أبرز مادة: ${d.topSubject || 'لا شيء'}. الخطط: ${plansLine}. الجلسات الأخيرة: ${recentLine}.`;
}

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const data = parseInput(body);
  const fallback = builtinAdvice(data);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ advice: fallback, source: 'built-in' as const, reason: 'no-key' as const });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let res: Response;
    try {
      res = await fetch(`${GEMINI_API_URL}/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: geminiSystemPrompt(data.locale) }] },
          contents: [{ parts: [{ text: geminiUserPrompt(data) }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      console.error('[ai-coach] Gemini request failed:', res.status);
      const errText = await res.text().catch(() => '');
      console.error('[ai-coach] Gemini error body:', errText.slice(0, 500));
      throw new Error('Gemini request failed');
    }
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const advice = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
    if (!advice) throw new Error('Empty Gemini response');
    return NextResponse.json({ advice, source: 'gemini' as const });
  } catch (err) {
    // أي فشل في Gemini (نت، مفتاح غلط، موديل مش موجود، مهلة) → النصيحة الجاهزة، مش خطأ للمستخدم.
    // السبب بيرجع للواجهة عشان الملاحظة تبقى صادقة: المفتاح موجود بس Gemini مردّش.
    console.error('[ai-coach] Gemini request failed (exception):', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ advice: fallback, source: 'built-in' as const, reason: 'gemini-error' as const });
  }
}
