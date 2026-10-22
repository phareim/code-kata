import '@fontsource/jetbrains-mono/400.css'
import './style.css'
import type { EditorView } from '@codemirror/view'
import { createEditor, firstSyntaxErrorLine, goToLine, markErrorLine } from './editor/editor'
import { Runner, TIME_LIMIT_MS, type Entry, type Outcome, type Where } from './run/runner'
import { OLD_STARTERS, STARTER, TING_CLASS } from './starter'
import { renderObjects } from './world/objects'
import { renderRow } from './world/row'
import { label, randomWorld, type World } from './world/world'

const CODE_KEY = 'code-kata:code'
const CLASS_KEY = 'code-kata:ting'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const runButton = $<HTMLButtonElement>('run')
const statusEl = $('status')
const output = $('output')
const itemsRow = $('items')
const objectsPane = $('objects')

function load(key: string, fallback: string, old: string[] = []): string {
  try {
    const saved = localStorage.getItem(key)
    return saved === null || old.includes(saved) ? fallback : saved
  } catch {
    return fallback
  }
}

function store(key: string, text: string): void {
  try {
    localStorage.setItem(key, text)
  } catch {
    // Private mode or blocked storage: the text lives as long as the tab.
  }
}

// The items: a new set of eight on every visit, built from the Ting class. Each run starts from `world` and its
// result becomes the new one; «Nullstill» goes back to `initial`. `version` keeps a run that was overtaken by a
// later one, or by «Nye»/«Nullstill», from landing.
let initial = randomWorld()
let world = initial
let version = 0

function showWorld(next: World, animate: boolean): void {
  world = next
  renderRow(itemsRow, world, animate)
  renderObjects(objectsPane, world)
}

// Pointing at an item lights it up everywhere: in the row, in the objects pane and where other items point at it.
function lightUp(name: string | undefined, on: boolean): void {
  if (!name) return
  for (const node of document.querySelectorAll(`[data-label="${name}"]`)) node.classList.toggle('is-hot', on)
}
for (const type of ['pointerover', 'pointerout'] as const) {
  document.addEventListener(type, (event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-label]')
    lightUp(target?.dataset.label, type === 'pointerover')
  })
}

const itemNames = () => ['head', 'Ting', ...world.items.map((_, i) => label(i))]
const timers: Record<string, number> = {}
const saveLater = (key: string) => (text: string) => {
  window.clearTimeout(timers[key])
  timers[key] = window.setTimeout(() => store(key, text), 300)
}

// Two editors: the kata code, and the Ting class at the top of the objects pane.
const codeView = createEditor($('editor'), {
  doc: load(CODE_KEY, STARTER, OLD_STARTERS),
  onRun: () => run('code'),
  onChange: saveLater(CODE_KEY),
  itemNames,
})
const classView = createEditor($('class-editor'), {
  doc: load(CLASS_KEY, TING_CLASS),
  onRun: () => run('class'),
  onChange: saveLater(CLASS_KEY),
  itemNames,
})
const views: Record<Where, EditorView> = { kode: codeView, ting: classView }
window.addEventListener('pagehide', () => {
  store(CODE_KEY, codeView.state.doc.toString())
  store(CLASS_KEY, classView.state.doc.toString())
})

const runner = new Runner()
const builder = new Runner()
const shortcut = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'Cmd + Enter' : 'Ctrl + Enter'
$('hint').textContent = shortcut

function setStatus(text: string, state: 'running' | 'done' | 'error' | 'stopped' | 'idle'): void {
  statusEl.textContent = text
  statusEl.className = `status px is-${state}`
}

function setRunning(running: boolean): void {
  runButton.textContent = running ? 'Stopp' : 'Kjør'
  runButton.title = running ? 'Stopp kjøringen' : `Kjør koden (${shortcut})`
  runButton.classList.toggle('is-running', running)
}
setRunning(false)

// Follow the output down unless the reader has scrolled up to look at something.
function appendLines(nodes: HTMLElement[]): void {
  const atBottom = output.scrollHeight - output.scrollTop - output.clientHeight < 24
  output.append(...nodes)
  if (atBottom) output.scrollTop = output.scrollHeight
}

function line(level: Entry['level'] | 'note', text: string): HTMLDivElement {
  const div = document.createElement('div')
  div.className = `line ${level}`
  div.textContent = text
  return div
}

function formatMs(ms: number): string {
  if (ms < 1) return '<1 ms'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

/** An uncaught error: the message, a link to its line, and the line marked in the editor it belongs to. */
function showError(outcome: Extract<Outcome, { kind: 'error' }>): void {
  let { line: at, where } = outcome
  if (at === null && outcome.compile) {
    // The engine gave no line (Chrome): take the first place either editor's parser gives up.
    for (const w of ['ting', 'kode'] as const) {
      const found = firstSyntaxErrorLine(views[w].state)
      if (found !== null) { at = found; where = w; break }
    }
  }
  const div = line('error', `${outcome.name}: ${outcome.message}`)
  const place = where === 'ting' ? `Ting linje ${at}` : `linje ${at}`
  if (at !== null && where) {
    const view = views[where]
    const go = document.createElement('button')
    go.type = 'button'
    go.className = 'goto'
    go.textContent = place
    go.addEventListener('click', () => goToLine(view, at))
    div.append(' · ', go)
    markErrorLine(view, at)
  }
  appendLines([div])
  setStatus(at !== null ? `Feil · ${place}` : where === 'ting' ? 'Feil · Ting' : 'Feil', 'error')
}

function finished(outcome: Outcome, kind: 'code' | 'class'): void {
  setRunning(false)
  switch (outcome.kind) {
    case 'done':
      if (!output.childElementCount) {
        appendLines([line('note', kind === 'class' ? `Klassen Ting er brukt på alle ${world.items.length} tingene.` : 'Ingen utskrift.')])
      }
      setStatus(`Ferdig · ${formatMs(outcome.ms)}`, 'done')
      break
    case 'error':
      showError(outcome)
      break
    case 'stopped':
      if (outcome.reason === 'timeout') {
        appendLines([line('warn', `Stoppet etter ${TIME_LIMIT_MS / 1000} sekunder. Går en løkke uten slutt, `
          + 'eller i ring rundt tingene? Tingene er som før.')])
      } else {
        appendLines([line('note', 'Stoppet. Tingene er som før.')])
      }
      setStatus('Stoppet', 'stopped')
      break
  }
}

/** «Kjør» runs the class and the code; «Bruk» (or Cmd+Enter in the class) only rebuilds the items from the class. */
function run(kind: 'code' | 'class'): void {
  for (const view of Object.values(views)) markErrorLine(view, null)
  output.replaceChildren()
  setRunning(true)
  setStatus('Kjører', 'running')
  const started = ++version
  const code = kind === 'class' ? '' : codeView.state.doc.toString()
  runner.run(code, classView.state.doc.toString(), world, {
    output: (entries) => appendLines(entries.map((e) => line(e.level, e.text))),
    clear: () => output.replaceChildren(),
    world: (next) => { if (version === started) showWorld(next, true) },
    end: (outcome) => finished(outcome, kind),
  })
}

/** Builds a fresh set from the class without a word in the console, unless the class fails. */
function build(): void {
  const started = ++version
  builder.run('', classView.state.doc.toString(), world, {
    output: () => {},
    clear: () => {},
    world: (next) => { if (version === started) showWorld(next, true) },
    end: (outcome) => { if (outcome.kind === 'error' && version === started) showError(outcome) },
  })
}

showWorld(world, false)
build()

$('fresh').addEventListener('click', () => {
  initial = randomWorld()
  showWorld(initial, false)
  build()
})
$('reset').addEventListener('click', () => {
  showWorld(initial, true)
  build()
})
$('apply').addEventListener('click', () => run('class'))
runButton.addEventListener('click', () => (runner.running ? runner.stop() : run('code')))
$('clear').addEventListener('click', () => output.replaceChildren())
codeView.focus()
