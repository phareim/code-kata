import { describe, expect, it } from 'vitest'
import source from '../src/run/worker.js?raw'
import { COLORS, itemValue, label, prop, randomWorld, root, walk, type World } from '../src/world/world'

type Obj = Record<string, unknown> & { next?: unknown }
type Built = { objs: Obj[]; roots: [string, unknown][]; fields: string[] }
const worker = new Function(`${source}\nreturn { buildWorld, snapshotWorld, label, place }`)() as {
  buildWorld(world: World, Ting?: new () => object): Built
  snapshotWorld(known: Obj[], roots: [string, unknown][], fields?: string[], Ting?: unknown, marked?: object[]): World
  label(i: number): string
  place(line: number | null, classLines: number): { line: number | null; where: string | null }
}
const headOf = (built: Built) => built.roots.find(([name]) => name === 'head')![1]
const snapHead = (objs: Obj[], head: unknown, fields?: string[]) => worker.snapshotWorld(objs, [['head', head]], fields)

/** A repeatable Math.random stand-in. */
function seeded(seed: number): () => number {
  let s = (seed * 2654435761) % 4294967296
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('randomWorld', () => {
  it('makes eight Ting with different values, palette colours, all in one list', () => {
    for (let seed = 1; seed < 200; seed++) {
      const world = randomWorld(seeded(seed))
      expect(world.items.length).toBe(8)
      expect(world.fields).toEqual(['value', 'color', 'next'])
      expect(world.items.every((item) => item.cls === 'Ting')).toBe(true)
      const values = world.items.map((item) => prop(item, 'value')!.raw)
      expect(new Set(values).size).toBe(values.length)
      for (const item of world.items) {
        expect(Object.keys(COLORS)).toContain(prop(item, 'color')!.raw)
        expect(item.props.map((p) => p.key)).toEqual(['value', 'color', 'next'])
      }
      const { chain, end, loose } = walk(world)
      expect(chain.length).toBe(world.items.length)
      expect(end.kind).toBe('null')
      expect(loose).toEqual([])
    }
  })
})

describe('labels', () => {
  it('names slots A to Z, then A1, B1 …, the same on both sides', () => {
    expect([0, 1, 25, 26, 27, 52].map(label)).toEqual(['A', 'B', 'Z', 'A1', 'B1', 'A2'])
    for (let i = 0; i < 60; i++) expect(worker.label(i)).toBe(label(i))
  })
})

describe('walk', () => {
  const world = (heads: string, nexts: (number | null | string)[]): World => ({
    roots: [heads === 'null' ? { key: 'head', raw: null, text: 'null' } : { key: 'head', ref: Number(heads), text: '' }],
    items: nexts.map((n) => ({
      props: [n === null ? { key: 'next', raw: null, text: 'null' }
        : typeof n === 'string' ? { key: 'next', raw: n, text: `'${n}'` }
        : { key: 'next', ref: n, text: '' }],
    })),
  })

  it('follows next from head and lists the rest as loose', () => {
    expect(walk(world('2', [null, 0, 1, null]))).toEqual({ chain: [2, 1, 0], end: { kind: 'null', text: 'null' }, loose: [3] })
  })

  it('stops at a pointer back into the list', () => {
    expect(walk(world('0', [1, 2, 1]))).toEqual({ chain: [0, 1, 2], end: { kind: 'loop', to: 1 }, loose: [] })
  })

  it('stops at a next that is not an item', () => {
    expect(walk(world('0', ['B', null])).end).toEqual({ kind: 'bad', text: "'B'" })
  })

  it('handles an empty list', () => {
    expect(walk(world('null', [null, null]))).toEqual({ chain: [], end: { kind: 'null', text: 'null' }, loose: [0, 1] })
  })
})

describe('the world through the worker', () => {
  it('keeps every item in its slot and links them as described', () => {
    const start = randomWorld(seeded(7))
    const built = worker.buildWorld(start)
    const { objs } = built
    const head = headOf(built)
    const order: number[] = []
    for (let node = head as Obj | null; node; node = node.next as Obj | null) order.push(objs.indexOf(node))
    expect(order).toEqual(walk(start).chain)
    objs.forEach((obj, i) => expect(obj.value).toBe(prop(start.items[i], 'value')!.raw))
  })

  it('brings back a reversed list with a new item in front', () => {
    const start = randomWorld(seeded(11))
    const built = worker.buildWorld(start)
    const { objs } = built
    const head = headOf(built)
    let prev: Obj | null = null
    let node = head as Obj | null
    while (node) {
      const next = node.next as Obj | null
      node.next = prev
      prev = node
      node = next
    }
    const added = { value: 100, color: 'gold', next: prev }
    const after = snapHead(objs, added)

    const n = start.items.length
    expect(after.items.length).toBe(n + 1)
    expect(root(after, 'head')).toEqual({ key: 'head', ref: n, text: label(n) })
    expect(walk(after).chain).toEqual([n, ...[...walk(start).chain].reverse()])
    after.items.slice(0, n).forEach((item, i) => expect(itemValue(item)).toBe(itemValue(start.items[i])))

    // And in again: the same objects, the same links.
    const again = worker.buildWorld(after)
    expect(headOf(again)).toBe(again.objs[n])
    expect((headOf(again) as Obj).next).toBe(again.objs[walk(start).chain.at(-1)!])
  })

  it('keeps extra props, and only the text of what cannot be cloned', () => {
    const start = randomWorld(seeded(3))
    const built = worker.buildWorld(start)
    const { objs } = built
    const head = headOf(built)
    objs[0].seen = true
    objs[0].tags = ['x', 1]
    objs[0].friend = objs[1]
    objs[0].fn = function shout() {}
    const item = snapHead(objs, head).items[0]
    expect(prop(item, 'seen')).toEqual({ key: 'seen', raw: true, text: 'true' })
    expect(prop(item, 'tags')).toEqual({ key: 'tags', raw: ['x', 1], text: "[ 'x', 1 ]" })
    expect(prop(item, 'friend')).toEqual({ key: 'friend', ref: 1, text: 'B' })
    expect(prop(item, 'fn')).toEqual({ key: 'fn', text: '[Function: shout]', lossy: true })
  })

  it('stores a cycle as it is and a head that is not an item as a value', () => {
    const start = randomWorld(seeded(5))
    const { objs } = worker.buildWorld(start)
    objs[0].next = objs[1]
    objs[1].next = objs[0]
    const cyclic = snapHead(objs, objs[0])
    expect(walk(cyclic)).toMatchObject({ chain: [0, 1], end: { kind: 'loop', to: 0 } })
    expect(root(snapHead(objs, 42), 'head')).toEqual({ key: 'head', raw: 42, text: '42' })
  })

  it('tracks at most 64 items', () => {
    let head: Obj | null = null
    for (let i = 0; i < 100; i++) head = { value: i, next: head }
    const world = snapHead([], head)
    expect(world.items.length).toBe(64)
    expect(world.truncated).toBe(true)
  })
})

describe('the Ting class', () => {
  const makeClass = (body: string) => new Function(`return class Ting { ${body} constructor(p) { Object.assign(this, p) } }`)()

  it('builds every item as a Ting, with new fields at their defaults and the data kept', () => {
    const start = randomWorld(seeded(13))
    const Ting = makeClass("value = 0; color = 'pink'; next = null; size = 1;")
    const built = worker.buildWorld(start, Ting)
    const { objs, fields } = built
    const head = headOf(built)
    expect(fields).toEqual(['value', 'color', 'next', 'size'])
    objs.forEach((obj, i) => {
      expect(obj).toBeInstanceOf(Ting)
      expect(obj.size).toBe(1)
      expect(obj.value).toBe(prop(start.items[i], 'value')!.raw)
      expect(obj.color).toBe(prop(start.items[i], 'color')!.raw)
    })
    expect(head).toBe(objs[walk(start).chain[0]])
  })

  it('drops a field the class no longer has, and keeps what the code added', () => {
    const start = randomWorld(seeded(17))
    const first = worker.buildWorld(start, makeClass("value = 0; color = 'pink'; next = null;"))
    first.objs[0].seen = true
    const after = snapHead(first.objs, headOf(first), first.fields)
    expect(after.fields).toEqual(['value', 'color', 'next'])
    expect(after.items[0].cls).toBe('Ting')

    const second = worker.buildWorld(after, makeClass('value = 0; next = null;'))
    expect(second.fields).toEqual(['value', 'next'])
    for (const obj of second.objs) expect('color' in obj).toBe(false)
    expect(second.objs[0].seen).toBe(true)
    expect(walk(snapHead(second.objs, headOf(second), second.fields)).chain).toEqual(walk(start).chain)
  })

  it('leaves plain objects plain without a class', () => {
    const { objs, fields } = worker.buildWorld(randomWorld(seeded(19)))
    expect(Object.getPrototypeOf(objs[0])).toBe(Object.prototype)
    expect(fields).toEqual(['value', 'color', 'next'])
  })

  it('places a line in the class or in the code', () => {
    // A class of 4 lines, then the build line (5), then the code from line 6.
    expect(worker.place(3, 4)).toEqual({ line: 3, where: 'ting' })
    expect(worker.place(5, 4)).toEqual({ line: null, where: 'ting' })
    expect(worker.place(8, 4)).toEqual({ line: 3, where: 'kode' })
    expect(worker.place(null, 4)).toEqual({ line: null, where: null })
    expect(worker.place(2, 0)).toEqual({ line: 2, where: 'kode' })
  })
})
