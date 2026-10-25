import { afterEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { api } from '@/api/client'
import { startSession, endSession, getSession, safeReturnTo } from './session'
import { RequireRole } from './RequireRole'
const user = {
  id: 'test',
  email: 'test@example.test',
  displayName: 'Test',
  role: 'BIDDER' as const,
}
afterEach(() => {
  endSession()
  vi.useRealTimers()
})
test('expires memory session and restricts return paths', () => {
  vi.useFakeTimers()
  startSession('token', user, 2)
  expect(getSession()?.user.role).toBe('BIDDER')
  vi.advanceTimersByTime(2000)
  expect(getSession()).toBeNull()
  expect(safeReturnTo('//evil.test')).toBe('/')
  expect(safeReturnTo('/wallet')).toBe('/wallet')
})
test('denies a bidder the seller role', () => {
  startSession('token', user, 3600)
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<RequireRole role="AUCTIONEER" />}>
          <Route index element={<p>Private</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('heading', { name: 'Acesso restrito' }),
  ).toBeInTheDocument()
  expect(screen.queryByText('Private')).not.toBeInTheDocument()
})
test('expires only the active Bearer session on 401', async () => {
  startSession('token', user, 3600)
  await api.GET('/wallet', {
    fetch: async () => new Response('{}', { status: 401 }),
  })
  expect(getSession()).toBeNull()
})
