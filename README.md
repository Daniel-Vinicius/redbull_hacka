# Cronômetro Invisível

**Microativação digital Red Bull — Feira de carreiras, Universidade Mackenzie.**

Sorteamos um tempo. Você tenta parar o cronômetro nele.
Só que o cronômetro não aparece.

Uma partida inteira dura **cerca de 40 segundos** até o placar, não pede nome, não pede
cadastro e não depende de rede para funcionar.

---

## Rodar

```bash
npm install
npm run dev
```

Depois abra <http://localhost:8000>.

Precisa de um servidor HTTP — o projeto usa módulos ES, que o navegador recusa
em `file://` (origem nula, bloqueio de CORS). Abrir o `index.html` com dois
cliques **não funciona**, e no Safari do iPad nem isso é possível.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm test` | 81 testes das regras, do formato do placar e da degradação do armazenamento. Runner nativo do Node, zero dependências. |
| `npm run smoke` | Joga duas partidas num Chromium headless com viewport de iPad — uma boa e uma ruim — e confere os dois desfechos. Falha com erro de console, 404, carrossel descentralizado ou derrota entrando no placar. Regrava os prints em `docs/prints/`. **Exige `npm run dev` rodando em outro terminal** — sem servidor, o Playwright morre com `ERR_CONNECTION_REFUSED`. |
| `npm run smoke:pages` | Monta o conjunto que o **git publica** (`git ls-files`), serve estático sem API nenhuma e joga em cima dele. É o ensaio do GitHub Pages. |
| `npm run assets` | Regera `public/media/` e `src/core/sabores.gerado.js` a partir de `assets/`. Só é preciso se os materiais da marca mudarem. |

### Testar com várias pessoas ao mesmo tempo

`npm run dev` já sobe a API de placar. Para jogar de vários aparelhos:

```bash
ngrok http 8000
```

Todo mundo que abrir o link do túnel divide o **mesmo placar**, gravado em
`dados/ranking.json`. O jogo detecta a API sozinho — não há nada para
configurar. Ver [Placar](#placar) abaixo.

---

## Como se joga

1. **Toque no botão.** Uma contagem de 3 segundos mostra o alvo sorteado, com
   bipes e uma buzina de largada.
2. **Conte na cabeça.** O cronômetro está correndo, mas não aparece em lugar
   nenhum da tela.
3. **Toque para parar.** A tela mostra seu tempo, o quanto você errou e quanto
   já gastou do orçamento.
4. Três tentativas. Ganhou? Escolhe sua lata e entra no placar. Não ganhou?
   A tela devolve você para o começo, para tentar de novo.

### A dificuldade cresce a cada rodada

| Rodada | Alvo sorteado entre |
|---|---|
| 1 | 2 e 4 segundos |
| 2 | 4 e 6 segundos |
| 3 | 7 e 10 segundos |

### Como se ganha uma lata

| Como | Condição |
|---|---|
| **Erro total** | Somar **até 1,50 s** de erro nas três tentativas — o limite conta como vitória (`<=`). Vale só para quem parou o cronômetro nas três: abandonar uma rodada desclassifica, porque o tempo dela é uma penalidade sintética e não uma medição do jogador. |
| **Cravada de primeira** | Acertar o alvo com 2 casas decimais logo na 1ª tentativa. Encerra a partida na hora. |

Cravar na 2ª ou na 3ª não leva a lata sozinho: **zera o erro daquela rodada** e o
jogo segue. Cravar de primeira é instinto puro — o jogador ainda não viu erro
nenhum e não teve como calibrar. Da segunda em diante ele já sabe se adiantou ou
atrasou, então a cravada vira a melhor rodada possível, não a partida inteira.

O placar ordena pelo **mesmo número**: a soma dos erros, menor primeiro. É de
propósito — o jogador só precisa entender uma coisa, e essa coisa é também a
régua da competição. Uma rodada ruim pode ser compensada chegando perto nas
outras duas.

**Só quem ganha entra no placar.** Quem estoura o orçamento não escolhe lata e
não vira linha no ranking: da tela de derrota volta direto para a atração, que é
o convite para jogar de novo. O placar é a lista das latas que saíram hoje.

---

## Decisões de produto que o briefing impôs

**Nenhum campo de texto no jogo inteiro.** O briefing veda "login, cadastro ou
coleta de dados pessoais" e manda evitar etapas intermediárias. O jogador é
identificado por um sabor que ele **escolhe** num carrossel, mais um número
sequencial do dia: `TROPICAL 7`, `CEREJA 12`. Escolher uma lata é um gesto de
marca, não um formulário — e não identifica ninguém.

**Zero rede em tempo de execução na entrega.** O placar publicado vive no
`localStorage` do aparelho. A API compartilhada existe só para o time testar.

**O totem se recicla sozinho.** Cada tela avança sozinha por inatividade, e
qualquer erro não tratado devolve o jogo ao estado limpo. Nenhum dado do
jogador N aparece no primeiro frame do jogador N+1.

As telas do fim — veredito, escolha da lata e placar — seguram **30 s cada**.
São telas de leitura, não de jogo: é onde a pessoa lê que ganhou, mostra para o
amigo e fotografa. Nenhuma delas prende ninguém, todas avançam no toque; o tempo
só decide quando o totem se recicla sozinho se a pessoa foi embora. O preço é
que um vencedor que abandona no meio deixa o totem até 90 s fora da atração
(quem perde, 30 s, porque vê uma tela só) — `RESULTADO_MS`, `SABOR_MS` e
`INATIVIDADE_FINAL_MS` em `src/core/config.js` encurtam isso se a fila do
estande pedir.

**Nenhuma animação com ritmo constante durante a janela cega.** Um pulso
periódico na tela viraria metrônomo e resolveria o jogo pelo jogador.

O raciocínio completo, incluindo o que foi considerado e descartado, está em
[`docs/DECISOES.md`](docs/DECISOES.md).

---

## Placar

Uma fachada com dois armazenamentos por trás, escolhidos sozinho na abertura:

```
        ┌─────────────────┐
        │  ui/render.js   │  lê o placar de forma SÍNCRONA, de um cache
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ dados/ranking.js│  fachada + cache em memória
        └───┬─────────┬───┘
            │         │
   armazenamento   armazenamento
      -local        -remoto
   (localStorage)   (fetch /api/ranking)
```

Na abertura, o jogo sonda `GET api/ranking` com timeout de 1,5 s. Respondeu,
usa remoto; não respondeu, usa local. **O mesmo build serve os dois cenários**:
no GitHub Pages não existe API, então cai para local — que é o que o briefing
exige. Atrás de `npm run dev` ou de um túnel, o placar é compartilhado.

O cache existe por um motivo concreto: o `render` desenha o placar a cada
mudança de estado, de forma síncrona. Se a leitura fosse assíncrona, a
renderização inteira teria que esperar rede — exatamente o que a premissa de
estabilidade proíbe. A rede acontece só nas bordas: na abertura, ao gravar, e
num polling de 5 s **que só roda na tela de atração**. Durante uma rodada
cronometrada não há nenhuma requisição.

Qualquer falha do remoto degrada para o local, em silêncio.

---

## Estrutura

```
index.html              as 7 telas em marcação semântica, zero JS inline
app.webmanifest         instalação na Tela de Início do iPad (modo quiosque)

src/
  main.js               orquestração: liga eventos, regras, estado e render
  core/
    config.js           todos os parâmetros do jogo, num lugar só
    regras.js           funções PURAS: alvo, erro, cravada, vitória
    cronometro.js       performance.now() com guardas de multi-toque
    estado.js           fonte única de verdade + observadores
    jogadores.js        identidade: sabor escolhido + número
    sabores.gerado.js   GERADO por tools/optimize-assets.mjs
    mensagens.js        toda a copy, separada da lógica
    audio.js            efeitos sintetizados na Web Audio API
  dados/
    registro.js         formato, numeração e ordenação do placar (puro)
    ranking.js          fachada com cache
    armazenamento-local.js    localStorage
    armazenamento-remoto.js   API HTTP
  ui/
    render.js           estado → DOM. O único módulo que ESCREVE no DOM
    carrossel.js        gesto e navegação do slider de sabores

styles/
  tokens.css            paleta (amostrada dos assets), tipografia, espaço
  base.css              reset, @font-face, blindagem de quiosque, display
  telas.css             layout de cada tela

tools/
  optimize-assets.mjs   132 MB de PNG → ~1,5 MB de WebP + WOFF2 + cores
  estaticos.mjs         servir arquivos, compartilhado pelos dois servidores
  servidor.mjs          estáticos + API de placar, zero dependências
  smoke.mjs             duas partidas headless + geração de prints
  smoke-pages.mjs       o mesmo smoke, mas só com o que o git publica

tests/                  81 testes, `node --test`
docs/                   arquitetura, decisões e prints
```

### Três regras de arquitetura

O fluxo é sempre o mesmo, em uma direção só:

```
evento → regras (puras) → estado → render → DOM
```

1. **Nada em `core/` toca `document`. Nada em `ui/` decide regra.** É por isso
   que `regras.js` é testável sem navegador: tudo que varia — o sorteio, o
   relógio — entra por parâmetro. Sendo exato: `render.js` é o único módulo que
   **escreve** no DOM; `main.js` só lê o `document` para ligar os listeners na
   carga.
2. **Uma fonte de verdade.** O estado mora em `estado.js`. É proibido descobrir
   o placar lendo `textContent` de um elemento.
3. **Troca de tela é troca de atributo.** `render` marca `data-ativa` na seção
   da vez; o HTML nunca é reconstruído.

Detalhes em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Notas de iPad

O aparelho do evento é um **iPad 10ª geração, iPadOS 26.5.2**.

- **Medição de tempo:** só `performance.now()`, capturado na primeira linha do
  handler de `pointerdown`, antes de qualquer acesso ao DOM. Nunca `Date.now()`,
  nunca contagem de frames de `requestAnimationFrame`.
- **Multi-toque:** só o ponteiro primário para o cronômetro. Um segundo dedo na
  tela — o amigo, a palma na borda — não invalida a rodada.
- **Quiosque:** `Adicionar à Tela de Início` roda em `display: standalone`, sem
  a barra do Safari, com o ícone da lata já achatado no navy da marca (o iOS
  compõe qualquer transparência contra preto). Para travar de verdade, use o **Acesso Guiado** (Ajustes →
  Acessibilidade), com *Motion* desligado para a tela não girar.
- **Áudio:** o `AudioContext` só liga dentro de um gesto do usuário, e é
  silenciado pela chave lateral do iPad. Por isso o som é **100% ornamental**:
  todo feedback necessário existe em cor, escala e movimento.
- **Assets:** os PNG originais chegam a 9 MB / 2126×4373 px, o que vira ~37 MB
  de bitmap na memória e derruba o Safari. `npm run assets` reduz o conjunto
  usado, nenhum arquivo acima de 200 KB.
- **Tipografia:** a Futura for Red Bull **não tem** a feature OpenType `tnum`, e
  o dígito "1" avança 0,391 em contra 0,686 em dos demais. Sem tratamento, o
  cronômetro trepida lateralmente. A largura é travada célula a célula no CSS,
  com os valores lidos da tabela `hmtx` das próprias fontes.

---

## Publicar

O jogo é estático: sobe no GitHub Pages sem nenhuma configuração. Não existe
API no ar — a sonda de placar leva 404, o jogo cai para `localStorage` sozinho,
e é isso que o briefing pede.

**Antes de publicar, rode `npm run smoke:pages`.** O `npm run smoke` joga contra
a pasta de trabalho, onde todo arquivo existe; o Pages serve só o que está no
repositório, e os dois conjuntos podem divergir em silêncio. Foi o que
aconteceu uma vez: a linha `dados/` do `.gitignore` casava com **qualquer** pasta
chamada `dados`, em qualquer nível, e levou `src/dados/` junto. O deploy ficou
verde e o jogo quebrou no ar com 404 em `armazenamento-local.js`. Por isso os
padrões do `.gitignore` são ancorados com barra inicial (`/assets/`, `/dados/`)
e existe um teste que monta o conjunto publicável de verdade e joga em cima
dele.

---

## Operação no estande

- **Zerar o placar:** três toques no canto superior esquerdo da tela, em menos
  de 1,5 s. Funciona sem sair do Acesso Guiado. Faça isso antes de abrir a feira.
- **Antes de mandar o link para avaliação:** zere o placar, para ninguém abrir
  e encontrar as jogadas de teste.
- **Checklist do aparelho:** Bloqueio Automático = Nunca, Não Perturbe ligado,
  brilho no máximo, orientação travada, iPad na tomada.

---

## Números medidos

| | |
|---|---|
| Primeiro carregamento | **398 KB** em 28 recursos, DOMContentLoaded em ~35 ms |
| Latas do carrossel | +559 KB (12 arquivos), carregadas só quando a partida acaba |
| Assets originais → servidos | 132 MB → 1,5 MB |
| Partida até o veredito | ~40 s no caso médio (teto do briefing: 120 s) |
| Telas de leitura depois | 30 s cada, e todas avançam no toque |
| Testes | 81 unitários + smoke E2E nos dois modos de placar |

---

## Materiais da marca

Fontes e imagens vieram do drive fornecido no briefing; os originais ficam em
`assets/` e não são servidos ao navegador. O favicon e o ícone de Tela de Início
saem da bandeira quadriculada do pacote de ícones cartoon, gerados por
`npm run assets`. A paleta e a cor de cada sabor foram
**amostradas dos próprios packshots** — nenhum brand book foi entregue. O logo
dos dois touros não constava nos materiais: usamos o packshot oficial como
assinatura, sem redesenhar nem baixar o logo de outra fonte.

**Atenção ao usar os arquivos originais:** três nomes não descrevem o conteúdo.
`RED BULL_MELANCIA_*.png` é a lata azul Red Bull Sugarfree (não existe lata de
melancia no pacote) e `RED BULL_NECTARINA_*.png` é a The Summer Edition — a
Nectarina de verdade está em `RED BULL_NECTARINA_ SUGARFREE_*.png`, com espaço
no nome. Os rótulos usados no jogo foram lidos das próprias latas.
