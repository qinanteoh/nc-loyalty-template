/* ---------- notifications ---------- */
const seenKey=()=>'vw_seen_'+(myPhone||'guest');
const seenTs=()=>+(ls.get(seenKey())||0);
const unreadN=()=>(S.feed||[]).filter(n=>n.ts>seenTs()).length;
const nTitle=n=>(LANG!=='zh'&&n[LANG]&&n[LANG].title)||n.title||'';
const nBody=n=>(LANG!=='zh'&&n[LANG]&&n[LANG].body)||n.body||'';
const nIcon=k=>({welcome:'user',redeem:'gift',earn:'star',renew:'ticket',reject:'chat',low:'history',used:'history'})[k]||'bell';
const fmtTs=ts=>{const d=new Date(ts);return dt(ts)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=()=>!!(navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches));
const pushSupported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
let PUSH_ON=false, pushLinked=null;
function pushState(){
  if(!pushSupported()) return isIOS()&&!isStandalone()?'ios':'none';
  if(Notification.permission==='denied') return 'denied';
  return PUSH_ON&&Notification.permission==='granted'?'on':'off';
}
function pushCard(compact){
  if(!myPhone) return '';
  const st=pushState();
  if(st==='none') return '';
  if(st==='on') return compact?'':`<div class="pushcard on">${ic('bell',22)}<div style="flex:1;min-width:0"><b>手机通知已开启</b><span class="sub" style="display:block">兑换结果、卡快用完、俱乐部公告会直接通知你。</span></div><button class="link sub" data-act="pushOff">关闭</button></div>`;
  if(st==='denied') return `<div class="pushcard">${ic('bell',22)}<div style="flex:1;min-width:0"><b>通知已被关闭</b><span class="sub" style="display:block">请到手机的「设定 → 通知」，允许这个 App 发通知。</span></div></div>`;
  if(st==='ios') return `<div class="pushcard">${ic('bell',22)}<div style="flex:1;min-width:0"><b>想在 iPhone 收到通知？</b><span class="sub" style="display:block">先按 Safari 下方的分享按钮 → 「加入主画面」，再从主画面打开 App，就会看到「开启手机通知」的按钮。</span></div></div>`;
  return `<div class="pushcard">${ic('bell',22)}<div style="flex:1;min-width:0"><b>开启手机通知</b><span class="sub" style="display:block">兑换结果、卡快用完、俱乐部公告会直接通知你。</span></div><button class="btn sm" data-act="pushOn">开启</button></div>`;
}
let swReg=null;
async function getReg(){ if(swReg) return swReg; swReg=await navigator.serviceWorker.register('/sw.js'); return swReg; }
async function syncPush(){
  if(!pushSupported()) return;
  try{
    const reg=await getReg(); const sub=await reg.pushManager.getSubscription();
    const on=!!sub&&Notification.permission==='granted';
    const changed=on!==PUSH_ON; PUSH_ON=on;
    const link=on&&myPhone?myPhone+'|'+LANG+'|'+sub.endpoint:null;
    if(link&&link!==pushLinked){ pushLinked=link; await api('push/subscribe',{...sub.toJSON(),lang:LANG}).catch(()=>{pushLinked=null;}); }
    if(changed) render();
  }catch(e){}
}
async function enablePush(btn){
  if(!myPhone) return toast('请先登入');
  if(btn) btn.disabled=true;
  try{
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){ toast('没有开启通知。你之后可以在手机设定里允许。'); render(); return; }
    const reg=await getReg(); await navigator.serviceWorker.ready;
    const k=await api('push/key'); if(!k.key) throw new Error('通知还没准备好');
    let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:unb64u(k.key)});
    await api('push/subscribe',{...sub.toJSON(),lang:LANG}); pushLinked=myPhone+'|'+LANG+'|'+sub.endpoint;
    PUSH_ON=true; toast('手机通知已开启'); render(); if(document.querySelector('.sheet .noticelist')) openNotices();
  }catch(e){ toast('开启通知失败：'+(e.message||'请稍后再试')); if(btn) btn.disabled=false; }
}
async function disablePush(){
  try{ const reg=await getReg(); const sub=await reg.pushManager.getSubscription(); if(sub){ await api('push/unsubscribe',{endpoint:sub.endpoint}).catch(()=>{}); await sub.unsubscribe(); } }catch(e){}
  PUSH_ON=false; pushLinked=null; toast('手机通知已关闭'); render();
}
async function unlinkPush(){ try{ if(!pushSupported()) return; const reg=await getReg(); const sub=await reg.pushManager.getSubscription(); if(sub) await api('push/unsubscribe',{endpoint:sub.endpoint}); }catch(e){} pushLinked=null; }
function unb64u(s){ s=String(s).replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; const b=atob(s); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
let ADMIN_PUSH=false;
async function syncAdminPush(){
  if(!isAdmin||!pushSupported()) { ADMIN_PUSH=false; return; }
  try{ const reg=await getReg(); const sub=await reg.pushManager.getSubscription();
    const on=!!sub&&Notification.permission==='granted'&&ls.get('vw_adminpush')===sub.endpoint;
    if(on) api('push/subscribe',{...sub.toJSON(),lang:LANG,admin:true}).catch(()=>{});
    if(on!==ADMIN_PUSH){ ADMIN_PUSH=on; render(); } }catch(e){}
}
function adminPushCard(){
  if(!pushSupported()) return isIOS()&&!isStandalone()?`<div class="pushcard">${ic('bell',22)}<div style="flex:1;min-width:0"><b>想在 iPhone 收到核准提醒？</b><span class="sub" style="display:block">先按 Safari 下方的分享按钮 → 「加入主画面」，从主画面打开后进入管理页，就可以开启。</span></div></div>`:'';
  if(Notification.permission==='denied') return `<div class="pushcard">${ic('bell',22)}<div style="flex:1;min-width:0"><b>通知已被关闭</b><span class="sub" style="display:block">请到手机的「设定 → 通知」，允许这个 App 发通知。</span></div></div>`;
  return ADMIN_PUSH?`<div class="pushcard on">${ic('bell',22)}<div style="flex:1;min-width:0"><b>这部手机会收到核准提醒</b><span class="sub" style="display:block">有新会员注册、兑换、赚分或续卡申请时，马上通知你。</span></div><button class="link sub" data-act="adminPushOff">关闭</button></div>`
    :`<div class="pushcard">${ic('bell',22)}<div style="flex:1;min-width:0"><b>开启核准提醒</b><span class="sub" style="display:block">有新会员注册或申请等待核准时，这部手机会收到通知。</span></div><button class="btn sm" data-act="adminPushOn">开启</button></div>`;
}
async function enableAdminPush(btn){
  if(btn) btn.disabled=true;
  try{ const perm=await Notification.requestPermission();
    if(perm!=='granted'){ toast('没有开启通知。你之后可以在手机设定里允许。'); render(); return; }
    const reg=await getReg(); await navigator.serviceWorker.ready;
    const k=await api('push/key'); if(!k.key) throw new Error('通知还没准备好');
    let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:unb64u(k.key)});
    await api('push/subscribe',{...sub.toJSON(),lang:LANG,admin:true}); ls.set('vw_adminpush',sub.endpoint);
    ADMIN_PUSH=true; toast('核准提醒已开启'); await refresh(); }
  catch(e){ toast('开启通知失败：'+(e.message||'请稍后再试')); if(btn) btn.disabled=false; }
}
async function disableAdminPush(){
  try{ const reg=await getReg(); const sub=await reg.pushManager.getSubscription(); if(sub) await api('push/unsubscribe',{endpoint:sub.endpoint,admin:true}); }catch(e){}
  ls.set('vw_adminpush',null); ADMIN_PUSH=false; toast('核准提醒已关闭'); await refresh().catch(()=>render());
}
const pendMembers=()=>S.members.filter(m=>m.pending).sort((a,b)=>(a.regTs||0)-(b.regTs||0));
function pendingNote(){ return `<div class="pushcard" style="background:var(--wine-soft)">${ic('history',22)}<div style="flex:1;min-width:0"><b>等待店里核准</b><span class="sub" style="display:block">你的注册已经收到了。店里核准后会通知你，然后就可以开始打卡、赚分和兑换礼物。</span></div></div>`; }
function openNotices(){
  const list=S.feed||[], seen=seenTs();
  openSheet(`<h3>通知</h3>${pushCard(true)}<div class="noticelist">${list.length?list.map(n=>`<div class="notice ${n.ts>seen?'new':''}"><span class="ic">${ic(n.kind==='broadcast'?'bell':nIcon(n.kind),20)}</span><div style="flex:1;min-width:0"><b>${nt(nTitle(n))}</b>${nBody(n)?`<div class="nb">${nt(nBody(n))}</div>`:''}${n.photo?`<img class="nimg" src="/img/${esc(n.photo)}" alt="" loading="lazy">`:''}<span class="sub">${fmtTs(n.ts)}</span></div></div>`).join(''):'<div class="empty">还没有通知。</div>'}</div>`);
  if(list.length) ls.set(seenKey(),String(Math.max(...list.map(n=>n.ts))));
  render();
}
const nt=x=>`<span translate="no">${esc(x)}</span>`;
const nameOf=x=>LANG==='zh'?x.name:(x.en||x.name);
const subOf=x=>LANG==='zh'?(x.en||''):(x.en?x.name:'');
const heroOf=(st,f)=>(LANG!=='zh'&&st[f+'_'+LANG])||st[f]||'';
const brand=()=>{const st=S.settings||{}; return {name:st.brandName||BRAND.name, sub:st.brandSub||BRAND.sub, short:st.brandShort||BRAND.short};};
const fileTag=()=>(brand().short||'Club').replace(/[\\/:*?"<>|\s]+/g,'');
const imgSrc=o=>o&&o.photo?('/img/'+o.photo):null;
async function shrink(file,max=900){
  const url=URL.createObjectURL(file);
  try{ const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('读不到这张照片'));i.src=url;});
    const k=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
    const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(img,0,0,c.width,c.height); return c.toDataURL('image/jpeg',.82);
  } finally { URL.revokeObjectURL(url); }
}
async function squarePng(file,size){
  const url=URL.createObjectURL(file);
  try{ const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('读不到这张图片'));i.src=url;});
    const c=document.createElement('canvas'); c.width=c.height=size; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,size,size);
    const k=Math.max(size/img.width,size/img.height), w=img.width*k, h=img.height*k; x.drawImage(img,(size-w)/2,(size-h)/2,w,h); return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
async function uploadPhoto(file){ const data=await shrink(file); const r=await api('admin/photo',{data}); return {photo:r.id,photoUrl:null}; }

