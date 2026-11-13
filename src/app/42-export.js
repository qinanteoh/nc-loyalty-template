/* ---------- export ---------- */
function reportRows(){
  return S.members.slice().sort((a,b)=>a.name.localeCompare(b.name,'zh')).map(m=>({m,st:memberStats(m)}));
}
function exportPdf(){
  const rows=reportRows(), d=dt(Date.now());
  const st=k=>({active:'进行中',done:'已用完',expired:'已过期'})[k]||'';
  const html=`<h1>${nt(brand().name)} · 会员报表</h1><div class="meta">导出日期：${d}　·　会员 ${rows.length} 人　·　NCP 卡 ${S.cards.length} 张（未付款 ${S.cards.filter(c=>!c.paid).length} 张）　·　累计打卡 ${S.checkins.length} 次</div>
  <h2>会员总表</h2><table><thead><tr><th>#</th><th>名字</th><th>电话</th><th>等级</th><th>积分</th><th>买过几张卡</th><th>未付款</th><th>目前的卡</th><th>剩余次数</th><th>累计打卡</th><th>最近打卡</th><th>加入日期</th></tr></thead><tbody>
  ${rows.map(({m,st:x},i)=>`<tr><td>${i+1}</td><td>${nt(m.name)}</td><td>${esc(m.phone)}</td><td>${esc(m.tier)}</td><td>${fmt(x.pts)}</td><td>${x.nCards}</td><td>${unpaidOf(m.phone)||'—'}</td><td>${x.cur?'第 '+cardNo(x.cur)+' 张 · '+esc(x.cur.name)+'（'+st(x.curInfo.status)+'）':'—'}</td><td>${x.curInfo?x.curInfo.left:'—'}</td><td>${x.nCheckins}</td><td>${x.last||'—'}</td><td>${esc(m.joined||'')}</td></tr>`).join('')}</tbody></table>
  <h2>每位会员的卡记录</h2>
  ${rows.filter(r=>r.st.nCards).map(({m,st:x})=>`<div class="mb"><b>${nt(m.name)}（${esc(m.phone)}）</b><table><thead><tr><th>第几张</th><th>配套</th><th>开卡日期</th><th>总次数</th><th>已打卡</th><th>剩余</th><th>状态</th><th>付款</th><th>付款日期</th><th>金额</th><th>最后一次打卡</th></tr></thead><tbody>
    ${x.cards.map((c,i)=>{const k=cardInfo(c);const last=k.ins[k.ins.length-1];return `<tr><td>第 ${i+1} 张</td><td>${esc(c.name)}</td><td>${esc(c.start)}</td><td>${+c.total||0}</td><td>${k.used}</td><td>${k.left}</td><td>${st(k.status)}</td><td>${c.paid?'已付款':'<b>未付款</b>'}</td><td>${c.paid?esc(c.paidAt||''):'—'}</td><td>${c.paidAmount?'RM'+esc(c.paidAmount):'—'}</td><td>${last?last.date:'—'}</td></tr>`}).join('')}</tbody></table></div>`).join('')||'<p>还没有任何 NCP 卡记录。</p>'}`;
  const pa=document.getElementById('printArea'); pa.innerHTML=html; pa.hidden=false;
  const done=()=>{ pa.hidden=true; pa.innerHTML=''; window.removeEventListener('afterprint',done); };
  window.addEventListener('afterprint',done);
  setTimeout(()=>{ window.print(); setTimeout(()=>{ if(!pa.hidden&&!matchMedia('print').matches) done(); },1500); },100);
  toast('在打印画面选择「另存为 PDF / Save as PDF」');
}
function exportCsv(){
  const qn=v=>'"'+String(v??'').replace(/"/g,'""')+'"', q=v=>qn(trText(String(v??'')));
  const head=['名字','电话','等级','积分','买过几张卡','未付款卡','目前第几张','目前配套','剩余次数','累计打卡','最近打卡','加入日期'];
  const lines=[head.map(q).join(',')].concat(reportRows().map(({m,st:x})=>[qn(m.name),qn("'"+m.phone)].concat([m.tier,x.pts,x.nCards,unpaidOf(m.phone),x.cur?cardNo(x.cur):'',x.cur?x.cur.name:'',x.curInfo?x.curInfo.left:'',x.nCheckins,x.last,m.joined||''].map(q)).join(',')));
  const card=['电话','名字','第几张','配套','开卡日期','总次数','已打卡','剩余','状态','付款','付款日期','金额 RM','付款方式','备注'];
  const cl=[card.map(q).join(',')];
  reportRows().forEach(({m,st:x})=>x.cards.forEach((c,i)=>{const k=cardInfo(c); cl.push([qn("'"+m.phone),qn(m.name)].concat([i+1,c.name,c.start,+c.total||0,k.used,k.left,({active:'进行中',done:'已用完',expired:'已过期'})[k.status],c.paid?'已付款':'未付款',c.paid?c.paidAt:'',c.paidAmount||'',c.payMethod||'',c.paidNote||''].map(q)).join(','));}));
  const blob=new Blob(['\ufeff'+lines.join('\r\n')+'\r\n\r\n'+cl.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=fileTag()+'-会员报表-'+dt(Date.now())+'.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),5000);
  toast('Excel 报表已下载');
}

