import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import Navbar from '../components/Navbar'
import { clientes as clientesIniciais, formatBRL } from '../data/mockData'
import { extrairDadosTranscricao } from '../utils/extractFromTranscription'
import { criarEventoAnualCalendario } from '../utils/googleCalendar'

const PERFIL_STYLE = {
  Conservador: 'bg-sky-50 text-sky-700 border-sky-200',
  Moderado: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Arrojado: 'bg-purple-50 text-purple-700 border-purple-200',
}

export default function Clients() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState(clientesIniciais)
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('Todos')
  const [showDrawer, setShowDrawer] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', perfil: 'Moderado', cpf: '', email: '' })
  const [confirmarExcluir, setConfirmarExcluir] = useState(null)
  const [extraindo, setExtraindo] = useState(false)
  const [erroExtracao, setErroExtracao] = useState(null)
  const [dadosExtraidos, setDadosExtraidos] = useState(null)
  const [bensConfirmados, setBensConfirmados] = useState([])
  const [bensExtraidos, setBensExtraidos] = useState([])
  const [datasExtraidas, setDatasExtraidas] = useState([])
  const [datasConfirmadas, setDatasConfirmadas] = useState([])
  const [googleToken, setGoogleToken] = useState(null)
  const [calendarStatus, setCalendarStatus] = useState(null)
  const pendingDataRef = useRef(null)
  const fileInputRef = useRef(null)

  const filtrados = clientes.filter((c) => {
    const okBusca = c.nome.toLowerCase().includes(busca.toLowerCase())
    const okPerfil =
      filtroPerfil === 'Todos' ||
      (filtroPerfil === 'Somente com alertas' ? c.alertas > 0 : c.perfil === filtroPerfil)
    return okBusca && okPerfil
  })

  const totalPatrimonio = clientes.reduce((s, c) => s + c.patrimonioFinanceiro, 0)
  const totalAlertas = clientes.reduce((s, c) => s + c.alertas, 0)

  const abrirNovo = () => {
    setEditando(null)
    setForm({ nome: '', perfil: 'Moderado', cpf: '', email: '' })
    setDadosExtraidos(null)
    setErroExtracao(null)
    setBensConfirmados([])
    setBensExtraidos([])
    setDatasExtraidas([])
    setDatasConfirmadas([])
    setShowDrawer(true)
  }

  const abrirEditar = (c) => {
    setEditando(c.id)
    setForm({ nome: c.nome, perfil: c.perfil, cpf: c.cpf, email: c.email })
    setShowDrawer(true)
  }

  const handleTranscricao = async (e) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    e.target.value = ''

    setExtraindo(true)
    setErroExtracao(null)
    setDadosExtraidos(null)

    try {
      const texto = await arquivo.text()
      if (!texto.trim()) throw new Error('O arquivo está vazio.')

      const dados = await extrairDadosTranscricao(texto)

      setDadosExtraidos({ ...dados, nomeArquivo: arquivo.name })
      setForm({
        nome: dados.nome || '',
        perfil: ['Conservador', 'Moderado', 'Arrojado'].includes(dados.perfil) ? dados.perfil : 'Moderado',
        cpf: dados.cpf || '',
        email: dados.email || '',
      })
      setBensExtraidos((dados.bens || []).map((b, i) => ({ ...b, _id: Date.now() + i })))
      setDatasExtraidas((dados.datas || []).map((d, i) => ({ ...d, _id: Date.now() + 1000 + i })))
    } catch (err) {
      setErroExtracao(err.message || 'Erro ao processar a transcrição.')
    } finally {
      setExtraindo(false)
    }
  }

  const confirmarBem = (b) => {
    setBensConfirmados([...bensConfirmados, b])
    setBensExtraidos(bensExtraidos.filter((x) => x._id !== b._id))
  }
  const ignorarBem = (id) => setBensExtraidos(bensExtraidos.filter((b) => b._id !== id))

  const confirmarData = (d) => {
    setDatasConfirmadas([...datasConfirmadas, d])
    setDatasExtraidas(datasExtraidas.filter((x) => x._id !== d._id))
  }
  const ignorarData = (id) => setDatasExtraidas(datasExtraidas.filter((d) => d._id !== id))

  const enviarDataCalendario = async (token, data) => {
    setCalendarStatus('loading')
    try {
      await criarEventoAnualCalendario(token, {
        titulo: `${data.tipo} — ${data.descricao}`,
        diaMes: data.data,
        clienteNome: form.nome,
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

  const salvar = () => {
    if (!form.nome.trim()) return
    if (editando) {
      setClientes(clientes.map((c) => (c.id === editando ? { ...c, ...form } : c)))
    } else {
      const initials = form.nome.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')
      setClientes([
        ...clientes,
        {
          id: Date.now(),
          iniciais: initials,
          cor: 'bg-zinc-200',
          alertas: 0,
          patrimonioFinanceiro: 0,
          patrimonioFisico: 0,
          foraInstituicao: 0,
          proximaData: '—',
          familiares: dadosExtraidos?.familiares || [],
          posicoes: [],
          bens: bensConfirmados.map(({ _id, ...b }) => ({ id: Date.now() + Math.random(), avaliadoEm: '', situacao: 'Quitado', ...b })),
          objetivos: dadosExtraidos?.objetivos || [],
          datas: datasConfirmadas,
          lembretes: [],
          timeline: [],
          vencimentos12m: [],
          ...form,
        },
      ])
    }
    setShowDrawer(false)
  }

  const excluir = (id) => {
    setClientes(clientes.filter((c) => c.id !== id))
    setConfirmarExcluir(null)
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />

      {calendarStatus && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
          calendarStatus === 'loading' ? 'bg-zinc-800 text-white' :
          calendarStatus === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {calendarStatus === 'loading' && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
          {calendarStatus === 'loading' && 'Adicionando ao Google Agenda...'}
          {calendarStatus === 'success' && '✓ Lembrete anual criado no Google Agenda!'}
          {calendarStatus === 'error' && '✕ Erro ao criar lembrete no Google Agenda'}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Meus clientes</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {filtrados.length} clientes exibidos de {clientes.length} na sua carteira.
            </p>
          </div>
          <button
            onClick={abrirNovo}
            className="bg-brand hover:brightness-95 text-zinc-900 font-semibold px-5 py-2.5 rounded-lg"
          >
            Novo cliente
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Patrimônio financeiro sob assessoria" value={formatBRL(totalPatrimonio)} />
          <StatCard label="Clientes" value={clientes.length} />
          <StatCard label="Alertas abertos" value={totalAlertas} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o nome do cliente"
            className="border border-zinc-200 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand bg-white"
          />
          {['Todos', 'Conservador', 'Moderado', 'Arrojado', 'Somente com alertas'].map((p) => (
            <button
              key={p}
              onClick={() => setFiltroPerfil(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtroPerfil === p
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                {['Cliente', 'Perfil', 'Patrimônio financeiro', 'Fora da instituição', 'Alertas', 'Próxima data', 'Ações'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-zinc-500 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 ${c.cor} rounded-full flex items-center justify-center text-xs font-semibold text-zinc-700 flex-shrink-0`}>
                        {c.iniciais}
                      </div>
                      <span className="font-medium text-sm text-zinc-900">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PERFIL_STYLE[c.perfil] || 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                      {c.perfil}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{formatBRL(c.patrimonioFinanceiro)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{c.foraInstituicao}%</td>
                  <td className="px-4 py-3">
                    {c.alertas > 0 ? (
                      <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {c.alertas} alerta{c.alertas > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-xs">Sem alertas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{c.proximaData}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => navigate(`/clientes/${c.id}`)}
                        className="bg-brand hover:brightness-95 text-zinc-900 text-xs font-medium px-3 py-1.5 rounded-lg"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => abrirEditar(c)}
                        className="border border-zinc-200 text-zinc-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmarExcluir(c.id)}
                        className="border border-red-200 text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-zinc-400 mt-4">
          Ambiente de demonstração com dados fictícios. No protótipo, todos os clientes abrem o perfil de exemplo.
        </p>
      </div>

      {/* Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowDrawer(false)} />
          <div className="w-[28rem] bg-white shadow-2xl flex flex-col max-h-screen">
            <div className="p-6 border-b border-zinc-100">
              <h2 className="font-bold text-lg text-zinc-900">
                {editando ? 'Editar cliente' : 'Novo cliente'}
              </h2>
            </div>

            <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
              {/* Transcription import — only on new client */}
              {!editando && (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    Preencher automaticamente com IA
                  </p>
                  <p className="text-xs text-zinc-500 mb-3">
                    Faça upload de um arquivo <strong>.txt</strong> ou <strong>.md</strong> com a transcrição da conversa. A IA extrai os dados do cliente automaticamente.
                  </p>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md"
                    className="hidden"
                    onChange={handleTranscricao}
                  />

                  {extraindo ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <svg className="animate-spin w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Analisando com IA…
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm font-medium text-zinc-700 border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {dadosExtraidos ? 'Trocar arquivo' : 'Selecionar arquivo de transcrição'}
                    </button>
                  )}

                  {erroExtracao && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      {erroExtracao}
                    </p>
                  )}

                  {dadosExtraidos && !extraindo && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Dados extraídos de "{dadosExtraidos.nomeArquivo}"
                      </div>

                      {dadosExtraidos.insights?.length > 0 && (
                        <div className="bg-white rounded-lg border border-zinc-100 p-3">
                          <p className="text-xs font-semibold text-zinc-500 mb-1.5">Insights da conversa</p>
                          <ul className="space-y-1">
                            {dadosExtraidos.insights.map((ins, i) => (
                              <li key={i} className="text-xs text-zinc-600 flex items-start gap-1.5">
                                <span className="text-brand mt-0.5">•</span>
                                {ins}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {dadosExtraidos.familiares?.length > 0 && (
                        <div className="bg-white rounded-lg border border-zinc-100 p-3">
                          <p className="text-xs font-semibold text-zinc-500 mb-1.5">Familiares identificados</p>
                          <div className="flex flex-wrap gap-1.5">
                            {dadosExtraidos.familiares.map((f, i) => (
                              <span key={i} className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full">
                                {f.nome} ({f.parentesco})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {dadosExtraidos.objetivos?.length > 0 && (
                        <div className="bg-white rounded-lg border border-zinc-100 p-3">
                          <p className="text-xs font-semibold text-zinc-500 mb-1.5">Objetivos mencionados</p>
                          <ul className="space-y-0.5">
                            {dadosExtraidos.objetivos.map((o, i) => (
                              <li key={i} className="text-xs text-zinc-600">• {o.descricao}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {bensConfirmados.length > 0 && (
                        <div className="bg-green-50 rounded-lg border border-green-100 p-3">
                          <p className="text-xs font-semibold text-green-700 mb-1.5">✓ Bens a cadastrar ({bensConfirmados.length})</p>
                          <ul className="space-y-0.5">
                            {bensConfirmados.map((b, i) => (
                              <li key={i} className="text-xs text-zinc-600">• {b.descricao}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {bensExtraidos.length > 0 && (
                        <div className="bg-white rounded-lg border border-zinc-100 p-3">
                          <p className="text-xs font-semibold text-zinc-500 mb-2">Bens identificados</p>
                          <div className="space-y-2">
                            {bensExtraidos.map((b) => (
                              <div key={b._id} className="bg-zinc-50 rounded-lg p-2">
                                <p className="text-xs text-zinc-700 font-medium mb-1">{b.tipo} — {b.descricao}</p>
                                {b.valorEstimado && <p className="text-xs text-zinc-400 mb-1.5">{formatBRL(b.valorEstimado)}</p>}
                                <div className="flex gap-1.5">
                                  <button onClick={() => confirmarBem(b)} className="bg-brand text-zinc-900 text-xs font-medium px-2.5 py-1 rounded-lg">Incluir</button>
                                  <button onClick={() => ignorarBem(b._id)} className="border border-zinc-200 text-zinc-500 text-xs px-2.5 py-1 rounded-lg">Ignorar</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {datasConfirmadas.length > 0 && (
                        <div className="bg-pink-50 rounded-lg border border-pink-100 p-3">
                          <p className="text-xs font-semibold text-pink-700 mb-1.5">Datas salvas ({datasConfirmadas.length})</p>
                          <ul className="space-y-0.5">
                            {datasConfirmadas.map((d, i) => (
                              <li key={i} className="text-xs text-zinc-600">• {d.tipo} — {d.descricao} ({d.data})</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {datasExtraidas.length > 0 && (
                        <div className="bg-white rounded-lg border border-zinc-100 p-3">
                          <p className="text-xs font-semibold text-zinc-500 mb-2">Datas identificadas</p>
                          <div className="space-y-2">
                            {datasExtraidas.map((d) => (
                              <div key={d._id} className="bg-pink-50 rounded-lg p-2">
                                <p className="text-xs text-zinc-700 font-medium">{d.tipo} — {d.descricao}</p>
                                <p className="text-xs text-zinc-400 mb-1.5">{d.data}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  <button onClick={() => confirmarData(d)} className="bg-brand text-zinc-900 text-xs font-medium px-2.5 py-1 rounded-lg">Salvar no perfil</button>
                                  <button onClick={() => adicionarDataCalendario(d)} disabled={calendarStatus === 'loading'} className="border border-zinc-200 bg-white text-zinc-700 text-xs px-2.5 py-1 rounded-lg disabled:opacity-50">
                                    Google Agenda
                                  </button>
                                  <button onClick={() => ignorarData(d._id)} className="border border-zinc-200 text-zinc-500 text-xs px-2.5 py-1 rounded-lg">Ignorar</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dadosExtraidos.idade && (
                        <p className="text-xs text-zinc-500">Idade identificada: <strong>{dadosExtraidos.idade} anos</strong></p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Manual form */}
              <FormField label="Nome completo" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Perfil de investidor</label>
                <select
                  value={form.perfil}
                  onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option>Conservador</option>
                  <option>Moderado</option>
                  <option>Arrojado</option>
                </select>
              </div>
              <FormField label="CPF (fictício)" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} placeholder="XXX.000.000-XX" />
              <FormField label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="cliente@demo.com" />
            </div>

            <div className="p-6 border-t border-zinc-100 flex gap-3">
              <button
                onClick={salvar}
                className="flex-1 bg-brand hover:brightness-95 text-zinc-900 font-semibold py-2.5 rounded-lg"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowDrawer(false)}
                className="flex-1 border border-zinc-200 text-zinc-700 font-medium py-2.5 rounded-lg hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmarExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="font-bold text-zinc-900 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-zinc-500 mb-5">
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => excluir(confirmarExcluir)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg"
              >
                Excluir
              </button>
              <button
                onClick={() => setConfirmarExcluir(null)}
                className="flex-1 border border-zinc-200 text-zinc-700 font-medium py-2 rounded-lg hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
      />
    </div>
  )
}
