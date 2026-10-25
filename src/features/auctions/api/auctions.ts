import { api, throwApiError } from '@/api/client'
import type { components, operations } from '@/api/generated/schema'
import type { AuctionSearch } from '../utils/search'

export type Auction = components['schemas']['Auction']
export type AuctionPage = components['schemas']['AuctionPage']
export type PublicBidPage = components['schemas']['PublicBidPage']

type AuctionQuery = NonNullable<
  operations['get_auctions']['parameters']['query']
>

export async function getAuctions(
  search: AuctionSearch,
  signal?: AbortSignal,
): Promise<AuctionPage> {
  const query: AuctionQuery = {
    q: search.q || undefined,
    lifecycleState: search.lifecycleState,
    minPriceCents: search.minPriceCents,
    maxPriceCents: search.maxPriceCents,
    sort: search.sort,
    page: search.page,
    limit: search.limit,
  }
  const { data, error, response } = await api.GET('/auctions', {
    params: { query },
    signal,
  })
  if (error || !data) throwApiError(response.status, error)
  return data
}

export async function getAuction(
  id: string,
  signal?: AbortSignal,
): Promise<Auction> {
  const { data, error, response } = await api.GET('/auctions/{id}', {
    params: { path: { id } },
    signal,
  })
  if (error || !data) throwApiError(response.status, error)
  return data.auction
}

export async function getPublicBids(
  id: string,
  signal?: AbortSignal,
  skip = 0,
): Promise<PublicBidPage> {
  const { data, error, response } = await api.GET(
    '/auctions/{auctionId}/bids',
    {
      params: { path: { auctionId: id }, query: { limit: 30, skip } },
      signal,
    },
  )
  if (error || !data) throwApiError(response.status, error)
  return data
}
