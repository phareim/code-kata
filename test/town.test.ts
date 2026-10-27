import { afterEach, describe, expect, it, vi } from 'vitest'

type Town = typeof import('../src/app/town')

/** Load src/app/town.ts in a page at `search`, in a tab whose sessionStorage holds `stored`, framed or not. */
async function page(search: string, { framed = false, stored = {} as Record<string, string> } = {}) {
  const storage = new Map(Object.entries(stored))
  const listeners: ((e: { origin: string; source: unknown; data: unknown }) => void)[] = []
  const posted: [unknown, string][] = []
  const props = new Map<string, string>()
  const parent = { postMessage: (data: unknown, origin: string) => posted.push([data, origin]) }
  const win: Record<string, unknown> = { addEventListener: (_: string, fn: (typeof listeners)[number]) => listeners.push(fn) }
  win.parent = framed ? parent : win
  vi.stubGlobal('window', win)
  vi.stubGlobal('location', { search })
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) })
  vi.stubGlobal('document', { documentElement: { style: { setProperty: (k: string, v: string) => props.set(k, v) } } })
  vi.resetModules()
  const town: Town = await import('../src/app/town')
  town.joinTown()
  const send = (origin: string, source: unknown, data: unknown) => listeners.forEach((fn) => fn({ origin, source, data }))
  return { town, storage, posted, props, parent, send }
}

afterEach(() => vi.unstubAllGlobals())

describe('the way back to the town', () => {
  it('shows «Til byen» for a visit from the stand, and keeps it for the tab', async () => {
    const { town, storage, posted } = await page('?from=phareim')
    expect(town.cameFromTown()).toBe(true)
    expect(storage.get('code-kata:from')).toBe('phareim')
    // Not framed: the link's own address leads home, and nothing is said to a parent.
    expect(town.leaveThroughFrame()).toBe(false)
    town.townReady()
    expect(posted).toEqual([])
    expect(town.TOWN_URL).toBe('https://phareim.no/')
    const later = await page('', { stored: { 'code-kata:from': 'phareim' } })
    expect(later.town.cameFromTown()).toBe(true)
  })

  it('stays out of the way for any other visit, framed or not', async () => {
    expect((await page('')).town.cameFromTown()).toBe(false)
    expect((await page('?from=elsewhere')).town.cameFromTown()).toBe(false)
    const framed = await page('', { framed: true })
    expect(framed.town.cameFromTown()).toBe(false)
    expect(framed.town.leaveThroughFrame()).toBe(false)
    framed.town.townReady()
    expect(framed.posted).toEqual([])
  })

  it('speaks the town frame\'s messages when the town shows it inside its app', async () => {
    const { town, posted, props, parent, send } = await page('?from=phareim', { framed: true })
    expect(posted).toEqual([[{ type: 'phareim:hello' }, 'https://phareim.no']])
    town.townReady()
    expect(posted.at(-1)).toEqual([{ type: 'phareim:ready' }, 'https://phareim.no'])
    expect(town.leaveThroughFrame()).toBe(true)
    expect(posted.at(-1)).toEqual([{ type: 'phareim:home' }, 'https://phareim.no'])
    // The frame's safe edges, read only from the town in the parent window.
    const insets = { top: 47, right: 0, bottom: 34, left: -3 }
    send('https://evil.example', parent, { type: 'phareim:frame', insets })
    send('https://phareim.no', {}, { type: 'phareim:frame', insets })
    expect(props.size).toBe(0)
    send('https://phareim.no', parent, { type: 'phareim:frame', insets })
    expect(Object.fromEntries(props)).toEqual({ '--frame-top': '47px', '--frame-right': '0px', '--frame-bottom': '34px', '--frame-left': '0px' })
  })
})
