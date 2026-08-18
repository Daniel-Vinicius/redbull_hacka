/**
 * Parâmetros do jogo — Cronômetro Invisível
 * ==========================================
 *
 * Tudo que define o comportamento das regras mora aqui. Nenhum número mágico
 * espalhado pelo resto do código: para recalibrar a dificuldade no dia do evento,
 * mexa apenas neste arquivo.
 */

export const CONFIG = Object.freeze({
  // ---- Alvo -----------------------------------------------------------------
  /** Menor alvo sorteável, em milissegundos. */
  ALVO_MIN_MS: 2_000,
  /** Maior alvo sorteável, em milissegundos. */
  ALVO_MAX_MS: 6_000,
  /**
   * Granularidade do sorteio, em ms. 10 ms garante que o alvo seja exatamente
   * representável com 2 casas decimais — sem isso, "cravar" seria impossível
   * por arredondamento, e não por habilidade.
   */
  ALVO_PASSO_MS: 10,

  // ---- Rodada ---------------------------------------------------------------
  /** Tentativas por jogador. */
  TENTATIVAS: 3,
  /** Duração da contagem regressiva antes de cada tentativa, em segundos. */
  CONTAGEM_REGRESSIVA_S: 3,
  /**
   * Tempo extra além do alvo antes de abortar a tentativa por abandono.
   * Evita que um jogador que largou o tablet trave o totem.
   */
  LIMITE_EXTRA_MS: 8_000,

  // ---- Condições de vitória -------------------------------------------------
  /*
   * Não existe tolerância configurável para a cravada: a regra é "imprimir o
   * mesmo número com 2 casas decimais que o alvo", derivada da formatação em
   * `regras.js`. Um número aqui poderia divergir do que a tela mostra.
   */
  /** Margem para o prêmio por consistência: as 3 tentativas dentro de ±0,5 s. */
  TOLERANCIA_CONSISTENCIA_MS: 1000,
  /**
   * Cravar encerra a partida na hora, em qualquer tentativa.
   * Deixe `false` para que a cravada só valha vitória imediata na 1ª tentativa.
   */
  CRAVADA_ENCERRA_PARTIDA: true,

  // ---- Ritmo da interface ---------------------------------------------------
  /** Quanto tempo a tela de feedback de cada tentativa segura, em ms. */
  FEEDBACK_MS: 2_600,
  /** Inatividade na tela final antes de voltar para a atração, em ms. */
  INATIVIDADE_FINAL_MS: 30_000,
  /** Inatividade em qualquer tela de jogo antes de abortar a partida, em ms. */
  INATIVIDADE_JOGO_MS: 45_000,

  // ---- Ranking --------------------------------------------------------------
  /** Quantas posições o placar mostra. */
  RANKING_VISIVEL: 5,
  /** Chave do localStorage. O sufixo de versão evita colisão com formatos antigos. */
  RANKING_CHAVE: 'rb.cronometro.v1',
})
