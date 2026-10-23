import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../worker/index'
import { MAX_MESSAGES, OPENER, systemPrompt, taskFor, talkRequest, TURNS_PER_DAY, USD_PER_DAY, userMessage } from '../worker/talk'
import { fakeEnv } from './fake-env'

const ORIGIN = 'https://kata.phareim.no'
const TASK = 'snu-lista'
const headers = (token = 'tok1') => ({ Cookie: `session_token=${token}`, Origin: ORIGIN, 'Content-Type': 'application/json' })
const post = (path: string, body: unknown, token?: string) =>
  new Request(`${ORIGIN}${path}`, { method: 'POST', body: JSON.stringify(body), headers: headers(token) })
const get = (path: string, token = 'tok1') => new Request(`${ORIGIN}${path}`, { headers: { Cookie: `session_token=${token}` } })

/** A streamed answer from the Messages API, as server-sent events. */
function sse(text: string, stop = 'end_turn'): Response {
  const events = [
    { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ...text.match(/.{1,6}/gs)!.map((piece) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: piece } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 200 } },
    { type: 'message_stop' },
  ]
  const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
}

async function lines(res: Response): Promise<Record<string, unknown>[]> {
  return (await res.text()).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
}

describe('the prompt', () => {
  it('carries the task and its reference solution, and the code only when it changed', () => {
    const task = taskFor(TASK)!
    const system = systemPrompt(task)
    expect(system).toContain(task.title)
    expect(system).toContain(task.solution)
    expect(system).toContain('Norwegian bokmål')
    const first = userMessage(task, OPENER, 'min kode', task.monster ?? '', null)
    expect(first).toContain('<visitor_code>\nmin kode\n</visitor_code>')
    const conv = { api: [], view: [], code: 'min kode', ting: 'x' }
    expect(userMessage(task, 'Hvorfor?', 'min kode', 'x', conv)).toBe('Hvorfor?')
    expect(userMessage(task, 'Og nå?', 'ny kode', 'x', conv)).toContain('<visitor_code>\nny kode')
  })

  it('takes only known tasks and caps what the visitor sends', () => {
    expect(talkRequest({ task: 'finnes-ikke', code: '' })).toBeNull()
    expect(talkRequest({ task: TASK })).toBeNull()
    expect(talkRequest({ task: TASK, code: 'x', text: 'y'.repeat(5000) })!.text).toHaveLength(2000)
  })
})

describe('/api/talk', () => {
  let calls: { url: string; body: any }[]
  let answer: string
  let stop: string
  beforeEach(() => {
    calls = []
    answer = 'Koden snur pekerne én etter én. Det er elegant.'
    stop = 'end_turn'
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input)
      calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) })
      return sse(answer, stop)
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  async function solved(env: ReturnType<typeof fakeEnv>['env']) {
    await worker.fetch(post('/api/progress', { tasks: { [TASK]: { solved: '2026-10-23T10:00:00.000Z' } } }), env)
  }

  it('needs a session, a key and a solved task', async () => {
    const { env } = fakeEnv(true)
    expect((await worker.fetch(get(`/api/talk?task=${TASK}`, 'nope'), env)).status).toBe(401)
    expect((await worker.fetch(post('/api/talk', { task: TASK, code: 'x' }), env)).status).toBe(403)
    const off = fakeEnv(false).env
    await solved(off)
    expect((await worker.fetch(post('/api/talk', { task: TASK, code: 'x' }), off)).status).toBe(503)
    const wrongOrigin = new Request(`${ORIGIN}/api/talk`, { method: 'POST', body: '{}', headers: { ...headers(), Origin: 'null' } })
    expect((await worker.fetch(wrongOrigin, env)).status).toBe(403)
    expect(calls).toHaveLength(0)
  })

  it('streams a turn, keeps it on the account and sends the whole history next time', async () => {
    const { env } = fakeEnv(true)
    await solved(env)
    const res = await worker.fetch(post('/api/talk', { task: TASK, code: 'let prev = null' }), env)
    expect(res.headers.get('Content-Type')).toContain('ndjson')
    const out = await lines(res)
    expect(out.filter((l) => 'text' in l).map((l) => l.text).join('')).toBe(answer)
    expect(out.at(-1)).toEqual({ done: true })

    const sent = calls[0].body
    expect(calls[0].url).toContain('api.anthropic.com')
    expect(sent.model).toBe('claude-opus-5-5')
    expect(sent.fallbacks).toBe('default')
    expect(sent.system).toContain(taskFor(TASK)!.solution)
    expect(sent.messages).toHaveLength(1)
    expect(sent.messages[0].content).toContain(OPENER)

    const view = await (await worker.fetch(get(`/api/talk?task=${TASK}`), env)).json()
    expect(view.view).toEqual([{ role: 'user', text: OPENER }, { role: 'assistant', text: answer }])
    expect(view.turnsLeft).toBe(TURNS_PER_DAY - 1)

    await lines(await worker.fetch(post('/api/talk', { task: TASK, code: 'let prev = null', text: 'Hvorfor ikke rekursjon?' }), env))
    const second = calls[1].body.messages
    expect(second).toHaveLength(3)
    expect(second[1].role).toBe('assistant')
    expect(second[1].content[0]).toMatchObject({ type: 'text', text: answer })
    expect(second[2].content).toBe('Hvorfor ikke rekursjon?')

    expect((await worker.fetch(new Request(`${ORIGIN}/api/talk?task=${TASK}`, { method: 'DELETE', headers: headers() }), env)).status).toBe(200)
    expect((await (await worker.fetch(get(`/api/talk?task=${TASK}`), env)).json()).view).toEqual([])
  })

  it('keeps no turn that was refused', async () => {
    const { env } = fakeEnv(true)
    await solved(env)
    stop = 'refusal'
    answer = '.'
    const out = await lines(await worker.fetch(post('/api/talk', { task: TASK, code: 'x' }), env))
    expect(out.at(-1)).toEqual({ error: 'refused' })
    expect((await (await worker.fetch(get(`/api/talk?task=${TASK}`), env)).json()).view).toEqual([])
  })

  it('stops at the turns of the day, a full conversation and the day\'s budget', async () => {
    const { env, storages } = fakeEnv(true)
    await solved(env)
    const day = new Date().toISOString().slice(0, 10)
    await storages.get('u1')!.put('talk-day', { day, turns: TURNS_PER_DAY })
    expect(await (await worker.fetch(post('/api/talk', { task: TASK, code: 'x' }), env)).json()).toEqual({ error: 'turns' })

    await storages.get('u1')!.put('talk-day', { day, turns: 0 })
    await storages.get('u1')!.put(`c:${TASK}`, { api: Array(MAX_MESSAGES).fill({ role: 'user', content: 'x' }), view: [], code: '', ting: '' })
    expect((await worker.fetch(post('/api/talk', { task: TASK, code: 'x' }), env)).status).toBe(409)

    await storages.get('u1')!.delete(`c:${TASK}`)
    env.BUDGET.get('global')
    await storages.get('global')!.put(`usd:${day}`, USD_PER_DAY)
    const res = await worker.fetch(post('/api/talk', { task: TASK, code: 'x' }), env)
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'budget' })
    expect(calls).toHaveLength(0)
  })

  it('counts what a turn costs', async () => {
    const { env, storages } = fakeEnv(true)
    await solved(env)
    await lines(await worker.fetch(post('/api/talk', { task: TASK, code: 'x' }), env))
    const day = new Date().toISOString().slice(0, 10)
    // 1000 input at $5/M and 200 output at $25/M.
    expect(storages.get('global')!.data.get(`usd:${day}`)).toBeCloseTo(0.01, 6)
  })
})
