# Red Bull Challenge — Análise do conceito

**Status:** 17/08 (noite do briefing) · entrega 18/08 às 16h (~19h corridas) · repo em `/home/daniel/projects/insper/redbull_hacka` com **zero commits**, nenhuma linha de código, `.gitignore` ignorando a pasta `assets/` inteira.

---

## TL;DR

- **A ideia se sustenta.** Cronômetro de precisão é uma das melhores mecânicas possíveis para esse briefing: dura segundos, tem início/meio/fim óbvios, não precisa de manual e roda em HTML/CSS/JS puro. Não troquem de ideia — troquem o *formato* dela.
- **Três coisas mudam OBRIGATORIAMENTE:** (1) cai o **Pass & Play / seletor de nº de jogadores / tabela de Standings** — é setup de app, não de estande; (2) cai o **campo de nome no ranking** — identificador é sorteado pelo sistema; (3) cai a copy **"Faltou um Red Bull!"** — é alegação de desempenho ligada ao consumo do produto, exatamente o que custou US$ 13 mi à marca nos EUA em 2014. Nenhum funcionário da Red Bull quer ler isso numa proposta.
- **A premissa das palavras-chave está descoberta.** "Uso das informações/palavras-chave fornecidas pela marca" é premissa obrigatória e um cronômetro puro não tem palavra nenhuma. A lista também não está no drive. Perguntem hoje no encontro; se não vier, derivem o vocabulário dos nomes dos próprios assets e **declarem isso no relatório**. Derivação declarada é defensável; ausência não é.
- **A mecânica precisa ser fechada HOJE, em uma frase.** As análises produziram quatro alvos incompatíveis (1,82s do pit stop / 7,00s / 3,00-5,50-7,00 / inteiro de 1 a 10). Decisão fechada aqui: **alvo fixo de 5 segundos inteiros, cronômetro cego, 3 tentativas, erro = |tempo − 5s| em ms, menor soma vence.** Motivo: é a única formulação que os ícones fornecidos conseguem *desenhar* (existem ícones de 1 a 10, não existe zero nem vírgula) e a única que mantém o ranking comparável.
- **Qualidade técnica e de código vale 25% — o maior peso isolado, mais que Funcionalidade (20%).** É a única nota que se ganha fora do jogo: README, módulos separados, JSDoc, um teste. Reservem 1h para isso e não sacrifiquem por feature extra.
- **Dois riscos de entrega que matam tudo em silêncio:** o `.gitignore` com a linha `assets` publica o site sem fontes e sem imagens; e os 132 MB de PNG originais não carregam num iPad. Ambos se resolvem em 20 minutos, hoje.
- **Existe uma segunda janela de trabalho que ninguém usou.** A entrega é terça 18/08 16h; a feira é **quarta 19/08**. Todo o pacote de "operação de quiosque" (Acesso Guiado, service worker, painel de operador, attract mode robusto) cabe na noite de terça e **não** deve competir com as 19h críticas.
- **Cuidado com o público certo.** O primeiro usuário real do link é um avaliador abrindo no Chrome de um notebook. Layout travado em paisagem de iPad é a forma mais fácil de perder UX/UI (20%) no primeiro frame. Layout fluido, um só, sem media query de orientação.

---

## O que o desafio pede

**Contexto.** Red Bull tem repertório forte de ativações de esporte e alta energia; este desafio pede o contrário: "uma ativação micro, digital, leve e imediata (o tipo de coisa que alguém encontra, entende e joga em segundos, sem precisar de explicação)". Aplicação: feira de carreiras no Mackenzie, quarta-feira, ambiente de fluxo rápido.

**Público.** Estudantes e jovens profissionais em trânsito, pouco tempo por pessoa, uso **em pé**, por toque. "Público terá pequeno espaço para instruções prévias, ou seja, a primeira tela precisa comunicar sozinha o que fazer."

**O que é a ativação.** Um jogo/microativação digital para tablet ou computador. O caça-palavras é citado como *referência*, não obrigação: "Fujam da mecânica se quiserem, mas não fujam do objetivo." O teste oficial de simplicidade está escrito no briefing: "alguém desconhecido, sem explicação nenhuma, consegue jogar e terminar em poucos minutos?"

**Prazo.** Briefing 17/08 19h-21h. Entrega **18/08 às 16h**.

**Entregáveis** (relatório em DOCX ou PDF contendo):
- Protótipo funcional rodando em navegador (link) ou executável no tablet/computador.
- Breve descrição da mecânica e do conceito criativo (1 página ou poucos slides).
- Print(s) ou vídeo curto de 30-60s como backup "caso o protótipo tenha algum imprevisto na apresentação".
- Envio para **inspercoding1@gmail.com** com **angelo.piatto@redbull.com** em cópia, até 18/08 16h.
- Aviso literal do briefing: *"Já sabemos a problemática, o foco do relatório deve ser sua resolução."* Ou seja: nada de meia página recontando o contexto.

**Rúbrica:**

| Critério | O que avaliam | Peso |
|---|---|---|
| **Qualidade técnica e de código** | Código comentado e de fácil manutenção, documentação completa e "clean code" | **25%** |
| UX/UI e design | Uso correto de elementos visuais fornecidos; consistência estética com a marca | 20% |
| Funcionalidade | Funciona do início ao fim sem travar, sem bugs bloqueantes, lógica de vitória/fim clara | 20% |
| Adequação ao contexto da feira | Interação curta, compatível com fluxo de passagem rápida | 15% |
| Facilidade de uso | Ativação se entende/conclui sem instruções grandes | 10% |
| Criatividade | Originalidade do design ou do conteúdo | 10% |

Leiam a primeira linha de novo: **o repositório e o README valem mais que o jogo funcionar**. Isso muda a estratégia de alocação de tempo — 90 minutos de README + arquitetura + JSDoc + um teste rendem mais nota que qualquer feature adicional. E note o que **não** está na rúbrica: ranking, competição, retenção, operação de evento. Zero peso.

---

## O que eu entendi da ideia de vocês

Um jogo de **cronômetro de precisão** com identidade Red Bull, inspirado num app de terceiros ("Timer Game", modo Pass & Play): existe um TARGET (ex.: 00:07.83), o jogador tenta parar o cronômetro nesse tempo, e a tela mostra YOUR TIME, DELTA, um botão circular gigante no centro e uma tabela de Standings (PLAYER / TIME / DELTA / WINS) para 2 jogadores, com controle -/+ para o número de jogadores. Visual da referência: claro/pastel, display estilo LED preto com números laranja/verde-limão.

Somado a isso, vocês querem:
1. **Ranking do evento** (placar do dia).
2. Rodar num **iPad**.
3. **HTML, CSS e JS puros**, sem framework, "pra deixar o mais simples possível".
4. **Animações de reação ao erro**, com mensagens tipo "Faltou um Red Bull!" ou "Está precisando de asas?".

**O que está implícito e ninguém enunciou:**
- Que o jogo vai rodar num quiosque operado por vocês no estande — o briefing **não promete isso**. O cenário garantido é um avaliador abrindo um link.
- Que existe alguém para reiniciar o jogo entre um visitante e outro. Não existe: o totem tem que se resetar sozinho.
- Que o ranking implica identificar quem jogou (nome digitado). É justamente onde o briefing aperta.
- Que "abrir o index.html no iPad" funciona. **Não funciona** — Safari iOS não abre `file://` e o Quick Look do app Arquivos não executa JavaScript.

**O que ainda está indefinido:**
- Cronômetro visível ou cego (é a decisão que define o jogo inteiro).
- Alvo fixo ou sorteado; quantas tentativas.
- Como o jogador é identificado no ranking.
- Se o protótipo vai efetivamente para o estande de quarta ou é exercício avaliado.
- Qual iPad, qual iPadOS, quem leva, se vocês têm o aparelho na mão hoje.
- Se existe apresentação ao vivo — a palavra "apresentação" aparece nos entregáveis **sem data, formato ou duração** em nenhum lugar do briefing.

---

## Checagem premissa por premissa

| Premissa / restrição do briefing | Situação da ideia | O que fazer |
|---|---|---|
| "Funcionar em tablet (tela touch) ou computador" | ✅ Atende | HTML/CSS/JS puro roda nos dois. Só garantir layout fluido. |
| "Interação curta: do início ao fim da jogada em poucos minutos, sem etapas desnecessárias" | ⚠️ Parcial | Solo atende (~40s). Pass & Play com seletor de jogadores + standings **não**. Cortar. |
| "Interface autoexplicativa: sem manual, sem instruções longas, sem cadastro/login" | ❓ Indefinido | Depende de cronômetro cego vs visível. Cego + demonstração na 1ª tentativa (ver Recomendação). |
| "Identidade visual da marca aplicada (cores, tipografia e elementos fornecidos)" | ⚠️ Parcial | O display LED laranja/verde-limão é identidade do **app de referência** e não consome nenhum asset entregue. Trocar por paleta escura navy + ícones + lata + Futura. |
| "Uso das informações/palavras-chave fornecidas pela marca" | ❌ Viola | Cronômetro puro não tem palavra. Pedir a lista hoje; derivar dos nomes dos assets se não vier; usar na atração, na janela cega e no resultado. Declarar no relatório. |
| "Ter início, meio e fim claros" | ⚠️ Parcial | "Round 3 over / NEXT ROUND" da referência não comunica fim. Precisa de tela de resultado com fechamento explícito. |
| "Funcionamento estável: não pode travar ou depender de conexões/serviços instáveis" | ⚠️ Parcial | Atende se o ranking for 100% local. Viola se virar backend no Wi-Fi da feira. Zero rede em runtime. |
| "Poucos passos até o resultado, evitem telas ou etapas intermediárias" | ❌ Viola | Tela de nº de jogadores + rodada + standings são três etapas intermediárias. Tela única. |
| "Nada de login, cadastro ou coleta de dados pessoais dentro do jogo" | ⚠️ Parcial | Ranking com nome digitado é zona cinzenta e, pior, é etapa intermediária proibida. Identificador **sorteado** resolve por construção. |
| "O jogo deve ter a duração máxima de 2 minutos" | ⚠️ Parcial | Solo ~40s ✅. Pass & Play com 3-4 jogadores passa de 3 min ❌. |
| "Interface pensada para toque (tablet) e operável com mouse/teclado (computador)" | ❓ Indefinido | Ninguém decidiu. Um handler único: `pointerdown` + `keydown` de Espaço/Enter com guarda `if (e.repeat) return;`. |
| "Sem dependência de instruções faladas por um atendente, o jogo precisa se explicar sozinho" | ⚠️ Parcial | Cego exige ensinar a regra sem texto. Resolve-se com demonstração, não com manual. |
| "Sem elementos que exijam alta performance gráfica incompatível com tablets simples" | ⚠️ Parcial | A mecânica atende com folga. Os **assets** não: 132 MB, PNGs de até 2126x4373. Pipeline de otimização obrigatório. |
| "Não existe restrição de linguagem... TypeScript e JavaScript são fortemente recomendadas" | ✅ Atende | HTML/CSS/JS puro é a escolha certa. Zero build = zero risco de "não roda na máquina do júri". |

---

## Problemas críticos

### 1. Nenhum código, ~19h de prazo, e a mecânica ainda tem quatro definições incompatíveis

As análises produziram quatro alvos diferentes: 1,82s (pit stop da Red Bull Racing), 7,00s fixo com blackout dos últimos 3s, alvos redondos variáveis (3,00/5,50/7,00) e alvo inteiro de 1 a 10. Não são preferências, são incompatibilidades duras: **não existe ícone de zero nem de vírgula** no pacote fornecido (só `1_Number_Icon.png` a `10_Number_Icon.png`), então 1,82 é impossível de desenhar com os elementos da marca; um blackout de 3s não cabe dentro de um alvo de 1,82s; e alvo variável destrói a comparabilidade do ranking. Enquanto isso não fechar, `rules.js` não pode ser escrito, e ele é o primeiro arquivo do projeto.

**Como resolver:** colar esta frase no topo de `docs/DECISOES.md` antes de escrever qualquer código — *"alvo fixo de 5 segundos inteiros, idêntico para todas as jogadas; o jogador toca para iniciar, o relógio nunca aparece, toca de novo quando achar que 5s passaram; erro = |tempo − 5000ms|; 3 tentativas; menor soma vence."* A narrativa de pit stop não morre: vira uma linha de copy na tela de resultado.

### 2. A premissa das palavras-chave da marca não é atendida por um jogo de timer

"Uso das informações/palavras-chave fornecidas pela marca" é premissa obrigatória e um cronômetro 100% numérico não tem onde encaixar palavra nenhuma — as piadas de erro são decoração de tela final, não uso de vocabulário de marca. Agravante: a lista oficial **não está no drive** (o briefing só promete "Link para drive com fontes e icones"), então não há falha de entrega a cobrar, mas há uma pergunta legítima a fazer hoje.

**Como resolver:** perguntar a lista no encontro de 19h-21h. Sem resposta, derivar o vocabulário dos nomes dos próprios assets entregues (Wings, Energy Flash, Checkered Flag, Gaming, Fitness, Festivals, Cooler, DNA, Bulb, Brand Love, Beverages) e **declarar essa derivação em uma linha do relatório**. Usar as palavras em três lugares concretos: uma palavra grande na tela de atração, uma palavra trocando durante a janela cega, e uma no selo de resultado.

### 3. Ranking com nome digitado colide com o briefing por dois lados

O briefing diz "Nada de login, cadastro ou coleta de dados pessoais dentro do jogo" e "Poucos passos até o resultado, evitem telas ou etapas intermediárias que não sejam essenciais". Um campo de texto é, no mínimo, zona cinzenta no primeiro ponto e **inequivocamente** uma etapa intermediária no segundo — esse segundo argumento sozinho já basta e não depende de interpretação. Some: no iPad, o teclado do sistema não redimensiona o viewport, então um layout `position:fixed` de altura total fica **atrás** do teclado e o botão de confirmar some. E um placar da Red Bull num evento universitário com texto livre é um palavrão esperando acontecer.

**Como resolver:** zero campos de texto no jogo inteiro. O sistema **sorteia** um identificador a partir dos assets (sabor de lata + número de 1 a 10, com o ícone ao lado): "PÊSSEGO 7 — 4º de 37 hoje". Custa dois arrays e um `Math.random`, consome elementos visuais fornecidos (pontua nos 20% de UX/UI) e encerra a discussão de LGPD por construção.

### 4. Pass & Play, seletor de jogadores e tabela de Standings estouram o fluxo da feira

Com 2 jogadores × 3 rodadas dá ~90-110s com seleção e leitura de standings — encosta no teto de 2 minutos sem margem nenhuma para quem nunca viu o jogo; com 3 ou 4 jogadores passa de 3 minutos e viola. O argumento decisivo, esse sem contestação, é outro: seletor de nº de jogadores + tela de rodada + tabela de standings são exatamente as "telas ou etapas intermediárias que não sejam essenciais" que o briefing manda evitar, e um grupo de amigos monopolizando o único iPad é o oposto de "Interação curta, compatível com fluxo de passagem rápida" (15% da nota).

**Como resolver:** solo, 3 tentativas, tela única. Nenhum seletor em lugar nenhum. Se quiserem preservar o gancho social, um "duelo" de 1 tentativa × 2 jogadores como botão secundário **na tela de resultado**, nunca no caminho crítico.

### 5. `.gitignore` ignora `assets/` inteira — o link publicado sobe sem fontes e sem imagens

Verificado: `.gitignore` contém exatamente a linha `assets` (6 bytes) e `git check-ignore -v assets/Fontes/FuturaforRedBull-Bold.ttf` confirma o bloqueio. `git add .` vai pular silenciosamente todo asset, sem erro nem aviso. Se o link entregue for GitHub Pages a partir deste repo, o jogo abre com fonte de sistema e imagens quebradas — e os 20% de UX/UI evaporam ao vivo. Com zero commits, também não existe ponto de restauração se algo quebrar de madrugada.

**Como resolver, em 2 minutos, antes da primeira linha de código:** renomear `assets/` para `assets-raw/`; `.gitignore` passa a `assets-raw/`, `node_modules/`, `dist/`, `.DS_Store`; criar e **versionar** `public/assets/{fonts,img}/` só com os derivados otimizados. Commit inicial e deploy imediatos, com um `index.html` vazio, para provar o pipeline antes de existir jogo. Depois do deploy: abrir em janela anônima e conferir zero 404 no DevTools.

### 6. 132 MB de PNG: o problema não é o download, é a RAM do iPad

Medido: `assets/LATAS` 91 MB, `assets/2023 Cartoon Icons` 41 MB; o maior arquivo tem 9,0 MB e 2126x4373 px. Uma imagem dessas vira ~37 MB de bitmap RGBA na memória, independentemente do tamanho do arquivo. Várias delas juntas é o cenário canônico do iOS matar o processo do Safari ("A problem repeatedly occurred") — exatamente a instabilidade que a premissa proíbe. E não há nenhuma ferramenta de conversão instalada nesta máquina (`convert`, `cwebp`, `ffmpeg`, Pillow: todos ausentes).

**Como resolver:** orçamento fechado de **< 2 MB para a página inteira, nenhuma imagem acima de 200 KB**. Escolher no máximo 3-5 imagens (1 lata + 2-3 ícones), converter para WebP com altura máxima ~1200 px nas latas e 256 px nos ícones. Caminho mais rápido aqui: `npm i -D sharp` (Node v24.14.1 verificado) e um script de 15 linhas em `tools/optimize-assets.mjs`. Pré-carregar tudo com `await img.decode()` **antes** de habilitar o botão — nenhuma imagem decodifica durante uma rodada.

### 7. A Futura for Red Bull não tem figuras tabulares — o cronômetro vai tremer na tela

Verificado byte a byte nos 5 TTFs: nenhum tem a feature OpenType `tnum`, e o dígito "1" é muito mais estreito que os outros (Bold: 391 contra 686 unidades, 43% mais estreito; Light: 272 contra 620, 56%). Consequência: `font-variant-numeric: tabular-nums` **não faz nada** nessas fontes, e um display grande de números desloca lateralmente toda vez que um "1" entra ou sai. Num número de 180 px isso é um tremor de dezenas de pixels, visível a 3 metros, e lê como bug — no elemento central da tela, que pontua em UX/UI e em Funcionalidade. Segundo problema silencioso: os nomes internos de família são inconsistentes entre os arquivos ("Futura for Red Bull", "Futura for Red Bull Book", "Futura for Red Bull Cond"...), então um CSS ingênuo com `font-weight:300` cai em Arial sem avisar.

**Como resolver:** travar a largura no CSS, não na fonte — um `<span>` por caractere dentro de um grid de colunas fixas. E declarar `@font-face` com um nome de família **inventado por vocês**, apontando explicitamente para cada arquivo:

```css
@font-face { font-family:'RB Futura'; src:url(../assets/fonts/futura-bold.woff2) format('woff2');
             font-weight:700; font-display:block; }
.display { display:grid; grid-auto-flow:column; grid-auto-columns:.62em; justify-items:center;
           font-family:'RB Futura', Futura, 'Avenir Next', system-ui, sans-serif; }
.display .sep { width:.28em; }   /* ':' e '.' mais estreitos */
```

### 8. "Faltou um Red Bull!" é alegação funcional de desempenho — cortar antes de mostrar ao cliente

Atribuir desempenho ao consumo do produto é exatamente a categoria de alegação que gerou o acordo de mais de US$ 13 milhões da Red Bull nos EUA em 2014 (ação Careathers, publicidade enganosa sobre desempenho, concentração e tempo de reação; a empresa não admitiu culpa). Isso vai ser lido por um funcionário da Red Bull. Além do risco, é fraco: devolver o slogan da marca como punchline de derrota entrega zero autoria e queima os 10% de Criatividade.

**Como resolver:** cinco regras de voz — (1) o produto nunca entra na frase de resultado; (2) zoar o relógio, nunca o jogador; (3) o número é a piada; (4) 2 a 5 palavras, caixa alta, CondBold; (5) nenhuma promessa. Copy pronta na seção de Recomendação.

### 9. Metade do plano otimiza um estande que talvez não seja de vocês

Attract mode com auto-reset, Acesso Guiado com senha em papel, painel de operador, export CSV, wake lock, anti-monopolização de fila: tudo isso pressupõe que o protótipo **deste grupo** será instalado e operado no estande de quarta. O briefing não diz isso em ponto nenhum, e a rúbrica não tem um único critério de operação de evento. O cenário garantido, e o único que dá nota, é um avaliador abrindo um link — provavelmente no Chrome de um notebook 1920x1080. Se o layout estiver travado em paisagem de iPad, esse é o primeiro frame que ele vê.

**Como resolver:** perguntar hoje, na cara: "o protótipo escolhido vai rodar no estande de quarta ou é exercício avaliado?". Até lá, alvo primário é **um link que roda igualmente bem no desktop e no iPad**; todo hardening de quiosque sai do caminho crítico e vai para a lista pós-entrega (há 24h entre a entrega e a feira — ver cronograma).

### 10. Multi-touch: o segundo dedo para o cronômetro

Todo mundo convergiu em `pointerdown`, o que está certo, mas cada dedo dispara seu próprio `pointerdown` com `pointerId` diferente. Cenário provável numa feira: o amigo encosta na tela, ou a palma toca a borda, e o cronômetro para. O resultado vira lixo e lê como bug bloqueante na demo. Ninguém tratou `pointercancel` também, que o iOS dispara quando o sistema assume o ponteiro, deixando a rodada em estado zumbi.

**Como resolver:** guardar o `pointerId` do toque que iniciou a rodada e ignorar qualquer evento com id diferente; escutar `pointercancel` e invalidar a tentativa em silêncio (repete, nunca grava tempo corrompido); restringir a área de stop **ao botão**, não ao `body`. Teste de 30 segundos: iniciar uma rodada e encostar um segundo dedo.

### 11. Clonar layout e nomenclatura do "Timer Game" queima os 10% de Criatividade

TARGET, YOUR TIME, DELTA, WINS, STANDINGS e Pass & Play são o vocabulário e o layout de um app de terceiros — existem pelo menos cinco apps publicados com essa mesma mecânica, vários com pass-and-play. Para um avaliador da marca, isso lê como skin sobre produto existente. E há fricção gratuita: interface em inglês, com jargão de planilha, para estudantes brasileiros em pé, de passagem.

**Como resolver:** 100% da nomenclatura em PT-BR e em linguagem de marca, ou melhor: eliminar rótulos e mostrar só o número gigante e a diferença. Nada de tabela de standings. E declarar no relatório, em uma frase, qual é a torção autoral que separa a proposta da referência — alvo desenhado com ícone numérico cartoon no lugar do display LED, identificador sorteado do vocabulário de sabores, lata que abre no acerto. Não incluam o print do app de terceiro no relatório.

---

## Riscos técnicos no iPad

**Precisão do cronômetro não é problema — parem de se preocupar com isso.** O WebKit limita `performance.now()` a 1 ms desde as mitigações de Spectre (2018), o que é 10× mais fino que os centésimos que vocês vão exibir. A latência de toque do iPad (~75-81 ms end-to-end) **se cancela** na subtração entre start e stop, desde que os dois usem o mesmo tipo de evento. Exibam 2 casas decimais, nunca 3: milésimos é prometer precisão que o navegador não entrega e convida contestação.

```js
// um relógio só, capturado na PRIMEIRA linha do handler
btn.addEventListener('pointerdown', (e) => {
  const t = performance.now();          // antes de qualquer DOM
  if (ativo !== null && e.pointerId !== ativo) return;  // só o dedo que começou
  handle(t, e);
}, { passive: false });
```
Nunca `click`, nunca `touchend`, nunca `Date.now()`, nunca contar frames de `rAF` (`t += 16.7` é dependente de hardware e congela em background). `requestAnimationFrame` só pinta. Em `visibilitychange`, invalidar a rodada em vez de gravar tempo corrompido.

**Entrega offline — `file://` está morto no iOS.** Safari não abre HTML local e o Quick Look do app Arquivos não executa JavaScript. "Copiar a pasta pro iPad" não é plano. Caminho: HTTPS estático (GitHub Pages) + `Adicionar à Tela de Início` + service worker de ~20 linhas com precache. Plano B montado e testado: notebook com `python3 -m http.server 8000` e o iPad num hotspot **sem internet** — mas atenção, origem insegura desliga service worker **e** `navigator.wakeLock`.

**Quiosque são 3 camadas, e a Fullscreen API não é nenhuma delas.** (a) Adicionar à Tela de Início em `display: standalone` (some a barra do Safari); (b) **Acesso Guiado** (Ajustes > Acessibilidade), triplo clique dentro do app, senha de 4 dígitos anotada em papel, com **Motion desligado** para a tela não girar; (c) Bloqueio Automático = Nunca + `wakeLock` como reforço.

**HEAD e CSS mínimos:**
```html
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="manifest" href="app.webmanifest">   <!-- display:standalone; SEM orientation:landscape -->
```
```css
html,body{position:fixed;inset:0;height:100%;overflow:hidden;overscroll-behavior:none;}
*{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;}
button,.tap{touch-action:manipulation;}   /* mata o atraso de double-tap */
```
`user-scalable=no` é ignorado no iOS desde o iOS 10 — bloquear pinch só via `document.addEventListener('gesturestart', e=>e.preventDefault())`. `screen.orientation.lock()` **não existe** no Safari: travar rotação é configuração de aparelho, não código.

**Peso de assets e animação.** Além do pipeline WebP já descrito: durante a rodada em andamento, **zero** `box-shadow` animado, `filter: blur()`, `backdrop-filter` ou animação de `width/height/top/left`. O handler de stop roda na mesma main thread; 40 ms pintando uma animação são 40 ms de atraso no timestamp. Só `transform` e `opacity`, e todas as animações de resultado rodam **depois** de o tempo estar travado numa variável.

**localStorage no iPad tem pegadinhas.** O storage do web app da Tela de Início é **separado** do Safari — definam UMA porta de entrada e treinem quem opera. Todo write dentro de `try/catch` com fallback para array em memória: o ranking nunca pode derrubar o jogo (20% é Funcionalidade). Persistir após **cada** jogada, não no fim da sessão, e nunca em `pagehide`/`beforeunload` (não confiável no iOS).

**Áudio é 100% ornamental.** O `AudioContext` nasce suspenso e só destrava num gesto; e mesmo destravado, Web Audio é silenciado pelo botão de silencioso do iOS (`<audio>` não é). Numa feira barulhenta, som não carrega informação nenhuma. Regra: todo feedback crítico existe em cor, escala e movimento. Se o áudio falhar, ninguém nota.

**Ninguém definiu qual iPad.** Isso muda decisões concretas (wakeLock exige 16.4+, WebP exige iOS 14+, `overscroll-behavior` exige Safari 16+). Fixem baseline **iPadOS 16.4+** e usem feature detection (`navigator.wakeLock?.`) para degradar sem quebrar. Se não houver iPad hoje, testem no Responsive Design Mode do Safari desktop — mas assumam que comportamento de quiosque só se prova no aparelho real, e reservem 1h amanhã de manhã.

---

## Ranking: como fazer sem violar o briefing

**Recomendação fechada: ranking 100% local, identificador sorteado pelo sistema, top 5 na tela de atração, posição do jogador embutida na tela de resultado. Teto de 40 minutos de implementação.**

Como funciona:
- Terminadas as 3 tentativas, o sistema sorteia **sabor de lata + número de 1 a 10** (ex.: "PÊSSEGO 7"), exibe com o ícone numérico ao lado. Mantém um `Set` dos identificadores já usados no dia e re-sorteia em colisão.
- A tela de resultado **é** a tela de ranking: card grande do jogador no topo, top 5 do dia abaixo com a linha dele destacada. Se estiver fora do top 5, mostra "você é o 23º de 118 hoje". Uma tela, não duas.
- Persistência: chave `rb.timer.rank.v1`, gravada após cada jogada, toda leitura e escrita em `try/catch` com fallback em memória. `JSON.parse` com erro → recomeça vazio, sem tela de erro.
- Menos de 5 entradas → não mostra tabela, mostra estado próprio ("SEJA O PRIMEIRO A CRAVAR"). Placar quase vazio numa tela lê como produto quebrado; e preencher com entradas fantasma é fabricar dado, indefensável se perguntarem.
- Antes de enviar o link: **zerar o placar**, para o avaliador não abrir e encontrar 40 jogadas de teste de vocês.

**Alternativas consideradas e por que perderam:**

| Alternativa | Por que não |
|---|---|
| Campo de texto para o nome | Etapa intermediária vedada, teclado do iOS quebra layout `position:fixed`, risco de palavrão no placar da marca. |
| Teclado arcade próprio de 3 letras (grid de 26 botões) | Conformidade OK, mas são horas de UI que não pontuam em nenhuma linha da rúbrica. Perde por custo/benefício, não por conformidade. |
| Sem identidade nenhuma, só "melhor tempo de hoje" | Seguro e barato, mas perde o gancho de "esse sou eu no placar" por quase nada de economia. |
| Backend / ranking em servidor | Viola "não pode depender de conexões/serviços instáveis". Fora de questão. |
| Segunda tela sincronizada (2 dispositivos) | BroadcastChannel só funciona na mesma origem e na mesma instância de navegador — logo, mesmo dispositivo. Presentation API é experimental. Se houver TV, espelhem por cabo. |

**Escopo cortado do ranking até depois da entrega:** painel de operador, export CSV, QR code, cooldown anti-repetição, blocklist, versionamento com arquivamento, anti-cheat. Justificativa honesta para o relatório: "anti-fraude proporcional ao contexto". A rúbrica não tem uma linha sobre integridade de placar.

E a linha que fecha o assunto no relatório: *"o jogo não coleta, não transmite e não armazena nenhum dado pessoal; o identificador é atribuído aleatoriamente pelo sistema e não é vinculável ao jogador."*

---

## Decisões em aberto (responder antes de codar)

Respondam estas 12 em 15 minutos, por escrito. Ao lado de cada uma, a opção recomendada por padrão — se ninguém tiver argumento melhor em 60 segundos, adota-se a recomendada e segue.

1. **Cronômetro visível ou cego?** → **CEGO.** A própria referência de vocês é cega (deltas de -1,13s só acontecem sem relógio à vista). Visível vira teste de reflexo e achata o placar.
2. **Alvo fixo ou sorteado?** → **FIXO, 5 segundos inteiros, o evento inteiro.** Comparabilidade do ranking e desenhável com `5_Number_Icon.png`.
3. **Quantas tentativas?** → **3.** Fecha em ~40s, dá arco de melhora e reduz sorte.
4. **Toque-toque ou segurar-e-soltar?** → **TOQUE-TOQUE.** Copy mais curta ("TOQUE. PARE EM 5s"), e segurar-e-soltar complica a instrumentação sem ganho.
5. **Identidade no ranking?** → **SORTEADA** (sabor + número). Zero teclado.
6. **Pass & Play fica?** → **NÃO** no MVP. Duelo de 1 tentativa como botão secundário na tela de resultado, se sobrar tempo.
7. **Onde hospedar?** → **GitHub Pages** (o `gh` já está autenticado como Daniel-Vinicius com escopo `repo`). Netlify **logado** como espelho. **Nunca Netlify Drop anônimo** — a URL fica protegida por senha até o site ser reivindicado, e o júri bate numa parede.
8. **Repo público ou privado?** → **PÚBLICO** (Pages privado exige plano pago). Consequência: as fontes proprietárias ficam expostas. Aceitável num desafio com assets fornecidos pela própria marca — mas perguntem hoje.
9. **Módulos ES ou script clássico?** → **Módulos ES**, com um build standalone de arquivo único para o plano B. Cuidado: `<script type="module">` **não funciona em `file://`** (origem null, bloqueio de CORS), então o ".zip com duplo clique" quebra silenciosamente sem esse build.
10. **Service worker?** → **SIM se sobrar tempo**, é o único item que dá offline de verdade. Se cortarem, cortem junto a frase "validado offline" do relatório.
11. **Vai para o estande de quarta?** → **PERGUNTAR HOJE.** Até responderem, assume-se que não, e o hardening vai para depois da entrega.
12. **Existe apresentação ao vivo?** → **PERGUNTAR HOJE.** Se houver com o júri jogando num notebook, mouse/teclado vira crítico e o vídeo de backup vira obrigatório de verdade.

**Perguntas para levar ao encontro de 19h-21h** (anotem as respostas na hora; o que não vier vira uma linha de "premissa adotada" no relatório, o que transforma ausência de informação em decisão documentada):
1. Existe lista de palavras-chave da marca? Onde?
2. O protótipo do grupo vai rodar no estande de quarta ou é exercício avaliado? Quem opera?
3. Existe apresentação ao vivo — quando, quanto tempo, o júri joga?
4. Se for para o estande: de quem é o tablet, qual modelo, tem Wi-Fi confiável?
5. Existe brinde ou sorteio amarrado ao resultado? (Isso muda tudo — brinde por posição no placar trava a fila e cria incentivo a trapaça.)
6. Podemos usar o logo dos dois touros? Existe arquivo? Existe brand book com hex oficiais?
7. O repositório pode ser público, dado que contém as fontes FuturaforRedBull?

---

## Recomendação

### Mecânica final (uma frase)

> Alvo fixo de **5 segundos**. O jogador toca o botão gigante para iniciar; o relógio **nunca aparece**; ele toca de novo quando achar que 5 segundos passaram. Erro = `|tempo − 5000|` em milissegundos. **3 tentativas.** Menor soma vence.

Por que 5 e não 7: com 3 tentativas cegas, 7s são 21 segundos encarando uma tela onde nada acontece — em pé, numa feira, com gente atrás. 5s reduz para 15s e mantém a dificuldade (o erro de estimativa cresce proporcionalmente à duração, então a disputa continua apertada).

Por que cego e não com blackout parcial: cego é mais simples de implementar, mais simples de explicar, e é o comportamento da própria referência de vocês. Blackout parcial é uma feature a mais para calibrar numa madrugada.

### Fluxo de telas (3 telas, uma só por vez, alternadas por `data-tela` no `<body>`)

```
[ATRAÇÃO] ──toque──> [JOGO ×3] ──> [RESULTADO] ──10s ou toque──> [ATRAÇÃO]
```

**1. ATRAÇÃO** — no máximo 5 elementos: o número `5` gigante desenhado com `5_Number_Icon.png`; um botão circular grande pulsando; uma mão/dedo animado tocando o botão em loop (demonstração vale mais que instrução); a lata em pé ao lado; o recorde do dia em letra pequena. **Sem tela de "como jogar", sem escolha de modo, sem escolha de jogadores.** A rodada 1 é o tutorial.

**2. JOGO** — botão gigante ocupando o centro. Primeiro toque: o relógio corre visível por ~1 segundo e desvanece com fade — é assim que a regra se ensina sem texto. Durante a janela cega, **exatamente um** elemento em movimento (uma palavra-chave da marca trocando a cada 600 ms, ou a lata enchendo), animado só por `transform`/`opacity`. Segundo toque: para. Contador de tentativas com os ícones numéricos 1-2-3.

**3. RESULTADO** — é também a tela de ranking, e é desenhada como **cartaz fotografável**, não como UI: um número gigante (o erro), uma linha de copy em CondBold, o identificador sorteado, a posição do dia, o packshot da lata. Sem botões dentro do enquadramento nobre. Segura 10 segundos com anel de progresso fino; qualquer toque congela por mais 10s. Botão primário grande = **"PRÓXIMO JOGADOR"**; "de novo" pequeno na borda. Essa hierarquia é o que decide o tamanho da fila.

**Máquina de estados obrigatória:** escrevam `resetGame()` **antes** de escrever o jogo e chamem sempre na entrada da ATRAÇÃO (não na saída do RESULTADO), para que qualquer caminho de erro caia em estado limpo. Timer de inatividade de 12s dentro do jogo volta para a atração. Regra dura: **nenhum estado do jogador N pode ser visível no primeiro frame do jogador N+1.** Tratamento global via `window.addEventListener('error')` e `('unhandledrejection')` chamando `resetGame()`.

### Duração

Meta de ocupação: **35 a 45 segundos** por pessoa (3 tentativas × ~5s + transições + leitura do resultado). Declarem esse número no relatório — o briefing impõe teto de 2 minutos e mostrar que vocês mediram é ponto.

### Identidade visual

**Partido escuro.** Não é gosto: os ícones cartoon fornecidos são preenchidos em branco puro com contorno preto e sombreado azul-gelo (medido em `1_Wings_Icon.png`: 80,3% de pixels neutros, 19% ciano ~#BBEEFF, 0,0% de vermelho ou amarelo). Num fundo claro/pastel como o do app de referência, eles perdem o preenchimento e colapsam em linha.

```css
:root{
  --rb-bg:     #0B0F2B;  /* fundo, navy quase preto — nunca #000 puro */
  --rb-navy:   #23286B;  /* superfícies/cards — núcleo medido no azul da lata ED */
  --rb-white:  #FFFFFF;
  --rb-silver: #C9CDD4;
  --rb-ice:    #BBEEFF;  /* medido nos ícones: réguas, deltas, estados neutros */
  --rb-red:    #D8102F;  /* acento ÚNICO: alvo, erro, CTA */
  --rb-yellow: #FFC800;  /* só no acerto perfeito */
}
```
Proporção: 70% navy/quase-preto, 20% branco/prata, 8% vermelho, 2% amarelo. **Um acento por tela.** Antes de fechar, ponham o conta-gotas no vermelho dos touros e no amarelo do sol da lata ED e substituam os dois acentos pelos valores reais do arquivo — e declarem essa derivação no relatório, já que nenhum brand book foi entregue.

**O que NÃO fazer:** não recriar o display LED laranja/verde-limão (é a paleta do app concorrente, não da Red Bull); não usar gradiente azul-para-roxo; nada de texto vermelho sobre navy (vermelho só em preenchimento sólido com texto branco por cima); não redesenhar o logo dos touros nem baixar do Google — ele **não está** nos assets, mas está impresso nas latas fornecidas. Usem o packshot como assinatura e registrem em uma linha do relatório: *"o logo não constava nos materiais fornecidos; usamos o packshot oficial como assinatura."*

**Tipografia.** `@font-face` local, nunca CDN. CondBold caixa alta com tracking +0.02em nos títulos e mensagens de resultado (56-72px); Bold no número gigante (180-220px, com o grid de largura fixa do problema 7); Medium caixa alta nos labels de UI (20-24px); Book na única frase de instrução. Máximo 3 pesos visíveis por tela. Converter só os 2-3 pesos usados para WOFF2 (`npx ttf2woff2`, corta ~50%).

**Assets a usar (5, no máximo):** `5_Number_Icon.png` (o alvo), `1_Wings_Icon.png` (acerto), `1_trophy_Icon_1.png` (top do dia), `Checkered Flag_Racing_Icon.png` (fim), 1 lata ED (atração + medidor). Cuidado verificado: o par ABERTA/FECHADA da lata ED tem dimensões diferentes (1773x4938 contra 1762x4500), então **ancorem a troca pela base da lata**, não pelo centro, senão a imagem pula na tela.

**Layout fluido, um só.** `clamp()` e unidades relativas a `min(100vw,100vh)`; botão principal com `clamp(180px, 40vmin, 340px)`; centralização por grid; **zero media query de orientação** e nada de overlay "gire o tablet". Em retrato o layout simplesmente empilha. A trava de paisagem fica no aparelho.

### Copy das mensagens

Escalonada por Δ = |seu tempo − 5,00s|. Caixa alta, CondBold, 2 a 5 palavras, sorteando 1 de 3 por faixa para quem joga duas vezes não ver a mesma linha.

| Faixa | Copy |
|---|---|
| **PERFEITO** (Δ ≤ 0,05s) | "NA MOSCA." / "ISSO FOI CIRÚRGICO." / "CRAVOU." |
| **QUASE** (0,05 < Δ ≤ 0,20s) | "POR UM SOPRO." / "FALTOU UM PISCAR." / "0,14 DO PERFEITO." |
| **MÉDIO** (0,20 < Δ ≤ 0,60s) | "MEIO SEGUNDO É UMA ETERNIDADE." / "DE NOVO, MAIS CALMO." |
| **LONGE** (Δ > 0,60s) | "O RELÓGIO GANHOU ESSA." / "DÁ PRA TROCAR 4 PNEUS NESSE TEMPO." |
| **NÃO PAROU** | "TEMPO. LITERALMENTE." |

Botão de reinício: **"DE NOVO"**, não "Tentar novamente". E uma linha fixa no rodapé do resultado, em Book 18px, que é onde a narrativa de marca entra sem custar código: *"A Red Bull Racing troca 4 pneus em 1,82s — Interlagos, 2019."* Escrevam exatamente assim e **não** "o recorde atual" (a marca foi superada pela McLaren em 2023; errar um fato de F1 na frente do cliente é pior que não citar).

### Arquitetura de código (isto é 25% da nota)

```
redbull-timer/
├─ README.md                 ← link jogável no topo, antes de qualquer parágrafo
├─ index.html                ← as 3 telas em marcação semântica, zero JS inline
├─ src/
│  ├─ main.js                ← bootstrap: liga DOM, estado e loop (~40 linhas)
│  ├─ core/rules.js          ← funções PURAS: calcularErro, classificarFaixa, sortearId
│  ├─ core/state.js          ← estado único + setState(); nenhuma referência a DOM
│  ├─ core/timer.js          ← performance.now(); rAF só pinta
│  ├─ ui/render.js           ← estado → DOM; nenhuma regra aqui
│  └─ storage/ranking.js     ← localStorage atrás de 3 funções, todas em try/catch
├─ styles/{tokens,base,screens}.css
├─ public/assets/{fonts,img}/  ← versionado, só derivados otimizados
├─ tools/{optimize-assets,build-standalone}.mjs
├─ tests/rules.test.mjs      ← node --test, zero dependência
└─ docs/{ARQUITETURA,DECISOES}.md
```

Três regras não negociáveis, escritas no topo do `ARQUITETURA.md`: (1) **fluxo único** — evento → `rules` → `state` → `render`; nada em `core/` toca `document`, nada em `ui/` decide regra; (2) **uma fonte de verdade** — proibido `parseFloat(el.textContent)` para saber o placar; (3) **troca de tela por atributo**, nunca `innerHTML` reconstruindo layout. JSDoc em toda função exportada, começando por `rules.js` — é o arquivo que o avaliador vai abrir. Zero `console.log` no commit final. Commits em português com mensagem descritiva; o histórico também é lido.

---

## Escopo e cronograma até 18/08 16h

### MVP inegociável
- Tela de atração autoexplicativa com um botão só.
- 3 tentativas cegas contra alvo fixo de 5s, com erro calculado e faixa classificada.
- Tela de resultado com fechamento claro e reinício em um toque.
- Identidade visual aplicada (paleta, Futura local, ícones, lata).
- Funciona no Safari do iPad **e** no Chrome desktop com mouse/teclado.
- README + arquitetura em módulos + JSDoc + 1 arquivo de teste.
- Link publicado e vídeo de 30-60s gravado.

### Se sobrar tempo (nesta ordem)
Ranking local com top 5 → identificador sorteado com ícone → animação da lata abrindo no acerto → service worker offline → duelo de 2 jogadores → som.

### Cortar sem dó
Seletor de nº de jogadores, tabela de Standings, painel de operador, export CSV, QR code, cooldown, blocklist, anti-cheat, qualquer backend.

### Cronograma

| Horário | O quê |
|---|---|
| 21:00-21:30 | Travar escopo (as 12 decisões). Corrigir `.gitignore`, `gh repo create --public --push`, ligar Pages com `index.html` mínimo. **Deploy funcionando antes de existir jogo.** |
| 21:30-22:00 | **Teste no iPad real com o link vazio**: toque, orientação, tamanho. Em paralelo: converter os 5 assets para WebP, 2 pesos em WOFF2, escrever `tokens.css`. |
| 22:00-23:30 | Esqueleto: `index.html` com as 3 telas, `state.js`, `rules.js`, `timer.js`. Loop funcionando, feio. |
| 23:30-00:30 | **JOGÁVEL FIM A FIM**: atração → 3 tentativas → resultado → reinício. Commit e deploy. |
| **00:30** | **Checkpoint duro.** Se não estiver jogável, corta para 1 tentativa e nada de ranking, sem discussão. |
| 00:30-01:30 | Passada de UI: botão gigante, display com grid de largura fixa, hierarquia visual. |
| 01:30-02:00 | Teste no iPad. Commit e deploy. Em paralelo: alguém já rascunha o relatório (seções que não dependem de print). |
| 02:00-08:00 | **DORMIR 6h.** Código de 4h da manhã é o que quebra na demo. Nada de revezamento heroico. |
| 08:00-08:30 | Smoke test no iPad + lista de bugs priorizada. |
| 08:30-10:30 | UX/UI (20%): animações de resultado, copy, transições, cartaz final. |
| 10:30-11:30 | Ranking local + edge cases: toque duplo, multi-touch (`pointerId`), `pointercancel`, reset entre jogadores, storage vazio. |
| **11:30** | **FREEZE DE FEATURES.** Só entra correção de bug bloqueante. |
| 11:30-12:30 | Qualidade técnica (25%): JSDoc, README completo, `docs/`, `tests/rules.test.mjs`, remover código morto e `console.log`, arrumar mensagens de commit. |
| 12:30-13:00 | Build standalone, teste de duplo clique, teste do link em **janela anônima** e no **4G do celular**. |
| **13:00** | **FREEZE TOTAL.** |
| 13:00-13:30 | Gravar vídeo de 45s no iPad + 5 prints. |
| 13:30-14:30 | Escrever e exportar o relatório em PDF (sem LibreOffice/pandoc nesta máquina — usar Google Docs → Baixar como PDF). |
| **14:30** | **ENVIAR.** 1h30 de margem para o desastre. |

### Depois da entrega (noite de 18/08 → manhã de 19/08)
Só se a resposta a "vai para o estande?" for sim: attract mode reforçado, service worker, gesto de recuperação, Acesso Guiado com senha em papel, checklist do aparelho (Não Perturbe, Bloqueio Automático Nunca, brilho máximo, orientação travada, iPad na tomada, silencioso off). Escrever **duas listas separadas** no README — "Escopo da entrega (18/08 16h)" e "Escopo de operação em feira (pós-entrega)" — converte esse backlog de ameaça ao prazo em plano de continuidade, e é evidência direta de planejamento para os 25%.

### Plano de degradação na apresentação
N1 link principal (Pages) já carregado no iPad · N2 espelho (Netlify **logado**) em segunda aba · N3 `dist/redbull-timer.html` de arquivo único, offline, no app Arquivos e no notebook · N4 vídeo de 45s no rolo da câmera + prints dentro do PDF já aberto · N5 notebook com `python3 -m http.server 8000` rodando. Se travar: **não conserte ao vivo.** Diga "temos o backup gravado" e vá para o vídeo em 5 segundos. Um integrante é o operador único do iPad; os outros não tocam nele.

---

## Checklist de entrega

- [ ] Relatório em **PDF** (ou DOCX), anexado ao e-mail — não só link.
- [ ] Relatório abre pela **solução**, não pelo contexto ("Já sabemos a problemática, o foco do relatório deve ser sua resolução").
- [ ] **Link jogável em destaque no topo**, antes de qualquer parágrafo. Link espelho logo abaixo. Link do repositório.
- [ ] Descrição da mecânica e do conceito criativo em **1 página**.
- [ ] "Como se joga" em 3 passos numerados com um print ao lado de cada (isso É a prova do critério Facilidade de uso).
- [ ] Declarar a duração medida da jogada ("~40 segundos") — o briefing impõe teto de 2 minutos.
- [ ] Declarar quais palavras-chave e quais arquivos de ícone foram usados e onde.
- [ ] Declarar que o jogo não coleta nenhum dado pessoal e por qual regra do briefing.
- [ ] Declarar a derivação da paleta (nenhum brand book foi entregue) e a ausência do logo isolado.
- [ ] **Vídeo de 30-60s** demonstrando tela inicial → jogada → tela de fim. Se passar de 25 MB, subir no Drive/YouTube não listado e **abrir o link em janela anônima** para confirmar que não pede acesso.
- [ ] **3 a 5 prints** incorporados dentro do PDF, não como anexos soltos.
- [ ] Link testado em **janela anônima** e no **4G do celular** — não só no notebook com cache.
- [ ] Placar **zerado** antes de mandar o link.
- [ ] **PARA:** `inspercoding1@gmail.com` (conferir letra por letra — é "coding1", com o número).
- [ ] **CC visível** (nunca CCO): `angelo.piatto@redbull.com`.
- [ ] Assunto identificando grupo e integrantes; nomes completos no corpo e na capa.
- [ ] Enviado até **18/08 às 16h** — meta real **14h30**.
- [ ] Alguém do grupo abre o e-mail recebido no celular e clica em cada link.

---

## Anexos

### Inventário de assets (`/home/daniel/projects/insper/redbull_hacka/assets/`)

| Pasta | Conteúdo | Peso | Observações |
|---|---|---|---|
| `Fontes/` | 5 TTF: FuturaforRedBull Book, Light, Medium, Bold, CondBold | 688 KB | **Sem feature `tnum`**; dígito "1" 43-56% mais estreito; nomes de família internos inconsistentes. Converter os 2-3 usados para WOFF2. |
| `2023 Cartoon Icons (update)/` | 48 PNGs — números 1 a 10, Wings, Trophy, Can, Checkered Flag, Energy Flash, Barriers, Gift Card, Bulb, DNA, Brand Love etc. | 41 MB | Resoluções heterogêneas (medido nos 48): 23 em 1080x1080, 14 em 591x591, 4 em 1890x1890 (`Icon_2Cans`, `Icon_MemoryStructures`, `Icon_MentalAvailability`, `Icon_PCC`), 2 em 500x500, e um de cada em 3145x3144, 1334x1340, 1281x1157, 945x945 e **97x97** (`Energy_Magnet_Icon` — inutilizável, não conte com ele). Os **11 ícones numéricos são todos 1080x1080** e servem para uso grande; `Checkered Flag_Racing_Icon` e `Energy_Flash_Icon` são 591x591, ou seja, uso médio no máximo. **Não existe ícone de zero nem de vírgula.** |
| `LATAS/INDIVIDUAIS/` | 25 PNGs, 13 sabores (ED, Zero/Sugarfree, Ice, Maçã, Cereja, Melancia, Melão, Nectarina, Nectarina SF, Pêssego, Pomelo, Tropical, Amora) | 91 MB | 11 sabores têm par ABERTA/FECHADA; **Melancia e Nectarina regular só têm FECHADA**. Maior: 2126x4373 / 9,0 MB. Pares abertos são mais altos que os fechados — ancorar pela base. |

**Não fornecido:** o logo dos dois touros (existe impresso nas latas — use o packshot); brand book com hex oficiais; lista de palavras-chave da marca.

**Ferramentas ausentes nesta máquina:** `convert`, `magick`, `cwebp`, `ffmpeg`, Pillow, LibreOffice, pandoc, wkhtmltopdf. Disponíveis: Node v24.14.1, Python 3.12.3, `gh` autenticado como Daniel-Vinicius (escopos `repo`, `workflow`).

### ⚠️ Alerta do `.gitignore`

O arquivo contém exatamente a linha `assets` (6 bytes, sem quebra de linha). Confirmado: `git check-ignore -v assets/Fontes/FuturaforRedBull-Bold.ttf` retorna `.gitignore:1:assets`. **Toda fonte e toda imagem estão fora do controle de versão.** `git add .` vai pular todas elas em silêncio, e o deploy vai subir um site sem tipografia e sem imagens.

Correção, agora:
```bash
mv assets assets-raw
printf 'assets-raw/\nnode_modules/\ndist/\n.DS_Store\n' > .gitignore
mkdir -p public/assets/fonts public/assets/img
git add -A && git commit -m "chore: estrutura inicial e correcao do gitignore"
```
Depois do primeiro deploy: abrir o link em janela anônima e conferir **zero 404** no DevTools. Esse teste de 30 segundos é o que separa entregar de não entregar.
