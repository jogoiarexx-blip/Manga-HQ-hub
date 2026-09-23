const APP_VERSION = '0.3.13';
const CACHE_PREFIX = 'manga-hq-hub-ghpages-';
const LEGACY_CACHE_PREFIXES = ['manga-hq-reader-ghpages-'];
const CACHE = `${CACHE_PREFIX}v${APP_VERSION}`;
const WEBP_OFFLINE_CACHE = 'manga-hq-hub-webp-offline-v1';
const REMOTE_IMAGE_CACHE = 'manga-hq-hub-remote-images-v1';
const BASE = new URL('./', self.location.href);

const CORE = [
  './',
  './index.html',
  `./css/app.css?v=${APP_VERSION}`,
  `./css/reader.css?v=${APP_VERSION}`,
  `./js/app.js?v=${APP_VERSION}`,
  './js/modules/offline-webp.js',
  `./config.js?v=${APP_VERSION}`,
  './data/catalog.json',
  './manifest.webmanifest',
  './icon-64.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
].map(path => new URL(path, BASE).href);

const RUNTIME_URLS = [
  'https://esm.sh/pdfjs-dist@6.3.289/build/pdf.mjs',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.mjs',
  'https://esm.sh/jszip@3.10.1',
  'https://esm.sh/node-unrar-js@2.0.2?bundle',
  'https://cdn.jsdelivr.net/npm/node-unrar-js@2.0.2/esm/js/unrar.wasm'
];

async function cacheReaderRuntimes(cache) {
  await Promise.allSettled(RUNTIME_URLS.map(async url => {
    const response = await fetch(url, { mode:'cors', cache:'reload' });
    if (response.ok) await cache.put(url, response);
  }));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => (key.startsWith(CACHE_PREFIX) && key !== CACHE) || LEGACY_CACHE_PREFIXES.some(prefix => key.startsWith(prefix)))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function offlineWebpMatch(request) {
  try {
    const cache = await caches.open(WEBP_OFFLINE_CACHE);
    return await cache.match(request);
  } catch {
    return null;
  }
}

async function cacheMatch(request) {
  const offline = await offlineWebpMatch(request);
  if (offline) return offline;
  const cache = await caches.open(CACHE);
  return (await cache.match(request)) || (await cache.match(request, { ignoreSearch:true }));
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cacheMatch(request)) ||
      (request.mode === 'navigate' ? cache.match(new URL('./index.html', BASE).href) : Response.error());
  }
}

async function staleWhileRevalidate(request) {
  const offline = await offlineWebpMatch(request);
  if (offline) return offline;
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(async response => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await fresh) || Response.error();
}

async function acervoPage(request) {
  const offline = await offlineWebpMatch(request);
  if (offline) return offline;
  try {
    return await fetch(request);
  } catch {
    return Response.error();
  }
}

async function remoteImage(request) {
  const cache = await caches.open(REMOTE_IMAGE_CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(async response => {
    if (response.ok || response.type === 'opaque') {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      const maxEntries = 160;
      if (keys.length > maxEntries) {
        await Promise.all(keys.slice(0, keys.length - maxEntries).map(key => cache.delete(key)));
      }
    }
    return response;
  }).catch(() => null);
  return cached || (await fresh) || Response.error();
}

const RUNTIME_CDN_ORIGINS = new Set(['https://esm.sh', 'https://cdn.jsdelivr.net']);
const RAW_GITHUB_ORIGIN = 'https://raw.githubusercontent.com';

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (RUNTIME_CDN_ORIGINS.has(url.origin)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (url.origin === RAW_GITHUB_ORIGIN) {
    if (/\.(?:avif|webp|png|jpe?g|gif)$/i.test(url.pathname)) {
      event.respondWith(remoteImage(event.request));
      return;
    }
    if (/\.json$/i.test(url.pathname)) {
      event.respondWith(networkFirst(event.request));
      return;
    }
    // PDFs ficam fora do Cache Storage automático para não duplicar arquivos grandes.
    return;
  }

  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate';
  const isFreshJson = /\/(?:catalogo|manifest|series)\.json$/i.test(url.pathname) || url.pathname.endsWith('/data/catalog.json');
  const isFreshAppAsset = /\/(?:config\.js|js\/app\.js|css\/app\.css|css\/reader\.css)$/i.test(url.pathname);
  const isAcervoPage = /\/Manga-HQ-acervo-[^/]+\/.*\.(?:avif|webp|png|jpe?g|gif)$/i.test(url.pathname);

  if (isNavigation || isFreshJson || isFreshAppAsset) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isAcervoPage) {
    event.respondWith(acervoPage(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});
