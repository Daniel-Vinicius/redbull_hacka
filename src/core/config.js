/**
 * Parâmetros do jogo — Cronômetro Invisível
 * ==========================================
 *
 * Tudo que define o comportamento das regras mora aqui. Nenhum número mágico
 * espalhado pelo resto do código: para recalibrar a dificuldade no dia do
 * evento, mexa apenas neste arquivo.
 */

export const CONFIG = Object.freeze({
  // ---- Alvo -----------------------------------------------------------------
  /**
   * Faixa de sorteio de cada rodada, em milissegundos. A dificuldade cresce:
   * estimar 8 s de olhos fechados é bem mais difícil que estimar 3 s.
   *
   * O piso da primeira rodada é 2 s, não 1 s, por dois motivos concretos:
   *  - a contagem regressiva bate 3 · 2 · 1 em intervalos de 1 s e funcionaria
   *    como metrônomo para um alvo de 1 s, entregando a resposta;
   *  - o cronômetro larga sozinho na buzina mas quem para é o dedo do jogador,
   *    então a latência de toque entra inteira no tempo medido e não se cancela.
   *    São dezenas de milissegundos: irrelevante em 8 s, material em 1 s.
   *
   * O número de faixas define o número de tentativas — ver TENTATIVAS.
   */
  FAIXAS_ALVO: Object.freeze([
    Object.freeze([2_000, 4_000]),
    Object.freeze([4_000, 6_000]),
    Object.freeze([7_000, 10_000]),
  ]),

  /**
   * Granularidade do sorteio, em ms. 10 ms garante que o alvo seja exatamente
   * representável com 2 casas decimais — sem isso, "cravar" seria impossível
   * por arredondamento, e não por habilidade.
   */
  ALVO_PASSO_MS: 10,

  // ---- Rodada ---------------------------------------------------------------
  /** Tentativas por jogador. Precisa casar com o tamanho de FAIXAS_ALVO. */
  TENTATIVAS: 3,
  /** Duração da contagem regressiva antes de cada tentativa, em segundos. */
  CONTAGEM_REGRESSIVA_S: 3,
  /**
   * Tempo extra além do alvo antes de abortar a tentativa por abandono.
   * Evita que um jogador que largou o tablet trave o totem.
   */
  LIMITE_EXTRA_MS: 8_000,

  // ---- Condições de vitória -------------------------------------------------
  /**
   * O corte do prêmio: soma dos erros das três tentativas.
   *
   * É deliberadamente o MESMO número que ordena o placar. O jogador só precisa
   * entender uma coisa — "deixe esse número abaixo de 1,50" — e essa coisa é
   * também a régua da competição. Uma rodada ruim pode ser compensada chegando
   * perto nas outras duas, o que premia consistência sem punir um tropeço.
   *
   * Calibragem: a estimativa é de erro típico ~0,2 s nas rodadas curtas e
   * ~0,6 s na longa, o que coloca a vitória perto de 50% para quem está
   * prestando atenção. Depois de umas dez partidas reais, ajuste aqui.
   */
  LIMITE_ERRO_TOTAL_MS: 1_500,

  /*
   * Não existe tolerância configurável para a cravada: a regra é "imprimir o
   * mesmo número com 2 casas decimais que o alvo", derivada da formatação em
   * `regras.js`. Um número aqui poderia divergir do que a tela mostra.
   */

  /**
   * Cravar na PRIMEIRA tentativa declara campeão e encerra a partida na hora.
   *
   * Nas tentativas seguintes a cravada não encerra nada: ela apenas zera o erro
   * daquela rodada (ver `registrarTentativa`). A assimetria é deliberada —
   * cravar de primeira é sorte-e-instinto puro, sem nenhuma referência de ritmo;
   * a partir da segunda o jogador já viu quanto errou e está calibrando, então
   * a cravada vira o melhor resultado possível de uma rodada, não a partida
   * inteira. Sem isso, quem cravasse na terceira ganharia por cima de quem
   * fechou as três dentro do orçamento, que é o feito mais difícil.
   */
  CRAVADA_VENCE_DE_PRIMEIRA: true,

  // ---- Ritmo da interface ---------------------------------------------------
  /** Quanto tempo a tela de feedback de cada tentativa segura, em ms. */
  FEEDBACK_MS: 2_600,
  /**
   * Quanto tempo a tela de resultado segura antes de ir para a escolha do sabor.
   *
   * Estes três tempos são generosos de propósito: são telas de LEITURA, não de
   * jogo. O veredito, as três tentativas e a assinatura da marca precisam caber
   * numa leitura tranquila, e quem terminou costuma chamar o amigo para ver a
   * tela. Nenhum deles prende ninguém — todos avançam no toque; o tempo só
   * decide quando o totem se recicla sozinho se a pessoa foi embora.
   */
  RESULTADO_MS: 30_000,
  /** Inatividade na escolha do sabor antes de aceitar o que estiver centralizado. */
  SABOR_MS: 30_000,
  /** Inatividade na tela de placar antes de voltar para a atração, em ms. */
  INATIVIDADE_FINAL_MS: 30_000,

  // ---- Ranking --------------------------------------------------------------
  /** Quantas posições o placar mostra. */
  RANKING_VISIVEL: 5,
  /** Chave do localStorage. O sufixo de versão evita colisão com formatos antigos. */
  RANKING_CHAVE: 'rb.cronometro.v1',
  /**
   * Estratégia de armazenamento do placar:
   *   'auto'   sonda a API na abertura; usa remoto se responder, local se não
   *   'sempre' força remoto (falhas ainda degradam para local)
   *   'nunca'  só localStorage
   *
   * 'auto' faz o MESMO build funcionar nos dois cenários: no GitHub Pages não
   * existe API, então cai para local — que é o que o briefing exige, zero
   * dependência de rede. Atrás de um servidor (ou ngrok), o placar é compartilhado.
   */
  RANKING_REMOTO: 'auto',
  /** Endereço da API de placar, relativo à origem da página. */
  RANKING_API: 'api/ranking',
  /** Timeout de qualquer chamada de rede do placar, em ms. */
  RANKING_TIMEOUT_MS: 1_500,
  /**
   * De quanto em quanto tempo a atração busca o placar atualizado, em ms.
   * Só na atração: durante uma rodada cronometrada não há nenhuma rede.
   */
  RANKING_POLL_MS: 5_000,
})
