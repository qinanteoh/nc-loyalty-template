async function setCourseOpen(s, m, open) {
  const cur = (await s.get('health', m.id)) || { scans: [], done: {}, profile: {} };
  const { id: _drop, ...h } = cur;
  await s.put('health', m.id, { ...h, name: m.name, open, updated: Date.now() });
}
async function doCheckin(s, card, force, by) {
  const ins = (await s.where('checkins', 'cardId', card.id)).sort((a, b) => a.ts - b.ts);
  // Daily Pass is given once and never runs out; each self check-in waits for the shop's approval before points are added.
  const daily = kindOf(card) === 'daily';
  const total = +card.total || 0, left = daily ? null : total - ins.length;
  if (!daily && left <= 0) return fail('这张卡已经用完了，请申请续卡', 'used_up');
  const t = parseD(today()), st = parseD(card.start);
  if (t < st) return fail(`这张卡 ${card.start} 才开始`, 'not_started');
  if ((+card.days || 0) > 0 && t > st + (card.days - 1) * DAY) return fail('这张卡已经过期了', 'expired');
  const last = ins[ins.length - 1];
  if (!force && last && Date.now() - last.ts < RECENT_MS) return json({ recent: true, left });
  const m = await s.get('members', card.phone);
  const points = DAILY_PTS[await tierOf(s, m)] || 10;
  const cid = `${card.id}_${today()}_${uid()}`;
  if (daily && by !== 'staff') {
    await s.put('checkins', cid, { cardId: card.id, phone: card.phone, date: today(), ts: Date.now(), by, points: 0, due: points, pend: true });
    await s.put('requests', uid(), { phone: card.phone, name: m ? m.name : '', status: 'pending', ts: Date.now(), type: 'checkin', checkinId: cid, cardId: card.id, title: 'Daily Pass 打卡', points });
    await later(s, notifyAdmin(s, 'checkin', { name: m ? m.name : card.phone }));
    return json({ ok: true, pending: true, points, left: null });
  }
  await s.put('checkins', cid, { cardId: card.id, phone: card.phone, date: today(), ts: Date.now(), by, points });
  if (daily) return json({ ok: true, points, left: null });
  const nowLeft = left - 1;
  if (nowLeft === 2 || nowLeft === 0) {
    const lab = { zh: cardLabel(card, 'zh'), en: cardLabel(card, 'en'), ms: cardLabel(card, 'ms') };
    await later(s, notifyMember(s, card.phone, nowLeft ? 'low' : 'used', { card: lab, left: nowLeft }));
  }
  return json({ ok: true, points, left: nowLeft });
}

// Service worker: shows push notifications and opens the app when one is tapped.
const SW_JS = `self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '🔔', { body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag, image: d.image || undefined, data: { url: d.url || '/#notices' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/#notices';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ type: url.indexOf('#admin') >= 0 ? 'open-admin' : 'open-notices' }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});`;

function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

