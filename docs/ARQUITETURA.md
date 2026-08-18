# Arquitetura

## O fluxo, em uma direção só

```
 pointerdown / keydown / arraste
          │
          ▼
   ┌─────────────┐   funções puras, sem DOM
   │ core/regras │   sortearAlvo · calcularErro · ehCravada · avaliarPartida
   └─────────────┘   erroTotalDe · faixaDaTentativa · cravouDePrimeira
          │
          ▼
   ┌─────────────┐   fonte única de verdade
   │ core/estado │   { tela, alvoMs, tentativas, resultado, ... }
   └─────────────┘
          │  observar()
          ▼
   ┌─────────────┐   único módulo que ESCREVE no DOM
   │  ui/render  │   estado → DOM
   └─────────────┘
```

O placar entra pela lateral: `dados/ranking.js` mantém um cache em memória e o
`render` lê dele de forma síncrona. Ver a seção Placar no README.

`main.js` é o único arquivo que conhece todas as peças. Ele não decide regra:
decide **quando** perguntar à regra.

## Três invariantes

1. **`core/` nunca toca `document`. `ui/` nunca decide regra.**
   Mais preciso: `render.js` é o único módulo que **escreve** no DOM. O
   `main.js` lê o `document` para ligar os listeners uma vez na carga, e o
   `carrossel.js` monta as próprias latas no `<ul>` que recebe — nenhum dos dois
   escreve estado de jogo na tela. A única exceção de `core/` é o
   `window.AudioContext` em `audio.js`, que é a API de som do navegador e está
   isolada atrás de uma fachada que engole qualquer erro.

   É o que torna `regras.js` testável sem navegador. Tudo que varia entra por
   parâmetro — inclusive o sorteio (`rng`) e o relógio (`agora`), que os testes
   substituem por valores fixos.

2. **Uma fonte de verdade.**
   O estado mora em `estado.js` e muda só por `definir()`. É proibido descobrir
   o placar lendo `textContent` de um elemento.

3. **Troca de tela é troca de atributo.**
   `render` marca `data-ativa` na seção da vez. O HTML das sete telas já está no
   `index.html` e nunca é reconstruído — trocar de tela não custa reflow de
   layout no meio de uma rodada.

## Ciclo de vida de uma partida

```
ATRACAO ──toque──▶ PREPARO ──3·2·1·buzina──▶ RODADA ──toque──▶ FEEDBACK
                      ▲                                            │
                      └──────────── mais tentativas ───────────────┤
                                                                   ▼
                                                              RESULTADO
                                                        venceu?     │
                                     ┌───── não ───────────────────┴─ sim ─┐
                                     │                                     ▼
                                     │                                   SABOR
                                     │                                     │
                                     │                                     ▼
ATRACAO ◀────────────────────────────┴──────────────────────────────── PLACAR
        ▲ toque / inatividade / erro não tratado
```

**A bifurcação depois de RESULTADO é a decisão de produto mais delicada do
jogo.** Quem não fecha o orçamento não escolhe lata e não entra no placar: o
ranking é de ganhadores, e uma lista com quem perdeu diluiria o prêmio. Quem
perde vê o veredito, recebe um botão "JOGAR DE NOVO" e volta para a atração.
`tools/smoke.mjs` joga uma segunda partida mal de propósito e prova por
`MutationObserver` que as telas SABOR e PLACAR não aparecem nesse caminho —
é regressão fácil de introduzir e cara de perceber.

Cada tela depois do jogo avança sozinha por inatividade: um visitante que larga
o tablet no meio nunca deixa o totem parado para o próximo da fila. Mexer no
carrossel adia o auto-avanço, para quem quer ver todas as latas ter tempo.

`voltarParaAtracao()` é chamado na **entrada** da atração, nunca na saída da
tela final. Assim todo caminho de erro também termina em estado limpo. A regra
dura: nenhum dado do jogador N pode aparecer no primeiro frame do jogador N+1.

Todos os `setTimeout` em voo ficam num array e são cancelados em bloco a cada
transição — sem isso, uma tentativa abandonada dispararia no meio da partida
seguinte.

## Precisão de medição

`cronometro.js` guarda um único instante de largada obtido de
`performance.now()`. O timestamp de parada é lido na **primeira linha** do
handler de `pointerdown`, antes de qualquer leitura ou escrita no DOM: um layout
recalculado antes da medição vira erro de dezenas de milissegundos.

O que é evitado, e por quê:

| Evitado | Motivo |
|---|---|
| `Date.now()` | Pula se o relógio do sistema for ajustado |
| Contar frames de `rAF` | Depende do hardware e congela fora de foco |
| `click` / `touchend` | Disparam depois de `pointerdown`, com atraso variável |
| Animar `box-shadow`, `filter`, `width` | Pintura roda na thread que mede o tempo |

A largada é automática — a buzina dispara sozinha no fim da contagem — e só a
parada é um toque. Ou seja: **existe um toque na medição, não dois**, e a
latência do aparelho (~75 ms num iPad) entra inteira no tempo medido, sem
cancelar. Ela não é compensada porque é a mesma para todo mundo no mesmo
aparelho: o jogo compara jogadores entre si, não contra um cronômetro oficial.
Compensar exigiria estimar a latência do dispositivo em tempo de execução, o que
é chute — e um chute errado desloca todos os tempos.

É também por isso que a primeira rodada tem piso de 2 s (`config.js`): dezenas
de milissegundos são irrelevantes em 8 s e materiais em 1 s.

## Testes

`tests/regras.test.mjs` cobre as regras, a formatação, a identidade do jogador
e o cronômetro. `tests/registro.test.mjs` cobre numeração, ordenação e
saneamento do placar — compartilhados pelos dois armazenamentos e pelo
servidor, então precisam se comportar igual nos três.

`tests/dados.test.mjs` cobre a camada de armazenamento, e é quase todo caminho
de erro: esses três módulos existem para TOLERAR FALHA, então um teste de
caminho feliz não prova nada sobre eles. Com dublês de `localStorage` e de
`fetch` ele reproduz, sem navegador e sem servidor, a chave corrompida, a
navegação privada do Safari, a cota estourada, o 404 do GitHub Pages e o
servidor caindo exatamente no POST — com o tablet na mão do jogador.

São 81 casos ao todo, `node --test`, zero dependências.

`tools/smoke.mjs` sobe o jogo num Chromium headless com viewport de iPad e joga
**duas** partidas por toque: uma bem jogada, que precisa vencer, navegar o
carrossel por botão e por teclado, confirmar um sabor e voltar limpo para a
atração; e uma mal jogada de propósito, que precisa perder e voltar para a
atração sem passar pelo placar. Também mede a centralização da lata escolhida —
o carrossel já saiu de lugar uma vez sem quebrar teste nenhum. Falha com
qualquer erro de console ou requisição quebrada. É o que gera os prints de
`docs/prints/`.

`tools/smoke-pages.mjs` roda o mesmo teste contra o conjunto que o **git
publica** (`git ls-files`), servido estático e sem API nenhuma. Existe porque o
smoke normal joga contra a pasta de trabalho, onde todo arquivo existe: os dois
conjuntos já divergiram em silêncio uma vez, e o jogo publicado quebrou com 404
enquanto o teste local passava.

Ele espera `load` e não `networkidle`: a tela de atração busca o placar a cada
5 s, então a rede nunca fica ociosa — por projeto.
