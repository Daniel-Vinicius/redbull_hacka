/**
 * Placar do dia — persistência local
 * ===================================
 *
 * Fica inteiramente no `localStorage` do aparelho. Nada é enviado para lugar
 * nenhum: sem servidor, sem rede em tempo de execução, sem serviço externo
 * capaz de cair no meio da feira — que é o que a premissa de "funcionamento
 * estável" do briefing exige.
 *
 * Regra de robustez: o placar nunca pode derrubar o jogo. Toda leitura e toda
 * escrita passa por try/catch, e existe um espelho em memória para o caso de o
 * Safari estar em navegação privada ou com a cota estourada.
 */

import { CONFIG } from '../core/config.js'

/** @type {Registro[]} espelho em memória, usado se o localStorage falhar */
let memoria = []

/** @type {boolean} vira true assim que uma operação de storage falha */
let somenteMemoria = false

/**
 * @typedef {object} Registro
 * @property {string} rotulo identidade exibida, ex.: "TROPICAL 7"
 * @property {number} erroTotalMs chave de ordenação: menor é melhor
 * @property {number} melhorErroMs menor erro entre as tentativas
 * @property {boolean} venceu ganhou uma lata?
 * @property {number} numero ordem de chegada no dia
 */

/**
 * Lê o placar bruto do storage.
 * @returns {Registro[]}
 */
function ler() {
  if (somenteMemoria) return memoria
  try {
    const cru = localStorage.getItem(CONFIG.RANKING_CHAVE)
    if (!cru) return []
    const dados = JSON.parse(cru)
    // Formato inesperado (versão antiga, storage editado à mão) recomeça vazio
    // em vez de quebrar a tela — o placar não vale um erro fatal.
    return Array.isArray(dados) ? dados : []
  } catch {
    somenteMemoria = true
    return memoria
  }
}

/**
 * Grava o placar, caindo para memória se o storage recusar.
 * @param {Registro[]} registros
 */
function gravar(registros) {
  memoria = registros
  if (somenteMemoria) return
  try {
    localStorage.setItem(CONFIG.RANKING_CHAVE, JSON.stringify(registros))
  } catch {
    somenteMemoria = true
  }
}

/**
 * Ordena por erro total crescente; empate resolve por quem chegou primeiro.
 * @param {Registro[]} registros
 * @returns {Registro[]} novo array ordenado
 */
export function ordenar(registros) {
  return [...registros].sort(
    (a, b) => a.erroTotalMs - b.erroTotalMs || a.numero - b.numero
  )
}

/** @returns {Registro[]} placar completo, ordenado */
export function placar() {
  return ordenar(ler())
}

/** @returns {number} quantas partidas já foram jogadas hoje */
export function totalDeJogadas() {
  return ler().length
}

/** @returns {Registro[]} as primeiras posições, conforme CONFIG.RANKING_VISIVEL */
export function topo() {
  return placar().slice(0, CONFIG.RANKING_VISIVEL)
}

/**
 * Registra uma partida e devolve a posição do jogador.
 * @param {Registro} registro
 * @returns {{posicao: number, total: number}} posição 1-indexada e total de jogadas
 */
export function registrar(registro) {
  const atualizado = [...ler(), registro]
  gravar(atualizado)
  const ordenado = ordenar(atualizado)
  return {
    posicao: ordenado.findIndex((r) => r.numero === registro.numero) + 1,
    total: ordenado.length,
  }
}

/**
 * Apaga o placar. Usado pelo atalho de operador antes de abrir a feira e antes
 * de mandar o link para avaliação — ninguém deve encontrar as jogadas de teste.
 */
export function limpar() {
  memoria = []
  try {
    localStorage.removeItem(CONFIG.RANKING_CHAVE)
    somenteMemoria = false
  } catch {
    somenteMemoria = true
  }
}
