// A Worker environment in memory for the tests: Durable Object storage, the namespaces, and Reader's D1.
import { ProgressStore, TalkBudget, type Env } from '../worker/index'

export function memoryStorage() {
  const data = new Map<string, unknown>()
  function get<T>(key: string): Promise<T | undefined>
  function get<T>(keys: string[]): Promise<Map<string, T>>
  async function get<T>(keys: string | string[]) {
    if (typeof keys === 'string') return structuredClone(data.get(keys)) as T | undefined
    return new Map(keys.filter((k) => data.has(k)).map((k) => [k, structuredClone(data.get(k)) as T]))
  }
  function put<T>(key: string, value: T): Promise<void>
  function put<T>(entries: Record<string, T>): Promise<void>
  async function put<T>(a: string | Record<string, T>, b?: T) {
    const entries = typeof a === 'string' ? { [a]: b } : a
    for (const [k, v] of Object.entries(entries)) data.set(k, structuredClone(v))
  }
  return {
    data,
    get,
    put,
    async delete(key: string) { return data.delete(key) },
    async list<T>({ prefix }: { prefix: string }) {
      return new Map([...data].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, v as T]))
    },
  }
}

export function fakeEnv(withKey = false) {
  const storages = new Map<string, ReturnType<typeof memoryStorage>>()
  const namespace = (make: (ctx: { storage: ReturnType<typeof memoryStorage> }) => { fetch(r: Request): Promise<Response> }) => {
    const objects = new Map<string, { fetch(r: Request): Promise<Response> }>()
    return {
      idFromName: (name: string) => name,
      get: (id: unknown) => {
        const key = String(id)
        if (!objects.has(key)) {
          const storage = memoryStorage()
          storages.set(key, storage)
          objects.set(key, make({ storage }))
        }
        return objects.get(key)!
      },
    }
  }
  const users: Record<string, { id: string; name: string; email: string }> = {
    tok1: { id: 'u1', name: 'Petter', email: 'p@example.com' },
    tok2: { id: 'u2', name: '', email: 'kari@example.com' },
  }
  const env: Env = {
    ASSETS: { fetch: async () => new Response('asset') },
    DB: {
      prepare: () => ({ bind: (token: unknown) => ({ first: async <T>() => (users[String(token)] ?? null) as T | null }) }),
    },
    PROGRESS: namespace((ctx) => new ProgressStore(ctx)),
    BUDGET: namespace((ctx) => new TalkBudget(ctx)),
    ...(withKey ? { KATA_ANTHROPIC_KEY: 'test-key' } : {}),
  }
  return { env, storages }
}
