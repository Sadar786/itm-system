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

const apiRequest = (path, { token, method = "GET", body } = {}) =>
  apiJson(path, token, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })


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

export const signup = async ({ name, email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await response.json()

  if (!response.ok || !data.token) {
    throw new Error(data.message || 'Signup failed')
  }

  return data
}

export const forgotPassword = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Password reset failed')
  }

  return data
}

export const getProducts = (token) => apiJson('/products?limit=500', token)

export const searchProducts = (token, search, limit = 20) => {
  const params = new URLSearchParams();

  params.set("search", search.trim());
  params.set("limit", limit);

  return apiJson(`/products?${params.toString()}`, token);
};

export const downloadProductsExcel = async ({ token }) => {
  const response = await fetch(`${API_BASE_URL}/products/export/excel`, {
    headers: authHeaders(token),
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''

    const errorBody = contentType.includes('application/json')
      ? await response.json()
      : null

    throw new Error(errorBody?.message || 'Product download failed')
  }

  const blob = await response.blob()

  const filename = parseFilename(
    response.headers.get('content-disposition'),
    `Products_${new Date().toISOString().slice(0, 10)}.xlsx`,
  )

  downloadBlob(blob, filename)

  return filename
}

export const getShops = (token) => apiJson('/shops/all', token)

export const getTransferDestinationShops = (token) =>
  apiJson('/shops/transfer-destinations', token)

export const getCategories = (token) => apiJson('/meta/categories', token)
export const getUnits = (token) => apiJson('/units', token)

export const createShop = ({ token, body }) =>
  apiJson('/shops/create', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const updateShop = ({ token, shopId, body }) =>
  apiJson(`/shops/update/${shopId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const deleteShop = ({ token, shopId }) =>
  apiJson(`/shops/delete/${shopId}`, token, {
    method: 'DELETE',
  })

export const createProduct = ({ token, body }) =>
  apiJson('/products/create', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const updateProduct = ({ token, productId, body }) =>
  apiJson(`/products/update/${productId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  export const importProducts = async ({ token, file }) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/products/import`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Product import failed");
  }

  return data;
};

export const deleteProduct = ({ token, productId }) =>
  apiJson(`/products/delete/${productId}`, token, {
    method: 'DELETE',
  })

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

export const getMovements = ({ token, shopId, startDate, endDate }) => {
  const params = new URLSearchParams()
  if (shopId?.trim()) {
    params.set('shopId', shopId.trim())
  }
  if (startDate) {
    params.set('startDate', startDate)
  }
  if (endDate) {
    params.set('endDate', endDate)
  }

  return apiJson(`/reports/movements${params.size ? `?${params}` : ''}`, token)
}

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

/* =====================================================
   UNIT APIs
===================================================== */

export const createUnit = ({ token, body }) =>
  apiRequest("/units/create", {
    method: "POST",
    token,
    body,
  })

export const updateUnit = ({ token, unitId, body }) =>
  apiRequest(`/units/${unitId}`, {
    method: "PUT",
    token,
    body,
  })

export const deleteUnit = ({ token, unitId }) =>
  apiRequest(`/units/delete/${unitId}`, {
    method: "DELETE",
    token,
  })

export const getUnit = ({ token, unitId }) =>
  apiRequest(`/units/${unitId}`, {
    token,
  })

export const getAllUnits = ({ token, page = 1, limit = 100, search = "" }) => {
  const params = new URLSearchParams()

  params.set("page", page)
  params.set("limit", limit)

  if (search.trim()) {
    params.set("search", search.trim())
  }

  return apiRequest(`/units?${params.toString()}`, {
    token,
  })
}