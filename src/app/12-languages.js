/* ---------- languages ---------- */
const I18N=__I18N__;
const LANGS=[['zh','中文'],['en','English'],['ms','Bahasa Melayu']];
let LANG=(()=>{try{return localStorage.getItem('vw_lang')||'zh'}catch(e){return 'zh'}})();
const L=()=>LANG;
const CJK=/[\u3400-\u9fff\uff01-\uff5e\u3000-\u303f]/;
const NUMRE=/10\+1|\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}|\d[\d,]*(?:\.\d+)?/g;
window._miss=new Set();
let FRAGS=null;
function frags(){ if(FRAGS) return FRAGS; const i=LANG==='en'?0:1; FRAGS=Object.keys(I18N).filter(k=>k.length>=2&&!k.includes('{')).sort((a,b)=>b.length-a.length).map(k=>[k,I18N[k][i]]); return FRAGS; }
function trText(str){
  if(LANG==='zh'||!str||!CJK.test(str)) return str;
  const lead=str.match(/^\s*/)[0], tail=str.match(/\s*$/)[0], core=str.trim(), nums=[];
  const key=core.replace(NUMRE,m=>{ if(m==='10+1') return m; nums.push(m);return '{'+(nums.length-1)+'}';});
  const hit=I18N[key]; let out;
  if(hit) out=hit[LANG==='en'?0:1];
  else { window._miss.add(key); out=key; for(const [k,v] of frags()){ if(out.includes(k)) out=out.split(k).join(v); if(!CJK.test(out)) break; } }
  out=out.replace(/\{(\d+)\}/g,(_,i)=>nums[+i]??'');
  return (/^[,.;:)!?]/.test(out)?'':lead)+out+tail;
}
const SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1};
function trNode(root){
  if(LANG==='zh'||!root) return;
  if(root.nodeType===3){ const p=root.parentElement; if(p&&!SKIP[p.tagName]&&!p.closest('[translate="no"]')){ const v=trText(root.nodeValue); if(v!==root.nodeValue) root.nodeValue=v; } return; }
  if(root.nodeType!==1||SKIP[root.tagName]||root.closest('[translate="no"]')) return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:n=>n.nodeType===1?((SKIP[n.tagName]||n.getAttribute('translate')==='no')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_SKIP):NodeFilter.FILTER_ACCEPT});
  const list=[]; let n; while((n=w.nextNode())) list.push(n);
  list.forEach(t=>{ const v=trText(t.nodeValue); if(v!==t.nodeValue) t.nodeValue=v; });
  [root,...root.querySelectorAll('[placeholder],[title],[aria-label]')].forEach(el=>{ if(el.closest('[translate="no"]')) return; ['placeholder','title','aria-label'].forEach(a=>{ const v=el.getAttribute&&el.getAttribute(a); if(v&&CJK.test(v)) el.setAttribute(a,trText(v)); }); });
}
const trObs=new MutationObserver(ms=>{ if(LANG==='zh') return; trObs.disconnect(); ms.forEach(m=>{ if(m.type==='characterData') trNode(m.target); else m.addedNodes.forEach(trNode); }); trWatch(); });
function trWatch(){ trObs.observe(document.body,{childList:true,subtree:true,characterData:true}); }
function setLang(l){ LANG=l; FRAGS=null; try{localStorage.setItem('vw_lang',l)}catch(e){} document.documentElement.lang=l==='zh'?'zh':l; closeSheet(); render(); pushLinked=null; syncPush(); }
