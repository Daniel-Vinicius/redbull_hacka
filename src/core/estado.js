/**
 * Estado da aplicação
 * ====================
 *
 * Uma única fonte de verdade. Ninguém lê o placar de dentro do DOM, ninguém
 * guarda meio estado numa variável solta de outro módulo.
 *
 * Fluxo obrigatório do projeto:
 *
 *     evento → regras (puras) → estado → render → DOM
 *
 * `core/` nunca toca `document`; `ui/` nunca decide regra.
 */

/**
 * Telas possíveis, na ordem em que aparecem.
 * @readonly
 */
export const TELAS = Object.freeze({
  ATRACAO: 'atracao',
  PREPARO: 'preparo',
  RODADA: 'rodada',
  FEEDBACK: 'feedback',
  FINAL: 'final',
})

/**
 * @typedef {object} Estado
 * @property {string} tela tela atual, um valor de TELAS
 * @property {number} alvoMs alvo da tentativa corrente
 * @property {import('./regras.js').Tentativa[]} tentativas tentativas registradas
 * @property {number} contagem número mostrado na contagem regressiva (3,2,1,0)
 * @property {import('./regras.js').Tentativa|null} ultima tentativa recém-encerrada
 * @property {string} mensagem copy da tela de feedback
 * @property {import('./jogadores.js').Identidade|null} identidade
 * @property {import('./regras.js').Resultado|null} resultado
 * @property {{posicao: number, total: number}|null} posicao colocação no placar
 */

/** Estado inicial — também é o estado para o qual `reiniciar()` volta. */
const INICIAL = Object.freeze({
  tela: TELAS.ATRACAO,
  alvoMs: 0,
  tentativas: [],
  contagem: 0,
  ultima: null,
  mensagem: '',
  identidade: null,
  resultado: null,
  posicao: null,
})

/** @type {Estado} */
let estado = { ...INICIAL }

/** @type {Array<(estado: Estado) => void>} */
const ouvintes = []

/** @returns {Estado} cópia rasa do estado atual */
export function obter() {
  return estado
}

/**
 * Aplica uma alteração parcial e notifica os ouvintes.
 * @param {Partial<Estado>} alteracao
 */
export function definir(alteracao) {
  estado = { ...estado, ...alteracao }
  for (const ouvinte of ouvintes) ouvinte(estado)
}

/**
 * Volta ao estado inicial. Chamado sempre na ENTRADA da atração — nunca na
 * saída da tela final — para que qualquer caminho de erro também caia limpo.
 * Regra dura do projeto: nenhum dado do jogador N pode aparecer no primeiro
 * frame do jogador N+1.
 */
export function reiniciar() {
  definir({ ...INICIAL, tentativas: [] })
}

/**
 * Assina mudanças de estado.
 * @param {(estado: Estado) => void} ouvinte
 */
export function observar(ouvinte) {
  ouvintes.push(ouvinte)
}
