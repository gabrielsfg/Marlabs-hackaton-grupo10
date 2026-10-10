import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { clientes as clientesIniciais, formatBRL } from '../data/mockData'

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
    setShowDrawer(true)
  }

  const abrirEditar = (c) => {
    setEditando(c.id)
    setForm({ nome: c.nome, perfil: c.perfil, cpf: c.cpf, email: c.email })
    setShowDrawer(true)
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
          familiares: [],
          posicoes: [],
          bens: [],
          objetivos: [],
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
          <div className="w-96 bg-white shadow-2xl flex flex-col">
            <div className="p-6 border-b border-zinc-100">
              <h2 className="font-bold text-lg text-zinc-900">
                {editando ? 'Editar cliente' : 'Novo cliente'}
              </h2>
            </div>
            <div className="p-6 flex flex-col gap-4 flex-1">
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
