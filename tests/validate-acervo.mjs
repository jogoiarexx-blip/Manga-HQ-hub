const CATALOG = 'https://jogoiarexx-blip.github.io/Manga-HQ-acervo-1/catalogo.json';
const required = ['id', 'title', 'cover', 'manifest', 'pageCount'];

const response = await fetch(CATALOG, { cache: 'no-store' });
if (!response.ok) throw new Error(`catalogo.json HTTP ${response.status}`);
const catalog = await response.json();
const items = Array.isArray(catalog.items) ? catalog.items : [];
if (Number(catalog.itemCount) !== items.length) throw new Error('itemCount diverge de items.length');

const ids = new Set();
for (const item of items) {
  for (const key of required) if (!item[key]) throw new Error(`${item.id || item.title || 'item'} sem ${key}`);
  if (ids.has(item.id)) throw new Error(`ID duplicado: ${item.id}`);
  ids.add(item.id);
}

let cursor = 0;
const failures = [];
async function worker() {
  while (cursor < items.length) {
    const item = items[cursor++];
    try {
      const manifestUrl = new URL(item.manifest, CATALOG).href;
      const r = await fetch(manifestUrl, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const manifest = await r.json();
      const pages = Array.isArray(manifest.pages) ? manifest.pages : [];
      if (Number(item.pageCount) !== pages.length) {
        throw new Error(`catálogo=${item.pageCount}, manifesto=${pages.length}`);
      }
      if (manifest.cover && !pages.includes(manifest.cover)) {
        throw new Error('capa não está na lista de páginas');
      }
    } catch (error) {
      failures.push(`${item.title}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 5 }, worker));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Acervo OK: ${items.length} HQs`);
