/* ---------- store (Cloudflare API) ---------- */
const S={rewards:[],tasks:[],members:[],requests:[],ledger:[],cards:[],checkins:[],settings:{}};
let live=true, isAdmin=false, loaded=false;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
let token=ls.get('vw_token'), adminToken=ls.get('vw_admin');
async function api(path,body){
  const h={'content-type':'application/json'}; if(token) h['x-token']=token; if(adminToken) h['x-admin']=adminToken;
  let r; try{ r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:h,body:body?JSON.stringify(body):undefined}); }catch(e){ throw new Error('网络不稳定，请再试一次'); }
  const j=await r.json().catch(()=>({error:'系统暂时没有回应，请稍后再试'}));
  if(!r.ok||j.error){ const e=new Error(j.error||'请稍后再试'); e.code=j.code; throw e; }
  return j;
}
const APP_VER='__VER__';
// A home-screen app can stay open for days. When the server has a newer version, reload once (only when nothing is being typed).
function maybeUpdate(v){
  if(!v||v===APP_VER||APP_VER.startsWith('__')) return;
  let last=null; try{ last=sessionStorage.getItem('vw_reloaded'); }catch(e){}
  if(last===v) return;
  const busy=document.getElementById('layer')&&document.getElementById('layer').innerHTML||(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  if(busy) return;
  try{ sessionStorage.setItem('vw_reloaded',v); }catch(e){}
  location.reload();
}
let lastRefresh=Date.now();
function wake(){ if(document.visibilityState!=='visible'||!loaded) return; if(Date.now()-lastRefresh<5000) return; refresh().catch(()=>{}); }
document.addEventListener('visibilitychange',wake); window.addEventListener('focus',wake); window.addEventListener('pageshow',e=>{ if(e.persisted) wake(); });
setInterval(()=>{ if(document.visibilityState==='visible'&&loaded&&Date.now()-lastRefresh>120000) refresh().catch(()=>{}); },30000);
async function refresh(){
  const j=await api('data'); lastRefresh=Date.now(); maybeUpdate(j.ver);
  Object.assign(S,{members:[],requests:[],ledger:[],cards:[],checkins:[],health:[]},j.data);
  S.members.forEach(m=>{ m.tier=tierInfo(m).tier; });
  isAdmin=!!j.admin; if(!isAdmin&&adminToken){ adminToken=null; ls.set('vw_admin',null); }
  if(token&&!j.me){ token=null; ls.set('vw_token',null); }
  myPhone=j.me||null;
  S.feed=j.admin?(j.data.myNotices||(j.me?[]:j.data.notices||[])):(j.data.notices||[]);
  S.bcasts=j.admin?(j.data.notices||[]):[]; S.push=j.data.push||null;
  loaded=true; render(); syncPush(); syncAdminPush(); syncCourse();
}
async function put(col,id,data){ id=id||uid(); await api('admin/put',{col,id,data}); return id; }
async function patch(col,id,data){ await api('admin/patch',{col,id,data}); }
async function del(col,id){ await api('admin/del',{col,id}); }
async function putSettings(data){ await api('admin/settings',{data}); }

const DEFAULT_TERMS=`积分只能用来兑换礼物，不能兑换现金。 Points cannot be exchanged for cash.
如果礼物缺货或停产，我们会以同等价值的产品代替。 If a gift is out of stock, it will be replaced with a product of equal value.
产品款式可能调整，图片仅供参考，以实际交付为准。 Product designs may change; images are for reference only.
一切最终决定权归店长所有。 The store manager reserves the right of final decision.`;
const TERMS_I18N={en:`Points can only be used to redeem gifts and cannot be exchanged for cash.
If a gift is out of stock, it will be replaced with a product of equal value.
Product designs may change; images are for reference only.
The store manager reserves the right of final decision.`,ms:`Mata ganjaran hanya boleh ditebus untuk hadiah dan tidak boleh ditukar kepada wang tunai.
Jika hadiah kehabisan stok, ia akan diganti dengan produk yang sama nilai.
Reka bentuk produk mungkin berubah; gambar hanya untuk rujukan.
Keputusan muktamad adalah hak pengurus kedai.`};
const termsText=()=>{ const own=S.settings&&S.settings.terms; if(own) return own.trim(); return (LANG!=='zh'&&TERMS_I18N[LANG])||DEFAULT_TERMS.trim(); };
const termsHtml=()=>`<ol translate="${S.settings&&S.settings.terms?'yes':'no'}">${termsText().split(/\n+/).filter(Boolean).map(l=>`<li>${esc(l)}</li>`).join('')}</ol>`;
const BRAND=__BRAND__;
