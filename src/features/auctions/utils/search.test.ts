import { describe, expect, it } from 'vitest'
import {
  parseAuctionSearch,
  serializeAuctionSearch,
  type AuctionSearch,
} from './search'

describe('auction URL search state', () => {
  it('serializes only valid filters using backend names and retains server offset', () => {
    const state: AuctionSearch = {
      q: 'watch',
      lifecycleState: 'LIVE',
      minPriceCents: '1000',
      maxPriceCents: undefined,
      sort: 'endsAt_asc',
      page: 2,
      limit: 12,
      skip: 12,
    }
    expect(serializeAuctionSearch(state)).toBe(
      '?q=watch&lifecycleState=LIVE&minPriceCents=1000&sort=endsAt_asc&page=2',
    )
  })

  it('defaults invalid query values and preserves supported filters', () => {
    expect(
      parseAuctionSearch(
        new URLSearchParams(
          'page=-2&limit=999&sort=price_up&lifecycleState=INVALID&q=ring',
        ),
      ),
    ).toEqual({
      q: 'ring',
      lifecycleState: undefined,
      minPriceCents: undefined,
      maxPriceCents: undefined,
      sort: undefined,
      page: 1,
      limit: 12,
      skip: 0,
    })
  })

  it('uses backend skip response as the page source', () => {
    const query = new URLSearchParams('page=3')
    expect(parseAuctionSearch(query, 20, 10).page).toBe(3)
  })
})

it('preserves custom limit and bounds backend offset', () => {
  const search = parseAuctionSearch(
    new URLSearchParams('limit=20&page=999999999999'),
  )
  expect(search.skip).toBeLessThanOrEqual(2147483647)
  expect(serializeAuctionSearch(search)).toContain('limit=20')
})
