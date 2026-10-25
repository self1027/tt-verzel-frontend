import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, vi } from 'vitest'
import { AuctionRealtime } from './AuctionRealtime'
const state = vi.hoisted(() => ({
  handlers: new Map<string, () => void>(),
  event: undefined as ((event: string, payload: unknown) => void) | undefined,
  disconnect: vi.fn(),
  emit: vi.fn(),
}))
vi.mock('socket.io-client', () => ({
  io: () => ({
    connected: true,
    on(name: string, callback: () => void) {
      state.handlers.set(name, callback)
    },
    onAny(callback: (event: string, payload: unknown) => void) {
      state.event = callback
    },
    timeout() {
      return this
    },
    emit(
      name: string,
      payload: unknown,
      callback?: (err: null, ack: { ok: true }) => void,
    ) {
      state.emit(name, payload)
      callback?.(null, { ok: true })
    },
    connect() {},
    disconnect: state.disconnect,
  }),
}))
test('joins and resyncs on reconnect and room events; ignores unrelated lots', () => {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const view = render(
    <QueryClientProvider client={client}>
      <AuctionRealtime auctionId="room1" />
    </QueryClientProvider>,
  )
  act(() => state.handlers.get('connect')?.())
  expect(screen.getByText('Atualização ao vivo conectada.')).toBeInTheDocument()
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['auctions', 'bids', 'room1'],
  })
  invalidate.mockClear()
  act(() => state.event?.('auction:extended', { auctionId: 'other' }))
  expect(invalidate).not.toHaveBeenCalled()
  act(() => state.event?.('auction:extended', { auctionId: 'room1' }))
  expect(invalidate).toHaveBeenCalledTimes(2)
  act(() => state.handlers.get('connect')?.())
  expect(invalidate).toHaveBeenCalledTimes(4)
  view.unmount()
  expect(state.emit).toHaveBeenCalledWith('auction:leave', {
    auctionId: 'room1',
  })
  expect(state.disconnect).toHaveBeenCalled()
})
