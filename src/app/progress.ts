/*
 * What a visitor has done, per task, in localStorage (one JSON object under code-kata:progress): their code and
 * class, how many hints they have opened, the seed of their items, and when they first solved it. Storage that is
 * blocked or full leaves it all in memory for the visit.
 *
 * A visitor signed in at auth.phareim.no also has it on their account (`/api/progress`, `worker/index.ts`), so it
 * follows them to another browser. localStorage stays the copy the page works from: the account is merged in when
 * the page loads, and each change goes up a moment later. Without an account, or when it can't be reached, the page
 * works from localStorage alone, as before.
 */
import { cleanTask, isTaskId, mergeTask, sameTask } from './merge'

export interface TaskState {
  code?: string
  ting?: string
  /** When the code or the class last changed (ISO time): the newer edit wins when two browsers meet. */
  at?: string
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

/** Changes a task's state; a patch that changes nothing is not saved or sent. */
export function updateTask(id: string, patch: Partial<TaskState>, urgent = false): void {
  const before = states[id] ?? {}
  const next: TaskState = { ...before, ...patch }
  for (const key of Object.keys(next) as (keyof TaskState)[]) if (next[key] === undefined) delete next[key]
  if (next.code !== before.code || next.ting !== before.ting) next.at = new Date().toISOString()
  if (sameTask(before, next)) return
  states[id] = next
  save()
  touch(id, urgent)
}

export function isSolved(id: string): boolean {
  return !!states[id]?.solved
}

/** Marks a task solved; true the first time. */
export function markSolved(id: string): boolean {
  if (isSolved(id)) return false
  updateTask(id, { solved: new Date().toISOString() }, true)
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

// The account.

export interface Account {
  name: string
}

export interface SyncHooks {
  /** Before the account is merged in: save what the editors hold, so the newest edit takes part. */
  beforeMerge: () => void
  /** Tasks whose state the account changed. */
  merged: (ids: string[]) => void
  /** Who is signed in (null: nobody), or `available: false` when the site has no account store (dev, an outage). */
  account: (account: Account | null, available: boolean) => void
}

const API = '/api/progress'
const DEBOUNCE_MS = 2000
const MAX_WAIT_MS = 10_000
/** A keepalive request may carry at most 64 kB; what doesn't fit goes up on the next visit. */
const KEEPALIVE_BYTES = 60_000

let hooks: SyncHooks | null = null
let account: Account | null = null
const dirty = new Set<string>()
let timer = 0
let since = 0
let busy = false
let failures = 0

function touch(id: string, urgent: boolean): void {
  dirty.add(id)
  schedule(urgent ? 300 : DEBOUNCE_MS)
}

function schedule(delay: number): void {
  if (!account) return
  const now = Date.now()
  if (!timer) since = now
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void flush(), Math.max(0, Math.min(delay, since + MAX_WAIT_MS - now)))
}

/** Takes the account's states in; what the account lacks or has older is marked to go up. */
function absorb(remote: Record<string, unknown>, all: boolean): void {
  hooks?.beforeMerge()
  const changed: string[] = []
  const ids = new Set(Object.keys(remote).filter(isTaskId))
  if (all) for (const id of Object.keys(states)) if (isTaskId(id)) ids.add(id)
  for (const id of ids) {
    const theirs = cleanTask(remote[id])
    const ours = states[id]
    if (!theirs) {
      if (ours) dirty.add(id)
      continue
    }
    const merged = ours ? mergeTask(theirs, ours) : theirs
    if (!ours || !sameTask(merged, ours)) {
      states[id] = merged
      changed.push(id)
    }
    if (!sameTask(merged, theirs)) dirty.add(id)
  }
  if (changed.length) {
    save()
    hooks?.merged(changed)
  }
}

/** Sends what changed; with `leaving`, as one keepalive request that outlives the page. */
async function flush(leaving = false): Promise<void> {
  window.clearTimeout(timer)
  timer = 0
  if (!account || (busy && !leaving) || !dirty.size) return
  const batch: Record<string, TaskState> = {}
  let bytes = 0
  for (const id of dirty) {
    const size = JSON.stringify(states[id] ?? {}).length + id.length + 8
    if (leaving && bytes + size > KEEPALIVE_BYTES && bytes) break
    batch[id] = states[id] ?? {}
    bytes += size
  }
  const ids = Object.keys(batch)
  for (const id of ids) dirty.delete(id)
  // A keepalive request goes alongside one in flight; the account merges the same state twice the same way.
  const own = !leaving
  if (own) busy = true
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: batch }),
      credentials: 'same-origin',
      keepalive: leaving,
    })
    if (res.status === 401) {
      signedOut(ids)
      return
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    failures = 0
    const data = await res.json() as { tasks?: Record<string, unknown> }
    absorb(data.tasks ?? {}, false)
  } catch {
    for (const id of ids) dirty.add(id)
    failures++
    if (!leaving) schedule(Math.min(60_000, 1000 * 2 ** failures))
    return
  } finally {
    if (own) busy = false
  }
  if (dirty.size && !leaving) schedule(0)
}

function signedOut(ids: string[]): void {
  for (const id of ids) dirty.add(id)
  account = null
  hooks?.account(null, true)
}

/** Asks who is signed in and merges their account in. Call once, after the first route. */
export async function startSync(h: SyncHooks): Promise<void> {
  hooks = h
  let res: Response
  try {
    res = await fetch(API, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' })
  } catch {
    return h.account(null, false)
  }
  if (res.status === 401) return h.account(null, true)
  const type = res.headers.get('Content-Type') ?? ''
  if (!res.ok || !type.includes('application/json')) return h.account(null, false)
  try {
    const data = await res.json() as { user?: { name?: unknown }; tasks?: Record<string, unknown> }
    account = { name: typeof data.user?.name === 'string' ? data.user.name : '' }
    h.account(account, true)
    absorb(data.tasks ?? {}, true)
  } catch {
    account = null
    return h.account(null, false)
  }
  if (dirty.size) schedule(0)
}

/** Sends what is waiting and resolves when the account has it (or can't be reached): before a talk, which needs
 * the account to know the task is solved. */
export async function syncNow(): Promise<void> {
  for (let i = 0; i < 50 && account && (busy || dirty.size); i++) {
    if (busy) await new Promise((resolve) => window.setTimeout(resolve, 100))
    else await flush()
    if (failures) return
  }
}

/** Sends what is left before the page goes away (pagehide, or the tab hidden). */
export function flushProgress(): void {
  void flush(true)
}
