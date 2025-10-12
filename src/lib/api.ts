import { supabase } from './supabaseClient'

const API_BASE_URL = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string, VITE_LOG_API?: string } }).env?.VITE_API_BASE_URL || ''
const LOG_API = ((import.meta as unknown as { env?: { VITE_LOG_API?: string } }).env?.VITE_LOG_API ?? '').toLowerCase()
  .replace(/\s+/g, '')
  .startsWith('t') || ((import.meta as unknown as { env?: { VITE_LOG_API?: string } }).env?.VITE_LOG_API ?? '') === '1'

export class ApiError extends Error {
  status: number
  body?: string
  constructor(message: string, status: number, body?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function headersToObject(h: Headers): Record<string, string> {
  const obj: Record<string, string> = {}
  h.forEach((v, k) => { obj[k] = v })
  return obj
}

async function summarizeBody(body: unknown): Promise<unknown> {
  if (!body) return undefined
  if (typeof body === 'string') {
    let parsed: unknown
    try { parsed = JSON.parse(body) } catch { /* noop */ }
    const str = typeof parsed === 'object' && parsed !== null ? parsed : body
    const s = typeof str === 'string' ? str : JSON.stringify(str)
    return s.length > 1000 ? `${s.slice(0, 1000)}…(${s.length} chars)` : s
  }
  if (isFormData(body)) {
    const summary: Record<string, unknown> = { _type: 'FormData', fields: [] }
    const fields: Array<Record<string, unknown>> = []
    body.forEach((val, key) => {
      if (val instanceof File) {
        fields.push({ name: key, type: 'file', fileName: val.name, size: val.size, mime: val.type })
      } else {
        const s = String(val)
        fields.push({ name: key, type: 'text', length: s.length, valuePreview: s.length > 200 ? `${s.slice(0, 200)}…` : s })
      }
    })
    summary.fields = fields
    return summary
  }
  return typeof body === 'object' ? '[object body]' : String(body)
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input}`
  const { data: sessRes } = await supabase.auth.getSession()
  const accessToken = sessRes.session?.access_token

  const headers = new Headers(init.headers as HeadersInit)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  // Do not set Content-Type for multipart; browser will handle boundary
  const shouldSetJson = !isFormData(init.body) && !headers.has('Content-Type') && init.body != null
  if (shouldSetJson && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  if (LOG_API) {
    // Safe client-side debug logging
    // eslint-disable-next-line no-console
    console.debug('[apiFetch] →', {
      method: (init.method || 'GET').toUpperCase(),
      url,
      headers: headersToObject(headers),
      body: await summarizeBody(init.body),
    })
  }

  const doFetch = async (): Promise<Response> => {
    return fetch(url, { ...init, headers })
  }

  let res = await doFetch()
  if (res.status === 401) {
    // Try to refresh session once
    await supabase.auth.getSession()
    const { data: sessRes2 } = await supabase.auth.getSession()
    const token2 = sessRes2.session?.access_token
    if (token2 && token2 !== accessToken) {
      headers.set('Authorization', `Bearer ${token2}`)
    }
    res = await doFetch()
    if (res.status === 401) {
      const body = await res.text().catch(() => undefined)
      if (LOG_API) {
        // eslint-disable-next-line no-console
        console.debug('[apiFetch] 401 response body:', body)
      }
      throw new ApiError('Unauthorized', 401, body)
    }
  }
  return res
}

export async function apiJson<T>(input: string, init: RequestInit & { body?: unknown } = {}): Promise<T> {
  const body = init.body !== undefined && typeof init.body !== 'string' && !isFormData(init.body)
    ? JSON.stringify(init.body)
    : (init.body as string | undefined)
  const res = await apiFetch(input, { ...init, body })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(text || `Request failed with status ${res.status}`, res.status, text)
  }
  return res.json() as Promise<T>
}
