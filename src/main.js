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
import { identidadePara, saborInicial, SABORES } from './core/jogadores.js'
import { assinaturaAleatoria, mensagemPara } from './core/mensagens.js'
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
import { criarCarrossel } from './ui/carrossel.js'
import { render } from './ui/render.js'

const audio = criarAudio()
const cronometro = criarCronometro()

/** Todos os `setTimeout` em voo, para que trocar de tela nunca deixe resto. */
let agendamentos = []

/** Handle do polling do placar. Só existe enquanto a atração está na tela. */
let sondagem = null

/** Trava de gravação: uma partida só entra no placar uma vez. */
let gravandoPartida = false

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

// ═══ Polling do placar ══════════════════════════════════════════════════════

/**
 * Liga a busca periódica do placar.
 *
 * Só roda na tela de atração: durante uma rodada cronometrada não pode haver
 * nenhuma requisição concorrendo com a medição de tempo. No modo local a
 * chamada é instantânea e não custa nada; no modo remoto, é o que faz a
 * partida de outro aparelho aparecer sozinha no placar.
 */
function ligarSondagem() {
  desligarSondagem()
  sondagem = setInterval(async () => {
    if (await ranking.sincronizar()) desenhar()
  }, CONFIG.RANKING_POLL_MS)
}

function desligarSondagem() {
  if (sondagem !== null) clearInterval(sondagem)
  sondagem = null
}

// ═══ Ciclo de vida da partida ══════════════════════════════════════════════

/**
 * Volta o totem ao estado limpo.
 *
 * É chamado na ENTRADA da atração — nunca na saída da última tela — para que
 * qualquer caminho de erro também termine aqui. Regra dura do projeto:
 * nenhum dado do jogador N pode aparecer no primeiro frame do jogador N+1.
 */
function voltarParaAtracao() {
  cancelarAgendamentos()
  cronometro.cancelar()
  estado.reiniciar() // `data-vitoria` sai junto: o render o deriva do estado
  ligarSondagem()
}

/** Começa uma partida nova. */
function comecarPartida() {
  audio.destravar() // primeiro gesto do usuário: é aqui que o som pode ligar
  cancelarAgendamentos()
  desligarSondagem()
  estado.definir({
    tentativas: [],
    identidade: null,
    resultado: null,
    posicao: null,
    sabor: null,
    assinatura: assinaturaAleatoria(),
  })
  prepararTentativa()
}

/**
 * Mostra o alvo, roda a contagem regressiva e larga o cronômetro na buzina.
 */
function prepararTentativa() {
  cancelarAgendamentos()

  const rodada = estado.obter().tentativas.length
  estado.definir({
    tela: TELAS.PREPARO,
    alvoMs: sortearAlvo(rodada),
    contagem: CONFIG.CONTAGEM_REGRESSIVA_S,
  })

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

  const { alvoMs, tentativas } = estado.obter()
  const tentativa = registrarTentativa(tempoMs, alvoMs)
  const todas = [...tentativas, tentativa]

  if (tentativa.cravada) audio.cravada()

  estado.definir({
    tela: TELAS.FEEDBACK,
    tentativas: todas,
    ultima: tentativa,
    mensagem: mensagemPara(faixaDaTentativa(tentativa), tentativa.parou),
  })

  agendar(
    () => (partidaAcabou(todas) ? mostrarResultado(todas) : prepararTentativa()),
    CONFIG.FEEDBACK_MS
  )
}

/**
 * Fecha a partida e mostra o veredito.
 *
 * O veredito vem ANTES da escolha do sabor de propósito: saber que ganhou uma
 * lata muda o sentido de escolher qual lata é.
 *
 * @param {import('./core/regras.js').Tentativa[]} tentativas
 */
function mostrarResultado(tentativas) {
  cancelarAgendamentos()

  const resultado = avaliarPartida(tentativas)
  estado.definir({ tela: TELAS.RESULTADO, resultado })
  // Só quem ganhou vai ver o carrossel — não custa 540 KB de rede a quem vai
  // voltar direto para a atração.
  if (resultado.venceu) precarregarCarrossel()

  if (resultado.venceu) audio.campeao()
  else audio.derrota()

  // Quem não fechou o orçamento não escolhe lata e não entra no placar: o
  // placar é dos vencedores do dia. A tela de derrota devolve para a atração,
  // que é o convite para jogar de novo.
  agendar(resultado.venceu ? irParaSabor : voltarParaAtracao, CONFIG.RESULTADO_MS)
}

/** O que o botão da tela de resultado faz depende do veredito. */
function seguirDoResultado() {
  if (estado.obter().resultado?.venceu) irParaSabor()
  else voltarParaAtracao()
}

/**
 * Abre o carrossel de sabores.
 *
 * O sabor centralizado começa sorteado: além de variar o placar, é ele que
 * vale se o jogador largar o tablet e a tela avançar sozinha.
 */
function irParaSabor() {
  cancelarAgendamentos()

  const inicial = saborInicial()
  carrossel.reiniciar(SABORES.indexOf(inicial))
  estado.definir({ tela: TELAS.SABOR, sabor: inicial })

  agendar(confirmarSabor, CONFIG.SABOR_MS)
}

/**
 * Registra a partida com o sabor escolhido e mostra o placar.
 *
 * O número de chegada é atribuído por quem grava — no modo remoto, pelo
 * servidor — para que dois aparelhos jogando junto não gerem dois "TROPICAL 7".
 */
async function confirmarSabor() {
  // Guarda de reentrância. Entre o `await` da gravação e a troca de tela a
  // tela de sabor continua visível e o botão continua clicável: no modo
  // remoto, com até RANKING_TIMEOUT_MS de rede, um segundo toque gravava a
  // mesma partida de novo e a pessoa aparecia duas vezes no placar. Toque
  // duplo em botão grande é comportamento padrão de visitante de feira.
  // A flag cobre também a entrada por teclado, que `disabled` no botão não
  // alcançaria.
  if (gravandoPartida) return
  gravandoPartida = true

  try {
    cancelarAgendamentos()

    const { resultado, sabor } = estado.obter()
    const escolhido = sabor ?? saborInicial()

    const { numero, posicao, total } = await ranking.registrar({
      sabor: escolhido.id,
      nome: escolhido.nome,
      erroTotalMs: resultado.erroTotalMs,
      melhorErroMs: resultado.melhorErroMs,
      venceu: resultado.venceu,
    })

    estado.definir({
      tela: TELAS.PLACAR,
      identidade: identidadePara(escolhido.id, numero),
      posicao: { posicao, total },
    })

    // O totem se recicla sozinho: ninguém precisa reiniciar entre um visitante
    // e outro, que é o requisito real de um estande sem operador dedicado.
    agendar(voltarParaAtracao, CONFIG.INATIVIDADE_FINAL_MS)
  } finally {
    gravandoPartida = false
  }
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

  audio.toque()
  encerrarTentativa(cronometro.parar(agora))
}

// ═══ Ligações com o DOM ════════════════════════════════════════════════════

const botaoComecar = document.getElementById('btn-comecar')
const botaoParar = document.getElementById('btn-parar')
const botaoEscolherSabor = document.getElementById('btn-escolher-sabor')
const botaoConfirmarSabor = document.getElementById('btn-confirmar-sabor')
const botaoProximo = document.getElementById('btn-proximo')
const botaoOperador = document.getElementById('btn-operador')

const setaAnterior = document.getElementById('sabor-anterior')
const setaProxima = document.getElementById('sabor-proximo')

const carrossel = criarCarrossel(
  {
    trilho: document.getElementById('carrossel-trilho'),
    pontos: document.getElementById('carrossel-pontos'),
    anterior: setaAnterior,
    proximo: setaProxima,
  },
  (sabor) => {
    // Mexer no carrossel é sinal de vida: adia o auto-avanço para o jogador
    // ter tempo de ver todas as latas.
    if (estado.obter().tela === TELAS.SABOR) {
      cancelarAgendamentos()
      agendar(confirmarSabor, CONFIG.SABOR_MS)
    }
    estado.definir({ sabor })
  }
)

botaoComecar.addEventListener('pointerdown', comecarPartida)
botaoParar.addEventListener('pointerdown', aoParar)
botaoEscolherSabor.addEventListener('pointerdown', seguirDoResultado)
botaoConfirmarSabor.addEventListener('pointerdown', confirmarSabor)
botaoProximo.addEventListener('pointerdown', voltarParaAtracao)

setaAnterior.addEventListener('pointerdown', () => carrossel.anterior())
setaProxima.addEventListener('pointerdown', () => carrossel.proximo())

// O iOS dispara `pointercancel` quando o sistema assume o ponteiro (gesto de
// borda, notificação). Sem tratar, a rodada fica em estado zumbi.
//
// `isPrimary` aqui pelo mesmo motivo que em `aoParar`: sem a guarda, o dedo do
// amigo não conseguia PARAR a rodada mas conseguia MATÁ-LA — e o jogador ficava
// olhando uma tela inerte até a rede de segurança fechar a tentativa.
botaoParar.addEventListener('pointercancel', (evento) => {
  if (evento.isPrimary) cronometro.cancelar()
})

/**
 * Operação por teclado, para o avaliador que abrir o link num notebook.
 * O briefing exige interface "operável com mouse/teclado (computador)".
 */
document.addEventListener('keydown', (evento) => {
  if (evento.repeat) return // segurar a tecla não dispara em rajada
  const tela = estado.obter().tela

  if (tela === TELAS.SABOR) {
    if (evento.key === 'ArrowLeft') return carrossel.anterior()
    if (evento.key === 'ArrowRight') return carrossel.proximo()
  }

  if (evento.key !== ' ' && evento.key !== 'Enter') return

  // Enter/Espaço com foco numa seta do carrossel tem que NAVEGAR, não
  // confirmar. As setas só escutam `pointerdown`, então sem este desvio o
  // handler global engolia a tecla e mandava o jogador direto para o placar
  // com o sabor errado — quem navega por teclado é exatamente quem não
  // consegue apontar para a lata que quer.
  if (document.activeElement === setaAnterior) {
    evento.preventDefault()
    return carrossel.anterior()
  }
  if (document.activeElement === setaProxima) {
    evento.preventDefault()
    return carrossel.proximo()
  }

  evento.preventDefault()

  if (tela === TELAS.ATRACAO) comecarPartida()
  else if (tela === TELAS.RODADA && cronometro.estaAtivo()) {
    const agora = performance.now()
    audio.toque()
    encerrarTentativa(cronometro.parar(agora))
  } else if (tela === TELAS.RESULTADO) seguirDoResultado()
  else if (tela === TELAS.SABOR) confirmarSabor()
  else if (tela === TELAS.PLACAR) voltarParaAtracao()
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
botaoOperador.addEventListener('pointerdown', async () => {
  const agora = performance.now()
  toquesOperador = [...toquesOperador, agora].filter((t) => agora - t < 1500)
  if (toquesOperador.length < 3) return
  toquesOperador = []
  await ranking.limpar()
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
 * Decodifica um conjunto de imagens fora do caminho crítico.
 *
 * Decodificação roda na mesma thread que mede o tempo, então nenhuma imagem
 * pode decodificar durante uma rodada.
 *
 * @param {Iterable<Element>} imagens
 */
async function precarregar(imagens) {
  const fontes = [...imagens].map((img) => img.currentSrc || img.src).filter(Boolean)
  await Promise.allSettled(
    fontes.map((src) => {
      const img = new Image()
      img.src = src
      return img.decode()
    })
  )
}

/**
 * As 12 latas do carrossel pesam mais que o resto da página somada. Elas são
 * carregadas só quando a partida já acabou e o jogador está lendo o resultado
 * — nesse ponto, alguns centenas de milissegundos de rede são invisíveis, e a
 * tela de atração continua abrindo leve.
 */
let carrosselPrecarregado = false
function precarregarCarrossel() {
  if (carrosselPrecarregado) return
  carrosselPrecarregado = true
  precarregar(document.querySelectorAll('.carrossel__item img'))
}

voltarParaAtracao()
desenhar()
// Só o que a primeira tela mostra entra no caminho crítico.
precarregar(document.querySelectorAll('.tela--atracao img'))

// O placar é carregado depois do primeiro frame: a tela de atração não pode
// esperar rede para aparecer.
ranking
  .iniciar()
  .then((modo) => {
    console.info(`[placar] modo ${modo}`)
    desenhar()
  })
  .catch(() => {
    /* iniciar já degrada para local; nada a fazer aqui */
  })
