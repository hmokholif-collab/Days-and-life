# Supabase setup

1. Create a project at https://supabase.com/dashboard
2. SQL Editor → paste `migrations/001_init.sql` → Run.
3. Settings → API → copy **Project URL** and **anon public key**.
4. In the Android app: Settings → Supabase → paste URL + anon key. They are stored only on the device, never in the repo.
5. In the Vercel dashboard (`web/`): paste the same URL + anon key in the dashboard page itself (stored in your browser's localStorage only), or set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` if you convert the dashboard to Next.js.

Facebook is local-only: the app strips facebook packages/domains before any upload, so they never reach Supabase.
