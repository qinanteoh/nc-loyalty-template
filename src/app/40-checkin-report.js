/* ---------- daily stats ---------- */
function rangeOf(){
  if(statRange>0){ const t=parseD(today()); return {from:dt(t-(statRange-1)*DAY), to:today()}; }
  let from=statFrom||dt(parseD(today())-29*DAY), to=statTo||today(); if(from>to) [from,to]=[to,from];
  if((parseD(to)-parseD(from))/DAY>365) from=dt(parseD(to)-365*DAY);
  return {from,to};
}
/* ---------- daily check-in report ---------- */
let reportDate=null;
const kindLabel=c=>{ const k=c?kindOf(c):''; return k==='10+1'?'10+1':k==='30'?'30 天':k==='daily'?'Daily Pass':(c?c.name:''); };
const hhmm=ts=>{const d=new Date(ts); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const weekday=date=>'星期'+'日一二三四五六'[new Date(parseD(date)).getDay()];
// Every check-in on one day, oldest first, with what the card had left right after that check-in.
function dayReport(date){
  const rows=S.checkins.filter(x=>x.date===date).sort((a,b)=>a.ts-b.ts).map(x=>{
    const m=S.members.find(y=>y.phone===x.phone), c=S.cards.find(y=>y.id===x.cardId);
    const usedThen=c?S.checkins.filter(y=>y.cardId===c.id&&(y.ts<x.ts||(y.ts===x.ts&&y.id<=x.id))).length:0;
    return {ts:x.ts,time:hhmm(x.ts),name:m?m.name:'',phone:x.phone,tier:m?(m.tier||tierInfo(m).tier):'',kind:c?kindOf(c):'',card:kindLabel(c),left:c&&kindOf(c)!=='daily'?Math.max(0,(+c.total||0)-usedThen):null,pts:+x.points||0,by:x.by,pend:!!x.pend};
  });
  const ppl=k=>new Set(rows.filter(k).map(r=>r.phone)).size;
  return {date,rows,people:ppl(()=>true),ncp:ppl(r=>r.kind&&r.kind!=='daily'),daily:ppl(r=>r.kind==='daily'),pts:rows.reduce((a,r)=>a+r.pts,0)};
}
function adminReport(){
  const d=reportDate||today(), R=dayReport(d), y=dt(parseD(today())-DAY);
  return `<div class="chips"><button class="chip ${d===y?'on':''}" data-act="repDay" data-v="${y}">昨天</button><button class="chip ${d===today()?'on':''}" data-act="repDay" data-v="${today()}">今天</button></div>
  <div class="field" style="margin:10px 0 14px"><label for="repDate">选日期</label><input class="inp" type="date" id="repDate" value="${esc(d)}" max="${today()}"></div>
  <p class="sub" style="margin:-6px 0 10px"><b class="num" style="color:var(--ink)">${d}</b> ${weekday(d)}</p>
  <div class="stat-tiles rep-tiles"><div><span class="num big">${R.people}</span><span class="sub">打卡总人数</span></div><div><span class="num big">${R.ncp}</span><span class="sub">用 NCP 卡打卡</span></div>
    <div><span class="num big">${R.daily}</span><span class="sub">Daily Pass</span></div><div><span class="num big">${fmt(R.pts)}</span><span class="sub">打卡积分总数</span></div></div>
  <div class="btnrow" style="justify-content:flex-start;margin:14px 0"><button class="btn" data-act="repPdf" ${R.rows.length?'':'disabled'}>${ic('history',18)} 导出 PDF</button></div>
  ${R.rows.length?`<div class="card" style="padding:4px 14px">${R.rows.map(r=>`<div class="reprow">
      <div class="rt num">${r.time}</div>
      <div style="flex:1;min-width:0"><b>${nt(r.name)}</b> <span class="tier ${esc(r.tier)}" style="font-size:13px;padding:1px 8px">${esc(r.tier)}</span>
        <div class="sub"><span class="num">${esc(r.phone)}</span> · ${esc(r.card)}${r.left!=null?` · <span>剩 ${r.left} 次</span>`:''}</div></div>
      <div style="flex:none;text-align:right">${r.pend?'<span class="badge pending">待核准</span>':`<span class="num d-plus">+${r.pts}</span>`}</div></div>`).join('')}</div>`:'<div class="empty">这一天没有人打卡。</div>'}`;
}
/* PDF: each A4 page is drawn on a canvas (so Chinese names print correctly), then packed into a small PDF file. */
function reportPdfBytes(R){
  const W=1240,H=1754,M=70, font=getComputedStyle(document.body).fontFamily||'sans-serif', T=s=>trText(s);
  const cols=[{h:'时间',w:110},{h:'会员',w:250},{h:'电话',w:200},{h:'等级',w:150},{h:'卡',w:170},{h:'剩余次数',w:120},{h:'加分',w:100}];
  const sumW=cols.reduce((a,c)=>a+c.w,0), k=(W-2*M)/sumW; cols.forEach(c=>c.w*=k);
  const rowH=54, headH=330, firstRows=Math.floor((H-headH-140)/rowH), nextRows=Math.floor((H-M-60-140)/rowH);
  const pages=[]; let i=0; do { const n=pages.length?nextRows:firstRows; pages.push(R.rows.slice(i,i+n)); i+=n; } while(i<R.rows.length);
  const fit=(ctx,s,w)=>{ s=String(s); if(ctx.measureText(s).width<=w) return s; while(s.length>1&&ctx.measureText(s+'…').width>w) s=s.slice(0,-1); return s+'…'; };
  const jpgs=pages.map((list,p)=>{
    const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const ctx=cv.getContext('2d');
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#2A1419'; ctx.textBaseline='middle';
    let y=M;
    if(!p){
      ctx.font=`700 46px ${font}`; ctx.fillText(fit(ctx,brand().name,W-2*M),M,y+24); y+=72;
      ctx.font=`600 32px ${font}`; ctx.fillStyle='#7A1E3A'; ctx.fillText(T('每日打卡报告')+'  ·  '+R.date+'  '+T(weekday(R.date)),M,y+18); y+=62;
      ctx.fillStyle='#F6E3E8'; ctx.fillRect(M,y,W-2*M,104); ctx.fillStyle='#2A1419';
      const tiles=[[T('打卡总人数'),R.people],[T('用 NCP 卡打卡'),R.ncp],['Daily Pass',R.daily],[T('打卡积分总数'),R.pts]], tw=(W-2*M)/4;
      tiles.forEach(([l,v],j)=>{ ctx.font=`800 40px ${font}`; ctx.fillText(String(v),M+j*tw+22,y+38); ctx.font=`400 22px ${font}`; ctx.fillStyle='#7D6A6E'; ctx.fillText(fit(ctx,l,tw-30),M+j*tw+22,y+80); ctx.fillStyle='#2A1419'; });
      y+=130;
    } else { ctx.font=`600 26px ${font}`; ctx.fillText(brand().name+'  ·  '+R.date,M,y+16); y+=50; }
    ctx.fillStyle='#7A1E3A'; ctx.fillRect(M,y,W-2*M,rowH); ctx.fillStyle='#fff'; ctx.font=`700 24px ${font}`;
    let x=M; cols.forEach(c=>{ ctx.fillText(fit(ctx,T(c.h),c.w-16),x+10,y+rowH/2); x+=c.w; }); y+=rowH;
    ctx.font=`400 24px ${font}`;
    list.forEach((r,j)=>{ if(j%2){ ctx.fillStyle='#F7EEEC'; ctx.fillRect(M,y,W-2*M,rowH); } ctx.fillStyle='#2A1419';
      const cells=[r.time,r.name,r.phone,r.tier,r.card,r.left==null?(r.kind==='daily'?T('不限次'):'—'):String(r.left),r.pend?T('待核准'):'+'+r.pts]; x=M;
      cells.forEach((v,ci)=>{ ctx.fillText(fit(ctx,v,cols[ci].w-16),x+10,y+rowH/2); x+=cols[ci].w; }); y+=rowH; });
    if(!list.length){ ctx.fillStyle='#7D6A6E'; ctx.fillText(T('这一天没有人打卡。'),M+10,y+rowH/2); }
    ctx.strokeStyle='#EADCDA'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(M,y); ctx.lineTo(W-M,y); ctx.stroke();
    ctx.fillStyle='#7D6A6E'; ctx.font=`400 20px ${font}`; ctx.fillText(`${p+1} / ${pages.length}`,W-M-80,H-50); ctx.fillText(T('导出时间')+' '+dt(Date.now())+' '+hhmm(Date.now()),M,H-50);
    return canvasJpg(cv);
  });
  return jpgsToPdf(jpgs,W,H);
}
// Phones open the share sheet (Save to Files, WhatsApp...); computers download the file.
async function shareReportPdf(){
  const R=dayReport(reportDate||today()), name=`${fileTag()}-打卡报告-${R.date}.pdf`;
  let bytes; try{ bytes=reportPdfBytes(R); }catch(e){ return toast('PDF 做不出来：'+(e.message||'请再试一次')); }
  await shareOrSave(new File([bytes],name,{type:'application/pdf'}),brand().name+' · '+R.date);
}
