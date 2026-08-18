# Cronômetro Invisível

**Microativação digital Red Bull — Feira de carreiras, Universidade Mackenzie.**

Sorteamos um tempo entre 8 e 15 segundos. Você tenta parar o cronômetro nele.
Só que o cronômetro não aparece.

Uma partida inteira dura **cerca de 45 segundos**, cabe em três telas, não pede
nome, não pede cadastro e não depende de rede para funcionar.

---

## Rodar

Precisa de um servidor HTTP local — o projeto usa módulos ES, que o navegador
recusa em `file://` (origem nula, bloqueio de CORS). Abrir o `index.html` com
dois cliques **não funciona**, e no Safari do iPad nem isso é possível.

```bash
npm run dev
```

Depois abra <http://localhost:8000>. Qualquer servidor estático serve; se
preferir, `npx serve .` faz o mesmo.

### Outros comandos

```bash
npm test
```

Testes das regras do jogo, com o runner nativo do Node. Zero dependências.

```bash
npm run assets
```

Regera `public/media/` a partir de `assets/`. Só é necessário se os materiais
originais da marca mudarem — a saída já está versionada.

```bash
node tools/smoke.mjs
```

Joga uma partida inteira num Chromium headless com viewport de iPad, falha se
houver erro de console ou 404, e grava os prints em `docs/prints/`.

---

## Como se joga

1. **Toque no botão.** Uma contagem regressiva de 3 segundos mostra o alvo
   sorteado, com bipes e uma buzina de largada.
2. **Conte na cabeça.** O cronômetro está correndo, mas não aparece em lugar
   nenhum da tela.
3. **Toque para parar.** A tela mostra seu tempo e o quanto você errou.
4. Três tentativas, e acabou.

### Como se ganha uma lata

| Como | Condição |
|---|---|
| **Cravada** | Acertar o alvo com 2 casas decimais em qualquer tentativa. Encerra a partida na hora. |
| **Consistência** | Fechar as três tentativas dentro de ±0,5 s do alvo. |

O placar do dia ordena pela **soma dos erros** das três tentativas — menor é
melhor. Quem crava entra com erro total zero, no topo.

---

## Decisões de produto que o briefing impôs

**Nenhum campo de texto no jogo inteiro.** O briefing veda "login, cadastro ou
coleta de dados pessoais" e manda evitar etapas intermediárias. O jogador é
identificado por um rótulo **sorteado pelo sistema** — sabor de lata + número
sequencial do dia: `TROPICAL 7`, `MELANCIA 12`. Zero teclado, zero dado
pessoal, zero risco de palavrão no placar da marca.

**Zero rede em tempo de execução.** O placar vive no `localStorage` do próprio
aparelho. Não há backend, não há sincronização, não há serviço externo capaz de
cair no meio da feira.

**O totem se recicla sozinho.** A tela final volta para a atração após 30
segundos, e qualquer erro não tratado devolve o jogo ao estado limpo. Nenhum
dado do jogador N aparece no primeiro frame do jogador N+1.

**Nenhuma animação com ritmo constante durante a janela cega.** Um pulso
periódico na tela viraria metrônomo e resolveria o jogo pelo jogador.

O raciocínio completo, incluindo o que foi considerado e descartado, está em
[`docs/DECISOES.md`](docs/DECISOES.md).

---

## Estrutura

```
index.html              as 3 telas em marcação semântica, zero JS inline
app.webmanifest         instalação na Tela de Início do iPad (modo quiosque)

src/
  main.js               orquestração: liga eventos, regras, estado e render
  core/
    config.js           todos os parâmetros do jogo, num lugar só
    regras.js           funções PURAS: alvo, erro, cravada, vitória
    cronometro.js       performance.now() com guardas de multi-toque
    estado.js           fonte única de verdade + observadores
    jogadores.js        identidade sorteada (sabor + número)
    mensagens.js        toda a copy, separada da lógica
    audio.js            efeitos sintetizados na Web Audio API
  dados/
    ranking.js          placar em localStorage, com fallback em memória
  ui/
    render.js           estado → DOM. O único módulo que toca `document`

styles/
  tokens.css            paleta (amostrada dos assets), tipografia, espaço
  base.css              reset, @font-face, blindagem de quiosque, display
  telas.css             layout de cada tela

tools/
  optimize-assets.mjs   132 MB de PNG → 724 KB de WebP + WOFF2
  smoke.mjs             partida completa headless + geração de prints

tests/regras.test.mjs   33 testes das regras
docs/                   arquitetura, decisões e prints
```

### Três regras de arquitetura

O fluxo é sempre o mesmo, em uma direção só:

```
evento → regras (puras) → estado → render → DOM
```

1. **Nada em `core/` toca `document`. Nada em `ui/` decide regra.** É por isso
   que `regras.js` é testável sem navegador: tudo que varia — o sorteio, o
   relógio — entra por parâmetro.
2. **Uma fonte de verdade.** O estado mora em `estado.js`. É proibido descobrir
   o placar lendo `textContent` de um elemento.
3. **Troca de tela é troca de atributo.** `body[data-tela]` alterna qual seção
   aparece; o HTML nunca é reconstruído.

Detalhes em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Notas de iPad

O aparelho do evento é um **iPad 10ª geração, iPadOS 26.5.2**.

- **Medição de tempo:** só `performance.now()`, capturado na primeira linha do
  handler de `pointerdown`, antes de qualquer acesso ao DOM. Nunca `Date.now()`,
  nunca contagem de frames de `requestAnimationFrame`. A latência de toque
  aparece nos dois toques e se cancela na subtração.
- **Multi-toque:** só o ponteiro primário para o cronômetro. Um segundo dedo na
  tela — o amigo, a palma na borda — não invalida a rodada.
- **Quiosque:** `Adicionar à Tela de Início` roda em `display: standalone`, sem
  a barra do Safari. Para travar de verdade, use o **Acesso Guiado** (Ajustes →
  Acessibilidade), com *Motion* desligado para a tela não girar.
- **Áudio:** o `AudioContext` só liga dentro de um gesto do usuário, e é
  silenciado pela chave lateral do iPad. Por isso o som é **100% ornamental**:
  todo feedback necessário existe em cor, escala e movimento.
- **Assets:** os PNG originais chegam a 9 MB / 2126×4373 px, o que vira ~37 MB
  de bitmap na memória e derruba o Safari. `npm run assets` reduz o conjunto
  usado a 724 KB, nenhum arquivo acima de 200 KB.
- **Tipografia:** a Futura for Red Bull **não tem** a feature OpenType `tnum`, e
  o dígito "1" avança 0,391 em contra 0,686 em dos demais. Sem tratamento, o
  cronômetro trepida lateralmente. A largura é travada célula a célula no CSS,
  com os valores lidos da tabela `hmtx` das próprias fontes.

---

## Operação no estande

- **Zerar o placar:** três toques no canto superior esquerdo da tela, em menos
  de 1,5 s. Funciona sem sair do Acesso Guiado. Faça isso antes de abrir a feira.
- **Antes de mandar o link para avaliação:** zere o placar, para ninguém abrir
  e encontrar as jogadas de teste.
- **Checklist do aparelho:** Bloqueio Automático = Nunca, Não Perturbe ligado,
  brilho no máximo, orientação travada, iPad na tomada.

---

## Materiais da marca

Fontes e ícones vieram do drive fornecido no briefing; os originais ficam em
`assets/` e não são servidos ao navegador. A paleta foi **amostrada do próprio
packshot** entregue — nenhum brand book foi fornecido. O logo dos dois touros
não constava nos materiais: usamos o packshot oficial como assinatura, sem
redesenhar nem baixar o logo de outra fonte.
