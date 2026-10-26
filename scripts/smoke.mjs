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
const monsterClass = (fields, name = 'Monster') => `class ${name} {\n${fields.map((f) => `  ${f}\n`).join('')}\n  constructor(props) {\n    Object.assign(this, props)\n  }\n}\n`
const WITH_SIZE = monsterClass(['value = 0', "color = 'pink'", 'next = null', 'size = 1'])
const WITHOUT_COLOR = monsterClass(['value = 0', 'next = null', 'size = 1'])
const BROKEN_CLASS = 'class Monster {\n  value = 0\n  next = null\n  constructor() { null.boom() }\n}\n'
// The playground's class until 2026-10-23, as visitors have it saved, and one they changed.
const OLD_CLASS = `// Legg til eller ta bort et felt og trykk «Bruk».
class Ting {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
}`
const OLD_CLASS_CHANGED = monsterClass(['value = 0', "color = 'pink'", 'next = null', 'size = 2'], 'Ting')
const OLD_CODE = "head = new Ting({ value: 5, color: 'gold', next: head })"
// The starter from before the items were monsters (until 2026-10-23).
const TING_STARTER = `// Tingene over koden er en lenket liste av Ting: klassen står over tingene.
// Hver har value, color og next, og next peker på neste. head peker på den første.
// Bokstavene A, B, C … er tingene selv; head kan du flytte.

let node = head
while (node) {
  console.log(node.value, node.color)
  node = node.next
}

// Prøv: head = head.next, A.color = 'gold'
// eller head = new Ting({ value: 5, color: 'lime', next: head })
`
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

  // The right-click menu renames `prev` everywhere, and the code still reverses the list.
  const codeText = () => page.$$eval('#editor .cm-line', (els) => els.map((e) => e.textContent).join('\n'))
  const prevBox = await page.locator('#editor .cm-line').first().boundingBox()
  await page.mouse.click(prevBox.x + 6 * 8.5, prevBox.y + prevBox.height / 2, { button: 'right' })
  await page.waitForSelector('.code-menu')
  await page.screenshot({ path: join(shots, `${name}-menu.png`) })
  await page.click('.code-menu-item:has-text("Gi nytt navn")')
  await page.fill('.code-rename input', 'last')
  await page.keyboard.press('Enter')
  const renamed = await codeText()
  check(`${name}: the menu renames a variable`, !/\bprev\b/.test(renamed) && (renamed.match(/\blast\b/g) ?? []).length === 4, renamed)
  r = await runAndWait(page)
  check(`${name}: the renamed code still reverses`, (await rowLabels(page)).join() === order.join(), await rowLabels(page).then((l) => l.join(' ')))
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
    ['the Ting starter gives way to the Monster one', TING_STARTER,
      async (r, page) => (await page.innerText('#editor .cm-content')).includes('Monstrene over koden')],
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

  // The Monster class: a new field reaches every item, a dropped one leaves them all, new Monster works in the code,
  // and an error in the class points at the class.
  page = await open(desktop, "head = new Monster({ value: 5, color: 'gold', next: head })")
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
  check(`${name}: new Monster in the code joins the list`, withNew.length === 9 && withNew[0] === 'I'
    && (await countLines(page, 'I = Monster {')) === 1, withNew.join(' '))
  await setClass(page, BROKEN_CLASS)
  r = await runAndWait(page, undefined, undefined, '#apply')
  check(`${name}: an error in the class points at the class`, /Feil · Monster linje 4/i.test(r.status)
    && (await page.locator('#class-editor .cm-errorLine').count()) === 1, JSON.stringify(r))
  await page.close()

  // Saved from when the class was Ting: the unchanged class gives way to Monster and `new Ting` still works; a
  // changed one stays, and its items are Ting.
  page = await open(desktop, OLD_CODE, OLD_CLASS)
  r = await runAndWait(page)
  const classText = await page.innerText('#class-editor .cm-content')
  check(`${name}: an old unchanged class gives way to Monster, and new Ting still works`,
    /Ferdig/i.test(r.status) && classText.includes('class Monster') && (await rowLabels(page))[0] === 'I'
    && (await countLines(page, 'I = Monster {')) === 1, `${JSON.stringify(r)} ${classText.split('\n')[1]}`)
  await page.close()
  page = await open(desktop, `${OLD_CODE}\nconsole.log(head instanceof Monster)`, OLD_CLASS_CHANGED)
  r = await runAndWait(page)
  check(`${name}: an old changed class stays, with Monster as its other name`,
    /Ferdig/i.test(r.status) && r.output.trim() === 'true' && (await countLines(page, 'I = Ting {')) === 1
    && (await countLines(page, 'size: 2')) === 9, JSON.stringify(r))
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

  await layoutSuite(name, browser)
  await talkSuite(name, browser)

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
  const barRow = await page.evaluate(() => ['stage-title', 'reset', 'fresh'].map((id) => {
    const r = document.getElementById(id).getBoundingClientRect()
    return Math.round(r.top + r.height / 2)
  }))
  check(`${name}: phone keeps Monstre, Nullstill and Nye on one row`, Math.max(...barRow) - Math.min(...barRow) <= 2, barRow.join(' '))
  await page.tap('#console-title .fold')
  check(`${name}: phone folds the console`, !(await page.isVisible('#output')) && (await page.isVisible('#status')))
  // The task card's fold on the tightest head: a long level beside the thumbs and the arrows.
  await page.goto(`${url.replace(/#.*$/, '')}#/hanois-tarn`)
  await page.waitForSelector('#editor .cm-content')
  await page.tap('.task-fold')
  const tight = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(`${name}: phone folds a task card with a long level, and it fits`,
    !(await page.isVisible('#task-text')) && (await page.isVisible('#task-title')) && tight <= 0, `overflow ${tight}px`)
  await phone.close()
}

// The layout (src/app/layout.ts), in a context of its own: it lives in localStorage and would fold panes the other
// checks use.
async function layoutSuite(name, browser) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
  let page = await open(context, null)
  const box = (sel) => page.locator(sel).boundingBox()
  const reload = async () => {
    await page.reload()
    await page.waitForSelector('#editor .cm-content')
  }
  const drag = async (sel, dx, dy) => {
    const b = await box(sel)
    const x = b.x + b.width / 2
    const y = b.y + b.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 })
    await page.mouse.move(x + dx, y + dy, { steps: 4 })
    await page.mouse.up()
  }

  // Folding: the console becomes its bar (the status stays), and stays folded after a reload.
  const consoleOpen = (await box('.console-pane')).height
  await page.click('#console-title .fold')
  const folded = (await box('.console-pane')).height
  check(`${name}: the console folds to its bar`, folded < 64 && !(await page.isVisible('#output'))
    && (await page.isVisible('#status')), `${consoleOpen} → ${folded}`)
  await reload()
  check(`${name}: a folded pane stays folded after a reload`, !(await page.isVisible('#output'))
    && (await page.getAttribute('#console-title .fold', 'aria-expanded')) === 'false')
  await page.click('#console-title .fold')
  check(`${name}: and unfolds`, await page.isVisible('#output'))

  // The handles: the columns' width, the stage over the code; a double click puts a part back.
  const side0 = (await box('.col--side')).width
  await drag('.split--col', -200, 0)
  const side1 = (await box('.col--side')).width
  await reload()
  const side2 = (await box('.col--side')).width
  check(`${name}: the column handle sets the width, kept after a reload`,
    Math.abs(side0 - 200 - side1) <= 4 && Math.abs(side1 - side2) <= 2, `${side0} → ${side1} → ${side2}`)
  await page.dblclick('.split--col')
  check(`${name}: a double click on it puts the width back`, Math.abs((await box('.col--side')).width - side0) <= 2)
  const stage0 = (await box('.stage-pane')).height
  const editor0 = (await box('.editor-pane')).height
  await drag('.col--work > .split--row', 0, 100)
  const stage1 = (await box('.stage-pane')).height
  const editor1 = (await box('.editor-pane')).height
  check(`${name}: the row handle moves height from the code to the stage`,
    Math.abs(stage1 - stage0 - 100) <= 4 && Math.abs(editor0 - editor1 - 100) <= 4,
    `stage ${stage0} → ${stage1}, code ${editor0} → ${editor1}`)
  await page.screenshot({ path: join(shots, `${name}-layout.png`) })
  await page.dblclick('.col--work > .split--row')
  check(`${name}: a double click puts the heights back`, Math.abs((await box('.stage-pane')).height - stage0) <= 2)

  // The code fills the desk; the run's status shows in its bar; Esc closes a completion first, then gives the desk back.
  const desk = await box('.desk')
  await page.click('#maximize')
  const max = await box('.editor-pane')
  check(`${name}: the code fills the desk`, !(await page.isVisible('#task')) && !(await page.isVisible('#stage'))
    && Math.abs(max.width - desk.width) <= 2 && Math.abs(max.height - desk.height) <= 2,
    `${max.width}×${max.height} in ${desk.width}×${desk.height}`)
  await page.click('#run')
  await page.waitForFunction(() => /Ferdig/i.test(document.getElementById('run-status').textContent))
  check(`${name}: the run's status shows by «Kjør»`, await page.isVisible('#run-status'))
  await page.screenshot({ path: join(shots, `${name}-max.png`) })
  await page.click('#editor .cm-content')
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type('\nMath.fl')
  await page.waitForSelector('.cm-tooltip-autocomplete')
  await page.keyboard.press('Escape')
  const stillMax = await page.evaluate(() => document.querySelector('.desk').classList.contains('is-max'))
  await page.keyboard.press('Escape')
  const back = !(await page.evaluate(() => document.querySelector('.desk').classList.contains('is-max')))
  check(`${name}: Esc closes the completion first, then gives the desk back`, stillMax && back
    && (await page.isVisible('#task')))
  await page.close()

  // A tree drawn while the stage was folded is laid out again when it unfolds, as a fresh drawing would place it.
  page = await context.newPage()
  await page.goto(`${url.replace(/#.*$/, '')}#/speil-treet`)
  await page.waitForSelector('#editor .cm-content')
  await page.click('#stage-title .fold')
  await page.click('#run')
  await page.waitForFunction(() => /Ikke ennå|Ferdig|Feil/i.test(document.getElementById('status').textContent))
  await page.click('#stage-title .fold')
  await page.waitForTimeout(300)
  const lefts = () => page.$$eval('#stage .token.is-placed', (els) => els.map((e) => e.style.left).join())
  const unfolded = await lefts()
  await page.click('#reset')
  await page.waitForTimeout(700)
  const fresh = await lefts()
  check(`${name}: an unfolded stage lays the tree out again`, unfolded.length > 0 && unfolded === fresh,
    `${unfolded} | ${fresh}`)
  await page.close()
  await context.close()
}

// «Snakk om det» (src/app/talk.ts) on a solved task, with the API played by the test: not signed in, the fixed
// questions, and only a question's id goes up; signed in, the conversation and its text box.
async function talkSuite(name, browser) {
  const solved = JSON.stringify({ 'snu-lista': { solved: '2026-10-23T10:00:00.000Z' } })
  const answer = 'Du kunne også snudd lista med rekursjon.'
  const ndjson = (lines) => ({ status: 200, contentType: 'application/x-ndjson', body: lines.map((l) => `${JSON.stringify(l)}\n`).join('') })
  async function visit(viewport, account) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 })
    const sent = []
    await context.route('**/api/progress', (route) => route.fulfill(account
      ? { status: 200, contentType: 'application/json', body: JSON.stringify({ user: { name: 'Petter' }, tasks: JSON.parse(solved) }) }
      : { status: 401, contentType: 'application/json', body: '{"user":null}' }))
    await context.route('**/api/talk**', (route) => {
      const request = route.request()
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"view":[],"turnsLeft":20,"full":false}' })
      }
      sent.push(JSON.parse(request.postData() ?? '{}'))
      return route.fulfill(ndjson([...(account ? [] : [{ left: 2 }]), { text: answer }, { done: true }]))
    })
    const page = await context.newPage()
    await page.addInitScript((progress) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('code-kata:progress', progress)
    }, solved)
    await page.goto(`${url.replace(/#.*$/, '')}#/snu-lista`)
    await page.waitForSelector('#editor .cm-content')
    await page.waitForSelector('#talk-btn:not([hidden])')
    await page.click('#talk-btn')
    await page.waitForSelector('#talk:not([hidden])')
    return { context, page, sent }
  }

  let { context, page, sent } = await visit({ width: 1400, height: 900 }, false)
  const questions = await page.$$eval('.talk-question', (els) => els.map((e) => e.textContent))
  check(`${name}: not signed in, the talk offers the fixed questions and no text box`,
    questions.length === 3 && (await page.isVisible('#talk-quick')) && !(await page.isVisible('#talk-input')),
    questions.join(' | '))
  await page.click('.talk-question >> nth=0')
  await page.waitForSelector('.talk-line.is-assistant:not(.is-writing)')
  const reply = await page.textContent('.talk-line.is-assistant .talk-text')
  const body = sent[0] ?? {}
  check(`${name}: a question sends its id and the code, never words`,
    body.question === 'alternativer' && !('text' in body) && body.task === 'snu-lista' && typeof body.code === 'string',
    JSON.stringify(Object.keys(body)))
  check(`${name}: the answer shows, the question is spent, and the count shows when few are left`,
    reply.includes('rekursjon') && (await page.isDisabled('.talk-question >> nth=0'))
    && !(await page.isDisabled('.talk-question >> nth=1')) && /2 spørsmål igjen/.test(await page.textContent('#talk-note')),
    reply)
  await page.screenshot({ path: join(shots, `${name}-talk-quick.png`) })
  await page.keyboard.press('Escape')
  check(`${name}: Esc closes the sheet after an answer (the spent question took the focus with it)`, await page.isHidden('#talk'))
  await page.click('#talk-btn')
  check(`${name}: the answers are still there when the sheet opens again`, (await page.$$('.talk-line')).length === 2)
  await context.close()

  ;({ context, page, sent } = await visit({ width: 390, height: 844 }, false))
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(`${name}: the questions fit on a phone`, wide <= 0, `overflow ${wide}px`)
  await page.screenshot({ path: join(shots, `${name}-talk-phone.png`) })
  await context.close()

  ;({ context, page, sent } = await visit({ width: 1400, height: 900 }, true))
  await page.waitForSelector('.talk-line.is-assistant:not(.is-writing)')
  check(`${name}: signed in, the talk opens with the opening questions and a text box`,
    (await page.isVisible('#talk-input')) && !(await page.isVisible('#talk-quick')) && sent[0]?.text === '' && !('question' in (sent[0] ?? {})),
    JSON.stringify(sent[0] && Object.keys(sent[0])))
  await context.close()
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
