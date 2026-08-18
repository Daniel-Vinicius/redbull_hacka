/**
 * Copy do jogo
 * =============
 *
 * Texto separado da lógica: para reescrever qualquer frase da ativação não é
 * preciso abrir um arquivo de regra. Cada faixa tem várias variantes e o jogo
 * sorteia uma — quem joga duas vezes seguidas não lê a mesma linha.
 *
 * Tom: caixa alta, 2 a 6 palavras, quem apanha é o relógio e não o jogador.
 */

/** Frase exibida durante a contagem regressiva, antes de cada tentativa. */
export const FRASE_PREPARO = 'PRESSIONE NO TEMPO CERTO. CONCENTRE-SE!'

/** Rótulos da contagem regressiva, do maior para o menor, terminando na largada. */
export const CONTAGEM = ['3', '2', '1', 'JÁ!']

/**
 * Mensagens por faixa de erro de uma tentativa.
 * As chaves espelham os ids de `FAIXAS` em `regras.js`.
 * @type {Record<string, string[]>}
 */
export const MENSAGENS_TENTATIVA = Object.freeze({
  cravou: ['CRAVOU.', 'NA MOSCA.', 'ISSO FOI CIRÚRGICO.'],
  quase: ['POR UM SOPRO.', 'FALTOU UM PISCAR.', 'QUASE PERFEITO.'],
  bom: ['DENTRO DA JANELA.', 'ISSO FOI PILOTAGEM.', 'MANDOU BEM.'],
  medio: ['DE NOVO, MAIS CALMO.', 'O RELÓGIO ENGANOU VOCÊ.', 'TÁ PERTO. RESPIRA.'],
  longe: [
    'FALTOU UM RED BULL!',
    'ESTÁ PRECISANDO DE ASAS?',
    'O RELÓGIO GANHOU ESSA.',
    'DAVA PRA TROCAR 4 PNEUS NESSE TEMPO.',
  ],
})

/** Mensagem quando o jogador simplesmente não encostou na tela. */
export const MENSAGEM_NAO_PAROU = 'TEMPO. LITERALMENTE.'

/**
 * Manchetes da tela final.
 * @type {Record<string, {titulo: string, linha: string}>}
 */
export const FINAL = Object.freeze({
  cravada: {
    titulo: 'VOCÊ CRAVOU',
    linha: 'Acertou o alvo no centésimo. Pega sua lata.',
  },
  consistencia: {
    titulo: 'GANHOU SUAS ASAS',
    linha: 'Três tentativas dentro de meio segundo. Pega sua lata.',
  },
  derrota: {
    titulo: 'O RELÓGIO VENCEU',
    linha: 'Chegue a meio segundo do alvo nas três e a lata é sua.',
  },
})

/** Assinatura fixa do rodapé da tela final. */
export const ASSINATURA = 'A Red Bull Racing trocou 4 pneus em 1,82 s — Interlagos, 2019.'

/**
 * Sorteia uma variante de mensagem para a faixa.
 * @param {string} faixa id da faixa
 * @param {boolean} parou o jogador chegou a tocar a tela?
 * @param {() => number} [rng] injetável para teste
 * @returns {string}
 */
export function mensagemPara(faixa, parou, rng = Math.random) {
  if (!parou) return MENSAGEM_NAO_PAROU
  const opcoes = MENSAGENS_TENTATIVA[faixa] ?? MENSAGENS_TENTATIVA.longe
  return opcoes[Math.floor(rng() * opcoes.length)]
}
