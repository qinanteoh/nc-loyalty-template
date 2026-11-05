// NC Loyalty Program (club name, subtitle and logo are set in the admin page)
// One Cloudflare Worker: serves the app, stores everything in a D1 database (binding name: DB).
// Secret needed: ADMIN_PASSWORD (the shop's admin password).

const HTML = __HTML__;
const SEED = __SEED__;
const PHOTOS = __PHOTOS__;
const ICONS = __ICONS__;
const BRAND = __BRAND__;
const brandOf = st => ({ name: (st && st.brandName) || BRAND.name, sub: (st && st.brandSub) || BRAND.sub, short: (st && st.brandShort) || BRAND.short });
const escHtml = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const manifestFor = st => { const b = brandOf(st); return JSON.stringify({
  name: b.name, short_name: b.short, start_url: '/', display: 'standalone',
  background_color: '#FBF5F3', theme_color: '#7A1E3A', lang: 'zh',
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
}); };

const TZ_OFFSET_H = 8; // Malaysia / Singapore
const DAY = 864e5;
const RECENT_MS = 3 * 60e3;
const DAILY_PTS = { Silver: 10, Gold: 20, Platinum: 30 };
// Tier: a 30-day card counts as three 10+1 cards. Every card opened (paid or not) plus cards bought before the app.
// More than 9 → Gold, more than 18 → Platinum, otherwise Silver. A manual tier (tierOverride) wins.
const TIER_RULE = { gold: 9, platinum: 18 };
const kindOf = c => c.kind || (/daily/i.test(c.name || '') ? 'daily' : /30/.test(c.name || '') ? '30' : /10\s*\+\s*1/.test(c.name || '') ? '10+1' : 'other');
async function tierOf(s, m) {
  if (!m) return 'Silver';
  if (m.tierOverride && DAILY_PTS[m.tierOverride]) return m.tierOverride;
  const cs = await s.where('cards', 'phone', m.id);
  const score = (+m.prior10 || 0) + cs.filter(c => kindOf(c) === '10+1').length + 3 * ((+m.prior30 || 0) + cs.filter(c => kindOf(c) === '30').length);
  return score > TIER_RULE.platinum ? 'Platinum' : score > TIER_RULE.gold ? 'Gold' : 'Silver';
}
const ADMIN_COLS = ['rewards', 'tasks', 'members', 'cards', 'checkins', 'requests', 'ledger'];
const CUSTOMER_DAYS = 365, ADMIN_DAYS = 365; // stays signed in; renewed on every visit

/* ---------------- helpers ---------------- */
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const fail = (msg, code = 'bad_request', status = 400) => json({ error: msg, code }, status);
const today = () => { const d = new Date(Date.now() + TZ_OFFSET_H * 3600e3); return d.toISOString().slice(0, 10); };
const parseD = s => { const [y, m, d] = String(s || '').split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
const rid = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const uid = () => Date.now().toString(36) + rid(3);
function h36(str) { let h = 2166136261 >>> 0; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
function qrCodeFor(st, date) { if (!st || !st.qrKey || st.qrMode === 'off') return null; return h36(st.qrKey + '|' + (st.qrMode === 'daily' ? date : 'fixed')); }
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const cleanPhone = p => String(p || '').replace(/\D/g, '');

/* ---------------- storage ---------------- */
class Store {
  constructor(db) { this.db = db; }
  async all(col) {
    const r = await this.db.prepare('SELECT id, data FROM docs WHERE col = ?').bind(col).all();
    return r.results.map(x => ({ id: x.id, ...JSON.parse(x.data) }));
  }
  async where(col, field, value) {
    const r = await this.db.prepare(`SELECT id, data FROM docs WHERE col = ? AND json_extract(data, '$.${field}') = ?`).bind(col, value).all();
    return r.results.map(x => ({ id: x.id, ...JSON.parse(x.data) }));
  }
  async get(col, id) {
    const r = await this.db.prepare('SELECT data FROM docs WHERE col = ? AND id = ?').bind(col, String(id)).first();
    return r ? { id: String(id), ...JSON.parse(r.data) } : null;
  }
  putStmt(col, id, data) {
    const { id: _drop, ...rest } = data || {};
    return this.db.prepare('INSERT INTO docs (col, id, data) VALUES (?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET data = excluded.data')
      .bind(col, String(id), JSON.stringify(rest));
  }
  async put(col, id, data) { await this.putStmt(col, id, data).run(); return String(id); }
  async del(col, id) { await this.db.prepare('DELETE FROM docs WHERE col = ? AND id = ?').bind(col, String(id)).run(); }
}

let ready = null;
async function init(env) {
  if (!env.DB) throw new Error('NO_DB');
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (col, id))'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, type TEXT NOT NULL, data TEXT NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, phone TEXT, admin INTEGER NOT NULL, exp INTEGER NOT NULL)')
  ]);
  const s = new Store(env.DB);
  const seeded = await s.get('meta', 'seed');
  if (!seeded) {
    const stmts = [];
    for (const [col, docs] of Object.entries(SEED)) for (const d of docs) stmts.push(s.putStmt(col, d.id, d));
    const st = SEED.settings && SEED.settings[0];
    if (st && !st.qrKey) stmts.push(s.putStmt('settings', 'home', { ...st, qrKey: rid(8) }));
    for (const [id, p] of Object.entries(PHOTOS))
      stmts.push(env.DB.prepare('INSERT OR IGNORE INTO photos (id, type, data) VALUES (?, ?, ?)').bind(id, p.type, p.data));
    stmts.push(s.putStmt('meta', 'seed', { at: Date.now() }));
    for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40));
  }
}

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
async function handleApi(req, env, path) {
  const s = new Store(env.DB); s.env = env;
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const who = await session(env, req);

  if (path === 'data') {
    const settings = (await s.get('settings', 'home')) || {};
    const pub = { rewards: await s.all('rewards'), tasks: await s.all('tasks') };
    if (who.admin) {
      const data = { ...pub, settings };
      for (const c of ['members', 'cards', 'checkins', 'requests', 'ledger']) data[c] = await s.all(c);
      const pins = new Set((await s.all('pins')).map(p => p.id));
      data.members = data.members.map(m => ({ ...m, hasPin: pins.has(m.id) }));
      let me = null;
      if (who.phone) me = who.phone;
      return json({ data, admin: true, me });
    }
    const { qrKey, ...publicSettings } = settings;
    const data = { ...pub, settings: publicSettings, members: [], cards: [], checkins: [], requests: [], ledger: [] };
    let me = null;
    if (who.phone) {
      const m = await s.get('members', who.phone);
      if (m) {
        me = who.phone; data.members = [m];
        for (const c of ['cards', 'checkins', 'requests', 'ledger']) data[c] = await s.where(c, 'phone', who.phone);
      }
    }
    return json({ data, admin: false, me });
  }

  if (path === 'login/check') {
    const phone = cleanPhone(body.phone); if (!phone) return fail('请输入手机号码');
    const m = await s.get('members', phone);
    if (!m) return json({ exists: false });
    const pin = await s.get('pins', phone);
    return json({ exists: true, hasPin: !!pin, name: m.name });
  }

  if (path === 'register') {
    const phone = cleanPhone(body.phone), pin = String(body.pin || ''), name = String(body.name || '').trim().slice(0, 40);
    if (phone.length < 9 || phone.length > 13) return fail('请输入正确的手机号码');
    if (!name) return fail('请输入你的名字');
    if (!/^\d{4}$/.test(pin)) return fail('密码要是 4 个数字');
    if (await s.get('members', phone)) return fail('这个号码已经注册过了，请直接登入', 'exists');
    await env.DB.batch([
      s.putStmt('members', phone, { name, phone, tier: 'Silver', points: 0, joined: today(), self: true }),
      s.putStmt('pins', phone, { hash: await sha(`vw143|${phone}|${pin}`), at: Date.now() })
    ]);
    return json({ token: await newSession(env, phone, false), name });
  }

  if (path === 'login') {
    const phone = cleanPhone(body.phone), pin = String(body.pin || '');
    if (!/^\d{4}$/.test(pin)) return fail('密码要是 4 个数字');
    const m = await s.get('members', phone); if (!m) return fail('找不到这个号码的会员，请联系教练开通', 'no_member');
    const lock = (await s.get('pinfail', phone)) || { n: 0, until: 0 };
    if (lock.until > Date.now()) return fail(`密码错误太多次，请 ${Math.ceil((lock.until - Date.now()) / 60e3)} 分钟后再试，或联系教练重设`, 'locked', 429);
    const stored = await s.get('pins', phone);
    const hash = await sha(`vw143|${phone}|${pin}`);
    if (!stored) {
      if (!body.setPin) return fail('请先设定密码', 'need_pin');
      await s.put('pins', phone, { hash, at: Date.now() });
    } else if (stored.hash !== hash) {
      const n = (lock.n || 0) + 1;
      await s.put('pinfail', phone, n >= 5 ? { n: 0, until: Date.now() + 15 * 60e3 } : { n, until: 0 });
      return fail(n >= 5 ? '密码错误太多次，请 15 分钟后再试，或联系教练重设' : `密码不对，还可以再试 ${5 - n} 次`, 'bad_pin', 401);
    }
    await s.del('pinfail', phone);
    return json({ token: await newSession(env, phone, false), name: m.name });
  }

  if (path === 'logout') {
    const t = req.headers.get('x-token'); if (t) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(t).run();
    return json({ ok: true });
  }

  if (path === 'checkin') {
    if (!who.phone) return fail('请先登入', 'no_login', 401);
    const card = await s.get('cards', body.cardId);
    if (!card || card.phone !== who.phone) return fail('找不到这张卡');
    const settings = (await s.get('settings', 'home')) || {};
    if ((settings.qrMode || 'fixed') !== 'off') {
      const expected = qrCodeFor(settings, today());
      if (!expected || body.code !== expected) return fail('这个二维码已失效，请扫描店内的打卡二维码', 'bad_qr');
    }
    return doCheckin(s, card, body.force, 'qr');
  }

  if (path === 'request') {
    if (!who.phone) return fail('请先登入', 'no_login', 401);
    const m = await s.get('members', who.phone); if (!m) return fail('找不到会员资料');
    const base = { phone: m.id, name: m.name, status: 'pending', ts: Date.now() };
    if (body.type === 'redeem') {
      const r = await s.get('rewards', body.rewardId);
      if (!r || r.active === false) return fail('这个礼物已下架');
      if (r.stock != null && r.stock <= 0) return fail('这个礼物已兑完');
      const avail = (await memberTotal(s, m.id)) - (await pendingRedeem(s, m.id));
      if (avail < r.points) return fail('积分不足');
      await s.put('requests', uid(), { ...base, type: 'redeem', rewardId: r.id, title: r.name, points: +r.points });
      return json({ ok: true });
    }
    if (body.type === 'earn') {
      const t = await s.get('tasks', body.taskId);
      if (!t || t.active === false || t.auto) return fail('这个任务不能申请');
      await s.put('requests', uid(), { ...base, type: 'earn', taskId: t.id, title: t.name + (t.en ? ' ' + t.en : ''), points: +t.points, note: String(body.note || '').slice(0, 300) });
      return json({ ok: true });
    }
    if (body.type === 'renew') {
      const rq = await s.where('requests', 'phone', m.id);
      if (rq.some(r => r.type === 'renew' && r.status === 'pending')) return fail('你已经有一个续卡申请在审核中');
      const total = Math.max(1, Math.min(200, parseInt(body.total, 10) || 11));
      const name = String(body.cardName || 'NCP').slice(0, 60);
      await s.put('requests', uid(), { ...base, type: 'renew', title: name, cardName: name, kind: ['10+1', '30', 'daily'].includes(body.kind) ? body.kind : null, total, points: 0 });
      return json({ ok: true });
    }
    return fail('未知的申请');
  }

  if (path === 'admin/login') {
    if (!env.ADMIN_PASSWORD) return fail('还没有设定管理员密码（ADMIN_PASSWORD）', 'no_password', 500);
    const lock = (await s.get('pinfail', '__admin')) || { n: 0, until: 0 };
    if (lock.until > Date.now()) return fail('密码错误太多次，请 15 分钟后再试', 'locked', 429);
    if (String(body.password || '') !== String(env.ADMIN_PASSWORD)) {
      const n = (lock.n || 0) + 1;
      await s.put('pinfail', '__admin', n >= 8 ? { n: 0, until: Date.now() + 15 * 60e3 } : { n, until: 0 });
      return fail('管理员密码不对', 'bad_password', 401);
    }
    await s.del('pinfail', '__admin');
    return json({ token: await newSession(env, null, true) });
  }

  if (path.startsWith('admin/')) {
    if (!who.admin) return fail('请先用管理员密码登入', 'no_admin', 401);
    const act = path.slice(6);
    if (act === 'logout') { await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(req.headers.get('x-admin')).run(); return json({ ok: true }); }
    if (act === 'put' || act === 'patch' || act === 'del') {
      if (!ADMIN_COLS.includes(body.col)) return fail('不允许的资料类型');
      const id = String(body.id || uid());
      if (act === 'del') { await s.del(body.col, id); return json({ ok: true }); }
      const old = act === 'patch' ? (await s.get(body.col, id)) || {} : {};
      await s.put(body.col, id, { ...old, ...(body.data || {}) });
      return json({ ok: true, id });
    }
    if (act === 'settings') { await s.put('settings', 'home', body.data || {}); return json({ ok: true }); }
    if (act === 'photo') {
      const mt = String(body.data || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!mt) return fail('照片格式不支持');
      if (mt[2].length > 1_400_000) return fail('照片太大了，请换一张小一点的');
      const id = 'u' + uid();
      await env.DB.prepare('INSERT INTO photos (id, type, data) VALUES (?, ?, ?)').bind(id, mt[1], mt[2]).run();
      return json({ ok: true, id });
    }
    if (act === 'adjust') {
      const delta = parseInt(body.delta, 10); if (!delta) return fail('请输入积分');
      await addLedger(s, cleanPhone(body.phone), delta, String(body.reason || (delta > 0 ? '教练加分' : '教练扣分')).slice(0, 120));
      return json({ ok: true });
    }
    if (act === 'resetpin') { const p = cleanPhone(body.phone); await s.del('pins', p); await s.del('pinfail', p); await env.DB.prepare('DELETE FROM sessions WHERE phone = ? AND admin = 0').bind(p).run(); return json({ ok: true }); }
    if (act === 'checkin') {
      const card = await s.get('cards', body.cardId); if (!card) return fail('找不到这张卡');
      return doCheckin(s, card, true, 'staff');
    }
    if (act === 'approve') {
      const r = await s.get('requests', body.id);
      if (!r || r.status !== 'pending') return fail('这个申请已经处理过了');
      const m = await s.get('members', r.phone); if (!m) return fail('找不到这位会员');
      if (r.type === 'renew') {
        await s.put('cards', uid(), { phone: r.phone, name: r.cardName || r.title, kind: r.kind || null, total: +r.total || 11, days: null, start: today(), ts: Date.now(), paid: false, paidAt: null });
      } else if (r.type === 'redeem') {
        if ((await memberTotal(s, r.phone)) < r.points) return fail('会员积分不足');
        await addLedger(s, r.phone, -r.points, '兑换 ' + r.title);
        const rw = await s.get('rewards', r.rewardId);
        if (rw && rw.stock != null) await s.put('rewards', rw.id, { ...rw, stock: Math.max(0, rw.stock - 1) });
      } else {
        await addLedger(s, r.phone, +r.points, r.title);
      }
      await s.put('requests', r.id, { ...r, status: 'approved', doneAt: Date.now() });
      return json({ ok: true });
    }
    return fail('未知的操作');
  }
  return fail('找不到这个功能', 'not_found', 404);
}

async function doCheckin(s, card, force, by) {
  const ins = (await s.where('checkins', 'cardId', card.id)).sort((a, b) => a.ts - b.ts);
  const total = +card.total || 0, left = total - ins.length;
  if (left <= 0) return fail('这张卡已经用完了，请申请续卡', 'used_up');
  const t = parseD(today()), st = parseD(card.start);
  if (t < st) return fail(`这张卡 ${card.start} 才开始`, 'not_started');
  if ((+card.days || 0) > 0 && t > st + (card.days - 1) * DAY) return fail('这张卡已经过期了', 'expired');
  const last = ins[ins.length - 1];
  if (!force && last && Date.now() - last.ts < RECENT_MS) return json({ recent: true, left });
  const m = await s.get('members', card.phone);
  const points = DAILY_PTS[await tierOf(s, m)] || 10;
  await s.put('checkins', `${card.id}_${today()}_${uid()}`, { cardId: card.id, phone: card.phone, date: today(), ts: Date.now(), by, points });
  return json({ ok: true, points, left: left - 1 });
}

function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (!ready) ready = init(env).catch(e => { ready = null; throw e; });
      await ready;
      const im = url.pathname.match(/^\/(?:icon-(\d+)\.png|apple-touch-icon(?:-precomposed)?\.png|favicon\.ico)$/);
      if (im) {
        const st = (await new Store(env.DB).get('settings', 'home')) || {};
        if (st.logo) {
          const r = await env.DB.prepare('SELECT type, data FROM photos WHERE id = ?').bind(st.logo).first();
          if (r) return new Response(b64ToBytes(r.data), { headers: { 'content-type': r.type, 'cache-control': 'public, max-age=3600' } });
        }
        const size = im[1] && ICONS[im[1]] ? im[1] : (url.pathname.startsWith('/apple') ? '180' : '64');
        return new Response(b64ToBytes(ICONS[size]), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' } });
      }
      if (url.pathname === '/manifest.webmanifest') {
        const st = (await new Store(env.DB).get('settings', 'home')) || {};
        return new Response(manifestFor(st), { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'no-cache' } });
      }
      if (url.pathname.startsWith('/img/')) {
        const id = url.pathname.slice(5);
        const r = await env.DB.prepare('SELECT type, data FROM photos WHERE id = ?').bind(id).first();
        if (!r) return new Response('Not found', { status: 404 });
        return new Response(b64ToBytes(r.data), { headers: { 'content-type': r.type, 'cache-control': 'public, max-age=31536000, immutable' } });
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(req, env, url.pathname.slice(5));
      const b = brandOf((await new Store(env.DB).get('settings', 'home')) || {});
      const page = HTML.replaceAll('{{NAME}}', escHtml(b.name)).replaceAll('{{SUB}}', escHtml(b.sub)).replaceAll('{{SHORT}}', escHtml(b.short));
      return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
    } catch (e) {
      if (String(e && e.message) === 'NO_DB') return fail('资料库还没连接：请在 Worker 设定里加上 D1 绑定，变量名称填 DB', 'no_db', 500);
      return fail('系统出错：' + (e && e.message || e), 'server', 500);
    }
  }
};
