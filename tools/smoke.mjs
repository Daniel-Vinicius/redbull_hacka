/**
 * Smoke test de ponta a ponta
 * ============================
 *
 * Sobe o jogo num Chromium headless com viewport de iPad, joga uma partida
 * inteira por toque, escolhe um sabor no carrossel e grava um print de cada
 * tela em `docs/prints/`.
 *
 * Serve para duas coisas:
 *   1. provar que o fluxo atração → 3 tentativas → resultado → sabor → placar
 *      → atração fecha sem erro de console e sem requisição quebrada;
 *   2. gerar os prints que o relatório de entrega exige, sempre iguais.
 *
 * Uso (com `npm run dev` rodando em outro terminal):
 *   npm run smoke
 *   node tools/smoke.mjs http://127.0.0.1:8000/index.html
 */

import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const URL_BASE = process.argv[2] ?? 'http://127.0.0.1:8000/index.html'
const SAIDA = 'docs/prints'

/** Viewport do iPad 10ª geração em paisagem, que é o aparelho do evento. */
const IPAD = { width: 1180, height: 820 }

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  await mkdir(SAIDA, { recursive: true })

  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({
    viewport: IPAD,
    deviceScaleFactor: 2,
    locale: 'pt-BR',
  })
  const pagina = await contexto.newPage()

  /** @type {string[]} problemas que reprovam o teste */
  const problemas = []
  // A sonda de placar bate em `api/ranking` na abertura. Servido como estático
  // (GitHub Pages), isso responde 404 e o navegador registra no console — é o
  // caminho de degradação previsto, não um defeito.
  const esperado = (texto) => /api\/ranking/.test(texto)

  pagina.on('console', (msg) => {
    // Num 404 de rede o texto do console é genérico ("Failed to load
    // resource..."); a URL só aparece em `location()`.
    if (msg.type() !== 'error') return
    if (esperado(msg.text()) || esperado(msg.location()?.url ?? '')) return
    problemas.push(`console: ${msg.text()}`)
  })
  pagina.on('pageerror', (erro) => problemas.push(`exceção: ${erro.message}`))
  pagina.on('requestfailed', (req) => {
    if (!esperado(req.url())) problemas.push(`falha de rede: ${req.url()}`)
  })

  // `load` e não `networkidle`: a tela de atração busca o placar a cada 5 s,
  // então a rede nunca fica ociosa — por projeto.
  await pagina.goto(URL_BASE, { waitUntil: 'load' })
  await pagina.waitForTimeout(900)

  const tela = () => pagina.evaluate(() => document.body.dataset.tela)
  const venceu = () => pagina.evaluate(() => document.body.dataset.vitoria === 'true')
  const esperarTela = (nome, timeout = 12_000) =>
    pagina.waitForFunction((alvo) => document.body.dataset.tela === alvo, nome, { timeout })
  const print = async (nome) => {
    await pausa(450) // deixa a animação de entrada terminar antes do print
    await pagina.screenshot({ path: `${SAIDA}/${nome}.png` })
  }

  console.log('tela inicial:', await tela())
  await print('1-atracao')

  // ---- Partida completa ----------------------------------------------------
  await pagina.getByRole('button', { name: /tocar/i }).click()
  await esperarTela('preparo')
  await pagina.waitForTimeout(1100)
  await print('2-preparo')

  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    await esperarTela('rodada')
    if (tentativa === 1) await print('3-rodada-cega')

    // Para o cronômetro com um erro plausível de jogador humano
    const alvo = await pagina.evaluate(
      () => Number(document.getElementById('rodada-alvo').textContent.replace(',', '.')) * 1000
    )
    await pausa(Math.max(200, alvo - 420 + tentativa * 90))
    await pagina.getByRole('button', { name: /parar/i }).click()

    await esperarTela('feedback', 6_000)
    if (tentativa === 1) await print('4-feedback')
    console.log(
      `tentativa ${tentativa}: erro total ${await pagina.locator('#orcamento-valor').innerText()}`
    )
  }

  // ---- Resultado -----------------------------------------------------------
  await esperarTela('resultado')
  await print('5-resultado')
  const veredito = await pagina.locator('#final-titulo').innerText()
  console.log('veredito :', veredito)
  console.log('assinatura:', await pagina.locator('#assinatura').innerText())

  // O smoke joga perto do alvo de propósito: se esta partida não ganhou, ou a
  // calibragem do jogo mudou muito ou a regra quebrou. Sem isso, o teste
  // atravessaria o caminho de derrota achando que exercitou o de vitória.
  if (!(await venceu())) {
    problemas.push(`a partida bem jogada não ganhou — veredito "${veredito}"`)
  }

  // ---- Carrossel de sabores ------------------------------------------------
  await pagina.getByRole('button', { name: /escolher minha lata/i }).click()
  await esperarTela('sabor')

  // A lata escolhida TEM que estar no centro da área do carrossel. Já saiu de
  // lugar uma vez: a faixa `auto` do grid crescia até caber as 12 latas, o
  // percentual do padding passava a resolver contra essa largura e a lata
  // selecionada ia parar atrás da faixa colorida. Medir é a única forma de
  // travar isso — o teste de fluxo passava com o carrossel visivelmente errado.
  await pausa(600)
  const centragem = await pagina.evaluate(() => {
    const centro = (elemento) => {
      const caixa = elemento.getBoundingClientRect()
      return caixa.x + caixa.width / 2
    }
    return {
      carrossel: centro(document.querySelector('.carrossel')),
      lata: centro(document.querySelector('.carrossel__item[data-estado="atual"]')),
    }
  })
  const desvio = Math.abs(centragem.carrossel - centragem.lata)
  console.log(`carrossel: lata centralizada com ${desvio.toFixed(1)}px de desvio`)
  if (desvio > 2) {
    problemas.push(`lata selecionada fora do centro do carrossel (${desvio.toFixed(0)}px)`)
  }

  // O sabor inicial é sorteado e o carrossel não dá a volta, então navegar
  // "para a direita" nem sempre é possível. Vamos até a ponta esquerda antes
  // de testar, para o teste ser determinístico.
  await pagina.locator('#sabor-anterior').click({ clickCount: 15, delay: 60 })
  await pausa(600)
  const primeiro = await pagina.locator('#sabor-titulo').innerText()

  if (!(await pagina.locator('#sabor-anterior').isDisabled())) {
    problemas.push('seta "anterior" deveria estar desabilitada na primeira lata')
  }

  await pagina.locator('#sabor-proximo').click()
  await pausa(500)
  const segundo = await pagina.locator('#sabor-titulo').innerText()
  await print('6-sabor')
  console.log(`carrossel: "${primeiro}" → "${segundo}"`)
  if (primeiro === segundo) problemas.push('seta do carrossel não trocou o sabor')

  // Teclado também navega, para o avaliador que abrir num notebook
  await pagina.keyboard.press('ArrowLeft')
  await pausa(400)
  if ((await pagina.locator('#sabor-titulo').innerText()) !== primeiro) {
    problemas.push('seta do teclado não voltou o carrossel')
  }

  // ---- Placar --------------------------------------------------------------
  await pagina.locator('#btn-confirmar-sabor').click()
  await esperarTela('placar')
  await print('7-placar')
  console.log('jogador :', await pagina.locator('#final-identidade').innerText())
  console.log('posição :', await pagina.locator('#final-posicao').innerText())

  const identidade = await pagina.locator('#final-identidade').innerText()
  if (!/\s\d+$/.test(identidade)) problemas.push(`identidade sem número: "${identidade}"`)

  // ---- Reciclagem: o próximo jogador precisa achar a tela limpa -------------
  await pagina.getByRole('button', { name: /próximo jogador/i }).click()
  await pausa(500)
  const voltou = await tela()
  console.log('após "próximo jogador":', voltou)
  await print('8-atracao-com-placar')

  const vazou = await pagina.evaluate(() => document.body.dataset.vitoria)

  // ---- Segunda partida: derrota não escolhe lata nem entra no placar -------
  // Parar quase em cima da largada estoura o orçamento nas três rodadas.
  console.log('\n— segunda partida, jogando mal de propósito —')
  await pagina.evaluate(() => {
    // Grava toda troca de tela: é assim que se prova que SABOR e PLACAR não
    // aparecem no caminho da derrota, em vez de olhar só onde o jogo parou.
    window.__telas = []
    new MutationObserver(() => window.__telas.push(document.body.dataset.tela)).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-tela'],
    })
  })

  await pagina.getByRole('button', { name: /tocar/i }).click()
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    await esperarTela('rodada')
    await pausa(150)
    await pagina.getByRole('button', { name: /parar/i }).click()
    await esperarTela('feedback', 6_000)
  }

  await esperarTela('resultado')
  console.log('veredito :', await pagina.locator('#final-titulo').innerText())
  if (await venceu()) problemas.push('a partida mal jogada ganhou uma lata')

  const rotuloDerrota = await pagina.locator('#btn-escolher-sabor-rotulo').innerText()
  console.log('botão    :', rotuloDerrota)
  if (!/jogar de novo/i.test(rotuloDerrota)) {
    problemas.push(`botão da derrota deveria convidar a jogar de novo, veio "${rotuloDerrota}"`)
  }

  await pagina.locator('#btn-escolher-sabor').click()
  await esperarTela('atracao')
  const percorridas = await pagina.evaluate(() => window.__telas)
  console.log('telas    :', percorridas.join(' → '))
  for (const proibida of ['sabor', 'placar']) {
    if (percorridas.includes(proibida)) {
      problemas.push(`derrota passou pela tela "${proibida}" — não deveria entrar no placar`)
    }
  }

  await navegador.close()

  // ---- Veredito -------------------------------------------------------------
  console.log('\n———————————————————————————————')
  if (voltou !== 'atracao') problemas.push(`não voltou para a atração (ficou em "${voltou}")`)
  if (vazou === 'true') problemas.push('estado de vitória vazou para o próximo jogador')

  if (problemas.length) {
    console.error('FALHOU:')
    for (const problema of problemas) console.error('  ·', problema)
    process.exit(1)
  }
  console.log(`OK — partida completa sem erros. Prints em ${SAIDA}/`)
}

main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
