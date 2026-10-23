import { at, distinct, int, listWorld, makeWorld, PALETTE, pick, shuffled, things, type Spec } from './build'
import { DOUBLE_TING } from './classes'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'tell-tingene',
    title: 'Tell tingene',
    level: 'lett',
    topic: 'lister',
    text: `Tingene står i en lenket liste: \`head\` peker på den første, og hver ting peker på den neste med \`next\`. Den siste har \`next = null\`.

Skriv \`function count(head)\` som går gjennom lista og gir tilbake hvor mange ting den har. En tom liste (\`null\`) har null ting.`,
    hints: [
      'Start med `let n = 0` og en variabel `node` som peker på `head`.',
      '`while (node) { … }` går så lenge det er en ting igjen. Husk `node = node.next` inne i løkka.',
      'Øk `n` med én for hver runde, og `return n` etter løkka.',
    ],
    world: (r) => listWorld(things(r)),
    scaffold: `function count(head) {
  let n = 0
  // Gå gjennom lista og tell
  return n
}

console.log(count(head))
`,
    solution: `function count(head) {
  let n = 0
  for (let node = head; node; node = node.next) n++
  return n
}

console.log(count(head))
`,
    exports: ['count'],
    check: (t) => {
      const count = t.fn('count')
      for (const values of [[7], [3, 1, 4, 1, 5], [], [2, 7, 1, 8, 2, 8, 1, 8, 2, 8]]) {
        const got = count(t.list(values))
        if (got !== values.length) return `count gav ${t.show(got)} for en liste med ${values.length} ting.`
      }
      return true
    },
  },
  {
    id: 'snu-lista',
    title: 'Snu lista',
    level: 'middels',
    topic: 'lister',
    text: `Tingene vil stå i motsatt rekkefølge. Snu lista ved å flytte pekerne: den siste skal bli den første, og \`head\` skal peke på den nye første.

Ikke lag nye ting, og ikke bytt verdier: flytt \`next\` på de som er der.`,
    hints: [
      'Du trenger tre pekere: `prev` (starter som `null`), `node` (starter på `head`) og `next`.',
      'I hver runde: husk `node.next` i `next`, sett `node.next = prev`, og flytt så `prev` og `node` ett hakk fram.',
      'Når løkka er ferdig, peker `prev` på den nye første. Sett `head = prev`.',
    ],
    world: (r) => listWorld(things(r)),
    scaffold: `let prev = null
let node = head
while (node) {
  const next = node.next
  // Snu pekeren til node her
  prev = node
  node = next
}
// Hvem skal head peke på nå?
`,
    solution: `let prev = null
let node = head
while (node) {
  const next = node.next
  node.next = prev
  prev = node
  node = next
  vis(prev)
}
head = prev
`,
    check: (t) => {
      const want = t.before('head').reverse()
      const got = t.chain(t.head)
      if (!got) return 'Lista går i ring. Den som var først, skal til slutt ha `next = null`.'
      if (got.length !== want.length) return `Lista har ${got.length} ting nå, men skal ha alle ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (got[i] !== want[i]) return `Plass ${i + 1} skal være ${t.show(want[i])}, men er ${t.show(got[i])}.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/reverse-linked-list/',
  },
  {
    id: 'storst-forst',
    title: 'Den største først',
    level: 'lett',
    topic: 'lister',
    text: `Den med størst \`value\` vil stå først i lista. Flytt den fram, så \`head\` peker på den, og la de andre stå i samme rekkefølge som før.`,
    hints: [
      'Gå gjennom lista og husk både den største og tingen foran den (`bestPrev`).',
      'Hekt den største ut: `bestPrev.next = best.next`.',
      'Sett den forrest: `best.next = head` og `head = best`. Står den allerede først, er du ferdig.',
    ],
    world: (r) => {
      const items = things(r)
      // The biggest never starts first.
      const order = shuffled(r, items.map((_, i) => i))
      const top = items.reduce((b, s, i) => ((s.value as number) > (items[b].value as number) ? i : b), 0)
      if (order[0] === top) order.push(order.shift()!)
      return listWorld(items, order)
    },
    scaffold: `let best = head
let bestPrev = null
let prev = null
for (let node = head; node; node = node.next) {
  // Er node større enn best? Husk den, og den foran den.
  prev = node
}
`,
    solution: `let best = head
let bestPrev = null
let prev = null
for (let node = head; node; node = node.next) {
  if (node.value > best.value) {
    best = node
    bestPrev = prev
  }
  prev = node
}
if (bestPrev) {
  bestPrev.next = best.next
  best.next = head
  head = best
}
`,
    check: (t) => {
      const before = t.before('head')
      const max = before.reduce((a, b) => (b.value > a.value ? b : a))
      const want = [max, ...before.filter((n) => n !== max)]
      const got = t.chain(t.head)
      if (!got) return 'Lista går i ring.'
      if (got[0] !== max) return `Først står ${t.show(got[0])}, men den største er ${t.show(max)} med ${max.value}.`
      if (got.length !== want.length) return `Lista har ${got.length} ting, men skal ha ${want.length}.`
      for (let i = 1; i < want.length; i++) {
        if (got[i] !== want[i]) return `De andre skal stå som før: plass ${i + 1} skal være ${t.show(want[i])}.`
      }
      return true
    },
  },
  {
    id: 'ut-med-de-rosa',
    title: 'Ut med de rosa',
    level: 'middels',
    topic: 'lister',
    text: `De rosa tingene vil ut av lista. Fjern alle med \`color === 'pink'\`, og la de andre stå i samme rekkefølge.

Pass på: det står rosa ting først, og noen står etter hverandre.`,
    hints: [
      'Ta de rosa i starten for seg: så lenge `head` er rosa, flytt `head` til `head.next`.',
      'Gå så videre med `node`, og se på `node.next`: er den rosa, hopp over den med `node.next = node.next.next`.',
      'Flytt bare `node` fram når `node.next` ikke er rosa; ellers kan du gå glipp av to rosa på rad.',
    ],
    world: (r) => {
      const items = things(r)
      const colors = shuffled(r, ['pink', 'pink', 'pink', 'cyan', 'gold', 'lime', 'violet', 'teal'])
      items.forEach((s, i) => { s.color = colors[i] })
      // Pink first, and two pinks side by side somewhere after.
      const pinks = items.map((s, i) => (s.color === 'pink' ? i : -1)).filter((i) => i >= 0)
      const others = shuffled(r, items.map((_, i) => i).filter((i) => !pinks.includes(i)))
      const order = [pinks[0], ...others.slice(0, 2), pinks[1], pinks[2], ...others.slice(2)]
      return listWorld(items, order)
    },
    scaffold: `let node = head
while (node && node.next) {
  // Er node.next rosa? Hopp over den.
  node = node.next
}
`,
    solution: `while (head && head.color === 'pink') head = head.next
let node = head
while (node && node.next) {
  if (node.next.color === 'pink') node.next = node.next.next
  else node = node.next
}
`,
    check: (t) => {
      const want = t.before('head').filter((n) => n.color !== 'pink')
      const got = t.chain(t.head)
      if (!got) return 'Lista går i ring.'
      const pink = got.find((n) => n.color === 'pink')
      if (pink) return `${t.show(pink)} er rosa og står fortsatt i lista.`
      if (got.length !== want.length) return `Lista har ${got.length} ting, men ${want.length} er ikke rosa.`
      for (let i = 0; i < want.length; i++) {
        if (got[i] !== want[i]) return `Plass ${i + 1} skal være ${t.show(want[i])}, som før.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/remove-linked-list-elements/',
  },
  {
    id: 'legg-sammen',
    title: 'Legg sammen',
    level: 'lett',
    topic: 'lister',
    text: `Tingene vil vite hvor mye de er verdt til sammen. Skriv \`function sum(head)\` som går gjennom lista og legger sammen alle \`value\`.

En tom liste (\`null\`) har summen 0.`,
    hints: [
      'Start med `let total = 0` og en peker som begynner på `head`.',
      'For hver ting i lista: legg `node.value` til `total`, og gå videre med `node = node.next`.',
      'Når pekeren er `null`, er du ferdig: `return total`.',
    ],
    world: (r) => listWorld(things(r)),
    scaffold: `function sum(head) {
  let total = 0
  // Gå gjennom lista og legg sammen
  return total
}

console.log(sum(head))
`,
    solution: `function sum(head) {
  let total = 0
  for (let node = head; node; node = node.next) total += node.value
  return total
}

console.log(sum(head))
`,
    exports: ['sum'],
    check: (t) => {
      const sum = t.fn('sum')
      for (const values of [[5], [3, 1, 4, 1, 5], [], [90, 9, 99, 1]]) {
        const want = values.reduce((a, b) => a + b, 0)
        const got = sum(t.list(values))
        if (got !== want) return `sum gav ${t.show(got)} for lista ${t.show(values)}, men summen er ${want}.`
      }
      return true
    },
  },
  {
    id: 'fra-liste-til-array',
    title: 'Fra liste til array',
    level: 'lett',
    topic: 'lister',
    text: `Skriv \`function toArray(head)\` som gir tilbake en array med verdiene i lista, i den rekkefølgen tingene står: \`[17, 1, 32, …]\`.

Lista skal være som før etterpå. En tom liste gir \`[]\`.`,
    hints: [
      'Lag en tom array først: `const values = []`.',
      'Gå gjennom lista og `push` hver `node.value`.',
      'Ikke endre `next` underveis: flytt bare din egen peker.',
    ],
    world: (r) => listWorld(things(r, 6)),
    scaffold: `function toArray(head) {
  const values = []
  // Fyll values
  return values
}

console.log(toArray(head))
`,
    solution: `function toArray(head) {
  const values = []
  for (let node = head; node; node = node.next) values.push(node.value)
  return values
}

console.log(toArray(head))
`,
    exports: ['toArray'],
    check: (t) => {
      const toArray = t.fn('toArray')
      for (const values of [[4, 8, 15, 16, 23, 42], [], [7]]) {
        const head = t.list(values)
        const got = toArray(head)
        if (!t.same(got, values)) return `toArray gav ${t.show(got)}, men lista er ${t.show(values)}.`
        if (!t.same(t.values(head), values)) return 'Lista ble endret underveis. Den skal være som før.'
      }
      return true
    },
  },
  {
    id: 'ting-nummer-n',
    title: 'Ting nummer n',
    level: 'lett',
    topic: 'lister',
    text: `Skriv \`function nth(head, n)\` som gir tilbake tingen på plass \`n\` i lista, der den første er nummer 0. Finnes det ingen ting der, skal den gi \`null\`.

Det er selve tingen som skal tilbake, ikke verdien.`,
    hints: [
      'Gå `n` steg fra `head` med en løkke.',
      'Blir pekeren `null` før du har gått `n` steg, finnes ikke plassen.',
      'Et negativt `n` finnes heller ikke: gi `null` med en gang.',
    ],
    world: (r) => listWorld(things(r)),
    scaffold: `function nth(head, n) {
  let node = head
  // Gå n steg
  return node
}

console.log(nth(head, 3))
`,
    solution: `function nth(head, n) {
  if (n < 0) return null
  let node = head
  for (let i = 0; i < n && node; i++) node = node.next
  return node ?? null
}

console.log(nth(head, 3))
`,
    exports: ['nth'],
    check: (t) => {
      const nth = t.fn('nth')
      const head = t.list([10, 20, 30, 40, 50])
      const nodes = t.chain(head)!
      for (let i = 0; i < nodes.length; i++) {
        const got = nth(head, i)
        if (got !== nodes[i]) return `nth(head, ${i}) skal gi tingen med verdien ${nodes[i].value}, men gav ${got?.value === undefined ? t.show(got) : `den med ${got.value}`}.`
      }
      for (const n of [5, 9, -1]) {
        const got = nth(head, n)
        if (got !== null) return `nth(head, ${n}) skal gi null for en liste med 5 ting.`
      }
      if (nth(null, 0) !== null) return 'nth(null, 0) skal gi null.'
      return true
    },
  },
  {
    id: 'g-vil-sta-forst',
    title: 'G vil stå først',
    level: 'lett',
    topic: 'lister',
    text: `G er lei av å vente. Flytt G fram så den står først i lista, og la de andre stå i samme rekkefølge som før.

Du kan bruke bokstaven: \`G\` er tingen G.`,
    hints: [
      'Finn tingen som står foran G: den som har `next === G`.',
      'Hekt G ut ved å la den foran peke forbi: `before.next = G.next`.',
      'Sett G først: `G.next = head`, og så `head = G`.',
    ],
    world: (r) => {
      const items = things(r)
      const order = shuffled(r, items.map((_, i) => i))
      if (order[0] === 6) order.push(order.shift()!)
      return listWorld(items, order)
    },
    scaffold: `let before = head
while (before.next !== G) {
  before = before.next
}
// Nå står before rett foran G
`,
    solution: `let before = head
while (before.next !== G) {
  before = before.next
}
before.next = G.next
G.next = head
head = G
`,
    check: (t) => {
      const G = t.slots[6]
      const want = [G, ...t.before('head').filter((n) => n !== G)]
      const got = t.chain(t.head)
      if (!got) return 'Lista går i ring. Sjekk hvem som peker på hvem.'
      if (got[0] !== G) return `Først står ${t.show(got[0])}, ikke G.`
      if (got.length !== want.length) return `Lista har ${got.length} ting, men skal ha ${want.length}.`
      for (let i = 1; i < want.length; i++) {
        if (got[i] !== want[i]) return `De andre skal stå som før: plass ${i + 1} skal være ${t.show(want[i])}.`
      }
      return true
    },
  },
  {
    id: 'forst-blir-sist',
    title: 'Den første blir sist',
    level: 'lett',
    topic: 'lister',
    text: `Den som står først, vil heller stå bakerst. Flytt den første tingen til slutten av lista, så \`head\` peker på den som var nummer to.

De andre skal stå i samme rekkefølge, og den som nå står sist, skal ha \`next = null\`.`,
    hints: [
      'Husk den første: `const first = head`, og flytt `head` til `head.next`.',
      'Gå til den siste tingen i lista: den som har `next === null`.',
      'Hekt den første på der: `last.next = first`, og husk `first.next = null`.',
    ],
    world: (r) => listWorld(things(r), shuffled(r, [0, 1, 2, 3, 4, 5, 6, 7])),
    scaffold: `const first = head
head = head.next
let last = head
// Finn den siste, og heng first på der
`,
    solution: `const first = head
head = head.next
let last = head
while (last.next) last = last.next
last.next = first
first.next = null
`,
    check: (t) => {
      const before = t.before('head')
      const want = [...before.slice(1), before[0]]
      const got = t.chain(t.head)
      if (!got) return `Lista går i ring. ${t.show(before[0])} skal ha next = null når den står sist.`
      if (got.length !== want.length) return `Lista har ${got.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (got[i] !== want[i]) return `Plass ${i + 1} skal være ${t.show(want[i])}, men er ${t.show(got[i])}.`
      }
      return true
    },
  },
  {
    id: 'skilpadda-og-haren',
    title: 'Skilpadda og haren',
    level: 'middels',
    topic: 'lister',
    text: `To pekere går om kapp gjennom lista: \`slow\` tar ett steg av gangen, og \`fast\` tar to. Når \`fast\` er i mål, står \`slow\` midt i lista.

Sett både \`slow\` og \`fast\` til \`head\`, og la dem gå til \`fast\` ikke kan ta to steg til. Da skal \`slow\` peke på tingen i midten; med et partall ting, den andre av de to i midten. Pekerne vises som flagg over tingene; kall \`vis()\` i løkka for å se løpet.`,
    hints: [
      'Begynn med `slow = head` og `fast = head`.',
      'Løkka går så lenge `fast` og `fast.next` finnes.',
      'I hver runde: `slow = slow.next` og `fast = fast.next.next`. Ikke endre `next` på tingene.',
    ],
    world: (r) => listWorld(things(r, r() < 0.5 ? 7 : 8), undefined, { slow: null, fast: null }),
    views: { slow: 'pointer', fast: 'pointer' },
    scaffold: `slow = head
fast = head
while (fast && fast.next) {
  // Ett steg for slow, to for fast
  vis()
  break
}
`,
    solution: `slow = head
fast = head
vis()
while (fast && fast.next) {
  slow = slow.next
  fast = fast.next.next
  vis()
}
`,
    check: (t) => {
      const nodes = t.before('head')
      const got = t.chain(t.head)
      if (!got || got.length !== nodes.length || got.some((n, i) => n !== nodes[i])) return 'Lista skal være som før; flytt bare `slow` og `fast`.'
      const middle = nodes[Math.floor(nodes.length / 2)]
      if (t.slow !== middle) return `slow peker på ${t.show(t.slow)}, men midten er ${t.show(middle)}.`
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Cycle_detection#Floyd\'s_tortoise_and_hare',
  },
  {
    id: 'k-fra-slutten',
    title: 'K fra slutten',
    level: 'middels',
    topic: 'lister',
    text: `Skriv \`function fromEnd(head, k)\` som gir tilbake tingen som står \`k\` plasser fra slutten: med \`k = 1\` den siste, med \`k = 2\` den nest siste.

Er \`k\` større enn lista er lang, eller mindre enn 1, skal den gi \`null\`. Prøv å klare det med én tur gjennom lista.`,
    hints: [
      'Bruk to pekere: send den første `k` steg i forveien.',
      'Går den første tom før den har gått `k` steg, er lista for kort: gi `null`.',
      'Flytt så begge ett steg av gangen til den første er `null`. Da står den andre der du skal.',
    ],
    world: (r) => listWorld(things(r)),
    scaffold: `function fromEnd(head, k) {
  let ahead = head
  let behind = head
  // Send ahead k steg i forveien, og flytt så begge
  return behind
}

console.log(fromEnd(head, 2))
`,
    solution: `function fromEnd(head, k) {
  if (k < 1) return null
  let ahead = head
  for (let i = 0; i < k; i++) {
    if (!ahead) return null
    ahead = ahead.next
  }
  let behind = head
  while (ahead) {
    ahead = ahead.next
    behind = behind.next
  }
  return behind
}

console.log(fromEnd(head, 2))
`,
    exports: ['fromEnd'],
    check: (t) => {
      const fromEnd = t.fn('fromEnd')
      const head = t.list([11, 22, 33, 44, 55, 66])
      const nodes = t.chain(head)!
      for (let k = 1; k <= nodes.length; k++) {
        const got = fromEnd(head, k)
        const want = nodes[nodes.length - k]
        if (got !== want) return `fromEnd(head, ${k}) skal gi tingen med ${want.value}, men gav ${got && typeof got === 'object' ? `den med ${got.value}` : t.show(got)}.`
      }
      for (const k of [7, 20, 0, -2]) {
        if (fromEnd(head, k) !== null) return `fromEnd(head, ${k}) skal gi null for en liste med 6 ting.`
      }
      if (fromEnd(null, 1) !== null) return 'fromEnd(null, 1) skal gi null.'
      return true
    },
  },
  {
    id: 'naboer-bytter-plass',
    title: 'Naboer bytter plass',
    level: 'middels',
    topic: 'lister',
    text: `Tingene vil danse to og to: den første og den andre bytter plass, den tredje og den fjerde, og så videre. Står det en til overs til slutt, blir den stående.

Flytt pekerne; ikke bytt verdier eller farger. \`head\` skal peke på den nye første.`,
    hints: [
      'Det er lettere med en ekstra ting foran lista: `const dummy = { next: head }`, og en peker `prev = dummy`.',
      'Så lenge det finnes to ting etter `prev`: kall dem `a` og `b`. Sett `a.next = b.next`, `b.next = a` og `prev.next = b`.',
      'Flytt `prev` til `a` og fortsett. Til slutt: `head = dummy.next`.',
    ],
    world: (r) => listWorld(things(r, r() < 0.5 ? 7 : 8)),
    scaffold: `const dummy = { next: head }
let prev = dummy
while (prev.next && prev.next.next) {
  const a = prev.next
  const b = a.next
  // Bytt a og b
  prev = b
}
head = dummy.next
`,
    solution: `const dummy = { next: head }
let prev = dummy
while (prev.next && prev.next.next) {
  const a = prev.next
  const b = a.next
  a.next = b.next
  b.next = a
  prev.next = b
  prev = a
  vis(a, b)
}
head = dummy.next
`,
    check: (t) => {
      const before = t.before('head')
      const want = []
      for (let i = 0; i < before.length; i += 2) {
        if (i + 1 < before.length) want.push(before[i + 1], before[i])
        else want.push(before[i])
      }
      const got = t.chain(t.head)
      if (!got) return 'Lista går i ring.'
      if (got.length !== want.length) return `Lista har ${got.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (got[i] !== want[i]) return `Plass ${i + 1} skal være ${t.show(want[i])}, men er ${t.show(got[i])}.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/swap-nodes-in-pairs/',
  },
  {
    id: 'flett-to-lister',
    title: 'Flett to lister',
    level: 'middels',
    topic: 'lister',
    text: `Tingene står i to lister, \`a\` og \`b\`, begge sortert etter \`value\`, minst først. Flett dem sammen til én sortert liste fra \`head\`, med alle tingene fra begge.

Bruk tingene som er der, og flytt pekerne. Det holder å se på de to første hele tiden: den minste av dem skal først.`,
    hints: [
      'Lag en ekstra ting å bygge bak: `const dummy = { next: null }` og `let tail = dummy`.',
      'Så lenge både `a` og `b` finnes: heng den minste av dem på `tail`, og flytt den lista ett hakk fram.',
      'Når den ene er tom, heng resten av den andre på. Til slutt `head = dummy.next`.',
    ],
    world: (r) => {
      const items = things(r).sort((x, y) => (x.value as number) - (y.value as number))
      const inA = shuffled(r, [0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 4).sort((x, y) => x - y)
      const inB = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => !inA.includes(i))
      const linked: Spec[] = items.map((s) => ({ ...s, next: null }))
      for (const part of [inA, inB]) part.forEach((slot, k) => { linked[slot].next = k + 1 < part.length ? at(part[k + 1]) : null })
      return makeWorld(linked, { a: at(inA[0]), b: at(inB[0]), head: null })
    },
    scaffold: `const dummy = { next: null }
let tail = dummy
while (a && b) {
  // Heng den minste av a og b på tail
  break
}
head = dummy.next
`,
    solution: `const dummy = { next: null }
let tail = dummy
while (a && b) {
  if (a.value <= b.value) {
    tail.next = a
    a = a.next
  } else {
    tail.next = b
    b = b.next
  }
  tail = tail.next
}
tail.next = a ?? b
head = dummy.next
`,
    check: (t) => {
      const all = [...t.before('a'), ...t.before('b')].sort((x, y) => x.value - y.value)
      const got = t.chain(t.head)
      if (!got) return 'Lista fra head går i ring.'
      if (got.length !== all.length) return `Lista fra head har ${got.length} ting, men skal ha alle ${all.length}.`
      for (let i = 0; i < all.length; i++) {
        if (got[i] !== all[i]) return `Plass ${i + 1} skal være ${t.show(all[i])} (${all[i].value}), men er ${t.show(got[i])}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Merge_algorithm',
  },
  {
    id: 'gar-lista-i-ring',
    title: 'Går lista i ring?',
    level: 'middels',
    topic: 'lister',
    text: `Noen lister har ingen slutt: den siste peker tilbake på en ting lenger fram. Skriv \`function hasLoop(head)\` som svarer \`true\` hvis lista går i ring, og \`false\` hvis den ender i \`null\`.

En vanlig løkke som går til \`null\`, blir aldri ferdig i en ring. Bruk to pekere: en treg som tar ett steg og en rask som tar to. Går lista i ring, tar den raske igjen den trege.`,
    hints: [
      'Begynn med `slow = head` og `fast = head`.',
      'Så lenge `fast` og `fast.next` finnes: ta ett steg med `slow` og to med `fast`.',
      'Peker de på den samme tingen (`slow === fast`), går lista i ring. Kommer `fast` til `null`, gjør den ikke det.',
    ],
    world: (r) => {
      const items = things(r)
      const linked: Spec[] = items.map((s, i) => ({ ...s, next: i + 1 < items.length ? at(i + 1) : null }))
      linked[7].next = at(int(r, 1, 5))
      return makeWorld(linked, { head: at(0) })
    },
    scaffold: `function hasLoop(head) {
  let slow = head
  let fast = head
  // La fast ta to steg og slow ett, til de møtes eller fast er ute
  return false
}

console.log(hasLoop(head))
`,
    solution: `function hasLoop(head) {
  let slow = head
  let fast = head
  while (fast && fast.next) {
    slow = slow.next
    fast = fast.next.next
    if (slow === fast) return true
  }
  return false
}

console.log(hasLoop(head))
`,
    exports: ['hasLoop'],
    check: (t) => {
      const hasLoop = t.fn('hasLoop')
      const make = (n: number, back: number | null) => {
        const head = t.list(Array.from({ length: n }, (_, i) => i + 1))
        if (back !== null && head) {
          const nodes = t.chain(head)!
          nodes[n - 1].next = nodes[back]
        }
        return head
      }
      const cases: [number, number | null][] = [[6, 2], [5, null], [1, 0], [1, null], [9, 8], [2, 0], [7, null]]
      for (const [n, back] of cases) {
        const got = hasLoop(make(n, back))
        const want = back !== null
        if (got !== want) return `hasLoop gav ${t.show(got)} for ${n} ting ${want ? `der den siste peker tilbake på nummer ${back! + 1}` : 'uten ring'}.`
      }
      if (hasLoop(null) !== false) return 'hasLoop(null) skal gi false.'
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Cycle_detection',
  },
  {
    id: 'der-ringen-begynner',
    title: 'Der ringen begynner',
    level: 'vanskelig',
    topic: 'lister',
    text: `Lista går i ring. Skriv \`function loopStart(head)\` som finner tingen der ringen begynner: den første tingen du kommer til to ganger når du følger \`next\`. Går lista ikke i ring, skal den gi \`null\`.

Det går an med en \`Set\` av tingene du har sett. Men det finnes et triks som klarer seg uten: når den trege og den raske pekeren har møttes, starter du en ny peker fra \`head\` og lar den og den trege gå ett steg av gangen. Der de møtes, begynner ringen.`,
    hints: [
      'Den enkle veien: gå gjennom lista og legg hver ting i en `Set`. Den første du allerede har sett, er svaret.',
      'Trikset: finn først et møte mellom `slow` og `fast` som i «Går lista i ring?».',
      'Sett så `p = head` og gå `p = p.next` og `slow = slow.next` til `p === slow`. Da peker begge på starten av ringen.',
    ],
    world: (r) => {
      const items = things(r)
      const linked: Spec[] = items.map((s, i) => ({ ...s, next: i + 1 < items.length ? at(i + 1) : null }))
      linked[7].next = at(int(r, 2, 5))
      return makeWorld(linked, { head: at(0) })
    },
    scaffold: `function loopStart(head) {
  // Finn tingen der ringen begynner
  return null
}

console.log(loopStart(head))
`,
    solution: `function loopStart(head) {
  let slow = head
  let fast = head
  while (fast && fast.next) {
    slow = slow.next
    fast = fast.next.next
    if (slow === fast) {
      let p = head
      while (p !== slow) {
        p = p.next
        slow = slow.next
      }
      return p
    }
  }
  return null
}

console.log(loopStart(head))
`,
    exports: ['loopStart'],
    check: (t) => {
      const loopStart = t.fn('loopStart')
      for (const [n, back] of [[8, 3], [5, 0], [1, 0], [10, 9], [6, null], [3, 1]] as [number, number | null][]) {
        const head = t.list(Array.from({ length: n }, (_, i) => i + 1))!
        const nodes = t.chain(head)!
        if (back !== null) nodes[n - 1].next = nodes[back]
        const got = loopStart(head)
        const want = back === null ? null : nodes[back]
        if (got !== want) {
          return want
            ? `For ${n} ting der den siste peker på nummer ${back! + 1}, skal loopStart gi tingen med verdien ${want.value}.`
            : `For en liste uten ring skal loopStart gi null.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Cycle_detection',
  },
  {
    id: 'snu-tre-og-tre',
    title: 'Snu tre og tre',
    level: 'vanskelig',
    topic: 'lister',
    text: `Tingene går i grupper på tre: den første gruppen er de tre første, så de tre neste, og så videre. Snu rekkefølgen inni hver gruppe. En gruppe med færre enn tre til slutt blir stående som den er.

Med A B C D E F G H blir det C B A F E D G H. Flytt pekerne, og la \`head\` peke på den nye første.`,
    hints: [
      'Lag en `dummy` foran lista og en peker `prev` som står rett foran gruppen du jobber med.',
      'Sjekk først at det finnes tre ting etter `prev`; ellers er du ferdig.',
      'Snu de tre slik du snur en hel liste, og koble dem inn igjen: `prev.next` skal peke på den som var tredje, og den som var første skal peke videre til resten. Flytt `prev` til den som nå står sist i gruppen.',
    ],
    world: (r) => listWorld(things(r)),
    scaffold: `const dummy = { next: head }
let prev = dummy
// Snu gruppene på tre, én om gangen
head = dummy.next
`,
    solution: `const dummy = { next: head }
let prev = dummy
while (true) {
  let check = prev
  for (let i = 0; i < 3 && check; i++) check = check.next
  if (!check) break
  const first = prev.next
  let back = check.next
  let node = first
  for (let i = 0; i < 3; i++) {
    const next = node.next
    node.next = back
    back = node
    node = next
  }
  prev.next = back
  prev = first
  vis()
}
head = dummy.next
`,
    check: (t) => {
      const before = t.before('head')
      const want: typeof before = []
      for (let i = 0; i < before.length; i += 3) {
        const group = before.slice(i, i + 3)
        want.push(...(group.length === 3 ? group.reverse() : group))
      }
      const got = t.chain(t.head)
      if (!got) return 'Lista går i ring.'
      if (got.length !== want.length) return `Lista har ${got.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (got[i] !== want[i]) return `Plass ${i + 1} skal være ${t.show(want[i])}, men er ${t.show(got[i])}.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/reverse-nodes-in-k-group/',
  },
  {
    id: 'der-listene-mots',
    title: 'Der to lister møtes',
    level: 'vanskelig',
    topic: 'lister',
    text: `To lister starter hver for seg i \`a\` og \`b\`, men et sted på veien går de over i den samme halen: fra da av er det de samme tingene. Skriv \`function meeting(a, b)\` som finner den første tingen de har felles, eller \`null\` hvis de aldri møtes.

Det er tingen som skal være felles, ikke bare verdien.`,
    hints: [
      'Én vei: legg alle tingene fra `a` i en `Set`, og gå gjennom `b` til du finner en som er der.',
      'Uten `Set`: tell hvor lange listene er, og la den lengste få et forsprang på forskjellen.',
      'Gå så begge ett steg av gangen til de peker på den samme tingen (eller begge blir `null`).',
    ],
    world: (r) => {
      const items = things(r)
      const order = shuffled(r, [0, 1, 2, 3, 4, 5, 6, 7])
      const onlyA = order.slice(0, 3)
      const onlyB = order.slice(3, 5)
      const shared = order.slice(5)
      const linked: Spec[] = items.map((s) => ({ ...s, next: null }))
      const link = (slots: number[], end: number | null) => slots.forEach((slot, k) => {
        linked[slot].next = k + 1 < slots.length ? at(slots[k + 1]) : end === null ? null : at(end)
      })
      link(onlyA, shared[0])
      link(onlyB, shared[0])
      link(shared, null)
      return makeWorld(linked, { a: at(onlyA[0]), b: at(onlyB[0]) })
    },
    scaffold: `function meeting(a, b) {
  // Finn den første tingen begge listene har
  return null
}

console.log(meeting(a, b))
`,
    solution: `function meeting(a, b) {
  const seen = new Set()
  for (let node = a; node; node = node.next) seen.add(node)
  for (let node = b; node; node = node.next) {
    if (seen.has(node)) return node
  }
  return null
}

console.log(meeting(a, b))
`,
    exports: ['meeting'],
    check: (t) => {
      const meeting = t.fn('meeting')
      const build = (aLen: number, bLen: number, shared: number) => {
        const tail = shared ? t.list(Array.from({ length: shared }, (_, i) => 100 + i)) : null
        const make = (n: number, base: number) => {
          let head = tail
          for (let i = n - 1; i >= 0; i--) head = t.ting({ value: base + i, next: head })
          return head
        }
        return { a: make(aLen, 1), b: make(bLen, 50), tail }
      }
      for (const [aLen, bLen, shared] of [[3, 2, 3], [1, 4, 2], [0, 2, 3], [2, 2, 0], [5, 1, 1]]) {
        const { a, b, tail } = build(aLen, bLen, shared)
        const got = meeting(a, b)
        if (got !== tail) {
          return tail
            ? `meeting skal gi den første felles tingen (verdien ${tail.value}), men gav ${got && typeof got === 'object' ? `den med ${got.value}` : t.show(got)}.`
            : 'For to lister som aldri møtes, skal meeting gi null.'
        }
      }
      return true
    },
    source: 'https://leetcode.com/problems/intersection-of-two-linked-lists/',
  },
  {
    id: 'sma-forst-i-lista',
    title: 'Små først i lista',
    level: 'middels',
    topic: 'lister',
    text: `Tingene med \`value\` under 50 vil stå først i lista, foran dem med 50 eller mer. Inni hver gruppe skal de stå i samme rekkefølge som før.

Flytt pekerne, og la \`head\` peke på den nye første.`,
    hints: [
      'Bygg to nye lister mens du går gjennom den gamle: én for de små og én for de store.',
      'Hver liste trenger en start og en hale: `smallTail.next = node` legger til en ting bakerst.',
      'Til slutt: heng de store etter de små, sett `next = null` på den siste store, og flytt `head`.',
    ],
    world: (r) => {
      const small = distinct(r, 4, 1, 49)
      const big = distinct(r, 4, 50, 99)
      const items = shuffled(r, [...small, ...big]).map((value) => ({ value, color: pick(r, PALETTE) }))
      return listWorld(items)
    },
    scaffold: `const small = { next: null }
const big = { next: null }
let smallTail = small
let bigTail = big
for (let node = head; node; node = node.next) {
  // Heng node på smallTail eller bigTail
}
`,
    solution: `const small = { next: null }
const big = { next: null }
let smallTail = small
let bigTail = big
let node = head
while (node) {
  const next = node.next
  if (node.value < 50) {
    smallTail.next = node
    smallTail = node
  } else {
    bigTail.next = node
    bigTail = node
  }
  node = next
}
bigTail.next = null
smallTail.next = big.next
head = small.next
`,
    check: (t) => {
      const before = t.before('head')
      const want = [...before.filter((n) => n.value < 50), ...before.filter((n) => n.value >= 50)]
      const got = t.chain(t.head)
      if (!got) return 'Lista går i ring. Husk next = null på den siste.'
      if (got.length !== want.length) return `Lista har ${got.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (got[i] !== want[i]) return `Plass ${i + 1} skal være ${t.show(want[i])} (${want[i].value}), men er ${t.show(got[i])}.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/partition-list/',
  },
  {
    id: 'pekere-begge-veier',
    title: 'Pekere begge veier',
    level: 'lett',
    topic: 'lister',
    text: `Tingene har både \`next\` og \`prev\`, men bare \`next\` er satt. Gi hver ting en \`prev\` som peker på tingen foran den, så lista kan leses begge veier. Den første skal ha \`prev = null\`.

Når en ting og den foran peker på hverandre, viser scenen ⇄ mellom dem.`,
    hints: [
      'Gå gjennom lista med to pekere: `prev` (starter som `null`) og `node`.',
      'For hver ting: `node.prev = prev`.',
      'Flytt begge ett hakk fram: `prev = node` og `node = node.next`.',
    ],
    world: (r) => {
      const items = things(r)
      const order = shuffled(r, [0, 1, 2, 3, 4, 5, 6, 7])
      const linked: Spec[] = items.map((s) => ({ ...s, prev: null, next: null }))
      order.forEach((slot, k) => { linked[slot].next = k + 1 < order.length ? at(order[k + 1]) : null })
      return makeWorld(linked, { head: at(order[0]) })
    },
    ting: DOUBLE_TING,
    scaffold: `let prev = null
for (let node = head; node; node = node.next) {
  // Sett node.prev
}
`,
    solution: `let prev = null
for (let node = head; node; node = node.next) {
  node.prev = prev
  prev = node
  vis(node)
}
`,
    check: (t) => {
      const nodes = t.chain(t.head)
      const before = t.before('head')
      if (!nodes || nodes.length !== before.length || nodes.some((n, i) => n !== before[i])) return 'next skal være som før; sett bare prev.'
      for (let i = 0; i < nodes.length; i++) {
        const want = i ? nodes[i - 1] : null
        if (nodes[i].prev !== want) return `${t.show(nodes[i])}.prev skal være ${want ? t.show(want) : 'null'}, men er ${t.show(nodes[i].prev)}.`
      }
      return true
    },
  },
  {
    id: 'snu-dobbel-liste',
    title: 'Snu en liste med to veier',
    level: 'middels',
    topic: 'lister',
    text: `Lista går begge veier: hver ting har \`next\` og \`prev\`. Snu den, så den siste står først og \`head\` peker på den.

Etterpå skal både \`next\` og \`prev\` stemme: \`prev\` peker på tingen foran, og den nye første har \`prev = null\`.`,
    hints: [
      'I en liste med to veier holder det å bytte `next` og `prev` på hver ting.',
      'Gå gjennom lista, men husk den gamle `next` før du bytter, for etter byttet peker `next` bakover.',
      'Den siste du bytter på, er den nye første: sett `head` til den.',
    ],
    world: (r) => {
      const items = things(r)
      const order = shuffled(r, [0, 1, 2, 3, 4, 5, 6, 7])
      const linked: Spec[] = items.map((s) => ({ ...s, prev: null, next: null }))
      order.forEach((slot, k) => {
        linked[slot].next = k + 1 < order.length ? at(order[k + 1]) : null
        linked[slot].prev = k ? at(order[k - 1]) : null
      })
      return makeWorld(linked, { head: at(order[0]) })
    },
    ting: DOUBLE_TING,
    scaffold: `let node = head
while (node) {
  const next = node.next
  // Bytt next og prev på node
  node = next
}
`,
    solution: `let node = head
while (node) {
  const next = node.next
  node.next = node.prev
  node.prev = next
  head = node
  node = next
  vis(head)
}
`,
    check: (t) => {
      const want = t.before('head').reverse()
      const got = t.chain(t.head)
      if (!got) return 'Lista går i ring.'
      if (got.length !== want.length) return `Lista fra head har ${got.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (got[i] !== want[i]) return `Plass ${i + 1} skal være ${t.show(want[i])}, men er ${t.show(got[i])}.`
        const prev = i ? want[i - 1] : null
        if (got[i].prev !== prev) return `${t.show(got[i])}.prev skal være ${prev ? t.show(prev) : 'null'}.`
      }
      return true
    },
  },
]
