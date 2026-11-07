// FOCUS ON LIFE dashboard — static, Supabase-backed, read-only.
// No keys are baked into this file. Enter them in the page; they are
// stored in localStorage in your browser only.
// Deploy: Vercel → import the GitHub repo → Root Directory: web
// (or set the Vercel project root to web/).

let client = null;

function loadSaved() {
  document.getElementById('url').value = localStorage.getItem('fol_supabase_url') || '';
  document.getElementById('key').value = localStorage.getItem('fol_supabase_key') || '';
}

async function connect() {
  const url = document.getElementById('url').value.trim();
  const key = document.getElementById('key').value.trim();
  if (!url || !key) { setStatus('Enter URL and anon key.'); return; }
  localStorage.setItem('fol_supabase_url', url);
  localStorage.setItem('fol_supabase_key', key);
  client = window.supabase.createClient(url, key);
  setStatus('Connected. Loading…');
  await loadAll();
}

function setStatus(t) { document.getElementById('status').textContent = t; }

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function loadAll() {
  try {
    const { data: devices, error: e1 } = await client.from('devices').select('*').order('last_seen_at', { ascending: false }).limit(20);
    if (e1) throw e1;
    document.getElementById('devices').innerHTML = devices.length
      ? '<ul>' + devices.map(d => `<li><b>${esc(d.device_id)}</b> — ${esc(d.model || '')} · Android ${esc(d.android_release || '')} · ${esc(d.blocking_mode || '')}</li>`).join('') + '</ul>'
      : 'No devices yet.';
    const { data: sessions, error: e2 } = await client.from('focus_sessions').select('*').order('created_at', { ascending: false }).limit(20);
    if (e2) throw e2;
    document.getElementById('sessions').innerHTML = sessions.length
      ? '<ul>' + sessions.map(s => `<li>${esc(s.device_id)} — ${esc(s.status)} — ${new Date(Number(s.start_at)).toLocaleString()} → ${new Date(Number(s.end_at)).toLocaleString()}</li>`).join('') + '</ul>'
      : 'No sessions yet.';
    const { data: ov, error: e3 } = await client.from('emergency_overrides').select('*').order('created_at', { ascending: false }).limit(20);
    if (e3) throw e3;
    document.getElementById('overrides').innerHTML = ov.length
      ? '<ul>' + ov.map(o => `<li>${esc(o.device_id)} — ${esc(o.reason)} — ${new Date(o.created_at).toLocaleString()}</li>`).join('') + '</ul>'
      : 'No overrides yet.';
    setStatus('Loaded.');
  } catch (err) {
    setStatus('Error: ' + (err.message || err));
  }
}

document.getElementById('connect').addEventListener('click', connect);
loadSaved();
