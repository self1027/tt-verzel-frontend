import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { DemoScenario } from './DemoScenario'

test('identifies demonstration intent without inventing the current auction state', () => {
  const view = render(
    <DemoScenario
      attributes={{ demoSeedVersion: 3, demoScenario: 'settled' }}
    />,
  )
  expect(
    screen.getByText('Demonstração: liquidação automática'),
  ).toBeInTheDocument()
  expect(screen.queryByText('Liquidado')).not.toBeInTheDocument()
  view.rerender(
    <DemoScenario attributes={{ demoScenario: 'tampered-event' }} />,
  )
  expect(screen.queryByText(/Demonstração:/)).not.toBeInTheDocument()
  view.rerender(
    <DemoScenario
      attributes={{ demoSeedVersion: 3, demoScenario: 'live-bids' }}
    />,
  )
  expect(
    screen.getByText('Demonstração: disputa com lances'),
  ).toBeInTheDocument()
})
