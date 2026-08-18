/**
 * Regras do jogo — funções PURAS
 * ===============================
 *
 * Nada aqui toca `document`, `localStorage`, `Math.random` global ou relógio.
 * Toda entrada vem por parâmetro e toda saída é valor de retorno — é o que
 * torna este arquivo inteiramente testável em `tests/regras.test.mjs`.
 *
 * Vocabulário do domínio:
 *   alvo       tempo que o jogador precisa reproduzir, em ms
 *   tempo      tempo que o jogador de fato marcou, em ms
 *   erro       |tempo - alvo|, em ms — quanto menor, melhor
 *   cravada    tempo que imprime o MESMO número do alvo, com 2 casas decimais
 */

import { CONFIG } from './config.js'

/**
 * Sorteia um alvo dentro da faixa configurada, alinhado ao passo de 10 ms.
 * @param {() => number} [rng] gerador de aleatório em [0,1). Injetável para teste.
 * @returns {number} alvo em milissegundos
 */
export function sortearAlvo(rng = Math.random) {
  const { ALVO_MIN_MS, ALVO_MAX_MS, ALVO_PASSO_MS } = CONFIG
  const passos = Math.floor((ALVO_MAX_MS - ALVO_MIN_MS) / ALVO_PASSO_MS) + 1
  return ALVO_MIN_MS + Math.floor(rng() * passos) * ALVO_PASSO_MS
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
 * A cravada NÃO é uma faixa: ela depende do par (tempo, alvo) e não da
 * magnitude do erro, e vive em `Tentativa.cravada`. Manter as duas coisas
 * separadas evita que uma fronteira de arredondamento faça a tela dizer
 * "cravou" numa tentativa que a regra não premiou.
 *
 * @type {ReadonlyArray<{id: string, ateMs: number}>}
 */
export const FAIXAS = Object.freeze([
  { id: 'quase', ateMs: 150 },
  { id: 'bom', ateMs: CONFIG.TOLERANCIA_CONSISTENCIA_MS },
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
 * @param {number|null} tempoMs tempo marcado, ou null se o jogador não parou
 * @param {number} alvoMs
 * @returns {Tentativa}
 */
export function registrarTentativa(tempoMs, alvoMs) {
  const parou = tempoMs !== null
  const tempo = parou ? tempoMs : alvoMs + CONFIG.LIMITE_EXTRA_MS
  return {
    tempoMs: tempo,
    alvoMs,
    erroMs: calcularErro(tempo, alvoMs),
    parou,
    cravada: parou && ehCravada(tempo, alvoMs),
  }
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
 * Avalia a partida inteira.
 *
 * Duas formas de ganhar uma lata:
 *   1. CRAVADA — bater o alvo com 2 casas decimais em qualquer tentativa.
 *      Encerra a partida na hora (ver CONFIG.CRAVADA_ENCERRA_PARTIDA).
 *   2. CONSISTÊNCIA — fechar as 3 tentativas dentro de ±0,5 s do alvo.
 *
 * Quando a cravada encerra a partida antes da 3ª tentativa, as tentativas não
 * jogadas contam como erro zero: quem cravou já é, por definição, o melhor
 * resultado possível, e isso mantém `erroTotalMs` comparável no ranking.
 *
 * @param {Tentativa[]} tentativas
 * @returns {Resultado}
 */
export function avaliarPartida(tentativas) {
  const cravou = tentativas.some((t) => t.cravada)
  const completa = cravou || tentativas.length === CONFIG.TENTATIVAS

  const consistente =
    tentativas.length === CONFIG.TENTATIVAS &&
    tentativas.every((t) => t.parou && t.erroMs <= CONFIG.TOLERANCIA_CONSISTENCIA_MS)

  const erroTotalMs = tentativas.reduce((soma, t) => soma + t.erroMs, 0)
  const melhorErroMs = tentativas.length ? Math.min(...tentativas.map((t) => t.erroMs)) : Infinity

  return {
    venceu: cravou || consistente,
    motivo: cravou ? 'cravada' : consistente ? 'consistencia' : null,
    erroTotalMs: cravou ? 0 : erroTotalMs,
    melhorErroMs,
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
  if (!CONFIG.CRAVADA_ENCERRA_PARTIDA) return false
  const ultima = tentativas[tentativas.length - 1]
  return Boolean(ultima?.cravada)
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
