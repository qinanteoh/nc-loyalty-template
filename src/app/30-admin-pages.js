/* ---------- admin ---------- */
function vAdmin(){
  const pend=S.requests.filter(r=>r.status==='pending').length+pendMembers().length;
  let tabs=[['requests',`审核${pend?' ('+pend+')':''}`],['notify','通知'],['rewards','礼物'],['tasks','任务'],['report','打卡报告'],['stats','每日统计'],['members','会员'],['course','课程'],['health','健康'],['cards','NCP卡'],['branch','分店'],['chart','店长图'],['home','首页']];
  if(isOperator()) tabs=tabs.filter(([k])=>!['notify','rewards','tasks','home'].includes(k));
  if(!tabs.some(([k])=>k===adminTab)) adminTab='requests';
  let body='';
  if(adminTab==='requests'){
    const list=S.requests.filter(r=>qMatch(r.name,r.phone)).sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||b.ts-a.ts).slice(0,40);
    const pm=pendMembers().filter(m=>qMatch(m.name,m.phone));
    body=adminPushCard()+qBox()+(pm.length?`<div class="sec-h" style="margin-top:6px"><h2>新会员等待核准（${pm.length}）</h2></div><div class="list" style="margin-bottom:18px">${pm.map(m=>`<div class="arow"><div class="tx"><b>${nt(m.name)}</b><span>${esc(m.phone)} · 注册于 ${dt(m.regTs||Date.now())}</span></div><div style="display:flex;gap:6px"><button class="btn sm danger" data-act="rejectMember" data-id="${esc(m.id)}">拒绝</button><button class="btn sm ok" data-act="approveMember" data-id="${esc(m.id)}">核准</button></div></div>`).join('')}</div><div class="sec-h"><h2>兑换 / 赚分 / 续卡 / 课程申请</h2></div>`:'')+(list.length?`<div class="list">${list.map(r=>`<div class="arow"><div class="tx"><b>${({redeem:'兑换',earn:'赚分',renew:'续卡',checkin:'打卡',course:'课程'})[r.type]} · ${nt(r.title)}</b><span>${nt(r.name)} · ${esc(r.phone)} · ${dt(r.ts)}${r.note?' · '+esc(r.note):''}</span></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">${r.type==='renew'?`<span class="sub">${r.total} 次</span>`:r.type==='course'?'<span class="sub">开通课程</span>':`<span class="num ${r.type==='redeem'?'d-minus':'d-plus'}">${r.type==='redeem'?'−':'+'}${fmt(r.points)}</span>`}
      ${r.status==='pending'?`<div style="display:flex;gap:6px"><button class="btn sm danger" data-act="reject" data-id="${esc(r.id)}">拒绝</button><button class="btn sm ok" data-act="approve" data-id="${esc(r.id)}">通过</button></div>`:`<span class="badge ${r.status}">${r.status==='approved'?'已通过':'未通过'}</span>`}</div></div>`).join('')}</div>`:(qOf()?noMatch():'<div class="empty">目前没有待审核的申请。</div>'));
  } else if(adminTab==='branch'){
    body=adminBranch();
  } else if(adminTab==='chart'){
    body=adminChart();
  } else if(adminTab==='rewards'){
    const list=S.rewards.slice().sort((a,b)=>a.points-b.points);
    body=`<button class="btn block" data-act="editReward" style="margin-bottom:12px">${ic('plus',18)} 新增礼物</button>
      ${list.length?`<div class="list">${list.map(r=>`<button class="arow" data-act="editReward" data-id="${esc(r.id)}" style="text-align:left">${ph(r)}<div class="tx"><b>${nt(r.name)}</b><span>${esc(catOf(r.cat).zh)} · <span class="num">${fmt(r.points)}</span> pts${r.stock!=null?' · 库存 '+r.stock:''}${r.active===false?' · 已下架':''}</span></div>${ic('cog',18)}</button>`).join('')}</div>`:'<div class="empty">还没有礼物。按上方按钮添加第一个礼物。</div>'}`;
  } else if(adminTab==='tasks'){
    body=`<button class="btn block" data-act="editTask" style="margin-bottom:12px">${ic('plus',18)} 新增赚分任务</button>
      ${S.tasks.length?`<div class="list">${activeTasksAll().map(t=>`<button class="arow" data-act="editTask" data-id="${esc(t.id)}" style="text-align:left"><span class="ph" style="background:var(--wine-soft);color:var(--wine);display:grid;place-items:center">${ic(t.icon||'star',22)}</span><div class="tx"><b>${nt(nameOf(t))}</b><span><span class="num">+${fmt(t.points)}</span> · ${nt(subOf(t))}${t.active===false?' · 已停用':''}</span></div>${ic('cog',18)}</button>`).join('')}</div>`:'<div class="empty">还没有任务。</div>'}`;
  } else if(adminTab==='members'){
    const q=memberQ.trim().toLowerCase();
    const list=S.members.filter(m=>qMatch(m.name,m.phone)).sort((a,b)=>totalPts(b)-totalPts(a));
    body=`<div class="btnrow" style="justify-content:flex-start;margin-bottom:12px"><button class="btn sm" data-act="exportPdf">导出 PDF 报表</button><button class="btn sm ghost" data-act="exportCsv">导出 Excel</button></div>
    <div style="display:flex;gap:8px;margin-bottom:12px"><div class="qbox" style="flex:1;margin:0">${ic('search',18)}<input class="inp" id="mq" type="search" enterkeyhint="search" autocomplete="off" placeholder="搜索名字或电话" value="${esc(memberQ)}"></div><button class="btn" data-act="editMember">${ic('plus',18)}</button></div>
      ${list.length?`<div class="list">${list.map(m=>`<div class="arow mem"><div class="tx"><b>${nt(m.name)} <span class="tier ${esc(m.tier)}">${esc(m.tier)}</span>${tierInfo(m).manual?' <span class="badge pending">手动</span>':''}${m.pending?' <span class="badge pending">待核准</span>':''}${dpTag(m.phone)}</b><span>${esc(m.phone)} · <span class="num">${fmt(totalPts(m))}</span> pts</span>${(st=>`<span style="display:block">共 ${st.nCards} 张卡 · 累计打卡 ${st.nCheckins} 次${st.last?' · 最近 '+st.last:''}${st.curInfo&&st.curInfo.status==='active'?` · 目前第 ${st.nCards?cardNo(st.cur):0} 张剩 ${st.curInfo.left} 次`:''}${unpaidOf(m.phone)?` · <b style="color:var(--warn)">未付款 ${unpaidOf(m.phone)} 张</b>`:''}</span>`)(memberStats(m))}</div>
        <div class="btnrow"><button class="btn sm ghost" data-act="editMember" data-id="${esc(m.id)}">编辑</button><button class="btn sm ghost" data-act="ncp" data-id="${esc(m.id)}">NCP卡</button><button class="btn sm ghost" data-act="hsheet" data-id="${esc(m.id)}">健康表</button><button class="btn sm ghost" data-act="memberMove" data-id="${esc(m.id)}">换店</button><button class="btn sm" data-act="addPts" data-id="${esc(m.id)}">加/减分</button></div></div>`).join('')}</div>`:(q?noMatch():VIEW.own?'<div class="empty">还没有会员。按 + 新增会员。</div>':'<div class="empty">这家店还没有会员。</div>')}`;
  } else if(adminTab==='notify'){
    const P=S.push||{devices:0,members:0};
    body=`<div class="card"><b style="display:block;font-size:20px;margin-bottom:6px">发公告给全部会员</b>
      <p class="sub" style="margin:0 0 12px"><b class="num">${P.members}</b> 位会员（${P.devices} 部手机）开启了手机通知，会马上收到；其他会员打开 App 时，会在右上角的 🔔 看到。</p>
      <form id="noticeForm"><div class="field"><label for="n_t">标题</label><input class="inp" id="n_t" maxlength="80" placeholder="例如：本周六 Mega 活动"></div>
      <div class="field"><label for="n_b">内容</label><textarea class="inp" id="n_b" rows="4" maxlength="600"></textarea></div>
      <div class="field"><label>照片（选填）</label><div id="nphoto">${noticePhoto?`<img class="nimg" src="/img/${esc(noticePhoto)}" alt="">`:''}</div>
        <div class="btnrow" style="justify-content:flex-start"><label class="btn sm ghost" style="cursor:pointer">${ic('plus',16)} ${noticePhoto?'换一张照片':'加照片'}<input type="file" id="nfile" accept="image/*" hidden></label>${noticePhoto?'<button class="btn sm danger" type="button" data-act="clearNoticePhoto">移除照片</button>':''}</div>
        <p class="sub" style="margin:6px 0 0">Android 和电脑会在通知里直接显示照片；iPhone 的通知只显示文字，点开就能看到照片。</p></div>
      <details style="margin-bottom:12px"><summary class="sub" style="cursor:pointer">English / Bahasa Melayu（选填）</summary>
        <div class="field" style="margin-top:10px"><label for="n_et">标题（English）</label><input class="inp" id="n_et" maxlength="80"></div>
        <div class="field"><label for="n_eb">内容（English）</label><textarea class="inp" id="n_eb" rows="3" maxlength="600"></textarea></div>
        <div class="field"><label for="n_mt">标题（Bahasa Melayu）</label><input class="inp" id="n_mt" maxlength="80"></div>
        <div class="field"><label for="n_mb">内容（Bahasa Melayu）</label><textarea class="inp" id="n_mb" rows="3" maxlength="600"></textarea></div>
        <p class="sub" style="margin:0">选了英文或马来文的会员会收到对应的版本；没填就收到中文。</p></details>
      <button class="btn block" type="submit">发送给全部会员</button></form></div>
      <p class="sub" style="margin:12px 2px">另外，申请通过或被拒绝、NCP 卡只剩 2 次和用完的时候，系统会自动通知那位会员。</p>
      <div class="sec-h" style="margin-top:18px"><h2>已发的公告</h2></div>
      ${(S.bcasts||[]).length?`<div class="list">${S.bcasts.map(n=>`<div class="arow"><div class="tx"><b>${nt(n.title)}</b><span style="white-space:normal">${nt(n.body||'')}</span>${n.photo?`<img class="nimg" src="/img/${esc(n.photo)}" alt="" loading="lazy" style="max-height:160px;object-fit:cover">`:''}<span style="display:block">${fmtTs(n.ts)}</span></div><button class="btn sm danger" data-act="delNotice" data-id="${esc(n.id)}">删除</button></div>`).join('')}</div>`:'<div class="empty">还没有发过公告。</div>'}`;
  } else if(adminTab==='stats'){
    const days=dailyStats(), t=dailyStats(today(),today())[0];
    const maxN=Math.max(1,...days.map(d=>d.n));
    const sum=days.reduce((a,d)=>({n:a.n+d.n,pts:a.pts+d.pts}),{n:0,pts:0});
    const uniq=new Set(S.checkins.filter(x=>x.date>=days[0].date&&x.date<=days[days.length-1].date).map(x=>x.phone)).size;
    body=`<div class="stat-tiles"><div><span class="num big">${t.n}</span><span class="sub">今天打卡人次</span></div><div><span class="num big">${t.u}</span><span class="sub">今天打卡人数</span></div></div>
    <div class="chips" style="margin-top:14px">${[7,30,90].map(n=>`<button class="chip ${statRange===n?'on':''}" data-act="statRange" data-v="${n}">最近 ${n} 天</button>`).join('')}<button class="chip ${statRange===0?'on':''}" data-act="statRange" data-v="0">自己选日期</button></div>
    ${statRange===0?`<div class="row2" style="margin-bottom:12px"><div class="field" style="margin:0"><label for="sFrom">从</label><input class="inp" type="date" id="sFrom" value="${esc(rangeOf().from)}" max="${today()}"></div><div class="field" style="margin:0"><label for="sTo">到</label><input class="inp" type="date" id="sTo" value="${esc(rangeOf().to)}" max="${today()}"></div></div>`:''}
    <div class="card"><div class="sub" style="margin-bottom:8px">${days[0].date} 至 ${days[days.length-1].date}（${days.length} 天）：共 <b class="num">${sum.n}</b> 人次 · <b class="num">${uniq}</b> 位不同会员 · 平均每天 <b class="num">${(sum.n/days.length).toFixed(1)}</b> 人次<br>${howTag('qr')} <b class="num">${days.reduce((a,d)=>a+d.self,0)}</b> 次　${howTag('staff')} <b class="num">${days.reduce((a,d)=>a+d.staff,0)}</b> 次<br><span style="font-size:14px">${HOW_LEGEND}</span></div>
      <div class="bars ${days.length>14?'many':''}" style="--cols:${days.length}">${days.map(d=>`<div class="bar-col" title="${d.date}：${d.n} 人次 / ${d.u} 人"><span class="bar-v">${d.n||''}</span><i style="height:${Math.round(d.n/maxN*100)}%"></i></div>`).join('')}</div>
      <div class="bar-x"><span>${days[0].date.slice(5)}</span><span>${days[days.length-1].date.slice(5)}</span></div></div>
    <div class="btnrow" style="justify-content:flex-start;margin:14px 0"><button class="btn sm" data-act="exportDailyPdf">导出 PDF</button><button class="btn sm ghost" data-act="exportDailyCsv">导出 Excel</button></div>
    <p class="sub" style="margin:-6px 0 12px">PDF 和 Excel 都包含每一次打卡的明细。${HOW_LEGEND}</p>
    <div class="card" style="padding:4px 14px"><div class="hist" style="font-weight:700;font-size:15px"><span style="flex:1">日期</span><span style="width:46px;text-align:right">人次</span><span style="width:56px;text-align:right">${howTag('qr')}</span><span style="width:56px;text-align:right">${howTag('staff')}</span><span style="width:46px;text-align:right">人数</span></div>
      ${days.slice().reverse().map(d=>`<div class="hist"><span style="flex:1;white-space:nowrap">${d.date.slice(5)} ${'日一二三四五六'[new Date(parseD(d.date)).getDay()]}</span><span class="num" style="width:46px;text-align:right">${d.n}</span><span class="num" style="width:56px;text-align:right">${d.self}</span><span class="num" style="width:56px;text-align:right;color:${d.staff?'var(--warn)':'inherit'}">${d.staff}</span><span class="num" style="width:46px;text-align:right">${d.u}</span></div>`).join('')}</div>`;
  } else if(adminTab==='report'){
    body=adminReport();
  } else if(adminTab==='course'){
    body=adminCourse();
  } else if(adminTab==='health'){
    body=adminHealth();
  } else if(adminTab==='cards'){
    const unpaidN=S.cards.filter(c=>!c.paid).length;
    const rows=S.cards.filter(c=>cardFilter!=='unpaid'||!c.paid).map(c=>({c,k:cardInfo(c),m:S.members.find(x=>x.phone===c.phone)})).filter(r=>qMatch(r.m?r.m.name:'',r.c.phone)).sort((a,b)=>(a.k.status==='active'?0:1)-(b.k.status==='active'?0:1)||a.k.left-b.k.left);
    const todayN=S.checkins.filter(x=>x.date===today()).length;
    const st=S.settings||{}; const link=qrLink();
    const qrPanel=`<div class="card" style="margin-bottom:14px">
      <div class="field"><label for="qm">打卡方式</label><select class="inp" id="qm">
        <option value="fixed" ${qrMode()==='fixed'?'selected':''}>扫码打卡 · 固定二维码（打印贴在店里）</option>
        <option value="daily" ${qrMode()==='daily'?'selected':''}>扫码打卡 · 二维码每天自动更换</option>
        <option value="off" ${qrMode()==='off'?'selected':''}>不用扫码 · 顾客在 App 里直接打卡</option></select></div>
      ${qrMode()==='off'?'':!st.qrKey?`<button class="btn block" data-act="qrInit">生成打卡二维码</button>`:
      `<div class="qrwrap"><div class="qrbox" id="qrbox"></div>
       <div class="sub">${qrMode()==='daily'?`今天（${today()}）的二维码，明天会自动更换。请每天放在柜台给顾客扫。`:'固定二维码，打印一次就可以一直用。'}</div>
       <div class="btnrow" style="justify-content:center"><button class="btn sm" data-act="qrSave">下载二维码海报</button><button class="btn sm ghost" data-act="qrReset">作废并重新生成</button></div></div>`}
    </div>`;
    body=qrPanel+`<p class="sub" style="margin:-4px 0 12px">今天共有 <b class="num">${todayN}</b> 人次打卡。开新卡请到「会员」按「NCP卡」。</p>
    <div class="chips"><button class="chip ${cardFilter==='all'?'on':''}" data-act="cardFilter" data-v="all">全部卡 ${S.cards.length}</button><button class="chip ${cardFilter==='unpaid'?'on':''}" data-act="cardFilter" data-v="unpaid">未付款 ${unpaidN}</button></div>
    ${qBox()}${rows.length?`<div class="list">${rows.map(({c,k,m})=>`<button class="arow" data-act="ncp" data-id="${esc(m?m.id:'')}" style="text-align:left"><div class="tx"><b>${nt(m?m.name:c.phone)} · 第 ${cardNo(c)} 张 · ${esc(c.name)}</b><span style="display:block;margin:2px 0">${payTag(c)}</span><span>剩 <span class="num">${k.left}</span> / ${+c.total||0} 次${k.daysLeft!=null?' · 剩 '+k.daysLeft+' 天':''}${k.todayN?' · 今天打了 '+k.todayN+' 次':''}</span></div><span class="badge ${{active:'approved',done:'pending',expired:'rejected'}[k.status]}">${{active:'进行中',done:'已用完',expired:'已过期'}[k.status]}</span></button>`).join('')}</div>`:qOf()?noMatch():'<div class="empty">还没有 NCP 卡。到「会员」为会员开卡。</div>'}`;
  } else {
    const st=S.settings||{};
    const B=brand();
    body=`<div class="card" style="margin-bottom:14px"><b style="display:block;margin-bottom:4px;font-size:20px">会员注册二维码</b>
      <p class="sub" style="margin:0 0 10px">新顾客用手机相机扫这个二维码，就会打开注册页面。注册后要你在「审核」核准。</p>
      <div class="qrwrap"><div class="qrbox" id="joinbox"></div>
      <div class="sub" style="word-break:break-all">${esc(joinLink())}</div>
      <div class="btnrow" style="justify-content:center"><button class="btn sm" data-act="joinPoster">下载注册海报</button><button class="btn sm ghost" data-act="joinCopy">复制注册链接</button></div></div></div>
    <form id="brandForm" class="card" style="margin-bottom:14px"><b style="display:block;margin-bottom:10px;font-size:20px">俱乐部资料</b>
      <div class="field"><label>Logo / App 图标（正方形效果最好）</label><div class="uploader"><img src="${logoUrl()}" alt="" style="width:84px;height:84px;border-radius:18px;flex:none">
        <div style="display:flex;flex-direction:column;gap:6px"><label class="btn sm ghost" for="lfile">上传 Logo</label><input type="file" id="lfile" accept="image/*" hidden>${st.logo?'<button type="button" class="btn sm danger" data-act="clearLogo">改回默认图标</button>':''}</div></div></div>
      <div class="field"><label for="b_n">俱乐部名称</label><input class="inp" id="b_n" value="${esc(B.name)}"></div>
      <div class="field"><label for="b_s">副标题（显示在名称下面）</label><input class="inp" id="b_s" value="${esc(B.sub)}"></div>
      <div class="field"><label for="b_sh">手机主画面上的短名称（建议 12 个字以内）</label><input class="inp" id="b_sh" maxlength="20" value="${esc(B.short)}"></div>
      <div class="field"><label for="b_addr">店的地址（会员在首页看得到；店搬了，在这里改就好）</label><textarea class="inp" id="b_addr" rows="2" maxlength="200">${esc(st.address||'')}</textarea></div>
      <button class="btn block" type="submit">保存俱乐部资料</button></form>
    <form id="homeForm" class="card"><b style="display:block;margin-bottom:10px;font-size:20px">首页横幅</b><div class="field"><label>横幅照片（建议横向 16:9）</label><div class="uploader wide"><div class="ph" id="hp">${imgSrc(st)?`<img src="${esc(imgSrc(st))}" alt="">`:ic('upload',26)}</div>
      <div style="display:flex;flex-direction:column;gap:6px"><label class="btn sm ghost" for="hfile">上传照片</label><input type="file" id="hfile" accept="image/*" hidden>${imgSrc(st)?'<button type="button" class="btn sm danger" data-act="clearHomePhoto">移除照片</button>':''}</div></div></div>
      <div class="field"><label for="h_e">小标题</label><input class="inp" id="h_e" value="${esc(st.eyebrow||'')}"></div>
      <div class="field"><label for="h_t">标题（按 Enter 换行）</label><textarea class="inp" id="h_t" rows="2" style="min-height:0">${esc(st.title||'')}</textarea></div>
      <div class="field"><label for="h_s">说明</label><textarea class="inp" id="h_s">${esc(st.sub||'')}</textarea></div>
      <div class="row2"><div class="field"><label for="h_ten">标题（English）</label><textarea class="inp" id="h_ten" rows="2" style="min-height:0">${esc(st.title_en||'')}</textarea></div>
      <div class="field"><label for="h_tms">标题（Bahasa Melayu）</label><textarea class="inp" id="h_tms" rows="2" style="min-height:0">${esc(st.title_ms||'')}</textarea></div></div>
      <div class="row2"><div class="field"><label for="h_sen">说明（English）</label><input class="inp" id="h_sen" value="${esc(st.sub_en||'')}"></div>
      <div class="field"><label for="h_sms">说明（Bahasa Melayu）</label><input class="inp" id="h_sms" value="${esc(st.sub_ms||'')}"></div></div>
      <div class="field"><label for="h_terms">兑换须知（一行一条）</label><textarea class="inp" id="h_terms" rows="6">${esc(termsText())}</textarea></div>
      <button class="btn block" type="submit">保存首页</button></form>`;
  }
  if((adminTab==='rewards'||adminTab==='tasks')&&followOn(adminTab)) body=`<div class="note-hq"><span>${adminTab==='rewards'?'礼物':'任务'}现在跟上线：</span>${nt(followFrom(adminTab))}<br><span>要自己设，到「分店」→「本店设定」改成「自己设」。</span></div>`+body;
  return `<div class="sec-h"><h2 style="font-family:var(--f-display);font-size:30px">管理后台</h2><button class="link" data-act="adminLogout">退出管理</button></div>
  ${branchBar()}
  <div class="seg">${tabs.map(([k,l])=>`<button class="${adminTab===k?'on':''}" data-act="atab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
}
const activeTasksAll=()=>S.tasks.slice().sort((a,b)=>(a.order??0)-(b.order??0));


/* ---------- branches (分店) ---------- */
const ROLE_NAME={manager:'店长',operator:'操作员'};
const shopName=id=>(TREE.find(b=>b.id===id)||{}).name||(id==='hq'?'总店':'分店');
// Branches in tree order with their depth (own branch first).
function treeRows(){ const root=TREE.find(b=>!b.parent); if(!root) return []; const out=[];
  const walk=(b,d)=>{ out.push({...b,depth:d}); TREE.filter(x=>x.parent===b.id).sort((a,c)=>(a.created||0)-(c.created||0)).forEach(x=>walk(x,d+1)); };
  walk(root,0); return out; }
// Who is signed in, which branch is shown, and a picker for branches below.
function branchBar(){
  const who=STAFF?`${nt(STAFF.name)} · <span>${ROLE_NAME[STAFF.role]||''}</span> · ${nt(shopName(STAFF.branch))}`:'';
  const rows=treeRows();
  const pick=rows.length>1?`<label class="vpick"><span>正在看</span><select id="vsel" translate="no">${rows.map(r=>`<option value="${esc(r.id)}"${r.id===VIEW.branch?' selected':''}>${'— '.repeat(r.depth)}${esc(r.name)}${r.depth?'':' ★'}</option>`).join('')}</select></label>`:'';
  const ro=VIEW.own?'':`<div class="robanner">${ic('lock',18)}<span><span>这是下线分店，你只能看，不能改：</span>${nt(shopName(VIEW.branch))}</span></div>`;
  return `<div class="vbar"><div class="sub">${who}</div>${pick}</div>${ro}`;
}
function adminBranch(){
  const mgr=STAFF&&STAFF.role==='manager';
  const meCard=`<div class="card" style="margin-bottom:14px"><b style="display:block;font-size:20px;margin-bottom:4px">我的账号</b>
    <div class="sub">${nt(STAFF.name)} · <span>${ROLE_NAME[STAFF.role]}</span> · ${nt(shopName(STAFF.branch))}${STAFF.phone?' · '+esc(STAFF.phone):''}</div>
    ${STAFF.owner?'<p class="sub" style="margin:6px 0 0">你用总店的后台密码登入。可以在下面为自己新增一个店长账号，用手机号码登入。</p>':`<div class="btnrow" style="justify-content:flex-start;margin-top:8px"><button class="btn sm ghost" data-act="myPw">改我的密码</button></div>`}</div>`;
  const own=VIEW.own&&mgr;
  const staffCard=`<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px"><b style="font-size:20px"><span>管理员</span> · ${nt(shopName(VIEW.branch))}</b>${own?'<button class="btn sm" data-act="staffEdit">+ 新增</button>':''}</div>
    <p class="sub" style="margin:0 0 8px">店长什么都能改，也可以开下线分店；操作员只能核准和打卡。每个人用自己的手机号码和密码登入。</p>
    <div class="list">${VIEW.branch==='hq'?`<div class="arow"><div style="flex:1"><b>总店老板</b><div class="sub">用 Cloudflare 里的后台密码登入（电话留空）</div></div><span class="badge approved">店长</span></div>`:''}
    ${STAFFS.map(x=>`<div class="arow"><div style="flex:1;min-width:0"><b>${nt(x.name)}</b><div class="sub">${esc(x.phone)}</div></div><span class="badge ${x.role==='manager'?'approved':'pending'}">${ROLE_NAME[x.role]}</span>
      ${own?`<div class="btnrow"><button class="btn sm ghost" data-act="staffEdit" data-id="${esc(x.id)}">修改</button>${STAFF.id!==x.id?`<button class="btn sm danger" data-act="staffDel" data-id="${esc(x.id)}">删除</button>`:''}</div>`:''}</div>`).join('')||(VIEW.branch==='hq'?'':'<div class="empty">还没有管理员。</div>')}</div></div>`;
  const rows=treeRows();
  const setCard=branchSettingsCard();
  const treeCard=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px"><b style="font-size:20px">分店图</b>${mgr?'<button class="btn sm" data-act="branchAdd">+ 开新分店</button>':''}</div>
    <p class="sub" style="margin:0 0 8px">你的店和下线分店。点店名可以看那家店的资料（下线只能看，不能改）。</p>
    <div class="tree">${rows.map(r=>`<div class="brow" style="--d:${r.depth}"><img src="/icon-64.png?${r.id!=='hq'?'b='+esc(r.id)+'&':''}v=${esc(r.logo||'d')}" alt="" width="32" height="32">
      <div class="tinfo"><button class="link tname" data-act="shopView" data-id="${esc(r.id)}" translate="no">${esc(r.name)}</button><span class="sub">${r.members} 位会员${r.id===VIEW.branch?' · <b>正在看</b>':''}</span></div>
      ${mgr&&r.depth>0?`<button class="btn sm ghost" data-act="branchMove" data-id="${esc(r.id)}">换上线</button>`:''}</div>`).join('')}</div></div>`;
  return meCard+setCard+staffCard+treeCard;
}
function staffForm(id){
  const x=id?STAFFS.find(s=>s.id===id):null;
  openSheet(`<h3>${x?'修改管理员':'新增管理员'}</h3><form id="stf" data-id="${esc(x?x.id:'')}">
    <div class="field"><label for="st_n">名字</label><input class="inp" id="st_n" value="${esc(x?x.name:'')}"></div>
    <div class="field"><label for="st_p">手机号码（用来登入）</label><input class="inp" id="st_p" inputmode="tel" value="${esc(x?x.phone:'')}"${x?' readonly':''}></div>
    <div class="field"><label for="st_r">身份</label><select class="inp" id="st_r"><option value="manager"${!x||x.role==='manager'?' selected':''}>店长：什么都能改</option><option value="operator"${x&&x.role==='operator'?' selected':''}>操作员：只能核准和打卡</option></select></div>
    <div class="field"><label for="st_w">${x?'新密码（不改就留空）':'密码（至少 6 个字）'}</label><input class="inp" id="st_w" type="text" autocomplete="off"></div>
    <p class="sub" style="margin:0 0 10px">请把手机号码和密码告诉他。他到「店家登入」输入就可以进后台。</p>
    <button class="btn block" type="submit">保存</button></form>`);
}
function branchAddForm(){
  openSheet(`<h3>开新分店</h3><p class="sub" style="margin:-6px 0 10px"><span>新分店会开在这家店下面：</span>${nt(shopName(STAFF.branch))}<br><span>分店的会员、积分、打卡都归那家店。</span></p><form id="brf">
    <div class="field"><label for="br_n">分店名称</label><input class="inp" id="br_n" placeholder="例如 Cheras 分店"></div>
    <div class="field"><label for="br_mn">店长名字</label><input class="inp" id="br_mn"></div>
    <div class="field"><label for="br_mp">店长手机号码（用来登入）</label><input class="inp" id="br_mp" inputmode="tel"></div>
    <div class="field"><label for="br_mw">店长密码（至少 6 个字）</label><input class="inp" id="br_mw" type="text" autocomplete="off"></div>
    <p class="sub" style="margin:0 0 10px">店长用这个手机号码和密码在「店家登入」进后台，可以改自己的店名、Logo、打卡二维码，也可以再开下线分店。</p>
    <button class="btn block" type="submit">开店</button></form>`);
}
function branchMoveForm(id){
  const rows=treeRows(), b=rows.find(r=>r.id===id); if(!b) return;
  const under=new Set([id]); let grow=true; while(grow){ grow=false; for(const r of rows) if(r.parent&&under.has(r.parent)&&!under.has(r.id)){ under.add(r.id); grow=true; } }
  const opts=rows.filter(r=>!under.has(r.id));
  openSheet(`<h3><span>换上线</span> · ${nt(b.name)}</h3><p class="sub" style="margin:-6px 0 10px"><span>现在的上线：</span>${nt(shopName(b.parent))}<br>换了之后，它的会员、积分、设定都不变，它下面的分店也跟着一起。新的上线可以看它的资料（只能看，不能改）。</p>
    <form id="mvf" data-id="${esc(id)}"><div class="field"><label for="mv_to">新的上线</label><select class="inp" id="mv_to" translate="no">${opts.map(r=>`<option value="${esc(r.id)}"${r.id===b.parent?' selected':''}>${'— '.repeat(r.depth)}${esc(r.name)}</option>`).join('')}</select></div>
    <button class="btn block" type="submit">确定换上线</button></form>`);
}
function myPwForm(){
  openSheet(`<h3>改我的密码</h3><form id="mpf"><div class="field"><label for="mp1">新密码（至少 6 个字）</label><input class="inp" id="mp1" type="password" autocomplete="new-password"></div>
    <div class="field"><label for="mp2">再输入一次</label><input class="inp" id="mp2" type="password" autocomplete="new-password"></div><button class="btn block" type="submit">保存</button></form>`);
}
// What a person may press in the back office: downline branches are view-only; operators approve and check in.
const VIEW_ACTS=new Set(['viewTier','viewCards','chartShop','photoView','chartMode','atab','go','back','close','adminLogout','cardFilter','courseFilter','coursePreview','csheet','hsheet','healthPdf','ncp','backNcp','exportCsv','exportDailyCsv','exportDailyPdf','exportPdf','repDay','repPdf','statRange','joinCopy','joinPoster','shopView','myPw','sfNext']);
const OP_ACTS=new Set(['approve','reject','approveMember','rejectMember','staffCheckin','checkin','undoCheckin','courseOpen','editScan','editProfile','delScan']);
const HQ_ACTS=new Set(['editReward','delReward','editTask','delTask']);
const followOn=k=>!!(S.rules&&S.rules.follow&&S.rules.follow[k]&&S.rules.follow[k].on);
const followFrom=k=>(S.rules&&S.rules.follow&&S.rules.follow[k]&&S.rules.follow[k].from)||'';
function adminActWhy(a){
  if(!isAdmin||view!=='admin'||VIEW_ACTS.has(a)) return '';
  if(a==='branchAdd'||a==='branchMove'||a==='profileEdit'||a==='profDel'||a==='profAvaDel') return STAFF&&STAFF.role==='manager'?'':'操作员不能做这个，请找店长';
  if(!VIEW.own) return '这是下线分店，只能看，不能改';
  if(isOperator()&&!OP_ACTS.has(a)) return '操作员不能做这个，请找店长';
  if(HQ_ACTS.has(a)&&followOn(/Reward/.test(a)?'rewards':'tasks')) return '现在跟上线，要先到「分店」改成「自己设」';
  return '';
}
const OP_FORMS=['sf','pfm','mpf'], ANY_FORMS=['mpf','adminForm','loginForm','pinForm','regForm','setPinForm'];
function adminFormWhy(id){
  if(!isAdmin||view!=='admin'||ANY_FORMS.includes(id)) return '';
  if(id==='brf'||id==='mvf'||id==='prf') return STAFF&&STAFF.role==='manager'?'':'操作员不能做这个，请找店长';
  if((id==='sf'||id==='pfm')&&!hFor) return '';
  if(!VIEW.own) return '这是下线分店，只能看，不能改';
  if(isOperator()&&!OP_FORMS.includes(id)) return '操作员不能做这个，请找店长';
  return '';
}
// Hide what cannot be used, so nobody presses a button that will be refused.
function lockAdmin(){
  if(!isAdmin||view!=='admin') return;
  document.querySelectorAll('#app [data-act], #layer [data-act]').forEach(el=>{ if(adminActWhy(el.dataset.act)) el.style.display='none'; });
  document.querySelectorAll('#app form, #layer form').forEach(f=>{ if(adminFormWhy(f.id)){ f.querySelectorAll('input,select,textarea').forEach(i=>i.disabled=true); f.querySelectorAll('button[type=submit],label.btn').forEach(x=>x.style.display='none'); } });
  if(!VIEW.own||isOperator()) ['qm','lfile','hfile','nfile'].forEach(id=>{ const el=document.getElementById(id); if(el) el.disabled=true; });
}

/* ---------- each branch's own settings (stage 2) ---------- */
const FOLLOW_ROWS=[['rewards','礼物'],['tasks','赚分任务'],['notices','公告'],['tiers','等级规则'],['cards','卡种和天数']];
function branchSettingsCard(){
  const F=(S.rules&&S.rules.follow)||{}, hq=VIEW.branch==='hq', can=VIEW.own&&STAFF&&STAFF.role==='manager';
  const rows=FOLLOW_ROWS.map(([k,l])=>{ const f=F[k]||{}, on=!hq&&f.on;
    const state=on?`<span class="badge pending">跟上线</span> ${k==='notices'?'':nt(f.from)}`:'<span class="badge approved">自己设</span>';
    const tog=!hq&&can?`<button class="btn sm ghost" data-act="followSet" data-id="${k}" data-v="${on?'0':'1'}">${on?'改成自己设':'改成跟上线'}</button>`:'';
    const edit=(k==='tiers'||k==='cards')?`<button class="btn sm ghost" data-act="${k==='tiers'?'viewTier':'viewCards'}">${!on&&can?'编辑':'看看'}</button>`:'';
    return `<div class="arow"><div style="flex:1;min-width:0"><b>${l}</b><div class="sub">${state}</div></div><div class="btnrow">${edit}${tog}</div></div>`; }).join('');
  return `<div class="card" style="margin-bottom:14px"><b style="display:block;font-size:20px;margin-bottom:4px"><span>本店设定</span> · ${nt(shopName(VIEW.branch))}</b>
    <p class="sub" style="margin:0 0 8px">${hq?'总店没有上线，全部自己设。下线分店可以选择跟你一样。':'「跟上线」：上线改了，这里也跟着变。「自己设」：从上线现在的样子复制一份，之后自己改。公告选「跟上线」时，会员也会看到上线的公告。'}</p>
    <div class="list">${rows}</div></div>`;
}
const TIER_ZH={Silver:'银卡',Gold:'金卡',Platinum:'白金卡'};
function tierForm(){
  const R=RULE(), can=VIEW.own&&STAFF&&STAFF.role==='manager'&&!followOn('tiers'), dis=can?'':' disabled';
  openSheet(`<h3>等级规则</h3><p class="sub" style="margin:-6px 0 10px">${followOn('tiers')?'<span>现在跟上线：</span>'+nt(followFrom('tiers'))+'<br>':''}每张卡有「等级分」（在「卡种和天数」里设）。会员累计的等级分超过门槛就升级。</p>
   <form id="tierf"><div class="row2"><div class="field"><label for="tr_g">等级分超过几分升 Gold</label><input class="inp num" id="tr_g" type="number" min="0" value="${R.gold}"${dis}></div>
   <div class="field"><label for="tr_p">超过几分升 Platinum</label><input class="inp num" id="tr_p" type="number" min="0" value="${R.platinum}"${dis}></div></div>
   <b style="display:block;margin:6px 0">每次打卡加几分</b>
   <div class="row3">${['Silver','Gold','Platinum'].map(k=>`<div class="field"><label for="tr_${k}">${k} · ${TIER_ZH[k]}</label><input class="inp num" id="tr_${k}" type="number" min="0" value="${R.pts[k]}"${dis}></div>`).join('')}</div>
   ${can?'<button class="btn block" type="submit">保存</button>':''}</form>`);
}
let typeDraft=null;
const MODE_ZH={count:'有次数',unl:'不限次（自动加分）',daily:'不限次（每次要核准，像 Daily Pass）'};
function cardTypesForm(keepDraft){
  const can=VIEW.own&&STAFF&&STAFF.role==='manager'&&!followOn('cards'), dis=can?'':' disabled';
  if(!keepDraft) typeDraft=cardTypes().map(t=>({...t}));
  openSheet(`<h3>卡种和天数</h3><p class="sub" style="margin:-6px 0 10px">${followOn('cards')?'<span>现在跟上线：</span>'+nt(followFrom('cards'))+'<br>':''}开卡和会员续卡时，可以选这些卡。有效天数留空 = 不限期。</p>
   <form id="ctf">${typeDraft.map((t,i)=>`<div class="card" style="padding:12px 14px;margin-bottom:10px">
     <div class="field"><label for="ct_n${i}">卡名称</label><input class="inp" id="ct_n${i}" value="${esc(t.n)}" placeholder="例如 运动卡 20 天"${dis}></div>
     <div class="field"><label for="ct_m${i}">打卡次数</label><select class="inp" id="ct_m${i}"${dis}>${Object.keys(MODE_ZH).map(k=>`<option value="${k}"${t.mode===k?' selected':''}>${MODE_ZH[k]}</option>`).join('')}</select></div>
     <div class="row3"><div class="field"><label for="ct_t${i}">次数</label><input class="inp num" id="ct_t${i}" type="number" min="1" value="${t.total||''}"${dis}></div>
     <div class="field"><label for="ct_d${i}">有效天数</label><input class="inp num" id="ct_d${i}" type="number" min="1" value="${t.days||''}"${dis}></div>
     <div class="field"><label for="ct_w${i}">等级分</label><input class="inp num" id="ct_w${i}" type="number" min="0" value="${+t.tw||0}"${dis}></div></div>
     ${can&&typeDraft.length>1?`<button type="button" class="btn sm danger" data-act="typeDel" data-v="${i}">删除这种卡</button>`:''}</div>`).join('')}
   ${can?'<button type="button" class="btn block ghost" data-act="typeAdd" style="margin-bottom:10px">+ 加一种卡</button><button class="btn block" type="submit">保存</button>':''}</form>`);
}
function readTypes(){ return typeDraft.map((t,i)=>{ const g=x=>(document.getElementById(x+i)||{}).value; return {...t,n:(g('ct_n')||'').trim(),mode:g('ct_m'),total:+g('ct_t')||null,days:+g('ct_d')||null,tw:+g('ct_w')||0}; }); }
function memberMoveForm(phone){
  const m=S.members.find(x=>x.phone===phone); if(!m) return;
  const opts=(S.allBranches||[]).filter(b=>b.id!==VIEW.branch);
  openSheet(`<h3><span>换店</span> · ${nt(m.name)}</h3><p class="sub" style="margin:-6px 0 10px">会员的积分、卡、打卡记录、健康表都会一起带过去。转出后，这位会员就归新的店，你这里看不到了。</p>
   ${opts.length?`<form id="mmf" data-id="${esc(phone)}"><div class="field"><label for="mm_to">转到哪一家店</label><select class="inp" id="mm_to" translate="no">${opts.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select></div>
   <button class="btn block" type="submit">确定换店</button></form>`:'<div class="empty">还没有其他分店。</div>'}`);
}

/* ---------- branch chart (all shops) and shop profiles (stage 3) ---------- */
const imgUrl=id=>'/img/'+encodeURIComponent(id);
const chartLogo=b=>`/icon-128.png?${b.id!=='hq'?'b='+encodeURIComponent(b.id)+'&':''}v=${encodeURIComponent(b.logo||'d')}`;
function chartRows(){ const all=S.chart||[], out=[]; const root=all.find(b=>!b.parent)||all.find(b=>b.id==='hq'); if(!root) return out;
  const walk=(b,d)=>{ out.push({...b,depth:d}); all.filter(x=>x.parent===b.id).sort((a,c)=>(a.created||0)-(c.created||0)).forEach(x=>walk(x,d+1)); }; walk(root,0); return out; }
// Org-chart style: head office on top, lines down to each layer of branches, one colour per layer.
let chartMode='tree';
function orgTree(){ const all=S.chart||[], mine=STAFF&&STAFF.branch; const root=all.find(b=>!b.parent)||all.find(b=>b.id==='hq'); if(!root) return '';
  const kids=id=>all.filter(x=>x.parent===id).sort((a,c)=>(a.created||0)-(c.created||0));
  const node=(b,d)=>{ const ch=kids(b.id);
    return `<li><button class="onode d${d%5}${b.id===mine?' mine':''}" data-act="chartShop" data-id="${esc(b.id)}">${b.avatar?`<img class="ava" src="${imgUrl(b.avatar)}" alt="" width="48" height="48">`:`<img src="${chartLogo(b)}" alt="" width="34" height="34">`}<b translate="no">${esc(b.name)}</b>${b.managers.length?`<small translate="no">${esc(b.managers.join('、'))}</small>`:''}</button>${ch.length?`<ul>${ch.map(x=>node(x,d+1)).join('')}</ul>`:''}</li>`; };
  return `<div class="org"><div class="org-in"><ul class="org-root">${node(root,0)}</ul></div></div>`; }
function adminChart(){
  const rows=chartRows(), mine=STAFF&&STAFF.branch;
  const list=`<div class="chart">${rows.map(b=>`<button class="cnode${b.id===mine?' mine':''}" data-act="chartShop" data-id="${esc(b.id)}" style="--d:${b.depth}">
    <img src="${b.avatar?imgUrl(b.avatar):chartLogo(b)}" alt="" width="48" height="48"${b.avatar?' class="ava"':''}><span class="cn-t"><b translate="no">${esc(b.name)}</b>
    <span class="sub">${b.managers.length?`<span>店长</span> ${nt(b.managers.join('、'))}`:''}${b.shop.length+b.bna.length?` · ${ic('camera',14)} ${b.shop.length+b.bna.length}`:''}</span></span>${b.id===mine?'<span class="badge approved">我的店</span>':''}</button>`).join('')}</div>`;
  return `<p class="sub" style="margin:-4px 0 12px"><span>所有分店和店长，每位店长都看得到（没有会员资料）。点一家店看它的介绍和照片。</span><br><span>一共</span> <b>${rows.length}</b> <span>家店</span></p>
  ${STAFF&&STAFF.role==='manager'?`<button class="btn block" data-act="profileEdit" style="margin-bottom:12px">${ic('camera',18)} 编辑我的店的介绍和照片</button>`:''}
  <div class="chips" style="margin-bottom:10px"><button class="chip ${chartMode==='tree'?'on':''}" data-act="chartMode" data-v="tree">组织图</button><button class="chip ${chartMode==='list'?'on':''}" data-act="chartMode" data-v="list">列表</button></div>
  ${chartMode==='tree'?orgTree()+'<p class="sub" style="text-align:center;margin:6px 0 0">分店多的时候，可以左右滑动看完整的图。金色框是你的店。</p>':list}`;
}
function gallery(ids,label){ return ids.length?`<b style="display:block;margin:14px 0 6px">${label}</b><div class="gal">${ids.map(id=>`<button class="gph" data-act="photoView" data-id="${esc(id)}"><img src="${imgUrl(id)}" alt="" loading="lazy"></button>`).join('')}</div>`:''; }
let chartReturn=null;
function chartShopSheet(id){
  const b=(S.chart||[]).find(x=>x.id===id); if(!b) return; const up=(S.chart||[]).find(x=>x.id===b.parent);
  openSheet(`<div class="prof-h">${b.avatar?`<img class="ava" src="${imgUrl(b.avatar)}" alt="" width="72" height="72">`:''}<img src="${chartLogo(b)}" alt="" width="${b.avatar?44:72}" height="${b.avatar?44:72}"${b.avatar?' style="width:44px;height:44px;align-self:flex-end;margin-left:-26px;border:2px solid var(--surface)"':''}><div><h3 style="margin:0" translate="no">${esc(b.name)}</h3>
     ${b.managers.length?`<div class="sub"><span>店长</span> ${nt(b.managers.join('、'))}</div>`:''}${up?`<div class="sub"><span>上线</span> ${nt(up.name)}</div>`:''}</div></div>
   ${b.address?`<a class="shopaddr" style="margin:12px 0 0" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}" target="_blank" rel="noopener">${ic('pin',18)}<span translate="no">${esc(b.address)}</span></a>`:''}
   ${b.intro?`<p style="white-space:pre-line;margin:12px 0 0" translate="no">${esc(b.intro)}</p>`:''}
   ${gallery(b.shop,'店面照片')}${gallery(b.bna,'店长的前后对比照')}
   ${!b.intro&&!b.shop.length&&!b.bna.length?'<div class="empty" style="margin-top:12px">这家店还没有放介绍和照片。</div>':''}`);
  chartReturn=id;
}
function photoSheet(id){ openSheet(`<div style="text-align:center"><img src="${imgUrl(id)}" alt="" style="max-width:100%;max-height:75vh;border-radius:12px"></div>${chartReturn?`<button class="btn block ghost" data-act="chartShop" data-id="${esc(chartReturn)}" style="margin-top:12px">${ic('back',18)} 返回</button>`:''}`); }
let profDraft=null;
const PROF_MAX={shop:5,bna:5};
function profileForm(keep){
  const b=(S.chart||[]).find(x=>x.id===STAFF.branch)||{intro:'',shop:[],bna:[]};
  if(!keep) profDraft={intro:b.intro||'',shop:[...(b.shop||[])],bna:[...(b.bna||[])],avatar:b.avatar||null};
  const grid=k=>`<div class="gal edit">${profDraft[k].map((id,i)=>`<div class="gph"><img src="${imgUrl(id)}" alt=""><button type="button" class="gx" data-act="profDel" data-id="${k}" data-v="${i}" aria-label="删除">✕</button></div>`).join('')}
     ${profDraft[k].length<PROF_MAX[k]?`<label class="gph add" for="pf_${k}">${ic('plus',22)}<span>加照片</span></label><input type="file" id="pf_${k}" data-k="${k}" accept="image/*" multiple hidden>`:''}</div>`;
  openSheet(`<h3>编辑我的店的介绍和照片</h3><p class="sub" style="margin:-6px 0 10px">所有店长都看得到。店名、Logo、地址在「首页」→「俱乐部资料」改。</p>
   <form id="prf"><b style="display:block;margin:0 0 6px">店长头像 <span class="sub">（店长图上会用这张）</span></b>
   <div class="ava-pick">${profDraft.avatar?`<img class="ava" src="${imgUrl(profDraft.avatar)}" alt="" width="88" height="88">`:`<span class="ava empty">${ic('user',36)}</span>`}
     <div class="btnrow" style="justify-content:flex-start"><label class="btn sm" for="pf_ava">${profDraft.avatar?'换照片':'上传头像'}</label>${profDraft.avatar?'<button type="button" class="btn sm ghost" data-act="profAvaDel">删除</button>':''}</div>
     <input type="file" id="pf_ava" accept="image/*" hidden></div>
   <div class="field" style="margin-top:12px"><label for="pf_intro">介绍（几句话就好）</label><textarea class="inp" id="pf_intro" rows="4" maxlength="600">${esc(profDraft.intro)}</textarea></div>
   <b style="display:block;margin:6px 0">店面照片 <span class="sub">（最多 ${PROF_MAX.shop} 张）</span></b>${grid('shop')}
   <b style="display:block;margin:14px 0 6px">我的前后对比照 <span class="sub">（最多 ${PROF_MAX.bna} 张）</span></b>${grid('bna')}
   <p class="sub" style="margin:10px 0">照片会自动缩小再上传，不会拖慢 App。</p>
   <button class="btn block" type="submit">保存</button></form>`);
  const ai=document.getElementById('pf_ava');
  if(ai) ai.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; profDraft.intro=document.getElementById('pf_intro').value; toast('正在上传头像…');
    try{ const data=await squareJpg(f,480); const r=await api('admin/photo',{data}); profDraft.avatar=r.id; }catch(err){ toast('头像上传失败：'+err.message); } profileForm(true); };
  for(const k of ['shop','bna']){ const inp=document.getElementById('pf_'+k); if(!inp) continue;
    inp.onchange=async e=>{ profDraft.intro=document.getElementById('pf_intro').value; const files=[...e.target.files].slice(0,PROF_MAX[k]-profDraft[k].length); if(!files.length) return;
      toast(`正在上传 ${files.length} 张照片…`);
      for(const f of files){ try{ const data=await shrink(f,1200); const r=await api('admin/photo',{data}); profDraft[k].push(r.id); }catch(err){ toast('有一张照片上传失败：'+err.message); } }
      profileForm(true); }; }
}

// Head shot: centre square of the photo, 480 x 480 JPEG (about 40 KB).
function squareJpg(file,size){ return new Promise((ok,bad)=>{ const url=URL.createObjectURL(file), im=new Image();
  im.onload=()=>{ const s=Math.min(im.naturalWidth,im.naturalHeight), cv=document.createElement('canvas'); cv.width=cv.height=size;
    const cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,size,size);
    cx.drawImage(im,(im.naturalWidth-s)/2,(im.naturalHeight-s)/2.6,s,s,0,0,size,size); URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg',0.85)); };
  im.onerror=()=>{ URL.revokeObjectURL(url); bad(new Error('看不懂这张照片')); }; im.src=url; }); }
