import { api } from '../../lib/api/client'

export const login = (credentials) => api.post('/auth/login', credentials).then((response) => response.data)
