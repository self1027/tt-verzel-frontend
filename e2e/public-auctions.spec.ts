import { expect, test } from '@playwright/test'
import { auctionId, auction, mockPublicApi } from './fixtures'

test('filters real-contract auction results and opens public details', async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: auction.productSnapshot.title }),
  ).toBeVisible()
  await page
    .getByRole('searchbox', { name: 'Buscar por t\u00edtulo' })
    .fill('rangefinder')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page).toHaveURL(/q=rangefinder/)
  await page.getByRole('link', { name: /Ver lote/ }).click()
  await expect(
    page.getByRole('heading', { name: auction.productSnapshot.title }),
  ).toBeVisible()
  await expect(page.getByText('R$ 12.500,00').first()).toBeVisible()
  await expect(page.getByText('Participante L7K2')).toBeVisible()
  await expect(page.locator('time.countdown')).toBeVisible()
})

test('shows the honest empty state on mobile without horizontal overflow', async ({
  page,
}) => {
  await mockPublicApi(page, true)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Amplie sua busca.' }),
  ).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport)
})

test('starts with live lots and separates scheduled and closed lots without cancelled controls', async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Ao vivo', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Agendados', exact: true }).click()
  await expect(page).toHaveURL(/lifecycleState=SCHEDULED/)
  await expect(
    page.getByRole('button', { name: 'Agendados', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('option', { name: 'Cancelados' })).toHaveCount(0)
})

test('validates price ranges and recovers from a request error', async ({
  page,
}) => {
  await page.route('http://localhost:3000/auctions**', (route) =>
    route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } }),
  )
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeVisible({ timeout: 15000 })
  await mockPublicApi(page)
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(
    page.getByRole('heading', { name: auction.productSnapshot.title }),
  ).toBeVisible()
  await page.getByLabel('Valor do lote a partir de').fill('100')
  await page.getByLabel('Até', { exact: true }).fill('50')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('alert')).toContainText('mínimo deve ser menor')
})

for (const width of [375, 768, 1440]) {
  test(`renders the showcase at ${width}px with keyboard and reduced motion`, async ({
    page,
  }) => {
    await mockPublicApi(page)
    await page.route('http://localhost:3000/auctions?**', (route) =>
      route.fulfill({
        json: {
          total: 4,
          limit: 12,
          skip: 0,
          asOf: '2026-10-24T16:30:00.000Z',
          auctions: Array.from({ length: 4 }, (_, index) => ({
            ...auction,
            id: `${auctionId.slice(0, -1)}${index}`,
            productSnapshot: {
              ...auction.productSnapshot,
              title:
                index === 0
                  ? auction.productSnapshot.title
                  : `Câmera de coleção ${index}`,
              imageUrl: 'https://example.test/missing.jpg',
            },
          })),
        },
      }),
    )
    await page.route('https://example.test/**', (route) =>
      route.fulfill({ status: 404, body: '' }),
    )
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: auction.productSnapshot.title }),
    ).toBeVisible()
    await expect(page.locator('.auction-card')).toHaveCount(3)
    await expect(page.locator('.hero-photo img')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width)
    await page.screenshot({
      path: `test-results/showcase-${width}.png`,
      fullPage: true,
    })
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })
}

test('replaces a failed detail photograph with a readable fallback', async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.route(`http://localhost:3000/auctions/${auctionId}`, (route) =>
    route.fulfill({
      json: {
        auction: {
          ...auction,
          productSnapshot: {
            ...auction.productSnapshot,
            imageUrl: 'https://example.test/unavailable.jpg',
          },
        },
      },
    }),
  )
  await page.route('https://example.test/unavailable.jpg', (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  await page.goto(`/auctions/${auctionId}`)
  await expect(
    page.getByRole('heading', { name: auction.productSnapshot.title }),
  ).toBeVisible()
  await expect(page.locator('.detail-image-wrap img')).toHaveCount(0)
  await expect(
    page.getByText('Imagem do lote indisponível', { exact: true }),
  ).toBeVisible()
})

test('keeps maximum contract amounts readable on narrow detail screens', async ({
  page,
}) => {
  await mockPublicApi(page)
  const maximum = '9223372036854775807'
  await page.route(`http://localhost:3000/auctions/${auctionId}`, (route) =>
    route.fulfill({
      json: { auction: { ...auction, startingBidCents: maximum } },
    }),
  )
  await page.route(
    `http://localhost:3000/auctions/${auctionId}/bids?**`,
    (route) =>
      route.fulfill({
        json: {
          total: 0,
          limit: 30,
          skip: 0,
          bids: [],
          currentBid: null,
          endsAt: auction.endsAt,
          status: 'PUBLISHED',
          asOf: '2026-10-24T16:30:00Z',
        },
      }),
  )
  await page.setViewportSize({ width: 375, height: 1000 })
  await page.goto(`/auctions/${auctionId}`)
  await expect(page.locator('.detail-price')).toHaveText(
    'R$ 92.233.720.368.547.758,07',
  )
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375)
})
