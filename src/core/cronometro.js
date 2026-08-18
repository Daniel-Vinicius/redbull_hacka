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
 *  - Só o toque principal encerra a rodada. Numa feira, o amigo encostando na
 *    tela ou a palma da mão na borda dispara um `pointerdown` próprio — sem
 *    filtro, a tentativa vira lixo. O filtro em si (`evento.isPrimary`) fica em
 *    `main.js`, junto do listener: este módulo não conhece eventos de DOM.
 *  - `pointercancel` e troca de aba invalidam a tentativa em silêncio em vez
 *    de gravar um tempo corrompido.
 *
 * A largada é automática (a buzina dispara sozinha), então só a parada é um
 * toque: a latência do aparelho (~75 ms num iPad) entra INTEIRA no tempo
 * medido, sem cancelar. Não é compensada porque é igual para todos no mesmo
 * aparelho — o jogo compara jogadores entre si, não contra um cronômetro
 * oficial. É por isso que a rodada 1 tem piso de 2 s (ver `config.js`).
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
