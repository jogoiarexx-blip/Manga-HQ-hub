# Changelog — Manga-HQ-hub

## 0.3.17 — troca rápida e limpeza segura

- Corrige condição de corrida entre o fechamento de um PDF e a abertura de outra HQ.
- Desanexa `pdfDoc`, tarefas de render e recursos do documento antes do `await destroy()`.
- Garante que nenhuma limpeza antiga zere páginas/estado de um novo documento.
- Grava o progresso imediatamente antes de trocar de HQ/edição.
- Remove listener duplicado do drawer de miniaturas.
- Adiciona smoke tests específicos para a ordem da limpeza e persistência.

## 0.3.16 — botão Sair e fechamento confiável

- Substitui a seta de retorno por botão textual **Sair**.
- Fecha visualmente o leitor antes da limpeza pesada do PDF.
- Corrige o parâmetro de histórico recebido pelo listener.
- Mantém o botão Voltar do navegador/Android integrado ao leitor.
