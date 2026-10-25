/* global process, console, setTimeout, clearTimeout, URL, fetch, AbortSignal */
import assert from 'node:assert/strict'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createConnection } from '@playwright/mcp'
import { chromium } from '@playwright/test'

const base = process.env.RECRUITER_FRONTEND_URL ?? 'http://localhost:5173'
const api = process.env.RECRUITER_API_URL ?? 'http://localhost:3000'
const output = new URL('../test-results/recruiter-mcp/', import.meta.url)
await mkdir(output, { recursive: true })
const report = {
  startedAt: new Date().toISOString(),
  base,
  api,
  engine: '@playwright/mcp',
  checks: [],
}
// Some Windows installations expose Edge in Program Files rather than LocalAppData.
let executable = process.env.PLAYWRIGHT_EXECUTABLE_PATH
if (
  !executable &&
  process.platform === 'win32' &&
  (!process.env.PLAYWRIGHT_CHANNEL ||
    process.env.PLAYWRIGHT_CHANNEL === 'msedge')
) {
  const candidate =
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  try {
    await access(candidate)
    executable = candidate
  } catch {
    /* Use Playwright's browser discovery. */
  }
}
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge',
  executablePath: executable,
})
const context = await browser.newContext()
const server = await createConnection(
  { outputDir: fileURLToPath(output) },
  async () => context,
)
let nextId = 0
const pending = new Map()
// Exchange actual JSON-RPC MCP messages with Microsoft's server, in memory.
const transport = {
  async start() {},
  async close() {},
  async send(message) {
    const item = pending.get(message.id)
    if (!item) return
    pending.delete(message.id)
    clearTimeout(item.timer)
    if (message.error) item.reject(new Error(JSON.stringify(message.error)))
    else item.resolve(message.result)
  },
}
await server.connect(transport)
function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`MCP timeout: ${method}`))
    }, 45000)
    pending.set(id, { resolve, reject, timer })
    transport.onmessage({ jsonrpc: '2.0', id, method, params })
  })
}
async function call(name, args = {}) {
  const result = await rpc('tools/call', { name, arguments: args })
  const content =
    result.content
      ?.filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n') ?? ''
  assert.ok(!result.isError, `${name}: ${content}`)
  return content
}
try {
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verzel-recruiter', version: '1.0.0' },
  })
  transport.onmessage({ jsonrpc: '2.0', method: 'notifications/initialized' })
  const response = await fetch(`${api}/auctions?limit=100`, {
    signal: AbortSignal.timeout(10000),
  })
  assert.equal(
    response.status,
    200,
    'API deve responder em /auctions (não existe /health)',
  )
  const { auctions } = await response.json()
  assert.ok(auctions.length, 'Execute o seed antes de testar')
  const lot =
    auctions.find((item) => item.lifecycleState === 'LIVE') ?? auctions[0]
  const settled = auctions.find((item) => item.lifecycleState === 'SETTLED')
  const pages = [
    ['vitrine', '/'],
    ['login', '/login'],
    ['sala', `/auctions/${lot.id}`],
    ['auditoria', `/auctions/${lot.id}/audit`],
  ]
  if (settled) pages.push(['comprovante', `/auctions/${settled.id}/receipt`])
  for (const [name, path] of pages) {
    // A rendered heading alone does not prove that the API-backed content loaded.
    const endpoint =
      name === 'login'
        ? null
        : name === 'vitrine'
          ? `${api}/auctions?`
          : `${api}${path}`
    const loaded = endpoint
      ? context.waitForEvent('response', {
          predicate: (response) =>
            name === 'vitrine'
              ? response.url().startsWith(endpoint)
              : response.url() === endpoint,
          timeout: 15000,
        })
      : null
    loaded?.catch(() => {})
    await call('browser_navigate', { url: `${base}${path}` })
    if (loaded) {
      const response = await loaded
      assert.equal(response.status(), 200, `${name}: resposta da API`)
      const body = await response.json()
      if (name === 'auditoria')
        assert.equal(
          body.status,
          'VERIFIED',
          'Auditoria deve confirmar a prova independente',
        )
      if (name === 'comprovante')
        assert.equal(body.receipt.auctionId, settled.id)
      if (name === 'sala') assert.equal(body.auction.id, lot.id)
      if (name === 'vitrine') assert.ok(Array.isArray(body.auctions))
    }
    await call('browser_wait_for', {
      text:
        name === 'login'
          ? 'E-mail'
          : name === 'vitrine'
            ? 'Explore os leilões'
            : name === 'sala'
              ? lot.productSnapshot.title
              : name === 'comprovante'
                ? 'Liquidação confirmada'
                : 'Histórico verificado',
    })
    const snapshot = await call('browser_snapshot')
    assert.ok(
      !snapshot.includes('Não foi possível carregar'),
      `${name}: falha de carregamento`,
    )
    await writeFile(new URL(`${name}.txt`, output), snapshot)
    report.checks.push({ name, path, status: 'PASS' })
    console.log(`PASS MCP: ${name}`)
  }
  await call('browser_resize', { width: 375, height: 812 })
  await call('browser_navigate', { url: base })
  const width = await call('browser_evaluate', {
    function:
      '() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth })',
  })
  await writeFile(new URL('mobile-width.txt', output), width)
  const fits = await call('browser_evaluate', {
    function: '() => document.documentElement.scrollWidth <= innerWidth',
  })
  assert.match(
    fits,
    /### Result\s+true/,
    'A página mobile não deve ter overflow horizontal',
  )
  report.checks.push({ name: 'mobile-375px', status: 'PASS' })
  await call('browser_take_screenshot', {
    filename: fileURLToPath(new URL('mobile.png', output)),
    fullPage: true,
    scale: 'css',
  })
  await writeFile(
    new URL('network.txt', output),
    await call('browser_network_requests', { static: false }),
  )
  await writeFile(
    new URL('console.txt', output),
    await call('browser_console_messages', { level: 'error', all: true }),
  )
  if (!settled)
    report.checks.push({
      name: 'comprovante',
      status: 'NOT_RUN',
      reason:
        'Nenhum lote liquidado no seed atual; execute test:recruiter para gerar um.',
    })
} catch (error) {
  report.error = error.message
  process.exitCode = 1
  console.error(error.message)
} finally {
  report.finishedAt = new Date().toISOString()
  await writeFile(
    new URL('report.json', output),
    `${JSON.stringify(report, null, 2)}\n`,
  )
  await server.close()
  await browser.close()
  console.log(`Relatório MCP: ${fileURLToPath(output)}`)
}
