/**
 * Identidade do jogador
 * ======================
 *
 * O briefing proíbe "login, cadastro ou coleta de dados pessoais dentro do jogo"
 * e manda evitar etapas intermediárias. Por isso o jogo NÃO pergunta o nome de
 * ninguém: a identidade é um sabor de Red Bull mais um número sequencial do dia.
 *
 *     TROPICAL 7   ·   PÊSSEGO 12   ·   TRADICIONAL 23
 *
 * O sabor é ESCOLHIDO pelo jogador num carrossel depois da partida — escolher
 * uma lata é um gesto de marca, não um formulário. O número é atribuído por
 * quem grava o placar, para não haver dois jogadores com o mesmo rótulo.
 *
 * Consequências: zero teclado na tela, zero risco de palavrão no placar da
 * marca, e nada que identifique uma pessoa.
 */

import { SABORES } from './sabores.gerado.js'

export { SABORES }

/**
 * Busca um sabor pelo id.
 * @param {string} id
 * @returns {import('./sabores.gerado.js').Sabor} o sabor, ou o primeiro da lista
 *   se o id não existir (placar antigo, storage editado à mão)
 */
export function saborPorId(id) {
  return SABORES.find((sabor) => sabor.id === id) ?? SABORES[0]
}

/**
 * Sorteia o sabor que já vem centralizado no carrossel.
 *
 * Vale como escolha se o jogador largar o tablet e a tela avançar sozinha, e
 * evita que o carrossel abra sempre no mesmo sabor — o que faria o placar
 * inteiro virar "TRADICIONAL alguma coisa".
 *
 * @param {() => number} [rng] injetável para teste
 * @returns {import('./sabores.gerado.js').Sabor}
 */
export function saborInicial(rng = Math.random) {
  return SABORES[Math.floor(rng() * SABORES.length)]
}

/**
 * @typedef {object} Identidade
 * @property {string} sabor id do sabor escolhido
 * @property {string} nome nome curto, em caixa alta
 * @property {string} imagem prefixo dos arquivos de imagem
 * @property {string} cor hexadecimal do sabor
 * @property {number} numero posição sequencial do jogador no dia
 * @property {string} rotulo texto pronto, ex.: "TROPICAL 7"
 */

/**
 * Monta a identidade final, já com o número atribuído pelo placar.
 * @param {string} saborId
 * @param {number} numero
 * @returns {Identidade}
 */
export function identidadePara(saborId, numero) {
  const sabor = saborPorId(saborId)
  return {
    sabor: sabor.id,
    nome: sabor.nome,
    imagem: sabor.imagem,
    cor: sabor.cor,
    numero,
    rotulo: `${sabor.nome} ${numero}`,
  }
}
