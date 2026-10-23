/*
 * The items above the editor and the globals that hold them (roots: `head` for a list, `items` for an array, `root`
 * for a tree …). Each item is a Monster such as { value, color, next }. The page never changes a World: each run returns
 * a new one from the worker (src/run/worker.js describes the format, slots and labels).
 */

/**
 * One property: another item by slot (`ref`), an array holding items (`list`, its elements keyed by index), a value
 * that survives a clone (`raw`), or only its text (`lossy`).
 */
export interface Prop {
  key: string
  ref?: number
  list?: Prop[]
  raw?: unknown
  text: string
  lossy?: boolean
}
export interface Item {
  /** The constructor's name: 'Monster' for the items the class builds, 'Object' for a plain {}. */
  cls?: string | null
  props: Prop[]
}
export interface World {
  items: Item[]
  /** The globals the code reads the items through, in the order the stage shows them. */
  roots: Prop[]
  /** The fields a new Monster had when these items were built; the next build drops the ones the class lost. */
  fields?: string[]
  /** More items than the worker tracks; the rest are not shown. */
  truncated?: boolean
  /** A vis() frame: the items it lit up, and its caption. */
  marks?: number[]
  note?: string
}

export function root(world: World, name: string): Prop | undefined {
  return world.roots.find((p) => p.key === name)
}

/** The colour names new items get, from the Neon Coast palette. Any CSS colour works too. */
export const COLORS: Record<string, string> = {
  pink: '#ff2fa0',
  cyan: '#2ff3ff',
  gold: '#ffd23f',
  lime: '#b6ff4a',
  violet: '#9a4ff0',
  orange: '#ff8a3d',
  red: '#ff3b5c',
  teal: '#3fd8b0',
}

/** Slot i's name in the code and on screen: A … Z, then A1 … Z1, A2 … */
export function label(i: number): string {
  return String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '')
}

export function prop(item: Item, key: string): Prop | undefined {
  return item.props.find((p) => p.key === key)
}

const ref = (key: string, slot: number): Prop => ({ key, ref: slot, text: label(slot) })
const NULL = (key: string): Prop => ({ key, raw: null, text: 'null' })

/** How many items a new set has: always eight, A to H. */
export const ITEM_COUNT = 8

/** Eight items with different values 1–99 and palette colours, linked in a shuffled order. */
export function randomWorld(random: () => number = Math.random): World {
  const n = ITEM_COUNT
  const values = new Set<number>()
  while (values.size < n) values.add(1 + Math.floor(random() * 99))
  const names = Object.keys(COLORS)
  const order = [...Array(n).keys()]
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const nextOf = new Map(order.map((slot, k) => [slot, order[k + 1]]))
  const items = [...values].map((value, slot): Item => {
    const color = names[Math.floor(random() * names.length)]
    const next = nextOf.get(slot)
    return {
      cls: 'Monster',
      props: [
        { key: 'value', raw: value, text: String(value) },
        { key: 'color', raw: color, text: `'${color}'` },
        next === undefined ? NULL('next') : ref('next', next),
      ],
    }
  })
  return { items, roots: [ref('head', order[0])], fields: ['value', 'color', 'next'] }
}

export type End =
  | { kind: 'null'; text: string }
  | { kind: 'loop'; to: number }
  | { kind: 'bad'; text: string }

export interface Walk {
  /** Slots in list order, from head along next. */
  chain: number[]
  /** How the list ends: null, a next back to an item already in it, or a next that isn't an item. */
  end: End
  /** Items not in the list. */
  loose: number[]
}

/** The list from a root (head) along a pointer key (next). */
export function walk(world: World, from: Prop | undefined = root(world, 'head'), key = 'next'): Walk {
  const chain: number[] = []
  const seen = new Set<number>()
  let p: Prop | undefined = from
  let end: End
  for (;;) {
    if (!p) { end = { kind: 'null', text: 'undefined' }; break }
    if (p.ref === undefined) {
      end = 'raw' in p && (p.raw === null || p.raw === undefined) ? { kind: 'null', text: p.text } : { kind: 'bad', text: p.text }
      break
    }
    if (seen.has(p.ref)) { end = { kind: 'loop', to: p.ref }; break }
    seen.add(p.ref)
    chain.push(p.ref)
    p = prop(world.items[p.ref], key)
  }
  return { chain, end, loose: world.items.map((_, i) => i).filter((i) => !seen.has(i)) }
}

/** The slots reachable from the roots through any pointer or array; the rest are loose. */
export function reachable(world: World): Set<number> {
  const seen = new Set<number>()
  const visit = (p: Prop | undefined) => {
    if (!p) return
    if (p.list) for (const q of p.list) visit(q)
    if (p.ref === undefined || seen.has(p.ref)) return
    seen.add(p.ref)
    for (const q of world.items[p.ref]?.props ?? []) visit(q)
  }
  for (const p of world.roots) visit(p)
  return seen
}

/** The CSS colour an item's `color` stands for, or null when it isn't one. */
export function itemColor(item: Item): string | null {
  const raw = prop(item, 'color')?.raw
  if (typeof raw !== 'string') return null
  const name = raw.trim()
  if (name in COLORS) return COLORS[name]
  return typeof CSS !== 'undefined' && CSS.supports('color', name) ? name : null
}

/** An item's value as it reads on its token: strings without quotes. */
export function itemValue(item: Item): string {
  const p = prop(item, 'value')
  if (!p) return ''
  if (p.ref !== undefined) return label(p.ref)
  return typeof p.raw === 'string' ? p.raw : p.text
}
