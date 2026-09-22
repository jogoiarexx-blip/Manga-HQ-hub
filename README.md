# Manga-HQ-hub v0.3.1

Leitor de mangás e HQs para navegador e PWA, com acervo externo conectado e suporte a WebP por páginas, PDF, CBR, CBZ, RAR e ZIP.

## v0.3.1 — navegação mobile + compatibilidade do acervo externo

- O botão **Voltar** do Android/navegador fecha primeiro o leitor.
- Vertical e Webtoon salvam a posição dentro da página atual.
- Trocas rápidas de página são agrupadas para evitar renderizações concorrentes.
- Prefetch com fila controlada: 1 tarefa no celular e até 2 no desktop.
- Ao colocar o app em segundo plano, blobs distantes são liberados da memória.
- Mantido suporte a PDF externo via `file`/`fileUrl`.
- CSP atualizada para permitir arquivos e capas hospedados em `raw.githubusercontent.com`.
- Validador do acervo agora aceita tanto WebP por manifesto quanto PDFs externos.

## Formatos do acervo externo

### WebP por páginas

```json
{
  "id": "hq-1",
  "title": "HQ #1",
  "format": "webp-pages",
  "cover": "colecoes/hq/01/001.webp",
  "manifest": "colecoes/hq/01/manifest.json",
  "pageCount": 24
}
```

### PDF externo

```json
{
  "id": "hq-29",
  "title": "HQ #29",
  "format": "pdf",
  "file": "https://raw.githubusercontent.com/USUARIO/REPOSITORIO/main/colecoes/hq/29/HQ-29.pdf",
  "cover": "https://raw.githubusercontent.com/USUARIO/REPOSITORIO/main/colecoes/hq/29/capa.webp"
}
```

PDFs externos são abertos pelo PDF.js do Manga-HQ-hub e podem ser salvos offline quando o servidor permite CORS. No Manga-HQ-acervo-1, prefira `raw.githubusercontent.com` para arquivos pesados que não façam parte do pacote servido pelo GitHub Pages.

## Leitor

- Página única, Flipbook, Vertical e Webtoon.
- LTR/RTL.
- Duplo toque no ponto tocado, pinch zoom e opção de manter zoom entre páginas.
- Detecção de panorâmicas em WebP, PDF e páginas extraídas.
- Miniaturas lazy.
- PDF com limite adaptativo de pixels.
- Cancelamento de renderizações antigas.

## Offline e PWA

- HQs WebP podem ser salvas completas offline.
- PDF/CBR/CBZ/RAR podem ser salvos offline quando a fonte permite.
- Catálogo e manifestos usam network-first.
- PDF.js, JSZip e UnRAR ficam disponíveis no cache do PWA após a primeira conexão.

## Validação

```bash
npm test
npm run validate:acervo
```
