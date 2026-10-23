/*
 * kata.phareim.no's Worker. The site is static assets (dist/); this runs only for /api/* (`run_worker_first` in
 * wrangler.jsonc) and keeps a signed-in visitor's progress on their account:
 *
 *   GET  /api/progress   { user: { name }, tasks: { <task id>: TaskState } }, or 401 { user: null }
 *   POST /api/progress   { tasks: { <task id>: TaskState } } merged into the account (src/app/merge.ts);
 *                        answers with the merged state of those tasks
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

// The few Cloudflare types this uses, so the repo needs no type package.
interface D1 {
  prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null> } }
}
interface Storage {
  get<T>(keys: string[]): Promise<Map<string, T>>
  put<T>(entries: Record<string, T>): Promise<void>
  list<T>(options: { prefix: string }): Promise<Map<string, T>>
}
interface StoreNamespace {
  idFromName(name: string): unknown
  get(id: unknown): { fetch(request: Request): Promise<Response> }
}
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  DB: D1
  PROGRESS: StoreNamespace
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

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname !== '/api/progress') return json({ error: 'Not found' }, 404)
  if (request.method !== 'GET' && request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { ...NO_STORE, Allow: 'GET, POST' } })
  }
  if (request.method === 'POST') {
    // Only the page itself writes: the visitor's code runs on an opaque origin (Origin: null).
    if (request.headers.get('Origin') !== url.origin) return json({ error: 'Wrong origin' }, 403)
    if (!(request.headers.get('Content-Type') ?? '').startsWith('application/json')) return json({ error: 'JSON only' }, 415)
  }
  let user: User | null
  try {
    user = await readerUser(env, sessionToken(request.headers.get('Cookie')))
  } catch {
    return Response.json({ error: 'Sign-in check failed' }, { status: 503, headers: { ...NO_STORE, 'Retry-After': '30' } })
  }
  if (!user) return json({ user: null }, 401)
  const store = env.PROGRESS.get(env.PROGRESS.idFromName(String(user.id)))
  const name = user.name || (user.email ?? '').split('@')[0]

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
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleApi(request, env)
    return env.ASSETS.fetch(request)
  },
}
