# Decisões de projeto

Registro do que foi decidido, por quê, e o que foi descartado. Serve para não
refazer discussão às 3 da manhã e para responder ao avaliador sem improviso.

---

## Mecânica

**Alvo sorteado entre 8 e 15 s, cronômetro cego, 3 tentativas.**

O alvo é sorteado em passos de 10 ms. Não é detalhe: um alvo de 11,417 s seria
impossível de cravar por arredondamento, e não por habilidade. Alinhar ao
centésimo garante que o número exibido é exatamente o número a bater.

**Por que cego.** Com o cronômetro visível o jogo vira teste de reflexo: todo
mundo acerta, o placar empata em zero e a disputa morre. Cego, o erro humano
típico em estimar 8-15 s fica na casa das centenas de milissegundos, o que
espalha o placar e mantém a cravada rara o suficiente para valer prêmio.

**Por que 3 tentativas.** Uma tentativa é sorte. Três dão arco de melhora — a
pessoa calibra na primeira e briga nas outras duas — e ainda cabem no teto de
2 minutos do briefing com folga.

**Duração medida:** 3 × (3 s de contagem + até 15 s de janela cega + 2,6 s de
feedback) ≈ 45 s no caso médio, 63 s no pior caso. O briefing impõe 2 minutos.

---

## Vitória

| Como | Condição | Por quê |
|---|---|---|
| **Cravada** | mesmo número do alvo, com 2 casas | O prêmio raro que dá história para contar |
| **Consistência** | as 3 dentro de ±0,5 s | O prêmio alcançável, que faz valer a pena tentar |

A cravada **encerra a partida na hora**, em qualquer tentativa. Restringir isso
à primeira tentativa seria arbitrário e puniria quem acerta na segunda. Quem
quiser o comportamento estrito muda `CRAVADA_ENCERRA_PARTIDA` em
`src/core/config.js` — está lá justamente para isso.

Quando a cravada encerra antes da 3ª tentativa, as tentativas não jogadas contam
como erro zero. Quem cravou já é, por definição, o melhor resultado possível, e
isso mantém `erroTotalMs` comparável no placar.

**A regra da cravada é derivada da formatação, não de uma tolerância em ms.**
Um `Math.round(ms / 10)` parece equivalente e não é: diverge de `toFixed` na
fronteira de meio centésimo, porque 11,415 não é exatamente representável em
ponto flutuante. Nesse caso o jogo declararia vitória enquanto a tela mostraria
dois números diferentes — o pior tipo de bug, o que parece injustiça. O teste
`ehCravada > concorda com o que a tela mostra` existe para travar isso.

---

## Identidade do jogador

**Sabor sorteado + número sequencial do dia.** `TROPICAL 7`, `MELANCIA 12`.

O briefing veda "login, cadastro ou coleta de dados pessoais dentro do jogo" e
manda evitar "telas ou etapas intermediárias que não sejam essenciais". Um campo
de texto fere os dois: é zona cinzenta no primeiro e inequivocamente uma etapa
intermediária no segundo — e esse segundo argumento não depende de interpretação.

Fora isso, no iPad o teclado do sistema não redimensiona o viewport: um layout
`position: fixed` de altura total fica **atrás** do teclado e o botão de
confirmar some. E um placar da Red Bull num evento universitário com texto livre
é um palavrão esperando acontecer.

### Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Campo de texto para o nome | Etapa vedada; teclado quebra o layout; risco de palavrão |
| Teclado arcade de 3 letras | Conforme, mas são horas de UI que não pontuam em nenhuma linha da rúbrica |
| Sem identidade nenhuma | Seguro e barato, mas perde o "esse sou eu no placar" por quase nada de economia |
| Backend / placar em servidor | Viola "não pode depender de conexões ou serviços instáveis" |

---

## Placar

**100% local, `localStorage`, ordenado pela soma dos erros.**

Toda leitura e escrita passa por `try/catch` com espelho em memória: navegação
privada ou cota estourada degradam o placar, nunca derrubam o jogo —
Funcionalidade vale 20% da nota, placar vale zero.

Empate resolve por ordem de chegada: quem marcou primeiro fica na frente.

Com menos de 2 registros o placar mostra um estado próprio ("Seja o primeiro a
cravar") em vez da tabela. Placar quase vazio numa tela lê como produto
quebrado — e preencher com entradas fantasma seria fabricar dado, indefensável
se alguém perguntar de onde veio.

**Ficou de fora, deliberadamente:** painel de operador, export CSV, QR code,
cooldown anti-repetição, blocklist, anti-fraude. A rúbrica não tem uma linha
sobre integridade de placar, e num contexto de feira o risco real é poluição,
não trapaça. Anti-fraude proporcional ao contexto.

---

## Interface

**Nenhuma animação com ritmo constante durante a janela cega.** Qualquer pulso
periódico na tela — um brilho respirando, uma lata enchendo em loop — vira
metrônomo e resolve o jogo pelo jogador. A tela da rodada é deliberadamente
estática. O botão só pulsa na atração, onde o objetivo é justamente chamar quem
está passando.

**Partido escuro.** Não é gosto: os ícones cartoon fornecidos são preenchidos em
branco com contorno preto e sombreado azul-gelo — medido em `1_Wings_Icon.png`,
80% de pixels neutros, 19% ciano ~`#BBEEFF`, 0% de vermelho ou amarelo. Sobre
fundo claro eles perdem o preenchimento e colapsam em linha.

**Paleta amostrada, não inventada.** Nenhum brand book foi entregue. Os azuis e
o vermelho saíram do próprio packshot: `#232968` (núcleo do azul da lata, cor
cromática dominante), `#384493` (mediana dos pixels azuis), `#BB2545` (p90 dos
vermelhos). O packshot é uma ilustração "molhada", com sombreamento que escurece
tudo, então o vermelho foi clareado para uso em tela e o amarelo levado ao tom
saturado da marca. As duas derivações estão declaradas aqui e no relatório.

**Um layout fluido só, sem media query de orientação.** Em retrato as colunas
viram linhas sozinhas. Nada de overlay "gire o tablet": o primeiro usuário real
do link é um avaliador abrindo no Chrome de um notebook, e travar o layout em
paisagem de iPad seria a forma mais fácil de perder UX/UI no primeiro frame.

**Largura de dígito travada no CSS.** Ver `styles/base.css` — a Futura não tem
`tnum` e o "1" é 43% mais estreito que os outros dígitos. As larguras das células
(0,70 em para dígito, 0,36 em para vírgula) saíram da tabela `hmtx` dos TTF. A
primeira versão usou valores estimados menores que o glifo e a vírgula
transbordou por cima do dígito seguinte.

---

## Som

**Sintetizado na Web Audio API, zero arquivos.** Bipes da contagem, buzina de
largada, clique de parada, fanfarra de campeão. Nenhum `.mp3` no repositório:
economiza banda, elimina espera de carregamento e não levanta dúvida de
licenciamento de sample num material de marca.

**É 100% ornamental.** O `AudioContext` nasce suspenso no iOS e Web Audio é
silenciado pela chave lateral do iPad. Numa feira barulhenta o som não carrega
informação nenhuma de qualquer forma. Regra: todo feedback necessário existe em
cor, escala e movimento. Se o áudio falhar, ninguém perde nada.

---

## Em aberto

- **Palavras-chave da marca.** O briefing exige "uso das informações/palavras-chave
  fornecidas pela marca" como premissa obrigatória, mas a lista não veio no
  drive. A decisão da equipe foi investir em identidade visual e usar o
  vocabulário derivado dos próprios materiais (sabores das latas, Wings,
  Checkered Flag). **Isso precisa ser declarado no relatório** — derivação
  declarada é defensável, ausência silenciosa não.
- **O protótipo vai para o estande de quarta?** Se sim, entra a lista de
  operação: Acesso Guiado com senha em papel, service worker para offline real,
  checklist do aparelho. Nada disso está no caminho crítico da entrega.
