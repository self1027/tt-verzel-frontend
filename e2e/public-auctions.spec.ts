import { expect, test } from '@playwright/test'
import { auctionId, auction, mockPublicApi } from './fixtures'

test('contains large product images inside their frames at every viewport', async ({
  page,
}) => {
  await mockPublicApi(page)
  const imageUrl = 'https://images.example.test/large-product.svg'
  const illustrated = {
    ...auction,
    productSnapshot: { ...auction.productSnapshot, imageUrl },
  }
  await page.route(imageUrl, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3200"><rect width="2400" height="3200" fill="red"/></svg>',
    }),
  )
  await page.route('http://localhost:3000/auctions**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === `/auctions/${auctionId}`)
      return route.fulfill({ json: { auction: illustrated } })
    if (path === '/auctions')
      return route.fulfill({
        json: {
          auctions: [
            illustrated,
            { ...illustrated, id: '2e43c884-7598-4e25-aa3e-36e8ea5f9a18' },
          ],
          total: 2,
          limit: 12,
          skip: 0,
        },
      })
    return route.fallback()
  })
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of ['/', `/auctions/${auctionId}`]) {
      await page.goto(path)
      const images = page.locator('.hero-photo img, .card-image, .detail-image')
      await expect(images.first()).toBeVisible()
      await expect
        .poll(() =>
          images.evaluateAll((nodes) =>
            nodes.every((node) => {
              const image = node as HTMLImageElement
              const frame = image.parentElement!
              const rect = image.getBoundingClientRect()
              const bounds = frame.getBoundingClientRect()
              const style = getComputedStyle(frame)
              return (
                image.complete &&
                image.naturalWidth > 0 &&
                rect.left >= bounds.left + parseFloat(style.paddingLeft) - 1 &&
                rect.right <=
                  bounds.right - parseFloat(style.paddingRight) + 1 &&
                rect.top >= bounds.top + parseFloat(style.paddingTop) - 1 &&
                rect.bottom <=
                  bounds.bottom - parseFloat(style.paddingBottom) + 1
              )
            }),
          ),
        )
        .toBe(true)
    }
  }
})

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

test('explains empty finalizing and settled tabs and distinguishes active filters', async ({
  page,
}) => {
  await mockPublicApi(page, true)
  await page.goto('/?lifecycleState=FINALIZING')
  await expect(
    page.getByRole('heading', { name: 'Nenhum lote em encerramento agora.' }),
  ).toBeVisible()
  await expect(
    page.getByText('O prazo terminou e o resultado está sendo processado.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Finalizados', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Nenhum arremate finalizado por aqui ainda.',
    }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Esta aba reúne os lotes arrematados com liquidação concluída.',
    ),
  ).toBeVisible()
  await page.getByRole('searchbox').fill('câmera')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Nenhum arremate corresponde aos filtros.',
    }),
  ).toBeVisible()
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
