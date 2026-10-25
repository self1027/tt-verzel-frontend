import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuditPage } from './AuditPage'
import { ReceiptPage } from './ReceiptPage'
import { getAudit, getReceipt } from './api'

vi.mock('./api', () => ({
  getAudit: vi.fn(),
  getReceipt: vi.fn(),
  getAuditEvents: vi.fn(async () => ({
    events: [],
    proof: 'EVENT_PAGE_ONLY',
    nextAfter: '0',
  })),
}))
afterEach(cleanup)
function show(page: 'audit' | 'receipt') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/auctions/test/${page}`]}>
        <Routes>
          <Route path="/auctions/:id/audit" element={<AuditPage />} />
          <Route path="/auctions/:id/receipt" element={<ReceiptPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}
describe('cryptographic coverage is independent of VERIFIED', () => {
  for (const coverage of ['LEGACY_V1', 'SELLER_PRODUCT_V2'] as const) {
    it(`describes audit ${coverage} without assigning retroactive guarantees`, async () => {
      vi.mocked(getAudit).mockResolvedValue({
        auctionId: 'test',
        status: 'VERIFIED',
        integrityCoverage: coverage,
        localSequence: '1',
        externallyVerifiedSequence: '1',
        externalHeadSequence: '1',
        operationalCoverage: 'CONSISTENT',
        reason: null,
      })
      const client = show('audit')
      expect(
        await screen.findByRole('heading', { name: 'Histórico verificado' }),
      ).toBeVisible()
      if (coverage === 'LEGACY_V1')
        expect(screen.getByRole('note')).toHaveTextContent(
          'não verifica o vendedor original',
        )
      else expect(screen.getByText(/Prova v2: inclui/)).toBeVisible()
      client.clear()
    })
    it(`keeps receipt ${coverage} readable with the correct limitation`, async () => {
      vi.mocked(getReceipt).mockResolvedValue({
        integrityCoverage: coverage,
        auctionId: 'test',
        productSnapshot: {
          id: 'item',
          title: 'Original item',
          description: null,
          imageUrl: null,
          capturedAt: '2026-10-25T00:00:00.000Z',
        },
        amountCents: '100',
        endsAt: '2026-10-25T00:00:00.000Z',
        settledAt: '2026-10-25T00:00:01.000Z',
        settlementId: 'settlement',
        winningBid: { id: 'bid', bidderRef: 'participant' },
        auditUrl: '/auctions/test/audit',
        receiptUrl: '/auctions/test/receipt',
      })
      const client = show('receipt')
      expect(
        await screen.findByRole('heading', { name: 'Original item' }),
      ).toBeVisible()
      if (coverage === 'LEGACY_V1')
        expect(screen.getByRole('note')).toHaveTextContent(
          'não têm garantia criptográfica',
        )
      else expect(screen.queryByRole('note')).not.toBeInTheDocument()
      client.clear()
    })
  }
})

describe('verification availability', () => {
  const verified = {
    auctionId: 'test',
    status: 'VERIFIED' as const,
    integrityCoverage: 'SELLER_PRODUCT_V2' as const,
    localSequence: '1',
    externallyVerifiedSequence: '1',
    externalHeadSequence: '1',
    operationalCoverage: 'CONSISTENT' as const,
    reason: null,
  }
  it('does not endorse cached VERIFIED after a network error, and recovers on a fresh response', async () => {
    vi.mocked(getAudit)
      .mockResolvedValueOnce(verified)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(verified)
    const client = show('audit')
    await screen.findByRole('heading', { name: 'Histórico verificado' })
    fireEvent.click(
      screen.getByRole('button', { name: 'Atualizar verificação' }),
    )
    await screen.findByRole('heading', { name: 'Verificação indisponível' })
    expect(
      screen.queryByRole('heading', { name: 'Histórico verificado' }),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Atualizar verificação' }),
    )
    await screen.findByRole('heading', { name: 'Histórico verificado' })
    client.clear()
  })
  it('removes current VERIFIED immediately offline, including a paused refetch', async () => {
    vi.mocked(getAudit).mockResolvedValue(verified)
    const client = show('audit')
    await screen.findByRole('heading', { name: 'Histórico verificado' })
    try {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      })
      act(() => window.dispatchEvent(new Event('offline')))
      await screen.findByRole('heading', { name: 'Verificação indisponível' })
      fireEvent.click(
        screen.getByRole('button', { name: 'Atualizar verificação' }),
      )
      await waitFor(() =>
        expect(
          screen.queryByRole('heading', { name: 'Histórico verificado' }),
        ).not.toBeInTheDocument(),
      )
    } finally {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      })
      act(() => window.dispatchEvent(new Event('online')))
      client.clear()
    }
  })
  it('uses the contractual unavailable status instead of the previous green result', async () => {
    vi.mocked(getAudit)
      .mockResolvedValueOnce(verified)
      .mockResolvedValue({ ...verified, status: 'VERIFICATION_UNAVAILABLE' })
    const client = show('audit')
    await screen.findByRole('heading', { name: 'Histórico verificado' })
    fireEvent.click(
      screen.getByRole('button', { name: 'Atualizar verificação' }),
    )
    await screen.findByRole('heading', { name: 'Verificação indisponível' })
    expect(
      screen.queryByRole('heading', { name: 'Histórico verificado' }),
    ).not.toBeInTheDocument()
    client.clear()
  })
})
