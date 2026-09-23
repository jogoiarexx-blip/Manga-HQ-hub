# Manga-HQ-hub v0.3.13

Leitor/PWA de mangás e HQs otimizado para abrir mais rápido e usar menos memória, principalmente no celular.

## v0.3.13 — núcleo do leitor mais leve

### Motores sob demanda

PDF.js, JSZip e UnRAR deixaram de ser baixados antecipadamente na instalação do PWA.

Agora:
- WebP não carrega motor de PDF/CBR/CBZ;
- PDF.js só é importado quando um PDF é aberto;
- JSZip só entra ao abrir CBZ/ZIP;
- UnRAR + WASM só entram ao abrir CBR/RAR;
- depois do primeiro uso, o Service Worker pode reutilizar os arquivos do cache.

Isso reduz rede, CPU e disputa com o carregamento do catálogo.

### Fallback de compatibilidade

- PDF.js tenta `esm.sh` e possui fallback no jsDelivr.
- JSZip possui fallback no jsDelivr.
- UnRAR possui fallback no jsDelivr.
- Promises de módulos que falham são resetadas, permitindo tentar novamente sem recarregar a página.

### PDF mais robusto

Se uma página PDF falhar ao criar/renderizar um canvas grande:
1. o leitor libera o canvas falho;
2. reduz o DPR;
3. tenta novamente automaticamente.

Também há limite de dimensão:
- celular: até aproximadamente 8192 px por lado;
- desktop: até aproximadamente 16384 px por lado.

O orçamento de pixels existente continua ativo.

### Memória adaptativa

Em navegadores Chromium que expõem `performance.memory`, o leitor detecta pressão de heap.

Quando o uso passa de aproximadamente 72%:
- prefetch é suspenso;
- cache de páginas cai para cerca de 3;
- slots verticais distantes são liberados;
- páginas Blob antigas são revogadas.

Em navegadores sem essa API, o comportamento anterior permanece.

### PDF remoto mais rápido

- conexão normal no celular usa chunks de aproximadamente 512 KB;
- desktop usa até aproximadamente 1 MB;
- conexão lenta/economia de dados usa 256 KB;
- `disableAutoFetch` fica restrito a economia, rede lenta ou pressão de memória.

Assim um celular em conexão boa não fica desnecessariamente limitado.

### Menos trabalho repetido

Brilho, contraste e sépia não fazem mais uma varredura completa em todas as páginas a cada movimento do slider.

Atualizações visuais de:
- baixa resolução;
- zoom móvel;
- qualidade PDF

são agrupadas por `requestAnimationFrame`.

### Vertical/Webtoon

- mantém IntersectionObserver em navegadores modernos;
- possui fallback por rolagem para WebViews sem IntersectionObserver;
- miniaturas também possuem fallback compatível;
- somente a janela ao redor da página atual é carregada no fallback.

### CBR/CBZ

JSZip agora abre o arquivo com `createFolders:false`, evitando objetos de pasta desnecessários na memória.

## Recursos preservados

- Acervo 1, Acervo 2 e Acervo Marvel;
- Página única, Flipbook, Vertical e Webtoon;
- PDF sem pisca;
- qualidade PDF Econômico/Automático/Nítido;
- zoom móvel;
- filtro de baixa resolução;
- offline;
- atalhos A–Z;
- Margens;
- marcadores e progresso.

## Validação

```bash
npm test
npm run validate:acervo
```
