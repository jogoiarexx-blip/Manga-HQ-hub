export const WEBP_OFFLINE_CACHE = 'manga-hq-hub-webp-offline-v1';

function resolvePageUrls(manifestUrl, manifest) {
  const base = new URL('./', manifestUrl).href;
  const pages = Array.isArray(manifest?.pages) ? manifest.pages : [];
  return pages.map(name => new URL(String(name), base).href);
}

async function removeUrls(cache, urls) {
  await Promise.all((urls || []).map(url => cache.delete(url).catch(() => false)));
}

export async function cacheWebPageEdition({
  manifestUrl,
  signal,
  concurrency = 2,
  onProgress = () => {}
}) {
  if (!manifestUrl) throw new Error('Manifesto da edição não informado.');
  if (!('caches' in globalThis)) throw new Error('Cache Storage não está disponível neste navegador.');

  const cache = await caches.open(WEBP_OFFLINE_CACHE);
  const cachedUrls = [];
  let bytes = 0;
  let completed = 0;

  try {
    const manifestResponse = await fetch(manifestUrl, { cache: 'no-store', signal });
    if (!manifestResponse.ok) throw new Error(`Manifesto: HTTP ${manifestResponse.status}`);
    const manifestForCache = manifestResponse.clone();
    const manifest = await manifestResponse.json();
    const pageUrls = resolvePageUrls(manifestUrl, manifest);
    if (!pageUrls.length) throw new Error('O manifesto não possui páginas para salvar.');

    await cache.put(manifestUrl, manifestForCache);
    cachedUrls.push(manifestUrl);

    let cursor = 0;
    const workerCount = Math.max(1, Math.min(4, Number(concurrency) || 1));

    async function worker() {
      while (true) {
        if (signal?.aborted) throw new DOMException('Salvamento offline cancelado.', 'AbortError');
        const index = cursor++;
        if (index >= pageUrls.length) return;

        const url = pageUrls[index];
        const response = await fetch(url, { cache: 'reload', signal });
        if (!response.ok) throw new Error(`Página ${index + 1}: HTTP ${response.status}`);

        const length = Number(response.headers.get('content-length') || 0);
        if (Number.isFinite(length) && length > 0) bytes += length;

        await cache.put(url, response);
        cachedUrls.push(url);
        completed++;
        onProgress({ done: completed, total: pageUrls.length, bytes, page: index + 1 });
      }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return {
      manifest,
      pageCount: pageUrls.length,
      cachedUrls,
      size: bytes
    };
  } catch (error) {
    await removeUrls(cache, cachedUrls);
    throw error;
  }
}

export async function removeWebPageEditionCache(urls = []) {
  if (!('caches' in globalThis)) return;
  const cache = await caches.open(WEBP_OFFLINE_CACHE);
  await removeUrls(cache, urls);
}

export async function clearWebPageOfflineCache() {
  if (!('caches' in globalThis)) return;
  await caches.delete(WEBP_OFFLINE_CACHE);
}
