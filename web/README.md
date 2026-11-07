# FOCUS ON LIFE — Web dashboard (Vercel)

Static, read-only dashboard. No build step, no keys in the repo.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Vercel → Add New → Project → import the repo.
3. **Root Directory: `web`** (Framework Preset: Other).
4. Deploy. No environment variables are required — Supabase URL + anon key are entered in the page and stored in the browser only.

## Use

Open the deployed site, paste Supabase URL + anon key, click Connect. It lists devices, focus sessions and emergency overrides from Supabase. Facebook never appears here — it is local-only by app policy.
