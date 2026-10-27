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

  it('prints an item as the console prints one', async () => {
    const run = await runJava({ classSource: VALUE_LIST, code: 'void main() {\n    IO.println(head.next.next);\n}', roots, items: 3, world: listWorld(things(seeded(2), 3)) })
    expect(run.output[0].text).toMatch(/^Monster \{ value: \d+, color: '\w+', next: null \}$/)
  }, TIMEOUT)

  it('lets a check make the code\'s classes and call their methods', async () => {
    const run = await runJava({
      classSource: VALUE_LIST,
      code: `class MinStack {
    private final List<Monster> items = new ArrayList<>();
    void push(Monster m) { items.add(m); }
    Monster pop() { return items.remove(items.size() - 1); }
    Monster min() {
        Monster best = null;
        for (Monster m : items) if (best == null || m.value < best.value) best = m;
        return best;
    }
    int size() { return items.size(); }
}`,
      roots: [{ name: 'items', type: 'List<Monster>' }],
      items: 4,
      world: arrayWorld(things(seeded(5), 4)),
      task: {
        check: String((t: any) => {
          const MinStack = t.fn('MinStack')
          const s = new MinStack()
          if (!(s instanceof MinStack)) return 'not a MinStack'
          const [a, b, c] = [5, 2, 8].map((value) => t.monster({ value }))
          s.push(a); s.push(b); s.push(c)
          if (s.min() !== b) return `min gave ${t.show(s.min())}`
          if (s.size() !== 3) return `size gave ${s.size()}`
          if (s.pop() !== c) return 'pop gave the wrong one'
          return true
        }),
        exports: ['MinStack'],
      },
    })
    expect(run.verdict, JSON.stringify([run.verdict, run.end])).toMatchObject({ ok: true })
  }, TIMEOUT)

  it('sends back records, maps, grids and the task\'s own classes', async () => {
    const run = await runJava({
      classSource: VALUE_LIST,
      prelude: 'record Walks(List<Integer> pre, List<Integer> post) {}\nclass Ant {\n    int row;\n    int col;\n    String dir;\n}',
      code: `Walks walks() { return new Walks(List.of(1, 2), List.of(2, 1)); }
Map<String, Integer> tally(List<Monster> row) {
    Map<String, Integer> counts = new LinkedHashMap<>();
    for (Monster m : row) counts.merge(m.color, 1, Integer::sum);
    return counts;
}
void main() {
    grid[0][1] = "#";
    ant.col = ant.col + 1;
    word = word.toUpperCase();
    number = number * 2;
}`,
      roots: [{ name: 'grid', type: 'String[][]' }, { name: 'ant', type: 'Ant' }, { name: 'word', type: 'String' }, { name: 'number', type: 'int' }],
      items: 0,
      world: { items: [], roots: [
        { key: 'grid', raw: [['.', '.'], ['.', '.']], text: '' },
        { key: 'ant', raw: { row: 1, col: 0, dir: 'up' }, text: '' },
        { key: 'word', raw: 'hei', text: '' },
        { key: 'number', raw: 21, text: '' },
      ] },
      task: {
        check: String((t: any) => {
          if (t.grid[0][1] !== '#' || t.grid[0][0] !== '.') return `grid: ${JSON.stringify(t.grid)}`
          if (t.ant.col !== 1 || t.ant.dir !== 'up') return `ant: ${JSON.stringify(t.ant)}`
          if (t.word !== 'HEI' || t.number !== 42) return `word ${t.word}, number ${t.number}`
          const w = t.fn('walks')()
          if (!t.same(w, { pre: [1, 2], post: [2, 1] })) return `walks: ${t.show(w)}`
          const counts = t.fn('tally')(['pink', 'cyan', 'pink'].map((color) => t.monster({ color })))
          if (!(counts instanceof Map) || !t.same(counts, new Map([['pink', 2], ['cyan', 1]]))) return `tally: ${t.show(counts)}`
          return true
        }),
        exports: ['walks', 'tally'],
      },
    })
    expect(run.verdict, JSON.stringify([run.verdict, run.end, run.compiled.diagnostics])).toMatchObject({ ok: true })
  }, TIMEOUT)

  it('mirrors a subclass of Monster as itself, with its methods and the class\'s statics', async () => {
    const run = await runJava({
      classSource: `class Monster {
    int value = 0;
    String color = "pink";
    Monster next;
    String describe() { return color + " " + value; }
    static int compare(Monster a, Monster b) { return a.value - b.value; }
}`,
      code: `class Cat extends Monster {
    int lives = 9;
    String describe() { return "katt med " + lives + " liv"; }
}
void main() {
    Cat c = new Cat();
    c.next = head;
    head = c;
}`,
      roots,
      items: 3,
      world: listWorld(things(seeded(2), 3)),
      task: {
        check: String((t: any) => {
          if (t.head.constructor.name !== 'Cat' || !(t.head instanceof t.Monster)) return `head is ${t.head.constructor.name}`
          if (t.head.describe() !== 'katt med 9 liv') return `describe: ${t.head.describe()}`
          if (t.slots[0].describe() !== `${t.slots[0].color} ${t.slots[0].value}`) return `slot describe: ${t.slots[0].describe()}`
          const [a, b] = [3, 7].map((value) => t.monster({ value }))
          if (t.Monster.compare(a, b) !== -4) return `compare: ${t.Monster.compare(a, b)}`
          return true
        }),
      },
    })
    expect(run.verdict, JSON.stringify([run.verdict, run.end, run.compiled.diagnostics])).toMatchObject({ ok: true })
    expect(run.world!.items.at(-1)!.cls).toBe('Cat')
  }, TIMEOUT)

  it('hands the code the check\'s functions, as the interface each parameter asks for', async () => {
    const run = await runJava({
      classSource: VALUE_LIST,
      prelude: 'interface Swap {\n    void swap(int i, int j);\n}',
      code: `void bubble(List<Monster> items, BiConsumer<Integer, Integer> swap) {
    for (int end = items.size() - 1; end > 0; end--)
        for (int i = 0; i < end; i++)
            if (items.get(i).value > items.get(i + 1).value) swap.accept(i, i + 1);
}
void bubble2(List<Monster> items, Swap s) {
    for (int end = items.size() - 1; end > 0; end--)
        for (int i = 0; i < end; i++)
            if (items.get(i).value > items.get(i + 1).value) s.swap(i, i + 1);
}
List<Monster> sorted(List<Monster> items, Comparator<Monster> by) {
    List<Monster> copy = new ArrayList<>(items);
    copy.sort(by);
    return copy;
}`,
      roots: [{ name: 'items', type: 'List<Monster>' }],
      items: 4,
      world: arrayWorld(things(seeded(5), 4)),
      task: {
        check: String((t: any) => {
          for (const name of ['bubble', 'bubble2']) {
            const row = [4, 1, 3, 2].map((value) => t.monster({ value }))
            let swaps = 0
            const swap = (i: number, j: number) => {
              swaps++
              ;[row[i], row[j]] = [row[j], row[i]]
            }
            t.fn(name)(row, swap)
            if (row.map((m: any) => m.value).join() !== '1,2,3,4') return `${name}: ${row.map((m: any) => m.value)}`
            if (swaps !== 4) return `${name}: ${swaps} swaps`
          }
          const row = [2, 3, 1].map((value) => t.monster({ value }))
          const by = t.fn('sorted')(row, (a: any, b: any) => b.value - a.value)
          if (by.map((m: any) => m.value).join() !== '3,2,1' || by[0] !== row[1]) return `sorted: ${by.map((m: any) => m.value)}`
          // A function that throws stops the code, as in JavaScript (where the call wraps it as the code's error).
          let stopped = false
          try {
            t.fn('bubble')([3, 1].map((value) => t.monster({ value })), () => { stopped = true; throw new Error('stopp') })
            return 'the error got lost'
          } catch {
            if (!stopped) return 'the function was never called'
          }
          return true
        }),
        exports: ['bubble', 'bubble2', 'sorted'],
      },
    })
    expect(run.verdict, JSON.stringify([run.verdict, run.end, run.compiled.diagnostics])).toMatchObject({ ok: true })
  }, TIMEOUT)

  it('calls a method on a monster the check made, and copes with a class of its own type parameters', async () => {
    const run = await runJava({
      classSource: `class Monster {
    int value = 0;
    Monster next;
    int twice() { return value * 2; }
}`,
      code: `class Box<T> {
    T item;
    T get() { return item; }
    void put(T x) { item = x; }
}`,
      roots,
      items: 2,
      world: listWorld(things(seeded(2), 2)),
      task: {
        check: String((t: any) => {
          if (t.monster({ value: 21 }).twice() !== 42) return 'twice on a new monster'
          const Box = t.fn('Box')
          const box = new Box()
          box.put(t.slots[0])
          if (box.get() !== t.slots[0]) return 'the box lost its item'
          return true
        }),
        exports: ['Box'],
      },
    })
    expect(run.verdict, JSON.stringify([run.verdict, run.end, run.compiled.diagnostics])).toMatchObject({ ok: true })
  }, TIMEOUT)

  it('says when the code calls an export it has yet to write', async () => {
    const run = await runJava({ classSource: LIST, code: 'void main() {\n    IO.println(count(head));\n}', roots, items: 8, world: world(), task: { check: '(t) => true', exports: ['count'] } })
    expect(run.compiled.ok).toBe(false)
    expect(run.compiled.diagnostics[0].message).toMatch(/count/)
  }, TIMEOUT)
})
