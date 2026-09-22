# Manga-HQ-hub v0.3.11

Leitor/PWA de mangás e HQs com foco em leitura confortável no celular.

## v0.3.11 — leitor PDF mobile melhorado

### Nitidez adaptativa

O PDF agora usa uma qualidade diferente para a página que está sendo lida e para páginas secundárias.

No celular:
- a página atual pode usar DPR maior;
- o limite de pixels continua ativo;
- Vertical/Webtoon usam qualidade mais leve nas páginas fora do foco;
- o modo Nítido aumenta a resolução sem renderizar o PDF inteiro em alta qualidade.

### Qualidade PDF

Novo controle em **Aa Visual**:

- **Econômico** — menor consumo de RAM e bateria;
- **Automático** — mais nitidez na página atual e equilíbrio nas demais;
- **Nítido** — prioriza texto fino e scans pequenos.

### Zoom e pinch

- Pinch em PDF mostra uma prévia instantânea por CSS durante o gesto.
- O PDF só é rerenderizado em alta qualidade quando os dedos são soltos.
- O ponto central do gesto é preservado ao finalizar o zoom.
- Duplo toque continua ampliando no ponto tocado.

### PDF no celular

- Um PDF novo abre em **Página única** por padrão no celular em retrato.
- Isso só acontece quando não existe uma preferência anterior para aquele arquivo.
- Depois que o usuário escolhe Flipbook, Vertical ou Webtoon, essa escolha continua salva.
- PDFs verticais altos usam ampliação automática maior para deixar balões e letras mais legíveis.

### Carregamento

- Em celular/conexão lenta, o PDF.js evita auto-baixar partes desnecessárias do arquivo.
- Range requests continuam habilitados.
- O progresso de carregamento é mostrado em porcentagem quando o servidor fornece o tamanho.
- As páginas anterior e seguinte têm metadados aquecidos em segundo plano, sem renderização pesada.

### Memória

- Renders verticais fora da janela de leitura podem ser cancelados.
- Ao fechar/trocar documento, tarefas PDF verticais são canceladas.
- O orçamento de pixels continua protegendo aparelhos com pouca memória.

## Acervos

- Manga HQ Acervo 1
- Manga HQ Acervo 2
- Manga HQ Acervo Marvel

## Validação

```bash
npm test
npm run validate:acervo
```
