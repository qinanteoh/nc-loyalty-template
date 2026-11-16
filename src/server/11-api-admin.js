  if (path.startsWith('admin/')) {
    if (!who.admin) return fail('请先用管理员密码登入', 'no_admin', 401);
    const act = path.slice(6);
    if (act === 'logout') { await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(req.headers.get('x-admin')).run(); return json({ ok: true }); }
    const me_ = await staffOf(s, who);
    if (!me_) return fail('这个管理员账号已经被删除了，请重新登入', 'no_admin', 401);
    // Operators only approve and check in; everything else is for managers. Nobody changes another branch.
    const OPERATOR_ACTS = ['approve', 'reject', 'approveMember', 'rejectMember', 'checkin', 'courseOpen', 'health', 'myPassword'];
    if (me_.role !== 'manager' && !OPERATOR_ACTS.includes(act)) return fail('操作员不能做这个，请找店长', 'no_role', 403);
    const NOT_MINE = '这是别家店的资料，只有那家店的人可以改';
    const mineMember = async phone => { const m = await s.get('members', cleanPhone(phone)); if (!m) throw new Error('找不到这位会员'); if (bOf(m) !== me_.branch) throw new Error(NOT_MINE); return m; };
    try {
    if (act === 'put' || act === 'patch' || act === 'del') {
      if (!ADMIN_COLS.includes(body.col)) return fail('不允许的资料类型');
      const col = body.col, id = String(body.id || uid());
      const old = await s.get(col, id);
      const data = { ...(body.data || {}) }; delete data.branch;
      if (col === 'rewards' || col === 'tasks') {
        if (me_.branch !== HQ) return fail('礼物和任务现在由总店设定');
      } else if (col === 'members') {
        if (old && bOf(old) !== me_.branch) return fail(act === 'put' ? '这个号码已经是别家店的会员' : NOT_MINE);
        if (old && old.branch) data.branch = old.branch; else if (me_.branch !== HQ) data.branch = me_.branch;
      } else if (col === 'notices') {
        if (old && bOf(old) !== me_.branch) return fail(NOT_MINE);
        if (me_.branch !== HQ) data.branch = me_.branch;
      } else {
        // cards, check-ins, requests, points: they belong to the member's shop
        await mineMember((old && old.phone) || data.phone);
        if (old && data.phone && data.phone !== old.phone) await mineMember(data.phone);
      }
      if (act === 'del') { await s.del(col, id); return json({ ok: true }); }
      await s.put(col, id, { ...(act === 'patch' ? (old || {}) : {}), ...data });
      return json({ ok: true, id });
    }
    if (act === 'settings') {
      const cur = await settingsOf(s, me_.branch), d = { ...(body.data || {}) };
      if (!d.qrKey && cur.qrKey) d.qrKey = cur.qrKey;
      await s.put('settings', settingsId(me_.branch), d);
      if (me_.branch !== HQ) { const b = await s.get('branches', me_.branch); if (b && d.brandName) await s.put('branches', b.id, { ...b, name: String(d.brandName).slice(0, 60) }); }
      return json({ ok: true });
    }
    if (act === 'myPassword') {
      if (me_.owner) return fail('总店老板的密码是 Cloudflare 里的 ADMIN_PASSWORD，请在那里改');
      const pw = String(body.password || ''); if (pw.length < 6) return fail('密码至少 6 个字');
      const st = await s.get('staff', me_.id); await s.put('staff', st.id, { ...st, hash: await staffHash(st.id, pw) });
      return json({ ok: true });
    }
    // Managers add or remove managers and operators of their own branch.
    if (act === 'staffSave') {
      const phone = cleanPhone(body.phone), name = String(body.name || '').trim().slice(0, 40), role = body.role === 'operator' ? 'operator' : 'manager', pw = String(body.password || '');
      if (phone.length < 9 || phone.length > 13) return fail('请输入正确的手机号码');
      if (!name) return fail('请输入名字');
      const old = await s.get('staff', phone);
      if (old && old.branch !== me_.branch) return fail('这个号码已经是别家店的管理员');
      if (!old && pw.length < 6) return fail('请设定至少 6 个字的密码');
      if (old && old.id === me_.id && role !== 'manager') return fail('不能把自己改成操作员');
      await s.put('staff', phone, { name, phone, branch: me_.branch, role, hash: pw ? await staffHash(phone, pw) : old.hash, created: (old && old.created) || Date.now(), by: me_.id });
      if (pw && old) await env.DB.prepare('DELETE FROM sessions WHERE phone = ? AND admin = 1').bind(phone).run();
      return json({ ok: true });
    }
    if (act === 'staffDel') {
      const st = await s.get('staff', cleanPhone(body.phone));
      if (!st || st.branch !== me_.branch) return fail(NOT_MINE);
      if (st.id === me_.id) return fail('不能删除自己');
      if (st.role === 'manager' && (await s.all('staff')).filter(x => x.branch === me_.branch && x.role !== 'operator').length <= 1 && me_.branch !== HQ) return fail('每家店最少要留一位店长');
      await s.del('staff', st.id);
      await env.DB.prepare('DELETE FROM sessions WHERE phone = ? AND admin = 1').bind(st.id).run();
      return json({ ok: true });
    }
    // A manager opens a branch directly under their own, with its first manager.
    if (act === 'branchAdd') {
      const name = String(body.name || '').trim().slice(0, 60), phone = cleanPhone(body.phone), mname = String(body.mname || '').trim().slice(0, 40), pw = String(body.password || '');
      if (!name) return fail('请输入分店名称');
      if (phone.length < 9 || phone.length > 13) return fail('请输入店长的手机号码');
      if (!mname) return fail('请输入店长名字');
      if (pw.length < 6) return fail('请设定至少 6 个字的密码');
      if (await s.get('staff', phone)) return fail('这个号码已经是管理员了');
      const id = 'b' + uid();
      const parentSt = await settingsOf(s, me_.branch);
      await env.DB.batch([
        s.putStmt('branches', id, { name, parent: me_.branch, created: Date.now(), by: me_.id }),
        s.putStmt('settings', settingsId(id), { brandName: name, brandSub: brandOf(parentSt).sub, brandShort: name.slice(0, 12), qrKey: rid(8), qrMode: 'fixed' }),
        s.putStmt('staff', phone, { name: mname, phone, branch: id, role: 'manager', hash: await staffHash(phone, pw), created: Date.now(), by: me_.id })
      ]);
      return json({ ok: true, id });
    }
    // Move a branch (with everything under it) to sit under another branch. Only someone above both may do it.
    if (act === 'branchMove') {
      const list = await branchList(s), mine = subtree(list, me_.branch);
      const id = String(body.id || ''), to = String(body.parent || '');
      if (id === HQ || id === me_.branch || !mine.includes(id)) return fail('只能搬你下线的分店');
      if (!mine.includes(to)) return fail('只能搬到你自己或你下线的店下面');
      if (subtree(list, id).includes(to)) return fail('不能搬到它自己的下线下面');
      const b = list.find(x => x.id === id);
      if (b.parent === to) return fail('已经在那家店下面了');
      await s.put('branches', id, { ...b, parent: to, movedAt: Date.now(), movedBy: me_.id });
      return json({ ok: true });
    }
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
      await mineMember(body.phone);
      await addLedger(s, cleanPhone(body.phone), delta, String(body.reason || (delta > 0 ? '教练加分' : '教练扣分')).slice(0, 120));
      return json({ ok: true });
    }
    if (act === 'resetpin') { await mineMember(body.phone); const p = cleanPhone(body.phone); await s.del('pins', p); await s.del('pinfail', p); await env.DB.prepare('DELETE FROM sessions WHERE phone = ? AND admin = 0').bind(p).run(); return json({ ok: true }); }
    if (act === 'checkin') {
      const card = await s.get('cards', body.cardId); if (!card) return fail('找不到这张卡');
      await mineMember(card.phone);
      return doCheckin(s, card, true, 'staff');
    }
    if (act === 'approve') {
      const r = await s.get('requests', body.id);
      if (!r || r.status !== 'pending') return fail('这个申请已经处理过了');
      const m = await mineMember(r.phone);
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
      const m = await mineMember(body.phone);
      const open = body.open === true;
      await setCourseOpen(s, m, open);
      for (const r of (await s.where('requests', 'phone', m.id)).filter(r => r.type === 'course' && r.status === 'pending'))
        await s.put('requests', r.id, { ...r, status: open ? 'approved' : 'rejected', doneAt: Date.now() });
      if (open) await later(s, notifyMember(s, m.id, 'course', {}));
      return json({ ok: true });
    }
    // Coach keys in a member's wellness form (works before the member has ever logged in; they see it once they do).
    if (act === 'health') {
      const m = await mineMember(body.phone);
      const cur = (await s.get('health', m.id)) || { scans: [], done: {}, profile: {} };
      const { id: _drop, ...h } = cur;
      h.scans = Array.isArray(h.scans) ? h.scans : []; h.done = h.done || {}; h.profile = h.profile || {};
      const err = healthEdit(h, body); if (err) return fail(err);
      h.name = m.name; h.updated = Date.now();
      await s.put('health', m.id, h);
      return json({ ok: true, health: { id: m.id, ...h } });
    }
    if (act === 'approveMember') {
      const m = await mineMember(body.phone);
      if (!m.pending) return fail('这位会员已经核准了');
      const { pending, ...rest } = m;
      await s.put('members', m.id, { ...rest, approvedAt: Date.now() });
      await later(s, notifyMember(s, m.id, 'welcome', {}));
      return json({ ok: true });
    }
    if (act === 'rejectMember') {
      const p = cleanPhone(body.phone); const m = await mineMember(p);
      if (!m.pending) return fail('这位会员已经核准了，不能在这里拒绝');
      await s.del('members', p); await s.del('pins', p); await s.del('pinfail', p); await s.del('health', p);
      await env.DB.prepare('DELETE FROM sessions WHERE phone = ? AND admin = 0').bind(p).run();
      await env.DB.prepare("DELETE FROM docs WHERE col = 'pushsubs' AND json_extract(data, '$.phone') = ?").bind(p).run();
      return json({ ok: true });
    }
    if (act === 'reject') {
      const r = await s.get('requests', body.id);
      if (!r || r.status !== 'pending') return fail('这个申请已经处理过了');
      await mineMember(r.phone);
      await s.put('requests', r.id, { ...r, status: 'rejected', doneAt: Date.now() });
      if (r.type === 'checkin' && r.checkinId) await s.del('checkins', r.checkinId);
      await later(s, notifyMember(s, r.phone, 'reject', { title: r.type === 'renew' ? (r.cardName || r.title) : r.title }));
      return json({ ok: true });
    }
    if (act === 'notice') {
      const clip = (x, n) => String(x || '').trim().slice(0, n);
      const n = { phone: '*', kind: 'broadcast', ...(me_.branch !== HQ ? { branch: me_.branch } : {}), title: clip(body.title, 80), body: clip(body.body, 600), en: { title: clip(body.en_title, 80), body: clip(body.en_body, 600) }, ms: { title: clip(body.ms_title, 80), body: clip(body.ms_body, 600) }, photo: /^[A-Za-z0-9_-]{1,40}$/.test(String(body.photo || '')) ? String(body.photo) : null, ts: Date.now() };
      if (!n.title && !n.body && !n.photo) return fail('请输入公告内容');
      if (!n.title) n.title = n.body ? n.body.slice(0, 30) : '📷';
      const id = uid(); await s.put('notices', id, n);
      return json({ ok: true, id, total: (await memberSubs(s, me_.branch)).length });
    }
    if (act === 'pushbatch') {
      const n = await s.get('notices', body.id); if (!n || bOf(n) !== me_.branch) return fail('找不到这则公告');
      const off = Math.max(0, parseInt(body.offset, 10) || 0);
      const subs = (await memberSubs(s, me_.branch)).slice(off, off + PUSH_BATCH);
      const r = await pushTo(s, subs, n);
      return json({ ok: true, ...r, next: off + subs.length - r.gone, done: subs.length < PUSH_BATCH });
    }
    return fail('未知的操作');
    } catch (e) { return fail(e.message || '没有成功'); }
  }
  return fail('找不到这个功能', 'not_found', 404);
}

