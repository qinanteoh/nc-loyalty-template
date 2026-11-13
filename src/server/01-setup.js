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
const ADMIN_COLS = ['rewards', 'tasks', 'members', 'cards', 'checkins', 'requests', 'ledger', 'notices'];
const CUSTOMER_DAYS = 365, ADMIN_DAYS = 365; // stays signed in; renewed on every visit

