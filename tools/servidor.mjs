/**
 * Servidor de desenvolvimento com placar compartilhado
 * =====================================================
 *
 * Serve o jogo e expõe uma API de placar que grava num JSON em disco. Existe
 * para UM cenário: testar a jogabilidade com várias pessoas, cada uma no seu
 * aparelho, apontando para a mesma máquina (direto na rede local ou por um
 * túnel tipo ngrok). Com localStorage, cada celular teria um placar isolado.
 *
 * NÃO faz parte da entrega. O jogo publicado no GitHub Pages não tem API
 * nenhuma: a sonda em `src/dados/ranking.js` falha e o placar volta a ser
 * local, que é o que o briefing exige.
 *
 * Zero dependências: só `node:http` e `node:fs`.
 *
 * Uso:
 *   npm run servidor            → http://localhost:8000
 *   PORTA=3000 npm run servidor
 *
 * API:
 *   GET    /api/ranking   → Registro[]
 *   POST   /api/ranking   → { registro, registros }
 *   DELETE /api/ranking   → { ok: true }
 */

import { createServer } from 'node:http'
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { montarRegistro, proximoNumero, sanear } from '../src/dados/registro.js'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
const ARQUIVO_PLACAR = join(RAIZ, 'dados', 'ranking.json')
const PORTA = Number(process.env.PORTA ?? 8000)

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
}

// ═══ Placar ═════════════════════════════════════════════════════════════════

/**
 * Lê o placar do disco.
 * @returns {Promise<import('../src/dados/registro.js').Registro[]>}
 */
async function lerPlacar() {
  try {
    return sanear(JSON.parse(await readFile(ARQUIVO_PLACAR, 'utf8')))
  } catch {
    // Arquivo ainda não existe ou está corrompido: começa vazio em vez de
    // derrubar o servidor no meio de um teste.
    return []
  }
}

/**
 * Grava o placar de forma atômica.
 *
 * Escreve num arquivo temporário e renomeia: `rename` é atômico no mesmo
 * sistema de arquivos, então nenhuma leitura concorrente vê um JSON pela
 * metade, nem uma queda no meio da escrita corrompe o placar do dia.
 *
 * @param {import('../src/dados/registro.js').Registro[]} registros
 */
async function gravarPlacar(registros) {
  await mkdir(dirname(ARQUIVO_PLACAR), { recursive: true })
  const temporario = `${ARQUIVO_PLACAR}.tmp`
  await writeFile(temporario, JSON.stringify(registros, null, 2), 'utf8')
  await rename(temporario, ARQUIVO_PLACAR)
}

/**
 * Fila de escrita.
 *
 * Dois aparelhos terminando a partida no mesmo instante fariam ler-modificar-
 * gravar em paralelo, e um sobrescreveria o outro. Encadear as operações numa
 * promessa só serializa tudo — o servidor é de thread única, então isso basta.
 * @type {Promise<unknown>}
 */
let fila = Promise.resolve()

/**
 * Enfileira uma operação sobre o placar.
 * @template T
 * @param {() => Promise<T>} operacao
 * @returns {Promise<T>}
 */
function emFila(operacao) {
  const resultado = fila.then(operacao, operacao)
  fila = resultado.catch(() => {})
  return resultado
}

// ═══ HTTP ═══════════════════════════════════════════════════════════════════

/**
 * Responde com JSON.
 * @param {import('node:http').ServerResponse} resposta
 * @param {number} status
 * @param {unknown} corpo
 */
function json(resposta, status, corpo) {
  const texto = JSON.stringify(corpo)
  resposta.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(texto),
    // O placar muda a cada partida: nenhum cache, nem do túnel nem do navegador.
    'cache-control': 'no-store',
  })
  resposta.end(texto)
}

/**
 * Lê o corpo da requisição como JSON, com limite de tamanho.
 * @param {import('node:http').IncomingMessage} requisicao
 * @returns {Promise<unknown>}
 */
async function corpoJson(requisicao) {
  const pedacos = []
  let tamanho = 0
  for await (const pedaco of requisicao) {
    tamanho += pedaco.length
    if (tamanho > 64 * 1024) throw new Error('corpo grande demais')
    pedacos.push(pedaco)
  }
  return JSON.parse(Buffer.concat(pedacos).toString('utf8'))
}

/**
 * Rotas da API de placar.
 * @param {import('node:http').IncomingMessage} requisicao
 * @param {import('node:http').ServerResponse} resposta
 * @returns {Promise<boolean>} true se a rota foi tratada aqui
 */
async function tratarApi(requisicao, resposta) {
  const { method } = requisicao

  if (method === 'GET') {
    json(resposta, 200, await emFila(lerPlacar))
    return true
  }

  if (method === 'POST') {
    try {
      const parcial = await corpoJson(requisicao)
      const resultado = await emFila(async () => {
        const registros = await lerPlacar()
        // O número de chegada é atribuído AQUI, e não no cliente: com vários
        // aparelhos jogando junto, dois clientes calculando o próprio número
        // gerariam dois "TROPICAL 7".
        const registro = montarRegistro(parcial, proximoNumero(registros))
        const atualizados = [...registros, registro]
        await gravarPlacar(atualizados)
        return { registro, registros: atualizados }
      })
      json(resposta, 201, resultado)
    } catch (erro) {
      json(resposta, 400, { erro: erro.message })
    }
    return true
  }

  if (method === 'DELETE') {
    await emFila(() => gravarPlacar([]))
    json(resposta, 200, { ok: true })
    return true
  }

  json(resposta, 405, { erro: 'método não suportado' })
  return true
}

/**
 * Serve um arquivo estático do projeto.
 * @param {string} caminhoUrl
 * @param {import('node:http').ServerResponse} resposta
 */
async function servirEstatico(caminhoUrl, resposta) {
  const relativo = decodeURIComponent(caminhoUrl === '/' ? '/index.html' : caminhoUrl)
  const alvo = resolve(join(RAIZ, normalize(relativo)))

  // Barreira de path traversal: `../../etc/passwd` sai da raiz do projeto.
  if (alvo !== RAIZ && !alvo.startsWith(RAIZ + sep)) {
    resposta.writeHead(403).end('403')
    return
  }

  try {
    const info = await stat(alvo)
    if (info.isDirectory()) throw new Error('diretório')
    const conteudo = await readFile(alvo)
    resposta.writeHead(200, {
      'content-type': TIPOS[extname(alvo).toLowerCase()] ?? 'application/octet-stream',
      'content-length': conteudo.length,
      // Durante o desenvolvimento, cache só atrapalha.
      'cache-control': 'no-cache',
    })
    resposta.end(conteudo)
  } catch {
    resposta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    resposta.end('404')
  }
}

const servidor = createServer(async (requisicao, resposta) => {
  try {
    const url = new URL(requisicao.url, `http://${requisicao.headers.host ?? 'localhost'}`)
    if (url.pathname === '/api/ranking') {
      await tratarApi(requisicao, resposta)
      return
    }
    await servirEstatico(url.pathname, resposta)
  } catch (erro) {
    // Um erro numa requisição não pode derrubar o servidor no meio do teste.
    console.error('erro:', erro.message)
    if (!resposta.headersSent) resposta.writeHead(500)
    resposta.end('500')
  }
})

servidor.listen(PORTA, () => {
  console.log(`\n  Cronômetro Invisível`)
  console.log(`  http://localhost:${PORTA}`)
  console.log(`  placar compartilhado em dados/ranking.json`)
  console.log(`\n  Para testar em vários aparelhos:`)
  console.log(`    ngrok http ${PORTA}\n`)
})
