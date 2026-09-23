# Manga-HQ-hub v0.3.18

Leitor/PWA de mangás e HQs otimizado para celular.

## v0.3.18 — núcleo não bloqueante

### Abrir outro livro imediatamente após Sair

O fechamento agora é dividido em duas fases:

1. **desanexar imediatamente** o documento, canvases, cache de páginas, prefetch e tarefas do leitor;
2. **liberar memória em segundo plano**, usando uma fila que espera uma janela ociosa do navegador.

O botão **Sair** não espera mais `PDFDocument.destroy()`, limpeza de canvases ou reconstrução completa da biblioteca.

A biblioteca também não é reconstruída no mesmo instante do fechamento. O catálogo já visível continua clicável e a atualização de progresso é feita depois, sem bloquear o próximo toque.

### Corrida de PDF carregando

A tarefa `pdfjs.getDocument()` agora é rastreada separadamente.

Um PDF antigo que terminar de carregar depois que você saiu:
- não pode mais sobrescrever `state.pdfDoc`;
- não pode limpar o PDF do livro novo;
- é enviado para a fila de descarte;
- tem o carregamento cancelado sem travar a interface.

### Histórico seguro ao reabrir rápido

O `history.back()` do botão **Sair** agora possui estado de assentamento.

Se outro livro for aberto antes do `popstate` anterior chegar, a nova leitura continua aberta e recebe uma nova entrada de histórico somente depois que o fechamento anterior terminar.

### Menos RAM em PDFs longos

- janela vertical de PDF reduzida no celular;
- cache de páginas de quadrinhos reduzido em aparelhos móveis;
- limpeza periódica de recursos internos do PDF.js após várias trocas de página;
- staging com dois canvases é desativado em aparelhos pequenos, modo econômico e pressão de memória;
- canvases antigos são zerados fora do caminho crítico do clique.

### Troca de página mais rápida

No modo Página + PDF + celular + qualidade Automática:
- a página aparece primeiro em um **fast pass** mais leve;
- se o usuário parar na página, a qualidade é elevada em repouso;
- se continuar avançando, o trabalho de melhoria é cancelado naturalmente pelo token de renderização.

## Validação

```bash
npm test
npm run validate:acervo
```
