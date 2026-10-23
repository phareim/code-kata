/*
 * kata.phareim.no's Worker. The site is static assets (dist/); this runs only for /api/* (`run_worker_first` in
 * wrangler.jsonc) and keeps a signed-in visitor's progress on their account:
 *
 *   GET  /api/progress   { user: { name }, tasks: { <task id>: TaskState } }, or 401 { user: null }
 *   POST /api/progress   { tasks: { <task id>: TaskState } } merged into the account (src/app/merge.ts);
 *                        answers with the merged state of those tasks
 *   GET  /api/talk?task  the account's conversation about a task ({ view, turnsLeft, full })
 *   POST /api/talk       { task, code, ting, text } one turn with Claude about a solved task (worker/talk.ts),
 *                        streamed as lines of JSON: { text } … then { done } or { error }. Without an account:
 *                        { task, question, code, ting }, one of the fixed questions, answered and not kept
 *   DELETE /api/talk?task  starts that conversation over
 *
 * The account is auth.phareim.no's (Reader): the `session_token` cookie on .phareim.no, looked up READ-ONLY in
 * Reader's `reader-service` D1. Reader owns the tables and the cookie; this Worker never writes to either. Every
 * account gets its own store, so there is no allowlist: an account reads and writes only its own progress.
 *
 * The progress lives in a SQLite Durable Object per account (`ProgressStore`, named by the Reader user id), one
 * key per task. The visitor's code never reaches this API: it runs in a Worker on an opaque origin, whose requests
 * carry no cookies, and a write must come from the site's own origin.
 */
import { cleanTask, isTaskId, mergeTask, sameTask } from '../src/app/merge'
import type { TaskState } from '../src/app/progress'
import {
  ask, askQuick, costOf, MAX_MESSAGES, OPENER, QUICK_PER_DAY, QUICK_USD_PER_DAY, quickCostOf, quickMessage,
  quickRequest, talkRequest, taskFor, textOf, today, TURNS_PER_DAY, USD_PER_DAY, userMessage, type Conversation,
} from './talk'

// The few Cloudflare types this uses, so the repo needs no type package.
interface D1 {
  prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null> } }
}
interface Storage {
  get<T>(key: string): Promise<T | undefined>
  get<T>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  list<T>(options: { prefix: string }): Promise<Map<string, T>>
}
interface Context {
  waitUntil(promise: Promise<unknown>): void
}
interface StoreNamespace {
  idFromName(name: string): unknown
  get(id: unknown): { fetch(request: Request): Promise<Response> }
}
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  DB: D1
  PROGRESS: StoreNamespace
  /** One instance, `global`: what the talks have cost today. */
  BUDGET: StoreNamespace
  /** Anthropic API key, a Worker secret. Without it the talk answers 503. */
  KATA_ANTHROPIC_KEY?: string
}

const COOKIE = 'session_token'
const HIT_MS = 60_000 // a session is trusted this long per isolate before D1 is asked again
const MAX_BODY = 512 * 1024
const MAX_TASKS = 500 // per account; the bank has 131
const hits = new Map<string, { user: User; until: number }>()

interface User {
  id: string
  name: string | null
  email: string | null
}

/** The value of the session cookie, or null. */
export function sessionToken(cookieHeader: string | null): string | null {
  for (const part of String(cookieHeader || '').split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    if (part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim() || null
  }
  return null
}

/** Reader's user for this token, or null: the same query as the other *.phareim.no apps. */
export async function readerUser(env: Env, token: string | null, now = Date.now()): Promise<User | null> {
  if (!token) return null
  const hit = hits.get(token)
  if (hit && hit.until > now) return hit.user
  const user = await env.DB
    .prepare('SELECT u.id, u.email, u.name FROM "session" s JOIN "User" u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?')
    .bind(token, new Date(now).toISOString())
    .first<User>()
  if (!user) return null
  if (hits.size > 100) hits.clear()
  hits.set(token, { user, until: now + HIT_MS })
  return user
}

const NO_STORE = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE })

export async function handleApi(request: Request, env: Env, ctx?: Context): Promise<Response> {
  const url = new URL(request.url)
  const methods = url.pathname === '/api/progress' ? ['GET', 'POST'] : url.pathname === '/api/talk' ? ['GET', 'POST', 'DELETE'] : null
  if (!methods) return json({ error: 'Not found' }, 404)
  if (!methods.includes(request.method)) {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { ...NO_STORE, Allow: methods.join(', ') } })
  }
  if (request.method !== 'GET') {
    // Only the page itself writes: the visitor's code runs on an opaque origin (Origin: null).
    if (request.headers.get('Origin') !== url.origin) return json({ error: 'Wrong origin' }, 403)
    const body = request.method === 'POST'
    if (body && !(request.headers.get('Content-Type') ?? '').startsWith('application/json')) return json({ error: 'JSON only' }, 415)
  }
  let user: User | null
  try {
    user = await readerUser(env, sessionToken(request.headers.get('Cookie')))
  } catch {
    return Response.json({ error: 'Sign-in check failed' }, { status: 503, headers: { ...NO_STORE, 'Retry-After': '30' } })
  }
  if (!user && url.pathname === '/api/talk' && request.method === 'POST') return handleQuickTalk(request, env, ctx)
  if (!user) return json({ user: null }, 401)
  const store = env.PROGRESS.get(env.PROGRESS.idFromName(String(user.id)))
  const name = user.name || (user.email ?? '').split('@')[0]
  if (url.pathname === '/api/talk') return handleTalk(request, env, ctx, store)

  if (request.method === 'GET') {
    const res = await store.fetch(new Request('https://store/tasks'))
    if (!res.ok) return json({ error: 'Store unavailable' }, 502)
    return json({ user: { name }, tasks: await res.json() })
  }

  const text = await request.text()
  if (text.length > MAX_BODY) return json({ error: 'Too large' }, 413)
  let tasks: Record<string, TaskState>
  try {
    tasks = cleanTasks((JSON.parse(text) as { tasks?: unknown }).tasks)
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }
  const res = await store.fetch(new Request('https://store/tasks', { method: 'POST', body: JSON.stringify(tasks) }))
  if (!res.ok) return json({ error: 'Store unavailable' }, res.status === 413 ? 413 : 502)
  return json({ tasks: await res.json() })
}

type Store = ReturnType<StoreNamespace['get']>
const call = (store: Store, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') =>
  store.fetch(new Request(`https://store${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }))

/** «Snakk om det» (worker/talk.ts): the conversation, a new turn streamed from Claude, or a fresh start. */
async function handleTalk(request: Request, env: Env, ctx: Context | undefined, store: Store): Promise<Response> {
  const url = new URL(request.url)
  if (request.method !== 'POST') {
    const task = taskFor(url.searchParams.get('task'))
    if (!task) return json({ error: 'No such task' }, 404)
    const res = await call(store, `/talk?task=${task.id}`, undefined, request.method)
    return json(await res.json(), res.status)
  }
  if (!env.KATA_ANTHROPIC_KEY) return json({ error: 'off' }, 503)
  const text = await request.text()
  if (text.length > MAX_BODY) return json({ error: 'Too large' }, 413)
  let req: ReturnType<typeof talkRequest>
  try {
    req = talkRequest(JSON.parse(text))
  } catch {
    req = null
  }
  if (!req) return json({ error: 'Bad request' }, 400)
  const { task, code, ting } = req

  const budget = env.BUDGET.get(env.BUDGET.idFromName('global'))
  const spent = await (await call(budget, '/')).json() as { usd: number }
  if (spent.usd >= USD_PER_DAY) return json({ error: 'budget' }, 429)
  const begin = await call(store, '/talk/begin', { task: task.id })
  const started = await begin.json() as { error?: string; conversation?: Conversation | null }
  if (!begin.ok) return json(started, begin.status)
  const before = started.conversation ?? null
  const words = req.text || (before ? '' : OPENER)
  if (!words) return json({ error: 'Empty' }, 400)

  const content = userMessage(task, words, code, ting, before)
  const messages = [...(before?.api ?? []), { role: 'user' as const, content }]
  return streamed(ctx, async (send) => {
    const out = await ask(env.KATA_ANTHROPIC_KEY!, task, messages, (piece) => send({ text: piece }))
    await call(budget, '/', { usd: costOf(out.usage) })
    const answer = textOf(out.content)
    if (out.refused || !answer) return send({ error: 'refused' })
    await call(store, '/talk/append', {
      task: task.id,
      api: [messages[messages.length - 1], { role: 'assistant', content: out.content }],
      view: [{ role: 'user', text: words }, { role: 'assistant', text: answer }],
      code,
      ting,
    })
    await send({ done: true })
  })
}

/**
 * A fixed question from a visitor who isn't signed in (worker/talk.ts): the question by its id, answered by Haiku,
 * nothing kept. Counted per IP address and against its own daily budget, so it can't use up the accounts' talks.
 */
async function handleQuickTalk(request: Request, env: Env, ctx: Context | undefined): Promise<Response> {
  if (!env.KATA_ANTHROPIC_KEY) return json({ error: 'off' }, 503)
  const text = await request.text()
  if (text.length > MAX_BODY) return json({ error: 'long' }, 413)
  let req: ReturnType<typeof quickRequest>
  try {
    req = quickRequest(JSON.parse(text))
  } catch {
    req = null
  }
  if (req === 'long') return json({ error: 'long' }, 413)
  if (!req) return json({ error: 'Bad request' }, 400)
  const { task, question, code, ting } = req

  const budget = env.BUDGET.get(env.BUDGET.idFromName('global'))
  const ip = request.headers.get('CF-Connecting-IP') ?? ''
  const begin = await call(budget, '/quick', { who: await digest(ip) })
  const started = await begin.json() as { left?: number; error?: string }
  if (!begin.ok) return json(started, begin.status)
  return streamed(ctx, async (send) => {
    await send({ left: started.left })
    const out = await askQuick(env.KATA_ANTHROPIC_KEY!, task, quickMessage(task, question, code, ting), (piece) => send({ text: piece }))
    await call(budget, '/quick/spent', { usd: quickCostOf(out.usage) })
    if (out.refused || !textOf(out.content)) return send({ error: 'refused' })
    await send({ done: true })
  })
}

/** An IP address as the budget keeps it: hashed, so the store holds no addresses. */
async function digest(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`code-kata:${text}`))
  return [...new Uint8Array(hash).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * A streamed answer as lines of JSON: `turn` sends `{ text }` as Claude writes, then `{ done }` or `{ error }`. A
 * visitor who closes the sheet mid-answer stops reading, not the turn: it still finishes, and is kept and paid for.
 */
function streamed(ctx: Context | undefined, turn: (send: (line: unknown) => Promise<void>) => Promise<void>): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const send = async (line: unknown) => {
    try {
      await writer.write(encoder.encode(`${JSON.stringify(line)}\n`))
    } catch {
      // The page has gone.
    }
  }
  const done = (async () => {
    try {
      await turn(send)
    } catch {
      await send({ error: 'failed' })
    } finally {
      try {
        await writer.close()
      } catch {
        // Already closed.
      }
    }
  })()
  ctx?.waitUntil(done)
  return new Response(readable, { headers: { ...NO_STORE, 'Content-Type': 'application/x-ndjson; charset=utf-8' } })
}

/** The tasks in a body, with their ids and fields checked; anything else is left out. */
export function cleanTasks(raw: unknown): Record<string, TaskState> {
  const out: Record<string, TaskState> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [id, value] of Object.entries(raw).slice(0, MAX_TASKS)) {
    const state = isTaskId(id) ? cleanTask(value) : null
    if (state) out[id] = state
  }
  return out
}

/** One account's progress: a key `t:<task id>` per task. Requests arrive one at a time, so a merge never races. */
export class ProgressStore {
  constructor(private readonly ctx: { storage: Storage }) {}

  async fetch(request: Request): Promise<Response> {
    const storage = this.ctx.storage
    const path = new URL(request.url).pathname
    if (path.startsWith('/talk')) return this.talk(request, path)
    if (request.method === 'GET') {
      const all = await storage.list<TaskState>({ prefix: 't:' })
      return Response.json(Object.fromEntries([...all].map(([key, state]) => [key.slice(2), state])))
    }
    const incoming = await request.json() as Record<string, TaskState>
    const keys = Object.keys(incoming).map((id) => `t:${id}`)
    const stored = new Map<string, TaskState>()
    for (let i = 0; i < keys.length; i += 128) {
      for (const [k, v] of await storage.get<TaskState>(keys.slice(i, i + 128))) stored.set(k, v)
    }
    const fresh = keys.filter((k) => !stored.has(k)).length
    if (fresh && (await storage.list({ prefix: 't:' })).size + fresh > MAX_TASKS) {
      return Response.json({ error: 'Too many tasks' }, { status: 413 })
    }
    const merged: Record<string, TaskState> = {}
    const writes: Record<string, TaskState> = {}
    for (const [id, state] of Object.entries(incoming)) {
      const old = stored.get(`t:${id}`)
      merged[id] = old ? mergeTask(old, state) : state
      if (!old || !sameTask(old, merged[id])) writes[`t:${id}`] = merged[id]
    }
    const entries = Object.entries(writes)
    for (let i = 0; i < entries.length; i += 128) await storage.put(Object.fromEntries(entries.slice(i, i + 128)))
    return Response.json(merged)
  }

  /** The talks: a conversation per task (`c:<id>`), and the turns taken today (`talk-day`). */
  private async talk(request: Request, path: string): Promise<Response> {
    const storage = this.ctx.storage
    const day = today()
    const used = await storage.get<{ day: string; turns: number }>('talk-day')
    const turns = used?.day === day ? used.turns : 0
    if (path === '/talk/begin') {
      const { task } = await request.json() as { task: string }
      const state = await storage.get<TaskState>(`t:${task}`)
      if (!state?.solved) return Response.json({ error: 'unsolved' }, { status: 403 })
      if (turns >= TURNS_PER_DAY) return Response.json({ error: 'turns' }, { status: 429 })
      const conversation = await storage.get<Conversation>(`c:${task}`)
      if (conversation && conversation.api.length >= MAX_MESSAGES) return Response.json({ error: 'full' }, { status: 409 })
      await storage.put('talk-day', { day, turns: turns + 1 })
      return Response.json({ conversation: conversation ?? null })
    }
    if (path === '/talk/append') {
      const turn = await request.json() as Pick<Conversation, 'api' | 'view' | 'code' | 'ting'> & { task: string }
      const old = await storage.get<Conversation>(`c:${turn.task}`)
      await storage.put<Conversation>(`c:${turn.task}`, {
        api: [...(old?.api ?? []), ...turn.api],
        view: [...(old?.view ?? []), ...turn.view],
        code: turn.code,
        ting: turn.ting,
      })
      return Response.json({ ok: true })
    }
    const task = new URL(request.url).searchParams.get('task') ?? ''
    if (request.method === 'DELETE') {
      await storage.delete(`c:${task}`)
      return Response.json({ ok: true })
    }
    const conversation = await storage.get<Conversation>(`c:${task}`)
    return Response.json({
      view: conversation?.view ?? [],
      turnsLeft: Math.max(0, TURNS_PER_DAY - turns),
      full: (conversation?.api.length ?? 0) >= MAX_MESSAGES,
    })
  }
}

/** The questions from visitors who aren't signed in, today: per hashed IP address, and what they have cost. */
interface QuickDay {
  day: string
  usd: number
  asked: Record<string, number>
}

/**
 * What the talks have cost, per day (one instance for the whole site): GET reads today, POST { usd } adds. The fixed
 * questions keep their own day in one key, `quick` (replaced when the day changes, so old days don't pile up):
 * POST /quick { who } takes one of `who`'s questions for today, or answers 429; POST /quick/spent { usd } adds.
 */
export class TalkBudget {
  constructor(private readonly ctx: { storage: Storage }) {}

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname
    if (path.startsWith('/quick')) return this.quick(request, path)
    const key = `usd:${today()}`
    const usd = (await this.ctx.storage.get<number>(key)) ?? 0
    if (request.method !== 'POST') return Response.json({ usd })
    const { usd: add } = await request.json() as { usd: number }
    await this.ctx.storage.put(key, usd + (Number.isFinite(add) && add > 0 ? add : 0))
    return Response.json({ usd: usd + add })
  }

  private async quick(request: Request, path: string): Promise<Response> {
    const day = today()
    const stored = await this.ctx.storage.get<QuickDay>('quick')
    const state: QuickDay = stored?.day === day ? stored : { day, usd: 0, asked: {} }
    const body = await request.json() as { who?: string; usd?: number }
    if (path === '/quick/spent') {
      const add = Number(body.usd)
      state.usd += Number.isFinite(add) && add > 0 ? add : 0
      await this.ctx.storage.put('quick', state)
      return Response.json({ usd: state.usd })
    }
    if (state.usd >= QUICK_USD_PER_DAY) return Response.json({ error: 'budget' }, { status: 429 })
    const who = String(body.who ?? '')
    const asked = state.asked[who] ?? 0
    if (asked >= QUICK_PER_DAY) return Response.json({ error: 'quick-turns' }, { status: 429 })
    state.asked[who] = asked + 1
    await this.ctx.storage.put('quick', state)
    return Response.json({ left: QUICK_PER_DAY - asked - 1 })
  }
}

export default {
  async fetch(request: Request, env: Env, ctx?: Context): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleApi(request, env, ctx)
    return env.ASSETS.fetch(request)
  },
}
