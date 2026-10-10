import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { extrairDadosTranscricao } from '../utils/extractFromTranscription'
import { criarEventoAnualCalendario } from '../utils/googleCalendar'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import Navbar from '../components/Navbar'
import { clientes, alertas, formatBRL } from '../data/mockData'

const TIPO_CORES = {
  CDB: '#1C1C1C',
  Tesouro: '#FACC15',
  Fundo: '#9CA3AF',
  LCI: '#F97316',
  Ações: '#3B82F6',
  Debênture: '#8B5CF6',
  LCA: '#10B981',
}

const BEM_STYLE = {
  Imóvel: 'bg-amber-100 text-amber-700',
  Veículo: 'bg-blue-100 text-blue-700',
  Outro: 'bg-zinc-100 text-zinc-600',
}

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const cliente = clientes.find((c) => c.id === Number(id)) || clientes[0]

  const alertasCliente = alertas.filter((a) => a.clienteId === cliente.id)
  const totalFisico = cliente.bens.reduce((s, b) => s + b.valorEstimado, 0)
  const patrimonioTotal = cliente.patrimonioFinanceiro + totalFisico

  const [bens, setBens] = useState(cliente.bens)
  const [formBem, setFormBem] = useState({ tipo: 'Imóvel', descricao: '', valorEstimado: '', avaliadoEm: '', situacao: 'Quitado' })
  const [nota, setNota] = useState('')
  const [notaResultado, setNotaResultado] = useState(null)
  const [insights, setInsights] = useState(null)
  const [bensExtraidos, setBensExtraidos] = useState([])
  const [datasExtraidas, setDatasExtraidas] = useState([])
  const [datasCliente, setDatasCliente] = useState([])
  const [extraindoTranscricao, setExtraindoTranscricao] = useState(false)
  const [erroTranscricao, setErroTranscricao] = useState(null)
  const [arquivoNome, setArquivoNome] = useState(null)
  const transcricaoRef = useRef(null)
  const pendingDataRef = useRef(null)
  const [googleToken, setGoogleToken] = useState(null)
  const [calendarStatus, setCalendarStatus] = useState(null)
  const [timeline, setTimeline] = useState(cliente.timeline)

  const adicionarBem = () => {
    if (!formBem.descricao.trim() || !formBem.valorEstimado) return
    setBens([...bens, { id: Date.now(), ...formBem, valorEstimado: Number(formBem.valorEstimado) }])
    setFormBem({ tipo: 'Imóvel', descricao: '', valorEstimado: '', avaliadoEm: '', situacao: 'Quitado' })
  }

  const excluirBem = (id) => setBens(bens.filter((b) => b.id !== id))

  const salvarNota = () => {
    if (!nota.trim()) return
    setNotaResultado({
      objetivos: [{ tipo: 'simulado pela IA', prazoMeses: null, pessoa: cliente.nome, valorEstimado: null }],
      lembretes: [{ data: '2027-01-15', texto: 'Verificar andamento do objetivo extraído da nota' }],
    })
    setTimeline([
      { data: new Date().toLocaleDateString('pt-BR'), tipo: 'Nota', texto: nota },
      ...timeline,
    ])
    setNota('')
  }

  const handleTranscricaoFile = async (e) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    e.target.value = ''
    setExtraindoTranscricao(true)
    setErroTranscricao(null)
    setInsights(null)
    setBensExtraidos([])
    setArquivoNome(arquivo.name)
    try {
      const texto = await arquivo.text()
      if (!texto.trim()) throw new Error('O arquivo está vazio.')
      const dados = await extrairDadosTranscricao(texto)
      setInsights(dados.insights?.length ? dados.insights : null)
      setBensExtraidos((dados.bens || []).map((b, i) => ({ ...b, _id: Date.now() + i })))
      setDatasExtraidas((dados.datas || []).map((d, i) => ({ ...d, _id: Date.now() + 1000 + i })))
      setTimeline([
        { data: new Date().toLocaleDateString('pt-BR'), tipo: 'Transcrição', texto: `Transcrição importada: ${arquivo.name}` },
        ...timeline,
      ])
    } catch (err) {
      setErroTranscricao(err.message || 'Erro ao processar a transcrição.')
      setArquivoNome(null)
    } finally {
      setExtraindoTranscricao(false)
    }
  }

  const confirmarBem = (bem) => {
    setBens([...bens, { id: Date.now(), tipo: bem.tipo, descricao: bem.descricao, valorEstimado: bem.valorEstimado || 0, avaliadoEm: '', situacao: 'Quitado' }])
    setBensExtraidos(bensExtraidos.filter((b) => b._id !== bem._id))
  }

  const ignorarBem = (id) => setBensExtraidos(bensExtraidos.filter((b) => b._id !== id))

  const confirmarData = (d) => {
    setDatasCliente([...datasCliente, d])
    setDatasExtraidas(datasExtraidas.filter((x) => x._id !== d._id))
  }
  const ignorarData = (id) => setDatasExtraidas(datasExtraidas.filter((d) => d._id !== id))

  const enviarDataCalendario = async (token, data) => {
    setCalendarStatus('loading')
    try {
      await criarEventoAnualCalendario(token, {
        titulo: `${data.tipo} — ${data.descricao}`,
        diaMes: data.data,
        clienteNome: cliente.nome,
      })
      setCalendarStatus('success')
    } catch {
      setCalendarStatus('error')
    } finally {
      setTimeout(() => setCalendarStatus(null), 4000)
    }
  }

  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.events',
    onSuccess: async ({ access_token }) => {
      setGoogleToken(access_token)
      if (pendingDataRef.current) {
        await enviarDataCalendario(access_token, pendingDataRef.current)
        pendingDataRef.current = null
      }
    },
    onError: () => {
      setCalendarStatus('error')
      setTimeout(() => setCalendarStatus(null), 4000)
    },
  })

  const adicionarDataCalendario = async (data) => {
    if (googleToken) {
      await enviarDataCalendario(googleToken, data)
    } else {
      pendingDataRef.current = data
      googleLogin()
    }
  }

  // Concentração por emissor (FGC)
  const emissores = {}
  cliente.posicoes.filter((p) => p.fgc).forEach((p) => {
    emissores[p.emissor] = (emissores[p.emissor] || 0) + p.valor
  })
  const dadosFGC = Object.entries(emissores).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // Distribuição por tipo
  const porTipo = {}
  cliente.posicoes.forEach((p) => {
    porTipo[p.tipo] = (porTipo[p.tipo] || 0) + p.valor
  })
  const distTipo = Object.entries(porTipo).map(([tipo, valor]) => ({
    tipo,
    valor,
    pct: ((valor / cliente.patrimonioFinanceiro) * 100).toFixed(1),
    cor: TIPO_CORES[tipo] || '#ccc',
  })).sort((a, b) => b.valor - a.valor)

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />

      {/* Toast Google Calendar */}
      {calendarStatus && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all ${
          calendarStatus === 'loading' ? 'bg-zinc-800 text-white' :
          calendarStatus === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {calendarStatus === 'loading' && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
          {calendarStatus === 'loading' && 'Adicionando ao Google Agenda...'}
          {calendarStatus === 'success' && '✓ Lembrete anual criado no Google Agenda!'}
          {calendarStatus === 'error' && '✕ Erro ao criar lembrete no Google Agenda'}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-6">
        <button onClick={() => navigate('/clientes')} className="text-sm text-zinc-500 hover:text-zinc-700 mb-4 flex items-center gap-1">
          ← Voltar para clientes
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-5">
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-14 h-14 ${cliente.cor} rounded-full flex items-center justify-center text-lg font-bold text-zinc-700 flex-shrink-0`}>
              {cliente.iniciais}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{cliente.nome}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-zinc-500">{cliente.idade} anos</span>
                <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
                  Perfil {cliente.perfil.toLowerCase()}
                </span>
                <span className="text-sm text-zinc-500">CPF {cliente.cpf}</span>
              </div>
              {cliente.familiares.length > 0 && (
                <p className="text-sm text-zinc-500 mt-1">
                  Familiares: {cliente.familiares.map((f) => `${f.nome} (${f.parentesco})`).join(' e ')}
                </p>
              )}
              {datasCliente.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {datasCliente.map((d, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full">
                      {d.tipo} — {d.descricao} ({d.data})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <SummaryCard label="Patrimônio total" value={formatBRL(patrimonioTotal)} highlight />
            <SummaryCard label="Patrimônio financeiro" value={formatBRL(cliente.patrimonioFinanceiro)} />
            <SummaryCard label="Patrimônio físico" value={formatBRL(totalFisico)} highlight2 />
            <SummaryCard label="Fora da instituição" value={`${cliente.foraInstituicao}%`} />
          </div>
        </div>

        {/* Alertas */}
        {alertasCliente.length > 0 && (
          <div className="mb-5">
            <h2 className="font-semibold text-zinc-900 mb-2">Alertas deste cliente</h2>
            <div className="flex flex-col gap-2">
              {alertasCliente.map((a) => (
                <div key={a.id} className="bg-white rounded-xl border border-red-100 p-4">
                  <div className="flex gap-2 mb-1">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Prioridade {a.prioridade.toLowerCase()}</span>
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{a.tipo}</span>
                  </div>
                  <p className="text-sm text-zinc-700 mb-0.5">{a.descricao}</p>
                  <p className="text-sm text-amber-600 font-medium">Ação sugerida: {a.acaoSugerida}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custódia consolidada */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-zinc-900">Custódia consolidada</h2>
            <span className="text-xs text-zinc-400">Posições de todas as instituições · dados simulados no padrão do Open Finance</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['Ativo', 'Tipo', 'Emissor', 'Instituição', 'Valor', 'Indexador e taxa', 'Vencimento', 'FGC'].map((h) => (
                    <th key={h} className="text-left text-xs text-zinc-400 font-medium pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cliente.posicoes.map((p, i) => (
                  <tr key={i} className={`border-b border-zinc-50 ${p.fgcAlerta ? 'bg-red-50' : ''}`}>
                    <td className="py-2 pr-4 font-medium text-zinc-800">{p.ativo}</td>
                    <td className="py-2 pr-4 text-zinc-600">{p.tipo}</td>
                    <td className="py-2 pr-4 text-zinc-600">{p.emissor}</td>
                    <td className="py-2 pr-4 text-zinc-600">{p.instituicao}</td>
                    <td className="py-2 pr-4 text-zinc-800 font-medium">{formatBRL(p.valor)}</td>
                    <td className="py-2 pr-4 text-zinc-600">{p.indexador}</td>
                    <td className={`py-2 pr-4 ${p.vencimentoProximo ? 'text-red-500 font-medium' : 'text-zinc-600'}`}>{p.vencimento}</td>
                    <td className="py-2">{p.fgc ? <span className="text-green-600">Sim</span> : <span className="text-zinc-400">Não</span>}</td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-200">
                  <td colSpan={4} className="py-2 font-semibold text-zinc-800">Total financeiro</td>
                  <td className="py-2 font-bold text-zinc-900">{formatBRL(cliente.patrimonioFinanceiro)}</td>
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Linhas destacadas contribuem para o alerta de FGC. Debêntures, fundos, ações e Tesouro não têm cobertura do FGC.
          </p>
        </div>

        {/* Patrimônio físico */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-5">
          <h2 className="font-semibold text-zinc-900 mb-1">Patrimônio físico</h2>
          <p className="text-xs text-zinc-400 mb-4">
            Imóveis, veículos e outros bens. Não há consulta por API: os valores são informados e atualizados manualmente pelo assessor.
          </p>

          {/* Totais físicos */}
          {(() => {
            const imoveis = bens.filter((b) => b.tipo === 'Imóvel').reduce((s, b) => s + b.valorEstimado, 0)
            const veiculos = bens.filter((b) => b.tipo === 'Veículo').reduce((s, b) => s + b.valorEstimado, 0)
            const outros = bens.filter((b) => b.tipo === 'Outro').reduce((s, b) => s + b.valorEstimado, 0)
            const total = imoveis + veiculos + outros
            return (
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Imóveis</p>
                  <p className="font-bold text-zinc-900">{formatBRL(imoveis)}</p>
                  <p className="text-xs text-zinc-400">{bens.filter((b) => b.tipo === 'Imóvel').length} bens</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Veículos</p>
                  <p className="font-bold text-zinc-900">{formatBRL(veiculos)}</p>
                  <p className="text-xs text-zinc-400">{bens.filter((b) => b.tipo === 'Veículo').length} bens</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Outros bens</p>
                  <p className="font-bold text-zinc-900">{formatBRL(outros)}</p>
                  <p className="text-xs text-zinc-400">{bens.filter((b) => b.tipo === 'Outro').length} bens</p>
                </div>
                <div className="bg-brand rounded-xl p-4">
                  <p className="text-xs text-zinc-700 mb-1">Total físico</p>
                  <p className="font-bold text-zinc-900 text-lg">{formatBRL(total)}</p>
                  <p className="text-xs text-zinc-700">{bens.length} bens</p>
                </div>
              </div>
            )
          })()}

          {/* Barra de composição */}
          {(() => {
            const total = patrimonioTotal
            const pctFin = ((cliente.patrimonioFinanceiro / total) * 100).toFixed(1)
            const pctIm = (bens.filter((b) => b.tipo === 'Imóvel').reduce((s, b) => s + b.valorEstimado, 0) / total * 100).toFixed(1)
            const pctVeic = (bens.filter((b) => b.tipo === 'Veículo').reduce((s, b) => s + b.valorEstimado, 0) / total * 100).toFixed(1)
            const pctOut = (bens.filter((b) => b.tipo === 'Outro').reduce((s, b) => s + b.valorEstimado, 0) / total * 100).toFixed(1)
            return (
              <div className="mb-4">
                <p className="text-xs font-medium text-zinc-700 mb-2">Composição do patrimônio total</p>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-2">
                  <div className="bg-zinc-800" style={{ width: `${pctFin}%` }} />
                  <div className="bg-amber-400" style={{ width: `${pctIm}%` }} />
                  <div className="bg-sky-400" style={{ width: `${pctVeic}%` }} />
                  <div className="bg-orange-400" style={{ width: `${pctOut}%` }} />
                </div>
                <div className="flex gap-4 flex-wrap text-xs text-zinc-500">
                  <span><span className="inline-block w-2.5 h-2.5 bg-zinc-800 rounded-sm mr-1" />Financeiro · {pctFin}%</span>
                  <span><span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-sm mr-1" />Imóveis · {pctIm}%</span>
                  <span><span className="inline-block w-2.5 h-2.5 bg-sky-400 rounded-sm mr-1" />Veículos · {pctVeic}%</span>
                  <span><span className="inline-block w-2.5 h-2.5 bg-orange-400 rounded-sm mr-1" />Outros · {pctOut}%</span>
                </div>
              </div>
            )
          })()}

          {/* Form adicionar bem */}
          <div className="mb-4">
            <p className="text-sm font-medium text-zinc-700 mb-3">Adicionar bem</p>
            <div className="grid grid-cols-5 gap-2 mb-2">
              <select
                value={formBem.tipo}
                onChange={(e) => setFormBem({ ...formBem, tipo: e.target.value })}
                className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
              >
                <option>Imóvel</option>
                <option>Veículo</option>
                <option>Outro</option>
              </select>
              <input
                placeholder="Ex.: Apartamento residencial"
                value={formBem.descricao}
                onChange={(e) => setFormBem({ ...formBem, descricao: e.target.value })}
                className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none col-span-2"
              />
              <input
                placeholder="Ex.: 450000"
                value={formBem.valorEstimado}
                onChange={(e) => setFormBem({ ...formBem, valorEstimado: e.target.value })}
                className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
              />
              <select
                value={formBem.situacao}
                onChange={(e) => setFormBem({ ...formBem, situacao: e.target.value })}
                className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
              >
                <option>Quitado</option>
                <option>Financiado</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={adicionarBem}
                className="bg-brand hover:brightness-95 text-zinc-900 font-medium text-sm px-4 py-1.5 rounded-lg"
              >
                Adicionar bem
              </button>
              <button
                onClick={() => setFormBem({ tipo: 'Imóvel', descricao: '', valorEstimado: '', avaliadoEm: '', situacao: 'Quitado' })}
                className="border border-zinc-200 text-zinc-600 text-sm px-4 py-1.5 rounded-lg hover:bg-zinc-50"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Tabela de bens */}
          {bens.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['Tipo', 'Descrição', 'Valor estimado', 'Avaliado em', 'Situação', 'Ações'].map((h) => (
                    <th key={h} className="text-left text-xs text-zinc-400 font-medium pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bens.map((b) => (
                  <tr key={b.id} className="border-b border-zinc-50">
                    <td className="py-2 pr-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BEM_STYLE[b.tipo] || 'bg-zinc-100 text-zinc-600'}`}>
                        {b.tipo}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-zinc-700">{b.descricao}</td>
                    <td className="py-2 pr-4 font-medium text-zinc-800">{formatBRL(b.valorEstimado)}</td>
                    <td className="py-2 pr-4 text-zinc-500">{b.avaliadoEm || '—'}</td>
                    <td className="py-2 pr-4 text-zinc-600">{b.situacao}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button className="border border-zinc-200 text-zinc-600 text-xs px-2 py-1 rounded hover:bg-zinc-50">Editar</button>
                        <button onClick={() => excluirBem(b.id)} className="border border-red-200 text-red-500 text-xs px-2 py-1 rounded hover:bg-red-50">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Gráficos */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-5">
          <h2 className="font-semibold text-zinc-900 mb-4">Carteira financeira em gráficos</h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* FGC por emissor */}
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-1">Concentração por emissor (FGC)</p>
              <p className="text-xs text-zinc-400 mb-3">Ativos cobertos pelo FGC. Limite de R$ 250 mil por emissor.</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosFGC} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v) => formatBRL(v)} />
                    <ReferenceLine x={250000} stroke="#EF4444" strokeDasharray="4 4" />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {dadosFGC.map((entry) => (
                        <Cell key={entry.name} fill={entry.value > 250000 ? '#EF4444' : '#1C1C1C'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-red-500 mt-1">Limite do FGC: R$ 250.000</p>
            </div>

            {/* Distribuição por tipo */}
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-1">Distribuição por tipo de ativo</p>
              <p className="text-xs text-zinc-400 mb-3">Percentual do patrimônio financeiro de {formatBRL(cliente.patrimonioFinanceiro)}.</p>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                {distTipo.map((d) => (
                  <div key={d.tipo} style={{ width: `${d.pct}%`, backgroundColor: d.cor }} />
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                {distTipo.map((d) => (
                  <div key={d.tipo} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.cor }} />
                    <span className="text-zinc-500 flex-1">{d.tipo}</span>
                    <span className="font-medium text-zinc-700">{d.pct}% · {formatBRL(d.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vencimentos 12 meses */}
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-1">Vencimentos nos próximos 12 meses</p>
            <p className="text-xs text-zinc-400 mb-3">
              Valor que vence em cada mês, de outubro de 2026 a setembro de 2027.
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cliente.vencimentos12m} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v > 0 ? `${(v / 1000).toFixed(0)}k` : ''} />
                  <Tooltip formatter={(v) => formatBRL(v)} />
                  <Bar dataKey="valor" fill="#FACC15" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 9, formatter: (v) => v > 0 ? `R$ ${(v / 1000).toFixed(0)} mil` : '' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Anotação e transcrição */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <h2 className="font-semibold text-zinc-900 mb-1">Anotação do assessor</h2>
            <p className="text-xs text-zinc-400 mb-3">
              Escreva como falaria. A IA sugere objetivo, prazo e lembrete; você confirma antes de salvar.
            </p>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">Nova nota sobre {cliente.nome.split(' ')[0]}</p>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={`Ex.: filho quer comprar imóvel em 2 anos`}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-brand mb-3"
            />
            <div className="flex gap-2">
              <button onClick={salvarNota} className="bg-brand hover:brightness-95 text-zinc-900 font-medium text-sm px-4 py-1.5 rounded-lg">
                Salvar e extrair
              </button>
              <button
                onClick={() => setNota('Filho quer comprar imóvel em 2 anos. Precisa de liquidez.')}
                className="border border-zinc-200 text-zinc-600 text-sm px-4 py-1.5 rounded-lg hover:bg-zinc-50"
              >
                Usar exemplo
              </button>
            </div>
            {notaResultado && (
              <div className="mt-3 bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                <p className="text-xs font-medium text-zinc-700 mb-2">Extraído pela IA — confirme:</p>
                {notaResultado.objetivos.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <input type="checkbox" defaultChecked className="accent-brand" />
                    <span className="text-xs text-zinc-600">Objetivo: {o.tipo} · {o.pessoa}</span>
                    <button className="text-xs text-red-400 ml-auto">Descartar</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <h2 className="font-semibold text-zinc-900 mb-1">Objetivos e lembretes</h2>
            <div className="flex flex-col gap-2 mb-4">
              {cliente.objetivos.map((o) => (
                <div key={o.id} className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                  <p className="text-sm font-medium text-zinc-800">{o.descricao}</p>
                  <p className="text-xs text-zinc-400">Prazo: {o.prazoMeses} meses · {o.pessoa} · Valor: {o.valorEstimado ? formatBRL(o.valorEstimado) : 'a definir'}</p>
                </div>
              ))}
              {cliente.objetivos.length === 0 && <p className="text-xs text-zinc-400">Nenhum objetivo cadastrado.</p>}
            </div>

            <p className="text-xs font-medium text-zinc-500 mb-1.5">Próximos lembretes</p>
            {cliente.lembretes.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-600 mb-1">
                <span className="text-zinc-400">{l.data}</span>
                <span>{l.texto}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Importar transcrição */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-5">
          <h2 className="font-semibold text-zinc-900 mb-1">Importar transcrição</h2>
          <p className="text-xs text-zinc-400 mb-3">
            Envie a transcrição de uma ligação, reunião ou conversa. A IA lê o texto, sugere insights e bens do patrimônio físico; você confirma item a item.
          </p>
          <input ref={transcricaoRef} type="file" accept=".txt,.md" className="hidden" onChange={handleTranscricaoFile} />
          <div className="border-2 border-dashed border-zinc-200 rounded-xl p-4 mb-3 text-center">
            {extraindoTranscricao ? (
              <div className="flex items-center justify-center gap-2 py-1">
                <svg className="animate-spin h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-sm text-zinc-500">Analisando com IA…</span>
              </div>
            ) : arquivoNome ? (
              <p className="text-sm text-green-600 font-medium">✓ {arquivoNome}</p>
            ) : (
              <>
                <p className="text-sm text-zinc-500 mb-2">Arquivo de transcrição (.txt ou .md)</p>
                <button onClick={() => transcricaoRef.current?.click()} className="border border-zinc-300 bg-zinc-50 text-zinc-700 text-xs px-3 py-1.5 rounded hover:bg-zinc-100">
                  Escolher arquivo
                </button>
              </>
            )}
          </div>
          {erroTranscricao && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-red-600">{erroTranscricao}</p>
            </div>
          )}
          {insights && (
            <div className="mb-3">
              <p className="text-xs font-medium text-zinc-500 mb-2">Insights estratégicos</p>
              <div className="flex flex-col gap-1">
                {insights.map((ins, i) => (
                  <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">
                    <p className="text-sm text-zinc-700">{ins}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {bensExtraidos.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-zinc-500 mb-2">Bens identificados — confirme para adicionar ao patrimônio</p>
              <div className="flex flex-col gap-2">
                {bensExtraidos.map((b) => (
                  <div key={b._id} className="bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${BEM_STYLE[b.tipo] || 'bg-zinc-100 text-zinc-600'}`}>{b.tipo}</span>
                      <p className="text-sm text-zinc-700 font-medium">{b.descricao}</p>
                    </div>
                    {b.valorEstimado && <p className="text-xs text-zinc-400 mb-2">Valor estimado: {formatBRL(b.valorEstimado)}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => confirmarBem(b)} className="bg-brand text-zinc-900 text-xs font-medium px-3 py-1 rounded-lg">Adicionar ao patrimônio</button>
                      <button onClick={() => ignorarBem(b._id)} className="border border-zinc-200 text-zinc-500 text-xs px-3 py-1 rounded-lg hover:bg-zinc-50">Ignorar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {datasExtraidas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2">Datas identificadas — adicione ao perfil e/ou crie lembretes anuais</p>
              <div className="flex flex-col gap-2">
                {datasExtraidas.map((d) => (
                  <div key={d._id} className="bg-pink-50 border border-pink-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div>
                        <p className="text-sm text-zinc-700 font-medium">{d.tipo} — {d.descricao}</p>
                        <p className="text-xs text-zinc-400">{d.data}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button onClick={() => confirmarData(d)} className="bg-brand text-zinc-900 text-xs font-medium px-3 py-1 rounded-lg">Adicionar ao perfil</button>
                      <button
                        onClick={() => adicionarDataCalendario(d)}
                        disabled={calendarStatus === 'loading'}
                        className="flex items-center gap-1.5 border border-zinc-300 bg-white text-zinc-700 text-xs font-medium px-3 py-1 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0z" fill="#4285F4"/><path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12V0z" fill="#34A853"/><path d="M0 12C0 5.383 5.383 0 12 0v24C5.383 24 0 18.617 0 12z" fill="#FBBC05"/><path d="M12 24c6.617 0 12-5.383 12-12S18.617 0 12 0v24z" fill="#EA4335"/></svg>
                        Lembrete anual no Google Agenda
                      </button>
                      <button onClick={() => ignorarData(d._id)} className="border border-zinc-200 text-zinc-500 text-xs px-3 py-1 rounded-lg hover:bg-zinc-50">Ignorar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Linha do tempo */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-5">
          <h2 className="font-semibold text-zinc-900 mb-3">Linha do tempo</h2>
          <div className="flex flex-col gap-2">
            {timeline.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-zinc-50 last:border-0">
                <span className="text-xs text-zinc-400 whitespace-nowrap mt-0.5 w-24 flex-shrink-0">{item.data}</span>
                <TimelineTag tipo={item.tipo} />
                <span className="text-sm text-zinc-700">{item.texto}</span>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-xs text-zinc-400">Nenhum registro na linha do tempo.</p>}
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            Ambiente de demonstração com dados fictícios. A extração da nota e da transcrição é simulada neste protótipo.
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, highlight, highlight2 }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-zinc-900 text-white' : highlight2 ? 'bg-brand' : 'bg-zinc-50 border border-zinc-100'}`}>
      <p className={`text-xs mb-1 ${highlight ? 'text-zinc-400' : highlight2 ? 'text-zinc-700' : 'text-zinc-500'}`}>{label}</p>
      <p className={`font-bold text-lg ${highlight ? 'text-white' : 'text-zinc-900'}`}>{value}</p>
    </div>
  )
}

function TimelineTag({ tipo }) {
  const map = {
    'Nota': 'bg-zinc-100 text-zinc-600',
    'Ação concluída': 'bg-green-100 text-green-700',
    'Objetivo': 'bg-sky-100 text-sky-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${map[tipo] || 'bg-zinc-100 text-zinc-600'}`}>
      {tipo}
    </span>
  )
}
