import { expect, test } from '@playwright/test'
import { auctionId, mockPublicApi } from './fixtures'

test('follows system preference, toggles by keyboard and persists across reloads', async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    'rgb(244, 245, 247)',
  )
  const toggle = page.getByRole('button', { name: 'Tema escuro' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Tema escuro' }).click()
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('resolves a saved theme before React starts', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('verzel-theme', 'light'))
  await page.route('**/src/main.tsx', (route) => route.abort())
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')
  await expect(page.locator('#root')).toBeEmpty()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('remains usable when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError')
      },
    })
  })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Tema escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: public screens, errors, contrast and reduced motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await mockPublicApi(page)
    for (const path of ['/', `/auctions/${auctionId}`, '/login', '/missing']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      for (const width of [375, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width)
        await page.screenshot({
          path: `.playwright-mcp/theme-${theme}-${path.replaceAll('/', '_') || 'home'}-${width}.png`,
          fullPage: true,
        })
      }
    }
    await page.goto('/login')
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
    await page.getByLabel('E-mail').fill('test@example.test')
    await page.getByLabel('Senha', { exact: true }).fill('wrong')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await page.screenshot({
      path: `.playwright-mcp/theme-${theme}-error.png`,
      fullPage: true,
    })
    const ratios = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement)
      const luminance = (token: string) => {
        const hex = styles.getPropertyValue(token).trim().slice(1)
        const rgb = [0, 2, 4]
          .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722
      }
      const ratio = (a: string, b: string) => {
        const x = luminance(a),
          y = luminance(b)
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
      }
      return {
        text: [
          '--surface-canvas',
          '--surface-raised',
          '--surface-deep',
        ].flatMap((bg) =>
          [
            '--text-primary',
            '--text-secondary',
            '--accent-soft',
            '--text-error',
            '--brand-emphasis',
          ].map((fg) => ({ fg, bg, ratio: ratio(fg, bg) })),
        ),
        action: ratio('--text-inverse', '--action-primary'),
        focus: ratio('--focus-ring', '--surface-canvas'),
        control: ratio('--border-control', '--surface-raised'),
      }
    })
    for (const pair of ratios.text)
      expect(pair.ratio, `${pair.fg} on ${pair.bg}`).toBeGreaterThanOrEqual(4.5)
    expect(ratios.action).toBeGreaterThanOrEqual(4.5)
    expect(ratios.focus).toBeGreaterThanOrEqual(3)
    expect(ratios.control).toBeGreaterThanOrEqual(3)
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
    await expect(page.locator('.button').first()).toHaveCSS(
      'transition-duration',
      '1e-05s',
    )
  })
}

test('tracks system changes without saving an implicit preference', async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(
    await page.evaluate(() => localStorage.getItem('verzel-theme')),
  ).toBeNull()
})
