/* ---------------- helpers ---------------- */
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const fail = (msg, code = 'bad_request', status = 400) => json({ error: msg, code }, status);
const APP_VER = '__VER__';
const COURSE_SRC = 'https://raw.githubusercontent.com/qinanteoh/nc-loyalty-template/main/public/course/';
const HEALTH_KEYS = ['weight', 'fat', 'fatMass', 'visceral', 'bone', 'bmr', 'age', 'muscle', 'musclePct', 'physique', 'water', 'bmi'];
function cleanScan(x) {
  const date = String(x.date || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const out = { id: /^[a-z0-9]{6,24}$/i.test(String(x.id || '')) ? String(x.id) : uid(), date, note: String(x.note || '').trim().slice(0, 200) };
  let n = 0;
  for (const k of HEALTH_KEYS) { const v = parseFloat(x[k]); if (x[k] !== '' && x[k] != null && isFinite(v) && v >= 0 && v < 10000) { out[k] = Math.round(v * 100) / 100; n++; } }
  return n ? out : null;
}
// Record edits shared by the member (own record) and the coach (any member): details, add/change a scan, delete a scan.
function healthEdit(h, body) {
  const op = body.op;
  if (op === 'profile') {
    h.profile = cleanProfile(body.profile || {});
  } else if (op === 'scan') {
    const sc = cleanScan(body.scan || {}); if (!sc) return '请填写量身日期和至少一项数字';
    const i = h.scans.findIndex(x => x.id === sc.id);
    if (i >= 0) h.scans[i] = { ...sc, ts: h.scans[i].ts || Date.now() }; else { if (h.scans.length >= 300) return '记录太多了'; h.scans.push({ ...sc, ts: Date.now() }); }
    h.scans.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0));
  } else if (op === 'delScan') {
    h.scans = h.scans.filter(x => x.id !== String(body.id || ''));
  } else return '不明操作';
  return null;
}
function cleanProfile(p) {
  const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n), num = v => { const f = parseFloat(v); return isFinite(f) && f > 0 && f < 1000 ? Math.round(f * 10) / 10 : ''; };
  return { age: num(p.age), height: num(p.height), gender: t(p.gender, 20), program: ['WLP', 'WGP', 'WMP'].includes(p.program) ? p.program : '', target: num(p.target),
    birthday: /^\d{4}-\d{2}-\d{2}$/.test(String(p.birthday || '')) ? p.birthday : '', coach: t(p.coach, 40), sponsor: t(p.sponsor, 40) };
}
const dayOf = ts => new Date(ts + TZ_OFFSET_H * 3600e3).toISOString().slice(0, 10);
const taskOpts = t => String(t.opts || '').split(/[,，、]/).map(x => x.trim()).filter(Boolean).slice(0, 8);
const today = () => { const d = new Date(Date.now() + TZ_OFFSET_H * 3600e3); return d.toISOString().slice(0, 10); };
const parseD = s => { const [y, m, d] = String(s || '').split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
const rid = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const uid = () => Date.now().toString(36) + rid(3);
function h36(str) { let h = 2166136261 >>> 0; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
function qrCodeFor(st, date) { if (!st || !st.qrKey || st.qrMode === 'off') return null; return h36(st.qrKey + '|' + (st.qrMode === 'daily' ? date : 'fixed')); }
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const cleanPhone = p => String(p || '').replace(/\D/g, '');

