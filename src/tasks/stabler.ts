import { at, makeWorld, PALETTE, things } from './build'
import { PLAIN_TING } from './classes'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'snu-koen',
    title: 'Snu køen med en stabel',
    level: 'lett',
    topic: 'stabler',
    text: `Tingene står i kø i \`queue\`: den første i arrayen er først i køen. Ved siden av står en tom stabel, \`stack\`, der den som legges på sist, tas av først.

Snu køen ved hjelp av stabelen: ta én og én fra fronten av køen (\`shift()\`) og legg dem på stabelen (\`push()\`). Ta dem så av stabelen igjen (\`pop()\`) og still dem bakerst i køen (\`push()\`).`,
    hints: [
      '`while (queue.length) stack.push(queue.shift())` flytter hele køen over.',
      'Den som ble lagt sist på stabelen, kommer først av. Det er det som snur rekkefølgen.',
      'Kall `vis()` i løkkene for å se tingene vandre.',
    ],
    world: (r) => {
      const items = things(r, 6)
      return makeWorld(items, { queue: items.map((_, i) => at(i)), stack: [] })
    },
    ting: PLAIN_TING,
    starter: `while (queue.length) {
  stack.push(queue.shift())
  vis()
}
// Og tilbake i køen
`,
    solution: `while (queue.length) {
  stack.push(queue.shift())
  vis()
}
while (stack.length) {
  queue.push(stack.pop())
  vis()
}
`,
    check: (t) => {
      const want = t.before('queue').reverse()
      if (!Array.isArray(t.queue) || !Array.isArray(t.stack)) return '`queue` og `stack` skal fortsatt være arrayer.'
      if (t.stack.length) return `Stabelen har ${t.stack.length} ting igjen; den skal være tom til slutt.`
      if (t.queue.length !== want.length) return `Køen har ${t.queue.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.queue[i] !== want[i]) return `Plass ${i} i køen skal ha ${t.show(want[i])}, men har ${t.show(t.queue[i])}.`
      }
      return true
    },
  },
  {
    id: 'hanois-tarn',
    title: 'Hanois tårn',
    level: 'vanskelig',
    topic: 'stabler',
    text: `Tårnet på \`pegs[0]\` skal flyttes til \`pegs[2]\`. Du kan flytte én ting av gangen, fra toppen av en pinne (\`pop()\`) til toppen av en annen (\`push()\`), og en ting kan aldri stå oppå en som er mindre. \`value\` er størrelsen.

Skriv \`function hanoi(n, from, to, via, move)\` som flytter de \`n\` øverste fra \`from\` til \`to\`, og kaller \`move(from, to)\` for hvert flytt. Koden nederst kjører den på tårnet.`,
    hints: [
      'Tenk deg at du kan flytte `n - 1` ting på én gang. Hvordan får du da den største over?',
      'Flytt `n - 1` fra `from` til `via`, flytt den største fra `from` til `to`, og flytt `n - 1` fra `via` til `to`.',
      'Det er tre kall: `hanoi(n - 1, from, via, to, move)`, `move(from, to)` og `hanoi(n - 1, via, to, from, move)`. Stopp når `n === 0`.',
    ],
    world: () => {
      const items = [5, 4, 3, 2, 1].map((value, i) => ({ value, color: PALETTE[i] }))
      return makeWorld(items, { pegs: [items.map((_, i) => at(i)), [], []] })
    },
    ting: PLAIN_TING,
    starter: `function hanoi(n, from, to, via, move) {
  if (n === 0) return
  // Flytt n - 1 til via, den største til to, og n - 1 fra via til to
}

hanoi(pegs[0].length, pegs[0], pegs[2], pegs[1], (from, to) => {
  to.push(from.pop())
  vis()
})
`,
    solution: `function hanoi(n, from, to, via, move) {
  if (n === 0) return
  hanoi(n - 1, from, via, to, move)
  move(from, to)
  hanoi(n - 1, via, to, from, move)
}

hanoi(pegs[0].length, pegs[0], pegs[2], pegs[1], (from, to) => {
  to.push(from.pop())
  vis()
})
`,
    exports: ['hanoi'],
    check: (t) => {
      const hanoi = t.fn('hanoi')
      for (const n of [1, 3, 6]) {
        const pegs = [Array.from({ length: n }, (_, i) => n - i), [], []]
        let moves = 0
        let bad = ''
        hanoi(n, pegs[0], pegs[2], pegs[1], (from: number[], to: number[]) => {
          moves++
          if (bad) return
          if (!from.length) { bad = 'et flytt fra en tom pinne'; return }
          const disc = from[from.length - 1]
          if (to.length && to[to.length - 1] < disc) { bad = `${disc} ble lagt oppå ${to[to.length - 1]}`; return }
          to.push(from.pop()!)
        })
        if (bad) return `Med ${n} ting: ${bad}.`
        if (pegs[2].length !== n) return `Med ${n} ting står bare ${pegs[2].length} på målpinnen til slutt.`
        if (moves !== 2 ** n - 1) return `Med ${n} ting brukte du ${moves} flytt; det går på ${2 ** n - 1}.`
      }
      const target = t.pegs?.[2]
      if (!Array.isArray(target) || target.length !== t.slots.length) return 'Tårnet på scenen står ikke på `pegs[2]` ennå.'
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Tower_of_Hanoi',
  },
]
