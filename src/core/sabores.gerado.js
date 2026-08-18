/**
 * ARQUIVO GERADO — não edite à mão.
 * Fonte: tools/optimize-assets.mjs · regenere com `npm run assets`.
 *
 * A cor de cada sabor foi AMOSTRADA do próprio packshot fornecido pela marca:
 * o script descarta os pixels neutros (prata e branco existem em todas as
 * latas) e devolve a média do balde de cor mais populoso. Nenhum brand book
 * com valores oficiais foi entregue com os materiais.
 *
 * `textoEscuro` indica que o fundo é claro demais para texto branco — o corte
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
  { id: 'tradicional', nome: 'TRADICIONAL', titulo: 'Tradicional', imagem: 'tradicional', cor: '#232868', textoEscuro: false },
  { id: 'zero', nome: 'ZERO', titulo: 'Zero', imagem: 'zero', cor: '#8AB9E1', textoEscuro: true },
  { id: 'sugarfree', nome: 'SUGARFREE', titulo: 'Sugarfree', imagem: 'sugarfree', cor: '#0087C8', textoEscuro: false },
  { id: 'tropical', nome: 'TROPICAL', titulo: 'Tropical', imagem: 'tropical', cor: '#ECB701', textoEscuro: true },
  { id: 'melao', nome: 'MELÃO', titulo: 'Melão', imagem: 'melao', cor: '#68AC2D', textoEscuro: true },
  { id: 'pessego', nome: 'PÊSSEGO', titulo: 'Pêssego', imagem: 'pessego', cor: '#ED7805', textoEscuro: true },
  { id: 'cereja', nome: 'CEREJA', titulo: 'Cereja', imagem: 'cereja', cor: '#1965AB', textoEscuro: false },
  { id: 'ice', nome: 'ICE', titulo: 'Ice', imagem: 'ice', cor: '#87D8DD', textoEscuro: true },
  { id: 'amora', nome: 'AMORA', titulo: 'Amora', imagem: 'amora', cor: '#DD77AB', textoEscuro: true },
  { id: 'maca', nome: 'MAÇÃ', titulo: 'Maçã', imagem: 'maca', cor: '#D5B505', textoEscuro: true },
  { id: 'pomelo', nome: 'POMELO', titulo: 'Pomelo', imagem: 'pomelo', cor: '#8A78B6', textoEscuro: true },
  { id: 'nectarina', nome: 'NECTARINA', titulo: 'Nectarina', imagem: 'nectarina', cor: '#D94685', textoEscuro: false },
])
