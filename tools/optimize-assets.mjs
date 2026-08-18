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
 * E gera também `src/core/sabores.gerado.js`, com a cor dominante amostrada de
 * cada lata — usada como fundo do carrossel de sabores. Nenhum brand book foi
 * entregue, então as cores vêm dos próprios packshots, e não de chute.
 *
 * Orçamento: nenhuma imagem acima de 200 KB.
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
const MODULO_SABORES = join(RAIZ, 'src', 'core', 'sabores.gerado.js')

const LATAS = join(ORIGEM, 'LATAS', 'INDIVIDUAIS')
const ICONES = join(ORIGEM, '2023 Cartoon Icons (update)')
const FONTES = join(ORIGEM, 'Fontes')

/**
 * Sabores oferecidos no carrossel.
 *
 * `nome` é o rótulo curto do placar; `titulo` é a manchete do carrossel.
 *
 * ATENÇÃO — OS NOMES DE ARQUIVO NÃO SÃO CONFIÁVEIS. Cada título abaixo foi
 * lido do rótulo impresso na própria lata, não do nome do arquivo, porque três
 * deles mentem:
 *
 *   RED BULL_MELANCIA_*.png       contém a lata azul "Red Bull Sugarfree".
 *                                 Não existe lata de melancia no pacote.
 *   RED BULL_NECTARINA_*.png      contém "The Summer Edition" (sabor nectarina).
 *                                 Não é usada: seria uma segunda lata rosa com o
 *                                 mesmo sabor da de baixo, confundindo o carrossel.
 *   RED BULL_NECTARINA_ SUGARFREE_*.png   é a "The Nectarina Edition Sugarfree"
 *                                 de verdade — repare no espaço no nome do arquivo.
 *
 * O nome exibido é o do SABOR, curto — "Tropical", "Nectarina" — e não o nome
 * comercial completo da edição ("The Nectarina Edition Sugarfree"). Decisão do
 * time: numa tela vista por três segundos, o sabor é a informação; o resto é
 * ruído.
 *
 * `arquivo` aponta para a lata ABERTA quando existe (visual de comemoração).
 */
const SABORES = [
  { id: 'tradicional', nome: 'TRADICIONAL', titulo: 'Tradicional', arquivo: 'RED BULL_ED_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'zero', nome: 'ZERO', titulo: 'Zero', arquivo: 'RED BULL_ZERO_SUGARFREE_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'sugarfree', nome: 'SUGARFREE', titulo: 'Sugarfree', arquivo: 'RED BULL_MELANCIA_MOLHADO_LATA_IR_FECHADA_ILUSTRADA.png' },
  { id: 'tropical', nome: 'TROPICAL', titulo: 'Tropical', arquivo: 'RED BULL_TROPICAL_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'melao', nome: 'MELÃO', titulo: 'Melão', arquivo: 'RED BULL_MELAO_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'pessego', nome: 'PÊSSEGO', titulo: 'Pêssego', arquivo: 'RED BULL_PÊSSEGO_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'cereja', nome: 'CEREJA', titulo: 'Cereja', arquivo: 'RED BULL_CEREJA_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'ice', nome: 'ICE', titulo: 'Ice', arquivo: 'RED BULL_ICE_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'amora', nome: 'AMORA', titulo: 'Amora', arquivo: 'RED BULL_AMORA_FRUTAS VERMELHAS_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'maca', nome: 'MAÇÃ', titulo: 'Maçã', arquivo: 'RED BULL_MAÇÃ_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'pomelo', nome: 'POMELO', titulo: 'Pomelo', arquivo: 'RED BULL_POMELO_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
  { id: 'nectarina', nome: 'NECTARINA', titulo: 'Nectarina', arquivo: 'RED BULL_NECTARINA_ SUGARFREE_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png' },
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

/** Altura da lata no chip do placar e no carrossel, respectivamente. */
const ALTURA_CHIP = 560
const ALTURA_CARROSSEL = 900

/**
 * Favicon e ícone de Tela de Início, derivados do mesmo `ORIGEM_FAVICON`
 * (hoje a bandeira quadriculada; já foi a lata, que ficava ilegível a 32px).
 *
 * Dois tratamentos, porque os dois destinos se comportam de forma diferente:
 *  - a aba do navegador respeita transparência, e o ícone recortado fica legível
 *    tanto no tema claro quanto no escuro;
 *  - o iOS NÃO respeita: ele achata qualquer transparência contra preto e
 *    arredonda o canto. Por isso o ícone de Tela de Início já sai achatado no
 *    navy da marca, com uma folga para o recorte do sistema não comer a lata.
 *
 * Não geramos `favicon.ico`. Ele só serve para o pedido automático em
 * `/favicon.ico`, que num GitHub Pages de projeto (`/usuario/repo/`) nem chega
 * até aqui — o que vale é o `<link rel="icon">` declarado no HTML.
 */
const FUNDO_ICONE = { r: 0x0c, g: 0x10, b: 0x30, alpha: 1 }
const ORIGEM_FAVICON = 'Checkered Flag_Racing_Icon.png'
/** Acima desta luminância o pixel é halo do selo, não desenho. */
const LIMITE_TINTA = 190
/** Fração do raio da chapa que fica DENTRO do anel do selo. */
const RAIO_DENTRO_DO_SELO = 0.88
const FAVICONS = [
  // Só a aba recorta: a 32px o selo redondo rouba um terço da largura e a arte
  // vira borrão. De 180px para cima o selo é desenho, não desperdício.
  { destino: 'favicon-32.png', lado: 32, fundo: null, recortar: true },
  { destino: 'favicon-180.png', lado: 180, fundo: FUNDO_ICONE, folga: 0.06 },
  { destino: 'favicon-192.png', lado: 192, fundo: FUNDO_ICONE, folga: 0.06 },
  { destino: 'favicon-512.png', lado: 512, fundo: FUNDO_ICONE, folga: 0.06 },
]

const LIMITE_KB = 200

/** Converte bytes para uma string legível em KB. */
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

/** Formata um trio RGB como hexadecimal. */
const hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

/**
 * Redimensiona uma imagem para uma altura-alvo e grava em WebP.
 * @param {string} entrada caminho absoluto do PNG original
 * @param {string} saida caminho absoluto do .webp de destino
 * @param {number} altura altura final em pixels
 * @param {number} [qualidade] qualidade WebP (0-100)
 * @returns {Promise<number>} tamanho do arquivo gerado, em bytes
 */
async function converterImagem(entrada, saida, altura, qualidade = 82) {
  await sharp(entrada)
    .resize({ height: altura, withoutEnlargement: true })
    .webp({ quality: qualidade, effort: 6 })
    .toFile(saida)
  return (await stat(saida)).size
}

/**
 * Amostra a cor dominante de uma lata, para usar como fundo do carrossel.
 *
 * O método é o mesmo já usado para derivar a paleta do packshot original:
 * descarta pixels transparentes e pixels quase neutros (o prata e o branco da
 * lata dominariam a contagem em qualquer sabor), agrupa o resto em baldes de
 * cor e devolve a média do balde mais populoso.
 *
 * Devolve também se o fundo pede texto escuro: latas amarelas e verdes claras
 * não sustentam texto branco. O corte usa luminância relativa (WCAG).
 *
 * @param {string} arquivo caminho do PNG original
 * @returns {Promise<{cor: string, textoEscuro: boolean}>}
 */
async function amostrarCor(arquivo) {
  const { data, info } = await sharp(arquivo)
    .resize({ width: 240 })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const baldes = new Map()
  for (let i = 0; i < data.length; i += info.channels) {
    const alfa = info.channels === 4 ? data[i + 3] : 255
    if (alfa < 200) continue

    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    // Ignora prata, branco e preto: eles existem em todas as latas e venceriam
    // a contagem em qualquer sabor, apagando justamente o que diferencia um do
    // outro.
    if (Math.max(r, g, b) - Math.min(r, g, b) < 30) continue

    const chave = `${r >> 4},${g >> 4},${b >> 4}`
    const balde = baldes.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 }
    balde.n += 1
    balde.r += r
    balde.g += g
    balde.b += b
    baldes.set(chave, balde)
  }

  const dominante = [...baldes.values()].sort((a, b) => b.n - a.n)[0]
  // Sem nenhum pixel cromático (não deve acontecer com estes assets), o navy da
  // marca é um fallback seguro.
  if (!dominante) return { cor: '#232968', textoEscuro: false }

  const [r, g, b] = [dominante.r / dominante.n, dominante.g / dominante.n, dominante.b / dominante.n]
  const luminancia = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

  return { cor: hex(r, g, b), textoEscuro: luminancia > 0.5 }
}

/**
 * Acha a moldura do DESENHO dentro do selo de um ícone cartoon.
 *
 * Todos os ícones do pacote vêm dentro de um selo redondo — halo claro com um
 * contorno escuro desenhado à mão. O selo ocupa a chapa inteira, e o desenho de
 * verdade fica em ~64% dela. Escalar o PNG como está gasta um terço do favicon
 * com moldura: a 32px na aba, foi exatamente por isso que a lata ficou pequena
 * demais. Aqui o selo sai e sobra o desenho.
 *
 * Duas passagens, porque uma só não separa as duas coisas:
 *  - **máscara circular**: descarta o anel do selo, que é tinta escura e
 *    encostaria na borda da chapa, devolvendo a imagem inteira;
 *  - **luminância**: dentro do círculo, descarta o halo. Ele é azul o bastante
 *    (rgb(171,230,250), croma 79) para passar em qualquer teste de saturação,
 *    mas é sempre claro. A tinta do desenho fica bem abaixo: o quadriculado é
 *    quase preto e o mastro laranja bate ~135.
 *
 * @param {string} arquivo caminho do PNG original
 * @returns {Promise<{left: number, top: number, width: number, height: number}>}
 *   recorte quadrado, centrado no desenho
 */
async function molduraDaArte(arquivo) {
  const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const centroX = width / 2
  const centroY = height / 2
  const raioUtil = (Math.min(width, height) / 2) * RAIO_DENTRO_DO_SELO

  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.hypot(x - centroX, y - centroY) > raioUtil) continue
      const i = (y * width + x) * channels
      if (data[i + 3] < 128) continue
      if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] > LIMITE_TINTA) continue
      if (x < x0) x0 = x
      if (y < y0) y0 = y
      if (x > x1) x1 = x
      if (y > y1) y1 = y
    }
  }

  // Nenhuma tinta encontrada: usa a chapa inteira em vez de quebrar.
  if (x1 < 0) return { left: 0, top: 0, width, height }

  // Quadrado centrado no desenho, para o ícone não distorcer nem sair do eixo.
  const lado = Math.max(x1 - x0 + 1, y1 - y0 + 1)
  const left = Math.max(0, Math.min(width - lado, Math.round((x0 + x1) / 2 - lado / 2)))
  const top = Math.max(0, Math.min(height - lado, Math.round((y0 + y1) / 2 - lado / 2)))
  return { left, top, width: Math.min(lado, width - left), height: Math.min(lado, height - top) }
}

/**
 * Gera um ícone quadrado a partir do PNG de origem.
 *
 * @param {string} entrada caminho do PNG original
 * @param {string} saida caminho do .png de destino
 * @param {{lado: number, fundo: object|null, folga?: number, recortar?: boolean}} opcoes
 * @returns {Promise<number>} tamanho do arquivo gerado, em bytes
 */
async function gerarIcone(entrada, saida, { lado, fundo, folga = 0, recortar = false }) {
  const desenho = Math.round(lado * (1 - folga * 2))
  const margem = Math.round((lado - desenho) / 2)

  const original = sharp(entrada)
  const arte = await (recortar ? original.extract(await molduraDaArte(entrada)) : original)
    .resize(desenho, desenho, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: lado,
      height: lado,
      channels: 4,
      background: fundo ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: arte, top: margem, left: margem }])
    // Paleta indexada: o ícone é arte chapada com poucas cores, e quantizar
    // corta o 512 de ~175 KB para uma fração disso sem diferença visível.
    .png({ palette: true, quality: 92, compressionLevel: 9 })
    .toFile(saida)

  return (await stat(saida)).size
}

/**
 * Escreve o módulo com os dados de sabor derivados dos assets.
 * @param {Array<object>} sabores
 */
async function gerarModuloSabores(sabores) {
  const linhas = sabores
    .map(
      (s) =>
        `  { id: '${s.id}', nome: '${s.nome}', titulo: '${s.titulo}', ` +
        `imagem: '${s.id}', cor: '${s.cor}', textoEscuro: ${s.textoEscuro} },`
    )
    .join('\n')

  const conteudo = `/**
 * ARQUIVO GERADO — não edite à mão.
 * Fonte: tools/optimize-assets.mjs · regenere com \`npm run assets\`.
 *
 * A cor de cada sabor foi AMOSTRADA do próprio packshot fornecido pela marca:
 * o script descarta os pixels neutros (prata e branco existem em todas as
 * latas) e devolve a média do balde de cor mais populoso. Nenhum brand book
 * com valores oficiais foi entregue com os materiais.
 *
 * \`textoEscuro\` indica que o fundo é claro demais para texto branco — o corte
 * é luminância relativa acima de 0,5.
 */

/**
 * @typedef {object} Sabor
 * @property {string} id chave estável, usada no placar e nos nomes de arquivo
 * @property {string} nome rótulo curto, exibido no placar
 * @property {string} titulo manchete do carrossel
 * @property {string} imagem prefixo dos arquivos em public/media/img/
 * @property {string} cor hexadecimal amostrado da lata
 * @property {boolean} textoEscuro o fundo pede texto escuro?
 */

/** @type {ReadonlyArray<Sabor>} */
export const SABORES = Object.freeze([
${linhas}
])
`
  await writeFile(MODULO_SABORES, conteudo, 'utf8')
}

async function main() {
  await mkdir(join(DESTINO, 'img'), { recursive: true })
  await mkdir(join(DESTINO, 'fonts'), { recursive: true })

  let total = 0
  const acima = []
  const registra = (nome, bytes) => {
    total += bytes
    if (bytes > LIMITE_KB * 1024) acima.push(`${nome} (${kb(bytes)})`)
  }

  console.log('\n— Sabores: chip do placar, lata do carrossel e cor amostrada —')
  const gerados = []
  for (const sabor of SABORES) {
    const origem = join(LATAS, sabor.arquivo)

    const chip = join(DESTINO, 'img', `lata-${sabor.id}.webp`)
    const grande = join(DESTINO, 'img', `lata-${sabor.id}-grande.webp`)
    const bytesChip = await converterImagem(origem, chip, ALTURA_CHIP)
    const bytesGrande = await converterImagem(origem, grande, ALTURA_CARROSSEL)
    registra(`lata-${sabor.id}.webp`, bytesChip)
    registra(`lata-${sabor.id}-grande.webp`, bytesGrande)

    const { cor, textoEscuro } = await amostrarCor(origem)
    gerados.push({ ...sabor, cor, textoEscuro })

    console.log(
      `  ${sabor.id.padEnd(13)} ${kb(bytesChip).padStart(6)} + ${kb(bytesGrande).padStart(6)}` +
        `   ${cor}${textoEscuro ? '  (texto escuro)' : ''}`
    )
  }

  await gerarModuloSabores(gerados)
  console.log(`  → src/core/sabores.gerado.js`)

  console.log('\n— Lata em destaque (atração) ————————————————')
  for (const [arquivo, nome, altura] of [
    ['RED BULL_ED_MOLHADO_LATA_IR_FECHADA_ILUSTRADA.png', 'lata-hero-fechada.webp', 1100],
    ['RED BULL_ED_MOLHADO_LATA_IR_ABERTA_ILUSTRADA.png', 'lata-hero-aberta.webp', 1100],
  ]) {
    const bytes = await converterImagem(join(LATAS, arquivo), join(DESTINO, 'img', nome), altura)
    registra(nome, bytes)
    console.log(`  ${nome}`.padEnd(34), kb(bytes))
  }

  console.log('\n— Ícones ————————————————————————————————————')
  for (const icone of ICONES_USADOS) {
    const bytes = await converterImagem(
      join(ICONES, icone.origem),
      join(DESTINO, 'img', icone.destino),
      icone.altura
    )
    registra(icone.destino, bytes)
    console.log(`  ${icone.destino}`.padEnd(34), kb(bytes))
  }

  console.log('\n— Favicon e ícone de Tela de Início ——————————')
  for (const favicon of FAVICONS) {
    const bytes = await gerarIcone(join(ICONES, ORIGEM_FAVICON), join(DESTINO, 'img', favicon.destino), favicon)
    registra(favicon.destino, bytes)
    console.log(`  ${favicon.destino}`.padEnd(34), kb(bytes))
  }

  console.log('\n— Fontes (TTF → WOFF2) ——————————————————————')
  for (const fonte of FONTES_USADAS) {
    const ttf = await readFile(join(FONTES, fonte.origem))
    const woff2 = ttf2woff2(ttf)
    await writeFile(join(DESTINO, 'fonts', fonte.destino), woff2)
    registra(fonte.destino, woff2.length)
    const reducao = (100 - (woff2.length / ttf.length) * 100).toFixed(0)
    console.log(`  ${fonte.destino}`.padEnd(34), kb(woff2.length), `(-${reducao}%)`)
  }

  const imagens = (await readdir(join(DESTINO, 'img'))).length
  console.log('\n————————————————————————————————————————————————')
  console.log(`  TOTAL GERADO: ${kb(total)} em ${imagens} imagens + ${FONTES_USADAS.length} fontes`)
  console.log(
    acima.length
      ? `  ⚠  acima de ${LIMITE_KB} KB: ${acima.join(', ')}`
      : `  ✓  nenhum arquivo acima de ${LIMITE_KB} KB`
  )
  console.log('')
}

main().catch((erro) => {
  console.error('Falha na otimização de assets:', erro.message)
  process.exit(1)
})
