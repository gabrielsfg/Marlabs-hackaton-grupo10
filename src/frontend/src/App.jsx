import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientProfile from './pages/ClientProfile'
import Simulation from './pages/Simulation'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/clientes/:id" element={<ClientProfile />} />
            <Route path="/simulacao" element={<Simulation />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

function ProtectedRoute() {
  const location = useLocation()
  return sessionStorage.getItem('accessToken')
    ? <Outlet />
    : <Navigate to="/" replace state={{ from: location }} />
}
