import { expect, test } from '@playwright/test'

import { login, user } from './fixtures'

test('logs in with verified Bearer identity and clears session on logout', async ({
  page,
}) => {
  await login(page)
  await expect(
    page.getByRole('link', { name: 'Carteira', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Painel do leiloeiro', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(
    page.getByRole('link', { name: 'Entrar', exact: true }),
  ).toBeVisible()
})

test('rejects invalid login without clearing the fields', async ({ page }) => {
  await page.route('http://localhost:3000/auth/login', (route) =>
    route.fulfill({
      status: 401,
      json: {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciais inválidas.',
        },
      },
    }),
  )
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Credenciais inválidas')
  await expect(page.getByLabel('E-mail')).toHaveValue(user.email)
})

test('a protected API 401 returns to login and removes private navigation', async ({
  page,
}) => {
  await page.route('http://localhost:3000/wallet', (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada' } },
    }),
  )
  await page.route('http://localhost:3000/wallet/transactions?**', (route) =>
    route.fulfill({ json: { total: 0, limit: 20, skip: 0, transactions: [] } }),
  )
  await login(page)
  await page.getByRole('link', { name: 'Carteira', exact: true }).click()
  await expect(page).toHaveURL(/login\?returnTo=/)
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0)
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0)
})
