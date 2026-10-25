import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from '@/App'

test('renders the public auction navigation', () => {
  render(<App />)
  expect(screen.getByRole('navigation')).toBeInTheDocument()
})
