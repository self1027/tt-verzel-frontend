import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from '@/App'

test('inicializa a aplica??o', async () => {
  render(<App />)
  expect(
    await screen.findByRole('main', { name: 'Verzel Auction House' }),
  ).toBeInTheDocument()
})
