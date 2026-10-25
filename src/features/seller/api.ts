import { api, throwApiError } from '@/api/client'
import type { components } from '@/api/generated/schema'
export async function getSellerAuctions(skip: number, signal?: AbortSignal) {
  const r = await api.GET('/auctions/mine', {
    params: { query: { skip, limit: 20 } },
    signal,
  })
  if (!r.data) throwApiError(r.response.status, r.error)
  return r.data
}
export async function getProducts(skip: number, signal?: AbortSignal) {
  const r = await api.GET('/catalog/products', {
    params: { query: { skip, limit: 20 } },
    signal,
  })
  if (!r.data) throwApiError(r.response.status, r.error)
  return r.data
}
export async function searchProducts(
  q: string,
  skip: number,
  signal?: AbortSignal,
) {
  const r = await api.GET('/catalog/external/search', {
    params: { query: { q, skip, limit: 20 } },
    signal,
  })
  if (!r.data) throwApiError(r.response.status, r.error)
  return r.data
}
export async function importProduct(id: number) {
  const r = await api.POST('/catalog/import/{id}', { params: { path: { id } } })
  if (!r.data) throwApiError(r.response.status, r.error)
  return r.data.product
}
export async function saveAuction(
  body: components['schemas']['CreateAuction'],
  id?: string,
) {
  if (id) {
    const { startingBidCents, minIncrementCents, startsAt, endsAt } = body
    const r = await api.PATCH('/auctions/{id}', {
      params: { path: { id } },
      body: { startingBidCents, minIncrementCents, startsAt, endsAt },
    })
    if (!r.data) throwApiError(r.response.status, r.error)
    return r.data.auction
  }
  const r = await api.POST('/auctions', { body })
  if (!r.data) throwApiError(r.response.status, r.error)
  return r.data.auction
}
export async function cancelAuction(id: string) {
  const r = await api.POST('/auctions/{id}/cancel', {
    params: { path: { id } },
  })
  if (!r.data) throwApiError(r.response.status, r.error)
  return r.data.auction
}
export async function getReceivedTotal(signal?: AbortSignal) {
  let skip = 0
  let total = 0n
  const seen = new Set<string>()
  while (true) {
    const r = await api.GET('/wallet/transactions', {
      params: { query: { skip, limit: 100 } },
      signal,
    })
    if (!r.data) throwApiError(r.response.status, r.error)
    for (const entry of r.data.transactions) {
      if (
        !seen.has(entry.id) &&
        entry.type === 'AUCTION_SETTLEMENT' &&
        BigInt(entry.amountCents) > 0n
      ) {
        seen.add(entry.id)
        total += BigInt(entry.amountCents)
      }
    }
    if (r.data.skip + r.data.transactions.length >= r.data.total)
      return total.toString()
    if (!r.data.transactions.length)
      throw new Error('Não foi possível consultar todas as liquidações.')
    skip = r.data.skip + r.data.limit
  }
}
