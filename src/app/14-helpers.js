/* ---------- local prefs ---------- */
let noticePhoto=null;
let statRange=7, statFrom=null, statTo=null, cardFilter='all';
let view='home', cat='all', adminTab='requests', memberQ='';
let myPhone=null, loginPhone='', loginStep='phone', loginName='';

/* ---------- helpers ---------- */
const me=()=>S.members.find(m=>m.phone===myPhone)||null;
const pendingRedeem=p=>S.requests.filter(r=>r.phone===p&&r.type==='redeem'&&r.status==='pending').reduce((a,r)=>a+(+r.points||0),0);
const DAILY_PTS={Silver:10,Gold:20,Platinum:30};
const ckPts=phone=>{const m=S.members.find(x=>x.phone===phone); return DAILY_PTS[m&&m.tier]||10;};
const totalPts=m=>m?(+m.points||0)+S.checkins.filter(x=>x.phone===m.phone).reduce((a,x)=>a+(+x.points||0),0):0;
const avail=m=>m?totalPts(m)-pendingRedeem(m.phone):0;
const activeRewards=()=>S.rewards.filter(r=>r.active!==false).sort((a,b)=>(a.points-b.points));
const activeTasks=()=>S.tasks.filter(t=>t.active!==false).sort((a,b)=>(a.order??0)-(b.order??0));
const dt=ts=>{const d=new Date(ts);return isNaN(d)?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

const DAY=864e5;
const ART_URL=location.origin+'/';
function h36(str){let h=2166136261>>>0;for(const ch of str){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h.toString(36);}
const qrMode=()=>(S.settings&&S.settings.qrMode)||'fixed';
function qrCodeFor(date){const st=S.settings||{}; if(!st.qrKey||qrMode()==='off') return null; return h36(st.qrKey+'|'+(qrMode()==='fixed'?'fixed':date));}
const qrLink=()=>{const c=qrCodeFor(today());return c?ART_URL+'#checkin-'+c:null;};
let scanCode=null, scanResult=null, scanBad=false;
const parseD=x=>{const [y,m,d]=String(x||'').split('-').map(Number);return new Date(y,(m||1)-1,d||1).getTime()};
const today=()=>dt(Date.now());
const CARD_TYPES=[{n:'10+1 Program',total:11,kind:'10+1'},{n:'30 天 Program',total:30,kind:'30'},{n:'Daily Pass',total:1,kind:'daily'}];
/* 等级规则：10+1 卡算 1 张，30 天卡算 3 张（9 张 10+1 = 3 张 30 天）。App 里开过的卡（不论有没有付款）+ 以前买过的卡一起算。
   超过 9 → Gold，超过 18 → Platinum，其余（新卡、Daily Pass）→ Silver。 */
const TIER_RULE={gold:9,platinum:18};
const kindOf=c=>c.kind||(/daily/i.test(c.name||'')?'daily':/30/.test(c.name||'')?'30':/10\s*\+\s*1/.test(c.name||'')?'10+1':'other');
function tierInfo(m){
  const cs=S.cards.filter(c=>c.phone===m.phone);
  const n10=(+m.prior10||0)+cs.filter(c=>kindOf(c)==='10+1').length, n30=(+m.prior30||0)+cs.filter(c=>kindOf(c)==='30').length;
  const score=n10+3*n30;
  const auto=score>TIER_RULE.platinum?'Platinum':score>TIER_RULE.gold?'Gold':'Silver';
  const tier=m.tierOverride&&TIERS[m.tierOverride]?m.tierOverride:auto;
  const nextAt=auto==='Silver'?TIER_RULE.gold+1:auto==='Gold'?TIER_RULE.platinum+1:null;
  return {tier,auto,manual:!!m.tierOverride,n10,n30,score,next:auto==='Silver'?'Gold':auto==='Gold'?'Platinum':null,need:nextAt?nextAt-score:0};
}
const TIER_STEPS=[{tier:'Gold',n10:TIER_RULE.gold+1,n30:Math.floor(TIER_RULE.gold/3)+1},{tier:'Platinum',n10:TIER_RULE.platinum+1,n30:Math.floor(TIER_RULE.platinum/3)+1}];
function nextSteps(m){ const t=tierInfo(m); if(t.manual) return []; const rank={Silver:0,Gold:1,Platinum:2}; return TIER_STEPS.filter(x=>rank[x.tier]>rank[t.auto]).map(x=>({...x,left10:Math.max(0,x.n10-t.n10),left30:Math.max(0,x.n30-t.n30)})); }
function stepText(x){ return `10+1 卡续到<b>第 ${x.n10} 张</b>${x.left10?`（还差 ${x.left10} 张）`:''}，或 30 天卡续到<b>第 ${x.n30} 张</b>${x.left30?`（还差 ${x.left30} 张）`:''}，就能升级 <b>${x.tier}</b>`; }
function tierProgress(m){ const n=nextSteps(m)[0]; return n?stepText(n):''; }
const RECENT=3*60e3;
function cardInfo(c){
  const ins=S.checkins.filter(x=>x.cardId===c.id).sort((a,b)=>a.ts-b.ts);
  const used=ins.length, daily=kindOf(c)==='daily', left=daily?Infinity:Math.max(0,(+c.total||0)-used);
  const hasExp=(+c.days||0)>0, st=parseD(c.start), endT=hasExp?st+((+c.days)-1)*DAY:Infinity, t=parseD(today());
  const notStarted=t<st, daysLeft=hasExp?(t>endT?0:Math.round((endT-Math.max(t,st))/DAY)+1):null;
  const todayN=ins.filter(x=>x.date===today()).length;
  const last=ins[ins.length-1]; const recent=!!last&&Date.now()-last.ts<RECENT;
  const status=left===0?'done':t>endT?'expired':'active';
  const pend=ins.filter(x=>x.pend).length;
  return {ins,used,left,end:hasExp?dt(endT):null,daysLeft,todayN,recent,status,notStarted,daily,pend};
}
const cardsOf=p=>S.cards.filter(c=>c.phone===p).sort((a,b)=>(b.ts||0)-(a.ts||0));
const isDP=p=>S.cards.some(c=>c.phone===p&&kindOf(c)==='daily');
const dpTag=p=>isDP(p)?' <span class="tier dp">Daily Pass 会员</span>':'';
const cardTs=c=>c.ts||parseD(c.start);
const payTag=c=>c.paid?`<span class="badge approved">已付款 ${esc(c.paidAt||'')}${c.paidAmount?' · RM'+esc(c.paidAmount):''}</span>`:`<span class="badge rejected">未付款</span>`;
const unpaidOf=p=>S.cards.filter(c=>c.phone===p&&!c.paid).length;
const cardNo=c=>S.cards.filter(x=>x.phone===c.phone).sort((a,b)=>cardTs(a)-cardTs(b)).findIndex(x=>x.id===c.id)+1;
function memberStats(m){
  const cs=S.cards.filter(c=>c.phone===m.phone).sort((a,b)=>cardTs(a)-cardTs(b));
  const ins=S.checkins.filter(x=>x.phone===m.phone).sort((a,b)=>a.ts-b.ts);
  const cur=cs.slice().reverse().find(c=>cardInfo(c).status==='active')||cs[cs.length-1]||null;
  return {cards:cs, nCards:cs.length, nCheckins:ins.length, last:ins.length?dt(ins[ins.length-1].ts):'', cur, curInfo:cur?cardInfo(cur):null, pts:totalPts(m)};
}
const hasPendingRenew=p=>S.requests.some(r=>r.phone===p&&r.type==='renew'&&r.status==='pending');
function renewBtn(phone){ return hasPendingRenew(phone)?`<button class="btn block ghost" disabled>续卡申请审核中，教练确认后即可继续打卡</button>`:`<button class="btn block" data-act="renew">申请续卡</button>`; }
function cardBlock(c,admin){
  const k=cardInfo(c); const lab={active:k.notStarted?'未开始':'进行中',done:'已用完',expired:'已过期'}[k.status];
  const bcls={active:'approved',done:'pending',expired:'rejected'}[k.status];
  let btn='';
  if(!admin){
    if(k.status!=='active') btn=renewBtn(c.phone);
    else if(k.notStarted) btn=`<button class="btn block" disabled>${esc(c.start)} 开始</button>`;
    else if(qrMode()!=='off'&&!(view==='scan'&&scanOk())) btn=`<div class="sub" style="text-align:center;padding:6px 0">${ic('camera',16)} 按下方中间的「扫码打卡」，扫柜台的二维码${k.todayN?` · 今天已打 ${k.todayN} 次`:''}</div>`;
    else btn=`<button class="btn block" data-act="checkin" data-id="${esc(c.id)}">${ic('check',18)} ${k.todayN?'再打一次卡（今天已打 '+k.todayN+' 次）':'打卡'}</button>`;
  }
  const second=k.daysLeft!=null?`<div><span class="num big">${k.daysLeft}</span><span class="sub">剩余天数（到期 ${k.end}）</span></div>`:`<div><span class="num big">${k.used}</span><span class="sub">已打卡次数</span></div>`;
  const payLine=admin?`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${payTag(c)}${c.paid&&c.payMethod?`<span class="sub">${esc(c.payMethod)}${c.paidNote?' · '+esc(c.paidNote):''}</span>`:''}</div>`:'';
  return `<div class="ncp ${k.status}">${payLine}<div class="ncp-h"><div><b>${k.daily?'Daily Pass':`NCP 卡 · 第 ${cardNo(c)} 张 · ${esc(c.name)}`}</b><div class="sub">${esc(c.start)} 开始${k.end?' · 到期 '+k.end:''}</div></div><span class="badge ${bcls}">${lab}</span></div>
  ${k.daily?`<div class="promo" style="padding:10px 14px"><span class="plus num" style="font-size:22px">+${ckPts(c.phone)}</span><span>每次打卡由教练核准后<b>加 ${ckPts(c.phone)} 分</b></span></div>
  <div class="ncp-stats"><div><span class="num big">∞</span><span class="sub">不限次数</span></div><div><span class="num big">${k.used}</span><span class="sub">已打卡次数${k.pend?`（<b>${k.pend}</b> 次等待核准）`:''}</span></div></div>`
  :`${k.status==='active'?`<div class="promo" style="padding:10px 14px"><span class="plus num" style="font-size:22px">+${ckPts(c.phone)}</span><span>每次打卡<b>自动加 ${ckPts(c.phone)} 分</b>（每日消费积分），不用申请</span></div>`:''}
  <div class="ncp-stats"><div><span class="num big">${k.left}</span><span class="sub">剩余次数（共 ${+c.total||0} 次）</span></div>${second}</div>
  <div class="stamps" aria-label="已打卡 ${k.used} 次">${Array.from({length:+c.total||0},(_,i)=>`<i class="${i<k.used?'on':''}" title="${i<k.used?esc(k.ins[i].date):''}">${i<k.used?ic('check',12):i+1}</i>`).join('')}</div>`}${btn}</div>`;
}
const ckId=c=>c.id+'_'+today()+'_'+Date.now().toString(36);
const leftMsg=(c,k)=>`${c.name} 还剩 ${k.left-1} 次${k.daysLeft!=null?'，'+k.daysLeft+' 天':''}。`;
function ph(o,cls='',extra=''){
  const src=imgSrc(o); const c=catOf(o&&o.cat);
  const hue=`var(--${CATK[c.id]}s)`, col=`var(--${CATK[c.id]})`;
  return `<div class="ph ${cls}" style="background:${hue};color:${col};${extra}">${src?`<img src="${esc(src)}" alt="${esc(o.name||'')}" loading="lazy">`:ic(c.icon,34)}</div>`;
}
function rewardCard(r){
  const m=me(); const out=r.stock!=null&&r.stock<=0; const can=m&&avail(m)>=r.points&&!out;
  const k=CATK[catOf(r.cat).id];
  return `<button class="rw ${out?'out':''}" data-act="reward" data-id="${esc(r.id)}" style="--c:var(--${k});--cs:var(--${k}s)">
    ${ph(r).replace('</div>',`<span class="tag">${esc(catOf(r.cat).zh)}</span></div>`)}
    <div class="body"><div class="nm">${nt(nameOf(r))}</div><div class="en">${nt(subOf(r))}</div>
    <div class="cost"><span class="pill ${can?'':'soft'} num">${fmt(r.points)}</span><span class="stock">${out?'已兑完':r.stock!=null?'剩 '+r.stock:''}</span></div></div></button>`;
}

