import { getSession, endSession } from '@/features/auth/session'
import createClient from 'openapi-fetch'
import type { paths } from './generated/schema'

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
export const api = createClient<paths>({ baseUrl: apiBaseUrl })

api.use({
  onRequest({ request }) {
    const token = getSession()?.token
    if (token && !request.headers.has('Authorization'))
      request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  onResponse({ request, response }) {
    if (
      response.status === 401 &&
      getSession()?.token &&
      request.headers.get('Authorization') === `Bearer ${getSession()?.token}`
    )
      endSession()
    return response
  },
})

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function throwApiError(status: number, payload: unknown): never {
  const message =
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'object' &&
    payload.error !== null &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
      ? payload.error.message
      : 'Não foi possível concluir a solicitação.'
  const code =
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'object' &&
    payload.error !== null &&
    'code' in payload.error &&
    typeof payload.error.code === 'string'
      ? payload.error.code
      : undefined
  throw new ApiError(status, message, code)
}
