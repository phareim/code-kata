/*
 * One task's progress from two places (this browser and the visitor's account), merged the same way on both sides:
 * the page merges what the account sends, and the account merges what the page sends. Solving, hints and peeking
 * only ever grow, so they merge without clocks. The code and the class go together and come from whichever side
 * edited them last (`at`); a side that has never edited them since saving began has no `at` and gives way. The vote
 * comes from whichever side voted last (`votedAt`), so taking it back carries too. The task in Java (`java`) is merged
 * the same way on its own: its first solve, and its code and class by its own `at`.
 */
import type { LangState, TaskState } from './progress'

const LIMIT = 64 * 1024

/** `incoming` is the newer write: its seed wins, and so do its code and class on a tie. */
export function mergeTask(base: TaskState, incoming: TaskState): TaskState {
  const out: TaskState = {}
  const solved = [base.solved, incoming.solved].filter((s): s is string => !!s).sort()[0]
  if (solved) out.solved = solved
  const hints = Math.max(base.hints ?? 0, incoming.hints ?? 0)
  if (hints) out.hints = hints
  if (base.peeked || incoming.peeked) out.peeked = true
  const seed = incoming.seed ?? base.seed
  if (seed !== undefined) out.seed = seed
  let edit: TaskState
  if (base.at || incoming.at) edit = (incoming.at ?? '') >= (base.at ?? '') ? incoming : base
  else edit = { code: incoming.code ?? base.code, ting: incoming.ting ?? base.ting }
  if (edit.code !== undefined) out.code = edit.code
  if (edit.ting !== undefined) out.ting = edit.ting
  if (edit.at) out.at = edit.at
  const voted = (incoming.votedAt ?? '') >= (base.votedAt ?? '') ? incoming : base
  if (voted.vote) out.vote = voted.vote
  if (voted.votedAt) out.votedAt = voted.votedAt
  const java = mergeLang(base.java, incoming.java)
  if (java) out.java = java
  return out
}

/** A task in another language merges as the task does: the first solve, and the code and class from the newer edit. */
function mergeLang(base: LangState | undefined, incoming: LangState | undefined): LangState | undefined {
  if (!base && !incoming) return undefined
  const b = base ?? {}
  const i = incoming ?? {}
  const out: LangState = {}
  const solved = [b.solved, i.solved].filter((s): s is string => !!s).sort()[0]
  if (solved) out.solved = solved
  const edit = b.at || i.at ? ((i.at ?? '') >= (b.at ?? '') ? i : b) : { code: i.code ?? b.code, ting: i.ting ?? b.ting }
  if (edit.code !== undefined) out.code = edit.code
  if (edit.ting !== undefined) out.ting = edit.ting
  if (edit.at) out.at = edit.at
  return Object.keys(out).length ? out : undefined
}

const LANG_KEYS = ['code', 'ting', 'at', 'solved'] as const

export function sameTask(a: TaskState, b: TaskState): boolean {
  const keys = ['solved', 'hints', 'peeked', 'seed', 'code', 'ting', 'at', 'vote', 'votedAt'] as const
  return keys.every((k) => a[k] === b[k]) && LANG_KEYS.every((k) => a.java?.[k] === b.java?.[k])
}

/** A task state from outside (the network, an old browser): only the known fields, with their types, or null. */
export function cleanTask(raw: unknown): TaskState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const out: TaskState = {}
  const time = (v: unknown) => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v))
  if (time(r.solved)) out.solved = r.solved as string
  if (time(r.at)) out.at = r.at as string
  if (r.vote === 'up' || r.vote === 'down') out.vote = r.vote
  if (time(r.votedAt)) out.votedAt = r.votedAt as string
  if (Number.isInteger(r.hints) && (r.hints as number) > 0 && (r.hints as number) <= 20) out.hints = r.hints as number
  if (r.peeked === true) out.peeked = true
  if (Number.isSafeInteger(r.seed)) out.seed = r.seed as number
  // Code too long to keep is left out with its task, or the account would hold it as edited back to the opening.
  for (const key of ['code', 'ting'] as const) {
    const text = r[key]
    if (typeof text !== 'string') continue
    if (text.length > LIMIT) return null
    out[key] = text
  }
  if (r.java && typeof r.java === 'object' && !Array.isArray(r.java)) {
    const j = r.java as Record<string, unknown>
    const java: LangState = {}
    if (time(j.solved)) java.solved = j.solved as string
    if (time(j.at)) java.at = j.at as string
    for (const key of ['code', 'ting'] as const) {
      const text = j[key]
      if (typeof text !== 'string') continue
      if (text.length > LIMIT) return null
      java[key] = text
    }
    if (Object.keys(java).length) out.java = java
  }
  return out
}

/** Task ids are slugs (`src/tasks/`); anything else is not a task. */
export const isTaskId = (id: string) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(id)
