export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (!ready) ready = init(env).catch(e => { ready = null; throw e; });
      await ready;
      const im = url.pathname.match(/^\/(?:icon-(\d+)\.png|apple-touch-icon(?:-precomposed)?\.png|favicon\.ico)$/);
      // ?b=<branch> gives that branch's logo / home-screen name (members see their own shop).
      const qb = url.searchParams.get('b'), ib = okBranchId(qb) ? qb : HQ;
      if (im) {
        const st = await settingsOf(new Store(env.DB), ib);
        if (st.logo) {
          const r = await env.DB.prepare('SELECT type, data FROM photos WHERE id = ?').bind(st.logo).first();
          if (r) return new Response(b64ToBytes(r.data), { headers: { 'content-type': r.type, 'cache-control': 'public, max-age=3600' } });
        }
        const size = im[1] && ICONS[im[1]] ? im[1] : (url.pathname.startsWith('/apple') ? '180' : '64');
        return new Response(b64ToBytes(ICONS[size]), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' } });
      }
      if (url.pathname === '/manifest.webmanifest') {
        const st = await settingsOf(new Store(env.DB), ib);
        return new Response(manifestFor(st, ib), { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'no-cache' } });
      }
      if (url.pathname.startsWith('/img/')) {
        const id = url.pathname.slice(5);
        const r = await loadPhoto(env, id);
        if (!r) return new Response('Not found', { status: 404 });
        return new Response(r.body, { headers: { 'content-type': r.type, 'cache-control': 'public, max-age=31536000, immutable' } });
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(req, env, url.pathname.slice(5), ctx);
      // 21-day course. Apps set up with static files serve it themselves; older partner apps that only
      // replaced worker.js fetch the same files from the public template repo and keep them in Cloudflare's cache.
      if (url.pathname === '/course' || url.pathname.startsWith('/course/')) {
        if (url.pathname === '/course') return Response.redirect(url.origin + '/course/', 301);
        if (!(await courseAllowed(env, req))) {
          if (/\.(jpg|png)$/.test(url.pathname)) return new Response('Members only', { status: 403 });
          return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Members only</title><body style="font-family:system-ui,sans-serif;padding:32px 20px;text-align:center;line-height:1.6"><p>这是会员专属内容。请先注册，店里核准后就可以看。<br>Members only. Please register; you can read this once the shop approves you.</p><p><a href="/#join" target="_top" style="font-size:18px">注册 / 登入 · Register / Log in</a></p></body>', { status: 403, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
        }
        if (env.ASSETS) { const r = await env.ASSETS.fetch(req); if (r.status !== 404) return r; }
        const rel = url.pathname.slice('/course/'.length) || 'index.html';
        if (!/^(index\.html|fig\/[a-z0-9_]+\.jpg)$/.test(rel)) return new Response('Not found', { status: 404 });
        const cache = caches.default, key = new Request(url.origin + '/course/' + rel);
        let hit = await cache.match(key); if (hit) return hit;
        const up = await fetch(COURSE_SRC + rel);
        if (!up.ok) return new Response('Course not available', { status: 502 });
        const res = new Response(up.body, { headers: { 'content-type': rel.endsWith('.html') ? 'text/html; charset=utf-8' : 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
        ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      }
      if (url.pathname === '/sw.js') return new Response(SW_JS, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-cache' } });
      const b = brandOf((await new Store(env.DB).get('settings', 'home')) || {});
      const page = HTML.replaceAll('{{NAME}}', escHtml(b.name)).replaceAll('{{SUB}}', escHtml(b.sub)).replaceAll('{{SHORT}}', escHtml(b.short));
      return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
    } catch (e) {
      if (String(e && e.message) === 'NO_DB') return fail('资料库还没连接：请在 Worker 设定里加上 D1 绑定，变量名称填 DB', 'no_db', 500);
      return fail('系统出错：' + (e && e.message || e), 'server', 500);
    }
  }
};
