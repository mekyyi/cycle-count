/* =====================================================================
 *  Cycle Count — offline-first PWA
 *  Every line is saved on the device first (IndexedDB), then synced
 *  to Google Sheets through the Apps Script API when online.
 * ===================================================================== */
'use strict';

const API_URL = String((window.CC_CONFIG && window.CC_CONFIG.API_URL) || '').trim();
const API_READY = /^https:\/\//i.test(API_URL) && !/PASTE/i.test(API_URL);
const SCAN_LIB = 'html5-qrcode.min.js';
const SYNC_BATCH = 25;

/* =====================================================================
 *  i18n
 * ===================================================================== */
const I18N = {
  en:{
    loading:'Loading…', loadingData:'Downloading items and locations…',
    loginSub:'Sign in to start counting', username:'Username', password:'Password', signIn:'Sign in', signingIn:'Signing in…',
    setupWarn:'The server link isn’t set. Open config.js and paste the Apps Script web app URL.',
    install:'Install the app',
    iosNote:'On iPhone: tap <b>Share</b>, then <b>Add to Home Screen</b> to install the app.',
    syncNow:'Sync now', changeType:'Change count type', refreshData:'Refresh items & locations', signOut:'Sign out',
    pickType:'What are you counting today?', pickTypeSub:'Your lines are saved to the tab of the type you pick.',
    location:'Location', kept:'Kept for next item', locPh:'Type to search locations',
    item:'Item', itemPh:'Code, serial or name', quantity:'Quantity',
    next:'Save & next item', update:'Update line', cancel:'Cancel',
    hint:'Press Enter in Quantity to save. Scanners work in the item box.',
    todayLines:'Today’s lines', lines:'Lines', units:'Units', filterPh:'Filter lines',
    code:'Code', serial:'Serial', changeItem:'Change item',
    editing:'Editing line #{n}. Change anything, then press Update line.',
    emptyT:'No lines yet', emptyD:'Pick a location, find an item, enter the quantity and save.',
    noMatch:'No item matches “{q}”', noLoc:'No location matches “{q}”', more:'Keep typing to narrow {n} more results',
    errLocation:'Choose a location from the list', errItem:'Choose an item from the list', errQty:'Enter a quantity of 0 or more',
    savedLocal:'Saved on this device — it will sync when you’re online', updated:'Line updated', deleted:'Line deleted',
    pending:'Waiting to sync', syncingLine:'Syncing…', edited:'Edited', lineErr:'Not accepted: {e}', retry:'Retry',
    online:'Online', offline:'Offline', syncing:'Syncing', signInToSync:'Sign in to sync',
    offlineBar:'You’re offline. Keep counting — lines are saved on this device and sync when you’re back online.',
    syncedN:'{n} lines synced to the sheet', allSynced:'Everything is synced', nothingOffline:'You’re offline. Lines will sync automatically when you reconnect.',
    delTitle:'Delete this line?', delBody:'{name} — {qty} at {loc}. It will be removed from the sheet.', del:'Delete',
    outTitle:'Sign out?', outBody:'{n} lines haven’t synced yet. They stay on this device and sync the next time you sign in.', outOk:'Sign out',
    reauthTitle:'Sign in again', reauthBody:'Enter the password for {u} to sync your lines.',
    offlineLogin:'Signed in offline', needOnline:'Connect to the internet to do this.',
    ERR_CREDENTIALS:'Wrong username or password', ERR_SESSION:'Your sign-in expired. Sign in again to sync.',
    ERR_LOCATION:'location is missing', ERR_ITEM:'item is missing', ERR_QTY:'quantity is not valid',
    ERR_NOT_FOUND:'this line no longer exists in the sheet', ERR_FORBIDDEN:'you can only change your own lines',
    ERR_CATEGORY:'unknown count type', ERR_NETWORK:'Can’t reach the server. Check the connection and try again.',
    ERR_FIRST_ONLINE:'The first sign-in on this device needs internet.', ERR_SETUP:'The server link isn’t set in config.js.',
    ERR_NO_DATA:'Items aren’t on this device yet. Connect to the internet once to download them.',
    ERR_BAD_REQUEST:'the request was not valid', ERR_ACTION:'the server is an older version — redeploy Code.gs',
    dataInfo:'{items} items · {locs} locations · updated {t}', dataRefreshed:'Items and locations refreshed',
    cat_Brand:'Brand', cat_Floward:'Floward', 'cat_F&B':'F&B', cat_Cake:'Cake', cat_Noon:'Noon', cat_Recheck:'Recheck',
    recheckSub:'Items marked “no” in the variance reports', recheckToDo:'{n} to recheck',
    recheckTitle:'Items to recheck', recheckHint:'Pick an item. You’ll get one line for every place it was counted (tab + location) — enter the new quantity for each, or add new locations.',
    recheckEmpty:'Nothing to recheck. Type “no” in the Recheck column of a variance report.',
    recheckPending:'Needs recheck', recheckDone:'Done · {q}', report_main:'Main', report_noon:'Noon',
    rcWhere:'Where it was counted — enter the new quantity for each line', rcWas:'was {q}', rcNewQty:'New qty',
    rcAddLoc:'+ Add location', rcNoLines:'Not counted anywhere yet. Add the location where you found it.',
    rcBefore:'Before', rcAfter:'After', rcSave:'Save recheck', rcFillAll:'Enter the new quantity for every line (0 if it isn’t there).',
    rcAddFill:'Pick a tab and a location for each new line.', rcTab:'Tab', rcLoc:'Location', rcSaved:'Recheck saved',
    rcReopen:'Recheck again', rcRemove:'Remove',
    notInRecheck:'“{v}” isn’t in the recheck list.', ERR_REPORT:'unknown report',
    catSub:'Saved to the “{s}” tab',
    scanLoc:'Scan location', scanItem:'Scan item', takePhoto:'Take a photo of the barcode',
    loadingScanner:'Starting the scanner…', cameraStarting:'Opening the camera…',
    scanHint:'Point the camera at the barcode and hold steady.',
    cameraBlocked:'Live camera isn’t available. Allow camera access in the browser settings, or take a photo of the barcode.',
    reading:'Reading the barcode…', noCode:'No barcode found in the photo. Get closer, keep it sharp and try again.',
    scanLibFail:'The scanner couldn’t load. Type the code instead.',
    scanNoItem:'Scanned “{v}” — no exact item match. Pick from the list.',
    scanNoLoc:'Scanned “{v}” — no exact location match. Pick from the list.',
    autoScan:'Open scanner after each save'
  },
  ar:{
    loading:'جارٍ التحميل…', loadingData:'جارٍ تنزيل الأصناف واللوكيشنات…',
    loginSub:'سجّل الدخول لبدء الجرد', username:'اسم المستخدم', password:'كلمة المرور', signIn:'تسجيل الدخول', signingIn:'جارٍ الدخول…',
    setupWarn:'لينك السيرفر مش متظبط. افتح config.js والصق لينك الـ Web app بتاع Apps Script.',
    install:'تثبيت التطبيق',
    iosNote:'على الآيفون: اضغط <b>مشاركة</b> ثم <b>إضافة إلى الشاشة الرئيسية</b> لتثبيت التطبيق.',
    syncNow:'مزامنة الآن', changeType:'تغيير نوع الجرد', refreshData:'تحديث الأصناف واللوكيشنات', signOut:'تسجيل الخروج',
    pickType:'بتجرد إيه النهارده؟', pickTypeSub:'السطور هتتسجل في التاب الخاصة بالنوع اللي هتختاره.',
    location:'اللوكيشن', kept:'محفوظ للصنف الجاي', locPh:'اكتب للبحث عن لوكيشن',
    item:'الصنف', itemPh:'الكود أو السيريال أو الاسم', quantity:'الكمية',
    next:'حفظ والصنف التالي', update:'تحديث السطر', cancel:'إلغاء',
    hint:'اضغط Enter في خانة الكمية للحفظ. الاسكانر بيشتغل في خانة الصنف.',
    todayLines:'سطور النهارده', lines:'سطور', units:'قطع', filterPh:'فلترة السطور',
    code:'الكود', serial:'السيريال', changeItem:'تغيير الصنف',
    editing:'بتعدّل السطر رقم {n}. غيّر اللي محتاجه واضغط تحديث السطر.',
    emptyT:'مفيش سطور لسه', emptyD:'اختار لوكيشن، دوّر على الصنف، اكتب الكمية واحفظ.',
    noMatch:'مفيش صنف مطابق لـ «{q}»', noLoc:'مفيش لوكيشن مطابق لـ «{q}»', more:'كمّل كتابة لتضييق {n} نتيجة كمان',
    errLocation:'اختار لوكيشن من القائمة', errItem:'اختار صنف من القائمة', errQty:'اكتب كمية 0 أو أكتر',
    savedLocal:'اتحفظ على الجهاز — هيتزامن أول ما النت يرجع', updated:'تم تحديث السطر', deleted:'تم حذف السطر',
    pending:'مستني المزامنة', syncingLine:'جارٍ المزامنة…', edited:'معدّل', lineErr:'مترفض: {e}', retry:'إعادة المحاولة',
    online:'متصل', offline:'أوفلاين', syncing:'مزامنة', signInToSync:'سجّل دخول للمزامنة',
    offlineBar:'انت أوفلاين. كمّل جرد عادي — السطور بتتحفظ على الجهاز وهتتزامن أول ما النت يرجع.',
    syncedN:'تمت مزامنة {n} سطر مع الشيت', allSynced:'كل حاجة متزامنة', nothingOffline:'انت أوفلاين. السطور هتتزامن لوحدها لما النت يرجع.',
    delTitle:'حذف السطر ده؟', delBody:'{name} — {qty} في {loc}. هيتشال من الشيت.', del:'حذف',
    outTitle:'تسجيل الخروج؟', outBody:'فيه {n} سطر لسه ماتزامنش. هيفضلوا على الجهاز ويتزامنوا أول ما تسجّل دخول تاني.', outOk:'تسجيل الخروج',
    reauthTitle:'سجّل الدخول تاني', reauthBody:'اكتب كلمة المرور لـ {u} عشان سطورك تتزامن.',
    offlineLogin:'تم الدخول أوفلاين', needOnline:'محتاج نت عشان تعمل كده.',
    ERR_CREDENTIALS:'اسم المستخدم أو كلمة المرور غلط', ERR_SESSION:'الدخول انتهى. سجّل دخول تاني للمزامنة.',
    ERR_LOCATION:'اللوكيشن ناقص', ERR_ITEM:'الصنف ناقص', ERR_QTY:'الكمية مش صحيحة',
    ERR_NOT_FOUND:'السطر ده مش موجود في الشيت', ERR_FORBIDDEN:'تقدر تعدّل سطورك انت بس',
    ERR_CATEGORY:'نوع جرد غير معروف', ERR_NETWORK:'مش قادر أوصل للسيرفر. اتأكد من النت وحاول تاني.',
    ERR_FIRST_ONLINE:'أول دخول على الجهاز ده محتاج نت.', ERR_SETUP:'لينك السيرفر مش متظبط في config.js.',
    ERR_NO_DATA:'الأصناف لسه مش متنزلة على الجهاز. اتصل بالنت مرة واحدة لتنزيلها.',
    ERR_BAD_REQUEST:'الطلب مش صحيح', ERR_ACTION:'السيرفر نسخة قديمة — اعمل Deploy لـ Code.gs الجديد',
    dataInfo:'{items} صنف · {locs} لوكيشن · آخر تحديث {t}', dataRefreshed:'تم تحديث الأصناف واللوكيشنات',
    cat_Brand:'براند', cat_Floward:'فلاورد', 'cat_F&B':'F&B', cat_Cake:'كيك', cat_Noon:'نون', cat_Recheck:'إعادة جرد',
    recheckSub:'الأصناف المكتوب جنبها «no» في تقارير المطابقة', recheckToDo:'{n} صنف لإعادة الجرد',
    recheckTitle:'أصناف محتاجة إعادة جرد', recheckHint:'اختار الصنف. هيظهرلك سطر لكل مكان اتجرد فيه (التاب واللوكيشن) — اكتب الكمية الجديدة لكل سطر، أو ضيف لوكيشن جديد.',
    recheckEmpty:'مفيش أصناف لإعادة الجرد. اكتب «no» في عمود Recheck في تقرير المطابقة.',
    recheckPending:'محتاج إعادة جرد', recheckDone:'تم · {q}', report_main:'الرئيسي', report_noon:'نون',
    rcWhere:'الأماكن اللي اتجرد فيها — اكتب الكمية الجديدة لكل سطر', rcWas:'كان {q}', rcNewQty:'الكمية الجديدة',
    rcAddLoc:'+ لوكيشن جديد', rcNoLines:'الصنف ده ماتجردش في أي مكان. ضيف اللوكيشن اللي لقيته فيه.',
    rcBefore:'قبل', rcAfter:'بعد', rcSave:'حفظ إعادة الجرد', rcFillAll:'اكتب الكمية الجديدة لكل سطر (0 لو مش موجود).',
    rcAddFill:'اختار التاب واللوكيشن لكل سطر جديد.', rcTab:'التاب', rcLoc:'اللوكيشن', rcSaved:'تم حفظ إعادة الجرد',
    rcReopen:'إعادة الجرد تاني', rcRemove:'حذف',
    notInRecheck:'«{v}» مش موجود في قائمة إعادة الجرد.', ERR_REPORT:'تقرير غير معروف',
    catSub:'بيتسجل في تاب «{s}»',
    scanLoc:'اسكان اللوكيشن', scanItem:'اسكان الصنف', takePhoto:'صوّر الباركود',
    loadingScanner:'جارٍ تشغيل الاسكانر…', cameraStarting:'جارٍ فتح الكاميرا…',
    scanHint:'وجّه الكاميرا على الباركود وثبّت إيدك.',
    cameraBlocked:'الكاميرا مش متاحة. اسمح للكاميرا من إعدادات المتصفح، أو صوّر الباركود.',
    reading:'جارٍ قراءة الباركود…', noCode:'مفيش باركود واضح في الصورة. قرّب وخلي الصورة واضحة وحاول تاني.',
    scanLibFail:'الاسكانر ماتحمّلش. اكتب الكود بدل كده.',
    scanNoItem:'اتعمل اسكان «{v}» — مفيش صنف مطابق بالظبط. اختار من القائمة.',
    scanNoLoc:'اتعمل اسكان «{v}» — مفيش لوكيشن مطابق بالظبط. اختار من القائمة.',
    autoScan:'فتح الاسكانر بعد كل حفظ'
  }
};

/* =====================================================================
 *  Small helpers
 * ===================================================================== */
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
let LANG = store.get('cc_lang') || 'en';

function t(key, vars){
  let s = (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
  if (vars) Object.keys(vars).forEach(k => { s = s.split('{'+k+'}').join(vars[k]); });
  return s;
}
function $(s, root){ return (root||document).querySelector(s); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function lc(s){ return String(s==null?'':s).toLowerCase().trim(); }
function uuid(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r=Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); });
}
function today(){ const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function highlight(text, q){
  const s = String(text||''); if (!q) return esc(s);
  const i = s.toLowerCase().indexOf(q); if (i < 0) return esc(s);
  return esc(s.slice(0,i)) + '<mark>' + esc(s.slice(i,i+q.length)) + '</mark>' + esc(s.slice(i+q.length));
}
function initials(name){ return esc((String(name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('')||'?').toUpperCase()); }
function thumb(url, name, cls){
  if (url) return `<img class="${cls||''}" src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;ph ${cls||''}&quot;>${initials(name)}</div>'">`;
  return `<div class="ph ${cls||''}">${initials(name)}</div>`;
}
function fmtQty(n){ const x = Number(n); return Number.isInteger(x) ? x.toLocaleString('en-US') : x.toLocaleString('en-US',{maximumFractionDigits:3}); }
function errCode(err){
  const m = String((err && err.message) || err || '').match(/ERR_[A-Z_]+/);
  return m ? m[0] : null;
}
function errText(err){ const c = errCode(err); return c ? t(c) : String((err && err.message) || err); }
async function sha(s){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('');
}
function isOnline(){ return navigator.onLine !== false; }

function toast(msg, kind){
  const el = document.createElement('div');
  el.className = 'toast ' + (kind||'');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'error' ? 4500 : 2400);
}

function confirmModal({title, body, okText, danger}){
  return new Promise(res => {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3><p>${esc(body)}</p>
      <div class="row"><button class="btn btn-ghost" data-a="no">${esc(t('cancel'))}</button>
      <button class="btn ${danger?'btn-danger':'btn-primary'}" data-a="yes">${esc(okText)}</button></div></div></div>`;
    const close = v => { root.innerHTML=''; document.removeEventListener('keydown', onKey); res(v); };
    const onKey = e => { if (e.key==='Escape') close(false); };
    document.addEventListener('keydown', onKey);
    root.querySelector('[data-a=yes]').focus();
    root.onclick = e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a) close(a==='yes'); else if (e.target.classList.contains('modal-back')) close(false);
    };
  });
}

/* =====================================================================
 *  Device storage (IndexedDB, falls back to memory)
 * ===================================================================== */
const DB = (() => {
  const mem = new Map();
  let dbp = null, broken = false;
  function open(){
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('cyclecount', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn){
    if (broken || !window.indexedDB) throw new Error('nodb');
    const db = await open();
    return new Promise((res, rej) => {
      const tr = db.transaction('kv', mode);
      const req = fn(tr.objectStore('kv'));
      tr.oncomplete = () => res(req && req.result);
      tr.onerror = () => rej(tr.error);
      tr.onabort = () => rej(tr.error);
    });
  }
  return {
    async get(k){ try { return await tx('readonly', s => s.get(k)); } catch(e){ broken = true; return mem.get(k); } },
    async set(k, v){ try { await tx('readwrite', s => s.put(v, k)); } catch(e){ broken = true; mem.set(k, v); } },
    async del(k){ try { await tx('readwrite', s => s.delete(k)); } catch(e){ broken = true; mem.delete(k); } }
  };
})();
// Ask the browser to keep our data even when storage is low
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* =====================================================================
 *  State
 * ===================================================================== */
const state = {
  token: null, user: null, categories: [],
  category: null,
  items: [], locations: [], dataUpdatedAt: '',
  selected: null, location: '',
  lines: [], editingId: null, filter: '',
  outbox: [], inflight: new Set(), syncing: false, sessionInvalid: false,
  recheck: [], recheckTabs: {}, rcDraft: null
};
const RECHECK = 'Recheck';

/* Recheck panel — built here so the page file doesn't need to change */
(function injectRecheckUI(){
  const css = document.createElement('style');
  css.textContent = `
  .recheck-panel{display:grid;gap:10px}
  .recheck-panel .rc-hint{font-size:13px;color:var(--muted);background:#F3F7F7;border-radius:var(--radius-sm);padding:9px 12px}
  .recheck-panel h4{margin:2px 0 0;font-size:13px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.4px}
  .rc-list{display:grid;gap:6px;max-height:340px;overflow:auto}
  .rc-item{display:flex;gap:10px;align-items:center;border:1.5px solid var(--line);border-radius:var(--radius);padding:8px 10px;background:var(--surface);text-align:start;width:100%}
  .rc-item:hover{border-color:var(--ink-3)}
  .rc-item img,.rc-item .ph{width:42px;height:42px;border-radius:8px;object-fit:cover;flex:none}
  .rc-item .t{min-width:0;flex:1}
  .rc-item .n{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rc-item .m{font-size:12.5px;color:var(--muted);display:flex;gap:8px;flex-wrap:wrap}
  .rc-tag{font-size:11px;font-weight:700;border-radius:6px;padding:1px 7px;white-space:nowrap}
  .rc-tag.pending{background:#FFE7DD;color:#9A2A00}
  .rc-tag.done{background:#D6F0DF;color:#1B6B3C}
  .rc-tag.rep{background:#E2EBEC;color:var(--ink-3)}
  .rc-empty{font-size:14px;color:var(--muted);text-align:center;padding:14px}
  .cat-tile .rc-count{justify-self:start;background:#FFE7DD;color:#9A2A00;font-weight:700;font-size:12.5px;border-radius:999px;padding:2px 10px}
  .cat-tile.recheck{border-color:#F1C6B4}
  .rc-editor{display:grid;gap:10px}
  .rc-editor h4{margin:0;font-size:13px;color:var(--muted);font-weight:700}
  .rc-line{display:grid;grid-template-columns:1fr 108px;gap:10px;align-items:center;border:1.5px solid var(--line);border-radius:var(--radius);padding:10px 12px}
  .rc-line.changed{border-color:var(--ink-3);background:#F7FAFA}
  .rc-line .w{font-weight:700;font-size:14.5px}
  .rc-line .m{font-size:12px;color:var(--muted)}
  .rc-line .was{font-size:13px;color:var(--ink-3);font-weight:700;margin-top:2px}
  .rc-line input,.rc-add input,.rc-add select{width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px;font-size:17px;font-weight:700;text-align:center;background:var(--surface);color:var(--text)}
  .rc-line input:focus,.rc-add input:focus,.rc-add select:focus{outline:none;border-color:var(--ink-3)}
  .rc-add{display:grid;grid-template-columns:1fr 1fr 90px 36px;gap:8px;align-items:center;border:1.5px dashed var(--ink-3);border-radius:var(--radius);padding:10px}
  .rc-add input.loc,.rc-add select{font-size:14px;font-weight:600;text-align:start}
  .rc-add .x{border:1px solid var(--line);background:var(--surface);border-radius:9px;height:36px;color:var(--danger)}
  .rc-addbtn{border:1.5px dashed var(--line);background:none;border-radius:var(--radius);padding:11px;font-weight:700;color:var(--ink-3)}
  .rc-total{display:flex;justify-content:space-between;align-items:center;background:var(--ink);color:var(--champagne);border-radius:var(--radius);padding:12px 16px;font-weight:700}
  .rc-total b{font-size:20px;font-variant-numeric:tabular-nums}
  .rc-total .arrow{opacity:.7}
  .rc-total .diff{font-size:13px;opacity:.85}
  .rc-msg{color:var(--danger);font-size:13px;min-height:0}
  .line .q.rc{font-size:15px;white-space:nowrap}
  @media (max-width:560px){ .rc-add{grid-template-columns:1fr 1fr;} .rc-add .x{grid-column:2} }`;
  document.head.appendChild(css);
  const panel = document.createElement('div');
  panel.id = 'recheck-panel'; panel.className = 'recheck-panel hidden';
  $('#search-block').before(panel);
  const ed = document.createElement('div');
  ed.id = 'rc-editor'; ed.className = 'rc-editor hidden';
  $('#item-card-wrap').after(ed);
  const dl = document.createElement('datalist'); dl.id = 'rc-locs'; document.body.appendChild(dl);
})();

/* =====================================================================
 *  Server API (Apps Script web app)
 * ===================================================================== */
async function api(action, body, timeoutMs){
  if (!API_READY) throw new Error('ERR_SETUP');
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), timeoutMs || 45000);
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // avoids CORS preflight
      body: JSON.stringify(Object.assign({ action, token: state.token }, body || {}))
    });
  } catch (e) {
    throw new Error('ERR_NETWORK');
  } finally { clearTimeout(tm); }
  let j;
  try { j = await res.json(); } catch(e){ throw new Error('ERR_NETWORK'); }
  if (!j.ok){
    const err = new Error(j.error || 'ERR_UNKNOWN');
    if (errCode(err) === 'ERR_SESSION' && action !== 'login') onSessionInvalid();
    throw err;
  }
  return j.data;
}

/* =====================================================================
 *  i18n apply
 * ===================================================================== */
function applyLang(){
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-html]').forEach(el => el.innerHTML = t(el.dataset.i18nHtml));
  document.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
  document.querySelectorAll('.js-lang').forEach(b => { b.innerHTML = LANG === 'en' ? '<span class="ar">العربية</span>' : 'English'; });
  if (state.category) renderCatPill();
  if (!$('#screen-cat').classList.contains('hidden')) renderCategories();
  renderAutoScan(); renderDataInfo(); renderItemCard(); renderRecheckPanel(); renderEditMode(); renderLines(); renderNet();
}
document.querySelectorAll('.js-lang').forEach(b => b.addEventListener('click', () => {
  LANG = LANG === 'en' ? 'ar' : 'en'; store.set('cc_lang', LANG); applyLang();
}));

/* =====================================================================
 *  Screens
 * ===================================================================== */
function show(screen){
  $('#loader').classList.add('hidden');
  $('#screen-login').classList.toggle('hidden', screen !== 'login');
  $('#app').classList.toggle('hidden', screen === 'login');
  $('#screen-cat').classList.toggle('hidden', screen !== 'cat');
  $('#screen-count').classList.toggle('hidden', screen !== 'count');
  $('#cat-pill').classList.toggle('hidden', screen !== 'count');
  renderNet();
}
function showLoader(text){ $('#loader-text').textContent = text; $('#loader').classList.remove('hidden'); }

/* =====================================================================
 *  Login (online, or offline on a device that signed in before)
 * ===================================================================== */
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#login-btn');
  btn.disabled = true; btn.textContent = t('signingIn'); $('#login-error').textContent = '';
  try {
    const res = await signIn($('#login-user').value, $('#login-pass').value);
    $('#login-pass').value = '';
    await afterLogin(res);
  } catch (err) {
    $('#login-error').textContent = errText(err);
  } finally {
    btn.disabled = false; btn.textContent = t('signIn');
  }
});

async function signIn(username, password){
  username = String(username||'').trim(); password = String(password||'').trim();
  if (!username || !password) throw new Error('ERR_CREDENTIALS');
  if (API_READY && isOnline()){
    try {
      const res = await api('login', { username, password });
      await rememberAccount(res, username, password);
      return res;
    } catch (err) {
      if (errCode(err) !== 'ERR_NETWORK') throw err;   // wrong password etc.
    }
  }
  // Offline sign-in: only for accounts that signed in online on this device before
  const acct = await DB.get('acct:' + lc(username));
  if (!acct) throw new Error(API_READY ? 'ERR_FIRST_ONLINE' : 'ERR_SETUP');
  if (acct.hash !== await sha('cc-offline|' + lc(username) + '|' + password)) throw new Error('ERR_CREDENTIALS');
  toast(t('offlineLogin'));
  return { token: acct.token, user: acct.user, categories: acct.categories, offline: true };
}

async function rememberAccount(res, username, password){
  const hash = await sha('cc-offline|' + lc(username) + '|' + password);
  await DB.set('acct:' + lc(res.user), { hash, token: res.token, user: res.user, categories: res.categories });
}

async function afterLogin(res){
  state.token = res.token; state.user = res.user; state.categories = res.categories;
  state.sessionInvalid = false;
  await DB.set('auth', { token: res.token, user: res.user, categories: res.categories });
  $('#who').textContent = res.user;
  $('#menu-user').textContent = res.user;
  state.outbox = (await DB.get('outbox')) || [];

  // Items & locations: device copy first, then refresh from the server when online
  const cached = await DB.get('master');
  if (cached) applyMaster(cached);
  if (!cached){
    if (!isOnline() || !API_READY){ toast(t('ERR_NO_DATA'), 'error'); }
    else await loadMaster(false, true);
  } else if (isOnline() && API_READY && Date.now() - (cached.fetchedAt||0) > 30*60000){
    loadMaster(false, false);   // background refresh
  }

  const lastCat = store.get('cc_cat');
  if (lastCat && state.categories.includes(lastCat)) openCategory(lastCat);
  else { renderCategories(); show('cat'); }
  renderNet();
  loadRecheck(true);
  syncSoon(500);
}

async function loadMaster(force, withLoader){
  if (!isOnline()){ toast(t('needOnline'), 'error'); return; }
  if (withLoader) showLoader(t('loadingData'));
  try {
    const data = await api('master', { force: !!force }, 90000);
    data.fetchedAt = Date.now();
    await DB.set('master', data);
    applyMaster(data);
    if (force) toast(t('dataRefreshed'), 'ok');
  } catch (err) {
    if (errCode(err) !== 'ERR_SESSION') toast(errText(err), 'error');
  } finally {
    $('#loader').classList.add('hidden');
  }
}
function applyMaster(data){
  state.items = (data.items || []).map(it => Object.assign({}, it, { _c: lc(it.c), _s: lc(it.s), _n: lc(it.n) }));
  state.locations = data.locations || [];
  state.dataUpdatedAt = data.updatedAt || '';
  renderDataInfo();
}
function renderDataInfo(){
  const s = state.dataUpdatedAt ? t('dataInfo', { items: state.items.length.toLocaleString('en-US'), locs: state.locations.length, t: state.dataUpdatedAt }) : '';
  $('#menu-data').textContent = s;
  $('#data-status').textContent = s;
}

function onSessionInvalid(){
  if (state.sessionInvalid) return;
  state.sessionInvalid = true;
  renderNet();
  toast(t('ERR_SESSION'), 'error');
}

/** Re-enter the password without leaving the count screen */
function reauthModal(){
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-back"><form class="modal" id="reauth" role="dialog" aria-modal="true">
    <h3>${esc(t('reauthTitle'))}</h3><p>${esc(t('reauthBody', { u: state.user }))}</p>
    <input type="password" id="reauth-pass" class="modal-input" autocomplete="current-password" aria-label="${esc(t('password'))}">
    <div class="err" id="reauth-err"></div>
    <div class="row"><button type="button" class="btn btn-ghost" data-a="no">${esc(t('cancel'))}</button>
    <button class="btn btn-primary" type="submit">${esc(t('signIn'))}</button></div></form></div>`;
  const close = () => { root.innerHTML = ''; };
  $('#reauth-pass').focus();
  root.querySelector('[data-a=no]').onclick = close;
  $('#reauth').onsubmit = async e => {
    e.preventDefault();
    const pw = $('#reauth-pass').value;
    try {
      const res = await api('login', { username: state.user, password: pw });
      await rememberAccount(res, state.user, pw);
      state.token = res.token; state.sessionInvalid = false;
      await DB.set('auth', { token: res.token, user: res.user, categories: res.categories });
      close(); renderNet(); syncSoon(100);
    } catch (err) { $('#reauth-err').textContent = errText(err); }
  };
}

async function signOut(){
  const pending = myOps().length;
  if (pending){
    const ok = await confirmModal({ title: t('outTitle'), body: t('outBody', { n: pending }), okText: t('outOk') });
    if (!ok) return;
  }
  state.token = null; state.category = null; state.lines = []; state.selected = null; state.editingId = null;
  await DB.del('auth'); store.del('cc_cat');
  show('login');
}

/* =====================================================================
 *  Categories & menu
 * ===================================================================== */
function catLabel(c){ const k = 'cat_' + c; const v = t(k); return v === k ? c : v; }
function renderCategories(){
  const pending = state.recheck.filter(r => r.status === 'pending').length;
  $('#cat-grid').innerHTML = state.categories.map(c => c === RECHECK
    ? `<button class="cat-tile recheck" type="button" data-cat="${esc(c)}"><b>${esc(catLabel(c))}</b><span>${esc(t('recheckSub'))}</span>${pending ? `<span class="rc-count">${esc(t('recheckToDo',{n:pending}))}</span>` : ''}</button>`
    : `<button class="cat-tile" type="button" data-cat="${esc(c)}"><b>${esc(catLabel(c))}</b><span>${esc(t('catSub',{s:c}))}</span></button>`
  ).join('');
}

/* ---------------- Recheck list ---------------- */
async function loadRecheck(fromServer){
  if (!state.recheck.length){ const cached = await DB.get('recheck'); if (cached) setRecheck(cached); }
  if (fromServer && isOnline() && API_READY && !state.sessionInvalid){
    try { const list = await api('recheckList'); await DB.set('recheck', list); setRecheck(list); } catch(e){}
  }
}
function setRecheck(list){
  if (list && !Array.isArray(list)){ state.recheckTabs = list.tabs || {}; list = list.items; }
  const bySerial = new Map(state.items.map(x => [lc(x.s), x]));
  state.recheck = (list || []).map(r => {
    const cat = bySerial.get(lc(r.s));
    const it = { s: String(r.s), c: r.c || (cat && cat.c) || '', n: r.n || (cat && cat.n) || '', i: cat ? cat.i : '',
                 src: '', report: r.report, status: r.status, total: r.total, before: r.before, lines: r.lines || [] };
    it._c = lc(it.c); it._s = lc(it.s); it._n = lc(it.n);
    return it;
  }).sort((a,b) => (a.status === b.status ? a._n.localeCompare(b._n) : a.status === 'pending' ? -1 : 1));
  renderRecheckPanel();
  if (!$('#screen-cat').classList.contains('hidden')) renderCategories();
}
function applyModeUI(){
  const rc = state.category === RECHECK;
  $('.loc-band').classList.toggle('hidden', rc);
  qtyInput.closest('.qty-row').parentElement.classList.toggle('hidden', rc);
  $('#actions').classList.toggle('hidden', rc);
  $('.kbd-hint').classList.toggle('hidden', rc);
  const dl = $('#rc-locs');
  if (rc && dl && !dl.childElementCount) dl.innerHTML = state.locations.map(l => `<option value="${esc(l)}">`).join('');
}

function startRecheckDraft(it){
  state.rcDraft = {
    lines: (it.lines || []).map(l => Object.assign({}, l, { newQty: '' })),
    adds: (it.lines || []).length ? [] : [{ sheet: (state.recheckTabs[it.report] || [])[0] || '', location: '', qty: '' }]
  };
}
function rcNum(v){ return String(v).trim() === '' ? null : Number(v); }
function rcTotals(){
  const d = state.rcDraft; if (!d) return { before: 0, after: 0 };
  const before = d.lines.reduce((a,l) => a + (Number(l.qty)||0), 0);
  const after = d.lines.reduce((a,l) => a + (rcNum(l.newQty) == null ? (Number(l.qty)||0) : rcNum(l.newQty)), 0)
              + d.adds.reduce((a,x) => a + (rcNum(x.qty) || 0), 0);
  return { before: Math.round(before*1e6)/1e6, after: Math.round(after*1e6)/1e6 };
}
function renderRcTotals(){
  const el = $('#rc-total'); if (!el) return;
  const { before, after } = rcTotals();
  const diff = Math.round((after - before)*1e6)/1e6;
  el.innerHTML = `<span>${esc(t('rcBefore'))} <b>${fmtQty(before)}</b></span><span class="arrow">→</span>
    <span>${esc(t('rcAfter'))} <b>${fmtQty(after)}</b> <span class="diff">(${diff > 0 ? '+' : ''}${fmtQty(diff)})</span></span>`;
}
function renderRecheckEditor(){
  const ed = $('#rc-editor'); if (!ed) return;
  const it = state.selected;
  const show = state.category === RECHECK && !!it && !!state.rcDraft;
  ed.classList.toggle('hidden', !show);
  if (!show){ ed.innerHTML = ''; return; }
  const d = state.rcDraft;
  const tabs = state.recheckTabs[it.report] || [];
  ed.innerHTML = `
    <h4>${esc(t('rcWhere'))}</h4>
    ${d.lines.length ? d.lines.map((l,i) => `
      <div class="rc-line${rcNum(l.newQty) != null && rcNum(l.newQty) !== Number(l.qty) ? ' changed' : ''}">
        <div><div class="w">${esc(l.sheet)} · 📍 ${esc(l.location || '—')}</div>
          <div class="m">${esc([l.user, l.time].filter(Boolean).join(' · '))}</div>
          <div class="was">${esc(t('rcWas', { q: fmtQty(l.qty) }))}</div></div>
        <input type="number" inputmode="decimal" min="0" step="any" data-rl="${i}" value="${esc(l.newQty)}" placeholder="${esc(fmtQty(l.qty))}" aria-label="${esc(t('rcNewQty'))}">
      </div>`).join('') : `<div class="rc-hint">${esc(t('rcNoLines'))}</div>`}
    ${d.adds.map((a,i) => `
      <div class="rc-add">
        <select data-ra-sheet="${i}" aria-label="${esc(t('rcTab'))}">${tabs.map(tb => `<option${tb===a.sheet?' selected':''}>${esc(tb)}</option>`).join('')}</select>
        <input class="loc" list="rc-locs" data-ra-loc="${i}" value="${esc(a.location)}" placeholder="${esc(t('rcLoc'))}" autocomplete="off">
        <input type="number" inputmode="decimal" min="0" step="any" data-ra-qty="${i}" value="${esc(a.qty)}" placeholder="0" aria-label="${esc(t('rcNewQty'))}">
        <button type="button" class="x" data-ra-del="${i}" aria-label="${esc(t('rcRemove'))}">✕</button>
      </div>`).join('')}
    ${tabs.length ? `<button type="button" class="rc-addbtn" id="rc-add">${esc(t('rcAddLoc'))}</button>` : ''}
    <div class="rc-total" id="rc-total"></div>
    <div class="rc-msg" id="rc-msg"></div>
    <div class="actions edit">
      <button class="btn btn-ghost" type="button" id="rc-cancel">${esc(t('cancel'))}</button>
      <button class="btn btn-primary" type="button" id="rc-save">${esc(t('rcSave'))}</button>
    </div>`;
  renderRcTotals();
}
document.addEventListener('input', e => {
  const d = state.rcDraft; if (!d) return;
  const el = e.target;
  if (el.dataset.rl != null){ d.lines[+el.dataset.rl].newQty = el.value;
    el.closest('.rc-line').classList.toggle('changed', rcNum(el.value) != null && rcNum(el.value) !== Number(d.lines[+el.dataset.rl].qty)); }
  else if (el.dataset.raLoc != null) d.adds[+el.dataset.raLoc].location = el.value;
  else if (el.dataset.raQty != null) d.adds[+el.dataset.raQty].qty = el.value;
  else if (el.dataset.raSheet != null) d.adds[+el.dataset.raSheet].sheet = el.value;
  else return;
  renderRcTotals();
});
document.addEventListener('change', e => {
  const d = state.rcDraft; if (!d || e.target.dataset.raSheet == null) return;
  d.adds[+e.target.dataset.raSheet].sheet = e.target.value;
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.closest || !e.target.closest('#rc-editor')) return;
  if (e.target.tagName === 'BUTTON') return;
  e.preventDefault();
  const inputs = [...document.querySelectorAll('#rc-editor input, #rc-editor select')];
  const i = inputs.indexOf(e.target);
  if (i >= 0 && i < inputs.length - 1) inputs[i+1].focus(); else saveRecheck();
});
document.addEventListener('click', e => {
  if (e.target.id === 'rc-add'){
    const tabs = state.recheckTabs[state.selected.report] || [];
    state.rcDraft.adds.push({ sheet: tabs[0] || '', location: state.location || '', qty: '' });
    renderRecheckEditor();
    const q = document.querySelectorAll('#rc-editor [data-ra-loc]'); if (q.length) q[q.length-1].focus();
  } else if (e.target.dataset && e.target.dataset.raDel != null){
    state.rcDraft.adds.splice(+e.target.dataset.raDel, 1); renderRecheckEditor();
  } else if (e.target.id === 'rc-cancel'){
    state.selected = null; state.rcDraft = null; renderItemCard();
  } else if (e.target.id === 'rc-save') saveRecheck();
});

async function saveRecheck(){
  const it = state.selected, d = state.rcDraft; if (!it || !d) return;
  const msg = $('#rc-msg'); msg.textContent = '';
  const bad = d.lines.findIndex(l => rcNum(l.newQty) == null || !isFinite(rcNum(l.newQty)) || rcNum(l.newQty) < 0);
  if (bad >= 0){ msg.textContent = t('rcFillAll'); const el = document.querySelector(`[data-rl="${bad}"]`); if (el) el.focus(); return; }
  const adds = d.adds.filter(a => String(a.qty).trim() !== '' || String(a.location).trim() !== '');
  if (adds.some(a => !a.sheet || !String(a.location).trim() || rcNum(a.qty) == null || rcNum(a.qty) < 0)){ msg.textContent = t('rcAddFill'); return; }
  if (!d.lines.length && !adds.length){ msg.textContent = t('rcAddFill'); return; }
  const { before, after } = rcTotals();
  const payload = {
    serial: it.s, report: it.report, code: it.c, name: it.n, image: it.i, countedAt: new Date().toISOString(),
    lines: d.lines.map(l => ({ sheet: l.sheet, row: l.row, id: l.id, location: l.location, qty: rcNum(l.newQty) })),
    adds: adds.map(a => ({ sheet: a.sheet, location: String(a.location).trim(), qty: rcNum(a.qty) }))
  };
  const details = d.lines.map(l => `${l.sheet} ${l.location||''}: ${fmtQty(l.qty)} → ${fmtQty(rcNum(l.newQty))}`)
    .concat(adds.map(a => `${a.sheet} ${a.location}: +${fmtQty(rcNum(a.qty))}`)).join(' | ');
  const line = { id: uuid(), category: RECHECK, serial: it.s, code: it.c, name: it.n, image: it.i, report: it.report,
                 before, qty: after, location: details, details, countedAt: payload.countedAt, time: '', edited: '',
                 _status: 'pending', _fresh: true, _payload: payload };
  state.lines.unshift(line);
  // reflect locally so the list is right even offline
  it.status = 'done'; it.before = before; it.total = after;
  it.lines = d.lines.map(l => Object.assign({}, l, { qty: rcNum(l.newQty) }));
  await DB.set('recheck', { items: state.recheck.map(x => Object.assign({}, x)), tabs: state.recheckTabs });
  state.selected = null; state.rcDraft = null;
  renderItemCard(); renderLines(); await persistLines();
  await enqueue({ op: 'recheck', id: line.id, category: RECHECK, payload });
  toast(isOnline() ? t('rcSaved') : t('savedLocal'), isOnline() ? 'ok' : '');
  syncSoon(150);
}

function renderRecheckPanel(){
  const p = document.getElementById('recheck-panel'); if (!p) return;
  const show = state.category === RECHECK && !state.selected;
  p.classList.toggle('hidden', !show);
  if (!show) return;
  const items = state.recheck;
  p.innerHTML = `<div class="rc-hint">${esc(t('recheckHint'))}</div>
    <h4>${esc(t('recheckTitle'))}</h4>
    ${items.length ? `<div class="rc-list">${items.slice(0,300).map((it,i) => `
      <button type="button" class="rc-item" data-rc="${i}">
        ${thumb(it.i, it.n)}
        <div class="t"><div class="n">${esc(it.n || it.c)}</div>
          <div class="m"><span>${esc(it.c)}</span><span>${esc(it.s)}</span><span class="rc-tag rep">${esc(t('report_'+it.report))}</span></div></div>
        <span class="rc-tag ${it.status}">${esc(it.status === 'done' ? t('recheckDone',{q:fmtQty(it.total)}) : t('recheckPending'))}</span>
      </button>`).join('')}</div>`
      : `<div class="rc-empty">${esc(t('recheckEmpty'))}</div>`}`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rc]'); if (!b) return;
  const it = state.recheck[+b.dataset.rc]; if (it) selectItem(it);
});
$('#cat-grid').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) openCategory(b.dataset.cat); });
function renderCatPill(){ $('#cat-pill').textContent = catLabel(state.category); $('#cat-pill').title = t('changeType'); }

function linesKey(cat){ return 'lines:' + lc(state.user) + ':' + cat + ':' + today(); }
function cleanLine(l){ const c = {}; Object.keys(l).forEach(k => { if (k !== '_fresh') c[k] = l[k]; }); return c; }
async function persistLines(){ if (state.category) await DB.set(linesKey(state.category), state.lines.map(cleanLine)); }

async function openCategory(cat){
  state.category = cat; store.set('cc_cat', cat);
  state.editingId = null; state.filter = ''; $('#list-filter').value = '';
  state.lines = (await DB.get(linesKey(cat))) || [];
  state.rcDraft = null;
  renderCatPill(); show('count'); applyModeUI(); resetForm(); renderEditMode(); renderLines();
  if (isOnline() && API_READY && !state.sessionInvalid) refreshLinesFromServer(cat);
  if (cat === RECHECK) loadRecheck(true);
}

/** Server copy wins for synced lines; local unsynced/edited lines are kept */
async function refreshLinesFromServer(cat){
  try {
    const entries = await api('entries', { category: cat });
    if (state.category !== cat) return;
    const local = {}; state.lines.forEach(l => local[l.id] = l);
    const seen = {};
    const merged = entries.map(e => {
      seen[e.id] = true;
      const l = local[e.id];
      if (l && l._status !== 'synced') return l;
      return Object.assign({}, e, { category: cat, countedAt: l && l.countedAt, _status: 'synced' });
    });
    state.lines.forEach(l => { if (!seen[l.id] && (l._status !== 'synced' || hasOps(l.id))) merged.push(l); });
    merged.sort((a,b) => sortKey(b).localeCompare(sortKey(a)));
    state.lines = merged;
    await persistLines(); renderLines();
  } catch (err) { /* offline or session — keep the device copy */ }
}
function sortKey(l){
  if (l.countedAt){ const d = new Date(l.countedAt); if (!isNaN(d)) return localStamp(d); }
  return String(l.time || '');
}
function localStamp(d){
  const p = n => String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
}

function goCategories(){
  closeMenu();
  state.category = null; store.del('cc_cat');
  renderCategories(); show('cat');
}
$('#cat-pill').addEventListener('click', goCategories);

function closeMenu(){ $('#menu').classList.add('hidden'); $('#menu-btn').setAttribute('aria-expanded','false'); }
$('#menu-btn').addEventListener('click', e => {
  e.stopPropagation();
  const open = $('#menu').classList.toggle('hidden') === false;
  $('#menu-btn').setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) closeMenu(); });
$('#m-change').onclick = goCategories;
$('#m-refresh').onclick = () => { closeMenu(); loadMaster(true, true); };
$('#m-logout').onclick = () => { closeMenu(); signOut(); };
$('#m-sync').onclick = () => { closeMenu(); manualSync(); };
$('#net').onclick = manualSync;

/* =====================================================================
 *  Autocomplete (item + location)
 * ===================================================================== */
function makeAutocomplete({ input, dropdown, search, render, empty, onPick }){
  let results = [], active = -1, timer = null;
  function open(){
    const q = lc(input.value);
    const r = search(q); results = r.list; active = results.length ? 0 : -1;
    if (!q && !results.length){ close(); return; }
    dropdown.innerHTML = results.length
      ? results.map((x,i) => `<div class="dd-item${i===active?' active':''}" role="option" data-i="${i}">${render(x,q)}</div>`).join('')
        + (r.more ? `<div class="dd-more">${esc(t('more',{n:r.more}))}</div>` : '')
      : `<div class="dd-empty">${esc(empty(input.value))}</div>`;
    dropdown.classList.remove('hidden');
  }
  function close(){ dropdown.classList.add('hidden'); active = -1; }
  function setActive(i){
    const els = dropdown.querySelectorAll('.dd-item'); if (!els.length) return;
    active = (i + els.length) % els.length;
    els.forEach((el,j) => el.classList.toggle('active', j===active));
    els[active].scrollIntoView({ block:'nearest' });
  }
  function pick(x){ close(); onPick(x); }
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(open, 60); });
  input.addEventListener('focus', () => { if (input.value) open(); });
  input.addEventListener('keydown', e => {
    const isOpen = !dropdown.classList.contains('hidden');
    if (e.key === 'ArrowDown'){ e.preventDefault(); isOpen ? setActive(active+1) : open(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); if (isOpen) setActive(active-1); }
    else if (e.key === 'Escape'){ close(); }
    else if (e.key === 'Enter'){
      e.preventDefault(); clearTimeout(timer);
      const wasOpen = isOpen;
      if (!wasOpen) open();                          // handheld scanner: fast typing + Enter
      const exact = results.find(x => x._exact);
      if (exact) return pick(exact);
      if (results.length === 1) return pick(results[0]);
      if (wasOpen && active >= 0 && results[active]) return pick(results[active]);
    }
  });
  dropdown.addEventListener('mousedown', e => {
    const el = e.target.closest('.dd-item'); if (!el) return;
    e.preventDefault(); pick(results[+el.dataset.i]);
  });
  input.addEventListener('blur', () => setTimeout(close, 120));
  return { open, close };
}

/* ---------------- Item ---------------- */
function searchItems(q){
  if (!q) return { list: [] };
  const scored = [];
  const pool = state.category === RECHECK ? state.recheck : state.items;
  for (const it of pool){
    let s = -1;
    if (it._c === q || it._s === q) s = 0;
    else if (it._c.startsWith(q) || it._s.startsWith(q)) s = 1;
    else if (it._n.startsWith(q)) s = 2;
    else if (it._c.includes(q) || it._s.includes(q)) s = 3;
    else if (it._n.includes(q)) s = 4;
    if (s >= 0) scored.push([s, it]);
  }
  scored.sort((a,b) => a[0]-b[0] || a[1]._n.localeCompare(b[1]._n));
  const LIMIT = 40;
  return {
    list: scored.slice(0, LIMIT).map(([s,it]) => Object.assign(it, { _exact: s === 0 })),
    more: Math.max(0, scored.length - LIMIT)
  };
}
const itemAC = makeAutocomplete({
  input: $('#item-input'), dropdown: $('#item-dd'),
  search: searchItems,
  empty: q => t('noMatch', { q }),
  render: (it,q) => `${thumb(it.i, it.n)}<div class="t"><div class="n">${highlight(it.n,q)}</div>
    <div class="m">${esc(t('code'))}: ${highlight(it.c,q)} &nbsp; ${esc(t('serial'))}: ${highlight(it.s,q)}</div></div>`,
  onPick: it => selectItem(it)
});

function selectItem(it){
  if (state.category === RECHECK){
    state.selected = it; startRecheckDraft(it);
    $('#item-input').value = ''; $('#item-err').textContent = '';
    renderItemCard();
    const first = document.querySelector('#rc-editor input'); if (first) first.focus();
    return;
  }
  state.selected = it;
  $('#item-input').value = ''; $('#item-err').textContent = '';
  renderItemCard();
  if (!state.location) $('#loc-input').focus();
  else { const q = $('#qty-input'); q.focus(); q.select(); }
}
function renderItemCard(){
  const wrap = $('#item-card-wrap');
  const it = state.selected;
  $('#search-block').classList.toggle('hidden', !!it);
  renderRecheckPanel();
  renderRecheckEditor();
  if (!it){ wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }
  wrap.classList.remove('hidden');
  wrap.innerHTML = `<div class="item-card">
      ${thumb(it.i, it.n, 'pic')}
      <div>
        <h3>${esc(it.n)}${it.src === 'DAX' ? `<span class="src-tag">DAX</span>` : ''}</h3>
        <dl class="kv"><dt>${esc(t('code'))}</dt><dd>${esc(it.c || '—')}</dd><dt>${esc(t('serial'))}</dt><dd>${esc(it.s || '—')}</dd></dl>
        <button type="button" class="link-btn" id="change-item">${esc(t('changeItem'))}</button>
      </div></div>`;
  $('#change-item').onclick = () => { state.selected = null; state.rcDraft = null; renderItemCard(); $('#item-input').focus(); };
}

/* ---------------- Location ---------------- */
const locInput = $('#loc-input');
function searchLocations(q){
  const out = [];
  for (const l of state.locations){
    const k = l.toLowerCase();
    const s = k === q ? 0 : k.startsWith(q) ? 1 : k.includes(q) ? 2 : -1;
    if (!q || s >= 0) out.push([q ? s : 1, l]);
  }
  out.sort((a,b) => a[0]-b[0] || a[1].localeCompare(b[1]));
  const LIMIT = 60;
  return { list: out.slice(0,LIMIT).map(([s,l]) => ({ l, _exact: s === 0 })), more: Math.max(0, out.length-LIMIT) };
}
const locAC = makeAutocomplete({
  input: locInput, dropdown: $('#loc-dd'),
  search: searchLocations,
  empty: q => t('noLoc', { q }),
  render: (x,q) => `<div class="t"><div class="n">${highlight(x.l,q)}</div></div>`,
  onPick: x => setLocation(x.l, true)
});
locInput.addEventListener('input', () => {
  state.location = state.locations.find(l => l.toLowerCase() === lc(locInput.value)) || '';
  syncLocUI();
});
function setLocation(l, moveOn){
  state.location = l; locInput.value = l; $('#loc-err').textContent = '';
  store.set('cc_loc', l);
  syncLocUI();
  if (moveOn){
    if (!state.selected) $('#item-input').focus();
    else { $('#qty-input').focus(); $('#qty-input').select(); }
  }
}
function syncLocUI(){
  locInput.classList.toggle('valid', !!state.location);
  $('#loc-kept').classList.toggle('hidden', !state.location);
  $('#loc-clear').classList.toggle('hidden', !locInput.value);
}
$('#loc-clear').onclick = () => { locInput.value=''; state.location=''; syncLocUI(); locInput.focus(); };

/* ---------------- Quantity ---------------- */
const qtyInput = $('#qty-input');
$('#qty-minus').onclick = () => { qtyInput.value = Math.max(0, (Number(qtyInput.value)||0) - 1); qtyInput.focus(); };
$('#qty-plus').onclick  = () => { qtyInput.value = (Number(qtyInput.value)||0) + 1; qtyInput.focus(); };
qtyInput.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); submit(); } });
qtyInput.addEventListener('wheel', e => e.target.blur(), { passive:true });

/* =====================================================================
 *  Save / edit / delete — always local first, then queued for sync
 * ===================================================================== */
function validate(){
  let ok = true;
  ['#loc-err','#item-err','#qty-err'].forEach(s => $(s).textContent = '');
  if (!state.location){ $('#loc-err').textContent = t('errLocation'); ok = false; }
  if (!state.selected){ $('#item-err').textContent = t('errItem'); ok = false; }
  const raw = String(qtyInput.value).trim(); const q = Number(raw);
  if (raw === '' || !isFinite(q) || q < 0){ $('#qty-err').textContent = t('errQty'); ok = false; }
  if (!ok){
    if (!state.location) locInput.focus();
    else if (!state.selected) $('#item-input').focus();
    else qtyInput.focus();
  }
  return ok;
}
function payloadOf(l){
  return { location: l.location, serial: l.serial, code: l.code, name: l.name, image: l.image, qty: l.qty, countedAt: l.countedAt, report: l.report || '' };
}

function myOps(){ const u = lc(state.user); return state.outbox.filter(o => o.user === u); }
function hasOps(id){ return state.outbox.some(o => o.id === id); }
async function enqueue(op){
  op.opId = uuid(); op.user = lc(state.user);
  state.outbox.push(op);
  await DB.set('outbox', state.outbox);
  renderNet();
}

async function submit(){
  if (state.editingId) return submitUpdate();
  if (!validate()) return;
  const it = state.selected;
  const line = {
    id: uuid(), category: state.category, location: state.location,
    serial: it.s, code: it.c, name: it.n, image: it.i, qty: Number(qtyInput.value), report: it.report || '',
    countedAt: new Date().toISOString(), time: '', edited: '', _status: 'pending', _fresh: true
  };
  state.lines.unshift(line);
  renderLines();
  resetForm();
  await persistLines();
  await enqueue({ op: 'save', id: line.id, category: line.category, payload: payloadOf(line) });
  if (!isOnline()) toast(t('savedLocal'));
  syncSoon(150);
  if (autoScanOn()) openScanner('item');
}

function startEdit(id){
  const line = state.lines.find(l => l.id === id);
  if (!line) return;
  state.editingId = id;
  const fromCatalog = state.category === RECHECK
    ? state.recheck.find(it => it.s === String(line.serial) && it.report === line.report)
    : state.items.find(it => (line.code && it.c === line.code) || (line.serial && it.s === line.serial));
  state.selected = fromCatalog || { s: line.serial, c: line.code, n: line.name, i: line.image, src: '', report: line.report || '' };
  setLocation(line.location, false);
  qtyInput.value = line.qty;
  renderItemCard(); renderEditMode(); renderLines();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  qtyInput.focus(); qtyInput.select();
}
function cancelEdit(){ state.editingId = null; resetForm(); renderEditMode(); renderLines(); }

async function submitUpdate(){
  if (!validate()) return;
  const id = state.editingId;
  const line = state.lines.find(l => l.id === id);
  if (!line) return cancelEdit();
  const it = state.selected;
  Object.assign(line, { location: state.location, serial: it.s, code: it.c, name: it.n, image: it.i, report: it.report || line.report || '',
                        qty: Number(qtyInput.value), _status: 'pending', _error: '', _fresh: true });
  await queueChange(line);
  state.editingId = null;
  resetForm(); renderEditMode(); renderLines();
  await persistLines();
  toast(isOnline() ? t('updated') : t('savedLocal'));
  syncSoon(150);
}

/** Put the latest version of a line in the queue as cheaply as possible */
async function queueChange(line){
  const id = line.id;
  const idleSave = state.outbox.find(o => o.op === 'save' && o.id === id && !state.inflight.has(o.opId));
  if (idleSave){                                   // not sent yet → just change what will be sent
    idleSave.payload = payloadOf(line);
    await DB.set('outbox', state.outbox);
    return;
  }
  const saveInFlight = state.outbox.some(o => o.op === 'save' && o.id === id);
  state.outbox = state.outbox.filter(o => !(o.op === 'update' && o.id === id && !state.inflight.has(o.opId)));
  if (line.row || saveInFlight) await enqueue({ op: 'update', id, category: line.category, payload: payloadOf(line) });
  else await enqueue({ op: 'save', id, category: line.category, payload: payloadOf(line) });
}

async function removeLine(id){
  const line = state.lines.find(l => l.id === id);
  if (!line) return;
  const ok = await confirmModal({
    title: t('delTitle'),
    body: t('delBody', { name: line.name || line.code, qty: fmtQty(line.qty), loc: line.location }),
    okText: t('del'), danger: true
  });
  if (!ok) return;
  const inFlight = state.outbox.some(o => o.id === id && state.inflight.has(o.opId));
  const reachedSheet = !!line.row || inFlight;
  state.outbox = state.outbox.filter(o => !(o.id === id && !state.inflight.has(o.opId)));
  await DB.set('outbox', state.outbox);
  if (reachedSheet) await enqueue({ op: 'delete', id, category: line.category });
  state.lines = state.lines.filter(l => l.id !== id);
  if (state.editingId === id) cancelEdit();
  await persistLines(); renderLines(); renderNet();
  toast(t('deleted'));
  syncSoon(150);
}

function resetForm(){
  state.selected = null;
  qtyInput.value = '';
  $('#item-input').value = '';
  ['#loc-err','#item-err','#qty-err'].forEach(s => $(s).textContent = '');
  locInput.value = state.location; syncLocUI();
  renderItemCard();
  setTimeout(() => (state.location ? $('#item-input') : locInput).focus(), 30);
}

function renderEditMode(){
  const editing = !!state.editingId;
  const banner = $('#edit-banner'), acts = $('#actions');
  if (editing){
    const idx = state.lines.length - state.lines.findIndex(l => l.id === state.editingId);
    banner.textContent = t('editing', { n: idx });
    banner.classList.remove('hidden');
    acts.classList.add('edit');
    acts.innerHTML = `<button class="btn btn-ghost" id="cancel-btn" type="button">${esc(t('cancel'))}</button>
                      <button class="btn btn-primary" id="next-btn" type="button">${esc(t('update'))}</button>`;
    $('#cancel-btn').onclick = cancelEdit;
  } else {
    banner.classList.add('hidden');
    acts.classList.remove('edit');
    acts.innerHTML = `<button class="btn btn-primary" id="next-btn" type="button">${esc(t('next'))}</button>`;
  }
  $('#next-btn').onclick = submit;
}

/* ---------------- Lines list ---------------- */
$('#list-filter').addEventListener('input', e => { state.filter = lc(e.target.value); renderLines(); });

const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const ICON_DEL  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
const ICON_RETRY= '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';

function lineTime(l){
  if (l.countedAt){ const d = new Date(l.countedAt); if (!isNaN(d)) return localStamp(d).slice(11,16); }
  return l.time ? String(l.time).slice(11,16) : '';
}

function renderLines(){
  const ul = $('#lines'); if (!ul) return;
  const total = state.lines.length;
  $('#st-lines').textContent = total.toLocaleString('en-US');
  $('#st-units').textContent = fmtQty(state.lines.reduce((a,l) => a + (Number(l.qty)||0), 0));
  const f = state.filter;
  const rows = state.lines.map((l, i) => ({ l, no: total - i }))
    .filter(({l}) => !f || [l.name,l.code,l.serial,l.location].some(v => lc(v).includes(f)));
  if (!rows.length){
    ul.innerHTML = `<li class="empty"><b>${esc(t('emptyT'))}</b>${esc(t('emptyD'))}</li>`;
    return;
  }
  ul.innerHTML = rows.map(({l,no}) => {
    let status = '';
    if (l._status === 'pending'){
      const sending = state.outbox.some(o => o.id === l.id && state.inflight.has(o.opId));
      status = `<span class="status pending">${esc(t(sending ? 'syncingLine' : 'pending'))}</span>`;
    } else if (l._status === 'error') status = `<span class="status failed">${esc(t('lineErr', { e: t(l._error || 'ERR_BAD_REQUEST') }))}</span>`;
    else if (l.edited) status = `<span class="status edited">${esc(t('edited'))}</span>`;
    const time = lineTime(l);
    return `<li class="line${l.id===state.editingId?' editing':''}${l._fresh?' fresh':''}" data-id="${esc(l.id)}">
      <span class="no">${no}</span>
      ${thumb(l.image, l.name)}
      <div class="info">
        <div class="n">${esc(l.name || l.code)}</div>
        <div class="m"><span>${esc(l.code)}</span><span>${esc(l.serial)}</span>${l.before != null ? `<span>${esc(l.location)}</span>` : `<span>📍 ${esc(l.location)}</span>`}${l.report?`<span class="rc-tag rep">${esc(t('report_'+l.report))}</span>`:''}${time?`<span>${esc(time)}</span>`:''}${status}</div>
      </div>
      ${l.category === RECHECK || l.before != null
        ? `<span class="q rc">${fmtQty(l.before)} → ${fmtQty(l.qty)}</span>`
        : `<span class="q">${fmtQty(l.qty)}</span>`}
      <div class="ops">
        ${l._status === 'error' ? `<button type="button" data-op="retry" title="${esc(t('retry'))}" aria-label="${esc(t('retry'))}">${ICON_RETRY}</button>` : ''}
        ${l.category === RECHECK || l.before != null
          ? `<button type="button" data-op="reopen" title="${esc(t('rcReopen'))}" aria-label="${esc(t('rcReopen'))}">${ICON_EDIT}</button>`
          : `<button type="button" data-op="edit" title="Edit" aria-label="Edit">${ICON_EDIT}</button>
             <button type="button" class="del" data-op="del" title="${esc(t('del'))}" aria-label="${esc(t('del'))}">${ICON_DEL}</button>`}
      </div>
    </li>`;
  }).join('');
  state.lines.forEach(l => { l._fresh = false; });
}

$('#lines').addEventListener('click', async e => {
  const b = e.target.closest('[data-op]'); if (!b) return;
  const id = b.closest('.line').dataset.id;
  if (b.dataset.op === 'edit') startEdit(id);
  else if (b.dataset.op === 'del') removeLine(id);
  else if (b.dataset.op === 'reopen'){
    const l = state.lines.find(x => x.id === id); if (!l) return;
    const it = state.recheck.find(x => x.s === String(l.serial) && x.report === l.report);
    if (it){ selectItem(it); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }
  else if (b.dataset.op === 'retry'){
    const l = state.lines.find(x => x.id === id); if (!l) return;
    if (l._payload){ l._status = 'pending'; l._error = ''; await enqueue({ op: 'recheck', id: l.id, category: RECHECK, payload: l._payload });
      await persistLines(); renderLines(); syncSoon(100); return; }
    l._status = 'pending'; l._error = '';
    await queueChange(l); await persistLines(); renderLines(); syncSoon(100);
  }
});

/* =====================================================================
 *  Sync engine
 * ===================================================================== */
let syncTimer = null;
function syncSoon(ms){ clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, ms == null ? 300 : ms); }

async function applyToLine(category, id, fn){
  if (category === state.category){
    const l = state.lines.find(x => x.id === id);
    if (l){ fn(l); await persistLines(); }
    return;
  }
  const key = 'lines:' + lc(state.user) + ':' + category + ':' + today();
  const list = await DB.get(key);
  if (!list) return;
  const l = list.find(x => x.id === id);
  if (l){ fn(l); await DB.set(key, list); }
}

async function syncNow(){
  if (state.syncing || !state.token || !API_READY || !isOnline() || state.sessionInvalid){ renderNet(); return 0; }
  if (!myOps().length){ renderNet(); return 0; }
  state.syncing = true; renderNet(); renderLines();
  let done = 0;
  try {
    while (true){
      const batch = myOps().slice(0, SYNC_BATCH);
      if (!batch.length) break;
      batch.forEach(o => state.inflight.add(o.opId));
      renderLines();
      let res;
      try {
        res = await api('sync', { ops: batch.map(o => ({ opId:o.opId, op:o.op, id:o.id, category:o.category, payload:o.payload })) }, 120000);
      } finally {
        batch.forEach(o => state.inflight.delete(o.opId));
      }
      const byOp = {}; (res.results || []).forEach(r => byOp[r.opId] = r);
      for (const o of batch){
        const r = byOp[o.opId];
        if (!r) continue;
        state.outbox = state.outbox.filter(x => x.opId !== o.opId);
        if (r.ok){
          done++;
          if (o.op !== 'delete'){
            await applyToLine(o.category, o.id, l => {
              if (r.entry){ l.row = r.entry.row; l.time = r.entry.time; if (o.op === 'update') l.edited = r.entry.edited;
                if (o.op === 'recheck'){ l.qty = r.entry.after; l.before = r.entry.before; l.location = l.details = r.entry.details; } }
              if (!hasOps(o.id)){ l._status = 'synced'; l._error = ''; }
            });
          }
        } else {
          await applyToLine(o.category, o.id, l => {
            l._status = 'error'; l._error = r.error;
            if (r.error === 'ERR_NOT_FOUND') l.row = 0;   // removed from the sheet → next fix saves it again
          });
        }
      }
      await DB.set('outbox', state.outbox);
      renderLines(); renderNet();
      if (batch.some(o => o.category === RECHECK)) loadRecheck(true);
    }
  } catch (err) {
    /* network or session problem — the queue stays on the device */
  } finally {
    state.syncing = false;
    renderNet(); renderLines();
  }
  return done;
}

async function manualSync(){
  if (state.sessionInvalid) return reauthModal();
  if (!isOnline()) return toast(t('nothingOffline'));
  if (!myOps().length) return toast(t('allSynced'), 'ok');
  const n = await syncNow();
  if (n) toast(t('syncedN', { n }), 'ok');
}

function renderNet(){
  const pill = $('#net'); if (!pill) return;
  const online = isOnline();
  const n = state.user ? myOps().length : 0;
  pill.classList.toggle('offline', !online);
  pill.classList.toggle('syncing', online && state.syncing);
  pill.classList.toggle('attn', state.sessionInvalid);
  $('#net-label').textContent = state.sessionInvalid ? t('signInToSync') : !online ? t('offline') : state.syncing ? t('syncing') : t('online');
  const c = $('#net-count');
  c.textContent = n; c.classList.toggle('hidden', !n);
  pill.title = n ? t('pending') + ': ' + n : t('allSynced');
  $('#offline-bar').classList.toggle('hidden', online || $('#app').classList.contains('hidden'));
}

window.addEventListener('online',  () => { renderNet(); syncSoon(800); if (state.category) refreshLinesFromServer(state.category); });
window.addEventListener('offline', () => renderNet());
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncSoon(400); });
setInterval(() => syncSoon(0), 30000);

/* =====================================================================
 *  Barcode scanner (library stored in the app → works offline)
 * ===================================================================== */
let scanLibPromise = null;
const scanner = { target: null, live: null, busy: false, session: 0 };

function loadScanLib(){
  if (window.Html5Qrcode) return Promise.resolve();
  if (!scanLibPromise){
    // Try the copy next to the app, the old folder path, then the CDN
    const sources = [SCAN_LIB, 'vendor/html5-qrcode.min.js', 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'];
    const tryLoad = i => new Promise((resolve, reject) => {
      if (i >= sources.length) return reject(new Error('scan lib'));
      const s = document.createElement('script');
      s.src = sources[i]; s.async = true;
      s.onload = () => window.Html5Qrcode ? resolve() : tryLoad(i + 1).then(resolve, reject);
      s.onerror = () => { s.remove(); tryLoad(i + 1).then(resolve, reject); };
      document.head.appendChild(s);
    });
    scanLibPromise = tryLoad(0).catch(err => { scanLibPromise = null; throw err; });
  }
  return scanLibPromise;
}
function scanConfig(){
  const F = window.Html5QrcodeSupportedFormats || {};
  const formats = ['CODE_128','CODE_39','CODE_93','EAN_13','EAN_8','UPC_A','UPC_E','ITF','CODABAR','QR_CODE','DATA_MATRIX']
    .map(k => F[k]).filter(v => v !== undefined);
  return { formatsToSupport: formats, experimentalFeatures: { useBarCodeDetectorIfSupported: true }, verbose: false };
}
function setScanMsg(s){ $('#scan-msg').textContent = s; }

async function openScanner(target){
  const my = ++scanner.session;
  scanner.target = target; scanner.busy = false;
  $('#item-dd').classList.add('hidden'); $('#loc-dd').classList.add('hidden');
  $('#scan-title').textContent = t(target === 'loc' ? 'scanLoc' : 'scanItem');
  $('#reader').classList.remove('hidden');
  $('#scanner').classList.remove('hidden');
  setScanMsg(t('loadingScanner'));
  try { await loadScanLib(); }
  catch(e){ $('#reader').classList.add('hidden'); setScanMsg(t('scanLibFail')); return; }
  if (my !== scanner.session) return;
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return photoMode();
  try {
    await stopLive();
    scanner.live = new Html5Qrcode('reader', scanConfig());
    setScanMsg(t('cameraStarting'));
    await scanner.live.start(
      { facingMode: 'environment' },
      { fps: 12, aspectRatio: 1.333,
        qrbox: (w, h) => ({ width: Math.max(80, Math.floor(Math.min(w * 0.88, 440))),
                            height: Math.max(60, Math.floor(Math.min(h * 0.5, 220))) }) },
      text => onScanned(text), () => {}
    );
    if (my !== scanner.session){ await stopLive(); return; }
    setScanMsg(t('scanHint'));
  } catch (err) {
    await stopLive();
    if (my === scanner.session) photoMode();
  }
}
function photoMode(){ $('#reader').classList.add('hidden'); setScanMsg(t('cameraBlocked')); }
async function stopLive(){
  const s = scanner.live; scanner.live = null;
  if (!s) return;
  try { if (s.isScanning) await s.stop(); } catch(e){}
  try { s.clear(); } catch(e){}
}
async function closeScanner(){ scanner.session++; await stopLive(); $('#scanner').classList.add('hidden'); }

async function onScanned(text){
  if (scanner.busy) return;
  scanner.busy = true;
  try { navigator.vibrate && navigator.vibrate(60); } catch(e){}
  const target = scanner.target;
  await closeScanner();
  const v = String(text || '').trim();
  if (!v) return;
  if (target === 'loc') applyScannedLocation(v); else applyScannedItem(v);
}
function applyScannedItem(v){
  const q = lc(v);
  const pool = state.category === RECHECK ? state.recheck : state.items;
  const it = pool.find(x => x._c === q || x._s === q);
  if (it){ selectItem(it); return; }
  if (state.category === RECHECK){ toast(t('notInRecheck', { v }), 'error'); return; }
  if (state.selected){ state.selected = null; renderItemCard(); }
  const inp = $('#item-input'); inp.value = v; inp.focus(); itemAC.open();
  toast(t('scanNoItem', { v }), 'error');
}
function applyScannedLocation(v){
  const l = state.locations.find(x => x.toLowerCase() === lc(v));
  if (l){ setLocation(l, true); return; }
  locInput.value = v; state.location = ''; syncLocUI(); locInput.focus(); locAC.open();
  toast(t('scanNoLoc', { v }), 'error');
}

$('#loc-scan').addEventListener('click', () => openScanner('loc'));
$('#item-scan').addEventListener('click', () => openScanner('item'));
$('#scan-close').addEventListener('click', closeScanner);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#scanner').classList.contains('hidden')) closeScanner(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && scanner.live) closeScanner(); });
$('#scan-file').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  setScanMsg(t('reading'));
  try {
    await loadScanLib(); await stopLive();
    const fileScanner = new Html5Qrcode('reader-file', scanConfig());
    const text = await fileScanner.scanFile(file, false);
    try { fileScanner.clear(); } catch(_){}
    scanner.busy = false;
    onScanned(text);
  } catch (err) { setScanMsg(t('noCode')); }
});

function autoScanOn(){ return store.get('cc_autoscan') === '1'; }
function renderAutoScan(){
  const b = $('#m-autoscan'); if (!b) return;
  b.textContent = (autoScanOn() ? '✓  ' : '') + t('autoScan');
  b.setAttribute('aria-pressed', String(autoScanOn()));
}
$('#m-autoscan').addEventListener('click', () => { store.set('cc_autoscan', autoScanOn() ? '0' : '1'); renderAutoScan(); });

/* =====================================================================
 *  Install as an app
 * ===================================================================== */
let installPrompt = null;
function setInstallVisible(v){ document.querySelectorAll('.js-install').forEach(b => b.classList.toggle('hidden', !v)); }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; setInstallVisible(true); });
window.addEventListener('appinstalled', () => { installPrompt = null; setInstallVisible(false); });
document.querySelectorAll('.js-install').forEach(b => b.addEventListener('click', async () => {
  closeMenu();
  if (!installPrompt) return;
  installPrompt.prompt();
  try { await installPrompt.userChoice; } catch(e){}
  installPrompt = null; setInstallVisible(false);
}));
(function iosHint(){
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  if (ios && !standalone) $('#ios-note').classList.remove('hidden');
})();
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* =====================================================================
 *  Boot
 * ===================================================================== */
(async function boot(){
  state.location = store.get('cc_loc') || '';
  applyLang();
  if (!API_READY) $('#setup-warn').classList.remove('hidden');
  const auth = await DB.get('auth');
  if (auth && auth.token){
    await afterLogin(auth);
    if (isOnline() && API_READY) api('me').then(async r => {   // also flags an expired sign-in
      if (r && Array.isArray(r.categories) && r.categories.join('|') !== state.categories.join('|')){
        state.categories = r.categories;
        await DB.set('auth', { token: state.token, user: state.user, categories: r.categories });
        const acct = await DB.get('acct:' + lc(state.user));
        if (acct){ acct.categories = r.categories; await DB.set('acct:' + lc(state.user), acct); }
        if (!$('#screen-cat').classList.contains('hidden')) renderCategories();
      }
    }).catch(() => {});
    return;
  }
  show('login');
  $('#login-user').focus();
})();
