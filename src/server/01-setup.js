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
const manifestFor = (st, b0) => { const b = brandOf(st), q = b0 && b0 !== 'hq' ? '?b=' + b0 : ''; return JSON.stringify({
  name: b.name, short_name: b.short, start_url: '/', display: 'standalone',
  background_color: '#FBF5F3', theme_color: '#7A1E3A', lang: 'zh',
  icons: [{ src: '/icon-192.png' + q, sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png' + q, sizes: '512x512', type: 'image/png' }]
}); };

const TZ_OFFSET_H = 8; // Malaysia / Singapore
const DAY = 864e5;
const RECENT_MS = 3 * 60e3;
const DAILY_PTS = { Silver: 10, Gold: 20, Platinum: 30 };
// Tier: a 30-day card counts as three 10+1 cards. Every card opened (paid or not) plus cards bought before the app.
// More than 9 → Gold, more than 18 → Platinum, otherwise Silver. A manual tier (tierOverride) wins.
const TIER_RULE = { gold: 9, platinum: 18 };
// 21-day course: days 1..COURSE_FREE are open to every member; later days need the coach to open them.
// Members who already read past this day before the rule keep their access unless the coach closes it.
const COURSE_FREE = 11;
const courseOpen = h => !!h && (h.open === true || (h.open !== false && Object.keys(h.done || {}).some(k => +k > COURSE_FREE)));
const kindOf = c => c.kind || (/daily/i.test(c.name || '') ? 'daily' : /30/.test(c.name || '') ? '30' : /10\s*\+\s*1/.test(c.name || '') ? '10+1' : 'other');
// Each branch can set its own tier rule and card types (or follow its upline). These are the head-office defaults.
const DEFAULT_RULE = { gold: TIER_RULE.gold, platinum: TIER_RULE.platinum, pts: { ...DAILY_PTS } };
const DEFAULT_CARD_TYPES = [
  { id: 't10', n: '10+1 Program', mode: 'count', total: 11, days: null, kind: '10+1', tw: 1 },
  { id: 't30', n: '30 天 Program', mode: 'count', total: 30, days: null, kind: '30', tw: 3 },
  { id: 'tdp', n: 'Daily Pass', mode: 'daily', total: null, days: null, kind: 'daily', tw: 0 }];
// Tier points a card adds: set on the card type; older cards count 10+1 as 1 and 30-day as 3.
const cardTW = c => c.tw != null ? (+c.tw || 0) : kindOf(c) === '10+1' ? 1 : kindOf(c) === '30' ? 3 : 0;
// Cards with no limit on check-ins: Daily Pass (each check-in approved) and 'unl' (points straight away).
const unlimited = c => kindOf(c) === 'daily' || kindOf(c) === 'unl';
async function tierOf(s, m, rule) {
  if (!m) return 'Silver';
  rule = rule || DEFAULT_RULE;
  if (m.tierOverride && rule.pts[m.tierOverride] != null) return m.tierOverride;
  const cs = await s.where('cards', 'phone', m.id);
  const score = (+m.prior10 || 0) + 3 * (+m.prior30 || 0) + cs.reduce((a, c) => a + cardTW(c), 0);
  return score > rule.platinum ? 'Platinum' : score > rule.gold ? 'Gold' : 'Silver';
}
const ADMIN_COLS = ['rewards', 'tasks', 'members', 'cards', 'checkins', 'requests', 'ledger', 'notices'];
const CUSTOMER_DAYS = 365, ADMIN_DAYS = 365; // stays signed in; renewed on every visit

