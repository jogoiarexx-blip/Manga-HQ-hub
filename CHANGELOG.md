# Changelog — Manga-HQ-hub

## 0.3.18 — núcleo não bloqueante

- Remove espera de `destroy()` do caminho de abertura/troca de HQ.
- Adiciona fila de limpeza de PDF, blobs, imagens pré-decodificadas e DOM em `requestIdleCallback`.
- Evita reconstrução pesada da biblioteca imediatamente ao sair.
- Corrige corrida de `pdfjs.getDocument()` que podia sobrescrever o PDF novo.
- Rastreia e cancela `pdfLoadingTask` separadamente.
- Corrige corrida entre `history.back()` do leitor anterior e abertura imediata de outro livro.
- Adiciona janela vertical de PDF menor no celular.
- Adiciona manutenção periódica de memória do PDF.js.
- Adiciona fast pass de renderização de PDF no celular e upgrade de qualidade em repouso.
- Desativa staging de canvas duplo em aparelhos pequenos/econômicos/com pressão de memória.

## 0.3.17 — troca rápida e limpeza segura

- Corrige condição de corrida entre fechamento de um PDF e abertura de outra HQ.
- Grava o progresso antes de trocar de edição.
- Desanexa referências do PDF antes da destruição assíncrona.

## 0.3.16 — botão Sair e fechamento confiável

- Substitui a seta de retorno por botão textual **Sair**.
- Fecha visualmente o leitor antes da limpeza pesada.
