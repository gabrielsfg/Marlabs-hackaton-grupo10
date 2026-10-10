import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import Navbar from '../components/Navbar'
import { alertas, lembretes as lembretesIniciais, noticias, formatBRL } from '../data/mockData'
import { criarEventoCalendario, hojeLocalISO } from '../utils/googleCalendar'

const PRIORIDADE_STYLE = {
  Alta: 'bg-red-100 text-red-700',
  Média: 'bg-yellow-100 text-yellow-700',
  Baixa: 'bg-sky-100 text-sky-700',
}

const PRIORIDADE_BORDER = {
  Alta: 'border-red-200',
  Média: 'border-yellow-200',
  Baixa: 'border-sky-200',
}

function formatarData(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [filtroPrioridade, setFiltroPrioridade] = useState('Todas')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [concluidos, setConcluidos] = useState([])
  const [lembretes, setLembretes] = useState(lembretesIniciais)
  const [novoLembrete, setNovoLembrete] = useState('')
  const [lembCliente, setLembCliente] = useState('Sem cliente')
  // Data de hoje no fuso local, calculada ao abrir a tela
  const [hoje] = useState(hojeLocalISO)
  const [lembQuando, setLembQuando] = useState(hoje)

  // Google Calendar
  const [googleToken, setGoogleToken] = useState(null)
  const [calendarStatus, setCalendarStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const pendingRef = useRef(null)

  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1)

  const alertasAtivos = alertas.filter((a) => !concluidos.includes(a.id))
  const filtrados = alertasAtivos.filter((a) => {
    const okP = filtroPrioridade === 'Todas' || a.prioridade === filtroPrioridade
    const okT = filtroTipo === 'Todos' || a.tipo === filtroTipo
    return okP && okT
  })

  const counts = {
    Alta: alertasAtivos.filter((a) => a.prioridade === 'Alta').length,
    Média: alertasAtivos.filter((a) => a.prioridade === 'Média').length,
    Baixa: alertasAtivos.filter((a) => a.prioridade === 'Baixa').length,
  }
  const countsTipo = {
    FGC: alertasAtivos.filter((a) => a.tipo === 'FGC').length,
    Vencimento: alertasAtivos.filter((a) => a.tipo === 'Vencimento').length,
    Objetivo: alertasAtivos.filter((a) => a.tipo === 'Objetivo').length,
  }

  const enviarParaCalendario = async (token, lembrete) => {
    setCalendarStatus('loading')
    try {
      await criarEventoCalendario(token, {
        titulo: lembrete.texto,
        data: lembrete.quando,
        clienteNome: lembrete.clienteNome,
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
      if (pendingRef.current) {
        await enviarParaCalendario(access_token, pendingRef.current)
        pendingRef.current = null
      }
    },
    onError: () => {
      setCalendarStatus('error')
      setTimeout(() => setCalendarStatus(null), 4000)
    },
  })

  const addLembrete = async () => {
    if (!novoLembrete.trim() || !lembQuando) return
    const lembrete = {
      id: Date.now(),
      texto: novoLembrete,
      clienteNome: lembCliente === 'Sem cliente' ? null : lembCliente,
      quando: lembQuando,
      concluido: false,
    }
    setLembretes((prev) => [...prev, lembrete])
    setNovoLembrete('')
    setLembQuando(hojeLocalISO())

    if (googleToken) {
      await enviarParaCalendario(googleToken, lembrete)
    } else {
      pendingRef.current = lembrete
      googleLogin()
    }
  }

  const removeLembrete = (id) => setLembretes(lembretes.filter((l) => l.id !== id))

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />

      {/* Toast de status Google Calendar */}
      {calendarStatus && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${
          calendarStatus === 'loading' ? 'bg-zinc-800 text-white' :
          calendarStatus === 'success' ? 'bg-green-500 text-white' :
          'bg-red-500 text-white'
        }`}>
          {calendarStatus === 'loading' && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {calendarStatus === 'loading' && 'Adicionando ao Google Agenda...'}
          {calendarStatus === 'success' && '✓ Evento adicionado ao Google Agenda!'}
          {calendarStatus === 'error' && '✕ Erro ao adicionar ao Google Agenda'}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <p className="text-zinc-500 text-sm mb-0.5">{todayCap}</p>
        <h1 className="text-3xl font-bold text-zinc-900">Bom dia, Rafael</h1>
        <p className="text-zinc-500 text-sm mt-1 mb-5">
          Você tem {alertasAtivos.length} ações para hoje, ordenadas por urgência e impacto.
        </p>

        {/* Priority counters */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <PriorityCard label="Alta" count={counts.Alta} color="text-red-600 bg-red-50 border-red-100" />
          <PriorityCard label="Média" count={counts.Média} color="text-yellow-600 bg-yellow-50 border-yellow-100" />
          <PriorityCard label="Baixa" count={counts.Baixa} color="text-sky-600 bg-sky-50 border-sky-100" />
        </div>

        <div className="grid grid-cols-[1fr_380px] gap-6">
          {/* Left column */}
          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">Ações do dia</h2>

            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-sm text-zinc-500">Prioridade</span>
              <FilterChips
                options={[
                  { label: 'Todas', count: alertasAtivos.length },
                  { label: 'Alta', count: counts.Alta },
                  { label: 'Média', count: counts.Média },
                  { label: 'Baixa', count: counts.Baixa },
                ]}
                selected={filtroPrioridade}
                onSelect={setFiltroPrioridade}
              />
            </div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-sm text-zinc-500">Tipo</span>
              <FilterChips
                options={[
                  { label: 'Todos', count: alertasAtivos.length },
                  { label: 'FGC', count: countsTipo.FGC },
                  { label: 'Vencimento', count: countsTipo.Vencimento },
                  { label: 'Objetivo', count: countsTipo.Objetivo },
                ]}
                selected={filtroTipo}
                onSelect={setFiltroTipo}
              />
            </div>

            <div className="flex flex-col gap-3">
              {filtrados.map((alerta) => (
                <ActionCard
                  key={alerta.id}
                  alerta={alerta}
                  onVerCliente={() => navigate(`/clientes/${alerta.clienteId}`)}
                  onConcluir={() => setConcluidos([...concluidos, alerta.id])}
                />
              ))}
              {filtrados.length === 0 && (
                <p className="text-zinc-400 text-sm py-6 text-center bg-white rounded-xl border border-zinc-100">
                  Nenhuma ação para o filtro selecionado.
                </p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Lembretes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-zinc-900">Meus lembretes</h2>
                <span className="text-xs text-zinc-500">{lembretes.filter((l) => !l.concluido).length} em aberto</span>
              </div>

              <div className="bg-white rounded-xl border border-zinc-100 p-4">
                <p className="text-xs font-medium text-zinc-500 mb-2">Novo lembrete</p>
                <input
                  value={novoLembrete}
                  onChange={(e) => setNovoLembrete(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLembrete()}
                  placeholder="Ex.: ligar para o cliente sobre o aporte"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Cliente (opcional)</p>
                    <select
                      value={lembCliente}
                      onChange={(e) => setLembCliente(e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    >
                      <option>Sem cliente</option>
                      <option>Carlos Menezes</option>
                      <option>Helena Duarte</option>
                      <option>Rodrigo Tavares</option>
                      <option>Beatriz Lima</option>
                      <option>Paulo Sampaio</option>
                      <option>Fernanda Prado</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Data</p>
                    <input
                      type="date"
                      value={lembQuando}
                      min={hoje}
                      onChange={(e) => setLembQuando(e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
                <button
                  onClick={addLembrete}
                  disabled={calendarStatus === 'loading'}
                  className="w-full bg-brand hover:brightness-95 text-zinc-900 font-medium text-sm py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <GoogleCalendarIcon />
                  Adicionar e salvar no Google Agenda
                </button>
                {!googleToken && (
                  <p className="text-xs text-zinc-400 text-center mt-1.5">
                    Uma janela do Google vai abrir para autorizar.
                  </p>
                )}
                {googleToken && (
                  <p className="text-xs text-green-600 text-center mt-1.5">
                    ✓ Conectado ao Google Agenda
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {lembretes.filter((l) => !l.concluido).map((l) => (
                  <div key={l.id} className="bg-white rounded-lg border border-zinc-100 px-3 py-2.5 flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5 accent-brand" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-800">{l.texto}</p>
                      <p className="text-xs text-zinc-400">
                        {l.clienteNome ? l.clienteNome + ' · ' : ''}{formatarData(l.quando)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeLembrete(l.id)}
                      className="text-xs text-zinc-400 hover:text-red-500 ml-1 flex-shrink-0"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notícias */}
            <div>
              <h2 className="text-base font-semibold text-zinc-900 mb-3">Notícias e clientes afetados</h2>
              <div className="flex flex-col gap-3">
                {noticias.map((n) => (
                  <NewsCard key={n.id} noticia={n} navigate={navigate} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-400 mt-8 pb-4">
          Ambiente de demonstração com dados fictícios. Dados pessoais são mascarados antes de qualquer envio à IA.
        </p>
      </div>
    </div>
  )
}

function GoogleCalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PriorityCard({ label, count, color }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center justify-between ${color}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-3xl font-bold">{count}</span>
    </div>
  )
}

function FilterChips({ options, selected, onSelect }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => (
        <button
          key={o.label}
          onClick={() => onSelect(o.label)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selected === o.label
              ? 'bg-zinc-900 text-white'
              : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          {o.label} ({o.count})
        </button>
      ))}
    </div>
  )
}

function ActionCard({ alerta, onVerCliente, onConcluir }) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${PRIORIDADE_BORDER[alerta.prioridade]}`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORIDADE_STYLE[alerta.prioridade]}`}>
          Prioridade {alerta.prioridade.toLowerCase()}
        </span>
        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{alerta.tipo}</span>
        {alerta.tag && <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{alerta.tag}</span>}
        {alerta.dias != null && (
          <span className="text-xs text-zinc-500">Vence em {alerta.dias} dias ({alerta.dataRef})</span>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-zinc-900 mb-1">{alerta.titulo}</p>
          <p className="text-sm text-zinc-600 mb-1">{alerta.descricao}</p>
          <p className="text-sm text-amber-600 font-medium">Ação sugerida: {alerta.acaoSugerida}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {alerta.valor != null && (
            <>
              <p className="text-xs text-zinc-500 mb-0.5">{alerta.labelValor}</p>
              <p className="font-bold text-zinc-900">{formatBRL(alerta.valor)}</p>
            </>
          )}
          {alerta.porcentagem != null && (
            <>
              <p className="text-xs text-zinc-500 mb-0.5">{alerta.labelValor}</p>
              <p className="font-bold text-zinc-900">{alerta.porcentagem}%</p>
            </>
          )}
          {alerta.meta != null && (
            <>
              <p className="text-xs text-zinc-500 mb-0.5">{alerta.labelValor}</p>
              <p className="font-bold text-zinc-900">{alerta.meta}</p>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onVerCliente}
          className="bg-brand hover:brightness-95 text-zinc-900 font-medium text-sm px-4 py-1.5 rounded-lg"
        >
          Ver cliente
        </button>
        <button
          onClick={onConcluir}
          className="border border-zinc-200 text-zinc-700 font-medium text-sm px-4 py-1.5 rounded-lg hover:bg-zinc-50"
        >
          Marcar como feito
        </button>
      </div>
    </div>
  )
}

function NewsCard({ noticia, navigate }) {
  const visible = noticia.clientesAfetados.slice(0, 3)
  const extra = noticia.totalAfetados - visible.length

  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${noticia.categoriaCor}`}>
          {noticia.categoria}
        </span>
        <span className="text-xs text-zinc-400">{noticia.data}</span>
      </div>
      <p className="font-semibold text-sm text-zinc-900 mb-1">{noticia.titulo}</p>
      <p className="text-xs text-zinc-500 mb-2 leading-relaxed">{noticia.resumo}</p>
      <p className="text-xs text-zinc-400 mb-2">Fonte: {noticia.fonte}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-zinc-500">{noticia.totalAfetados} clientes afetados</span>
        <span className="text-xs text-zinc-400">· Tag: {noticia.tags}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {visible.map((c) => (
          <button
            key={c.iniciais}
            onClick={() => navigate('/clientes/1')}
            className={`w-7 h-7 ${c.cor} rounded-full text-xs font-semibold text-zinc-700 hover:ring-2 hover:ring-brand`}
            title={c.nome}
          >
            {c.iniciais}
          </button>
        ))}
        {extra > 0 && (
          <button className="text-xs border border-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full hover:bg-zinc-50">
            +{extra} · ver todos
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-400 mt-2">
        Notícias e vínculos de exemplo, fictícios.
      </p>
    </div>
  )
}
