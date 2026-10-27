/*
 * Java through the bridge: the code compiled with the class and the roots, run in the worker, its items mirrored
 * back, its methods called by a check, its errors placed on their lines.
 */
import { describe, expect, it } from 'vitest'
import { listWorld, colored, seeded, arrayWorld, things } from '../src/tasks/build'
import { runJava } from './java'

// A cold compile takes a couple of seconds, more while the other test files compile too.
const TIMEOUT = 120_000

const LIST = `class Monster {
    String color = "pink";
    Monster next;
}`

const VALUE_LIST = `class Monster {
    int value = 0;
    String color = "pink";
    Monster next;
}`

const world = () => listWorld(colored(seeded(3)))
const roots = [{ name: 'head', type: 'Monster' }]

describe('Java', () => {
  it('runs the code on the items and sends them back as it left them', async () => {
    const run = await runJava({
      classSource: LIST,
      code: `void main() {
    Monster prev = null;
    Monster node = head;
    while (node != null) {
        Monster next = node.next;
        node.next = prev;
        prev = node;
        node = next;
    }
    head = prev;
    IO.println("snudd");
}`,
      roots,
      items: 8,
      world: world(),
    })
    expect(run.end, JSON.stringify(run.compiled.diagnostics)).toMatchObject({ type: 'done' })
    expect(run.output.map((e) => e.text)).toEqual(['snudd'])
    const head = run.world!.roots.find((p) => p.key === 'head')
    expect(head?.ref).toBe(7)
    const order: number[] = []
    for (let slot = head?.ref; slot !== undefined; slot = run.world!.items[slot].props.find((p) => p.key === 'next')?.ref) order.push(slot)
    expect(order).toEqual([7, 6, 5, 4, 3, 2, 1, 0])
    expect(run.world!.items[0].cls).toBe('Monster')
    expect(run.world!.fields).toEqual(['color', 'next'])
  }, TIMEOUT)

  it('answers a check that calls the code', async () => {
    const run = await runJava({
      classSource: LIST,
      code: `int count(Monster head) {
    int n = 0;
    for (Monster node = head; node != null; node = node.next) n++;
    return n;
}

void main() {
    IO.println(count(head));
}`,
      roots,
      items: 8,
      world: world(),
      task: {
        check: String((t: any) => {
          const count = t.fn('count')
          for (const values of [[7], [3, 1, 4, 1, 5], [], [2, 7, 1, 8]]) {
            const got = count(t.list(values))
            if (got !== values.length) return `count gav ${t.show(got)} for ${values.length}.`
          }
          return true
        }),
        exports: ['count'],
      },
    })
    expect(run.output.map((e) => e.text)).toEqual(['8'])
    expect(run.verdict, JSON.stringify(run.verdict)).toMatchObject({ ok: true })
  }, TIMEOUT)

  it('writes back what a call did to its arguments, and returns the same items', async () => {
    const run = await runJava({
      classSource: VALUE_LIST,
      code: `void sortValues(List<Monster> row) {
    row.sort((a, b) -> a.value - b.value);
}

Monster biggest(List<Monster> row) {
    Monster best = row.get(0);
    for (Monster m : row) if (m.value > best.value) best = m;
    return best;
}`,
      roots: [{ name: 'items', type: 'List<Monster>' }],
      items: 6,
      world: arrayWorld(things(seeded(5), 6)),
      task: {
        check: String((t: any) => {
          const row = [5, 1, 4].map((value) => t.monster({ value }))
          const big = t.fn('biggest')(row)
          if (big !== row[0]) return `biggest gav ${t.show(big)}.`
          t.fn('sortValues')(row)
          if (row.map((m: any) => m.value).join() !== '1,4,5') return `sortValues gav ${row.map((m: any) => m.value)}.`
          return true
        }),
        exports: ['sortValues', 'biggest'],
      },
    })
    expect(run.verdict, JSON.stringify(run.verdict)).toMatchObject({ ok: true })
  }, TIMEOUT)

  it('places an exception, and a null, on their lines', async () => {
    const thrown = await runJava({
      classSource: LIST,
      code: `void main() {
    IO.println("før");
    throw new IllegalStateException("tomt");
}`,
      roots,
      items: 8,
      world: world(),
    })
    expect(thrown.end).toMatchObject({ type: 'error', name: 'IllegalStateException', message: 'tomt', line: 3, where: 'kode' })
    expect(thrown.output.map((e) => e.text)).toEqual(['før'])

    const npe = await runJava({
      classSource: LIST,
      code: `void main() {
    Monster m = head;
    while (true) {
        IO.println(m.next.color);
        m = m.next;
    }
}`,
      roots,
      items: 8,
      world: world(),
    })
    expect(npe.end).toMatchObject({ type: 'error', name: 'NullPointerException', line: 4, where: 'kode' })
    expect(npe.world).not.toBeNull()
  }, TIMEOUT)

  it('takes snapshots with vis()', async () => {
    const run = await runJava({
      classSource: LIST,
      code: `void main() {
    vis("start", head);
    head = head.next;
    vis("etter", head);
}`,
      roots,
      items: 8,
      world: world(),
    })
    expect(run.end).toMatchObject({ type: 'done' })
    expect(run.frames.map((f) => f.note)).toEqual(['start', 'etter'])
    expect(run.frames[0].marks).toEqual([0])
    expect(run.frames[1].roots[0].ref).toBe(1)
  }, TIMEOUT)
})
