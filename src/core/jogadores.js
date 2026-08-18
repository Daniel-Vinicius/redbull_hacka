/**
 * Identidade do jogador
 * ======================
 *
 * O briefing proíbe "login, cadastro ou coleta de dados pessoais dentro do jogo"
 * e manda evitar etapas intermediárias. Por isso o jogo NÃO pergunta o nome de
 * ninguém: o identificador é atribuído pelo sistema, combinando um sabor sorteado
 * com um número sequencial do dia.
 *
 *     TROPICAL 7   ·   MELANCIA 12   ·   TRADICIONAL 23
 *
 * Consequências: zero teclado na tela, zero risco de palavrão no placar da marca,
 * nada que identifique uma pessoa, e o número ainda informa quantos jogaram antes.
 */

/**
 * Sabores disponíveis. `imagem` casa com os arquivos gerados por
 * `tools/optimize-assets.mjs` — alterar um lado exige alterar o outro.
 * @type {ReadonlyArray<{id: string, nome: string, imagem: string}>}
 */
export const SABORES = Object.freeze([
  { id: 'tradicional', nome: 'TRADICIONAL', imagem: 'lata-tradicional.webp' },
  { id: 'zero', nome: 'ZERO', imagem: 'lata-zero.webp' },
  { id: 'ice', nome: 'ICE', imagem: 'lata-ice.webp' },
  { id: 'maca', nome: 'MAÇÃ', imagem: 'lata-maca.webp' },
  { id: 'cereja', nome: 'CEREJA', imagem: 'lata-cereja.webp' },
  { id: 'melancia', nome: 'MELANCIA', imagem: 'lata-melancia.webp' },
  { id: 'melao', nome: 'MELÃO', imagem: 'lata-melao.webp' },
  { id: 'nectarina', nome: 'NECTARINA', imagem: 'lata-nectarina.webp' },
  { id: 'pessego', nome: 'PÊSSEGO', imagem: 'lata-pessego.webp' },
  { id: 'pomelo', nome: 'POMELO', imagem: 'lata-pomelo.webp' },
  { id: 'tropical', nome: 'TROPICAL', imagem: 'lata-tropical.webp' },
  { id: 'amora', nome: 'AMORA', imagem: 'lata-amora.webp' },
])

/**
 * @typedef {object} Identidade
 * @property {string} sabor id do sabor
 * @property {string} nome nome exibido do sabor
 * @property {string} imagem arquivo da lata
 * @property {number} numero posição sequencial do jogador no dia
 * @property {string} rotulo texto pronto, ex.: "TROPICAL 7"
 */

/**
 * Cria a identidade do próximo jogador.
 * @param {number} totalDeJogadas quantas partidas já foram registradas hoje
 * @param {() => number} [rng] injetável para teste
 * @returns {Identidade}
 */
export function proximaIdentidade(totalDeJogadas, rng = Math.random) {
  const sabor = SABORES[Math.floor(rng() * SABORES.length)]
  const numero = totalDeJogadas + 1
  return {
    sabor: sabor.id,
    nome: sabor.nome,
    imagem: sabor.imagem,
    numero,
    rotulo: `${sabor.nome} ${numero}`,
  }
}
