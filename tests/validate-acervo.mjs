const CATALOG = 'https://jogoiarexx-blip.github.io/Manga-HQ-acervo-1/catalogo.json';

const response = await fetch(CATALOG, { cache: 'no-store' });
if (!response.ok) throw new Error(`catalogo.json HTTP ${response.status}`);
const catalog = await response.json();
const items = Array.isArray(catalog.items) ? catalog.items : [];
if (Number(catalog.itemCount) !== items.length) throw new Error('itemCount diverge de items.length');

const ids = new Set();
for (const item of items) {
  for (const key of ['id','title','cover']) if (!item[key]) throw new Error(`${item.id || item.title || 'item'} sem ${key}`);
  if (ids.has(item.id)) throw new Error(`ID duplicado: ${item.id}`);
  ids.add(item.id);

  const format = String(item.format || item.readerType || 'webp-pages').toLowerCase();
  const isPdf = format === 'pdf' || String(item.file || item.fileUrl || '').toLowerCase().split(/[?#]/)[0].endsWith('.pdf');
  if (isPdf) {
    if (!(item.file || item.fileUrl || item.url)) throw new Error(`${item.id} PDF sem campo file/fileUrl`);
  } else {
    if (!item.manifest) throw new Error(`${item.id} WebP sem manifest`);
    if (!Number(item.pageCount)) throw new Error(`${item.id} WebP sem pageCount`);
  }
}

let cursor = 0;
const failures = [];
async function worker() {
  while (cursor < items.length) {
    const item = items[cursor++];
    const format = String(item.format || item.readerType || 'webp-pages').toLowerCase();
    const fileValue = item.file || item.fileUrl || item.url || '';
    const isPdf = format === 'pdf' || String(fileValue).toLowerCase().split(/[?#]/)[0].endsWith('.pdf');
    try {
      if (isPdf) {
        const fileUrl = new URL(fileValue, CATALOG).href;
        const r = await fetch(fileUrl, { method:'HEAD', cache:'no-store' });
        if (!r.ok) throw new Error(`PDF HTTP ${r.status}`);
        continue;
      }

      const manifestUrl = new URL(item.manifest, CATALOG).href;
      const r = await fetch(manifestUrl, { cache: 'no-store' });
      if (!r.ok) throw new Error(`manifest HTTP ${r.status}`);
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

const pdfs = items.filter(item => {
  const format = String(item.format || item.readerType || 'webp-pages').toLowerCase();
  const file = String(item.file || item.fileUrl || item.url || '').toLowerCase().split(/[?#]/)[0];
  return format === 'pdf' || file.endsWith('.pdf');
}).length;
console.log(`Acervo OK: ${items.length} HQs • ${pdfs} PDF(s) • ${items.length - pdfs} WebP`);
