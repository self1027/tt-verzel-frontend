import { expect, test } from '@playwright/test'
import { auctionId, publicBid, login, mockPublicApi } from './fixtures'
test('submits an exact bid and reports server leadership, then a rejection', async ({
  page,
}) => {
  let leading = false
  await mockPublicApi(page)
  await page.route('http://localhost:3000/wallet', (route) =>
    route.fulfill({
      json: {
        wallet: {
          balanceCents: '9999999',
          reservedCents: '0',
          availableCents: '9999999',
        },
      },
    }),
  )
  await page.route('http://localhost:3000/auctions/bids/mine?**', (route) =>
    route.fulfill({
      json: {
        total: leading ? 1 : 0,
        limit: 100,
        skip: 0,
        asOf: '2026-10-24T16:30:00Z',
        bids: leading
          ? [
              {
                ...publicBid,
                endsAt: '2026-10-31T18:02:00Z',
                status: 'PUBLISHED',
                isLeading: true,
              },
            ]
          : [],
      },
    }),
  )
  let attempts = 0
  await page.route(
    `http://localhost:3000/auctions/${auctionId}/bids**`,
    async (route) => {
      if (route.request().method() === 'GET')
        return route.fulfill({
          json: {
            total: 1,
            limit: 30,
            skip: 0,
            bids: [publicBid],
            currentBid: publicBid,
            endsAt: '2026-10-31T18:02:00Z',
            status: 'PUBLISHED',
            asOf: '2026-10-24T16:30:00Z',
          },
        })
      expect(route.request().postDataJSON()).toEqual({ amountCents: '1300000' })
      expect(route.request().headers()['idempotency-key']).toBeTruthy()
      attempts++
      if (attempts === 1)
        return route.fulfill({
          status: 409,
          json: { error: { code: 'BID_TOO_LOW', message: 'Bid too low' } },
        })
      leading = true
      return route.fulfill({
        status: 201,
        json: { bid: { ...publicBid, endsAt: '2026-10-31T18:02:00Z' } },
      })
    },
  )
  await login(page)
  await page.getByRole('link', { name: 'Explorar leilões' }).click()
  await page.getByRole('link', { name: /Ver lote/ }).click()
  await page.getByLabel('Seu lance (R$)').fill('13000')
  await page.getByRole('button', { name: 'Confirmar lance' }).click()
  await expect(page.getByRole('alert')).toContainText('mínimo')
  await page.getByRole('button', { name: 'Confirmar lance' }).click()
  await expect(
    page.getByText('Você está ganhando.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Lance confirmado pela plataforma.'),
  ).toBeVisible()
  await expect(page.getByText(/Conexão.*atualização periódica/)).toBeVisible()
  await page.screenshot({
    path: '.playwright-mcp/room-1440.png',
    fullPage: true,
  })
})

test('retries the original bid intent after an accepted response is lost and minimum moves', async ({
  page,
}) => {
  await mockPublicApi(page)
  let accepted = false
  const keys: string[] = []
  const next = {
    ...publicBid,
    id: '00000000-0000-4000-8000-000000000077',
    amountCents: '1300000',
    sequence: '2',
  }
  await page.route('http://localhost:3000/wallet', (route) =>
    route.fulfill({
      json: {
        wallet: {
          balanceCents: '9999999',
          reservedCents: accepted ? '1300000' : '0',
          availableCents: accepted ? '8699999' : '9999999',
        },
      },
    }),
  )
  await page.route('http://localhost:3000/auctions/bids/mine?**', (route) =>
    route.fulfill({
      json: {
        total: accepted ? 1 : 0,
        limit: 100,
        skip: 0,
        asOf: '2026-10-24T16:30:00Z',
        bids: accepted
          ? [
              {
                ...next,
                status: 'PUBLISHED',
                isLeading: true,
                endsAt: '2026-10-31T18:02:00Z',
              },
            ]
          : [],
      },
    }),
  )
  await page.route(
    `http://localhost:3000/auctions/${auctionId}/bids**`,
    (route) => {
      if (route.request().method() === 'GET')
        return route.fulfill({
          json: {
            total: 1,
            limit: 30,
            skip: 0,
            bids: [accepted ? next : publicBid],
            currentBid: accepted ? next : publicBid,
            endsAt: '2026-10-31T18:02:00Z',
            status: 'PUBLISHED',
            asOf: '2026-10-24T16:30:00Z',
          },
        })
      expect(route.request().postDataJSON()).toEqual({ amountCents: '1300000' })
      keys.push(route.request().headers()['idempotency-key']!)
      accepted = true
      if (keys.length === 1) return route.abort()
      return route.fulfill({
        status: 201,
        json: { bid: { ...next, endsAt: '2026-10-31T18:02:00Z' } },
      })
    },
  )
  await login(page)
  await page.getByRole('link', { name: 'Explorar leilões' }).click()
  await page.getByRole('link', { name: /Ver lote/ }).click()
  await expect(
    page.getByRole('button', { name: 'Confirmar lance' }),
  ).toBeEnabled()
  await page.getByRole('button', { name: 'Confirmar lance' }).click()
  await expect(page.getByRole('alert')).toContainText('confirmação não chegou')
  await expect(
    page.getByText('Você está ganhando.', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar lance' }).click()
  await expect(
    page.getByText('Lance confirmado pela plataforma.'),
  ).toBeVisible()
  expect(keys[0]).toBe(keys[1])
})
