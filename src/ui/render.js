/**
 * Renderização — estado → DOM
 * ============================
 *
 * Este é o único módulo autorizado a tocar o `document`. Ele não decide nada:
 * lê o estado e desenha. Nenhuma regra do jogo, nenhum cálculo de vitória e
 * nenhum acesso ao placar acontecem aqui.
 *
 * A troca de tela é feita por um atributo em <body> (`data-tela`), nunca
 * reconstruindo HTML — o layout já está no `index.html` e só muda de
 * visibilidade, o que evita reflow pesado no meio de uma rodada.
 */

import { CONFIG } from '../core/config.js'
import { TELAS } from '../core/estado.js'
import {
  deltaDaTentativa,
  erroTotalDe,
  faixaDaTentativa,
  formatarDelta,
  formatarSegundos,
} from '../core/regras.js'
import {
  BOTAO_RESULTADO,
  CONTAGEM,
  FINAL,
  FRASE_PREPARO,
  SABOR,
  textoDaPosicao,
} from '../core/mensagens.js'

const CAMINHO_IMG = 'public/media/img'

/** Atalho de `getElementById`, com o id como chave. */
const $ = (id) => document.getElementById(id)

/** Referências capturadas uma vez só, na carga do módulo. */
const el = {
  corpo: document.body,
  telas: [...document.querySelectorAll('.tela')],

  placarAtracaoLista: $('placar-atracao-lista'),

  preparoTentativa: $('preparo-tentativa'),
  preparoAlvo: $('preparo-alvo'),
  preparoFrase: $('preparo-frase'),
  contagem: $('contagem'),

  rodadaAlvo: $('rodada-alvo'),
  pips: $('pips'),

  feedbackTempo: $('feedback-tempo'),
  feedbackDelta: $('feedback-delta'),
  feedbackMensagem: $('feedback-mensagem'),
  feedbackBarra: $('feedback-barra'),
  orcamentoValor: $('orcamento-valor'),
  orcamentoBarra: $('orcamento-barra'),

  finalSelo: $('final-selo'),
  finalTitulo: $('final-titulo'),
  finalLinha: $('final-linha'),
  finalTotal: $('final-total'),
  finalLimite: $('final-limite'),
  finalTentativas: $('final-tentativas'),
  finalBotao: $('btn-escolher-sabor-rotulo'),
  assinatura: $('assinatura'),

  saborFaixa: $('sabor-faixa'),
  saborKicker: $('sabor-kicker'),
  saborTitulo: $('sabor-titulo'),
  saborBotao: $('btn-confirmar-sabor'),

  finalLata: $('final-lata'),
  finalIdentidade: $('final-identidade'),
  finalPosicao: $('final-posicao'),
  placarFinalLista: $('placar-final-lista'),
}

/**
 * Escreve um número no display de largura travada.
 *
 * A Futura for Red Bull não tem figuras tabulares e o "1" é bem mais estreito
 * que os outros dígitos (ver comentário em `styles/base.css`). Emitir um
 * <span> por caractere, cada um com largura fixa em `em`, é o que impede o
 * número de tremer lateralmente enquanto os dígitos mudam.
 *
 * @param {HTMLElement} alvo elemento com a classe `.display`
 * @param {string} texto ex.: "11,42"
 */
function escreverDisplay(alvo, texto) {
  alvo.textContent = ''
  const fragmento = document.createDocumentFragment()
  for (const caractere of texto) {
    const span = document.createElement('span')
    span.className = /[0-9]/.test(caractere) ? 'd' : 'sep'
    span.textContent = caractere
    fragmento.append(span)
  }
  alvo.append(fragmento)
}

/**
 * Desenha os marcadores de tentativa.
 * @param {number} feitas quantas tentativas já foram concluídas
 */
function desenharPips(feitas) {
  el.pips.textContent = ''
  for (let i = 0; i < CONFIG.TENTATIVAS; i += 1) {
    const li = document.createElement('li')
    li.dataset.estado = i < feitas ? 'feita' : i === feitas ? 'atual' : 'futura'
    el.pips.append(li)
  }
}

/**
 * Monta uma lista de placar. A mesma função serve a tela de atração e a de
 * placar final — muda só o `<ol>` de destino e qual linha é destacada.
 *
 * @param {HTMLElement} lista `<ol>` de destino
 * @param {import('../dados/registro.js').Registro[]} melhores
 * @param {number|null} meuNumero número do jogador atual, para destacar
 */
function renderPlacar(lista, melhores, meuNumero) {
  lista.textContent = ''

  // Placar vazio numa tela lê como produto quebrado. Preferimos um estado
  // próprio a preencher com entradas fantasma — inventar dado é indefensável
  // se alguém perguntar de onde veio.
  if (melhores.length === 0) {
    const vazio = document.createElement('li')
    vazio.className = 'placar__vazio'
    vazio.textContent = 'Ninguém jogou ainda. Seja o primeiro.'
    lista.append(vazio)
    return
  }

  melhores.forEach((registro, indice) => {
    const li = document.createElement('li')
    li.dataset.eu = String(registro.numero === meuNumero)

    const pos = document.createElement('span')
    pos.className = 'p-pos'
    pos.textContent = `${indice + 1}º`

    const nome = document.createElement('span')
    nome.textContent = registro.rotulo

    const erro = document.createElement('span')
    erro.className = 'p-erro'
    erro.textContent = `${formatarSegundos(registro.erroTotalMs)} s`

    li.append(pos, nome, erro)
    lista.append(li)
  })
}

/**
 * Atualiza a contagem regressiva. Recriar o <span> a cada número reinicia a
 * animação de entrada sem precisar mexer em classes.
 * @param {number} restante 3, 2, 1 ou 0 (0 = largada)
 */
function renderContagem(restante) {
  const indice = CONTAGEM.length - 1 - restante
  const span = document.createElement('span')
  span.textContent = CONTAGEM[indice] ?? CONTAGEM.at(-1)
  el.contagem.textContent = ''
  el.contagem.append(span)
  el.contagem.dataset.largada = String(restante === 0)
}

/**
 * Desenha o orçamento de erro: quanto o jogador já gastou do limite.
 *
 * É esta barra que ensina a regra sem uma linha de instrução — o briefing
 * proíbe manual, então a mecânica precisa se explicar por um número que sobe.
 *
 * @param {import('../core/regras.js').Tentativa[]} tentativas
 */
function renderOrcamento(tentativas) {
  const gasto = erroTotalDe(tentativas)
  const limite = CONFIG.LIMITE_ERRO_TOTAL_MS

  el.orcamentoValor.textContent = `${formatarSegundos(gasto)} / ${formatarSegundos(limite)}`
  el.orcamentoBarra.style.transform = `scaleX(${Math.min(1, gasto / limite)})`
  el.orcamentoBarra.parentElement.dataset.estourou = String(gasto > limite)
}

/**
 * Monta a lista de tentativas da tela de resultado.
 * @param {import('../core/regras.js').Tentativa[]} tentativas
 */
function renderTentativas(tentativas) {
  el.finalTentativas.textContent = ''
  tentativas.forEach((tentativa, indice) => {
    const li = document.createElement('li')
    li.dataset.cravada = String(tentativa.cravada)

    const num = document.createElement('span')
    num.className = 't-num'
    num.textContent = `${indice + 1}`

    const tempo = document.createElement('span')
    tempo.textContent = tentativa.parou
      ? `${formatarSegundos(tentativa.tempoMs)} s  ·  alvo ${formatarSegundos(tentativa.alvoMs)} s`
      : 'não parou'

    const erro = document.createElement('span')
    erro.className = 't-erro'
    erro.textContent = tentativa.parou ? formatarDelta(deltaDaTentativa(tentativa)) : '—'

    li.append(num, tempo, erro)
    el.finalTentativas.append(li)
  })
}

/**
 * Desenha a tela de veredito.
 * @param {import('../core/estado.js').Estado} estado
 */
function renderResultado(estado) {
  const { resultado, tentativas, assinatura } = estado
  const texto = FINAL[resultado.motivo ?? 'derrota']

  el.corpo.dataset.vitoria = String(resultado.venceu)
  el.finalSelo.src = `${CAMINHO_IMG}/${resultado.venceu ? 'asas.webp' : 'barreira.webp'}`
  el.finalTitulo.textContent = texto.titulo
  el.finalLinha.textContent = texto.linha
  el.finalBotao.textContent = BOTAO_RESULTADO[resultado.venceu ? 'vitoria' : 'derrota']
  el.assinatura.textContent = assinatura

  escreverDisplay(el.finalTotal, formatarSegundos(resultado.erroTotalMs))
  el.finalTotal.dataset.venceu = String(resultado.venceu)
  el.finalLimite.textContent = `limite: ${formatarSegundos(CONFIG.LIMITE_ERRO_TOTAL_MS)} s`

  renderTentativas(tentativas)
}

/**
 * Desenha a tela de escolha do sabor.
 *
 * A faixa lateral assume a cor amostrada da lata centralizada, e o texto vira
 * escuro quando o fundo é claro demais para branco — o amarelo do Tropical e o
 * verde do Melão não sustentam texto branco.
 *
 * @param {import('../core/estado.js').Estado} estado
 */
function renderSabor(estado) {
  const { sabor } = estado
  if (!sabor) return

  el.saborKicker.textContent = SABOR.kicker
  el.saborTitulo.textContent = sabor.titulo
  el.saborBotao.textContent = SABOR.botao

  el.saborFaixa.style.setProperty('--cor-sabor', sabor.cor)
  el.saborFaixa.dataset.textoEscuro = String(sabor.textoEscuro)
}

/**
 * Desenha a tela de placar.
 * @param {import('../core/estado.js').Estado} estado
 * @param {import('../dados/registro.js').Registro[]} melhores
 */
function renderPlacarFinal(estado, melhores) {
  const { identidade, posicao } = estado

  if (identidade) {
    el.finalLata.src = `${CAMINHO_IMG}/lata-${identidade.imagem}.webp`
    el.finalLata.alt = `Red Bull ${identidade.nome}`
    el.finalIdentidade.textContent = identidade.rotulo
  }
  el.finalPosicao.textContent = posicao ? textoDaPosicao(posicao.posicao, posicao.total) : ''

  renderPlacar(el.placarFinalLista, melhores, identidade?.numero ?? null)
}

/**
 * Ponto de entrada da renderização: recebe o estado e sincroniza a tela.
 * @param {import('../core/estado.js').Estado} estado
 * @param {import('../dados/registro.js').Registro[]} melhores placar do dia
 */
export function render(estado, melhores) {
  el.corpo.dataset.tela = estado.tela
  // Uma tela visível por vez. `data-tela` no <body> continua existindo porque
  // o CSS o usa para variações de tema, mas quem manda na visibilidade é aqui.
  for (const tela of el.telas) {
    tela.dataset.ativa = String(tela.dataset.para === estado.tela)
  }

  switch (estado.tela) {
    case TELAS.ATRACAO:
      renderPlacar(el.placarAtracaoLista, melhores, null)
      break

    case TELAS.PREPARO:
      el.preparoTentativa.textContent =
        `TENTATIVA ${estado.tentativas.length + 1} DE ${CONFIG.TENTATIVAS}`
      escreverDisplay(el.preparoAlvo, formatarSegundos(estado.alvoMs))
      el.preparoFrase.textContent = FRASE_PREPARO
      renderContagem(estado.contagem)
      break

    case TELAS.RODADA:
      el.rodadaAlvo.textContent = formatarSegundos(estado.alvoMs)
      desenharPips(estado.tentativas.length)
      break

    case TELAS.FEEDBACK: {
      const { ultima } = estado
      const delta = deltaDaTentativa(ultima)
      escreverDisplay(el.feedbackTempo, ultima.parou ? formatarSegundos(ultima.tempoMs) : '--,--')
      el.feedbackTempo.dataset.faixa = faixaDaTentativa(ultima)
      el.feedbackDelta.textContent = ultima.parou ? formatarDelta(delta) : ''
      el.feedbackDelta.dataset.lado = delta < 0 ? 'antes' : 'depois'
      el.feedbackMensagem.textContent = estado.mensagem
      renderOrcamento(estado.tentativas)

      // Reinicia a animação da barra do zero a cada tentativa.
      const barra = el.feedbackBarra.firstElementChild
      barra.style.animation = 'none'
      void barra.offsetWidth
      barra.style.animation = `escorrer ${CONFIG.FEEDBACK_MS}ms linear both`
      break
    }

    case TELAS.RESULTADO:
      renderResultado(estado)
      break

    case TELAS.SABOR:
      renderSabor(estado)
      break

    case TELAS.PLACAR:
      renderPlacarFinal(estado, melhores)
      break
  }
}
