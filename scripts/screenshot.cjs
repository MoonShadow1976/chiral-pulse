// screenshot.cjs — headless screenshot of the DSH web UI with the CHIRAL
// PULSE plugin, for the README. Drives the system Edge (no bundled browser).
// Usage: node scripts/screenshot.cjs <out.png> [--new-session]
const { createRequire } = require('node:module')
const path = require('node:path')
const req = createRequire('D:/deepseek-harness/node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core/package.json')
const { chromium } = req('playwright-core')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT = process.argv[2] ?? path.join(__dirname, '..', 'assets', 'chiral-pulse-hero.png')
const NEW_SESSION = process.argv.includes('--new-session')

;(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
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
