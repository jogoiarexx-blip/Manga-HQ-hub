# Manga-HQ-hub v0.3.8

Leitor/PWA de mangás e HQs com catálogo A–Z, múltiplos acervos e leitura otimizada para celular.

## v0.3.7 — navegação A–Z inteligente e leitor sem barras

### Catálogo

- A barra **# A–Z** agora acompanha a posição da rolagem.
- A letra da seção atual fica destacada automaticamente.
- O próprio índice horizontal acompanha a letra ativa.
- Tocar numa letra continua carregando automaticamente o trecho necessário do catálogo.
- O catálogo mantém carregamento progressivo automático sem pesar o celular.
- Ordenação alfabética permanece padronizada em português do Brasil com números naturais.

### Leitor no celular

- Toque no **centro da página** esconde ou mostra os controles.
- Topo e rodapé desaparecem completamente sem diminuir a área do PDF/WebP.
- Os controles reaparecem ao tocar novamente no centro.
- Controles somem automaticamente após alguns segundos.
- Ao avançar/voltar página, o chrome some mais rápido.
- As zonas laterais para avançar/voltar foram ampliadas para aproximadamente **35% de cada lado**.
- Quando há zoom acima de 100%, toque lateral não troca página acidentalmente.
- Vertical/Webtoon também permitem mostrar ou esconder o chrome com toque central.
- Abrir Miniaturas, Visual ou Menu mantém os controles visíveis até a interação terminar.
- Tela cheia do navegador continua funcionando junto com o full-bleed.

### PDF e WebP

- Continuam usando **100dvw × 100dvh** no celular.
- Página única usa o máximo da tela sem corte.
- Flipbook preserva duas páginas.
- Panorâmicas usam toda a largura.
- PDF mantém limite adaptativo de pixels para evitar travamentos.

## Validação

```bash
npm test
npm run validate:acervo
```
