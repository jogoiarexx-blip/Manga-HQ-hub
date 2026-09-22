# Manga-HQ-hub v0.2.7

Hub de mangás e HQs com acervo WebP conectado e leitor integrado.

## Versão atual

**0.2.7** — esta passa a ser a base oficial de versionamento do projeto. As próximas atualizações devem continuar a partir dela.

## Recursos atuais

- acervo WebP conectado ao Hub;
- leitura direta das edições publicadas no acervo;
- modo Flipbook com duas páginas, lombada central e animação de virada;
- arrastar a página com mouse ou toque para virar de forma interativa;
- duas páginas também no celular em modo retrato;
- pré-carregamento do par anterior e seguinte para reduzir espera;
- números de página e acabamento visual de cantos/lombada;
- interface mobile refinada com busca compacta, filtros recolhíveis e áreas de toque maiores;
- leitor mobile com barra inferior simplificada e controles em painel;
- carregamento inicial e miniaturas reduzidos no celular para melhorar desempenho;
- leitura de PDF, CBR, CBZ, RAR e ZIP;
- abertura de arquivos locais;
- modos página, dupla, vertical e webtoon;
- leitura RTL/LTR;
- progresso, favoritos e marcadores;
- biblioteca offline;
- interface responsiva para PC e celular;
- PWA e armazenamento local.

## Acervo conectado

Manga HQ Acervo:
https://jogoiarexx-blip.github.io/Manga-HQ-acervo-1/


### v0.2.7 — otimização de leitura no celular
- limite adaptativo de pixels para PDFs, reduzindo uso de RAM e travamentos;
- pré-carregamento em segundo plano, respeitando economia de dados e conexões lentas;
- cache menor em aparelhos compactos;
- liberação de canvas/imagens ao trocar de página;
- páginas panorâmicas do acervo detectadas pelo manifesto e exibidas sozinhas;
- navegação cancela renderização PDF anterior ao avançar rapidamente;
- Flipbook mobile mais leve, mantendo duas páginas quando apropriado.


### v0.2.7 — Flipbook e página única no celular
- zoom de imagens sem reconstruir o leitor inteiro;
- evita rerender ao abrir/fechar a barra do navegador no celular;
- página única usa toda a área útil e permite pan suave quando ampliada;
- Flipbook mantém duas páginas com contenção de layout e animação mais leve;
- swipe no modo página única responde com gesto menor;
- páginas panorâmicas não iniciam dobra/arraste de folha;
- troca de modo restaura zoom e posição para evitar estados pesados;
- decodificação da página visível priorizada antes do pré-carregamento.
