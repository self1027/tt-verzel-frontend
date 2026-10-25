import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement media queries; browser behavior is covered by Playwright.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (media: string) => ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
  }),
})

afterEach(cleanup)
