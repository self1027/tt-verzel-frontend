import { expect, test } from '@playwright/test'
import { auction, auctionId, mockPublicApi } from './fixtures'
import type { components } from '../src/api/generated/schema'

for (const theme of ['light', 'dark'] as const) {
  for (const state of [
    'PENDING',
    'RELEASED',
    'COMPENSATION_REQUIRED',
  ] as const) {
    test(`${theme}: confirmed tampering ${state} shows honest financial result and blocks participation`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme })
      await mockPublicApi(page)
      const recovery: components['schemas']['AuctionRecovery'] = {
        reason: 'EXTERNAL_ANCHOR_MISMATCH',
        state,
        detectedAt: '2026-10-25T12:00:00Z',
        targetAt: '2026-10-25T12:03:00Z',
        completedAt: state === 'PENDING' ? null : '2026-10-25T12:01:00Z',
        attempts: 1,
        lastError: null,
        remainingReservedCents: state === 'PENDING' ? '1250000' : '0',
        releasedCents: state === 'RELEASED' ? '1250000' : '0',
        capturedCents: state === 'COMPENSATION_REQUIRED' ? '1250000' : '0',
      }
      await page.route(`http://localhost:3000/auctions/${auctionId}`, (route) =>
        route.fulfill({
          json: {
            auction: {
              ...auction,
              recovery,
              status:
                state === 'RELEASED'
                  ? 'CANCELLED'
                  : state === 'COMPENSATION_REQUIRED'
                    ? 'SETTLED'
                    : 'PUBLISHED',
              lifecycleState:
                state === 'RELEASED'
                  ? 'CANCELLED'
                  : state === 'COMPENSATION_REQUIRED'
                    ? 'SETTLED'
                    : 'LIVE',
              cancellationReason:
                state === 'RELEASED' ? 'AUDIT_TAMPERED' : null,
            },
          },
        }),
      )
      await page.route(
        `http://localhost:3000/auctions/${auctionId}/audit`,
        (route) =>
          route.fulfill({
            json: {
              auctionId,
              status: 'TAMPERED',
              localSequence: '2',
              externallyVerifiedSequence: '1',
              externalHeadSequence: '1',
              operationalCoverage: 'DIVERGENT',
              integrityCoverage: 'SELLER_PRODUCT_V2',
              reason: recovery.reason,
            },
          }),
      )
      await page.goto(`/auctions/${auctionId}`)
      const notice = page.getByRole('alert')
      await expect(notice).toContainText('Adulteração confirmada')
      await expect(notice).toContainText('Ainda reservado neste lote')
      await expect(notice).toContainText('Liberação confirmada')
      await expect(notice).toContainText('Prazo-alvo de três minutos')
      await expect(
        page.getByText('Lances bloqueados por adulteração confirmada.'),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'Entrar para dar um lance' }),
      ).toHaveCount(0)
      await expect(
        page.getByRole('form', { name: 'Dar um lance' }),
      ).toHaveCount(0)
      if (state === 'COMPENSATION_REQUIRED')
        await expect(notice).toContainText('Nenhum estorno foi realizado')
      if (state === 'PENDING') {
        await expect(
          page.getByText('Bloqueado por adulteração', { exact: true }),
        ).toBeVisible()
        await expect(page.getByText('Ao vivo', { exact: true })).toHaveCount(0)
      }
      for (const width of [375, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width)
        await page.screenshot({
          path: `.playwright-mcp/recovery-${theme}-${state}-${width}.png`,
          fullPage: true,
        })
      }
    })
  }
}

for (const status of ['PENDING_ANCHOR', 'VERIFICATION_UNAVAILABLE'] as const) {
  test(`${status} does not claim tampering or financial recovery`, async ({
    page,
  }) => {
    await mockPublicApi(page)
    await page.route(
      `http://localhost:3000/auctions/${auctionId}/audit`,
      (route) =>
        route.fulfill({
          status: status === 'VERIFICATION_UNAVAILABLE' ? 503 : 200,
          json: {
            auctionId,
            status,
            localSequence: '2',
            externallyVerifiedSequence: '0',
            externalHeadSequence: null,
            operationalCoverage: 'CONSISTENT',
            integrityCoverage: 'SELLER_PRODUCT_V2',
            reason: null,
          },
        }),
    )
    await page.goto(`/auctions/${auctionId}`)
    await expect(
      page.getByRole('heading', { name: auction.productSnapshot.title }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Entrar para dar um lance' }),
    ).toBeVisible()
    await expect(page.getByText('Adulteração confirmada')).toHaveCount(0)
  })
}
