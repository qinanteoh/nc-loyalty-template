/* ---------- admin ---------- */
function vAdmin(){
  const pend=S.requests.filter(r=>r.status==='pending').length+pendMembers().length;
  const tabs=[['requests',`审核${pend?' ('+pend+')':''}`],['notify','通知'],['rewards','礼物'],['tasks','任务'],['report','打卡报告'],['stats','每日统计'],['members','会员'],['course','课程'],['health','健康'],['cards','NCP卡'],['home','首页']];
  let body='';
  if(adminTab==='requests'){
    const list=S.requests.filter(r=>qMatch(r.name,r.phone)).sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||b.ts-a.ts).slice(0,40);
    const pm=pendMembers().filter(m=>qMatch(m.name,m.phone));
    body=adminPushCard()+qBox()+(pm.length?`<div class="sec-h" style="margin-top:6px"><h2>新会员等待核准（${pm.length}）</h2></div><div class="list" style="margin-bottom:18px">${pm.map(m=>`<div class="arow"><div class="tx"><b>${nt(m.name)}</b><span>${esc(m.phone)} · 注册于 ${dt(m.regTs||Date.now())}</span></div><div style="display:flex;gap:6px"><button class="btn sm danger" data-act="rejectMember" data-id="${esc(m.id)}">拒绝</button><button class="btn sm ok" data-act="approveMember" data-id="${esc(m.id)}">核准</button></div></div>`).join('')}</div><div class="sec-h"><h2>兑换 / 赚分 / 续卡 / 课程申请</h2></div>`:'')+(list.length?`<div class="list">${list.map(r=>`<div class="arow"><div class="tx"><b>${({redeem:'兑换',earn:'赚分',renew:'续卡',checkin:'打卡',course:'课程'})[r.type]} · ${nt(r.title)}</b><span>${nt(r.name)} · ${esc(r.phone)} · ${dt(r.ts)}${r.note?' · '+esc(r.note):''}</span></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">${r.type==='renew'?`<span class="sub">${r.total} 次</span>`:r.type==='course'?'<span class="sub">开通课程</span>':`<span class="num ${r.type==='redeem'?'d-minus':'d-plus'}">${r.type==='redeem'?'−':'+'}${fmt(r.points)}</span>`}
      ${r.status==='pending'?`<div style="display:flex;gap:6px"><button class="btn sm danger" data-act="reject" data-id="${esc(r.id)}">拒绝</button><button class="btn sm ok" data-act="approve" data-id="${esc(r.id)}">通过</button></div>`:`<span class="badge ${r.status}">${r.status==='approved'?'已通过':'未通过'}</span>`}</div></div>`).join('')}</div>`:(qOf()?noMatch():'<div class="empty">目前没有待审核的申请。</div>'));
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
        <div class="btnrow"><button class="btn sm ghost" data-act="editMember" data-id="${esc(m.id)}">编辑</button><button class="btn sm ghost" data-act="ncp" data-id="${esc(m.id)}">NCP卡</button><button class="btn sm ghost" data-act="hsheet" data-id="${esc(m.id)}">健康表</button><button class="btn sm" data-act="addPts" data-id="${esc(m.id)}">加/减分</button></div></div>`).join('')}</div>`:(q?noMatch():'<div class="empty">还没有会员。按 + 新增会员。</div>')}`;
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
      <div class="field"><label>Logo / App 图标（正方形效果最好）</label><div class="uploader"><img src="/icon-192.png?v=${esc(st.logo||'d')}" alt="" style="width:84px;height:84px;border-radius:18px;flex:none">
        <div style="display:flex;flex-direction:column;gap:6px"><label class="btn sm ghost" for="lfile">上传 Logo</label><input type="file" id="lfile" accept="image/*" hidden>${st.logo?'<button type="button" class="btn sm danger" data-act="clearLogo">改回默认图标</button>':''}</div></div></div>
      <div class="field"><label for="b_n">俱乐部名称</label><input class="inp" id="b_n" value="${esc(B.name)}"></div>
      <div class="field"><label for="b_s">副标题（显示在名称下面）</label><input class="inp" id="b_s" value="${esc(B.sub)}"></div>
      <div class="field"><label for="b_sh">手机主画面上的短名称（建议 12 个字以内）</label><input class="inp" id="b_sh" maxlength="20" value="${esc(B.short)}"></div>
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
  return `<div class="sec-h"><h2 style="font-family:var(--f-display);font-size:30px">管理后台</h2><button class="link" data-act="adminLogout">退出管理</button></div>
  <div class="seg">${tabs.map(([k,l])=>`<button class="${adminTab===k?'on':''}" data-act="atab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
}
const activeTasksAll=()=>S.tasks.slice().sort((a,b)=>(a.order??0)-(b.order??0));

