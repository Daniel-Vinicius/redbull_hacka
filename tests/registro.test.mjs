/**
 * Testes do formato do placar
 * ============================
 *
 * `src/dados/registro.js` é compartilhado pelos dois armazenamentos e pelo
 * servidor — numeração e ordenação precisam se comportar igual nos três, senão
 * um teste em rede e um teste local dariam placares diferentes.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { montarRegistro, ordenar, posicaoDe, proximoNumero, sanear } from '../src/dados/registro.js'

/** Registro mínimo válido. */
const reg = (numero, erroTotalMs) => ({
  numero,
  sabor: 'tropical',
  rotulo: `TROPICAL ${numero}`,
  erroTotalMs,
  melhorErroMs: 0,
  venceu: false,
})

describe('ordenar', () => {
  it('menor erro total primeiro', () => {
    const ordenado = ordenar([reg(1, 900), reg(2, 120), reg(3, 500)])
    assert.deepEqual(ordenado.map((r) => r.numero), [2, 3, 1])
  })

  it('empate resolve por ordem de chegada', () => {
    const ordenado = ordenar([reg(3, 500), reg(1, 500), reg(2, 500)])
    assert.deepEqual(ordenado.map((r) => r.numero), [1, 2, 3])
  })

  it('não altera o array recebido', () => {
    const original = [reg(2, 900), reg(1, 100)]
    ordenar(original)
    assert.equal(original[0].numero, 2)
  })
})

describe('proximoNumero', () => {
  it('começa em 1 com placar vazio', () => {
    assert.equal(proximoNumero([]), 1)
  })

  it('usa o maior número já usado, não a quantidade de registros', () => {
    // Se alguém apagar uma linha do JSON à mão, contar o comprimento
    // reaproveitaria um número e criaria dois "TROPICAL 7".
    assert.equal(proximoNumero([reg(1, 100), reg(7, 200)]), 8)
  })

  it('sobrevive a registro sem número', () => {
    assert.equal(proximoNumero([{ erroTotalMs: 10 }]), 1)
  })
})

describe('posicaoDe', () => {
  it('devolve a posição 1-indexada dentro do placar ordenado', () => {
    const registros = [reg(1, 900), reg(2, 120), reg(3, 500)]
    assert.equal(posicaoDe(registros, 2), 1)
    assert.equal(posicaoDe(registros, 3), 2)
    assert.equal(posicaoDe(registros, 1), 3)
  })

  it('devolve 0 para número inexistente', () => {
    assert.equal(posicaoDe([reg(1, 100)], 99), 0)
  })
})

describe('montarRegistro', () => {
  it('monta o rótulo com o nome do sabor e o número', () => {
    const r = montarRegistro({ sabor: 'tropical', nome: 'TROPICAL', erroTotalMs: 900 }, 7)
    assert.equal(r.rotulo, 'TROPICAL 7')
    assert.equal(r.numero, 7)
    assert.equal(r.sabor, 'tropical')
    assert.equal(r.erroTotalMs, 900)
  })

  it('sobrevive a payload incompleto sem gerar rótulo vazio', () => {
    // O adaptador local montava o registro por conta própria e esquecia o
    // rótulo — o placar aparecia com linhas em branco. Esta é a regressão.
    const r = montarRegistro({}, 3)
    assert.equal(r.rotulo, 'RED BULL 3')
    assert.equal(r.erroTotalMs, 0)
    assert.equal(r.venceu, false)
  })

  it('arredonda o erro: performance.now() traz frações de ms', () => {
    assert.equal(montarRegistro({ erroTotalMs: 1092.0999999996275 }, 1).erroTotalMs, 1092)
  })

  it('o que sai daqui passa no saneamento', () => {
    assert.equal(sanear([montarRegistro({ nome: 'ICE' }, 1)]).length, 1)
  })
})

describe('sanear', () => {
  it('descarta o que não é lista', () => {
    assert.deepEqual(sanear(null), [])
    assert.deepEqual(sanear({ a: 1 }), [])
    assert.deepEqual(sanear('[]'), [])
  })

  it('descarta linhas malformadas e mantém as boas', () => {
    const entrada = [
      reg(1, 100),
      null,
      { numero: 'dois', erroTotalMs: 200, rotulo: 'X' },
      { numero: 3, erroTotalMs: 'muito', rotulo: 'Y' },
      { numero: 4, erroTotalMs: 400 },
      reg(5, 500),
    ]
    assert.deepEqual(sanear(entrada).map((r) => r.numero), [1, 5])
  })
})
