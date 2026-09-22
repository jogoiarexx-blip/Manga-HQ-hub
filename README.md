# Manga-HQ-hub v0.3.10

Leitor/PWA de mangás e HQs com Acervo 1, Acervo 2 e Acervo Marvel.

## v0.3.10 — leitura realmente legível no celular

A imagem enviada mostrou que o problema não era só contraste: a página inteira cabia na largura do telefone, deixando os balões pequenos demais, e havia espaço preto desperdiçado antes da página.

### Zoom móvel de leitura

Novo controle em **Aa Visual**:

- **100% / sem ampliação**
- **Automático**
- **125%**
- **150%**
- **175%**
- **200%**

No modo **Automático**:
- scans pequenos detectados como baixa resolução podem abrir em aproximadamente **170%**;
- páginas normais altas ficam por volta de **135%**;
- páginas mais largas usam ampliação menor.

A página fica maior que a tela e pode ser arrastada lateralmente. Isso aumenta o tamanho real dos balões e letras sem recodificar o arquivo.

### Desempenho

- WebP/JPG/CBR/CBZ usam a mesma imagem já carregada; só muda o tamanho de exibição.
- Não há IA nem upscale pesado.
- PDF é rerenderizado maior quando necessário, mas continua limitado pelo orçamento de pixels do leitor.
- O filtro de baixa resolução continua separado e pode ser usado junto com o zoom móvel.

### Correção do espaço preto

- Vertical/Webtoon passam a começar no topo.
- Slots já carregados deixam de manter altura reservada artificial.
- Primeira página não recebe margem superior extra.
- O leitor continua usando 100dvw × 100dvh no celular.

### Combinação recomendada para scans antigos

- **Baixa resolução: Automático**
- **Zoom móvel: Automático**
- Se ainda estiver difícil: **Baixa resolução: Forte** + **Zoom móvel: 175%**

## Acervos

- Manga HQ Acervo 1
- Manga HQ Acervo 2
- Manga HQ Acervo Marvel

## Validação

```bash
npm test
npm run validate:acervo
```
