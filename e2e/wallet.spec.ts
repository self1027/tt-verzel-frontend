import { expect, test } from '@playwright/test'
import { login } from './fixtures'

test('deposits with one idempotency key across an uncertain retry and refreshes wallet', async ({
  page,
}) => {
  let balance = '10000'
  const keys: string[] = []
  await page.route('http://localhost:3000/wallet', (route) =>
    route.fulfill({
      json: {
        wallet: {
          balanceCents: balance,
          reservedCents: '2000',
          availableCents: (BigInt(balance) - 2000n).toString(),
        },
      },
    }),
  )
  await page.route('http://localhost:3000/wallet/transactions?**', (route) =>
    route.fulfill({
      json: {
        total: 1,
        limit: 20,
        skip: 0,
        transactions: [
          {
            id: 't1',
            type: 'DEPOSIT',
            amountCents: '10000',
            createdAt: '2026-10-24T16:00:00Z',
            entries: [],
          },
        ],
      },
    }),
  )
  await page.route('http://localhost:3000/wallet/deposits', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer test-token')
    expect(route.request().postDataJSON()).toEqual({ amountCents: '5000' })
    keys.push(route.request().headers()['idempotency-key']!)
    if (keys.length === 1) return route.abort()
    balance = '15000'
    return route.fulfill({
      status: 201,
      json: {
        deposit: {
          transactionId: 't2',
          amountCents: '5000',
          createdAt: '2026-10-24T16:01:00Z',
        },
      },
    })
  })
  await login(page)
  await page.getByRole('link', { name: 'Carteira', exact: true }).click()
  await expect(page.getByText('Saldo disponível')).toBeVisible()
  await page.getByLabel('Valor do depósito (R$)').fill('50')
  await page.getByRole('button', { name: 'Depositar saldo simulado' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Depositar saldo simulado' }).click()
  await expect(
    page.getByText('Depósito confirmado pela plataforma.'),
  ).toBeVisible()
  await expect(page.getByText('R$ 130,00', { exact: true })).toBeVisible()
  expect(keys).toHaveLength(2)
  expect(keys[0]).toBe(keys[1])
  await page.setViewportSize({ width: 375, height: 900 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375)
  await page.screenshot({
    path: '.playwright-mcp/wallet-375.png',
    fullPage: true,
  })
})
