/**
 * Servir arquivos estáticos
 * ==========================
 *
 * Compartilhado pelo servidor de desenvolvimento (`servidor.mjs`) e pelo teste
 * de publicação (`smoke-pages.mjs`). Existe para que os dois sirvam o jogo
 * exatamente do mesmo jeito: se o MIME de um `.webp` estiver errado aqui, os
 * dois erram junto e o teste continua dizendo a verdade.
 */

import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'

/** Tipos que o jogo realmente serve. Sem isso, o Safari recusa os módulos. */
export const TIPOS = {
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

/**
 * Responde uma requisição com um arquivo de dentro de `raiz`.
 *
 * @param {string} raiz diretório servido, já resolvido
 * @param {string} caminhoUrl pathname da requisição
 * @param {import('node:http').ServerResponse} resposta
 */
export async function servirEstatico(raiz, caminhoUrl, resposta) {
  const relativo = decodeURIComponent(caminhoUrl === '/' ? '/index.html' : caminhoUrl)
  const alvo = resolve(join(raiz, normalize(relativo)))

  // Barreira de path traversal: `../../etc/passwd` sai da raiz servida.
  if (alvo !== raiz && !alvo.startsWith(raiz + sep)) {
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
