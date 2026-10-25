import { expect, test, type Page } from '@playwright/test'
import { login, mockAccountApi } from './fixtures'
async function inspect(page: Page, name: string) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  for (const theme of ['dark', 'light']) {
    const toggle = page.getByRole('button', { name: 'Tema escuro' })
    if (
      (await toggle.getAttribute('aria-pressed')) !== String(theme === 'dark')
    ) {
      await toggle.click()
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.evaluate(async () => {
        ;(document.activeElement as HTMLElement)?.blur()
        window.scrollTo(0, 0)
        await document.fonts.ready
      })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width)
      if (name === 'room' && width === 375) {
        const title = await page.locator('.detail-title-row').boundingBox()
        const trading = await page.locator('.detail-aside').boundingBox()
        const history = await page.locator('.detail-history').boundingBox()
        expect(title!.y).toBeLessThan(trading!.y)
        expect(trading!.y).toBeLessThan(history!.y)
      }
      await page.screenshot({
        path: `.playwright-mcp/final-${name}-${theme}-${width}.png`,
        fullPage: true,
      })
    }
  }
}
test('bidder screens reflow and link to public evidence', async ({ page }) => {
  await mockAccountApi(page)
  await login(page)
  await page.getByRole('link', { name: 'Carteira', exact: true }).click()
  await expect(
    page.getByText('R$ 7.500,00', { exact: true }).first(),
  ).toBeVisible()
  await inspect(page, 'wallet')
  await page.getByRole('link', { name: 'Meus arremates', exact: true }).click()
  await expect(page.getByText('Arrematado por você')).toBeVisible()
  await inspect(page, 'my-bids')
  await page.getByRole('link', { name: 'Ver comprovante', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Comprovante de arremate' }),
  ).toBeVisible()
  await inspect(page, 'receipt')
  await page.getByRole('link', { name: 'Consultar auditoria do lote' }).click()
  await expect(
    page.getByRole('heading', { name: 'Histórico verificado', exact: true }),
  ).toBeVisible()
  await inspect(page, 'audit')
  await page.getByRole('link', { name: 'Voltar ao lote', exact: true }).click()
  await expect(page.getByText('Encerrado', { exact: true })).toBeVisible()
  await inspect(page, 'room')
})
test('seller form reflows and received total comes from settlements', async ({
  page,
}) => {
  await mockAccountApi(page, 'AUCTIONEER')
  await login(page, 'AUCTIONEER')
  await expect(page.getByText('Arrematado por')).toBeVisible()
  await expect(
    page.getByText('R$ 12.500,00', { exact: true }).first(),
  ).toBeVisible()
  await inspect(page, 'seller')
  await page.getByRole('button', { name: 'Selecionar para lote' }).click()
  await expect(page.getByLabel('Lance inicial (R$)')).toBeVisible()
  await inspect(page, 'seller-form')
})

test('sums incoming settlements across all ledger pages', async ({ page }) => {
  await mockAccountApi(page, 'AUCTIONEER')
  await page.route('http://localhost:3000/wallet/transactions?**', (route) => {
    const skip = Number(new URL(route.request().url()).searchParams.get('skip'))
    return route.fulfill({
      json: {
        total: 2,
        limit: 1,
        skip,
        transactions: [
          {
            id: `tx-${skip}`,
            type: 'AUCTION_SETTLEMENT',
            amountCents: skip === 0 ? '100000' : '250000',
            createdAt: '2026-11-01T12:00:00Z',
            entries: [],
          },
        ],
      },
    })
  })
  await login(page, 'AUCTIONEER')
  await expect(page.locator('.balance-strip > div').first()).toContainText(
    'R$ 3.500,00',
  )
})
