import { api, throwApiError } from '@/api/client'
export const walletKey = (userId: string) =>
  ['private', userId, 'wallet'] as const
export async function getWallet(signal?: AbortSignal) {
  const result = await api.GET('/wallet', { signal })
  if (!result.data) throwApiError(result.response.status, result.error)
  return result.data.wallet
}
export async function getTransactions(skip: number, signal?: AbortSignal) {
  const result = await api.GET('/wallet/transactions', {
    params: { query: { limit: 20, skip } },
    signal,
  })
  if (!result.data) throwApiError(result.response.status, result.error)
  return result.data
}
export async function deposit(amountCents: string, key: string) {
  const result = await api.POST('/wallet/deposits', {
    body: { amountCents },
    params: { header: { 'Idempotency-Key': key } },
  })
  if (!result.data) throwApiError(result.response.status, result.error)
  return result.data.deposit
}
