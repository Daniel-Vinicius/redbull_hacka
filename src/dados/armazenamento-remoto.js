/**
 * Armazenamento remoto do placar — API HTTP
 * ==========================================
 *
 * Existe para UM cenário: testar a jogabilidade com várias pessoas, cada uma
 * no seu aparelho, atrás de `npm run servidor` (ou de um túnel tipo ngrok).
 * Com localStorage cada celular teria o seu próprio placar isolado.
 *
 * NÃO é o modo da entrega. No GitHub Pages não existe API, a sonda falha e o
 * jogo cai para o armazenamento local — que é o que o briefing exige. Ver
 * `docs/DECISOES.md`.
 *
 * Toda chamada tem timeout curto e falha para cima: quem decide o que fazer
 * com o erro é a fachada em `ranking.js`, que degrada para local em silêncio.
 */

import { CONFIG } from '../core/config.js'
import { sanear } from './registro.js'

/** Identificador do modo, exibido em diagnóstico. */
export const nome = 'remoto'

/**
 * `fetch` com timeout. Sem isso, um túnel lento deixaria a tela de placar
 * pendurada esperando resposta.
 * @param {string} caminho
 * @param {RequestInit} [opcoes]
 * @returns {Promise<Response>}
 */
async function requisitar(caminho, opcoes = {}) {
  const controle = new AbortController()
  const relogio = setTimeout(() => controle.abort(), CONFIG.RANKING_TIMEOUT_MS)
  try {
    const resposta = await fetch(caminho, { ...opcoes, signal: controle.signal })
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
    return resposta
  } finally {
    clearTimeout(relogio)
  }
}

/**
 * A API está no ar? Usado uma vez, na abertura, para escolher o modo.
 * @returns {Promise<boolean>}
 */
export async function disponivel() {
  try {
    await requisitar(CONFIG.RANKING_API)
    return true
  } catch {
    return false
  }
}

/**
 * @returns {Promise<import('./registro.js').Registro[]>}
 */
export async function ler() {
  const resposta = await requisitar(CONFIG.RANKING_API)
  return sanear(await resposta.json())
}

/**
 * Grava uma partida. O número de chegada e a ordenação são decididos pelo
 * SERVIDOR: com vários aparelhos jogando ao mesmo tempo, dois clientes
 * calculando o próprio número gerariam dois "TROPICAL 7".
 *
 * @param {object} parcial registro sem o número
 * @returns {Promise<{registro: import('./registro.js').Registro, registros: import('./registro.js').Registro[]}>}
 */
export async function gravar(parcial) {
  const resposta = await requisitar(CONFIG.RANKING_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parcial),
  })
  const { registro, registros } = await resposta.json()
  return { registro, registros: sanear(registros) }
}

/** Apaga o placar do dia no servidor. */
export async function limpar() {
  await requisitar(CONFIG.RANKING_API, { method: 'DELETE' })
}
