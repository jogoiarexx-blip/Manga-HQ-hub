# Manga-HQ-hub v0.3.5

Leitor/PWA de mangás e HQs com dois acervos externos integrados, suporte a páginas WebP, PDF, CBR, CBZ, RAR e ZIP.

## v0.3.5 — estabilidade dos dois acervos

- Corrigido o título/comentário de deploy e todos os parâmetros de versão do HTML.
- Corrigido `config.js` que ainda era carregado com query antiga no HTML.
- Filtro **Fonte** agora é gerado dinamicamente e mostra Acervo 1, Acervo 2 e contagens reais.
- Acervos externos são carregados em paralelo.
- Se um catálogo remoto atualiza com itens removidos, os itens antigos não ficam mais presos como HQs fantasmas.
- Se apenas um acervo falhar, somente ele usa o último cache; o outro continua atualizado.
- Status da biblioteca mostra contagem separada por acervo.
- Busca também considera coleção, fonte e número da edição.
- Geração automática de capa PDF limitada a 1 tarefa no celular e 2 no desktop.
- Capas PDF geradas usam cache LRU para evitar acúmulo de Blob URLs.
- Service Worker aceita fallback de assets versionados ignorando query antiga quando necessário.
- Capas/imagens remotas do GitHub usam cache LRU limitado.
- Manifestos JSON em `raw.githubusercontent.com` usam network-first.
- PDFs remotos não entram automaticamente no Cache Storage, evitando duplicação de arquivos grandes.
- Regra de imagens dos acervos foi generalizada para Acervo 1, Acervo 2 e futuros acervos com o mesmo padrão.

## Acervos atuais

- **Manga HQ Acervo 1:** WebP e PDF.
- **Manga HQ Acervo 2:** PDF com capas WebP.
- As fontes são configuradas em `config.js` e aparecem automaticamente no seletor da biblioteca.

## Leitor mobile

- Página única, Flipbook, Vertical e Webtoon.
- Duplo toque e pinch zoom.
- Opção de manter zoom entre páginas.
- Detecção de páginas panorâmicas.
- Fila controlada de prefetch.
- Restauração precisa da leitura Vertical/Webtoon.
- Botão Voltar do Android fecha o leitor primeiro.
- Liberação de blobs distantes ao mandar o app para segundo plano.

## Offline

- HQs WebP podem ser salvas página a página.
- PDFs/CBR/CBZ/RAR podem ser salvos quando a origem permite CORS/download.
- PDFs externos não são duplicados pelo Service Worker; o modo offline explícito usa o armazenamento do app.

## Validação

```bash
npm test
npm run validate:acervo
```
