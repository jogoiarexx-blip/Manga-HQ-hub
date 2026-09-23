# Changelog — Manga-HQ-hub

## 0.3.23 — leitor vertical mobile resiliente

- Define leitura vertical contínua como padrão no celular quando não existe preferência salva para a HQ.
- Mantém uma janela de páginas próximas carregada e protege páginas visíveis contra limpeza prematura.
- Adiciona recuperação automática para placeholders que ficam presos após cancelamento/limpeza.
- Aumenta o pré-carregamento vertical de PDF no celular sem abandonar o modo econômico sob pressão de memória.
- Ativa renderização inicial leve de PDF e posterior refinamento da página atual.
- Corrige a recursão de `pdfRenderCapsForPass()`.
- Atualiza o cache PWA para forçar a chegada do novo núcleo ao celular.

## 0.3.22 — Acervo Raro

- Conecta o novo catálogo de 16 PDFs e capas WebP.
- Evita armazenar PDFs inteiros no cache automático do PWA.
- Atualiza a versão do aplicativo para carregar a nova configuração.

## 0.3.21 — revisão mobile

- Move o sticky da biblioteca para antes dos carrosséis de descoberta.
- Reduz a altura do sticky no celular.
- Corrige conflito entre `.card` do catálogo e `.mini-card` dos carrosséis.
- Mantém cards do grid principal horizontais em telas pequenas.
- Restaura cards de carrossel verticais e legíveis.
- Oculta barras de rolagem horizontais sem remover o swipe.
- Esconde módulos de descoberta quando busca/filtros estão ativos.

## 0.3.20 — cabeçalho sticky da biblioteca

- Agrupa busca, filtros e A–Z em um único cabeçalho sticky.
- Ajusta saltos alfabéticos para a altura real do cabeçalho.

## 0.3.19 — home e vitrine

- Corrige abertura no topo.
- Renova carrossel e adiciona itens recentes.
