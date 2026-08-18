/**
 * Testes dos três módulos de `src/dados/`
 * ========================================
 *
 * Estes módulos existem por um motivo só: TOLERAR FALHA. O placar não pode
 * derrubar o jogo — nem com o Safari em navegação privada, nem com a chave do
 * `localStorage` corrompida, nem com o servidor caindo no meio da feira.
 *
 * Um teste que só verifica o caminho feliz não prova nada sobre eles. Por isso
 * quase tudo aqui é caminho de erro.
 *
 * Rodam em Node puro: `localStorage` e `fetch` são substituídos por dublês, que
 * é justamente o que permite simular a cota estourada e o cabo arrancado sem
 * navegador e sem servidor.
 */

import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { CONFIG } from '../src/core/config.js'

// ── Dublê de localStorage ────────────────────────────────────────────────────
// Um Map com interruptores de falha, para reproduzir os três modos de quebra
// que o Safari realmente apresenta.

function criarStorage({ falhaLeitura = false, falhaEscrita = false } = {}) {
  const dados = new Map()
  return {
    dados,
    falhaLeitura,
    falhaEscrita,
    getItem(chave) {
      if (this.falhaLeitura) throw new Error('storage indisponível')
      return dados.has(chave) ? dados.get(chave) : null
    },
    setItem(chave, valor) {
      if (this.falhaEscrita) throw new Error('cota estourada')
      dados.set(chave, valor)
    },
    removeItem(chave) {
      if (this.falhaEscrita) throw new Error('storage indisponível')
      dados.delete(chave)
    },
  }
}

const PARTIDA = { sabor: 'tropical', nome: 'TROPICAL', erroTotalMs: 900, melhorErroMs: 120, venceu: true }

describe('armazenamento local', () => {
  /** @type {ReturnType<typeof criarStorage>} */
  let storage
  /** @type {typeof import('../src/dados/armazenamento-local.js')} */
  let local

  beforeEach(async () => {
    storage = criarStorage()
    globalThis.localStorage = storage
    // Import novo a cada teste: o módulo guarda estado (`memoria`,
    // `somenteMemoria`) que não deve vazar de um caso para o outro.
    local = await import(`../src/dados/armazenamento-local.js?t=${process.hrtime.bigint()}`)
  })

  it('placar vazio quando não há nada gravado', async () => {
    assert.deepEqual(await local.ler(), [])
  })

  it('grava, persiste e numera a partir de 1', async () => {
    const { registro } = await local.gravar(PARTIDA)
    assert.equal(registro.numero, 1)

    // Persistiu de verdade: quem lê é a chave do localStorage, não a memória.
    const cru = JSON.parse(storage.dados.get(CONFIG.RANKING_CHAVE))
    assert.equal(cru.length, 1)
    assert.equal(cru[0].numero, 1)

    const segundo = await local.gravar(PARTIDA)
    assert.equal(segundo.registro.numero, 2)
  })

  it('chave corrompida se cura sozinha em vez de condenar o dia à memória', async () => {
    storage.dados.set(CONFIG.RANKING_CHAVE, '{isso não é json')

    assert.deepEqual(await local.ler(), [], 'leitura de lixo devolve placar vazio')
    assert.equal(storage.dados.has(CONFIG.RANKING_CHAVE), false, 'a chave ruim é apagada')

    // E o mais importante: a gravação seguinte volta a persistir. Antes da
    // auto-cura, um único JSON quebrado deixava o totem sem gravar nada até
    // alguém recarregar a página.
    await local.gravar(PARTIDA)
    assert.equal(JSON.parse(storage.dados.get(CONFIG.RANKING_CHAVE)).length, 1)
  })

  it('navegação privada: o jogo segue em memória sem lançar', async () => {
    storage.falhaLeitura = true
    storage.falhaEscrita = true

    const { registro, registros } = await local.gravar(PARTIDA)
    assert.equal(registro.numero, 1)
    assert.equal(registros.length, 1, 'a partida do jogador da vez não se perde')
    assert.deepEqual(await local.ler(), registros, 'a memória vira a fonte')
  })

  it('cota estourada na escrita não derruba a partida em curso', async () => {
    storage.falhaEscrita = true
    const { registros } = await local.gravar(PARTIDA)
    assert.equal(registros.length, 1)
  })

  it('limpar zera o placar e a chave', async () => {
    await local.gravar(PARTIDA)
    await local.limpar()
    assert.deepEqual(await local.ler(), [])
    assert.equal(storage.dados.has(CONFIG.RANKING_CHAVE), false)
  })
})

// ── Dublê de fetch ───────────────────────────────────────────────────────────

/** Resposta mínima com a superfície que `armazenamento-remoto.js` usa. */
const resposta = (corpo, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => corpo,
})

describe('armazenamento remoto', () => {
  /** @type {typeof import('../src/dados/armazenamento-remoto.js')} */
  let remoto

  beforeEach(async () => {
    remoto = await import(`../src/dados/armazenamento-remoto.js?t=${process.hrtime.bigint()}`)
  })

  it('disponivel() é false quando a API não responde', async () => {
    globalThis.fetch = async () => {
      throw new Error('ECONNREFUSED')
    }
    assert.equal(await remoto.disponivel(), false)
  })

  it('disponivel() é false num 404 — o caso do GitHub Pages', async () => {
    // Pages serve estático: `api/ranking` não existe. A sonda TEM que devolver
    // false aqui, senão o jogo publicado tentaria gravar num endereço morto.
    globalThis.fetch = async () => resposta(null, false, 404)
    assert.equal(await remoto.disponivel(), false)
  })

  it('ler() descarta as linhas que o servidor devolver malformadas', async () => {
    // O JSON do servidor pode ter sido editado à mão ou ter sobrado de uma
    // versão anterior do formato. Uma linha estranha não pode derrubar a tela.
    globalThis.fetch = async () =>
      resposta([
        { numero: 1, rotulo: 'ZERO 1', sabor: 'zero', erroTotalMs: 800, melhorErroMs: 100, venceu: true },
        { numero: 'dois', rotulo: 'AMORA 2', erroTotalMs: 400 }, // número não é número
        { numero: 3, erroTotalMs: 500 },                          // sem rótulo
        null,
        'placar inteiro como string',
      ])

    const registros = await remoto.ler()
    assert.equal(registros.length, 1, 'só a linha íntegra sobrevive')
    assert.equal(registros[0].rotulo, 'ZERO 1')
  })

  it('ler() devolve placar vazio se a resposta não for uma lista', async () => {
    globalThis.fetch = async () => resposta({ erro: 'ops' })
    assert.deepEqual(await remoto.ler(), [])
  })

  it('erro de rede sobe para a fachada decidir', async () => {
    globalThis.fetch = async () => {
      throw new Error('cabo arrancado')
    }
    // Falha para cima é de propósito: quem degrada é `ranking.js`, num lugar
    // só. Se este módulo engolisse o erro, a fachada nunca saberia trocar.
    await assert.rejects(() => remoto.ler())
    await assert.rejects(() => remoto.gravar(PARTIDA))
  })

  it('HTTP 500 conta como falha, não como placar vazio', async () => {
    globalThis.fetch = async () => resposta([], false, 500)
    await assert.rejects(() => remoto.ler())
  })
})

describe('fachada do placar', () => {
  /** @type {typeof import('../src/dados/ranking.js')} */
  let ranking

  beforeEach(async () => {
    globalThis.localStorage = criarStorage()
    ranking = await import(`../src/dados/ranking.js?t=${process.hrtime.bigint()}`)
  })

  it('sem API no ar, escolhe o modo local — é o caminho do GitHub Pages', async () => {
    globalThis.fetch = async () => {
      throw new Error('sem servidor')
    }
    assert.equal(await ranking.iniciar(), 'local')
  })

  it('com API no ar, escolhe o modo remoto', async () => {
    globalThis.fetch = async () => resposta([])
    assert.equal(await ranking.iniciar(), 'remoto')
  })

  it('remoto caindo na hora de gravar não perde a partida do jogador', async () => {
    // Sonda passa, então a fachada escolhe remoto...
    globalThis.fetch = async () => resposta([])
    assert.equal(await ranking.iniciar(), 'remoto')

    // ...e o servidor morre exatamente no POST, com o tablet na mão do jogador.
    globalThis.fetch = async () => {
      throw new Error('servidor caiu')
    }
    const { numero, total } = await ranking.registrar(PARTIDA)

    assert.equal(numero, 1, 'a partida foi gravada mesmo assim')
    assert.equal(total, 1)
    assert.equal(ranking.modo(), 'local', 'e o modo degradou para local')
  })

  it('sincronizar() devolve false e preserva o cache quando a leitura falha', async () => {
    globalThis.fetch = async () => resposta([])
    await ranking.iniciar()
    await ranking.registrar(PARTIDA)
    const antes = ranking.placar()

    globalThis.fetch = async () => {
      throw new Error('rede oscilou')
    }
    assert.equal(await ranking.sincronizar(), false)
    assert.deepEqual(ranking.placar(), antes, 'o placar na tela não pisca nem some')
  })

  it('sincronizar() acusa mudança só quando entra alguém novo', async () => {
    globalThis.fetch = async () => {
      throw new Error('sem API')
    }
    await ranking.iniciar()
    assert.equal(await ranking.sincronizar(), false, 'nada mudou')

    await ranking.registrar(PARTIDA)
    // `registrar` já atualizou o cache, então a sincronização seguinte não
    // acha novidade: o polling só acorda a tela quando OUTRO aparelho jogou.
    assert.equal(await ranking.sincronizar(), false)
  })

  it('topo() ordena por erro total e respeita RANKING_VISIVEL', async () => {
    globalThis.fetch = async () => {
      throw new Error('sem API')
    }
    await ranking.iniciar()

    const erros = [1400, 200, 900, 1500, 50, 700, 1100]
    for (const erroTotalMs of erros) {
      await ranking.registrar({ ...PARTIDA, erroTotalMs })
    }

    const topo = ranking.topo()
    assert.equal(topo.length, CONFIG.RANKING_VISIVEL)
    assert.deepEqual(
      topo.map((r) => r.erroTotalMs),
      [...erros].sort((a, b) => a - b).slice(0, CONFIG.RANKING_VISIVEL)
    )
  })

  it('limpar() zera o placar sem lançar, mesmo com o storage quebrado', async () => {
    globalThis.fetch = async () => {
      throw new Error('sem API')
    }
    await ranking.iniciar()
    await ranking.registrar(PARTIDA)

    globalThis.localStorage = criarStorage({ falhaEscrita: true })
    await ranking.limpar()
    assert.deepEqual(ranking.placar(), [])
  })
})
