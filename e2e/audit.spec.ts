import { expect, test } from '@playwright/test'
import { auctionId, auction } from './fixtures'
for (const [status, label] of [
  ['VERIFIED', 'Histórico verificado'],
  ['PENDING_ANCHOR', 'Aguardando ancoragem'],
  ['TAMPERED', 'Adulteração detectada'],
  ['VERIFICATION_UNAVAILABLE', 'Verificação indisponível'],
] as const) {
  test(`distinguishes public audit ${status}`, async ({ page }) => {
    await page.route(
      `http://localhost:3000/auctions/${auctionId}/audit`,
      (route) =>
        route.fulfill({
          status: status === 'VERIFICATION_UNAVAILABLE' ? 503 : 200,
          json: {
            auctionId,
            status,
            localSequence: '1',
            externallyVerifiedSequence: '0',
            externalHeadSequence: null,
            operationalCoverage: 'UNAVAILABLE',
            reason: null,
          },
        }),
    )
    await page.route(
      `http://localhost:3000/auctions/${auctionId}/audit/events?**`,
      (route) =>
        route.fulfill({
          json: {
            auctionId,
            events: [],
            nextAfter: '0',
            limit: 30,
            proof: 'EVENT_PAGE_ONLY',
          },
        }),
    )
    await page.goto(`/auctions/${auctionId}/audit`)
    await expect(
      page.getByRole('heading', { name: label, exact: true }),
    ).toBeVisible()
    await expect(page.getByText(/Cada página de eventos/)).toBeVisible()
  })
}
test('renders public receipt and its frontend sharing link', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    }),
  )
  await page.route(
    `http://localhost:3000/auctions/${auctionId}/receipt`,
    (route) =>
      route.fulfill({
        json: {
          receipt: {
            auctionId,
            productSnapshot: auction.productSnapshot,
            amountCents: '1250000',
            endsAt: auction.endsAt,
            settledAt: '2026-11-01T12:00:00Z',
            settlementId: 'settlement1',
            winningBid: { id: 'bid1', bidderRef: 'L7K2' },
            auditUrl: `/auctions/${auctionId}/audit`,
            receiptUrl: `/auctions/${auctionId}/receipt`,
          },
        },
      }),
  )
  await page.goto(`/auctions/${auctionId}/receipt`)
  await expect(
    page.getByRole('heading', { name: 'Comprovante de arremate' }),
  ).toBeVisible()
  await expect(page.getByText('R$ 12.500,00', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Link do comprovante')).toHaveValue(
    new RegExp(`/auctions/${auctionId}/receipt$`),
  )
  await page.getByRole('button', { name: 'Copiar link' }).click()
  await expect(page.getByRole('status')).toContainText('copie manualmente')
  await page.setViewportSize({ width: 375, height: 1000 })
  await page.screenshot({
    path: '.playwright-mcp/receipt-375.png',
    fullPage: true,
  })
})
for (const status of [404, 409])
  test(`explains unavailable receipt ${status}`, async ({ page }) => {
    await page.route(
      `http://localhost:3000/auctions/${auctionId}/receipt`,
      (route) =>
        route.fulfill({
          status,
          json: {
            error: { code: 'RECEIPT_NOT_AVAILABLE', message: 'Unavailable' },
          },
        }),
    )
    await page.goto(`/auctions/${auctionId}/receipt`)
    await expect(page.getByRole('alert')).toContainText(
      status === 404 ? 'ainda não está disponível' : 'inconsistência',
    )
  })

test('paginates audit evidence and gives tampered event pages precedence', async ({
  page,
}) => {
  await page.route(
    `http://localhost:3000/auctions/${auctionId}/audit`,
    (route) =>
      route.fulfill({
        json: {
          auctionId,
          status: 'VERIFIED',
          localSequence: '1',
          externallyVerifiedSequence: '1',
          externalHeadSequence: '1',
          operationalCoverage: 'CONSISTENT',
          reason: null,
        },
      }),
  )
  await page.route(
    `http://localhost:3000/auctions/${auctionId}/audit/events?**`,
    (route) => {
      const after = new URL(route.request().url()).searchParams.get('after')
      if (after === '1')
        return route.fulfill({
          json: {
            auctionId,
            status: 'TAMPERED',
            reason: 'INVALID_PUBLIC_EVENT',
            events: [],
          },
        })
      return route.fulfill({
        json: {
          auctionId,
          limit: 30,
          nextAfter: '1',
          proof: 'EVENT_PAGE_ONLY',
          events: [
            {
              id: 'event1',
              auctionId,
              sequence: '1',
              eventType: 'AUCTION_CREATED',
              payload: { startingBidCents: '10000' },
              createdAt: '2026-10-24T16:00:00Z',
              previousHash: '0'.repeat(64),
              eventHash: '1'.repeat(64),
              hashVersion: 1,
            },
          ],
        },
      })
    },
  )
  await page.goto(`/auctions/${auctionId}/audit`)
  await page.getByText('Inspecionar registro e hashes').click()
  await expect(page.getByText('1'.repeat(64), { exact: true })).toBeVisible()
  await page.screenshot({
    path: '.playwright-mcp/audit-1440.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Carregar mais eventos' }).click()
  await expect(
    page.getByRole('heading', { name: 'Adulteração detectada', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('página de eventos')
})
