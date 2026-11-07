import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  const { weeklyHours = 0, topSubject = 'your current subject' } = await request.json();
  if (!process.env.GROK_API_KEY) return NextResponse.json({ advice: `ركّز هذا الأسبوع على جلسات قصيرة وثابتة. سجّلت ${weeklyHours} ساعة، ومادتك الأبرز هي ${topSubject}.` });
  // Keep the key server-only. Add the selected AI provider call here when the account is configured.
  return NextResponse.json({ advice: 'AI coaching is configured but the provider adapter has not been enabled yet.' });
}
