import { useEffect, useState } from 'react'

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days)
    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
}

function CountdownClock({
  endsAt,
  asOf,
  state,
}: {
  endsAt: string
  asOf: string
  state: string
}) {
  const [now, setNow] = useState(() => Date.now())
  const [anchor] = useState(() => ({ asOf, localNow: Date.now() }))
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const remaining =
    Date.parse(endsAt) - (now + Date.parse(anchor.asOf) - anchor.localNow)
  const text = ['SETTLED', 'CLOSED_NO_BIDS', 'CANCELLED'].includes(state)
    ? 'Encerrado'
    : state === 'FINALIZING'
      ? 'Aguardando confirmação'
      : remaining <= 0
        ? 'Atualizando status'
        : formatRemaining(remaining)
  return (
    <time
      className="countdown money"
      dateTime={endsAt}
      aria-label={`Encerramento: ${text}`}
    >
      {text}
    </time>
  )
}

export function Countdown(props: {
  endsAt: string
  asOf: string
  state: string
}) {
  return <CountdownClock key={props.asOf} {...props} />
}
