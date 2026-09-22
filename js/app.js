const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const CONFIG = {
  appVersion: '0.3.1',
  folderIds: [],
  folderUrls: [],
  folderId: '',
  folderUrl: '',
  externalSources: [],
  driveApiKey: '',
  largeArchiveWarningMB: 180,
  pageCacheLimit: 12,
  ...(window.MHQR_CONFIG || {})
};

const LS = {
  fav: 'mhqr:favorites',
  progress: 'mhqr:progress',
  theme: 'mhqr:theme',
  apiKey: 'mhqr:driveApiKey',
  prefs: 'mhqr:prefs',
  catalog: 'mhqr:catalogCache',
  syncMeta: 'mhqr:syncMeta',
  bookmarks: 'mhqr:bookmarks',
  display: 'mhqr:displayPrefs',
  itemPrefs: 'mhqr:itemReaderPrefs',
  firstSeen: 'mhqr:firstSeen'
};



const RUNTIME_URLS = {
  pdf: 'https://esm.sh/pdfjs-dist@6.3.289/build/pdf.mjs',
  pdfWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.mjs',
  zip: 'https://esm.sh/jszip@3.10.1',
  unrar: 'https://esm.sh/node-unrar-js@2.0.2?bundle',
  unrarWasm: 'https://cdn.jsdelivr.net/npm/node-unrar-js@2.0.2/esm/js/unrar.wasm'
};
let offlineWebpModulePromise = null;
function loadOfflineWebpModule() {
  if (!offlineWebpModulePromise) offlineWebpModulePromise = import('./modules/offline-webp.js');
  return offlineWebpModulePromise;
}
function formatDateTime(ts) {
  if (!ts) return '';
  try { return new Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeStyle:'short' }).format(new Date(ts)); }
  catch { return ''; }
}
function setNetworkStatus() {
  const el = $('#networkStatus'); if (!el) return;
  const online = navigator.onLine !== false;
  el.textContent = online ? '● Online' : '● Offline';
  el.classList.toggle('online', online); el.classList.toggle('offline', !online);
  el.title = online ? 'Conectado à internet' : 'Sem internet — usando dados e HQs salvos';
}
async function warmReaderRuntimes() {
  const el = $('#runtimeStatus');
  if (!navigator.onLine) { if (el) { el.textContent = 'Offline: usando motores já armazenados no cache, quando disponíveis.'; el.className = 'runtime-status warn'; } return; }
  if (el) { el.textContent = 'Preparando motores de PDF/CBR/CBZ para uso offline…'; el.className = 'runtime-status'; }
  const urls = Object.values(RUNTIME_URLS);
  const results = await Promise.allSettled(urls.map(url => fetch(url, { mode:'cors', cache:'reload' }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return true; })));
  const ok = results.filter(r => r.status === 'fulfilled').length;
  if (el) {
    if (ok === urls.length) { el.textContent = 'Motores de PDF/CBR/CBZ armazenados para reutilização offline.'; el.className = 'runtime-status ok'; }
    else { el.textContent = `Motores offline parcialmente preparados (${ok}/${urls.length}). O app tentará novamente quando houver internet.`; el.className = 'runtime-status warn'; }
  }
}

const storageGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
const storageSet = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
const storageRemove = key => { try { localStorage.removeItem(key); } catch {} };
const readJson = (key, fallback) => {
  try { return JSON.parse(storageGet(key)) ?? fallback; }
  catch { return fallback; }
};

const state = {
  items: [], filter: 'all', source: 'all', category: '', search: '', sort: 'name', current: null, renderLimit: matchMedia('(max-width:850px)').matches ? 36 : 60,
  pages: [], page: 0, mode: 'spread', fit: 'contain', direction: 'ltr', zoom: 1, collection: '', archive: null,
  pageUrls: new Map(), pageUse: new Map(), verticalObserver: null,
  verticalScrollHandler: null, renderToken: 0, openToken: 0, pdfObjectUrl: '', pdfDoc: null, pdfRenderTask: null, largePending: null,
  readerDownloadController: null, offlineControllers: new Map(), touchStart: null, offlineIds: new Set(), offlineMeta: new Map(), offlineBusy: new Set(), autoScrollId: 0, autoScrollLast: 0, pinch: null, immersive: false, trimMargins: false, syncController: null, syncStatus: [], thumbRenderToken: 0, thumbObserver: null, thumbQueue: [], thumbActive: 0, flipDirection: '', flipDrag: null, lastFlipDragAt: 0, pageSetSeq: 0, readerViewportW: 0, readerViewportH: 0, imageZoomRaf: 0, offlineProgress: new Map(), lastTouchTap: null, panoramaRerenderPending: false, readerHistoryActive: false, pageTransitioning: false, pendingPageTarget: null, prefetchQueue: [], prefetchQueued: new Set(), prefetchActive: 0, verticalSaveTimer: 0, verticalRestore: null, externalSourceStatus: new Map(), activeAlphabetLetter: ''
};

const favorites = new Set(readJson(LS.fav, []));
const progress = readJson(LS.progress, {});
const bookmarks = readJson(LS.bookmarks, {});
const displayPrefs = { brightness:100, contrast:100, sepia:0, ...readJson(LS.display, {}) };
const itemReaderPrefs = readJson(LS.itemPrefs, {});
const firstSeen = readJson(LS.firstSeen, {});
const prefs = { defaultMode: 'spread', direction: 'ltr', performance: 'auto', autoScrollSpeed: 46, keepZoom: false, ...readJson(LS.prefs, {}) };
function savePrefs() { storageSet(LS.prefs, JSON.stringify(prefs)); }
function saveBookmarks() { storageSet(LS.bookmarks, JSON.stringify(bookmarks)); }
function saveDisplayPrefs() { storageSet(LS.display, JSON.stringify(displayPrefs)); }
function saveItemReaderPrefs() { storageSet(LS.itemPrefs, JSON.stringify(itemReaderPrefs)); }
function saveFirstSeen() { storageSet(LS.firstSeen, JSON.stringify(firstSeen)); }
function persistCurrentReaderPrefs() { if (!state.current?.id) return; itemReaderPrefs[state.current.id] = { mode:state.mode, direction:state.direction, fit:state.fit, trimMargins:Boolean(state.trimMargins) }; saveItemReaderPrefs(); }
function currentBookmarkKey() { return state.current?.id || ''; }
function bookmarkedPages() {
  const key = currentBookmarkKey();
  const arr = key && Array.isArray(bookmarks[key]) ? bookmarks[key] : [];
  return new Set(arr.map(Number).filter(Number.isFinite));
}
function isCurrentPageBookmarked() { return bookmarkedPages().has(Number(state.page || 0)); }
function updateBookmarkButton() {
  const btn = $('#bookmarkBtn'); if (!btn) return;
  const on = Boolean(state.current && isCurrentPageBookmarked());
  btn.textContent = on ? '★ Marcada' : '☆ Marcador';
  btn.classList.toggle('is-bookmarked', on);
  btn.title = on ? 'Remover marcador desta página' : 'Marcar esta página';
  updateBookmarkJumpButton();
}
function updateBookmarkJumpButton() {
  const btn = $('#bookmarkJumpBtn'); if (!btn) return;
  const pages = [...bookmarkedPages()].sort((a,b)=>a-b);
  btn.textContent = `${pages.length ? '★' : '☆'} ${pages.length}`;
  btn.disabled = !pages.length;
  btn.title = pages.length ? `Próximo marcador (${pages.map(p=>p+1).join(', ')})` : 'Nenhum marcador neste arquivo';
}
function jumpToNextBookmark() {
  const pages = [...bookmarkedPages()].sort((a,b)=>a-b);
  if (!pages.length) return toast('Nenhum marcador neste arquivo.');
  const next = pages.find(p => p > state.page) ?? pages[0];
  setPage(next);
}
function togglePageBookmark() {
  if (!state.current || !state.pages.length) return;
  const key = currentBookmarkKey();
  const set = bookmarkedPages();
  const page = Number(state.page || 0);
  if (set.has(page)) { set.delete(page); toast(`Marcador removido da página ${page + 1}.`); }
  else { set.add(page); toast(`Página ${page + 1} marcada.`); }
  bookmarks[key] = [...set].sort((a,b)=>a-b);
  if (!bookmarks[key].length) delete bookmarks[key];
  saveBookmarks(); updateBookmarkButton(); updatePageControls();
}
function applyDisplayPrefs() {
  const reader = $('#reader'); if (!reader) return;
  reader.style.setProperty('--reader-brightness', `${Number(displayPrefs.brightness || 100)}%`);
  reader.style.setProperty('--reader-contrast', `${Number(displayPrefs.contrast || 100)}%`);
  reader.style.setProperty('--reader-sepia', `${Number(displayPrefs.sepia || 0)}%`);
  if ($('#brightnessRange')) $('#brightnessRange').value = String(displayPrefs.brightness || 100);
  if ($('#contrastRange')) $('#contrastRange').value = String(displayPrefs.contrast || 100);
  if ($('#sepiaRange')) $('#sepiaRange').value = String(displayPrefs.sepia || 0);
  if ($('#brightnessValue')) $('#brightnessValue').textContent = `${displayPrefs.brightness || 100}%`;
  if ($('#contrastValue')) $('#contrastValue').textContent = `${displayPrefs.contrast || 100}%`;
  if ($('#sepiaValue')) $('#sepiaValue').textContent = `${displayPrefs.sepia || 0}%`;
}
function setDisplayPref(name, value) {
  displayPrefs[name] = Number(value); saveDisplayPrefs(); applyDisplayPrefs();
}
function setImmersive(value = !state.immersive) {
  state.immersive = Boolean(value);
  $('#reader')?.classList.toggle('immersive', state.immersive);
  if ($('#immersiveBtn')) $('#immersiveBtn').textContent = state.immersive ? '▣ Sair imersivo' : '◫ Imersivo';
  if (state.immersive) closeReaderControls();
}

function performanceProfile() {
  const mode = prefs.performance || 'auto';
  const mobile = matchMedia('(max-width: 850px)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
  const smallMobile = mobile && matchMedia('(max-width: 430px)').matches;
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const constrained = (memory && memory <= 4) || (cores && cores <= 4);
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const slowConnection = saveData || ['slow-2g','2g'].includes(String(connection?.effectiveType || ''));
  const eco = mode === 'eco' || (mode === 'auto' && mobile && constrained);
  const quality = mode === 'quality';
  const hugeComic = Boolean(state.current && extType(state.current)==='comic' && Number(state.current.size||0) > 180*1024*1024);
  const effectiveEco = eco || hugeComic;
  return {
    mode, mobile, smallMobile, constrained, saveData, slowConnection, eco: effectiveEco, quality,
    cacheLimit: effectiveEco ? 4 : (smallMobile && !quality ? 5 : (mobile && !quality ? 7 : Math.max(8, Number(CONFIG.pageCacheLimit || 12)))),
    pdfDpr: effectiveEco ? 1 : (smallMobile && !quality ? 1.1 : (mobile && !quality ? 1.3 : 2)),
    pdfPixelBudget: effectiveEco ? 3200000 : (smallMobile && !quality ? 4200000 : (mobile && !quality ? 5500000 : 12000000)),
    verticalWindow: effectiveEco ? 1 : (smallMobile && !quality ? 1 : (mobile && !quality ? 2 : 5)),
    observerMargin: effectiveEco ? 320 : (smallMobile && !quality ? 440 : (mobile && !quality ? 620 : 1200)),
    prefetch: !effectiveEco && !slowConnection && document.visibilityState !== 'hidden',
    prefetchBothDirections: !mobile && !slowConnection
  };
}
function performanceLabel() {
  const p = performanceProfile();
  return p.eco ? 'Econômico' : (p.quality ? 'Qualidade' : 'Automático');
}

let installPrompt = null;
let unrarModulePromise = null;
let unrarWasmPromise = null;
let jszipModulePromise = null;
let pdfjsModulePromise = null;



const OFFLINE_DB = { name: 'mhqr-offline-v1', version: 1, store: 'files' };
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB.name, OFFLINE_DB.version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_DB.store)) db.createObjectStore(OFFLINE_DB.store, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB indisponível.'));
  });
}
async function offlineDbAction(mode, fn) {
  const db = await openOfflineDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_DB.store, mode);
      const store = tx.objectStore(OFFLINE_DB.store);
      let value;
      try { value = fn(store, resolve, reject); } catch (e) { reject(e); return; }
      tx.oncomplete = () => { if (value !== undefined) resolve(value); };
      tx.onerror = () => reject(tx.error || new Error('Falha no armazenamento offline.'));
      tx.onabort = () => reject(tx.error || new Error('Operação offline cancelada.'));
    });
  } finally { db.close(); }
}
async function refreshOfflineIndex() {
  try {
    const rows = await offlineDbAction('readonly', (store, resolve, reject) => {
      const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
    });
    state.offlineIds = new Set(rows.map(r => r.id));
    state.offlineMeta = new Map(rows.map(r => {
      const meta = {
        id:r.id, name:r.name, size:Number(r.size || r.blob?.size || 0), mimeType:r.mimeType,
        modifiedTime:r.modifiedTime, folderPath:r.folderPath, resourceKey:r.resourceKey,
        savedAt:r.savedAt, offline:true, kind:r.kind || 'file', readerType:r.readerType,
        manifestUrl:r.manifestUrl, coverUrl:r.coverUrl, sourceUrl:r.sourceUrl, fileUrl:r.fileUrl,
        externalSourceId:r.externalSourceId, externalSourceName:r.externalSourceName,
        seriesTitle:r.seriesTitle, issueNumber:r.issueNumber, pageCount:Number(r.pageCount || 0)
      };
      return [r.id, meta];
    }));
    return rows;
  } catch (err) {
    console.warn('Offline storage indisponível:', err);
    state.offlineIds = new Set(); state.offlineMeta = new Map(); return [];
  }
}
async function getOfflineRecord(id) {
  if (!id) return null;
  return offlineDbAction('readonly', (store, resolve, reject) => {
    const req = store.get(id); req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error);
  });
}
async function deleteOfflineRecord(id) {
  const rec = await getOfflineRecord(id).catch(() => null);
  if (rec?.kind === 'web-pages' && Array.isArray(rec.cachedUrls)) {
    try {
      const mod = await loadOfflineWebpModule();
      await mod.removeWebPageEditionCache(rec.cachedUrls);
    } catch (err) { console.warn('Falha ao remover cache WebP offline:', err); }
  }
  await offlineDbAction('readwrite', (store) => store.delete(id));
  state.offlineIds.delete(id); state.offlineMeta.delete(id); state.offlineProgress.delete(id);
  if (!state.items.some(item => item.id === id && !item.offline)) state.items = state.items.filter(item => item.id !== id);
  await updateOfflineStorageInfo(); render();
}
async function updateOfflineStorageInfo() {
  const el = $('#offlineStorageInfo'); if (!el) return;
  let total = 0; for (const m of state.offlineMeta.values()) total += Number(m.size || 0);
  let quotaText = '';
  try {
    const est = await navigator.storage?.estimate?.();
    if (est?.quota) quotaText = ` • navegador: ${bytes(est.usage || 0)} de ${bytes(est.quota)}`;
  } catch {}
  el.textContent = `${state.offlineIds.size} item(ns) • ${bytes(total)} salvos${quotaText}`;
}
async function ensureOfflineItem(item) {
  if (!item) return item;
  const id = item.offlineOriginId || item.id;
  if (!state.offlineIds.has(id)) return item;
  const rec = await getOfflineRecord(id);
  if (!rec) return item;
  if (rec.kind === 'web-pages') {
    return {
      ...item,
      id,
      name:rec.name || item.name,
      mimeType:'application/x-mhqr-web-pages',
      readerType:'web-pages',
      manifestUrl:rec.manifestUrl || item.manifestUrl,
      coverUrl:rec.coverUrl || item.coverUrl,
      sourceUrl:rec.sourceUrl || item.sourceUrl,
      externalSourceId:rec.externalSourceId || item.externalSourceId,
      externalSourceName:rec.externalSourceName || item.externalSourceName,
      seriesTitle:rec.seriesTitle || item.seriesTitle,
      issueNumber:rec.issueNumber ?? item.issueNumber,
      pageCount:Number(rec.pageCount || item.pageCount || 0),
      offline:true,
      offlineOriginId:id
    };
  }
  if (!rec.blob) return item;
  return { ...item, id, name: rec.name || item.name, size: rec.size || rec.blob.size, mimeType: rec.mimeType || item.mimeType, localFile: rec.blob, offline: true, offlineOriginId: id };
}
function updateOfflineProgressUi(id, done, total) {
  const pct = total ? Math.max(0, Math.min(100, Math.round(done / total * 100))) : 0;
  state.offlineProgress.set(id, { done, total, pct });
  $$('.card[data-id]').forEach(card => {
    if (card.dataset.id !== id) return;
    const btn = card.querySelector('[data-action="offline"]');
    if (btn) btn.textContent = `${pct}%`;
  });
  if ((state.current?.offlineOriginId || state.current?.id) === id && $('#offlineCurrentBtn')) {
    $('#offlineCurrentBtn').textContent = `☁ ${pct}%`;
  }
}
async function saveItemOffline(item) {
  if (!item) return;
  const id = item.offlineOriginId || item.id;
  if (state.offlineBusy.has(id)) return;
  if (state.offlineIds.has(id)) { toast('Este item já está disponível offline.'); return; }
  state.offlineBusy.add(id); render();
  try {
    try { await navigator.storage?.persist?.(); } catch {}
    if (extType(item) === 'pages') {
      if (!item.manifestUrl) throw new Error('Esta fonte de páginas ainda não oferece manifesto para salvamento offline completo.');
      const controller = new AbortController();
      state.offlineControllers.set(id, controller);
      const mod = await loadOfflineWebpModule();
      const result = await mod.cacheWebPageEdition({
        manifestUrl:item.manifestUrl,
        signal:controller.signal,
        concurrency:performanceProfile().mobile ? 2 : 3,
        onProgress:({done,total}) => updateOfflineProgressUi(id, done, total)
      });
      const record = {
        id, kind:'web-pages', name:item.name, size:Number(result.size || 0),
        mimeType:'application/x-mhqr-web-pages', readerType:'web-pages',
        modifiedTime:item.modifiedTime || '', folderPath:item.folderPath || '',
        manifestUrl:item.manifestUrl, coverUrl:item.coverUrl || '', sourceUrl:item.sourceUrl || '',
        externalSourceId:item.externalSourceId || '', externalSourceName:item.externalSourceName || '',
        seriesTitle:item.seriesTitle || '', issueNumber:item.issueNumber ?? null,
        pageCount:Number(result.pageCount || item.pageCount || 0), cachedUrls:result.cachedUrls,
        savedAt:Date.now()
      };
      await offlineDbAction('readwrite', (store) => store.put(record));
      state.offlineIds.add(id);
      state.offlineMeta.set(id, { ...record, cachedUrls:undefined, offline:true });
    } else {
      let blob;
      if (item.localFile) blob = item.localFile;
      else {
        try {
          const est = await navigator.storage?.estimate?.();
          const free = est?.quota ? Math.max(0, Number(est.quota) - Number(est.usage || 0)) : 0;
          if (free && item.size && Number(item.size) * 1.12 > free) throw new Error(`Espaço insuficiente para salvar offline. Livre: ${bytes(free)}.`);
        } catch (err) { if (/Espaço insuficiente/.test(err?.message || '')) throw err; }

        if (item.fileUrl) {
          const controller = new AbortController();
          state.offlineControllers.set(id, controller);
          const response = await fetch(item.fileUrl, { mode:'cors', cache:'no-store', signal:controller.signal });
          if (!response.ok) throw new Error(`Arquivo externo: HTTP ${response.status}`);
          blob = await response.blob();
          if (controller.signal.aborted) throw new DOMException('Salvamento offline cancelado.', 'AbortError');
        } else {
          if (!getApiKey()) toast('Preparando cópia offline. Se o Drive bloquear, configure a API Key.');
          const data = await downloadDriveFile(item, -1, 'offline');
          blob = new Blob([data], { type: item.mimeType || 'application/octet-stream' });
        }
      }
      const record = {
        id, kind:'file', name:item.name, size:Number(item.size || blob.size), mimeType:item.mimeType || blob.type,
        modifiedTime:item.modifiedTime || '', folderPath:item.folderPath || '', resourceKey:item.resourceKey || '',
        fileUrl:item.fileUrl || '', coverUrl:item.coverUrl || '', sourceUrl:item.sourceUrl || '',
        externalSourceId:item.externalSourceId || '', externalSourceName:item.externalSourceName || '',
        seriesTitle:item.seriesTitle || '', issueNumber:item.issueNumber ?? null, pageCount:Number(item.pageCount || 0),
        savedAt:Date.now(), blob
      };
      await offlineDbAction('readwrite', (store) => store.put(record));
      state.offlineIds.add(id);
      state.offlineMeta.set(id, { ...record, blob: undefined, offline:true });
    }
    toast('Salvo para leitura offline.');
    await updateOfflineStorageInfo();
  } catch (err) {
    if (err?.name !== 'AbortError') toast(`Não foi possível salvar offline: ${err.message}`);
  } finally {
    state.offlineControllers.delete(id);
    state.offlineBusy.delete(id);
    state.offlineProgress.delete(id);
    render();
  }
}
async function toggleOfflineItem(item) {
  const id = item?.offlineOriginId || item?.id; if (!id) return;
  if (state.offlineBusy.has(id)) {
    state.offlineControllers.get(id)?.abort();
    toast('Salvamento offline cancelado.');
    return;
  }
  if (state.offlineIds.has(id)) {
    if (!confirm(`Remover “${item.name}” da biblioteca offline?`)) return;
    await deleteOfflineRecord(id); toast('Item removido do offline.');
  } else await saveItemOffline(item);
}
async function clearOfflineLibrary() {
  for (const c of state.offlineControllers.values()) c.abort();
  state.offlineControllers.clear();
  const ids = new Set(state.offlineIds);
  if (!ids.size) {
    try { const mod = await loadOfflineWebpModule(); await mod.clearWebPageOfflineCache(); } catch {}
    toast('A biblioteca offline já está vazia.'); return;
  }
  if (!confirm(`Remover ${ids.size} item(ns) salvos offline?`)) return;
  try {
    const mod = await loadOfflineWebpModule();
    await mod.clearWebPageOfflineCache();
  } catch {}
  await offlineDbAction('readwrite', (store) => store.clear());
  state.items = state.items.filter(item => !(ids.has(item.id) && item.offline));
  await refreshOfflineIndex(); await updateOfflineStorageInfo(); render(); toast('Biblioteca offline limpa.');
}
function saveFav() { storageSet(LS.fav, JSON.stringify([...favorites])); }
function saveProgress() { storageSet(LS.progress, JSON.stringify(progress)); }
function getApiKey() { return (storageGet(LS.apiKey) || CONFIG.driveApiKey || '').trim(); }
function bytes(n) {
  n = Number(n || 0);
  if (!n) return '—';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}
function extType(item) {
  if (['drive-pages','web-pages'].includes(item?.readerType) || ['application/x-mhqr-pages','application/x-mhqr-web-pages'].includes(item?.mimeType)) return 'pages';
  if (item?.readerType === 'pdf' || item?.mimeType === 'application/pdf') return 'pdf';
  const n = String(item?.name || '').toLowerCase();
  const fileUrl = String(item?.fileUrl || '').toLowerCase().split(/[?#]/)[0];
  if (n.endsWith('.pdf') || fileUrl.endsWith('.pdf')) return 'pdf';
  if (/\.(cbr|cbz|rar|zip)$/.test(n) || /\.(cbr|cbz|rar|zip)$/.test(fileUrl)) return 'comic';
  return 'other';
}
function extension(name) { return (name.match(/\.[^.]+$/)?.[0] || '').toLowerCase(); }
function isArchiveJunk(name) {
  const parts = String(name || '').replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.some(part => part === '__MACOSX' || part === '.DS_Store' || part.startsWith('._'));
}
function isImage(name) { return !isArchiveJunk(name) && /\.(avif|webp|png|jpe?g|jfif|gif|bmp|ico)$/i.test(name); }
function mimeFromName(name) {
  const e = extension(name);
  return e === '.png' ? 'image/png' : e === '.webp' ? 'image/webp' : e === '.gif' ? 'image/gif' : e === '.avif' ? 'image/avif' : e === '.bmp' ? 'image/bmp' : e === '.ico' ? 'image/x-icon' : 'image/jpeg';
}
function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
}
function naturalSort(a, b) { return String(a || '').localeCompare(String(b || ''), 'pt-BR', { numeric:true, sensitivity:'base', ignorePunctuation:true }); }
function shortCover(name) {
  return name.replace(/\.(pdf|cbr|cbz|rar|zip)$/i, '').replace(/\([^)]*\)/g, '').replace(/[-_]+/g, ' ').trim().split(/\s+/).slice(0, 5).join(' ');
}
function percentFor(item) { return Math.max(0, Math.min(100, progress[item.id]?.percent || 0)); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
document.addEventListener('error', event => {
  const target = event.target;
  if (target instanceof HTMLImageElement && target.dataset.removeOnError === '1') target.remove();
}, true);
function uniqueItems(items) {
  return [...new Map(items.filter(x => x?.id && x?.name).map(x => [x.id, { ...x, size: Number(x.size || 0) }])).values()];
}

const generatedPdfCovers = new Map();
const pendingPdfCovers = new Map();
const pdfCoverQueue = [];
const pdfCoverQueued = new Set();
let pdfCoverActive = 0;
let pdfCoverRenderScheduled = false;

function generatedPdfCoverUrl(id) {
  const url = generatedPdfCovers.get(id);
  if (!url) return '';
  generatedPdfCovers.delete(id);
  generatedPdfCovers.set(id, url);
  return url;
}
function rememberGeneratedPdfCover(id, url) {
  const previous = generatedPdfCovers.get(id);
  if (previous && previous !== url && previous.startsWith('blob:')) URL.revokeObjectURL(previous);
  generatedPdfCovers.delete(id);
  generatedPdfCovers.set(id, url);

  const limit = performanceProfile().mobile ? 24 : 48;
  while (generatedPdfCovers.size > limit) {
    const [oldId, oldUrl] = generatedPdfCovers.entries().next().value || [];
    if (!oldId) break;
    generatedPdfCovers.delete(oldId);
    if (String(oldUrl).startsWith('blob:')) URL.revokeObjectURL(oldUrl);
  }
}
function schedulePdfCoverRender() {
  if (pdfCoverRenderScheduled) return;
  pdfCoverRenderScheduled = true;
  requestAnimationFrame(() => {
    pdfCoverRenderScheduled = false;
    if (!document.hidden) render();
  });
}

function thumbUrl(item) {
  const generated = generatedPdfCoverUrl(item?.id);
  if (generated) return generated;
  if (item.coverUrl) return item.coverUrl;
  if (item.localFile && !item.thumbnailLink) return '';
  if (extType(item) === 'pages' && item.coverPageId) return item.thumbnailLink || `https://drive.google.com/thumbnail?id=${encodeURIComponent(item.coverPageId)}&sz=w420`;
  return item.thumbnailLink || `https://drive.google.com/thumbnail?id=${encodeURIComponent(item.id)}&sz=w420`;
}
function driveViewUrl(item) {
  if (item.fileUrl) return item.fileUrl;
  if (item.sourceUrl) return item.sourceUrl;
  if (extType(item) === 'pages' && item.driveFolderId) return `https://drive.google.com/drive/folders/${encodeURIComponent(item.driveFolderId)}`;
  const u = new URL(`https://drive.google.com/file/d/${encodeURIComponent(item.id)}/view`); if (item.resourceKey) u.searchParams.set('resourcekey', item.resourceKey); return u.href;
}
function drivePreviewUrl(item) { return `https://drive.google.com/file/d/${encodeURIComponent(item.id)}/preview`; }
function safeOpen(url) {
  try {
    const u = new URL(url, location.href);
    if (!['https:','http:'].includes(u.protocol)) throw new Error('Protocolo não permitido');
    window.open(u.href, '_blank', 'noopener,noreferrer');
  } catch { toast('Link externo inválido ou bloqueado.'); }
}
function sanitizeFilename(name) {
  return String(name || 'arquivo').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'arquivo';
}
function directDownloadUrl(item) {
  if (!item || item.localFile) return '';
  if (item.fileUrl) return item.fileUrl;
  const u = new URL('https://drive.usercontent.google.com/download');
  u.searchParams.set('id', item.id);
  u.searchParams.set('export', 'download');
  u.searchParams.set('confirm', 't');
  if (item.resourceKey) u.searchParams.set('resourcekey', item.resourceKey);
  return u.href;
}
function drivePagePublicUrl(page, size = 'w2400') {
  if (!page?.id) return '';
  const u = new URL('https://drive.google.com/thumbnail');
  u.searchParams.set('id', page.id);
  u.searchParams.set('sz', size);
  if (page.resourceKey) u.searchParams.set('resourcekey', page.resourceKey);
  return u.href;
}
function drivePageFallbackUrls(page, size = 'w2400') {
  if (!page?.id) return [];
  const id = encodeURIComponent(page.id);
  const resource = page.resourceKey ? `&resourcekey=${encodeURIComponent(page.resourceKey)}` : '';
  return [
    drivePagePublicUrl(page, size),
    `https://lh3.googleusercontent.com/d/${id}=${size}`,
    `https://drive.google.com/uc?export=view&id=${id}${resource}`,
    directDownloadUrl(page)
  ].filter(Boolean);
}
async function fetchDrivePageWithApi(page, expectedToken = state.renderToken) {
  const key = getApiKey();
  if (!key || !page?.id) return '';
  const archive = state.archive;
  const u = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(page.id)}`);
  u.searchParams.set('alt', 'media');
  u.searchParams.set('key', key);
  const headers = page.resourceKey ? { 'X-Goog-Drive-Resource-Keys': `${page.id}/${page.resourceKey}` } : {};
  try {
    const r = await fetch(u, { mode:'cors', headers, cache:'force-cache' });
    if (!r.ok) return '';
    const contentType = r.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) return '';
    const blob = await r.blob();
    if (!blob.size || expectedToken !== state.renderToken || archive !== state.archive) return '';
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}
async function downloadItem(item) {
  if (!item) return;
  if (extType(item) === 'pages') {
    safeOpen(driveViewUrl(item));
    toast('Esta HQ usa páginas WebP separadas. A pasta foi aberta no Google Drive.');
    return;
  }
  if (item.localFile) {
    const url = URL.createObjectURL(item.localFile);
    const a = document.createElement('a');
    a.href = url; a.download = sanitizeFilename(item.name); a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Download iniciado.');
    return;
  }
  // Use navegação direta para o endpoint de download do Drive: o arquivo não precisa
  // ser carregado inteiro na memória do celular, o que é importante para CBRs grandes.
  const url = directDownloadUrl(item);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.download = sanitizeFilename(item.name); a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  toast('Download aberto pelo Google Drive.');
}
function archiveWarningLimitMB() {
  const configured = Math.max(40, Number(CONFIG.largeArchiveWarningMB || 180));
  const memory = Number(navigator.deviceMemory || 0);
  const mobile = matchMedia('(max-width:850px)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
  if (memory && memory <= 2) return Math.min(configured, 65);
  if (memory && memory <= 4) return Math.min(configured, 105);
  if (mobile && !memory) return Math.min(configured, 100);
  return mobile ? Math.min(configured, 140) : configured;
}

function resolveExternalUrl(base, value) {
  if (!value) return '';
  try { return new URL(value, base).href; }
  catch { return ''; }
}
async function loadExternalCatalogs() {
  const sources = Array.isArray(CONFIG.externalSources) ? CONFIG.externalSources : [];
  const seenNow = Date.now();
  let firstSeenDirty = false;
  state.externalSourceStatus = new Map();

  const jobs = sources.map(async (src, index) => {
    const sourceId = String(src?.id || `external-${index + 1}`);
    const sourceName = String(src?.name || `Acervo ${index + 1}`);
    if (!src?.catalogUrl) return { sourceId, sourceName, ok:false, items:[], error:'Catálogo não configurado' };

    const catalogUrl = resolveExternalUrl(location.href, src.catalogUrl);
    const siteUrl = resolveExternalUrl(catalogUrl, src.siteUrl || './');
    const started = performance.now();

    try {
      const r = await fetch(catalogUrl, { cache:'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const rows = Array.isArray(data?.items) ? data.items : [];
      const items = [];

      for (const row of rows) {
        const rawId = String(row?.id || row?.title || row?.name || '');
        const name = String(row?.title || row?.name || rawId).trim();
        if (!rawId || !name) continue;

        const format = String(row?.format || row?.readerType || '').toLowerCase();
        const fileUrl = resolveExternalUrl(siteUrl, row?.file || row?.fileUrl || row?.url || '');
        const isPdf = format === 'pdf' || String(fileUrl).toLowerCase().split(/[?#]/)[0].endsWith('.pdf');
        const manifestUrl = resolveExternalUrl(siteUrl, row?.manifest || '');
        const isPages = !isPdf && (format === 'webp' || format === 'webp-pages' || format === 'pages' || Boolean(manifestUrl));
        if (!isPdf && !isPages) continue;

        const stableId = `external:${sourceId}:${rawId}`;
        if (!Number(firstSeen[stableId])) { firstSeen[stableId] = seenNow; firstSeenDirty = true; }

        items.push({
          id:stableId,
          name,
          readerType:isPdf ? 'pdf' : 'web-pages',
          mimeType:isPdf ? 'application/pdf' : 'application/x-mhqr-web-pages',
          pageCount:Number(row?.pageCount || 0),
          coverUrl:resolveExternalUrl(siteUrl, row?.cover || ''),
          manifestUrl:isPages ? manifestUrl : '',
          fileUrl:isPdf ? fileUrl : '',
          sourceUrl:resolveExternalUrl(siteUrl, row?.sourceUrl || '') || siteUrl,
          externalSourceId:sourceId,
          externalSourceName:sourceName,
          seriesTitle:String(row?.collectionTitle || ''),
          issueNumber:row?.issue ?? null,
          modifiedTime:String(row?.modifiedTime || row?.updatedAt || row?.addedAt || new Date(Number(firstSeen[stableId]) || seenNow).toISOString()),
          folderPath:String(row?.collectionTitle || data?.name || sourceName),
          size:Number(row?.size || row?.sizeBytes || 0)
        });
      }

      return { sourceId, sourceName, ok:true, items, count:items.length, elapsed:Math.round(performance.now() - started) };
    } catch (error) {
      return { sourceId, sourceName, ok:false, items:[], error:error?.message || String(error), elapsed:Math.round(performance.now() - started) };
    }
  });

  const results = await Promise.all(jobs);
  const items = [];
  const loadedSourceIds = new Set();
  const failedSourceIds = new Set();

  for (const result of results) {
    state.externalSourceStatus.set(result.sourceId, result);
    if (result.ok) {
      loadedSourceIds.add(result.sourceId);
      items.push(...result.items);
    } else {
      failedSourceIds.add(result.sourceId);
      console.warn('Falha ao carregar acervo externo:', result.sourceName, result.error);
    }
  }

  if (firstSeenDirty) saveFirstSeen();
  return { items:uniqueItems(items), loadedSourceIds, failedSourceIds };
}
async function loadStaticCatalog() {
  const [bundledResult, externalResult] = await Promise.allSettled([
    fetch('./data/catalog.json', { cache:'no-store' }).then(async r => {
      if (!r.ok) throw new Error(`Catálogo local: HTTP ${r.status}`);
      return uniqueItems(await r.json());
    }),
    loadExternalCatalogs()
  ]);

  const bundled = bundledResult.status === 'fulfilled' ? bundledResult.value : [];
  const external = externalResult.status === 'fulfilled'
    ? externalResult.value
    : { items:[], loadedSourceIds:new Set(), failedSourceIds:new Set((CONFIG.externalSources || []).map((src,index)=>String(src?.id || `external-${index+1}`))) };

  const cached = readJson(LS.catalog, []);
  const cachedRows = Array.isArray(cached) ? cached : [];
  const cachedNonExternal = cachedRows.filter(item => !item?.externalSourceId);
  const fallbackExternal = cachedRows.filter(item => item?.externalSourceId && external.failedSourceIds.has(String(item.externalSourceId)));

  // Catálogos carregados com sucesso substituem completamente a versão antiga,
  // evitando HQs removidas permanecerem como itens fantasmas.
  return uniqueItems([...cachedNonExternal, ...fallbackExternal, ...bundled, ...external.items]);
}
function saveCatalogCache(items) {
  const clean = uniqueItems(items).map(({ localFile, offline, ...item }) => item);
  storageSet(LS.catalog, JSON.stringify(clean));
}

async function listDriveChildren(apiKey, folderId, signal) {
  const fields = 'nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink,resourceKey)';
  const files = []; let pageToken = '';
  do {
    const u = new URL('https://www.googleapis.com/drive/v3/files');
    u.searchParams.set('q', `'${folderId}' in parents and trashed = false`);
    u.searchParams.set('fields', fields);
    u.searchParams.set('pageSize', '1000');
    u.searchParams.set('orderBy', 'name_natural');
    u.searchParams.set('supportsAllDrives', 'true');
    u.searchParams.set('includeItemsFromAllDrives', 'true');
    u.searchParams.set('key', apiKey);
    if (pageToken) u.searchParams.set('pageToken', pageToken);
    const r = await fetch(u, { mode:'cors', signal });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error?.message || `Drive API: HTTP ${r.status}`);
    files.push(...(d.files || []));
    pageToken = d.nextPageToken || '';
  } while (pageToken);
  return files;
}
async function fetchDriveJsonFile(apiKey, file, signal) {
  if (!file?.id) return null;
  const u = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`);
  u.searchParams.set('alt', 'media'); u.searchParams.set('key', apiKey);
  const headers = file.resourceKey ? { 'X-Goog-Drive-Resource-Keys': `${file.id}/${file.resourceKey}` } : {};
  const r = await fetch(u, { mode:'cors', headers, signal });
  if (!r.ok) throw new Error(`JSON do Drive: HTTP ${r.status}`);
  return r.json();
}
function orderedDriveImages(images, manifest = null) {
  const sorted = [...images].sort((a,b) => naturalSort(a.name || '', b.name || ''));
  if (!Array.isArray(manifest?.pages) || !manifest.pages.length) return sorted;
  const byName = new Map(sorted.map(file => [String(file.name || ''), file]));
  const ordered = manifest.pages.map(name => byName.get(String(name))).filter(Boolean);
  const used = new Set(ordered.map(file => file.id));
  return [...ordered, ...sorted.filter(file => !used.has(file.id))];
}
function isLikelyDrivePageFolder(images, manifest = null) {
  if (manifest?.format === 'webp-pages' || Array.isArray(manifest?.pages)) return images.length > 0;
  if (images.length < 2) return false;
  const numbered = images.filter(file => /^\d{1,5}\.(?:avif|webp|png|jpe?g|jfif|gif|bmp)$/i.test(file.name || '')).length;
  return numbered >= Math.max(2, Math.ceil(images.length * .6));
}
function newestDriveModified(files) {
  return files.reduce((latest, file) => String(file.modifiedTime || '') > latest ? String(file.modifiedTime || '') : latest, '');
}
async function listDriveRoot(apiKey, rootId, index, signal, onProgress) {
  const libraryPath = `Biblioteca ${index + 1}`;
  const queue = [{ id: rootId, path: libraryPath, parentPath:'', name:'', libraryPath, seriesTitle:'' }];
  const seenFolders = new Set(); const items = []; let foldersDone = 0;
  while (queue.length) {
    if (signal?.aborted) throw new DOMException('Sincronização cancelada.', 'AbortError');
    const folder = queue.shift(); if (!folder?.id || seenFolders.has(folder.id)) continue;
    seenFolders.add(folder.id);
    const files = await listDriveChildren(apiKey, folder.id, signal);
    const childFolders = files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
    const regularFiles = files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder');
    for (const file of regularFiles) {
      if (/\.(pdf|cbr|cbz|rar|zip)$/i.test(file.name || '')) items.push({ ...file, folderPath:folder.path });
    }

    const imageFiles = regularFiles.filter(file => isImage(file.name || ''));
    const manifestFile = regularFiles.find(file => /^manifest\.json$/i.test(file.name || ''));
    const seriesFile = regularFiles.find(file => /^series\.json$/i.test(file.name || ''));
    let manifest = null, series = null;
    if (manifestFile) {
      try { manifest = await fetchDriveJsonFile(apiKey, manifestFile, signal); }
      catch (err) { console.warn('manifest.json ignorado:', folder.path, err); }
    }
    if (seriesFile) {
      try { series = await fetchDriveJsonFile(apiKey, seriesFile, signal); }
      catch (err) { console.warn('series.json ignorado:', folder.path, err); }
    }

    if (folder.name && isLikelyDrivePageFolder(imageFiles, manifest)) {
      const ordered = orderedDriveImages(imageFiles, manifest);
      const coverName = String(manifest?.cover || '');
      const cover = ordered.find(file => file.name === coverName) || ordered[0];
      const title = String(manifest?.title || folder.name).replace(/^\d+\s*[-–—]\s*/, '').trim() || folder.name;
      const seriesTitle = folder.seriesTitle || '';
      items.push({
        id: `drive-pages:${folder.id}`,
        driveFolderId: folder.id,
        readerType: 'drive-pages',
        mimeType: 'application/x-mhqr-pages',
        name: title,
        folderPath: seriesTitle ? `${folder.libraryPath}/${seriesTitle}` : (folder.parentPath || folder.path),
        seriesTitle,
        issueNumber: manifest?.issue ?? folder.issueNumber ?? null,
        pageCount: ordered.length,
        drivePages: ordered.map(file => ({ id:file.id, name:file.name, size:Number(file.size || 0), resourceKey:file.resourceKey || '' })),
        coverPageId: cover?.id || '',
        coverResourceKey: cover?.resourceKey || '',
        thumbnailLink: cover?.id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(cover.id)}&sz=w420` : '',
        size: ordered.reduce((sum, file) => sum + Number(file.size || 0), 0),
        modifiedTime: newestDriveModified(ordered),
        resourceKey: folder.resourceKey || ''
      });
    }

    const issueByFolder = new Map((Array.isArray(series?.issues) ? series.issues : []).map(issue => [String(issue.folder || ''), issue]));
    for (const child of childFolders) {
      const issue = issueByFolder.get(String(child.name || '')) || null;
      queue.push({
        id: child.id,
        name: child.name,
        path: `${folder.path}/${child.name}`,
        parentPath: folder.path,
        libraryPath: folder.libraryPath || libraryPath,
        seriesTitle: String(series?.title || folder.seriesTitle || ''),
        issueNumber: issue?.issue ?? null,
        resourceKey: child.resourceKey || ''
      });
    }
    foldersDone++; onProgress?.({ index, foldersDone, queued:queue.length, items:items.length, state:'running' });
  }
  return uniqueItems(items);
}
function renderSyncProgress() {
  const box=$('#syncProgressBox'), rows=$('#syncProgressRows'); if (!box || !rows) return;
  const active = state.syncStatus.some(x => x?.state === 'running');
  box.classList.toggle('hidden', !state.syncStatus.length);
  rows.innerHTML = state.syncStatus.map((x,i) => `<div class="sync-row ${x?.state || ''}"><strong>Biblioteca ${i+1}</strong><span>${x?.state === 'ok' ? `✓ ${x.items||0} itens` : x?.state === 'error' ? `⚠ ${escapeHtml(x.error||'Falha')}` : x?.state === 'cancelled' ? 'Cancelada' : `${x?.items||0} itens • ${x?.foldersDone||0} pastas • ${x?.queued||0} na fila`}</span></div>`).join('');
  $('#cancelSyncBtn')?.classList.toggle('hidden', !active);
}
async function syncDriveLibraries(apiKey) {
  const roots = Array.isArray(CONFIG.folderIds) && CONFIG.folderIds.length ? CONFIG.folderIds : [CONFIG.folderId].filter(Boolean);
  state.syncController?.abort(); state.syncController = new AbortController();
  state.syncStatus = roots.map(() => ({ state:'running', items:0, foldersDone:0, queued:1 })); renderSyncProgress();
  const previous = await loadStaticCatalog(); const byLibrary = new Map();
  for (let i=0;i<roots.length;i++) {
    try {
      const items = await listDriveRoot(apiKey, roots[i], i, state.syncController.signal, info => { state.syncStatus[i] = info; renderSyncProgress(); });
      byLibrary.set(i+1, items); state.syncStatus[i] = { state:'ok', items:items.length }; renderSyncProgress();
    } catch (err) {
      if (err?.name === 'AbortError') { state.syncStatus[i] = { state:'cancelled' }; for(let j=i+1;j<roots.length;j++) state.syncStatus[j]={state:'cancelled'}; renderSyncProgress(); break; }
      state.syncStatus[i] = { state:'error', error:err.message }; renderSyncProgress();
    }
  }
  const merged=[];
  for (let i=1;i<=roots.length;i++) {
    const ok=byLibrary.get(i);
    if (ok?.length) merged.push(...ok);
    else merged.push(...previous.filter(item => sourceKeyFor(item) === `library-${i}`));
  }
  merged.push(...previous.filter(item => !/^library-\d+$/.test(sourceKeyFor(item))));
  return uniqueItems(merged);
}
async function loadLibrary() {
  $('#refreshBtn').disabled = true; $('#syncStatus').textContent = 'Atualizando…';
  const key = getApiKey(); $('#apiNotice').classList.toggle('hidden', Boolean(key));
  try {
    if (key) {
      state.items = await syncDriveLibraries(key); saveCatalogCache(state.items);
      const syncedCounts = libraryCounts(); storageSet(LS.syncMeta, JSON.stringify({ at:Date.now(), count:state.items.length, counts:syncedCounts }));
      const failed=state.syncStatus.filter(x=>x?.state==='error').length;
      $('#syncStatus').textContent = failed ? 'Sincronização parcial' : 'Sincronizado com Drive';
      $('#syncDetail').textContent = `${state.items.length} arquivos • ${Array.from({length:(CONFIG.folderIds||[]).length},(_,i)=>`Biblioteca ${i+1}: ${syncedCounts[`library-${i+1}`]||0}`).join(' • ')}${failed ? ` • ${failed} biblioteca(s) usando cache` : ''}`;
      $('#catalogNotice').classList.toggle('hidden', !failed); if (failed) $('#catalogNoticeText').textContent='Uma biblioteca falhou; as demais foram atualizadas e a que falhou manteve o último catálogo disponível.';
    } else {
      state.syncStatus=[]; renderSyncProgress();
      state.items = await loadStaticCatalog(); saveCatalogCache(state.items); const sm=readJson(LS.syncMeta,{}); const last=formatDateTime(sm.at);
      const externalCount = state.items.filter(item => item.externalSourceId).length;
      const sourceParts = (CONFIG.externalSources || []).map(src => {
        const id=String(src?.id || '');
        const count=state.items.filter(item => String(item.externalSourceId || '') === id).length;
        const status=state.externalSourceStatus.get(id);
        return `${src.name || id}: ${count}${status && !status.ok ? ' (cache)' : ''}`;
      }).filter(Boolean);
      $('#syncStatus').textContent = externalCount ? 'Acervos conectados ativos' : (last ? 'Catálogo salvo ativo' : 'Catálogo local ativo');
      $('#syncDetail').textContent = externalCount ? `${state.items.length} itens disponíveis • ${sourceParts.join(' • ')}` : `${state.items.length} itens disponíveis${last ? ` • última sincronização: ${last}` : ''}`;
      $('#catalogNoticeText').textContent = externalCount ? `${(CONFIG.externalSources || []).length} acervo(s) remoto(s) conectado(s), com ${externalCount} itens externos. Atualizar busca a versão mais recente de cada catálogo.` : 'Nenhum acervo remoto conectado.'; $('#catalogNotice').classList.remove('hidden');
    }
  } catch (err) {
    state.items = await loadStaticCatalog().catch(()=>[]); $('#syncStatus').textContent='Falha no catálogo'; $('#syncDetail').textContent=err.message; toast(`Falha ao carregar biblioteca: ${err.message}`);
  } finally {
    for (const meta of state.offlineMeta.values()) if (!state.items.some(x=>x.id===meta.id)) state.items.push({ ...meta });
    state.items=uniqueItems(state.items); prunePdfCoverCache(); $('#refreshBtn').disabled=false; resetRenderLimit(); render();
  }
}

function categoryKeywordMap() {
  return [
    ['Batman', ['batman', 'bruce wayne', 'gotham', 'coringa', 'asa noturna', 'batgirl', 'robin', 'arkham']],
    ['Flash', ['flash', 'flashpoint']],
    ['Superman', ['superman', 'homem de aço', 'mulher maravilha', 'smallville']],
    ['Liga da Justiça', ['liga da justiça']],
    ['X-Men', ['x-men', 'x men', 'vampira', 'gambit']],
    ['Watchmen', ['watchmen']],
    ['Senhor Destino', ['senhor destino']],
    ['Motoqueiro Fantasma', ['motoqueiro fantasma', 'motoqueiros fantasmas', 'ghost rider', 'danny ketch']],
    ['Dandadan', ['dandadan']],
    ['Sucata Joe', ['sucata joe']],
    ['Guerras Secretas', ['guerras secretas', 'secret wars']],
    ['Sonic', ['sonic']],
    ['Spawn', ['spawn']],
    ['Godzilla / Power Rangers', ['godzilla', 'power rangers']],
    ['Wolverine', ['wolverine']],
    ['Vingadores', ['vingadores', 'avengers']],
    ['Quarteto Fantástico', ['quarteto fantastico', 'fantastic four']],
    ['Hulk', ['hulk']],
    ['Homem de Ferro', ['homem de ferro', 'iron man']],
    ['Homem-Aranha', ['homem aranha', 'aranha', 'spider man']],
    ['Doutor Estranho', ['doutor estranho', 'doctor strange']],
    ['Thunderbolts', ['thunderbolts']],
    ['X-Factor / NYX', ['x-factor', 'x factor', 'nyx']],
    ['Tempestade', ['tempestade']],
    ['Destino Marvel', ['mundo nas maos do destino', 'divisao do destino', 'academia destino']]
  ];
}
function categoryLabelFor(item) {
  if (!item) return 'Outros';
  if (sourceKeyFor(item) === 'library-3') return 'Batman';
  const base = normalizeText(`${item.name || ''} ${item.folderPath || ''}`);
  for (const [label, words] of categoryKeywordMap()) if (words.some(word => base.includes(normalizeText(word)))) return label;
  const folder = cleanFolderLabel(item.folderPath || '');
  return folder || 'Outros';
}
function categoryKeyFor(item) { return normalizeText(categoryLabelFor(item)); }
function categoryGroups(items = state.items) {
  const map = new Map();
  for (const item of items) {
    const key = categoryKeyFor(item), label = categoryLabelFor(item);
    if (!map.has(key)) map.set(key, { key, label, items: [] });
    map.get(key).items.push(item);
  }
  return [...map.values()].filter(g => g.items.length).sort((a,b) => b.items.length - a.items.length || naturalSort(a.label,b.label));
}
function sourcePool() { return state.items.filter(item => state.source === 'all' || sourceKeyFor(item) === state.source); }
function currentPool() { return sourcePool().filter(item => !state.category || categoryKeyFor(item) === state.category); }
function featuredCollections(items = currentPool()) {
  return collectionGroups(items).map(g => ({ ...g, category:categoryLabelFor(g.items[0]) })).filter(g => g.items.length).sort((a,b)=>b.items.length-a.items.length || naturalSort(a.label,b.label)).slice(0,10);
}
function renderCategoryChips() {
  const chipWrap=$('#categoryChips'); if (!chipWrap) return;
  const base=sourcePool(); const groups=categoryGroups(base).slice(0,12);
  chipWrap.innerHTML=[`<button class="chip ${!state.category?'active':''}" data-category="">Todos <span>${base.length}</span></button>`].concat(groups.map(g=>`<button class="chip ${state.category===g.key?'active':''}" data-category="${escapeHtml(g.key)}">${escapeHtml(g.label)} <span>${g.items.length}</span></button>`)).join('');
  $('#clearCategoryBtn')?.classList.toggle('hidden',!state.category);
}
function renderFeaturedCarousel() {
  const host=$('#featuredCarousel'); if(!host) return;
  const list=featuredCollections();
  host.innerHTML=list.map(g=>{ const lead=g.items[0],thumb=thumbUrl(lead),done=g.items.filter(i=>percentFor(i)>=100).length; return `<article class="featured-card" data-open-collection="${escapeHtml(g.key)}"><div class="featured-cover">${thumb?`<img src="${thumb}" alt="" loading="lazy" data-remove-on-error="1">`:`<div class="featured-fallback">${escapeHtml(shortCover(g.label))}</div>`}<span class="featured-badge">${escapeHtml(g.category)}</span></div><div class="featured-body"><strong>${escapeHtml(g.label)}</strong><small>${g.items.length} arquivo(s) • ${done} lidos</small><button data-open-collection="${escapeHtml(g.key)}">Abrir coleção</button></div></article>`; }).join('');
}
function scrollFeatured(dir=1){ const host=$('#featuredCarousel'); if(!host)return; host.scrollBy({left:Math.max(260,Math.floor(host.clientWidth*.82))*dir,behavior:'smooth'}); }

function cleanFolderLabel(path) {
  const leaf = String(path || '').split('/').filter(Boolean).at(-1) || '';
  if (!leaf || /^Biblioteca\s+\d+$/i.test(leaf)) return '';
  return leaf.replace(/^\d+\s*[-–—]\s*/, '').replace(/\s*\([^)]*\)\s*$/g, '').trim();
}
function seriesLabel(name, folderPath = '') {
  const folder = cleanFolderLabel(folderPath);
  if (folder) return folder;
  let s = String(name || '').replace(/\.(pdf|cbr|cbz|rar|zip)$/i, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bSIX\b/gi, 'Seis')
    .replace(/#\s*TPB\b/gi, ' ')
    .replace(/\bvol(?:ume)?\.?\s*\d+\b/gi, ' ')
    .replace(/#\s*\d+\b/g, ' ')
    .replace(/\b\d{1,3}\s*\(de\s*\d+\)/gi, ' ')
    .replace(/\b\d{1,3}\b/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s || shortCover(name) || 'Sem coleção';
}
function seriesKeyFor(item) { return normalizeText(item?.seriesTitle || seriesLabel(item?.name, item?.folderPath)); }
function collectionGroups(items = state.items) {
  const map = new Map();
  for (const item of items) {
    const key = seriesKeyFor(item);
    const label = item?.seriesTitle || seriesLabel(item.name, item.folderPath);
    if (!map.has(key)) map.set(key, { key, label, items: [] });
    map.get(key).items.push(item);
  }
  return [...map.values()].sort((a, b) => b.items.length - a.items.length || naturalSort(a.label, b.label));
}
function renderUniverseRails() {
  const host = $('#universeRails'); if (!host) return;
  if (state.collection || state.search || state.filter !== 'all' || state.category) { host.innerHTML=''; host.classList.add('hidden'); return; }
  const groups = categoryGroups(sourcePool()).filter(g => g.items.length >= 2).slice(0, 7);
  host.classList.toggle('hidden', !groups.length);
  host.innerHTML = groups.map(g => {
    const items = g.items.slice(0, 10);
    return `<section class="universe-rail"><div class="section-head"><div><span class="eyebrow">${escapeHtml(g.label.toUpperCase())}</span><h2>${escapeHtml(g.label)}</h2></div><button class="ghost small" data-category="${escapeHtml(g.key)}">Ver tudo</button></div><div class="universe-track">${items.map(item => `<article class="mini-card card" data-id="${escapeHtml(item.id)}"><div class="mini-cover">${thumbUrl(item) ? `<img src="${thumbUrl(item)}" alt="" loading="lazy">` : `<span>${escapeHtml(shortCover(item.name))}</span>`}</div><strong>${escapeHtml(item.name)}</strong><button data-action="read">Ler</button></article>`).join('')}</div></section>`;
  }).join('');
}
function renderContinueRail() {
  const recent = currentPool().filter(i => {
    const p = progress[i.id]; return p && p.percent > 0 && p.percent < 100;
  }).sort((a, b) => (progress[b.id]?.updated || 0) - (progress[a.id]?.updated || 0)).slice(0, 10);
  $('#continueSection').classList.toggle('hidden', !recent.length || !['all', 'reading'].includes(state.filter) || Boolean(state.collection));
  $('#continueRail').innerHTML = recent.map(item => {
    const pct = percentFor(item), thumb = thumbUrl(item);
    return `<article class="continue-card" data-id="${escapeHtml(item.id)}"><div class="continue-thumb">${thumb ? `<img src="${thumb}" alt="" loading="lazy" data-remove-on-error="1">` : escapeHtml(shortCover(item.name).slice(0,18))}</div><div class="continue-info"><strong>${escapeHtml(item.name)}</strong><small>${Math.round(pct)}% • pág. ${(progress[item.id]?.page || 0) + 1}</small><button data-continue="${escapeHtml(item.id)}">Continuar</button></div></article>`;
  }).join('');
}
function sourceKeyFor(item) {
  if (!item) return 'other';
  if (item.localFile || item.offline || item.offlineOriginId) return 'offline';
  if (item.externalSourceId) return `external-${String(item.externalSourceId).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}`;
  const path = String(item.folderPath || '');
  const match = path.match(/^Biblioteca\s+(\d+)(?:\/|$)/i);
  return match ? `library-${match[1]}` : 'other';
}
function sourceLabelFor(item) {
  if (item?.externalSourceName) return item.externalSourceName;
  const key = sourceKeyFor(item);
  if (key === 'offline') return 'Offline/local';
  const match = key.match(/^library-(\d+)$/);
  return match ? `Biblioteca ${match[1]}` : 'Catálogo local';
}
function libraryCounts() {
  const counts = { offline:0, other:0 };
  for (let i = 0; i < (CONFIG.folderIds || []).length; i++) counts[`library-${i+1}`] = 0;
  for (const item of state.items) counts[sourceKeyFor(item)] = (counts[sourceKeyFor(item)] || 0) + 1;
  return counts;
}
function renderSourceOptions() {
  const select = $('#sourceSelect'); if (!select) return;
  const counts = libraryCounts();
  const options = [{ value:'all', label:`Todas as fontes (${state.items.length})` }];

  for (const src of (CONFIG.externalSources || [])) {
    const id = String(src?.id || '');
    if (!id) continue;
    const key = `external-${id.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}`;
    const status = state.externalSourceStatus.get(id);
    const suffix = status && !status.ok ? ' • cache' : '';
    options.push({ value:key, label:`${src.name || id} (${counts[key] || 0})${suffix}` });
  }

  if ((CONFIG.folderIds || []).length) {
    for (let i=0;i<CONFIG.folderIds.length;i++) {
      const key=`library-${i+1}`;
      options.push({ value:key, label:`Biblioteca ${i+1} (${counts[key] || 0})` });
    }
  }
  options.push({ value:'offline', label:`Offline/local (${counts.offline || 0})` });

  if (!options.some(option => option.value === state.source)) state.source = 'all';
  const signature = JSON.stringify(options);
  if (select.dataset.signature !== signature) {
    select.innerHTML = options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
    select.dataset.signature = signature;
  }
  select.value = state.source;
}

const CATALOG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
function alphaLetterFor(item) {
  const text = normalizeText(item?.name || '').toUpperCase().trim();
  const first = text.charAt(0);
  return CATALOG_ALPHABET.includes(first) ? first : '#';
}
function alphaSectionKey(letter) { return letter === '#' ? 'num' : String(letter || '').toLowerCase(); }
function renderAlphabetIndex(items = filtered()) {
  const host = $('#alphabetIndex'); if (!host) return;
  const hidden = state.filter === 'collections' || state.filter === 'bookmarks' || Boolean(state.collection);
  host.classList.toggle('hidden', hidden);
  if (hidden) return;

  const ordered = [...items].sort((a,b)=>naturalSort(a.name,b.name));
  const counts = new Map();
  for (const item of ordered) {
    const letter = alphaLetterFor(item);
    counts.set(letter, (counts.get(letter) || 0) + 1);
  }
  const letters = ['#', ...CATALOG_ALPHABET];
  host.innerHTML = letters.map(letter => {
    const count = counts.get(letter) || 0;
    return `<button class="alphabet-btn ${count ? '' : 'disabled'}" data-alpha="${letter}" ${count ? '' : 'disabled'} title="${count ? `${count} título(s) em ${letter}` : `Nenhum título em ${letter}`}"><span>${letter}</span><small>${count || ''}</small></button>`;
  }).join('');
}
function renderAlphabeticalCards(items) {
  if (state.sort !== 'name') return items.map(itemCard).join('');
  let previous = '';
  return items.map(item => {
    const letter = alphaLetterFor(item);
    const heading = letter !== previous
      ? `<div class="alphabet-section" data-alpha-section="${letter}" id="catalog-letter-${alphaSectionKey(letter)}"><strong>${letter}</strong></div>`
      : '';
    previous = letter;
    return heading + itemCard(item);
  }).join('');
}
function jumpToCatalogLetter(letter) {
  const targetLetter = String(letter || '').toUpperCase();
  if (!targetLetter) return;
  state.sort = 'name';
  if ($('#sortSelect')) $('#sortSelect').value = 'name';

  const ordered = filtered();
  const index = ordered.findIndex(item => alphaLetterFor(item) === targetLetter);
  if (index < 0) return;
  state.renderLimit = Math.max(state.renderLimit, index + (performanceProfile().mobile ? 18 : 30));
  render();
  requestAnimationFrame(() => {
    const section = document.querySelector(`[data-alpha-section="${CSS.escape(targetLetter)}"]`);
    setActiveAlphabetLetter(targetLetter, true);
    section?.scrollIntoView({ behavior:'smooth', block:'start' });
  });
}
function setActiveAlphabetLetter(letter, reveal = false) {
  const host = $('#alphabetIndex');
  if (!host) return;
  const value = String(letter || '').toUpperCase();
  if (state.activeAlphabetLetter === value && !reveal) return;
  state.activeAlphabetLetter = value;
  host.querySelectorAll('[data-alpha]').forEach(btn => btn.classList.toggle('active', btn.dataset.alpha === value));
  if (reveal) {
    const active = host.querySelector(`[data-alpha="${CSS.escape(value)}"]`);
    active?.scrollIntoView?.({ behavior:'smooth', block:'nearest', inline:'center' });
  }
}
let alphabetScrollRaf = 0;
function updateAlphabetFromScroll() {
  alphabetScrollRaf = 0;
  const host = $('#alphabetIndex');
  if (!host || host.classList.contains('hidden') || state.sort !== 'name') return;
  const sections = [...document.querySelectorAll('[data-alpha-section]')];
  if (!sections.length) return;
  const anchor = performanceProfile().mobile ? 158 : 170;
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= anchor) current = section;
    else break;
  }
  setActiveAlphabetLetter(current.dataset.alphaSection || '', true);
}
function scheduleAlphabetScrollSync() {
  if (alphabetScrollRaf) return;
  alphabetScrollRaf = requestAnimationFrame(updateAlphabetFromScroll);
}
window.addEventListener('scroll', scheduleAlphabetScrollSync, { passive:true });


function itemCard(item) {
  const type = extType(item), pct = percentFor(item), thumb = thumbUrl(item);
  const status = pct >= 100 ? 'concluído' : pct ? `${Math.round(pct)}% lido` : 'não iniciado';
  const pageFolder = type === 'pages';
  const offlineCapable = !pageFolder || Boolean(item.manifestUrl);
  const offline = state.offlineIds.has(item.offlineOriginId || item.id);
  const offlineBusy = state.offlineBusy.has(item.offlineOriginId || item.id);
  const offlineProgress = state.offlineProgress.get(item.offlineOriginId || item.id);
  const badge = type === 'pdf' ? 'PDF' : type === 'comic' ? 'CBR/CBZ' : pageFolder ? 'WEBP' : 'ARQ';
  const sizeMeta = pageFolder && item.pageCount ? `${item.pageCount} páginas` : bytes(item.size);
  return `<article class="card ${offline ? 'is-offline' : ''}" data-id="${escapeHtml(item.id)}">
    <div class="cover">
      ${thumb ? `<img class="cover-img" src="${thumb}" alt="" loading="lazy" data-remove-on-error="1">` : ''}
      <span class="badge">${badge}</span>${offline ? '<span class="offline-badge">OFFLINE</span>' : ''}
      <button class="fav ${favorites.has(item.id) ? 'on' : ''}" data-action="fav" title="Favoritar">★</button>
      <div class="cover-word">${escapeHtml(shortCover(item.name))}</div>
    </div>
    <div class="card-body">
      <div class="title">${escapeHtml(item.name)}</div>
      <div class="meta"><span>${escapeHtml(sizeMeta)}</span><span>${status}</span></div><div class="source-line"><span class="source-chip source-${escapeHtml(sourceKeyFor(item))}">${escapeHtml(sourceLabelFor(item))}</span>${item.folderPath ? `<span class="source-path" title="${escapeHtml(item.folderPath)}">${escapeHtml(cleanFolderLabel(item.folderPath) || item.folderPath)}</span>` : ''}</div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="card-actions"><button data-action="read">${pct >= 100 ? 'Ler novamente' : pct ? 'Continuar' : 'Ler agora'}</button>${offlineCapable ? `<button class="secondary offline-action ${offline ? 'on' : ''}" data-action="offline" title="${offline ? 'Remover do offline' : 'Salvar para ler offline'}">${offlineBusy ? (offlineProgress?.pct != null ? `${offlineProgress.pct}%` : '…') : offline ? '✓' : '☁'}</button>` : ''}${pageFolder ? '' : `<button class="secondary download-action" data-action="download" title="Baixar arquivo">⇩</button>`}${item.localFile ? '' : `<button class="secondary" data-action="drive" title="${item.externalSourceId ? 'Abrir acervo' : 'Abrir no Drive'}">↗</button>`}</div>
    </div>
  </article>`;
}
function isNewItem(item, days = 30) {
  const ts = Date.parse(item?.modifiedTime || '');
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= days * 86400000 && Date.now() >= ts;
}
function resetRenderLimit() { state.renderLimit = performanceProfile().mobile ? 36 : 60; }
function filtered() {
  const arr = state.items.filter(item => {
    const t = extType(item), p = progress[item.id];
    if (state.collection && seriesKeyFor(item) !== state.collection) return false;
    if (state.source !== 'all' && sourceKeyFor(item) !== state.source) return false;
    if (state.category && categoryKeyFor(item) !== state.category) return false;
    if (state.filter === 'favorites' && !favorites.has(item.id)) return false;
    if (state.filter === 'reading' && !(p && p.percent > 0 && p.percent < 100)) return false;
    if (state.filter === 'completed' && !(p && p.percent >= 100)) return false;
    if (state.filter === 'offline' && !state.offlineIds.has(item.offlineOriginId || item.id)) return false;
    if (state.filter === 'new' && !isNewItem(item)) return false;
    if (state.filter === 'pdf' && t !== 'pdf') return false;
    if (state.filter === 'comic' && !['comic','pages'].includes(t)) return false;
    if (state.search && !normalizeText(`${item.name} ${item.seriesTitle || ''} ${item.folderPath || ''} ${item.externalSourceName || ''} ${item.issueNumber ?? ''}`).includes(state.search)) return false;
    return true;
  });
  arr.sort((a, b) => state.sort === 'name' ? naturalSort(a.name, b.name)
    : state.sort === 'name-desc' ? naturalSort(b.name, a.name)
    : state.sort === 'size' ? (a.size || 0) - (b.size || 0)
    : state.sort === 'size-desc' ? (b.size || 0) - (a.size || 0)
    : state.sort === 'recent' ? (progress[b.id]?.updated || 0) - (progress[a.id]?.updated || 0)
    : state.sort === 'modified' ? String(b.modifiedTime || '').localeCompare(String(a.modifiedTime || ''))
    : naturalSort(a.name, b.name));
  return arr;
}
function renderBookmarksLibrary() {
  const rows = state.items.filter(item => Array.isArray(bookmarks[item.id]) && bookmarks[item.id].length && (state.source==='all' || sourceKeyFor(item)===state.source) && (!state.category || categoryKeyFor(item)===state.category));
  $('#emptyState').classList.toggle('hidden', rows.length > 0);
  $('#libraryGrid').innerHTML = rows.map(item => {
    const pages=[...new Set(bookmarks[item.id].map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);
    return `<article class="bookmark-card card" data-id="${escapeHtml(item.id)}"><div class="bookmark-card-main"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(sourceLabelFor(item))} • ${pages.length} marcador(es)</small><div class="bookmark-pages">${pages.slice(0,18).map(pg=>`<button data-bookmark-open="${escapeHtml(item.id)}" data-bookmark-page="${pg}">p. ${pg+1}</button>`).join('')}${pages.length>18?`<span>+${pages.length-18}</span>`:''}</div></div><button data-action="read">Abrir HQ</button></article>`;
  }).join('');
}
function renderCollections() {
  const groups = collectionGroups(currentPool()).filter(g => !state.search || normalizeText(g.label).includes(state.search));
  $('#emptyState').classList.toggle('hidden', groups.length > 0);
  $('#libraryGrid').innerHTML = groups.map(g => {
    const reading = g.items.filter(i => percentFor(i) > 0 && percentFor(i) < 100).length;
    const done = g.items.filter(i => percentFor(i) >= 100).length;
    return `<article class="collection-card" data-collection="${escapeHtml(g.key)}"><div class="collection-cover"><strong>${escapeHtml(g.label)}</strong></div><div><div class="title">${escapeHtml(g.label)}</div><div class="collection-meta"><span>${g.items.length} ${g.items.length === 1 ? 'arquivo' : 'arquivos'}</span><span>${done} lidos${reading ? ` • ${reading} lendo` : ''}</span></div></div><button data-open-collection="${escapeHtml(g.key)}">Abrir coleção</button></article>`;
  }).join('');
}
function updateLibraryStats() {
  const ids = new Set(state.items.map(item => item.id));
  const readingTotal = state.items.filter(item => {
    const p = progress[item.id]; return p && p.percent > 0 && p.percent < 100;
  }).length;
  const completedTotal = state.items.filter(item => (progress[item.id]?.percent || 0) >= 100).length;
  const favoriteTotal = [...favorites].filter(id => ids.has(id)).length;
  $('#itemCount').textContent = state.items.length;
  $('#favoriteCount').textContent = favoriteTotal;
  $('#readingCount').textContent = readingTotal;
  $('#completedCount').textContent = completedTotal;
  updateOfflineStorageInfo();
}
function render() {
  updateLibraryStats();
  renderSourceOptions();
  renderContinueRail();
  renderFeaturedCarousel();
  renderCategoryChips();
  renderUniverseRails();
  const group = state.collection ? collectionGroups(currentPool()).find(g => g.key === state.collection) : null;
  $('#collectionBar').classList.toggle('hidden', !group);
  if (group) { $('#collectionTitle').textContent = group.label; $('#collectionMeta').textContent = `${group.items.length} arquivos`; }
  if (state.filter === 'collections' && !state.collection) { $('#alphabetIndex')?.classList.add('hidden'); return renderCollections(); }
  if (state.filter === 'bookmarks' && !state.collection) { $('#alphabetIndex')?.classList.add('hidden'); return renderBookmarksLibrary(); }
  const arr = filtered();
  renderAlphabetIndex(arr);
  $('#emptyState').classList.toggle('hidden', arr.length > 0);
  const visible = arr.slice(0, state.renderLimit);
  $('#libraryGrid').innerHTML = renderAlphabeticalCards(visible);
  const more = $('#loadMoreBtn');
  if (more) {
    const left = Math.max(0, arr.length - visible.length);
    more.classList.toggle('hidden', left <= 0);
    more.textContent = left > 0 ? `Carregar mais (${left} restantes)` : 'Carregar mais';
  }
  hydratePdfCovers(visible);
  requestAnimationFrame(updateAlphabetFromScroll);
}

function setReaderButtons(type) {
  const readable = ['comic','pdf','pages'].includes(type);
  const pageFolder = type === 'pages';
  $('#modeBtn').classList.toggle('hidden', !readable);
  $('#directionBtn').classList.toggle('hidden', !readable);
  $('#fitBtn').classList.toggle('hidden', !readable);
  $('#zoomControls').classList.toggle('hidden', !readable);
  const canSaveOffline = !pageFolder || Boolean(state.current?.manifestUrl);
  $('#offlineCurrentBtn')?.classList.toggle('hidden', !canSaveOffline);
  $('#downloadCurrentBtn')?.classList.toggle('hidden', pageFolder);
  $('#readerFooter').classList.add('hidden');
  updateCompleteButton();
}

function updateOfflineCurrentButton() {
  const btn = $('#offlineCurrentBtn'); if (!btn || !state.current) return;
  const id = state.current.offlineOriginId || state.current.id;
  const saved = state.offlineIds.has(id);
  const pending = state.offlineProgress.get(id);
  btn.textContent = pending ? `☁ ${pending.pct}%` : saved ? '✓ Offline' : '☁ Salvar offline';
  btn.classList.toggle('is-offline', saved);
  btn.title = saved ? 'Remover arquivo da biblioteca offline' : 'Salvar para ler sem internet';
}

function updateCompleteButton() {
  const done = Boolean(state.current && (progress[state.current.id]?.percent || 0) >= 100);
  $('#completeBtn').textContent = done ? '↶ Marcar não lido' : '✓ Marcar lido';
  $('#completeBtn').classList.toggle('is-complete', done);
}

function modeLabel(mode = state.mode) {
  return ({ page:'Página', spread:'Flipbook', vertical:'Vertical', webtoon:'Webtoon' })[mode] || 'Página';
}
function modeIcon(mode = state.mode) {
  return ({ page:'▣', spread:'▥', vertical:'↕', webtoon:'▤' })[mode] || '▣';
}
function isVerticalMode(mode = state.mode) { return mode === 'vertical' || mode === 'webtoon'; }
function isPagedMode(mode = state.mode) { return mode === 'page' || mode === 'spread'; }
function pageDimensions(index) {
  const page = state.pages?.[Number(index)];
  const width = Number(page?.width || page?.dimensions?.width || 0);
  const height = Number(page?.height || page?.dimensions?.height || 0);
  return { width, height };
}
function isWidePage(index) {
  const { width, height } = pageDimensions(index);
  return width > 0 && height > 0 && width / height >= 1.18;
}
function flipbookLayoutClass(indexes) {
  if (!Array.isArray(indexes) || indexes.length > 1) return ' two-page';
  const index = Number(indexes[0] || 0);
  if (isWidePage(index)) return ' single-wide';
  return index === 0 ? ' cover-only' : ' single-page';
}
function spreadGroups() {
  if (!state.pages.length) return [];
  const groups = [[0]];
  let i = 1;
  while (i < state.pages.length) {
    if (isWidePage(i)) { groups.push([i]); i += 1; continue; }
    if (i + 1 < state.pages.length && !isWidePage(i + 1)) { groups.push([i, i + 1]); i += 2; }
    else { groups.push([i]); i += 1; }
  }
  return groups;
}
function spreadIndexes(page = state.page) {
  const n = Math.max(0, Math.min(state.pages.length - 1, Number(page) || 0));
  if (effectiveMode() !== 'spread') return [n];
  return spreadGroups().find(group => group.includes(n)) || [n];
}
function spreadBaseIndex(page = state.page) {
  return spreadIndexes(page)[0] ?? 0;
}
function nextPageIndex(page = state.page) {
  if (effectiveMode() !== 'spread') return page + 1;
  const groups = spreadGroups();
  const current = groups.findIndex(group => group.includes(Math.max(0, Number(page) || 0)));
  return current >= 0 && current < groups.length - 1 ? groups[current + 1][0] : state.pages.length - 1;
}
function prevPageIndex(page = state.page) {
  if (effectiveMode() !== 'spread') return page - 1;
  const groups = spreadGroups();
  const current = groups.findIndex(group => group.includes(Math.max(0, Number(page) || 0)));
  return current > 0 ? groups[current - 1][0] : 0;
}
function pageStep() {
  if (effectiveMode() !== 'spread') return 1;
  const group = spreadIndexes();
  return Math.max(1, group.length);
}
function normalizedMode(mode) { return ['page','spread','vertical','webtoon'].includes(mode) ? mode : 'page'; }
function effectiveMode(mode = state.mode) {
  return mode;
}
function updateReaderPrefsUI() {
  $('#directionBtn').textContent = `Leitura: ${state.direction === 'rtl' ? '←' : '→'}`;
  $('#directionBtn').dataset.arrow = state.direction === 'rtl' ? '←' : '→';
  $('#modeBtn').textContent = `Modo: ${modeLabel(state.mode)}`;
  $('#modeBtn').dataset.short = modeIcon(state.mode);
  $('#zoomLabel').textContent = `${Math.round(state.zoom * 100)}%`;
  if ($('#fitBtn')) $('#fitBtn').textContent = `Ajuste: ${{contain:'Página',width:'Largura',height:'Altura'}[state.fit] || 'Página'}`;
  $('#trimBtn')?.classList.toggle('active', Boolean(state.trimMargins));
  updateBookmarkButton();
  $('#zoomControls').classList.toggle('hidden', !isPagedMode() || !['comic','pdf','pages'].includes(extType(state.current || {})));
  const auto = $('#autoScrollBtn');
  if (auto) {
    auto.classList.toggle('hidden', !isVerticalMode());
    auto.textContent = state.autoScrollId ? '⏸ Auto' : '▶ Auto';
    auto.title = state.autoScrollId ? 'Pausar rolagem automática' : 'Iniciar rolagem automática';
  }
}

async function openItem(item, forceLarge = false) {
  item = await ensureOfflineItem(item);
  const type = extType(item);
  const warningLimit = archiveWarningLimitMB();
  if (type === 'comic' && !forceLarge && item.size > warningLimit * 1024 * 1024) {
    state.largePending = item;
    $('#largeFileMeta').textContent = `${item.name} • ${bytes(item.size)} • limite recomendado neste aparelho: ${warningLimit} MB`;
    $('#largeFileModal').classList.remove('hidden');
    return;
  }
  const token = ++state.openToken;
  await cleanupReaderData();
  if (token !== state.openToken) return;
  const readerWasHidden = $('#reader')?.classList.contains('hidden');
  state.current = item;
  if (readerWasHidden && !state.readerHistoryActive) {
    try {
      history.pushState({ ...(history.state || {}), mhqrReader:true }, '', location.href);
      state.readerHistoryActive = true;
    } catch {}
  }
  const savedReader = itemReaderPrefs[item.id] || {};
  state.page = progress[item.id]?.page || 0;
  state.verticalRestore = { page:state.page, ratio:Number(progress[item.id]?.verticalOffsetRatio || 0) };
  state.mode = normalizedMode(progress[item.id]?.mode || savedReader.mode || prefs.defaultMode);
  state.direction = progress[item.id]?.direction || savedReader.direction || prefs.direction || 'ltr';
  state.fit = ['contain','width','height'].includes(savedReader.fit) ? savedReader.fit : 'contain';
  state.trimMargins = Boolean(savedReader.trimMargins);
  state.zoom = 1;
  $('#reader')?.classList.toggle('trim-margins', state.trimMargins);
  $('#reader').classList.remove('hidden'); $('#reader').setAttribute('aria-hidden', 'false');
  $('#reader')?.classList.toggle('mobile-fullbleed', performanceProfile().mobile);
  $('#reader')?.classList.remove('reader-chrome-hidden');
  scheduleReaderChromeHide(2600);
  document.body.style.overflow = 'hidden';
  state.readerViewportW = Math.round($('#readerBody')?.clientWidth || innerWidth);
  state.readerViewportH = Math.round($('#readerBody')?.clientHeight || innerHeight);
  $('#readerTitle').textContent = item.name; $('#readerMeta').textContent = `${bytes(item.size)}${item.offline ? ' • OFFLINE' : ''}`;
  updateOfflineCurrentButton();
  setReaderButtons(type);
  updateReaderPrefsUI();
  if (type === 'pdf') return openPdf(item, token);
  if (type === 'comic') return openComic(item, token);
  if (type === 'pages') return openDrivePages(item, token);
  if (token === state.openToken) showReaderError('Formato não suportado', 'Este item não é PDF, CBR, CBZ, RAR, ZIP ou uma pasta de páginas WebP.');
}

async function loadPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import(RUNTIME_URLS.pdf).then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = RUNTIME_URLS.pdfWorker;
      return pdfjs;
    });
  }
  return pdfjsModulePromise;
}

async function generatePdfCover(item) {
  if (!item?.id || extType(item) !== 'pdf' || item.coverUrl || !item.fileUrl) return '';
  if (generatedPdfCovers.has(item.id)) return generatedPdfCovers.get(item.id);
  if (pendingPdfCovers.has(item.id)) return pendingPdfCovers.get(item.id);

  const job = (async () => {
    const pdfjs = await loadPdfJs();
    const task = pdfjs.getDocument({
      url: item.fileUrl,
      disableAutoFetch: true,
      disableStream: false,
      disableRange: false
    });
    let doc = null;
    try {
      doc = await task.promise;
      const page = await doc.getPage(1);
      const initial = page.getViewport({ scale: 1 });
      const targetWidth = performanceProfile().mobile ? 300 : 420;
      const scale = Math.max(.2, Math.min(1.5, targetWidth / Math.max(1, initial.width)));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d', { alpha:false });
      await page.render({ canvasContext:ctx, viewport }).promise;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .84))
        || await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
      if (!blob) return '';
      const url = URL.createObjectURL(blob);
      rememberGeneratedPdfCover(item.id, url);
      canvas.width = 1; canvas.height = 1;
      return url;
    } finally {
      await doc?.destroy?.().catch(() => {});
    }
  })().finally(() => pendingPdfCovers.delete(item.id));

  pendingPdfCovers.set(item.id, job);
  return job;
}
function pumpPdfCoverQueue() {
  const limit = performanceProfile().mobile ? 1 : 2;
  while (pdfCoverActive < limit && pdfCoverQueue.length) {
    const item = pdfCoverQueue.shift();
    if (!item?.id) continue;
    pdfCoverQueued.delete(item.id);
    if (generatedPdfCovers.has(item.id) || pendingPdfCovers.has(item.id) || item.coverUrl) continue;

    pdfCoverActive++;
    generatePdfCover(item).then(url => {
      if (url) schedulePdfCoverRender();
    }).catch(() => {}).finally(() => {
      pdfCoverActive = Math.max(0, pdfCoverActive - 1);
      pumpPdfCoverQueue();
    });
  }
}
function hydratePdfCovers(items = state.items) {
  if (document.hidden || performanceProfile().slowConnection) return;
  const maxQueued = performanceProfile().mobile ? 5 : 10;
  const targets = (items || []).filter(item =>
    extType(item) === 'pdf' && item.fileUrl && !item.coverUrl &&
    !generatedPdfCovers.has(item.id) && !pendingPdfCovers.has(item.id) &&
    !pdfCoverQueued.has(item.id)
  ).slice(0, maxQueued);

  for (const item of targets) {
    pdfCoverQueued.add(item.id);
    pdfCoverQueue.push(item);
  }
  pumpPdfCoverQueue();
}
function prunePdfCoverCache() {
  const valid = new Set(state.items.map(item => item.id));
  for (const [id, url] of [...generatedPdfCovers.entries()]) {
    if (valid.has(id)) continue;
    generatedPdfCovers.delete(id);
    if (String(url).startsWith('blob:')) URL.revokeObjectURL(url);
  }
}
async function openPdf(item, token) {
  if (token !== state.openToken) return;
  $('#readerLoading').classList.remove('hidden');
  $('#loadingText').textContent = item.localFile ? 'Preparando PDF offline…' : 'Abrindo PDF no leitor…';
  $('#readerBody').innerHTML = '';
  $('#readerFooter').classList.add('hidden');
  try {
    const pdfjs = await loadPdfJs();
    if (token !== state.openToken) return;
    const options = { disableAutoFetch: false, disableStream: false, disableRange: false };
    if (item.localFile) {
      options.data = await item.localFile.arrayBuffer();
    } else if (item.fileUrl) {
      options.url = item.fileUrl;
    } else {
      const key = getApiKey();
      if (key) {
        const api = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.id)}`);
        api.searchParams.set('alt', 'media'); api.searchParams.set('key', key);
        options.url = api.href;
        if (item.resourceKey) options.httpHeaders = { 'X-Goog-Drive-Resource-Keys': `${item.id}/${item.resourceKey}` };
      } else {
        // Tenta o endpoint público. Se o Drive bloquear CORS, mostramos um fallback claro.
        options.url = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(item.id)}&export=download&confirm=t`;
      }
    }
    const task = pdfjs.getDocument(options);
    task.onPassword = (updatePassword, reason) => {
      const label = reason === 2 ? 'Senha incorreta. Digite novamente a senha deste PDF:' : 'Este PDF é protegido. Digite a senha:';
      const password = window.prompt(label);
      if (password == null) { try { task.destroy?.(); } catch {} return; }
      updatePassword(password);
    };
    state.pdfDoc = await task.promise;
    if (token !== state.openToken) { await state.pdfDoc.destroy().catch(() => {}); state.pdfDoc = null; return; }
    state.pages = Array.from({ length: state.pdfDoc.numPages }, (_, i) => ({ index: i, name: `Página ${i + 1}` }));
    state.page = Math.max(0, Math.min(state.page, state.pages.length - 1));
    $('#pageRange').max = state.pages.length;
    $('#readerLoading').classList.add('hidden');
    $('#readerMeta').textContent = `${state.pages.length} páginas • PDF`;
    updateReaderPrefsUI();
    await renderReaderPages();
  } catch (err) {
    if (token !== state.openToken || err?.name === 'AbortError') return;
    $('#readerLoading').classList.add('hidden');
    const noKeyHint = !item.localFile && !item.fileUrl && !getApiKey() ? ' Configure a Google Drive API Key para usar o leitor PDF próprio com arquivos do Drive.' : '';
    showReaderError('Não foi possível abrir este PDF', `${err.message || err}${noKeyHint}`, !item.localFile);
  }
}

async function fetchArrayBufferWithProgress(url, headers = {}, signal, token) {
  const r = await fetch(url, { mode: 'cors', headers, redirect: 'follow', signal });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    let msg = `HTTP ${r.status}`;
    try { msg = JSON.parse(txt).error?.message || msg; } catch {}
    throw new Error(msg);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('text/html')) throw new Error('O Google Drive retornou uma página de confirmação em vez do arquivo.');
  const total = Number(r.headers.get('content-length') || 0);
  if (!r.body) return r.arrayBuffer();
  const reader = r.body.getReader();
  let received = 0; let target = total ? new Uint8Array(total) : null; let offset = 0; const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal?.aborted) throw new DOMException('Download cancelado.', 'AbortError');
    received += value.byteLength;
    if (target && offset + value.byteLength <= target.length) {
      target.set(value, offset); offset += value.byteLength;
    } else {
      if (target) { chunks.push(target.subarray(0, offset)); target = null; }
      chunks.push(value);
    }
    if (token === state.openToken && !$('#reader').classList.contains('hidden')) {
      $('#loadingText').textContent = total ? `Baixando… ${Math.min(100, Math.round(received / total * 100))}% (${bytes(received)} / ${bytes(total)})` : `Baixando… ${bytes(received)}`;
    }
  }
  if (target) return offset === target.byteLength ? target.buffer : target.buffer.slice(0, offset);
  const all = new Uint8Array(received); let pos = 0;
  for (const chunk of chunks) { all.set(chunk, pos); pos += chunk.byteLength; }
  return all.buffer;
}

async function downloadDriveFile(item, token, purpose = 'reader') {
  const key = getApiKey();
  const attempts = [];
  if (key) {
    const api = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.id)}`);
    api.searchParams.set('alt', 'media'); api.searchParams.set('key', key);
    const headers = item.resourceKey ? { 'X-Goog-Drive-Resource-Keys': `${item.id}/${item.resourceKey}` } : {};
    attempts.push({ url: api.href, headers, label: 'Drive API' });
  }
  attempts.push({ url: `https://drive.usercontent.google.com/download?id=${encodeURIComponent(item.id)}&export=download&confirm=t`, headers: {}, label: 'link público' });
  const controller = new AbortController();
  const offlineId = item.offlineOriginId || item.id;
  if (purpose === 'reader') {
    state.readerDownloadController?.abort();
    state.readerDownloadController = controller;
  } else {
    state.offlineControllers.get(offlineId)?.abort();
    state.offlineControllers.set(offlineId, controller);
  }
  let lastError = null;
  try {
    for (const a of attempts) {
      try { return await fetchArrayBufferWithProgress(a.url, a.headers, controller.signal, token); }
      catch (err) {
        if (err?.name === 'AbortError') throw err;
        lastError = new Error(`${a.label}: ${err.message}`);
      }
    }
  } finally {
    if (purpose === 'reader' && state.readerDownloadController === controller) state.readerDownloadController = null;
    if (purpose !== 'reader' && state.offlineControllers.get(offlineId) === controller) state.offlineControllers.delete(offlineId);
  }
  if (!key) throw new Error('O navegador não conseguiu baixar este CBR/CBZ pelo link público por causa das restrições de CORS do Google Drive. Configure uma Google Drive API Key restrita ao seu GitHub Pages ou abra um arquivo local.');
  throw lastError || new Error('Falha ao baixar do Google Drive.');
}

async function loadJsZip() {
  if (!jszipModulePromise) jszipModulePromise = import(RUNTIME_URLS.zip).then(m => m.default || m);
  return jszipModulePromise;
}
async function loadUnrar() {
  if (!unrarModulePromise) unrarModulePromise = import(RUNTIME_URLS.unrar);
  if (!unrarWasmPromise) unrarWasmPromise = fetch(RUNTIME_URLS.unrarWasm).then(r => { if (!r.ok) throw new Error(`unrar.wasm HTTP ${r.status}`); return r.arrayBuffer(); });
  return Promise.all([unrarModulePromise, unrarWasmPromise]);
}

function archiveKindFromMagic(data) {
  const b = data instanceof Uint8Array ? data : new Uint8Array(data || new ArrayBuffer(0));
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && ((b[2] === 0x03 && b[3] === 0x04) || (b[2] === 0x05 && b[3] === 0x06) || (b[2] === 0x07 && b[3] === 0x08))) return 'zip';
  if (b.length >= 7 && b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21 && b[4] === 0x1a && b[5] === 0x07 && (b[6] === 0x00 || b[6] === 0x01)) return 'rar';
  return '';
}
function archiveKindFromName(name) {
  const ext = extension(name);
  if (ext === '.cbz' || ext === '.zip') return 'zip';
  if (ext === '.cbr' || ext === '.rar') return 'rar';
  return '';
}
async function prepareZipArchive(data, token) {
  const JSZip = await loadJsZip();
  if (token !== state.openToken) return null;
  const zip = await JSZip.loadAsync(data, { checkCRC32: false });
  if (token !== state.openToken) return null;
  const entries = Object.values(zip.files)
    .filter(f => !f.dir && isImage(f.name))
    .sort((a, b) => naturalSort(a.name.replace(/\\/g,'/'), b.name.replace(/\\/g,'/')));
  if (!entries.length) throw new Error('Nenhuma imagem compatível foi encontrada dentro do CBZ/ZIP.');
  return { archive: { type: 'zip', engine: zip, entries }, pages: entries.map((e, i) => ({ index: i, name: e.name })) };
}
async function prepareRarArchive(data, token, password = '') {
  const [unrar, wasmBinary] = await loadUnrar();
  if (token !== state.openToken) return null;
  const extractor = await unrar.createExtractorFromData({ wasmBinary, data, ...(password ? { password } : {}) });
  if (token !== state.openToken) return null;
  const list = extractor.getFileList();
  const allHeaders = [...list.fileHeaders];
  const encryptedImages = allHeaders.filter(h => !h.flags.directory && h.flags.encrypted && isImage(h.name)).length;
  const headers = allHeaders.filter(h => !h.flags.directory && !h.flags.encrypted && isImage(h.name)).sort((a, b) => naturalSort(a.name, b.name));
  if (!headers.length && encryptedImages) { const pw=window.prompt('Este CBR/RAR está protegido por senha. Digite a senha:'); if (pw && !password) return prepareRarArchive(data, token, pw); throw new Error('As páginas deste CBR/RAR estão protegidas por senha ou a senha informada está incorreta.'); }
  if (!headers.length) throw new Error('Nenhuma imagem compatível foi encontrada dentro do CBR/RAR.');
  return { archive: { type: 'rar', engine: extractor, entries: headers }, pages: headers.map((e, i) => ({ index: i, name: e.name })) };
}
async function prepareArchive(item, data, token) {
  if (token === state.openToken) $('#loadingText').textContent = 'Identificando formato e páginas…';
  const magicKind = archiveKindFromMagic(data);
  const namedKind = archiveKindFromName(item.name);
  const primary = magicKind || namedKind;
  if (magicKind && namedKind && magicKind !== namedKind) toast(`Formato real detectado: ${magicKind.toUpperCase()} (extensão ${extension(item.name).toUpperCase()}).`);
  const tryKinds = [...new Set([primary, namedKind, magicKind, 'zip', 'rar'].filter(Boolean))];
  let lastError = null;
  for (const kind of tryKinds) {
    try {
      const result = kind === 'zip' ? await prepareZipArchive(data, token) : await prepareRarArchive(data, token);
      if (result) return result;
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError || new Error('O arquivo não parece ser um ZIP/CBZ ou RAR/CBR válido.');
}

async function openComic(item, token) {
  if (item.size > archiveWarningLimitMB()*1024*1024 && prefs.performance === 'auto') toast('Arquivo grande: o leitor reduzirá cache e pré-carregamento para poupar memória.');
  $('#readerLoading').classList.remove('hidden');
  $('#loadingText').textContent = item.localFile ? 'Lendo arquivo do aparelho…' : 'Conectando ao Google Drive…';
  $('#readerBody').innerHTML = ''; $('#readerFooter').classList.add('hidden');
  try {
    const data = item.localFile ? await item.localFile.arrayBuffer() : await downloadDriveFile(item, token);
    if (token !== state.openToken) return;
    const prepared = await prepareArchive(item, data, token);
    if (token !== state.openToken || !prepared) return;
    state.archive = prepared.archive;
    state.pages = prepared.pages;
    state.page = Math.max(0, Math.min(state.page, state.pages.length - 1));
    $('#readerLoading').classList.add('hidden');
    $('#pageRange').max = state.pages.length;
    updateReaderPrefsUI();
    await renderReaderPages();
  } catch (err) {
    if (token !== state.openToken || err?.name === 'AbortError') return;
    $('#readerLoading').classList.add('hidden');
    showReaderError('Não foi possível abrir este quadrinho', err.message, !item.localFile);
  }
}

async function loadDrivePageFolder(item, token) {
  if (item?.manifestUrl) {
    const r = await fetch(item.manifestUrl, { cache:'no-store' });
    if (!r.ok) throw new Error(`Manifesto do acervo: HTTP ${r.status}`);
    const manifest = await r.json();
    if (token !== state.openToken) throw new DOMException('Leitura cancelada.', 'AbortError');
    const base = new URL('./', item.manifestUrl).href;
    const names = Array.isArray(manifest?.pages) ? manifest.pages : [];
    const dimensionMap = new Map((Array.isArray(manifest?.dimensions) ? manifest.dimensions : []).map(d => [String(d?.page || ''), d]));
    const files = names.map((name, index) => {
      const dim = dimensionMap.get(String(name)) || {};
      return { name:String(name), url:resolveExternalUrl(base, name), index, width:Number(dim.width || 0), height:Number(dim.height || 0) };
    }).filter(file => file.url);
    if (!files.length) throw new Error('Nenhuma página foi encontrada no manifesto deste acervo.');
    return { manifest, files, web:true };
  }
  if (Array.isArray(item?.drivePages) && item.drivePages.length) {
    return { manifest: { title:item.name, issue:item.issueNumber, pageCount:item.drivePages.length }, files:item.drivePages };
  }
  const key = getApiKey();
  if (!key) throw new Error('Esta edição ainda não possui a lista local de páginas. Atualize o catálogo ou configure a Google Drive API Key para descobri-las.');
  const files = await listDriveChildren(key, item.driveFolderId, undefined);
  if (token !== state.openToken) throw new DOMException('Leitura cancelada.', 'AbortError');
  const images = files.filter(file => isImage(file.name || ''));
  const manifestFile = files.find(file => /^manifest\.json$/i.test(file.name || ''));
  let manifest = null;
  if (manifestFile) {
    try { manifest = await fetchDriveJsonFile(key, manifestFile); }
    catch (err) { console.warn('Falha ao ler manifest.json:', err); }
  }
  const ordered = orderedDriveImages(images, manifest);
  if (!ordered.length) throw new Error('Nenhuma página de imagem foi encontrada nesta pasta do Google Drive.');
  item.drivePages = ordered.map(file => ({ id:file.id, name:file.name, size:Number(file.size || 0), resourceKey:file.resourceKey || '' }));
  return { manifest, files:item.drivePages };
}
async function openDrivePages(item, token) {
  $('#readerLoading').classList.remove('hidden');
  $('#loadingText').textContent = 'Listando páginas WebP no Google Drive…';
  $('#readerBody').innerHTML = ''; $('#readerFooter').classList.add('hidden');
  try {
    const bundle = await loadDrivePageFolder(item, token);
    if (token !== state.openToken) return;
    state.archive = { type:bundle.web ? 'web-pages' : 'drive-pages', entries:bundle.files, folderId:item.driveFolderId || '' };
    state.pages = bundle.files.map((file, index) => ({ ...file, index }));
    state.page = Math.max(0, Math.min(state.page, state.pages.length - 1));
    if (bundle.manifest?.title) $('#readerTitle').textContent = bundle.manifest.title;
    $('#readerMeta').textContent = `${state.pages.length} páginas • ${bundle.web ? 'WebP do acervo conectado' : 'WebP direto do Google Drive'}`;
    $('#readerLoading').classList.add('hidden');
    $('#pageRange').max = state.pages.length;
    updateReaderPrefsUI();
    await renderReaderPages();
  } catch (err) {
    if (token !== state.openToken || err?.name === 'AbortError') return;
    $('#readerLoading').classList.add('hidden');
    showReaderError('Não foi possível abrir esta HQ em WebP', err.message, false);
  }
}

async function loadThumbPreview(mount, index, token) {
  if (!mount?.isConnected || token !== state.thumbRenderToken || mount.dataset.loaded === '1') return;
  mount.dataset.loaded = '1';
  try {
    if (state.pdfDoc) {
      const page = await state.pdfDoc.getPage(index + 1);
      if (token !== state.thumbRenderToken || !mount.isConnected) return;
      const base = page.getViewport({scale:1});
      const scale = Math.min(1, 100 / base.width);
      const vp = page.getViewport({scale});
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(vp.width));
      canvas.height = Math.max(1, Math.floor(vp.height));
      const task = page.render({canvasContext:canvas.getContext('2d'), viewport:vp});
      await task.promise;
      if (token !== state.thumbRenderToken || !mount.isConnected) {
        canvas.width = 1; canvas.height = 1; return;
      }
      mount.appendChild(canvas);
    } else {
      const entry = state.archive?.entries?.[index];
      const url = state.archive?.type === 'drive-pages' && entry?.id ? drivePagePublicUrl(entry, 'w280') : await getPageUrl(index);
      if (token !== state.thumbRenderToken || !mount.isConnected) return;
      const img = document.createElement('img');
      img.src = url; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      mount.appendChild(img);
    }
  } catch {
    if (mount?.isConnected) mount.textContent = '—';
  }
}
function pumpThumbQueue(token) {
  const limit = performanceProfile().mobile ? 2 : 4;
  while (state.thumbActive < limit && state.thumbQueue.length && token === state.thumbRenderToken) {
    const job = state.thumbQueue.shift();
    if (!job?.mount?.isConnected || job.mount.dataset.queued === 'done') continue;
    job.mount.dataset.queued = 'done';
    state.thumbActive++;
    loadThumbPreview(job.mount, job.index, token).finally(() => {
      state.thumbActive = Math.max(0, state.thumbActive - 1);
      pumpThumbQueue(token);
    });
  }
}
function queueThumbPreview(mount, index, token) {
  if (!mount?.isConnected || mount.dataset.queued || token !== state.thumbRenderToken) return;
  mount.dataset.queued = '1';
  state.thumbQueue.push({ mount, index });
  pumpThumbQueue(token);
}
async function renderThumbDrawer() {
  const grid = $('#thumbGrid'); if (!grid || !state.pages.length) return;
  const profile = performanceProfile();
  const token = ++state.thumbRenderToken;
  const max = Math.min(state.pages.length, profile.mobile ? 160 : 300);
  state.thumbObserver?.disconnect?.();
  state.thumbQueue = []; state.thumbActive = 0;
  grid.innerHTML = Array.from({length:max},(_,i)=>`<button class="thumb-item ${i===state.page?'active':''}" data-thumb-page="${i}"><span>${i+1}</span><div class="thumb-preview" data-thumb-preview="${i}"></div></button>`).join('') + (state.pages.length>max ? `<p class="thumb-limit">Mostrando ${max} de ${state.pages.length} páginas. As miniaturas são carregadas somente quando se aproximam da tela.</p>` : '');
  const root = $('#thumbDrawer');
  state.thumbObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      state.thumbObserver?.unobserve(entry.target);
      const index = Number(entry.target.dataset.thumbPreview);
      if (Number.isFinite(index)) queueThumbPreview(entry.target, index, token);
    }
  }, { root, rootMargin: profile.mobile ? '360px 0px' : '520px 0px', threshold:0.01 });
  $$('.thumb-preview', grid).forEach(mount => state.thumbObserver.observe(mount));
}
function openThumbDrawer() {
  $('#thumbDrawer')?.classList.remove('hidden');
  renderThumbDrawer().catch(()=>{});
}
function closeThumbDrawer() {
  state.thumbRenderToken++;
  state.thumbObserver?.disconnect?.(); state.thumbObserver = null;
  state.thumbQueue = []; state.thumbActive = 0;
  $('#thumbDrawer')?.classList.add('hidden');
}
function showReaderError(title, message, offerLocal = false) {
  $('#readerFooter').classList.add('hidden');
  $('#readerBody').innerHTML = `<div class="reader-error"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><div class="reader-error-actions">
    ${offerLocal ? '<button id="errorLocalBtn">Abrir arquivo local</button>' : ''}
    ${state.current && !state.current.localFile ? '<button id="errorDriveBtn" class="secondary-btn">Abrir no Drive</button>' : ''}
    ${!getApiKey() ? '<button id="errorSettingsBtn" class="secondary-btn">Configurar Drive API</button>' : ''}
  </div></div>`;
  $('#errorLocalBtn')?.addEventListener('click', () => $('#localFileInput').click());
  $('#errorDriveBtn')?.addEventListener('click', () => safeOpen(driveViewUrl(state.current)));
  $('#errorSettingsBtn')?.addEventListener('click', openSettings);
}

function releaseReaderVisuals() {
  const root = $('#readerBody'); if (!root) return;
  root.querySelectorAll('canvas').forEach(canvas => {
    try { canvas.width = 1; canvas.height = 1; } catch {}
  });
  root.querySelectorAll('img').forEach(img => {
    img.onload = null; img.onerror = null;
    try { img.removeAttribute('src'); } catch {}
  });
}

async function renderPdfInto(container, index, token, vertical = false) {
  if (!state.pdfDoc || token !== state.renderToken || !container?.isConnected) return;
  const page = await state.pdfDoc.getPage(index + 1);
  if (token !== state.renderToken || !container?.isConnected) return;
  const base = page.getViewport({ scale: 1 });
  if (state.pages[index]) { state.pages[index].width = base.width; state.pages[index].height = base.height; }
  const root = $('#readerBody');
  const spread = !vertical && effectiveMode() === 'spread';
  const profile = performanceProfile();
  const baseWidth = vertical ? Math.min(root.clientWidth, state.mode === 'webtoon' ? 820 : 1100) : root.clientWidth;
  const chromeGap = profile.mobile ? 2 : 28;
  const availableWidth = Math.max(spread ? 150 : 240, (baseWidth - (vertical ? 4 : chromeGap)) / (spread ? 2 : 1));
  const availableHeight = Math.max(240, root.clientHeight - (profile.mobile ? 2 : 24));
  let scale = availableWidth / base.width;
  if (!vertical && state.fit === 'contain') scale = Math.min(scale, availableHeight / base.height);
  if (!vertical && state.fit === 'height') scale = availableHeight / base.height;
  scale = Math.max(.25, Math.min(4, scale * (vertical ? 1 : state.zoom)));
  const viewport = page.getViewport({ scale });
  let dpr = Math.min(profile.pdfDpr, window.devicePixelRatio || 1);
  const estimatedPixels = viewport.width * viewport.height * dpr * dpr;
  if (estimatedPixels > profile.pdfPixelBudget) dpr *= Math.sqrt(profile.pdfPixelBudget / estimatedPixels);
  dpr = Math.max(.75, Math.min(profile.pdfDpr, dpr));
  const canvas = document.createElement('canvas');
  canvas.className = 'pdf-page-canvas';
  canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
  canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  canvas.setAttribute('aria-label', `Página ${index + 1}`);
  const ctx = canvas.getContext('2d', { alpha: false });
  const renderContext = { canvasContext: ctx, viewport, transform: dpr === 1 ? null : [dpr, 0, 0, dpr, 0, 0] };
  if (!vertical) {
    state.pdfRenderTask?.cancel?.();
    state.pdfRenderTask = page.render(renderContext);
    try { await state.pdfRenderTask.promise; } catch (e) { if (e?.name !== 'RenderingCancelledException') throw e; }
    finally { if (state.pdfRenderTask) state.pdfRenderTask = null; }
  } else {
    const task = page.render(renderContext); await task.promise;
  }
  if (token !== state.renderToken || !container?.isConnected) return;
  container.innerHTML = ''; container.appendChild(canvas);
  if (vertical) { container.style.aspectRatio = `${viewport.width}/${viewport.height}`; if (index === state.page && state.verticalRestore) requestAnimationFrame(() => restoreVerticalPosition(true)); }
}

function flipbookAnimationClass() {
  if (effectiveMode() !== 'spread') return '';
  if (state.flipDirection === 'next') return ' flip-next';
  if (state.flipDirection === 'prev') return ' flip-prev';
  return '';
}

async function renderPdfPageMode(token) {
  $('#readerFooter').classList.remove('hidden');
  $('#readerLoading').classList.remove('hidden');
  const spread = effectiveMode() === 'spread';
  const indexes = spread ? spreadIndexes() : [state.page];
  $('#loadingText').textContent = spread ? `Renderizando PDF • páginas ${indexes.map(i => i + 1).join('–')}…` : `Renderizando PDF • página ${state.page + 1}…`;
  releaseReaderVisuals();
  $('#readerBody').classList.add('page-mode');
  const dirClass = spread && state.direction === 'rtl' ? ' spread-rtl' : '';
  const bookClass = spread ? ` flipbook-stage${flipbookLayoutClass(indexes)}${flipbookAnimationClass()}` : '';
  $('#readerBody').innerHTML = `<div class="page-stage ${spread ? 'spread-stage' : ''}${dirClass}${bookClass} ${state.fit === 'width' ? 'fit-width' : state.fit === 'height' ? 'fit-height' : ''}">${indexes.map((i, n) => `<div class="pdf-page-mount spread-page ${spread ? `flipbook-page flipbook-page-${n === 0 ? 'left' : 'right'}` : ''}" data-pdf-i="${i}"><span class="page-placeholder">Página ${i + 1}</span>${spread ? `<span class="flipbook-page-number">${i + 1}</span><span class="flipbook-corner-hint" aria-hidden="true"></span>` : ''}</div>`).join('')}</div>`;
  try {
    for (const i of indexes) await renderPdfInto($(`[data-pdf-i="${i}"]`), i, token, false);
    if (spread && token === state.renderToken) {
      const corrected = spreadIndexes();
      if (corrected.join(',') !== indexes.join(',')) {
        await renderReaderPages();
        return;
      }
    }
  } finally { if (token === state.renderToken) $('#readerLoading').classList.add('hidden'); }
}

async function renderPdfVerticalMode(token) {
  $('#readerFooter').classList.add('hidden');
  $('#readerBody').classList.remove('page-mode');
  $('#readerBody').innerHTML = `<div class="vertical-pages pdf-vertical ${state.mode === 'webtoon' ? 'webtoon-pages' : ''}">${state.pages.map((_, i) => `<div class="page-slot pdf-slot" data-i="${i}"><span class="page-placeholder">Página ${i + 1}</span></div>`).join('')}</div>`;
  setupVerticalObserver();
  requestAnimationFrame(() => restoreVerticalPosition(true));
}

async function getPageUrl(index, expectedToken = state.renderToken) {
  const archive = state.archive;
  const page = state.pages[index];
  if (!archive || !page) throw new Error('Página inexistente.');
  if (state.pageUrls.has(index)) { state.pageUse.set(index, Date.now()); return state.pageUrls.get(index); }
  const entry = archive.entries[index];
  if (archive.type === 'web-pages') {
    const url = entry?.url || '';
    if (!url) throw new Error(`Página ${index + 1} sem URL no acervo.`);
    state.pageUrls.set(index, url); state.pageUse.set(index, Date.now());
    trimPageCache(index);
    return url;
  }
  if (archive.type === 'drive-pages') {
    const size = performanceProfile().eco ? 'w1800' : 'w2400';
    const apiUrl = await fetchDrivePageWithApi(entry, expectedToken);
    const url = apiUrl || drivePagePublicUrl(entry, size);
    if (!url) throw new Error(`Página ${index + 1} sem ID do Google Drive.`);
    if (expectedToken !== state.renderToken || archive !== state.archive) {
      if (String(apiUrl).startsWith('blob:')) URL.revokeObjectURL(apiUrl);
      throw new DOMException('Leitura cancelada.', 'AbortError');
    }
    state.pageUrls.set(index, url); state.pageUse.set(index, Date.now());
    trimPageCache(index);
    return url;
  }
  let blob;
  if (archive.type === 'zip') {
    blob = await entry.async('blob');
  } else {
    const result = archive.engine.extract({ files: [entry.name] });
    const files = [...result.files];
    const file = files.find(f => f.fileHeader?.name === entry.name) || files[0];
    if (!file?.extraction) throw new Error(`Falha ao extrair a página ${index + 1}.`);
    blob = new Blob([file.extraction], { type: mimeFromName(entry.name) });
  }
  // A troca/fechamento do leitor invalida extrações que ainda estavam em andamento.
  if (expectedToken !== state.renderToken || archive !== state.archive) throw new DOMException('Leitura cancelada.', 'AbortError');
  const url = URL.createObjectURL(blob);
  state.pageUrls.set(index, url); state.pageUse.set(index, Date.now());
  trimPageCache(index);
  return url;
}

async function prefetchPage(index, expectedToken = state.renderToken) {
  if (index < 0 || index >= state.pages.length || expectedToken !== state.renderToken) return;
  const url = await getPageUrl(index, expectedToken);
  if (['drive-pages','web-pages'].includes(state.archive?.type) && expectedToken === state.renderToken && url) {
    try { await fetch(url, { cache:'force-cache', priority:'low' }); } catch {}
  }
}
function resetPrefetchQueue() {
  state.prefetchQueue = [];
  state.prefetchQueued.clear();
}
function pumpPrefetchQueue() {
  const token = state.renderToken;
  const limit = performanceProfile().mobile ? 1 : 2;
  while (state.prefetchActive < limit && state.prefetchQueue.length) {
    const job = state.prefetchQueue.shift();
    if (!job) break;
    state.prefetchQueued.delete(job.key);
    if (job.token !== token || job.index < 0 || job.index >= state.pages.length) continue;
    state.prefetchActive++;
    const run = () => prefetchPage(job.index, job.token).catch(() => {}).finally(() => {
      state.prefetchActive = Math.max(0, state.prefetchActive - 1);
      pumpPrefetchQueue();
    });
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout:900 });
    else setTimeout(run, 120);
  }
}
function queuePagePrefetch(index, expectedToken = state.renderToken) {
  if (!performanceProfile().prefetch || index < 0 || index >= state.pages.length || expectedToken !== state.renderToken) return;
  const key = `${expectedToken}:${index}`;
  if (state.prefetchQueued.has(key)) return;
  state.prefetchQueued.add(key);
  state.prefetchQueue.push({ index, token:expectedToken, key });
  pumpPrefetchQueue();
}
function prefetchNeighborSpreads(expectedToken = state.renderToken) {
  const profile = performanceProfile();
  if (effectiveMode() !== 'spread' || !profile.prefetch) return;
  const candidates = new Set();
  const targets = profile.prefetchBothDirections ? [prevPageIndex(), nextPageIndex()] : [nextPageIndex()];
  for (const target of targets) {
    if (target < 0 || target >= state.pages.length) continue;
    for (const i of spreadIndexes(target)) if (i >= 0 && i < state.pages.length) candidates.add(i);
  }
  for (const i of candidates) queuePagePrefetch(i, expectedToken);
}

function trimPageCache(center) {
  const limit = performanceProfile().cacheLimit;
  if (state.pageUrls.size <= limit) return;
  const candidates = [...state.pageUrls.keys()].filter(i => Math.abs(i - center) > 2).sort((a, b) => (state.pageUse.get(a) || 0) - (state.pageUse.get(b) || 0));
  while (state.pageUrls.size > limit && candidates.length) {
    const i = candidates.shift(); const url = state.pageUrls.get(i);
    if (String(url).startsWith('blob:')) URL.revokeObjectURL(url); state.pageUrls.delete(i); state.pageUse.delete(i);
    const slot = $(`.page-slot[data-i="${i}"]`);
    if (slot) { slot.dataset.loaded = ''; slot.innerHTML = `<span class="page-placeholder">Página ${i + 1}</span>`; }
  }
}

function wirePagedImageErrors(indexes, expectedToken = state.renderToken) {
  $$('.page-stage img').forEach((img, n) => {
    img.decoding = 'async';
    img.addEventListener('load', () => {
      const index = indexes[n] ?? state.page;
      const page = state.pages[index];
      if (page && (!Number(page.width) || !Number(page.height)) && img.naturalWidth && img.naturalHeight) {
        const before = effectiveMode() === 'spread' ? spreadIndexes().join(',') : '';
        page.width = img.naturalWidth; page.height = img.naturalHeight;
        const after = effectiveMode() === 'spread' ? spreadIndexes().join(',') : '';
        if (before !== after && expectedToken === state.renderToken && !state.panoramaRerenderPending) {
          state.panoramaRerenderPending = true;
          requestAnimationFrame(() => {
            state.panoramaRerenderPending = false;
            if (expectedToken === state.renderToken) renderReaderPages().catch(() => {});
          });
        }
      }
    }, { once:true });
    img.addEventListener('error', () => {
      const index = indexes[n] ?? state.page;
      const entry = state.archive?.entries?.[index];
      if (state.archive?.type === 'drive-pages' && entry?.id) {
        const urls = drivePageFallbackUrls(entry, performanceProfile().eco ? 'w1800' : 'w2400');
        const current = Number(img.dataset.driveFallbackIndex || 0);
        const next = current + 1;
        if (next < urls.length) {
          img.dataset.driveFallbackIndex = String(next);
          img.src = urls[next];
          return;
        }
      }
      const wrap = document.createElement('div');
      wrap.className = 'page-load-error';
      wrap.innerHTML = `<strong>Não foi possível carregar a página ${index + 1} do Google Drive</strong><span>O Drive recusou o acesso direto. Confira se o arquivo está público ou configure uma Drive API Key.</span><div><button data-retry-page="${index}">↻ Tentar novamente</button><button data-drive-page-settings>⚙ Configurar Drive</button></div>`;
      img.replaceWith(wrap);
    });
  });
}
async function renderReaderPages() {
  if (!state.pages.length) return;
  const reader = $('#reader');
  reader?.classList.toggle('reader-mode-page', effectiveMode() === 'page');
  reader?.classList.toggle('reader-mode-spread', effectiveMode() === 'spread');
  reader?.classList.toggle('reader-mode-vertical', isVerticalMode());
  if (effectiveMode() === 'spread') state.page = spreadBaseIndex(state.page);
  const token = ++state.renderToken;
  stopVerticalObserver();
  const isPdf = extType(state.current || {}) === 'pdf' && Boolean(state.pdfDoc);
  if (isPdf) {
    try {
      if (isVerticalMode()) await renderPdfVerticalMode(token);
      else await renderPdfPageMode(token);
    } catch (err) {
      if (token === state.renderToken && err?.name !== 'RenderingCancelledException') showReaderError('Falha ao renderizar PDF', err.message || String(err));
    }
  } else if (isVerticalMode()) {
    $('#readerFooter').classList.add('hidden');
    $('#readerBody').classList.remove('page-mode');
    $('#readerBody').innerHTML = `<div class="vertical-pages ${state.mode === 'webtoon' ? 'webtoon-pages' : ''}">${state.pages.map((_, i) => `<div class="page-slot" data-i="${i}"><span class="page-placeholder">Página ${i + 1}</span></div>`).join('')}</div>`;
    setupVerticalObserver();
    requestAnimationFrame(() => restoreVerticalPosition(true));
  } else {
    $('#readerFooter').classList.remove('hidden');
    $('#readerLoading').classList.remove('hidden'); $('#loadingText').textContent = `Carregando página ${state.page + 1}…`;
    try {
      const spread = effectiveMode() === 'spread';
      const indexes = spread ? spreadIndexes() : [state.page];
      const urls = await Promise.all(indexes.map(i => getPageUrl(i, token)));
      if (token !== state.renderToken) return;
      releaseReaderVisuals();
      $('#readerBody').classList.add('page-mode');
      const zoomStyle = state.zoom === 1 ? '' : `style="width:${Math.round(state.zoom * 100)}%;max-width:none;height:auto"`;
      const dirClass = spread && state.direction === 'rtl' ? ' spread-rtl' : '';
      const bookClass = spread ? ` flipbook-stage${flipbookLayoutClass(indexes)}${flipbookAnimationClass()}` : '';
      $('#readerBody').innerHTML = `<div class="page-stage ${spread ? 'spread-stage' : ''}${dirClass}${bookClass} ${state.fit === 'width' ? 'fit-width' : state.fit === 'height' ? 'fit-height' : ''}">${urls.map((url, n) => spread ? `<div class="flipbook-page flipbook-page-${n === 0 ? 'left' : 'right'}"><img src="${url}" alt="Página ${indexes[n] + 1}" decoding="async" fetchpriority="high" loading="eager" draggable="false" ${pageDimensions(indexes[n]).width ? `width="${pageDimensions(indexes[n]).width}" height="${pageDimensions(indexes[n]).height}"` : ''} ${zoomStyle}><span class="flipbook-page-number">${indexes[n] + 1}</span><span class="flipbook-corner-hint" aria-hidden="true"></span></div>` : `<img src="${url}" alt="Página ${indexes[n] + 1}" decoding="async" fetchpriority="high" loading="eager" draggable="false" ${pageDimensions(indexes[n]).width ? `width="${pageDimensions(indexes[n]).width}" height="${pageDimensions(indexes[n]).height}"` : ''} ${zoomStyle}>`).join('')}</div>`;
      wirePagedImageErrors(indexes, token);
      const visibleImages = [...$('#readerBody').querySelectorAll('.page-stage img')];
      if (visibleImages.length) {
        await Promise.race([
          Promise.allSettled(visibleImages.map(img => typeof img.decode === 'function' ? img.decode() : Promise.resolve())),
          new Promise(resolve => setTimeout(resolve, performanceProfile().mobile ? 180 : 260))
        ]);
        if (token !== state.renderToken) return;
      }
      if (performanceProfile().prefetch) {
        if (spread) prefetchNeighborSpreads(token);
        else { const p=performanceProfile(); const targets=p.prefetchBothDirections?[state.page-1,state.page+1]:[state.page+1]; targets.filter(i=>i>=0&&i<state.pages.length).forEach(i=>queuePagePrefetch(i,token)); }
      }
    } catch (err) {
      if (token === state.renderToken) showReaderError('Falha ao carregar página', err.message);
    } finally {
      if (token === state.renderToken) $('#readerLoading').classList.add('hidden');
    }
  }
  updateProgress(); updatePageControls();
}

function setupVerticalObserver() {
  const root = $('#readerBody');
  state.verticalObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) loadVerticalSlot(entry.target).catch(() => {});
  }, { root, rootMargin: `${performanceProfile().observerMargin}px 0px`, threshold: 0.01 });
  $$('.page-slot').forEach(slot => state.verticalObserver.observe(slot));
  let ticking = false;
  state.verticalScrollHandler = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false; updateVerticalPosition(); cleanupVerticalSlots();
    });
  };
  root.addEventListener('scroll', state.verticalScrollHandler, { passive: true });
}

async function loadVerticalSlot(slot) {
  if (!slot?.isConnected || slot.dataset.loaded === '1') return;
  const i = Number(slot.dataset.i);
  slot.dataset.loaded = '1';
  try {
    if (extType(state.current || {}) === 'pdf' && state.pdfDoc) {
      await renderPdfInto(slot, i, state.renderToken, true);
      return;
    }
    const url = await getPageUrl(i);
    if (!slot.isConnected) return;
    const img = new Image(); img.alt = `Página ${i + 1}`; img.loading = 'lazy'; img.decoding = 'async'; img.fetchPriority = 'low'; img.src = url;
    img.onload = () => { if (img.naturalWidth && img.naturalHeight) slot.style.aspectRatio = `${img.naturalWidth}/${img.naturalHeight}`; if (i === state.page && state.verticalRestore) requestAnimationFrame(() => restoreVerticalPosition(true)); };
    img.onerror = () => {
      const entry = state.archive?.entries?.[i];
      if (state.archive?.type === 'drive-pages' && entry?.id) {
        const urls = drivePageFallbackUrls(entry, performanceProfile().eco ? 'w1800' : 'w2400');
        const current = Number(img.dataset.driveFallbackIndex || 0);
        const next = current + 1;
        if (next < urls.length) {
          img.dataset.driveFallbackIndex = String(next);
          img.src = urls[next];
          return;
        }
      }
      slot.dataset.loaded = '';
      slot.innerHTML = `<div class="page-load-error"><strong>Falha ao carregar a página ${i + 1}</strong><span>Confira o compartilhamento público do Drive ou configure uma API Key.</span><div><button data-retry-page="${i}">↻ Tentar novamente</button><button data-drive-page-settings>⚙ Configurar Drive</button></div></div>`;
    };
    slot.innerHTML = ''; slot.appendChild(img);
  } catch (err) {
    slot.dataset.loaded = '';
    if (slot.isConnected) slot.innerHTML = `<button class="page-retry" data-retry-page="${i}">↻ Tentar página ${i + 1} novamente</button>`;
  }
}


function cleanupVerticalSlots(force = false) {
  if (!isVerticalMode() || !state.pages.length) return;
  const profile = performanceProfile();
  if (!force && !profile.mobile && !profile.eco) return;
  const keep = profile.verticalWindow;
  for (const slot of $$('.page-slot')) {
    if (slot.dataset.loaded !== '1') continue;
    const i = Number(slot.dataset.i);
    if (Math.abs(i - state.page) <= keep) continue;
    slot.dataset.loaded = '';
    slot.innerHTML = `<span class="page-placeholder">Página ${i + 1}</span>`;
    if (extType(state.current || {}) !== 'pdf' && state.pageUrls.has(i)) {
      const cachedUrl = state.pageUrls.get(i);
      if (String(cachedUrl).startsWith('blob:')) URL.revokeObjectURL(cachedUrl);
      state.pageUrls.delete(i); state.pageUse.delete(i);
    }
  }
}

function currentVerticalOffsetRatio() {
  if (!isVerticalMode() || !state.pages.length) return 0;
  const root = $('#readerBody');
  const slot = $(`.page-slot[data-i="${state.page}"]`);
  if (!root || !slot || slot.offsetHeight <= 0) return 0;
  return Math.max(0, Math.min(1, (root.scrollTop - slot.offsetTop) / slot.offsetHeight));
}
function scheduleVerticalProgressSave() {
  clearTimeout(state.verticalSaveTimer);
  state.verticalSaveTimer = setTimeout(() => {
    state.verticalSaveTimer = 0;
    if (!state.current || !isVerticalMode() || !state.pages.length) return;
    const current = progress[state.current.id] || {};
    progress[state.current.id] = { ...current, page:state.page, mode:state.mode, direction:state.direction, verticalOffsetRatio:currentVerticalOffsetRatio(), updated:Date.now() };
    saveProgress();
  }, 260);
}
function restoreVerticalPosition(force = false) {
  if (!isVerticalMode() || !state.pages.length) return;
  const restore = state.verticalRestore;
  if (!restore || (!force && Number(restore.page) !== Number(state.page))) return;
  const root = $('#readerBody');
  const slot = $(`.page-slot[data-i="${state.page}"]`);
  if (!root || !slot) return;
  const ratio = Math.max(0, Math.min(1, Number(restore.ratio || 0)));
  root.scrollTop = Math.max(0, slot.offsetTop + ratio * slot.offsetHeight);
}
function updateVerticalPosition() {
  if (!isVerticalMode() || !state.pages.length) return;
  const rootRect = $('#readerBody').getBoundingClientRect(); let best = state.page; let dist = Infinity;
  for (const slot of $('.page-slot')) {
    const d = Math.abs(slot.getBoundingClientRect().top - rootRect.top);
    if (d < dist) { dist = d; best = Number(slot.dataset.i); }
  }
  if (best !== state.page) {
    state.page = best;
    state.verticalRestore = null;
    updateProgress(); updatePageControls();
  }
  scheduleVerticalProgressSave();
}

function stopVerticalObserver() {
  state.verticalObserver?.disconnect(); state.verticalObserver = null;
  if (state.verticalScrollHandler) $('#readerBody')?.removeEventListener('scroll', state.verticalScrollHandler);
  state.verticalScrollHandler = null;
}
function getNextIssue() {
  if (!state.current || state.current.localFile) return null;
  const currentKey = seriesKeyFor(state.current);
  const group = state.items.filter(i => seriesKeyFor(i) === currentKey).sort((a, b) => naturalSort(a.name, b.name));
  const i = group.findIndex(x => x.id === state.current.id);
  return i >= 0 && i < group.length - 1 ? group[i + 1] : null;
}
function updatePageControls() {
  if (!state.pages.length) return;
  $('#pageRange').value = state.page + 1;
  const pageNumberInput = $('#pageNumberInput');
  if (pageNumberInput) { pageNumberInput.max = state.pages.length; pageNumberInput.value = state.page + 1; }
  const visible = effectiveMode() === 'spread' ? spreadIndexes() : [state.page];
  const first = visible[0] + 1, last = visible[visible.length - 1] + 1;
  $$('.thumb-item').forEach(b=>b.classList.toggle('active',Number(b.dataset.thumbPage)===state.page));
  $('#pageLabel').textContent = visible.length > 1 ? `${first}–${last} / ${state.pages.length}` : `${first} / ${state.pages.length}`;
  const next = getNextIssue();
  const showNext = state.page >= state.pages.length - 1 && Boolean(next);
  $('#nextIssueBtn').classList.toggle('hidden', !showNext);
  updateBookmarkButton();
  if (showNext) $('#nextIssueBtn').title = next.name;
}
function updateProgress() {
  if (!state.current || !state.pages.length) return;
  const readThrough = effectiveMode() === 'spread' ? (spreadIndexes().at(-1) + 1) : state.page + 1;
  const pct = Math.round((readThrough / state.pages.length) * 100);
  progress[state.current.id] = { percent: pct, page: state.page, mode: state.mode, direction: state.direction, verticalOffsetRatio:isVerticalMode() ? currentVerticalOffsetRatio() : 0, updated: Date.now() };
  saveProgress(); updateLibraryStats(); updateCompleteButton();
}
async function setPage(n) {
  if (!state.pages.length) return;
  const target = Math.max(0, Math.min(state.pages.length - 1, Number(n) || 0));
  if (state.pageTransitioning) {
    state.pendingPageTarget = target;
    return;
  }
  const current = state.page;
  if (target === current && !state.flipDirection) return;
  state.pageTransitioning = true;
  state.pendingPageTarget = null;
  const requestId = ++state.pageSetSeq;
  try {
    state.pdfRenderTask?.cancel?.();
    state.flipDirection = target > current ? 'next' : target < current ? 'prev' : '';
    state.page = target;
    state.verticalRestore = null;
    if (!prefs.keepZoom) {
      state.zoom = 1;
      $('#readerBody')?.classList.remove('is-zoomed');
    }
    resetPrefetchQueue();
    await renderReaderPages();
    resetPagedScrollPosition();
    if (performanceProfile().mobile) { closeReaderControls(false); scheduleReaderChromeHide(1400); }
    if (requestId === state.pageSetSeq) state.flipDirection = '';
  } finally {
    state.pageTransitioning = false;
    const pending = state.pendingPageTarget;
    state.pendingPageTarget = null;
    if (Number.isFinite(pending) && pending !== state.page) setPage(pending);
  }
}

async function cleanupReaderData() {
  closeThumbDrawer();
  state.thumbObserver?.disconnect?.(); state.thumbObserver = null;
  stopAutoScroll();
  state.readerDownloadController?.abort();
  state.readerDownloadController = null;
  stopVerticalObserver();
  state.renderToken++; state.pageSetSeq++; cancelAnimationFrame(state.imageZoomRaf || 0); state.imageZoomRaf = 0;
  resetPrefetchQueue(); state.prefetchActive = 0; clearTimeout(state.verticalSaveTimer); state.verticalSaveTimer = 0; state.pageTransitioning = false; state.pendingPageTarget = null;
  state.touchStart = null; state.flipDrag = null; clearFlipDragPreview(false);
  for (const url of state.pageUrls.values()) if (String(url).startsWith('blob:')) URL.revokeObjectURL(url);
  state.pageUrls.clear(); state.pageUse.clear();
  if (state.pdfObjectUrl) { URL.revokeObjectURL(state.pdfObjectUrl); state.pdfObjectUrl = ''; }
  state.pdfRenderTask?.cancel?.(); state.pdfRenderTask = null;
  if (state.pdfDoc) { await state.pdfDoc.destroy().catch(() => {}); state.pdfDoc = null; }
  state.archive = null; state.pages = []; $('#readerBody')?.classList.remove('page-mode');
}
async function closeReader(fromHistory = false) {
  const shouldGoBack = !fromHistory && state.readerHistoryActive && history.state?.mhqrReader;
  state.readerHistoryActive = false;
  closeReaderControls();
  $('#readerDisplayPanel')?.classList.add('hidden');
  setImmersive(false);
  if (isVerticalMode()) { updateVerticalPosition(); updateProgress(); }
  state.openToken++;
  await cleanupReaderData();
  clearReaderChromeTimer(); clearTimeout(readerControlsTimer);
  $('#reader').classList.add('hidden'); $('#reader').setAttribute('aria-hidden', 'true'); $('#reader')?.classList.remove('mobile-fullbleed','reader-chrome-hidden');
  document.body.style.overflow = ''; state.current = null; state.verticalRestore = null; $('#readerBody').innerHTML = ''; render();

  if (shouldGoBack) {
    try { history.back(); } catch {}
  }
}

window.addEventListener('popstate', () => {
  if (!$('#reader')?.classList.contains('hidden') && state.readerHistoryActive) {
    state.readerHistoryActive = false;
    closeReader(true).catch(() => {});
  }
});

function markComplete() {
  if (!state.current) return;
  const done = (progress[state.current.id]?.percent || 0) >= 100;
  if (done) {
    progress[state.current.id] = { percent: 0, page: 0, mode: state.mode, direction: state.direction, updated: Date.now() };
    toast('Marcado como não lido.');
  } else {
    const page = state.pages.length ? state.pages.length - 1 : 0;
    progress[state.current.id] = { percent: 100, page, mode: state.mode, direction: state.direction, updated: Date.now() };
    toast('Marcado como lido.');
  }
  saveProgress(); updateLibraryStats(); updateCompleteButton(); render();
}

async function runtimeAvailability(url) {
  try { const cached = await caches?.match?.(url); if (cached) return true; } catch {}
  if (!navigator.onLine) return false;
  try { const r=await fetch(url,{method:'HEAD',cache:'no-store'}); return r.ok; } catch { return false; }
}
async function runDiagnostics() {
  const out=$('#diagnosticsResults'); if (!out) return; out.innerHTML='<span>Verificando…</span>';
  const local = await Promise.all(Object.entries(RUNTIME_URLS).map(async ([k,u])=>[k,await runtimeAvailability(u)]));
  let sw=false; try { sw=Boolean(await navigator.serviceWorker?.getRegistration?.()); } catch {}
  let quota='indisponível'; try { const e=await navigator.storage?.estimate?.(); if(e?.quota) quota=`${bytes(e.usage||0)} / ${bytes(e.quota)}`; } catch {}
  const rows=[
    ['Internet',navigator.onLine?'OK':'Offline'],['Service Worker',sw?'Ativo':'Inativo'],['Armazenamento',quota],
    ['PDF.js',local.find(x=>x[0]==='pdf')?.[1]?'Disponível/cacheado':'Indisponível'],['JSZip',local.find(x=>x[0]==='zip')?.[1]?'Disponível/cacheado':'Indisponível'],['UnRAR',local.find(x=>x[0]==='unrar')?.[1]?'Disponível/cacheado':'Indisponível'],
    ['Bibliotecas Drive',(CONFIG.folderIds||[]).length],['Catálogo atual',`${state.items.length} itens`],['Modo desempenho',performanceLabel()]
  ];
  for (const src of (CONFIG.externalSources || [])) {
    const id=String(src?.id || '');
    const status=state.externalSourceStatus.get(id);
    const count=state.items.filter(item => String(item.externalSourceId || '') === id).length;
    rows.push([src.name || id, status?.ok ? `OK • ${count} itens • ${status.elapsed || 0} ms` : status ? `Cache/falha • ${count} itens` : `${count} itens`]);
  }
  out.innerHTML=rows.map(([a,b])=>`<div><strong>${escapeHtml(String(a))}</strong><span>${escapeHtml(String(b))}</span></div>`).join('');
}
function openSettings() {
  renderSyncProgress();
  $('#apiKeyInput').value = getApiKey();
  $('#defaultModeSelect').value = normalizedMode(prefs.defaultMode);
  $('#directionSelect').value = prefs.direction || 'ltr';
  if ($('#performanceSelect')) $('#performanceSelect').value = prefs.performance || 'auto';
  if ($('#autoScrollSpeedSelect')) $('#autoScrollSpeedSelect').value = String(prefs.autoScrollSpeed || 46);
  if ($('#keepZoomSelect')) $('#keepZoomSelect').value = prefs.keepZoom ? 'yes' : 'no';
  if ($('#performanceHint')) $('#performanceHint').textContent = `Ativo: ${performanceLabel()} • ${navigator.deviceMemory ? navigator.deviceMemory + ' GB RAM' : 'RAM não informada'}${navigator.hardwareConcurrency ? ' • ' + navigator.hardwareConcurrency + ' núcleos' : ''}`;
  $('#configStatus').textContent = getApiKey() ? 'Chave configurada neste navegador.' : 'Nenhuma chave configurada.';
  $('#settingsModal').classList.remove('hidden');
}
function closeSettings() { $('#settingsModal').classList.add('hidden'); }

function makeLocalItem(file) {
  return { id: `local:${file.name}:${file.size}:${file.lastModified}`, name: file.name, size: file.size, mimeType: file.type || 'application/octet-stream', localFile: file };
}
async function openLocalSelected(file) {
  if (!file) return;
  const item = makeLocalItem(file);
  if (!/\.(pdf|cbr|cbz|rar|zip)$/i.test(item.name)) { toast('Formato não suportado.'); return; }
  await openItem(item);
}

document.addEventListener('click', e => {
  const continueBtn = e.target.closest('[data-continue]');
  if (continueBtn) { const item = state.items.find(x => x.id === continueBtn.dataset.continue); if (item) openItem(item); return; }
  const collectionBtn = e.target.closest('[data-open-collection]');
  if (collectionBtn) { state.collection = collectionBtn.dataset.openCollection; state.filter = 'all'; state.search = ''; $('#searchInput').value = ''; $$('.nav').forEach(n => n.classList.toggle('active', n.dataset.filter === 'all')); render(); return; }
  const categoryBtn = e.target.closest('[data-category]');
  if (categoryBtn) { state.category = categoryBtn.dataset.category || ''; state.collection = ''; resetRenderLimit(); render(); return; }
  const bookmarkOpen = e.target.closest('[data-bookmark-open]');
  if (bookmarkOpen) { const item=state.items.find(x=>x.id===bookmarkOpen.dataset.bookmarkOpen); if(item){ const pg=Number(bookmarkOpen.dataset.bookmarkPage||0); progress[item.id]={...(progress[item.id]||{}),page:pg,percent:progress[item.id]?.percent||0,updated:Date.now()}; saveProgress(); openItem(item); } return; }
  const drivePageSettings = e.target.closest('[data-drive-page-settings]');
  if (drivePageSettings) { openSettings(); return; }
  const retryPage = e.target.closest('[data-retry-page]');
  if (retryPage) {
    const i = Number(retryPage.dataset.retryPage);
    if (Number.isFinite(i)) {
      const oldUrl = state.pageUrls.get(i);
      if (String(oldUrl).startsWith('blob:')) URL.revokeObjectURL(oldUrl);
      state.pageUrls.delete(i); state.pageUse.delete(i);
      const slot = $(`.page-slot[data-i="${i}"]`);
      if (slot) { slot.dataset.loaded = ''; loadVerticalSlot(slot).catch(() => {}); }
      else { setPage(i); }
    }
    return;
  }
  const card = e.target.closest('.card');
  if (card) {
    const item = state.items.find(x => x.id === card.dataset.id); if (!item) return;
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'fav') { favorites.has(item.id) ? favorites.delete(item.id) : favorites.add(item.id); saveFav(); render(); return; }
    if (action === 'drive') { safeOpen(driveViewUrl(item)); return; }
    if (action === 'download') { downloadItem(item); return; }
    if (action === 'offline') { toggleOfflineItem(item); return; }
    if (action === 'read') { openItem(item); return; }
  }
  const nav = e.target.closest('.nav');
  if (nav) { $$('.nav').forEach(n => n.classList.remove('active')); nav.classList.add('active'); state.collection = ''; state.category = ''; state.filter = nav.dataset.filter; resetRenderLimit(); render(); }
});

$('#searchInput').addEventListener('input', e => { state.search = normalizeText(e.target.value.trim()); resetRenderLimit(); render(); });
$('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; resetRenderLimit(); $('.toolbar')?.classList.remove('mobile-filters-open'); $('#mobileFilterBtn')?.setAttribute('aria-expanded','false'); if ($('#mobileFilterBtn')) $('#mobileFilterBtn').textContent='☰'; render(); });
$('#showReadingBtn').addEventListener('click', () => { state.collection = ''; state.filter = 'reading'; $$('.nav').forEach(n => n.classList.toggle('active', n.dataset.filter === 'reading')); render(); });
$('#backCollectionsBtn').addEventListener('click', () => { state.collection = ''; state.filter = 'collections'; $$('.nav').forEach(n => n.classList.toggle('active', n.dataset.filter === 'collections')); render(); });
$('#sourceSelect')?.addEventListener('change', e => { state.source = e.target.value || 'all'; resetRenderLimit(); $('.toolbar')?.classList.remove('mobile-filters-open'); $('#mobileFilterBtn')?.setAttribute('aria-expanded','false'); if ($('#mobileFilterBtn')) $('#mobileFilterBtn').textContent='☰'; render(); });
$('#clearCategoryBtn')?.addEventListener('click', () => { state.category = ''; resetRenderLimit(); render(); });
$('#alphabetIndex')?.addEventListener('click', e => { const btn=e.target.closest('[data-alpha]'); if (btn && !btn.disabled) jumpToCatalogLetter(btn.dataset.alpha); });
$('#carouselPrevBtn')?.addEventListener('click', () => scrollFeatured(-1));
$('#carouselNextBtn')?.addEventListener('click', () => scrollFeatured(1));
$('#refreshBtn').addEventListener('click', loadLibrary);
$('#cancelSyncBtn')?.addEventListener('click', () => state.syncController?.abort());
function openDriveModal() {
  const urls = Array.isArray(CONFIG.folderUrls) && CONFIG.folderUrls.length ? CONFIG.folderUrls : [CONFIG.folderUrl].filter(Boolean);
  const counts = libraryCounts();
  const sync = readJson(LS.syncMeta, {});
  const last = formatDateTime(sync.at);
  $('#driveSummary').innerHTML = `<div><strong>${getApiKey() ? 'Drive API configurada' : 'Drive API não configurada'}</strong><small>${getApiKey() ? `${state.items.length} itens disponíveis${last ? ` • última sincronização ${last}` : ''}` : 'O catálogo publicado funciona sem a API; configure uma chave para descobrir novos arquivos e fazer sincronização completa.'}</small></div>`;
  $('#driveRoots').innerHTML = urls.map((url, i) => { const key=`library-${i+1}`; const count=counts[key]||0; return `<button class="drive-root" data-drive-url="${escapeHtml(url)}"><span>Biblioteca ${i + 1}<em>${count ? `${count} itens carregados` : 'Abrir pasta no Drive'}</em></span><small>Google Drive próprio • ${getApiKey() ? 'API pronta' : 'configure a API para sincronização completa'}</small><b>↗</b></button>`; }).join('');
  const external = Array.isArray(CONFIG.externalSources) ? CONFIG.externalSources : [];
  $('#externalSources').innerHTML = external.length ? `<div class="source-section-title">Fontes externas</div>${external.map(src => `<article class="external-source-card"><div class="external-source-head"><div><span class="external-badge">EXTERNO</span><strong>${escapeHtml(src.name || 'Fonte externa')}</strong></div></div><p>${escapeHtml(src.note || 'Conteúdo hospedado em uma fonte externa.')}</p><div class="external-source-actions">${src.siteUrl ? `<button class="secondary-btn" data-external-url="${escapeHtml(src.siteUrl)}">Abrir site</button>` : ''}${src.driveUrl ? `<button data-external-url="${escapeHtml(src.driveUrl)}">Abrir acervo ↗</button>` : ''}</div></article>`).join('')}` : '';
  $('#driveModal').classList.remove('hidden');
}
function closeDriveModal() { $('#driveModal').classList.add('hidden'); }
$('#driveBtn').addEventListener('click', openDriveModal);
$('#closeDriveModal').addEventListener('click', closeDriveModal);
$('#driveModal').addEventListener('click', e => { if (e.target === $('#driveModal')) closeDriveModal(); });
$('#driveRoots').addEventListener('click', e => { const b=e.target.closest('[data-drive-url]'); if (b) safeOpen(b.dataset.driveUrl); });
$('#externalSources').addEventListener('click', e => { const b=e.target.closest('[data-external-url]'); if (b) safeOpen(b.dataset.externalUrl); });
async function testDriveConnection() {
  const key = ($('#apiKeyInput')?.value || getApiKey()).trim();
  const out = $('#driveHealthText');
  if (!key) { out.textContent = 'Cole uma API Key para testar. O catálogo local continua funcionando sem ela.'; out.className = 'warn'; return false; }
  out.textContent = `Testando ${(CONFIG.folderIds || []).length} bibliotecas…`; out.className = '';
  const roots = Array.isArray(CONFIG.folderIds) && CONFIG.folderIds.length ? CONFIG.folderIds : [CONFIG.folderId].filter(Boolean);
  try {
    const results = [];
    for (const id of roots) {
      const u = new URL('https://www.googleapis.com/drive/v3/files');
      u.searchParams.set('q', `'${id}' in parents and trashed = false`);
      u.searchParams.set('fields', 'files(id,name,mimeType),nextPageToken');
      u.searchParams.set('pageSize', '1');
      u.searchParams.set('supportsAllDrives', 'true');
      u.searchParams.set('includeItemsFromAllDrives', 'true');
      u.searchParams.set('key', key);
      const r = await fetch(u, { mode:'cors' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || `HTTP ${r.status}`);
      results.push((d.files || []).length);
    }
    out.textContent = `Conexão OK • ${roots.length} bibliotecas acessíveis. Agora salve e sincronize.`; out.className = 'ok';
    return true;
  } catch (err) {
    out.textContent = `Falha: ${err.message}`; out.className = 'warn';
    return false;
  }
}
$('#testDriveBtn')?.addEventListener('click', testDriveConnection);

$('#runDiagnosticsBtn')?.addEventListener('click', runDiagnostics);
$('#settingsBtn').addEventListener('click', openSettings);
$('#noticeSettingsBtn').addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', closeSettings);
$('#settingsModal').addEventListener('click', e => { if (e.target === $('#settingsModal')) closeSettings(); });
$('#saveKeyBtn').addEventListener('click', async () => {
  const key = $('#apiKeyInput').value.trim();
  prefs.defaultMode = normalizedMode($('#defaultModeSelect').value);
  prefs.direction = $('#directionSelect').value === 'rtl' ? 'rtl' : 'ltr';
  prefs.performance = ['auto','eco','quality'].includes($('#performanceSelect')?.value) ? $('#performanceSelect').value : 'auto';
  prefs.autoScrollSpeed = Number($('#autoScrollSpeedSelect')?.value || 46);
  prefs.keepZoom = $('#keepZoomSelect')?.value === 'yes';
  savePrefs();
  if (key) storageSet(LS.apiKey, key); else storageRemove(LS.apiKey);
  $('#configStatus').textContent = key ? 'Chave salva. Sincronizando…' : 'Chave removida.';
  closeSettings(); await (async () => { await refreshOfflineIndex(); await updateOfflineStorageInfo(); await loadLibrary(); })();
});
$('#clearKeyBtn').addEventListener('click', async () => {
  storageRemove(LS.apiKey); $('#apiKeyInput').value = ''; $('#configStatus').textContent = 'Chave removida.'; closeSettings(); await (async () => { await refreshOfflineIndex(); await updateOfflineStorageInfo(); await loadLibrary(); })();
});

$('#mobileFilterBtn')?.addEventListener('click', () => {
  const toolbar = $('.toolbar'); if (!toolbar) return;
  const open = toolbar.classList.toggle('mobile-filters-open');
  $('#mobileFilterBtn')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  $('#mobileFilterBtn').textContent = open ? '×' : '☰';
  $('#mobileFilterBtn').title = open ? 'Fechar filtros' : 'Abrir filtros';
});

$('#localBtn').addEventListener('click', () => $('#localFileInput').click());
$('#localFileInput').addEventListener('change', async e => { const file = e.target.files?.[0]; e.target.value = ''; await openLocalSelected(file); });

let readerControlsTimer = 0;
let readerChromeTimer = 0;
function clearReaderChromeTimer() {
  clearTimeout(readerChromeTimer);
  readerChromeTimer = 0;
}
function hideReaderChrome() {
  if (!performanceProfile().mobile) return;
  const reader = $('#reader');
  if (!reader || reader.classList.contains('hidden') || reader.classList.contains('controls-open') || !$('#readerDisplayPanel')?.classList.contains('hidden') || !$('#thumbDrawer')?.classList.contains('hidden')) return;
  reader.classList.add('reader-chrome-hidden');
}
function scheduleReaderChromeHide(delay = 2400) {
  clearReaderChromeTimer();
  if (!performanceProfile().mobile) return;
  readerChromeTimer = setTimeout(hideReaderChrome, delay);
}
function showReaderChrome(autoHide = true) {
  const reader = $('#reader'); if (!reader) return;
  reader.classList.remove('reader-chrome-hidden');
  clearReaderChromeTimer();
  if (autoHide) scheduleReaderChromeHide();
}
function toggleReaderChrome() {
  if (!performanceProfile().mobile) return;
  const reader = $('#reader'); if (!reader) return;
  if (reader.classList.contains('reader-chrome-hidden')) showReaderChrome(true);
  else {
    closeReaderControls(false);
    reader.classList.add('reader-chrome-hidden');
    clearReaderChromeTimer();
  }
}
function closeReaderControls(scheduleHide = true) {
  $('#reader').classList.remove('controls-open');
  $('#readerMenuBtn')?.setAttribute('aria-expanded','false');
  clearTimeout(readerControlsTimer);
  if (scheduleHide) scheduleReaderChromeHide(1600);
}
function keepReaderControlsAlive() {
  if (!performanceProfile().mobile || !$('#reader').classList.contains('controls-open')) return;
  showReaderChrome(false);
  clearTimeout(readerControlsTimer);
  readerControlsTimer = setTimeout(() => closeReaderControls(true), 6000);
}
function toggleReaderControls() {
  const reader = $('#reader');
  if (!reader) return;
  showReaderChrome(false);
  const open = reader.classList.toggle('controls-open');
  $('#readerMenuBtn')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  clearTimeout(readerControlsTimer);
  if (open && performanceProfile().mobile) readerControlsTimer = setTimeout(() => closeReaderControls(true), 6000);
  else if (!open) scheduleReaderChromeHide(1600);
}
$('#readerMenuBtn')?.addEventListener('click', e => { e.stopPropagation(); toggleReaderControls(); });
$('.reader-controls')?.addEventListener('click', keepReaderControlsAlive);

$('#closeReader').addEventListener('click', closeReader);
$('#downloadCurrentBtn').addEventListener('click', () => downloadItem(state.current));
$('#offlineCurrentBtn').addEventListener('click', async () => { if (state.current) { await toggleOfflineItem(state.current); updateOfflineCurrentButton(); } });
$('#clearOfflineBtn').addEventListener('click', clearOfflineLibrary);
$('#completeBtn').addEventListener('click', markComplete);
$('#prevPage').addEventListener('click', () => setPage(prevPageIndex()));
$('#nextPage').addEventListener('click', () => setPage(nextPageIndex()));
$('#nextIssueBtn').addEventListener('click', async () => { const next = getNextIssue(); if (next) await openItem(next); });
$('#pageRange').addEventListener('input', e => setPage(Number(e.target.value) - 1));
$('#pageNumberInput')?.addEventListener('change', e => { const n = Number(e.target.value || 1); setPage(n - 1); });
$('#pageNumberInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); const n = Number(e.target.value || 1); setPage(n - 1); } });
$('#loadMoreBtn')?.addEventListener('click', () => { state.renderLimit += performanceProfile().mobile ? 30 : 60; render(); });
let catalogAutoLoading = false;
function setupCatalogAutoLoad() {
  const button = $('#loadMoreBtn');
  if (!button || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry?.isIntersecting || button.classList.contains('hidden') || catalogAutoLoading) return;
    catalogAutoLoading = true;
    state.renderLimit += performanceProfile().mobile ? 30 : 60;
    render();
    requestAnimationFrame(() => { catalogAutoLoading = false; });
  }, { root:null, rootMargin:'700px 0px', threshold:0.01 });
  observer.observe(button);
}
$('#modeBtn').addEventListener('click', async () => {
  if (!state.pages.length) return;
  stopAutoScroll();
  const modes = ['page','spread','vertical','webtoon'];
  state.mode = modes[(modes.indexOf(normalizedMode(state.mode)) + 1) % modes.length];
  state.zoom = 1; $('#readerBody')?.classList.remove('is-zoomed');
  persistCurrentReaderPrefs(); updateReaderPrefsUI();
  await renderReaderPages();
  resetPagedScrollPosition();
});
$('#thumbsBtn')?.addEventListener('click', () => { showReaderChrome(false); openThumbDrawer(); });
$('#closeThumbsBtn')?.addEventListener('click', () => { closeThumbDrawer(); scheduleReaderChromeHide(1400); });
$('#thumbGrid')?.addEventListener('click', e => { const b=e.target.closest('[data-thumb-page]'); if (!b) return; closeThumbDrawer(); setPage(Number(b.dataset.thumbPage)); });
$('#bookmarkBtn')?.addEventListener('click', togglePageBookmark);
$('#bookmarkJumpBtn')?.addEventListener('click', jumpToNextBookmark);
$('#displayBtn')?.addEventListener('click', () => { showReaderChrome(false); applyDisplayPrefs(); $('#readerDisplayPanel')?.classList.toggle('hidden'); });
$('#closeDisplayBtn')?.addEventListener('click', () => { $('#readerDisplayPanel')?.classList.add('hidden'); scheduleReaderChromeHide(1400); });
$('#brightnessRange')?.addEventListener('input', e => setDisplayPref('brightness', e.target.value));
$('#contrastRange')?.addEventListener('input', e => setDisplayPref('contrast', e.target.value));
$('#sepiaRange')?.addEventListener('input', e => setDisplayPref('sepia', e.target.value));
$('#nightProfileBtn')?.addEventListener('click', () => { displayPrefs.brightness=78; displayPrefs.contrast=92; displayPrefs.sepia=12; saveDisplayPrefs(); applyDisplayPrefs(); });
$('#resetDisplayBtn')?.addEventListener('click', () => { displayPrefs.brightness=100; displayPrefs.contrast=100; displayPrefs.sepia=0; saveDisplayPrefs(); applyDisplayPrefs(); });
$('#immersiveBtn')?.addEventListener('click', () => setImmersive());
$('#fitBtn').addEventListener('click', async () => {
  const fits=['contain','width','height']; state.fit=fits[(fits.indexOf(state.fit)+1)%fits.length]; persistCurrentReaderPrefs(); updateReaderPrefsUI(); await renderReaderPages();
});
$('#trimBtn')?.addEventListener('click', async () => { state.trimMargins=!state.trimMargins; $('#reader')?.classList.toggle('trim-margins',state.trimMargins); persistCurrentReaderPrefs(); updateReaderPrefsUI(); await renderReaderPages(); });
$('#directionBtn').addEventListener('click', async () => {
  state.direction = state.direction === 'rtl' ? 'ltr' : 'rtl';
  prefs.direction = state.direction; savePrefs(); persistCurrentReaderPrefs(); updateReaderPrefsUI(); updateProgress();
  if (state.pages.length && effectiveMode() === 'spread') await renderReaderPages();
  toast(state.direction === 'rtl' ? 'Modo mangá: avance tocando à esquerda.' : 'Leitura ocidental: avance tocando à direita.');
});
function applyImageZoomWithoutRender(zoomValue = state.zoom) {
  if (!isPagedMode() || !state.pages.length || extType(state.current || {}) === 'pdf') return false;
  const root = $('#readerBody');
  const stage = root?.querySelector('.page-stage');
  if (!stage) return false;
  const effectiveZoom = Math.max(.6, Math.min(3, Number(zoomValue) || 1));
  const zoom = Math.round(effectiveZoom * 100);
  cancelAnimationFrame(state.imageZoomRaf || 0);
  state.imageZoomRaf = requestAnimationFrame(() => {
    stage.querySelectorAll(':scope > img, .flipbook-page > img').forEach(img => {
      if (effectiveZoom === 1) {
        img.style.removeProperty('width');
        img.style.removeProperty('max-width');
        img.style.removeProperty('height');
      } else {
        img.style.width = `${zoom}%`;
        img.style.maxWidth = 'none';
        img.style.height = 'auto';
      }
    });
    root.classList.toggle('is-zoomed', effectiveZoom > 1.01);
  });
  return true;
}
function resetPagedScrollPosition() {
  const root = $('#readerBody');
  if (!root || !isPagedMode()) return;
  root.scrollTop = 0;
  root.scrollLeft = state.zoom > 1.01 ? Math.max(0, (root.scrollWidth - root.clientWidth) / 2) : 0;
}
async function zoomAtPoint(value, clientX, clientY) {
  const root = $('#readerBody');
  if (!root || !isPagedMode()) return setZoom(value);
  const rect = root.getBoundingClientRect();
  const ratioX = root.scrollWidth > 0 ? (root.scrollLeft + clientX - rect.left) / root.scrollWidth : .5;
  const ratioY = root.scrollHeight > 0 ? (root.scrollTop + clientY - rect.top) / root.scrollHeight : .5;
  await setZoom(value);
  requestAnimationFrame(() => {
    const x = ratioX * root.scrollWidth - (clientX - rect.left);
    const y = ratioY * root.scrollHeight - (clientY - rect.top);
    root.scrollLeft = Math.max(0, x);
    root.scrollTop = Math.max(0, y);
  });
}

async function setZoom(value) {
  const next = Math.max(.6, Math.min(3, Math.round(value * 10) / 10));
  if (next === state.zoom) return;
  state.zoom = next;
  updateReaderPrefsUI();
  if (!isPagedMode() || !state.pages.length) return;
  if (applyImageZoomWithoutRender()) return;
  await renderReaderPages();
}
$('#zoomOutBtn').addEventListener('click', () => setZoom(state.zoom - .2));
$('#zoomInBtn').addEventListener('click', () => setZoom(state.zoom + .2));
$('#zoomLabel').addEventListener('click', () => setZoom(1));
$('#fullscreenBtn').addEventListener('click', () => { closeReaderControls(false); showReaderChrome(true); document.fullscreenElement ? document.exitFullscreen() : $('#reader').requestFullscreen?.(); });
function stopAutoScroll() {
  if (state.autoScrollId) cancelAnimationFrame(state.autoScrollId);
  state.autoScrollId = 0; state.autoScrollLast = 0; updateReaderPrefsUI();
}
function autoScrollFrame(ts) {
  if (!state.autoScrollId || !isVerticalMode() || $('#reader').classList.contains('hidden')) return stopAutoScroll();
  if (!state.autoScrollLast) state.autoScrollLast = ts;
  const dt = Math.min(50, ts - state.autoScrollLast); state.autoScrollLast = ts;
  const root = $('#readerBody');
  root.scrollTop += (Number(prefs.autoScrollSpeed || 46) * dt) / 1000;
  if (root.scrollTop + root.clientHeight >= root.scrollHeight - 3) return stopAutoScroll();
  state.autoScrollId = requestAnimationFrame(autoScrollFrame);
}
function toggleAutoScroll() {
  if (!isVerticalMode()) return;
  if (state.autoScrollId) return stopAutoScroll();
  state.autoScrollLast = 0; state.autoScrollId = requestAnimationFrame(autoScrollFrame); updateReaderPrefsUI();
}
$('#autoScrollBtn')?.addEventListener('click', toggleAutoScroll);
$('#themeBtn').addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
  storageSet(LS.theme, document.documentElement.classList.contains('light') ? 'light' : 'dark');
});

$('#cancelLargeBtn').addEventListener('click', () => { state.largePending = null; $('#largeFileModal').classList.add('hidden'); });
$('#continueLargeBtn').addEventListener('click', async () => {
  const item = state.largePending; state.largePending = null; $('#largeFileModal').classList.add('hidden'); if (item) await openItem(item, true);
});

document.addEventListener('keydown', e => {
  const settingsOpen = !$('#settingsModal').classList.contains('hidden');
  const largeOpen = !$('#largeFileModal').classList.contains('hidden');
  const driveOpen = !$('#driveModal').classList.contains('hidden');
  if (settingsOpen) { if (e.key === 'Escape') closeSettings(); return; }
  if (driveOpen) { if (e.key === 'Escape') closeDriveModal(); return; }
  if (largeOpen) {
    if (e.key === 'Escape') { state.largePending = null; $('#largeFileModal').classList.add('hidden'); }
    return;
  }
  if (e.target?.matches?.('input,select,textarea,[contenteditable="true"]')) return;
  if ($('#reader').classList.contains('hidden')) return;
  if (e.key === 'Escape') { closeReader(); return; }
  if (isPagedMode() && ['ArrowRight','ArrowLeft','PageDown','PageUp','Home','End'].includes(e.key)) e.preventDefault();
  if (isPagedMode() && e.key === 'ArrowRight') setPage(state.direction === 'rtl' ? prevPageIndex() : nextPageIndex());
  if (isPagedMode() && e.key === 'ArrowLeft') setPage(state.direction === 'rtl' ? nextPageIndex() : prevPageIndex());
  if (isPagedMode() && e.key === 'PageDown') setPage(nextPageIndex());
  if (isPagedMode() && e.key === 'PageUp') setPage(prevPageIndex());
  if (isPagedMode() && e.key === 'Home') setPage(0);
  if (isPagedMode() && e.key === 'End') setPage(Math.max(0, state.pages.length - 1));
  if (isPagedMode() && (e.key === '+' || e.key === '=')) setZoom(state.zoom + .2);
  if (isPagedMode() && e.key === '-') setZoom(state.zoom - .2);
  if (isPagedMode() && e.key === '0') setZoom(1);
  if (e.key.toLowerCase() === 'f') document.fullscreenElement ? document.exitFullscreen() : $('#reader').requestFullscreen?.();
  if (e.key.toLowerCase() === 'm') $('#modeBtn').click();
  if (e.key.toLowerCase() === 'd') $('#directionBtn').click();
  if (e.key.toLowerCase() === 'b') togglePageBookmark();
  if (e.key.toLowerCase() === 'i') setImmersive();
  if (e.key.toLowerCase() === 'a') $('#displayBtn')?.click();
  if (e.key === '?') toast('Atalhos: ←/→ ou PgUp/PgDn páginas • Home/End início/fim • +/- zoom • 0 reset • F tela cheia • M modo • D direção • Esc sair');
});

function flipDragIntent(dx) {
  if (!dx) return '';
  const physical = dx < 0 ? 'left' : 'right';
  if (state.direction === 'rtl') return physical === 'right' ? 'next' : 'prev';
  return physical === 'left' ? 'next' : 'prev';
}
function flipDragPage(intent) {
  const stage = $('.flipbook-stage');
  if (!stage || !intent) return null;
  const rtl = state.direction === 'rtl';
  const side = intent === 'next' ? (rtl ? 'left' : 'right') : (rtl ? 'right' : 'left');
  return stage.querySelector(`.flipbook-page-${side}`) || stage.querySelector('.flipbook-page');
}
function clearFlipDragPreview(snap = true) {
  const stage = $('.flipbook-stage');
  const page = stage?.querySelector('.flipbook-page.is-live-flip');
  if (page) {
    if (snap) page.classList.add('flip-snapback');
    page.style.removeProperty('transform');
    page.style.removeProperty('filter');
    page.classList.remove('is-live-flip');
    if (snap) setTimeout(() => page.classList.remove('flip-snapback'), 190);
  }
  stage?.classList.remove('is-dragging', 'drag-next', 'drag-prev');
  stage?.style.removeProperty('--flip-progress');
}
function updateFlipDragPreview(clientX) {
  if (!state.flipDrag || effectiveMode() !== 'spread' || state.zoom > 1.01) return;
  const stage = $('.flipbook-stage'); if (!stage) return;
  const dx = clientX - state.flipDrag.startX;
  state.flipDrag.dx = dx;
  const intent = flipDragIntent(dx);
  const old = stage.querySelector('.flipbook-page.is-live-flip');
  const page = flipDragPage(intent);
  if (!page || Math.abs(dx) < 4) { clearFlipDragPreview(false); return; }
  if (old && old !== page) { old.style.removeProperty('transform'); old.style.removeProperty('filter'); old.classList.remove('is-live-flip'); }
  const width = Math.max(180, stage.getBoundingClientRect().width * .5);
  const progress = Math.min(1, Math.abs(dx) / width);
  const angle = Math.min(82, progress * 92);
  const rtl = state.direction === 'rtl';
  const side = page.classList.contains('flipbook-page-left') ? 'left' : 'right';
  const sign = side === 'right' ? -1 : 1;
  page.classList.add('is-live-flip');
  page.style.transform = `rotateY(${sign * angle}deg) translateZ(1px)`;
  page.style.filter = `brightness(${1 - progress * .22})`;
  stage.classList.add('is-dragging');
  stage.classList.toggle('drag-next', intent === 'next');
  stage.classList.toggle('drag-prev', intent === 'prev');
  stage.style.setProperty('--flip-progress', progress.toFixed(3));
}
async function finishFlipDrag(clientX, clientY = null) {
  const drag = state.flipDrag; state.flipDrag = null;
  if (!drag) return false;
  const dx = clientX - drag.startX;
  const dy = clientY == null ? 0 : clientY - drag.startY;
  const elapsed = Math.max(1, Date.now() - drag.time);
  const velocity = Math.abs(dx) / elapsed;
  const shouldTurn = Math.abs(dx) >= 58 && Math.abs(dx) > Math.abs(dy) * 1.15 || velocity > .7 && Math.abs(dx) > 28;
  const intent = flipDragIntent(dx);
  clearFlipDragPreview(!shouldTurn);
  if (!shouldTurn || !intent) return false;
  state.lastFlipDragAt = Date.now();
  state.lastSwipeAt = Date.now();
  await setPage(intent === 'next' ? nextPageIndex() : prevPageIndex());
  return true;
}
$('#readerBody').addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || effectiveMode() !== 'spread' || !state.pages.length || state.zoom > 1.01 || e.target.closest('button,a')) return;
  const stage = e.target.closest('.flipbook-stage:not(.single-wide)');
  if (!stage) return;
  state.flipDrag = { startX:e.clientX, startY:e.clientY, dx:0, time:Date.now(), pointerId:e.pointerId };
  try { $('#readerBody').setPointerCapture(e.pointerId); } catch {}
});
$('#readerBody').addEventListener('pointermove', e => {
  if (!state.flipDrag || state.flipDrag.pointerId !== e.pointerId) return;
  const dx = e.clientX - state.flipDrag.startX, dy = e.clientY - state.flipDrag.startY;
  if (Math.abs(dx) < 5 || Math.abs(dx) < Math.abs(dy)) return;
  e.preventDefault();
  updateFlipDragPreview(e.clientX);
});
$('#readerBody').addEventListener('pointerup', e => {
  if (!state.flipDrag || state.flipDrag.pointerId !== e.pointerId) return;
  finishFlipDrag(e.clientX, e.clientY).catch(() => {});
});
$('#readerBody').addEventListener('pointercancel', () => { state.flipDrag = null; clearFlipDragPreview(true); });

$('#readerBody').addEventListener('click', e => {
  if (!state.pages.length || e.target.closest('button,a,input,select') || (Date.now() - Number(state.lastSwipeAt || 0) < 450) || (Date.now() - Number(state.lastFlipDragAt || 0) < 450)) return;
  const rect = $('#readerBody').getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
  const mobile = performanceProfile().mobile;

  if (isVerticalMode()) {
    if (mobile && ratio > .22 && ratio < .78) toggleReaderChrome();
    return;
  }
  if (!isPagedMode()) return;

  if (ratio > .35 && ratio < .65) {
    if (mobile) toggleReaderChrome();
    return;
  }
  if (state.zoom > 1.01) {
    if (mobile) showReaderChrome(true);
    return;
  }
  const leftZone = ratio <= .35;
  const next = state.direction === 'rtl' ? leftZone : !leftZone;
  if (mobile) scheduleReaderChromeHide(900);
  setPage(next ? nextPageIndex() : prevPageIndex());
});
$('#readerBody').addEventListener('dblclick', e => { if (isPagedMode() && e.target.closest('img,canvas')) { e.preventDefault(); zoomAtPoint(state.zoom <= 1.01 ? 1.8 : 1, e.clientX, e.clientY); } });
$('#readerBody').addEventListener('touchstart', e => {
  if (!isPagedMode() || !state.pages.length) return;
  if (e.touches.length === 2) {
    const [a,b] = e.touches;
    state.pinch = { distance: Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY), zoom: state.zoom, target: state.zoom };
    state.touchStart = null; state.flipDrag = null; clearFlipDragPreview(false);
    return;
  }
  if (e.touches.length !== 1) return;
  const t = e.touches[0]; state.touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
  if (state.zoom > 1.01) return;
  if (effectiveMode() === 'spread' && e.target.closest('.flipbook-stage:not(.single-wide)')) state.flipDrag = { startX:t.clientX, startY:t.clientY, dx:0, time:Date.now(), pointerId:null };
}, { passive: true });
$('#readerBody').addEventListener('touchmove', e => {
  if (state.pinch && e.touches.length === 2) {
    e.preventDefault();
    const [a,b] = e.touches;
    const distance = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
    const target = Math.max(.6, Math.min(3, state.pinch.zoom * (distance / Math.max(1,state.pinch.distance))));
    state.pinch.target = target;
    $('#zoomLabel').textContent = `${Math.round(target * 100)}%`;
    if (extType(state.current || {}) !== 'pdf') applyImageZoomWithoutRender(target);
    return;
  }
  if (state.flipDrag && e.touches.length === 1 && effectiveMode() === 'spread' && state.zoom <= 1.01) {
    const t = e.touches[0];
    const dx = t.clientX - state.flipDrag.startX, dy = t.clientY - state.flipDrag.startY;
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      updateFlipDragPreview(t.clientX);
    }
  }
}, { passive:false });
$('#readerBody').addEventListener('touchend', e => {
  if (state.pinch && e.touches.length < 2) {
    const target = state.pinch.target; state.pinch = null; state.touchStart = null;
    setZoom(target); return;
  }
  const start = state.touchStart; state.touchStart = null;
  const t = e.changedTouches?.[0]; if (!t) { state.flipDrag = null; clearFlipDragPreview(true); return; }
  if (start && isPagedMode() && e.target.closest('img,canvas') && Date.now() - start.time < 280) {
    const rootRect = $('#readerBody').getBoundingClientRect();
    const ratio = (t.clientX - rootRect.left) / Math.max(1, rootRect.width);
    const last = state.lastTouchTap;
    const isDouble = last && Date.now() - last.time < 330 && Math.hypot(t.clientX - last.x, t.clientY - last.y) < 32;
    state.lastTouchTap = { x:t.clientX, y:t.clientY, time:Date.now() };
    if (isDouble && ratio > .18 && ratio < .82) {
      state.lastTouchTap = null;
      state.lastSwipeAt = Date.now();
      state.flipDrag = null; clearFlipDragPreview(false);
      zoomAtPoint(state.zoom <= 1.01 ? 1.8 : 1, t.clientX, t.clientY);
      return;
    }
  }
  if (state.flipDrag && effectiveMode() === 'spread') {
    finishFlipDrag(t.clientX, t.clientY).catch(() => {});
    return;
  }
  if (!start || !isPagedMode() || !state.pages.length || state.zoom > 1.01) return;
  const dx = t.clientX - start.x, dy = t.clientY - start.y;
  const minSwipe = effectiveMode() === 'page' ? 38 : 55;
  if (Date.now() - start.time > 700 || Math.abs(dx) < minSwipe || Math.abs(dx) < Math.abs(dy) * 1.18) return;
  const swipeLeft = dx < 0;
  const next = state.direction === 'rtl' ? !swipeLeft : swipeLeft;
  state.lastSwipeAt = Date.now();
  setPage(next ? nextPageIndex() : prevPageIndex());
}, { passive: true });

function exportReaderData() {
  const data = { app: 'Manga-HQ-hub', version: CONFIG.appVersion || '0.3.7', exportedAt: new Date().toISOString(), favorites: [...favorites], progress, prefs, bookmarks, displayPrefs, itemReaderPrefs };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'manga-hq-hub-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#exportDataBtn').addEventListener('click', exportReaderData);
$('#importDataBtn').addEventListener('click', () => $('#importDataInput').click());
$('#importDataInput').addEventListener('change', async e => {
  const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    favorites.clear(); for (const id of (data.favorites || [])) favorites.add(id);
    for (const key of Object.keys(progress)) delete progress[key]; Object.assign(progress, data.progress || {});
    Object.assign(prefs, data.prefs || {});
    for (const key of Object.keys(bookmarks)) delete bookmarks[key]; Object.assign(bookmarks, data.bookmarks || {});
    Object.assign(displayPrefs, data.displayPrefs || {});
    for (const key of Object.keys(itemReaderPrefs)) delete itemReaderPrefs[key]; Object.assign(itemReaderPrefs, data.itemReaderPrefs || {});
    saveFav(); saveProgress(); savePrefs(); saveBookmarks(); saveDisplayPrefs(); saveItemReaderPrefs(); applyDisplayPrefs();
    toast('Backup restaurado.'); closeSettings(); render();
  } catch { toast('Arquivo de backup inválido.'); }
});
$('#resetProgressBtn').addEventListener('click', () => {
  if (!confirm('Apagar todo o progresso de leitura? Os favoritos serão mantidos.')) return;
  for (const key of Object.keys(progress)) delete progress[key]; saveProgress(); render(); toast('Progresso apagado.');
});

let dragDepth = 0;
window.addEventListener('dragenter', e => { if (![...e.dataTransfer?.types || []].includes('Files')) return; e.preventDefault(); dragDepth++; $('#dropOverlay').classList.remove('hidden'); });
window.addEventListener('dragover', e => { if ([...e.dataTransfer?.types || []].includes('Files')) e.preventDefault(); });
window.addEventListener('dragleave', e => { if (![...e.dataTransfer?.types || []].includes('Files')) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#dropOverlay').classList.add('hidden'); });
window.addEventListener('drop', async e => { e.preventDefault(); dragDepth = 0; $('#dropOverlay').classList.add('hidden'); const file = e.dataTransfer?.files?.[0]; if (file) await openLocalSelected(file); });

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('#installBtn').classList.remove('hidden'); });
$('#installBtn').addEventListener('click', async () => {
  if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#installBtn').classList.add('hidden');
});

function releaseDistantPageCache() {
  resetPrefetchQueue();
  if (!state.pages.length) return;
  const keep = new Set(effectiveMode() === 'spread' ? spreadIndexes() : [state.page]);
  for (const [index, url] of [...state.pageUrls.entries()]) {
    if (keep.has(index)) continue;
    if (String(url).startsWith('blob:')) URL.revokeObjectURL(url);
    state.pageUrls.delete(index); state.pageUse.delete(index);
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    cleanupVerticalSlots(true);
    releaseDistantPageCache();
    if (isVerticalMode()) scheduleVerticalProgressSave();
  }
});
let readerResizeTimer = 0;
function handleReaderViewportChange() {
  if ($('#reader').classList.contains('hidden') || !state.pages.length) return;
  const root = $('#readerBody');
  const width = Math.round(root?.clientWidth || innerWidth);
  const height = Math.round(root?.clientHeight || innerHeight);
  const widthChanged = Math.abs(width - Number(state.readerViewportW || 0)) >= 20;
  const heightChanged = Math.abs(height - Number(state.readerViewportH || 0)) >= 90;
  state.readerViewportW = width; state.readerViewportH = height;
  if (!widthChanged && !heightChanged) return;
  if (extType(state.current || {}) !== 'pdf') return;
  clearTimeout(readerResizeTimer);
  readerResizeTimer = setTimeout(() => renderReaderPages().catch(() => {}), 240);
}
window.addEventListener('resize', handleReaderViewportChange, { passive:true });
window.visualViewport?.addEventListener?.('resize', handleReaderViewportChange, { passive:true });

if (storageGet(LS.theme) === 'light') document.documentElement.classList.add('light');
setNetworkStatus();
applyDisplayPrefs();
setupCatalogAutoLoad();
window.addEventListener('online', () => { setNetworkStatus();
applyDisplayPrefs(); warmReaderRuntimes().catch(() => {}); });
window.addEventListener('offline', setNetworkStatus);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(async reg => {
    reg.update().catch(() => {});
    try { await navigator.serviceWorker.ready; await new Promise(r => setTimeout(r, 250)); await warmReaderRuntimes(); } catch {}
  }).catch(() => { warmReaderRuntimes().catch(() => {}); });
} else warmReaderRuntimes().catch(() => {});
(async () => { await refreshOfflineIndex(); await updateOfflineStorageInfo(); await loadLibrary(); })();
