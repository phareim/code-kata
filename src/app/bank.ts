/*
 * The task bank: every task in a list to search and filter by level, topic and what is solved, with a random pick
 * from what the filters show. A row is a link to #/<id>; the page opens the task when the hash changes.
 */
import { TASKS, taskNumber } from '../tasks/index'
import { LEVELS, TOPICS, type Level, type Task, type Topic } from '../tasks/types'
import { isSolved } from './progress'
import { fold } from './text'

const searchText = new Map(TASKS.map((task) => [
  task,
  fold([task.title, task.id, TOPICS[task.topic], LEVELS[task.level], task.text].join(' ')),
]))

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export function levelBadge(level: Level): HTMLElement {
  return el('span', `level level--${level} px`, LEVELS[level])
}

/** A random task among `tasks`: one not solved yet if there is one, never `not` unless it is the only one. */
export function randomTask(tasks: Task[], not: string | null): Task | undefined {
  const open = tasks.filter((t) => !isSolved(t.id) && t.id !== not)
  const pool = open.length ? open : tasks.filter((t) => t.id !== not)
  const from = pool.length ? pool : tasks
  return from[Math.floor(Math.random() * from.length)]
}

export class Bank {
  private query = ''
  private level: Level | '' = ''
  private topic: Topic | '' = ''
  private unsolved = false
  private readonly list: HTMLOListElement
  private readonly stats: HTMLElement
  private readonly search: HTMLInputElement
  private readonly empty: HTMLElement
  private returnFocus: HTMLElement | null = null

  constructor(private readonly root: HTMLElement, private readonly current: () => string | null) {
    this.list = root.querySelector('#bank-list')!
    this.stats = root.querySelector('#bank-stats')!
    this.search = root.querySelector('#bank-search')!
    this.empty = root.querySelector('#bank-empty')!

    this.chips(root.querySelector('#bank-levels')!, 'level', [['', 'Alle'], ...Object.entries(LEVELS)], (v) => { this.level = v as Level | '' })
    this.chips(root.querySelector('#bank-topics')!, 'topic', [['', 'Alle'], ...Object.entries(TOPICS)], (v) => { this.topic = v as Topic | '' })
    const unsolved = root.querySelector<HTMLInputElement>('#bank-unsolved')!
    unsolved.addEventListener('change', () => { this.unsolved = unsolved.checked; this.render() })
    this.search.addEventListener('input', () => { this.query = this.search.value; this.render() })
    this.search.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const first = this.list.querySelector<HTMLAnchorElement>('a')
        if (first) location.hash = first.hash
      }
    })
    root.querySelector('#bank-close')!.addEventListener('click', () => this.close())
    root.querySelector('#bank-random')!.addEventListener('click', () => {
      const task = randomTask(this.filtered(), this.current())
      if (task) location.hash = `#/${task.id}`
    })
    root.addEventListener('click', (event) => { if (event.target === root) this.close() })
    root.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.close() })
  }

  get isOpen(): boolean {
    return !this.root.hidden
  }

  open(): void {
    this.returnFocus = document.activeElement as HTMLElement | null
    this.root.hidden = false
    document.body.classList.add('has-sheet')
    this.render()
    this.search.focus()
    this.search.select()
  }

  close(): void {
    if (this.root.hidden) return
    this.root.hidden = true
    document.body.classList.remove('has-sheet')
    this.returnFocus?.focus()
  }

  private chips(box: HTMLElement, field: 'level' | 'topic', options: [string, string][], set: (value: string) => void): void {
    for (const [value, text] of options) {
      const chip = el('button', 'chip px')
      chip.type = 'button'
      chip.dataset.value = value
      chip.dataset.field = field
      chip.append(el('span', 'chip-name', text), el('span', 'chip-count'))
      chip.setAttribute('aria-pressed', String(value === ''))
      chip.addEventListener('click', () => {
        set(value)
        for (const other of box.children) other.setAttribute('aria-pressed', String(other === chip))
        this.render()
      })
      box.append(chip)
    }
  }

  filtered(): Task[] {
    const words = fold(this.query).split(/\s+/).filter(Boolean)
    return TASKS.filter((task) => (!this.level || task.level === this.level)
      && (!this.topic || task.topic === this.topic)
      && (!this.unsolved || !isSolved(task.id))
      && words.every((word) => searchText.get(task)!.includes(word)))
  }

  render(): void {
    const solved = TASKS.filter((t) => isSolved(t.id))
    const per = (Object.keys(LEVELS) as Level[]).map((level) => {
      const all = TASKS.filter((t) => t.level === level)
      return `${LEVELS[level]} ${all.filter((t) => isSolved(t.id)).length}/${all.length}`
    })
    this.stats.textContent = `Løst ${solved.length} av ${TASKS.length} · ${per.join(' · ')}`
    // Each chip says how far along its level or topic is.
    for (const chip of this.root.querySelectorAll<HTMLElement>('.chip[data-field]')) {
      const value = chip.dataset.value
      const count = chip.querySelector('.chip-count')!
      if (!value) { count.textContent = ''; continue }
      const all = TASKS.filter((t) => t[chip.dataset.field as 'level' | 'topic'] === value)
      count.textContent = ` ${all.filter((t) => isSolved(t.id)).length}/${all.length}`
    }

    const shown = this.filtered()
    const current = this.current()
    this.list.replaceChildren(...shown.map((task) => {
      const li = el('li', 'bank-item')
      const a = el('a', 'bank-row')
      a.href = `#/${task.id}`
      if (task.id === current) a.setAttribute('aria-current', 'true')
      const done = isSolved(task.id)
      a.append(
        el('span', 'bank-num px', String(taskNumber(task)).padStart(2, '0')),
        el('span', 'bank-title', task.title),
        el('span', 'bank-topic px', TOPICS[task.topic]),
        levelBadge(task.level),
        el('span', `bank-tick px${done ? ' is-done' : ''}`, done ? '✓' : ''),
      )
      if (done) a.title = 'Løst'
      li.append(a)
      return li
    }))
    this.empty.hidden = shown.length > 0
  }
}
