// screenshot.cjs — headless screenshot of the DSH web UI with the CHIRAL
// PULSE plugin, for the README. Drives the system Edge (no bundled browser).
// Usage: node scripts/screenshot.cjs <out.png> [--new-session]
//
// No hardcoded machine paths: playwright-core is resolved from this
// project's node_modules (install it with `npm i -D playwright-core`, or
// junction it in), and the Edge binary is auto-detected from the standard
// install locations (override with the EDGE_PATH env var).
const { createRequire } = require('node:module')
const path = require('node:path')
const fs = require('node:fs')

const req = createRequire(path.join(__dirname, '..', 'package.json'))
let chromium
try {
  ;({ chromium } = req('playwright-core'))
} catch {
  console.error('FAIL: playwright-core is not installed in this project.')
  console.error('  Install it: npm i -D playwright-core  (or junction it into node_modules)')
  process.exit(1)
}

/** Auto-detect the system Edge binary; falls back to null (bundled chromium). */
function findEdge() {
  const override = process.env.EDGE_PATH
  if (override !== undefined && fs.existsSync(override)) return override
  const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles].filter(Boolean)
  for (const root of roots) {
    const candidate = path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

const OUT = process.argv[2] ?? path.join(__dirname, '..', 'assets', 'chiral-pulse-hero.png')
const NEW_SESSION = process.argv.includes('--new-session')

;(async () => {
  const browser = await chromium.launch({
    executablePath: findEdge() ?? undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  // Wait for the plugin to paint its heartbeat strip.
  await page.waitForSelector('.cp-line', { timeout: 30000 }).catch(() => {
    console.warn('WARN: .cp-line not found — plugin may not have activated')
  })
  if (NEW_SESSION) {
    const button = page.locator(
      'button[aria-label*="新建会话"], button[aria-label*="New session"], button[aria-label*="New Session"]',
    )
    if (await button.count()) {
      await button.first().click().catch(() => {})
    }
  }
  // Let the skin settle and the trace paint a few frames.
  await page.waitForTimeout(4000)
  await page.screenshot({ path: OUT })
  await browser.close()
  console.log('DONE:', OUT)
})().catch((error) => {
  console.error('FAIL:', error.message)
  process.exit(1)
})
