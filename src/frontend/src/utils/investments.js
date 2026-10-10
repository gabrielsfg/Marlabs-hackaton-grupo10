// Converte os investimentos da API (Pluggy / Open Finance) para o formato de "posicoes" que o perfil do cliente
// ja usa nos graficos e na tabela

const FGC_LIMITE_POR_EMISSOR = 250000
const DIAS_VENCIMENTO_PROXIMO = 90
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Produtos cobertos pelo FGC
const SUBTIPOS_COM_FGC = ['CDB', 'LCI', 'LCA', 'LC', 'LIG']

// Subtipo da Pluggy -> categoria exibida nos graficos (mesmas chaves do TIPO_CORES do perfil)
const TIPO_POR_SUBTIPO = {
  CDB: 'CDB',
  LCI: 'LCI',
  LCA: 'LCA',
  TREASURY: 'Tesouro',
  DEBENTURES: 'Debênture',
  STOCK: 'Ações',
  BDR: 'Ações',
  ETF: 'ETF',
  ETF_FUND: 'ETF',
  REAL_ESTATE_FUND: 'FII',
  RETIREMENT: 'Previdência',
  VGBL: 'Previdência',
  PGBL: 'Previdência',
}

const TIPO_POR_TIPO = {
  EQUITY: 'Ações',
  ETF: 'ETF',
  MUTUAL_FUND: 'Fundo',
  FIXED_INCOME: 'Renda fixa',
  SECURITY: 'Previdência',
  COE: 'COE',
}

const RENDA_VARIAVEL = ['EQUITY', 'ETF']

const valorDaPosicao = (inv) => inv.balance ?? inv.amount ?? 0

function categoria(inv) {
  return TIPO_POR_SUBTIPO[inv.subtype] || TIPO_POR_TIPO[inv.type] || 'Outros'
}

function dataSemHora(iso) {
  if (!iso) return null
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function formatarData(data) {
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`
}

function nomeDoAtivo(inv) {
  if (inv.code && !inv.name?.includes(inv.code)) return `${inv.code} · ${inv.name}`
  return inv.name || inv.code || 'Ativo'
}

export function investimentosParaPosicoes(investimentos, hoje = new Date()) {
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const limiteProximo = new Date(inicioHoje)
  limiteProximo.setDate(limiteProximo.getDate() + DIAS_VENCIMENTO_PROXIMO)

  const posicoes = investimentos.map((inv) => {
    const vencimento = dataSemHora(inv.dueDate)
    const fgc = SUBTIPOS_COM_FGC.includes(inv.subtype)
    return {
      ativo: nomeDoAtivo(inv),
      tipo: categoria(inv),
      emissor: inv.issuer || inv.institutionName || '—',
      instituicao: inv.institutionName || 'Open Finance',
      valor: valorDaPosicao(inv),
      // Detalhes da posicao (Pluggy): quantidade, cotacao, valor investido, bruto e liquido
      quantidade: inv.quantity ?? null,
      precoUnitario: inv.unitValue ?? null,
      valorInvestido: inv.amountOriginal ?? null,
      valorBruto: inv.amount ?? null,
      valorLiquido: inv.balance ?? null,
      indexador: RENDA_VARIAVEL.includes(inv.type) ? 'Renda variável' : '—',
      vencimento: vencimento ? formatarData(vencimento) : 'Sem vencimento',
      vencimentoProximo: Boolean(vencimento && vencimento >= inicioHoje && vencimento <= limiteProximo),
      fgc,
      fgcAlerta: false,
    }
  })

  // Alerta de FGC: soma por emissor das posicoes cobertas acima do limite garantido
  const totalPorEmissor = {}
  posicoes.filter((p) => p.fgc).forEach((p) => {
    totalPorEmissor[p.emissor] = (totalPorEmissor[p.emissor] || 0) + p.valor
  })
  posicoes.forEach((p) => {
    p.fgcAlerta = p.fgc && totalPorEmissor[p.emissor] > FGC_LIMITE_POR_EMISSOR
  })

  return posicoes.sort((a, b) => b.valor - a.valor)
}

// Valor que vence em cada um dos proximos 12 meses (a partir do mes atual), no formato { mes: 'Out/26', valor }
export function vencimentosProximos12Meses(investimentos, hoje = new Date()) {
  const meses = Array.from({ length: 12 }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
    return {
      chave: `${data.getFullYear()}-${data.getMonth()}`,
      mes: `${MESES[data.getMonth()]}/${String(data.getFullYear()).slice(2)}`,
      valor: 0,
    }
  })
  const porChave = Object.fromEntries(meses.map((m) => [m.chave, m]))

  investimentos.forEach((inv) => {
    const vencimento = dataSemHora(inv.dueDate)
    if (!vencimento) return
    const mes = porChave[`${vencimento.getFullYear()}-${vencimento.getMonth()}`]
    if (mes) mes.valor += valorDaPosicao(inv)
  })

  return meses.map(({ mes, valor }) => ({ mes, valor }))
}
