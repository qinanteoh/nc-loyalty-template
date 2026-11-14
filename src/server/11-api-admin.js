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
      if (r.type === 'checkin') {
        const ck = await s.get('checkins', r.checkinId);
        if (ck) { const { pend, due, ...rest } = ck; await s.put('checkins', ck.id, { ...rest, points: +r.points || 0, approvedAt: Date.now() }); }
      } else if (r.type === 'course') {
        await setCourseOpen(s, m, true);
      } else if (r.type === 'renew') {
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
      const card = { zh: cardLabel({ kind: r.kind, name: r.cardName }, 'zh'), en: cardLabel({ kind: r.kind, name: r.cardName }, 'en'), ms: cardLabel({ kind: r.kind, name: r.cardName }, 'ms') };
      await later(s, notifyMember(s, r.phone, r.type === 'renew' ? 'renew' : r.type === 'course' ? 'course' : r.type === 'redeem' ? 'redeem' : 'earn', { title: r.title, points: r.points, card }));
      return json({ ok: true });
    }
    // Coach opens or closes days after COURSE_FREE for one member (also settles a waiting request).
    if (act === 'courseOpen') {
      const m = await s.get('members', String(body.phone || '')); if (!m) return fail('找不到这位会员');
      const open = body.open === true;
      await setCourseOpen(s, m, open);
      for (const r of (await s.where('requests', 'phone', m.id)).filter(r => r.type === 'course' && r.status === 'pending'))
        await s.put('requests', r.id, { ...r, status: open ? 'approved' : 'rejected', doneAt: Date.now() });
      if (open) await later(s, notifyMember(s, m.id, 'course', {}));
      return json({ ok: true });
    }
    if (act === 'approveMember') {
      const m = await s.get('members', cleanPhone(body.phone)); if (!m) return fail('找不到这位会员');
      if (!m.pending) return fail('这位会员已经核准了');
      const { pending, ...rest } = m;
      await s.put('members', m.id, { ...rest, approvedAt: Date.now() });
      await later(s, notifyMember(s, m.id, 'welcome', {}));
      return json({ ok: true });
    }
    if (act === 'rejectMember') {
      const p = cleanPhone(body.phone); const m = await s.get('members', p); if (!m) return fail('找不到这位会员');
      if (!m.pending) return fail('这位会员已经核准了，不能在这里拒绝');
      await s.del('members', p); await s.del('pins', p); await s.del('pinfail', p); await s.del('health', p);
      await env.DB.prepare('DELETE FROM sessions WHERE phone = ? AND admin = 0').bind(p).run();
      await env.DB.prepare("DELETE FROM docs WHERE col = 'pushsubs' AND json_extract(data, '$.phone') = ?").bind(p).run();
      return json({ ok: true });
    }
    if (act === 'reject') {
      const r = await s.get('requests', body.id);
      if (!r || r.status !== 'pending') return fail('这个申请已经处理过了');
      await s.put('requests', r.id, { ...r, status: 'rejected', doneAt: Date.now() });
      if (r.type === 'checkin' && r.checkinId) await s.del('checkins', r.checkinId);
      await later(s, notifyMember(s, r.phone, 'reject', { title: r.type === 'renew' ? (r.cardName || r.title) : r.title }));
      return json({ ok: true });
    }
    if (act === 'notice') {
      const clip = (x, n) => String(x || '').trim().slice(0, n);
      const n = { phone: '*', kind: 'broadcast', title: clip(body.title, 80), body: clip(body.body, 600), en: { title: clip(body.en_title, 80), body: clip(body.en_body, 600) }, ms: { title: clip(body.ms_title, 80), body: clip(body.ms_body, 600) }, photo: /^[A-Za-z0-9_-]{1,40}$/.test(String(body.photo || '')) ? String(body.photo) : null, ts: Date.now() };
      if (!n.title && !n.body && !n.photo) return fail('请输入公告内容');
      if (!n.title) n.title = n.body ? n.body.slice(0, 30) : '📷';
      const id = uid(); await s.put('notices', id, n);
      const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM docs WHERE col = 'pushsubs' AND json_extract(data, '$.phone') != '#admin'").first();
      return json({ ok: true, id, total: c ? c.n : 0 });
    }
    if (act === 'pushbatch') {
      const n = await s.get('notices', body.id); if (!n) return fail('找不到这则公告');
      const off = Math.max(0, parseInt(body.offset, 10) || 0);
      const rows = await env.DB.prepare("SELECT id, data FROM docs WHERE col = 'pushsubs' AND json_extract(data, '$.phone') != '#admin' ORDER BY id LIMIT ? OFFSET ?").bind(PUSH_BATCH, off).all();
      const subs = rows.results.map(x => ({ id: x.id, ...JSON.parse(x.data) }));
      const r = await pushTo(s, subs, n);
      return json({ ok: true, ...r, next: off + subs.length - r.gone, done: subs.length < PUSH_BATCH });
    }
    return fail('未知的操作');
  }
  return fail('找不到这个功能', 'not_found', 404);
}

