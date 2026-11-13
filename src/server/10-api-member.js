async function handleApi(req, env, path, ctx) {
  const s = new Store(env.DB); s.env = env; s.ctx = ctx; s.origin = new URL(req.url).origin;
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const who = await session(env, req);

  if (path === 'data') {
    const settings = (await s.get('settings', 'home')) || {};
    const pub = { rewards: await s.all('rewards'), tasks: await s.all('tasks') };
    if (who.admin) {
      const data = { ...pub, settings };
      for (const c of ['members', 'cards', 'checkins', 'requests', 'ledger']) data[c] = await s.all(c);
      data.health = await s.all('health');
      const pins = new Set((await s.all('pins')).map(p => p.id));
      data.members = data.members.map(m => ({ ...m, hasPin: pins.has(m.id) }));
      data.notices = (await s.where('notices', 'phone', '*')).sort((a, b) => b.ts - a.ts).slice(0, 60);
      const pc = await env.DB.prepare("SELECT COUNT(*) AS n, COUNT(DISTINCT json_extract(data, '$.phone')) AS m FROM docs WHERE col = 'pushsubs' AND json_extract(data, '$.phone') != '#admin'").first();
      data.push = { devices: pc ? pc.n : 0, members: pc ? pc.m : 0 };
      const ac = await env.DB.prepare("SELECT COUNT(*) AS n FROM docs WHERE col = 'pushsubs' AND json_extract(data, '$.phone') = '#admin'").first();
      data.adminPush = ac ? ac.n : 0;
      let me = null;
      if (who.phone) { me = who.phone; data.myNotices = await noticesFor(s, who.phone); }
      return json({ data, admin: true, me, ver: APP_VER });
    }
    const { qrKey, ...publicSettings } = settings;
    const data = { ...pub, settings: publicSettings, members: [], cards: [], checkins: [], requests: [], ledger: [], health: [] };
    let me = null;
    if (who.phone) {
      const m = await s.get('members', who.phone);
      if (m) {
        me = who.phone; data.members = [m];
        for (const c of ['cards', 'checkins', 'requests', 'ledger']) data[c] = await s.where(c, 'phone', who.phone);
        { const h = await s.get('health', who.phone); data.health = h ? [h] : []; }
      }
    }
    data.notices = await noticesFor(s, me);
    return json({ data, admin: false, me, ver: APP_VER });
  }

  // Health journey: the member's own course progress and body-composition records. Admins can read them; only the member writes.
  if (path === 'health') {
    if (!who.phone) return fail('请先登入', 'no_login', 401);
    const m = await s.get('members', who.phone); if (!m) return fail('找不到会员资料');
    const cur = (await s.get('health', m.id)) || { scans: [], done: {}, profile: {} };
    const { id: _drop, ...h } = cur;
    h.scans = Array.isArray(h.scans) ? h.scans : []; h.done = h.done || {}; h.profile = h.profile || {};
    const op = body.op;
    if (op === 'done') {
      for (const [n, d] of Object.entries(body.done || {})) {
        const k = parseInt(n, 10);
        if (k >= 1 && k <= 21 && /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && (!h.done[k] || d < h.done[k])) h.done[k] = d;
      }
    } else if (op === 'profile') {
      h.profile = cleanProfile(body.profile || {});
    } else if (op === 'scan') {
      const sc = cleanScan(body.scan || {}); if (!sc) return fail('请填写量身日期和至少一项数字');
      const i = h.scans.findIndex(x => x.id === sc.id);
      if (i >= 0) h.scans[i] = { ...sc, ts: h.scans[i].ts || Date.now() }; else { if (h.scans.length >= 300) return fail('记录太多了'); h.scans.push({ ...sc, ts: Date.now() }); }
      h.scans.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0));
    } else if (op === 'delScan') {
      h.scans = h.scans.filter(x => x.id !== String(body.id || ''));
    } else return fail('不明操作');
    h.name = m.name; h.updated = Date.now();
    await s.put('health', m.id, h);
    return json({ ok: true, health: { id: m.id, ...h } });
  }

  if (path === 'push/key') {
    const v = await s.get('meta', 'vapid');
    return json({ key: v ? v.pub : null });
  }
  if (path === 'push/subscribe') {
    const asAdmin = !!body.admin;
    if (asAdmin ? !who.admin : !who.phone) return fail('请先登入', 'no_login', 401);
    const ep = String(body.endpoint || ''), k = body.keys || {};
    if (!/^https:\/\//.test(ep) || ep.length > 1000 || !k.p256dh || !k.auth) return fail('通知设定不正确', 'bad_sub');
    const id = (await sha(ep + (asAdmin ? ADMIN_SUB : ''))).slice(0, 32);
    await s.put('pushsubs', id, { phone: asAdmin ? ADMIN_SUB : who.phone, endpoint: ep, p256dh: String(k.p256dh).slice(0, 200), auth: String(k.auth).slice(0, 100), lang: ['zh', 'en', 'ms'].includes(body.lang) ? body.lang : 'zh', ts: Date.now() });
    return json({ ok: true });
  }
  if (path === 'push/unsubscribe') {
    const ep = String(body.endpoint || ''); if (ep) await s.del('pushsubs', (await sha(ep + (body.admin ? ADMIN_SUB : ''))).slice(0, 32));
    return json({ ok: true });
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
      s.putStmt('members', phone, { name, phone, tier: 'Silver', points: 0, joined: today(), self: true, pending: true, regTs: Date.now() }),
      s.putStmt('pins', phone, { hash: await sha(`vw143|${phone}|${pin}`), at: Date.now() })
    ]);
    await later(s, notifyAdmin(s, 'signup', { name, phone }));
    return json({ token: await newSession(env, phone, false), name, pending: true });
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
    if (((await s.get('members', who.phone)) || {}).pending) return fail(PENDING_MSG, 'pending');
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
    if (m.pending) return fail(PENDING_MSG, 'pending');
    const base = { phone: m.id, name: m.name, status: 'pending', ts: Date.now() };
    if (body.type === 'redeem') {
      const r = await s.get('rewards', body.rewardId);
      if (!r || r.active === false) return fail('这个礼物已下架');
      if (r.stock != null && r.stock <= 0) return fail('这个礼物已兑完');
      const avail = (await memberTotal(s, m.id)) - (await pendingRedeem(s, m.id));
      if (avail < r.points) return fail('积分不足');
      await s.put('requests', uid(), { ...base, type: 'redeem', rewardId: r.id, title: r.name, points: +r.points });
      await later(s, notifyAdmin(s, 'redeem', { name: m.name, title: r.name }));
      return json({ ok: true });
    }
    if (body.type === 'earn') {
      const t = await s.get('tasks', body.taskId);
      if (!t || t.active === false || t.auto) return fail('这个任务不能申请');
      // Optional per-task rules: a daily cap, and a list of choices (e.g. breakfast / lunch) each allowed once a day.
      const opts = taskOpts(t), opt = String(body.opt || '').trim(), cap = Math.max(0, parseInt(t.daily, 10) || 0);
      if (opts.length && !opts.includes(opt)) return fail('请先选择一项', 'need_opt');
      if (cap || opts.length) {
        const d = today();
        const mine = (await s.where('requests', 'phone', m.id)).filter(r => r.type === 'earn' && r.taskId === t.id && r.status !== 'rejected' && dayOf(r.ts) === d);
        if (cap && mine.length >= cap) return fail(`这个任务每天最多申请 ${cap} 次，今天已经满了`, 'daily_full');
        if (opt && mine.some(r => r.opt === opt)) return fail(`今天的「${opt}」已经申请了`, 'opt_done');
      }
      await s.put('requests', uid(), { ...base, type: 'earn', taskId: t.id, opt: opt || null, title: t.name + (opt ? ' · ' + opt : '') + (t.en ? ' ' + t.en : ''), points: +t.points, note: String(body.note || '').slice(0, 300) });
      await later(s, notifyAdmin(s, 'earn', { name: m.name, title: t.name }));
      return json({ ok: true });
    }
    if (body.type === 'renew') {
      const rq = await s.where('requests', 'phone', m.id);
      if (rq.some(r => r.type === 'renew' && r.status === 'pending')) return fail('你已经有一个续卡申请在审核中');
      const total = Math.max(1, Math.min(200, parseInt(body.total, 10) || 11));
      const name = String(body.cardName || 'NCP').slice(0, 60);
      await s.put('requests', uid(), { ...base, type: 'renew', title: name, cardName: name, kind: ['10+1', '30', 'daily'].includes(body.kind) ? body.kind : null, total, points: 0 });
      await later(s, notifyAdmin(s, 'renew', { name: m.name, title: name }));
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

