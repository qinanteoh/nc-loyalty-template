/* ---------------- domain helpers ---------------- */
async function memberTotal(s, phone) {
  const m = await s.get('members', phone); if (!m) return 0;
  const ck = await s.where('checkins', 'phone', phone);
  return (+m.points || 0) + ck.reduce((a, x) => a + (+x.points || 0), 0);
}
async function pendingRedeem(s, phone) {
  const rq = await s.where('requests', 'phone', phone);
  return rq.filter(r => r.type === 'redeem' && r.status === 'pending').reduce((a, r) => a + (+r.points || 0), 0);
}
async function addLedger(s, phone, delta, reason) {
  const m = await s.get('members', phone); if (!m) throw new Error('找不到这位会员');
  await s.env.DB.batch([
    s.putStmt('members', phone, { ...m, points: (+m.points || 0) + delta }),
    s.putStmt('ledger', uid(), { phone, delta, reason, ts: Date.now() })
  ]);
}

async function session(env, req) {
  const out = { phone: null, admin: false };
  const t = req.headers.get('x-token'), a = req.headers.get('x-admin');
  const now = Date.now();
  if (t) { const r = await env.DB.prepare('SELECT phone, exp FROM sessions WHERE token = ? AND admin = 0 AND exp > ?').bind(t, now).first(); if (r) { out.phone = r.phone; await renew(env, t, r.exp, CUSTOMER_DAYS); } }
  if (a) { const r = await env.DB.prepare('SELECT exp FROM sessions WHERE token = ? AND admin = 1 AND exp > ?').bind(a, now).first(); if (r) { out.admin = true; await renew(env, a, r.exp, ADMIN_DAYS); } }
  return out;
}
// The course pages are opened by the browser directly (no app headers), so the app leaves its sign-in in a cookie for /course.
async function courseAllowed(env, req) {
  const ck = {};
  for (const x of (req.headers.get('cookie') || '').split(/;\s*/)) { const i = x.indexOf('='); if (i > 0) ck[x.slice(0, i)] = decodeURIComponent(x.slice(i + 1)); }
  const now = Date.now();
  if (ck.vw_a && await env.DB.prepare('SELECT 1 FROM sessions WHERE token = ? AND admin = 1 AND exp > ?').bind(ck.vw_a, now).first()) return true;
  if (ck.vw_t) {
    const r = await env.DB.prepare('SELECT phone FROM sessions WHERE token = ? AND admin = 0 AND exp > ?').bind(ck.vw_t, now).first();
    if (r) { const m = await new Store(env.DB).get('members', r.phone); if (m && !m.pending) return true; }
  }
  return false;
}
// Push the expiry forward when a session is used, so people stay signed in until they log out.
async function renew(env, token, exp, days) {
  const target = Date.now() + days * DAY;
  if (target - exp > DAY) await env.DB.prepare('UPDATE sessions SET exp = ? WHERE token = ?').bind(target, token).run();
}
async function newSession(env, phone, admin) {
  const token = rid(24);
  await env.DB.prepare('INSERT INTO sessions (token, phone, admin, exp) VALUES (?, ?, ?, ?)')
    .bind(token, phone, admin ? 1 : 0, Date.now() + (admin ? ADMIN_DAYS : CUSTOMER_DAYS) * DAY).run();
  return token;
}

/* ---------------- routes ---------------- */
