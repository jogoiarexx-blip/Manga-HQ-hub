# Manga-HQ-hub v0.3.14

Leitor/PWA de mangás e HQs com núcleo otimizado para reduzir trabalho repetido, abrir páginas mais rápido e manter o uso de memória controlado.

## v0.3.14 — deduplicação e troca de página mais rápida

### Uma página, um trabalho

O leitor agora mantém um mapa de operações de página em andamento.

Se a mesma página for pedida ao mesmo tempo por:
- leitor normal;
- Vertical/Webtoon;
- prefetch;
- mudança rápida de página,

a extração/download é compartilhada em vez de começar de novo.

Isso ajuda principalmente em **CBZ/CBR**, onde extrair a mesma imagem duas vezes desperdiçava CPU e RAM.

### Predecode limitado

Quando o aparelho permite:
- celular mantém no máximo **1 página futura decodificada**;
- desktop mantém no máximo **2**;
- Econômico, memória pressionada e conexão limitada desativam esse comportamento.

O objetivo é acelerar a próxima página sem transformar o leitor em um pré-carregador pesado.

### Prefetch cancelável

Ao trocar de página, fechar o leitor ou mandar o app para segundo plano:
- a fila de prefetch é esvaziada;
- o AbortController cancela downloads especulativos;
- imagens pré-decodificadas distantes são liberadas.

### WebP/CBR/CBZ sem tela vazia

A troca paginada agora usa staging leve:
1. a página atual continua visível;
2. a nova página começa a carregar em uma camada invisível;
3. depois de decodificada, ocorre a troca;
4. em pressão de memória o staging é desativado e o leitor volta ao comportamento econômico.

Isso melhora a sensação de velocidade sem manter várias páginas na memória por muito tempo.

### Manifestos mais rápidos

Manifestos de páginas passam a usar o cache normal do navegador/Service Worker em vez de `no-store` em toda abertura.

O catálogo principal continua usando atualização própria para detectar novas HQs.

### Segundo plano

Ao ocultar o app:
- prefetch é cancelado;
- páginas decodificadas distantes são liberadas;
- cache de páginas distantes é reduzido;
- PDF.js recebe um pedido de limpeza de recursos;
- progresso Vertical/Webtoon continua salvo.

## Mantido da v0.3.13

- runtimes PDF/CBR/CBZ sob demanda;
- fallback de CDN;
- retry automático de PDF com DPR menor;
- limite de canvas;
- detecção de pressão de memória;
- fallback para WebViews sem IntersectionObserver;
- qualidade PDF adaptativa;
- filtro de baixa resolução;
- zoom móvel;
- Acervo 1, Acervo 2 e Acervo Marvel.

## Validação

```bash
npm test
npm run validate:acervo
```
