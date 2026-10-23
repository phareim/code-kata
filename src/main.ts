import '@fontsource/jetbrains-mono/400.css'
import './style.css'
import type { EditorView } from '@codemirror/view'
import { Bank, levelBadge, randomTask } from './app/bank'
import { confetti, stamp } from './app/celebrate'
import { initLayout } from './app/layout'
import { flushProgress, isSolved, lastTask, markSolved, rememberLast, startSync, syncNow, taskState, updateTask, type Account, type Vote } from './app/progress'
import { Talk } from './app/talk'
import { inlineText, richText } from './app/text'
import { createEditor, firstSyntaxErrorLine, goToLine, markErrorLine, replaceDoc } from './editor/editor'
import { Runner, TIME_LIMIT_MS, type Entry, type Outcome, type Verdict, type Where } from './run/runner'
import { Stage } from './stage/stage'
import { MONSTER_CLASS, OLD_CLASSES, OLD_STARTERS, STARTER } from './starter'
import { seeded } from './tasks/build'
import { TASKS, taskById, taskNumber } from './tasks/index'
import { hasScaffold, opening, scaffolded } from './tasks/opening'
import { TOPICS, type Task } from './tasks/types'
import { renderObjects } from './world/objects'
import { label, randomWorld, type World } from './world/world'

// The playground keeps the keys the page used before it had tasks.
const PLAY_CODE = 'code-kata:code'
const PLAY_CLASS = 'code-kata:ting'

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

// The editors: the code, and the Monster class at the top of the objects pane. Both are saved for what is open.
const itemNames = () => [...world.roots.map((p) => p.key), 'Monster', 'vis', ...world.items.map((_, i) => label(i))]
let saveTimer = 0
function saveNow(): void {
  window.clearTimeout(saveTimer)
  if (!mode) return
  const code = codeView.state.doc.toString()
  const ting = classView.state.doc.toString()
  if (mode.kind === 'task') {
    const task = mode.task
    updateTask(task.id, {
      code: code === opening(task) ? undefined : code,
      ting: ting === (task.monster ?? MONSTER_CLASS) ? undefined : ting,
    })
  } else {
    store(PLAY_CODE, code)
    store(PLAY_CLASS, ting)
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
  const fields = [...source.matchAll(/^\s*(#?[A-Za-z_$][\w$]*)\s*=/gm)].map((m) => m[1])
  const methods = [...source.matchAll(/^\s*(?:static\s+|get\s+|set\s+|async\s+)?\*?\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm)]
    .map((m) => m[1]).filter((name) => name !== 'constructor')
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
  appendLines([div])
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
  }, checked ? { check: String(task.check), exports: task.exports } : undefined)
}

/** Builds the start from the class without a word in the console, unless the class fails. */
function build(): void {
  const started = ++version
  builder.run('', classView.state.doc.toString(), start, {
    output: () => {},
    clear: () => {},
    world: (next) => {
      if (version !== started) return
      built = next
      showWorld(next, true)
    },
    end: (outcome) => { if (outcome.kind === 'error' && version === started) showError(outcome) },
  })
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
    const first = markSolved(task.id)
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
const signInUrl = () => `https://auth.phareim.no/?redirect=${encodeURIComponent(location.href)}&theme=neon`
const talkButton = $<HTMLButtonElement>('talk-btn')
const talk = new Talk($('talk'), {
  code: () => ({ code: codeView.state.doc.toString(), ting: classView.state.doc.toString() }),
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
    const own = code.trim() !== '' && code !== opening(task) && code !== scaffolded(task)
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
    setText(codeView, scaffolded(task))
    verdictEl.hidden = true
    codeView.focus()
  })
  return button
}

function renderHints(task: Task): void {
  window.clearTimeout(scaffoldArmed)
  scaffoldArmed = 0
  const opened = Math.min(taskState(task.id).hints ?? 0, task.hints.length)
  hintsEl.replaceChildren(...task.hints.slice(0, opened).map((hint, i) => {
    const li = document.createElement('li')
    li.append(inlineText(hint))
    if (i === 0 && hasScaffold(task)) li.append(scaffoldButton(task))
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
  $('solution-code').textContent = task.solutionMonster ? `${task.solutionMonster}\n\n${task.solution}` : task.solution
}

function renderTask(task: Task): void {
  $('task-meta').textContent = `#${taskNumber(task)} · ${TOPICS[task.topic]}`
  $('task-level').replaceChildren(levelBadge(task.level))
  $('task-solved').hidden = !isSolved(task.id)
  showTalkButton()
  showVote()
  $('task-title').textContent = task.title
  $('task-text').replaceChildren(richText(task.text))
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
  replaceDoc(codeView, state.code ?? opening(task))
  replaceDoc(classView, state.ting ?? task.monster ?? MONSTER_CLASS)
  renderTask(task)
  setClassOpen(task.topic === 'objekter' || state.ting !== undefined)
  showClass(start.items.length > 0 || state.ting !== undefined)
  showWorld(start, false)
  build()
}

function openPlay(): void {
  leave()
  mode = { kind: 'play' }
  start = randomWorld()
  built = null
  replaceDoc(codeView, load(PLAY_CODE, STARTER, OLD_STARTERS))
  replaceDoc(classView, load(PLAY_CLASS, MONSTER_CLASS, OLD_CLASSES))
  renderPlay()
  setClassOpen(true)
  showClass(true)
  showWorld(start, false)
  build()
}

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
  setText(codeView, task.solution)
  if (task.solutionMonster) {
    setText(classView, task.solutionMonster)
    setClassOpen(true)
  }
  codeView.focus()
})
$('restart-btn').addEventListener('click', () => {
  const task = currentTask()
  if (!task) return
  setText(codeView, opening(task))
  setText(classView, task.monster ?? MONSTER_CLASS)
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
  const state = taskState(task.id)
  $('task-solved').hidden = !isSolved(task.id)
  showTalkButton()
  showVote()
  renderHints(task)
  const code = state.code ?? opening(task)
  if (code !== codeView.state.doc.toString()) replaceDoc(codeView, code)
  const ting = state.ting ?? task.monster ?? MONSTER_CLASS
  if (ting !== classView.state.doc.toString()) {
    replaceDoc(classView, ting)
    showClass(start.items.length > 0 || state.ting !== undefined)
    build()
  }
}

updateProgress()
route()
codeView.focus()
void startSync({ beforeMerge: saveNow, merged, account: showAccount })
