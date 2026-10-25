const labels = {
  scheduled: 'lote agendado',
  live: 'disputa aberta',
  'live-bids': 'disputa com lances',
  settled: 'liquidação automática',
  'closed-no-bids': 'encerramento sem lances',
  cancelled: 'cancelamento voluntário',
}

export function DemoScenario({ attributes }: { attributes: unknown }) {
  if (
    !attributes ||
    typeof attributes !== 'object' ||
    !('demoSeedVersion' in attributes) ||
    attributes.demoSeedVersion !== 3 ||
    !('demoScenario' in attributes)
  )
    return null
  const scenario = attributes.demoScenario
  if (typeof scenario !== 'string' || !Object.hasOwn(labels, scenario))
    return null
  return (
    <p className="muted">
      Demonstração: {labels[scenario as keyof typeof labels]}
    </p>
  )
}
