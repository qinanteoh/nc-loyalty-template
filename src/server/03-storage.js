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
  if (!(await s.get('meta', 'vapid'))) await s.put('meta', 'vapid', await makeVapidKeys());
}

