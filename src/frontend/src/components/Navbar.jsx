import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')
  const handleLogout = () => {
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('user')
    navigate('/')
  }

  return (
    <nav className="bg-zinc-900 text-white flex items-center px-6 py-3 gap-6">
      <Link to="/dashboard" className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 bg-brand rounded-lg flex-shrink-0" />
        <span className="font-semibold text-base whitespace-nowrap">Central do Assessor</span>
      </Link>

      <div className="flex items-center gap-1 flex-1">
        <NavLink to="/dashboard" active={isActive('/dashboard')}>Central do dia</NavLink>
        <NavLink to="/clientes" active={isActive('/clientes')}>Clientes</NavLink>
        <NavLink to="/simulacao" active={isActive('/simulacao')}>Simulação</NavLink>
        <NavDropdown />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-zinc-300">Rafael Mendes</span>
        <button
          onClick={handleLogout}
          className="border border-zinc-600 text-sm px-3 py-1 rounded hover:bg-zinc-700 transition-colors"
        >
          Sair
        </button>
      </div>
    </nav>
  )
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-brand text-zinc-900'
          : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
      }`}
    >
      {children}
    </Link>
  )
}

function NavDropdown() {
  return (
    <div className="relative group">
      <button className="px-4 py-1.5 rounded text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors flex items-center gap-1">
        Mais <span className="text-xs">▼</span>
      </button>
      <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-zinc-100 py-1 hidden group-hover:block z-50">
        {['Analytics', 'Carteiras modelo', 'Oportunidades', 'Relatórios', 'Agenda de contatos', 'Open Finance', 'Configurações'].map((item) => (
          <button
            key={item}
            className="w-full text-left px-4 py-2 text-sm text-zinc-500 flex items-center justify-between hover:bg-zinc-50"
          >
            {item}
            <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">Em breve</span>
          </button>
        ))}
      </div>
    </div>
  )
}
