import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { createClient, deleteClient, getClients, updateClient } from '../features/clients/api'
import { formatBRL } from '../data/mockData'

const PROFILE_STYLE = {
  Conservador: 'bg-sky-50 text-sky-700 border-sky-200',
  Moderado: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Arrojado: 'bg-purple-50 text-purple-700 border-purple-200',
}

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [profileFilter, setProfileFilter] = useState('Todos')
  const [showDrawer, setShowDrawer] = useState(false)
  const [editingClientId, setEditingClientId] = useState(null)
  const [clientForm, setClientForm] = useState({ name: '', profile: 'Moderado', cpf: '', email: '' })
  const [clientToDelete, setClientToDelete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    getClients()
      .then((data) => {
        if (!cancelled) setClients(data)
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.detail || requestError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(search.toLowerCase())
    const matchesProfile =
      profileFilter === 'Todos' ||
      (profileFilter === 'Somente com alertas' ? client.alertCount > 0 : client.profile === profileFilter)
    return matchesSearch && matchesProfile
  })

  const totalFinancialAssets = clients.reduce((total, client) => total + client.financialAssets, 0)
  const totalAlerts = clients.reduce((total, client) => total + client.alertCount, 0)

  const openNewClient = () => {
    setEditingClientId(null)
    setClientForm({ name: '', profile: 'Moderado', cpf: '', email: '' })
    setError('')
    setShowDrawer(true)
  }

  const openEditClient = (client) => {
    setEditingClientId(client.id)
    setClientForm({ name: client.name, profile: client.profile, cpf: client.cpf, email: client.email })
    setError('')
    setShowDrawer(true)
  }

  const saveClient = async () => {
    if (!clientForm.name.trim()) {
      setError('Nome e obrigatorio')
      return
    }

    setSaving(true)
    setError('')
    const payload = {
      name: clientForm.name.trim(),
      profile: clientForm.profile,
      cpf: clientForm.cpf.trim(),
      email: clientForm.email.trim(),
    }

    try {
      const savedClient = editingClientId
        ? await updateClient(editingClientId, payload)
        : await createClient(payload)

      setClients((currentClients) => editingClientId
        ? currentClients.map((client) => client.id === editingClientId ? savedClient : client)
        : [...currentClients, savedClient])
      setShowDrawer(false)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const removeClient = async () => {
    setDeleting(true)
    setError('')

    try {
      await deleteClient(clientToDelete)
      setClients((currentClients) => currentClients.filter((client) => client.id !== clientToDelete))
      setClientToDelete(null)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Meus clientes</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {filteredClients.length} clientes exibidos de {clients.length} na sua carteira.
            </p>
          </div>
          <button
            onClick={openNewClient}
            className="bg-brand hover:brightness-95 text-zinc-900 font-semibold px-5 py-2.5 rounded-lg"
          >
            Novo cliente
          </button>
        </div>

        {error && !showDrawer && (
          <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Patrimônio financeiro sob assessoria" value={formatBRL(totalFinancialAssets)} />
          <StatCard label="Clientes" value={clients.length} />
          <StatCard label="Alertas abertos" value={totalAlerts} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o nome do cliente"
            className="border border-zinc-200 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand bg-white"
          />
          {['Todos', 'Conservador', 'Moderado', 'Arrojado', 'Somente com alertas'].map((p) => (
            <button
              key={p}
              onClick={() => setProfileFilter(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                profileFilter === p
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">Carregando clientes...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">Nenhum cliente encontrado.</td>
                </tr>
              ) : filteredClients.map((client) => (
                <tr key={client.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-semibold text-zinc-700 flex-shrink-0">
                        {client.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span className="font-medium text-sm text-zinc-900">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PROFILE_STYLE[client.profile] || 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                      {client.profile}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{formatBRL(client.financialAssets)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{client.outsideInstitutionPercentage}%</td>
                  <td className="px-4 py-3">
                    {client.alertCount > 0 ? (
                      <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {client.alertCount} alerta{client.alertCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-xs">Sem alertas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{client.nextDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => navigate(`/clientes/${client.id}`)}
                        className="bg-brand hover:brightness-95 text-zinc-900 text-xs font-medium px-3 py-1.5 rounded-lg"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => openEditClient(client)}
                        className="border border-zinc-200 text-zinc-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setClientToDelete(client.id)}
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

        <p className="text-xs text-zinc-400 mt-4">As informações exibidas são carregadas do cadastro de cada cliente.</p>
      </div>

      {/* Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowDrawer(false)} />
          <div className="w-96 bg-white shadow-2xl flex flex-col">
            <div className="p-6 border-b border-zinc-100">
              <h2 className="font-bold text-lg text-zinc-900">
                {editingClientId ? 'Editar cliente' : 'Novo cliente'}
              </h2>
            </div>
            <div className="p-6 flex flex-col gap-4 flex-1">
              <FormField label="Nome completo" value={clientForm.name} onChange={(name) => setClientForm({ ...clientForm, name })} />
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Perfil de investidor</label>
                <select
                  value={clientForm.profile}
                  onChange={(e) => setClientForm({ ...clientForm, profile: e.target.value })}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option>Conservador</option>
                  <option>Moderado</option>
                  <option>Arrojado</option>
                </select>
              </div>
              <FormField label="CPF (fictício)" value={clientForm.cpf} onChange={(cpf) => setClientForm({ ...clientForm, cpf })} placeholder="XXX.000.000-XX" />
              <FormField label="E-mail" value={clientForm.email} onChange={(email) => setClientForm({ ...clientForm, email })} placeholder="cliente@demo.com" />
            </div>
            {error && <p role="alert" className="px-6 text-sm text-red-600">{error}</p>}
            <div className="p-6 border-t border-zinc-100 flex gap-3">
              <button
                onClick={saveClient}
                disabled={saving}
                className="flex-1 bg-brand hover:brightness-95 disabled:opacity-60 text-zinc-900 font-semibold py-2.5 rounded-lg"
              >
                {saving ? 'Salvando...' : 'Salvar'}
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
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="font-bold text-zinc-900 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-zinc-500 mb-5">
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={removeClient}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-medium py-2 rounded-lg"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
              <button
                onClick={() => setClientToDelete(null)}
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
