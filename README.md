# Manga-HQ-hub v0.3.19

Leitor/PWA de mangás e HQs para PC e celular, com acervos conectados, PDF, CBR/CBZ/RAR/ZIP e páginas WebP.

## v0.3.19 — Home e vitrine

### Site abre no topo
- desativa a restauração automática de scroll do navegador durante a inicialização;
- reforça a posição 0 no carregamento inicial;
- corrige o índice A–Z, que antes usava `scrollIntoView` enquanto apenas sincronizava a letra ativa;
- o A–Z só desloca a página quando o usuário clica numa letra.

### Carrossel de coleções
- cartões maiores e com visual editorial;
- capa principal com fundo desfocado;
- categoria e indicador de novidades;
- quantidade de edições e leitura em andamento;
- barra de progresso da coleção;
- indicador `1 / N` e pontos de navegação;
- autoavanço a cada alguns segundos;
- pausa automática ao tocar, arrastar, usar mouse ou roda;
- respeita `prefers-reduced-motion`;
- scroll-snap no celular.

### Home mais atraente
- botões **Explorar acervo** e **Ler algo aleatório** no hero;
- nova faixa **Adicionados recentemente**;
- destaque visual de itens novos;
- cards recentes com fonte, data e progresso;
- melhorias responsivas para telas pequenas.

## Núcleo do leitor
Mantém as melhorias da v0.3.18: limpeza de PDF não bloqueante, redução de RAM, fast pass no celular e abertura imediata de outro livro após **Sair**.

## Validação

```bash
npm test
npm run validate:acervo
```
