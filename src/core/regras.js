/**
 * Regras do jogo — funções PURAS
 * ===============================
 *
 * Nada aqui toca `document`, `localStorage`, `Math.random` global ou relógio.
 * Toda entrada vem por parâmetro e toda saída é valor de retorno — é o que
 * torna este arquivo inteiramente testável em `tests/regras.test.mjs`.
 *
 * Vocabulário do domínio:
 *   alvo        tempo que o jogador precisa reproduzir, em ms
 *   tempo       tempo que o jogador de fato marcou, em ms
 *   erro        |tempo - alvo|, em ms — quanto menor, melhor
 *   erro total  soma dos erros das três tentativas: decide o prêmio E o placar
 *   cravada     tempo que imprime o MESMO número do alvo, com 2 casas decimais.
 *               Zera o erro da rodada; na PRIMEIRA tentativa, vence a partida.
 */

import { CONFIG } from './config.js'

/**
 * Sorteia o alvo de uma rodada, dentro da faixa daquela rodada e alinhado ao
 * passo de 10 ms.
 *
 * @param {number} rodada índice da rodada, começando em 0
 * @param {() => number} [rng] gerador de aleatório em [0,1). Injetável para teste.
 * @returns {number} alvo em milissegundos
 */
export function sortearAlvo(rodada, rng = Math.random) {
  const faixas = CONFIG.FAIXAS_ALVO
  // Uma rodada além do previsto cai na última faixa em vez de quebrar.
  const [minimo, maximo] = faixas[Math.min(rodada, faixas.length - 1)]
  const passos = Math.floor((maximo - minimo) / CONFIG.ALVO_PASSO_MS) + 1
  return minimo + Math.floor(rng() * passos) * CONFIG.ALVO_PASSO_MS
}

/**
 * Erro absoluto de uma tentativa.
 * @param {number} tempoMs tempo marcado pelo jogador
 * @param {number} alvoMs alvo da rodada
 * @returns {number} erro em milissegundos, sempre >= 0
 */
export function calcularErro(tempoMs, alvoMs) {
  return Math.abs(tempoMs - alvoMs)
}

/**
 * Diferença com sinal: negativo = adiantou, positivo = atrasou.
 * @param {number} tempoMs
 * @param {number} alvoMs
 * @returns {number} delta em milissegundos
 */
export function calcularDelta(tempoMs, alvoMs) {
  return tempoMs - alvoMs
}

/**
 * A tentativa cravou o alvo?
 *
 * A regra do jogo é "acertar o tempo com 2 casas depois da vírgula", então a
 * comparação é feita entre os números FORMATADOS — os mesmos que o jogador lê
 * na tela.
 *
 * Comparar centésimos arredondados por aritmética (`Math.round(ms / 10)`)
 * parece equivalente e não é: `toFixed` e `Math.round` discordam na fronteira
 * de meio centésimo, porque 11,415 não é exatamente representável em ponto
 * flutuante. Nesse caso o jogo declararia cravada enquanto a tela mostraria
 * dois números diferentes — o pior tipo de bug, o que parece injustiça.
 * Derivar a regra da formatação elimina a divergência por construção.
 *
 * @param {number} tempoMs
 * @param {number} alvoMs
 * @returns {boolean}
 */
export function ehCravada(tempoMs, alvoMs) {
  return formatarSegundos(tempoMs) === formatarSegundos(alvoMs)
}

/**
 * Faixas de desempenho, usadas só para escolher copy e cor.
 *
 * O corte de 500 ms em `bom` não é arbitrário: é exatamente
 * `LIMITE_ERRO_TOTAL_MS / TENTATIVAS`, ou seja, a média que o jogador precisa
 * manter para ganhar. "Bom" quer dizer literalmente "essa tentativa está no
 * ritmo do orçamento".
 *
 * A cravada NÃO é uma faixa: ela depende do par (tempo, alvo) e não da
 * magnitude do erro, e vive em `Tentativa.cravada`. Manter as duas coisas
 * separadas evita que uma fronteira de arredondamento faça a tela dizer
 * "cravou" numa tentativa que a regra não premiou.
 *
 * @type {ReadonlyArray<{id: string, ateMs: number}>}
 */
export const FAIXAS = Object.freeze([
  { id: 'quase', ateMs: 150 },
  { id: 'bom', ateMs: CONFIG.LIMITE_ERRO_TOTAL_MS / CONFIG.TENTATIVAS },
  { id: 'medio', ateMs: 1_500 },
  { id: 'longe', ateMs: Infinity },
])

/**
 * Classifica uma tentativa pela magnitude do erro.
 * @param {number} erroMs
 * @returns {string} id da faixa
 */
export function classificarFaixa(erroMs) {
  return FAIXAS.find((faixa) => erroMs <= faixa.ateMs).id
}

/**
 * Faixa efetiva de uma tentativa, já considerando a cravada.
 * É este o valor que a interface usa para escolher cor e mensagem.
 * @param {Tentativa} tentativa
 * @returns {string}
 */
export function faixaDaTentativa(tentativa) {
  return tentativa.cravada ? 'cravou' : classificarFaixa(tentativa.erroMs)
}

/**
 * @typedef {object} Tentativa
 * @property {number} tempoMs tempo marcado (0 se o jogador não parou)
 * @property {number} alvoMs alvo daquela tentativa
 * @property {number} erroMs erro absoluto
 * @property {boolean} parou false quando estourou o limite sem toque
 * @property {boolean} cravada acertou o alvo com 2 casas decimais
 */

/**
 * Monta o registro de uma tentativa a partir do tempo bruto.
 *
 * A cravada zera o erro da rodada, e não é arredondamento por preguiça: o jogo
 * inteiro é jogado em duas casas decimais — é isso que o alvo mostra, é isso que
 * o tempo mostra. Se os dois números impressos são o mesmo, cobrar os 4 ms de
 * diferença que existem só na física do ponto flutuante seria cobrar por uma
 * precisão que o jogo nunca ofereceu ao jogador.
 *
 * @param {number|null} tempoMs tempo marcado, ou null se o jogador não parou
 * @param {number} alvoMs
 * @returns {Tentativa}
 */
export function registrarTentativa(tempoMs, alvoMs) {
  const parou = tempoMs !== null
  const tempo = parou ? tempoMs : alvoMs + CONFIG.LIMITE_EXTRA_MS
  const cravada = parou && ehCravada(tempo, alvoMs)
  return {
    tempoMs: tempo,
    alvoMs,
    erroMs: cravada ? 0 : calcularErro(tempo, alvoMs),
    parou,
    cravada,
  }
}

/**
 * Diferença com sinal de uma tentativa, já respeitando a cravada.
 *
 * Existe porque `calcularDelta` trabalha com o tempo bruto: numa cravada ele
 * devolveria −2 ms, e a tela imprimiria "−0,00" — um sinal de menos na frente
 * de um zero, que lê como defeito. Se o jogo considera a rodada zerada, o
 * número mostrado tem que ser zero.
 *
 * @param {Tentativa} tentativa
 * @returns {number} delta em milissegundos
 */
export function deltaDaTentativa(tentativa) {
  return tentativa.cravada ? 0 : calcularDelta(tentativa.tempoMs, tentativa.alvoMs)
}

/**
 * Soma dos erros das tentativas. É a chave de ordenação do placar e o número
 * que decide o prêmio — por isso vive numa função só, usada pelas duas coisas.
 * @param {Tentativa[]} tentativas
 * @returns {number} erro total em milissegundos
 */
export function erroTotalDe(tentativas) {
  return tentativas.reduce((soma, tentativa) => soma + tentativa.erroMs, 0)
}

/**
 * @typedef {object} Resultado
 * @property {boolean} venceu ganhou uma lata?
 * @property {'cravada'|'consistencia'|null} motivo por que ganhou
 * @property {number} erroTotalMs soma dos erros — chave de ordenação do ranking
 * @property {number} melhorErroMs menor erro entre as tentativas
 * @property {boolean} completa a partida chegou ao fim?
 */

/**
 * A partida foi vencida na primeira tentativa, no centésimo?
 *
 * É a única cravada que vale a lata sozinha. Nas rodadas seguintes ela continua
 * valendo muito — zera o erro da rodada, ver `registrarTentativa` — mas não
 * encerra a partida.
 *
 * @param {Tentativa[]} tentativas
 * @returns {boolean}
 */
export function cravouDePrimeira(tentativas) {
  return CONFIG.CRAVADA_VENCE_DE_PRIMEIRA && Boolean(tentativas[0]?.cravada)
}

/**
 * Avalia a partida inteira.
 *
 * Duas formas de ganhar uma lata:
 *   1. CRAVADA DE PRIMEIRA — bater o alvo com 2 casas decimais logo na primeira
 *      tentativa. Encerra a partida na hora.
 *   2. ERRO TOTAL — fechar as três tentativas somando menos que
 *      CONFIG.LIMITE_ERRO_TOTAL_MS de erro.
 *
 * Não há caso especial no erro total: quem cravou de primeira soma exatamente
 * zero, porque a cravada zera o erro da rodada. Uma regra a menos para o placar
 * conhecer, e o líder continua sendo quem tem o menor número.
 *
 * @param {Tentativa[]} tentativas
 * @returns {Resultado}
 */
export function avaliarPartida(tentativas) {
  const cravou = cravouDePrimeira(tentativas)
  const completa = cravou || tentativas.length === CONFIG.TENTATIVAS
  const erroTotalMs = erroTotalDe(tentativas)

  // Quem abandonou uma rodada não ganha por erro total: o tempo daquela
  // tentativa é uma penalidade sintética, não uma medição do jogador.
  const dentroDoLimite =
    tentativas.length === CONFIG.TENTATIVAS &&
    tentativas.every((tentativa) => tentativa.parou) &&
    erroTotalMs <= CONFIG.LIMITE_ERRO_TOTAL_MS

  return {
    venceu: cravou || dentroDoLimite,
    motivo: cravou ? 'cravada' : dentroDoLimite ? 'consistencia' : null,
    erroTotalMs,
    melhorErroMs: tentativas.length
      ? Math.min(...tentativas.map((tentativa) => tentativa.erroMs))
      : Infinity,
    completa,
  }
}

/**
 * A partida deve terminar depois desta tentativa?
 * @param {Tentativa[]} tentativas tentativas já registradas
 * @returns {boolean}
 */
export function partidaAcabou(tentativas) {
  if (tentativas.length >= CONFIG.TENTATIVAS) return true
  // Só a cravada de primeira encerra: cravar na 2ª ou na 3ª zera aquela rodada,
  // mas o jogador segue jogando as que faltam.
  return tentativas.length === 1 && cravouDePrimeira(tentativas)
}

/**
 * Formata milissegundos como segundos com 2 casas, no padrão brasileiro.
 * @param {number} ms
 * @returns {string} ex.: "11,42"
 */
export function formatarSegundos(ms) {
  return (ms / 1000).toFixed(2).replace('.', ',')
}

/**
 * Formata o delta com sinal explícito.
 * @param {number} deltaMs
 * @returns {string} ex.: "+0,26" ou "−0,08"
 */
export function formatarDelta(deltaMs) {
  const sinal = deltaMs > 0 ? '+' : deltaMs < 0 ? '−' : '±'
  return `${sinal}${formatarSegundos(Math.abs(deltaMs))}`
}
