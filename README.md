# Manga-HQ-hub v0.2.8

Leitor de mangás e HQs para navegador e PWA, com acervo WebP conectado e suporte a PDF, CBR, CBZ, RAR e ZIP.

## Leitor

- Página única, Flipbook de duas páginas, Vertical e Webtoon.
- Leitura LTR/RTL.
- Zoom, ajuste de largura/altura, brilho, contraste e sépia.
- Swipe, toque, teclado, pinch zoom e arraste do Flipbook.
- Detecção de páginas panorâmicas no acervo WebP.
- PDF com limite adaptativo de pixels para reduzir uso de RAM.
- Cancelamento de renderizações antigas ao navegar rapidamente.
- Miniaturas carregadas sob demanda por proximidade da tela.

## Celular

- Cache de páginas reduzido conforme memória e tamanho da tela.
- Pré-carregamento adaptado à conexão e ao modo de economia de dados.
- Página única otimizada sem reconstruir o leitor a cada zoom.
- Flipbook com contenção de layout e animações mais leves.
- Limite mais conservador para CBR/CBZ grandes em aparelhos móveis.
- Download de arquivos grandes evita cópia integral extra quando o tamanho recebido é conhecido.

## Offline e PWA

- Progresso, favoritos, marcadores e preferências salvos localmente.
- PDF/CBR/CBZ/RAR podem ser salvos offline quando a fonte permite download.
- Edições WebP publicadas com `manifest.json` podem ser salvas completas offline, página por página.
- O Service Worker usa catálogo e manifestos em modo network-first para detectar novas HQs sem exigir duas atualizações.
- Motores PDF.js, JSZip e UnRAR são aquecidos e armazenados pelo cache do PWA após a primeira conexão.
- O app não tenta mais carregar arquivos `vendor/` inexistentes.

## Estrutura

- `js/app.js` — aplicação principal.
- `js/modules/offline-webp.js` — cache offline das edições WebP.
- `css/app.css` — interface geral.
- `css/reader.css` — estilos específicos do leitor.
- `sw.js` — PWA, cache e estratégias de rede.
- `tests/` — smoke test e validação do acervo.
- `.github/workflows/validate.yml` — validação automática a cada alteração na `main`.

## Acervo conectado

O Hub usa o catálogo publicado em:

https://jogoiarexx-blip.github.io/Manga-HQ-acervo-1/catalogo.json

Itens externos recebem uma data local de primeira detecção, permitindo que o filtro **Novos** funcione mesmo quando o catálogo antigo não possui `addedAt`.

## Validação

```bash
npm test
npm run validate:acervo
```

A validação principal verifica sintaxe, versão, PWA, CSP, arquivos de estilo e integração do módulo offline. A validação remota confere IDs duplicados, campos obrigatórios e contagem de páginas dos manifestos.
