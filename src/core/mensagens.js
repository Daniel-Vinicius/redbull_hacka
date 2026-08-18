/**
 * Copy do jogo
 * =============
 *
 * Texto separado da lógica: para reescrever qualquer frase da ativação não é
 * preciso abrir um arquivo de regra. Cada faixa tem várias variantes e o jogo
 * sorteia uma — quem joga duas vezes seguidas não lê a mesma linha.
 *
 * Tom: caixa alta, 2 a 6 palavras, quem apanha é o relógio e não o jogador.
 */

/** Frase exibida durante a contagem regressiva, antes de cada tentativa. */
export const FRASE_PREPARO = 'PRESSIONE NO TEMPO CERTO. CONCENTRE-SE!'

/** Rótulos da contagem regressiva, do maior para o menor, terminando na largada. */
export const CONTAGEM = ['3', '2', '1', 'JÁ!']

/**
 * Mensagens por faixa de erro de uma tentativa.
 * As chaves espelham os ids de `FAIXAS` em `regras.js`.
 * @type {Record<string, string[]>}
 */
export const MENSAGENS_TENTATIVA = Object.freeze({
  cravou: ['CRAVOU.', 'NA MOSCA.', 'ISSO FOI CIRÚRGICO.', 'ZEROU A RODADA.'],
  quase: ['POR UM SOPRO.', 'FALTOU UM PISCAR.', 'QUASE PERFEITO.'],
  bom: ['DENTRO DA JANELA.', 'ISSO FOI PILOTAGEM.', 'MANDOU BEM.'],
  medio: ['DE NOVO, MAIS CALMO.', 'O RELÓGIO ENGANOU VOCÊ.', 'TÁ PERTO. RESPIRA.'],
  longe: [
    'FALTOU UM RED BULL!',
    'ESTÁ PRECISANDO DE ASAS?',
    'O RELÓGIO GANHOU ESSA.',
    'DAVA PRA TROCAR 4 PNEUS NESSE TEMPO.',
  ],
})

/** Mensagem quando o jogador simplesmente não encostou na tela. */
export const MENSAGEM_NAO_PAROU = 'TEMPO. LITERALMENTE.'

/** Rótulo do orçamento de erro, mostrado a cada tentativa. */
export const ROTULO_ORCAMENTO = 'ERRO TOTAL'

/**
 * Manchetes da tela de resultado.
 * @type {Record<string, {titulo: string, linha: string}>}
 */
export const FINAL = Object.freeze({
  cravada: {
    titulo: 'CRAVOU DE PRIMEIRA',
    linha: 'Acertou o alvo no centésimo, na primeira tentativa. Pega sua lata.',
  },
  consistencia: {
    titulo: 'GANHOU SUAS ASAS',
    linha: 'Fechou as três somando menos de 1,50 s de erro. Pega sua lata.',
  },
  derrota: {
    titulo: 'O RELÓGIO VENCEU',
    linha: 'Some menos de 1,50 s de erro nas três tentativas e a lata é sua.',
  },
})

/**
 * Rótulo do botão da tela de resultado. O destino muda com o veredito: quem
 * ganhou segue para escolher a lata, quem não ganhou volta para a atração.
 * @type {Record<string, string>}
 */
export const BOTAO_RESULTADO = Object.freeze({
  vitoria: 'ESCOLHER MINHA LATA',
  derrota: 'JOGAR DE NOVO',
})

/**
 * Copy da tela de escolha do sabor. Só quem ganhou chega aqui — o placar é dos
 * vencedores do dia — então há um texto só.
 * @type {{kicker: string, botao: string}}
 */
export const SABOR = Object.freeze({
  kicker: 'VOCÊ GANHOU UMA LATA',
  botao: 'É ESSA',
})

/**
 * Assinaturas do rodapé, sorteadas a cada partida.
 *
 * Todas são sobre TEMPO, que é o assunto do jogo, e todas foram conferidas em
 * fonte primária. Nenhuma afirma recorde vigente: o pit stop de 1,82 s da Red
 * Bull em Interlagos foi superado pela McLaren (1,80 s, Qatar, 2023), e a frase
 * diz apenas o que aconteceu. Errar um fato na frente do cliente é pior do que
 * não citar fato nenhum.
 *
 * @type {ReadonlyArray<string>}
 */
export const ASSINATURAS = Object.freeze([
  'A Red Bull Racing trocou 4 pneus em 1,82 s — Interlagos, 2019.',
  'Felix Baumgartner levou 34 segundos para romper a barreira do som — Red Bull Stratos, 2012.',
  'Um salto do Red Bull Cliff Diving dura menos de 3 segundos — 27 metros, a 85 km/h.',
  'O Wings for Life World Run começa no mesmo segundo no mundo inteiro — 11h UTC.',
  'No Red Bull Air Race, uma volta inteira levava pouco mais de 50 segundos — a 370 km/h.',
  'Max Verstappen venceu sua primeira corrida com 18 anos e 228 dias — Red Bull Racing, 2016.',
])

/**
 * Texto da colocação do jogador no placar do dia.
 *
 * Diz "ganhadores", e não "jogadores": desde que a derrota deixou de entrar no
 * placar, o total é quantas latas saíram hoje. "3º de 8 hoje" faria o jogador
 * achar que só oito pessoas jogaram.
 *
 * @param {number} posicao colocação, 1-indexada
 * @param {number} total quantos entraram no placar
 * @returns {string}
 */
export function textoDaPosicao(posicao, total) {
  if (total <= 1) return 'PRIMEIRA LATA DO DIA'
  return `${posicao}º entre ${total} ganhadores hoje`
}

/**
 * Sorteia um item de uma lista.
 * @template T
 * @param {ReadonlyArray<T>} opcoes
 * @param {() => number} rng
 * @returns {T}
 */
function sortear(opcoes, rng) {
  return opcoes[Math.floor(rng() * opcoes.length)]
}

/**
 * Sorteia uma variante de mensagem para a faixa.
 * @param {string} faixa id da faixa
 * @param {boolean} parou o jogador chegou a tocar a tela?
 * @param {() => number} [rng] injetável para teste
 * @returns {string}
 */
export function mensagemPara(faixa, parou, rng = Math.random) {
  if (!parou) return MENSAGEM_NAO_PAROU
  return sortear(MENSAGENS_TENTATIVA[faixa] ?? MENSAGENS_TENTATIVA.longe, rng)
}

/**
 * Sorteia a assinatura do rodapé.
 * @param {() => number} [rng] injetável para teste
 * @returns {string}
 */
export function assinaturaAleatoria(rng = Math.random) {
  return sortear(ASSINATURAS, rng)
}
