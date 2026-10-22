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
const CLASS_KEY = 'code-kata:ting'
const tingClass = (fields) => `class Ting {\n${fields.map((f) => `  ${f}\n`).join('')}\n  constructor(props) {\n    Object.assign(this, props)\n  }\n}\n`
const WITH_SIZE = tingClass(['value = 0', "color = 'pink'", 'next = null', 'size = 1'])
const WITHOUT_COLOR = tingClass(['value = 0', 'next = null', 'size = 1'])
const BROKEN_CLASS = 'class Ting {\n  value = 0\n  next = null\n  constructor() { null.boom() }\n}\n'
// A traversal with a named function, for the autocomplete check.
const STARTER_LIKE = 'function walkAll(node) {\n  while (node) node = node.next\n}'
// The starter kata.phareim.no had before the items (October 2026).
const OLD_STARTER = `// Skriv JavaScript og trykk «Kjør» (Cmd/Ctrl + Enter).
// Koden lagres i nettleseren.

function reverseWords(sentence) {
  return sentence.split(' ').reverse().join(' ')
}

const words = ['kata', 'er', 'små', 'oppgaver']

console.log(reverseWords(words.join(' ')))
console.log({ antall: words.length, lengste: words.reduce((a, b) => (b.length > a.length ? b : a)) })
`
let failures = 0
const check = (name, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function open(context, code, cls = null) {
  const page = await context.newPage()
  // Seeds the code and the class once per tab (null: as on a first visit), so a reload keeps what the test typed.
  await page.addInitScript((seeds) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    for (const [key, value] of seeds) {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    }
  }, [[KEY, code], [CLASS_KEY, cls]])
  await page.goto(`${url.replace(/#.*$/, '')}#/lekeplass`)
  await page.waitForSelector('.cm-content')
  await page.waitForFunction(() => /Lekeplass/i.test(document.getElementById('task-title').textContent))
  return page
}

async function runAndWait(page, until = /Ferdig|Feil|Stoppet/i, timeout = 15000, button = '#run') {
  await page.click(button)
  await page.waitForFunction((re) => new RegExp(re, 'i').test(document.getElementById('status').textContent),
    until.source, { timeout })
  return {
    status: await page.textContent('#status'),
    output: await page.innerText('#output'),
  }
}

async function setClass(page, text) {
  await page.click('#class-editor .cm-content')
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.insertText(text)
}
const countLines = (page, text) => page.$$eval('#objects .o-line', (els, t) => els.filter((e) => e.textContent.includes(t)).length, text)

// The items row in list order, by letter, and the objects pane's head line.
const rowLabels = (page) => page.$$eval('#stage .panel--list .link .token', (els) => els.map((e) => e.dataset.label))
const headLine = (page) => page.$eval('#objects .o-line', (e) => e.textContent)

const REVERSE = `let prev = null
let node = head
while (node) {
  const next = node.next
  node.next = prev
  prev = node
  node = next
}
head = prev`

async function suite(name, browser) {
  const desktop = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })

  // First visit: the starter kata runs and prints.
  let page = await open(desktop, null)
  let r = await runAndWait(page)
  let order = await rowLabels(page)
  const objectLines = await page.$$eval('#objects .o-line', (els) => els.length)
  check(`${name}: eight items, all in the list`, order.length === 8 && objectLines === 9,
    `${order.join(' ')} · ${objectLines} lines`)
  check(`${name}: starter walks the list`, /Ferdig/i.test(r.status) && r.output.trim().split('\n').length === order.length,
    JSON.stringify(r))
  await page.screenshot({ path: join(shots, `${name}-desktop.png`) })

  // Changing pointers changes the row: reverse the list, then «Nullstill» brings the first order back.
  await page.click('#editor .cm-content')
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.insertText(REVERSE)
  r = await runAndWait(page)
  const reversed = await rowLabels(page)
  check(`${name}: reversing the list reverses the row`, reversed.join() === [...order].reverse().join(),
    `${order.join(' ')} → ${reversed.join(' ')}`)
  check(`${name}: objects show the new head`, (await headLine(page)) === `head = ${order.at(-1)}`, await headLine(page))
  await page.waitForTimeout(700)
  await page.screenshot({ path: join(shots, `${name}-reversed.png`) })
  await page.click('#reset')
  check(`${name}: Nullstill restores the order`, (await rowLabels(page)).join() === order.join())
  await page.click('#fresh')
  const fresh = await rowLabels(page)
  check(`${name}: Nye makes eight new items`, fresh.length === 8, fresh.join(' '))
  await page.click('#editor .cm-content')
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.insertText(STARTER_LIKE)

  // Autocomplete: a global's members, then the code's own function name; Tab accepts.
  await page.click('#editor .cm-content')
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type('\nMath.fl')
  await page.waitForSelector('.cm-tooltip-autocomplete')
  await page.waitForTimeout(150) // CodeMirror ignores Tab and Enter for 75 ms after the list opens
  const mathList = await page.innerText('.cm-tooltip-autocomplete')
  check(`${name}: Math. completes floor`, mathList.includes('floor'), mathList.split('\n').slice(0, 6).join(' '))
  await page.keyboard.press('Tab')
  await page.keyboard.type('(2.5)\nwalk')
  await page.waitForSelector('.cm-tooltip-autocomplete')
  await page.waitForTimeout(150)
  const localList = await page.innerText('.cm-tooltip-autocomplete')
  check(`${name}: local function completes`, localList.includes('walkAll'), localList.split('\n').slice(0, 4).join(' '))
  await page.keyboard.press('Enter')
  await page.keyboard.type('\nhead.ne')
  await page.waitForSelector('.cm-tooltip-autocomplete')
  await page.waitForTimeout(150)
  const memberList = await page.innerText('.cm-tooltip-autocomplete')
  check(`${name}: head. completes next`, memberList.includes('next'), memberList.split('\n').slice(0, 4).join(' '))
  await page.screenshot({ path: join(shots, `${name}-complete.png`) })
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  const doc = await page.innerText('#editor .cm-content')
  check(`${name}: accepted completions land in the code`,
    doc.includes('\nMath.floor(2.5)') && doc.includes('\nwalkAll') && doc.includes('\nhead.next'),
    doc.split('\n').slice(-3).join(' | '))

  // The code survives a reload.
  await page.waitForTimeout(500)
  await page.reload()
  await page.waitForSelector('.cm-content')
  check(`${name}: code survives reload`, (await page.innerText('#editor .cm-content')).includes('Math.floor(2.5)'))
  await page.close()

  const cases = [
    ['runtime error has its line', 'const a = 1\n\nnull.boom()', (r) => /Feil · linje 3/i.test(r.status) && r.output.includes('TypeError')],
    ['syntax error has its line', 'let a = 1\nlet b = ;\n', (r) => /Feil · linje 2/i.test(r.status) && r.output.includes('SyntaxError')],
    ['timers are waited for', "setTimeout(() => console.log('later'), 200)\nconsole.log('now')", (r) => /Ferdig/i.test(r.status) && r.output.indexOf('now') < r.output.indexOf('later')],
    ['top-level await', 'const v = await new Promise((ok) => setTimeout(() => ok(42), 50))\nconsole.log(v)', (r) => r.output.trim() === '42'],
    ['code runs on an opaque origin', "console.log(self.origin)\nconsole.log(typeof localStorage)\nconsole.log(typeof document)", (r) => r.output.split('\n').join(' ') === 'null undefined undefined'],
    ['letters are fixed names', 'A = 1', (r) => /Feil · linje 1/i.test(r.status) && r.output.includes('TypeError')],
    ['a cycle shows as a loop', 'let last = head\nwhile (last.next) last = last.next\nlast.next = head',
      async (r, page) => /Ferdig/i.test(r.status) && (await page.locator('#stage .end--loop').count()) === 1],
    ['loose items, a loop, a CSS colour and a long value',
      "head = head.next.next\nlet last = head\nwhile (last.next) last = last.next\nlast.next = head\nA.color = 'hotpink'\nB.value = 'kirsebær'",
      async (r, page) => {
        await page.waitForTimeout(700)
        await page.screenshot({ path: join(shots, `${page.context().browser().browserType().name()}-shapes.png`) })
        return /Ferdig/i.test(r.status) && (await page.locator('#stage .panel--rest .token.is-loose').count()) === 2
          && (await page.locator('#stage .end--loop').count()) === 1
          && (await page.locator('#objects .o-comment').count()) === 2
      }],
    ['an old starter gives way to the new one', OLD_STARTER,
      async (r, page) => (await page.innerText('#editor .cm-content')).includes('lenket liste')],
    ['console levels and inspect', "console.warn('w')\nconsole.error(new RangeError('r'))\nconsole.log([1, 'a', { b: null }])", (r) => r.output.includes("[ 1, 'a', { b: null } ]") && r.output.includes('RangeError: r')],
  ]
  for (const [label, code, ok] of cases) {
    page = await open(desktop, code)
    r = await runAndWait(page)
    check(`${name}: ${label}`, await ok(r, page), JSON.stringify(r))
    if (label.startsWith('runtime')) {
      check(`${name}: error line is marked`, (await page.locator('.cm-errorLine').count()) === 1)
      await page.screenshot({ path: join(shots, `${name}-error.png`) })
    }
    await page.close()
  }

  // The Ting class: a new field reaches every item, a dropped one leaves them all, new Ting works in the code,
  // and an error in the class points at the class.
  page = await open(desktop, "head = new Ting({ value: 5, color: 'gold', next: head })")
  await page.waitForFunction(() => document.querySelectorAll('#objects .o-class').length === 8)
  await setClass(page, WITH_SIZE)
  r = await runAndWait(page, undefined, undefined, '#apply')
  check(`${name}: a new field reaches all eight`, (await countLines(page, 'size: 1')) === 8 && r.output.includes('alle 8'),
    JSON.stringify(r))
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(shots, `${name}-class.png`) })
  await setClass(page, WITHOUT_COLOR)
  r = await runAndWait(page, undefined, undefined, '#apply')
  check(`${name}: a dropped field leaves all eight`,
    (await countLines(page, 'color')) === 0 && (await page.locator('#stage .token.no-color').count()) === 8, JSON.stringify(r))
  r = await runAndWait(page)
  const withNew = await rowLabels(page)
  check(`${name}: new Ting in the code joins the list`, withNew.length === 9 && withNew[0] === 'I'
    && (await countLines(page, 'I = Ting {')) === 1, withNew.join(' '))
  await setClass(page, BROKEN_CLASS)
  r = await runAndWait(page, undefined, undefined, '#apply')
  check(`${name}: an error in the class points at the class`, /Feil · Ting linje 4/i.test(r.status)
    && (await page.locator('#class-editor .cm-errorLine').count()) === 1, JSON.stringify(r))
  await page.close()

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
  await page.$eval('#class-editor', (e) => e.scrollIntoView())
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(shots, `${name}-phone-class.png`) })
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
