# Manga-HQ-hub v0.3.24

Leitor/PWA de mangás e HQs com foco em navegação rápida no celular.

## v0.3.24 — instalação PWA visível

- Adiciona botão destacado **Instalar no celular** na tela inicial.
- Mantém também um atalho de instalação no cabeçalho mobile.
- Usa o prompt nativo quando o navegador oferece instalação PWA.
- Quando o navegador não oferece prompt, mostra instruções para Android ou iPhone/iPad.
- Oculta os botões automaticamente quando o app já está instalado.


## v0.3.23 — leitor vertical mobile resiliente

- Leitura vertical contínua passa a ser o padrão para HQs sem preferência salva no celular.
- Mantém a página atual e páginas próximas vivas para permitir voltar sem encontrar espaços vazios.
- Recupera automaticamente páginas descarregadas que continuam visíveis ou próximas do viewport.
- Evita limpar canvas/imagens que ainda estão na região de leitura.
- PDFs usam primeira renderização leve no celular e refinam a página em foco depois.
- Corrige a recursão incorreta de `pdfRenderCapsForPass()` e ativa de fato o fast pass de PDF.

## v0.3.22 — Acervo Raro

- Inclui as 16 edições do Acervo Raro, organizadas em quatro histórias.
- Exibe as capas WebP e abre os PDFs no leitor existente.
- Deixa downloads de PDF fora do cache automático do PWA.

## v0.3.21 — revisão visual mobile

A versão foi ajustada a partir de testes reais no celular.

### Sticky mais útil
- busca, filtros e A–Z agora aparecem antes dos carrosséis da home;
- depois que o bloco inicial sai da tela, a navegação já fica presa abaixo da topbar;
- não é mais necessário passar por todos os carrosséis para o sticky começar a acompanhar o scroll;
- altura mobile foi reduzida.

### Carrosséis corrigidos
- cards dos universos não herdam mais o layout horizontal dos cards do grid principal;
- capa, título e botão voltam a formar um card vertical legível;
- títulos deixam de ficar espremidos ao lado da capa;
- barras de rolagem horizontais visíveis foram ocultadas;
- swipe continua funcionando normalmente.

### Busca e filtros
- ao pesquisar, escolher categoria ou abrir uma coleção, módulos de descoberta desnecessários deixam de ocupar espaço;
- os resultados ficam mais próximos do cabeçalho sticky.

Mantém o leitor PDF otimizado, a limpeza não bloqueante e as demais melhorias anteriores.
