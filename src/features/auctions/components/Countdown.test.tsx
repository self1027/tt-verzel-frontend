import { act, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Countdown } from './Countdown'

test('uses server time, resets anchor and removes timer on unmount', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
  const props = {
    endsAt: '2026-10-24T16:01:00Z',
    asOf: '2026-10-24T16:00:00Z',
    state: 'LIVE',
  }
  const view = render(<Countdown {...props} />)
  expect(screen.getByText('00h 01m 00s')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1000))
  expect(screen.getByText('00h 00m 59s')).toBeInTheDocument()
  view.rerender(<Countdown {...props} asOf="2026-10-24T16:00:30Z" />)
  expect(screen.getByText('00h 00m 30s')).toBeInTheDocument()
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
  vi.useRealTimers()
})
