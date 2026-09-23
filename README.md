# Manga-HQ-hub v0.3.16

Leitor/PWA de mangás e HQs otimizado para celular.

## v0.3.16 — botão Sair e fechamento confiável

### Botão Sair

- A seta de retorno do leitor foi substituída por um botão textual **Sair**.
- O botão possui área de toque maior no celular.
- O listener agora chama `closeReader(false)` explicitamente.
- O evento de clique não é mais passado por engano como parâmetro de histórico.

### Saída imediata

Ao tocar em **Sair**:
1. o leitor some da tela imediatamente;
2. o scroll da biblioteca é liberado;
3. o progresso é salvo;
4. a entrada artificial do histórico é consumida;
5. PDF.js, canvases, workers, blobs e caches do documento são limpos em segundo plano.

Isso evita a sensação de botão travado em PDFs grandes.

### Botão Voltar do Android/navegador

O histórico continua funcionando:
- ao abrir uma HQ, o leitor cria uma entrada própria;
- o botão Voltar fecha o leitor;
- a saída pelo botão **Sair** remove essa entrada sem sair do site.

### Recursos preservados

- PDF, WebP, CBR, CBZ e RAR;
- Página única, Flipbook, Vertical e Webtoon;
- qualidade PDF adaptativa;
- zoom móvel;
- filtro de baixa resolução;
- prefetch cancelável;
- deduplicação de páginas;
- Acervo 1, Acervo 2 e Acervo Marvel.

## Validação

```bash
npm test
npm run validate:acervo
```
