import { api } from '../../lib/api/client'

export const getReminders = () => api.get('/reminders').then((response) => response.data)
export const createReminder = (reminder) => api.post('/reminders', reminder).then((response) => response.data)
export const updateReminder = (id, reminder) => api.put(`/reminders/${id}`, reminder).then((response) => response.data)
export const deleteReminder = (id) => api.delete(`/reminders/${id}`)
