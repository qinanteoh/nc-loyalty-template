/* ---------- back navigation ---------- */
let navStack=[];
function goView(v){ v=v||'home'; if(v!==view){ navStack.push(view); if(navStack.length>30) navStack.shift(); } if(view==='course'&&v!=='course') syncCourse(); if(v==='course') primeCourse(); view=v; }
function vHome(){
  const st=S.settings||{}; const m=me(); const src=imgSrc(st);
  const near=m?activeRewards().filter(r=>r.points>avail(m))[0]:null;
  const pct=near?Math.min(100,Math.round(avail(m)/near.points*100)):100;
  const promo=activeTasks().find(t=>t.promo);
  return `
  <section class="hero center ${src?'has-img':''}" ${src?`style="background-image:url('${esc(src)}')"`:''}>
    <div class="eyebrow">${esc(st.eyebrow||'NC Loyalty Program')}</div>
    <h1>${(st['title_'+LANG]&&LANG!=='zh'?nt(heroOf(st,'title')):esc(heroOf(st,'title')||'俱乐部积分奖励')).replace(/\n/g,'<br>')}<svg class="giftbox" viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="26" width="48" height="32" rx="4" fill="#E8B35A"/><rect x="5" y="18" width="54" height="12" rx="3" fill="#F3C978"/><rect x="28" y="18" width="8" height="40" fill="#FFF7F2"/><rect x="8" y="34" width="48" height="5" fill="#D9962B" opacity=".35"/><path d="M32 18c-4-10-16-12-16-4 0 5 9 5 16 4zM32 18c4-10 16-12 16-4 0 5-9 5-16 4z" fill="#FFF7F2" stroke="#E8B35A" stroke-width="2"/><circle cx="32" cy="18" r="4" fill="#F3C978"/></svg></h1>
    <p>${st['sub_'+LANG]&&LANG!=='zh'?nt(heroOf(st,'sub')):esc(st.sub||'')}</p>
    <svg class="coins" viewBox="0 0 150 150" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="2"><circle cx="90" cy="90" r="56"/><circle cx="90" cy="90" r="40"/><circle cx="34" cy="40" r="16"/></g><text x="90" y="104" text-anchor="middle" font-family="Sora,sans-serif" font-weight="800" font-size="40" fill="currentColor" fill-opacity=".3">P</text></svg>
  </section>
  <div class="card mcard">
  ${m?`<div class="mrow"><div><div class="mname">${nt(m.name)} <span class="tier ${esc(m.tier)}">${esc(m.tier)} · ${TIERS[m.tier]?.zh||''}</span>${dpTag(m.phone)}</div>
      <div class="sub">可用积分 Available points</div>${tierProgress(m)?`<div class="sub" style="color:var(--gold);margin-top:4px">${tierProgress(m)}</div>`:''}</div>
      <div class="pts num">${fmt(avail(m))}<small>pts</small></div></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="sub" style="margin-top:6px">${near?`再累积 <b class="num">${fmt(near.points-avail(m))}</b> 分即可兑换「${nt(nameOf(near))}」`:'所有礼物都可以兑换了！'}</div>`
   :`<div class="mrow"><div><div class="mname">欢迎来到 NC 俱乐部</div><div class="sub">用手机号码免费注册，开始累积积分</div></div>
      <button class="btn sm" data-act="go" data-v="me">登入 / 注册</button></div>`}
  </div>
  ${m&&cardsOf(m.phone).length?`<div class="sec blk b-ncp"><div class="sec-h"><h2>我的 NCP 卡</h2></div>${(cardsOf(m.phone).filter(c=>cardInfo(c).status==='active').length?cardsOf(m.phone).filter(c=>cardInfo(c).status==='active'):cardsOf(m.phone).slice(0,1)).map(c=>cardBlock(c)).join('')}</div>`:''}
  <div class="sec blk b-scan"><button class="scanbig" data-act="scanQR"><span class="bub">${ic('qr',32)}</span><span style="min-width:0"><b>扫码打卡</b><span>到店后按这里，扫柜台的二维码</span></span></button></div>
  ${m&&m.pending?`<div class="sec">${pendingNote()}</div>`:''}
  ${m&&!m.pending?healthBlock(m):''}
  ${unreadN()?`<div class="sec"><button class="newnote" data-act="notices">${ic('bell',22)}<span style="flex:1;min-width:0;text-align:left"><b>你有 ${unreadN()} 则新通知</b><span style="display:block" class="sub">${nt(nTitle((S.feed||[]).find(n=>n.ts>seenTs())||{}))}</span></span></button></div>`:''}
  ${['off','ios'].includes(pushState())?`<div class="sec">${pushCard()}</div>`:''}
  <div class="sec quick">
    <button class="q" data-act="go" data-v="earn"><span class="ic">${ic('bolt')}</span>赚积分</button>
    <button class="q" data-act="go" data-v="shop"><span class="ic">${ic('gift')}</span>兑换商城</button>
    <button class="q" data-act="go" data-v="me"><span class="ic">${ic('user')}</span>会员卡</button>
    <button class="q" data-act="history"><span class="ic">${ic('history')}</span>积分记录</button>
  </div>
  ${promo?`<div class="sec promo"><div class="burst">${fmt(promo.points)}<small>POINTS</small></div><div style="min-width:0"><b>${nt(nameOf(promo))}</b><span class="sub">${nt(subOf(promo))}${promo.note?' · '+esc(promo.note):''}</span></div></div>`:''}
  <div class="sec blk b-gift"><div class="sec-h"><h2>热门好礼</h2><button class="link" data-act="go" data-v="shop">全部礼物 →</button></div>
    ${activeRewards().length?`<div class="hscroll">${activeRewards().slice(0,8).map(rewardCard).join('')}</div>`:`<div class="empty">还没有礼物。管理员可以在「管理」里添加。</div>`}</div>
  <div class="sec blk b-task"><div class="sec-h"><h2>积分获取攻略</h2><button class="link" data-act="go" data-v="earn">更多 →</button></div>
    <div class="list">${activeTasks().slice(0,3).map(taskRow).join('')||'<div class="empty">还没有赚分任务。</div>'}</div></div>
  <div class="sec" style="text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center"><span class="sub">© ${nt(brand().name)} · ${esc(brand().sub)}</span>${isAdmin?'':'<button class="link sub" data-act="adminLogin">店家登入</button>'}</div>`;
}
const taskOpts=t=>String(t.opts||'').split(/[,，、]/).map(x=>x.trim()).filter(Boolean).slice(0,8);
const dayOfTs=ts=>{const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
// This member's requests for a task today that still count (pending or approved).
const taskToday=t=>S.requests.filter(r=>r.phone===myPhone&&r.type==='earn'&&r.taskId===t.id&&r.status!=='rejected'&&dayOfTs(r.ts)===today());
function taskLimit(t){ const cap=Math.max(0,parseInt(t.daily,10)||0), o=taskOpts(t), max=cap||(o.length||0); if(!max||!me()) return null; const n=taskToday(t).length; return {n,max,full:n>=max}; }
function taskRow(t,i){
  return `<div class="task" data-k="${((i||0)%6)+1}"><span class="ic">${ic(t.icon||'star',22)}</span><div class="tx"><b>${nt(nameOf(t))}${t.promo?'<span class="flag">限时</span>':''}</b><span>${nt(subOf(t))}${t.note?' · '+esc(t.note):''}</span></div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="plus num">+${t.auto&&me()?fmt(ckPts(myPhone)):fmt(t.points)}</span>${t.auto?'<span class="badge approved" style="white-space:nowrap">自动加分</span>':(L=>L&&L.full?'<span class="badge pending" style="white-space:nowrap">今天已满</span>':`<button class="btn sm ghost" data-act="claim" data-id="${esc(t.id)}">申请</button>`)(taskLimit(t))}${(L=>L?`<span class="sub" style="font-size:14px;white-space:nowrap">今天 ${L.n}/${L.max}</span>`:'')(taskLimit(t))}</div></div>`;
}
function tierRulesCard(m){
  const t=m?tierInfo(m):null;
  const rows=[['Silver','银卡','新卡、Daily Pass',DAILY_PTS.Silver],['Gold','金卡','第 10 张 10+1 卡开始，或第 4 张 30 天卡开始',DAILY_PTS.Gold],['Platinum','白金卡','第 19 张 10+1 卡开始，或第 7 张 30 天卡开始',DAILY_PTS.Platinum]];
  return `<div class="card tiers"><b style="font-size:20px">会员等级说明</b>
    <p class="sub" style="margin:4px 0 10px">持续续卡，就能累积升级成为 Gold 或 Platinum，每次扫码打卡可以获得更多积分。</p>
    ${rows.map(([k,zh,cond,pts])=>`<div class="trow ${t&&t.tier===k?'me':''}"><span class="tier ${k}">${k} · ${zh}</span><span class="cond">${cond}</span><span class="tp num">+${pts}<small>/次</small></span></div>`).join('')}
    ${t?`<div class="myprog"><div>你目前是 <b>${t.tier}</b>，已经累计 10+1 卡 <b>${t.n10}</b> 张、30 天卡 <b>${t.n30}</b> 张。</div>${nextSteps(m).map(x=>`<div class="step ${x.tier}">${stepText(x)}</div>`).join('')}${!t.manual&&t.auto==='Platinum'?'<div class="step Platinum">你已经是最高等级 Platinum，谢谢你一直以来的支持！</div>':''}</div>`:''}
  </div>`;
}
function vEarn(){
  return `<div class="sec-h"><h2 style="font-family:var(--f-display);font-size:30px">赚积分</h2></div>
  <p class="sub" style="margin:-4px 0 14px">完成以下任务后按「申请」，教练审核后积分会自动加入你的账户。</p>
  <div class="list">${activeTasks().map(taskRow).join('')||'<div class="empty">还没有赚分任务。</div>'}</div>
  <div class="sec">${tierRulesCard(me())}</div>`;
}
function vShop(){
  const m=me(); const list=activeRewards().filter(r=>cat==='all'||r.cat===cat);
  return `<div class="sec-h"><h2 style="font-family:var(--f-display);font-size:30px">兑换商城</h2>${m?`<span class="pill num">${fmt(avail(m))} pts</span>`:''}</div>
  <div class="chips"><button class="chip ${cat==='all'?'on':''}" data-act="cat" data-v="all">全部</button> ${CATS.map(c=>`<button class="chip ${cat===c.id?'on':''}" style="--c:var(--${CATK[c.id]});--cs:var(--${CATK[c.id]}s)" data-act="cat" data-v="${c.id}">${c.zh}</button>`).join('')}</div>
  ${list.length?`<div class="grid">${list.map(rewardCard).join('')}</div>`:'<div class="empty">这个分类暂时没有礼物。</div>'}
  <div class="terms sec"><b>兑换须知 Terms</b>${termsHtml()}</div>`;
}
function loginView(){
  const pinField=(id,label)=>`<div class="field"><label for="${id}">${label}</label><input class="inp num pin" id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="••••"></div>`;
  let body;
  if(loginStep==='pin') body=`<form id="pinForm"><p style="margin:0 0 12px">${esc(loginName)}，欢迎回来</p>${pinField('pin1','输入你的 4 位数密码')}
      <button class="btn block" type="submit">登入</button></form>
      <p class="sub" style="margin-top:12px">忘记密码？请联系教练帮你重设。</p>
      <button class="link" data-act="loginBack" style="margin-top:6px">换一个号码</button>`;
  else if(loginStep==='register') body=`<form id="regForm"><p style="margin:0 0 12px">欢迎加入 ${nt(brand().name)}！这个号码（${esc(loginPhone)}）还没注册，填写以下资料就可以开始累积积分。</p>
      <div class="field"><label for="rname">你的名字</label><input class="inp" id="rname" autocomplete="name" placeholder="例如 李美玲"></div>
      ${pinField('pin1','设定 4 位数密码')}${pinField('pin2','再输入一次')}
      <button class="btn block" type="submit">注册并登入</button></form>
      <button class="link" data-act="loginBack" style="margin-top:12px">换一个号码</button>`;
  else if(loginStep==='setpin') body=`<form id="setPinForm"><p style="margin:0 0 12px">${esc(loginName)}，第一次登入请设定你自己的 4 位数密码。</p>
      ${pinField('pin1','设定 4 位数密码')}${pinField('pin2','再输入一次')}
      <button class="btn block" type="submit">设定密码并登入</button></form>
      <button class="link" data-act="loginBack" style="margin-top:12px">换一个号码</button>`;
  else body=`<form id="loginForm"><div class="field"><label for="ph">手机号码 Phone number</label><input class="inp" id="ph" inputmode="tel" autocomplete="tel" placeholder="例如 0123456789" value="${esc(loginPhone)}"></div>
      <button class="btn block" type="submit">下一步</button></form>
      <p class="sub" style="margin-top:12px">第一次使用？输入手机号码按「下一步」就可以注册。</p>`;
  return `<div class="sec-h"><h2 style="font-family:var(--f-display);font-size:30px">${loginStep==='register'?'会员注册':joining?'欢迎加入会员':'会员登入 / 注册'}</h2></div>${joining&&loginStep==='phone'?`<p class="sub" style="margin:-4px 0 12px">欢迎加入 ${nt(brand().name)}！输入你的手机号码，按「下一步」就可以注册。</p>`:''}<div class="card">${body}</div>`;
}
function vMe(){
  const m=me();
  if(!m) return loginView();
  const reqs=S.requests.filter(r=>r.phone===m.phone).sort((a,b)=>b.ts-a.ts);
  const led=S.ledger.filter(l=>l.phone===m.phone).concat(S.checkins.filter(x=>x.phone===m.phone&&+x.points).map(x=>({delta:+x.points,reason:'每日消费 Daily Order（打卡）',ts:x.ts}))).sort((a,b)=>b.ts-a.ts);
  return `<div class="hero" style="min-height:0"><div class="eyebrow">NC Member · ${esc(m.phone)}</div><h1 style="margin-bottom:2px">${nt(m.name)}</h1>
     <span class="tier ${esc(m.tier)}" style="background:rgba(255,255,255,.18);color:var(--on-wine)">${esc(m.tier)} · ${TIERS[m.tier]?.zh||''}</span>${isDP(m.phone)?' <span class="tier" style="background:rgba(255,255,255,.18);color:var(--on-wine)">Daily Pass 会员</span>':''}
     <div style="display:flex;gap:24px;margin-top:16px"><div><div class="num" style="font-size:40px;font-weight:800;line-height:1">${fmt(avail(m))}</div><div style="font-size:16px;opacity:.8">可用积分</div></div>
     <div><div class="num" style="font-size:40px;font-weight:800;line-height:1;opacity:.75">${fmt(pendingRedeem(m.phone))}</div><div style="font-size:16px;opacity:.8">兑换审核中</div></div></div></div>
  ${m.pending?`<div class="sec">${pendingNote()}</div>`:''}
  <div class="sec">${pushCard()}</div>
  <div class="sec blk b-tier">${tierRulesCard(m)}</div>
  ${m.pending?'':healthBlock(m)}
  <div class="sec blk b-ncp"><div class="sec-h"><h2>我的 NCP 卡</h2></div>${cardsOf(m.phone).map(c=>cardBlock(c)).join('')||'<div class="empty">还没有 NCP 卡。请联系教练开卡。</div>'}</div>
  <div class="sec blk b-task"><div class="sec-h"><h2>我的申请</h2></div>
    ${reqs.length?`<div class="card" style="padding:4px 14px">${reqs.slice(0,12).map(r=>`<div class="hist"><div style="min-width:0"><b style="font-size:18px">${({redeem:'兑换',earn:'赚分',renew:'续卡',checkin:'打卡',course:'课程'})[r.type]} ${nt(r.title)}</b><div class="sub">${dt(r.ts)}</div></div><div style="text-align:right">${r.type==='renew'||r.type==='course'?'':`<div class="num ${r.type==='redeem'?'d-minus':'d-plus'}">${r.type==='redeem'?'−':'+'}${fmt(r.points)}</div>`}<span class="badge ${r.status}">${({pending:'审核中',approved:'已通过',rejected:'未通过'})[r.status]}</span></div></div>`).join('')}</div>`:'<div class="empty">还没有申请记录。</div>'}</div>
  <div class="sec blk b-news" id="ledgerSec"><div class="sec-h"><h2>积分记录</h2></div>
    ${led.length?`<div class="card" style="padding:4px 14px">${led.slice(0,30).map(l=>`<div class="hist"><div style="min-width:0"><b style="font-size:18px">${esc(l.reason)}</b><div class="sub">${dt(l.ts)}</div></div><div class="num ${l.delta<0?'d-minus':'d-plus'}">${l.delta<0?'−':'+'}${fmt(Math.abs(l.delta))}</div></div>`).join('')}</div>`:'<div class="empty">还没有积分记录。</div>'}</div>
  <div class="sec"><button class="btn ghost block" data-act="logout">登出</button></div>`;
}

function scanOk(){ return !!scanCode&&!scanBad; }
function vScan(){
  const m=me();
  if(scanResult) return `<div class="scan-ok"><div class="big-ic">${ic('check',40)}</div><h2 style="font-family:var(--f-display);font-size:30px">${scanResult.startsWith('刚刚')?'已经打过卡':scanResult.startsWith('正在')?'正在打卡…':'打卡成功'}</h2><p class="sub">${esc(scanResult)}</p></div>${m?cardsOf(m.phone).filter(c=>cardInfo(c).status==='active').map(c=>cardBlock(c)).join(''):''}
    <div class="sec"><button class="btn ghost block" data-act="go" data-v="home">回到首页</button></div>`;
  if(!m) return `<div class="scan-ok"><div class="big-ic">${ic('user',40)}</div><h2 style="font-family:var(--f-display);font-size:30px">欢迎来到 ${nt(brand().name)}</h2>
    <p class="sub" style="margin:4px 0 0"><b>第一次来？</b>输入手机号码按「下一步」，就可以免费注册成为会员。</p><p class="sub" style="margin:4px 0 0">已经是会员？输入号码登入后就会帮你打卡。</p></div>`+loginView();
  if(!scanOk()) return `<div class="scan-ok scan-bad"><div class="big-ic">${ic('history',40)}</div><h2 style="font-family:var(--f-display);font-size:30px">这个二维码已失效</h2><p class="sub">请扫描店内今天的打卡二维码。</p><button class="btn ghost" data-act="go" data-v="home">回到首页</button></div>`;
  const cs=cardsOf(m.phone).filter(c=>{const k=cardInfo(c);return k.status==='active'&&!k.notStarted;});
  if(m.pending) return `<div class="scan-ok"><div class="big-ic">${ic('check',40)}</div><h2 style="font-family:var(--f-display);font-size:30px">注册成功，欢迎你！</h2><p class="sub">请等店里核准你的会员资料，教练帮你开卡后，就可以扫码打卡累积积分。</p></div><div class="sec"><button class="btn ghost block" data-act="go" data-v="home">回到首页</button></div>`;
  if(!cardsOf(m.phone).length) return `<div class="scan-ok"><div class="big-ic">${ic('ticket',40)}</div><h2 style="font-family:var(--f-display);font-size:30px">${nt(m.name)}，欢迎！</h2><p class="sub">你还没有 NCP 卡。请找教练帮你开卡，开卡后就可以扫码打卡累积积分。</p></div><div class="sec"><button class="btn ghost block" data-act="go" data-v="home">回到首页</button></div>`;
  if(!cs.length) return `<div class="scan-ok scan-bad"><div class="big-ic">${ic('ticket',40)}</div><h2 style="font-family:var(--f-display);font-size:30px">你的 NCP 卡已经用完了</h2><p class="sub">申请续卡后，教练确认就可以继续打卡。</p></div>${renewBtn(m.phone)}<div class="sec"><button class="btn ghost block" data-act="go" data-v="home">回到首页</button></div>`;
  return `<div class="scan-ok"><h2 style="font-family:var(--f-display);font-size:30px">${nt(m.name)}，欢迎来到俱乐部</h2><p class="sub">${dt(Date.now())}</p></div>${cs.map(c=>cardBlock(c)).join('')}`;
}
let scanBusy=false;
async function doCheckin(c,force){
  const r=await api('checkin',{cardId:c.id,code:scanCode,force:!!force});
  if(r.recent) return {recent:true,msg:r.left==null?'刚刚已经打卡成功了，不用重复扫码。':`刚刚已经打卡成功了，不用重复扫码。${c.name} 还剩 ${r.left} 次。`};
  if(r.pending) return {ok:true,msg:`打卡成功！Daily Pass 打卡要等教练核准，核准后会加 ${r.points} 分。`};
  return {ok:true,msg:r.left==null?`打卡成功！每日消费 +${r.points} 分。`:`打卡成功！每日消费 +${r.points} 分。${c.name} 还剩 ${r.left} 次。`};
}
async function autoScanCheckin(){
  const m=me(); if(view!=='scan'||!scanOk()||!m||scanResult||scanBusy) return;
  const cs=cardsOf(m.phone).filter(c=>{const k=cardInfo(c);return k.status==='active'&&!k.notStarted;});
  if(cs.length!==1) return;
  scanBusy=true; scanResult='正在打卡…'; render();
  try{ const r=await doCheckin(cs[0],false); scanResult=r.msg; await refresh(); }
  catch(e){ scanResult=null; if(e.code==='bad_qr') scanBad=true; else toast(e.message); render(); }
  finally{ scanBusy=false; }
}
function readHash(){ const mt=(location.hash||'').match(/^#checkin-([a-z0-9]+)$/); if(mt){ scanCode=mt[1]; scanResult=null; scanBad=false; view='scan'; }
  if(location.hash==='#join'){ joining=true; view='me'; if(!token){ loginStep='phone'; } try{ history.replaceState(null,'',location.pathname+location.search); }catch(_){} } }
let joining=false;
const joinLink=()=>ART_URL+'#join';

