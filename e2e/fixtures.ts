import type { components } from '../src/api/generated/schema'
import { expect, type Page } from '@playwright/test'
export const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'bidder@example.test',
  displayName: 'Participante de teste',
  role: 'BIDDER',
}
export async function login(
  page: import('@playwright/test').Page,
  role = 'BIDDER',
) {
  await page.route('http://localhost:3000/auth/login', (route) =>
    route.fulfill({
      json: {
        accessToken: 'test-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: { ...user, role },
      },
    }),
  )
  await page.route('http://localhost:3000/auth/me', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer test-token')
    return route.fulfill({ json: { user: { ...user, role } } })
  })
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
}

export const auctionId = '2e43c884-7598-4e25-aa3e-36e8ea5f9a14'
export const auction: components['schemas']['Auction'] = {
  id: auctionId,
  auctioneerId: '2e43c884-7598-4e25-aa3e-36e8ea5f9a15',
  productSnapshotId: '2e43c884-7598-4e25-aa3e-36e8ea5f9a16',
  currentBidId: '2e43c884-7598-4e25-aa3e-36e8ea5f9a17',
  startingBidCents: '1000000',
  minIncrementCents: '50000',
  startsAt: '2026-10-23T16:00:00.000Z',
  endsAt: '2026-10-31T18:00:00.000Z',
  status: 'PUBLISHED',
  createdAt: '2026-10-22T16:00:00.000Z',
  updatedAt: '2026-10-24T16:00:00.000Z',
  lifecycleState: 'LIVE',
  productSnapshot: {
    id: '2e43c884-7598-4e25-aa3e-36e8ea5f9a16',
    externalId: 'camera-01',
    source: 'catalog',
    title: 'C\u00e2mera rangefinder de cole\u00e7\u00e3o',
    description:
      'Corpo metálico e lente original. Consulte as condições do lote.',
    imageUrl: null,
    attributes: {},
    capturedAt: '2026-10-22T16:00:00.000Z',
  },
}
export const publicBid = {
  id: '2e43c884-7598-4e25-aa3e-36e8ea5f9a17',
  auctionId,
  bidderRef: 'L7K2',
  amountCents: '1250000',
  sequence: '1',
  createdAt: '2026-10-24T16:30:00.000Z',
}

export async function mockPublicApi(page: Page, empty = false) {
  await page.route('**/socket.io/**', (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  await page.route('http://localhost:3000/auctions**', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === `/auctions/${auctionId}`)
      return route.fulfill({ json: { auction } })
    if (url.pathname === `/auctions/${auctionId}/bids`)
      return route.fulfill({
        json: {
          total: 1,
          limit: 30,
          skip: 0,
          bids: [publicBid],
          currentBid: publicBid,
          endsAt: auction.endsAt,
          status: 'PUBLISHED',
          asOf: '2026-10-24T16:30:00.000Z',
        },
      })
    const auctions = empty ? [] : [auction]
    return route.fulfill({
      json: {
        total: auctions.length,
        limit: 12,
        skip: 0,
        auctions,
        asOf: '2026-10-24T16:30:00.000Z',
      },
    })
  })
}

export async function mockAccountApi(page: Page, role = 'BIDDER') {
  const settled = { ...auction, status: 'SETTLED', lifecycleState: 'SETTLED' }
  const receipt = {
    auctionId,
    productSnapshot: {
      id: auction.productSnapshot.id,
      title: auction.productSnapshot.title,
      description: auction.productSnapshot.description,
      imageUrl: null,
      capturedAt: auction.productSnapshot.capturedAt,
    },
    amountCents: publicBid.amountCents,
    endsAt: auction.endsAt,
    settledAt: '2026-11-01T12:00:00Z',
    settlementId: '00000000-0000-4000-8000-000000000099',
    winningBid: { id: publicBid.id, bidderRef: publicBid.bidderRef },
    auditUrl: `/auctions/${auctionId}/audit`,
    receiptUrl: `/auctions/${auctionId}/receipt`,
  }
  await page.route('**/socket.io/**', (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  await page.route('http://localhost:3000/**', (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname
    if (path === '/wallet')
      return route.fulfill({
        json: {
          wallet: {
            balanceCents: role === 'BIDDER' ? '750000' : '1250000',
            reservedCents: '0',
            availableCents: role === 'BIDDER' ? '750000' : '1250000',
          },
        },
      })
    if (path === '/wallet/transactions')
      return route.fulfill({
        json: {
          total: 1,
          skip: 0,
          limit: 20,
          transactions: [
            {
              id: '00000000-0000-4000-8000-000000000088',
              type: 'AUCTION_SETTLEMENT',
              amountCents: role === 'BIDDER' ? '-1250000' : '1250000',
              createdAt: '2026-11-01T12:00:00Z',
              entries: [],
            },
          ],
        },
      })
    if (path === '/catalog/products')
      return route.fulfill({
        json: {
          total: 1,
          skip: 0,
          limit: 20,
          products: [auction.productSnapshot],
        },
      })
    if (path === '/auctions/bids/mine')
      return route.fulfill({
        json: {
          total: 1,
          limit: 20,
          skip: 0,
          bids: [
            {
              ...publicBid,
              status: 'SETTLED',
              isLeading: true,
              endsAt: auction.endsAt,
            },
          ],
          asOf: '2026-11-01T12:00:00Z',
        },
      })
    if (path.endsWith('/receipt')) return route.fulfill({ json: { receipt } })
    if (path.endsWith('/audit/events'))
      return route.fulfill({
        json: {
          auctionId,
          events: [],
          nextAfter: '0',
          limit: 30,
          proof: 'EVENT_PAGE_ONLY',
        },
      })
    if (path.endsWith('/audit'))
      return route.fulfill({
        json: {
          auctionId,
          status: 'VERIFIED',
          localSequence: '3',
          externallyVerifiedSequence: '3',
          externalHeadSequence: '3',
          operationalCoverage: 'CONSISTENT',
          reason: null,
        },
      })
    if (path.endsWith('/bids'))
      return route.fulfill({
        json: {
          total: 1,
          limit: 30,
          skip: 0,
          bids: [publicBid],
          currentBid: publicBid,
          endsAt: auction.endsAt,
          status: 'SETTLED',
          asOf: '2026-11-01T12:00:00Z',
        },
      })
    if (path === `/auctions/${auctionId}`)
      return route.fulfill({ json: { auction: settled } })
    if (path === '/auctions' || path === '/auctions/mine')
      return route.fulfill({
        json: {
          total: 1,
          limit: 20,
          skip: 0,
          auctions: [settled],
          asOf: '2026-11-01T12:00:00Z',
        },
      })
    return route.fulfill({
      status: 404,
      json: {
        error: { code: 'NOT_FOUND', message: 'Rota não prevista no teste' },
      },
    })
  })
}
