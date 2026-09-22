# Manga-HQ-hub v0.3.9

Leitor/PWA de mangás e HQs com catálogo A–Z, Acervo 1, Acervo 2 e Acervo Marvel.

## v0.3.9 — leitura de mangás com baixa resolução

Foi adicionado um filtro de legibilidade leve para scans e imagens antigas sem transformar o leitor em um processador pesado.

### Modos do filtro

- **Desligado:** mostra a página original.
- **Automático:** detecta páginas raster pequenas e aplica reforço leve somente nelas.
- **Forte / scan borrado:** força o reforço visual, inclusive em PDFs escaneados.

### Como o Automático detecta baixa resolução

A página é tratada como baixa resolução quando as dimensões indicam um scan pequeno, por exemplo aproximadamente 800×1200, 1000×1500 ou abaixo de cerca de 1,6 megapixel.

PDFs não são alterados automaticamente porque o PDF.js informa o tamanho da página, não a resolução real da imagem escaneada dentro dela. Para um PDF antigo/borrado, use **Forte**.

### Desempenho

O filtro não usa IA, upscale, WebGL ou convolução em canvas.

Ele trabalha somente nas páginas visíveis usando:
- contraste leve;
- pequeno ajuste de brilho;
- suavização normal do navegador;
- saturação quase neutra.

Isso evita duplicar imagens ou criar canvases extras e mantém o consumo de RAM próximo ao leitor normal.

### Leitor

- PDF e WebP continuam usando tela cheia no celular.
- Página única, Flipbook, Vertical e Webtoon permanecem disponíveis.
- O filtro funciona em página única, Flipbook e Vertical/Webtoon.
- As preferências visuais continuam salvas localmente.
- **Restaurar** volta o filtro para Automático.

### Acervos

- Manga HQ Acervo 1
- Manga HQ Acervo 2
- Manga HQ Acervo Marvel

## Validação

```bash
npm test
npm run validate:acervo
```
