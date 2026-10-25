import { expect, test } from '@playwright/test'
import { login, publicBid, auctionId } from './fixtures'
test('shows own winner and outbid records without inferring public identity', async ({
  page,
}) => {
  await page.route('http://localhost:3000/auctions/bids/mine?**', (route) =>
    route.fulfill({
      json: {
        total: 2,
        limit: 20,
        skip: 0,
        asOf: '2026-10-24T16:30:00Z',
        bids: [
          {
            ...publicBid,
            status: 'SETTLED',
            isLeading: true,
            endsAt: '2026-10-24T16:00:00Z',
          },
          {
            ...publicBid,
            id: 'other',
            sequence: '2',
            amountCents: '10000',
            status: 'PUBLISHED',
            isLeading: false,
            endsAt: '2026-10-31T18:00:00Z',
          },
        ],
      },
    }),
  )
  await login(page)
  await page.getByRole('link', { name: 'Meus arremates', exact: true }).click()
  await expect(page.getByText('Arrematado por você')).toBeVisible()
  await expect(page.getByText('Superado')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Ver comprovante' }),
  ).toHaveAttribute('href', `/auctions/${auctionId}/receipt`)
})
