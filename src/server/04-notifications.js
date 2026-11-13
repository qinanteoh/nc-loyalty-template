/* ---------------- notifications ---------------- */
__PUSHLIB__
const PUSH_BATCH = 10;
const cardLabel = (c, lang) => {
  const k = kindOf(c);
  if (k === '30') return { zh: '30 天 Program', en: '30-Day Program', ms: 'Program 30 Hari' }[lang];
  if (k === '10+1') return '10+1 Program';
  if (k === 'daily') return 'Daily Pass';
  return c.name || 'NCP';
};
// Text for automatic notices in the three languages.
function noticeText(kind, v) {
  v = { title: '', points: 0, left: 0, ...v, card: { zh: '', en: '', ms: '', ...(v && v.card) } };
  const T = {
    redeem: { zh: ['兑换已通过 🎁', `你的「${v.title}」兑换已通过，请到店领取礼物。`], en: ['Redemption approved 🎁', `Your “${v.title}” redemption is approved. Please collect your gift at the club.`], ms: ['Penebusan diluluskan 🎁', `Penebusan “${v.title}” anda telah diluluskan. Sila ambil hadiah di kelab.`] },
    earn: { zh: ['积分已到账 ⭐', `「${v.title}」+${v.points} 分已加入你的账户。`], en: ['Points added ⭐', `“${v.title}” +${v.points} points have been added to your account.`], ms: ['Mata ditambah ⭐', `“${v.title}” +${v.points} mata telah ditambah ke akaun anda.`] },
    renew: { zh: ['新卡已开通 ✅', `你的 ${v.card.zh} 已开通，可以继续扫码打卡了。`], en: ['New card opened ✅', `Your ${v.card.en} is ready. You can check in again.`], ms: ['Kad baharu dibuka ✅', `${v.card.ms} anda sudah dibuka. Anda boleh daftar masuk semula.`] },
    reject: { zh: ['申请未通过', `你的「${v.title}」申请未通过，有疑问请联系教练。`], en: ['Request not approved', `Your request for “${v.title}” was not approved. Please ask your coach if you have questions.`], ms: ['Permohonan tidak diluluskan', `Permohonan “${v.title}” anda tidak diluluskan. Sila tanya jurulatih jika ada soalan.`] },
    welcome: { zh: ['会员资料已核准 🎉', '欢迎加入！现在可以开始打卡、赚分和兑换礼物了。'], en: ['Your membership is approved 🎉', 'Welcome! You can now check in, earn points and redeem gifts.'], ms: ['Keahlian anda diluluskan 🎉', 'Selamat datang! Anda kini boleh daftar masuk, kumpul mata dan tebus hadiah.'] },
    low: { zh: ['NCP 卡快用完了', `你的 ${v.card.zh} 只剩 ${v.left} 次，记得续卡哦！`], en: ['Your NCP card is running low', `Your ${v.card.en} has only ${v.left} visits left. Remember to renew!`], ms: ['Kad NCP hampir habis', `${v.card.ms} anda tinggal ${v.left} lawatan sahaja. Jangan lupa perbaharui!`] },
    used: { zh: ['NCP 卡已用完', `你的 ${v.card.zh} 已经用完，打开 App 申请续卡。`], en: ['Your NCP card is used up', `Your ${v.card.en} is used up. Open the app to renew.`], ms: ['Kad NCP sudah habis', `${v.card.ms} anda sudah habis. Buka app untuk perbaharui.`] }
  }[kind];
  const pick = l => ({ title: T[l][0], body: T[l][1] });
  return { zh: pick('zh'), en: pick('en'), ms: pick('ms') };
}
const msgFor = (n, lang) => {
  const t = (lang !== 'zh' && n[lang] && (n[lang].title || n[lang].body)) ? n[lang] : n;
  const m = { title: t.title || n.title, body: t.body || n.body, url: '/#notices', tag: 'n-' + n.id };
  if (n.photo) m.image = '/img/' + n.photo;
  return m;
};
async function pushTo(s, subs, notice) {
  if (!subs.length) return { sent: 0, failed: 0, gone: 0 };
  const vapid = await s.get('meta', 'vapid'); if (!vapid) return { sent: 0, failed: subs.length, gone: 0 };
  const sender = await makeSenderKey(), cache = {};
  let sent = 0, failed = 0, gone = 0;
  for (const sub of subs) {
    const r = await sendPush(sub, msgFor(notice, sub.lang || 'zh'), vapid, s.origin, sender, cache);
    if (r === 'ok') sent++; else { failed++; if (r === 'gone') { gone++; await s.del('pushsubs', sub.id); } }
  }
  return { sent, failed, gone };
}
// Tells the shop's own phones that something is waiting for approval. Never throws.
const ADMIN_SUB = '#admin';
const PENDING_MSG = '你的会员资料还在等待店里核准，核准后就可以使用';
const ADMIN_TEXT = {
  signup: { zh: ['新会员等待核准', v => `${v.name}（${v.phone}）刚注册，请到后台核准。`], en: ['New member waiting for approval', v => `${v.name} (${v.phone}) just signed up. Please approve in the admin page.`], ms: ['Ahli baharu menunggu kelulusan', v => `${v.name} (${v.phone}) baru mendaftar. Sila luluskan di halaman admin.`] },
  redeem: { zh: ['兑换申请等待核准', v => `${v.name} 想兑换：${v.title}`], en: ['Redemption waiting for approval', v => `${v.name} wants to redeem: ${v.title}`], ms: ['Penebusan menunggu kelulusan', v => `${v.name} mahu menebus: ${v.title}`] },
  earn: { zh: ['赚分申请等待核准', v => `${v.name} 申请赚分：${v.title}`], en: ['Points request waiting for approval', v => `${v.name} requested points: ${v.title}`], ms: ['Permohonan mata menunggu kelulusan', v => `${v.name} memohon mata: ${v.title}`] },
  checkin: { zh: ['Daily Pass 打卡等待核准', v => `${v.name} 用 Daily Pass 打卡了，请到后台核准加分。`], en: ['Daily Pass check-in waiting', v => `${v.name} checked in with a Daily Pass. Please approve the points.`], ms: ['Daftar masuk Daily Pass menunggu', v => `${v.name} daftar masuk dengan Daily Pass. Sila luluskan mata.`] },
  renew: { zh: ['续卡申请等待核准', v => `${v.name} 申请续卡：${v.title}`], en: ['Card renewal waiting for approval', v => `${v.name} applied to renew: ${v.title}`], ms: ['Pembaharuan kad menunggu kelulusan', v => `${v.name} memohon pembaharuan: ${v.title}`] }
};
async function notifyAdmin(s, kind, v) {
  try {
    const subs = (await s.where('pushsubs', 'phone', ADMIN_SUB)).slice(0, 10); if (!subs.length) return;
    const vapid = await s.get('meta', 'vapid'); if (!vapid) return;
    const sender = await makeSenderKey(), cache = {}, T = ADMIN_TEXT[kind];
    for (const sub of subs) {
      const t = T[sub.lang] || T.zh;
      const r = await sendPush(sub, { title: t[0], body: t[1](v), url: '/#admin', tag: 'adm-' + kind + '-' + Date.now() }, vapid, s.origin, sender, cache);
      if (r === 'gone') await s.del('pushsubs', sub.id);
    }
  } catch (e) {}
}
// Saves an in-app notice for one member and sends it to their phones. Never throws.
async function notifyMember(s, phone, kind, vars) {
  try {
    const t = noticeText(kind, vars), id = uid();
    const notice = { id, phone, kind, title: t.zh.title, body: t.zh.body, en: t.en, ms: t.ms, ts: Date.now() };
    await s.put('notices', id, notice);
    await pushTo(s, (await s.where('pushsubs', 'phone', phone)).slice(0, 5), notice);
  } catch (e) { /* a failed notification must not undo the action */ }
}
const later = (s, p) => { if (s.ctx && s.ctx.waitUntil) s.ctx.waitUntil(p); else return p; };
async function noticesFor(s, phone) {
  const all = await s.where('notices', 'phone', '*');
  const mine = phone ? await s.where('notices', 'phone', phone) : [];
  return all.concat(mine).sort((a, b) => b.ts - a.ts).slice(0, 40);
}

