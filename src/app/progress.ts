/*
 * What a visitor has done, per task, in localStorage (one JSON object under code-kata:progress): their code and
 * class, how many hints they have opened, the seed of their items, and when they first solved it. Storage that is
 * blocked or full leaves it all in memory for the visit.
 */
export interface TaskState {
  code?: string
  ting?: string
  /** Hints opened. */
  hints?: number
  /** The solution was shown. */
  peeked?: boolean
  seed?: number
  /** When the task was first solved (ISO time). */
  solved?: string
}

const KEY = 'code-kata:progress'
const LAST = 'code-kata:last'

let states: Record<string, TaskState> = {}
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
  if (saved && typeof saved === 'object') states = saved
} catch {
  // Unreadable or blocked: start empty.
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(states))
  } catch {
    // Private mode or full: the progress lives as long as the tab.
  }
}

export function taskState(id: string): TaskState {
  return states[id] ?? {}
}

export function updateTask(id: string, patch: Partial<TaskState>): void {
  states[id] = { ...states[id], ...patch }
  save()
}

export function isSolved(id: string): boolean {
  return !!states[id]?.solved
}

/** Marks a task solved; true the first time. */
export function markSolved(id: string): boolean {
  if (isSolved(id)) return false
  updateTask(id, { solved: new Date().toISOString() })
  return true
}

export function lastTask(): string | null {
  try {
    return localStorage.getItem(LAST)
  } catch {
    return null
  }
}

export function rememberLast(id: string): void {
  try {
    localStorage.setItem(LAST, id)
  } catch {
    // Not remembered; the next visit opens the first task.
  }
}
