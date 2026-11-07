# Days and Life

تطبيق PWA لتسجيل جلسات المذاكرة ومتابعة الاستمرارية والإحصائيات.

## التشغيل

1. انسخ `.env.example` إلى `.env.local` وأضف بيانات مشروع Supabase.
2. في Supabase SQL Editor شغّل `supabase/migrations/001_initial_schema.sql`.
3. فعّل Email وGoogle في **Authentication → Providers**، وأضف رابط التطبيق إلى Redirect URLs.
4. نفّذ `npm install` ثم `npm run dev`.

## النشر

ارفع المشروع إلى GitHub، ثم استورده في Vercel وأضف متغيرات البيئة نفسها. Vercel يتعرف على Next.js تلقائيًا.

## ملاحظات

- سياسات RLS تمنع أي مستخدم من الوصول لبيانات مستخدم آخر.
- الواجهات الحالية تعرض بيانات تجريبية حتى يتم توصيلها باستعلامات Supabase وServer Actions.
- لإضافة Grok، ضع `GROK_API_KEY` واستدعِه فقط من Route Handler على الخادم، وليس من المتصفح.
