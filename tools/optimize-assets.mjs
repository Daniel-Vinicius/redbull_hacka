/**
 * Pipeline de otimização de assets — Cronômetro Invisível
 * ========================================================
 *
 * Os materiais originais da marca (`assets/`) somam ~132 MB: latas em PNG de
 * até 9 MB / 2126x4373 px e ícones de até 3145 px. Uma imagem dessas ocupa ~37 MB
 * de RAM depois de decodificada, independentemente do tamanho do arquivo — o que
 * derruba o Safari de um iPad e violaria a premissa de "funcionamento estável"
 * do briefing.
 *
 * Este script gera, em `public/media/`, apenas os derivados que o jogo usa:
 *   - imagens em WebP, redimensionadas para o maior tamanho em que aparecem na tela
 *   - fontes em WOFF2 (~50% menores que os TTF originais)
 *
 * Orçamento: nenhuma imagem acima de 200 KB; total da página abaixo de 2 MB.
 *
 * Uso:
 *   npm run assets
 *
 * O script é idempotente: pode rodar quantas vezes quiser.
 */

import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import ttf2woff2 from 'ttf2woff2'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGEM = join(RAIZ, 'assets')
const DESTINO = join(RAIZ, 'public', 'media')

const LATAS = join(ORIGEM, 'LATAS', 'INDIVIDUAIS')
const ICONES = join(ORIGEM, '2023 Cartoon Icons (update)')
const FONTES = join(ORIGEM, 'Fontes')

/**
 * Sabores usados como identidade sorteada do jogador.
 *
 * `arquivo` aponta para a lata ABERTA quando ela existe (visual de comemoração);
 * Melancia e Nectarina tradicional só foram entregues na versão FECHADA.
 * `id` é a chave usada em `src/core/jogadores.js` — manter os dois lados em sincronia.
 */
const SABORES = [
  { id: 'tradicional', arquivo: 'RED BULL_ED_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'zero', arquivo: 'RED BULL_ZERO_SUGARFREE_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'ice', arquivo: 'RED BULL_ICE_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'maca', arquivo: 'RED BULL_MAÇÃ_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'cereja', arquivo: 'RED BULL_CEREJA_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'melancia', arquivo: 'RED BULL_MELANCIA_MOLHADO_LATA_IR_FECHADA_ILUSTRADA.png' },
  { id: 'melao', arquivo: 'RED BULL_MELAO_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'nectarina', arquivo: 'RED BULL_NECTARINA_MOLHADO_LATA_IR_FECHADA_ILUSTRADA.png' },
  { id: 'pessego', arquivo: 'RED BULL_PÊSSEGO_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'pomelo', arquivo: 'RED BULL_POMELO_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'tropical', arquivo: 'RED BULL_TROPICAL_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'amora', arquivo: 'RED BULL_AMORA_FRUTAS VERMELHAS_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
]

/**
 * Ícones cartoon usados na interface.
 * `altura` = maior tamanho em que o ícone aparece na tela, x2 para telas retina.
 */
const ICONES_USADOS = [
  { origem: '1_Number_Icon.png', destino: 'num-1.webp', altura: 320 },
  { origem: '2_Number_Icon.png', destino: 'num-2.webp', altura: 320 },
  { origem: '3_Number_Icon.png', destino: 'num-3.webp', altura: 320 },
  { origem: '1_Wings_Icon.png', destino: 'asas.webp', altura: 640 },
  { origem: '1_trophy_Icon_1.png', destino: 'trofeu.webp', altura: 320 },
  { origem: 'Can_Icon.png', destino: 'lata-icone.webp', altura: 320 },
  { origem: 'Checkered Flag_Racing_Icon.png', destino: 'bandeira.webp', altura: 400 },
  { origem: 'Energy_Flash_Icon.png', destino: 'raio.webp', altura: 400 },
  { origem: 'Barriers_Icon.png', destino: 'barreira.webp', altura: 320 },
]

/**
 * Pesos da Futura for Red Bull que a interface realmente usa.
 * Converter só estes evita carregar 688 KB de TTF por nada.
 */
const FONTES_USADAS = [
  { origem: 'FuturaforRedBull-CondBold.ttf', destino: 'futura-condbold.woff2' },
  { origem: 'FuturaforRedBull-Bold.ttf', destino: 'futura-bold.woff2' },
  { origem: 'FuturaforRedBull-Medium.ttf', destino: 'futura-medium.woff2' },
  { origem: 'FuturaforRedBull-Book.ttf', destino: 'futura-book.woff2' },
]

const LIMITE_KB = 200

/** Converte bytes para uma string legível em KB. */
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

/**
 * Redimensiona uma imagem para uma altura-alvo e grava em WebP.
 * @param {string} entrada caminho absoluto do PNG original
 * @param {string} saida caminho absoluto do .webp de destino
 * @param {number} altura altura final em pixels
 * @param {number} qualidade qualidade WebP (0-100)
 * @returns {Promise<number>} tamanho do arquivo gerado, em bytes
 */
async function converterImagem(entrada, saida, altura, qualidade = 82) {
  await sharp(entrada)
    .resize({ height: altura, withoutEnlargement: true })
    .webp({ quality: qualidade, effort: 6 })
    .toFile(saida)
  return (await stat(saida)).size
}

async function main() {
  await mkdir(join(DESTINO, 'img'), { recursive: true })
  await mkdir(join(DESTINO, 'fonts'), { recursive: true })

  let total = 0
  const acima = []

  console.log('\n— Latas (identidade do jogador) ——————————————')
  for (const sabor of SABORES) {
    const saida = join(DESTINO, 'img', `lata-${sabor.id}.webp`)
    const bytes = await converterImagem(join(LATAS, sabor.arquivo), saida, 560)
    total += bytes
    if (bytes > LIMITE_KB * 1024) acima.push([`lata-${sabor.id}.webp`, bytes])
    console.log(`  lata-${sabor.id}.webp`.padEnd(30), kb(bytes))
  }

  console.log('\n— Lata em destaque (atração / vitória) ————————')
  for (const [arquivo, nome, altura] of [
    ['RED BULL_ED_MOLHADO_LATA_IR_FECHADA_ILUSTRADA.png', 'lata-hero-fechada.webp', 1100],
    ['RED BULL_ED_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png', 'lata-hero-aberta.webp', 1100],
  ]) {
    const saida = join(DESTINO, 'img', nome)
    const bytes = await converterImagem(join(LATAS, arquivo), saida, altura)
    total += bytes
    if (bytes > LIMITE_KB * 1024) acima.push([nome, bytes])
    console.log(`  ${nome}`.padEnd(32), kb(bytes))
  }

  console.log('\n— Ícones ————————————————————————————————————')
  for (const icone of ICONES_USADOS) {
    const saida = join(DESTINO, 'img', icone.destino)
    const bytes = await converterImagem(join(ICONES, icone.origem), saida, icone.altura)
    total += bytes
    if (bytes > LIMITE_KB * 1024) acima.push([icone.destino, bytes])
    console.log(`  ${icone.destino}`.padEnd(32), kb(bytes))
  }

  console.log('\n— Fontes (TTF → WOFF2) ——————————————————————')
  for (const fonte of FONTES_USADAS) {
    const ttf = await readFile(join(FONTES, fonte.origem))
    const woff2 = ttf2woff2(ttf)
    const saida = join(DESTINO, 'fonts', fonte.destino)
    await writeFile(saida, woff2)
    total += woff2.length
    const reducao = (100 - (woff2.length / ttf.length) * 100).toFixed(0)
    console.log(`  ${fonte.destino}`.padEnd(32), kb(woff2.length), `(-${reducao}%)`)
  }

  console.log('\n————————————————————————————————————————————————')
  console.log(`  TOTAL GERADO: ${kb(total)} em ${(await readdir(join(DESTINO, 'img'))).length} imagens + ${FONTES_USADAS.length} fontes`)
  if (acima.length) {
    console.log(`  ⚠  acima de ${LIMITE_KB} KB: ${acima.map(([n, b]) => `${n} (${kb(b)})`).join(', ')}`)
  } else {
    console.log(`  ✓  nenhum arquivo acima de ${LIMITE_KB} KB`)
  }
  console.log('')
}

main().catch((erro) => {
  console.error('Falha na otimização de assets:', erro.message)
  process.exit(1)
})
