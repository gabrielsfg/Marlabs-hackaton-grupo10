import { api } from '../../lib/api/client'

export const getDailyActions = () => api.get('/dailyactions').then((response) => response.data)
