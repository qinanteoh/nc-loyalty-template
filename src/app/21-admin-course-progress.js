/* ---------- 21-day course progress for the shop ---------- */
let courseFilter='all', courseAdmin=false;
// One member's course status: how many days read, when they last read, and what to call it.
function courseStat(m){
  const done=hOf(m.phone).done||{}, n=doneN(done), dates=Object.values(done).filter(Boolean).sort(), last=dates[dates.length-1]||null;
  const idle=last?Math.round((parseD(today())-parseD(last))/DAY):null;
  const state=n>=21?'done':!n?'none':idle>=3?'idle':'going';
  return {n,last,idle,state,next:nextDay(done)};
}
const COURSE_STATES={none:['还没开始','pending'],going:['进行中','approved'],idle:['停了好几天','rejected'],done:['已读完','approved']};
function adminCourse(){
  const all=S.members.filter(m=>!m.pending).map(m=>({m,c:courseStat(m)}));
  const cnt=k=>all.filter(r=>k==='all'||r.c.state===k).length;
  const rank={idle:0,going:1,none:2,done:3};
  const list=all.filter(r=>(courseFilter==='all'||r.c.state===courseFilter)&&qMatch(r.m.name,r.m.phone)).sort((a,b)=>rank[a.c.state]-rank[b.c.state]||(b.c.idle||0)-(a.c.idle||0)||b.c.n-a.c.n);
  return `<button class="btn" data-act="coursePreview" style="width:100%;margin-bottom:12px">${ic('book',18)} 打开完整 21 天课程</button>
  <p class="sub" style="margin:-4px 0 12px">每位会员 21 天健康课程读到哪里。会员打开 App 后，阅读进度才会更新到这里。</p>
  <div class="stat-tiles" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">${['none','going','idle','done'].map(k=>`<div><span class="num big">${cnt(k)}</span><span class="sub">${COURSE_STATES[k][0]}</span></div>`).join('')}</div>
  <div class="chips">${[['all','全部'],['idle','停了好几天'],['going','进行中'],['none','还没开始'],['done','已读完']].map(([k,l])=>`<button class="chip ${courseFilter===k?'on':''}" data-act="courseFilter" data-v="${k}">${l} ${cnt(k)}</button>`).join('')}</div>
  ${qBox()}${list.length?`<div class="list">${list.map(({m,c})=>`<button class="arow" data-act="csheet" data-id="${esc(m.phone)}" style="text-align:left">
     <div class="tx" style="flex:1;min-width:0"><b>${nt(m.name)}</b> <span class="badge ${COURSE_STATES[c.state][1]}">${COURSE_STATES[c.state][0]}</span>
       <span>${c.last?`最近读：${esc(sd(c.last))}${c.idle?`（${c.idle} 天前）`:'（今天）'}`:'还没读过'}${c.next&&c.n?` · 下一课第 ${c.next} 天`:''}</span>
       <span class="cprog" style="display:block;max-width:220px"><i style="width:${Math.round(c.n/21*100)}%"></i></span></div>
     <div class="num" style="font-weight:800;font-size:20px;flex:none">${c.n}<small style="font-size:14px;color:var(--muted)">/21</small></div></button>`).join('')}</div>`:(qOf()?noMatch():'<div class="empty">没有符合的会员。</div>')}`;
}
function courseSheet(phone){
  const m=S.members.find(x=>x.phone===phone); if(!m) return; const done=hOf(phone).done||{}, c=courseStat(m);
  openSheet(`<h3>${nt(m.name)} · 21 天课程</h3>
   <div class="ncp-stats" style="margin-bottom:12px"><div><span class="num big">${c.n}<small style="font-size:16px">/21</small></span><span class="sub">已读天数</span></div><div><span class="num big" style="font-size:22px">${c.last?esc(sd(c.last)):'—'}</span><span class="sub">最近一次读</span></div></div>
   <div class="list">${Array.from({length:21},(_,i)=>i+1).map(n=>`<div class="arow" style="padding:8px 12px"><div class="tx" style="flex:1;min-width:0"><b>第 ${n} 天</b><span translate="no">${esc(dayTitle(n))}</span></div>
     ${done[n]?`<span class="badge approved" style="white-space:nowrap">${ic('check',14)} ${esc(sd(done[n]))}</span>`:'<span class="badge pending" style="white-space:nowrap">还没读</span>'}</div>`).join('')}</div>`);
  reSheet=()=>courseSheet(phone);
}
function adminHealth(){
  const rows=S.members.map(m=>({m,h:hOf(m.phone)})).filter(r=>(r.h.scans.length||doneN(r.h.done))&&qMatch(r.m.name,r.m.phone)).sort((a,b)=>{const la=(a.h.scans.at(-1)||{}).date||'',lb=(b.h.scans.at(-1)||{}).date||'';return lb.localeCompare(la)||doneN(b.h.done)-doneN(a.h.done);});
  return `<p class="sub" style="margin:-4px 0 12px">会员自己输入的健康检测表和 21 天课程进度（只能看，不能改）。</p>
  ${qBox()}${rows.length?`<div class="list">${rows.map(({m,h})=>{const sc=h.scans,l=sc.at(-1),f=sc.find(s=>has(s.weight));return `<button class="arow" data-act="hsheet" data-id="${esc(m.id)}" style="text-align:left"><div class="tx"><b>${nt(m.name)}</b><span>21 天 ${doneN(h.done)}/21 · 检测 ${sc.length} 次${l?` · 最近 ${esc(sd(l.date))}`:''}</span></div><div style="text-align:right">${l&&has(l.weight)?`<div class="num" style="font-weight:700">${f1(l.weight,'weight')} kg</div>`:''}${f&&l&&sc.length>1&&f!==l?`<span translate="no">${delta('weight',+f.weight,+l.weight)}</span>`:''}</div></button>`}).join('')}</div>`:(qOf()?noMatch():'<div class="empty">还没有会员输入健康记录。</div>')}`;
}
function showTip(t){ const box=t.closest('.chartbox'), tip=box&&box.querySelector('.ctip'); if(!tip) return; const svg=box.querySelector('svg'), r=svg.getBoundingClientRect(), sc=r.width/svg.viewBox.baseVal.width;
  tip.textContent=t.dataset.tip; tip.style.left=(+t.dataset.x*sc)+'px'; tip.style.top=(+t.dataset.y*sc)+'px'; tip.hidden=false; }
document.addEventListener('pointerover',e=>{const t=e.target.closest&&e.target.closest('[data-tip]'); if(t) showTip(t);});
document.addEventListener('pointerdown',e=>{const t=e.target.closest&&e.target.closest('[data-tip]'); if(t) showTip(t);});
document.addEventListener('pointerout',e=>{const t=e.target.closest&&e.target.closest('[data-tip]'); if(t&&e.pointerType==='mouse'){const tip=t.closest('.chartbox').querySelector('.ctip'); if(tip) tip.hidden=true;}});
