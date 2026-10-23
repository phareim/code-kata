/*
 * Builders for a task's start: the items as plain specs, linked with at(slot), turned into a World. Every builder
 * takes the seeded random a task gets, so a task starts the same way for the same seed.
 */
import { COLORS, label, type Prop, type World } from '../world/world'

export type Random = () => number
export type Spec = Record<string, unknown>

export const PALETTE = Object.keys(COLORS)

/** A repeatable stand-in for Math.random. */
export function seeded(seed: number): Random {
  let s = (Math.floor(seed) * 2654435761) % 4294967296
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** A whole number from min to max, both included. */
export function int(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

export function pick<T>(random: Random, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)]
}

export function shuffled<T>(random: Random, list: readonly T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** n different whole numbers from min to max, in random order. */
export function distinct(random: Random, n: number, min = 1, max = 99): number[] {
  const values = new Set<number>()
  while (values.size < n) values.add(int(random, min, max))
  return [...values]
}

/** n items with different values and palette colours: [{ value, color }]. */
export function things(random: Random, n = 8, min = 1, max = 99): Spec[] {
  return distinct(random, n, min, max).map((value) => ({ value, color: pick(random, PALETTE) }))
}

/** n items with palette colours and no value, for a task that has no use for a number: [{ color }]. */
export function colored(random: Random, n = 8): Spec[] {
  return Array.from({ length: n }, () => ({ color: pick(random, PALETTE) }))
}

/** A pointer to the item in a slot. */
export interface At { at: number }
export const at = (slot: number): At => ({ at: slot })
const isAt = (v: unknown): v is At =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.hasOwn(v, 'at') && Object.keys(v).length === 1
const holdsAt = (v: unknown[]): boolean => v.some((x) => isAt(x) || (Array.isArray(x) && holdsAt(x)))

/** A value as the objects pane writes it, close to what the worker's inspect prints. */
export function text(v: unknown): string {
  if (typeof v === 'string') return `'${v}'`
  if (Array.isArray(v)) return v.length ? `[ ${v.map(text).join(', ')} ]` : '[]'
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v)
    return entries.length ? `{ ${entries.map(([k, x]) => `${k}: ${text(x)}`).join(', ')} }` : '{}'
  }
  return String(v)
}

function encode(key: string, v: unknown): Prop {
  if (isAt(v)) return { key, ref: v.at, text: label(v.at) }
  if (Array.isArray(v) && holdsAt(v)) {
    const list = v.map((x, i) => encode(String(i), x))
    return { key, list, text: `[${list.map((p) => p.text).join(', ')}]` }
  }
  return { key, raw: v, text: text(v) }
}

/** A World from specs: an item's props and the roots may hold at(slot), arrays of them, and plain values. */
export function makeWorld(items: Spec[], roots: Record<string, unknown>): World {
  return {
    items: items.map((spec) => ({ cls: 'Monster', props: Object.entries(spec).map(([k, v]) => encode(k, v)) })),
    roots: Object.entries(roots).map(([k, v]) => encode(k, v)),
  }
}

/** The items as a list from `head`, linked along next in the given slot order (slot order when left out). */
export function listWorld(items: Spec[], order: number[] = items.map((_, i) => i), roots: Record<string, unknown> = {}): World {
  const linked: Spec[] = items.map((spec) => ({ ...spec, next: null }))
  order.forEach((slot, k) => { linked[slot].next = k + 1 < order.length ? at(order[k + 1]) : null })
  return makeWorld(linked, { head: order.length ? at(order[0]) : null, ...roots })
}

/** The items in an array root (`items` unless named), in the given slot order. */
export function arrayWorld(items: Spec[], order: number[] = items.map((_, i) => i), name = 'items', roots: Record<string, unknown> = {}): World {
  return makeWorld(items, { [name]: order.map(at), ...roots })
}

/** A binary search tree: the values inserted in this order, slot i holding values[i]; `root` is slot 0. */
export function bstWorld(items: Spec[], roots: Record<string, unknown> = {}): World {
  const nodes: Spec[] = items.map((spec) => ({ ...spec, left: null, right: null }))
  for (let i = 1; i < nodes.length; i++) {
    let at0 = 0
    for (;;) {
      const side = (nodes[i].value as number) < (nodes[at0].value as number) ? 'left' : 'right'
      const next = nodes[at0][side] as At | null
      if (!next) { nodes[at0][side] = at(i); break }
      at0 = next.at
    }
  }
  return makeWorld(nodes, { root: nodes.length ? at(0) : null, ...roots })
}

/** A tree of any shape: each new item hangs under a random item that still has a free side; `root` is slot 0. */
export function treeWorld(random: Random, items: Spec[], roots: Record<string, unknown> = {}): World {
  const nodes: Spec[] = items.map((spec) => ({ ...spec, left: null, right: null }))
  for (let i = 1; i < nodes.length; i++) {
    const free: [number, 'left' | 'right'][] = []
    for (let j = 0; j < i; j++) for (const side of ['left', 'right'] as const) if (!nodes[j][side]) free.push([j, side])
    const [parent, side] = pick(random, free)
    nodes[parent][side] = at(i)
  }
  return makeWorld(nodes, { root: nodes.length ? at(0) : null, ...roots })
}

/**
 * A connected graph: a random tree through all items, plus `extra` more edges. Edges go both ways (each end lists
 * the other in `neighbors`); `nodes` holds every item.
 */
export function graphWorld(random: Random, items: Spec[], extra = 3, roots: Record<string, unknown> = {}): World {
  const n = items.length
  const edges = new Set<string>()
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const order = shuffled(random, [...Array(n).keys()])
  for (let k = 1; k < n; k++) edges.add(key(order[k], order[int(random, 0, k - 1)]))
  let tries = 0
  while (edges.size < n - 1 + extra && tries++ < 200) {
    const a = int(random, 0, n - 1)
    const b = int(random, 0, n - 1)
    if (a !== b) edges.add(key(a, b))
  }
  const neighbors: number[][] = items.map(() => [])
  for (const e of edges) {
    const [a, b] = e.split('-').map(Number)
    neighbors[a].push(b)
    neighbors[b].push(a)
  }
  const nodes = items.map((spec, i) => ({ ...spec, neighbors: neighbors[i].sort((x, y) => x - y).map(at) }))
  return makeWorld(nodes, { nodes: nodes.map((_, i) => at(i)), ...roots })
}
