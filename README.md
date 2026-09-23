# Manga-HQ-hub v0.3.20

Leitor/PWA de mangás e HQs com acervos conectados, leitura PDF/CBR/CBZ/RAR/ZIP/WebP e interface responsiva.

## v0.3.20 — cabeçalho da biblioteca fixo

A área de navegação da biblioteca agora acompanha o leitor durante a rolagem.

### Desktop
- busca, fonte, ordenação, Atualizar e índice A–Z ficam juntos em um bloco sticky;
- o bloco permanece logo abaixo do cabeçalho principal;
- fundo translúcido com blur e separação visual do catálogo;
- saltos A–Z calculam dinamicamente a altura real do cabeçalho para não esconder a letra selecionada.

### Celular
- o sticky permanece compacto: busca + botão de filtros + A–Z;
- fonte, ordenação e Atualizar só aparecem ao tocar em **☰**;
- ao fechar os filtros, o bloco volta a ocupar pouco espaço;
- a altura é recalculada automaticamente quando o painel abre ou fecha.

### Correções de navegação
- o destaque da letra ativa não usa mais `scrollIntoView` para centralizar o A–Z;
- a centralização da letra acontece somente na rolagem horizontal do próprio índice;
- isso evita que o site seja puxado verticalmente de forma inesperada.

Mantém as melhorias da v0.3.19 e o núcleo PDF não bloqueante da v0.3.18.
