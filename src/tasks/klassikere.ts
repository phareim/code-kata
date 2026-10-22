import { arrayWorld, things } from './build'
import { PLAIN_TING } from './classes'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'binaersok',
    title: 'Binærsøk',
    level: 'middels',
    topic: 'klassikere',
    text: `Tingene i \`items\` står sortert etter \`value\`, minst først. Skriv \`function find(items, value)\` som gir tilbake plassen til tingen med den verdien, eller \`-1\` hvis ingen har den.

Del på midten hver gang: se på tingen i midten, og let videre bare i den halvdelen verdien må være i. Sjekken prøver med 1000 ting, og da skal du klare deg med rundt ti titt.`,
    hints: [
      'Hold styr på et område med `lo = 0` og `hi = items.length - 1`.',
      'Så lenge `lo <= hi`: se på `mid = Math.floor((lo + hi) / 2)`. Er verdien der, er du ferdig.',
      'Er `items[mid].value` for liten, let videre fra `mid + 1`; er den for stor, let til `mid - 1`.',
    ],
    world: (r) => arrayWorld(things(r).sort((a, b) => (a.value as number) - (b.value as number))),
    ting: PLAIN_TING,
    starter: `function find(items, value) {
  let lo = 0
  let hi = items.length - 1
  // Let i midten til lo og hi møtes
  return -1
}

console.log(find(items, items[3].value))
`,
    solution: `function find(items, value) {
  let lo = 0
  let hi = items.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    vis(items[mid])
    if (items[mid].value === value) return mid
    if (items[mid].value < value) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}

console.log(find(items, items[3].value))
`,
    exports: ['find'],
    check: (t) => {
      const find = t.fn('find')
      for (const n of [1, 2, 7, 100, 1000]) {
        const sorted = Array.from({ length: n }, (_, i) => t.ting({ value: i * 3 + 1 }))
        // The places find looks at, each counted once.
        const looked = new Set<string>()
        const watched = new Proxy(sorted, {
          get(target, key, receiver) {
            if (typeof key === 'string' && /^\d+$/.test(key)) looked.add(key)
            return Reflect.get(target, key, receiver)
          },
        })
        for (const i of [0, n - 1, Math.floor(n / 2), Math.floor(n / 3)]) {
          looked.clear()
          const got = find(watched, i * 3 + 1)
          if (got !== i) return `find gav ${t.show(got)} for verdien ${i * 3 + 1} blant ${n} ting; den står på plass ${i}.`
          const most = Math.ceil(Math.log2(n + 1)) + 2
          if (n >= 100 && looked.size > most) {
            return `find så på ${looked.size} ting blant ${n}. Med binærsøk holder det med rundt ${Math.ceil(Math.log2(n))}.`
          }
        }
        const missing = find(watched, 2)
        if (missing !== -1) return `find gav ${t.show(missing)} for en verdi ingen har; den skal gi -1.`
      }
      if (find([], 5) !== -1) return 'find skal gi -1 for en tom array.'
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Binary_search',
  },
]
