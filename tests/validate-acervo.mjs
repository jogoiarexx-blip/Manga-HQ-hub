const CATALOGS = [
  'https://jogoiarexx-blip.github.io/Manga-HQ-acervo-1/catalogo.json',
  'https://jogoiarexx-blip.github.io/Manga-HQ-acervo-2/catalogo.json'
];

async function validateCatalog(CATALOG) {
  const response = await fetch(CATALOG, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${CATALOG}: catalogo.json HTTP ${response.status}`);
  const catalog = await response.json();
  const items = Array.isArray(catalog.items) ? catalog.items : [];
  if (Number(catalog.itemCount) !== items.length) throw new Error(`${CATALOG}: itemCount diverge de items.length`);

  const ids = new Set();
  for (const item of items) {
    for (const key of ['id','title','cover']) if (!item[key]) throw new Error(`${CATALOG}: ${item.id || item.title || 'item'} sem ${key}`);
    if (ids.has(item.id)) throw new Error(`${CATALOG}: ID duplicado: ${item.id}`);
    ids.add(item.id);

    const format = String(item.format || item.readerType || 'webp-pages').toLowerCase();
    const isPdf = format === 'pdf' || String(item.file || item.fileUrl || '').toLowerCase().split(/[?#]/)[0].endsWith('.pdf');
    if (isPdf) {
      if (!(item.file || item.fileUrl || item.url)) throw new Error(`${CATALOG}: ${item.id} PDF sem campo file/fileUrl`);
    } else {
      if (!item.manifest) throw new Error(`${CATALOG}: ${item.id} WebP sem manifest`);
      if (!Number(item.pageCount)) throw new Error(`${CATALOG}: ${item.id} WebP sem pageCount`);
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
        const coverUrl = new URL(item.cover, CATALOG).href;
        const coverResponse = await fetch(coverUrl, { method:'HEAD', cache:'no-store' });
        if (!coverResponse.ok) throw new Error(`capa HTTP ${coverResponse.status}`);

        if (isPdf) {
          const fileUrl = new URL(fileValue, CATALOG).href;
          const r = await fetch(fileUrl, { method:'HEAD', cache:'no-store' });
          if (!r.ok) throw new Error(`PDF HTTP ${r.status}`);
          continue;
        }

        const manifestUrl = new URL(item.manifest, CATALOG).href;
        const r = await fetch(manifestUrl, { cache:'no-store' });
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

  await Promise.all(Array.from({ length: 6 }, worker));
  if (failures.length) throw new Error(`${CATALOG}\n${failures.join('\n')}`);

  const pdfs = items.filter(item => {
    const format = String(item.format || item.readerType || 'webp-pages').toLowerCase();
    const file = String(item.file || item.fileUrl || item.url || '').toLowerCase().split(/[?#]/)[0];
    return format === 'pdf' || file.endsWith('.pdf');
  }).length;

  console.log(`Acervo OK: ${CATALOG} • ${items.length} HQs • ${pdfs} PDF(s) • ${items.length - pdfs} WebP`);
  return items.length;
}

let total = 0;
for (const catalog of CATALOGS) total += await validateCatalog(catalog);
console.log(`Validação completa: ${CATALOGS.length} acervos • ${total} HQs`);
