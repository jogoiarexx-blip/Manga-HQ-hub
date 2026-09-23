# Changelog — Manga-HQ-hub

## 0.3.19 — home no topo e nova vitrine

- Corrige scroll automático para baixo ao abrir o site.
- Desativa restauração de scroll do navegador na inicialização.
- Impede sincronização passiva do índice A–Z de executar `scrollIntoView`.
- Renova o carrossel de coleções com cards editoriais, progresso e novidades.
- Adiciona paginação por pontos, posição atual e autoavanço inteligente.
- Pausa o carrossel durante interação e respeita movimento reduzido.
- Adiciona faixa de itens adicionados recentemente.
- Adiciona atalhos no hero para explorar o acervo e abrir uma leitura aleatória.
- Melhora responsividade e apresentação da home.

## 0.3.18 — núcleo não bloqueante

- Remove espera de `destroy()` do caminho de abertura/troca de HQ.
- Adiciona fila de limpeza em segundo plano.
- Corrige corrida de carregamento do PDF e corrida de histórico.
- Reduz RAM em PDFs longos e melhora a troca de páginas.

## 0.3.17 — troca rápida e limpeza segura

- Corrige condição de corrida entre fechamento de um PDF e abertura de outra HQ.
- Grava o progresso antes de trocar de edição.

## 0.3.16 — botão Sair e fechamento confiável

- Substitui a seta de retorno por botão textual **Sair**.
