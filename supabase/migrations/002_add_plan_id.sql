-- ربط الجلسة بخطتها (plan_id) — عشان تغيير اسم المادة ميفقدش التاريخ على جهاز تاني.
-- شغّل الملف ده في Supabase SQL Editor بعد 001_initial_schema.sql.
-- الكود بيشتغل حتى من غير الـ migration ده: لو العمود مش موجود، المزامنة بتعيد الكتابة من غير plan_id.
alter table public.study_sessions
  add column if not exists plan_id text;
