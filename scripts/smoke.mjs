// Browser check of the built site in Chrome and WebKit (the Safari engine), with screenshots.
//   PLAYWRIGHT=<path to playwright-core/index.mjs> node scripts/smoke.mjs <url> [shots dir]
// Serve dist/ first (npm run preview, or any static server). CHROME_BIN points at an installed Chrome;
// WebKit comes from Playwright's browser cache. Exits 1 when a check fails.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const pw = await import(process.env.PLAYWRIGHT ?? 'playwright-core')
const url = process.argv[2] ?? 'http://127.0.0.1:4173/'
const shots = process.argv[3] ?? 'shots'
mkdirSync(shots, { recursive: true })

const KEY = 'code-kata:code'
let failures = 0
const check = (name, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function open(context, code) {
  const page = await context.newPage()
  // Seeds the editor once per tab (null: a first visit), so a reload keeps what the test typed.
  await page.addInitScript(([key, value]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  }, [KEY, code])
  await page.goto(url)
  await page.waitForSelector('.cm-content')
  return page
}

async function runAndWait(page, until = /Ferdig|Feil|Stoppet/i, timeout = 15000) {
  await page.click('#run')
  await page.waitForFunction((re) => new RegExp(re, 'i').test(document.getElementById('status').textContent),
    until.source, { timeout })
  return {
    status: await page.textContent('#status'),
    output: await page.innerText('#output'),
  }
}

async function suite(name, browser) {
  const desktop = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })

  // First visit: the starter kata runs and prints.
  let page = await open(desktop, null)
  let r = await runAndWait(page)
  check(`${name}: starter runs`, /Ferdig/i.test(r.status) && r.output.includes('oppgaver små er kata')
    && r.output.includes("{ antall: 4, lengste: 'oppgaver' }"), JSON.stringify(r))
  await page.screenshot({ path: join(shots, `${name}-desktop.png`) })

  // Autocomplete: a global's members, then the code's own function name; Tab accepts.
  await page.click('.cm-content')
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type('\nMath.fl')
  await page.waitForSelector('.cm-tooltip-autocomplete')
  await page.waitForTimeout(150) // CodeMirror ignores Tab and Enter for 75 ms after the list opens
  const mathList = await page.innerText('.cm-tooltip-autocomplete')
  check(`${name}: Math. completes floor`, mathList.includes('floor'), mathList.split('\n').slice(0, 6).join(' '))
  await page.keyboard.press('Tab')
  await page.keyboard.type('(2.5)\nreverseW')
  await page.waitForSelector('.cm-tooltip-autocomplete')
  await page.waitForTimeout(150)
  const localList = await page.innerText('.cm-tooltip-autocomplete')
  check(`${name}: local function completes`, localList.includes('reverseWords'), localList.split('\n').slice(0, 4).join(' '))
  await page.screenshot({ path: join(shots, `${name}-complete.png`) })
  await page.keyboard.press('Enter')
  await page.keyboard.type('.')
  await page.keyboard.press('Escape')
  const doc = await page.innerText('.cm-content')
  check(`${name}: accepted completions land in the code`, doc.includes('\nMath.floor(2.5)') && doc.includes('reverseWords.'),
    doc.split('\n').slice(-3).join(' | '))

  // The code survives a reload.
  await page.waitForTimeout(500)
  await page.reload()
  await page.waitForSelector('.cm-content')
  check(`${name}: code survives reload`, (await page.innerText('.cm-content')).includes('Math.floor(2.5)'))
  await page.close()

  const cases = [
    ['runtime error has its line', 'const a = 1\n\nnull.boom()', (r) => /Feil · linje 3/i.test(r.status) && r.output.includes('TypeError')],
    ['syntax error has its line', 'let a = 1\nlet b = ;\n', (r) => /Feil · linje 2/i.test(r.status) && r.output.includes('SyntaxError')],
    ['timers are waited for', "setTimeout(() => console.log('later'), 200)\nconsole.log('now')", (r) => /Ferdig/i.test(r.status) && r.output.indexOf('now') < r.output.indexOf('later')],
    ['top-level await', 'const v = await new Promise((ok) => setTimeout(() => ok(42), 50))\nconsole.log(v)', (r) => r.output.trim() === '42'],
    ['code runs on an opaque origin', "console.log(self.origin)\nconsole.log(typeof localStorage)\nconsole.log(typeof document)", (r) => r.output.split('\n').join(' ') === 'null undefined undefined'],
    ['console levels and inspect', "console.warn('w')\nconsole.error(new RangeError('r'))\nconsole.log([1, 'a', { b: null }])", (r) => r.output.includes("[ 1, 'a', { b: null } ]") && r.output.includes('RangeError: r')],
  ]
  for (const [label, code, ok] of cases) {
    page = await open(desktop, code)
    r = await runAndWait(page)
    check(`${name}: ${label}`, ok(r), JSON.stringify(r))
    if (label.startsWith('runtime')) {
      check(`${name}: error line is marked`, (await page.locator('.cm-errorLine').count()) === 1)
      await page.screenshot({ path: join(shots, `${name}-error.png`) })
    }
    await page.close()
  }

  // A loop that never ends: Stop works, the page stays responsive, and the time limit catches it otherwise.
  page = await open(desktop, 'while (true) {}')
  await page.click('#run')
  await page.waitForTimeout(400)
  const t0 = Date.now()
  const label = await page.textContent('#run')
  check(`${name}: page responsive during a busy loop`, Date.now() - t0 < 1000 && /stopp/i.test(label), `${Date.now() - t0} ms`)
  await page.click('#run')
  check(`${name}: stop ends it`, /Stoppet/i.test(await page.textContent('#status')))
  r = await runAndWait(page, /Stoppet/i, 14000)
  check(`${name}: time limit ends it`, r.output.includes('Stoppet etter 10 sekunder'), JSON.stringify(r))
  await page.close()
  await desktop.close()

  // A phone: editor over console, page scrolls, code at 16 px.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  })
  page = await open(phone, null)
  r = await runAndWait(page)
  check(`${name}: phone run`, /Ferdig/i.test(r.status))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(`${name}: phone has no sideways scroll`, overflow <= 0, `overflow ${overflow}px`)
  await page.screenshot({ path: join(shots, `${name}-phone.png`) })
  await page.screenshot({ path: join(shots, `${name}-phone-full.png`), fullPage: true })
  await phone.close()
}

const browsers = [
  ['chrome', () => pw.chromium.launch({ executablePath: process.env.CHROME_BIN })],
  ['webkit', () => pw.webkit.launch()],
]
for (const [name, launch] of browsers) {
  const browser = await launch()
  try {
    await suite(name, browser)
  } catch (err) {
    failures++
    console.log(`FAIL ${name}: ${String(err).split('\n')[0]}`)
  }
  await browser.close()
}
console.log(failures ? `${failures} failed` : 'all ok')
process.exit(failures ? 1 : 0)
