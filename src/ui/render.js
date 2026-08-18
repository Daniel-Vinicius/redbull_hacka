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
  calcularDelta,
  faixaDaTentativa,
  formatarDelta,
  formatarSegundos,
} from '../core/regras.js'
import { ASSINATURA, CONTAGEM, FINAL, FRASE_PREPARO } from '../core/mensagens.js'

const CAMINHO_IMG = 'public/media/img'

/** Atalho de `getElementById`, com o id como chave. */
const $ = (id) => document.getElementById(id)

/** Referências capturadas uma vez só, na carga do módulo. */
const el = {
  corpo: document.body,
  recorde: $('recorde-dia'),

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

  finalSelo: $('final-selo'),
  finalTitulo: $('final-titulo'),
  finalLinha: $('final-linha'),
  finalTentativas: $('final-tentativas'),
  finalLata: $('final-lata'),
  finalIdentidade: $('final-identidade'),
  finalPosicao: $('final-posicao'),
  placar: $('placar'),
  placarLista: $('placar-lista'),
  assinatura: $('assinatura'),
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
 * Mostra o melhor resultado do dia na tela de atração.
 * @param {import('../dados/ranking.js').Registro[]} melhores
 */
function renderRecorde(melhores) {
  const lider = melhores[0]
  if (!lider) {
    el.recorde.hidden = true
    return
  }
  el.recorde.hidden = false
  el.recorde.innerHTML = ''
  el.recorde.append(
    document.createTextNode('Melhor do dia: '),
    Object.assign(document.createElement('strong'), {
      textContent: `${lider.rotulo} · ${formatarSegundos(lider.erroTotalMs)} s de erro`,
    })
  )
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
 * Monta a lista de tentativas da tela final.
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
    erro.textContent = tentativa.parou
      ? formatarDelta(calcularDelta(tentativa.tempoMs, tentativa.alvoMs))
      : '—'

    li.append(num, tempo, erro)
    el.finalTentativas.append(li)
  })
}

/**
 * Monta o placar do dia, destacando a linha do jogador atual.
 * @param {import('../dados/ranking.js').Registro[]} melhores
 * @param {number|null} meuNumero número sequencial do jogador atual
 */
function renderPlacar(melhores, meuNumero) {
  el.placarLista.textContent = ''

  // Placar quase vazio numa tela lê como produto quebrado. Preferimos um
  // estado próprio a preencher com entradas fantasma — inventar dado é
  // indefensável se alguém perguntar de onde veio.
  if (melhores.length < 2) {
    el.placar.hidden = false
    const vazio = document.createElement('li')
    vazio.className = 'placar__vazio'
    vazio.textContent = 'Seja o primeiro a cravar.'
    el.placarLista.append(vazio)
    return
  }

  el.placar.hidden = false
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
    el.placarLista.append(li)
  })
}

/**
 * Desenha a tela final inteira.
 * @param {import('../core/estado.js').Estado} estado
 * @param {import('../dados/ranking.js').Registro[]} melhores
 */
function renderFinal(estado, melhores) {
  const { resultado, identidade, posicao, tentativas } = estado
  const texto = FINAL[resultado.motivo ?? 'derrota']

  el.corpo.dataset.vitoria = String(resultado.venceu)
  el.finalSelo.src = `${CAMINHO_IMG}/${resultado.venceu ? 'asas.webp' : 'barreira.webp'}`
  el.finalTitulo.textContent = texto.titulo
  el.finalLinha.textContent = texto.linha
  el.assinatura.textContent = ASSINATURA

  renderTentativas(tentativas)

  if (identidade) {
    el.finalLata.src = `${CAMINHO_IMG}/${identidade.imagem}`
    el.finalIdentidade.textContent = identidade.rotulo
  }
  el.finalPosicao.textContent = posicao
    ? `${posicao.posicao}º de ${posicao.total} hoje`
    : ''

  renderPlacar(melhores, identidade?.numero ?? null)
}

/**
 * Ponto de entrada da renderização: recebe o estado e sincroniza a tela.
 * @param {import('../core/estado.js').Estado} estado
 * @param {import('../dados/ranking.js').Registro[]} melhores placar do dia
 */
export function render(estado, melhores) {
  el.corpo.dataset.tela = estado.tela

  switch (estado.tela) {
    case TELAS.ATRACAO:
      renderRecorde(melhores)
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
      const delta = calcularDelta(ultima.tempoMs, ultima.alvoMs)
      escreverDisplay(el.feedbackTempo, ultima.parou ? formatarSegundos(ultima.tempoMs) : '--,--')
      el.feedbackTempo.dataset.faixa = faixaDaTentativa(ultima)
      el.feedbackDelta.textContent = ultima.parou ? formatarDelta(delta) : ''
      el.feedbackDelta.dataset.lado = delta < 0 ? 'antes' : 'depois'
      el.feedbackMensagem.textContent = estado.mensagem
      // Reinicia a animação da barra do zero a cada tentativa.
      const barra = el.feedbackBarra.firstElementChild
      barra.style.animation = 'none'
      void barra.offsetWidth
      barra.style.animation = `escorrer ${CONFIG.FEEDBACK_MS}ms linear both`
      break
    }

    case TELAS.FINAL:
      renderFinal(estado, melhores)
      break
  }
}
