/**
 * Placar do dia — fachada
 * ========================
 *
 * Escolhe entre os dois armazenamentos e mantém um CACHE EM MEMÓRIA do placar.
 *
 * O cache existe por um motivo concreto: `ui/render.js` desenha o placar a cada
 * mudança de estado, de forma síncrona. Se `topo()` devolvesse uma Promise, a
 * renderização inteira teria que virar assíncrona — e uma tela que espera rede
 * para desenhar é exatamente o que a premissa de estabilidade do briefing
 * proíbe. Então a leitura é sempre local e instantânea, e a rede acontece só
 * nas bordas: na abertura, ao gravar, e no polling da tela de atração.
 *
 * Qualquer falha do armazenamento remoto degrada para o local, em silêncio.
 */

import { CONFIG } from '../core/config.js'
import * as localStorageAdapter from './armazenamento-local.js'
import * as remotoAdapter from './armazenamento-remoto.js'
import { ordenar, posicaoDe } from './registro.js'

export { ordenar }

/** Armazenamento em uso. Começa local e só troca se a sonda achar a API. */
let armazenamento = localStorageAdapter

/** @type {import('./registro.js').Registro[]} placar conhecido */
let cache = []

/**
 * Decide o armazenamento e carrega o placar.
 * Deve ser chamado uma vez, na abertura do jogo.
 * @returns {Promise<string>} nome do modo escolhido: 'local' ou 'remoto'
 */
export async function iniciar() {
  if (CONFIG.RANKING_REMOTO !== 'nunca') {
    const forcado = CONFIG.RANKING_REMOTO === 'sempre'
    if (forcado || (await remotoAdapter.disponivel())) armazenamento = remotoAdapter
  }
  await sincronizar()
  return armazenamento.nome
}

/** @returns {string} 'local' ou 'remoto' */
export function modo() {
  return armazenamento.nome
}

/**
 * Rebusca o placar no armazenamento atual.
 *
 * Chamado no polling da tela de atração, para que as partidas de outros
 * aparelhos apareçam sozinhas durante um teste em rede. Nunca é chamado
 * durante uma rodada cronometrada.
 *
 * @returns {Promise<boolean>} true se o TAMANHO do placar mudou. É heurística
 *   de propósito: comparar os arrays inteiro a cada 5 s custaria mais do que
 *   vale, e a única mudança que interessa aqui é alguém novo ter entrado.
 */
export async function sincronizar() {
  try {
    const registros = await armazenamento.ler()
    const mudou = registros.length !== cache.length
    cache = registros
    return mudou
  } catch {
    // Servidor caiu no meio do evento: segue com o que já está em memória.
    return false
  }
}

/** @returns {import('./registro.js').Registro[]} placar completo, ordenado */
export function placar() {
  return ordenar(cache)
}

/** @returns {import('./registro.js').Registro[]} as primeiras posições */
export function topo() {
  return placar().slice(0, CONFIG.RANKING_VISIVEL)
}

/**
 * Registra uma partida.
 *
 * É assíncrono de propósito: quem grava é que atribui o número de chegada, e
 * no modo remoto isso vem do servidor. Como a chamada acontece na transição
 * para a tela de placar, o jogador não percebe a espera.
 *
 * @param {object} parcial `{sabor, nome, erroTotalMs, melhorErroMs, venceu}`
 *   sem o número de chegada, que é atribuído por quem grava.
 * @returns {Promise<{numero: number, posicao: number, total: number}>}
 */
export async function registrar(parcial) {
  try {
    const { registro, registros } = await armazenamento.gravar(parcial)
    cache = registros
    return {
      numero: registro.numero,
      posicao: posicaoDe(cache, registro.numero),
      total: cache.length,
    }
  } catch {
    // Remoto falhou no momento de gravar: cai para local para não perder a
    // partida do jogador que está com o tablet na mão.
    armazenamento = localStorageAdapter
    const { registro, registros } = await armazenamento.gravar(parcial)
    cache = registros
    return {
      numero: registro.numero,
      posicao: posicaoDe(cache, registro.numero),
      total: cache.length,
    }
  }
}

/**
 * Apaga o placar. Usado pelo atalho de operador antes de abrir a feira e antes
 * de mandar o link para avaliação — ninguém deve encontrar as jogadas de teste.
 */
export async function limpar() {
  cache = []
  try {
    await armazenamento.limpar()
  } catch {
    /* placar de teste sobrevivendo não justifica quebrar a tela */
  }
}
