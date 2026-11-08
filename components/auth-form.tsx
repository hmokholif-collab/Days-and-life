'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const signup = mode === 'signup'; const router = useRouter();
  const { t, locale } = useLanguage();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [message, setMessage] = useState(''); const [messageKind, setMessageKind] = useState<'success' | 'error'>('error'); const [loading, setLoading] = useState(false);
  // رسالة الخطأ الخام من Supabase إنجليزي — نترجم أشهر الحالات لعربي بسيط.
  function friendlyError(error: unknown): string {
    const raw = error instanceof Error ? error.message : '';
    if (/invalid login credentials/i.test(raw)) return t('auth.loginFailed');
    if (/user already registered/i.test(raw)) return t('auth.alreadyRegistered');
    if (/email not confirmed/i.test(raw)) return t('auth.genericError');
    return locale === 'ar' ? t('auth.genericError') : raw || t('auth.genericError');
  }
  async function submit(e: React.FormEvent) { e.preventDefault(); setLoading(true); setMessage(''); try { const supabase = createClient(); if (signup) { const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` } }); if (error) throw error; setMessageKind('success'); setMessage(t('auth.signupSuccess')); setTimeout(() => router.push('/login'), 1500); } else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; router.push('/dashboard'); router.refresh(); } } catch (error) { setMessageKind('error'); setMessage(friendlyError(error)); } finally { setLoading(false); } }
  // زرار Google متشال لحد ما يتظبط الـ provider في Supabase — كان بيطلع خطأ على الفاضي.
  return <main className="grid min-h-screen place-items-center p-5"><form onSubmit={submit} className="card w-full max-w-md"><Link className="text-xl font-black" href="/">Days <span className="text-coral">and</span> Life</Link><h1 className="mt-8 text-3xl font-black">{signup ? t('auth.startJourney') : t('auth.welcomeBack')}</h1><p className="mt-2 text-slate-500">{signup ? t('auth.signupSub') : t('auth.loginSub')}</p>{signup && <input className="input mt-6" value={name} onChange={e => setName(e.target.value)} placeholder={t('auth.name')} required/>}<input className="input mt-3" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder={t('auth.email')} required/><input className="input mt-3" value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={6} placeholder={t('auth.password')} required/><button disabled={loading} className="btn-primary mt-6 w-full">{loading ? t('auth.creating') : signup ? t('auth.createBtn') : t('auth.loginBtn')}</button>{message && <p className={`mt-4 text-sm font-semibold ${messageKind === 'success' ? 'text-emerald-600' : 'text-coral'}`}>{message}</p>}<p className="mt-5 text-center text-sm">{signup ? t('auth.hasAccount') : t('auth.noAccount')} <Link className="font-bold text-coral" href={signup ? '/login' : '/signup'}>{signup ? t('auth.loginLink') : t('auth.createLink')}</Link></p></form></main>;
}
