/* ---------- views ---------- */
/* ---------- 21-day course + Wellness Evaluation & Monitoring Form ---------- */
const C21T=__C21__;
const L3=(zh,en,ms)=>LANG==='en'?en:LANG==='ms'?ms:zh;
const dayTitle=n=>(C21T[LANG]||C21T.zh)[n-1]||'';
const MET=[
  {k:'weight',en:'WEIGHT',zh:'体重',ms:'Berat',u:'kg',good:-1,step:'0.1'},
  {k:'fat',en:'FAT %',zh:'体脂率',ms:'Lemak %',u:'%',good:-1,step:'0.1'},
  {k:'fatMass',en:'FAT MASS',zh:'体脂肪',ms:'Jisim lemak',u:'kg',good:-1,step:'0.1'},
  {k:'visceral',en:'VISCERAL FAT',zh:'内脏脂肪',ms:'Lemak viseral',u:'',good:-1,step:'0.5'},
  {k:'bone',en:'BONE MASS',zh:'骨量',ms:'Jisim tulang',u:'kg',good:1,step:'0.1'},
  {k:'bmr',en:'BMR',zh:'基础代谢',ms:'BMR',u:'kcal',good:0,step:'1',int:1},
  {k:'age',en:'METABOLIC AGE',zh:'新陈代谢年龄',ms:'Umur metabolik',u:'',good:-1,step:'1',int:1},
  {k:'muscle',en:'MUSCLE MASS',zh:'肌肉量',ms:'Jisim otot',u:'kg',good:1,step:'0.1'},
  {k:'musclePct',en:'MUSCLE %',zh:'肌肉%',ms:'Otot %',u:'',good:1,step:'0.1'},
  {k:'physique',en:'PHYSIQUE RATING',zh:'身体体格',ms:'Penilaian fizikal',u:'',good:null,step:'1',int:1},
  {k:'water',en:'WATER %',zh:'水分%',ms:'Air %',u:'',good:1,step:'0.1'},
  {k:'bmi',en:'BMI',zh:'身体质量指数',ms:'BMI',u:'',good:-1,step:'0.1',name:{en:'BMI (auto)',ms:'BMI (auto)'},auto:1}
];
const metName=M=>M.name&&LANG!=='zh'?M.name[LANG]:L3(M.zh,M.en.charAt(0)+M.en.slice(1).toLowerCase(),M.ms);
// Height (cm) of the record being shown, for BMI. Set by healthBody / healthBlock before values are read.
let curHeight=null;
const blankH=()=>({scans:[],done:{},profile:{}});
const CKEY='health21-progress-v1';
function localDone(){ try{ const v=JSON.parse(localStorage.getItem(CKEY)||'{}'); return (v&&v.done)||{}; }catch(e){ return {}; } }
// One member's health record; for the person using this phone, course days done on this device are included too.
function hOf(phone){
  const d=(S.health||[]).find(x=>x.id===phone)||{}; const out={...blankH(),...d,scans:(d.scans||[]).slice(),done:{...(d.done||{})},profile:{...(d.profile||{})}};
  if(phone===myPhone&&!isAdmin){ const loc=localDone(); for(const n in loc){ if(typeof loc[n]==='string'&&(!out.done[n]||loc[n]<out.done[n])) out.done[n]=loc[n]; } }
  out.scans.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.ts||0)-(b.ts||0)); return out;
}
const nextDay=done=>{for(let n=1;n<=21;n++) if(!done[n]) return n; return null;};
const doneN=done=>Object.keys(done||{}).filter(n=>+n>=1&&+n<=21).length;
// Days after CFREE() need the coach to open them (same rule as the server's courseOpen).
const CFREE=()=>+(S.courseFree||11);
const isCourseOpen=h=>!!h&&(h.open===true||(h.open!==false&&Object.keys(h.done||{}).some(k=>+k>CFREE())));
const coursePending=phone=>(S.requests||[]).some(r=>r.phone===phone&&r.type==='course'&&r.status==='pending');
function gateFor(phone){ return {max:isCourseOpen(hOf(phone))?21:CFREE(), pending:coursePending(phone)}; }
// Tell the course page how far this member may read; it re-draws when this changes.
function pushGate(){ try{ const m=me(); if(!m||courseAdmin) return; const g=JSON.stringify(gateFor(m.phone));
  if(localStorage.getItem('h21_gate')!==g){ localStorage.setItem('h21_gate',g); const w=document.getElementById('cframe').contentWindow; if(w&&w.h21Refresh) w.h21Refresh(); } }catch(e){} }
window.h21Ask=async()=>{ try{ await api('request',{type:'course'}); toast('已申请，教练开通后会通知你'); }catch(e){ toast('没有成功：'+(e.message||'请稍后再试')); } try{ await refresh(); }catch(_){} pushGate(); };
let hBusy=Promise.resolve();
function saveHealth(body){ hBusy=hBusy.then(async()=>{ const r=await api('health',body); const i=(S.health||[]).findIndex(x=>x.id===r.health.id); if(i>=0) S.health[i]=r.health; else (S.health=S.health||[]).push(r.health); render(); return r; }); return hBusy; }
// The course page keeps progress on this device; copy anything new into the member's record.
function syncCourse(){
  const m=me(); if(!m||isAdmin) return; const loc=localDone(), cur=((S.health||[]).find(x=>x.id===m.phone)||{}).done||{}, add={};
  for(const n in loc){ if(typeof loc[n]==='string'&&(!cur[n]||loc[n]<cur[n])) add[n]=loc[n]; }
  if(Object.keys(add).length) saveHealth({op:'done',done:add}).catch(()=>{});
}
// Before the course opens, give it the progress saved on the server (e.g. from another phone) and the app's language.
function primeCourse(){
  try{ const m=me(); if(m){ const h=hOf(m.phone); localStorage.setItem(CKEY,JSON.stringify({done:h.done})); } localStorage.setItem('h21_lang',LANG); }catch(e){}
  pushGate();
}
window.addEventListener('storage',e=>{ if(e.key===CKEY){ syncCourse(); } });
const f1=(v,k)=>{const x=+v; if(!isFinite(x)) return '–'; const M=MET.find(m=>m.k===k); return (M&&M.int)?String(Math.round(x)):(Math.round(x*10)/10).toString();};
const has=v=>v!==''&&v!=null&&isFinite(+v);
function val(s,k){
  if(k==='bmi'){ if(has(s.bmi)) return +s.bmi; const hm=+curHeight/100; return has(s.weight)&&hm>0.5?Math.round(s.weight/(hm*hm)*10)/10:null; }
  if(has(s[k])) return +s[k];
  if(k==='fatMass'&&has(s.weight)&&has(s.fat)) return Math.round(s.weight*s.fat)/100;
  if(k==='musclePct'&&has(s.weight)&&has(s.muscle)&&+s.weight>0) return Math.round(s.muscle/s.weight*1000)/10;
  return null;
}
function arrow(k,prev,cur){
  if(prev==null||cur==null) return '';
  const d=Math.round((cur-prev)*10)/10; if(Math.abs(d)<0.05) return '';
  const M=MET.find(x=>x.k===k); if(!M||M.good===null) return '';
  const cls=M.good===0?'flat':(Math.sign(d)===M.good?'good':'bad');
  return `<i class="ar ${cls}">${d>0?'▲':'▼'}</i>`;
}
function delta(k,a,b){ if(a==null||b==null) return ''; const d=b-a, M=MET.find(x=>x.k===k); const r=Math.round(d*10)/10;
  if(Math.abs(r)<0.05) return `<span class="dlt flat">— ${L3('没变','no change','tiada perubahan')}</span>`;
  const cls=M.good===0?'flat':(Math.sign(d)===M.good?'good':'bad'); return `<span class="dlt ${cls}">${d>0?'▲':'▼'} ${f1(Math.abs(d),k)} kg</span>`; }
const sd=d=>{const [y,m,dd]=String(d).split('-').map(Number); return `${dd}/${m}/${String(y).slice(2)}`;};
const ddays=(a,b)=>Math.round((parseD(b)-parseD(a))/864e5);
const PROGRAMS={WLP:['WLP 减重','WLP Weight loss','WLP Turun berat'],WGP:['WGP 增重','WGP Weight gain','WGP Naik berat'],WMP:['WMP 维持','WMP Maintain','WMP Kekal berat']};
const progName=k=>PROGRAMS[k]?L3(...PROGRAMS[k]):(k||'');
function lineChart(series,opt={}){
  const all=series.flatMap(s=>s.pts); if(all.length<2) return `<div class="empty" style="padding:18px 10px">${L3('至少要两次记录才会出现曲线','A line appears after two records','Graf muncul selepas dua rekod')}</div>`;
  const dates=[...new Set(all.map(p=>p.d))].sort();
  const W=340,Hh=190,Lf=38,R=12,T=12,B=28;
  let vals=all.map(p=>p.v); if(opt.target!=null) vals.push(opt.target);
  let lo=Math.min(...vals), hi=Math.max(...vals); if(hi-lo<1e-9){lo-=1;hi+=1;} const pad=(hi-lo)*.15; lo-=pad; hi+=pad;
  const X=d=>Lf+(W-Lf-R)*(dates.length===1?.5:dates.indexOf(d)/(dates.length-1)), Y=v=>T+(Hh-T-B)*(1-(v-lo)/(hi-lo));
  const grid=[0,.5,1].map(f=>{const v=lo+(hi-lo)*(1-f),y=T+(Hh-T-B)*f;return `<line x1="${Lf}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${Lf-6}" y="${y+4}" text-anchor="end" font-size="11" fill="var(--muted)">${(Math.round(v*10)/10)}</text>`}).join('');
  const tgt=opt.target!=null?`<line x1="${Lf}" x2="${W-R}" y1="${Y(opt.target)}" y2="${Y(opt.target)}" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W-R}" y="${Y(opt.target)-5}" text-anchor="end" font-size="11" fill="var(--ok)">${L3('目标','Target','Sasaran')} ${opt.target}</text>`:'';
  const lines=series.map(s=>{ if(!s.pts.length) return ''; const path=s.pts.map((p,i)=>`${i?'L':'M'}${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`+
      s.pts.map(p=>`<circle cx="${X(p.d)}" cy="${Y(p.v)}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/><rect x="${X(p.d)-12}" y="${Y(p.v)-14}" width="24" height="28" fill="transparent" data-tip="${esc(sd(p.d))} ${esc(s.name)}: ${p.v}" data-x="${X(p.d)}" data-y="${Y(p.v)}"/>`).join(''); }).join('');
  const legend=series.length>1?`<div class="lgd">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`:'';
  return `<div class="chartbox"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(opt.label||'')}">${grid}${tgt}${lines}
    <text x="${Lf}" y="${Hh-8}" font-size="11" fill="var(--muted)">${esc(sd(dates[0]))}</text><text x="${W-R}" y="${Hh-8}" text-anchor="end" font-size="11" fill="var(--muted)">${esc(sd(dates[dates.length-1]))}</text></svg><div class="ctip" hidden></div></div>${legend}`;
}
function wfHeader(m,h,admin){
  const p=h.profile||{}, base=h.scans[0], bw=base?val(base,'weight'):null;
  const tgt=has(p.target)?`${f1(p.target,'weight')} kg${bw!=null?` (${+p.target<bw?L3('减','lose','turun'):L3('增','gain','naik')} ${f1(Math.abs(bw-p.target),'weight')} kg)`:''}`:'';
  const c=(en,zh,ms,v)=>`<div><span>${LANG==='zh'?en+' '+zh:L3(zh,en,ms)}</span>${v?esc(v):'<em>—</em>'}</div>`;
  const g=p.gender==='M'?L3('男','Male','Lelaki'):p.gender==='F'?L3('女','Female','Perempuan'):p.gender;
  return `<div class="wf-info">
    ${c('Name','姓名','Nama',m.name)}${c('Sponsor','引荐人','Penaja',p.sponsor)}${c('Coach','教练','Jurulatih',p.coach)}${c('Contact','电话','Telefon',m.phone)}
    ${c('Age','年龄','Umur',p.age)}${c('Height','身高','Tinggi',has(p.height)?p.height+' cm':'')}${c('Gender','性别','Jantina',g)}${c('Program','计划','Program',progName(p.program))}
    ${c('Target','目标','Sasaran',tgt)}${c('Birthday','生日','Hari lahir',p.birthday)}
  </div>${admin?'':`<button class="link" data-act="editProfile" style="margin:6px 0 0">${L3('编辑个人资料 →','Edit my details →','Ubah maklumat saya →')}</button>`}`;
}
function wfTable(h,admin){
  const sc=h.scans, base=sc[0];
  const rows=MET.filter(M=>sc.some(s=>val(s,M.k)!=null));
  const th=sc.map((s,i)=>`<th>${i===0?`<small>${L3('Base-Line 基线','Base-line','Garis asas')}</small>`:''}${esc(sd(s.date))}</th>`).join('');
  const lab=M=>LANG==='zh'?`<b>${M.en}</b>${M.zh}${M.u?' ('+M.u+')':''}${M.auto?'<small style="display:block;font-size:11px;color:var(--muted)">自动计算</small>':''}`:`${metName(M)}${M.u&&!metName(M).includes(M.u)?' ('+M.u+')':''}`;
  const body=rows.map(M=>`<tr><th>${lab(M)}</th>${sc.map((s,i)=>{const v=val(s,M.k), pv=i?val(sc[i-1],M.k):null; return `<td>${v==null?'':f1(v,M.k)}${i?arrow(M.k,pv,v):''}</td>`}).join('')}</tr>`).join('');
  const tot=(k,zh,en,ms)=>{const b=val(base,k); return `<tr class="tot"><th>${LANG==='zh'?`<b>${en.toUpperCase()}</b>${zh}`:L3(zh,en,ms)}</th>${sc.map((s,i)=>{ if(!i) return '<td>—</td>'; const v=val(s,k); if(b==null||v==null) return '<td></td>'; const d=Math.round((b-v)*10)/10; return `<td class="${d>0?'pos':d<0?'neg':''}">${d}</td>`}).join('')}</tr>`;};
  const act=admin?'':`<tr class="act"><th>${L3('修改 / 删除','Edit / delete','Ubah / padam')}</th>${sc.map(s=>`<td><button data-act="editScan" data-id="${esc(s.id)}">${L3('修改','Edit','Ubah')}</button></td>`).join('')}</tr>`;
  return `<div class="wf-scroll"><table class="wf"><thead><tr><th>${LANG==='zh'?'<b>WEIGH-IN DATE</b>量身日期':L3('','Weigh-in date','Tarikh timbang')}</th>${th}</tr></thead>
    <tbody>${body}${tot('weight','共减重量(kg)','Total weight loss (kg)','Jumlah turun berat (kg)')}${tot('fatMass','共减脂肪(kg)','Total fat loss (kg)','Jumlah turun lemak (kg)')}${act}</tbody></table></div>
    ${!curHeight&&sc.some(s=>has(s.weight))?`<div class="wf-legend" style="color:var(--k4)">${L3('在「个人资料」填上身高，就会自动算出 BMI 身体质量指数。','Add your height in "My details" and BMI will be worked out automatically.','Isi tinggi dalam "Maklumat saya" dan BMI akan dikira secara automatik.')}</div>`:''}
    <div class="wf-legend">${L3('跟上一次比：','Compared with last time: ','Berbanding kali lepas: ')}<span class="good">▲▼</span> ${L3('好','good','baik')}　<span class="bad">▲▼</span> ${L3('要注意','watch','perlu perhatian')}　<span class="flat">▲▼</span> ${L3('看情况','depends','bergantung')}</div>`;
}
function wfNotes(h){
  const sc=h.scans, p=h.profile||{}; if(sc.length<2) return '';
  const a=sc[0], z=sc[sc.length-1], y=sc[sc.length-2], out=[];
  const g=(k,s)=>val(s,k), n=(v,k)=>f1(v,k), hl=(t,c)=>`<mark class="${c}">${t}</mark>`;
  if(g('weight',a)!=null&&g('weight',z)!=null){ const d=g('weight',a)-g('weight',z), dl=g('weight',y)!=null?g('weight',z)-g('weight',y):null, days=ddays(a.date,z.date), kg=hl(n(Math.abs(d),'weight')+' kg',d>=0?'g':'r'), fr=`(${n(g('weight',a),'weight')} → ${n(g('weight',z),'weight')})`, lk=dl!=null?hl(n(Math.abs(dl),'weight')+' kg',dl<=0?'g':'r'):'';
    out.push(L3(`${days} 天里，体重${d>=0?'减了':'增加了'} ${kg}${fr}。${dl!=null?`这一次比上一次${dl<=0?'减':'增'} ${lk}。`:''}`,
      `In ${days} days, weight ${d>=0?'went down':'went up'} ${kg} ${fr}. ${dl!=null?`Since last time: ${dl<=0?'down':'up'} ${lk}.`:''}`,
      `Dalam ${days} hari, berat ${d>=0?'turun':'naik'} ${kg} ${fr}. ${dl!=null?`Berbanding kali lepas: ${dl<=0?'turun':'naik'} ${lk}.`:''}`)); }
  if(g('fatMass',a)!=null&&g('fatMass',z)!=null){ const d=g('fatMass',a)-g('fatMass',z), dl=g('fatMass',y)!=null?g('fatMass',z)-g('fatMass',y):null, A=n(g('fatMass',a),'fatMass'), Z=n(g('fatMass',z),'fatMass'), kg=hl(n(Math.abs(d),'fatMass')+' kg',d>=0?'g':'r'), lk=dl!=null?hl(n(Math.abs(dl),'fatMass')+' kg',dl<=0?'g':'r'):'';
    out.push(L3(`脂肪从 ${A} kg 变成 ${Z} kg，共${d>=0?'减':'增加'} ${kg} 脂肪。${dl!=null?`这一次比上一次${dl<=0?'减':'增加'}了 ${lk}。`:''}`,
      `Fat went from ${A} kg to ${Z} kg: ${d>=0?'lost':'gained'} ${kg} of fat. ${dl!=null?`Since last time: ${dl<=0?'down':'up'} ${lk}.`:''}`,
      `Lemak daripada ${A} kg kepada ${Z} kg: ${d>=0?'turun':'naik'} ${kg} lemak. ${dl!=null?`Berbanding kali lepas: ${dl<=0?'turun':'naik'} ${lk}.`:''}`)); }
  if(g('muscle',y)!=null&&g('muscle',z)!=null){ const dm=g('muscle',z)-g('muscle',y), pp=g('musclePct',y), pz=g('musclePct',z), Y1=n(g('muscle',y),'muscle'), Z1=n(g('muscle',z),'muscle'), dd=`${dm>=0?'+':''}${n(dm,'muscle')} kg`;
    let t=L3(`肌肉量 ${Y1} → ${Z1} kg（${dd}）。`,`Muscle ${Y1} → ${Z1} kg (${dd}). `,`Otot ${Y1} → ${Z1} kg (${dd}). `);
    if(pp!=null&&pz!=null) t+= pz<pp?L3(`肌肉 % ${n(pp,'musclePct')}% → ${hl(n(pz,'musclePct')+'%','r')}：掉了，代表${hl('蛋白质可能不够，要增加蛋白质','r')}。`,`Muscle % ${n(pp,'musclePct')}% → ${hl(n(pz,'musclePct')+'%','r')}: it dropped, so ${hl('protein may be too low — add more protein','r')}.`,`Otot % ${n(pp,'musclePct')}% → ${hl(n(pz,'musclePct')+'%','r')}: menurun, jadi ${hl('protein mungkin tidak cukup — tambah protein','r')}.`)
      :L3(`肌肉 % ${n(pp,'musclePct')}% → ${hl(n(pz,'musclePct')+'%','g')}，保持得很好。`,`Muscle % ${n(pp,'musclePct')}% → ${hl(n(pz,'musclePct')+'%','g')}, well kept.`,`Otot % ${n(pp,'musclePct')}% → ${hl(n(pz,'musclePct')+'%','g')}, dikekalkan dengan baik.`);
    out.push(t); }
  const lastOf=k=>{for(let i=sc.length-1;i>=0;i--){const v=g(k,sc[i]); if(v!=null) return v;} return null;};
  if(lastOf('water')!=null){ const w=lastOf('water'); out.push(w<60?L3(`水分 ${hl(n(w,'water')+'%','r')}，还没达到 60%，每天要喝够 3–4 公升水。`,`Water ${hl(n(w,'water')+'%','r')} is below 60%. Drink 3–4 litres of water a day.`,`Air ${hl(n(w,'water')+'%','r')} di bawah 60%. Minum 3–4 liter air sehari.`)
    :L3(`水分 ${hl(n(w,'water')+'%','g')}，已经达到 60% 以上，继续保持。`,`Water ${hl(n(w,'water')+'%','g')} is 60% or more. Keep it up.`,`Air ${hl(n(w,'water')+'%','g')} sudah 60% atau lebih. Teruskan.`)); }
  if(g('age',a)!=null&&lastOf('age')!=null){ const d=lastOf('age')-g('age',a), A=n(g('age',a),'age'), Z=hl(n(lastOf('age'),'age'),d<=0?'g':'r'); out.push(L3(`新陈代谢年龄 ${A} → ${Z} 岁。`,`Metabolic age ${A} → ${Z}.`,`Umur metabolik ${A} → ${Z}.`)); }
  if(has(p.target)&&g('weight',z)!=null){ const r=g('weight',z)-p.target, T=n(p.target,'weight'); out.push(Math.abs(r)<0.05?L3(`已经达到目标体重 ${hl(T+' kg','g')}，恭喜！`,`Target weight ${hl(T+' kg','g')} reached. Well done!`,`Berat sasaran ${hl(T+' kg','g')} dicapai. Tahniah!`)
    :L3(`离目标体重 ${T} kg 还差 ${hl(n(Math.abs(r),'weight')+' kg','g')}，继续加油！`,`${hl(n(Math.abs(r),'weight')+' kg','g')} to go to the target of ${T} kg. Keep going!`,`Lagi ${hl(n(Math.abs(r),'weight')+' kg','g')} untuk sasaran ${T} kg. Teruskan!`)); }
  return `<div class="wf-notes"><h4>${L3('进度解说','Progress notes','Nota kemajuan')}</h4><ul>${out.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
}
function wfCharts(h){
  const sc=h.scans, p=h.profile||{}; if(sc.length<2) return '';
  const pts=k=>sc.map(s=>({d:s.date,v:val(s,k)})).filter(x=>x.v!=null).map(x=>({d:x.d,v:Math.round(x.v*10)/10}));
  const W=L3('体重','Weight','Berat'), F=L3('脂肪重量','Fat mass','Jisim lemak'), Mu=L3('肌肉量','Muscle mass','Jisim otot');
  return `<div class="wf-charts"><div><h4 class="c1">${W} (kg)</h4>${lineChart([{name:W,color:'var(--ok)',pts:pts('weight')}],{target:has(p.target)?+p.target:null,label:W})}</div>
    <div><h4 class="c2">${F} / ${Mu} (kg)</h4>${lineChart([{name:F,color:'var(--k2)',pts:pts('fatMass')},{name:Mu,color:'var(--k4)',pts:pts('muscle')}],{label:F+' / '+Mu})}</div></div>`;
}
function healthBody(h,admin,m){
  curHeight=has((h.profile||{}).height)?+h.profile.height:null;
  const empty=!h.scans.length?`<div class="empty" style="margin-top:12px">${L3('还没有 Tanita 记录。','No Tanita records yet.','Belum ada rekod Tanita.')}${admin?'':'<br>'+L3('每次量完体脂秤，按上面的「新增记录」把数字输入进来。','After each body-composition scan, tap "Add record" above and key in the numbers.','Selepas setiap imbasan, tekan "Tambah rekod" di atas dan masukkan nombor.')}</div>`:'';
  return `<div translate="no"><div class="wf-card"><div class="wf-title"><b>${L3('健康评估及检测表','Wellness Evaluation & Monitoring Form','Borang Penilaian & Pemantauan Kesihatan')}</b>${LANG==='zh'?'<small>WELLNESS EVALUATION AND MONITORING FORM</small>':''}</div>
    ${wfHeader(m,h,admin)}${h.scans.length?wfTable(h,admin):''}</div>${empty}${wfNotes(h)}${wfCharts(h)}</div>`;
}
function vHealth(){
  const m=me(); if(!m) return loginView();
  return `<div class="sec-h"><h2 style="font-family:var(--f-display);font-size:30px">健康检测表</h2></div>
  <p class="sub" style="margin:-4px 0 12px">每次量完体脂秤（Tanita），把数字输入进来，就会自动比较和画图。教练也看得到。</p>
  <div class="btnrow" style="margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn" data-act="editScan">${ic('plus',18)} 新增记录</button><button class="btn ghost" data-act="healthPdf" data-id="${esc(m.phone)}">${ic('history',18)} 导出 PDF / 分享</button></div>${healthBody(hOf(m.phone),false,m)}`;
}
function vCourse(){ const m=me(); return (m||courseAdmin)?'':`<div class="sec-h"><h2 style="font-family:var(--f-display);font-size:30px">21 天健康课程</h2></div><p class="sub" style="margin:-4px 0 12px">先登入，课程进度会跟你的会员资料连在一起。</p>`+loginView(); }
// Metrics the member keys in, one at a time. Fat mass and muscle % are worked out, so they are not asked.
const ASK=['weight','fat','visceral','bone','bmr','age','muscle','physique','water'];
let sfShown=1;
function scanForm(sid){
  const m=me(); if(!m) return; const s=sid?hOf(m.phone).scans.find(x=>x.id===sid):{date:today()}; if(!s) return;
  // When editing, open every item up to the last one that has a number, plus the next.
  let last=-1; ASK.forEach((k,i)=>{ if(has(s[k])) last=i; }); sfShown=Math.min(ASK.length,Math.max(1,last+2));
  const step=(k,i)=>{ const x=MET.find(M=>M.k===k); return `<div class="sfstep" data-i="${i}" ${i<sfShown?'':'hidden'}>
      <label for="s_${k}"><span class="sfn num">${i+1}/${ASK.length}</span> <span translate="no">${esc(metName(x))}${x.u&&!metName(x).includes(x.u)?' ('+x.u+')':''}</span></label>
      <div class="sfrow"><input class="inp num" id="s_${k}" type="number" inputmode="decimal" step="${x.step}" min="0" enterkeyhint="next" value="${has(s[k])?esc(s[k]):''}">
      ${i<ASK.length-1?`<button type="button" class="btn sm ghost" data-act="sfNext" data-i="${i}">${has(s[k])?'下一项':'跳过'}</button>`:''}</div></div>`; };
  const keep=['fatMass','musclePct'].filter(k=>has(s[k])).map(k=>`<input type="hidden" id="s_${k}" value="${esc(s[k])}">`).join('');
  openSheet(`<h3>${s.id?'修改记录':'新增记录'}</h3><form id="sf" data-id="${esc(s.id||'')}">
   <div class="field"><label for="s_date">量身日期</label><input class="inp" id="s_date" type="date" required value="${esc(s.date)}" max="${today()}"></div>
   <div class="sfsteps">${ASK.map(step).join('')}</div>${keep}
   <p class="sub" style="margin:4px 0 12px">一项一项填，没有的按「跳过」。体脂肪、肌肉 % 和 BMI 会自动算。</p>
   <div class="field"><label for="s_note">备注（选填）</label><input class="inp" id="s_note" maxlength="200" value="${esc(s.note||'')}"></div>
   <div class="actions">${s.id?`<button type="button" class="btn danger" data-act="delScan" data-id="${esc(s.id)}">删除</button>`:'<button type="button" class="btn ghost" data-act="close">取消</button>'}<button class="btn" type="submit">保存</button></div></form>`);
  setTimeout(()=>{ const el=document.getElementById('s_'+ASK[sfShown-1]); if(el&&!sid) el.focus(); },60);
}
// Open the next item and put the cursor in it.
function sfNext(i){
  const n=i+1; if(n>=ASK.length) return; if(n>=sfShown) sfShown=n+1;
  document.querySelectorAll('.sfstep').forEach(el=>{ if(+el.dataset.i<sfShown) el.hidden=false; });
  const el=document.getElementById('s_'+ASK[n]); if(el){ el.focus(); el.scrollIntoView({block:'center',behavior:'smooth'}); }
}
document.addEventListener('input',e=>{ const st=e.target.closest&&e.target.closest('.sfstep'); if(!st) return; const b=st.querySelector('[data-act="sfNext"]'); if(b) b.textContent=e.target.value.trim()?'下一项':'跳过'; });
document.addEventListener('keydown',e=>{ const st=e.target.closest&&e.target.closest('.sfstep'); if(st&&e.key==='Enter'){ e.preventDefault(); sfNext(+st.dataset.i); } });
function profileForm(){
  const m=me(); if(!m) return; const p=hOf(m.phone).profile||{};
  const f=(id,lab,v,type='text',extra='')=>`<div class="field"><label for="p_${id}">${lab}</label><input class="inp" id="p_${id}" type="${type}" value="${esc(v??'')}" ${extra}></div>`;
  openSheet(`<h3>个人资料</h3><form id="pfm">
   <div class="row2">${f('age','年龄',p.age,'number','inputmode="numeric" min="1"')}${f('height','身高 (cm)',p.height,'number','inputmode="decimal" step="0.1"')}</div>
   <div class="row2"><div class="field"><label for="p_gender">性别</label><select class="inp" id="p_gender"><option value="">—</option><option value="M" ${p.gender==='M'?'selected':''}>男</option><option value="F" ${p.gender==='F'?'selected':''}>女</option></select></div>
   <div class="field"><label for="p_program">计划</label><select class="inp" id="p_program" translate="no"><option value="">—</option>${Object.keys(PROGRAMS).map(k=>`<option value="${k}" ${p.program===k?'selected':''}>${esc(progName(k))}</option>`).join('')}</select></div></div>
   <div class="row2">${f('target','目标体重 (kg)',p.target,'number','inputmode="decimal" step="0.1"')}${f('birthday','生日',p.birthday,'date')}</div>
   <div class="row2">${f('coach','教练',p.coach)}${f('sponsor','引荐人',p.sponsor)}</div>
   <div class="actions"><button type="button" class="btn ghost" data-act="close">取消</button><button class="btn" type="submit">保存</button></div></form>`);
}
function healthBlock(m){
  const h=hOf(m.phone), nx=nextDay(h.done), sc=h.scans, last=sc[sc.length-1], first=sc.find(s=>has(s.weight)), dn=doneN(h.done);
  return `<div class="sec blk b-health"><div class="sec-h"><h2>我的健康旅程</h2></div><div class="hgrid">
   <button class="dcard" data-act="go" data-v="course"><span class="eb">21 天课程 · <span class="num">${dn}/21</span></span><b>${nx?`<span>第 ${nx} 天</span>`+(nx>gateFor(m.phone).max?`<span style="display:block;font-size:16px;color:var(--warn,#B5761A)">${gateFor(m.phone).pending?'已申请，等教练开通':'要教练开通'}</span>`:`<span style="display:block" translate="no">${esc(dayTitle(nx))}</span>`):'全部完成！'}</b><span class="cprog"><i style="width:${Math.round(dn/21*100)}%"></i></span></button>
   <button class="dcard" data-act="go" data-v="health"><span class="eb" style="color:var(--k4)">健康检测表 · ${sc.length} 次</span><b>${last&&has(last.weight)?`<span class="num">${f1(last.weight,'weight')} kg</span>`:'新增第一次记录'}</b>${last&&first&&sc.length>1&&first!==last?`<span translate="no">${delta('weight',+first.weight,+last.weight)}</span>`:''}</button>
  </div></div>`;
}
function healthSheet(phone){
  const m=S.members.find(x=>x.phone===phone); if(!m) return; const h=hOf(phone), nx=nextDay(h.done);
  openSheet(`<h3>${nt(m.name)} · 健康旅程</h3>
   <div class="ncp-stats" style="margin-bottom:14px"><div><span class="num big">${doneN(h.done)}<small style="font-size:16px">/21</small></span><span class="sub">${nx?`21 天课程 · 下一课第 ${nx} 天`:'21 天课程 · 已完成'}</span></div><div><span class="num big">${h.scans.length}</span><span class="sub">检测次数</span></div></div>
   <button class="btn block" data-act="healthPdf" data-id="${esc(phone)}" style="margin-bottom:12px">${ic('history',18)} 导出 PDF / 分享</button>
   ${healthBody(h,true,m)}`);
  reSheet=()=>healthSheet(phone);
}
