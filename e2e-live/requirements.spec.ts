import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test'

const api = process.env.RECRUITER_API_URL ?? 'http://localhost:3000'
const accounts = {
  seller: [
    'auctioneer@verzel.local',
    process.env.SEED_AUCTIONEER_PASSWORD ?? 'AuctioneerDemo2026!',
  ],
  first: [
    'bidder1@verzel.local',
    process.env.SEED_BIDDER1_PASSWORD ?? 'BidderOneDemo2026!',
  ],
  second: [
    'bidder2@verzel.local',
    process.env.SEED_BIDDER2_PASSWORD ?? 'BidderTwoDemo2026!',
  ],
}
type Account = keyof typeof accounts
async function uiLogin(page: Page, name: Account, returnTo = '/') {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await page.getByLabel('E-mail').fill(accounts[name][0]!)
  // fill(secret) exposes the value in HTML report step titles, even without traces.
  await page
    .getByLabel('Senha', { exact: true })
    .evaluate((input, password) => {
      ;(input as HTMLInputElement).value = password
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }, accounts[name][1]!)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  // FormData was captured on submit; remove secrets before any failure snapshot.
  await page.locator('input[type="password"]').evaluateAll((inputs) => {
    for (const input of inputs) (input as HTMLInputElement).value = ''
  })
  await expect(
    page.getByRole('button', { name: 'Sair', exact: true }),
  ).toBeVisible()
}
async function apiLogin(request: APIRequestContext, name: Account) {
  const response = await request.post(`${api}/auth/login`, {
    data: { email: accounts[name][0], password: accounts[name][1] },
  })
  expect(response.status(), `login ${name}; confira as senhas SEED_*`).toBe(200)
  return (await response.json()).accessToken as string
}

test('PDF p3/p6 | filtros reais, temas persistentes e largura mobile', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Seu próximo arremate.' }),
  ).toBeVisible()
  for (const state of [
    'Agendados',
    'Finalizados',
    'Encerrados sem lances',
    'Ao vivo',
  ]) {
    await page.getByRole('button', { name: state, exact: true }).click()
    await expect(
      page.getByRole('button', { name: state, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
  }
  await page
    .getByLabel('Buscar por título')
    .fill(`recrutador-ausente-${Date.now()}`)
  const filtered = page.waitForResponse(
    (response) =>
      response.url().startsWith(`${api}/auctions?`) &&
      response.url().includes('q=') &&
      response.status() === 200,
  )
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  expect((await (await filtered).json()).total).toBe(0)
  const theme = await page.locator('html').getAttribute('data-theme')
  await page.getByRole('button', { name: 'Tema escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    theme === 'dark' ? 'light' : 'dark',
  )
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    theme === 'dark' ? 'light' : 'dark',
  )
  await page.setViewportSize({ width: 375, height: 812 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('PDF p2/p3 | vendedor publica, edita e cancela pela interface real', async ({
  page,
  request,
}, testInfo) => {
  await uiLogin(page, 'seller')
  await expect(
    page.getByRole('heading', { name: 'Seus lotes, em boas mãos.' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Buscar na API externa', exact: true })
    .click()
  await page.getByLabel('Buscar produto', { exact: true }).fill('phone')
  const searched = page.waitForResponse((response) =>
    response.url().includes('/catalog/external/search?'),
  )
  await page
    .getByRole('button', { name: 'Buscar produtos', exact: true })
    .click()
  expect(
    (await searched).status(),
    'DummyJSON deve estar acessível para importar um produto novo',
  ).toBe(200)
  const imported = page.waitForResponse(
    (response) =>
      response.url().includes('/catalog/import/') &&
      response.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Importar e selecionar' })
    .first()
    .click()
  expect([200, 201]).toContain((await imported).status())
  await page.getByLabel('Lance inicial (R$)').fill('1,00')
  await page.getByLabel('Incremento mínimo (R$)').fill('0,10')
  // Use local calendar fields, matching the UI's timezone conversion.
  const start = new Date(Date.now() + 3600000)
  const end = new Date(Date.now() + 7200000)
  const date = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  const time = (value: Date) =>
    `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
  await page.getByLabel('Data de início do lote').fill(date(start))
  await page.getByLabel('Hora de início do lote').fill(time(start))
  await page.getByLabel('Data de fim do lote').fill(date(end))
  await page.getByLabel('Hora de fim do lote').fill(time(end))
  const created = page.waitForResponse(
    (response) =>
      response.url() === `${api}/auctions` &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Publicar lote', exact: true }).click()
  const response = await created
  expect(response.status()).toBe(201)
  const { auction } = await response.json()
  const row = page
    .locator('li')
    .filter({ has: page.locator(`a[href="/auctions/${auction.id}"]`) })
  await row.getByRole('button', { name: 'Editar lote', exact: true }).click()
  await page.getByLabel('Incremento mínimo (R$)').fill('0,20')
  const edited = page.waitForResponse(
    (response) =>
      response.url() === `${api}/auctions/${auction.id}` &&
      response.request().method() === 'PATCH',
  )
  await page
    .getByRole('button', { name: 'Salvar alterações', exact: true })
    .click()
  expect((await (await edited).json()).auction.minIncrementCents).toBe('20')
  page.once('dialog', (dialog) => dialog.accept())
  const cancelled = page.waitForResponse(
    (response) => response.url() === `${api}/auctions/${auction.id}/cancel`,
  )
  await row.getByRole('button', { name: 'Cancelar lote', exact: true }).click()
  expect((await (await cancelled).json()).auction.status).toBe('CANCELLED')
  expect(
    (
      await (await request.get(`${api}/auctions?limit=100`)).json()
    ).auctions.map((lot: { id: string }) => lot.id),
  ).not.toContain(auction.id)
  await testInfo.attach('lote-cancelado', {
    body: auction.id,
    contentType: 'text/plain',
  })
})

test('PDF p2–6 | jornada real: vendedor, dois licitantes, reservas, anti-sniping e comprovante', async ({
  page,
  browser,
  request,
  baseURL,
}, testInfo) => {
  const tokens = {
    seller: await apiLogin(request, 'seller'),
    first: await apiLogin(request, 'first'),
    second: await apiLogin(request, 'second'),
  }
  async function get(path: string, name?: Account) {
    const response = await request.get(`${api}${path}`, {
      headers: name ? { Authorization: `Bearer ${tokens[name]}` } : {},
    })
    expect(response.status(), path).toBe(200)
    return response.json()
  }
  async function post(
    path: string,
    data: object,
    name: Account,
    status = 201,
    key = crypto.randomUUID(),
  ) {
    const response = await request.post(`${api}${path}`, {
      headers: {
        Authorization: `Bearer ${tokens[name]}`,
        'Idempotency-Key': key,
      },
      data,
    })
    expect(response.status(), `${path}: ${await response.text()}`).toBe(status)
    return response.json()
  }
  async function rejected(
    path: string,
    data: object,
    name: Account,
    status: number,
    code: string,
  ) {
    const body = await post(path, data, name, status)
    expect(body.error.code).toBe(code)
  }
  const notes: Record<string, unknown> = {
    api,
    baseURL,
    startedAt: new Date().toISOString(),
    mockedResponses: false,
  }
  let id = ''
  const secondContext = await browser.newContext({ baseURL })
  const second = await secondContext.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  second.on('pageerror', (error) => pageErrors.push(error.message))
  try {
    await test.step('R01/R02/R03: autorização, catálogo local e cancelamento de lote próprio sem lances', async () => {
      const anonymous = await request.get(`${api}/wallet`)
      expect(anonymous.status()).toBe(401)
      const products = await get('/catalog/products?limit=100', 'seller')
      expect(
        products.products.length,
        'Execute npm run db:seed',
      ).toBeGreaterThan(0)
      notes.snapshot = products.products[0].id
      const now = Date.now()
      const terms = {
        productSnapshotId: notes.snapshot,
        startingBidCents: '100',
        minIncrementCents: '10',
        startsAt: new Date(now + 60000).toISOString(),
        endsAt: new Date(now + 3600000).toISOString(),
      }
      await rejected('/auctions', terms, 'first', 403, 'FORBIDDEN')
      const { auction } = await post('/auctions', terms, 'seller')
      notes.cancelledLot = auction.id
      await rejected(
        `/auctions/${auction.id}/bids`,
        { amountCents: '100' },
        'first',
        409,
        'AUCTION_NOT_LIVE',
      )
      const cancelled = await post(
        `/auctions/${auction.id}/cancel`,
        {},
        'seller',
        200,
      )
      expect(cancelled.auction.status).toBe('CANCELLED')
      expect(
        (await get('/auctions?limit=100')).auctions.map(
          (lot: { id: string }) => lot.id,
        ),
      ).not.toContain(auction.id)
    })
    await test.step('R04/R05/R06: login e depósito real pela interface', async () => {
      await uiLogin(page, 'first')
      await uiLogin(second, 'second')
      for (const [current, name] of [
        [page, 'first'],
        [second, 'second'],
      ] as const) {
        const before = (await get('/wallet', name)).wallet
        await current
          .getByRole('link', { name: 'Carteira', exact: true })
          .click()
        await current.getByLabel('Valor do depósito (R$)').fill('10,00')
        await current
          .getByRole('button', { name: 'Depositar saldo simulado' })
          .click()
        await expect(
          current.getByText('Depósito confirmado pela plataforma.'),
        ).toBeVisible()
        const after = (await get('/wallet', name)).wallet
        expect(BigInt(after.balanceCents) - BigInt(before.balanceCents)).toBe(
          1000n,
        )
        notes[`${name}BeforeBid`] = after
      }
    })
    await test.step('R03/R07: publicar lote com prazo curto e rejeitar lance de leiloeiro', async () => {
      const now = Date.now()
      const { auction } = await post(
        '/auctions',
        {
          productSnapshotId: notes.snapshot,
          startingBidCents: '100',
          minIncrementCents: '10',
          startsAt: new Date(now + 1500).toISOString(),
          endsAt: new Date(now + 30000).toISOString(),
        },
        'seller',
      )
      id = auction.id
      notes.auctionId = id
      notes.originalEndsAt = auction.endsAt
      await expect
        .poll(async () => (await get(`/auctions/${id}`)).auction.lifecycleState)
        .toBe('LIVE')
      await rejected(
        `/auctions/${id}/bids`,
        { amountCents: '100' },
        'seller',
        403,
        'FORBIDDEN',
      )
      // Sessions live in memory; a full navigation requires a fresh login.
      await uiLogin(page, 'first', `/auctions/${id}`)
      await uiLogin(second, 'second', `/auctions/${id}`)
      await expect(page.getByLabel('Seu lance (R$)')).toBeEnabled()
    })
    await test.step('R07/R08/R09/R10: mínimo, primeiro lance, reserva, líder e extensão de 120s', async () => {
      await page.getByLabel('Seu lance (R$)').fill('0,99')
      await page.getByRole('button', { name: 'Confirmar lance' }).click()
      await expect(page.getByRole('alert')).toContainText('mínimo')
      await rejected(
        `/auctions/${id}/bids`,
        { amountCents: '99' },
        'first',
        409,
        'BID_TOO_LOW',
      )
      await page.getByLabel('Seu lance (R$)').fill('1,00')
      await page.getByRole('button', { name: 'Confirmar lance' }).click()
      await expect(
        page.getByText('Você está ganhando.', { exact: true }),
      ).toBeVisible()
      const first = await get(`/auctions/${id}/bids`)
      expect(first.total).toBe(1)
      expect(
        Date.parse(first.endsAt) - Date.parse(notes.originalEndsAt as string),
      ).toBe(120000)
      const wallet = (await get('/wallet', 'first')).wallet
      const before = notes.firstBeforeBid as typeof wallet
      expect(BigInt(wallet.reservedCents) - BigInt(before.reservedCents)).toBe(
        100n,
      )
      expect(BigInt(wallet.availableCents)).toBe(
        BigInt(wallet.balanceCents) - BigInt(wallet.reservedCents),
      )
      await rejected(
        `/auctions/${id}/bids`,
        { amountCents: '110' },
        'first',
        409,
        'ALREADY_LEADING',
      )
      await rejected(
        `/auctions/${id}/bids`,
        { amountCents: '109' },
        'second',
        409,
        'BID_TOO_LOW',
      )
      const available = BigInt(
        (await get('/wallet', 'second')).wallet.availableCents,
      )
      await rejected(
        `/auctions/${id}/bids`,
        { amountCents: String(available + 1000n) },
        'second',
        409,
        'INSUFFICIENT_FUNDS',
      )
    })
    await test.step('R08/R09: segundo usuário supera; primeira tela atualiza sem reload e libera reserva', async () => {
      await expect(second.getByLabel('Seu lance (R$)')).toBeEnabled()
      await second.getByLabel('Seu lance (R$)').fill('1,10')
      await second.getByRole('button', { name: 'Confirmar lance' }).click()
      await expect(
        second.getByText('Você está ganhando.', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByText('Você foi superado.', { exact: true }),
      ).toBeVisible()
      const wallet = (await get('/wallet', 'first')).wallet
      expect(wallet.reservedCents).toBe(
        (notes.firstBeforeBid as typeof wallet).reservedCents,
      )
      expect((await get(`/auctions/${id}/bids`)).total).toBe(2)
      await rejected(
        `/auctions/${id}/cancel`,
        {},
        'seller',
        409,
        'AUCTION_HAS_BIDS',
      )
      notes.walletBeforeSettlement = (await get('/wallet', 'second')).wallet
      notes.sellerBeforeSettlement = (await get('/wallet', 'seller')).wallet
    })
    await test.step('R11/R12/R13: aguardar worker, conferir transferência e comprovante público sem dados pessoais', async () => {
      await expect
        .poll(
          async () => (await get(`/auctions/${id}`)).auction.lifecycleState,
          { timeout: 180000, intervals: [2000] },
        )
        .toBe('SETTLED')
      const winner = (await get('/wallet', 'second')).wallet
      const seller = (await get('/wallet', 'seller')).wallet
      const previous = notes.walletBeforeSettlement as typeof winner
      const previousSeller = notes.sellerBeforeSettlement as typeof seller
      expect(BigInt(previous.balanceCents) - BigInt(winner.balanceCents)).toBe(
        110n,
      )
      expect(
        BigInt(seller.balanceCents) - BigInt(previousSeller.balanceCents),
      ).toBe(110n)
      const receipt = await get(`/auctions/${id}/receipt`)
      expect(receipt.receipt.amountCents).toBe('110')
      const publicData = JSON.stringify([
        receipt,
        await get(`/auctions/${id}/bids`),
        await get(`/auctions/${id}/audit/events`),
      ])
      expect(publicData).not.toMatch(
        /@verzel\.local|password|accessToken|displayName/,
      )
      await page.getByRole('button', { name: 'Sair', exact: true }).click()
      await page.goto(`/auctions/${id}/receipt`)
      await expect(
        page.getByRole('heading', { name: /Comprovante/ }),
      ).toBeVisible()
      const publicReceipt = page.getByRole('region', {
        name: 'Dados do arremate',
      })
      await expect(publicReceipt).toContainText(id)
      await expect(publicReceipt).toContainText(/R\$\s*1,10/)
      await expect(page.getByLabel('Link do comprovante')).toHaveValue(
        `${baseURL}/auctions/${id}/receipt`,
      )
      await page.goto(`/auctions/${id}/audit`)
      await expect(
        page.getByText('Histórico verificado', { exact: true }),
      ).toBeVisible()
      notes.receipt = `/auctions/${id}/receipt`
      notes.audit = `/auctions/${id}/audit`
    })
    await test.step('R05: meus arremates do vencedor e painel do vendedor com resultado', async () => {
      await second
        .getByRole('link', { name: 'Meus arremates', exact: true })
        .click()
      await expect(
        second.locator(`a[href="/auctions/${id}/receipt"]`),
      ).toBeVisible()
      await uiLogin(page, 'seller')
      await page.getByRole('link', { name: /Painel do leiloeiro/ }).click()
      await expect(
        page.getByText('Total recebido em liquidações'),
      ).toBeVisible()
      const sellerRow = page
        .locator('li')
        .filter({ has: page.locator(`a[href="/auctions/${id}"]`) })
      await expect(sellerRow).toContainText(/Arrematado por\s+R\$\s*1,10/)
      await expect(
        sellerRow.locator(`a[href="/auctions/${id}/receipt"]`),
      ).toBeVisible()
      expect(pageErrors).toEqual([])
    })
  } finally {
    notes.finishedAt = new Date().toISOString()
    notes.pageErrors = pageErrors
    await testInfo.attach('resultado-sem-credenciais', {
      body: JSON.stringify(notes, null, 2),
      contentType: 'application/json',
    })
    await secondContext.close()
  }
})
