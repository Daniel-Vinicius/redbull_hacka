/**
 * Teste de publicação — o jogo roda com o que o git publica?
 * ==========================================================
 *
 * O `smoke.mjs` joga contra a PASTA DE TRABALHO, onde todo arquivo existe. O
 * GitHub Pages serve só o que está no repositório. Os dois conjuntos podem
 * divergir em silêncio, e divergiram: a linha `dados/` do `.gitignore` casava
 * com QUALQUER pasta de nome `dados` em qualquer nível, então `src/dados/`
 * ficou de fora do commit. O deploy ficou verde e o jogo quebrou no ar com
 * 404 em `armazenamento-local.js` e `armazenamento-remoto.js`.
 *
 * Aqui o conjunto publicável é montado de verdade — `git ls-files`, os mesmos
 * arquivos que um `git add -A && git push` levaria — servido estático, sem API
 * nenhuma, e jogado do começo ao fim. É o ensaio do que o avaliador vai abrir.
 *
 * Uso:
 *   npm run smoke:pages
 */

import { execFile as execFileCb, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { cp, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { servirEstatico } from './estaticos.mjs'

const execFile = promisify(execFileCb)
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))

/**
 * Lista o que o git publicaria: rastreados + não rastreados que NÃO estão
 * ignorados. É o conjunto que um `git add -A` levaria para o repositório.
 * @returns {Promise<string[]>}
 */
async function arquivosPublicaveis() {
  const { stdout } = await execFile('git', ['ls-files', '-co', '--exclude-standard'], { cwd: RAIZ })
  return stdout.split('\n').filter(Boolean)
}

async function main() {
  const arquivos = await arquivosPublicaveis()
  const destino = await mkdtemp(join(tmpdir(), 'cronometro-pages-'))

  for (const arquivo of arquivos) {
    await mkdir(join(destino, dirname(arquivo)), { recursive: true })
    await cp(join(RAIZ, arquivo), join(destino, arquivo))
  }
  console.log(`conjunto publicável: ${arquivos.length} arquivos em ${destino}`)

  // Estático puro: nenhuma rota de API, igualzinho ao GitHub Pages. A sonda de
  // placar vai levar 404 e o jogo tem que cair para o modo local sozinho.
  const servidor = createServer((requisicao, resposta) => {
    const url = new URL(requisicao.url, 'http://127.0.0.1')
    servirEstatico(destino, url.pathname, resposta)
  })
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto))
  const { port } = servidor.address()
  console.log(`servindo em http://127.0.0.1:${port}\n`)

  const codigo = await new Promise((pronto) => {
    const smoke = spawn(process.execPath, ['tools/smoke.mjs', `http://127.0.0.1:${port}/index.html`], {
      cwd: RAIZ,
      stdio: 'inherit',
    })
    smoke.on('close', pronto)
  })

  servidor.close()
  await rm(destino, { recursive: true, force: true })

  if (codigo !== 0) {
    console.error('\nFALHOU: o jogo não roda com o que o git publica.')
    process.exit(codigo)
  }
  console.log('\nOK — o conjunto publicável roda sozinho, sem API.')
}

main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
