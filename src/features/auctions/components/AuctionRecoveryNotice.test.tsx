import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Auction } from '../api/auctions'
import { AuctionRecoveryNotice } from './AuctionRecoveryNotice'

const pending: NonNullable<Auction['recovery']> = {
  reason: 'EXTERNAL_ANCHOR_MISMATCH',
  state: 'PENDING',
  detectedAt: '2026-10-25T12:00:00.000Z',
  targetAt: '2026-10-25T12:03:00.000Z',
  completedAt: null,
  attempts: 1,
  lastError: 'RECOVERY_FAILED',
  remainingReservedCents: '12500',
  releasedCents: '0',
  capturedCents: '0',
}

test('pending recovery distinguishes committed reserves from confirmed release and describes target honestly', () => {
  render(<AuctionRecoveryNotice auction={{ recovery: pending }} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Adulteração confirmada')
  expect(
    screen.getByText('Recuperação financeira pendente'),
  ).toBeInTheDocument()
  expect(screen.getByText('Ainda reservado neste lote')).toBeInTheDocument()
  expect(screen.getByText('Liberação confirmada')).toBeInTheDocument()
  expect(screen.getByText(/Prazo-alvo de três minutos/)).toBeInTheDocument()
  expect(screen.getByText(/não garante liberação/)).toBeInTheDocument()
  expect(screen.getByText(/EXTERNAL_ANCHOR_MISMATCH/)).toBeInTheDocument()
  expect(
    screen.queryByText('Reservas liberadas; cancelamento registrado.'),
  ).not.toBeInTheDocument()
})

test('release is shown only after transactional confirmation; original incident remains visible', () => {
  render(
    <AuctionRecoveryNotice
      auction={{
        recovery: {
          ...pending,
          state: 'RELEASED',
          remainingReservedCents: '0',
          releasedCents: '12500',
          completedAt: pending.targetAt,
        },
      }}
    />,
  )
  expect(
    screen.getByText('Reservas liberadas; cancelamento registrado.'),
  ).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Adulteração confirmada')
})

test('captured funds require compensation and do not imply a refund', () => {
  render(
    <AuctionRecoveryNotice
      auction={{
        recovery: {
          ...pending,
          state: 'COMPENSATION_REQUIRED',
          remainingReservedCents: '0',
          capturedCents: '12500',
        },
      }}
    />,
  )
  expect(
    screen.getByText(/Compensação específica necessária/),
  ).toBeInTheDocument()
  expect(screen.getByText(/Nenhum estorno foi realizado/)).toBeInTheDocument()
  expect(
    screen.queryByText('Reservas liberadas; cancelamento registrado.'),
  ).not.toBeInTheDocument()
})

test('a confirmed audit without recovery response does not invent financial success', () => {
  render(<AuctionRecoveryNotice auction={{}} confirmedTampering />)
  expect(
    screen.getByText(/Aguardando o estado da recuperação/),
  ).toBeInTheDocument()
  expect(screen.queryByText('Liberação confirmada')).not.toBeInTheDocument()
})

test('ordinary auctions show no tampering notice and voluntary cancellation identifies the seller', () => {
  const view = render(<AuctionRecoveryNotice auction={{}} />)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  view.rerender(
    <AuctionRecoveryNotice
      auction={{ cancellationReason: 'SELLER_REQUEST' }}
    />,
  )
  expect(screen.getByText('Cancelado pelo leiloeiro.')).toBeInTheDocument()
  expect(screen.queryByText(/Adulteração confirmada/)).not.toBeInTheDocument()
})
