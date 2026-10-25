import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { useMoneyAction } from './useMoneyAction'

test('committed but lost response survives navigation and replays the original identity', async () => {
  const effects = new Set<string>()
  const send = vi.fn(async (_cents: string, key: string) => {
    if (!effects.has(key)) {
      effects.add(key)
      throw new TypeError('lost response')
    }
  })
  const scope = 'user-a:deposit'
  const first = renderHook(() => useMoneyAction(send, vi.fn(), scope))
  await act(() => first.result.current.submit('5000'))
  expect(first.result.current.uncertain).toBe(true)
  first.unmount()
  const second = renderHook(() => useMoneyAction(send, vi.fn(), scope))
  expect(second.result.current.uncertain).toBe(true)
  expect(second.result.current.intentCents).toBe('5000')
  await act(() => second.result.current.submit('6000'))
  expect(send).toHaveBeenCalledTimes(1)
  await act(() => second.result.current.submit('5000'))
  expect(send.mock.calls[1]).toEqual(send.mock.calls[0])
  expect(effects.size).toBe(1)
  expect(second.result.current.success).toBe(true)
})

test('in-flight intent blocks remounted duplicate; accounts and auctions are isolated', async () => {
  let finish!: () => void
  const send = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const first = renderHook(() =>
    useMoneyAction(send, vi.fn(), 'user-b:bid:lot1'),
  )
  let pending!: Promise<void>
  act(() => {
    pending = first.result.current.submit('100')
  })
  first.unmount()
  const second = renderHook(() =>
    useMoneyAction(send, vi.fn(), 'user-b:bid:lot1'),
  )
  expect(second.result.current.pending).toBe(true)
  await act(() => second.result.current.submit('100'))
  expect(send).toHaveBeenCalledTimes(1)
  const other = renderHook(() =>
    useMoneyAction(send, vi.fn(), 'user-c:bid:lot1'),
  )
  const lot = renderHook(() => useMoneyAction(send, vi.fn(), 'user-b:bid:lot2'))
  expect(other.result.current.intentCents).toBeUndefined()
  expect(lot.result.current.intentCents).toBeUndefined()
  await act(async () => {
    finish()
    await pending
  })
  expect(second.result.current.pending).toBe(false)
})

test('expired authentication cannot discard an already ambiguous operation', async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('lost'))
    .mockRejectedValueOnce(new ApiError(401, 'expired'))
    .mockResolvedValueOnce({})
  const hook = renderHook(() => useMoneyAction(send, vi.fn(), 'user-d:deposit'))
  await act(() => hook.result.current.submit('100'))
  await act(() => hook.result.current.submit('100'))
  expect(hook.result.current.uncertain).toBe(true)
  await act(() => hook.result.current.submit('100'))
  expect(new Set(send.mock.calls.map((call) => call[1])).size).toBe(1)
  expect(hook.result.current.success).toBe(true)
})
