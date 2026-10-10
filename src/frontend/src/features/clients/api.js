import { api } from '../../lib/api/client'

export const getClients = () => api.get('/clients').then((response) => response.data)
export const getClient = (id) => api.get(`/clients/${id}`).then((response) => response.data)
export const createClient = (client) => api.post('/clients', client).then((response) => response.data)
export const updateClient = (id, client) => api.put(`/clients/${id}`, client).then((response) => response.data)
export const deleteClient = (id) => api.delete(`/clients/${id}`)