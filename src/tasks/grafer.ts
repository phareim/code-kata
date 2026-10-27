import { at, colored, graphWorld, int, makeWorld, pick, shuffled, things, type Random, type Spec } from './build'
import { COLOR_GRAPH_MONSTER, GRAPH_MONSTER } from './classes'
import type { Task } from './types'
import type { World } from '../world/world'

/** A graph as adjacency lists: connected, edges both ways, like graphWorld makes. */
function connected(random: Random, n: number, extra: number): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => [])
  const link = (a: number, b: number): boolean => {
    if (a === b || adj[a].includes(b)) return false
    adj[a].push(b)
    adj[b].push(a)
    return true
  }
  const order = shuffled(random, [...Array(n).keys()])
  for (let k = 1; k < n; k++) link(order[k], order[int(random, 0, k - 1)])
  let edges = n - 1
  for (let tries = 0; edges < n - 1 + extra && tries < 200; tries++) {
    if (link(int(random, 0, n - 1), int(random, 0, n - 1))) edges++
  }
  return adj
}

/** The world of items whose neighbors are these slot lists (an arrow from a to each slot in adj[a]); `nodes` holds all of them. */
function graphOf(items: Spec[], adj: number[][], roots: Record<string, unknown> = {}): World {
  const nodes = items.map((spec, i) => ({ ...spec, neighbors: [...adj[i]].sort((a, b) => a - b).map(at) }))
  return makeWorld(nodes, { nodes: nodes.map((_, i) => at(i)), ...roots })
}

/** Separate groups, each connected, in one `nodes`: the sizes say how many items go in each, spread over random slots. */
function groupsOf(random: Random, items: Spec[], sizes: number[]): World {
  const adj: number[][] = items.map(() => [])
  const slots = shuffled(random, items.map((_, i) => i))
  const link = (a: number, b: number) => {
    if (a === b || adj[a].includes(b)) return
    adj[a].push(b)
    adj[b].push(a)
  }
  let offset = 0
  for (const size of sizes) {
    const group = slots.slice(offset, offset + size)
    offset += size
    for (let k = 1; k < group.length; k++) link(group[k], group[int(random, 0, k - 1)])
    if (group.length >= 4) link(pick(random, group), pick(random, group))
  }
  return graphOf(items, adj)
}

/**
 * Arrows only: item a lists in neighbors what comes after it. Every arrow goes from an earlier to a later item in a
 * random order (so there is no ring); with `ring` one more arrow closes a loop back to the start of a chain.
 * The slot order is never a valid order itself.
 */
function arrowsOf(random: Random, items: Spec[], extra: number, ring: boolean): World {
  const n = items.length
  let out: number[][] = []
  for (let attempt = 0; attempt < 20; attempt++) {
    const order = shuffled(random, [...Array(n).keys()])
    out = items.map(() => [])
    for (let k = 1; k < n; k++) out[order[int(random, 0, k - 1)]].push(order[k])
    for (let e = 0; e < extra; e++) {
      const i = int(random, 0, n - 2)
      const j = int(random, i + 1, n - 1)
      if (!out[order[i]].includes(order[j])) out[order[i]].push(order[j])
    }
    if (out.some((list, i) => list.some((j) => j < i))) break
  }
  if (ring) {
    // Follow a few arrows from some item; closing the last one back to the first makes a loop of three or more.
    for (let tries = 0; tries < 40; tries++) {
      const path = [int(random, 0, n - 1)]
      while (path.length < 4 && out[path[path.length - 1]].length) path.push(pick(random, out[path[path.length - 1]]))
      if (path.length >= 3 && !out[path[path.length - 1]].includes(path[0])) {
        out[path[path.length - 1]].push(path[0])
        break
      }
    }
  }
  return graphOf(items, out)
}

export const tasks: Task[] = [
  {
    id: 'steg-fra-a',
    title: 'Hvor mange steg unna?',
    level: 'middels',
    topic: 'grafer',
    text: `Monstrene i \`nodes\` er venner, og vennene til hvert monster står i \`neighbors\`. A vil vite hvor langt unna de andre er.

Gi hvert monster et felt \`steps\`: hvor mange vennskap det er fra A til det, den korteste veien. A selv har \`steps = 0\`.

Gå bredden først: A, så alle vennene til A, så vennene deres, og så videre.`,
    hints: [
      'Bruk en kø: start med `A.steps = 0` og `const queue = [A]`.',
      'Ta det første ut av køen. For hver venn som ikke har `steps` ennå: sett `steps` én høyere, og still vennen bakerst i køen.',
      'Gi gjerne monstrene farge etter avstanden, for eksempel `node.color = [\'pink\', \'cyan\', \'gold\', \'lime\'][node.steps]`, så ser du lagene.',
    ],
    world: (r) => graphWorld(r, colored(r, 8), 3),
    monster: COLOR_GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `A.steps = 0
const queue = [A]
while (queue.length) {
  const node = queue.shift()
  // Gi vennene til node steps, og still dem i køen
}
`,
    solution: `const colors = ['pink', 'cyan', 'gold', 'lime', 'violet', 'orange', 'red', 'teal']
A.steps = 0
const queue = [A]
while (queue.length) {
  const node = queue.shift()
  node.color = colors[node.steps]
  vis(node)
  for (const friend of node.neighbors) {
    if (friend.steps === undefined) {
      friend.steps = node.steps + 1
      queue.push(friend)
    }
  }
}
`,
    java: {
      // A field can't be added to an item on the fly in Java, so the class has it from the start.
      monster: `// Legg til eller ta bort et felt og trykk «Bruk».
class Monster {
    String color = "pink";
    List<Monster> neighbors = new ArrayList<>();
    int steps = -1;
}`,
      text: `Monstrene i \`nodes\` er venner, og vennene til hvert monster står i \`neighbors\`. A vil vite hvor langt unna de andre er.

Klassen har et felt \`steps\` som er -1 til monsteret er nådd. Sett det til hvor mange vennskap det er fra A til monsteret, den korteste veien. A selv skal ha \`steps = 0\`.

Gå bredden først: A, så alle vennene til A, så vennene deres, og så videre.`,
      hints: [
        'Bruk en kø: start med `A.steps = 0` og `Queue<Monster> queue = new ArrayDeque<>()`, og still A i den med `queue.add(A)`.',
        'Ta det første ut av køen med `queue.poll()`. For hver venn som fortsatt har `steps == -1`: sett `steps` én høyere, og still vennen bakerst i køen.',
        'Gi gjerne monstrene farge etter avstanden, for eksempel med `String[] colors = { "pink", "cyan", "gold", "lime" }` og `node.color = colors[node.steps]`, så ser du lagene.',
      ],
      scaffold: `void main() {
    A.steps = 0;
    Queue<Monster> queue = new ArrayDeque<>();
    queue.add(A);
    while (!queue.isEmpty()) {
        Monster node = queue.poll();
        // Gi vennene til node steps, og still dem i køen
    }
}
`,
      solution: `void main() {
    String[] colors = { "pink", "cyan", "gold", "lime", "violet", "orange", "red", "teal" };
    A.steps = 0;
    Queue<Monster> queue = new ArrayDeque<>();
    queue.add(A);
    while (!queue.isEmpty()) {
        Monster node = queue.poll();
        node.color = colors[node.steps];
        vis(node);
        for (Monster friend : node.neighbors) {
            if (friend.steps == -1) {
                friend.steps = node.steps + 1;
                queue.add(friend);
            }
        }
    }
}
`,
    },
    check: (t) => {
      const start = t.slots[0]
      const dist = new Map([[start, 0]])
      const queue = [start]
      while (queue.length) {
        const node = queue.shift()!
        for (const friend of node.neighbors ?? []) {
          if (!dist.has(friend)) {
            dist.set(friend, dist.get(node)! + 1)
            queue.push(friend)
          }
        }
      }
      for (const [node, want] of dist) {
        if (node.steps !== want) return `${t.show(node)} har steps ${t.show(node.steps)}, men det er ${want} steg fra A.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Breadth-first_search',
  },
  {
    id: 'den-mest-populaere',
    title: 'Det mest populære',
    level: 'lett',
    topic: 'grafer',
    text: `Monstrene i \`nodes\` er venner, og vennene til hvert monster står i \`neighbors\`. Hvem er mest populær?

Skriv \`function popular(nodes)\` som gir tilbake monsteret med flest venner. Er det likt mellom flere, vinner det som står først i \`nodes\`. En tom \`nodes\` gir \`null\`.`,
    hints: [
      'Antall venner er `node.neighbors.length`. Hold orden på det beste du har sett så langt.',
      'Start med `nodes[0]` som det beste, og gå gjennom resten. Bytt bare når et monster har flere venner enn det beste: da vinner det første når det er likt.',
      'Husk å gi `null` først hvis `nodes` er tom, ellers finnes det ingen `nodes[0]`.',
    ],
    world: (r) => graphWorld(r, things(r, 8), 3),
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function popular(nodes) {
  if (nodes.length === 0) return null
  let best = nodes[0]
  // Gå gjennom resten: har noen flere venner enn best?
  return best
}

console.log(popular(nodes).value)
`,
    solution: `function popular(nodes) {
  if (nodes.length === 0) return null
  let best = nodes[0]
  for (const node of nodes) {
    vis(node, best)
    if (node.neighbors.length > best.neighbors.length) best = node
  }
  return best
}

console.log(popular(nodes).value)
`,
    exports: ['popular'],
    java: {
      code: {
        'function popular(nodes)': 'Monster popular(List<Monster> nodes)',
        'node.neighbors.length': 'node.neighbors.size()',
        'nodes[0]': 'nodes.get(0)',
      },
      scaffold: `Monster popular(List<Monster> nodes) {
    if (nodes.isEmpty()) return null;
    Monster best = nodes.get(0);
    // Gå gjennom resten: har noen flere venner enn best?
    return best;
}

void main() {
    IO.println(popular(nodes).value);
}
`,
      solution: `Monster popular(List<Monster> nodes) {
    if (nodes.isEmpty()) return null;
    Monster best = nodes.get(0);
    for (Monster node : nodes) {
        vis(node, best);
        if (node.neighbors.size() > best.neighbors.size()) best = node;
    }
    return best;
}

void main() {
    IO.println(popular(nodes).value);
}
`,
    },
    check: (t) => {
      const popular = t.fn('popular')
      const make = (n: number, edges: number[][]): any[] => {
        const list: any[] = Array.from({ length: n }, (_, i) => t.monster({ value: i, neighbors: [] }))
        for (const [a, b] of edges) {
          list[a].neighbors.push(list[b])
          list[b].neighbors.push(list[a])
        }
        return list
      }
      const first = (list: any[]) => {
        let best: any = null
        for (const node of list) if (!best || node.neighbors.length > best.neighbors.length) best = node
        return best
      }
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      const graphs: any[][] = [
        make(5, [[3, 0], [3, 1], [3, 2], [3, 4]]),
        make(4, [[0, 1], [1, 2], [2, 3]]),
        make(4, [[0, 1], [1, 2], [2, 3], [3, 0]]),
        make(5, [[0, 1], [2, 3], [4, 2], [1, 2]]),
        make(1, []),
        make(3, []),
        t.nodes,
      ]
      for (const list of graphs) {
        const want = first(list)
        const got = popular(list)
        if (got !== want) return `For ${list === t.nodes ? 'monstrene på scenen' : `${list.length} monstre`} ga popular ${name(got)}, men det med flest venner (først i nodes ved likt) er ${name(want)}.`
      }
      if (popular([]) !== null) return 'popular([]) skal gi null.'
      return true
    },
  },
  {
    id: 'er-vi-venner',
    title: 'Er vi venner?',
    level: 'lett',
    topic: 'grafer',
    text: `Hvert monster har en liste \`neighbors\` med dem det regner som venner. Men et vennskap går ikke alltid begge veier: A kan ha B i lista si uten at B har A i sin. På scenen vises slike som piler.

Skriv \`function friends(a, b)\` som gir \`true\` bare når de er venner begge veier: \`b\` står i \`a.neighbors\`, og \`a\` står i \`b.neighbors\`. Ellers gir den \`false\`. Sjekken prøver også vennskap som bare går én vei.`,
    hints: [
      'Lister har `includes`: `a.neighbors.includes(b)` er `true` når `b` står der.',
      'Du må sjekke begge veier, og begge må stemme. Sett de to testene sammen med `&&`.',
      '`return a.neighbors.includes(b) && b.neighbors.includes(a)` er hele svaret.',
    ],
    world: (r) => {
      const adj = connected(r, 8, 3)
      // A few of the friendships go one way only
      for (let k = 0; k < 3; k++) {
        const a = int(r, 0, 7)
        if (adj[a].length > 1) {
          const drop = pick(r, adj[a])
          adj[a] = adj[a].filter((b) => b !== drop)
        }
      }
      return graphOf(things(r, 8), adj)
    },
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function friends(a, b) {
  // Står b hos a, og a hos b?
  return a.neighbors.includes(b)
}

console.log(friends(A, B))
`,
    solution: `function friends(a, b) {
  vis(a, b)
  return a.neighbors.includes(b) && b.neighbors.includes(a)
}

console.log(friends(A, B))
`,
    exports: ['friends'],
    java: {
      code: {
        'function friends(a, b)': 'boolean friends(Monster a, Monster b)',
        includes: 'contains',
        'a.neighbors.includes(b)': 'a.neighbors.contains(b)',
        'return a.neighbors.includes(b) && b.neighbors.includes(a)': 'return a.neighbors.contains(b) && b.neighbors.contains(a)',
      },
      scaffold: `boolean friends(Monster a, Monster b) {
    // Står b hos a, og a hos b?
    return a.neighbors.contains(b);
}

void main() {
    IO.println(friends(A, B));
}
`,
      solution: `boolean friends(Monster a, Monster b) {
    vis(a, b);
    return a.neighbors.contains(b) && b.neighbors.contains(a);
}

void main() {
    IO.println(friends(A, B));
}
`,
    },
    check: (t) => {
      const friends = t.fn('friends')
      const make = (n: number): any[] => Array.from({ length: n }, (_, i) => t.monster({ value: i, neighbors: [] }))
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      const [x, y, z, w] = make(4)
      x.neighbors.push(y, z)
      y.neighbors.push(x)
      z.neighbors.push(w)
      const pairs: [any, any][] = [[x, y], [y, x], [x, z], [z, x], [y, z], [z, w], [w, z], [x, w]]
      for (const [a, b] of pairs) {
        const want = a.neighbors.includes(b) && b.neighbors.includes(a)
        const got = friends(a, b)
        if (got !== want) {
          const how = want ? 'er venner begge veier' : a.neighbors.includes(b) || b.neighbors.includes(a) ? 'er bare venner den ene veien' : 'er ikke venner'
          return `friends(${name(a)}, ${name(b)}) gav ${t.show(got)}, men de ${how}.`
        }
      }
      const slots: any[] = t.slots
      for (const a of slots) {
        for (const b of slots) {
          const want = a.neighbors.includes(b) && b.neighbors.includes(a)
          const got = friends(a, b)
          if (got !== want) return `friends(${t.show(a)}, ${t.show(b)}) gav ${t.show(got)}, men det skal være ${t.show(want)}.`
        }
      }
      return true
    },
  },
  {
    id: 'bli-kjent',
    title: 'Bli kjent',
    level: 'lett',
    topic: 'grafer',
    text: `To av monstrene, \`a\` og \`b\`, kjenner ikke hverandre ennå. De står som flagg på scenen. Vennene til hvert monster står i \`neighbors\`.

Skriv \`function befriend(x, y)\` som gjør \`x\` og \`y\` til venner begge veier: \`y\` kommer inn i \`x.neighbors\`, og \`x\` i \`y.neighbors\`. Står ett av dem der fra før, skal ingen komme to ganger. Å kalle funksjonen to ganger skal ikke endre noe.

Kall den på \`a\` og \`b\`. Alt annet i grafen skal være som før.`,
    hints: [
      'Legg `y` til hos `x` med `push`, og `x` til hos `y`. Det er to linjer.',
      'Vær forsiktig så ingen kommer to ganger: `if (!x.neighbors.includes(y)) x.neighbors.push(y)`. Gjør det for hver retning for seg.',
      'Husk å kalle funksjonen til slutt: `befriend(a, b)`.',
    ],
    world: (r) => {
      const adj = connected(r, 8, 3)
      const free: number[][] = []
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (!adj[i].includes(j)) free.push([i, j])
      const [i, j] = pick(r, free)
      const [first, second] = r() < 0.5 ? [i, j] : [j, i]
      return graphOf(things(r, 8), adj, { a: at(first), b: at(second) })
    },
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph', a: 'pointer', b: 'pointer' },
    scaffold: `function befriend(x, y) {
  // Legg y hos x og x hos y, men ikke hvis de står der fra før
}

befriend(a, b)
`,
    solution: `function befriend(x, y) {
  if (!x.neighbors.includes(y)) x.neighbors.push(y)
  if (!y.neighbors.includes(x)) y.neighbors.push(x)
  vis(x, y)
}

vis(a, b)
befriend(a, b)
`,
    exports: ['befriend'],
    java: {
      text: `To av monstrene, \`a\` og \`b\`, kjenner ikke hverandre ennå. De står som flagg på scenen. Vennene til hvert monster står i \`neighbors\`.

Skriv \`void befriend(Monster x, Monster y)\` som gjør \`x\` og \`y\` til venner begge veier: \`y\` kommer inn i \`x.neighbors\`, og \`x\` i \`y.neighbors\`. Står ett av dem der fra før, skal ingen komme to ganger. Å kalle metoden to ganger skal ikke endre noe.

Kall den på \`a\` og \`b\`. Alt annet i grafen skal være som før.`,
      hints: [
        'Legg `y` til hos `x` med `add`, og `x` til hos `y`. Det er to linjer.',
        'Vær forsiktig så ingen kommer to ganger: `if (!x.neighbors.contains(y)) x.neighbors.add(y)`. Gjør det for hver retning for seg.',
        'Husk å kalle metoden til slutt, i `main`: `befriend(a, b)`.',
      ],
      // Spelled out: javaRunCode would take the indented call to befriend for its declaration.
      opening: `void main() {
    befriend(a, b);
}`,
      scaffold: `void befriend(Monster x, Monster y) {
    // Legg y hos x og x hos y, men ikke hvis de står der fra før
}

void main() {
    befriend(a, b);
}
`,
      solution: `void befriend(Monster x, Monster y) {
    if (!x.neighbors.contains(y)) x.neighbors.add(y);
    if (!y.neighbors.contains(x)) y.neighbors.add(x);
    vis(x, y);
}

void main() {
    vis(a, b);
    befriend(a, b);
}
`,
    },
    check: (t) => {
      const befriend = t.fn('befriend')
      const make = (n: number): any[] => Array.from({ length: n }, (_, i) => t.monster({ value: i, neighbors: [] }))
      const same = (p: any[], q: any[]) => p.length === q.length && p.every((item, i) => item === q[i])
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      // Fresh items: nothing before, a one-way link, a link that was there, and a call twice.
      const [p, q, r, s, u] = make(5)
      p.neighbors.push(r)
      befriend(p, q)
      if (!same(p.neighbors, [r, q]) || !same(q.neighbors, [p])) return `befriend(x, y) skal legge y hos x og x hos y. Her ble x.neighbors [${p.neighbors.map(name).join(', ')}] og y.neighbors [${q.neighbors.map(name).join(', ')}].`
      befriend(p, q)
      befriend(q, p)
      if (!same(p.neighbors, [r, q]) || !same(q.neighbors, [p])) return 'Å kalle befriend flere ganger skal ikke endre noe: ingen skal stå to ganger i lista.'
      s.neighbors.push(u)
      befriend(s, u)
      if (!same(s.neighbors, [u]) || !same(u.neighbors, [s])) return 'Når x allerede har y (men ikke omvendt), skal y få x, og x skal fortsatt ha y bare én gang.'
      // The stage: a and b are friends both ways, everything else as it was.
      const a = t.live(t.start.a)!
      const b = t.live(t.start.b)!
      const slots: any[] = t.slots
      const starts: any[] = t.start.slots
      for (let i = 0; i < slots.length; i++) {
        const node = slots[i]
        const old = starts[i].neighbors.map((c: any) => t.live(c))
        const want = node === a ? [...old, b] : node === b ? [...old, a] : old
        if (!Array.isArray(node.neighbors) || !same(node.neighbors, want)) {
          if (node === a || node === b) {
            const other = node === a ? b : a
            const n = node.neighbors.filter((x: any) => x === other).length
            if (n === 0) return `${t.show(node)} har ikke ${t.show(other)} som venn ennå.`
            if (n > 1) return `${t.show(other)} står ${n} ganger hos ${t.show(node)}.`
          }
          return `${t.show(node)} har fått en annen venneliste enn det skulle: ${t.show(node.neighbors)}, men den skal være ${t.show(want)}.`
        }
      }
      return true
    },
  },
  {
    id: 'forlat-gjengen',
    title: 'Forlat gjengen',
    level: 'lett',
    topic: 'grafer',
    text: `Monsteret \`gone\` vil ikke være med i gjengen lenger. Det står som flagg på scenen. Vennene til hvert monster står i \`neighbors\`, og alle monstrene står i \`nodes\`.

Ta \`gone\` bort fra \`nodes\` og fra alles \`neighbors\`, og tøm \`gone.neighbors\` så det ikke holder fast i noen. De andre skal ellers være som før, med vennene i samme rekkefølge.`,
    hints: [
      'Gå gjennom alle monstrene i `nodes`. `filter` gir en ny liste uten et bestemt monster.',
      'For hver `node`: `node.neighbors = node.neighbors.filter((friend) => friend !== gone)`.',
      'Gjør `nodes` til en ny liste uten `gone` på samme måte, og sett til slutt `gone.neighbors = []`.',
    ],
    world: (r) => graphWorld(r, colored(r, 8), 3, { gone: at(int(r, 0, 7)) }),
    monster: COLOR_GRAPH_MONSTER,
    views: { nodes: 'graph', gone: 'pointer' },
    scaffold: `for (const node of nodes) {
  // Ta gone ut av node.neighbors
}
// Ta gone ut av nodes, og tøm gone.neighbors
`,
    solution: `for (const node of nodes) {
  node.neighbors = node.neighbors.filter((friend) => friend !== gone)
  vis(node, gone)
}
nodes = nodes.filter((node) => node !== gone)
gone.neighbors = []
vis('borte')
`,
    java: {
      hints: [
        'Gå gjennom alle monstrene i `nodes`. `remove(gone)` tar `gone` ut av en liste, og gjør ingenting hvis det ikke står der.',
        'For hver `node`: `node.neighbors.remove(gone)`.',
        'Ta `gone` ut av `nodes` på samme måte, men etter løkka: en liste kan ikke endres mens en `for`-løkke går gjennom den. Tøm til slutt `gone.neighbors` med `clear()`.',
      ],
      scaffold: `void main() {
    for (Monster node : nodes) {
        // Ta gone ut av node.neighbors
    }
    // Ta gone ut av nodes, og tøm gone.neighbors
}
`,
      solution: `void main() {
    for (Monster node : nodes) {
        node.neighbors.remove(gone);
        vis(node, gone);
    }
    nodes.remove(gone);
    gone.neighbors.clear();
    vis("borte");
}
`,
    },
    check: (t) => {
      const gone = t.live(t.start.gone)!
      const same = (p: any[], q: any[]) => p.length === q.length && p.every((item, i) => item === q[i])
      const rest = t.before('nodes').filter((n) => n !== gone)
      const starts: any[] = t.start.slots
      if (!Array.isArray(t.nodes)) return '`nodes` skal fortsatt være en liste med monstrene.'
      if (t.nodes.includes(gone)) return `${t.show(gone)} står fortsatt i nodes.`
      if (!same(t.nodes, rest)) return '`nodes` skal ha alle de andre monstrene, i samme rekkefølge som før.'
      if (!Array.isArray(gone.neighbors) || gone.neighbors.length) return `${t.show(gone)} skal ikke ha noen venner igjen, men har ${t.show(gone.neighbors)}.`
      for (const node of rest as any[]) {
        const old = starts[t.slots.indexOf(node)].neighbors.map((c: any) => t.live(c)).filter((c: any) => c !== gone)
        if (!Array.isArray(node.neighbors) || !same(node.neighbors, old)) {
          return node.neighbors.includes(gone)
            ? `${t.show(node)} har fortsatt ${t.show(gone)} som venn.`
            : `${t.show(node)} skal ha vennene ${t.show(old)}, men har ${t.show(node.neighbors)}.`
        }
      }
      return true
    },
  },
  {
    id: 'dybden-forst',
    title: 'Dybden først',
    level: 'middels',
    topic: 'grafer',
    text: `Skriv \`function dfs(start)\` som gir tilbake en array med monstrene i den rekkefølgen en rekursiv dybde-først-leting besøker dem. Fra \`start\` går du til første venn i \`neighbors\`, derfra videre til den første av vennens venner som ikke er besøkt, og så langt det går. Sitter du fast, går du et skritt tilbake og prøver neste venn. Hvert monster kommer med bare én gang.

Vennene prøves i den rekkefølgen de står i \`neighbors\`. Sjekken sammenligner med den nøyaktige rekkefølgen, så svaret må bli det samme som med rekursjon.`,
    hints: [
      'Hold orden på de besøkte i et `Set`, og på rekkefølgen i en array du fyller på.',
      'Lag en hjelpefunksjon `visit(node)` som legger `node` i settet og i arrayen, og så kaller `visit(friend)` for hver venn som ikke er besøkt.',
      'Sjekk `seen.has(friend)` rett før du går til en venn, ikke bare før løkka: vennen kan ha blitt besøkt mens du var på vei dypere.',
    ],
    world: (r) => graphWorld(r, things(r, 8), 3),
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function dfs(start) {
  const seen = new Set()
  const order = []
  // Besøk start, og så vennene til start én etter én, dypt først
  return order
}

console.log(dfs(A).map((node) => node.value))
`,
    solution: `function dfs(start) {
  const seen = new Set()
  const order = []

  function visit(node) {
    seen.add(node)
    order.push(node)
    vis(node)
    for (const friend of node.neighbors) {
      if (!seen.has(friend)) visit(friend)
    }
  }

  visit(start)
  return order
}

console.log(dfs(A).map((node) => node.value))
`,
    exports: ['dfs'],
    java: {
      text: `Skriv \`List<Monster> dfs(Monster start)\` som gir tilbake en liste med monstrene i den rekkefølgen en rekursiv dybde-først-leting besøker dem. Fra \`start\` går du til første venn i \`neighbors\`, derfra videre til den første av vennens venner som ikke er besøkt, og så langt det går. Sitter du fast, går du et skritt tilbake og prøver neste venn. Hvert monster kommer med bare én gang.

Vennene prøves i den rekkefølgen de står i \`neighbors\`. Sjekken sammenligner med den nøyaktige rekkefølgen, så svaret må bli det samme som med rekursjon.`,
      hints: [
        'Hold orden på de besøkte i et `Set<Monster>`, og på rekkefølgen i en `List<Monster>` du fyller på.',
        'Lag en hjelpemetode `void visit(Monster node, Set<Monster> seen, List<Monster> order)` som legger `node` i settet og i lista, og så kaller `visit` for hver venn som ikke er besøkt.',
        'Sjekk `seen.contains(friend)` rett før du går til en venn, ikke bare før løkka: vennen kan ha blitt besøkt mens du var på vei dypere.',
      ],
      scaffold: `List<Monster> dfs(Monster start) {
    Set<Monster> seen = new HashSet<>();
    List<Monster> order = new ArrayList<>();
    // Besøk start, og så vennene til start én etter én, dypt først
    return order;
}

void main() {
    IO.println(dfs(A).stream().map(node -> node.value).toList());
}
`,
      solution: `List<Monster> dfs(Monster start) {
    Set<Monster> seen = new HashSet<>();
    List<Monster> order = new ArrayList<>();
    visit(start, seen, order);
    return order;
}

void visit(Monster node, Set<Monster> seen, List<Monster> order) {
    seen.add(node);
    order.add(node);
    vis(node);
    for (Monster friend : node.neighbors) {
        if (!seen.contains(friend)) visit(friend, seen, order);
    }
}

void main() {
    IO.println(dfs(A).stream().map(node -> node.value).toList());
}
`,
    },
    check: (t) => {
      const dfs = t.fn('dfs')
      const make = (n: number, edges: number[][]): any[] => {
        const list: any[] = Array.from({ length: n }, (_, i) => t.monster({ value: i, neighbors: [] }))
        for (const [a, b] of edges) {
          list[a].neighbors.push(list[b])
          list[b].neighbors.push(list[a])
        }
        return list
      }
      const want = (start: any): any[] => {
        const seen = new Set<any>()
        const order: any[] = []
        const visit = (node: any) => {
          seen.add(node)
          order.push(node)
          for (const friend of node.neighbors) if (!seen.has(friend)) visit(friend)
        }
        visit(start)
        return order
      }
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? String(n.value) : t.show(n))
      const small = make(6, [[0, 2], [0, 1], [1, 3], [2, 3], [3, 4], [2, 5]])
      const ring = make(5, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]])
      const parts = make(5, [[0, 1], [2, 3], [3, 4]])
      const cases: [any, string][] = [
        [small[0], 'et lite nett'],
        [small[4], 'et lite nett'],
        [ring[0], 'en ring'],
        [ring[2], 'en ring'],
        [parts[2], 'to adskilte grupper'],
        [make(1, [])[0], 'ett monster'],
        [t.slots[0], 'monstrene på scenen'],
        [t.slots[3], 'monstrene på scenen'],
      ]
      for (const [start, what] of cases) {
        const right = want(start)
        const got = dfs(start)
        if (!Array.isArray(got)) return `dfs skal gi en array med monstrene, men gav ${t.show(got)}.`
        if (got.length !== right.length || got.some((node, i) => node !== right[i])) {
          return `For ${what}, fra ${name(start)}, gav dfs [${got.map(name).join(', ')}], men rekursiv dybde først går [${right.map(name).join(', ')}].`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Depth-first_search',
  },
  {
    id: 'korteste-vei',
    title: 'Korteste vei',
    level: 'middels',
    topic: 'grafer',
    text: `Hvert steg går fra et monster til en av vennene i \`neighbors\`. Skriv \`function route(a, b)\` som gir tilbake en array med monstrene på veien fra \`a\` til \`b\` (begge er med), med så få steg som mulig. Er \`a\` og \`b\` samme monster, er veien bare \`[a]\`. Finnes det ingen vei, gir den \`null\`.

Gå bredden først og husk for hvert monster hvem du kom fra. Når du er framme, går du baklengs fra \`b\` og snur rekkefølgen.`,
    hints: [
      'Gå bredden først med en kø, som i «Hvor mange steg unna?». Lagre hvem du kom fra i et `Map`: `from.set(friend, node)`.',
      'Når du har funnet `b`, bygg veien baklengs: start i `b` og følg `from` tilbake til `a`. Legg hvert monster først i arrayen, eller snu den til slutt.',
      'Står ikke `b` i `from` når køen er tom, finnes det ingen vei: gi `null`.',
    ],
    world: (r) => graphWorld(r, things(r, 8), 3),
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function route(a, b) {
  const from = new Map([[a, null]])
  const queue = [a]
  // Gå bredden først og husk hvem du kom fra. Bygg veien baklengs fra b.
  return null
}

console.log(route(A, H)?.map((node) => node.value))
`,
    solution: `function route(a, b) {
  const from = new Map([[a, null]])
  const queue = [a]
  while (queue.length) {
    const node = queue.shift()
    vis(node)
    if (node === b) break
    for (const friend of node.neighbors) {
      if (!from.has(friend)) {
        from.set(friend, node)
        queue.push(friend)
      }
    }
  }
  if (!from.has(b)) return null
  const path = []
  for (let node = b; node; node = from.get(node)) path.unshift(node)
  vis('veien', path)
  return path
}

console.log(route(A, H)?.map((node) => node.value))
`,
    exports: ['route'],
    java: {
      text: `Hvert steg går fra et monster til en av vennene i \`neighbors\`. Skriv \`List<Monster> route(Monster a, Monster b)\` som gir tilbake en liste med monstrene på veien fra \`a\` til \`b\` (begge er med), med så få steg som mulig. Er \`a\` og \`b\` samme monster, er veien bare \`List.of(a)\`. Finnes det ingen vei, gir den \`null\`.

Gå bredden først og husk for hvert monster hvem du kom fra. Når du er framme, går du baklengs fra \`b\` og snur rekkefølgen.`,
      hints: [
        'Gå bredden først med en kø, som i «Hvor mange steg unna?». Lagre hvem du kom fra i et `Map`: `from.put(friend, node)`.',
        'Når du har funnet `b`, bygg veien baklengs: start i `b` og følg `from` tilbake til `a`. Legg hvert monster først i lista med `path.add(0, node)`, eller snu den til slutt med `Collections.reverse(path)`.',
        'Står ikke `b` i `from` når køen er tom, finnes det ingen vei: gi `null`.',
      ],
      scaffold: `List<Monster> route(Monster a, Monster b) {
    Map<Monster, Monster> from = new HashMap<>();
    from.put(a, null);
    Queue<Monster> queue = new ArrayDeque<>();
    queue.add(a);
    // Gå bredden først og husk hvem du kom fra. Bygg veien baklengs fra b.
    return null;
}

void main() {
    List<Monster> path = route(A, H);
    IO.println(path == null ? "ingen vei" : path.stream().map(node -> node.value).toList());
}
`,
      solution: `List<Monster> route(Monster a, Monster b) {
    Map<Monster, Monster> from = new HashMap<>();
    from.put(a, null);
    Queue<Monster> queue = new ArrayDeque<>();
    queue.add(a);
    while (!queue.isEmpty()) {
        Monster node = queue.poll();
        vis(node);
        if (node == b) break;
        for (Monster friend : node.neighbors) {
            if (!from.containsKey(friend)) {
                from.put(friend, node);
                queue.add(friend);
            }
        }
    }
    if (!from.containsKey(b)) return null;
    List<Monster> path = new ArrayList<>();
    for (Monster node = b; node != null; node = from.get(node)) path.add(0, node);
    vis("veien", path);
    return path;
}

void main() {
    List<Monster> path = route(A, H);
    IO.println(path == null ? "ingen vei" : path.stream().map(node -> node.value).toList());
}
`,
    },
    check: (t) => {
      const route = t.fn('route')
      const make = (n: number, edges: number[][]): any[] => {
        const list: any[] = Array.from({ length: n }, (_, i) => t.monster({ value: i, neighbors: [] }))
        for (const [a, b] of edges) {
          list[a].neighbors.push(list[b])
          list[b].neighbors.push(list[a])
        }
        return list
      }
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      const steps = (from: any): Map<any, number> => {
        const dist = new Map<any, number>([[from, 0]])
        const queue = [from]
        for (let i = 0; i < queue.length; i++) {
          for (const next of queue[i].neighbors) {
            if (!dist.has(next)) { dist.set(next, dist.get(queue[i])! + 1); queue.push(next) }
          }
        }
        return dist
      }
      const verify = (a: any, b: any): string => {
        const dist = steps(a)
        const got = route(a, b)
        const way = `fra ${name(a)} til ${name(b)}`
        if (!dist.has(b)) return got === null ? '' : `Det finnes ingen vei ${way}, så route skal gi null, men gav ${t.show(got)}.`
        if (!Array.isArray(got)) return `route skal gi en array med monstrene på veien ${way}, men gav ${t.show(got)}.`
        if (got.some((n) => !n || typeof n !== 'object' || !Array.isArray(n.neighbors))) return `Veien ${way} skal bare ha monstre i seg: ${t.show(got)}.`
        if (got[0] !== a || got[got.length - 1] !== b) return `Veien ${way} skal begynne med ${name(a)} og slutte med ${name(b)}.`
        for (let i = 1; i < got.length; i++) {
          if (!got[i - 1].neighbors.includes(got[i])) return `Veien ${way} går fra ${name(got[i - 1])} til ${name(got[i])}, men de er ikke venner.`
        }
        if (got.length - 1 !== dist.get(b)) return `Veien ${way} har ${got.length - 1} steg, men det går an med ${dist.get(b)}.`
        return ''
      }
      const net = make(7, [[0, 1], [1, 2], [2, 3], [3, 6], [0, 4], [4, 5], [5, 6]])
      const parts = make(5, [[0, 1], [1, 2], [3, 4]])
      const pairs: [any, any][] = [
        [net[0], net[6]],
        [net[6], net[0]],
        [net[2], net[4]],
        [parts[0], parts[2]],
        [parts[0], parts[4]],
        [parts[3], parts[3]],
      ]
      for (const [a, b] of pairs) {
        const problem = verify(a, b)
        if (problem) return problem
      }
      for (const a of t.slots) {
        for (const b of t.slots) {
          const problem = verify(a, b)
          if (problem) return problem
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Breadth-first_search',
  },
  {
    id: 'hvor-mange-gjenger',
    title: 'Hvor mange gjenger?',
    level: 'middels',
    topic: 'grafer',
    text: `Monstrene i \`nodes\` danner gjenger. To monstre hører til samme gjeng hvis de er venner, eller venner av venner, og så videre. Mellom gjengene er det ingen vennskap.

Skriv \`function groups(nodes)\` som gir tilbake hvor mange gjenger det er. Et monster uten venner er en gjeng for seg selv, og en tom \`nodes\` gir 0.

Vil du se dem, kan du gi hver gjeng sin egen \`color\` underveis.`,
    hints: [
      'Hold orden på de du har sett i et `Set`. Gå gjennom `nodes`: møter du et monster du ikke har sett, har du funnet en ny gjeng.',
      'Når du finner en ny gjeng, besøk alle i den: ta vennene, vennene deres og så videre (med en stabel eller kø), og legg dem i settet.',
      'Tell opp en teller for hver ny gjeng. Vil du farge dem, setter du `color` til en farge fra en liste, valgt med telleren.',
    ],
    world: (r) => {
      const items = things(r, 9)
      if (r() < 0.5) {
        const first = int(r, 3, 6)
        return groupsOf(r, items, [first, 9 - first])
      }
      const a = int(r, 2, 4)
      const b = int(r, 2, Math.min(4, 9 - a - 2))
      return groupsOf(r, items, [a, b, 9 - a - b])
    },
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function groups(nodes) {
  const seen = new Set()
  let count = 0
  // Gå gjennom nodes. Et monster du ikke har sett, er en ny gjeng: besøk alle i den.
  return count
}

console.log(groups(nodes))
`,
    solution: `function groups(nodes) {
  const colors = ['pink', 'cyan', 'gold', 'lime', 'violet']
  const seen = new Set()
  let count = 0
  for (const start of nodes) {
    if (seen.has(start)) continue
    // En ny gjeng: gi alle i den samme farge
    const color = colors[count % colors.length]
    count++
    seen.add(start)
    const todo = [start]
    while (todo.length) {
      const node = todo.pop()
      node.color = color
      vis(node)
      for (const friend of node.neighbors) {
        if (!seen.has(friend)) {
          seen.add(friend)
          todo.push(friend)
        }
      }
    }
  }
  return count
}

console.log(groups(nodes))
`,
    exports: ['groups'],
    java: {
      code: { 'function groups(nodes)': 'int groups(List<Monster> nodes)' },
      scaffold: `int groups(List<Monster> nodes) {
    Set<Monster> seen = new HashSet<>();
    int count = 0;
    // Gå gjennom nodes. Et monster du ikke har sett, er en ny gjeng: besøk alle i den.
    return count;
}

void main() {
    IO.println(groups(nodes));
}
`,
      solution: `int groups(List<Monster> nodes) {
    String[] colors = { "pink", "cyan", "gold", "lime", "violet" };
    Set<Monster> seen = new HashSet<>();
    int count = 0;
    for (Monster start : nodes) {
        if (seen.contains(start)) continue;
        // En ny gjeng: gi alle i den samme farge
        String color = colors[count % colors.length];
        count++;
        seen.add(start);
        Deque<Monster> todo = new ArrayDeque<>();
        todo.push(start);
        while (!todo.isEmpty()) {
            Monster node = todo.pop();
            node.color = color;
            vis(node);
            for (Monster friend : node.neighbors) {
                if (!seen.contains(friend)) {
                    seen.add(friend);
                    todo.push(friend);
                }
            }
        }
    }
    return count;
}

void main() {
    IO.println(groups(nodes));
}
`,
    },
    check: (t) => {
      const groups = t.fn('groups')
      const make = (n: number, edges: number[][]): any[] => {
        const list: any[] = Array.from({ length: n }, (_, i) => t.monster({ value: i, neighbors: [] }))
        for (const [a, b] of edges) {
          list[a].neighbors.push(list[b])
          list[b].neighbors.push(list[a])
        }
        return list
      }
      const count = (list: any[]): number => {
        const seen = new Set<any>()
        let n = 0
        for (const start of list) {
          if (seen.has(start)) continue
          n++
          const todo = [start]
          seen.add(start)
          while (todo.length) {
            for (const next of todo.pop().neighbors) if (!seen.has(next)) { seen.add(next); todo.push(next) }
          }
        }
        return n
      }
      const cases: [any[], string][] = [
        [[], 'ingen monstre'],
        [make(1, []), 'ett monster'],
        [make(4, []), 'fire monstre uten venner'],
        [make(6, [[0, 1], [1, 2], [2, 0], [3, 4]]), 'tre gjenger og et monster alene'],
        [make(8, [[0, 4], [4, 1], [2, 5], [5, 3], [3, 2], [6, 7]]).reverse(), 'tre gjenger i blandet rekkefølge'],
        [make(6, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]), 'én stor ring'],
        [t.nodes, 'monstrene på scenen'],
      ]
      for (const [list, what] of cases) {
        const want = count(list)
        const got = groups(list)
        if (got !== want) return `For ${what} gav groups ${t.show(got)}, men det er ${want} ${want === 1 ? 'gjeng' : 'gjenger'}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Component_(graph_theory)',
  },
  {
    id: 'to-lag',
    title: 'To lag',
    level: 'middels',
    topic: 'grafer',
    text: `Monstrene i \`nodes\` skal deles i to lag, rosa og turkis, så ingen står på samme lag som en venn. Skriv \`function twoTeams(nodes)\` som setter \`color\` til \`'pink'\` eller \`'cyan'\` på hvert monster, slik at to venner aldri får samme farge, og gir tilbake \`true\`.

Det går ikke alltid. Danner vennene en ring med et odde antall monstre, som tre som alle er venner, kan det ikke lages to lag. Da skal funksjonen gi tilbake \`false\`, og ingen farger skal være endret. En tom \`nodes\` gir \`true\`.

\`nodes\` kan ha flere adskilte grupper, og hver av dem må få lag. Sjekken prøver også en trekant.`,
    hints: [
      'Gå bredden først. Gi det første monsteret en farge, vennene til det den andre, vennene deres den første igjen, og så videre.',
      'Har en venn allerede fått samme farge som monsteret du står på, går det ikke: svaret er `false`.',
      'Husk fargene monstrene hadde (for eksempel i et `Map`) og sett dem tilbake før du gir `false`. Start et nytt søk fra hvert monster som ikke har fått lag ennå, for det kan være flere grupper.',
    ],
    world: (r) => {
      const n = 8
      const ring = shuffled(r, [...Array(n).keys()])
      const adj: number[][] = Array.from({ length: n }, () => [])
      const link = (a: number, b: number) => {
        adj[a].push(b)
        adj[b].push(a)
      }
      for (let k = 0; k < n; k++) link(ring[k], ring[(k + 1) % n])
      // A chord three or five steps along: both rings it makes are even, so two teams still work
      const from = int(r, 0, n - 1)
      link(ring[from], ring[(from + (r() < 0.5 ? 3 : 5)) % n])
      return graphOf(things(r, n), adj)
    },
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function twoTeams(nodes) {
  // Gi hvert monster 'pink' eller 'cyan', så ingen venner får samme farge
  return true
}

console.log(twoTeams(nodes))
`,
    solution: `function twoTeams(nodes) {
  const before = new Map(nodes.map((node) => [node, node.color]))
  const team = new Map()
  for (const start of nodes) {
    if (team.has(start)) continue
    team.set(start, 'pink')
    const queue = [start]
    while (queue.length) {
      const node = queue.shift()
      node.color = team.get(node)
      vis(node)
      for (const friend of node.neighbors) {
        if (!team.has(friend)) {
          team.set(friend, team.get(node) === 'pink' ? 'cyan' : 'pink')
          queue.push(friend)
        } else if (team.get(friend) === team.get(node)) {
          // To venner på samme lag: det går ikke. Sett fargene tilbake.
          for (const [item, color] of before) item.color = color
          return false
        }
      }
    }
  }
  return true
}

console.log(twoTeams(nodes))
`,
    exports: ['twoTeams'],
    java: {
      text: `Monstrene i \`nodes\` skal deles i to lag, rosa og turkis, så ingen står på samme lag som en venn. Skriv \`boolean twoTeams(List<Monster> nodes)\` som setter \`color\` til \`"pink"\` eller \`"cyan"\` på hvert monster, slik at to venner aldri får samme farge, og gir tilbake \`true\`.

Det går ikke alltid. Danner vennene en ring med et odde antall monstre, som tre som alle er venner, kan det ikke lages to lag. Da skal metoden gi tilbake \`false\`, og ingen farger skal være endret. En tom \`nodes\` gir \`true\`.

\`nodes\` kan ha flere adskilte grupper, og hver av dem må få lag. Sjekken prøver også en trekant.`,
      hints: [
        'Gå bredden først. Gi det første monsteret en farge, vennene til det den andre, vennene deres den første igjen, og så videre.',
        'Har en venn allerede fått samme farge som monsteret du står på, går det ikke: svaret er `false`.',
        'Husk fargene monstrene hadde (for eksempel i et `Map<Monster, String>`) og sett dem tilbake før du gir `false`. Start et nytt søk fra hvert monster som ikke har fått lag ennå, for det kan være flere grupper.',
      ],
      scaffold: `boolean twoTeams(List<Monster> nodes) {
    // Gi hvert monster "pink" eller "cyan", så ingen venner får samme farge
    return true;
}

void main() {
    IO.println(twoTeams(nodes));
}
`,
      solution: `boolean twoTeams(List<Monster> nodes) {
    Map<Monster, String> before = new HashMap<>();
    for (Monster node : nodes) before.put(node, node.color);
    Map<Monster, String> team = new HashMap<>();
    for (Monster start : nodes) {
        if (team.containsKey(start)) continue;
        team.put(start, "pink");
        Queue<Monster> queue = new ArrayDeque<>();
        queue.add(start);
        while (!queue.isEmpty()) {
            Monster node = queue.poll();
            node.color = team.get(node);
            vis(node);
            for (Monster friend : node.neighbors) {
                if (!team.containsKey(friend)) {
                    team.put(friend, team.get(node).equals("pink") ? "cyan" : "pink");
                    queue.add(friend);
                } else if (team.get(friend).equals(team.get(node))) {
                    // To venner på samme lag: det går ikke. Sett fargene tilbake.
                    before.forEach((item, color) -> item.color = color);
                    return false;
                }
            }
        }
    }
    return true;
}

void main() {
    IO.println(twoTeams(nodes));
}
`,
    },
    check: (t) => {
      const twoTeams = t.fn('twoTeams')
      const paint = ['gold', 'lime', 'red', 'orange', 'violet', 'teal', 'gold', 'lime']
      const make = (n: number, edges: number[][]): any[] => {
        const list: any[] = Array.from({ length: n }, (_, i) => t.monster({ value: i, color: paint[i % paint.length], neighbors: [] }))
        for (const [a, b] of edges) {
          list[a].neighbors.push(list[b])
          list[b].neighbors.push(list[a])
        }
        return list
      }
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      const team = (c: unknown) => c === 'pink' || c === 'cyan'
      const wrong = (list: any[]): string => {
        for (const node of list) {
          if (!team(node.color)) return `${name(node)} har fargen ${t.show(node.color)}, men skal være 'pink' eller 'cyan'.`
          for (const friend of node.neighbors) {
            if (friend.color === node.color) return `${name(node)} og vennen ${name(friend)} har begge ${t.show(node.color)}.`
          }
        }
        return ''
      }
      const g = make(8, [[0, 1], [1, 2], [3, 4], [4, 5], [5, 6], [6, 7], [7, 3]])
      const mixed = make(7, [[0, 1], [1, 2], [3, 4], [4, 5], [5, 6], [6, 3]])
      const cases: [any[], boolean, string][] = [
        [make(6, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3]]), true, 'en ring på seks med en snarvei'],
        [[mixed[0], mixed[3], mixed[1], mixed[4], mixed[2], mixed[5], mixed[6]], true, 'to adskilte grupper'],
        [make(1, []), true, 'ett monster'],
        [[], true, 'ingen monstre'],
        [make(3, [[0, 1], [1, 2], [2, 0]]), false, 'en trekant'],
        [make(5, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]), false, 'en ring på fem'],
        [g, false, 'en gruppe på tre og en ring på fem'],
      ]
      for (const [list, ok, what] of cases) {
        const before = list.map((n) => n.color)
        const got = twoTeams(list)
        if (got !== ok) return `For ${what} gav twoTeams ${t.show(got)}, men svaret skal være ${ok}.`
        if (ok) {
          const problem = wrong(list)
          if (problem) return `For ${what}: ${problem}`
        } else if (list.some((n, i) => n.color !== before[i])) {
          return `For ${what} gav twoTeams false, men fargene er endret. Sett dem tilbake før du gir false.`
        }
      }
      const problem = wrong(t.slots as any[])
      if (problem) return `På scenen: ${problem}`
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Bipartite_graph',
  },
  {
    id: 'hva-forst',
    title: 'Hva må gjøres først?',
    level: 'middels',
    topic: 'grafer',
    text: `Monstrene skal gjøres i en bestemt rekkefølge. Pilene på scenen viser hva som må komme først: en pil fra A til B betyr at A må gjøres før B, og \`A.neighbors\` lister dem A peker på. Det er altså ikke venner lenger, bare piler som går én vei.

Skriv \`function order(nodes)\` som gir tilbake alle monstrene i en rekkefølge der hver pil peker framover: hvert monster kommer før alle i sin \`neighbors\`. Det finnes ofte flere riktige rekkefølger, og en av dem holder. En tom \`nodes\` gir \`[]\`.

Danner pilene en ring, finnes det ingen rekkefølge. Da skal \`order\` gi tilbake \`null\`. Sjekken prøver også det.`,
    hints: [
      'Et monster kan gjøres først når ingen pil peker på det. Tell for hvert monster hvor mange piler som peker inn.',
      'Still alle med 0 innpiler i en kø. Ta ut ett, legg det i svaret, og trekk 1 fra innpilene til hvert monster i `neighbors` til det. Blir ett av dem 0, stiller du det i køen.',
      'Er svaret kortere enn `nodes` når køen er tom, står noen igjen i en ring der alle venter på hverandre: gi `null`.',
    ],
    world: (r) => arrowsOf(r, things(r, 8), 3, false),
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function order(nodes) {
  const result = []
  // Hvor mange piler peker inn på hvert monster? Begynn med dem som ingen peker på.
  return result
}

console.log(order(nodes)?.map((node) => node.value))
`,
    solution: `function order(nodes) {
  const waiting = new Map(nodes.map((node) => [node, 0]))
  for (const node of nodes) {
    for (const next of node.neighbors) waiting.set(next, waiting.get(next) + 1)
  }
  const ready = nodes.filter((node) => waiting.get(node) === 0)
  const result = []
  while (ready.length) {
    const node = ready.shift()
    result.push(node)
    vis(node)
    for (const next of node.neighbors) {
      waiting.set(next, waiting.get(next) - 1)
      if (waiting.get(next) === 0) ready.push(next)
    }
  }
  return result.length === nodes.length ? result : null
}

console.log(order(nodes)?.map((node) => node.value))
`,
    exports: ['order'],
    java: {
      text: `Monstrene skal gjøres i en bestemt rekkefølge. Pilene på scenen viser hva som må komme først: en pil fra A til B betyr at A må gjøres før B, og \`A.neighbors\` lister dem A peker på. Det er altså ikke venner lenger, bare piler som går én vei.

Skriv \`List<Monster> order(List<Monster> nodes)\` som gir tilbake alle monstrene i en rekkefølge der hver pil peker framover: hvert monster kommer før alle i sin \`neighbors\`. Det finnes ofte flere riktige rekkefølger, og en av dem holder. En tom \`nodes\` gir en tom liste.

Danner pilene en ring, finnes det ingen rekkefølge. Da skal \`order\` gi tilbake \`null\`. Sjekken prøver også det.`,
      hints: [
        'Et monster kan gjøres først når ingen pil peker på det. Tell for hvert monster hvor mange piler som peker inn, for eksempel i et `Map<Monster, Integer>`.',
        'Still alle med 0 innpiler i en kø. Ta ut ett, legg det i svaret, og trekk 1 fra innpilene til hvert monster i `neighbors` til det. Blir ett av dem 0, stiller du det i køen.',
        'Er svaret kortere enn `nodes` når køen er tom, står noen igjen i en ring der alle venter på hverandre: gi `null`.',
      ],
      scaffold: `List<Monster> order(List<Monster> nodes) {
    List<Monster> result = new ArrayList<>();
    // Hvor mange piler peker inn på hvert monster? Begynn med dem som ingen peker på.
    return result;
}

void main() {
    List<Monster> result = order(nodes);
    IO.println(result == null ? "ingen rekkefølge" : result.stream().map(node -> node.value).toList());
}
`,
      solution: `List<Monster> order(List<Monster> nodes) {
    Map<Monster, Integer> waiting = new HashMap<>();
    for (Monster node : nodes) waiting.put(node, 0);
    for (Monster node : nodes) {
        for (Monster next : node.neighbors) waiting.put(next, waiting.get(next) + 1);
    }
    Queue<Monster> ready = new ArrayDeque<>();
    for (Monster node : nodes) {
        if (waiting.get(node) == 0) ready.add(node);
    }
    List<Monster> result = new ArrayList<>();
    while (!ready.isEmpty()) {
        Monster node = ready.poll();
        result.add(node);
        vis(node);
        for (Monster next : node.neighbors) {
            waiting.put(next, waiting.get(next) - 1);
            if (waiting.get(next) == 0) ready.add(next);
        }
    }
    return result.size() == nodes.size() ? result : null;
}

void main() {
    List<Monster> result = order(nodes);
    IO.println(result == null ? "ingen rekkefølge" : result.stream().map(node -> node.value).toList());
}
`,
    },
    check: (t) => {
      const order = t.fn('order')
      const make = (n: number, arrows: number[][]): any[] => {
        const list: any[] = Array.from({ length: n }, (_, i) => t.monster({ value: i, neighbors: [] }))
        for (const [a, b] of arrows) list[a].neighbors.push(list[b])
        return list
      }
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      const wrong = (list: any[], got: any): string => {
        if (!Array.isArray(got)) return `order skal gi en array med monstrene, men gav ${t.show(got)}.`
        if (got.length !== list.length || new Set(got).size !== got.length || got.some((x) => !list.includes(x))) {
          return `order skal gi alle ${list.length} monstrene, hver én gang, men gav ${got.length} monstre.`
        }
        const place = new Map(got.map((node, i) => [node, i]))
        for (const node of list) {
          for (const next of node.neighbors) {
            if (place.get(node)! >= place.get(next)!) return `${name(node)} skal komme før ${name(next)}, men kommer etter.`
          }
        }
        return ''
      }
      const ordered: [any[], string][] = [
        [make(4, [[0, 1], [0, 2], [1, 3], [2, 3]]).reverse(), 'en diamant'],
        [make(5, [[4, 3], [3, 2], [2, 1], [1, 0]]), 'en kjede som går baklengs'],
        [make(3, []), 'tre monstre uten piler'],
        [make(6, [[0, 3], [3, 5], [1, 4], [4, 2]]), 'to adskilte kjeder'],
        [[], 'ingen monstre'],
        [t.nodes, 'monstrene på scenen'],
      ]
      for (const [list, what] of ordered) {
        const got = order(list)
        if (got === null) return `For ${what} går det an å lage en rekkefølge, men order gav null.`
        const problem = wrong(list, got)
        if (problem) return `For ${what}: ${problem}`
      }
      const rings: [any[], string][] = [
        [make(3, [[0, 1], [1, 2], [2, 0]]), 'en ring på tre'],
        [make(5, [[3, 0], [0, 1], [1, 2], [2, 0], [0, 4]]), 'en ring med et monster foran og ett bak'],
        [make(6, [[0, 1], [2, 3], [3, 4], [4, 2]]), 'en kjede og en ring ved siden av'],
      ]
      for (const [list, what] of rings) {
        const got = order(list)
        if (got !== null) return `For ${what} danner pilene en ring, så order skal gi null, men gav ${t.show(got)}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Topological_sorting',
  },
  {
    id: 'billigste-vei',
    title: 'Billigste vei',
    level: 'vanskelig',
    topic: 'grafer',
    text: `Å gå fra et monster til en av vennene koster forskjellen på verdiene deres, alltid et positivt tall: fra 12 til 30 koster 18, og tilbake igjen også 18. En vei koster summen av stegene.

Skriv \`function cheapest(a, b)\` som gir tilbake hva den billigste veien fra \`a\` til \`b\` koster. Den har ikke nødvendigvis færrest steg. Fra et monster til seg selv koster det 0, og finnes det ingen vei, gir den \`Infinity\`.

Bruk Dijkstras metode: ta alltid ut det uferdige monsteret som er billigst å nå. En vanlig array holder som kø.`,
    hints: [
      'Hold en `Map` `best` med billigste kjente pris til hvert monster, først bare `a` med 0, og en array `todo` med monstrene som skal besøkes.',
      'Ta ut monsteret i `todo` med lavest pris i `best`. For hver venn: prisen er `best.get(node) + Math.abs(node.value - friend.value)`. Er det billigere enn det du har fra før, lagrer du den og legger vennen i `todo`.',
      'Er monsteret du tar ut `b`, er prisen endelig. Blir `todo` tom uten at du kom til `b`, gir du `Infinity`.',
    ],
    world: (r) => graphWorld(r, things(r, 8), 3),
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function cheapest(a, b) {
  const best = new Map([[a, 0]])
  const todo = [a]
  // Ta alltid ut det billigste i todo, og oppdater prisen til vennene
  return Infinity
}

console.log(cheapest(A, H))
`,
    solution: `function cheapest(a, b) {
  const best = new Map([[a, 0]])
  const done = new Set()
  const todo = [a]
  while (todo.length) {
    // Ta ut det billigste
    todo.sort((x, y) => best.get(x) - best.get(y))
    const node = todo.shift()
    if (done.has(node)) continue
    done.add(node)
    vis(node)
    if (node === b) return best.get(b)
    for (const friend of node.neighbors) {
      const price = best.get(node) + Math.abs(node.value - friend.value)
      if (!best.has(friend) || price < best.get(friend)) {
        best.set(friend, price)
        todo.push(friend)
      }
    }
  }
  return Infinity
}

console.log(cheapest(A, H))
`,
    exports: ['cheapest'],
    java: {
      text: `Å gå fra et monster til en av vennene koster forskjellen på verdiene deres, alltid et positivt tall: fra 12 til 30 koster 18, og tilbake igjen også 18. En vei koster summen av stegene.

Skriv \`double cheapest(Monster a, Monster b)\` som gir tilbake hva den billigste veien fra \`a\` til \`b\` koster. Den har ikke nødvendigvis færrest steg. Fra et monster til seg selv koster det 0, og finnes det ingen vei, gir den \`Double.POSITIVE_INFINITY\`.

Bruk Dijkstras metode: ta alltid ut det uferdige monsteret som er billigst å nå. En vanlig \`ArrayList\` holder som kø.`,
      hints: [
        'Hold et `Map<Monster, Integer>` `best` med billigste kjente pris til hvert monster, først bare `a` med 0, og en liste `todo` med monstrene som skal besøkes.',
        'Ta ut monsteret i `todo` med lavest pris i `best`. For hver venn: prisen er `best.get(node) + Math.abs(node.value - friend.value)`. Er det billigere enn det du har fra før, lagrer du den og legger vennen i `todo`.',
        'Er monsteret du tar ut `b`, er prisen endelig. Blir `todo` tom uten at du kom til `b`, gir du `Double.POSITIVE_INFINITY`.',
      ],
      scaffold: `double cheapest(Monster a, Monster b) {
    Map<Monster, Integer> best = new HashMap<>();
    best.put(a, 0);
    List<Monster> todo = new ArrayList<>();
    todo.add(a);
    // Ta alltid ut det billigste i todo, og oppdater prisen til vennene
    return Double.POSITIVE_INFINITY;
}

void main() {
    IO.println(cheapest(A, H));
}
`,
      solution: `double cheapest(Monster a, Monster b) {
    Map<Monster, Integer> best = new HashMap<>();
    best.put(a, 0);
    Set<Monster> done = new HashSet<>();
    List<Monster> todo = new ArrayList<>();
    todo.add(a);
    while (!todo.isEmpty()) {
        // Ta ut det billigste
        todo.sort((x, y) -> best.get(x) - best.get(y));
        Monster node = todo.remove(0);
        if (done.contains(node)) continue;
        done.add(node);
        vis(node);
        if (node == b) return best.get(b);
        for (Monster friend : node.neighbors) {
            int price = best.get(node) + Math.abs(node.value - friend.value);
            if (!best.containsKey(friend) || price < best.get(friend)) {
                best.put(friend, price);
                todo.add(friend);
            }
        }
    }
    return Double.POSITIVE_INFINITY;
}

void main() {
    IO.println(cheapest(A, H));
}
`,
    },
    check: (t) => {
      const cheapest = t.fn('cheapest')
      const make = (values: number[], edges: number[][]): any[] => {
        const list: any[] = values.map((value) => t.monster({ value, neighbors: [] }))
        for (const [a, b] of edges) {
          list[a].neighbors.push(list[b])
          list[b].neighbors.push(list[a])
        }
        return list
      }
      // The right prices the slow way: relax every edge again and again.
      const prices = (from: any, list: any[]): Map<any, number> => {
        const cost = new Map<any, number>(list.map((n) => [n, Infinity]))
        cost.set(from, 0)
        for (let round = 0; round < list.length; round++) {
          for (const n of list) {
            if (cost.get(n) === Infinity) continue
            for (const f of n.neighbors) {
              const c = cost.get(n)! + Math.abs(n.value - f.value)
              if (c < cost.get(f)!) cost.set(f, c)
            }
          }
        }
        return cost
      }
      let seed = 4242
      const rnd = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      const random = (n: number, m: number): any[] => {
        const values = Array.from({ length: n }, () => Math.floor(rnd() * 80) - 20)
        const edges: number[][] = []
        while (edges.length < m) {
          const a = Math.floor(rnd() * n)
          const b = Math.floor(rnd() * n)
          if (a !== b && !edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) edges.push([a, b])
        }
        return make(values, edges)
      }
      const cases: [any[], string][] = [
        [make([10, 100, 15, 18, 20], [[0, 1], [1, 4], [0, 2], [2, 3], [3, 4]]), 'et nett der den korteste veien er dyr'],
        [make([5, 9, 40, 44], [[0, 1], [2, 3]]), 'to adskilte grupper'],
        [random(8, 11), 'et tilfeldig nett'],
        [random(8, 10), 'et annet tilfeldig nett'],
        [random(7, 6), 'et tynt nett'],
        [t.slots as any[], 'monstrene på scenen'],
      ]
      for (const [list, what] of cases) {
        for (const a of list) {
          const cost = prices(a, list)
          for (const b of list) {
            const got = cheapest(a, b)
            if (got !== cost.get(b)) {
              const show = (n: any) => (t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
              return `For ${what}: cheapest(${show(a)}, ${show(b)}) gav ${t.show(got)}, men den billigste veien koster ${t.show(cost.get(b))}.`
            }
          }
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm',
  },
  {
    id: 'venter-i-ring',
    title: 'Venter i ring?',
    level: 'vanskelig',
    topic: 'grafer',
    text: `Monstrene venter på hverandre. En pil fra A til B betyr at A venter på B, og \`A.neighbors\` er dem A venter på. Kommer pilene rundt i ring, for eksempel A venter på B som venter på C som venter på A, står alle fast for alltid.

Skriv \`function hasCycle(nodes)\` som gir \`true\` hvis noen til slutt venter på seg selv, og ellers \`false\`. Pass på at to veier som møtes igjen (en diamant) ikke er en ring, mens et monster som venter på seg selv er det. En tom \`nodes\` gir \`false\`.

Merk hvert monster hvitt (ikke besøkt), grått (du er på vei ned gjennom det) eller svart (ferdig undersøkt). Møter du et grått monster, har du gått i ring.`,
    hints: [
      'Gå dypt fra hvert monster som ikke er besøkt. Hold orden på tilstanden til hvert monster i et `Map`: ikke i kartet er hvit, `\'grå\'` er under besøk, `\'svart\'` er ferdig.',
      'Når du går inn i et monster, merk det grått. Når alle det venter på er undersøkt, merk det svart.',
      'Møter du et grått monster, er det en ring: `true`. Et svart monster er ferdig undersøkt og kan hoppes over. Derfor er en diamant ikke en ring.',
    ],
    world: (r) => arrowsOf(r, things(r, 8), 3, r() < 0.5),
    monster: GRAPH_MONSTER,
    views: { nodes: 'graph' },
    scaffold: `function hasCycle(nodes) {
  const state = new Map() // ikke i kartet = hvit, 'grå' = under besøk, 'svart' = ferdig
  // Gå dypt fra hvert hvitt monster. Møter du et grått, er det en ring.
  return false
}

console.log(hasCycle(nodes))
`,
    solution: `function hasCycle(nodes) {
  const state = new Map() // ikke i kartet = hvit, 'grå' = under besøk, 'svart' = ferdig

  function visit(node) {
    state.set(node, 'grå')
    vis(node)
    for (const next of node.neighbors) {
      if (state.get(next) === 'grå') {
        vis('ring!', next)
        return true
      }
      if (!state.has(next) && visit(next)) return true
    }
    state.set(node, 'svart')
    return false
  }

  return nodes.some((node) => !state.has(node) && visit(node))
}

console.log(hasCycle(nodes))
`,
    exports: ['hasCycle'],
    java: {
      code: { 'function hasCycle(nodes)': 'boolean hasCycle(List<Monster> nodes)' },
      hints: [
        'Gå dypt fra hvert monster som ikke er besøkt, med en hjelpemetode `boolean visit(Monster node, Map<Monster, String> state)`. Hold orden på tilstanden til hvert monster i kartet: ikke i kartet er hvit, `"grå"` er under besøk, `"svart"` er ferdig.',
        'Når du går inn i et monster, merk det grått. Når alle det venter på er undersøkt, merk det svart.',
        'Møter du et grått monster, er det en ring: `true`. Et svart monster er ferdig undersøkt og kan hoppes over. Derfor er en diamant ikke en ring.',
      ],
      scaffold: `boolean hasCycle(List<Monster> nodes) {
    Map<Monster, String> state = new HashMap<>(); // ikke i kartet = hvit, "grå" = under besøk, "svart" = ferdig
    // Gå dypt fra hvert hvitt monster. Møter du et grått, er det en ring.
    return false;
}

void main() {
    IO.println(hasCycle(nodes));
}
`,
      solution: `boolean hasCycle(List<Monster> nodes) {
    Map<Monster, String> state = new HashMap<>(); // ikke i kartet = hvit, "grå" = under besøk, "svart" = ferdig
    for (Monster node : nodes) {
        if (!state.containsKey(node) && visit(node, state)) return true;
    }
    return false;
}

boolean visit(Monster node, Map<Monster, String> state) {
    state.put(node, "grå");
    vis(node);
    for (Monster next : node.neighbors) {
        if ("grå".equals(state.get(next))) {
            vis("ring!", next);
            return true;
        }
        if (!state.containsKey(next) && visit(next, state)) return true;
    }
    state.put(node, "svart");
    return false;
}

void main() {
    IO.println(hasCycle(nodes));
}
`,
    },
    check: (t) => {
      const hasCycle = t.fn('hasCycle')
      const make = (n: number, arrows: number[][]): any[] => {
        const list: any[] = Array.from({ length: n }, (_, i) => t.monster({ value: i, neighbors: [] }))
        for (const [a, b] of arrows) list[a].neighbors.push(list[b])
        return list
      }
      // The right answer another way: a graph without rings can be emptied from the items nobody waits for.
      const ring = (list: any[]): boolean => {
        const waiting = new Map<any, number>(list.map((n) => [n, 0]))
        for (const n of list) for (const m of n.neighbors) waiting.set(m, waiting.get(m)! + 1)
        const ready = list.filter((n) => waiting.get(n) === 0)
        let done = 0
        while (ready.length) {
          const n = ready.pop()
          done++
          for (const m of n.neighbors) {
            waiting.set(m, waiting.get(m)! - 1)
            if (waiting.get(m) === 0) ready.push(m)
          }
        }
        return done < list.length
      }
      const cases: [any[], string][] = [
        [make(5, [[0, 1], [1, 2], [2, 3], [3, 4]]), 'en kjede'],
        [make(4, [[0, 1], [0, 2], [1, 3], [2, 3]]), 'en diamant'],
        [make(7, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]]), 'to diamanter etter hverandre'],
        [make(6, [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [4, 5], [1, 5]]), 'mange veier som møtes'],
        [make(3, [[0, 1], [1, 2], [2, 0]]), 'en ring på tre'],
        [make(2, [[0, 1], [1, 0]]), 'to som venter på hverandre'],
        [make(2, [[0, 0]]), 'ett som venter på seg selv'],
        [make(5, [[0, 1], [1, 2], [2, 3], [3, 1], [3, 4]]), 'en kjede som ender i en ring'],
        [make(6, [[0, 1], [3, 4], [4, 5], [5, 3]]), 'en kjede og en ring ved siden av'],
        [make(1, []), 'ett monster'],
        [[], 'ingen monstre'],
        [t.nodes, 'monstrene på scenen'],
      ]
      for (const [list, what] of cases) {
        for (const nodes of [list, [...list].reverse()]) {
          const want = ring(nodes)
          const got = hasCycle(nodes)
          if (got !== want) return `For ${what} gav hasCycle ${t.show(got)}, men ${want ? 'noen venter i ring' : 'ingen venter i ring'}.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Cycle_(graph_theory)#Cycle_detection',
  },
]
