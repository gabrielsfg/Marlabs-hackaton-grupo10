import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Navbar from '../components/Navbar'
import { formatBRLDecimal } from '../data/mockData'

const IR_REGRESSIVO = [
  { maxDias: 180, aliquota: 0.225 },
  { maxDias: 360, aliquota: 0.20 },
  { maxDias: 720, aliquota: 0.175 },
  { maxDias: Infinity, aliquota: 0.15 },
]

function calcularIR(dias) {
  return IR_REGRESSIVO.find((t) => dias <= t.maxDias).aliquota
}

function simularInvestimento({ produto, valor, meses, percentualCDI, cdi, ipca }) {
  const dias = meses * 30.44
  const taxaAnual =
    produto === 'CDB pós-fixado (% do CDI)' || produto === 'LCI/LCA isenta'
      ? (percentualCDI / 100) * (cdi / 100)
      : produto === 'IPCA+'
      ? (ipca + percentualCDI) / 100
      : percentualCDI / 100

  const fator = Math.pow(1 + taxaAnual, meses / 12)
  const valorBruto = valor * fator
  const rendimentoBruto = valorBruto - valor
  const isIsento = produto === 'LCI/LCA isenta'
  const aliquota = isIsento ? 0 : calcularIR(dias)
  const ir = rendimentoBruto * aliquota
  const valorLiquido = valorBruto - ir
  const taxaEfetiva = (Math.pow(valorBruto / valor, 12 / meses) - 1) * 100
  const taxaLiquida = (Math.pow(valorLiquido / valor, 12 / meses) - 1) * 100

  return { valorBruto, rendimentoBruto, ir, aliquota, valorLiquido, taxaEfetiva, taxaLiquida }
}

function simularResgate({ valor, mesesTotal, mesesDecorridos, taxaMercado }) {
  const mesesRestantes = mesesTotal - mesesDecorridos
  const taxaAnual = taxaMercado / 100
  const precoMercado = valor / Math.pow(1 + taxaAnual, mesesRestantes / 12)
  const curva = valor * Math.pow(1 + taxaAnual * 0.95, mesesDecorridos / 12)
  const agio = precoMercado - curva
  return { precoMercado, curva, agio }
}

export default function Simulation() {
  const [aba, setAba] = useState('investimento')

  // Investimento
  const [produto, setProduto] = useState('CDB pós-fixado (% do CDI)')
  const [valor, setValor] = useState(100000)
  const [meses, setMeses] = useState(24)
  const [percentualCDI, setPercentualCDI] = useState(105)
  const [cdi, setCdi] = useState(14.0)
  const [ipca, setIpca] = useState(4.5)

  // Resgate
  const [valorResgate, setValorResgate] = useState(100000)
  const [mesesTotal, setMesesTotal] = useState(24)
  const [mesesDecorridos, setMesesDecorridos] = useState(12)
  const [taxaMercado, setTaxaMercado] = useState(15.0)

  const resultado = useMemo(() =>
    simularInvestimento({ produto, valor: Number(valor), meses: Number(meses), percentualCDI: Number(percentualCDI), cdi: Number(cdi), ipca: Number(ipca) }),
    [produto, valor, meses, percentualCDI, cdi, ipca]
  )

  const resultadoResgate = useMemo(() =>
    simularResgate({ valor: Number(valorResgate), mesesTotal: Number(mesesTotal), mesesDecorridos: Number(mesesDecorridos), taxaMercado: Number(taxaMercado) }),
    [valorResgate, mesesTotal, mesesDecorridos, taxaMercado]
  )

  const evolucao = useMemo(() => {
    const data = []
    const step = Math.max(1, Math.round(Number(meses) / 12))
    const taxaAnual =
      produto === 'CDB pós-fixado (% do CDI)' || produto === 'LCI/LCA isenta'
        ? (Number(percentualCDI) / 100) * (Number(cdi) / 100)
        : produto === 'IPCA+'
        ? (Number(ipca) + Number(percentualCDI)) / 100
        : Number(percentualCDI) / 100

    for (let m = step; m <= Number(meses); m += step) {
      const fator = Math.pow(1 + taxaAnual, m / 12)
      const bruto = Number(valor) * fator
      const rend = bruto - Number(valor)
      const dias = m * 30.44
      const aliquota = produto === 'LCI/LCA isenta' ? 0 : calcularIR(dias)
      const ir = rend * aliquota
      const liquido = bruto - ir
      data.push({ mes: `${m} m`, principal: Number(valor), rendimento: Math.round(liquido - Number(valor)), total: Math.round(liquido) })
    }
    return data
  }, [produto, valor, meses, percentualCDI, cdi, ipca])

  const vencimento = new Date()
  vencimento.setMonth(vencimento.getMonth() + Number(meses))
  const vencStr = vencimento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-6">
        <h1 className="text-3xl font-bold text-zinc-900 mb-1">Simulação</h1>
        <p className="text-zinc-500 text-sm mb-5">
          Simule vencimento, investimento e rendimento de uma renda fixa, e o deságio de resgatar antes do prazo.
        </p>

        {/* Abas */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setAba('investimento')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${aba === 'investimento' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
          >
            Simulação de investimento
          </button>
          <button
            onClick={() => setAba('resgate')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${aba === 'resgate' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
          >
            Resgate antecipado (deságio)
          </button>
        </div>

        {aba === 'investimento' && (
          <div className="grid grid-cols-[320px_1fr] gap-6">
            {/* Parâmetros */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h2 className="font-semibold text-zinc-800 mb-4">Parâmetros</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-zinc-600 mb-1.5">Produto</label>
                  <select
                    value={produto}
                    onChange={(e) => setProduto(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option>CDB pós-fixado (% do CDI)</option>
                    <option>IPCA+</option>
                    <option>Prefixado</option>
                    <option>LCI/LCA isenta</option>
                  </select>
                </div>
                <SimInput label="Valor aplicado (R$)" value={valor} onChange={setValor} />
                <SimInput label="Prazo (meses)" value={meses} onChange={setMeses} />
                {(produto === 'CDB pós-fixado (% do CDI)' || produto === 'LCI/LCA isenta') && (
                  <SimInput label="% do CDI" value={percentualCDI} onChange={setPercentualCDI} />
                )}
                {produto === 'IPCA+' && (
                  <SimInput label="Spread sobre IPCA (% a.a.)" value={percentualCDI} onChange={setPercentualCDI} />
                )}
                {produto === 'Prefixado' && (
                  <SimInput label="Taxa prefixada (% a.a.)" value={percentualCDI} onChange={setPercentualCDI} />
                )}

                <div className="border-t border-zinc-100 pt-3">
                  <p className="text-xs font-medium text-zinc-500 mb-2">Premissas de mercado (hipotéticas, editáveis)</p>
                  <div className="flex flex-col gap-3">
                    <SimInput label="CDI (% a.a.)" value={cdi} onChange={setCdi} step={0.25} />
                    <SimInput label="IPCA (% a.a.)" value={ipca} onChange={setIpca} step={0.25} />
                  </div>
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <ResultCard label="Investimento" value={formatBRLDecimal(Number(valor))} sub={`Aplicado em ${new Date().toLocaleDateString('pt-BR')}`} />
                <ResultCard label="Vencimento" value={vencStr} sub={`${meses} meses (${Math.round(Number(meses) * 30.44)} dias)`} />
                <ResultCard label="Valor bruto no vencimento" value={formatBRLDecimal(resultado.valorBruto)} sub={`Taxa efetiva de ${resultado.taxaEfetiva.toFixed(2)}% a.a.`} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <ResultCard label="Rendimento bruto" value={formatBRLDecimal(resultado.rendimentoBruto)} sub="Antes do imposto" />
                <ResultCard label="Imposto de renda" value={formatBRLDecimal(resultado.ir)} sub={resultado.aliquota > 0 ? `Alíquota de ${(resultado.aliquota * 100).toFixed(1)}% (tabela regressiva)` : 'Isento'} />
                <ResultCard label="Valor líquido no vencimento" value={formatBRLDecimal(resultado.valorLiquido)} sub={`Rentabilidade líquida de ${resultado.taxaLiquida.toFixed(2)}% a.a.`} highlight />
              </div>

              {/* Gráfico evolução */}
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <p className="font-semibold text-zinc-800 mb-1">Evolução do saldo líquido</p>
                <p className="text-xs text-zinc-400 mb-4">
                  Valor aplicado (preto) e rendimento líquido de IR acumulado (amarelo), ao longo do prazo.
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolucao} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(val, name) => [formatBRLDecimal(val), name === 'principal' ? 'Investido' : 'Rendimento líq.']}
                        labelFormatter={(l) => `Mês ${l}`}
                      />
                      <Bar dataKey="principal" stackId="a" fill="#1C1C1C" />
                      <Bar dataKey="rendimento" stackId="a" fill="#FACC15" radius={[3, 3, 0, 0]}
                        label={{ position: 'top', fontSize: 9, formatter: (v) => `${((Number(valor) + v) / 1000).toFixed(0)} mil` }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Simulação ilustrativa, com taxas e premissas hipotéticas. IR pela tabela regressiva (22,5% até 180 dias, 20% até 360, 17,5% até 720 e 15% acima). IOF e custos não considerados. O deságio só existe quando o resgate antecipado é feito a preço de mercado; em produtos com liquidez na curva, o resgate sai pelo valor na curva.
              </p>
            </div>
          </div>
        )}

        {aba === 'resgate' && (
          <div className="grid grid-cols-[320px_1fr] gap-6">
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h2 className="font-semibold text-zinc-800 mb-4">Parâmetros</h2>
              <div className="flex flex-col gap-4">
                <SimInput label="Valor de face (R$)" value={valorResgate} onChange={setValorResgate} />
                <SimInput label="Prazo total (meses)" value={mesesTotal} onChange={setMesesTotal} />
                <SimInput label="Meses decorridos" value={mesesDecorridos} onChange={setMesesDecorridos} />
                <SimInput label="Taxa de mercado atual (% a.a.)" value={taxaMercado} onChange={setTaxaMercado} step={0.25} />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <ResultCard label="Valor de face" value={formatBRLDecimal(Number(valorResgate))} sub="No vencimento" />
                <ResultCard label="Valor na curva" value={formatBRLDecimal(resultadoResgate.curva)} sub={`Após ${mesesDecorridos} meses`} />
                <ResultCard
                  label={resultadoResgate.agio >= 0 ? 'Ágio' : 'Deságio'}
                  value={formatBRLDecimal(Math.abs(resultadoResgate.agio))}
                  sub={resultadoResgate.agio >= 0 ? 'Acima da curva' : 'Abaixo da curva'}
                  highlight={resultadoResgate.agio < 0}
                />
              </div>
              <ResultCard label="Preço de mercado (resgate antecipado)" value={formatBRLDecimal(resultadoResgate.precoMercado)} sub="Valor que o investidor receberia hoje" />
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <p className="font-semibold text-zinc-700 mb-2">Como interpretar</p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Se a taxa de mercado subiu em relação à taxa de compra, o preço de mercado fica abaixo do valor na curva — gerando <strong>deságio</strong>.
                  Se a taxa caiu, há <strong>ágio</strong> e o resgate antecipado pode ser vantajoso.
                </p>
                <p className="text-xs text-zinc-400 mt-3">
                  Premissas hipotéticas. IR e IOF não considerados nesta simulação de resgate.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SimInput({ label, value, onChange, step = 1 }) {
  return (
    <div>
      <label className="block text-sm text-zinc-600 mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
      />
    </div>
  )
}

function ResultCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-white border-zinc-100'}`}>
      <p className={`text-xs mb-1 ${highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</p>
      <p className={`font-bold text-lg ${highlight ? 'text-brand' : 'text-zinc-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${highlight ? 'text-brand' : 'text-zinc-400'}`}>{sub}</p>}
    </div>
  )
}
