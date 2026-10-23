import { describe, expect, it } from 'vitest'
import { label, prop, randomWorld, reachable, root, walk, type Prop, type World } from '../src/world/world'
import { runWorker } from './harness'

const MONSTER = `class Monster {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
}`

const ref = (key: string, slot: number): Prop => ({ key, ref: slot, text: label(slot) })
const raw = (key: string, value: unknown): Prop => ({ key, raw: value, text: JSON.stringify(value) })

/** Items with the given values, held by an `items` array in slot order; no list. */
function arrayWorld(values: number[]): World {
  return {
    items: values.map((v) => ({ cls: 'Monster', props: [raw('value', v), raw('color', 'pink')] })),
    roots: [{ key: 'items', list: values.map((_, i) => ref(String(i), i)), text: '' }],
  }
}

describe('roots and arrays', () => {
  it('brings an array of items back as a list of refs, in its new order', async () => {
    const run = await runWorker({
      code: 'items.sort((a, b) => a.value - b.value)',
      classSource: MONSTER,
      world: arrayWorld([30, 10, 20]),
    })
    expect(run.end.type).toBe('done')
    expect(root(run.world!, 'items')!.list!.map((p) => p.ref)).toEqual([1, 2, 0])
    expect(root(run.world!, 'items')!.text).toBe('[B, C, A]')
  })

  it('finds new items in a root array, through left/right and in arrays of Monster', async () => {
    const run = await runWorker({
      code: `
        const top = new Monster({ value: 1, left: A, right: new Monster({ value: 2 }) })
        A.neighbors = [B, new Monster({ value: 3 })]
        items.push(top)`,
      classSource: MONSTER,
      world: arrayWorld([5, 6]),
    })
    expect(run.end.type).toBe('done')
    const world = run.world!
    expect(world.items.length).toBe(5)
    expect(root(world, 'items')!.list!.map((p) => p.ref)).toEqual([0, 1, 2])
    // Found breadth first: the root array, then A's neighbors, then the new item's right.
    expect(prop(world.items[0], 'neighbors')!.list!.map((p) => p.ref)).toEqual([1, 3])
    expect(prop(world.items[2], 'right')!.ref).toBe(4)
    expect([...reachable(world)].sort()).toEqual([0, 1, 2, 3, 4])
  })

  it('keeps plain arrays of values raw, and arrays of arrays of items as nested lists', async () => {
    const run = await runWorker({
      code: `grid = [['pink', 'cyan'], ['gold', 'lime']]; pegs = [[B, A], [], []]`,
      classSource: MONSTER,
      world: { ...arrayWorld([2, 1]), roots: [raw('grid', null), raw('pegs', null)] },
    })
    expect(root(run.world!, 'grid')).toMatchObject({ raw: [['pink', 'cyan'], ['gold', 'lime']] })
    expect(root(run.world!, 'pegs')!.list!.map((p) => p.list?.map((q) => q.ref) ?? p.raw)).toEqual([[1, 0], [], []])
  })
})

describe('vis()', () => {
  it('takes frames with marks and a caption, slots stable to the end', async () => {
    const start = randomWorld()
    const run = await runWorker({
      code: `
        vis('start')
        const extra = new Monster({ value: 100, next: head })
        head = extra
        vis('ny først', extra, [A, B])
        head = head.next`,
      classSource: MONSTER,
      world: start,
    })
    expect(run.end.type).toBe('done')
    expect(run.frames.length).toBe(2)
    expect(run.frames[0].note).toBe('start')
    expect(run.frames[1].note).toBe('ny først')
    expect(run.frames[1].marks).toEqual([8, 0, 1])
    expect(walk(run.frames[1]).chain[0]).toBe(8)
    // The new item keeps slot 8 at the end, loose now.
    expect(run.world!.items.length).toBe(9)
    expect(reachable(run.world!).has(8)).toBe(false)
  })
})

describe('task checks', () => {
  const sortedCheck = String((t: any) => {
    const values = t.values(t.head)
    if (!values) return 'Lista går i ring.'
    if (values.length !== t.slots.length) return `Lista har ${values.length} monstre, ventet ${t.slots.length}.`
    for (let i = 1; i < values.length; i++) if (values[i - 1] > values[i]) return `${values[i - 1]} står før ${values[i]}.`
    return true
  })

  it('says ok when the check returns true', async () => {
    const run = await runWorker({
      code: `
        const nodes = []
        for (let n = head; n; n = n.next) nodes.push(n)
        nodes.sort((a, b) => a.value - b.value)
        nodes.forEach((n, i) => { n.next = nodes[i + 1] ?? null })
        head = nodes[0]`,
      classSource: MONSTER,
      world: randomWorld(),
      task: { check: sortedCheck },
    })
    expect(run.verdict).toMatchObject({ ok: true, broken: false })
    expect(run.end.type).toBe('done')
  })

  it('passes on what is still wrong', async () => {
    const run = await runWorker({ code: 'head = head.next', classSource: MONSTER, world: randomWorld(), task: { check: sortedCheck } })
    expect(run.verdict!.ok).toBe(false)
    expect(run.verdict!.broken).toBe(false)
    expect(run.verdict!.message).toMatch(/Lista har 7 monstre|står før/)
  })

  it('names a function the code did not declare', async () => {
    const run = await runWorker({
      code: 'const x = 1',
      classSource: MONSTER,
      world: randomWorld(),
      task: { check: String(() => true), exports: ['length'] },
    })
    expect(run.verdict).toMatchObject({ ok: false, broken: false })
    expect(run.verdict!.message).toContain('length')
  })

  it('names a missing function or class the code calls, before the error', async () => {
    const cases = [
      ['console.log(count(head))', ['count'], 'Fant ikke funksjonen count.'],
      ['const s = new MinStack()', ['MinStack'], 'Fant ikke klassen MinStack.'],
      // WebKit's wording, thrown by hand: V8 says «count is not defined».
      [`throw new ReferenceError("Can't find variable: count")`, ['count'], 'Fant ikke funksjonen count.'],
    ] as const
    for (const [code, exports, message] of cases) {
      const run = await runWorker({ code, classSource: MONSTER, world: randomWorld(), task: { check: String(() => true), exports: [...exports] } })
      expect(run.end, code).toMatchObject({ type: 'error', name: 'ReferenceError' })
      expect(run.verdict, code).toMatchObject({ ok: false, broken: false })
      expect(run.verdict!.message, code).toContain(message)
    }
  })

  it('gives no verdict for a missing name that is not an export', async () => {
    const run = await runWorker({
      code: 'console.log(cuont(head))',
      classSource: MONSTER,
      world: randomWorld(),
      task: { check: String(() => true), exports: ['count'] },
    })
    expect(run.end).toMatchObject({ type: 'error', name: 'ReferenceError' })
    expect(run.verdict).toBeNull()
  })

  it('calls an exported function on fresh lists, and places its error in the code', async () => {
    const check = String((t: any) => {
      const length = t.fn('length')
      for (const values of [[], [4], [1, 2, 3]]) {
        const got = length(t.list(values))
        if (got !== values.length) return `length gav ${got} for ${values.length} monstre.`
      }
      return true
    })
    const good = await runWorker({
      code: 'function length(head) {\n  let n = 0\n  for (let p = head; p; p = p.next) n++\n  return n\n}',
      classSource: MONSTER,
      world: randomWorld(),
      task: { check, exports: ['length'] },
    })
    expect(good.verdict).toMatchObject({ ok: true })

    const bad = await runWorker({
      code: 'function length(head) {\n  return head.next.value\n}',
      classSource: MONSTER,
      world: randomWorld(),
      task: { check, exports: ['length'] },
    })
    expect(bad.verdict).toMatchObject({ ok: false, broken: false, line: 2, where: 'kode' })
    expect(bad.verdict!.message).toMatch(/^length: TypeError/)
  })

  it('tells a broken check from a failed task', async () => {
    const run = await runWorker({
      code: '',
      classSource: MONSTER,
      world: randomWorld(),
      task: { check: String((t: any) => t.nothing.here) },
    })
    expect(run.verdict).toMatchObject({ ok: false, broken: true })
    expect(run.verdict!.message).toMatch(/^Feil i sjekken/)
  })

  it('gives the check the start as a plain copy and what the code printed', async () => {
    const check = String((t: any) => {
      if (t.out.join('|') !== 'hei|1 2') return `out: ${t.out.join('|')}`
      if (t.head !== null) return 'head er ikke null'
      if (t.start.head === null || Object.getPrototypeOf(t.start.head) !== Object.prototype) return 'start er ikke en kopi'
      return true
    })
    const run = await runWorker({
      code: "console.log('hei')\nconsole.log(1, 2)\nhead = null",
      classSource: MONSTER,
      world: randomWorld(),
      task: { check },
    })
    expect(run.verdict).toMatchObject({ ok: true })
  })

  it('constructs a class the code exports, through t.fn with new', async () => {
    const check = String((t: any) => {
      const Counter = t.fn('Counter')
      const c = new Counter(2)
      c.add()
      return c.n === 3 ? true : `n er ${c.n}`
    })
    const run = await runWorker({
      code: 'class Counter {\n  constructor(n) { this.n = n }\n  add() { this.n++ }\n}',
      classSource: MONSTER,
      world: randomWorld(),
      task: { check, exports: ['Counter'] },
    })
    expect(run.verdict).toMatchObject({ ok: true })
  })

  it('draws a value from a getter in the class', async () => {
    const run = await runWorker({
      code: '',
      classSource: `class Monster {
  #v = 0
  color = 'pink'
  next = null
  get value() { return this.#v }
  set value(v) { this.#v = Math.min(99, Math.max(1, v)) }
  constructor(props) { Object.assign(this, props) }
}`,
      world: randomWorld(),
    })
    expect(run.end.type).toBe('done')
    const value = prop(run.world!.items[0], 'value')
    expect(typeof value!.raw).toBe('number')
  })

  it('prints nothing from the code while the check runs', async () => {
    const check = String((t: any) => (t.fn('shout')() === 1 ? true : 'nei'))
    const run = await runWorker({
      code: "function shout() { console.log('fra sjekken'); return 1 }\nconsole.log('fra koden')",
      classSource: MONSTER,
      world: randomWorld(),
      task: { check, exports: ['shout'] },
    })
    expect(run.verdict).toMatchObject({ ok: true })
    expect(run.output.map((e) => e.text)).toEqual(['fra koden'])
  })
})

// The class was Ting until 2026-10-23: visitors have saved classes and code from then (localStorage).
describe('code and classes saved when the class was Ting', () => {
  const OLD_CLASS = `// Legg til eller ta bort et felt og trykk «Bruk».
class Ting {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
}`
  const OLD_CODE = `head = new Ting({ value: 5, color: 'gold', next: head })
console.log(head instanceof Ting, head instanceof Monster, A instanceof Ting)`
  const check = String((t: any) => (t.head instanceof t.Monster && t.monster({ value: 1 }) instanceof t.Monster ? true : 'nei'))

  it('runs an old class with old code: the items are Ting, and Monster is the same class', async () => {
    const run = await runWorker({ code: OLD_CODE, classSource: OLD_CLASS, world: randomWorld(), task: { check } })
    expect(run.end.type).toBe('done')
    expect(run.output.map((e) => e.text)).toEqual(['true true true'])
    expect(run.world!.items.every((item) => item.cls === 'Ting')).toBe(true)
    expect(walk(run.world!).chain[0]).toBe(8)
    expect(run.verdict).toMatchObject({ ok: true })
  })

  it('runs old code with the new class: Ting is Monster', async () => {
    const run = await runWorker({ code: OLD_CODE, classSource: MONSTER, world: randomWorld(), task: { check } })
    expect(run.end.type).toBe('done')
    expect(run.output.map((e) => e.text)).toEqual(['true true true'])
    expect(run.world!.items.every((item) => item.cls === 'Monster')).toBe(true)
    expect(run.verdict).toMatchObject({ ok: true })
  })

  it('runs new code with an old class', async () => {
    const run = await runWorker({ code: "head = new Monster({ value: 5, next: head })", classSource: OLD_CLASS, world: randomWorld() })
    expect(run.end.type).toBe('done')
    expect(run.world!.items[8].cls).toBe('Ting')
  })

  it('lets the code have a Ting of its own beside the Monster class', async () => {
    const run = await runWorker({
      code: "class Ting { constructor() { this.mine = true } }\nconsole.log(new Ting().mine, A instanceof Monster)",
      classSource: MONSTER,
      world: randomWorld(),
    })
    expect(run.end.type).toBe('done')
    expect(run.output.map((e) => e.text)).toEqual(['true true'])
  })

  it('places an error in an old class in the class editor', async () => {
    const run = await runWorker({ code: '', classSource: 'class Ting {\n  value = 0\n  constructor() { null.boom() }\n}', world: randomWorld() })
    expect(run.end).toMatchObject({ type: 'error', where: 'klasse' })
  })

  it('says so when the class editor has neither', async () => {
    const run = await runWorker({ code: '', classSource: 'class Thing {}', world: randomWorld() })
    expect(run.end).toMatchObject({ type: 'error', message: 'Fant ingen class Monster over monstrene.', where: 'klasse' })
  })
})
