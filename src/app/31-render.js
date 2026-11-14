/* ---------- render ---------- */
function render(){
  const app=document.getElementById('app');
  const top=`<header class="top"><div class="brand"><img class="logo" src="/icon-192.png?v=${esc((S.settings&&S.settings.logo)||'d')}" alt="" width="40" height="40"><div><b>${nt(brand().name)}</b><small>${esc(brand().sub)}</small></div></div><div style="display:flex;gap:8px;align-items:center">${isAdmin?'<span class="demo">管理员</span>':''}<button class="bellbtn" data-act="notices" aria-label="通知">${ic('bell',20)}${unreadN()?`<span class="dot">${unreadN()>9?'9+':unreadN()}</span>`:''}</button><button class="langbtn" data-act="lang" aria-label="语言 Language"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg><span translate="no">${({zh:'中文',en:'EN',ms:'BM'})[LANG]}</span></button></div></header>`;
  if(!loaded) return;
  if(view==='admin'&&!isAdmin) view='home';
  const v=({home:vHome,earn:vEarn,shop:vShop,me:vMe,admin:vAdmin,scan:vScan,course:vCourse,health:vHealth}[view]||vHome)();
  const back=view!=='home'?`<button class="backbar" data-act="back">${ic('back',20)} 返回上一页</button>`:'';
  const y=window.scrollY; app.innerHTML=top+back+v; window.scrollTo(0,y);
  const tabs=[['home','home','首页'],['earn','bolt','赚分'],['shop','gift','兑换'],['me','user','我的']].concat(isAdmin?[['admin','cog','管理']]:[]);
  const nav=document.getElementById('tabs'); nav.hidden=false;
  const tb=([k,i,l])=>`<button class="tab ${view===k?'on':''}" data-act="go" data-v="${k}">${ic(i,22)}${l}</button>`;
  nav.innerHTML=`<div class="tabs-in">${tabs.slice(0,2).map(tb).join('')}<button class="tab scan" data-act="scanQR" aria-label="扫码打卡"><span class="bub">${ic('qr',28)}</span>扫码打卡</button>${tabs.slice(2).map(tb).join('')}</div>`;
  const cf=document.getElementById('cframe');
  if(view!=='course') courseAdmin=false;
  if(view==='course'&&(me()||courseAdmin)){ pushGate(); const want=courseAdmin?'/course/?admin=1':'/course/'; if(cf.getAttribute('src')!==want) cf.setAttribute('src',want); window.scrollTo(0,0); const bb=document.querySelector('.backbar'); const t=Math.round(bb?bb.getBoundingClientRect().bottom+6:0); cf.style.top=t+'px'; cf.style.height='calc(100% - '+(t+nav.offsetHeight)+'px)'; cf.hidden=false; } else cf.hidden=true;
  if(reSheet) reSheet();
  const jb=document.getElementById('joinbox'); if(jb&&window.QRCode){ new QRCode(jb,{text:joinLink(),width:440,height:440,colorDark:'#561226',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M}); }
  const qb=document.getElementById('qrbox'); if(qb&&qrLink()&&window.QRCode){ new QRCode(qb,{text:qrLink(),width:440,height:440,colorDark:'#561226',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M}); }
  const rd=document.getElementById('repDate'); if(rd) rd.onchange=e=>{ if(e.target.value){ reportDate=e.target.value; render(); } };
  const qm=document.getElementById('qm'); if(qm) qm.onchange=e=>run(()=>putSettings({...S.settings,qrMode:e.target.value}),'打卡方式已更新');
  if(view==='scan') setTimeout(autoScanCheckin,0);
  for(const id of ['mq','aq']){ const el=document.getElementById(id); if(!el) continue;
    const go=()=>{ if(id==='mq') memberQ=el.value; else adminQ[adminTab]=el.value; const p=el.selectionStart; render(); const n=document.getElementById(id); if(n){ n.focus(); try{n.setSelectionRange(p,p);}catch(_){} } };
    el.oninput=e=>{ if(!e.isComposing) go(); }; el.addEventListener('compositionend',go); }
  const lf=document.getElementById('lfile'); if(lf) lf.onchange=async e=>{const f=e.target.files[0]; if(!f) return; toast('正在上传 Logo…'); try{ const data=await squarePng(f,512); const r=await api('admin/photo',{data}); await putSettings({...S.settings,logo:r.id}); await refresh(); toast('Logo 已更新'); }catch(err){ toast('上传失败：'+(err.message||'请稍后再试')); } };
  document.title=brand().name;
  const nf=document.getElementById('nfile'); if(nf) nf.onchange=async e=>{const f=e.target.files[0]; if(!f) return; const keep=['n_t','n_b','n_et','n_eb','n_mt','n_mb'].map(x=>[x,(document.getElementById(x)||{}).value]); toast('正在上传照片…'); try{ noticePhoto=(await uploadPhoto(f)).photo; render(); setTimeout(()=>keep.forEach(([x,v])=>{const el=document.getElementById(x); if(el&&v!=null) el.value=v;}),0); toast('照片已加上'); }catch(err){ toast('上传失败：'+(err.message||'请稍后再试')); } };
  const hf=document.getElementById('hfile'); if(hf) hf.onchange=async e=>{const f=e.target.files[0]; if(!f) return; toast('正在上传照片…'); try{const p=await uploadPhoto(f); await putSettings({...S.settings,...p}); toast('横幅照片已更新');}catch(err){toast('上传失败：'+(err.message||'请稍后再试'))}};
}

