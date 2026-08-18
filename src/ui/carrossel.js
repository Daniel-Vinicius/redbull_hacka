/**
 * Carrossel de sabores
 * =====================
 *
 * Um trilho deslocado por `transform`, não por `scroll`. A diferença importa:
 * com scroll nativo seria preciso ouvir eventos de rolagem para descobrir qual
 * lata está centralizada, e o auto-avanço por inatividade teria que disputar o
 * momento com a rolagem por inércia. Com transform, o índice atual é uma
 * variável — sempre exato, sempre testável.
 *
 * Três formas de navegar, porque o jogo roda em tablet e é avaliado no
 * navegador de um notebook: arraste, setas na tela e setas do teclado.
 *
 * Só `transform` e `opacity` são animados.
 */

import { SABORES } from '../core/jogadores.js'

const CAMINHO_IMG = 'public/media/img'

/** Arraste mínimo, em px, para valer troca de sabor. */
const LIMIAR_ARRASTE = 45

/**
 * @typedef {object} Carrossel
 * @property {(indice: number) => void} irPara
 * @property {() => void} anterior
 * @property {() => void} proximo
 * @property {() => import('../core/sabores.gerado.js').Sabor} atual
 * @property {(indice: number) => void} reiniciar recomeça num sabor, sem animar
 */

/**
 * Monta o carrossel dentro dos elementos informados.
 *
 * @param {object} elementos
 * @param {HTMLElement} elementos.trilho `<ul>` que recebe as latas
 * @param {HTMLElement} elementos.pontos `<ol>` dos indicadores
 * @param {HTMLButtonElement} elementos.anterior seta para o sabor anterior
 * @param {HTMLButtonElement} elementos.proximo seta para o próximo sabor
 * @param {(sabor: import('../core/sabores.gerado.js').Sabor, indice: number) => void} aoMudar
 *   chamado a cada troca de sabor centralizado
 * @returns {Carrossel}
 */
export function criarCarrossel({ trilho, pontos, anterior, proximo }, aoMudar) {
  let indice = 0

  // ---- Monta o DOM uma vez só ---------------------------------------------
  trilho.textContent = ''
  pontos.textContent = ''

  for (const sabor of SABORES) {
    const item = document.createElement('li')
    item.className = 'carrossel__item'
    item.dataset.sabor = sabor.id

    const imagem = document.createElement('img')
    imagem.src = `${CAMINHO_IMG}/lata-${sabor.imagem}-grande.webp`
    imagem.alt = `Red Bull ${sabor.titulo}`
    imagem.width = 300
    imagem.height = 900
    // TODAS preguiçosas, sem exceção. Uma imagem `eager` dentro de uma tela
    // escondida ainda é baixada na abertura: as duas primeiras latas custavam
    // 92 KB na tela de atração para aparecer só depois da partida. Quem carrega
    // o carrossel é `precarregarCarrossel()`, na entrada da tela de resultado.
    imagem.loading = 'lazy'
    imagem.decoding = 'async'

    item.append(imagem)
    trilho.append(item)

    const ponto = document.createElement('li')
    ponto.className = 'carrossel__ponto'
    pontos.append(ponto)
  }

  const itens = [...trilho.children]
  const marcadores = [...pontos.children]

  /**
   * Aplica o deslocamento e avisa quem observa.
   * @param {boolean} animar
   */
  function desenhar(animar = true) {
    trilho.style.transition = animar ? '' : 'none'
    // Cada item ocupa uma coluna de largura fixa definida no CSS; deslocar o
    // trilho em `-indice` colunas é o que centraliza a lata escolhida.
    trilho.style.setProperty('--indice', String(indice))

    itens.forEach((item, i) => {
      item.dataset.estado = i === indice ? 'atual' : 'lado'
    })
    marcadores.forEach((marcador, i) => {
      marcador.dataset.estado = i === indice ? 'atual' : 'outro'
    })

    // Nas pontas a seta não tem para onde ir. Marcá-la como desabilitada evita
    // o pior caso de interface: um botão que parece funcionar e não faz nada.
    anterior.disabled = indice === 0
    proximo.disabled = indice === SABORES.length - 1

    if (!animar) {
      // Força o navegador a aplicar o salto antes de reabilitar a transição.
      void trilho.offsetWidth
      trilho.style.transition = ''
    }

    aoMudar(SABORES[indice], indice)
  }

  /**
   * Move para um índice, sem dar a volta: nas pontas, para.
   * Dar a volta num carrossel de 12 latas confundiria quem só quer conferir
   * se já viu todas.
   * @param {number} alvo
   */
  function irPara(alvo) {
    const novo = Math.max(0, Math.min(SABORES.length - 1, alvo))
    if (novo === indice) return
    indice = novo
    desenhar()
  }

  // ---- Arraste --------------------------------------------------------------
  let inicioX = null
  let ponteiro = null

  trilho.addEventListener('pointerdown', (evento) => {
    if (!evento.isPrimary) return
    inicioX = evento.clientX
    ponteiro = evento.pointerId
    trilho.setPointerCapture(ponteiro)
  })

  trilho.addEventListener('pointerup', (evento) => {
    if (inicioX === null || evento.pointerId !== ponteiro) return
    const distancia = evento.clientX - inicioX
    inicioX = null
    ponteiro = null
    if (Math.abs(distancia) < LIMIAR_ARRASTE) return
    irPara(indice + (distancia < 0 ? 1 : -1))
  })

  // O iOS toma o ponteiro em gesto de borda ou notificação: sem tratar,
  // o arraste ficaria travado achando que ainda está em curso.
  trilho.addEventListener('pointercancel', () => {
    inicioX = null
    ponteiro = null
  })

  desenhar(false)

  return {
    irPara,
    anterior: () => irPara(indice - 1),
    proximo: () => irPara(indice + 1),
    atual: () => SABORES[indice],
    reiniciar(novoIndice) {
      indice = Math.max(0, Math.min(SABORES.length - 1, novoIndice))
      desenhar(false)
    },
  }
}
