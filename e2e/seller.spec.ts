import { expect, test } from '@playwright/test'
import { login, auction } from './fixtures'
test('imports a real catalog response, creates, edits and cancels own lot', async ({
  page,
}) => {
  let lots: (typeof auction)[] = []
  const scheduled: typeof auction = {
    ...auction,
    currentBidId: null,
    status: 'PUBLISHED',
    lifecycleState: 'SCHEDULED',
    startsAt: '2031-01-01T12:00:00Z',
    endsAt: '2031-01-02T12:00:00Z',
  }
  await page.route('http://localhost:3000/wallet', (r) =>
    r.fulfill({
      json: {
        wallet: {
          balanceCents: '10000',
          reservedCents: '0',
          availableCents: '10000',
        },
      },
    }),
  )
  await page.route('http://localhost:3000/wallet/transactions?**', (r) =>
    r.fulfill({ json: { total: 0, skip: 0, limit: 20, transactions: [] } }),
  )
  await page.route('http://localhost:3000/catalog/products?**', (r) =>
    r.fulfill({ json: { total: 0, skip: 0, limit: 20, products: [] } }),
  )
  await page.route('http://localhost:3000/catalog/external/search?**', (r) =>
    r.fulfill({
      json: {
        total: 1,
        skip: 0,
        limit: 20,
        products: [{ ...auction.productSnapshot, id: 1 }],
      },
    }),
  )
  await page.route('http://localhost:3000/catalog/import/1', (r) =>
    r.fulfill({
      status: 201,
      json: { product: auction.productSnapshot, created: true },
    }),
  )
  await page.route('http://localhost:3000/auctions/mine?**', (r) =>
    r.fulfill({
      json: {
        total: lots.length,
        limit: 20,
        skip: 0,
        asOf: '2026-10-24T16:30:00Z',
        auctions: lots,
      },
    }),
  )
  await page.route('http://localhost:3000/auctions', (r) => {
    expect(r.request().postDataJSON()).toMatchObject({
      productSnapshotId: auction.productSnapshot.id,
      startingBidCents: '10000',
      minIncrementCents: '500',
    })
    lots = [scheduled]
    return r.fulfill({ status: 201, json: { auction: scheduled } })
  })
  await page.route(`http://localhost:3000/auctions/${auction.id}`, (r) => {
    expect(r.request().method()).toBe('PATCH')
    lots = [{ ...scheduled, startingBidCents: '15000' }]
    return r.fulfill({ json: { auction: lots[0] } })
  })
  await page.route(
    `http://localhost:3000/auctions/${auction.id}/cancel`,
    (r) => {
      lots = [
        { ...scheduled, status: 'CANCELLED', lifecycleState: 'CANCELLED' },
      ]
      return r.fulfill({ json: { auction: lots[0] } })
    },
  )
  await login(page, 'AUCTIONEER')
  await page.getByRole('button', { name: 'Buscar na API externa' }).click()
  await page.getByLabel('Buscar produto').fill('camera')
  await page
    .getByRole('button', { name: 'Buscar produtos', exact: true })
    .click()
  await page.getByRole('button', { name: 'Importar e selecionar' }).click()
  await page.getByLabel('Lance inicial (R$)').fill('100')
  await page.getByLabel('Incremento mínimo (R$)').fill('5')
  await page.getByLabel('Início do lote').fill('2031-01-01T12:00')
  await page.getByLabel('Fim do lote').fill('2031-01-02T12:00')
  await page.getByRole('button', { name: 'Publicar lote' }).click()
  await expect(page.getByText('Lote publicado pela plataforma.')).toBeVisible()
  await page.getByRole('button', { name: 'Editar lote' }).click()
  await page.getByLabel('Lance inicial (R$)').fill('150')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(
    page.getByText('Alterações confirmadas pela plataforma.'),
  ).toBeVisible()
  await page.setViewportSize({ width: 375, height: 1000 })
  await page.screenshot({
    path: '.playwright-mcp/seller-375.png',
    fullPage: true,
  })
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Cancelar lote' }).click()
  await expect(page.getByText('Cancelado', { exact: true })).toBeVisible()
})

test('keeps imported products usable during upstream failure and preserves rejected forms', async ({
  page,
}) => {
  await page.route('http://localhost:3000/wallet', (r) =>
    r.fulfill({
      json: {
        wallet: { balanceCents: '0', reservedCents: '0', availableCents: '0' },
      },
    }),
  )
  await page.route('http://localhost:3000/wallet/transactions?**', (r) =>
    r.fulfill({ json: { total: 0, skip: 0, limit: 100, transactions: [] } }),
  )
  await page.route('http://localhost:3000/catalog/products?**', (r) =>
    r.fulfill({
      json: {
        total: 1,
        skip: 0,
        limit: 20,
        products: [auction.productSnapshot],
      },
    }),
  )
  await page.route('http://localhost:3000/catalog/external/search?**', (r) =>
    r.fulfill({
      status: 502,
      json: {
        error: { code: 'UPSTREAM_ERROR', message: 'Fornecedor indisponível' },
      },
    }),
  )
  await page.route('http://localhost:3000/auctions/mine?**', (r) =>
    r.fulfill({
      json: {
        total: 1,
        skip: 0,
        limit: 20,
        asOf: '2026-10-24T16:30:00Z',
        auctions: [auction],
      },
    }),
  )
  await page.route('http://localhost:3000/auctions', (r) =>
    r.fulfill({
      status: 409,
      json: {
        error: {
          code: 'INVALID_AUCTION_DATES',
          message: 'O início deve estar no futuro.',
        },
      },
    }),
  )
  await login(page, 'AUCTIONEER')
  await expect(page.getByRole('button', { name: 'Cancelar lote' })).toHaveCount(
    0,
  )
  await expect(page.getByRole('button', { name: 'Editar lote' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Buscar na API externa' }).click()
  await page.getByLabel('Buscar produto').fill('camera')
  await page
    .getByRole('button', { name: 'Buscar produtos', exact: true })
    .click()
  await expect(
    page.getByText(/pode continuar com produtos já importados/),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Produtos importados', exact: true })
    .click()
  await page.getByRole('button', { name: 'Selecionar para lote' }).click()
  await page.getByLabel('Lance inicial (R$)').fill('100')
  await page.getByLabel('Incremento mínimo (R$)').fill('5')
  await page.getByLabel('Início do lote').fill('2031-01-01T12:00')
  await page.getByLabel('Fim do lote').fill('2031-01-02T12:00')
  await page.getByRole('button', { name: 'Publicar lote' }).click()
  await expect(page.getByRole('alert')).toContainText('futuro')
  await expect(page.getByLabel('Lance inicial (R$)')).toHaveValue('100')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: '.playwright-mcp/seller-form-1440.png',
    fullPage: true,
  })
})
