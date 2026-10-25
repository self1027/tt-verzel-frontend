import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const windowsEdge =
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const executablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ??
  (process.platform === 'win32' &&
  channel === 'msedge' &&
  existsSync(windowsEdge)
    ? windowsEdge
    : undefined)

export default defineConfig({
  testDir: './e2e-live',
  workers: 1,
  retries: 0,
  timeout: 240000,
  expect: { timeout: 15000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/recruiter', open: 'never' }],
  ],
  outputDir: 'test-results/recruiter-live',
  use: {
    baseURL: process.env.RECRUITER_FRONTEND_URL ?? 'http://localhost:5173',
    channel,
    launchOptions: { executablePath },
    screenshot: 'only-on-failure',
    // Login/deposit bodies contain credentials or tokens; keep them out of traces.
    trace: 'off',
  },
})
