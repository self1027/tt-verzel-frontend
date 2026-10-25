import { api, ApiError, throwApiError } from '@/api/client'
import type { components } from '@/api/generated/schema'
export const positionKey = (userId: string, auctionId: string) =>
  ['private', userId, 'position', auctionId] as const
export async function getOwnBids(
  skip: number,
  signal?: AbortSignal,
  limit = 20,
) {
  const result = await api.GET('/auctions/bids/mine', {
    params: { query: { skip, limit } },
    signal,
  })
  if (!result.data) throwApiError(result.response.status, result.error)
  return result.data
}
export async function getPosition(auctionId: string, signal?: AbortSignal) {
  let latest: components['schemas']['OwnBid'] | null = null
  let skip = 0
  // The contract has no auction filter; inspect all pages before claiming no leadership.
  while (true) {
    const page = await getOwnBids(skip, signal, 100)
    for (const bid of page.bids) {
      if (bid.auctionId !== auctionId) continue
      if (bid.isLeading) return bid
      if (!latest || BigInt(bid.sequence) > BigInt(latest.sequence))
        latest = bid
    }
    if (page.skip + page.bids.length >= page.total) return latest
    if (!page.bids.length)
      throw new Error(
        'Sua posição não pôde ser confirmada. Atualize novamente.',
      )
    skip = page.skip + page.limit
  }
}
const errors: Record<string, string> = {
  BID_TOO_LOW: 'O lance está abaixo do mínimo. Confira o valor atualizado.',
  INSUFFICIENT_FUNDS:
    'Saldo disponível insuficiente. Adicione saldo à carteira.',
  ALREADY_LEADING: 'Você já está ganhando e não pode cobrir o próprio lance.',
  AUCTION_NOT_LIVE: 'O lote ainda não começou ou já foi encerrado.',
  INVALID_AUCTION_STATE: 'O lote não está disponível para lances.',
  IDEMPOTENCY_CONFLICT:
    'Esta tentativa conflita com uma operação anterior. Atualize os dados antes de tentar novamente.',
}
export async function placeBid(
  auctionId: string,
  amountCents: string,
  key: string,
) {
  const result = await api.POST('/auctions/{auctionId}/bids', {
    params: { path: { auctionId }, header: { 'Idempotency-Key': key } },
    body: { amountCents },
  })
  if (!result.data) {
    try {
      throwApiError(result.response.status, result.error)
    } catch (cause) {
      if (cause instanceof ApiError)
        throw new ApiError(
          cause.status,
          errors[cause.code ?? ''] ?? cause.message,
          cause.code,
        )
      throw cause
    }
  }
  return result.data.bid
}
