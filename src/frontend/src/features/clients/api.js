import { api } from '../../lib/api/client'
import { isDemoSession } from '../../lib/session'
import * as demo from './demoApi'

// Na conta de demonstracao os dados vem do mockData (demoApi); nas demais, da API
const realApi = {
  getClients: () => api.get('/clients').then((response) => response.data),
  getClient: (id) => api.get(`/clients/${id}`).then((response) => response.data),
  getClientInvestments: (id) => api.get(`/clients/${id}/investments`).then((response) => response.data),
  createClient: (client) => api.post('/clients', client).then((response) => response.data),
  updateClient: (id, client) => api.put(`/clients/${id}`, client).then((response) => response.data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
}

const source = () => (isDemoSession() ? demo : realApi)

export const getClients = () => source().getClients()
export const getClient = (id) => source().getClient(id)
export const getClientInvestments = (id) => source().getClientInvestments(id)
export const createClient = (client) => source().createClient(client)
export const updateClient = (id, client) => source().updateClient(id, client)
export const deleteClient = (id) => source().deleteClient(id)
