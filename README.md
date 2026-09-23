# Manga-HQ-hub v0.3.17

Leitor/PWA de mangás e HQs otimizado para celular.

## v0.3.17 — troca rápida e limpeza segura

### PDF/HQ sem conflito ao sair e reabrir

A limpeza do leitor agora desanexa o documento antigo **antes** de aguardar o encerramento assíncrono do PDF.js.

Isso evita uma condição de corrida em que:
1. o usuário tocava em **Sair**;
2. abria outra HQ rapidamente;
3. a limpeza atrasada do PDF anterior podia limpar estado pertencente ao novo documento.

Todos os recursos do leitor anterior — tarefas de render, páginas verticais, blobs, cache de páginas e referência do PDF — são desconectados de forma síncrona. O `destroy()` do PDF antigo acontece somente depois que o estado já está seguro.

### Progresso ao trocar de edição

Ao abrir outra HQ diretamente, inclusive pelo botão de próxima edição:
- a página/posição atual é atualizada;
- o progresso pendente é gravado imediatamente;
- só depois a limpeza do leitor anterior começa.

Isso evita perder os últimos segundos de leitura quando havia uma gravação temporizada pendente.

### Limpeza adicional

- removido listener duplicado do drawer de miniaturas;
- preservado o botão textual **Sair** da v0.3.16;
- preservado fechamento imediato antes da limpeza pesada;
- mantidos PDF, WebP, CBR, CBZ, RAR, Página, Flipbook, Vertical e Webtoon;
- mantidos Acervo 1, Acervo 2 e Acervo Marvel.

## Validação

```bash
npm test
npm run validate:acervo
```
