/**
 * Cronômetro da rodada
 * =====================
 *
 * Regras de precisão que este módulo existe para garantir:
 *
 *  - `performance.now()` e nada mais. `Date.now()` pula quando o relógio do
 *    sistema é ajustado, e contar frames de `requestAnimationFrame` depende do
 *    hardware e congela quando a aba sai de foco.
 *  - O timestamp é capturado na PRIMEIRA linha do handler, antes de qualquer
 *    leitura ou escrita no DOM. Um layout recalculado antes da medição vira
 *    erro de dezenas de milissegundos.
 *  - Só o ponteiro que iniciou a rodada pode encerrá-la. Numa feira, o amigo
 *    encostando na tela ou a palma da mão na borda dispara um `pointerdown`
 *    próprio — sem esse filtro, a tentativa vira lixo.
 *  - `pointercancel` e troca de aba invalidam a tentativa em silêncio em vez
 *    de gravar um tempo corrompido.
 *
 * A latência de toque do aparelho (~75 ms num iPad) aparece nos dois toques e
 * some na subtração, então não é compensada aqui.
 */

/**
 * @typedef {object} Cronometro
 * @property {(agoraMs?: number) => void} iniciar arma a contagem
 * @property {(agoraMs?: number) => number|null} parar devolve o tempo decorrido
 * @property {() => void} cancelar aborta sem produzir tempo
 * @property {() => boolean} estaAtivo
 */

/**
 * Cria um cronômetro isolado.
 * @param {() => number} [agora] fonte de tempo. Injetável para teste.
 * @returns {Cronometro}
 */
export function criarCronometro(agora = () => performance.now()) {
  /** @type {number|null} instante da largada */
  let inicio = null

  return {
    iniciar(agoraMs = agora()) {
      inicio = agoraMs
    },

    /**
     * Encerra a contagem.
     * @param {number} [agoraMs] timestamp já capturado pelo handler
     * @returns {number|null} tempo decorrido em ms, ou null se não estava ativo
     */
    parar(agoraMs = agora()) {
      if (inicio === null) return null
      const decorrido = agoraMs - inicio
      inicio = null
      return decorrido
    },

    cancelar() {
      inicio = null
    },

    estaAtivo() {
      return inicio !== null
    },
  }
}
