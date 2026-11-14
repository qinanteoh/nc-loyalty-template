/* ---------- actions ---------- */
let armed=null;
function confirmTwice(key,btn){ if(armed===key) {armed=null; return true;} armed=key; btn.textContent='再按一次确认删除'; setTimeout(()=>{if(armed===key)armed=null},3000); return false; }
async function adjust(phone,delta,reason){ await api('admin/adjust',{phone,delta,reason}); }
async function run(fn,ok){ try{ await fn(); if(ok) toast(ok); try{ await refresh(); }catch(_){} }catch(e){ if(e.code==='no_admin'){ adminToken=null; ls.set('vw_admin',null); isAdmin=false; } toast('没有成功：'+(e.message||'请稍后再试')); try{ await refresh(); }catch(_){} } }

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]'); if(!b) return;
  const a=b.dataset.act, id=b.dataset.id, v=b.dataset.v;
  if(a==='close'){ if(e.target===b||b.tagName==='BUTTON') closeSheet(); return; }
  if(a==='go'){ closeSheet(); if(view==='scan'){ scanCode=null; scanResult=null; try{history.replaceState(null,'',location.pathname+location.search)}catch(_){} } goView(v); render(); window.scrollTo(0,0); return; }
  if(a==='back'){ closeSheet(); if(view==='scan'){ scanCode=null; scanResult=null; try{history.replaceState(null,'',location.pathname+location.search)}catch(_){} } if(view==='course') syncCourse(); view=navStack.pop()||'home'; if(view==='admin'&&!isAdmin) view='home'; render(); window.scrollTo(0,0); return; }
  if(a==='editScan'){ scanForm(id); return; }
  if(a==='healthPdf'){ if(id!==myPhone&&!isAdmin) return; shareHealthPdf(id); return; }
  if(a==='sfNext'){ sfNext(+b.dataset.i); return; }
  if(a==='delScan'){ if(b.dataset.sure!=='1'){ b.dataset.sure='1'; b.textContent='再按一次确认删除'; return; } closeSheet(); await run(()=>saveHealth({op:'delScan',id}),'记录已删除'); return; }
  if(a==='editProfile'){ profileForm(); return; }
  if(a==='hsheet'){ healthSheet(id); return; }
  if(a==='lang'){ openSheet(`<h3>语言 · Language · Bahasa</h3><div class="list">${LANGS.map(([k,l])=>`<button class="task" data-act="setLang" data-v="${k}" style="text-align:left"><div class="tx" translate="no"><b>${l}</b></div>${LANG===k?ic('check',20):''}</button>`).join('')}</div>`); return; }
  if(a==='setLang'){ setLang(v); return; }
  if(a==='notices'){ openNotices(); return; }
  if(a==='adminPushOn'){ enableAdminPush(b); return; }
  if(a==='adminPushOff'){ disableAdminPush(); return; }
  if(a==='approveMember'){ b.disabled=true; await run(()=>api('admin/approveMember',{phone:id}),'已核准，会员会收到通知'); return; }
  if(a==='rejectMember'){ b.disabled=true; await run(()=>api('admin/rejectMember',{phone:id}),'已拒绝并删除这个注册'); return; }
  if(a==='pushOn'){ enablePush(b); return; }
  if(a==='pushOff'){ disablePush(); return; }
  if(a==='scanQR'){ openScanner(); return; }
  if(a==='cat'){ cat=v; render(); return; }
  if(a==='atab'){ adminTab=v; render(); return; }
  if(a==='history'){ goView('me'); render(); document.getElementById('ledgerSec')?.scrollIntoView({block:'start'}); return; }
  if(a==='logout'){ await unlinkPush(); try{ await api('logout',{}); }catch(_){} token=null; ls.set('vw_token',null); myPhone=null; loginStep='phone'; await refresh().catch(()=>render()); return; }
  if(a==='loginBack'){ loginStep='phone'; render(); return; }
  if(a==='adminLogin'){ openSheet(`<h3>店家登入</h3><form id="adminForm"><div class="field"><label for="apw">管理员密码</label><input class="inp" id="apw" type="password" autocomplete="current-password"></div><button class="btn block" type="submit">登入管理后台</button></form>`); setTimeout(()=>document.getElementById('apw')?.focus(),50); return; }
  if(a==='adminLogout'){ try{ await api('admin/logout',{}); }catch(_){} adminToken=null; ls.set('vw_admin',null); isAdmin=false; view='home'; await refresh().catch(()=>render()); return; }
  if(a==='reward'){ const r=S.rewards.find(x=>x.id===id); if(r) rewardSheet(r); return; }
  if(a==='claim'){ const t=S.tasks.find(x=>x.id===id); if(t) claimSheet(t); return; }
  if(a==='redeem'){ const r=S.rewards.find(x=>x.id===id), m=me(); if(!r||!m) return; if(avail(m)<r.points) return toast('积分不足');
    b.disabled=true; closeSheet(); await run(()=>api('request',{type:'redeem',rewardId:r.id}),'兑换申请已提交，等待教练确认'); return; }
  if(a==='doClaim'){ const t=S.tasks.find(x=>x.id===id), m=me(); if(!t||!m) return; b.disabled=true;
    const note=document.getElementById('cn').value.trim(), oc=document.querySelector('input[name=copt]:checked'), opt=oc?oc.value:'';
    if(taskOpts(t).length&&!opt){ b.disabled=false; return toast('请先选择一项'); }
    closeSheet(); await run(()=>api('request',{type:'earn',taskId:t.id,note,opt}),'申请已提交，等待教练审核'); return; }
  if(a==='checkin'){ const c=S.cards.find(x=>x.id===id), m=me(); if(!c||!m||c.phone!==m.phone) return; const k=cardInfo(c); if(k.status!=='active'||k.notStarted) return;
    if(qrMode()!=='off'&&!(view==='scan'&&scanOk())) return toast('请扫描店内的二维码打卡');
    if(k.recent&&!confirmTwice('ck'+id,b)){ b.textContent='刚刚已打卡成功，再按一次才会再扣 1 次'; return; }
    b.disabled=true;
    try{ const r=await doCheckin(c,k.recent); toast(r.msg); if(view==='scan') scanResult=r.msg; }
    catch(e){ if(e.code==='bad_qr'){ scanBad=true; } toast(e.message); }
    await refresh().catch(()=>render()); return; }
  if(a==='renew'){ const m=me(); if(!m) return;
    openSheet(`<h3>申请续卡</h3><p class="sub" style="margin-top:-6px">选择你要的配套，教练确认后新卡就会开通。</p>
      <div class="list" style="margin-top:12px">${CARD_TYPES.map((t,i)=>t.kind==='daily'?'':`<button class="task" data-act="doRenew" data-v="${i}" style="text-align:left"><span class="ic">${ic('ticket',22)}</span><div class="tx"><b>${esc(t.n)}</b><span>${t.total} 次打卡</span></div>${ic('plus',18)}</button>`).join('')}</div>`); return; }
  if(a==='doRenew'){ const m=me(), t=CARD_TYPES[+v]; if(!m||!t) return;  if(hasPendingRenew(m.phone)){ closeSheet(); return toast('你已经有一个续卡申请在审核中'); }
    b.disabled=true; closeSheet(); await run(()=>api('request',{type:'renew',cardName:t.n,total:t.total,kind:t.kind}),'续卡申请已提交，等待教练确认'); return; }
  if(!isAdmin) return;
  if(a==='qrInit'||a==='qrReset'){ if(a==='qrReset'&&!confirmTwice(a,b)){ b.textContent='再按一次作废旧二维码'; return; }
    await run(()=>putSettings({...S.settings,qrKey:uid()+uid(),qrMode:qrMode()}),a==='qrInit'?'打卡二维码已生成':'旧二维码已作废，请重新下载'); return; }
  if(a==='qrSave'){ await saveQrPoster(); return; }
  if(a==='clearLogo'){ await run(()=>putSettings({...S.settings,logo:null}),'已改回默认图标'); return; }
  if(a==='exportPdf'){ exportPdf(); return; }
  if(a==='exportDailyPdf'){ exportDailyPdf(); return; }
  if(a==='exportDailyCsv'){ exportDailyCsv(); return; }
  if(a==='joinPoster'){ saveJoinPoster(); return; }
  if(a==='joinCopy'){ try{ await navigator.clipboard.writeText(joinLink()); toast('注册链接已复制，可以贴到 WhatsApp'); }catch(e){ toast(joinLink()); } return; }
  if(a==='courseFilter'){ courseFilter=v; render(); return; }
  if(a==='coursePreview'){ courseAdmin=true; goView('course'); render(); window.scrollTo(0,0); return; }
  if(a==='csheet'){ courseSheet(id); return; }
  if(a==='courseOpen'){ b.disabled=true; await run(()=>api('admin/courseOpen',{phone:id,open:v==='1'}),v==='1'?'课程已开通，已通知会员':'已收回'); return; }
  if(a==='repDay'){ reportDate=v; render(); return; }
  if(a==='repPdf'){ shareReportPdf(); return; }
  if(a==='statRange'){ statRange=+v; if(statRange===0){ const r={from:dt(parseD(today())-29*DAY),to:today()}; statFrom=statFrom||r.from; statTo=statTo||r.to; } render(); return; }
  if(a==='cardFilter'){ cardFilter=v; render(); return; }
  if(a==='exportCsv'){ exportCsv(); return; }
  if(a==='payCard'){ const c=S.cards.find(x=>x.id===id); if(c) paySheet(c); return; }
  if(a==='backNcp'){ ncpSheet(v); return; }
  if(a==='unpayCard'){ const c=S.cards.find(x=>x.id===id); if(!c) return; if(!confirmTwice(a+id,b)){ b.textContent='再按一次改回未付款'; return; } ncpSheet(c.phone); await run(()=>patch('cards',c.id,{paid:false,paidAt:null,paidAmount:null,payMethod:null,paidNote:null}),'已改回未付款'); return; }
  if(a==='ncp'){ const m=S.members.find(x=>x.id===id); if(m) ncpSheet(m.phone); return; }
  if(a==='staffCheckin'){ const c=S.cards.find(x=>x.id===id); if(!c) return; b.disabled=true; await run(()=>api('admin/checkin',{cardId:c.id}),`已帮会员打卡，+${ckPts(c.phone)} 分`); return; }
  if(a==='resetPin'){ const m=S.members.find(x=>x.id===id); if(!m) return; if(!confirmTwice(a+id,b)){ b.textContent='再按一次确认重设'; return; } closeSheet(); await run(()=>api('admin/resetpin',{phone:m.phone}),'密码已重设，会员下次登入时可以设定新密码'); return; }
  if(a==='undoCheckin'){ const k=cardInfo(S.cards.find(x=>x.id===id)||{}); const last=k.ins&&k.ins[k.ins.length-1]; if(!last) return; if(!confirmTwice(a+id,b)) {b.textContent='再按一次撤销 '+last.date; return;} await run(()=>del('checkins',last.id),'已撤销 '+last.date+' 的打卡'+(last.points?'，并扣回 '+last.points+' 分':'')); return; }
  if(a==='delCard'&&confirmTwice(a+id,b)){ await run(()=>del('cards',id),'卡已删除（已赚到的积分会保留）'); return; }
  if(a==='approve'){ const r=S.requests.find(x=>x.id===id); if(!r) return; b.disabled=true;
    await run(()=>api('admin/approve',{id:r.id}),r.type==='renew'?'已通过，新卡已开通，已通知会员':r.type==='course'?'课程已开通，已通知会员':'已通过，已通知会员'); return; }
  if(a==='reject'){ b.disabled=true; await run(()=>api('admin/reject',{id}),'已拒绝，已通知会员'); return; }
  if(a==='delNotice'){ if(!confirmTwice(a+id,b)){ b.textContent='再按一次确认删除'; return; } await run(()=>del('notices',id),'公告已删除'); return; }
  if(a==='editReward'){ rewardForm(S.rewards.find(x=>x.id===id)); return; }
  if(a==='editTask'){ taskForm(S.tasks.find(x=>x.id===id)); return; }
  if(a==='editMember'){ memberForm(S.members.find(x=>x.id===id)); return; }
  if(a==='addPts'){ const m=S.members.find(x=>x.id===id); if(m) ptsForm(m); return; }
  if(a==='delReward'&&confirmTwice(a+id,b)){ await run(()=>del('rewards',id),'礼物已删除'); closeSheet(); return; }
  if(a==='delTask'&&confirmTwice(a+id,b)){ await run(()=>del('tasks',id),'任务已删除'); closeSheet(); return; }
  if(a==='delMember'&&confirmTwice(a+id,b)){ await run(()=>del('members',id),'会员已删除'); closeSheet(); return; }
  if(a==='clearNoticePhoto'){ noticePhoto=null; render(); return; }
  if(a==='clearHomePhoto'){ await run(()=>putSettings({...S.settings,photo:null,photoUrl:null}),'照片已移除'); return; }
});

document.addEventListener('change',e=>{
  if(e.target.id==='sFrom'){ statFrom=e.target.value||null; render(); }
  if(e.target.id==='sTo'){ statTo=e.target.value||null; render(); }
});
document.addEventListener('submit',async e=>{
  e.preventDefault(); const f=e.target; const g=id=>document.getElementById(id).value.trim();
  if(f.id==='loginForm'){ loginPhone=g('ph').replace(/\D/g,''); if(!loginPhone) return toast('请输入手机号码');
    try{ const r=await api('login/check',{phone:loginPhone}); if(!r.exists){ loginStep='register'; render(); setTimeout(()=>document.getElementById('rname')?.focus(),50); return; } loginName=r.name; loginStep=r.hasPin?'pin':'setpin'; render(); setTimeout(()=>document.getElementById('pin1')?.focus(),50); }
    catch(err){ toast(err.message); } return; }
  if(f.id==='pinForm'||f.id==='setPinForm'){ const p1=g('pin1'); if(!/^\d{4}$/.test(p1)) return toast('密码要是 4 个数字');
    if(f.id==='setPinForm'&&p1!==g('pin2')) return toast('两次输入的密码不一样');
    try{ const r=await api('login',{phone:loginPhone,pin:p1,setPin:f.id==='setPinForm'}); token=r.token; ls.set('vw_token',token); loginStep='phone'; await refresh(); toast('欢迎，'+r.name); }
    catch(err){ toast(err.message); if(err.code==='need_pin'){ loginStep='setpin'; render(); } } return; }
  if(f.id==='regForm'){ const nm=g('rname'), p1=g('pin1'); if(!nm) return toast('请输入你的名字'); if(!/^\d{4}$/.test(p1)) return toast('密码要是 4 个数字'); if(p1!==g('pin2')) return toast('两次输入的密码不一样');
    try{ const r=await api('register',{phone:loginPhone,name:nm,pin:p1}); token=r.token; ls.set('vw_token',token); loginStep='phone'; await refresh(); toast(r.pending?'注册成功！请等待店里核准':'注册成功，欢迎 '+r.name+'！'); }
    catch(err){ toast(err.message); if(err.code==='exists'){ loginStep='phone'; render(); } } return; }
  if(f.id==='adminForm'){ try{ const r=await api('admin/login',{password:document.getElementById('apw').value}); adminToken=r.token; ls.set('vw_admin',adminToken); closeSheet(); view='admin'; await refresh(); toast('已登入管理后台'); }catch(err){ toast(err.message); } return; }
  if(f.id==='sf'){ const sc={id:f.dataset.id||undefined,date:g('s_date'),note:g('s_note')}; MET.forEach(x=>{ const el=document.getElementById('s_'+x.k); sc[x.k]=el?el.value.trim():''; });
    if(!MET.some(x=>has(sc[x.k]))) return toast('至少输入一项数字');
    closeSheet(); await run(()=>saveHealth({op:'scan',scan:sc}),'记录已保存'); return; }
  if(f.id==='pfm'){ const pr={age:g('p_age'),height:g('p_height'),gender:g('p_gender'),program:g('p_program'),target:g('p_target'),birthday:g('p_birthday'),coach:g('p_coach'),sponsor:g('p_sponsor')};
    closeSheet(); await run(()=>saveHealth({op:'profile',profile:pr}),'个人资料已保存'); return; }
  if(!isAdmin) return;
  if(f.id==='rf'){ const id=f.dataset.id||null; const old=S.rewards.find(x=>x.id===id)||{};
    const data={name:g('f_n'),en:g('f_en'),cat:g('f_c'),points:+g('f_p')||0,stock:g('f_s')===''?null:+g('f_s'),active:g('f_a')==='1',desc:g('f_d'),
      photo:old.photo||null,photoUrl:old.photoUrl||null,order:old.order??Date.now(),...(pendingPhoto||{})};
    closeSheet(); await run(()=>put('rewards',id,data),'礼物已保存'); return; }
  if(f.id==='tf'){ const id=f.dataset.id||null; const old=S.tasks.find(x=>x.id===id)||{};
    const td={...old,name:g('t_n'),en:g('t_en'),points:+g('t_p')||0,icon:g('t_i'),note:g('t_no'),daily:Math.max(0,parseInt(g('t_d'),10)||0),opts:g('t_o'),promo:g('t_pr')==='1',active:g('t_a')==='1',order:old.order??Date.now()}; delete td.id; closeSheet(); await run(()=>put('tasks',id,td),'任务已保存'); return; }
  if(f.id==='mf'){ const id=f.dataset.id||null; const phone=g('m_p').replace(/\D/g,''); if(!phone) return toast('请输入手机号码');
    const old=S.members.find(x=>x.id===id);
    if(!old&&S.members.some(x=>x.phone===phone)) return toast('这个号码已经是会员');
    const nm=g('m_n'), tr=g('m_t')||null, p10=Math.max(0,parseInt(g('m_p10'),10)||0), p30=Math.max(0,parseInt(g('m_p30'),10)||0); closeSheet(); await run(()=>old?patch('members',old.id,{name:nm,tierOverride:tr,prior10:p10,prior30:p30}):put('members',phone,{name:nm,phone,tierOverride:tr,prior10:p10,prior30:p30,points:0,joined:dt(Date.now())}),'会员已保存'); return; }
  if(f.id==='pf'){ const m=S.members.find(x=>x.id===f.dataset.id); const v=parseInt(g('p_v'),10); if(!m||!v) return toast('请输入积分');
    const reason=g('p_r')||(v>0?'教练加分':'教练扣分'); closeSheet(); await run(()=>adjust(m.phone,v,reason),v>0?`已加 ${v} 分`:`已扣 ${-v} 分`); return; }
  if(f.id==='cf'){ const phone=f.dataset.phone; const t=+g('c_t'), d=+g('c_d')||null; if(!t||!g('c_s')) return toast('请填写次数和开始日期');
    const fresh={n:CARD_TYPES[0].n,t:CARD_TYPES[0].total,d:'',s:today()};
    const paidNow=g('c_pay')==='1';
    await run(()=>put('cards',null,{phone,name:g('c_n')||'NCP',kind:(g('c_ty')==='x'?'other':(CARD_TYPES[+g('c_ty')]||{}).kind)||'other',total:t,days:d,start:g('c_s'),ts:Date.now(),paid:paidNow,paidAt:paidNow?today():null}),paidNow?'新卡已开通（已付款）':'新卡已开通，记得收款后按「确认已付款」');
    ['c_n','c_t','c_d','c_s'].forEach((x,i)=>{const el=document.getElementById(x); if(el) el.value=[fresh.n,fresh.t,fresh.d,fresh.s][i];}); return; }
  if(f.id==='payForm'){ const c=S.cards.find(x=>x.id===f.dataset.id); if(!c) return; const d={paid:true,paidAt:g('pa_d')||today(),paidAmount:g('pa_a').replace(/[^0-9.]/g,'')||null,payMethod:g('pa_m'),paidNote:g('pa_n')||null};
    ncpSheet(c.phone); await run(()=>patch('cards',c.id,d),'已确认付款 '+d.paidAt); return; }
  if(f.id==='noticeForm'){ const d={title:g('n_t'),body:g('n_b'),en_title:g('n_et'),en_body:g('n_eb'),ms_title:g('n_mt'),ms_body:g('n_mb'),photo:noticePhoto};
    if(!d.title&&!d.body&&!d.photo) return toast('请输入公告内容');
    const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
    try{ const r=await api('admin/notice',d); let sent=0, off=0, guard=0;
      while(r.total&&guard++<500){ toast(`正在发送… ${sent}/${r.total}`); const x=await api('admin/pushbatch',{id:r.id,offset:off}); sent+=x.sent; off=x.next; if(x.done||(!x.sent&&!x.failed)) break; }
      f.reset(); noticePhoto=null; toast(r.total?`公告已发出，${sent} 部手机收到通知`:'公告已发出，会员打开 App 就会看到'); }
    catch(err){ toast('没有成功：'+(err.message||'请稍后再试')); }
    btn.disabled=false; await refresh().catch(()=>{}); return; }
  if(f.id==='brandForm'){ const d={brandName:g('b_n')||null,brandSub:g('b_s')||null,brandShort:g('b_sh')||null}; await run(()=>putSettings({...S.settings,...d}),'俱乐部资料已更新'); return; }
  if(f.id==='homeForm'){ await run(()=>putSettings({...S.settings,eyebrow:g('h_e'),title:g('h_t'),sub:g('h_s'),title_en:g('h_ten')||null,title_ms:g('h_tms')||null,sub_en:g('h_sen')||null,sub_ms:g('h_sms')||null,terms:g('h_terms')||null}),'首页已更新'); return; }
});

async function saveQrPoster(){
  const src=document.querySelector('#qrbox canvas'); if(!src) return toast('二维码还没准备好');
  const W=900,H=1200,c=document.createElement('canvas'); c.width=W;c.height=H; const x=c.getContext('2d');
  x.fillStyle='#FBF5F3';x.fillRect(0,0,W,H); x.fillStyle='#7A1E3A';x.fillRect(0,0,W,260);
  x.fillStyle='#FFF7F2';x.textAlign='center';x.font='900 72px "Noto Serif SC",serif';x.fillText('NCP 打卡',W/2,140);
  x.font='500 30px "Noto Sans SC",sans-serif';x.fillText(brand().name+' · '+brand().sub,W/2,200);
  x.fillStyle='#fff';x.fillRect(170,330,560,560); x.drawImage(src,200,360,500,500);
  x.fillStyle='#2A1419';x.font='700 40px "Noto Sans SC",sans-serif';x.fillText('打开相机扫一扫，完成今日打卡',W/2,980);
  x.fillStyle='#7D6A6E';x.font='400 28px "Noto Sans SC",sans-serif';x.fillText(qrMode()==='daily'?'本二维码仅限 '+today()+' 使用':'Scan to check in every visit',W/2,1040);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));
  const u=URL.createObjectURL(blob); const lnk=document.createElement('a'); lnk.href=u; lnk.download=fileTag()+'-NCP打卡二维码'+(qrMode()==='daily'?'-'+today():'')+'.png';
  document.body.appendChild(lnk); lnk.click(); lnk.remove(); setTimeout(()=>URL.revokeObjectURL(u),5000); toast('二维码海报已下载');
}

// Sign-up poster: phones open the share sheet (Save image / WhatsApp), computers download it.
async function saveJoinPoster(){
  const src=document.querySelector('#joinbox canvas'); if(!src) return toast('二维码还没准备好');
  const W=900,H=1200,c=document.createElement('canvas'); c.width=W;c.height=H; const x=c.getContext('2d'), T=t=>trText(t);
  x.fillStyle='#FBF5F3';x.fillRect(0,0,W,H); x.fillStyle='#7A1E3A';x.fillRect(0,0,W,260);
  x.fillStyle='#FFF7F2';x.textAlign='center';x.font='900 72px "Noto Serif SC",serif';x.fillText(T('扫码加入会员'),W/2,140);
  x.font='500 30px "Noto Sans SC",sans-serif';x.fillText(brand().name+' · '+brand().sub,W/2,200);
  x.fillStyle='#fff';x.fillRect(170,330,560,560); x.drawImage(src,200,360,500,500);
  x.fillStyle='#2A1419';x.font='700 40px "Noto Sans SC",sans-serif';x.fillText(T('打开相机扫一扫，免费注册会员'),W/2,980);
  x.fillStyle='#7D6A6E';x.font='400 28px "Noto Sans SC",sans-serif';x.fillText(T('天天打卡，健康有加，好礼到家'),W/2,1040);x.fillText('Scan to join · Imbas untuk menyertai',W/2,1090);
  const blob=await new Promise(r=>c.toBlob(r,'image/png')); const name=fileTag()+'-会员注册二维码.png', file=new File([blob],name,{type:'image/png'});
  const phone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
  if(phone&&navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],title:brand().name}); return; }catch(e){ if(e&&e.name==='AbortError') return; } }
  const u=URL.createObjectURL(blob); const lnk=document.createElement('a'); lnk.href=u; lnk.download=name; document.body.appendChild(lnk); lnk.click(); lnk.remove(); setTimeout(()=>URL.revokeObjectURL(u),5000); toast('注册海报已下载');
}

