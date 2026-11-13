/* ---------- sheet & toast ---------- */
let reSheet=null;
let camStream=null, camTimer=null;
function stopCam(){ if(camTimer){ cancelAnimationFrame(camTimer); camTimer=null; } if(camStream){ camStream.getTracks().forEach(t=>t.stop()); camStream=null; } }
function loadJsQR(){ return window.jsQR?Promise.resolve():new Promise((res,rej)=>{const sc=document.createElement('script'); sc.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; sc.onload=res; sc.onerror=rej; document.head.appendChild(sc);}); }
function gotCode(text){
  const mt=String(text||'').match(/#checkin-([a-z0-9]+)/);
  if(!mt){ toast('这不是 '+brand().name+' 的打卡二维码'); return false; }
  stopCam(); closeSheet(); scanCode=mt[1]; scanResult=null; scanBad=false; goView('scan'); render(); window.scrollTo(0,0); return true;
}
async function openScanner(){
  openSheet(`<h3>扫码打卡</h3><div class="cam"><video id="camv" playsinline muted autoplay></video><div class="frame"></div></div>
    <p class="sub" id="camMsg" style="margin:12px 0 0;text-align:center">把柜台的二维码放进框里</p>
    <div class="actions" style="margin-top:12px"><button class="btn ghost" data-act="close">取消</button></div>`);
  const msg=t=>{const el=document.getElementById('camMsg'); if(el) el.textContent=t;};
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ msg('这部手机不能在这里打开相机。请直接用手机的相机 App 扫柜台的二维码。'); return; }
  try{ camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}); }
  catch(e){ msg('没有相机权限。请允许使用相机，或直接用手机的相机 App 扫柜台的二维码。'); return; }
  const v=document.getElementById('camv'); if(!v){ stopCam(); return; }
  v.srcObject=camStream; try{ await v.play(); }catch(_){}
  let detector=null;
  if('BarcodeDetector' in window){ try{ detector=new BarcodeDetector({formats:['qr_code']}); }catch(_){ detector=null; } }
  if(!detector){ try{ await loadJsQR(); }catch(_){ msg('扫描工具载入失败，请直接用手机的相机 App 扫二维码。'); return; } }
  const cv=document.createElement('canvas'), cx=cv.getContext('2d',{willReadFrequently:true});
  let busy=false;
  const tick=async()=>{
    if(!camStream) return;
    if(!busy&&v.readyState>=2){ busy=true;
      try{
        if(detector){ const r=await detector.detect(v); if(r&&r[0]&&gotCode(r[0].rawValue)) return; }
        else { const w=v.videoWidth, h=v.videoHeight; const k=Math.min(1,640/Math.max(w,h)); cv.width=Math.round(w*k); cv.height=Math.round(h*k);
          cx.drawImage(v,0,0,cv.width,cv.height); const d=cx.getImageData(0,0,cv.width,cv.height); const r=window.jsQR(d.data,cv.width,cv.height,{inversionAttempts:'dontInvert'}); if(r&&gotCode(r.data)) return; }
      }catch(_){}
      busy=false; }
    camTimer=requestAnimationFrame(tick);
  };
  tick();
}
function openSheet(html){ reSheet=null; const l=document.getElementById('layer'); l.innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="sheet-x" data-act="close" aria-label="关闭">✕</button>${html}</div></div>`; }
function closeSheet(){ stopCam(); reSheet=null; document.getElementById('layer').innerHTML=''; }
let tt; function toast(t){ let el=document.querySelector('.toast'); if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el);} el.textContent=t; clearTimeout(tt); tt=setTimeout(()=>el.remove(),2600); }

function rewardSheet(r){
  const m=me(); const out=r.stock!=null&&r.stock<=0; const a=avail(m);
  openSheet(`${ph(r,'','border-radius:16px;margin-bottom:14px;aspect-ratio:4/3')}
    <h3 style="margin-bottom:2px">${nt(nameOf(r))}</h3><div class="sub">${nt(subOf(r))} · ${esc(catOf(r.cat).zh)}</div>
    ${r.desc?`<p style="margin:10px 0 0">${esc(r.desc)}</p>`:''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0"><span class="pill num" style="font-size:21px;padding:6px 14px">${fmt(r.points)} pts</span><span class="sub">${r.stock!=null?'库存 '+r.stock:''}</span></div>
    ${!m?`<button class="btn block" data-act="go" data-v="me">登入或注册会员</button>`
      :out?`<button class="btn block" disabled>已兑完</button>`
      :a<r.points?`<button class="btn block" disabled>还差 ${fmt(r.points-a)} 分</button>`
      :`<p class="sub">兑换后剩余 <b class="num">${fmt(a-r.points)}</b> 分。教练确认后即可领取礼物。</p><div class="terms" style="margin:10px 0"><b>兑换须知</b>${termsHtml()}<p class="sub" style="margin:6px 0 0">按「确认兑换」即表示同意以上条款。</p></div><div class="actions"><button class="btn ghost" data-act="close">取消</button><button class="btn" data-act="redeem" data-id="${esc(r.id)}">确认兑换</button></div>`}`);
}
function claimSheet(t){
  const m=me();
  openSheet(`<h3>${nt(nameOf(t))}</h3><p class="sub" style="margin-top:-6px">${nt(subOf(t))}${t.note?' · '+esc(t.note):''}</p>
    <div style="margin:14px 0"><span class="plus num" style="font-size:30px">+${fmt(t.points)}</span> <span class="sub">积分</span></div>
    ${!m?`<button class="btn block" data-act="go" data-v="me">登入或注册会员</button>`:
    `${(o=>{ if(!o.length) return ''; const used=taskToday(t).map(r=>r.opt); return `<div class="field"><label>选择一项</label><div class="optpick">${o.map((x,i)=>`<label class="${used.includes(x)?'dis':''}"><input type="radio" name="copt" value="${esc(x)}" ${used.includes(x)?'disabled':''}><span>${nt(x)}${used.includes(x)?'<small>今天已申请</small>':''}</span></label>`).join('')}</div></div>`; })(taskOpts(t))}
     ${(L=>L?`<p class="sub" style="margin:-4px 0 12px">今天已申请 ${L.n}/${L.max} 次</p>`:'')(taskLimit(t))}
     <div class="field"><label for="cn">备注（选填，例如活动名称或链接）</label><input class="inp" id="cn"></div>
     <div class="actions"><button class="btn ghost" data-act="close">取消</button><button class="btn" data-act="doClaim" data-id="${esc(t.id)}">提交申请</button></div>`}`);
}
function paySheet(c){
  const m=S.members.find(x=>x.phone===c.phone);
  openSheet(`<h3>${c.paid?'修改付款记录':'确认已付款'}</h3><p class="sub" style="margin-top:-6px">${nt(m?m.name:c.phone)} · 第 ${cardNo(c)} 张 · ${esc(c.name)}</p>
   <form id="payForm" data-id="${esc(c.id)}">
    <div class="field"><label for="pa_d">付款日期</label><input class="inp" type="date" id="pa_d" value="${esc(c.paidAt||today())}" max="${today()}"></div>
    <div class="row2"><div class="field"><label for="pa_a">金额 RM（选填）</label><input class="inp num" id="pa_a" inputmode="decimal" value="${esc(c.paidAmount||'')}"></div>
    <div class="field"><label for="pa_m">付款方式</label><select class="inp" id="pa_m">${['现金','银行转账','TnG eWallet','DuitNow / QR','信用卡','其他'].map(x=>`<option ${c.payMethod===x?'selected':''}>${x}</option>`).join('')}</select></div></div>
    <div class="field"><label for="pa_n">备注（选填）</label><input class="inp" id="pa_n" value="${esc(c.paidNote||'')}"></div>
    <div class="actions">${c.paid?`<button type="button" class="btn danger" data-act="unpayCard" data-id="${esc(c.id)}">改回未付款</button>`:`<button type="button" class="btn ghost" data-act="backNcp" data-v="${esc(c.phone)}">取消</button>`}<button class="btn ok" type="submit">确认已付款</button></div></form>`);
}
function ncpSheet(phone){
  const m=S.members.find(x=>x.phone===phone); if(!m) return;
  const cs=cardsOf(phone); const keep=document.getElementById('c_s')?{n:document.getElementById('c_n').value,t:document.getElementById('c_t').value,d:document.getElementById('c_d').value,s:document.getElementById('c_s').value}:null;
  openSheet(`<h3>${nt(m.name)} · NCP 卡</h3>
   ${cs.map(c=>{const k=cardInfo(c);return cardBlock(c,true)+(k.ins.length?`<details style="margin-top:8px"><summary class="sub" style="cursor:pointer">打卡记录（${k.ins.length} 次 · 自 ${k.ins.filter(x=>x.by!=='staff').length} · 帮 ${k.ins.filter(x=>x.by==='staff').length}）</summary><div class="card" style="padding:4px 12px;margin-top:6px"><div class="sub" style="font-size:14px;padding-top:6px">${HOW_LEGEND}</div>${k.ins.slice().reverse().map((x,i)=>{const d=new Date(x.ts);return `<div class="hist" style="font-size:15px"><span>第 ${k.ins.length-i} 次 · ${x.date} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</span>${howTag(x.by)}</div>`}).join('')}</div></details>`:'')+`<div class="btnrow" style="margin:8px 0 16px">${c.paid?`<button class="btn sm ghost" data-act="payCard" data-id="${esc(c.id)}">修改付款</button>`:`<button class="btn sm ok" data-act="payCard" data-id="${esc(c.id)}">确认已付款</button>`}<button class="btn sm danger" data-act="delCard" data-id="${esc(c.id)}">删除这张卡</button><button class="btn sm ghost" data-act="undoCheckin" data-id="${esc(c.id)}" ${k.used?'':'disabled'}>撤销最后一次打卡</button><button class="btn sm" data-act="staffCheckin" data-id="${esc(c.id)}" ${k.status!=='active'||k.notStarted?'disabled':''}>帮他打卡</button></div>`}).join('')||'<div class="empty" style="margin-bottom:14px">这位会员还没有 NCP 卡。</div>'}
   <form id="cf" data-phone="${esc(phone)}" class="card"><b style="display:block;margin-bottom:10px">开新卡</b>
    <div class="field"><label for="c_ty">卡种</label><select class="inp" id="c_ty">${CARD_TYPES.map((t,i)=>`<option value="${i}">${t.n}（${t.kind==='daily'?'不限次':t.total+' 次'}）</option>`).join('')}<option value="x">自定义</option></select></div>
    <div class="field"><label for="c_n">卡名称</label><input class="inp" id="c_n" required value="${esc(keep?keep.n:CARD_TYPES[0].n)}"></div>
    <div class="row2"><div class="field"><label for="c_t">总次数</label><input class="inp num" id="c_t" type="number" min="1" required value="${keep?esc(keep.t):CARD_TYPES[0].total}"></div>
    <div class="field"><label for="c_d">有效天数（留空 = 不限期）</label><input class="inp num" id="c_d" type="number" min="1" value="${keep?esc(keep.d):''}"></div></div>
    <div class="field"><label for="c_pay">付款</label><select class="inp" id="c_pay"><option value="0">还没付款（之后再确认）</option><option value="1">今天已付款</option></select></div>
    <div class="field"><label for="c_s">开始日期</label><input class="inp" id="c_s" type="date" required value="${keep?esc(keep.s):today()}"></div>
    <button class="btn block" type="submit">开卡</button></form>`);
  reSheet=()=>ncpSheet(phone);
  document.getElementById('c_ty').onchange=e=>{const t=CARD_TYPES[+e.target.value]; if(!t) return; document.getElementById('c_n').value=t.n; document.getElementById('c_t').value=t.total; document.getElementById('cf').dataset.kind=t.kind;};
}
let pendingPhoto=null;
function rewardForm(r){
  r=r||{cat:'lifestyle',active:true}; pendingPhoto=null;
  openSheet(`<h3>${r.id?'编辑礼物':'新增礼物'}</h3><form id="rf" data-id="${esc(r.id||'')}">
   <div class="field"><label>礼物照片</label><div class="uploader"><div id="rp">${ph(r)}</div><div style="display:flex;flex-direction:column;gap:6px"><label class="btn sm ghost" for="rfile">${ic('upload',16)} 上传照片</label><input type="file" id="rfile" accept="image/*" hidden><span class="sub">正方形照片效果最好</span></div></div></div>
   <div class="field"><label for="f_n">中文名称</label><input class="inp" id="f_n" required value="${esc(r.name||'')}"></div>
   <div class="field"><label for="f_en">英文名称</label><input class="inp" id="f_en" value="${esc(r.en||'')}"></div>
   <div class="row2"><div class="field"><label for="f_c">分类</label><select class="inp" id="f_c">${CATS.map(c=>`<option value="${c.id}" ${r.cat===c.id?'selected':''}>${c.zh}</option>`).join('')}</select></div>
   <div class="field"><label for="f_p">所需积分</label><input class="inp num" id="f_p" type="number" min="0" required value="${r.points??''}"></div></div>
   <div class="row2"><div class="field"><label for="f_s">库存（空白 = 不限）</label><input class="inp num" id="f_s" type="number" min="0" value="${r.stock??''}"></div>
   <div class="field"><label for="f_a">状态</label><select class="inp" id="f_a"><option value="1" ${r.active!==false?'selected':''}>上架</option><option value="0" ${r.active===false?'selected':''}>下架</option></select></div></div>
   <div class="field"><label for="f_d">介绍（选填）</label><textarea class="inp" id="f_d">${esc(r.desc||'')}</textarea></div>
   <div class="actions">${r.id?`<button type="button" class="btn danger" data-act="delReward" data-id="${esc(r.id)}">删除</button>`:'<button type="button" class="btn ghost" data-act="close">取消</button>'}<button class="btn" type="submit">保存</button></div></form>`);
  document.getElementById('rfile').onchange=async e=>{const f=e.target.files[0]; if(!f) return; toast('正在上传照片…'); try{pendingPhoto=await uploadPhoto(f); document.getElementById('rp').innerHTML=ph({...r,...pendingPhoto}); toast('照片已上传，按保存完成');}catch(err){toast('上传失败：'+(err.message||'请稍后再试'))}};
}
function taskForm(t){
  t=t||{active:true,icon:'star'};
  openSheet(`<h3>${t.id?'编辑任务':'新增任务'}</h3><form id="tf" data-id="${esc(t.id||'')}">
   <div class="field"><label for="t_n">任务名称</label><input class="inp" id="t_n" required value="${esc(t.name||'')}"></div>
   <div class="field"><label for="t_en">英文名称</label><input class="inp" id="t_en" value="${esc(t.en||'')}"></div>
   <div class="row2"><div class="field"><label for="t_p">积分</label><input class="inp num" id="t_p" type="number" required value="${t.points??''}"></div>
   <div class="field"><label for="t_i">图标</label><select class="inp" id="t_i">${TASK_ICONS.map(k=>`<option ${t.icon===k?'selected':''}>${k}</option>`).join('')}</select></div></div>
   <div class="field"><label for="t_no">备注（选填）</label><input class="inp" id="t_no" value="${esc(t.note||'')}"></div>
   <div class="row2"><div class="field"><label for="t_d">每天最多申请几次</label><input class="inp num" id="t_d" type="number" min="0" placeholder="0 = 不限" value="${+t.daily||''}"></div>
   <div class="field"><label for="t_o">会员要选的项目（选填）</label><input class="inp" id="t_o" placeholder="例如：早餐、午餐、晚餐" value="${esc(t.opts||'')}"></div></div>
   <p class="sub" style="margin:-6px 0 12px">填了项目的话，会员申请时要选一项，每一项每天只能申请一次。</p>
   <div class="row2"><div class="field"><label for="t_pr">首页限时推广</label><select class="inp" id="t_pr"><option value="0">否</option><option value="1" ${t.promo?'selected':''}>是</option></select></div>
   <div class="field"><label for="t_a">状态</label><select class="inp" id="t_a"><option value="1">启用</option><option value="0" ${t.active===false?'selected':''}>停用</option></select></div></div>
   <div class="actions">${t.id?`<button type="button" class="btn danger" data-act="delTask" data-id="${esc(t.id)}">删除</button>`:'<button type="button" class="btn ghost" data-act="close">取消</button>'}<button class="btn" type="submit">保存</button></div></form>`);
}
function memberForm(m){
  m=m||{tier:'Silver'};
  openSheet(`<h3>${m.id?'编辑会员':'新增会员'}</h3><form id="mf" data-id="${esc(m.id||'')}">
   <div class="field"><label for="m_n">名字</label><input class="inp" id="m_n" required value="${esc(m.name||'')}"></div>
   <div class="field"><label for="m_p">手机号码（会员用这个号码登入）</label><input class="inp" id="m_p" inputmode="tel" required ${m.id?'readonly':''} value="${esc(m.phone||'')}"></div>
   ${m.id?`<div class="field"><label>登入密码</label><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="sub">${m.hasPin?'会员已经设定密码':'会员还没设定密码（第一次登入时自己设定）'}</span>${m.hasPin?`<button type="button" class="btn sm ghost" data-act="resetPin" data-id="${esc(m.id)}">重设密码</button>`:''}</div></div>`:''}
   ${m.id?(t=>`<div class="card" style="margin-bottom:12px;padding:12px 14px"><b>目前等级：${t.tier}</b><div class="sub">10+1 卡 ${t.n10} 张 · 30 天卡 ${t.n30} 张（App 里开过的卡 + 以前买的；30 天卡 1 张 = 10+1 卡 3 张，合计 ${t.score}）${t.next&&!t.manual?'<br>'+tierProgress(m):''}</div></div>`)(tierInfo(m)):''}
   <div class="row2"><div class="field"><label for="m_p10">以前买过的 10+1 卡</label><input class="inp num" id="m_p10" type="number" min="0" value="${+m.prior10||0}"></div>
   <div class="field"><label for="m_p30">以前买过的 30 天卡</label><input class="inp num" id="m_p30" type="number" min="0" value="${+m.prior30||0}"></div></div>
   <p class="sub" style="margin:-6px 0 12px">用 App 之前买过的卡填在这里，会一起算进等级。</p>
   <div class="field"><label for="m_t">会员等级</label><select class="inp" id="m_t"><option value="">自动（按买卡数量）</option>${Object.keys(TIERS).map(k=>`<option value="${k}" ${m.tierOverride===k?'selected':''}>手动设定：${k} · ${TIERS[k].zh}</option>`).join('')}</select></div>
   <div class="actions">${m.id?`<button type="button" class="btn danger" data-act="delMember" data-id="${esc(m.id)}">删除</button>`:'<button type="button" class="btn ghost" data-act="close">取消</button>'}<button class="btn" type="submit">保存</button></div></form>`);
}
function ptsForm(m){
  openSheet(`<h3>${nt(m.name)} · 加/减分</h3><p class="sub" style="margin-top:-6px">目前 <b class="num">${fmt(totalPts(m))}</b> 分</p><form id="pf" data-id="${esc(m.id)}">
   <div class="field"><label for="p_t">选择任务</label><select class="inp" id="p_t"><option value="">自定义</option>${activeTasks().map(t=>`<option value="${esc(t.id)}">${nt(nameOf(t))} (+${t.points})</option>`).join('')}</select></div>
   <div class="row2"><div class="field"><label for="p_v">积分（扣分用负数）</label><input class="inp num" id="p_v" type="number" required></div>
   <div class="field"><label for="p_r">原因</label><input class="inp" id="p_r"></div></div>
   <div class="actions"><button type="button" class="btn ghost" data-act="close">取消</button><button class="btn" type="submit">确认</button></div></form>`);
  document.getElementById('p_t').onchange=e=>{const t=S.tasks.find(x=>x.id===e.target.value); if(t){ let v=t.auto?ckPts(m.phone):t.points; document.getElementById('p_v').value=v; document.getElementById('p_r').value=t.name+' '+(t.en||'');}};
}

