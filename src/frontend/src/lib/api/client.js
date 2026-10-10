const API_BASE_URL = '/api'
const TOKEN_KEY = 'accessToken'

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `${API_BASE_URL}${path}`)
    xhr.setRequestHeader('Accept', 'application/json')

    const token = localStorage.getItem(TOKEN_KEY)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    if (body !== undefined) xhr.setRequestHeader('Content-Type', 'application/json')

    xhr.onload = () => {
      let data = null
      if (xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText)
        } catch {
          data = xhr.responseText
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data, status: xhr.status })
        return
      }

      const error = new Error(data?.detail || 'Nao foi possivel concluir a solicitacao')
      error.response = { data, status: xhr.status }
      reject(error)
    }

    xhr.onerror = () => reject(new Error('Nao foi possivel conectar a API'))
    xhr.send(body === undefined ? null : JSON.stringify(body))
  })
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
}