/*
 * «Snakk om det»: the sheet where a visitor talks with Claude about a task they have solved (worker/talk.ts).
 * Signed in, the conversation lives on the account (`/api/talk`) and the visitor asks what they like; the sheet shows
 * it and streams each new answer. Not signed in, the visitor picks one of QUESTIONS at a time, and the answers stay
 * in the page, per task, until it reloads.
 */
import type { Task } from '../tasks/types'
import { replyText } from './text'

/** What the visitor asks first (Petter's three questions); the Worker sends it, the sheet shows it. */
export const OPENER = 'Snakk med meg om løsningen min. Hva kunne alternativene vært? Var dette en elegant eller en krøkkete løsning?'

/**
 * What a visitor who isn't signed in can ask. The page sends the id and the Worker puts in the words, so nothing else
 * can be asked that way (worker/talk.ts). The page and the Worker deploy together, so an id may change with both.
 */
export const QUESTIONS = {
  alternativer: 'Hva kunne alternativene vært?',
  elegant: 'Er dette en elegant eller en krøkkete løsning?',
  enklere: 'Hvordan kan koden min bli enklere å lese?',
} as const
export type QuestionId = keyof typeof QUESTIONS

interface Line {
  role: 'user' | 'assistant'
  text: string
}

export interface TalkHooks {
  /** The code and the class in the editors now. */
  code: () => { code: string; ting: string }
  /** Resolves when the account knows what this browser knows (that the task is solved). */
  synced: () => Promise<void>
  /** Whether the visitor is signed in: a conversation of their own, or the fixed questions. */
  signedIn: () => boolean
  /** Where «Logg inn» goes from here. */
  signInUrl: () => string
}

const ERRORS: Record<string, string> = {
  unsolved: 'Løs oppgaven først, så kan vi snakke om den.',
  turns: 'Nok prat for i dag: dagens svar er brukt opp. I morgen igjen.',
  'quick-turns': 'Dagens spørsmål herfra er brukt opp. Logg inn for flere, eller kom tilbake i morgen.',
  budget: 'Kodekata har snakket nok for i dag. Prøv igjen i morgen.',
  full: 'Samtalen er full. «Ny samtale» begynner på nytt.',
  long: 'Koden er for lang til å snakke om her.',
  off: 'Samtalen er ikke slått på ennå.',
  refused: 'Det ville ikke Claude svare på. Prøv å spørre på en annen måte.',
  signedout: 'Logg inn for å snakke om løsningen.',
  failed: 'Noe gikk galt. Prøv igjen.',
}
/** Errors after which asking again today is no use. */
const FINAL = new Set(['full', 'turns', 'quick-turns', 'budget', 'off', 'signedout'])

export class Talk {
  private task: Task | null = null
  private busy = false
  private quick = false
  private version = 0
  private returnFocus: HTMLElement | null = null
  /** The fixed questions' answers, per task, and which question was asked about which code. */
  private readonly quickLogs = new Map<string, Line[]>()
  private readonly asked = new Set<string>()
  private readonly log: HTMLOListElement
  private readonly form: HTMLFormElement
  private readonly input: HTMLTextAreaElement
  private readonly send: HTMLButtonElement
  private readonly note: HTMLElement
  private readonly quickBox: HTMLElement
  private readonly questions: Record<QuestionId, HTMLButtonElement>

  constructor(private readonly root: HTMLElement, private readonly hooks: TalkHooks) {
    this.log = root.querySelector('#talk-log')!
    this.form = root.querySelector('#talk-form')!
    this.input = root.querySelector('#talk-input')!
    this.send = root.querySelector('#talk-send')!
    this.note = root.querySelector('#talk-note')!
    this.quickBox = root.querySelector('#talk-quick')!
    const list = root.querySelector('#talk-questions')!
    this.questions = Object.fromEntries(Object.entries(QUESTIONS).map(([id, words]) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'btn btn--lime talk-question'
      button.textContent = words
      button.addEventListener('click', () => void this.askQuestion(id as QuestionId))
      list.append(button)
      return [id, button]
    })) as Record<QuestionId, HTMLButtonElement>
    const login = root.querySelector<HTMLAnchorElement>('#talk-login')!
    login.addEventListener('click', () => { login.href = hooks.signInUrl() })
    root.querySelector('#talk-close')!.addEventListener('click', () => this.close())
    root.querySelector('#talk-new')!.addEventListener('click', () => void this.restart())
    root.addEventListener('click', (event) => { if (event.target === root) this.close() })
    root.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.close() })
    this.form.addEventListener('submit', (event) => {
      event.preventDefault()
      void this.ask(this.input.value)
    })
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault()
        void this.ask(this.input.value)
      }
    })
  }

  get isOpen(): boolean {
    return !this.root.hidden
  }

  async open(task: Task): Promise<void> {
    const version = ++this.version
    this.returnFocus = document.activeElement as HTMLElement | null
    this.task = task
    this.quick = !this.hooks.signedIn()
    this.root.hidden = false
    document.body.classList.add('has-sheet')
    this.root.querySelector('#talk-task')!.textContent = task.title
    this.log.replaceChildren()
    this.setNote('')
    this.form.hidden = this.quick
    this.quickBox.hidden = !this.quick
    this.root.classList.toggle('is-quick', this.quick)
    if (this.quick) {
      for (const line of this.quickLogs.get(task.id) ?? []) this.line(line.role, line.text)
      this.setBusy(false)
      Object.values(this.questions).find((b) => !b.disabled)?.focus()
      return
    }
    this.setBusy(true)
    try {
      await this.hooks.synced()
      const res = await fetch(`/api/talk?task=${encodeURIComponent(task.id)}`, { credentials: 'same-origin', cache: 'no-store' })
      if (version !== this.version) return
      if (!res.ok) return this.fail(res.status === 401 ? 'signedout' : 'failed')
      const data = await res.json() as { view: Line[]; turnsLeft: number; full: boolean }
      for (const line of data.view) this.line(line.role, line.text)
      this.turnsLeft(data.turnsLeft)
      this.setBusy(false)
      if (data.full) this.fail('full')
      if (!data.view.length) await this.ask('', true)
      else this.input.focus()
    } catch {
      if (version === this.version) this.fail('failed')
    }
  }

  close(): void {
    if (this.root.hidden) return
    this.version++
    this.root.hidden = true
    document.body.classList.remove('has-sheet')
    this.setBusy(false)
    this.returnFocus?.focus()
  }

  private async restart(): Promise<void> {
    const task = this.task
    if (!task || this.busy) return
    if (this.quick) {
      this.quickLogs.delete(task.id)
      for (const key of [...this.asked]) if (key.startsWith(`${task.id}\n`)) this.asked.delete(key)
    } else {
      await fetch(`/api/talk?task=${encodeURIComponent(task.id)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => null)
    }
    await this.open(task)
  }

  /** One turn of the conversation: the visitor's words (none for the first, which asks the opening questions). */
  private async ask(text: string, first = false): Promise<void> {
    const task = this.task
    if (!task || this.busy || this.quick || (!first && !text.trim())) return
    const words = text.trim()
    this.input.value = ''
    if (words) this.line('user', words)
    const reply = await this.turn({ task: task.id, text: words, ...this.hooks.code() }, first)
    if (reply === null) return
    this.turnsLeft(this.turns - 1)
    this.input.focus()
  }

  /** One of the fixed questions, about the code as it is now; the same question about the same code is asked once. */
  private async askQuestion(id: QuestionId): Promise<void> {
    const task = this.task
    if (!task || this.busy || !this.quick) return
    const { code, ting } = this.hooks.code()
    const key = `${task.id}\n${id}\n${code}\n${ting}`
    if (this.asked.has(key)) return
    this.line('user', QUESTIONS[id])
    const reply = await this.turn({ task: task.id, question: id, code, ting })
    if (reply === null) {
      // Nothing to keep: the question goes again with the answer that didn't come.
      this.log.querySelector('.talk-line.is-user:last-child')?.remove()
      return
    }
    this.asked.add(key)
    const log = this.quickLogs.get(task.id) ?? []
    log.push({ role: 'user', text: QUESTIONS[id] }, { role: 'assistant', text: reply })
    this.quickLogs.set(task.id, log)
    this.setBusy(false)
    Object.values(this.questions).find((b) => !b.disabled)?.focus()
  }

  /** Sends a turn and streams Claude's answer into the log; resolves with the answer, or null when it failed. */
  private async turn(body: Record<string, unknown>, first = false): Promise<string | null> {
    const version = this.version
    this.setNote('')
    this.setBusy(true)
    const answer = this.line('assistant', '')
    answer.classList.add('is-writing')
    let reply = ''
    let frame = 0
    const draw = () => {
      frame = 0
      this.fill(answer, reply)
    }
    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        answer.remove()
        this.fail(res.status === 401 ? 'signedout' : data.error ?? 'failed')
        return null
      }
      if (first) this.line('user', '', answer)
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let rest = ''
      let end: { done?: boolean; error?: string } | null = null
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        rest += value
        const parts = rest.split('\n')
        rest = parts.pop() ?? ''
        for (const part of parts) {
          if (!part) continue
          const event = JSON.parse(part) as { text?: string; left?: number; done?: boolean; error?: string }
          if (event.text) {
            reply += event.text
            if (!frame && version === this.version) frame = requestAnimationFrame(draw)
          } else if (typeof event.left === 'number') {
            if (version === this.version) this.setNote(event.left <= 3 ? `${event.left} spørsmål igjen i dag` : '')
          } else end = event
        }
      }
      if (version !== this.version) return null
      cancelAnimationFrame(frame)
      this.fill(answer, reply)
      answer.classList.remove('is-writing')
      if (!end?.done) {
        if (!reply) answer.remove()
        this.fail(end?.error ?? 'failed')
        return null
      }
      this.setBusy(false)
      return reply
    } catch {
      if (version !== this.version) return null
      answer.classList.remove('is-writing')
      if (!reply) answer.remove()
      this.fail('failed')
      return null
    }
  }

  private turns = 0
  private turnsLeft(n: number): void {
    this.turns = Math.max(0, n)
    this.setNote(this.turns <= 5 ? `${this.turns} svar igjen i dag` : '')
  }

  /** A line in the log; the opening question is drawn before the answer it belongs to (`before`). */
  private line(role: Line['role'], text: string, before?: HTMLElement): HTMLLIElement {
    const li = document.createElement('li')
    li.className = `talk-line is-${role}`
    const who = document.createElement('span')
    who.className = 'talk-who px'
    who.textContent = role === 'user' ? 'Du' : 'Claude'
    const body = document.createElement('div')
    body.className = 'talk-text'
    li.append(who, body)
    if (role === 'user' && !text && before) {
      // The first turn sends the opening questions; show them as the visitor's.
      body.textContent = OPENER
      this.log.insertBefore(li, before)
    } else {
      this.fill(li, text, role)
      this.log.append(li)
    }
    li.scrollIntoView({ block: 'end' })
    return li
  }

  private fill(li: HTMLElement, text: string, role: Line['role'] = 'assistant'): void {
    const body = li.querySelector('.talk-text')!
    if (role === 'user') body.textContent = text
    else body.replaceChildren(replyText(text))
    const log = this.log
    if (log.scrollHeight - log.scrollTop - log.clientHeight < 120) log.scrollTop = log.scrollHeight
  }

  private fail(error: string): void {
    this.setBusy(false)
    this.setNote(ERRORS[error] ?? ERRORS.failed, true)
    if (FINAL.has(error)) {
      for (const control of [this.input, this.send, ...Object.values(this.questions)]) this.disable(control, true)
    }
  }

  private setBusy(busy: boolean): void {
    this.busy = busy
    this.disable(this.input, busy)
    this.disable(this.send, busy)
    this.send.textContent = busy ? 'Skriver …' : 'Send'
    const task = this.task
    if (!task) return
    const { code, ting } = this.hooks.code()
    for (const [id, button] of Object.entries(this.questions)) {
      this.disable(button, busy || this.asked.has(`${task.id}\n${id}\n${code}\n${ting}`))
    }
  }

  /** A disabled control drops the focus to the page, where Esc no longer reaches the sheet: the log takes it first. */
  private disable(control: HTMLButtonElement | HTMLTextAreaElement, off: boolean): void {
    if (off && document.activeElement === control) this.log.focus({ preventScroll: true })
    control.disabled = off
  }

  private setNote(text: string, error = false): void {
    this.note.textContent = text
    this.note.hidden = !text
    this.note.classList.toggle('is-error', error)
  }
}
