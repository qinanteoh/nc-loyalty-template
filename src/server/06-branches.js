
/* ---------------- branches & staff ----------------
   'hq' is the original shop: every record without a branch belongs to it, so old data needs no change.
   Branch docs (col 'branches'): { name, parent, created, by }. A branch's look, QR and home page live in
   settings 'home' (hq) or 'b:<id>'.
   Staff (col 'staff', id = phone): { name, phone, branch, role: 'manager' | 'operator', hash }.
   The shop's original ADMIN_PASSWORD signs in as the head-office owner (a manager of hq).
   Staff see their own branch and every branch below it, and change only their own branch.
   A member belongs to one branch (members.branch); their cards, check-ins, requests, points and
   wellness form follow the member. */
const HQ = 'hq';
const bOf = x => (x && x.branch) || HQ;
const okBranchId = b => typeof b === 'string' && /^[a-z0-9]{4,30}$/.test(b);
const settingsId = b => b === HQ ? 'home' : 'b:' + b;
async function settingsOf(s, b) { return (await s.get('settings', settingsId(b))) || {}; }
async function branchList(s) {
  const list = (await s.all('branches')).filter(b => b.id !== HQ);
  return [{ id: HQ, parent: null }].concat(list);
}
// A branch and every branch under it (children, their children, ...).
function subtree(list, root) {
  const out = [root];
  for (let i = 0; i < out.length; i++) for (const b of list) if (b.parent === out[i] && !out.includes(b.id)) out.push(b.id);
  return out;
}
const adminSubKey = b => b === HQ ? ADMIN_SUB : ADMIN_SUB + ':' + b;
const staffHash = (phone, pw) => sha(`staff|${phone}|${pw}`);
const OWNER = { id: 'owner', name: '总店老板', branch: HQ, role: 'manager', owner: true };
async function staffOf(s, who) {
  if (!who.admin) return null;
  if (!who.adminId) return OWNER;
  const st = await s.get('staff', who.adminId);
  return st ? { id: st.id, name: st.name, phone: st.id, branch: st.branch, role: st.role === 'operator' ? 'operator' : 'manager' } : null;
}
// Check-in QR: hq keeps its old code (printed posters stay valid); other branches add "-<branch id>".
function qrFor(st, b, date) { const c = qrCodeFor(st, date); return c && b !== HQ ? c + '-' + b : c; }
const codeBranch = code => { const i = String(code || '').indexOf('-'); return i > 0 ? String(code).slice(i + 1) : HQ; };
// Phones of this branch's members that accept notifications, in a stable order (for sending in batches).
async function memberSubs(s, b) {
  const ph = new Set((await s.all('members')).filter(m => bOf(m) === b).map(m => m.id));
  return (await s.all('pushsubs')).filter(x => ph.has(x.phone)).sort((a, c) => a.id < c.id ? -1 : 1);
}
/* What a branch can set itself or take from its upline ("follow"; a new branch follows everything).
   rewards / tasks: the list shown; notices: members also see the upline's notices; tiers / cards: rule and card types. */
const FOLLOW_KEYS = ['rewards', 'tasks', 'notices', 'tiers', 'cards'];
const follows = (st, k) => !(st.follow && st.follow[k] === false);
async function branchCtx(s) {
  const list = await branchList(s), all = await s.all('settings');
  const stOf = b => all.find(x => x.id === settingsId(b)) || {};
  const parentOf = b => (list.find(x => x.id === b) || {}).parent || null;
  // The branch whose list / rule this branch uses for k (itself when it sets its own).
  const src = (b, k) => { let cur = b; const seen = new Set(); while (cur !== HQ && !seen.has(cur) && follows(stOf(cur), k)) { seen.add(cur); const p = parentOf(cur); if (!p) break; cur = p; } return cur; };
  // Branch plus the uplines whose notices it shows.
  const chain = (b, k) => { const out = [b]; let cur = b; while (cur !== HQ && follows(stOf(cur), k)) { const p = parentOf(cur); if (!p || out.includes(p)) break; out.push(p); cur = p; } return out; };
  const rule = b => cleanRule(stOf(src(b, 'tiers')).tierRule);
  const cardTypes = b => cleanTypes(stOf(src(b, 'cards')).cardTypes);
  return { list, stOf, parentOf, src, chain, rule, cardTypes };
}
// Rules a member's or viewed branch uses, and where each setting comes from (for the back office).
function rulesFor(bc, b) {
  const follow = {};
  for (const k of FOLLOW_KEYS) { const on = b !== HQ && follows(bc.stOf(b), k), from = bc.src(b, k); follow[k] = { on, from: branchName(from, bc.stOf(from)), parent: b === HQ ? null : branchName(bc.parentOf(b), bc.stOf(bc.parentOf(b))) }; }
  return { tier: bc.rule(b), cardTypes: bc.cardTypes(b), follow };
}
function cleanRule(r) {
  if (!r) return DEFAULT_RULE;
  const n = (x, d) => { const v = parseInt(x, 10); return v >= 0 && v <= 100000 ? v : d; };
  const gold = n(r.gold, DEFAULT_RULE.gold), platinum = Math.max(gold, n(r.platinum, DEFAULT_RULE.platinum));
  const p = r.pts || {};
  return { gold, platinum, pts: { Silver: n(p.Silver, 10), Gold: n(p.Gold, 20), Platinum: n(p.Platinum, 30) } };
}
function cleanTypes(list) {
  if (!Array.isArray(list) || !list.length) return DEFAULT_CARD_TYPES;
  return list.slice(0, 20).map(t => {
    const mode = ['count', 'unl', 'daily'].includes(t.mode) ? t.mode : 'count';
    const total = mode === 'count' ? Math.max(1, Math.min(500, parseInt(t.total, 10) || 1)) : null;
    const days = Math.max(0, Math.min(3650, parseInt(t.days, 10) || 0)) || null;
    const kind = mode === 'daily' ? 'daily' : mode === 'unl' ? 'unl' : (['10+1', '30'].includes(t.kind) ? t.kind : 'other');
    return { id: String(t.id || uid()).slice(0, 20), n: String(t.n || '卡').trim().slice(0, 40) || '卡', mode, total, days, kind, tw: Math.max(0, Math.min(100, +t.tw || 0)) };
  });
}
const branchName = (b, st) => brandOf(st).name || (b === HQ ? '总店' : '分店');
