/*
 * «Snakk om det»: the sheet where a signed-in visitor talks with Claude about a task they have solved. The
 * conversation lives on the account (`/api/talk`, worker/talk.ts); the sheet shows it and streams each new answer.
 */
import type { Task } from '../tasks/types'
import { replyText } from './text'

/** What the visitor asks first (Petter's three questions); the Worker sends it, the sheet shows it. */
export const OPENER = 'Snakk med meg om løsningen min. Hva kunne alternativene vært? Var dette en elegant eller en krøkkete løsning?'

interface Line {
  role: 'user' | 'assistant'
  text: string
}

export interface TalkHooks {
  /** The code and the class in the editors now. */
  code: () => { code: string; ting: string }
  /** Resolves when the account knows what this browser knows (that the task is solved). */
  synced: () => Promise<void>
}

const ERRORS: Record<string, string> = {
  unsolved: 'Løs oppgaven først, så kan vi snakke om den.',
  turns: 'Nok prat for i dag: dagens svar er brukt opp. I morgen igjen.',
  budget: 'Kodekata har snakket nok for i dag. Prøv igjen i morgen.',
  full: 'Samtalen er full. «Ny samtale» begynner på nytt.',
  off: 'Samtalen er ikke slått på ennå.',
  refused: 'Det ville ikke Claude svare på. Prøv å spørre på en annen måte.',
  signedout: 'Logg inn for å snakke om løsningen.',
  failed: 'Noe gikk galt. Prøv igjen.',
}

export class Talk {
  private task: Task | null = null
  private busy = false
  private version = 0
  private returnFocus: HTMLElement | null = null
  private readonly log: HTMLOListElement
  private readonly form: HTMLFormElement
  private readonly input: HTMLTextAreaElement
  private readonly send: HTMLButtonElement
  private readonly note: HTMLElement

  constructor(private readonly root: HTMLElement, private readonly hooks: TalkHooks) {
    this.log = root.querySelector('#talk-log')!
    this.form = root.querySelector('#talk-form')!
    this.input = root.querySelector('#talk-input')!
    this.send = root.querySelector('#talk-send')!
    this.note = root.querySelector('#talk-note')!
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
    this.root.hidden = false
    document.body.classList.add('has-sheet')
    this.root.querySelector('#talk-task')!.textContent = task.title
    this.log.replaceChildren()
    this.setNote('')
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
    await fetch(`/api/talk?task=${encodeURIComponent(task.id)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => null)
    await this.open(task)
  }

  /** One turn: the visitor's words (none for the first, which asks the opening questions) and Claude's answer. */
  private async ask(text: string, first = false): Promise<void> {
    const task = this.task
    if (!task || this.busy || (!first && !text.trim())) return
    const version = this.version
    this.setNote('')
    this.setBusy(true)
    const words = text.trim()
    this.input.value = ''
    if (words) this.line('user', words)
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
        body: JSON.stringify({ task: task.id, text: words, ...this.hooks.code() }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        answer.remove()
        return this.fail(res.status === 401 ? 'signedout' : data.error ?? 'failed')
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
          const event = JSON.parse(part) as { text?: string; done?: boolean; error?: string }
          if (event.text) {
            reply += event.text
            if (!frame && version === this.version) frame = requestAnimationFrame(draw)
          } else end = event
        }
      }
      if (version !== this.version) return
      cancelAnimationFrame(frame)
      this.fill(answer, reply)
      answer.classList.remove('is-writing')
      if (!end?.done) {
        if (!reply) answer.remove()
        return this.fail(end?.error ?? 'failed')
      }
      this.turnsLeft(this.turns - 1)
      this.setBusy(false)
      this.input.focus()
    } catch {
      if (version !== this.version) return
      answer.classList.remove('is-writing')
      if (!reply) answer.remove()
      this.fail('failed')
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
    if (error === 'full' || error === 'turns' || error === 'budget' || error === 'off' || error === 'signedout') {
      this.input.disabled = true
      this.send.disabled = true
    }
  }

  private setBusy(busy: boolean): void {
    this.busy = busy
    this.input.disabled = busy
    this.send.disabled = busy
    this.send.textContent = busy ? 'Skriver …' : 'Send'
  }

  private setNote(text: string, error = false): void {
    this.note.textContent = text
    this.note.hidden = !text
    this.note.classList.toggle('is-error', error)
  }
}
