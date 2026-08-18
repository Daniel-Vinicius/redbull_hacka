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
  cravouDePrimeira,
  deltaDaTentativa,
  calcularErro,
  classificarFaixa,
  ehCravada,
  erroTotalDe,
  faixaDaTentativa,
  formatarDelta,
  formatarSegundos,
  partidaAcabou,
  registrarTentativa,
  sortearAlvo,
} from '../src/core/regras.js'
import { identidadePara, saborInicial, saborPorId, SABORES } from '../src/core/jogadores.js'
import {
  ASSINATURAS,
  assinaturaAleatoria,
  mensagemPara,
  MENSAGEM_NAO_PAROU,
  textoDaPosicao,
} from '../src/core/mensagens.js'
import { criarCronometro } from '../src/core/cronometro.js'

/** Gerador determinístico para os testes que dependem de sorteio. */
const rngFixo = (valor) => () => valor

/**
 * Monta uma partida com erros exatos, para testar o corte do prêmio.
 * O alvo é o mesmo nas três: aqui só interessa a soma dos erros.
 */
const ALVO_FIXO = 10_000
const partidaComErros = (...errosMs) =>
  errosMs.map((erro) => registrarTentativa(ALVO_FIXO + erro, ALVO_FIXO))

describe('sortearAlvo', () => {
  it('respeita a faixa de cada rodada', () => {
    CONFIG.FAIXAS_ALVO.forEach(([minimo, maximo], rodada) => {
      assert.equal(sortearAlvo(rodada, rngFixo(0)), minimo)
      assert.equal(sortearAlvo(rodada, rngFixo(0.999999)), maximo)
    })
  })

  it('a dificuldade cresce: cada rodada tem alvo maior que a anterior', () => {
    const faixas = CONFIG.FAIXAS_ALVO
    for (let i = 1; i < faixas.length; i += 1) {
      assert.ok(faixas[i][0] >= faixas[i - 1][0], `rodada ${i} deveria começar mais tarde`)
      assert.ok(faixas[i][1] > faixas[i - 1][1], `rodada ${i} deveria terminar mais tarde`)
    }
  })

  it('a primeira rodada nunca desce abaixo de 2 s', () => {
    // Abaixo disso, o bipe de 1 s da contagem regressiva vira metrônomo e a
    // latência de toque pesa demais. Ver comentário em config.js.
    assert.ok(CONFIG.FAIXAS_ALVO[0][0] >= 2_000)
  })

  it('sempre cai num múltiplo de 10 ms, para ser exato em 2 casas decimais', () => {
    for (let rodada = 0; rodada < CONFIG.TENTATIVAS; rodada += 1) {
      for (let i = 0; i < 200; i += 1) {
        const alvo = sortearAlvo(rodada)
        const [minimo, maximo] = CONFIG.FAIXAS_ALVO[rodada]
        assert.equal(alvo % CONFIG.ALVO_PASSO_MS, 0)
        assert.ok(alvo >= minimo && alvo <= maximo)
      }
    }
  })

  it('uma rodada além do previsto usa a última faixa em vez de quebrar', () => {
    const ultima = CONFIG.FAIXAS_ALVO.at(-1)
    assert.equal(sortearAlvo(99, rngFixo(0)), ultima[0])
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

  it('erro total soma as tentativas', () => {
    assert.equal(erroTotalDe(partidaComErros(300, -200, 400)), 900)
    assert.equal(erroTotalDe([]), 0)
  })
})

describe('ehCravada', () => {
  it('aceita diferença menor que meio centésimo', () => {
    assert.ok(ehCravada(3_420, 3_420))
    assert.ok(ehCravada(3_424, 3_420))
    assert.ok(ehCravada(3_416, 3_420))
  })

  it('recusa diferença que muda o número impresso', () => {
    assert.ok(!ehCravada(3_426, 3_420))
    assert.ok(!ehCravada(3_500, 3_420))
  })

  it('concorda com o que a tela mostra', () => {
    // A regra é derivada da formatação justamente para não divergir dela nas
    // fronteiras de arredondamento. Se este teste quebrar, o jogo vai declarar
    // vitória mostrando dois números diferentes na tela.
    for (const tempo of [3_415, 3_420, 3_425, 3_460, 4_000]) {
      const iguais = formatarSegundos(tempo) === formatarSegundos(3_420)
      assert.equal(ehCravada(tempo, 3_420), iguais, `tempo ${tempo}`)
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

  it('"bom" é exatamente a média que ganha o prêmio', () => {
    const media = CONFIG.LIMITE_ERRO_TOTAL_MS / CONFIG.TENTATIVAS
    assert.equal(classificarFaixa(media), 'bom')
    assert.equal(classificarFaixa(media + 1), 'medio')
  })

  it('cravada não é faixa: é sinalizada na própria tentativa', () => {
    assert.equal(registrarTentativa(3_420, 3_420).cravada, true)
    assert.equal(faixaDaTentativa(registrarTentativa(3_420, 3_420)), 'cravou')
    assert.equal(registrarTentativa(3_500, 3_420).cravada, false)
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

  it('a cravada zera o erro da rodada, e não só arredonda', () => {
    // 3.418 ms imprime "3,42", igual ao alvo: para o jogo, é o mesmo número.
    const t = registrarTentativa(3_418, 3_420)
    assert.equal(t.cravada, true)
    assert.equal(t.erroMs, 0, 'cobrar os 2 ms seria cobrar precisão que a tela não dá')
  })
})

describe('deltaDaTentativa', () => {
  it('mantém o sinal de quem adiantou ou atrasou', () => {
    assert.equal(deltaDaTentativa(registrarTentativa(10_150, 10_000)), 150)
    assert.equal(deltaDaTentativa(registrarTentativa(9_850, 10_000)), -150)
  })

  it('numa cravada o delta é zero, e não "−0,00" na tela', () => {
    const t = registrarTentativa(3_418, 3_420)
    assert.equal(deltaDaTentativa(t), 0)
    assert.equal(formatarDelta(deltaDaTentativa(t)), '±0,00')
  })
})

describe('avaliarPartida', () => {
  it('cravada de primeira vence e lidera o placar com erro total zero', () => {
    const r = avaliarPartida([registrarTentativa(3_420, 3_420)])
    assert.equal(r.venceu, true)
    assert.equal(r.motivo, 'cravada')
    assert.equal(r.erroTotalMs, 0, 'o zero vem da rodada zerada, sem caso especial')
    assert.equal(r.completa, true)
  })

  it('cravada fora da primeira não ganha a lata sozinha', () => {
    const tentativas = [
      registrarTentativa(10_800, ALVO_FIXO), // erra 0,80 s
      registrarTentativa(3_420, 3_420), // crava
      registrarTentativa(10_900, ALVO_FIXO), // erra 0,90 s
    ]
    const r = avaliarPartida(tentativas)
    assert.equal(r.venceu, false, 'cravar na 2ª não pode passar na frente de quem fez as três')
    assert.equal(r.motivo, null)
    assert.equal(r.erroTotalMs, 1_700, 'a rodada cravada soma exatamente 0')
  })

  it('cravar no meio ajuda o placar: a rodada some do orçamento', () => {
    const semCravada = avaliarPartida(partidaComErros(700, 400, 300))
    const comCravada = avaliarPartida([
      registrarTentativa(ALVO_FIXO + 700, ALVO_FIXO),
      registrarTentativa(3_420, 3_420),
      registrarTentativa(ALVO_FIXO + 300, ALVO_FIXO),
    ])
    assert.equal(semCravada.erroTotalMs, 1_400)
    assert.equal(comCravada.erroTotalMs, 1_000)
    assert.equal(comCravada.venceu, true, 'somando 1,00 s ela ganha pelo erro total')
    assert.equal(comCravada.motivo, 'consistencia')
  })

  it('erro total dentro do limite vence', () => {
    const r = avaliarPartida(partidaComErros(300, -400, 500)) // soma 1200
    assert.equal(r.venceu, true)
    assert.equal(r.motivo, 'consistencia')
    assert.equal(r.erroTotalMs, 1_200)
  })

  it('uma rodada ruim pode ser compensada pelas outras', () => {
    // 1,10 s numa tentativa só, mas as outras duas quase cravadas: soma 1,26 s
    const r = avaliarPartida(partidaComErros(1_100, 80, 80))
    assert.equal(r.venceu, true, 'compensar deveria valer — é o ponto da regra')
  })

  it('exatamente no limite ainda vence', () => {
    const r = avaliarPartida(partidaComErros(500, 500, 500)) // soma 1500
    assert.equal(r.erroTotalMs, CONFIG.LIMITE_ERRO_TOTAL_MS)
    assert.equal(r.venceu, true)
  })

  it('um milissegundo acima do limite perde', () => {
    const r = avaliarPartida(partidaComErros(500, 500, 501))
    assert.equal(r.venceu, false)
    assert.equal(r.motivo, null)
  })

  it('quem não parou numa rodada nunca ganha por erro total', () => {
    const tentativas = [
      registrarTentativa(10_100, 10_000),
      registrarTentativa(11_100, 11_000),
      registrarTentativa(null, 9_000),
    ]
    assert.equal(avaliarPartida(tentativas).venceu, false)
  })

  it('reporta o melhor erro entre as tentativas', () => {
    assert.equal(avaliarPartida(partidaComErros(800, 50, 900)).melhorErroMs, 50)
  })

  it('partida incompleta não é dada como completa', () => {
    assert.equal(avaliarPartida(partidaComErros(800)).completa, false)
  })
})

describe('partidaAcabou', () => {
  it('acaba ao completar as tentativas configuradas', () => {
    const tentativas = partidaComErros(800, 800, 800)
    assert.equal(partidaAcabou(tentativas), true)
    assert.equal(partidaAcabou(tentativas.slice(0, -1)), false)
  })

  it('acaba na hora quando a PRIMEIRA tentativa cravou', () => {
    assert.equal(partidaAcabou([registrarTentativa(3_420, 3_420)]), true)
    assert.equal(cravouDePrimeira([registrarTentativa(3_420, 3_420)]), true)
  })

  it('cravar na segunda não encerra a partida: falta a terceira', () => {
    const tentativas = [
      registrarTentativa(ALVO_FIXO + 800, ALVO_FIXO),
      registrarTentativa(3_420, 3_420),
    ]
    assert.equal(partidaAcabou(tentativas), false)
    assert.equal(cravouDePrimeira(tentativas), false)
  })
})

describe('formatação', () => {
  it('usa vírgula decimal e duas casas', () => {
    assert.equal(formatarSegundos(3_420), '3,42')
    assert.equal(formatarSegundos(1_500), '1,50')
    assert.equal(formatarSegundos(0), '0,00')
  })

  it('delta traz sinal explícito', () => {
    assert.equal(formatarDelta(260), '+0,26')
    assert.equal(formatarDelta(-80), '−0,08')
    assert.equal(formatarDelta(0), '±0,00')
  })
})

describe('identidade do jogador', () => {
  it('monta o rótulo como SABOR + número', () => {
    assert.equal(identidadePara('tropical', 7).rotulo, 'TROPICAL 7')
  })

  it('id desconhecido não quebra: cai no primeiro sabor', () => {
    // Placar antigo ou storage editado à mão não pode derrubar a tela.
    assert.equal(saborPorId('sabor-que-nao-existe').id, SABORES[0].id)
  })

  it('todo sabor tem cor amostrada e nome', () => {
    for (const sabor of SABORES) {
      assert.match(sabor.cor, /^#[0-9A-F]{6}$/, `${sabor.id} sem cor válida`)
      assert.ok(sabor.nome.length > 0)
      assert.ok(sabor.titulo.length > 0)
      assert.equal(typeof sabor.textoEscuro, 'boolean')
    }
  })

  it('o sabor inicial nunca sai da lista, nem no limite do sorteio', () => {
    for (const valor of [0, 0.5, 0.999999]) {
      assert.ok(SABORES.includes(saborInicial(rngFixo(valor))))
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

  it('a assinatura sempre sai da lista verificada', () => {
    for (const valor of [0, 0.5, 0.999999]) {
      assert.ok(ASSINATURAS.includes(assinaturaAleatoria(rngFixo(valor))))
    }
  })

  it('há mais de uma assinatura, senão não faz sentido sortear', () => {
    assert.ok(ASSINATURAS.length >= 5)
  })
})

describe('textoDaPosicao', () => {
  it('fala em ganhadores, porque quem perde não entra no placar', () => {
    assert.equal(textoDaPosicao(3, 8), '3º entre 8 ganhadores hoje')
  })

  it('o primeiro do dia não é "1º de 1"', () => {
    assert.equal(textoDaPosicao(1, 1), 'PRIMEIRA LATA DO DIA')
  })
})

describe('cronômetro', () => {
  it('mede a diferença entre largada e parada', () => {
    let relogio = 1_000
    const crono = criarCronometro(() => relogio)
    crono.iniciar()
    relogio = 4_420
    assert.equal(crono.parar(), 3_420)
  })

  it('parar sem ter iniciado devolve null', () => {
    assert.equal(criarCronometro(() => 0).parar(), null)
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
