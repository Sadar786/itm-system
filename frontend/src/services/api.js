import { downloadBlob, parseFilename } from '../utils/download'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
})

export const apiJson = async (path, token, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.headers || {}),
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export const login = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await response.json()

  if (!response.ok || !data.token) {
    throw new Error(data.message || 'Login failed')
  }

  return data
}

export const getProducts = (token) => apiJson('/products?limit=500', token)

export const getShops = (token) => apiJson('/shops/all', token)

export const getInventory = ({ token, shopId }) => {
  const params = new URLSearchParams()
  if (shopId?.trim()) {
    params.set('shopId', shopId.trim())
  }

  return apiJson(`/inventory/current${params.size ? `?${params}` : ''}`, token)
}

export const addInventoryStock = ({ token, body }) =>
  apiJson('/inventory/in', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const createTransfer = ({ token, body }) =>
  apiJson('/transfers', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const getTransfers = ({ token, page = 1, limit = 20 }) =>
  apiJson(`/transfers?page=${page}&limit=${limit}`, token)

export const downloadReport = async ({ token, url, fallbackFilename }) => {
  const response = await fetch(url, {
    headers: authHeaders(token),
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const errorBody = contentType.includes('application/json')
      ? await response.json()
      : null
    throw new Error(errorBody?.message || 'Report download failed')
  }

  const blob = await response.blob()
  const filename = parseFilename(
    response.headers.get('content-disposition'),
    fallbackFilename,
  )
  downloadBlob(blob, filename)

  return filename
}
