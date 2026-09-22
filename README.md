# Manga-HQ-hub v0.3.6

Leitor/PWA de mangás e HQs com catálogo unificado, atalhos alfabéticos e leitor mobile em tela cheia.

## v0.3.6 — catálogo A–Z e leitura mobile maior

### Catálogo alfabético

- O catálogo padrão continua em **Nome A–Z**.
- Nova barra **# A B C ... Z** com atalhos para cada letra.
- Cada letra mostra quantos títulos existem naquele ponto do catálogo.
- Letras sem títulos ficam desativadas.
- Ao tocar numa letra, o Hub muda para A–Z, carrega automaticamente a parte necessária do catálogo e rola até aquela seção.
- Separadores A, B, C... aparecem dentro da grade.
- O índice respeita filtros de fonte, categoria e busca.
- A busca considera título, coleção, número da edição e nome do acervo.

### PDF e WebP

- O cálculo do PDF usa praticamente toda a largura e altura disponíveis no celular.
- PDF e WebP compartilham a mesma área full-bleed.
- Flipbook continua com duas páginas quando apropriado.
- Página única usa o maior tamanho possível sem cortar a imagem.
- Vertical/Webtoon usam 100% da largura no celular.
- Panorâmicas continuam detectadas automaticamente.

### Celular em tela cheia

- O leitor passa a ocupar **100dvw × 100dvh**.
- Barra superior e rodapé deixam de reduzir a área da página e passam a ficar sobrepostos.
- Título some quando os controles estão fechados.
- Fechar e menu continuam acessíveis sobre a página.
- Controles somem mais rapidamente após troca de página.
- Safe areas do Android/iPhone são respeitadas.
- Imersivo e tela cheia do navegador continuam disponíveis.

## Acervos

- Manga HQ Acervo 1.
- Manga HQ Acervo 2.
- As fontes carregam em paralelo e aparecem no seletor dinamicamente.

## Validação

```bash
npm test
npm run validate:acervo
```
