/**
 * Formato do registro do placar
 * ==============================
 *
 * Os dois armazenamentos (localStorage e API) guardam exatamente o mesmo
 * formato, e as regras de numeração e ordenação vivem aqui — não duplicadas
 * nos adaptadores nem no servidor. Funções puras, testáveis sem navegador.
 */

/**
 * @typedef {object} Registro
 * @property {number} numero ordem de chegada no dia. Único por instalação.
 * @property {string} sabor id do sabor escolhido
 * @property {string} rotulo identidade exibida, ex.: "TROPICAL 7"
 * @property {number} erroTotalMs soma dos erros — chave de ordenação, menor é melhor
 * @property {number} melhorErroMs menor erro entre as tentativas
 * @property {boolean} venceu ganhou uma lata?
 */

/**
 * Ordena por erro total crescente; empate resolve por ordem de chegada.
 * Não altera o array recebido.
 * @param {Registro[]} registros
 * @returns {Registro[]} novo array ordenado
 */
export function ordenar(registros) {
  return [...registros].sort((a, b) => a.erroTotalMs - b.erroTotalMs || a.numero - b.numero)
}

/**
 * Próximo número da fila.
 *
 * Usa o MAIOR número já registrado, e não a quantidade de registros: se alguém
 * apagar uma linha do JSON à mão, ou dois armazenamentos forem mesclados, o
 * comprimento da lista reaproveitaria um número e criaria dois "TROPICAL 7".
 *
 * @param {Registro[]} registros
 * @returns {number}
 */
export function proximoNumero(registros) {
  return registros.reduce((maior, registro) => Math.max(maior, registro.numero ?? 0), 0) + 1
}

/**
 * Posição 1-indexada de um registro dentro do placar ordenado.
 * @param {Registro[]} registros
 * @param {number} numero
 * @returns {number} posição, ou 0 se não encontrado
 */
export function posicaoDe(registros, numero) {
  return ordenar(registros).findIndex((registro) => registro.numero === numero) + 1
}

/**
 * Monta um registro completo a partir dos dados da partida e do número.
 *
 * Vive aqui, e não em cada armazenamento, porque o rótulo é montado em DOIS
 * lugares — no adaptador local e no servidor. Duplicar a regra deixou o placar
 * local sem rótulo nenhum até este teste pegar.
 *
 * @param {object} parcial `{sabor, nome, erroTotalMs, melhorErroMs, venceu}`
 * @param {number} numero ordem de chegada
 * @returns {Registro}
 */
export function montarRegistro(parcial, numero) {
  return {
    numero,
    sabor: String(parcial?.sabor ?? ''),
    rotulo: `${String(parcial?.nome ?? 'RED BULL')} ${numero}`,
    // performance.now() devolve frações de milissegundo. Arredondar na
    // gravação evita `1092.0999999996275` no placar e desempate por ruído.
    erroTotalMs: Math.round(Number(parcial?.erroTotalMs ?? 0)),
    melhorErroMs: Math.round(Number(parcial?.melhorErroMs ?? 0)),
    venceu: Boolean(parcial?.venceu),
  }
}

/**
 * Descarta qualquer coisa que não tenha o formato esperado.
 *
 * O placar vem de storage do navegador ou de um JSON em disco: os dois podem
 * ter sido editados à mão ou ficado de uma versão anterior. Uma linha estranha
 * não pode derrubar a tela.
 *
 * @param {unknown} dados
 * @returns {Registro[]}
 */
export function sanear(dados) {
  if (!Array.isArray(dados)) return []
  return dados.filter(
    (registro) =>
      registro &&
      typeof registro === 'object' &&
      Number.isFinite(registro.numero) &&
      Number.isFinite(registro.erroTotalMs) &&
      typeof registro.rotulo === 'string'
  )
}
