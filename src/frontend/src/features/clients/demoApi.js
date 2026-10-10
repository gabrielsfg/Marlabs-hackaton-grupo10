import { clientes } from '../../data/mockData'

// Versao em memoria da API de clientes para a conta de demonstracao: mesmo formato do ClientResponse da API.
// As alteracoes valem ate recarregar a pagina.
const toClientResponse = (c) => ({
  id: String(c.id),
  name: c.nome,
  profile: c.perfil,
  cpf: c.cpf,
  email: c.email,
  financialAssets: c.patrimonioFinanceiro,
  physicalAssets: c.patrimonioFisico,
  outsideInstitutionPercentage: c.foraInstituicao,
  alertCount: c.alertas,
  nextDate: c.proximaData,
})

let demoClients = clientes.map(toClientResponse)

const notFound = () => {
  const error = new Error('Cliente nao encontrado')
  error.response = { status: 404, data: { title: 'Client.NotFound', detail: 'Cliente nao encontrado' } }
  return Promise.reject(error)
}

export const getClients = () => Promise.resolve([...demoClients])

export function getClient(id) {
  const client = demoClients.find((c) => c.id === String(id))
  return client ? Promise.resolve({ ...client }) : notFound()
}

// Na demo as posicoes vem do proprio mockData (cliente.posicoes), entao nao ha carteira vinculada
export const getClientInvestments = () => Promise.resolve([])

export function createClient(client) {
  const created = {
    ...client,
    id: String(Date.now()),
    financialAssets: 0,
    physicalAssets: 0,
    outsideInstitutionPercentage: 0,
    alertCount: 0,
    nextDate: '—',
  }
  demoClients = [...demoClients, created]
  return Promise.resolve({ ...created })
}

export function updateClient(id, client) {
  const existing = demoClients.find((c) => c.id === String(id))
  if (!existing) return notFound()
  const updated = { ...existing, ...client }
  demoClients = demoClients.map((c) => (c.id === String(id) ? updated : c))
  return Promise.resolve({ ...updated })
}

export function deleteClient(id) {
  demoClients = demoClients.filter((c) => c.id !== String(id))
  return Promise.resolve()
}
