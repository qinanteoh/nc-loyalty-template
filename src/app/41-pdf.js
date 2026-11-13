/* ---------- shared PDF helpers (pages drawn on canvas, packed as JPEG pages) ---------- */
function canvasJpg(cv){ const b64=cv.toDataURL('image/jpeg',0.9).split(',')[1], bin=atob(b64), u=new Uint8Array(bin.length); for(let q=0;q<bin.length;q++) u[q]=bin.charCodeAt(q); return u; }
function jpgsToPdf(jpgs,W,H){
  const enc=new TextEncoder(), parts=[], offs=[]; let len=0;
  const push=x=>{ const b=typeof x==='string'?enc.encode(x):x; parts.push(b); len+=b.length; };
  const obj=(n,body,stream)=>{ offs[n]=len; push(`${n} 0 obj\n${body}\n`); if(stream){ push('stream\n'); push(stream); push('\nendstream\n'); } push('endobj\n'); };
  push('%PDF-1.4\n');
  const n=jpgs.length, PW=595.28, PH=841.89, kids=[];
  for(let p=0;p<n;p++) kids.push(`${3+p*3} 0 R`);
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`);
  jpgs.forEach((jpg,p)=>{ const pg=3+p*3, ct=pg+1, im=pg+2, cs=enc.encode(`q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`);
    obj(pg,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`);
    obj(ct,`<< /Length ${cs.length} >>`,cs);
    obj(im,`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`,jpg); });
  const total=3+n*3, xref=len;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`+Array.from({length:total-1},(_,q)=>String(offs[q+1]).padStart(10,'0')+' 00000 n \n').join(''));
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out=new Uint8Array(len); let o=0; parts.forEach(b=>{ out.set(b,o); o+=b.length; }); return out;
}
// Phones open the share sheet (Save to Files, WhatsApp...); computers download the file.
async function shareOrSave(file,title){
  const phone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
  if(phone&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file],title}); return; }catch(e){ if(e&&e.name==='AbortError') return; }
  }
  const u=URL.createObjectURL(file), a=document.createElement('a'); a.href=u; a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),8000);
  toast('PDF 已下载');
}
/* ---------- Wellness form as PDF ---------- */
function healthPdfBytes(phone){
  const m=S.members.find(x=>x.phone===phone)||me(); const h=hOf(phone), p=h.profile||{};
  curHeight=has(p.height)?+p.height:null;
  const W=1240,H=1754,M=64, font=getComputedStyle(document.body).fontFamily||'sans-serif';
  const C={ink:'#2A1419',mute:'#7D6A6E',wine:'#7A1E3A',blue:'#2E5E9E',line:'#E3D5D3',soft:'#F6E3E8',good:'#2E7D5B',bad:'#C62828',flat:'#8A7F81',band:'#EEF3FA'};
  const pages=[]; let cv,ctx,y;
  const fit=(s,w)=>{ s=String(s); if(ctx.measureText(s).width<=w) return s; while(s.length>1&&ctx.measureText(s+'…').width>w) s=s.slice(0,-1); return s+'…'; };
  const wrap=(s,w)=>{ const out=[]; let line=''; for(const ch of String(s)){ if(ctx.measureText(line+ch).width>w&&line){ out.push(line); line=ch.trim()?ch:''; } else line+=ch; } if(line) out.push(line); return out; };
  const newPage=()=>{ cv=document.createElement('canvas'); cv.width=W; cv.height=H; ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); ctx.textBaseline='middle'; pages.push(cv); y=M;
    if(pages.length>1){ ctx.fillStyle=C.mute; ctx.font=`500 24px ${font}`; ctx.fillText(`${brand().name} · ${m?m.name:''}`,M,y+12); y+=48; } };
  const need=hgt=>{ if(y+hgt>H-90) newPage(); };
  newPage();
  // Title block
  ctx.fillStyle=C.ink; ctx.font=`700 40px ${font}`; ctx.fillText(fit(brand().name,W-2*M),M,y+20); y+=60;
  ctx.fillStyle=C.blue; ctx.font=`700 34px ${font}`; ctx.fillText(L3('健康评估及检测表','Wellness Evaluation & Monitoring Form','Borang Penilaian & Pemantauan Kesihatan'),M,y+18); y+=44;
  ctx.font=`600 18px ${font}`; ctx.fillText('WELLNESS EVALUATION AND MONITORING FORM',M,y+10); y+=40;
  // Details
  const base=h.scans[0], bw=base?val(base,'weight'):null;
  const tgt=has(p.target)?`${f1(p.target,'weight')} kg${bw!=null?` (${+p.target<bw?L3('减','lose','turun'):L3('增','gain','naik')} ${f1(Math.abs(bw-p.target),'weight')} kg)`:''}`:'';
  const g=p.gender==='M'?L3('男','Male','Lelaki'):p.gender==='F'?L3('女','Female','Perempuan'):(p.gender||'');
  const info=[[L3('姓名','Name','Nama'),m?m.name:''],[L3('电话','Contact','Telefon'),phone],[L3('引荐人','Sponsor','Penaja'),p.sponsor],[L3('教练','Coach','Jurulatih'),p.coach],[L3('年龄','Age','Umur'),p.age],[L3('身高','Height','Tinggi'),has(p.height)?p.height+' cm':''],[L3('性别','Gender','Jantina'),g],[L3('计划','Program','Program'),progName(p.program)],[L3('目标','Target','Sasaran'),tgt],[L3('生日','Birthday','Hari lahir'),p.birthday]];
  ctx.fillStyle=C.band; ctx.fillRect(M,y,W-2*M,5*62+16); const cw=(W-2*M)/2;
  info.forEach(([k,v],i)=>{ const cx=M+18+(i%2)*cw, cy=y+14+Math.floor(i/2)*62; ctx.fillStyle=C.blue; ctx.font=`500 18px ${font}`; ctx.fillText(k,cx,cy+12); ctx.fillStyle=v?C.ink:C.mute; ctx.font=`600 24px ${font}`; ctx.fillText(fit(v||'—',cw-36),cx,cy+40); });
  y+=5*62+16+30;
  // Records table: base-line plus the latest records, up to 7 columns per row block
  const sc=h.scans;
  if(!sc.length){ ctx.fillStyle=C.mute; ctx.font=`400 24px ${font}`; ctx.fillText(L3('还没有 Tanita 记录。','No Tanita records yet.','Belum ada rekod Tanita.'),M,y+14); y+=50; }
  else {
    const rows=MET.filter(Mm=>sc.some(s=>val(s,Mm.k)!=null));
    const per=6, groups=[]; for(let i=0;i<sc.length;i+=per) groups.push(sc.slice(i,i+per).map((s,j)=>({s,i:i+j})));
    const labW=260, rowH=44, colW=(W-2*M-labW)/per;
    const lab=Mm=>(LANG==='zh'?Mm.zh:metName(Mm))+(Mm.u&&!metName(Mm).includes(Mm.u)?` (${Mm.u})`:'')+(Mm.auto?' *':'');
    groups.forEach(gr=>{
      need(rowH*(rows.length+3)+20);
      ctx.fillStyle=C.blue; ctx.fillRect(M,y,W-2*M,rowH); ctx.fillStyle='#fff'; ctx.font=`700 20px ${font}`; ctx.fillText(L3('量身日期','Weigh-in date','Tarikh timbang'),M+12,y+rowH/2);
      gr.forEach(({s,i},j)=>{ ctx.textAlign='center'; ctx.fillText((i===0?L3('基线 ','Base ','Asas '):'')+sd(s.date),M+labW+colW*j+colW/2,y+rowH/2); ctx.textAlign='left'; }); y+=rowH;
      const totals=[['weight',L3('共减重量 (kg)','Total weight loss (kg)','Jumlah turun berat (kg)')],['fatMass',L3('共减脂肪 (kg)','Total fat loss (kg)','Jumlah turun lemak (kg)')]];
      [...rows.map(Mm=>({Mm})),...totals.map(([k,l])=>({tot:k,l}))].forEach((r,ri)=>{
        if(ri%2){ ctx.fillStyle='#F7F3F2'; ctx.fillRect(M,y,W-2*M,rowH); }
        ctx.fillStyle=r.tot?C.ink:C.blue; ctx.font=`${r.tot?700:500} 19px ${font}`; ctx.fillText(fit(r.tot?r.l:lab(r.Mm),labW-16),M+12,y+rowH/2);
        gr.forEach(({s,i},j)=>{ const cx=M+labW+colW*j+colW/2; ctx.textAlign='center';
          if(r.tot){ if(!i){ ctx.fillStyle=C.mute; ctx.fillText('—',cx,y+rowH/2); } else { const b=val(sc[0],r.tot), v=val(s,r.tot); if(b!=null&&v!=null){ const d=Math.round((b-v)*10)/10; ctx.fillStyle=d>0?C.good:d<0?C.bad:C.ink; ctx.font=`700 21px ${font}`; ctx.fillText(String(d),cx,y+rowH/2); } } }
          else { const v=val(s,r.Mm.k); if(v!=null){ ctx.fillStyle=C.ink; ctx.font=`500 21px ${font}`; const t=f1(v,r.Mm.k); ctx.fillText(t,cx,y+rowH/2);
            const pv=i?val(sc[i-1],r.Mm.k):null; if(pv!=null&&Math.abs(v-pv)>=0.05&&r.Mm.good!==null){ const cls=r.Mm.good===0?'flat':(Math.sign(v-pv)===r.Mm.good?'good':'bad'); ctx.fillStyle=C[cls]; ctx.font=`400 15px ${font}`; ctx.textAlign='left'; ctx.fillText(v>pv?'▲':'▼',cx+ctx.measureText(t).width/2+16,y+rowH/2); } } }
          ctx.textAlign='left'; });
        y+=rowH; });
      ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.strokeRect(M,y-rowH*(rows.length+3),W-2*M,rowH*(rows.length+3)); y+=18;
    });
    ctx.fillStyle=C.mute; ctx.font=`400 17px ${font}`;
    ctx.fillText(L3('▲▼ 跟上一次比：绿色 = 好，红色 = 要注意','▲▼ vs last time: green = good, red = watch','▲▼ berbanding kali lepas: hijau = baik, merah = perhatian')+(MET.some(Mm=>Mm.auto&&rows.includes(Mm))?L3('　* 自动计算','　* worked out automatically','　* dikira sendiri'):''),M,y+10); y+=44;
  }
  // Progress notes (same wording as on screen, without highlighting)
  const notesHtml=wfNotes(h);
  if(notesHtml){ const tmp=document.createElement('div'); tmp.innerHTML=notesHtml; const items=[...tmp.querySelectorAll('li')].map(li=>li.textContent.trim());
    need(110); ctx.fillStyle=C.good; ctx.fillRect(M,y,6,36); ctx.fillStyle=C.ink; ctx.font=`700 26px ${font}`; ctx.fillText(L3('进度解说','Progress notes','Nota kemajuan'),M+18,y+18); y+=54;
    ctx.font=`400 22px ${font}`;
    items.forEach(t=>{ const lines=wrap(t,W-2*M-40); need(lines.length*34+10); ctx.fillStyle=C.wine; ctx.fillText('•',M+6,y+14); ctx.fillStyle=C.ink; lines.forEach(l=>{ ctx.fillText(l,M+34,y+14); y+=34; }); y+=8; });
    y+=16; }
  // Charts
  const chart=(title,series,target)=>{
    const pts=series.flatMap(s=>s.pts); if(pts.length<2) return;
    need(400); ctx.fillStyle=C.blue; ctx.fillRect(M,y,6,36); ctx.fillStyle=C.ink; ctx.font=`700 26px ${font}`; ctx.fillText(title,M+18,y+18); y+=56;
    const dates=[...new Set(pts.map(q=>q.d))].sort(), L=M+70, R=W-M-20, T=y+10, B=y+290;
    let vals=pts.map(q=>q.v); if(target!=null) vals.push(target); let lo=Math.min(...vals), hi=Math.max(...vals); if(hi-lo<1e-9){lo-=1;hi+=1;} const pad=(hi-lo)*.15; lo-=pad; hi+=pad;
    const X=d=>L+(R-L)*(dates.length===1?.5:dates.indexOf(d)/(dates.length-1)), Y=v=>T+(B-T)*(1-(v-lo)/(hi-lo));
    ctx.strokeStyle=C.line; ctx.lineWidth=1.5; ctx.font=`400 17px ${font}`;
    [0,.5,1].forEach(f=>{ const v=lo+(hi-lo)*(1-f), yy=T+(B-T)*f; ctx.beginPath(); ctx.moveTo(L,yy); ctx.lineTo(R,yy); ctx.stroke(); ctx.fillStyle=C.mute; ctx.textAlign='right'; ctx.fillText(String(Math.round(v*10)/10),L-10,yy); ctx.textAlign='left'; });
    if(target!=null){ ctx.setLineDash([10,8]); ctx.strokeStyle=C.good; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(L,Y(target)); ctx.lineTo(R,Y(target)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle=C.good; ctx.textAlign='right'; ctx.fillText(L3('目标','Target','Sasaran')+' '+target,R,Y(target)-14); ctx.textAlign='left'; }
    series.forEach(s=>{ if(!s.pts.length) return; ctx.strokeStyle=s.color; ctx.lineWidth=4; ctx.beginPath(); s.pts.forEach((q,i)=>{ i?ctx.lineTo(X(q.d),Y(q.v)):ctx.moveTo(X(q.d),Y(q.v)); }); ctx.stroke();
      s.pts.forEach(q=>{ ctx.fillStyle=s.color; ctx.beginPath(); ctx.arc(X(q.d),Y(q.v),7,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.font=`500 16px ${font}`; ctx.textAlign='center'; ctx.fillText(String(q.v),X(q.d),Y(q.v)-20); ctx.textAlign='left'; }); });
    ctx.fillStyle=C.mute; ctx.font=`400 17px ${font}`; ctx.fillText(sd(dates[0]),L,B+26); ctx.textAlign='right'; ctx.fillText(sd(dates[dates.length-1]),R,B+26); ctx.textAlign='left';
    if(series.length>1){ let lx=L; series.forEach(s=>{ ctx.fillStyle=s.color; ctx.fillRect(lx,B+52,26,6); ctx.fillStyle=C.mute; ctx.fillText(s.name,lx+34,B+55); lx+=34+ctx.measureText(s.name).width+40; }); }
    y=B+(series.length>1?84:50);
  };
  const ptsOf=k=>sc.map(s=>({d:s.date,v:val(s,k)})).filter(x=>x.v!=null).map(x=>({d:x.d,v:Math.round(x.v*10)/10}));
  const Wn=L3('体重','Weight','Berat'), Fn=L3('脂肪重量','Fat mass','Jisim lemak'), Mn=L3('肌肉量','Muscle mass','Jisim otot');
  chart(Wn+' (kg)',[{name:Wn,color:C.good,pts:ptsOf('weight')}],has(p.target)?+p.target:null);
  chart(`${Fn} / ${Mn} (kg)`,[{name:Fn,color:'#C46A1B',pts:ptsOf('fatMass')},{name:Mn,color:C.blue,pts:ptsOf('muscle')}],null);
  // Footers
  pages.forEach((c,i)=>{ const x=c.getContext('2d'); x.textBaseline='middle'; x.fillStyle=C.mute; x.font=`400 18px ${font}`; x.textAlign='left'; x.fillText(L3('导出时间','Exported','Dieksport')+' '+dt(Date.now())+' '+hhmm(Date.now()),M,H-46); x.textAlign='right'; x.fillText(`${i+1} / ${pages.length}`,W-M,H-46); x.textAlign='left'; });
  return jpgsToPdf(pages.map(canvasJpg),W,H);
}
async function shareHealthPdf(phone){
  const m=S.members.find(x=>x.phone===phone)||me(); if(!m) return;
  let bytes; try{ bytes=healthPdfBytes(phone); }catch(e){ return toast('PDF 做不出来：'+(e.message||'请再试一次')); }
  const file=new File([bytes],`${fileTag()}-健康检测表-${String(m.name).replace(/[\\/:*?"<>|]/g,'')}-${today()}.pdf`,{type:'application/pdf'});
  await shareOrSave(file,`${brand().name} · ${m.name}`);
}

function dailyStats(from,to){
  if(!from){ const r=rangeOf(); from=r.from; to=r.to; }
  const out=[]; for(let t=parseD(from);t<=parseD(to);t+=DAY){ const date=dt(t); const ins=S.checkins.filter(x=>x.date===date);
    const staff=ins.filter(x=>x.by==='staff').length;
    out.push({date,n:ins.length,self:ins.length-staff,staff,u:new Set(ins.map(x=>x.phone)).size,pts:ins.reduce((a,x)=>a+(+x.points||0),0)}); }
  return out;
}
const howOf=b=>b==='staff'?'帮':'自';
const howTag=b=>`<span class="how ${b==='staff'?'h-staff':'h-self'}" title="${b==='staff'?'教练帮打':'顾客自己扫码'}">${howOf(b)}</span>`;
const HOW_LEGEND='自 = 顾客自己扫码　帮 = 教练帮打';
function checkinRows(){
  const {from,to}=rangeOf();
  return S.checkins.filter(x=>x.date>=from&&x.date<=to).sort((a,b)=>a.ts-b.ts).map(x=>{
    const m=S.members.find(y=>y.phone===x.phone), c=S.cards.find(y=>y.id===x.cardId), d=new Date(x.ts);
    return {date:x.date,time:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),name:m?m.name:'',phone:x.phone,card:c?('第 '+cardNo(c)+' 张 · '+c.name):'',how:howOf(x.by),pts:+x.points||0};
  });
}
function exportDailyPdf(){
  const days=dailyStats().slice().reverse(); const sum=days.reduce((a,d)=>a+d.n,0);
  const pa=document.getElementById('printArea');
  pa.innerHTML=`<h1>${nt(brand().name)} · 每日打卡统计</h1><div class="meta">${days[days.length-1].date} 至 ${days[0].date}（${days.length} 天）　·　共 ${sum} 人次　·　${new Set(S.checkins.filter(x=>x.date>=days[days.length-1].date&&x.date<=days[0].date).map(x=>x.phone)).size} 位不同会员　·　导出日期 ${today()}</div>
  <div class="meta">${HOW_LEGEND}</div><h2>每日汇总</h2><table><thead><tr><th>日期</th><th>星期</th><th>打卡人次</th><th>自</th><th>帮</th><th>打卡人数</th><th>自动加分</th></tr></thead><tbody>
  ${days.map(d=>`<tr><td>${d.date}</td><td>${'日一二三四五六'[new Date(parseD(d.date)).getDay()]}</td><td>${d.n}</td><td>${d.self}</td><td>${d.staff}</td><td>${d.u}</td><td>${d.pts}</td></tr>`).join('')}</tbody></table>
  <h2>打卡明细</h2><table><thead><tr><th>日期</th><th>时间</th><th>会员</th><th>电话</th><th>卡</th><th>自/帮</th><th>加分</th></tr></thead><tbody>
  ${checkinRows().map(r=>`<tr><td>${r.date}</td><td>${r.time}</td><td>${nt(r.name)}</td><td>${esc(r.phone)}</td><td>${esc(r.card)}</td><td>${r.how==='帮'?'<b>帮</b>':r.how}</td><td>${r.pts}</td></tr>`).join('')||'<tr><td colspan="7">这段期间没有打卡记录</td></tr>'}</tbody></table>`;
  pa.hidden=false; const done=()=>{ pa.hidden=true; pa.innerHTML=''; window.removeEventListener('afterprint',done); };
  window.addEventListener('afterprint',done); setTimeout(()=>window.print(),100); toast('在打印画面选择「另存为 PDF / Save as PDF」');
}
function exportDailyCsv(){
  const qn=v=>'"'+String(v??'').replace(/"/g,'""')+'"', q=v=>qn(trText(String(v??'')));
  const rows=[['日期','星期','打卡人次','自','帮','打卡人数','自动加分'].map(q).join(',')].concat(dailyStats().slice().reverse().map(d=>[d.date,'星期'+'日一二三四五六'[new Date(parseD(d.date)).getDay()],d.n,d.self,d.staff,d.u,d.pts].map(q).join(',')));
  rows.push('',q(HOW_LEGEND),['日期','时间','会员','电话','卡','自/帮','加分'].map(q).join(','));
  checkinRows().forEach(r=>rows.push([q(r.date),q(r.time),qn(r.name),qn("'"+r.phone),q(r.card),q(r.how),q(r.pts)].join(',')));
  const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=fileTag()+'-每日打卡-'+rangeOf().from+'至'+rangeOf().to+'.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),5000);
  toast('Excel 已下载');
}

