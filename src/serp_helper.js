
(function () {
// Normalize an input (domain or full URL) to safe href + host label
function toHref(input){
  const t = String(input || '').trim();
  if (!t) return { href:'', host:'' };
  try {
    const u = new URL(t);
    if (!/^https?:$/i.test(u.protocol)) throw new Error('unsupported');
    return { href: u.href, host: u.hostname.replace(/^www\./i,'').toLowerCase() };
  } catch (_){}
  const clean = t.replace(/^https?:\/\//i,'').replace(/\/.*$/,'');
  const host = clean.replace(/^www\./i,'').toLowerCase();
  if (!host) return { href:'', host:'' };
  return { href: `https://${host}`, host };
}
function toHost(input){ return toHref(input).host; }

  function _(id, fallback=''){ try { return chrome.i18n.getMessage(id) || fallback; } catch(e){ return fallback; } }

  // --- host & query helpers ---
  function isSerpHost(){
    const h = location.host;
    return h.startsWith('www.google.') || h === 'www.bing.com' || h === 'duckduckgo.com' || /^yandex\./i.test(h) || /(^|\.)ya\.ru$/i.test(h);
  }
  function getQuery() {
    const u = new URL(location.href);
    const host = location.host;
    if (host.startsWith('www.google.')) return u.searchParams.get('q') || '';
    if (host === 'www.bing.com') return u.searchParams.get('q') || '';
    if (host === 'duckduckgo.com') return u.searchParams.get('q') || '';
    if (/^yandex\./i.test(host) || /(^|\.)ya\.ru$/i.test(host)) return u.searchParams.get('text') || '';
    return '';
  }
  function getQueryFromDom(){
    try {
      const sels = ["input[name='q']","input[name='text']","form[role='search'] input","#text"];
      for (const sel of sels){ const el = document.querySelector(sel); if (el && el.value) return el.value; }
    } catch(e) {}
    return '';
  }
  function findDomainsInQuery(q) {
    const out = new Set();
    const rx = /([a-z0-9-]+\.[a-z.]{2,})/gi;
    let m; while ((m = rx.exec(q)) !== null) out.add(m[1].replace(/^www\./i,''));
    return Array.from(out);
  }

  // --- prefs & helpers ---
  const DEFAULT_PREFS = { minToken: 2, showSerpBookmarks: true, showBadge: true, useUnicodeTokenize: true };
  const TLD_STOP = new Set(['www','com','ru','net','org','info','io','co','app','dev','site','online','top','xyz']);
  const RU_TO_LAT = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya' };
  function ruToLat(s){ return String(s||'').toLowerCase().replace(/[\u0400-\u04FF]/g, ch => RU_TO_LAT[ch] ?? ch); }

  let __prefs = DEFAULT_PREFS;

  function tokenizeQuery(q){
    const str = String(q || '').toLowerCase();
    let splitter = null;
    // try to build Unicode-aware splitter dynamically; if not supported, fallback
    if (__prefs && __prefs.useUnicodeTokenize) {
      try { splitter = new RegExp('[^\\p{L}\\p{N}-]+','u'); } catch(e) { splitter = null; }
    }
    if (!splitter) splitter = /[^a-z0-9\u0400-\u04FF-]+/i;
    const raw = str.split(splitter).map(t => t.trim()).filter(Boolean);
    const out = new Set();
    const minTok = Math.max(1, parseInt((__prefs && __prefs.minToken) || 2, 10));
    for (const t of raw) {
      if (t.length >= minTok && !TLD_STOP.has(t)) out.add(t);
      const tl = ruToLat(t);
      if (tl && tl !== t && tl.length >= minTok && !TLD_STOP.has(tl)) out.add(tl);
    }
    return Array.from(out);
  }

  function matchAlternatesByBrandTokens(tokens, map){
    const seen = new Set(); const scored = [];
    for (const dom of Object.keys(map || {})) {
      const d = String(dom || '').toLowerCase().replace(/^www\./,'');
      const sld = (d.split('.')[0] || d);
      let score = 0;
      for (const t of tokens) {
        if (!t) continue;
        if (t === sld) score = Math.max(score, 3);
        else if (sld.includes(t)) score = Math.max(score, 2);
        else if (t.includes(sld)) score = Math.max(score, 1);
      }
      if (score > 0 && !seen.has(d)) { seen.add(d); scored.push({ key: d, score }); }
    }
    scored.sort((a,b)=> b.score - a.score || a.key.length - b.key.length);
    return scored.map(x=>x.key).slice(0, 8);
  }

  // --- UI helpers ---
  function injectPanel() {
    let el = document.getElementById('ah-serp');
    if (el) return el;
    const box = document.createElement('div');
    box.innerHTML = `
      <div id="ah-serp" style="position: relative; 
        position: fixed; bottom: 16px; left: 16px; z-index: 999999;
        background:#121a2b; color:#e7ecf3; border:1px solid #223052; border-radius:12px;
        padding:12px 14px; box-shadow:0 6px 20px rgba(0,0,0,.25); max-width: 600px; font-family: Roboto, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif;">
        <button id="ah-close-x" aria-label="${_('serpHide','Hide')}" style="position:absolute; right:8px; top:8px; width:28px; height:28px; border:1px solid #2b3a5f; background:#1a2440; color:#e7ecf3; border-radius:6px; cursor:pointer; line-height:26px; font-size:16px;">×</button><div style="font-weight:600; margin-bottom:6px; padding-right:32px;">${_('serpPanelTitle','Search tips')}</div>
        <div id="ah-mirrors" style="display:none; margin:6px 0 4px;"></div>
        <div id="ah-bookmarks" style="display:none; margin:6px 0 4px;"></div>
        <div id="ah-body" style="font-size:13px; line-height:1.5"></div>
        <div id="ah-actions" style="margin-top:8px; display:flex; gap:8px;">
          <button id="ah-settings" style="font-size:12px; padding:6px 10px; background:#1a2440; color:#e7ecf3; border:1px solid #2b3a5f; border-radius:8px; cursor:pointer">${_('settingsBtn','Settings')}</button>
          <button id="ah-close" style="font-size:12px; padding:6px 10px; background:#1a2440; color:#e7ecf3; border:1px solid #2b3a5f; border-radius:8px; cursor:pointer">${_('serpHide','Hide')}</button>
        </div>
      </div>`;
    el = box.firstElementChild;
    document.documentElement.appendChild(el);
    el.querySelector('#ah-close').addEventListener('click', () => el.remove());
    const cx = el.querySelector('#ah-close-x'); if (cx) cx.addEventListener('click', ()=> el.remove());
    const sb = el.querySelector('#ah-settings');
    if (sb) sb.addEventListener('click', ()=>{ try{ chrome.runtime.sendMessage({type:'ah:open-settings'}); }catch(e){} });
    return el;
  }
  function makePlainLink(href, text) { return `<a href="${href}" target="_blank" rel="noreferrer" style="color:#a8c6ff; text-decoration:underline; cursor:pointer">${text}</a>`; }
  function makePillLink(href, text) {
    return `<a href="${href}" target="_blank" rel="noreferrer" style="color:#a8c6ff; text-decoration:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid #2b3a5f; border-radius:999px; background:#1a2440">${text}<span style="opacity:.9">⭢</span></a>`;
  }

  // bookmarks via background
  let __bmCache = null;
  function fetchBookmarksOnce(){
    return new Promise((resolve)=>{
      if (__bmCache) return resolve(__bmCache);
      try {
        chrome.runtime.sendMessage({type:'ah:get-bookmarks'}, (resp)=>{
          const list = (resp && resp.ok && Array.isArray(resp.items)) ? resp.items : [];
          __bmCache = list; resolve(list);
        });
      } catch(e){ resolve([]); }
    });
  }

  // --- main render ---
  let lastUrl = location.href;
  function renderTips() {
    if (!isSerpHost()) return;
    lastUrl = location.href;
    chrome.storage.sync.get({ alternates: {}, prefs: DEFAULT_PREFS }, (data) => {
      __prefs = data.prefs || DEFAULT_PREFS;
      let q = getQuery(); if (!q) q = getQueryFromDom();
      const map = data.alternates || {};
      const tokens = tokenizeQuery(q);
      let matchedKeys = matchAlternatesByBrandTokens(tokens, map);
      const domainTokens = findDomainsInQuery(q).map(s => s.toLowerCase());
      for (const d of domainTokens){ if (map[d] && !matchedKeys.includes(d)) matchedKeys.push(d); }

      const existing = document.getElementById('ah-serp');
      if (!matchedKeys.length) { try{ if(!__prefs || __prefs.showBadge!==false) chrome.runtime.sendMessage({type:'ah:set-badge', count: 0}); }catch(e){} if (existing) existing.remove(); return; }

      const el = injectPanel();
      const body = el.querySelector('#ah-body');

      // Mirrors render
      const mirrorsWrap = el.querySelector('#ah-mirrors');
      mirrorsWrap.innerHTML = '';
      let showedMirrors = false;
      matchedKeys.forEach((key) => {
        const alts = (map[key] || map[key.replace(/^www\./,'')]) || [];
        if (Array.isArray(alts) && alts.length) {
          if (!showedMirrors) {
            showedMirrors = true;
            mirrorsWrap.style.display='block';
            const label = document.createElement('div');
            label.style.cssText='font-size:13px; color:#a9b4c7; margin-bottom:6px;';
            label.textContent = `${_('serpTipAlternates','Official alternates from your settings:')} ${key}:`;
            mirrorsWrap.appendChild(label);
          }
          const row = document.createElement('div');
          row.style.cssText='display:flex; flex-wrap:wrap; gap:8px;';
          alts.forEach(a => {
            const obj = toHref(a);
            const pill = document.createElement('span');
            pill.innerHTML = makePillLink(obj.href, obj.host);
            const anchor = pill.firstChild; if (anchor && anchor.tagName==='A') anchor.title = obj.href; row.appendChild(anchor);
          });
          mirrorsWrap.appendChild(row);
        }
      });

      // Bookmarks render
      const bmWrap = el.querySelector('#ah-bookmarks');
      bmWrap.innerHTML = '';
      if (!__prefs || __prefs.showSerpBookmarks !== false) {
        fetchBookmarksOnce().then(list => {
          try {
            const kw = new Set(tokens);
            const addKw = (s)=>{ const v=String(s||'').toLowerCase(); if(v && !TLD_STOP.has(v)) { kw.add(v); const t=ruToLat(v); if(t && t!==v && !TLD_STOP.has(t)) kw.add(t); if (v.includes('.')) { const sld=v.replace(/^www\\./,'').split('.')[0]; if(sld && !TLD_STOP.has(sld)) { kw.add(sld); const ts=ruToLat(sld); if(ts && ts!==sld && !TLD_STOP.has(ts)) kw.add(ts);} } } };
            const slds = new Set();
            matchedKeys.forEach((key) => {
              addKw(key); slds.add((key.split('.')[0]||key).toLowerCase());
              const alts = (map[key] || map[key.replace(/^www\./,'')]) || [];
              alts.forEach(a => { const d=toHost(a); addKw(d); slds.add((d.split('.')[0]||d)); });
            });
            slds.forEach(addKw);

            const hits = [];
            const seen = new Set();
            for (const n of list) {
              const url = n.url || '';
              if (!/^https?:/i.test(url)) continue;
              const lcurl = url.replace(/^[a-z]+:\/\/?/i,'').toLowerCase();
              let ok = false; for (const k of kw){ if (k && lcurl.includes(k)) { ok=true; break; } }
              if (!ok) continue;
              const key = `${n.title}|${url}`; if (seen.has(key)) continue; seen.add(key);
              hits.push({ title: n.title || url, url });
              if (hits.length >= 6) break;
            }

            try{ if(!__prefs || __prefs.showBadge!==false) chrome.runtime.sendMessage({type:'ah:set-badge', count: hits.length}); }catch(e){}
            if (hits.length) {
              bmWrap.style.display='block';
              const label = document.createElement('div');
              label.style.cssText='font-size:13px; color:#a9b4c7; margin-bottom:6px;';
              label.textContent = _(`bookmarksHeading`,`Related bookmarks`);
              bmWrap.appendChild(label);
              const row = document.createElement('div');
              row.style.cssText='display:flex; flex-wrap:wrap; gap:8px;';
              hits.forEach(h => {
                const a = document.createElement('a');
                a.href = h.url; a.target='_blank'; a.rel='noreferrer'; a.title = h.url;
                a.style.cssText='display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #2b3a5f;border-radius:999px;background:#1a2440;color:#a8c6ff;text-decoration:none;cursor:pointer;max-width:260px;font-size:12px;';
                const img = document.createElement('img'); let host=''; try{ host=new URL(h.url).hostname; }catch{}; img.src=`https://icons.duckduckgo.com/ip3/${host}.ico`; img.width=16; img.height=16; img.style.cssText='border-radius:3px; flex:0 0 auto;';
                const span = document.createElement('span'); const t = h.title && h.title.trim() ? h.title.trim() : (new URL(h.url).hostname);
                span.textContent = t.length>28 ? t.slice(0,25)+'…' : t;
                const arrow = document.createElement('span'); arrow.textContent='⭢'; arrow.style.opacity='.9';
                a.append(img, span, arrow); row.appendChild(a);
              });
              bmWrap.appendChild(row);
            }
          } catch(e) { /* ignore */ }
        });
      }

      // Instructions text
      const tips = [];
      tips.push(_(`serpTipCheck`, 'Check spelling, try a more precise phrase, or use quotes for exact match.'));
      const host = location.host;
      const isYandex = /^yandex\./i.test(host) || /(^|\.)ya\.ru$/i.test(host);
      if (!isYandex && domainTokens.length) {
        const d = domainTokens[0];
        const hasSiteOrHost = /\b(?:site|host):\S+/i.test(q);
        if (!hasSiteOrHost) {
          const cleanedOnce = q.replace(/\b(?:site|host):\S+/gi, ' ').trim();
          const escapedD = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const cleaned = cleanedOnce.replace(new RegExp(escapedD, 'gi'), ' ').replace(/\s{2,}/g, ' ').trim();
          const newQ = cleaned ? `site:${d} ${cleaned}` : `site:${d}`;
          tips.push(`${_('serpTipRestrict','Try restricting the search to domain:')} <span>${makePlainLink(`https://www.google.com/search?q=${encodeURIComponent(newQ)}`, `site:${d}`)}</span>.`);
        }
      }
      tips.push(`${_('serpTipArchive','See archived copies:')} ${makePlainLink('https://web.archive.org/', 'Wayback Machine')}.`);
      body.innerHTML = tips.map(t => `<div style="margin:4px 0">${t}</div>`).join('');
    });
  }

  renderTips();
  function onUrlMaybeChanged(){ if (location.href !== lastUrl) { const el = document.getElementById('ah-serp'); if (el) el.remove(); renderTips(); } }
  const _push = history.pushState; history.pushState = function(){ _push.apply(this, arguments); setTimeout(onUrlMaybeChanged, 0); };
  const _replace = history.replaceState; history.replaceState = function(){ _replace.apply(this, arguments); setTimeout(onUrlMaybeChanged, 0); };
  window.addEventListener('popstate', onUrlMaybeChanged);
  setInterval(onUrlMaybeChanged, 800);
})();
