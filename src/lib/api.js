function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}

function isLikelyDomain(value) {
  return /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(String(value || ''))
}

function normalizeBaseUrl(value) {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return ''

  let candidate = normalizedValue
  if (normalizedValue.startsWith('//')) {
    candidate = `https:${normalizedValue}`
  } else if (isLikelyDomain(normalizedValue)) {
    candidate = `https://${normalizedValue.replace(/^https?:\/\//i, '')}`
  }

  if (!isAbsoluteUrl(candidate)) {
    if (typeof console !== 'undefined') {
      console.warn(`Ignoring invalid VITE_API_BASE_URL value: "${normalizedValue}"`)
    }
    return ''
  }

  try {
    const parsed = new URL(candidate)
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '')
  } catch {
    if (typeof console !== 'undefined') {
      console.warn(`Ignoring invalid VITE_API_BASE_URL value: "${normalizedValue}"`)
    }
    return ''
  }
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

export function toApiUrl(path) {
  const normalizedPath = String(path || '').trim()
  if (!normalizedPath) return API_BASE_URL || '/'
  if (isAbsoluteUrl(normalizedPath)) return normalizedPath
  if (normalizedPath.startsWith('//')) return `https:${normalizedPath}`
  if (isLikelyDomain(normalizedPath)) return `https://${normalizedPath.replace(/^https?:\/\//i, '')}`
  const safePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  if (!API_BASE_URL) return safePath
  return `${API_BASE_URL}${safePath}`
}

async function requestJson(path, options = {}, emptyResponseStatus = null) {
  const url = toApiUrl(path)
  let response

  try {
    response = await fetch(url, options)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed'
    throw new Error(`${message}. Request URL: ${url}`)
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const errorBody = await response.json()
      if (typeof errorBody?.message === 'string' && errorBody.message.trim()) {
        message = errorBody.message
      }
    } catch {
      // Keep default message if response body is not JSON.
    }
    throw new Error(`${message}. Request URL: ${url}`)
  }

  if (emptyResponseStatus != null && response.status === emptyResponseStatus) {
    return null
  }

  return response.json()
}

export async function getJson(path, options = {}) {
  return requestJson(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  })
}

export async function postJson(path, body, options = {}) {
  return requestJson(path, {
    method: 'POST',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: JSON.stringify(body ?? {}),
  })
}

export async function putJson(path, body, options = {}) {
  return requestJson(path, {
    method: 'PUT',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: JSON.stringify(body ?? {}),
  })
}

export async function deleteJson(path, options = {}) {
  return requestJson(
    path,
    {
      method: 'DELETE',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    },
    204,
  )
}

export function resolveAssetUrl(path) {
  const value = String(path || '').trim()
  if (!value) return ''
  if (isAbsoluteUrl(value)) return value
  if (value.startsWith('//')) return `https:${value}`
  if (isLikelyDomain(value)) return `https://${value.replace(/^https?:\/\//i, '')}`
  if (value.startsWith('data:')) return value
  if (value.startsWith('blob:')) return value
  if (value.startsWith('uploads/') || value.startsWith('labels/') || value.startsWith('api/')) {
    return toApiUrl(`/${value}`)
  }
  if (value.startsWith('/')) return toApiUrl(value)
  return value
}

export function resolveApiFileUrl(path) {
  return resolveAssetUrl(path)
}

export async function uploadFile(file, options = {}) {
  if (!(file instanceof File)) {
    throw new Error('uploadFile expects a File object')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(toApiUrl('/api/uploads'), {
    method: 'POST',
    body: formData,
    ...options,
  })

  if (!response.ok) {
    let message = `Upload failed (${response.status})`
    try {
      const errorBody = await response.json()
      if (typeof errorBody?.message === 'string' && errorBody.message.trim()) {
        message = errorBody.message
      }
    } catch {
      // Keep default message if response body is not JSON.
    }
    throw new Error(`${message}. Request URL: ${toApiUrl('/api/uploads')}`)
  }

  const payload = await response.json()
  if (payload?.url) {
    return payload
  }

  return {
    ...payload,
    url: resolveAssetUrl(payload?.path || ''),
  }
}
