/**
 * Armazenamento local do placar — localStorage
 * =============================================
 *
 * É o modo padrão da entrega: sem servidor, sem rede, sem serviço externo
 * capaz de cair no meio da feira. É o que a premissa de "funcionamento
 * estável" do briefing pede.
 *
 * Regra de robustez: o placar nunca pode derrubar o jogo. Toda leitura e toda
 * escrita passa por try/catch, e existe um espelho em memória para o caso de o
 * Safari estar em navegação privada ou com a cota estourada.
 */

import { CONFIG } from '../core/config.js'
import { montarRegistro, proximoNumero, sanear } from './registro.js'

/** @type {import('./registro.js').Registro[]} espelho, usado se o storage falhar */
let memoria = []

/** Vira true assim que uma operação de storage falha; daí em diante, só memória. */
let somenteMemoria = false

/** Identificador do modo, exibido em diagnóstico. */
export const nome = 'local'

/**
 * @returns {Promise<import('./registro.js').Registro[]>}
 */
export async function ler() {
  if (somenteMemoria) return memoria
  try {
    const cru = localStorage.getItem(CONFIG.RANKING_CHAVE)
    memoria = cru ? sanear(JSON.parse(cru)) : []
    return memoria
  } catch {
    // Formato inesperado, navegação privada ou storage desabilitado: segue em
    // memória em vez de quebrar a tela.
    somenteMemoria = true
    return memoria
  }
}

/**
 * Grava uma partida e devolve o placar atualizado.
 * @param {object} parcial registro sem o número
 * @returns {Promise<{registro: import('./registro.js').Registro, registros: import('./registro.js').Registro[]}>}
 */
export async function gravar(parcial) {
  const registros = await ler()
  const registro = montarRegistro(parcial, proximoNumero(registros))
  const atualizados = [...registros, registro]

  memoria = atualizados
  if (!somenteMemoria) {
    try {
      localStorage.setItem(CONFIG.RANKING_CHAVE, JSON.stringify(atualizados))
    } catch {
      somenteMemoria = true
    }
  }
  return { registro, registros: atualizados }
}

/** Apaga o placar do dia. */
export async function limpar() {
  memoria = []
  try {
    localStorage.removeItem(CONFIG.RANKING_CHAVE)
    somenteMemoria = false
  } catch {
    somenteMemoria = true
  }
}
