/**
 * Smoke test de ponta a ponta
 * ============================
 *
 * Sobe o jogo num Chromium headless com viewport de iPad, joga uma partida
 * inteira por toque e grava um print de cada tela em `docs/prints/`.
 *
 * Serve para duas coisas:
 *   1. provar que o fluxo atração → 3 tentativas → resultado → atração fecha
 *      sem erro de console;
 *   2. gerar os prints que o relatório de entrega exige, sempre iguais.
 *
 * Uso (com `npm run dev` rodando em outro terminal):
 *   node tools/smoke.mjs [url]
 */

import { mkdir } from 'node:fs/promises'
import { chromium, devices } from 'playwright'

const URL_BASE = process.argv[2] ?? 'http://127.0.0.1:8123/index.html'
const SAIDA = 'docs/prints'

/** Viewport do iPad 10ª geração em paisagem, que é o aparelho do evento. */
const IPAD = { width: 1180, height: 820, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  await mkdir(SAIDA, { recursive: true })

  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({
    ...devices['Desktop Chrome'],
    viewport: IPAD,
    deviceScaleFactor: IPAD.deviceScaleFactor,
    hasTouch: true,
    isMobile: false, // isMobile força overlay scrollbars e atrapalha o print
    locale: 'pt-BR',
  })

  const pagina = await contexto.newPage()

  /** @type {string[]} erros de console e exceções, que reprovam o teste */
  const problemas = []
  pagina.on('console', (msg) => {
    if (msg.type() === 'error') problemas.push(`console: ${msg.text()}`)
  })
  pagina.on('pageerror', (erro) => problemas.push(`exceção: ${erro.message}`))
  pagina.on('requestfailed', (req) => problemas.push(`404/falha: ${req.url()}`))

  await pagina.goto(URL_BASE, { waitUntil: 'networkidle' })
  await pagina.waitForTimeout(400)

  const tela = () => pagina.evaluate(() => document.body.dataset.tela)
  const print = (nome) => pagina.screenshot({ path: `${SAIDA}/${nome}.png` })

  console.log('tela inicial:', await tela())
  await print('1-atracao')

  // ---- Partida completa ----------------------------------------------------
  await pagina.getByRole('button', { name: /tocar/i }).click()
  await pagina.waitForTimeout(1200)
  console.log('após começar:', await tela())
  await print('2-preparo')

  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    // Espera a largada (a tela vira RODADA quando a buzina toca)
    await pagina.waitForFunction(() => document.body.dataset.tela === 'rodada', { timeout: 8000 })
    if (tentativa === 1) await print('3-rodada-cega')

    // Para o cronômetro num tempo plausível de jogador humano
    const alvo = await pagina.evaluate(() =>
      Number(document.getElementById('rodada-alvo').textContent.replace(',', '.')) * 1000
    )
    await pausa(alvo - 300 + tentativa * 120)
    await pagina.getByRole('button', { name: /parar/i }).click()

    await pagina.waitForFunction(() => document.body.dataset.tela === 'feedback', { timeout: 4000 })
    if (tentativa === 1) await print('4-feedback')
    console.log(
      `tentativa ${tentativa}:`,
      await pagina.locator('#feedback-tempo').innerText(),
      '|',
      await pagina.locator('#feedback-delta').innerText(),
      '|',
      await pagina.locator('#feedback-mensagem').innerText()
    )
  }

  await pagina.waitForFunction(() => document.body.dataset.tela === 'final', { timeout: 8000 })
  await pagina.waitForTimeout(500)
  await print('5-final')
  console.log('veredito:', await pagina.locator('#final-titulo').innerText())
  console.log('jogador :', await pagina.locator('#final-identidade').innerText())
  console.log('posição :', await pagina.locator('#final-posicao').innerText())

  // ---- Reciclagem: o próximo jogador precisa achar a tela limpa -------------
  await pagina.getByRole('button', { name: /próximo jogador/i }).click()
  await pagina.waitForTimeout(400)
  const voltou = await tela()
  console.log('após "próximo jogador":', voltou)
  await print('6-atracao-com-recorde')

  const sobrou = await pagina.evaluate(() => ({
    tentativas: window.__estadoDebug?.tentativas?.length ?? null,
    vitoria: document.body.dataset.vitoria,
  }))

  await navegador.close()

  // ---- Veredito -------------------------------------------------------------
  console.log('\n———————————————————————————————')
  if (voltou !== 'atracao') problemas.push(`não voltou para a atração (ficou em "${voltou}")`)
  if (sobrou.vitoria === 'true') problemas.push('estado de vitória vazou para o próximo jogador')

  if (problemas.length) {
    console.error('FALHOU:')
    for (const p of problemas) console.error('  ·', p)
    process.exit(1)
  }
  console.log(`OK — partida completa sem erros. Prints em ${SAIDA}/`)
}

main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
