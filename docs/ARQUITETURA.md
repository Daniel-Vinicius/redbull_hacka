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
   ┌─────────────┐   único módulo que toca `document`
   │  ui/render  │   estado → DOM
   └─────────────┘
```

O placar entra pela lateral: `dados/ranking.js` mantém um cache em memória e o
`render` lê dele de forma síncrona. Ver a seção Placar no README.

`main.js` é o único arquivo que conhece todas as peças. Ele não decide regra:
decide **quando** perguntar à regra.

## Três invariantes

1. **`core/` nunca importa `document`. `ui/` nunca decide regra.**
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
                                                                   │
                                                                   ▼
                                                                 SABOR
                                                                   │
                                                                   ▼
ATRACAO ◀── toque / inatividade / erro não tratado ───────────── PLACAR
```

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

A latência de toque do aparelho aparece nos dois toques e se cancela na
subtração — por isso não é compensada.

## Testes

`tests/regras.test.mjs` cobre as regras, a formatação, a identidade do jogador
e o cronômetro. `tests/registro.test.mjs` cobre numeração, ordenação e
saneamento do placar — compartilhados pelos dois armazenamentos e pelo
servidor, então precisam se comportar igual nos três. São 50 casos ao todo,
`node --test`, zero dependências.

`tools/smoke.mjs` sobe o jogo num Chromium headless com viewport de iPad, joga
uma partida inteira por toque, navega o carrossel por botão e por teclado,
confirma um sabor, e verifica que o totem volta limpo para a atração. Falha com
qualquer erro de console ou requisição quebrada. É também o que gera os prints
de `docs/prints/`.

Ele espera `load` e não `networkidle`: a tela de atração busca o placar a cada
5 s, então a rede nunca fica ociosa — por projeto.
