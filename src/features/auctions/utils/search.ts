import type { components } from '@/api/generated/schema'

export type LifecycleState = components['schemas']['LifecycleState']
export type AuctionSort =
  'price_asc' | 'price_desc' | 'endsAt_asc' | 'endsAt_desc'
export type AuctionSearch = {
  q: string
  lifecycleState: LifecycleState | undefined
  minPriceCents: string | undefined
  maxPriceCents: string | undefined
  sort: AuctionSort | undefined
  page: number
  limit: number
  skip: number
}

const lifecycleStates = [
  'SCHEDULED',
  'LIVE',
  'FINALIZING',
  'CANCELLED',
  'SETTLED',
  'CLOSED_NO_BIDS',
] as const satisfies readonly LifecycleState[]
const sorts = ['price_asc', 'price_desc', 'endsAt_asc', 'endsAt_desc'] as const

export function parseAuctionSearch(
  params: URLSearchParams,
  skip?: number,
  limit = 12,
): AuctionSearch {
  const page = Number(params.get('page'))
  const requestedLimit = Number(params.get('limit'))
  const selectedState = params.get('lifecycleState')
  const selectedSort = params.get('sort')
  const minimum = params.get('minPriceCents')
  const maximum = params.get('maxPriceCents')
  const validLimit =
    Number.isInteger(requestedLimit) &&
    requestedLimit >= 1 &&
    requestedLimit <= 100
      ? requestedLimit
      : limit
  const validPage = Number.isSafeInteger(page) && page >= 1 ? page : 1
  const requestedSkip =
    Number.isInteger(skip) && skip! >= 0 ? skip! : (validPage - 1) * validLimit
  const validSkip = requestedSkip <= 2147483647 ? requestedSkip : 0
  return {
    q: params.get('q') ?? '',
    lifecycleState: lifecycleStates.includes(selectedState as LifecycleState)
      ? (selectedState as LifecycleState)
      : undefined,
    minPriceCents:
      minimum &&
      /^(0|[1-9]\d*)$/.test(minimum) &&
      BigInt(minimum) <= 9223372036854775807n
        ? minimum
        : undefined,
    maxPriceCents:
      maximum &&
      /^(0|[1-9]\d*)$/.test(maximum) &&
      BigInt(maximum) <= 9223372036854775807n
        ? maximum
        : undefined,
    sort: sorts.includes(selectedSort as AuctionSort)
      ? (selectedSort as AuctionSort)
      : undefined,
    page: Math.floor(validSkip / validLimit) + 1,
    limit: validLimit,
    skip: validSkip,
  }
}

export function serializeAuctionSearch(state: AuctionSearch): string {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  if (state.lifecycleState) params.set('lifecycleState', state.lifecycleState)
  if (state.minPriceCents) params.set('minPriceCents', state.minPriceCents)
  if (state.maxPriceCents) params.set('maxPriceCents', state.maxPriceCents)
  if (state.sort) params.set('sort', state.sort)
  if (state.limit !== 12) params.set('limit', String(state.limit))
  if (state.page > 1) params.set('page', String(state.page))
  const query = params.toString()
  return query ? `?${query}` : ''
}
