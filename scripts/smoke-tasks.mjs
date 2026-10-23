// Browser check of the task bank in the built site, Chrome and WebKit: every task's solution solves it there (the
// checks travel as minified source, which only the built bundle tests), a starter does not, and the bank searches,
// filters and picks. Screenshots of each view, the bank and a solved task go to the shots dir.
//   PLAYWRIGHT=<path to playwright-core/index.mjs> node scripts/smoke-tasks.mjs <url> [shots dir] [task ids…]
// Serve dist/ first. CHROME_BIN points at an installed Chrome. Exits 1 when a check fails.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const pw = await import(process.env.PLAYWRIGHT ?? 'playwright-core')
const url = (process.argv[2] ?? 'http://127.0.0.1:4173/').replace(/#.*$/, '')
const shots = process.argv[3] ?? 'shots'
const only = process.argv.slice(4)
mkdirSync(shots, { recursive: true })

let failures = 0
const check = (name, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// One task per view, for the screenshots.
const VIEWS = {
  list: 'snu-lista',
  array: 'boblesortering',
  queue: 'snu-koen',
  pegs: 'hanois-tarn',
  tree: 'speil-treet',
  graph: 'steg-fra-a',
  grid: 'malingsbotta',
  pointers: 'skilpadda-og-haren',
  double: 'snu-dobbel-liste',
  shapes: 'katter-og-spokelser',
}

async function goTask(page, id) {
  await page.evaluate((to) => { location.hash = `#/${to}` }, id)
  await page.waitForFunction((to) => location.hash === `#/${to}` && document.getElementById('task-title').textContent.length > 0, id)
  // The quiet build lands the items as Ting.
  await page.waitForTimeout(250)
}

/** Runs and waits for the verdict (skipping the playback) or an error; returns what the card and status say. */
async function runTask(page) {
  await page.click('#run')
  const deadline = Date.now() + 15000
  for (;;) {
    const state = await page.evaluate(() => ({
      verdict: document.getElementById('verdict').hidden ? null : document.getElementById('verdict').className,
      text: document.getElementById('verdict').textContent,
      status: document.getElementById('status').textContent,
      skip: !document.getElementById('skip').hidden,
    }))
    if (state.verdict || /Feil|Stoppet/i.test(state.status)) return state
    if (state.skip) await page.click('#skip').catch(() => {})
    if (Date.now() > deadline) return { ...state, verdict: 'timeout' }
    await page.waitForTimeout(80)
  }
}

async function insertSolution(page) {
  await page.click('#solution-btn')
  await page.click('#solution-btn')
  await page.click('#use-solution')
}

async function browser(name, launch) {
  const b = await launch()
  const desktop = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const page = await desktop.newPage()
  await page.goto(url)
  await page.waitForSelector('#editor .cm-content')
  await page.waitForFunction(() => document.querySelectorAll('#bank-list li').length === 0 && document.getElementById('task-title').textContent)

  // First visit: the first task, nothing solved.
  check(`${name}: first visit opens task 1`, (await page.textContent('#task-meta')).startsWith('#1'), await page.textContent('#task-title'))
  check(`${name}: progress starts at zero`, (await page.textContent('#progress-count')).startsWith('0/'))

  // The bank: every task listed, search narrows, a level filter, random opens one.
  await page.click('#open-bank')
  const ids = await page.$$eval('#bank-list a', (els) => els.map((a) => a.hash.slice(2)))
  check(`${name}: the bank lists the tasks`, ids.length >= 15, `${ids.length} tasks`)
  await page.fill('#bank-search', 'hanoi')
  const found = await page.$$eval('#bank-list a', (els) => els.map((a) => a.hash.slice(2)))
  check(`${name}: search finds Hanoi`, found.includes('hanois-tarn') && found.length < ids.length, found.join(' '))
  await page.fill('#bank-search', '')
  await page.click('#bank-levels .chip[data-value="vanskelig"]')
  const hard = await page.$$eval('#bank-list .level', (els) => els.map((e) => e.textContent))
  check(`${name}: level filter`, hard.length > 0 && hard.every((t) => /vanskelig/i.test(t)), hard.join(' '))
  await page.click('#bank-levels .chip[data-value=""]')
  await page.screenshot({ path: join(shots, `${name}-bank.png`) })
  await page.click('#bank-random')
  await page.waitForFunction(() => document.getElementById('bank').hidden)
  check(`${name}: random opens a task`, /^#\/[a-z0-9-]+$/.test(await page.evaluate(() => location.hash)))

  // A starter is not solved, and the card says why.
  await goTask(page, 'snu-lista')
  let r = await runTask(page)
  check(`${name}: the starter is not solved`, /is-not/.test(r.verdict ?? ''), r.text)

  // Each view, solved, with a screenshot of its start and of the celebration.
  for (const [view, id] of Object.entries(VIEWS)) {
    await goTask(page, id)
    await page.screenshot({ path: join(shots, `${name}-view-${view}.png`) })
  }

  // Every task: its solution solves it in this browser.
  const todo = only.length ? only : ids
  let solved = 0
  for (const id of todo) {
    await goTask(page, id)
    await insertSolution(page)
    r = await runTask(page)
    const ok = /is-ok/.test(r.verdict ?? '')
    if (ok) solved++
    else check(`${name}: ${id} is solved by its solution`, false, `${r.verdict} ${r.text} ${r.status}`)
    if (id === 'hanois-tarn') {
      await page.screenshot({ path: join(shots, `${name}-solved.png`) })
      const stamp = await page.evaluate(() => {
        const el = document.getElementById('stamp')
        const r = el.getBoundingClientRect()
        return { hidden: el.hidden, opacity: getComputedStyle(el).opacity, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }
      })
      check(`${name}: the stamp shows over the stage`, !stamp.hidden && stamp.w > 50, JSON.stringify(stamp))
    }
    if (Object.values(VIEWS).includes(id)) {
      // The solved state, once the confetti has cleared.
      await page.waitForTimeout(2700)
      await page.screenshot({ path: join(shots, `${name}-solved-${id}.png`) })
    }
  }
  check(`${name}: solutions solve their tasks`, solved === todo.length, `${solved}/${todo.length}`)
  const count = await page.textContent('#progress-count')
  check(`${name}: progress counts them`, count.startsWith(`${solved}/`), count)

  // Solved ticks in the bank, and a reload keeps them.
  await page.reload()
  await page.waitForSelector('#editor .cm-content')
  check(`${name}: progress survives reload`, (await page.textContent('#progress-count')).startsWith(`${solved}/`))
  await page.click('#open-bank')
  const ticks = await page.$$eval('#bank-list .bank-tick.is-done', (els) => els.length)
  check(`${name}: the bank ticks solved tasks`, ticks === solved, `${ticks}`)
  await page.keyboard.press('Escape')

  // The playground is still there.
  await page.evaluate(() => { location.hash = '#/lekeplass' })
  await page.waitForFunction(() => /Lekeplass/i.test(document.getElementById('task-title').textContent))
  r = await runTask(page)
  check(`${name}: the playground runs`, /Ferdig/i.test(r.status), r.status)
  await desktop.close()

  // Phone: a task, the bank as a sheet.
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: name === 'chrome', hasTouch: true })
  const mobile = await phone.newPage()
  await mobile.goto(`${url}#/hanois-tarn`)
  await mobile.waitForSelector('#editor .cm-content')
  await mobile.waitForTimeout(400)
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(`${name}: phone has no sideways scroll`, overflow <= 0, `overflow ${overflow}px`)
  // Every view fits the phone's width, the widest grid too.
  const wide = []
  for (const id of [...Object.values(VIEWS), 'langtons-maur', 'livets-spill']) {
    await goTask(mobile, id)
    const over = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (over > 0) wide.push(`${id} ${over}px`)
  }
  check(`${name}: every view fits a phone`, wide.length === 0, wide.join(', '))
  await mobile.screenshot({ path: join(shots, `${name}-phone-grid.png`), fullPage: true })
  await mobile.screenshot({ path: join(shots, `${name}-phone-task.png`), fullPage: true })
  await mobile.click('#open-bank')
  const sheet = await mobile.evaluate(() => {
    const box = document.querySelector('.bank-box').getBoundingClientRect()
    const level = document.querySelector('#bank-list .level').getBoundingClientRect()
    return { box: Math.round(box.right), level: Math.round(level.right), width: window.innerWidth }
  })
  check(`${name}: the bank fits a phone`, sheet.box <= sheet.width && sheet.level <= sheet.width, JSON.stringify(sheet))
  await mobile.screenshot({ path: join(shots, `${name}-phone-bank.png`) })
  await phone.close()
  await b.close()
}

const chromeBin = process.env.CHROME_BIN
await browser('chrome', () => pw.chromium.launch(chromeBin ? { executablePath: chromeBin } : {}))
await browser('webkit', () => pw.webkit.launch())
console.log(failures ? `${failures} failed` : 'all ok')
process.exit(failures ? 1 : 0)
