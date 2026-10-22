import '@fontsource/jetbrains-mono/400.css'
import './style.css'
import { createEditor, firstSyntaxErrorLine, goToLine, markErrorLine } from './editor/editor'
import { Runner, TIME_LIMIT_MS, type Entry, type Outcome } from './run/runner'
import { STARTER } from './starter'

const STORAGE_KEY = 'code-kata:code'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const runButton = $<HTMLButtonElement>('run')
const clearButton = $<HTMLButtonElement>('clear')
const statusEl = $('status')
const output = $('output')
const hint = $('hint')

function loadCode(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? STARTER
  } catch {
    return STARTER
  }
}

function storeCode(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Private mode or blocked storage: the code lives as long as the tab.
  }
}

let saveTimer = 0
const view = createEditor($('editor'), {
  doc: loadCode(),
  onRun: () => run(),
  onChange: (code) => {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => storeCode(code), 300)
  },
})
window.addEventListener('pagehide', () => storeCode(view.state.doc.toString()))

const runner = new Runner()
const shortcut = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'Cmd + Enter' : 'Ctrl + Enter'
hint.textContent = shortcut

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

function finished(outcome: Outcome): void {
  setRunning(false)
  switch (outcome.kind) {
    case 'done':
      if (!output.childElementCount) appendLines([line('note', 'Ingen utskrift.')])
      setStatus(`Ferdig · ${formatMs(outcome.ms)}`, 'done')
      break
    case 'error': {
      const at = outcome.line ?? (outcome.compile ? firstSyntaxErrorLine(view.state) : null)
      const div = line('error', `${outcome.name}: ${outcome.message}`)
      if (at !== null) {
        const go = document.createElement('button')
        go.type = 'button'
        go.className = 'goto'
        go.textContent = `linje ${at}`
        go.addEventListener('click', () => goToLine(view, at))
        div.append(' · ', go)
      }
      appendLines([div])
      markErrorLine(view, at)
      setStatus(at !== null ? `Feil · linje ${at}` : 'Feil', 'error')
      break
    }
    case 'stopped':
      if (outcome.reason === 'timeout') {
        appendLines([line('warn', `Stoppet etter ${TIME_LIMIT_MS / 1000} sekunder. Går en løkke uten slutt?`)])
        setStatus('Stoppet', 'stopped')
      } else {
        appendLines([line('note', 'Stoppet.')])
        setStatus('Stoppet', 'stopped')
      }
      break
  }
}

function run(): void {
  markErrorLine(view, null)
  output.replaceChildren()
  setRunning(true)
  setStatus('Kjører', 'running')
  runner.run(view.state.doc.toString(), {
    output: (entries) => appendLines(entries.map((e) => line(e.level, e.text))),
    clear: () => output.replaceChildren(),
    end: finished,
  })
}

runButton.addEventListener('click', () => (runner.running ? runner.stop() : run()))
clearButton.addEventListener('click', () => output.replaceChildren())
view.focus()
