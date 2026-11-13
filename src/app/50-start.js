/* ---------- boot ---------- */
document.documentElement.lang=LANG; trWatch();
readHash(); window.addEventListener('hashchange',()=>{readHash(); render(); if(location.hash==='#admin'){ if(isAdmin){ view='admin'; render(); } else document.querySelector('[data-act="adminLogin"]')?.click(); }});
async function boot(){
  try{ await refresh();
    if(location.hash==='#admin'){ if(isAdmin){ view='admin'; render(); } else document.querySelector('[data-act="adminLogin"]')?.click(); }
    if(location.hash==='#notices'){ try{history.replaceState(null,'',location.pathname+location.search)}catch(_){} openNotices(); } }
  catch(e){ document.getElementById('app').innerHTML=`<div class="load"><div style="font-family:var(--f-display);font-size:26px;color:var(--wine)">${nt(brand().name)}</div><div>${esc(e.message)}</div><button class="btn" onclick="boot()">再试一次</button></div>`; }
}
if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message',e=>{ if(e.data&&e.data.type==='open-notices') refresh().then(openNotices).catch(()=>{}); if(e.data&&e.data.type==='open-admin') refresh().then(()=>{ if(isAdmin){ view='admin'; adminTab='requests'; render(); } }).catch(()=>{}); });
boot();
setInterval(()=>{ if(document.visibilityState==='visible'&&!document.getElementById('layer').innerHTML&&!document.activeElement?.matches('input,textarea,select')) refresh().catch(()=>{}); },30000);
