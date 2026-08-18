/**
 * Som do jogo — sintetizado, zero arquivos
 * =========================================
 *
 * Todos os efeitos são gerados pela Web Audio API em tempo real. Nenhum .mp3
 * entra no repositório: economiza banda, elimina espera de carregamento e evita
 * qualquer dúvida de licenciamento de sample num material de marca.
 *
 * Cuidados de iPad embutidos aqui:
 *  - O `AudioContext` nasce suspenso no iOS e só liga dentro de um gesto do
 *    usuário. `destravar()` deve ser chamado no primeiro toque da atração.
 *  - Web Audio é silenciado pela chave lateral de silencioso do iPad. Por isso
 *    o som é 100% ornamental: nenhuma informação necessária para jogar existe
 *    apenas no áudio. Se falhar, ninguém perde nada.
 *  - Qualquer erro de áudio é engolido. Som nunca pode derrubar o jogo.
 */

/**
 * @typedef {object} Audio
 * @property {() => void} destravar liga o contexto dentro de um gesto do usuário
 * @property {() => void} bipe bipe curto da contagem regressiva
 * @property {() => void} largada buzina de largada
 * @property {() => void} toque clique do toque de parada
 * @property {() => void} campeao fanfarra de vitória
 * @property {() => void} cravada efeito extra da cravada
 * @property {() => void} derrota descida curta de fim sem prêmio
 * @property {boolean} disponivel
 */

/**
 * Cria o motor de áudio.
 * @returns {Audio}
 */
export function criarAudio() {
  /** @type {AudioContext|null} */
  let ctx = null

  /** Executa `fn` com o contexto ligado, ignorando qualquer falha. */
  const comContexto = (fn) => {
    try {
      if (!ctx || ctx.state === 'closed') return
      // `.catch` obrigatório: `resume()` devolve uma Promise, e o `try/catch`
      // síncrono ao redor NÃO pega a rejeição dela. Sem isso, uma política de
      // autoplay do iOS vira `unhandledrejection` — e o handler global do
      // `main.js` reinicia o totem no meio da rodada do jogador.
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      fn(ctx, ctx.currentTime)
    } catch {
      /* som é ornamental: falha em silêncio */
    }
  }

  /**
   * Toca uma nota simples com envelope de ataque/decaimento.
   * @param {AudioContext} contexto
   * @param {number} inicio instante absoluto no relógio do contexto
   * @param {object} opcoes
   * @param {number} opcoes.freq frequência em Hz
   * @param {number} opcoes.dur duração em segundos
   * @param {OscillatorType} [opcoes.tipo]
   * @param {number} [opcoes.ganho] pico do envelope
   * @param {number} [opcoes.freqFinal] varredura de frequência até este valor
   */
  const nota = (contexto, inicio, { freq, dur, tipo = 'square', ganho = 0.2, freqFinal }) => {
    const osc = contexto.createOscillator()
    const vol = contexto.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(freq, inicio)
    if (freqFinal) osc.frequency.exponentialRampToValueAtTime(freqFinal, inicio + dur)

    // Ataque de 8 ms evita o "clique" de onda cortada; decaimento exponencial
    // até um valor > 0 porque exponentialRamp não aceita destino zero.
    vol.gain.setValueAtTime(0.0001, inicio)
    vol.gain.exponentialRampToValueAtTime(ganho, inicio + 0.008)
    vol.gain.exponentialRampToValueAtTime(0.0001, inicio + dur)

    osc.connect(vol).connect(contexto.destination)
    osc.start(inicio)
    osc.stop(inicio + dur + 0.02)
  }

  return {
    get disponivel() {
      return Boolean(ctx) && ctx.state !== 'closed'
    },

    destravar() {
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      } catch {
        ctx = null
      }
    },

    /** Bipe seco da contagem: 3… 2… 1… */
    bipe() {
      comContexto((c, t) => nota(c, t, { freq: 880, dur: 0.14, tipo: 'square', ganho: 0.16 }))
    },

    /** Buzina de largada: duas vozes desafinadas entre si, grave e cheia. */
    largada() {
      comContexto((c, t) => {
        nota(c, t, { freq: 262, dur: 0.85, tipo: 'sawtooth', ganho: 0.2 })
        nota(c, t, { freq: 330, dur: 0.85, tipo: 'sawtooth', ganho: 0.15 })
        nota(c, t + 0.02, { freq: 196, dur: 0.8, tipo: 'square', ganho: 0.1 })
      })
    },

    /** Clique curto do toque que para o cronômetro. */
    toque() {
      comContexto((c, t) => nota(c, t, { freq: 1200, dur: 0.05, tipo: 'square', ganho: 0.12 }))
    },

    /** Fanfarra de campeão: arpejo maior ascendente + acorde final. */
    campeao() {
      comContexto((c, t) => {
        const arpejo = [523.25, 659.25, 783.99, 1046.5] // dó, mi, sol, dó
        arpejo.forEach((freq, i) =>
          nota(c, t + i * 0.11, { freq, dur: 0.22, tipo: 'triangle', ganho: 0.22 })
        )
        const fim = t + arpejo.length * 0.11
        for (const freq of [523.25, 659.25, 783.99, 1046.5]) {
          nota(c, fim, { freq, dur: 0.9, tipo: 'triangle', ganho: 0.14 })
        }
      })
    },

    /** Realce da cravada: varredura ascendente rápida antes da fanfarra. */
    cravada() {
      comContexto((c, t) =>
        nota(c, t, { freq: 440, freqFinal: 1760, dur: 0.3, tipo: 'sawtooth', ganho: 0.18 })
      )
    },

    /** Fim sem prêmio: duas notas descendentes, curtas, sem drama. */
    derrota() {
      comContexto((c, t) => {
        nota(c, t, { freq: 392, dur: 0.18, tipo: 'triangle', ganho: 0.14 })
        nota(c, t + 0.16, { freq: 294, dur: 0.32, tipo: 'triangle', ganho: 0.14 })
      })
    },
  }
}
