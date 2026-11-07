'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Globe2, Palette, UserRound } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { createClient } from '@/lib/supabase/client';
export default function Settings() {
  const router = useRouter();
  const [auth, setAuth] = useState<{ configured: boolean; signedIn: boolean; email?: string }>({ configured: false, signedIn: false });
  useEffect(() => {
    void import('@/lib/supabase/sync').then((m) => m.getSyncStatus()).then(setAuth).catch(() => { /* مفيش Supabase */ });
  }, []);
  async function signOut() {
    try { await createClient().auth.signOut(); } catch { /* مفيش Supabase */ }
    setAuth({ configured: auth.configured, signedIn: false });
    router.refresh();
  }
  return <div className="mx-auto max-w-3xl p-5 md:p-10"><h1 className="text-3xl font-black">الإعدادات</h1><div className="mt-6 space-y-4"><section className="card"><div className="flex items-center gap-3"><UserRound className="text-coral"/><div><h2 className="font-bold">الحساب</h2><p className="text-sm text-slate-500">{auth.signedIn ? auth.email : auth.configured ? 'مش مسجّل دخول' : 'حساب محلي — بدون تسجيل دخول'}</p></div></div>{auth.signedIn ? <><p className="mt-3 text-sm text-emerald-600">المزامنة مع Supabase شغالة — جلساتك بتتحفظ في حسابك وبتتزامن بين أجهزتك.</p><button className="btn mt-4 border border-slate-300" onClick={signOut}>تسجيل الخروج</button></> : auth.configured ? <><p className="mt-3 text-sm text-slate-500">سجّل الدخول عشان جلساتك تتزامن مع حسابك على Supabase.</p><Link href="/login" className="btn-primary mt-4">تسجيل الدخول</Link></> : <p className="mt-3 text-sm text-slate-500">جلساتك بتتحفظ على جهازك بس لحد ما يتوصل المشروع بـ Supabase (متغيرات البيئة في Vercel)، وساعتها سجّل الدخول من هنا.</p>}</section><section className="card"><div className="flex items-center gap-3"><Globe2 className="text-coral"/><h2 className="font-bold">اللغة والمظهر</h2></div><div className="mt-4"><select className="input"><option>العربية</option><option>English</option></select></div><div className="mt-5"><div className="mb-3 flex items-center gap-2 font-bold"><Palette className="text-coral" size={18}/>اختار الثيم</div><ThemePicker/></div><p className="mt-3 text-sm text-slate-500">الثيم اللي تختاره بيتحفظ على جهازك وبيتطبق على كل الصفحات.</p></section><section className="card"><div className="flex items-center gap-3"><Bell className="text-coral"/><div><h2 className="font-bold">تذكيرات الدراسة</h2><p className="text-sm text-slate-500">فعّل الإشعارات لتذكيرك بالمهام.</p></div></div><button className="btn-primary mt-4" onClick={()=>Notification?.requestPermission?.()}>تفعيل الإشعارات</button></section></div></div>; }
