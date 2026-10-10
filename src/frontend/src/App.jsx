import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setHealth)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="app">
      <h1>Hackaton - Grupo 10</h1>
      <p>React + .NET</p>
      <section className="status">
        <h2>Status da API</h2>
        {error && <p className="error">Erro ao conectar: {error}</p>}
        {!error && !health && <p>Carregando...</p>}
        {health && (
          <p className="ok">
            {health.status} - {new Date(health.timestamp).toLocaleString()}
          </p>
        )}
      </section>
    </main>
  )
}

export default App
