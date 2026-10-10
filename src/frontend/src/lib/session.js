import { assessor } from '../data/mockData'

// Conta de demonstracao: entra sem chamar a API e todas as telas usam o mockData.
// Qualquer outra conta faz o login real e as telas usam os dados da API.
export const DEMO_CREDENTIALS = { email: 'rafael.mendes@demo.com', password: 'demo1234' }

const ACCESS_TOKEN_KEY = 'accessToken'
const USER_KEY = 'user'
const DEMO_KEY = 'demo'

export const isDemoCredentials = (email, password) =>
  email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password

export function startDemoSession() {
  clearSession()
  sessionStorage.setItem(DEMO_KEY, 'true')
  sessionStorage.setItem(USER_KEY, JSON.stringify({ name: assessor.nome, email: DEMO_CREDENTIALS.email }))
}

export function startSession({ accessToken, user }) {
  clearSession()
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(DEMO_KEY)
}

export const isDemoSession = () => sessionStorage.getItem(DEMO_KEY) === 'true'

export const getAccessToken = () => sessionStorage.getItem(ACCESS_TOKEN_KEY)

export const isAuthenticated = () => isDemoSession() || Boolean(getAccessToken())

export function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY)) ?? null
  } catch {
    return null
  }
}

export const getFirstName = () => getSessionUser()?.name?.trim().split(/\s+/)[0] ?? ''
