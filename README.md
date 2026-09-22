# Manga-HQ-hub v0.2.9

Leitor de mangás e HQs para navegador e PWA, com acervo WebP conectado e suporte a PDF, CBR, CBZ, RAR e ZIP.

## v0.2.9 — leitura mobile refinada

- Duplo toque/duplo clique amplia a página para 180% no ponto tocado.
- O segundo duplo toque volta para 100%.
- Pinch zoom em imagens dá resposta visual durante o gesto.
- Nova opção **Manter o mesmo zoom entre páginas**.
- Ao manter o zoom, a nova página abre centralizada horizontalmente.
- Páginas panorâmicas passam a ser reconhecidas dinamicamente também quando as dimensões são descobertas em PDF, CBR/CBZ, RAR/ZIP ou imagens sem dimensões no manifesto.
- O Flipbook agora diferencia **capa**, **página normal solitária**, **duas páginas** e **panorâmica**.
- A última página sem par não usa mais o tamanho visual reduzido reservado à capa.
- Mantidas todas as otimizações de memória, miniaturas lazy, offline WebP e PWA da v0.2.8.

## Leitor

- Página única, Flipbook de duas páginas, Vertical e Webtoon.
- Leitura LTR/RTL.
- Zoom, ajuste de largura/altura, brilho, contraste e sépia.
- Swipe, toque, teclado, pinch zoom e arraste do Flipbook.
- Detecção de páginas panorâmicas.
- PDF com limite adaptativo de pixels.
- Cancelamento de renderizações antigas ao navegar rapidamente.
- Miniaturas carregadas sob demanda por proximidade da tela.

## Celular

- Cache de páginas reduzido conforme memória e tamanho da tela.
- Pré-carregamento adaptado à conexão e ao modo de economia de dados.
- Página única sem reconstruir o leitor a cada zoom de imagem.
- Flipbook com contenção de layout e animações mais leves.
- Limite conservador para CBR/CBZ grandes.
- Download de arquivos grandes evita cópia integral extra quando possível.

## Offline e PWA

- Progresso, favoritos, marcadores e preferências salvos localmente.
- PDF/CBR/CBZ/RAR podem ser salvos offline quando a fonte permite download.
- Edições WebP com `manifest.json` podem ser salvas completas offline.
- Catálogo e manifestos usam network-first para detectar novas HQs imediatamente.
- PDF.js, JSZip e UnRAR são armazenados pelo cache do PWA após a primeira conexão.

## Estrutura

- `js/app.js` — aplicação principal.
- `js/modules/offline-webp.js` — cache offline de edições WebP.
- `css/app.css` — interface geral.
- `css/reader.css` — estilos do leitor.
- `sw.js` — PWA e estratégias de cache.
- `tests/` — smoke test e validação do acervo.
- `.github/workflows/validate.yml` — validação automática.

## Acervo conectado

https://jogoiarexx-blip.github.io/Manga-HQ-acervo-1/catalogo.json

## Validação

```bash
npm test
npm run validate:acervo
```


## Formatos do acervo externo

O Hub aceita WebP por páginas e PDF no mesmo `catalogo.json`.

Exemplo WebP:

```json
{
  "id": "hq-1",
  "title": "HQ #1",
  "format": "webp-pages",
  "cover": "colecoes/hq/01/001.webp",
  "manifest": "colecoes/hq/01/manifest.json"
}
```

Exemplo PDF:

```json
{
  "id": "hq-29",
  "title": "HQ #29",
  "format": "pdf",
  "file": "https://raw.githubusercontent.com/USUARIO/REPOSITORIO/main/colecoes/hq/29/HQ-29.pdf",
  "cover": "https://raw.githubusercontent.com/USUARIO/REPOSITORIO/main/colecoes/hq/29/capa.webp"
}
```

PDFs externos são abertos pelo PDF.js do próprio Manga-HQ-hub e também podem ser salvos para leitura offline quando o servidor permite CORS. No Manga-HQ-acervo-1, use a URL `raw.githubusercontent.com` para o campo `file`, pois a pasta pesada de HQs não faz parte do pacote do GitHub Pages.
