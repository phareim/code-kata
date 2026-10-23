import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTask, mergeTask } from '../src/app/merge'
import type { TaskState } from '../src/app/progress'
import worker, { sessionToken } from '../worker/index'
import { fakeEnv } from './fake-env'

describe('mergeTask', () => {
  it('keeps the first solve, the most hints and a peek from either side', () => {
    const a: TaskState = { solved: '2026-10-20T10:00:00.000Z', hints: 1 }
    const b: TaskState = { solved: '2026-10-22T10:00:00.000Z', hints: 3, peeked: true }
    expect(mergeTask(a, b)).toEqual({ solved: a.solved, hints: 3, peeked: true })
    expect(mergeTask(b, a)).toEqual({ solved: a.solved, hints: 3, peeked: true })
  })

  it('takes the code and the class from the newer edit, even when it went back to the opening', () => {
    const old: TaskState = { code: 'gammel', ting: 'class Ting {}', at: '2026-10-20T10:00:00.000Z' }
    const reset: TaskState = { at: '2026-10-21T10:00:00.000Z' }
    expect(mergeTask(old, reset)).toEqual({ at: reset.at })
    expect(mergeTask(reset, old)).toEqual({ at: reset.at })
  })

  it('lets an edit with a time beat one from before saving began', () => {
    expect(mergeTask({ code: 'uten tid' }, { code: 'ny', at: '2026-10-21T10:00:00.000Z' }).code).toBe('ny')
    expect(mergeTask({ code: 'ny', at: '2026-10-21T10:00:00.000Z' }, { code: 'uten tid' }).code).toBe('ny')
    expect(mergeTask({ code: 'a' }, { ting: 'b' })).toEqual({ code: 'a', ting: 'b' })
  })

  it('takes the incoming seed, else the old one', () => {
    expect(mergeTask({ seed: 1 }, { seed: 2 }).seed).toBe(2)
    expect(mergeTask({ seed: 1 }, {}).seed).toBe(1)
  })
})

describe('cleanTask', () => {
  it('keeps only known fields with the right types', () => {
    expect(cleanTask({ code: 'x', hints: 2, seed: 5, peeked: true, solved: '2026-10-23T00:00:00.000Z', evil: 1 }))
      .toEqual({ code: 'x', hints: 2, seed: 5, peeked: true, solved: '2026-10-23T00:00:00.000Z' })
    expect(cleanTask({ code: 7, hints: -1, seed: 1.5, peeked: 'yes', solved: 'never' })).toEqual({})
    expect(cleanTask({ code: 'x'.repeat(70_000), at: '2026-10-23T00:00:00.000Z' })).toBeNull()
    expect(cleanTask([1])).toBeNull()
    expect(cleanTask('x')).toBeNull()
  })
})

const ORIGIN = 'https://kata.phareim.no'
const get = (token?: string) => new Request(`${ORIGIN}/api/progress`, {
  headers: token ? { Cookie: `other=1; session_token=${token}` } : {},
})
const post = (token: string, tasks: unknown, headers: Record<string, string> = {}) => new Request(`${ORIGIN}/api/progress`, {
  method: 'POST',
  body: JSON.stringify({ tasks }),
  headers: { Cookie: `session_token=${token}`, Origin: ORIGIN, 'Content-Type': 'application/json', ...headers },
})

describe('the Worker', () => {
  it('reads the session cookie among others', () => {
    expect(sessionToken('a=1; session_token=abc ; b=2')).toBe('abc')
    expect(sessionToken('session_token=')).toBeNull()
    expect(sessionToken(null)).toBeNull()
  })

  it('serves assets outside /api/', async () => {
    const { env } = fakeEnv()
    expect(await (await worker.fetch(new Request(`${ORIGIN}/`), env)).text()).toBe('asset')
  })

  it('answers 401 without a session, and 404 for other API paths', async () => {
    const { env } = fakeEnv()
    const res = await worker.fetch(get(), env)
    expect(res.status).toBe(401)
    expect(res.headers.get('Cache-Control')).toContain('no-store')
    expect(await res.json()).toEqual({ user: null })
    expect((await worker.fetch(get('nope'), env)).status).toBe(401)
    expect((await worker.fetch(new Request(`${ORIGIN}/api/other`), env)).status).toBe(404)
  })

  it('keeps each account to itself and merges what comes in', async () => {
    const { env, storages } = fakeEnv()
    const first = await worker.fetch(post('tok1', {
      'snu-lista': { code: 'a', at: '2026-10-21T10:00:00.000Z', hints: 1 },
      'NOT AN ID': { code: 'x' },
    }), env)
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ tasks: { 'snu-lista': { code: 'a', at: '2026-10-21T10:00:00.000Z', hints: 1 } } })

    const second = await worker.fetch(post('tok1', {
      'snu-lista': { code: 'eldre', at: '2026-10-20T10:00:00.000Z', solved: '2026-10-22T10:00:00.000Z' },
    }), env)
    expect(await second.json()).toEqual({
      tasks: { 'snu-lista': { code: 'a', at: '2026-10-21T10:00:00.000Z', hints: 1, solved: '2026-10-22T10:00:00.000Z' } },
    })

    const mine = await (await worker.fetch(get('tok1'), env)).json()
    expect(mine.user).toEqual({ name: 'Petter' })
    expect(Object.keys(mine.tasks)).toEqual(['snu-lista'])
    const theirs = await (await worker.fetch(get('tok2'), env)).json()
    expect(theirs).toEqual({ user: { name: 'kari' }, tasks: {} })
    expect([...storages.keys()]).toEqual(['u1', 'u2'])
  })

  it('takes writes only from its own origin, as JSON', async () => {
    const { env } = fakeEnv()
    expect((await worker.fetch(post('tok1', {}, { Origin: 'null' }), env)).status).toBe(403)
    expect((await worker.fetch(post('tok1', {}, { Origin: 'https://evil.example' }), env)).status).toBe(403)
    expect((await worker.fetch(post('tok1', {}, { 'Content-Type': 'text/plain' }), env)).status).toBe(415)
    const bad = new Request(`${ORIGIN}/api/progress`, {
      method: 'POST', body: '{', headers: { Cookie: 'session_token=tok1', Origin: ORIGIN, 'Content-Type': 'application/json' },
    })
    expect((await worker.fetch(bad, env)).status).toBe(400)
    expect((await worker.fetch(new Request(`${ORIGIN}/api/progress`, { method: 'DELETE' }), env)).status).toBe(405)
  })

  it('caps the tasks an account can hold', async () => {
    const { env } = fakeEnv()
    const many = (from: number, n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`t${from + i}`, { hints: 1 }]))
    expect((await worker.fetch(post('tok1', many(0, 400)), env)).status).toBe(200)
    expect((await worker.fetch(post('tok1', many(400, 200)), env)).status).toBe(413)
  })
})

// The page's side: progress.ts with a fake localStorage, window timers and fetch.
describe('the page', () => {
  let server: Record<string, TaskState>
  let posts: Record<string, TaskState>[]
  let signedIn: boolean

  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    server = {}
    posts = []
    signedIn = true
    const local = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => local.get(k) ?? null,
      setItem: (k: string, v: string) => { local.set(k, v) },
    })
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      if (!signedIn) return Response.json({ user: null }, { status: 401 })
      if (init?.method === 'POST') {
        const { tasks } = JSON.parse(String(init.body)) as { tasks: Record<string, TaskState> }
        posts.push(tasks)
        const out: Record<string, TaskState> = {}
        for (const [id, s] of Object.entries(tasks)) out[id] = server[id] = server[id] ? mergeTask(server[id], s) : s
        return Response.json({ tasks: out })
      }
      return Response.json({ user: { name: 'Petter' }, tasks: server })
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const hooks = () => ({ beforeMerge: vi.fn(), merged: vi.fn(), account: vi.fn() })

  it('merges the account in, sends up what it lacks, and sends later changes', async () => {
    server = { 'snu-lista': { solved: '2026-10-20T10:00:00.000Z', code: 'fra kontoen', at: '2026-10-20T10:00:00.000Z' } }
    localStorage.setItem('code-kata:progress', JSON.stringify({ 'bytt-to': { hints: 2 }, 'snu-lista': { hints: 1 } }))
    const progress = await import('../src/app/progress')
    const h = hooks()
    await progress.startSync(h)
    expect(h.account).toHaveBeenCalledWith({ name: 'Petter' }, true)
    expect(h.beforeMerge).toHaveBeenCalled()
    expect(h.merged).toHaveBeenCalledWith(['snu-lista'])
    expect(progress.taskState('snu-lista')).toMatchObject({ solved: '2026-10-20T10:00:00.000Z', code: 'fra kontoen', hints: 1 })
    await vi.advanceTimersByTimeAsync(10)
    expect(Object.keys(posts[0]).sort()).toEqual(['bytt-to', 'snu-lista'])
    expect(server['bytt-to']).toEqual({ hints: 2 })

    progress.updateTask('bytt-to', { code: 'min kode' })
    progress.updateTask('bytt-to', { code: 'min kode' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(posts).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1500)
    expect(posts).toHaveLength(2)
    expect(server['bytt-to'].code).toBe('min kode')
    expect(server['bytt-to'].at).toBeTruthy()
  })

  it('works from localStorage alone when signed out, and says so', async () => {
    signedIn = false
    const progress = await import('../src/app/progress')
    const h = hooks()
    await progress.startSync(h)
    expect(h.account).toHaveBeenCalledWith(null, true)
    progress.updateTask('snu-lista', { hints: 1 }, true)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(posts).toHaveLength(0)
    expect(progress.taskState('snu-lista').hints).toBe(1)
  })

  it('hides the account when the site has no API (dev)', async () => {
    vi.stubGlobal('fetch', async () => new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }))
    const progress = await import('../src/app/progress')
    const h = hooks()
    await progress.startSync(h)
    expect(h.account).toHaveBeenCalledWith(null, false)
  })
})
