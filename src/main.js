/**
 * Cronômetro Invisível — orquestração
 * ====================================
 *
 * Este é o único arquivo que conhece todas as peças ao mesmo tempo. Ele liga
 * eventos do DOM às regras puras, empurra o resultado para o estado e deixa o
 * `render` desenhar. A ordem é sempre a mesma:
 *
 *     evento → regras → estado → render → DOM
 *
 * Nada de regra de jogo mora aqui: quem decide se alguém ganhou é
 * `core/regras.js`. Este arquivo decide QUANDO perguntar.
 */

import { CONFIG } from './core/config.js'
import { criarAudio } from './core/audio.js'
import { criarCronometro } from './core/cronometro.js'
import { proximaIdentidade } from './core/jogadores.js'
import { mensagemPara } from './core/mensagens.js'
import {
  avaliarPartida,
  faixaDaTentativa,
  partidaAcabou,
  registrarTentativa,
  sortearAlvo,
} from './core/regras.js'
import * as estado from './core/estado.js'
import { TELAS } from './core/estado.js'
import * as ranking from './dados/ranking.js'
import { render } from './ui/render.js'

const audio = criarAudio()
const cronometro = criarCronometro()

/** Ponteiro que iniciou a rodada. Só ele pode encerrá-la. */
let ponteiroAtivo = null

/** Todos os `setTimeout` em voo, para que trocar de tela nunca deixe resto. */
let agendamentos = []

/**
 * Agenda uma ação futura registrando o handle para cancelamento em lote.
 * @param {() => void} acao
 * @param {number} atrasoMs
 */
function agendar(acao, atrasoMs) {
  agendamentos.push(setTimeout(acao, atrasoMs))
}

/** Cancela tudo que estava agendado. Chamado em toda transição de tela. */
function cancelarAgendamentos() {
  agendamentos.forEach(clearTimeout)
  agendamentos = []
}

/** Redesenha a tela a partir do estado atual. */
function desenhar() {
  render(estado.obter(), ranking.topo())
}

estado.observar(desenhar)

// ═══ Ciclo de vida da partida ══════════════════════════════════════════════

/**
 * Volta o totem ao estado limpo.
 *
 * É chamado na ENTRADA da atração — nunca na saída da tela final — para que
 * qualquer caminho de erro também termine aqui. Regra dura do projeto:
 * nenhum dado do jogador N pode aparecer no primeiro frame do jogador N+1.
 */
function voltarParaAtracao() {
  cancelarAgendamentos()
  cronometro.cancelar()
  ponteiroAtivo = null
  document.body.dataset.vitoria = 'false'
  estado.reiniciar()
}

/** Começa uma partida nova. */
function comecarPartida() {
  audio.destravar() // primeiro gesto do usuário: é aqui que o som pode ligar
  cancelarAgendamentos()
  estado.definir({ tentativas: [], identidade: null, resultado: null, posicao: null })
  prepararTentativa()
}

/**
 * Mostra o alvo, roda a contagem regressiva e larga o cronômetro na buzina.
 */
function prepararTentativa() {
  cancelarAgendamentos()
  ponteiroAtivo = null

  estado.definir({ tela: TELAS.PREPARO, alvoMs: sortearAlvo(), contagem: CONFIG.CONTAGEM_REGRESSIVA_S })

  // 3 · 2 · 1 com um bipe cada, e a buzina no zero.
  for (let restante = CONFIG.CONTAGEM_REGRESSIVA_S; restante > 0; restante -= 1) {
    const atraso = (CONFIG.CONTAGEM_REGRESSIVA_S - restante) * 1000
    agendar(() => {
      estado.definir({ contagem: restante })
      audio.bipe()
    }, atraso)
  }

  agendar(() => {
    estado.definir({ contagem: 0 })
    audio.largada()
    largar()
  }, CONFIG.CONTAGEM_REGRESSIVA_S * 1000)
}

/** Abre a janela cega: o cronômetro corre sem aparecer na tela. */
function largar() {
  estado.definir({ tela: TELAS.RODADA })
  cronometro.iniciar()

  // Rede de segurança: quem larga o tablet no meio da rodada não pode travar
  // o totem para o próximo da fila.
  agendar(() => encerrarTentativa(null), estado.obter().alvoMs + CONFIG.LIMITE_EXTRA_MS)
}

/**
 * Fecha a tentativa corrente e decide se a partida continua.
 * @param {number|null} tempoMs tempo marcado, ou null se o jogador não parou
 */
function encerrarTentativa(tempoMs) {
  cancelarAgendamentos()
  ponteiroAtivo = null

  const { alvoMs, tentativas } = estado.obter()
  const tentativa = registrarTentativa(tempoMs, alvoMs)
  const todas = [...tentativas, tentativa]
  const faixa = faixaDaTentativa(tentativa)

  if (tentativa.cravada) audio.cravada()

  estado.definir({
    tela: TELAS.FEEDBACK,
    tentativas: todas,
    ultima: tentativa,
    mensagem: mensagemPara(faixa, tentativa.parou),
  })

  agendar(
    () => (partidaAcabou(todas) ? finalizarPartida(todas) : prepararTentativa()),
    CONFIG.FEEDBACK_MS
  )
}

/**
 * Fecha a partida: avalia, sorteia a identidade, grava no placar e mostra o fim.
 * @param {import('./core/regras.js').Tentativa[]} tentativas
 */
function finalizarPartida(tentativas) {
  cancelarAgendamentos()

  const resultado = avaliarPartida(tentativas)
  const identidade = proximaIdentidade(ranking.totalDeJogadas())
  const posicao = ranking.registrar({
    rotulo: identidade.rotulo,
    erroTotalMs: resultado.erroTotalMs,
    melhorErroMs: resultado.melhorErroMs,
    venceu: resultado.venceu,
    numero: identidade.numero,
  })

  estado.definir({ tela: TELAS.FINAL, resultado, identidade, posicao })

  if (resultado.venceu) audio.campeao()
  else audio.derrota()

  // O totem se recicla sozinho: ninguém precisa reiniciar entre um visitante
  // e outro, que é o requisito real de um estande sem operador dedicado.
  agendar(voltarParaAtracao, CONFIG.INATIVIDADE_FINAL_MS)
}

// ═══ Entrada do jogador ════════════════════════════════════════════════════

/**
 * Handler do toque que para o cronômetro.
 *
 * O timestamp é lido na PRIMEIRA linha, antes de qualquer leitura ou escrita
 * no DOM: um layout recalculado antes da medição vira erro de dezenas de ms.
 *
 * Duas proteções de multi-toque, que numa feira acontecem o tempo todo:
 *  - `isPrimary` descarta o segundo dedo. Se o amigo encosta na tela ou a
 *    palma toca a borda enquanto o jogador segura o tablet, esse contato
 *    dispara um `pointerdown` próprio que NÃO pode parar o cronômetro.
 *  - `estaAtivo()` garante que uma rodada já encerrada não seja registrada
 *    duas vezes por dois toques quase simultâneos.
 *
 * @param {PointerEvent} evento
 */
function aoParar(evento) {
  const agora = performance.now()

  if (!evento.isPrimary) return
  if (!cronometro.estaAtivo()) return

  ponteiroAtivo = evento.pointerId
  const tempo = cronometro.parar(agora)
  audio.toque()
  encerrarTentativa(tempo)
}

// ═══ Ligações com o DOM ════════════════════════════════════════════════════

const botaoComecar = document.getElementById('btn-comecar')
const botaoParar = document.getElementById('btn-parar')
const botaoProximo = document.getElementById('btn-proximo')
const botaoOperador = document.getElementById('btn-operador')

botaoComecar.addEventListener('pointerdown', comecarPartida)
botaoProximo.addEventListener('pointerdown', voltarParaAtracao)

botaoParar.addEventListener('pointerdown', aoParar)

// O iOS dispara `pointercancel` quando o sistema assume o ponteiro (gesto de
// borda, notificação). Sem tratar, a rodada fica em estado zumbi.
botaoParar.addEventListener('pointercancel', () => {
  if (cronometro.estaAtivo()) ponteiroAtivo = null
})

/**
 * Operação por teclado, para o avaliador que abrir o link num notebook.
 * O briefing exige interface "operável com mouse/teclado (computador)".
 */
document.addEventListener('keydown', (evento) => {
  if (evento.repeat) return // segurar a tecla não dispara em rajada
  if (evento.key !== ' ' && evento.key !== 'Enter') return
  evento.preventDefault()

  const tela = estado.obter().tela
  if (tela === TELAS.ATRACAO) comecarPartida()
  else if (tela === TELAS.RODADA && cronometro.estaAtivo()) {
    const agora = performance.now()
    const tempo = cronometro.parar(agora)
    audio.toque()
    encerrarTentativa(tempo)
  } else if (tela === TELAS.FINAL) voltarParaAtracao()
})

// Sair da aba com uma rodada em andamento produziria um tempo sem sentido:
// a partida é abortada em silêncio e o totem volta para a atração.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && estado.obter().tela !== TELAS.ATRACAO) voltarParaAtracao()
})

// Pinça de zoom desliga: `user-scalable=no` é ignorado no iOS desde o iOS 10.
document.addEventListener('gesturestart', (evento) => evento.preventDefault())

/**
 * Atalho do operador: três toques no canto superior esquerdo, dentro de 1,5 s,
 * zeram o placar do dia. Funciona sem sair do Acesso Guiado e é invisível
 * para quem está jogando.
 */
let toquesOperador = []
botaoOperador.addEventListener('pointerdown', () => {
  const agora = performance.now()
  toquesOperador = [...toquesOperador, agora].filter((t) => agora - t < 1500)
  if (toquesOperador.length < 3) return
  toquesOperador = []
  ranking.limpar()
  voltarParaAtracao()
})

/**
 * Qualquer erro não tratado devolve o totem a um estado limpo em vez de deixar
 * a tela congelada na frente do próximo visitante. A guarda de tela evita que
 * um erro lançado durante o próprio reset vire laço infinito.
 */
function recuperarDeErro() {
  if (estado.obter().tela !== TELAS.ATRACAO) voltarParaAtracao()
}
window.addEventListener('error', recuperarDeErro)
window.addEventListener('unhandledrejection', recuperarDeErro)

// ═══ Inicialização ═════════════════════════════════════════════════════════

/**
 * Decodifica as imagens antes do primeiro toque.
 *
 * Sem isso, a primeira exibição de uma lata decodifica durante a partida — e
 * decodificação roda na mesma thread que mede o tempo.
 */
async function precarregarImagens() {
  const fontes = [...document.images]
    .map((img) => img.currentSrc || img.src)
    .filter(Boolean)

  await Promise.allSettled(
    fontes.map((src) => {
      const img = new Image()
      img.src = src
      return img.decode()
    })
  )
}

voltarParaAtracao()
desenhar()
precarregarImagens()
