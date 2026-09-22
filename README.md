# Manga-HQ-hub v0.3.12

Leitor/PWA de mangás e HQs com foco em PDF e leitura confortável no celular.

## v0.3.12 — PDF mobile ainda mais fluido

### Troca de página sem piscar

No modo Página única do celular, o leitor não apaga mais a página atual antes da próxima ficar pronta.

Agora:
1. a página atual continua visível;
2. a nova página é renderizada em uma área de staging invisível;
3. quando o canvas novo termina, ocorre a troca;
4. o canvas antigo é liberado da memória.

Isso elimina boa parte do flash preto/branco durante a navegação sem manter várias páginas pesadas em cache.

### Qualidade adaptativa no Vertical PDF

- A página atual recebe DPR maior.
- Páginas vizinhas são renderizadas mais leves.
- Quando uma página vizinha entra no foco e a rolagem para, ela é promovida automaticamente para qualidade superior.
- A promoção usa debounce para evitar rerender a cada pixel de rolagem.
- Renders que saem da janela continuam sendo cancelados.

### Margens

O botão **✂ Margens** agora tem efeito visual real no PDF.

- Página única: amplia levemente o canvas para esconder bordas brancas.
- Vertical/Webtoon: corta uma pequena faixa lateral.
- É totalmente opcional e fica salvo por arquivo.
- Não faz análise de imagem nem crop pesado em canvas.

### PDF mobile mantido da v0.3.11

- Qualidade PDF: Econômico, Automático e Nítido.
- Pinch com prévia instantânea e rerender final nítido.
- Página única padrão para PDF novo em celular retrato.
- Range requests.
- Progresso de carregamento.
- Ampliação móvel automática.
- Limite de pixels para proteger RAM.

## Acervos

- Manga HQ Acervo 1
- Manga HQ Acervo 2
- Manga HQ Acervo Marvel

## Validação

```bash
npm test
npm run validate:acervo
```
