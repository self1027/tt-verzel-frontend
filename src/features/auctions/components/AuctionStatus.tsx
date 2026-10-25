import type { LifecycleState } from '../utils/search'

const labels: Record<LifecycleState, string> = {
  SCHEDULED: 'Em breve',
  LIVE: 'Ao vivo',
  FINALIZING: 'Em encerramento',
  CANCELLED: 'Cancelado',
  SETTLED: 'Finalizado',
  CLOSED_NO_BIDS: 'Encerrado sem lances',
}

export function AuctionStatus({ state }: { state: LifecycleState }) {
  return (
    <span className={`status status-${state.toLowerCase()}`}>
      <span aria-hidden="true" />
      {labels[state]}
    </span>
  )
}
