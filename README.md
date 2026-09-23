# Manga-HQ-hub v0.3.15

Leitor/PWA de mangás e HQs com núcleo otimizado para leitura longa no celular, PDF, WebP, CBR e CBZ.

## v0.3.15 — progresso e Vertical/Webtoon mais leves

### Progresso sem microtravadas

O progresso de leitura deixou de ser gravado no `localStorage` a cada atualização imediatamente.

Agora:
- alterações são agrupadas por um pequeno debounce;
- fechar o leitor força uma gravação imediata;
- mandar o app para segundo plano também força a gravação;
- ações explícitas como **Marcar lido/não lido** continuam sendo persistidas imediatamente.

Isso reduz bloqueios síncronos no thread principal durante leitura e rolagem.

### Estatísticas da biblioteca

O leitor não recalcula mais todos os totais da biblioteca em toda troca de página.

As contagens completas só são atualizadas quando o item muda entre:
- não lido;
- lendo;
- concluído.

### Vertical/Webtoon em HQs grandes

A descoberta da página atual deixou de medir todos os `.page-slot` a cada scroll.

O núcleo agora:
1. usa um ponto de leitura dentro do viewport;
2. identifica diretamente o slot sob esse ponto;
3. se necessário, mede apenas uma pequena janela ao redor da página atual.

Isso mantém o custo de rolagem praticamente constante mesmo quando a HQ tem centenas de páginas.

### Slots ativos

O leitor mantém um `Set` apenas com as páginas Vertical/Webtoon realmente carregadas.

Na limpeza de memória:
- só esses slots ativos são examinados;
- renders PDF fora da janela continuam sendo cancelados;
- Blob URLs distantes continuam revogados;
- placeholders não carregados não entram mais na varredura.

### Pintura do navegador

Vertical/Webtoon usam `content-visibility:auto` e contenção de pintura.

Páginas distantes podem ser ignoradas pelo motor de renderização até se aproximarem do viewport, reduzindo layout/paint em documentos longos.

### Próxima edição

A procura pela próxima HQ da série agora é cacheada para o item aberto, evitando filtrar e ordenar todo o catálogo em cada troca de página.

### Miniaturas

Ao mudar de página, somente a miniatura anteriormente ativa e a atual recebem atualização de classe. O leitor não percorre mais todas as miniaturas abertas a cada página.

## Mantido das versões anteriores

- deduplicação de extração/download;
- predecode limitado;
- prefetch cancelável;
- staging sem tela vazia;
- PDF com retry de DPR;
- runtimes sob demanda;
- pressão de memória adaptativa;
- fallback para WebViews antigos;
- filtro de baixa resolução;
- zoom móvel;
- qualidade PDF adaptativa;
- Acervo 1, Acervo 2 e Acervo Marvel.

## Validação

```bash
npm test
npm run validate:acervo
```
