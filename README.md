# Manga-HQ-hub v0.2.10

Leitor de mangás e HQs para navegador e PWA, com acervo WebP conectado e suporte a PDF, CBR, CBZ, RAR e ZIP.

## v0.2.10 — navegação e continuidade no celular

- O botão **Voltar** do navegador/Android fecha primeiro o leitor, em vez de abandonar o site.
- Vertical e Webtoon agora salvam também a posição dentro da página atual.
- Ao reabrir uma HQ, o app volta mais próximo do ponto exato onde a leitura parou.
- Trocas rápidas de página são agrupadas: somente o último destino pendente é processado.
- O prefetch agora usa fila controlada, com no máximo 1 tarefa simultânea no celular e 2 no desktop.
- Ao colocar o app em segundo plano, páginas extraídas distantes são liberadas da memória.
- O prefetch pendente é descartado quando a leitura muda, evitando trabalho inútil e picos de RAM.
- Mantidas as melhorias de zoom, panorâmicas, offline WebP e Flipbook da v0.2.9.

## Leitor

- Página única, Flipbook, Vertical e Webtoon.
- LTR/RTL.
- Duplo toque no ponto tocado, pinch zoom, opção de manter zoom entre páginas.
- Detecção de panorâmicas em WebP, PDF e páginas extraídas.
- Miniaturas lazy.
- PDF com limite adaptativo de pixels.
- Cancelamento de renderizações antigas.

## Celular

- Cache e prefetch adaptativos.
- Navegação concorrente coalescida.
- Retorno do Android integrado ao leitor.
- Persistência mais precisa no Vertical/Webtoon.
- Liberação de blobs ao ocultar o app.
- CBR/CBZ grandes com limite conservador.

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
