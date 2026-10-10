import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../features/auth/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setEntrando(true)

    try {
      const response = await login({ email, password: senha })
      localStorage.setItem('accessToken', response.accessToken)
      navigate('/dashboard')
    } catch (error) {
      setErro(error.response?.data?.detail || error.message || 'Nao foi possivel entrar')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="w-[55%] bg-zinc-900 text-white flex flex-col p-10">
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 bg-brand rounded-xl" />
          <span className="text-lg font-semibold">Central do Assessor</span>
        </div>

        <div className="mb-auto">
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Saiba com quem falar<br />
            hoje, <span className="text-brand">e por quê.</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-md">
            Custódia consolidada, patrimônio físico, alertas de FGC e
            vencimentos, simulações e analytics em um só lugar, com
            ações sugeridas e priorizadas.
          </p>
        </div>

        <p className="text-zinc-600 text-sm">Hackathon Rota XP · O Assessor do Futuro</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-stone-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-10 w-full max-w-md mx-8">
          <h2 className="text-2xl font-bold text-zinc-900 mb-1">Entrar</h2>
          <p className="text-zinc-500 text-sm mb-6">Acesse com sua conta de assessor.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}

            <button
              type="submit"
              disabled={entrando}
              className="w-full bg-brand hover:brightness-95 disabled:opacity-60 text-zinc-900 font-semibold py-3 rounded-lg transition-all mt-1"
            >
              {entrando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-zinc-400 text-xs mt-6 text-center leading-relaxed">
            Ambiente de demonstração com dados fictícios.<br />
            Cada assessor só enxerga os próprios clientes.
          </p>
        </div>
      </div>
    </div>
  )
}
