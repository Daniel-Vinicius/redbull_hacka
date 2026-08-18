/**
 * Testes das regras do jogo
 * ==========================
 *
 * Roda com o test runner nativo do Node, sem nenhuma dependência:
 *
 *     npm test
 *
 * Só o que é pura lógica é testado — é justamente por isso que `core/regras.js`
 * não importa `document` nem `Math.random` direto: tudo que varia entra por
 * parâmetro, então tudo pode ser fixado no teste.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { CONFIG } from '../src/core/config.js'
import {
  avaliarPartida,
  calcularDelta,
  calcularErro,
  classificarFaixa,
  ehCravada,
  faixaDaTentativa,
  formatarDelta,
  formatarSegundos,
  partidaAcabou,
  registrarTentativa,
  sortearAlvo,
} from '../src/core/regras.js'
import { proximaIdentidade, SABORES } from '../src/core/jogadores.js'
import { mensagemPara, MENSAGEM_NAO_PAROU } from '../src/core/mensagens.js'
import { criarCronometro } from '../src/core/cronometro.js'
import { ordenar } from '../src/dados/ranking.js'

/** Gerador determinístico para os testes que dependem de sorteio. */
const rngFixo = (valor) => () => valor

describe('sortearAlvo', () => {
  it('respeita os limites da faixa configurada', () => {
    assert.equal(sortearAlvo(rngFixo(0)), CONFIG.ALVO_MIN_MS)
    assert.equal(sortearAlvo(rngFixo(0.999999)), CONFIG.ALVO_MAX_MS)
  })

  it('sempre cai num múltiplo de 10 ms, para ser exato em 2 casas decimais', () => {
    for (let i = 0; i < 500; i += 1) {
      const alvo = sortearAlvo()
      assert.equal(alvo % CONFIG.ALVO_PASSO_MS, 0)
      assert.ok(alvo >= CONFIG.ALVO_MIN_MS && alvo <= CONFIG.ALVO_MAX_MS)
    }
  })
})

describe('erro e delta', () => {
  it('erro é sempre absoluto', () => {
    assert.equal(calcularErro(10_200, 10_000), 200)
    assert.equal(calcularErro(9_800, 10_000), 200)
  })

  it('delta preserva o sinal: negativo adiantou, positivo atrasou', () => {
    assert.equal(calcularDelta(9_800, 10_000), -200)
    assert.equal(calcularDelta(10_200, 10_000), 200)
  })
})

describe('ehCravada', () => {
  it('aceita diferença menor que meio centésimo', () => {
    assert.ok(ehCravada(11_420, 11_420))
    assert.ok(ehCravada(11_424, 11_420))
    assert.ok(ehCravada(11_416, 11_420))
  })

  it('recusa diferença que muda o número impresso', () => {
    assert.ok(!ehCravada(11_426, 11_420))
    assert.ok(!ehCravada(11_500, 11_420))
  })

  it('concorda com o que a tela mostra', () => {
    // Se os dois números formatados são iguais, é cravada. Se diferem, não é.
    for (const tempo of [11_415, 11_420, 11_425, 11_460, 12_000]) {
      const iguais = formatarSegundos(tempo) === formatarSegundos(11_420)
      assert.equal(ehCravada(tempo, 11_420), iguais, `tempo ${tempo}`)
    }
  })
})

describe('classificarFaixa', () => {
  it('mapeia cada faixa de erro', () => {
    assert.equal(classificarFaixa(0), 'quase')
    assert.equal(classificarFaixa(80), 'quase')
    assert.equal(classificarFaixa(400), 'bom')
    assert.equal(classificarFaixa(900), 'medio')
    assert.equal(classificarFaixa(4_000), 'longe')
  })

  it('cravada não é faixa: é sinalizada na própria tentativa', () => {
    assert.equal(registrarTentativa(11_420, 11_420).cravada, true)
    assert.equal(faixaDaTentativa(registrarTentativa(11_420, 11_420)), 'cravou')
    assert.equal(registrarTentativa(11_500, 11_420).cravada, false)
  })

  it('a fronteira da consistência ainda conta como "bom"', () => {
    assert.equal(classificarFaixa(CONFIG.TOLERANCIA_CONSISTENCIA_MS), 'bom')
  })
})

describe('registrarTentativa', () => {
  it('marca quem parou', () => {
    const t = registrarTentativa(10_150, 10_000)
    assert.equal(t.parou, true)
    assert.equal(t.erroMs, 150)
  })

  it('quem não parou recebe o pior tempo possível da rodada', () => {
    const t = registrarTentativa(null, 10_000)
    assert.equal(t.parou, false)
    assert.equal(t.tempoMs, 10_000 + CONFIG.LIMITE_EXTRA_MS)
    assert.equal(t.erroMs, CONFIG.LIMITE_EXTRA_MS)
  })
})

describe('avaliarPartida', () => {
  it('cravada vence e zera o erro total, para liderar o placar', () => {
    const r = avaliarPartida([registrarTentativa(11_420, 11_420)])
    assert.equal(r.venceu, true)
    assert.equal(r.motivo, 'cravada')
    assert.equal(r.erroTotalMs, 0)
    assert.equal(r.completa, true)
  })

  it('três tentativas dentro de meio segundo vencem por consistência', () => {
    const r = avaliarPartida([
      registrarTentativa(10_300, 10_000),
      registrarTentativa(11_500, 11_200),
      registrarTentativa(8_600, 9_000),
    ])
    assert.equal(r.venceu, true)
    assert.equal(r.motivo, 'consistencia')
    assert.equal(r.erroTotalMs, 300 + 300 + 400)
  })

  it('uma tentativa fora da margem derruba a consistência', () => {
    const r = avaliarPartida([
      registrarTentativa(10_300, 10_000),
      registrarTentativa(11_350, 11_200),
      registrarTentativa(9_600, 9_000), // 600 ms > 500 ms: derruba a consistência
    ])
    assert.equal(r.venceu, false)
    assert.equal(r.motivo, null)
  })

  it('quem não parou nunca ganha por consistência', () => {
    const r = avaliarPartida([
      registrarTentativa(10_100, 10_000),
      registrarTentativa(11_300, 11_200),
      registrarTentativa(null, 9_000),
    ])
    assert.equal(r.venceu, false)
  })

  it('reporta o melhor erro entre as tentativas', () => {
    const r = avaliarPartida([
      registrarTentativa(10_800, 10_000),
      registrarTentativa(11_250, 11_200),
      registrarTentativa(9_900, 9_000),
    ])
    assert.equal(r.melhorErroMs, 50)
  })

  it('partida incompleta não é dada como completa', () => {
    const r = avaliarPartida([registrarTentativa(10_800, 10_000)])
    assert.equal(r.completa, false)
  })
})

describe('partidaAcabou', () => {
  it('acaba ao completar as tentativas configuradas', () => {
    const tentativas = Array.from({ length: CONFIG.TENTATIVAS }, () =>
      registrarTentativa(10_800, 10_000)
    )
    assert.equal(partidaAcabou(tentativas), true)
    assert.equal(partidaAcabou(tentativas.slice(0, -1)), false)
  })

  it('acaba na hora quando a última tentativa cravou', () => {
    assert.equal(partidaAcabou([registrarTentativa(11_420, 11_420)]), true)
  })
})

describe('formatação', () => {
  it('usa vírgula decimal e duas casas', () => {
    assert.equal(formatarSegundos(11_420), '11,42')
    assert.equal(formatarSegundos(8_000), '8,00')
    assert.equal(formatarSegundos(0), '0,00')
  })

  it('delta traz sinal explícito', () => {
    assert.equal(formatarDelta(260), '+0,26')
    assert.equal(formatarDelta(-80), '−0,08')
    assert.equal(formatarDelta(0), '±0,00')
  })
})

describe('identidade do jogador', () => {
  it('numera na ordem de chegada', () => {
    assert.equal(proximaIdentidade(0, rngFixo(0)).numero, 1)
    assert.equal(proximaIdentidade(36, rngFixo(0)).numero, 37)
  })

  it('monta o rótulo como SABOR + número', () => {
    const identidade = proximaIdentidade(6, rngFixo(0))
    assert.equal(identidade.rotulo, `${SABORES[0].nome} 7`)
  })

  it('nunca sai da lista de sabores, nem no limite do sorteio', () => {
    for (const valor of [0, 0.5, 0.999999]) {
      const identidade = proximaIdentidade(0, rngFixo(valor))
      assert.ok(SABORES.some((s) => s.id === identidade.sabor))
    }
  })
})

describe('mensagens', () => {
  it('quem não parou recebe a mensagem própria', () => {
    assert.equal(mensagemPara('longe', false), MENSAGEM_NAO_PAROU)
  })

  it('faixa desconhecida cai num texto válido em vez de quebrar', () => {
    assert.equal(typeof mensagemPara('inexistente', true, rngFixo(0)), 'string')
  })
})

describe('ordenação do placar', () => {
  it('menor erro total primeiro; empate resolve por ordem de chegada', () => {
    const ordenado = ordenar([
      { rotulo: 'B', erroTotalMs: 500, numero: 2 },
      { rotulo: 'A', erroTotalMs: 500, numero: 1 },
      { rotulo: 'C', erroTotalMs: 120, numero: 3 },
    ])
    assert.deepEqual(ordenado.map((r) => r.rotulo), ['C', 'A', 'B'])
  })

  it('não altera o array recebido', () => {
    const original = [
      { rotulo: 'B', erroTotalMs: 500, numero: 2 },
      { rotulo: 'A', erroTotalMs: 100, numero: 1 },
    ]
    ordenar(original)
    assert.equal(original[0].rotulo, 'B')
  })
})

describe('cronômetro', () => {
  it('mede a diferença entre largada e parada', () => {
    let relogio = 1_000
    const crono = criarCronometro(() => relogio)
    crono.iniciar()
    relogio = 12_420
    assert.equal(crono.parar(), 11_420)
  })

  it('parar sem ter iniciado devolve null', () => {
    const crono = criarCronometro(() => 0)
    assert.equal(crono.parar(), null)
  })

  it('não mede duas vezes a mesma rodada', () => {
    let relogio = 0
    const crono = criarCronometro(() => relogio)
    crono.iniciar()
    relogio = 5_000
    assert.equal(crono.parar(), 5_000)
    assert.equal(crono.parar(), null)
  })

  it('cancelar descarta a rodada em andamento', () => {
    const crono = criarCronometro(() => 0)
    crono.iniciar()
    crono.cancelar()
    assert.equal(crono.estaAtivo(), false)
    assert.equal(crono.parar(), null)
  })
})
