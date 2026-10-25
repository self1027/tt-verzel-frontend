import { api, throwApiError } from '@/api/client'
import type { components } from '@/api/generated/schema'
export async function getAudit(
  id: string,
  signal?: AbortSignal,
): Promise<components['schemas']['AuditVerification']> {
  const result = await api.GET('/auctions/{id}/audit', {
    params: { path: { id } },
    signal,
  })
  if (result.data) return result.data
  if (
    result.response.status === 503 &&
    result.error &&
    'status' in result.error &&
    result.error.status === 'VERIFICATION_UNAVAILABLE'
  )
    return result.error
  throwApiError(result.response.status, result.error)
}
export async function getAuditEvents(
  id: string,
  after: string,
  signal?: AbortSignal,
) {
  const result = await api.GET('/auctions/{id}/audit/events', {
    params: { path: { id }, query: { after, limit: 30 } },
    signal,
  })
  if (!result.data) throwApiError(result.response.status, result.error)
  return result.data
}
export async function getReceipt(id: string, signal?: AbortSignal) {
  const result = await api.GET('/auctions/{id}/receipt', {
    params: { path: { id } },
    signal,
  })
  if (!result.data) throwApiError(result.response.status, result.error)
  return result.data.receipt
}
