
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
const branchName = (b, st) => brandOf(st).name || (b === HQ ? '总店' : '分店');
