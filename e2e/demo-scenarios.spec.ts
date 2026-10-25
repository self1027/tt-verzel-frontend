import { expect, test } from '@playwright/test'
import { auction, auctionId, mockPublicApi } from './fixtures'

test('demonstration labels appear in the showcase and direct historical detail', async ({
  page,
}) => {
  await mockPublicApi(page)
  const demo = {
    ...auction,
    productSnapshot: {
      ...auction.productSnapshot,
      attributes: { demoSeedVersion: 3, demoScenario: 'live-bids' },
    },
  }
  await page.route('http://localhost:3000/auctions?**', (route) =>
    route.fulfill({
      json: {
        auctions: [demo],
        total: 1,
        skip: 0,
        limit: 12,
        asOf: '2026-10-25T12:00:00Z',
      },
    }),
  )
  await page.route(`http://localhost:3000/auctions/${auctionId}`, (route) =>
    route.fulfill({ json: { auction: demo } }),
  )
  await page.goto('/')
  await expect(page.getByText('Demonstração: disputa com lances')).toBeVisible()
  await page.goto(`/auctions/${auctionId}`)
  await expect(page.getByText('Demonstração: disputa com lances')).toBeVisible()
})
