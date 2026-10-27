import '@fontsource/jetbrains-mono/400.css'
import './style.css'
import type { EditorView } from '@codemirror/view'
import { Bank, levelBadge, randomTask } from './app/bank'
import { confetti, stamp } from './app/celebrate'
import { initLayout } from './app/layout'
import { flushProgress, isSolved, lastTask, markSolved, rememberLast, saveIn, savedIn, startSync, syncNow, taskState, updateTask, type Account, type Vote } from './app/progress'
import { Talk } from './app/talk'
import { inlineText, richText } from './app/text'
import { fingerprint, translateCode } from './app/translate'
import { createEditor, firstSyntaxErrorLine, goToLine, markErrorLine, replaceDoc } from './editor/editor'
import { Runner, TIME_LIMIT_MS, type Entry, type JavaRun, type Outcome, type Verdict, type Where } from './run/runner'
import { Stage } from './stage/stage'
import { JAVA_STARTER, MONSTER_CLASS, OLD_CLASSES, OLD_STARTERS, STARTER } from './starter'
import { seeded } from './tasks/build'
import { JAVA_LIST_MONSTER } from './tasks/classes'
import { TASKS, taskById, taskNumber } from './tasks/index'
import { javaExpected, javaRoots } from './tasks/java'
import {
  hasLang, hasScaffoldIn, hintsIn, isLang, LANG_NAMES, monsterIn, openingIn, scaffoldedIn, solutionIn, solutionMonsterIn,
  textIn, type Lang,
} from './tasks/lang'
import { TOPICS, type Task } from './tasks/types'
import { renderObjects } from './world/objects'
import { label, randomWorld, type World } from './world/world'

// The playground keeps the keys the page used before it had tasks; in Java it has keys of its own.
const PLAY_CODE = 'code-kata:code'
const PLAY_CLASS = 'code-kata:ting'
const PLAY_JAVA_CODE = 'code-kata:java-code'
const PLAY_JAVA_CLASS = 'code-kata:java-ting'
/** The language the visitor last picked, a per-browser choice; a task without it opens in JavaScript. */
const LANG_KEY = 'code-kata:lang'
/** Per task (or the playground), the fingerprint of the code each language's code was last translated from. */
const TRANSLATED_KEY = 'code-kata:translated'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const runButton = $<HTMLButtonElement>('run')
const statusEl = $('status')
const runStatus = $('run-status')
const output = $('output')
const objectsPane = $('objects')
const stageNote = $('stage-note')
const skipButton = $<HTMLButtonElement>('skip')
const verdictEl = $('verdict')
const hintButton = $<HTMLButtonElement>('hint-btn')
const solutionButton = $<HTMLButtonElement>('solution-btn')
const hintsEl = $('hints')
const solutionEl = $('solution')
const speedButton = $<HTMLButtonElement>('speed')
const classToggle = $<HTMLButtonElement>('class-toggle')
const classSummary = $<HTMLButtonElement>('class-summary')
const objectsSection = classSummary.closest<HTMLElement>('.objects-pane')!

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

/*
 * What is open: a task, or the playground. In a task every run starts from `start`, the task's items for its seed,
 * and is checked. In the playground each run starts from the last one's result, as before there were tasks.
 */
type Mode = { kind: 'task'; task: Task } | { kind: 'play' }
/** Null until the first route: nothing is open, so there is nothing to save. */
let mode: Mode | null = null
let start: World = randomWorld()
/** `start` as the class last built it: what «Kjør» snaps back to before the run plays. */
let built: World | null = null
let world: World = start
/** Keeps a run that was overtaken (by another run, «Nye», «Nullstill», another task) from landing. */
let version = 0
/** The language the visitor picked, and the one the editors hold now (JavaScript for a task without the pick). */
let lang: Lang = 'js'
let codeLang: Lang = 'js'

const stage = new Stage($('stage'))
const currentTask = () => (mode?.kind === 'task' ? mode.task : null)

function showWorld(next: World, animate: boolean, duration?: number): void {
  world = next
  stage.render(world, { animate, duration, views: currentTask()?.views })
  renderObjects(objectsPane, world)
  stageNote.textContent = next.note ?? ''
}

// Pointing at an item lights it up everywhere: on the stage, in the objects pane and where others point at it.
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

// The editors: the code, and the Monster class at the top of the objects pane. Both are saved for what is open, in
// the language they are in.
const itemNames = () => [
  ...world.roots.map((p) => p.key), 'Monster', 'vis', ...(codeLang === 'java' ? ['IO'] : []), ...world.items.map((_, i) => label(i)),
]
const playKeys = (l: Lang) => (l === 'java' ? [PLAY_JAVA_CODE, PLAY_JAVA_CLASS] : [PLAY_CODE, PLAY_CLASS])
const playCode = (l: Lang) => (l === 'java' ? load(PLAY_JAVA_CODE, JAVA_STARTER) : load(PLAY_CODE, STARTER, OLD_STARTERS))
const playStarters = (l: Lang) => (l === 'java' ? [JAVA_STARTER] : [STARTER, ...OLD_STARTERS])
const playClass = (l: Lang) => (l === 'java' ? load(PLAY_JAVA_CLASS, JAVA_LIST_MONSTER) : load(PLAY_CLASS, MONSTER_CLASS, OLD_CLASSES))
let saveTimer = 0
function saveNow(): void {
  window.clearTimeout(saveTimer)
  if (!mode) return
  const code = codeView.state.doc.toString()
  const ting = classView.state.doc.toString()
  if (mode.kind === 'task') {
    const task = mode.task
    saveIn(task.id, codeLang,
      code === openingIn(task, codeLang) ? undefined : code,
      ting === monsterIn(task, codeLang) ? undefined : ting)
  } else {
    const [codeKey, classKey] = playKeys(codeLang)
    store(codeKey, code)
    store(classKey, ting)
  }
}
const saveSoon = () => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(saveNow, 300)
}
const codeView = createEditor($('editor'), { doc: '', onRun: () => run('code'), onChange: saveSoon, itemNames })
const classView = createEditor($('class-editor'), { doc: '', onRun: () => run('class'), onChange: saveSoon, itemNames })
const views: Record<Where, EditorView> = { kode: codeView, klasse: classView }

// Folding, the handles and the code filling the desk (src/app/layout.ts). Esc gives the desk back unless CodeMirror
// used the key (a completion, the search) or it closed a sheet.
const layout = initLayout(document.querySelector('.desk')!, () => codeView.focus())
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !layout.isMax || event.defaultPrevented) return
  if ((event.target as Element | null)?.closest('[role="dialog"]')) return
  layout.setMax(false)
})
const leaving = () => {
  saveNow()
  flushProgress()
}
window.addEventListener('pagehide', leaving)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaving() })

const runner = new Runner()
const builder = new Runner()
const shortcut = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'Cmd + Enter' : 'Ctrl + Enter'
$('hint').textContent = shortcut

function setStatus(text: string, state: 'running' | 'done' | 'error' | 'stopped' | 'idle'): void {
  statusEl.textContent = text
  statusEl.className = `status px is-${state}`
  // The copy in the code's bar, shown while the code fills the desk and the console is out of sight.
  runStatus.textContent = text
  runStatus.className = `status run-status px is-${state}`
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

/*
 * The class editor folds to a one-line summary (`class Monster { value, color, next }`): open in the playground, in
 * tasks about the class, and when the visitor has changed the class; folded otherwise, to leave room for the items.
 */
function classSummaryText(source: string): string {
  const java = codeLang === 'java'
  const fields = java
    ? [...source.matchAll(/^\s*(?:(?:public|protected|private|static|final)\s+)*[\w$.<>[\], ?]+?\s+([A-Za-z_$][\w$]*)\s*(?:=[^;]*)?;/gm)].map((m) => m[1])
    : [...source.matchAll(/^\s*(#?[A-Za-z_$][\w$]*)\s*=/gm)].map((m) => m[1])
  const methods = (java
    ? [...source.matchAll(/^\s*(?:(?:public|protected|private|static|final|abstract)\s+)*[\w$.<>[\], ?]+?\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm)]
    : [...source.matchAll(/^\s*(?:static\s+|get\s+|set\s+|async\s+)?\*?\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm)])
    .map((m) => m[1]).filter((name) => name !== 'constructor' && !/^(if|for|while|switch|catch)$/.test(name))
  const name = /class\s+([A-Za-z_$][\w$]*)/.exec(source)?.[1] ?? 'Monster'
  return `class ${name} { ${[...fields, ...methods.map((n) => `${n}()`)].join(', ')} }`
}

function setClassOpen(open: boolean): void {
  $('class-editor').hidden = !open
  classSummary.hidden = open
  classToggle.setAttribute('aria-expanded', String(open))
  classToggle.textContent = open ? 'Skjul klassen' : 'Vis klassen'
  if (!open) classSummary.textContent = classSummaryText(classView.state.doc.toString())
}
classToggle.addEventListener('click', () => setClassOpen(!classSummary.hidden))
classSummary.addEventListener('click', () => {
  setClassOpen(true)
  classView.focus()
})

/** A task with no monsters (the grids) has no use for the class, unless the visitor has written one there. */
function showClass(shown: boolean): void {
  objectsSection.classList.toggle('no-class', !shown)
}

/** A button that jumps to a line in an editor, and the line marked there. */
function lineLink(where: Where, at: number): HTMLButtonElement {
  const view = views[where]
  if (where === 'klasse') setClassOpen(true)
  const go = document.createElement('button')
  go.type = 'button'
  go.className = 'goto'
  go.textContent = where === 'klasse' ? `Monster linje ${at}` : `linje ${at}`
  go.addEventListener('click', () => goToLine(view, at))
  markErrorLine(view, at)
  return go
}

/** An uncaught error: the message, a link to its line, and the line marked in the editor it belongs to. */
function showError(outcome: Extract<Outcome, { kind: 'error' }>): void {
  let { line: at, where } = outcome
  if (at === null && outcome.compile) {
    // The engine gave no line (Chrome): take the first place either editor's parser gives up.
    for (const w of ['klasse', 'kode'] as const) {
      const found = firstSyntaxErrorLine(views[w].state)
      if (found !== null) { at = found; where = w; break }
    }
  }
  const div = line('error', `${outcome.name}: ${outcome.message}`)
  if (at !== null && where) div.append(' · ', lineLink(where, at))
  // A compiler's other errors, each on its line; only the first is marked in the editor.
  const more = (outcome.more ?? []).map((p) => {
    const extra = line('error', p.message)
    if (p.line !== null && p.where) {
      const go = document.createElement('button')
      go.type = 'button'
      go.className = 'goto'
      go.textContent = p.where === 'klasse' ? `Monster linje ${p.line}` : `linje ${p.line}`
      go.addEventListener('click', () => goToLine(views[p.where!], p.line!))
      extra.append(' · ', go)
    }
    return extra
  })
  appendLines([div, ...more])
  const place = where === 'klasse' ? `Monster linje ${at}` : `linje ${at}`
  setStatus(at !== null ? `Feil · ${place}` : where === 'klasse' ? 'Feil · Monster' : 'Feil', 'error')
}

function finished(outcome: Outcome, kind: 'code' | 'class'): void {
  setRunning(false)
  switch (outcome.kind) {
    case 'done':
      if (!output.childElementCount) {
        appendLines([line('note', kind === 'class' ? `Klassen Monster er brukt på alle ${world.items.length} monstrene.` : 'Ingen utskrift.')])
      }
      setStatus(`Ferdig · ${formatMs(outcome.ms)}`, 'done')
      break
    case 'error':
      showError(outcome)
      break
    case 'stopped':
      if (outcome.reason === 'timeout') {
        appendLines([line('warn', `Stoppet etter ${TIME_LIMIT_MS / 1000} sekunder. Går en løkke uten slutt, `
          + 'eller i ring rundt monstrene? Monstrene er som før.')])
      } else {
        appendLines([line('note', 'Stoppet. Monstrene er som før.')])
      }
      setStatus('Stoppet', 'stopped')
      break
  }
}

/*
 * Playback: the frames vis() took, one after the other, then the items as the run left them. A step is shorter
 * when there are many frames, so a long run still plays in a few seconds. «Hopp over» jumps to the end.
 */
let playback: { timer: number; final: World; then: () => void } | null = null

// The playback speed, a per-viewer choice kept in localStorage.
const SPEEDS = [1, 2, 4, 0.5]
let speed = Number(load('code-kata:speed', '1'))
if (!SPEEDS.includes(speed)) speed = 1
const showSpeed = () => { speedButton.textContent = `${String(speed).replace('.', ',')}x` }
showSpeed()
speedButton.addEventListener('click', () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
  store('code-kata:speed', String(speed))
  showSpeed()
})

function play(frames: World[], final: World, dropped: number, then: () => void): void {
  if (!frames.length) {
    showWorld(final, true)
    then()
    return
  }
  if (dropped) appendLines([line('note', `vis() ble kalt ${frames.length + dropped} ganger; bare de ${frames.length} første spilles av.`)])
  const base = Math.max(110, Math.min(650, 5200 / frames.length))
  let i = 0
  playback = { timer: 0, final, then }
  skipButton.hidden = false
  speedButton.hidden = false
  const tick = () => {
    if (!playback) return
    if (i >= frames.length) return endPlayback(true)
    const step = base / speed
    const frame = frames[i++]
    showWorld(frame, true, Math.min(520, step * 0.85))
    stageNote.textContent = `${i}/${frames.length}${frame.note ? ` · ${frame.note}` : ''}`
    playback.timer = window.setTimeout(tick, step)
  }
  tick()
}

/** Jumps to the end of the playback; `then` runs only when it played out or was skipped, not when overtaken. */
function endPlayback(runThen: boolean): void {
  if (!playback) return
  const { timer, final, then } = playback
  playback = null
  window.clearTimeout(timer)
  skipButton.hidden = true
  speedButton.hidden = true
  showWorld(final, true)
  if (runThen) then()
}
skipButton.addEventListener('click', () => endPlayback(true))

/** «Kjør» runs the class and the code (and a task's check); «Bruk» (or Cmd+Enter in the class) only rebuilds. */
function run(kind: 'code' | 'class'): void {
  endPlayback(false)
  for (const view of Object.values(views)) markErrorLine(view, null)
  output.replaceChildren()
  verdictEl.hidden = true
  setRunning(true)
  setStatus('Kjører', 'running')
  const started = ++version
  const task = currentTask()
  const checked = task !== null && kind === 'code'
  // A task's run starts from its items as they started; the playground goes on from where the last run left them.
  const from = task ? start : world
  if (checked && built) showWorld(built, true)
  let result: { world: World; frames: World[]; dropped: number } | null = null
  let verdict: Verdict | null = null
  runner.run(kind === 'class' ? '' : codeView.state.doc.toString(), classView.state.doc.toString(), from, {
    output: (entries) => appendLines(entries.map((e) => line(e.level, e.text))),
    clear: () => output.replaceChildren(),
    world: (next, frames, dropped) => { result = { world: next, frames, dropped } },
    verdict: (v) => { verdict = v },
    stage: showStage,
    end: (outcome) => {
      finished(outcome, kind)
      if (version !== started) return
      const landed = result as typeof result
      const judged = verdict as Verdict | null
      if (kind === 'class' && landed && task) built = landed.world
      const after = () => {
        if (task && judged) showVerdict(task, judged)
        else if (task && checked && outcome.kind === 'error') stage.shake()
      }
      if (landed) play(landed.frames, landed.world, landed.dropped, after)
      else after()
    },
  }, checked ? { check: String(task.check), exports: task.exports } : undefined, javaRun())
}

/** What a run in Java needs: the roots' types, the task's own types, how its exports are declared. */
function javaRun(): JavaRun | undefined {
  if (codeLang !== 'java') return undefined
  const task = currentTask()
  if (!task) return { roots: world.roots.map((p) => ({ name: p.key, type: 'Monster' })) }
  return { roots: javaRoots(task), prelude: task.java?.prelude, expected: javaExpected(task) }
}

/** Java compiles before it runs: the status says so, and the first time, that the compiler is on its way. */
function showStage(stage: 'loading' | 'compiling' | 'running'): void {
  setStatus(stage === 'loading' ? 'Laster Java' : stage === 'compiling' ? 'Kompilerer' : 'Kjører', 'running')
  if (stage === 'loading') {
    const note = line('note', 'Henter Java-kompilatoren (javac og TeaVM, 8 MB). Det skjer bare første gang. ')
    const link = Object.assign(document.createElement('a'), { href: '/licenses/java-wasm.md', textContent: 'Lisenser', target: '_blank', rel: 'noopener' })
    note.append(link)
    appendLines([note])
  }
}

/**
 * Builds the start from the class without a word in the console, unless the class fails. In Java only for a class
 * the visitor has changed: the task's own class is what the items were made with, and compiling takes a moment.
 */
function build(): void {
  const started = ++version
  const java = javaRun()
  if (java && classView.state.doc.toString() === (currentTask() ? monsterIn(currentTask()!, 'java') : JAVA_LIST_MONSTER)) {
    built = start
    return
  }
  builder.run('', classView.state.doc.toString(), start, {
    output: () => {},
    clear: () => {},
    world: (next) => {
      if (version !== started) return
      built = next
      showWorld(next, true)
    },
    end: (outcome) => { if (outcome.kind === 'error' && version === started) showError(outcome) },
  }, undefined, java)
}

function nextTask(task: Task, step: 1 | -1): Task | undefined {
  return TASKS[TASKS.indexOf(task) + step]
}

/** The next task not solved yet, after this one in order (from the start when none is left after it). */
function nextOpenTask(task: Task): Task | undefined {
  const i = TASKS.indexOf(task)
  const after = [...TASKS.slice(i + 1), ...TASKS.slice(0, i)]
  return after.find((t) => !isSolved(t.id)) ?? nextTask(task, 1)
}

function updateProgress(): void {
  const solved = TASKS.filter((t) => isSolved(t.id)).length
  $('progress-count').textContent = `${solved}/${TASKS.length}`
  $('progress-fill').style.width = `${(100 * solved) / TASKS.length}%`
  $('progress').title = `${solved} av ${TASKS.length} oppgaver løst`
}

function showVerdict(task: Task, v: Verdict): void {
  verdictEl.hidden = false
  verdictEl.className = `verdict ${v.ok ? 'is-ok' : v.broken ? 'is-broken' : 'is-not'}`
  const strong = (text: string) => {
    const node = document.createElement('strong')
    node.className = 'px'
    node.textContent = text
    return node
  }
  if (v.ok) {
    const first = markSolved(task.id, codeLang)
    const next = nextOpenTask(task)
    verdictEl.replaceChildren(strong('Løst!'), ` ${first ? 'Monstrene er fornøyde.' : 'Løst igjen, like fint.'} `)
    if (next) {
      const link = document.createElement('a')
      link.className = 'btn btn--pink btn--small px'
      link.href = `#/${next.id}`
      link.textContent = 'Neste oppgave'
      verdictEl.append(link)
    }
    if (talkUp) {
      const talk = document.createElement('button')
      talk.type = 'button'
      talk.className = 'btn btn--lime btn--small px verdict-talk'
      talk.textContent = 'Snakk om det'
      talk.addEventListener('click', () => void openTalk())
      verdictEl.append(' ', talk)
    }
    $('task-solved').hidden = false
    showTalkButton()
    updateProgress()
    setStatus('Løst!', 'done')
    stage.cheer()
    const rect = $('stage').getBoundingClientRect()
    confetti($<HTMLCanvasElement>('confetti'), rect, first)
    stamp($('stamp'), rect)
  } else if (v.broken) {
    verdictEl.replaceChildren(strong('Sjekken feilet.'), ' ', inlineText(v.message), ' Det er oppgavens feil, ikke din.')
    setStatus('Feil i sjekken', 'error')
  } else {
    verdictEl.replaceChildren(strong('Ikke ennå:'), ' ', inlineText(v.message))
    if (v.line !== null && v.where) verdictEl.append(' · ', lineLink(v.where, v.line))
    setStatus('Ikke ennå', 'stopped')
    stage.shake()
  }
}

/*
 * «Snakk om det» (src/app/talk.ts): a talk with Claude about a solved task, from the verdict and from the task card.
 * Signed in, a conversation of the visitor's own; otherwise the fixed questions. It needs the API, so not on a dev
 * server or in an outage (`talkUp`, from the account check).
 */
let signedIn = false
let talkUp = false
/** Whether the site's API answers (not on a dev server, not in an outage): the talk and the translations need it. */
let apiUp = false
const signInUrl = () => `https://auth.phareim.no/?redirect=${encodeURIComponent(location.href)}&theme=neon`
const talkButton = $<HTMLButtonElement>('talk-btn')
const talk = new Talk($('talk'), {
  code: () => ({ code: codeView.state.doc.toString(), ting: classView.state.doc.toString(), lang: codeLang }),
  synced: async () => {
    saveNow()
    await syncNow()
  },
  signedIn: () => signedIn,
  signInUrl,
})
function showTalkButton(): void {
  const task = currentTask()
  talkButton.hidden = !(talkUp && task && isSolved(task.id))
}
async function openTalk(): Promise<void> {
  const task = currentTask()
  if (task && talkUp) await talk.open(task)
}
talkButton.addEventListener('click', () => void openTalk())

/* Thumbs on the task card: whether the visitor liked the task, kept with its progress. Pressing it again takes it back. */
const voteButtons: Record<Vote, HTMLButtonElement> = { up: $<HTMLButtonElement>('vote-up'), down: $<HTMLButtonElement>('vote-down') }
function showVote(): void {
  const task = currentTask()
  const vote = task ? taskState(task.id).vote : undefined
  for (const [kind, button] of Object.entries(voteButtons)) {
    button.hidden = !task
    button.setAttribute('aria-pressed', String(vote === kind))
  }
}
for (const [kind, button] of Object.entries(voteButtons) as [Vote, HTMLButtonElement][]) {
  button.addEventListener('click', () => {
    const task = currentTask()
    if (!task) return
    updateTask(task.id, { vote: taskState(task.id).vote === kind ? undefined : kind })
    showVote()
  })
}

// The task card.
let scaffoldArmed = 0
const SCAFFOLD_LABEL = 'Sett inn et skjelett'

/** Under hint 1: puts the task's skeleton in the editor, asking first when that would replace the visitor's code. */
function scaffoldButton(task: Task): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'btn btn--quiet btn--small px hint-scaffold'
  button.textContent = SCAFFOLD_LABEL
  button.addEventListener('click', () => {
    const code = codeView.state.doc.toString()
    const own = code.trim() !== '' && code !== openingIn(task, codeLang) && code !== scaffoldedIn(task, codeLang)
    if (own && !scaffoldArmed) {
      button.textContent = 'Bytte ut koden din? Trykk igjen'
      scaffoldArmed = window.setTimeout(() => {
        scaffoldArmed = 0
        button.textContent = SCAFFOLD_LABEL
      }, 4000)
      return
    }
    window.clearTimeout(scaffoldArmed)
    scaffoldArmed = 0
    button.textContent = SCAFFOLD_LABEL
    setText(codeView, scaffoldedIn(task, codeLang))
    verdictEl.hidden = true
    codeView.focus()
  })
  return button
}

function renderHints(task: Task): void {
  window.clearTimeout(scaffoldArmed)
  scaffoldArmed = 0
  const hints = hintsIn(task, codeLang)
  const opened = Math.min(taskState(task.id).hints ?? 0, hints.length)
  hintsEl.replaceChildren(...hints.slice(0, opened).map((hint, i) => {
    const li = document.createElement('li')
    li.append(inlineText(hint))
    if (i === 0 && hasScaffoldIn(task, codeLang)) li.append(scaffoldButton(task))
    return li
  }))
  hintButton.disabled = opened >= task.hints.length
  hintButton.textContent = opened >= task.hints.length ? 'Ingen flere hint' : `Hint ${opened + 1}/${task.hints.length}`
}

let solutionArmed = 0
function renderSolution(task: Task, open: boolean): void {
  window.clearTimeout(solutionArmed)
  solutionArmed = 0
  solutionEl.hidden = !open
  solutionButton.textContent = open ? 'Skjul løsningen' : 'Løsning'
  const cls = solutionMonsterIn(task, codeLang)
  $('solution-code').textContent = cls ? `${cls}\n\n${solutionIn(task, codeLang)}` : solutionIn(task, codeLang)
}

function renderTask(task: Task): void {
  $('task-meta').textContent = `#${taskNumber(task)} · ${TOPICS[task.topic]}`
  $('task-level').replaceChildren(levelBadge(task.level))
  $('task-solved').hidden = !isSolved(task.id)
  showTalkButton()
  showVote()
  $('task-title').textContent = task.title
  $('task-text').replaceChildren(richText(textIn(task, codeLang)))
  $('task-actions').hidden = false
  verdictEl.hidden = true
  renderHints(task)
  renderSolution(task, false)
  $<HTMLButtonElement>('prev-task').hidden = false
  $<HTMLButtonElement>('next-task').hidden = false
  $<HTMLButtonElement>('prev-task').disabled = !nextTask(task, -1)
  $<HTMLButtonElement>('next-task').disabled = !nextTask(task, 1)
  document.title = `${task.title} · Kodekata`
}

function renderPlay(): void {
  $('task-meta').textContent = 'Fri lek'
  $('task-level').replaceChildren()
  $('task-solved').hidden = true
  $('task-title').textContent = 'Lekeplass'
  $('task-text').replaceChildren(richText(`Her er det ingen oppgave og ingen sjekk: lek med monstrene. Hver kjøring fortsetter der den forrige slapp. «Nullstill» går tilbake til starten, og «Nye» gir åtte nye monstre.

Vil du ha noe å bryne deg på, trykk «Oppgaver» eller «Tilfeldig» øverst.`))
  $('task-actions').hidden = true
  verdictEl.hidden = true
  showTalkButton()
  showVote()
  hintsEl.replaceChildren()
  solutionEl.hidden = true
  $<HTMLButtonElement>('prev-task').hidden = true
  $<HTMLButtonElement>('next-task').hidden = true
  document.title = 'Lekeplass · Kodekata'
}

function leave(): void {
  saveNow()
  endPlayback(false)
  runner.stop()
  builder.stop()
  version++
  for (const view of Object.values(views)) markErrorLine(view, null)
  output.replaceChildren()
  setStatus('Klar', 'idle')
  setRunning(false)
  // Another task brings its text: the code gives the desk back.
  layout.setMax(false)
}

const newSeed = () => Math.floor(Math.random() * 1_000_000_000)

function openTask(task: Task): void {
  leave()
  mode = { kind: 'task', task }
  rememberLast(task.id)
  const state = taskState(task.id)
  let seed = state.seed
  if (seed === undefined) {
    seed = newSeed()
    updateTask(task.id, { seed })
  }
  start = task.world(seeded(seed))
  built = null
  codeLang = hasLang(task, lang) ? lang : 'js'
  const saved = loadEditors(task)
  renderTask(task)
  setClassOpen(task.topic === 'objekter' || saved.ting !== undefined)
  showClass(start.items.length > 0 || saved.ting !== undefined)
  showWorld(start, false)
  showLang()
  build()
}

/** Puts a task's code and class in the editors, in the language they are in now; what was saved, or the opening. */
function loadEditors(task: Task): { code?: string; ting?: string } {
  const saved = savedIn(task.id, codeLang)
  replaceDoc(codeView, saved.code ?? openingIn(task, codeLang), codeLang)
  replaceDoc(classView, saved.ting ?? monsterIn(task, codeLang), codeLang)
  return saved
}

function openPlay(): void {
  leave()
  mode = { kind: 'play' }
  start = randomWorld()
  built = null
  codeLang = lang
  replaceDoc(codeView, playCode(codeLang), codeLang)
  replaceDoc(classView, playClass(codeLang), codeLang)
  renderPlay()
  setClassOpen(true)
  showClass(true)
  showWorld(start, false)
  showLang()
  build()
}

/*
 * The language switch by «Kode». Each language keeps its own code per task. Switching after writing code of one's own
 * asks Claude to write it in the other language (worker/translate.ts), so the visitor sees what they are doing now in
 * that one; the editor gets it as an edit, so Cmd/Ctrl+Z brings back what that language had. Switching back without
 * changing anything gives back exactly what was there: a translation is only made from code that changed since.
 */
const langButtons = [...document.querySelectorAll<HTMLButtonElement>('#lang [data-lang]')]
let switching = 0

function showLang(): void {
  const task = currentTask()
  for (const button of langButtons) {
    const l = button.dataset.lang as Lang
    const available = !task || hasLang(task, l)
    button.setAttribute('aria-pressed', String(l === codeLang))
    button.disabled = !available
    button.title = available ? `Skriv koden i ${LANG_NAMES[l]}` : `Oppgaven finnes bare i JavaScript ennå`
  }
}

function translatedFor(key: string): Partial<Record<Lang, string>> {
  try {
    const all = JSON.parse(localStorage.getItem(TRANSLATED_KEY) ?? '{}') as Record<string, Partial<Record<Lang, string>>>
    return all[key] ?? {}
  } catch {
    return {}
  }
}

function rememberTranslated(key: string, marks: Partial<Record<Lang, string>>): void {
  try {
    const all = JSON.parse(localStorage.getItem(TRANSLATED_KEY) ?? '{}') as Record<string, Partial<Record<Lang, string>>>
    all[key] = { ...all[key], ...marks }
    localStorage.setItem(TRANSLATED_KEY, JSON.stringify(all))
  } catch {
    // Not remembered: the next switch translates again.
  }
}

async function switchLang(to: Lang): Promise<void> {
  const task = currentTask()
  if (!mode || to === codeLang || (task && !hasLang(task, to))) return
  saveNow()
  const from = codeLang
  const code = codeView.state.doc.toString()
  const ting = classView.state.doc.toString()
  lang = to
  store(LANG_KEY, to)
  endPlayback(false)
  runner.stop()
  builder.stop()
  version++
  codeLang = to
  for (const view of Object.values(views)) markErrorLine(view, null)
  output.replaceChildren()
  verdictEl.hidden = true
  setStatus('Klar', 'idle')
  if (task) {
    loadEditors(task)
    renderTask(task)
  } else {
    replaceDoc(codeView, playCode(to), to)
    replaceDoc(classView, playClass(to), to)
  }
  if (!classSummary.hidden) classSummary.textContent = classSummaryText(classView.state.doc.toString())
  showLang()
  showWorld(built ?? start, false)

  // Translate code of the visitor's own, unless this language's code was made from it already.
  const key = task?.id ?? 'lekeplass'
  const own = task ? code.trim() !== openingIn(task, from).trim() : !playStarters(from).includes(code)
  const print = fingerprint(code, ting)
  if (!own || translatedFor(key)[to] === print) return
  if (!apiUp) {
    appendLines([line('note', `Koden din i ${LANG_NAMES[from]} er der den var. Her står det du hadde i ${LANG_NAMES[to]}.`)])
    return
  }
  const turn = ++switching
  const before = codeView.state.doc.toString()
  setStatus('Oversetter', 'running')
  const result = await translateCode(key, from, to, code, ting)
  if (turn !== switching || codeLang !== to || currentTask() !== task) return
  if (!result.ok) {
    setStatus('Klar', 'idle')
    const why = result.reason === 'limit' ? 'Det er oversatt nok for i dag; prøv igjen i morgen.'
      : result.reason === 'long' ? 'Koden er for lang til å oversette.'
        : result.reason === 'off' ? 'Oversettelsen er ikke tilgjengelig nå.'
          : 'Oversettelsen gikk ikke denne gangen.'
    appendLines([line('note', `${why} Her står det du hadde i ${LANG_NAMES[to]}.`)])
    return
  }
  if (codeView.state.doc.toString() !== before) {
    setStatus('Klar', 'idle')
    appendLines([line('note', 'Oversettelsen kom etter at du begynte å skrive, så den ble ikke satt inn.')])
    return
  }
  setText(codeView, result.code)
  if (result.ting && result.ting !== classView.state.doc.toString()) setText(classView, result.ting)
  rememberTranslated(key, { [to]: print, [from]: fingerprint(codeView.state.doc.toString(), classView.state.doc.toString()) })
  saveNow()
  setStatus('Oversatt', 'done')
  appendLines([line('note', `Claude har skrevet koden din fra ${LANG_NAMES[from]} i ${LANG_NAMES[to]}. `
    + `${shortcut.replace('Enter', 'Z')} gir deg tilbake det som stod her før.`)])
}
for (const button of langButtons) button.addEventListener('click', () => void switchLang(button.dataset.lang as Lang))

const bank = new Bank($('bank'), () => currentTask()?.id ?? null)

/** #/<task id>, #/lekeplass, or nothing: the last task, else the first. */
function route(): void {
  bank.close()
  talk.close()
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
  if (id === 'lekeplass') {
    if (mode?.kind !== 'play') openPlay()
    return
  }
  const task = taskById(id) ?? taskById(lastTask() ?? '') ?? TASKS[0]
  if (id !== task.id) history.replaceState(null, '', `#/${task.id}`)
  if (currentTask() !== task) openTask(task)
}
window.addEventListener('hashchange', route)

hintButton.addEventListener('click', () => {
  const task = currentTask()
  if (!task) return
  updateTask(task.id, { hints: Math.min((taskState(task.id).hints ?? 0) + 1, task.hints.length) }, true)
  renderHints(task)
  hintsEl.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
})
solutionButton.addEventListener('click', () => {
  const task = currentTask()
  if (!task) return
  if (!solutionEl.hidden) return renderSolution(task, false)
  if (!solutionArmed) {
    solutionButton.textContent = 'Sikker? Trykk igjen'
    solutionArmed = window.setTimeout(() => renderSolution(task, false), 4000)
    return
  }
  updateTask(task.id, { peeked: true }, true)
  renderSolution(task, true)
})
/** Replaces an editor's text as an edit, so Cmd+Z brings the old text back. */
function setText(view: EditorView, text: string): void {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
}
$('use-solution').addEventListener('click', () => {
  const task = currentTask()
  if (!task) return
  setText(codeView, solutionIn(task, codeLang))
  const cls = solutionMonsterIn(task, codeLang)
  if (cls) {
    setText(classView, cls)
    setClassOpen(true)
  }
  codeView.focus()
})
$('restart-btn').addEventListener('click', () => {
  const task = currentTask()
  if (!task) return
  setText(codeView, openingIn(task, codeLang))
  setText(classView, monsterIn(task, codeLang))
  verdictEl.hidden = true
  codeView.focus()
})
for (const [id, step] of [['prev-task', -1], ['next-task', 1]] as const) {
  $(id).addEventListener('click', () => {
    const task = currentTask()
    const to = task && nextTask(task, step)
    if (to) location.hash = `#/${to.id}`
  })
}
$('open-bank').addEventListener('click', () => bank.open())
$('random-task').addEventListener('click', () => {
  const task = randomTask(TASKS, currentTask()?.id ?? null)
  if (task) location.hash = `#/${task.id}`
})
document.addEventListener('keydown', (event) => {
  if (event.key !== '/' || bank.isOpen || talk.isOpen || event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, .cm-editor')) return
  event.preventDefault()
  bank.open()
})

$('fresh').addEventListener('click', () => {
  endPlayback(false)
  const task = currentTask()
  if (task) {
    const seed = newSeed()
    updateTask(task.id, { seed })
    start = task.world(seeded(seed))
  } else {
    start = randomWorld()
  }
  built = null
  verdictEl.hidden = true
  showWorld(start, false)
  build()
})
$('reset').addEventListener('click', () => {
  endPlayback(false)
  verdictEl.hidden = true
  showWorld(built ?? start, true)
  build()
})
$('apply').addEventListener('click', () => run('class'))
runButton.addEventListener('click', () => (runner.running ? runner.stop() : run('code')))
$('clear').addEventListener('click', () => output.replaceChildren())

/* The account at auth.phareim.no: signed in, the progress follows the visitor (src/app/progress.ts). */
const accountLink = $<HTMLAnchorElement>('account')
function showAccount(account: Account | null, available: boolean): void {
  signedIn = !!account
  talkUp = available
  apiUp = available
  showTalkButton()
  accountLink.hidden = !available
  accountLink.href = signInUrl()
  accountLink.textContent = account ? account.name || 'Konto' : 'Logg inn'
  accountLink.classList.toggle('is-in', !!account)
  accountLink.title = account
    ? `Logget inn${account.name ? ` som ${account.name}` : ''}. Fremdriften lagres på kontoen.`
    : 'Logg inn for å ha fremdriften med deg på andre maskiner'
}
// The way back is where the visitor is when they click, not where they were when the page asked.
accountLink.addEventListener('click', () => {
  accountLink.href = signInUrl()
})

/** The account changed tasks: redraw what shows them, and the open task's code when the account's is newer. */
function merged(ids: string[]): void {
  updateProgress()
  if (bank.isOpen) bank.render()
  const task = currentTask()
  if (!task || !ids.includes(task.id)) return
  $('task-solved').hidden = !isSolved(task.id)
  showTalkButton()
  showVote()
  renderHints(task)
  const saved = savedIn(task.id, codeLang)
  const code = saved.code ?? openingIn(task, codeLang)
  if (code !== codeView.state.doc.toString()) replaceDoc(codeView, code, codeLang)
  const ting = saved.ting ?? monsterIn(task, codeLang)
  if (ting !== classView.state.doc.toString()) {
    replaceDoc(classView, ting, codeLang)
    showClass(start.items.length > 0 || saved.ting !== undefined)
    build()
  }
}

{
  const saved = load(LANG_KEY, 'js')
  lang = isLang(saved) ? saved : 'js'
}
updateProgress()
route()
codeView.focus()
void startSync({ beforeMerge: saveNow, merged, account: showAccount })
