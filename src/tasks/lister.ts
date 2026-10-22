import { listWorld, shuffled, things } from './build'
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
    starter: `function count(head) {
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
    starter: `let prev = null
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
    starter: `let best = head
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
    starter: `let node = head
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
]
