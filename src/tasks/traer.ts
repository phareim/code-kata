import { arrayWorld, at, bstWorld, colored, int, makeWorld, PALETTE, pick, things, treeWorld, type Random, type Spec } from './build'
import { COLOR_TREE_MONSTER, TREE_MONSTER } from './classes'
import type { Task } from './types'
import { label, type World } from '../world/world'

/** Items in palette colours, none of them gold, and no value. */
function notGold(random: Random, n: number): Spec[] {
  const colors = PALETTE.filter((c) => c !== 'gold')
  return Array.from({ length: n }, () => ({ color: pick(random, colors) }))
}

/** A search tree from specs inserted in this order (as bstWorld links them): the specs with left/right as slot pointers. */
function bstSpecs(specs: Spec[]): { nodes: Spec[]; left: (number | null)[]; right: (number | null)[] } {
  const left: (number | null)[] = specs.map(() => null)
  const right: (number | null)[] = specs.map(() => null)
  for (let i = 1; i < specs.length; i++) {
    let node = 0
    for (;;) {
      const side = (specs[i].value as number) < (specs[node].value as number) ? left : right
      const next = side[node]
      if (next === null) { side[node] = i; break }
      node = next
    }
  }
  const nodes = specs.map((spec, i) => ({
    ...spec,
    left: left[i] === null ? null : at(left[i]!),
    right: right[i] === null ? null : at(right[i]!),
  }))
  return { nodes, left, right }
}

/** The slot a world's item holds in a pointer property (left, right), or null. */
function child(world: World, slot: number, key: string): number | null {
  return world.items[slot].props.find((p) => p.key === key)?.ref ?? null
}

/** A root that names the item in a slot (drawn as a flag over it). */
function pointer(world: World, name: string, slot: number): void {
  world.roots.push({ key: name, ref: slot, text: label(slot) })
}

export const tasks: Task[] = [
  {
    id: 'hvor-hoyt',
    title: 'Hvor høyt er treet?',
    level: 'middels',
    topic: 'trær',
    text: `Monstrene står i et tre som starter i \`root\`. Hvert monster har \`left\` og \`right\`, som peker på et nytt monster eller er \`null\`.

Skriv \`function height(node)\` som gir tilbake hvor mange nivåer treet under \`node\` har. Et tomt tre (\`null\`) har høyde 0, og et monster uten barn har høyde 1.`,
    hints: [
      'Et tre er et monster med to mindre trær under seg. Spør dem!',
      'Høyden er 1 pluss den høyeste av `height(node.left)` og `height(node.right)`.',
      'Husk stoppen først: `if (!node) return 0`.',
    ],
    world: (r) => treeWorld(r, colored(r, 9)),
    monster: COLOR_TREE_MONSTER,
    scaffold: `function height(node) {
  if (!node) return 0
  // Hvor høye er de to trærne under node?
  return 1
}

console.log(height(root))
`,
    solution: `function height(node) {
  if (!node) return 0
  return 1 + Math.max(height(node.left), height(node.right))
}

console.log(height(root))
`,
    exports: ['height'],
    check: (t) => {
      const height = t.fn('height')
      const cases: [unknown, number][] = [
        [null, 0],
        [5, 1],
        [[5, 3, null], 2],
        [[5, [3, 1, [4, null, 4.5]], 8], 4],
        [[1, null, [2, null, [3, null, [4, null, 5]]]], 5],
      ]
      for (const [spec, want] of cases) {
        const got = height(t.tree(spec))
        if (got !== want) return `height gav ${t.show(got)} for et tre som er ${want} høyt.`
      }
      return true
    },
  },
  {
    id: 'speil-treet',
    title: 'Speil treet',
    level: 'middels',
    topic: 'trær',
    text: `Treet vil se seg selv i speilet. Bytt \`left\` og \`right\` på hvert eneste monster i treet, så det blir speilvendt.

\`root\` skal peke på det samme monsteret som før.`,
    hints: [
      'Lag en funksjon `mirror(node)` som gjør jobben for ett tre, og kall den på `root`.',
      'For ett monster: bytt `node.left` og `node.right`, og speil så begge barna.',
      'Stopp når `node` er `null`.',
    ],
    world: (r) => treeWorld(r, colored(r, 9)),
    monster: COLOR_TREE_MONSTER,
    scaffold: `function mirror(node) {
  if (!node) return
  // Bytt left og right, og speil barna
}

mirror(root)
`,
    solution: `function mirror(node) {
  if (!node) return
  ;[node.left, node.right] = [node.right, node.left]
  mirror(node.left)
  mirror(node.right)
}

mirror(root)
`,
    check: (t) => {
      if (t.root !== t.live(t.start.root)) return '`root` skal fortsatt peke på det samme monsteret.'
      const stack = [t.start.root]
      while (stack.length) {
        const copy = stack.pop()
        if (!copy) continue
        const node = t.live(copy)!
        if (node.left !== t.live(copy.right) || node.right !== t.live(copy.left)) {
          return `${t.show(node)} er ikke speilet: left skal være ${t.show(t.live(copy.right))} og right ${t.show(t.live(copy.left))}.`
        }
        stack.push(copy.left, copy.right)
      }
      return true
    },
    source: 'https://leetcode.com/problems/invert-binary-tree/',
  },
  {
    id: 'tell-og-legg-sammen',
    title: 'Tell og legg sammen',
    level: 'lett',
    topic: 'trær',
    text: `Monstrene står i et tre som starter i \`root\`. Hvert monster har \`left\` og \`right\`, som peker på et nytt monster eller er \`null\`.

Skriv to funksjoner. \`function size(node)\` gir tilbake hvor mange monstre det er i treet under \`node\`, og \`node\` selv teller med. \`function total(node)\` gir summen av alle \`value\` i det samme treet.

Begge skal klare et tomt tre: \`null\` gir 0.`,
    hints: [
      'Et tre er ett monster og to mindre trær. La funksjonen spørre de to trærne om svaret deres.',
      'Stopp først: `if (!node) return 0`. Ellers er svaret 1 pluss `size(node.left)` pluss `size(node.right)`.',
      '`total` er bygd likt, men i stedet for 1 legger du til `node.value`.',
    ],
    world: (r) => treeWorld(r, things(r, 9)),
    monster: TREE_MONSTER,
    scaffold: `function size(node) {
  if (!node) return 0
  // Hvor mange er det i treet til venstre og i treet til høyre?
  return 1
}

function total(node) {
  if (!node) return 0
  // Hva er summen av verdiene i de to trærne?
  return node.value
}

console.log(size(root), total(root))
`,
    solution: `function size(node) {
  if (!node) return 0
  vis(node)
  return 1 + size(node.left) + size(node.right)
}

function total(node) {
  if (!node) return 0
  vis(node)
  return node.value + total(node.left) + total(node.right)
}

console.log(size(root), total(root))
`,
    exports: ['size', 'total'],
    check: (t) => {
      const size = t.fn('size')
      const total = t.fn('total')
      const cases: [unknown, number, number][] = [
        [null, 0, 0],
        [7, 1, 7],
        [[5, 3, null], 2, 8],
        [[5, [3, 1, [4, null, 6]], 8], 6, 27],
        [[1, null, [2, null, [3, null, [4, null, 5]]]], 5, 15],
      ]
      for (const [spec, wantSize, wantTotal] of cases) {
        const tree = t.tree(spec)
        const gotSize = size(tree)
        if (gotSize !== wantSize) return `size gav ${t.show(gotSize)} for et tre med ${wantSize} monstre.`
        const gotTotal = total(tree)
        if (gotTotal !== wantTotal) return `total gav ${t.show(gotTotal)} for et tre med verdiene sum ${wantTotal}.`
      }
      const sum = t.slots.reduce((s: number, node) => s + node.value, 0)
      if (size(t.root) !== t.slots.length) return `size(root) gav ${t.show(size(t.root))}, men det står ${t.slots.length} monstre i treet.`
      if (total(t.root) !== sum) return `total(root) gav ${t.show(total(t.root))}, men verdiene i treet summerer til ${sum}.`
      return true
    },
  },
  {
    id: 'gull-pa-bladene',
    title: 'Gull på bladene',
    level: 'lett',
    topic: 'trær',
    text: `Det er høst i treet, og bladene vil bli gull. Et blad er et monster uten barn: både \`left\` og \`right\` er \`null\`.

Gjør hvert blad i treet fra \`root\` gull med \`color = 'gold'\`. Monstrene som har barn beholder fargen sin, og treet skal ha samme form som før.`,
    hints: [
      'Lag en funksjon som kaller seg selv på `node.left` og `node.right`, og start den på `root`.',
      'Stopp når `node` er `null`. Ellers: mangler både `node.left` og `node.right`, er `node` et blad.',
      'Mal bladet med `node.color = \'gold\'`, og besøk begge sider etterpå. For et blad er de `null`, så det stopper av seg selv.',
    ],
    world: (r) => treeWorld(r, notGold(r, 9)),
    monster: COLOR_TREE_MONSTER,
    scaffold: `function paint(node) {
  if (!node) return
  // Er node et blad? Mal det gull. Besøk så begge sider.
}

paint(root)
`,
    solution: `function paint(node) {
  if (!node) return
  if (!node.left && !node.right) {
    node.color = 'gold'
    vis(node)
  }
  paint(node.left)
  paint(node.right)
}

paint(root)
`,
    check: (t) => {
      if (t.root !== t.live(t.start.root)) return '`root` skal fortsatt peke på det samme monsteret.'
      for (let i = 0; i < t.slots.length; i++) {
        const copy = t.start.slots[i]
        const node = t.slots[i]
        if (node.left !== t.live(copy.left) || node.right !== t.live(copy.right)) {
          return `${t.show(node)} har fått nye barn; treet skal ha samme form som før.`
        }
        const leaf = !copy.left && !copy.right
        if (leaf && node.color !== 'gold') return `${t.show(node)} er et blad og skal være 'gold', men er ${t.show(node.color)}.`
        if (!leaf && node.color !== copy.color) return `${t.show(node)} har barn og skal beholde fargen ${t.show(copy.color)}, men er ${t.show(node.color)}.`
      }
      return true
    },
  },
  {
    id: 'i-orden',
    title: 'I orden',
    level: 'lett',
    topic: 'trær',
    text: `Monstrene står i et tre fra \`root\`. Skriv \`function inOrder(node)\` som gir tilbake alle \`value\` i treet under \`node\` som en array, i denne rekkefølgen: først alt i venstre tre, så \`node\` selv, så alt i høyre tre.

Et tomt tre (\`null\`) gir en tom array.

Treet på scenen er et søketre: alt til venstre for et monster er mindre enn det, og alt til høyre er større. Se hvilken rekkefølge du får: på et søketre kommer verdiene i stigende rekkefølge!`,
    hints: [
      'Tenk på tre trinn for hvert monster: venstre tre, så monsteret selv, så høyre tre. Hva gir en tom plass?',
      'Et tomt tre gir `[]`. Ellers kaller du `inOrder(node.left)`, tar med `node.value` og kaller `inOrder(node.right)`.',
      'Sett svarene sammen med spredning: `[...inOrder(node.left), node.value, ...inOrder(node.right)]`.',
    ],
    world: (r) => bstWorld(things(r, 9)),
    monster: TREE_MONSTER,
    scaffold: `function inOrder(node) {
  if (!node) return []
  // Venstre tre, så node.value, så høyre tre
  return [node.value]
}

console.log(inOrder(root))
`,
    solution: `function inOrder(node) {
  if (!node) return []
  const left = inOrder(node.left)
  vis(node)
  const right = inOrder(node.right)
  return [...left, node.value, ...right]
}

console.log(inOrder(root))
`,
    exports: ['inOrder'],
    check: (t) => {
      const inOrder = t.fn('inOrder')
      const want = (n: any): any[] => (n ? [...want(n.left), n.value, ...want(n.right)] : [])
      const sketch = (n: any): string => (!n ? '·' : !n.left && !n.right ? String(n.value) : `${n.value}(${sketch(n.left)}, ${sketch(n.right)})`)
      const specs: unknown[] = [
        null,
        4,
        [5, 3, null],
        [5, null, 9],
        [5, [9, 2, null], [1, null, 7]],
        [8, [3, [1, null, 2], 6], [10, null, [14, 13, null]]],
      ]
      // Each case is the tree the code gets and the tree the answer is worked out from (the stage's start copy).
      const trees: [any, any][] = specs.map((spec) => {
        const tree = t.tree(spec)
        return [tree, tree]
      })
      trees.push([t.live(t.start.root), t.start.root])
      for (const [tree, model] of trees) {
        const got = inOrder(tree)
        const right = want(model)
        if (!Array.isArray(got)) return `inOrder skal gi en array, men gav ${t.show(got)}.`
        if (!t.same(got, right)) return `For ${model === t.start.root ? 'treet på scenen' : `treet ${sketch(model)}`} gav inOrder ${t.show(got)}, men skulle gitt ${t.show(right)}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Tree_traversal#In-order,_LNR',
  },
  {
    id: 'for-og-etter',
    title: 'Før og etter',
    level: 'middels',
    topic: 'trær',
    text: `Et tre kan gås gjennom på flere måter. Skriv \`function walks(node)\` som gir tilbake et objekt \`{ pre, post }\`. Begge er arrayer med \`value\` fra alle monstrene i treet under \`node\`.

I \`pre\` kommer hvert monster før barna sine: monsteret selv, så venstre tre, så høyre tre. I \`post\` kommer det etter barna: venstre tre, høyre tre, så monsteret selv.

Et tomt tre (\`null\`) gir \`{ pre: [], post: [] }\`.`,
    hints: [
      'Du kan fylle begge arrayene i samme gjennomgang. Lag `pre` og `post` utenfor, og la en hjelpefunksjon inni besøke treet.',
      'I hjelpefunksjonen: `pre.push(node.value)` før de to kallene på `node.left` og `node.right`, og `post.push(node.value)` etter dem.',
      'Hjelpefunksjonen stopper på `null`. Til slutt gir `walks` tilbake `{ pre, post }`.',
    ],
    world: (r) => treeWorld(r, things(r, 9)),
    monster: TREE_MONSTER,
    scaffold: `function walks(node) {
  const pre = []
  const post = []
  // Gå gjennom treet. Legg verdien i pre før barna, og i post etter dem.
  return { pre, post }
}

console.log(walks(root))
`,
    solution: `function walks(node) {
  const pre = []
  const post = []
  function visit(n) {
    if (!n) return
    pre.push(n.value)
    vis('før', n)
    visit(n.left)
    visit(n.right)
    post.push(n.value)
    vis('etter', n)
  }
  visit(node)
  return { pre, post }
}

console.log(walks(root))
`,
    exports: ['walks'],
    check: (t) => {
      const walks = t.fn('walks')
      const pre = (n: any): any[] => (n ? [n.value, ...pre(n.left), ...pre(n.right)] : [])
      const post = (n: any): any[] => (n ? [...post(n.left), ...post(n.right), n.value] : [])
      const sketch = (n: any): string => (!n ? '·' : !n.left && !n.right ? String(n.value) : `${n.value}(${sketch(n.left)}, ${sketch(n.right)})`)
      const specs: unknown[] = [
        null,
        4,
        [5, 3, null],
        [5, null, 9],
        [5, [9, 2, null], [1, null, 7]],
        [8, [3, [1, null, 2], 6], [10, null, [14, 13, null]]],
      ]
      // Each case is the tree the code gets and the tree the answer is worked out from (the stage's start copy).
      const trees: [any, any][] = specs.map((spec) => {
        const tree = t.tree(spec)
        return [tree, tree]
      })
      trees.push([t.live(t.start.root), t.start.root])
      for (const [tree, model] of trees) {
        const got = walks(tree)
        if (got === null || typeof got !== 'object') return `walks skal gi et objekt { pre, post }, men gav ${t.show(got)}.`
        const wantPre = pre(model)
        const wantPost = post(model)
        const of = model === t.start.root ? 'treet på scenen' : `treet ${sketch(model)}`
        if (!Array.isArray(got.pre) || !t.same(got.pre, wantPre)) return `For ${of} gav walks pre = ${t.show(got.pre)}, men det skal være ${t.show(wantPre)}.`
        if (!Array.isArray(got.post) || !t.same(got.post, wantPost)) return `For ${of} gav walks post = ${t.show(got.post)}, men det skal være ${t.show(wantPost)}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Tree_traversal#Depth-first_search',
  },
  {
    id: 'niva-for-niva',
    title: 'Nivå for nivå',
    level: 'middels',
    topic: 'trær',
    text: `Monstrene i treet står på nivåer: \`root\` øverst, barna under den, barnebarna under dem, og så videre. Skriv \`function levels(root)\` som gir tilbake en array med én array per nivå, det øverste først. Hver av dem har \`value\` fra monstrene på nivået, fra venstre mot høyre.

Et tomt tre (\`null\`) gir \`[]\`.

Bruk en kø: ta et monster ut foran, og still barna bakerst.`,
    hints: [
      'Start med en kø som har `root` i seg (eller er tom). Så lenge køen ikke er tom, tar du ut et monster og stiller barna bakerst.',
      'For å vite hvor et nivå slutter: før hver runde står bare monstre fra ett nivå i køen. Ta ut akkurat `queue.length` monstre, og legg verdiene i en egen array.',
      'Legg den ferdige arrayen i svaret etter hver runde. `left` og `right` kan være `null`: still bare ekte monstre i køen.',
    ],
    world: (r) => treeWorld(r, things(r, 10)),
    monster: TREE_MONSTER,
    scaffold: `function levels(root) {
  const result = []
  const queue = root ? [root] : []
  while (queue.length) {
    // Ta ut hele nivået som står i køen, og still barna bakerst
    break
  }
  return result
}

console.log(levels(root))
`,
    solution: `function levels(root) {
  const result = []
  const queue = root ? [root] : []
  while (queue.length) {
    const row = []
    for (let n = queue.length; n > 0; n--) {
      const node = queue.shift()
      row.push(node.value)
      vis(node)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
    result.push(row)
  }
  return result
}

console.log(levels(root))
`,
    exports: ['levels'],
    check: (t) => {
      const levels = t.fn('levels')
      const want = (tree: any): any[][] => {
        const rows: any[][] = []
        let row = tree ? [tree] : []
        while (row.length) {
          rows.push(row.map((n) => n.value))
          row = row.flatMap((n) => [n.left, n.right]).filter((n) => n)
        }
        return rows
      }
      const sketch = (n: any): string => (!n ? '·' : !n.left && !n.right ? String(n.value) : `${n.value}(${sketch(n.left)}, ${sketch(n.right)})`)
      const specs: unknown[] = [
        null,
        4,
        [5, 3, null],
        [1, null, [2, null, [3, null, 4]]],
        [5, [9, 2, null], [1, null, 7]],
        [8, [3, [1, null, 2], 6], [10, null, [14, 13, null]]],
      ]
      // Each case is the tree the code gets and the tree the answer is worked out from (the stage's start copy).
      const trees: [any, any][] = specs.map((spec) => {
        const tree = t.tree(spec)
        return [tree, tree]
      })
      trees.push([t.live(t.start.root), t.start.root])
      for (const [tree, model] of trees) {
        const got = levels(tree)
        const right = want(model)
        if (!Array.isArray(got) || got.some((row) => !Array.isArray(row))) return `levels skal gi en array av arrayer, men gav ${t.show(got)}.`
        if (!t.same(got, right)) return `For ${model === t.start.root ? 'treet på scenen' : `treet ${sketch(model)}`} gav levels ${t.show(got)}, men det skal være ${t.show(right)}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Breadth-first_search',
  },
  {
    id: 'finn-i-soketreet',
    title: 'Finn i søketreet',
    level: 'lett',
    topic: 'trær',
    text: `Monstrene står i et søketre fra \`root\`: alt til venstre for et monster har mindre \`value\`, alt til høyre har større. Det gjør det raskt å lete.

Skriv \`function find(node, value)\` som gir tilbake monsteret i treet under \`node\` som har akkurat denne \`value\`, eller \`null\` hvis ingen har den. I hvert monster går du bare ett sted videre: til venstre om du leter etter noe mindre, til høyre om det er større.

Et tomt tre (\`null\`) gir \`null\`. Sjekken teller hvor mange verdier du leser, så den merker om du leter i hele treet.`,
    hints: [
      'Sammenlign `value` med `node.value`. Er de like, er du fremme.',
      'Er `value` mindre enn `node.value`, kan monsteret bare ligge til venstre: `find(node.left, value)`. Ellers til høyre.',
      'Når du kommer til `null`, er plassen tom og monsteret finnes ikke. Det svarer også på et tomt tre: `if (!node) return null`.',
    ],
    world: (r) => bstWorld(things(r, 9)),
    monster: TREE_MONSTER,
    scaffold: `function find(node, value) {
  if (!node) return null
  // Er node monsteret du leter etter? Ellers: gå til venstre eller høyre.
  return null
}

console.log(find(root, G.value) === G)
`,
    solution: `function find(node, value) {
  if (!node) return null
  vis(node)
  if (value === node.value) return node
  return value < node.value ? find(node.left, value) : find(node.right, value)
}

console.log(find(root, G.value) === G)
`,
    exports: ['find'],
    check: (t) => {
      const find = t.fn('find')
      const tall = (lo: number, hi: number): unknown => {
        if (lo > hi) return null
        const mid = Math.floor((lo + hi) / 2)
        return [mid * 10, tall(lo, mid - 1), tall(mid + 1, hi)]
      }
      const nodes: any[] = []
      const collect = (n: any) => { if (n) { nodes.push(n); collect(n.left); collect(n.right) } }
      const tree: any = t.tree(tall(1, 31))
      collect(tree)
      const byValue = new Map(nodes.map((n) => [n.value, n]))
      let reads = 0
      for (const n of nodes) {
        const v = n.value
        Object.defineProperty(n, 'value', { get() { reads++; return v }, configurable: true, enumerable: true })
      }
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      const lookups = [...byValue.keys(), 5, 155, 315, 0, -20]
      for (const value of lookups) {
        reads = 0
        const got = find(tree, value)
        const want = byValue.get(value) ?? null
        if (got !== want) {
          return want
            ? `I et søketre med ${nodes.length} monstre gav find ${name(got)} når den skulle finne ${value}, men monsteret finnes.`
            : `I et søketre med ${nodes.length} monstre gav find ${name(got)} når den skulle finne ${value}, men ingen har den verdien. Svaret skal være null.`
        }
        if (reads > 20) return `find leste ${reads} verdier for å lete etter ${value} i et tre med ${nodes.length} monstre. I et søketre går du til venstre eller høyre i hvert monster, du trenger ikke lete overalt.`
      }
      if (find(null, 5) !== null) return 'find(null, 5) skal gi null.'
      const one = t.tree(8)
      if (find(one, 8) !== one || find(one, 9) !== null) return 'For et tre med ett monster skal find gi monsteret når verdien er riktig, og ellers null.'
      const line: any = t.tree([10, null, [20, null, 30]])
      if (find(line, 30) !== line.right.right || find(line, 5) !== null) return 'find fant ikke riktig monster i et tre som bare går til høyre.'
      for (const node of t.slots) {
        if (find(t.root, node.value) !== node) return `find(root, ${node.value}) skal gi ${t.show(node)}, men gav ${t.show(find(t.root, node.value))}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Binary_search_tree#Searching',
  },
  {
    id: 'minst-og-storst',
    title: 'Minst og størst',
    level: 'lett',
    topic: 'trær',
    text: `I et søketre ligger det minste monsteret lengst ut til venstre, og det største lengst ut til høyre. Du trenger ikke sammenligne noe for å finne dem.

Skriv \`function extremes(root)\` som gir tilbake \`[smallest, biggest]\`, de to monstrene (ikke verdiene), ved å bare gå til venstre så langt det går, og så til høyre så langt det går.

Et tomt tre (\`null\`) gir \`null\`. Har treet bare ett monster, er det både minst og størst.`,
    hints: [
      'Det minste har ingen `left`. Start på toppen og gå til `left` så lenge det finnes en.',
      'Gjør det samme med `right` for å finne det største. Det er to små løkker.',
      'Husk `if (!root) return null` først, og gi til slutt tilbake `[smallest, biggest]`.',
    ],
    world: (r) => bstWorld(things(r, 9)),
    monster: TREE_MONSTER,
    scaffold: `function extremes(root) {
  if (!root) return null
  let smallest = root
  let biggest = root
  // Gå til venstre så langt det går, og til høyre så langt det går
  return [smallest, biggest]
}

const [smallest, biggest] = extremes(root)
console.log(smallest.value, biggest.value)
`,
    solution: `function extremes(root) {
  if (!root) return null
  let smallest = root
  while (smallest.left) {
    smallest = smallest.left
    vis(smallest)
  }
  let biggest = root
  while (biggest.right) {
    biggest = biggest.right
    vis(biggest)
  }
  return [smallest, biggest]
}

const [smallest, biggest] = extremes(root)
console.log(smallest.value, biggest.value)
`,
    exports: ['extremes'],
    check: (t) => {
      const extremes = t.fn('extremes')
      const tall = (lo: number, hi: number): unknown => {
        if (lo > hi) return null
        const mid = Math.floor((lo + hi) / 2)
        return [mid * 10, tall(lo, mid - 1), tall(mid + 1, hi)]
      }
      // Each case is the tree the code gets, the tree the answer is worked out from (the stage's start copy), and how to
      // turn an item of that model into the one the code sees.
      const fresh = [
        t.tree(7),
        t.tree([5, 3, null]),
        t.tree([5, null, 9]),
        t.tree([40, [30, [20, [10, null, 15], null], null], null]),
        t.tree([10, null, [20, null, [30, [25, null, null], 40]]]),
        t.tree(tall(1, 31)),
      ]
      const trees: { tree: any; model: any; live: (n: any) => any }[] = fresh.map((tree) => ({ tree, model: tree, live: (n: any) => n }))
      trees.push({ tree: t.live(t.start.root), model: t.start.root, live: (n: any) => t.live(n) })
      let reads = 0
      const watch = (n: any) => {
        if (!n) return
        const v = n.value
        Object.defineProperty(n, 'value', { get() { reads++; return v }, configurable: true, enumerable: true })
        watch(n.left)
        watch(n.right)
      }
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      for (const { tree, model, live } of trees) {
        let lo = model
        while (lo.left) lo = lo.left
        let hi = model
        while (hi.right) hi = hi.right
        if (tree === model) watch(tree)
        reads = 0
        const got = extremes(tree)
        if (!Array.isArray(got) || got.length !== 2) return `extremes skal gi en array [smallest, biggest], men gav ${t.show(got)}.`
        if (got[0] !== live(lo)) return `Det minste er det som står lengst til venstre (${name(live(lo))}), men extremes ga ${name(got[0])} først.`
        if (got[1] !== live(hi)) return `Det største er det som står lengst til høyre (${name(live(hi))}), men extremes ga ${name(got[1])} sist.`
        if (reads > 10) return `extremes leste ${reads} verdier. I et søketre finner du ytterpunktene uten å se på verdiene: bare gå til venstre og til høyre.`
      }
      if (extremes(null) !== null) return 'extremes(null) skal gi null.'
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Binary_search_tree',
  },
  {
    id: 'inn-i-soketreet',
    title: 'Inn i søketreet',
    level: 'middels',
    topic: 'trær',
    text: `Monstrene står i et søketre fra \`root\`: alt til venstre for et monster har mindre \`value\`, alt til høyre har større. Ved siden av står et monster for seg selv, \`guest\`, som vil være med.

Heng \`guest\` inn som et nytt blad der det hører hjemme, så treet fortsatt er et søketre. Gå ned fra \`root\`: er \`guest.value\` mindre enn monsteret du står på, går du til venstre, ellers til høyre. Møter du en tom plass, heng \`guest\` der.

Ingen andre lenker i treet skal endres.`,
    hints: [
      'Start med `let node = root`. Sammenlign `guest.value` med `node.value` for å se om du skal til venstre eller høyre.',
      'Ligger det et monster på den siden, flytt `node` dit og gjør det samme igjen. Er plassen `null`, er du fremme.',
      'Heng gjesten der med `node.left = guest` eller `node.right = guest`. Gjesten har ingen barn, så den blir et blad.',
    ],
    world: (r) => {
      const specs = things(r, 10)
      const { nodes } = bstSpecs(specs.slice(0, 9))
      return makeWorld([...nodes, { ...specs[9], left: null, right: null }], { root: at(0), guest: at(9) })
    },
    monster: TREE_MONSTER,
    views: { guest: 'pointer' },
    scaffold: `let node = root
while (true) {
  // Skal guest til venstre eller høyre for node?
  // Er plassen ledig, heng guest der. Ellers: gå videre.
  break
}
`,
    solution: `let node = root
while (true) {
  vis(node, guest)
  if (guest.value < node.value) {
    if (!node.left) {
      node.left = guest
      break
    }
    node = node.left
  } else {
    if (!node.right) {
      node.right = guest
      break
    }
    node = node.right
  }
}
vis(guest)
`,
    check: (t) => {
      const guest = t.live(t.start.guest)!
      const value = guest.value
      if (t.root !== t.live(t.start.root)) return '`root` skal fortsatt peke på det samme monsteret.'
      // Where the guest belongs: the last item on the way down from the start root.
      let wantParent: any = null
      let wantSide = ''
      let node: any = t.start.root
      for (let steps = 0; node && steps < 100; steps++) {
        wantParent = node
        wantSide = value < node.value ? 'left' : 'right'
        node = node[wantSide]
      }
      const parent = t.live(wantParent)!
      let hungUnder: any = null
      let hungSide = ''
      for (const item of t.slots) {
        if (item === guest) continue
        for (const side of ['left', 'right']) {
          if (item[side] === guest) { hungUnder = item; hungSide = side }
        }
      }
      if (!hungUnder) return `${t.show(guest)} henger ikke i treet ennå.`
      if (hungUnder !== parent || hungSide !== wantSide) {
        return `${t.show(guest)} henger på ${hungSide === 'left' ? 'venstre' : 'høyre'} side av ${t.show(hungUnder)}, men det hører hjemme på ${wantSide === 'left' ? 'venstre' : 'høyre'} side av ${t.show(parent)}.`
      }
      if (guest.left !== null || guest.right !== null) return `${t.show(guest)} skal være et blad, men har fått barn.`
      for (let i = 0; i < t.slots.length; i++) {
        const copy = t.start.slots[i]
        const item = t.slots[i]
        if (item === guest) continue
        for (const side of ['left', 'right']) {
          const want = copy === wantParent && side === wantSide ? guest : t.live(copy[side])
          if (item[side] !== want) return `${t.show(item)} har fått en annen ${side} enn det skulle ha: ${t.show(item[side])} i stedet for ${t.show(want)}.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Binary_search_tree#Insertion',
  },
  {
    id: 'er-det-et-soketre',
    title: 'Er det et søketre?',
    level: 'middels',
    topic: 'trær',
    text: `I et søketre er alt i venstre tre mindre enn monsteret, og alt i høyre tre er større. Ikke bare barna: alle monstrene under, uansett hvor dypt de ligger. Alle verdiene er forskjellige.

Skriv \`function isSearchTree(node)\` som gir \`true\` eller \`false\` for treet under \`node\`. Et tomt tre (\`null\`) og et enkelt monster er søketrær.

Se opp for lumske trær: hvert monster kan passe fint med sin egen forelder og likevel stå på feil side av noen høyere oppe, for eksempel en 12 langt nede til venstre for en 10. Da er det ikke et søketre. Sjekken prøver slike trær.`,
    hints: [
      'Det holder ikke å sjekke at `node.left.value < node.value` og `node.right.value > node.value`. Et monster langt nede kan bryte regelen mot en forelder høyere opp.',
      'Gi funksjonen to grenser: `node.value` må ligge mellom `min` og `max`. Start med `-Infinity` og `Infinity`.',
      'Går du til venstre, blir `max` til `node.value`. Går du til høyre, blir `min` til `node.value`. Ligger verdien utenfor grensene, er svaret `false`.',
    ],
    world: (r) => {
      const specs = things(r, 9)
      const { nodes, left, right } = bstSpecs(specs)
      // Sometimes the biggest in the left subtree gets a value above the root: fine for its parent, wrong for the root.
      if (r() < 0.6 && left[0] !== null) {
        let big = left[0]
        while (right[big] !== null) big = right[big]!
        nodes[big].value = Math.max(...specs.map((s) => s.value as number)) + 1
      }
      return makeWorld(nodes, { root: at(0) })
    },
    monster: TREE_MONSTER,
    scaffold: `function isSearchTree(node) {
  // Er alt til venstre mindre, og alt til høyre større?
  return true
}

console.log(isSearchTree(root))
`,
    solution: `function isSearchTree(node, min = -Infinity, max = Infinity) {
  if (!node) return true
  if (node.value <= min || node.value >= max) {
    vis('feil her', node)
    return false
  }
  vis(node)
  return isSearchTree(node.left, min, node.value) && isSearchTree(node.right, node.value, max)
}

console.log(isSearchTree(root))
`,
    exports: ['isSearchTree'],
    check: (t) => {
      const isSearchTree = t.fn('isSearchTree')
      const inOrder = (n: any): any[] => (n ? [...inOrder(n.left), n.value, ...inOrder(n.right)] : [])
      const sketch = (n: any): string => (!n ? '·' : !n.left && !n.right ? String(n.value) : `${n.value}(${sketch(n.left)}, ${sketch(n.right)})`)
      const specs: unknown[] = [
        null,
        5,
        [5, 3, 8],
        [5, 8, 3],
        [10, [5, 1, 7], [15, 12, 20]],
        [10, [5, 1, 12], 15],
        [10, 5, [15, 6, 20]],
        [50, [30, 20, [40, 35, 60]], 70],
        [8, [3, [1, null, 2], 6], [10, null, [14, 13, null]]],
        [4, [2, 1, 3], [6, 0, 7]],
        [4, [2, 1, 3], [6, 5, 7]],
        [20, [10, null, [15, null, 25]], 30],
      ]
      // Each case is the tree the code gets and the tree the answer is worked out from (the stage's start copy).
      const trees: [any, any][] = specs.map((spec) => {
        const tree = t.tree(spec)
        return [tree, tree]
      })
      trees.push([t.live(t.start.root), t.start.root])
      for (const [tree, model] of trees) {
        const values = inOrder(model)
        const want = values.every((v, i) => i === 0 || values[i - 1] < v)
        const got = isSearchTree(tree)
        if (got !== want) {
          return `For ${model === t.start.root ? 'treet på scenen' : `treet ${sketch(model)}`} gav isSearchTree ${t.show(got)}, men det ${want ? 'er et søketre' : 'er ikke et søketre'}.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Binary_search_tree',
  },
  {
    id: 'felles-forfar',
    title: 'Nærmeste felles forfar',
    level: 'middels',
    topic: 'trær',
    text: `Fra hvert monster i treet går det en vei opp til \`root\`. To monstre, \`a\` og \`b\`, har felles forfedre: monstrene som har begge under seg. Regner du et monster som sin egen forfar, kan svaret også være \`a\` eller \`b\` selv.

Skriv \`function lca(root, a, b)\` («lowest common ancestor») som gir tilbake det laveste monsteret som har både \`a\` og \`b\` under seg, eller er ett av dem. Treet er ikke et søketre, så du kan ikke bruke verdiene. På scenen står \`a\` og \`b\` som flagg.`,
    hints: [
      'Spør de to trærne under `root`: ligger `a` eller `b` til venstre? Til høyre?',
      'La funksjonen gi tilbake `root` hvis `root` er `a` eller `b`, og `null` hvis `root` er `null`. Kall den så på `root.left` og `root.right`.',
      'Gir begge sider et svar (ikke `null`), ligger `a` og `b` på hver sin side, og `root` er den felles forfaren. Ellers er svaret det ene sidesvaret.',
    ],
    world: (r) => {
      const world = treeWorld(r, things(r, 10))
      const parent = world.items.map(() => -1)
      world.items.forEach((_, i) => {
        for (const key of ['left', 'right']) {
          const c = child(world, i, key)
          if (c !== null) parent[c] = i
        }
      })
      const up = (i: number): number[] => {
        const path = [i]
        while (parent[path[path.length - 1]] >= 0) path.push(parent[path[path.length - 1]])
        return path
      }
      // Two items where neither is above the other, and (when it can be) their meeting point is not the root.
      let pair = [1, 2]
      for (let k = 0; k < 60; k++) {
        const a = int(r, 1, 9)
        const b = int(r, 1, 9)
        if (a === b || up(a).includes(b) || up(b).includes(a)) continue
        const meet = up(a).find((x) => up(b).includes(x))
        if (meet !== 0 || k >= 40) { pair = [a, b]; break }
      }
      pointer(world, 'a', pair[0])
      pointer(world, 'b', pair[1])
      return world
    },
    monster: TREE_MONSTER,
    views: { a: 'pointer', b: 'pointer' },
    scaffold: `function lca(root, a, b) {
  if (!root) return null
  // Er root a eller b? Ellers: spør treet til venstre og treet til høyre.
  return root
}

const top = lca(root, a, b)
console.log(top.value)
`,
    solution: `function lca(root, a, b) {
  if (!root) return null
  vis(root)
  if (root === a || root === b) return root
  const left = lca(root.left, a, b)
  const right = lca(root.right, a, b)
  if (left && right) return root
  return left || right
}

const top = lca(root, a, b)
console.log(top.value)
`,
    exports: ['lca'],
    check: (t) => {
      const lca = t.fn('lca')
      const name = (n: any) => (n && typeof n === 'object' && t.slots.indexOf(n) < 0 ? `monsteret med ${n.value}` : t.show(n))
      // Each case is the tree the code gets, the tree the answer is worked out from (the stage's start copy), and how to
      // turn an item of that model into the one the code sees.
      const fresh = [
        t.tree(9),
        t.tree([1, [2, 4, 5], [3, 6, 7]]),
        t.tree([1, [2, [4, 8, null], 5], [3, null, [6, null, 7]]]),
        t.tree([1, null, [2, null, [3, null, 4]]]),
      ]
      const trees: { tree: any; model: any; live: (n: any) => any }[] = fresh.map((tree) => ({ tree, model: tree, live: (n: any) => n }))
      trees.push({ tree: t.live(t.start.root), model: t.start.root, live: (n: any) => t.live(n) })
      for (const { tree, model, live } of trees) {
        const nodes: any[] = []
        const parent = new Map()
        const collect = (n: any, above: any) => {
          if (!n) return
          nodes.push(n)
          parent.set(n, above)
          collect(n.left, n)
          collect(n.right, n)
        }
        collect(model, null)
        const up = (n: any) => {
          const path = []
          for (let x = n; x; x = parent.get(x)) path.push(x)
          return path
        }
        for (const a of nodes) {
          for (const b of nodes) {
            const above = up(a)
            const want = live(up(b).find((x) => above.includes(x)))
            const got = lca(tree, live(a), live(b))
            if (got !== want) return `lca gav ${name(got)} for ${name(live(a))} og ${name(live(b))}, men den nærmeste felles forfaren er ${name(want)}.`
          }
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Lowest_common_ancestor',
  },
  {
    id: 'lengste-sti',
    title: 'Den lengste stien',
    level: 'vanskelig',
    topic: 'trær',
    text: `Hvor langt kan to monstre i treet stå fra hverandre? Mellom to monstre er det én vei: opp til nærmeste felles forfar og ned igjen. Lengden er antall steg på veien, ikke antall monstre.

Skriv \`function diameter(root)\` som gir tilbake lengden på den lengste veien mellom to monstre i treet. Veien trenger ikke gå gjennom \`root\`. Et tomt tre og et tre med ett monster gir 0.`,
    hints: [
      'Den lengste veien har et høyeste punkt, monsteret den snur i. Der er veien like lang som de to dypeste sidene under monsteret, lagt sammen.',
      'Skriv en hjelper som gir høyden på treet under et monster, talt i monstre. Under hvert monster er `left + right` (de to høydene) den lengste veien som snur der.',
      'Hold en variabel `best` utenfor hjelperen og oppdater den i hvert monster med `Math.max(best, left + right)`. Svaret er `best`, ikke høyden til roten.',
    ],
    world: (r) => treeWorld(r, things(r, 10)),
    monster: TREE_MONSTER,
    scaffold: `function diameter(root) {
  // Hvor høye er de to sidene under hvert monster? Husk den lengste veien som snur der.
  return 0
}

console.log(diameter(root))
`,
    solution: `function diameter(root) {
  let best = 0

  // Høyden i antall monstre. Underveis husker vi den lengste veien som snur i hvert monster.
  function depth(node) {
    if (!node) return 0
    const left = depth(node.left)
    const right = depth(node.right)
    if (left + right > best) {
      best = left + right
      vis('lengst så langt: ' + best, node)
    }
    return 1 + Math.max(left, right)
  }

  depth(root)
  return best
}

console.log(diameter(root))
`,
    exports: ['diameter'],
    check: (t) => {
      const diameter = t.fn('diameter')
      // The right answer the slow way: the farthest pair, by walking out from every item.
      const longest = (tree: any): number => {
        const adj = new Map<any, any[]>()
        const add = (n: any) => {
          if (!n) return
          adj.set(n, [])
          add(n.left)
          add(n.right)
        }
        add(tree)
        for (const n of adj.keys()) {
          for (const c of [n.left, n.right]) {
            if (c) { adj.get(n)!.push(c); adj.get(c)!.push(n) }
          }
        }
        let best = 0
        for (const from of adj.keys()) {
          const dist = new Map<any, number>([[from, 0]])
          const queue = [from]
          for (let i = 0; i < queue.length; i++) {
            for (const next of adj.get(queue[i])!) {
              if (!dist.has(next)) { dist.set(next, dist.get(queue[i])! + 1); queue.push(next) }
            }
          }
          for (const d of dist.values()) best = Math.max(best, d)
        }
        return best
      }
      const sketch = (n: any): string => (!n ? '·' : !n.left && !n.right ? String(n.value) : `${n.value}(${sketch(n.left)}, ${sketch(n.right)})`)
      const specs: unknown[] = [
        null,
        5,
        [5, 3, null],
        [5, 3, 8],
        [1, null, [2, null, [3, null, [4, null, 5]]]],
        [1, 2, [3, [4, [6, 8, null], null], [5, null, [7, null, 9]]]],
        [1, [2, [3, [4, 5, null], null], null], [6, null, null]],
        [1, [2, [3, 4, 5], [6, 7, 8]], [9, 10, 11]],
        [1, [2, null, [3, null, [4, 5, null]]], [6, [7, [8, null, 9], null], null]],
      ]
      // Each case is the tree the code gets and the tree the answer is worked out from (the stage's start copy).
      const trees: [any, any][] = specs.map((spec) => {
        const tree = t.tree(spec)
        return [tree, tree]
      })
      trees.push([t.live(t.start.root), t.start.root])
      for (const [tree, model] of trees) {
        const want = longest(model)
        const got = diameter(tree)
        if (got !== want) return `For ${model === t.start.root ? 'treet på scenen' : `treet ${sketch(model)}`} gav diameter ${t.show(got)}, men den lengste veien har ${want} steg.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Distance_(graph_theory)',
  },
  {
    id: 'ut-av-soketreet',
    title: 'Ut av søketreet',
    level: 'vanskelig',
    topic: 'trær',
    text: `Monstrene står i et søketre fra \`root\`: alt til venstre for et monster har mindre \`value\`, alt til høyre har større. Monsteret \`gone\` skal ut. Fjern det, slik at \`root\` fortsatt er et søketre med alle de andre monstrene. Ingen verdier skal endres.

Det kommer an på hvor mange barn \`gone\` har:
- ingen barn: det klippes bare av
- ett barn: barnet tar over plassen
- to barn: det neste større monsteret tar plassen, det som står lengst til venstre i høyre tre. Det må først ut av sin gamle plass.

Forelderen må peke på monsteret som tar over, og \`gone\` kan også være \`root\`. Her har \`gone\` to barn.`,
    hints: [
      'Gå ned fra `root` etter `gone.value` og husk forelderen din underveis. Har `gone` ingen forelder, er det `root`.',
      'Med to barn finner du det neste større ved å gå til `gone.right` og så til `left` så langt det går. Det har ikke noe venstre barn selv.',
      'Det neste større må først ut av sin gamle plass: la forelderen til det peke på det høyre barnet til det i stedet. Så overtar det `left` og `right` fra `gone`, og forelderen til `gone` (eller `root`) peker på det.',
    ],
    world: (r) => {
      // The first value is a middle one, so the root has two children and there is always something to remove.
      const all = things(r, 9)
      const sorted = [...all].sort((a, b) => (a.value as number) - (b.value as number))
      const middle = sorted[4]
      const specs = [middle, ...all.filter((s) => s !== middle)]
      const { nodes, left, right } = bstSpecs(specs)
      const two = nodes.map((_, i) => i).filter((i) => left[i] !== null && right[i] !== null)
      const inner = two.filter((i) => i !== 0)
      const deep = inner.filter((i) => left[right[i]!] !== null)
      const gone = deep.length ? pick(r, deep) : inner.length ? pick(r, inner) : 0
      return makeWorld(nodes, { root: at(0), gone: at(gone) })
    },
    monster: TREE_MONSTER,
    views: { gone: 'pointer' },
    scaffold: `function remove(node, target) {
  if (!node) return null
  // Er node monsteret som skal ut? Ellers: fjern det fra venstre eller høyre tre.
  return node
}

root = remove(root, gone)
`,
    solution: `function remove(node, target) {
  if (!node) return null
  vis(node, target)
  if (target.value < node.value) {
    node.left = remove(node.left, target)
    return node
  }
  if (target.value > node.value) {
    node.right = remove(node.right, target)
    return node
  }
  // Her er node = target
  if (!node.left) return node.right
  if (!node.right) return node.left
  // To barn: det neste større står lengst til venstre i høyre tre
  let next = node.right
  while (next.left) next = next.left
  next.right = remove(node.right, next)
  next.left = node.left
  return next
}

root = remove(root, gone)
gone.left = null
gone.right = null
vis('ferdig')
`,
    check: (t) => {
      const gone = t.live(t.start.gone)!
      const order: any[] = []
      const seen = new Set<any>()
      let problem = ''
      const walk = (n: any): void => {
        if (!n || problem) return
        if (typeof n !== 'object') { problem = `I treet står det ${t.show(n)}, som ikke er et monster.`; return }
        if (seen.has(n) || seen.size > 100) { problem = `${t.show(n)} står flere steder i treet, eller treet går i ring.`; return }
        seen.add(n)
        walk(n.left)
        order.push(n)
        walk(n.right)
      }
      walk(t.root)
      if (problem) return problem
      if (seen.has(gone)) return `${t.show(gone)} henger fortsatt i treet.`
      for (const node of t.slots) {
        if (node !== gone && !seen.has(node)) return `${t.show(node)} er ikke med i treet lenger. Bare ${t.show(gone)} skal ut.`
      }
      if (order.length !== t.slots.length - 1) return `Treet har ${order.length} monstre, men skal ha ${t.slots.length - 1}.`
      for (let i = 0; i < t.slots.length; i++) {
        if (t.slots[i].value !== t.start.slots[i].value) return `Verdien til ${t.show(t.slots[i])} er endret; flytt monstrene, ikke verdiene.`
      }
      for (let i = 1; i < order.length; i++) {
        if (order[i - 1].value >= order[i].value) return `Treet er ikke et søketre: ${t.show(order[i])} (${order[i].value}) står på feil side av ${t.show(order[i - 1])} (${order[i - 1].value}).`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Binary_search_tree#Deletion',
  },
  {
    id: 'balansert-tre',
    title: 'Bygg et balansert tre',
    level: 'middels',
    topic: 'trær',
    text: `Monstrene i \`items\` står sortert etter \`value\`, det minste først, og \`root\` er tom (\`null\`). Heng alle monstrene sammen til et søketre i \`root\`, med \`left\` og \`right\`, så lavt som mulig.

Et søketre blir lavest når de to sidene har omtrent like mange monstre. Ta monsteret midt i lista til topp, la de minste bli venstre tre og de største høyre tre, og gjør det samme i hvert av dem.

Alle monstrene skal være med, og ingen verdier skal endres. Med \`n\` monstre kan treet ikke bli lavere enn \`Math.ceil(Math.log2(n + 1))\` nivåer, og det er så lavt det skal bli.`,
    hints: [
      'Skriv en funksjon `build(from, to)` som bygger et tre av monstrene fra plass `from` og opp til (men ikke med) plass `to`, og gir tilbake toppen.',
      'Midten er `Math.floor((from + to) / 2)`. Den blir toppen. Venstre tre bygges av plassene før den, høyre tre av plassene etter.',
      'Er `from >= to`, er det ingen monstre igjen: gi `null`. Til slutt: `root = build(0, items.length)`.',
    ],
    world: (r) => {
      const specs = things(r, int(r, 7, 10))
      const order = specs.map((_, i) => i).sort((a, b) => (specs[a].value as number) - (specs[b].value as number))
      return arrayWorld(specs, order, 'items', { root: null })
    },
    monster: TREE_MONSTER,
    scaffold: `function build(from, to) {
  if (from >= to) return null
  // Ta monsteret midt mellom from og to til topp, og bygg venstre og høyre tre av resten
  return null
}

root = build(0, items.length)
`,
    solution: `function build(from, to) {
  if (from >= to) return null
  const middle = Math.floor((from + to) / 2)
  const node = items[middle]
  vis(node)
  node.left = build(from, middle)
  node.right = build(middle + 1, to)
  return node
}

root = build(0, items.length)
`,
    check: (t) => {
      const want = t.before('items')
      const order: any[] = []
      const seen = new Set<any>()
      let problem = ''
      const height = (n: any): number => {
        if (!n || problem) return 0
        if (typeof n !== 'object') { problem = `I treet står det ${t.show(n)}, som ikke er et monster.`; return 0 }
        if (seen.has(n) || seen.size > 100) { problem = `${t.show(n)} står flere steder i treet, eller treet går i ring.`; return 0 }
        seen.add(n)
        const left = height(n.left)
        order.push(n)
        return 1 + Math.max(left, height(n.right))
      }
      if (!t.root) return '`root` er fortsatt tom. Sett `root` til monsteret som skal stå øverst.'
      const levels = height(t.root)
      if (problem) return problem
      for (const node of want) {
        if (!seen.has(node)) return `${t.show(node)} er ikke med i treet.`
      }
      if (order.length !== want.length) return `Treet har ${order.length} monstre, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.slots[i].value !== t.start.slots[i].value) return `Verdien til ${t.show(t.slots[i])} er endret; hent monstrene fra \`items\`, ikke lag nye.`
        if (order[i] !== want[i]) return `Treet er ikke et søketre: ${t.show(order[i])} står på feil side av ${t.show(order[i - 1] ?? want[i])}.`
      }
      const lowest = Math.ceil(Math.log2(want.length + 1))
      if (levels > lowest) return `Treet har ${levels} nivåer, men ${want.length} monstre kan stå på ${lowest}. Ta alltid monsteret i midten til topp.`
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Binary_search_tree#Optimal_binary_search_trees',
  },
  {
    id: 'treet-fra-to-turer',
    title: 'Treet fra to turer',
    level: 'vanskelig',
    topic: 'trær',
    text: `Treet har falt fra hverandre: monstrene står løse, uten \`left\` og \`right\`. Men noen husket to turer gjennom det. \`pre\` er monstrene i pre-orden (seg selv, så venstre, så høyre), og \`ino\` er de samme monstrene i in-orden (venstre, seg selv, så høyre).

Bygg treet opp igjen: sett \`left\` og \`right\` på monstrene, og la \`root\` peke på roten. To turer er nok til å finne fram, så lenge ingen monstre står to ganger.`,
    hints: [
      'Det første i `pre` er roten. Finn den i `ino`: alt til venstre for den der er venstre deltre, alt til høyre er høyre deltre.',
      'Venstre deltre har like mange monstre som det står til venstre for roten i `ino`. De kommer rett etter roten i `pre`, og høyre deltre kommer etter dem.',
      'Skriv en funksjon `build(preStart, inStart, size)` som gir tilbake roten for et deltre, og kaller seg selv for venstre og høyre del. Et deltre med størrelse 0 er `null`.',
    ],
    world: (r) => {
      // A random tree, written down as two walks, with every link taken away.
      const items = colored(r, 8)
      const left: (number | null)[] = items.map(() => null)
      const right: (number | null)[] = items.map(() => null)
      for (let i = 1; i < items.length; i++) {
        const free: [number, 'l' | 'r'][] = []
        for (let j = 0; j < i; j++) {
          if (left[j] === null) free.push([j, 'l'])
          if (right[j] === null) free.push([j, 'r'])
        }
        const [parent, side] = pick(r, free)
        if (side === 'l') left[parent] = i
        else right[parent] = i
      }
      const pre: number[] = []
      const ino: number[] = []
      const walk = (i: number | null) => {
        if (i === null) return
        pre.push(i)
        walk(left[i])
        ino.push(i)
        walk(right[i])
      }
      walk(0)
      // The monsters' fields are null; the roots hold the two walks.
      return makeWorld(items.map((s) => ({ ...s, left: null, right: null })), { pre: pre.map(at), ino: ino.map(at), root: null })
    },
    monster: COLOR_TREE_MONSTER,
    scaffold: `function build(preStart, inStart, size) {
  if (size === 0) return null
  const node = pre[preStart]
  // Hvor står node i ino? Hvor mange monstre er til venstre for det?
  return node
}

root = build(0, 0, pre.length)
`,
    solution: `function build(preStart, inStart, size) {
  if (size === 0) return null
  const node = pre[preStart]
  const at = ino.indexOf(node, inStart)
  const leftSize = at - inStart
  node.left = build(preStart + 1, inStart, leftSize)
  node.right = build(preStart + 1 + leftSize, at + 1, size - 1 - leftSize)
  vis(node)
  return node
}

root = build(0, 0, pre.length)
`,
    check: (t) => {
      const pre = t.before('pre')
      const ino = t.before('ino')
      const gotPre: unknown[] = []
      const gotIno: unknown[] = []
      const seen = new Set()
      let loop = false
      const walk = (node: any) => {
        if (!node || loop) return
        if (seen.has(node)) { loop = true; return }
        seen.add(node)
        gotPre.push(node)
        walk(node.left)
        gotIno.push(node)
        walk(node.right)
      }
      walk(t.root)
      if (loop) return 'Treet går i ring: et monster kan ikke være under seg selv.'
      if (gotPre.length !== pre.length) return `Treet fra root har ${gotPre.length} monstre, men skal ha alle ${pre.length}.`
      for (let i = 0; i < pre.length; i++) {
        if (gotPre[i] !== pre[i]) return `I pre-orden skal plass ${i + 1} være ${t.show(pre[i])}, men treet ditt gir ${t.show(gotPre[i])}.`
      }
      for (let i = 0; i < ino.length; i++) {
        if (gotIno[i] !== ino[i]) return `I in-orden skal plass ${i + 1} være ${t.show(ino[i])}, men treet ditt gir ${t.show(gotIno[i])}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Tree_traversal',
  },
  {
    id: 'brann-i-treet',
    title: 'Brann i treet',
    level: 'vanskelig',
    topic: 'trær',
    text: `Det tar fyr i et monster i treet. Hvert minutt sprer brannen seg til alle naboene til de som brenner: barna (\`left\` og \`right\`) og forelderen. Skriv \`function burnTime(root, start)\` som gir tilbake hvor mange minutter det tar før hele treet brenner, når det tar fyr i \`start\`.

Monstrene vet ikke hvem som er forelderen deres. Det må du finne ut selv.`,
    hints: [
      'Gå gjennom treet én gang og husk forelderen til hvert monster i en `Map`.',
      'Nå er treet en graf der hvert monster har opptil tre naboer: `left`, `right` og forelderen.',
      'Spre brannen bredden først fra `start`, lag for lag. Antall lag etter det første er svaret. Merk hvem som brenner, så ingen tar fyr to ganger.',
    ],
    world: (r) => treeWorld(r, things(r, 9)),
    monster: TREE_MONSTER,
    scaffold: `function burnTime(root, start) {
  // Finn foreldrene, og spre brannen lag for lag
  return 0
}

console.log(burnTime(root, E))
`,
    solution: `function burnTime(root, start) {
  const parent = new Map()
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()
    for (const child of [node.left, node.right]) {
      if (child) {
        parent.set(child, node)
        stack.push(child)
      }
    }
  }
  const burning = new Set([start])
  let front = [start]
  let minutes = 0
  while (true) {
    const next = []
    for (const node of front) {
      for (const n of [node.left, node.right, parent.get(node)]) {
        if (n && !burning.has(n)) {
          burning.add(n)
          next.push(n)
        }
      }
    }
    if (!next.length) return minutes
    for (const n of next) n.color = 'red'
    vis(...next)
    minutes++
    front = next
  }
}

console.log(burnTime(root, E))
`,
    exports: ['burnTime'],
    check: (t) => {
      const burnTime = t.fn('burnTime')
      const reference = (root: any, start: any) => {
        const parent = new Map()
        const all: any[] = []
        const stack = [root]
        while (stack.length) {
          const node = stack.pop()
          all.push(node)
          for (const c of [node.left, node.right]) if (c) { parent.set(c, node); stack.push(c) }
        }
        const dist = new Map([[start, 0]])
        const queue = [start]
        let most = 0
        while (queue.length) {
          const node = queue.shift()
          for (const n of [node.left, node.right, parent.get(node)]) {
            if (n && !dist.has(n)) {
              dist.set(n, dist.get(node)! + 1)
              most = Math.max(most, dist.get(n)!)
              queue.push(n)
            }
          }
        }
        return { most, all }
      }
      const trees = [[1, [2, [4, 8, null], 5], [3, null, [6, 9, 7]]], 1, [1, 2, null], [1, [2, [3, [4, 5, null], null], null], null]]
      for (const spec of trees) {
        const root = t.tree(spec)
        const { all } = reference(root, root)
        for (const start of all) {
          const want = reference(root, start).most
          const got = burnTime(root, start)
          if (got !== want) return `Når det tar fyr i monsteret med verdien ${start.value}, gav burnTime ${t.show(got)}, men det tar ${want} minutter.`
        }
      }
      return true
    },
  },
]
