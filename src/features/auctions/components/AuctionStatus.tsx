import type { LifecycleState } from '../utils/search'

const labels: Record<LifecycleState, string> = {
  SCHEDULED: 'Em breve',
  LIVE: 'Ao vivo',
  FINALIZING: 'Em encerramento',
  CANCELLED: 'Cancelado',
  SETTLED: 'Finalizado',
  CLOSED_NO_BIDS: 'Encerrado sem lances',
}

export function AuctionStatus({
  state,
  blocked = false,
}: {
  state: LifecycleState
  blocked?: boolean
}) {
  const suspended =
    blocked && ['SCHEDULED', 'LIVE', 'FINALIZING'].includes(state)
  return (
    <span
      className={`status status-${suspended ? 'cancelled' : state.toLowerCase()}`}
    >
      <span aria-hidden="true" />
      {suspended ? 'Bloqueado por adulteração' : labels[state]}
    </span>
  )
}
