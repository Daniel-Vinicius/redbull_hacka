# Decisões de projeto

Registro do que foi decidido, por quê, e o que foi descartado. Serve para não
refazer discussão às 3 da manhã e para responder ao avaliador sem improviso.

---

## Mecânica

**Três rodadas de dificuldade crescente, cronômetro cego: 2–4 s, 4–6 s, 7–10 s.**

O alvo é sorteado em passos de 10 ms. Não é detalhe: um alvo de 3,417 s seria
impossível de cravar por arredondamento, e não por habilidade. Alinhar ao
centésimo garante que o número exibido é exatamente o número a bater.

**Por que o piso da rodada 1 é 2 s e não 1 s.** Dois problemas concretos
aparecem com alvos de 1 segundo:

1. A contagem regressiva bate 3 · 2 · 1 em intervalos de exatamente 1 s. Para
   um alvo de 1 s, isso é um metrônomo tocado imediatamente antes da jogada —
   entrega a resposta.
2. O cronômetro larga sozinho na buzina, mas quem para é o dedo do jogador.
   A latência de toque entra inteira no tempo medido e **não se cancela**, como
   se cancelaria se o jogador desse os dois toques. São dezenas de
   milissegundos: irrelevante num alvo de 8 s, material num de 1 s, e enviesa
   sistematicamente a cravada.

Subir para 2 s custa nada, preserva o escalonamento pedido e resolve os dois.

**Por que cego.** Com o cronômetro visível o jogo vira teste de reflexo: todo
mundo acerta, o placar empata em zero e a disputa morre. Cego, o erro humano
típico em estimar 8-15 s fica na casa das centenas de milissegundos, o que
espalha o placar e mantém a cravada rara o suficiente para valer prêmio.

**Por que 3 tentativas.** Uma tentativa é sorte. Três dão arco de melhora — a
pessoa calibra na primeira e briga nas outras duas — e ainda cabem no teto de
2 minutos do briefing com folga.

---

## Vitória

| Como | Condição | Por quê |
|---|---|---|
| **Erro total** | soma dos 3 erros abaixo de **1,50 s** | O prêmio alcançável, que faz valer a pena tentar |
| **Cravada de primeira** | mesmo número do alvo, com 2 casas, logo na 1ª tentativa | O prêmio raro que dá história para contar |

Cravar depois da primeira não vale a lata sozinho — zera o erro daquela rodada e
o jogo continua. O porquê está em "A cravada vale a partida só na primeira
tentativa", mais abaixo.

**Por que a soma, e não uma tolerância por tentativa.**

A primeira versão exigia as três tentativas dentro de ±0,5 s cada. Com alvos
escalonados isso quebra: ±0,5 s num alvo de 3 s é até 17% de erro permitido, e
num alvo de 9 s é 5,5%. A rodada 1 vira gratuita e só a rodada 3 filtra alguém —
a regra diria "as três", mas na prática seria "a terceira".

A soma resolve isso e é melhor por dois outros motivos:

- **É uma regra só, e é o mesmo número que ordena o placar.** O jogador não
  precisa entender duas coisas. A barra de orçamento na tela de feedback mostra
  esse número subindo, o que ensina a mecânica sem uma linha de instrução — e o
  briefing proíbe manual.
- **Permite compensar.** Errar feio numa rodada e quase cravar as outras duas
  ainda ganha. Premia consistência sem punir um tropeço, que é o comportamento
  certo para um jogo de 50 segundos numa feira.

**Calibragem.** 1,50 s é uma estimativa: erro típico de ~0,2 s nas rodadas
curtas e ~0,6 s na longa coloca a vitória perto de 50% para quem está prestando
atenção. Depois de umas dez partidas reais, ajuste `LIMITE_ERRO_TOTAL_MS` em
`src/core/config.js` — é a única coisa que precisa mudar.

### Quem perde não entra no placar

A derrota vê o veredito e volta para a atração. Não escolhe lata, não vira linha
no ranking.

O placar chama-se "Melhores do dia" e fica na primeira tela, onde o passante o
lê antes de jogar. Com todo mundo dentro, ele viraria uma lista de quem passou
pelo estande, ordenada por quem foi menos pior — e a linha de baixo seria sempre
uma pessoa exposta por ter ido mal. Com só os vencedores, ele vira a lista das
latas que saíram hoje: mais curto, mais legível e melhor de olhar.

Custa uma coisa, e é o motivo de a decisão não ser óbvia: quem perde sai sem
nenhum registro de ter jogado. Foi trocado de propósito pelo convite imediato —
o botão da tela de derrota diz **JOGAR DE NOVO** e leva de volta à atração em um
toque, que é o que se quer de um jogo de 40 segundos numa feira.

### A cravada vale a partida só na primeira tentativa

Cravar significa imprimir o mesmo número do alvo, com duas casas. Isso vale
coisas diferentes dependendo de quando acontece:

- **Na 1ª tentativa** o jogador é declarado campeão e a partida acaba ali. É o
  único momento em que cravar é instinto puro: ele ainda não viu o próprio erro
  em rodada nenhuma, não tem referência de ritmo e não teve como calibrar.
- **Na 2ª ou na 3ª** a cravada zera o erro daquela rodada e o jogo continua. A
  essa altura o jogador já sabe se adiantou ou atrasou e por quanto — cravar
  virou a melhor rodada possível, não a partida inteira.

Encerrar em qualquer tentativa, como na primeira versão, criava uma injustiça
silenciosa: quem cravasse na terceira levava a lata por cima de quem fechou as
três dentro do orçamento, que é o feito mais difícil dos dois. O flag
`CRAVADA_VENCE_DE_PRIMEIRA` em `src/core/config.js` desliga o atalho inteiro.

**Não há caso especial no erro total.** Quem cravou de primeira soma exatamente
zero, porque a cravada zera o erro da rodada em `registrarTentativa`. Uma regra
a menos para o placar conhecer, e o líder continua sendo simplesmente quem tem o
menor número.

Zerar o erro da cravada não é arredondamento por preguiça: o jogo inteiro é
jogado em duas casas decimais — é isso que o alvo mostra e é isso que o tempo
mostra. Cobrar os poucos milissegundos de diferença que só existem na física do
ponto flutuante seria cobrar por uma precisão que o jogo nunca ofereceu.

Quem abandonou uma rodada não ganha por erro total, mesmo que a soma caiba no
limite: o tempo daquela tentativa é uma penalidade sintética, não uma medição.

**A regra da cravada é derivada da formatação, não de uma tolerância em ms.**
Um `Math.round(ms / 10)` parece equivalente e não é: diverge de `toFixed` na
fronteira de meio centésimo, porque 11,415 não é exatamente representável em
ponto flutuante. Nesse caso o jogo declararia vitória enquanto a tela mostraria
dois números diferentes — o pior tipo de bug, o que parece injustiça. O teste
`ehCravada > concorda com o que a tela mostra` existe para travar isso.

---

## Identidade do jogador

**Sabor ESCOLHIDO pelo jogador + número sequencial do dia.** `TROPICAL 7`,
`CEREJA 12`.

Na primeira versão o sabor era sorteado. Passou a ser escolhido num carrossel
no estilo do site da marca, depois do resultado. A conformidade não muda —
escolher uma lata não é dado pessoal — e o ganho é grande: vira um momento de
marca em vez de um sorteio, e a pessoa sai com "eu peguei a Tropical".

O carrossel vem **depois do veredito**, de propósito: saber que ganhou uma lata
muda o sentido de escolher qual lata é. A copy se adapta aos dois casos.

Se o jogador largar o tablet, a tela avança sozinha com o sabor que estiver
centralizado — que começa sorteado, para o placar não virar uma coluna só de
Tradicional.

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

**Ordenado pela soma dos erros — o mesmo número que decide o prêmio.**

Dois armazenamentos atrás de uma fachada, escolhidos sozinho na abertura:
`localStorage` e uma API HTTP. A sonda de 1,5 s decide qual usar, então o mesmo
build funciona publicado (sem API → local) e atrás de um túnel (com API →
compartilhado).

**Isso não reintroduz a dependência de rede que o briefing proíbe.** A entrega
no GitHub Pages não tem API nenhuma e roda 100% local. O remoto existe para um
cenário só: o time testar a jogabilidade com várias pessoas, cada uma no seu
aparelho, via ngrok — com localStorage, cada celular teria um placar isolado.
E mesmo no modo remoto, nada bloqueia a tela: a leitura é sempre do cache em
memória, a rede acontece só nas bordas, e qualquer falha degrada para local em
silêncio.

O número de chegada é atribuído por **quem grava** — no modo remoto, pelo
servidor. Dois aparelhos calculando o próprio número gerariam dois "TROPICAL 7".

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
- **Degradação do placar remoto é bruta, de propósito.** Se a API cair no meio
  do POST, `ranking.js` troca para o armazenamento local e regrava a partida ali
  — o jogador não perde a lata dele. Mas o local numera a partir de 1 e não
  conhece as jogadas que estavam no servidor: a tela seguinte mostra um placar
  com uma linha só. Preferimos isso a fundir as duas listas, que produziria dois
  jogadores com o mesmo número de chegada — ou seja, um placar errado em vez de
  um placar curto. Só acontece no modo remoto, que é ferramenta de teste e não a
  entrega. Coberto por `tests/dados.test.mjs`.

---

## Os nomes dos arquivos de lata não são confiáveis

Achado durante a montagem do carrossel, ao conferir cada packshot contra o
rótulo impresso na lata em vez de confiar no nome do arquivo:

| Arquivo | O que realmente contém |
|---|---|
| `RED BULL_MELANCIA_*.png` | A lata azul **Red Bull Sugarfree**. Não existe lata de melancia no pacote. |
| `RED BULL_NECTARINA_*.png` | **The Summer Edition** (sabor nectarina). |
| `RED BULL_NECTARINA_ SUGARFREE_*.png` | A **Nectarina** de verdade. Repare no espaço no nome. |

O carrossel usa 12 sabores, todos com o nome lido da própria lata. A lata azul
entrou como "Sugarfree", que é o que está escrito nela — chamá-la de melancia
colocaria um erro visível na tela, na frente do cliente.

Vale a pena repetir a conferência se novos assets chegarem.

---

## Cor de cada sabor

Amostrada do próprio packshot por `tools/optimize-assets.mjs`, que gera
`src/core/sabores.gerado.js`. O método descarta pixels transparentes e pixels
quase neutros — o prata e o branco existem em todas as latas e venceriam a
contagem em qualquer sabor, apagando justamente o que diferencia um do outro —
e devolve a média do balde de cor mais populoso.

O script também calcula a luminância relativa e marca `textoEscuro` quando o
fundo é claro demais para texto branco. Sem isso, o amarelo do Tropical
(`#ECB701`) e o verde do Melão (`#68AC2D`) ficariam com texto ilegível.

Arquivo gerado e versionado: a procedência fica clara, não há duplicação manual
de valores, e regenerar é `npm run assets`.

---

## Visibilidade das telas

A primeira versão enumerava em CSS os pares
`body[data-tela='x'] .tela[data-para='x']`. Ao acrescentar as telas de
resultado, sabor e placar, esquecer uma linha ali fez três telas existirem no
DOM e nunca aparecerem — sem erro nenhum no console, e o smoke test só pegou
porque procurava um botão que nunca ficava visível.

Agora `ui/render.js` marca `data-ativa` na seção da vez e o CSS tem uma regra
só. A lista de telas vive num lugar só, em `core/estado.js`.
