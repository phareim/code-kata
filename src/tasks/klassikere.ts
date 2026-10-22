import { arrayWorld, at, distinct, int, makeWorld, PALETTE, pick, shuffled, things } from './build'
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
  {
    id: 'to-som-blir-malet',
    title: 'To som blir målet',
    level: 'lett',
    topic: 'klassikere',
    text: `Skriv \`function twoSum(items, target)\` som finner to forskjellige ting i \`items\` der verdiene til sammen blir \`target\`. Gi tilbake plassene deres som \`[i, j]\` med \`i < j\`, eller \`null\` hvis ingen to passer.

To løkker inni hverandre virker. Med en \`Map\` over verdiene du har sett, holder det å gå gjennom raden én gang.`,
    hints: [
      'For hver ting på plass `j`: hvilken verdi måtte en tidligere ting ha hatt? `target - items[j].value`.',
      'Husk plassen til hver verdi du har sett i en `Map`: `seen.set(value, j)`.',
      'Finnes den verdien du mangler i `seen`, er svaret `[seen.get(need), j]`.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    starter: `function twoSum(items, target) {
  // Finn i og j der verdiene blir target til sammen
  return null
}

console.log(twoSum(items, items[1].value + items[4].value))
`,
    solution: `function twoSum(items, target) {
  const seen = new Map()
  for (let j = 0; j < items.length; j++) {
    const need = target - items[j].value
    if (seen.has(need)) return [seen.get(need), j]
    seen.set(items[j].value, j)
  }
  return null
}

console.log(twoSum(items, items[1].value + items[4].value))
`,
    exports: ['twoSum'],
    check: (t) => {
      const twoSum = t.fn('twoSum')
      const cases: [number[], number, boolean][] = [
        [[3, 9, 14, 20, 5], 25, true],
        [[1, 2, 3, 4], 7, true],
        [[5, 5], 10, true],
        [[10, 20, 30], 100, false],
        [[7], 14, false],
        [[], 3, false],
      ]
      for (const [values, target, exists] of cases) {
        const got = twoSum(values.map((value) => t.ting({ value })), target)
        if (!exists) {
          if (got !== null) return `For ${t.show(values)} og målet ${target} finnes ingen to; twoSum skal gi null, men gav ${t.show(got)}.`
          continue
        }
        if (!Array.isArray(got) || got.length !== 2) return `For ${t.show(values)} og målet ${target} skal twoSum gi [i, j], men gav ${t.show(got)}.`
        const [i, j] = got
        if (!(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && i < j && j < values.length)) return `twoSum gav ${t.show(got)}; det skal være to plasser i raden, med i < j.`
        if (values[i] + values[j] !== target) return `For ${t.show(values)}: plass ${i} og ${j} blir ${values[i] + values[j]}, ikke ${target}.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/two-sum/',
  },
  {
    id: 'kjop-lavt-selg-hoyt',
    title: 'Kjøp lavt, selg høyt',
    level: 'lett',
    topic: 'klassikere',
    text: `Verdiene i \`items\` er prisen på en ting, dag for dag. Du får kjøpe én gang og selge én gang, og salget må komme etter kjøpet. Skriv \`function bestProfit(items)\` som gir den største gevinsten du kan få, eller 0 hvis prisen bare går ned.`,
    hints: [
      'Gå gjennom dagene og husk den laveste prisen så langt.',
      'Hver dag: hvor mye ville du tjent på å selge i dag, kjøpt på den billigste dagen før?',
      'Ta vare på den største gevinsten du har sett. Start på 0.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    starter: `function bestProfit(items) {
  let lowest = Infinity
  let best = 0
  // Gå gjennom dagene
  return best
}

console.log(bestProfit(items))
`,
    solution: `function bestProfit(items) {
  let lowest = Infinity
  let best = 0
  for (const day of items) {
    lowest = Math.min(lowest, day.value)
    best = Math.max(best, day.value - lowest)
  }
  return best
}

console.log(bestProfit(items))
`,
    exports: ['bestProfit'],
    check: (t) => {
      const bestProfit = t.fn('bestProfit')
      const want = (v: number[]) => {
        let best = 0
        for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) best = Math.max(best, v[j] - v[i])
        return best
      }
      const rows = [[7, 1, 5, 3, 6, 4], [7, 6, 4, 3, 1], [2, 4, 1, 9], [5], [], [3, 3, 3], [10, 1, 2, 30, 4, 40]]
      for (const values of rows) {
        const got = bestProfit(values.map((value) => t.ting({ value })))
        if (got !== want(values)) return `For prisene ${t.show(values)} gav bestProfit ${t.show(got)}, men det beste er ${want(values)}.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
  },
  {
    id: 'den-som-mangler',
    title: 'Den som mangler',
    level: 'lett',
    topic: 'klassikere',
    text: `Tingene skulle hatt verdiene 1 til 9, én hver, men én av dem er borte. Skriv \`function missing(items)\` som finner ut hvilken verdi som mangler.

Raden er ikke sortert. Lengden forteller hvor mange det skulle vært: én mer enn det er.`,
    hints: [
      'Summen av 1 til n er `n * (n + 1) / 2`.',
      'Her er n én mer enn antall ting: `items.length + 1`.',
      'Trekk fra summen av verdiene som er der. Det som blir igjen, mangler.',
    ],
    world: (r) => {
      const gone = int(r, 1, 9)
      const values = shuffled(r, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => v !== gone))
      return arrayWorld(values.map((value) => ({ value, color: pick(r, PALETTE) })))
    },
    ting: PLAIN_TING,
    starter: `function missing(items) {
  // Hvilken verdi fra 1 til items.length + 1 er borte?
  return 0
}

console.log(missing(items))
`,
    solution: `function missing(items) {
  const n = items.length + 1
  let total = (n * (n + 1)) / 2
  for (const thing of items) total -= thing.value
  return total
}

console.log(missing(items))
`,
    exports: ['missing'],
    check: (t) => {
      const missing = t.fn('missing')
      for (const n of [9, 5, 2, 12]) {
        for (let gone = 1; gone <= n; gone++) {
          const values = t.shuffle(Array.from({ length: n }, (_, i) => i + 1).filter((v) => v !== gone))
          const got = missing(values.map((value) => t.ting({ value })))
          if (got !== gone) return `For ${t.show(values)} gav missing ${t.show(got)}, men det er ${gone} som mangler.`
        }
      }
      return true
    },
  },
  {
    id: 'balansepunktet',
    title: 'Balansepunktet',
    level: 'lett',
    topic: 'klassikere',
    text: `Skriv \`function balance(items)\` som finner plassen der summen av verdiene til venstre er like stor som summen til høyre. Tingen på plassen selv teller ikke med på noen av sidene.

Gi tilbake den første slike plassen, eller \`-1\` hvis det ikke finnes noen. For den første plassen er summen til venstre 0.`,
    hints: [
      'Regn ut summen av alle først.',
      'Gå så fra venstre, og hold styr på summen til venstre for plassen du står på.',
      'Summen til høyre er da `total - left - items[i].value`.',
    ],
    world: (r) => {
      // A row that balances somewhere in the middle.
      const left = distinct(r, 3, 1, 30)
      const right = distinct(r, 3, 1, 30)
      const diff = left.reduce((a, b) => a + b, 0) - right.reduce((a, b) => a + b, 0)
      if (diff > 0) right.push(diff)
      else if (diff < 0) left.push(-diff)
      const values = [...left, int(r, 1, 99), ...right]
      return arrayWorld(values.map((value) => ({ value, color: pick(r, PALETTE) })))
    },
    ting: PLAIN_TING,
    starter: `function balance(items) {
  // Finn plassen der venstre og høyre er like tunge
  return -1
}

console.log(balance(items))
`,
    solution: `function balance(items) {
  const total = items.reduce((sum, thing) => sum + thing.value, 0)
  let left = 0
  for (let i = 0; i < items.length; i++) {
    if (left === total - left - items[i].value) return i
    left += items[i].value
  }
  return -1
}

console.log(balance(items))
`,
    exports: ['balance'],
    check: (t) => {
      const balance = t.fn('balance')
      const want = (v: number[]) => {
        for (let i = 0; i < v.length; i++) {
          const l = v.slice(0, i).reduce((a, b) => a + b, 0)
          const r = v.slice(i + 1).reduce((a, b) => a + b, 0)
          if (l === r) return i
        }
        return -1
      }
      const rows = [[1, 7, 3, 6, 5, 6], [1, 2, 3], [2, 1, -1], [5], [], [0, 0, 0], [3, 1, 2, 9, 6]]
      for (const values of rows) {
        const got = balance(values.map((value) => t.ting({ value })))
        if (got !== want(values)) return `For ${t.show(values)} gav balance ${t.show(got)}, men svaret er ${want(values)}.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/find-pivot-index/',
  },
  {
    id: 'tre-pa-rad',
    title: 'Tre på rad',
    level: 'lett',
    topic: 'klassikere',
    text: `Skriv \`function bestThree(items)\` som finner den største summen av tre ting som står ved siden av hverandre i \`items\`. Har raden færre enn tre ting, skal den gi \`null\`.

Tips: når vinduet på tre flytter seg ett hakk, går én ting ut og én kommer inn.`,
    hints: [
      'Regn ut summen av de tre første. Det er det beste så langt.',
      'For hver neste plass `i`: legg til `items[i].value` og trekk fra `items[i - 3].value`.',
      'Hold på den største summen du har sett.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    starter: `function bestThree(items) {
  if (items.length < 3) return null
  // Flytt et vindu på tre gjennom raden
  return 0
}

console.log(bestThree(items))
`,
    solution: `function bestThree(items) {
  if (items.length < 3) return null
  let sum = items[0].value + items[1].value + items[2].value
  let best = sum
  for (let i = 3; i < items.length; i++) {
    sum += items[i].value - items[i - 3].value
    best = Math.max(best, sum)
  }
  return best
}

console.log(bestThree(items))
`,
    exports: ['bestThree'],
    check: (t) => {
      const bestThree = t.fn('bestThree')
      const want = (v: number[]) => {
        if (v.length < 3) return null
        let best = -Infinity
        for (let i = 0; i + 2 < v.length; i++) best = Math.max(best, v[i] + v[i + 1] + v[i + 2])
        return best
      }
      const rows = [[1, 9, 9, 9, 1], [5, 1, 1, 1, 6, 6, 6], [4, 4, 4], [10, 20], [], [3, 50, 2, 1, 70, 1]]
      for (const values of rows) {
        const got = bestThree(values.map((value) => t.ting({ value })))
        if (got !== want(values)) return `For ${t.show(values)} gav bestThree ${t.show(got)}, men svaret er ${t.show(want(values))}.`
      }
      return true
    },
  },
  {
    id: 'fizzbuzz-i-farger',
    title: 'FizzBuzz i farger',
    level: 'lett',
    topic: 'klassikere',
    text: `Den gamle leken, med farger: gå gjennom \`items\` og gi tingene ny farge etter verdien:
- delelig med både 3 og 5: \`'gold'\`
- bare med 3: \`'pink'\`
- bare med 5: \`'cyan'\`
- ellers: \`'violet'\`

Rekkefølgen i \`items\` skal være som før.`,
    hints: [
      '`value % 3 === 0` sier at verdien er delelig med 3.',
      'Sjekk «både 3 og 5» først, ellers blir 15 rosa.',
      'Delelig med både 3 og 5 er det samme som delelig med 15.',
    ],
    world: (r) => {
      const threes = shuffled(r, [3, 6, 9, 12, 18, 21, 24, 27, 33, 36]).slice(0, 2)
      const fives = shuffled(r, [5, 10, 20, 25, 35, 40, 50, 55]).slice(0, 2)
      const fifteen = pick(r, [15, 30, 45, 60, 75, 90])
      const others = shuffled(r, [1, 2, 4, 7, 8, 11, 13, 14, 16, 17, 19, 22, 23, 26, 28, 29]).slice(0, 3)
      const values = shuffled(r, [...threes, ...fives, fifteen, ...others])
      return arrayWorld(values.map((value) => ({ value, color: 'teal' })))
    },
    ting: PLAIN_TING,
    starter: `for (const thing of items) {
  // Gi thing riktig farge
}
`,
    solution: `for (const thing of items) {
  if (thing.value % 15 === 0) thing.color = 'gold'
  else if (thing.value % 3 === 0) thing.color = 'pink'
  else if (thing.value % 5 === 0) thing.color = 'cyan'
  else thing.color = 'violet'
  vis(thing)
}
`,
    check: (t) => {
      const before = t.before('items')
      if (!Array.isArray(t.items) || t.items.length !== before.length || t.items.some((n: unknown, i: number) => n !== before[i])) return '`items` skal stå i samme rekkefølge som før.'
      for (const node of before) {
        const v = node.value
        const want = v % 15 === 0 ? 'gold' : v % 3 === 0 ? 'pink' : v % 5 === 0 ? 'cyan' : 'violet'
        if (node.color !== want) return `${t.show(node)} har verdien ${v} og skal være ${t.show(want)}, men er ${t.show(node.color)}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Fizz_buzz',
  },
  {
    id: 'josefus-ringen',
    title: 'Josefus-ringen',
    level: 'middels',
    topic: 'klassikere',
    text: `Tingene står i ring i \`queue\`, og teller: én, to, tre. Den som sier tre, går ut av ringen og over i \`removed\`. Tellingen fortsetter fra den neste, og slik går det til bare én er igjen i \`queue\`.

Bruk køen som en ring: den som ikke går ut, stilles bakerst med \`queue.push(queue.shift())\`.`,
    hints: [
      'Så lenge det er mer enn én i køen: flytt de to første bakerst, én om gangen.',
      'Den som nå står først, er nummer tre: `removed.push(queue.shift())`.',
      'Kall `vis()` etter hver som går ut, så ser du ringen krympe.',
    ],
    world: (r) => {
      const items = things(r)
      return makeWorld(items, { queue: items.map((_, i) => at(i)), removed: [] })
    },
    ting: PLAIN_TING,
    starter: `while (queue.length > 1) {
  // Tell én, to, tre: de to første går bakerst, den tredje går ut
  break
}
`,
    solution: `while (queue.length > 1) {
  queue.push(queue.shift())
  queue.push(queue.shift())
  removed.push(queue.shift())
  vis()
}
`,
    check: (t) => {
      const ring = t.before('queue')
      const want: typeof ring = []
      while (ring.length > 1) {
        ring.push(ring.shift()!)
        ring.push(ring.shift()!)
        want.push(ring.shift()!)
      }
      if (!Array.isArray(t.queue) || t.queue.length !== 1) return `Det skal være én igjen i \`queue\`, men det er ${Array.isArray(t.queue) ? t.queue.length : t.show(t.queue)}.`
      if (t.queue[0] !== ring[0]) return `Den som blir igjen, skal være ${t.show(ring[0])}, men det er ${t.show(t.queue[0])}.`
      if (!Array.isArray(t.removed) || t.removed.length !== want.length) return `\`removed\` skal ha ${want.length} ting.`
      for (let i = 0; i < want.length; i++) {
        if (t.removed[i] !== want[i]) return `Nummer ${i + 1} ut skal være ${t.show(want[i])}, men er ${t.show(t.removed[i])}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Josephus_problem',
  },
  {
    id: 'flertallet',
    title: 'Flertallet',
    level: 'middels',
    topic: 'klassikere',
    text: `Skriv \`function majority(items)\` som finner fargen som mer enn halvparten av tingene har, eller \`null\` hvis ingen farge har så mange.

Det går med en \`Map\` som teller. Men det finnes en lur måte som klarer seg med én kandidat og én teller: Boyer og Moores avstemning.`,
    hints: [
      'Med telling: tell hver farge, og se om noen har mer enn `items.length / 2`.',
      'Boyer–Moore: har telleren null, blir fargen du står på ny kandidat. Lik kandidaten: +1, ellers −1.',
      'Kandidaten er bare et forslag: tell den én gang til, og sjekk at den virkelig har flertall.',
    ],
    world: (r) => {
      const items = things(r, 7)
      const winner = pick(r, PALETTE)
      items.forEach((s, i) => { s.color = i < 4 ? winner : pick(r, PALETTE.filter((c) => c !== winner)) })
      return arrayWorld(shuffled(r, items))
    },
    ting: PLAIN_TING,
    starter: `function majority(items) {
  // Hvilken farge har mer enn halvparten?
  return null
}

console.log(majority(items))
`,
    solution: `function majority(items) {
  let candidate = null
  let count = 0
  for (const thing of items) {
    if (count === 0) candidate = thing.color
    count += thing.color === candidate ? 1 : -1
  }
  const votes = items.filter((thing) => thing.color === candidate).length
  return votes > items.length / 2 ? candidate : null
}

console.log(majority(items))
`,
    exports: ['majority'],
    check: (t) => {
      const majority = t.fn('majority')
      const rows: [string[], string | null][] = [
        [['pink', 'cyan', 'pink', 'pink', 'gold'], 'pink'],
        [['cyan', 'cyan', 'gold', 'gold'], null],
        [['lime'], 'lime'],
        [[], null],
        [['red', 'teal', 'red', 'teal', 'teal', 'red', 'teal'], 'teal'],
        [['gold', 'gold', 'pink', 'pink', 'cyan'], null],
        [['pink', 'cyan', 'cyan', 'gold', 'cyan', 'cyan'], 'cyan'],
      ]
      for (const [colors, want] of rows) {
        const got = majority(colors.map((color, i) => t.ting({ value: i + 1, color })))
        if (got !== want) return `For ${t.show(colors)} gav majority ${t.show(got)}, men svaret er ${t.show(want)}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_majority_vote_algorithm',
  },
  {
    id: 'den-gladeste-strekningen',
    title: 'Den gladeste strekningen',
    level: 'middels',
    topic: 'klassikere',
    text: `Humøret til en ting er \`value - 50\`: over 50 er den glad, under er den sur. Skriv \`function happiest(items)\` som finner den største summen av humør du kan få fra tingene på en strekning der de står ved siden av hverandre. Strekningen må ha minst én ting.

Er alle sure, er svaret det minst sure humøret. En tom rad gir \`null\`.`,
    hints: [
      'Gå fra venstre og hold styr på den beste summen for en strekning som slutter akkurat der du står.',
      'Den er enten humøret der du står, eller den forrige summen pluss humøret der du står: ta den største.',
      'Det beste svaret er den største av disse summene underveis (Kadanes algoritme).',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    starter: `function happiest(items) {
  if (!items.length) return null
  // Finn den gladeste strekningen
  return 0
}

console.log(happiest(items))
`,
    solution: `function happiest(items) {
  if (!items.length) return null
  let here = items[0].value - 50
  let best = here
  for (let i = 1; i < items.length; i++) {
    const mood = items[i].value - 50
    here = Math.max(mood, here + mood)
    best = Math.max(best, here)
  }
  return best
}

console.log(happiest(items))
`,
    exports: ['happiest'],
    check: (t) => {
      const happiest = t.fn('happiest')
      const want = (v: number[]) => {
        if (!v.length) return null
        let best = -Infinity
        for (let i = 0; i < v.length; i++) {
          let s = 0
          for (let j = i; j < v.length; j++) {
            s += v[j] - 50
            best = Math.max(best, s)
          }
        }
        return best
      }
      const rows = [[60, 40, 90, 10, 70], [10, 20, 30], [99], [], [55, 45, 55, 45, 99], [1, 99, 1, 99, 1], [50, 50]]
      for (const values of rows) {
        const got = happiest(values.map((value) => t.ting({ value })))
        if (got !== want(values)) return `For verdiene ${t.show(values)} gav happiest ${t.show(got)}, men svaret er ${t.show(want(values))}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Maximum_subarray_problem',
  },
  {
    id: 'rettferdig-stokking',
    title: 'Rettferdig stokking',
    level: 'middels',
    topic: 'klassikere',
    text: `Skriv \`function shuffle(items)\` som stokker \`items\` på stedet, så hver mulige rekkefølge er like sannsynlig. Bruk \`Math.random()\`.

Sjekken stokker tre ting mange tusen ganger og teller rekkefølgene. Det populære trikset \`items.sort(() => Math.random() - 0.5)\` er ikke rettferdig og blir avslørt. Bruk Fisher og Yates' metode.`,
    hints: [
      'Gå baklengs fra den siste plassen `i` ned til 1.',
      'Velg en tilfeldig plass `j` fra 0 til og med `i`: `Math.floor(Math.random() * (i + 1))`.',
      'Bytt `items[i]` og `items[j]`.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    starter: `function shuffle(items) {
  // Stokk items rettferdig
}

shuffle(items)
`,
    solution: `function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

shuffle(items)
`,
    exports: ['shuffle'],
    check: (t) => {
      const shuffle = t.fn('shuffle')
      const counts = new Map()
      const runs = 6000
      for (let k = 0; k < runs; k++) {
        const row = ['a', 'b', 'c']
        shuffle(row)
        const key = row.join('')
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      for (const key of counts.keys()) {
        if (key.length !== 3 || new Set(key).size !== 3) return 'shuffle skal bare flytte på tingene, ikke ta bort eller legge til.'
      }
      if (counts.size !== 6) return `Av 6 mulige rekkefølger kom bare ${counts.size} ut. Alle skal kunne skje.`
      for (const [key, n] of counts) {
        if (n < runs / 6 * 0.8 || n > runs / 6 * 1.2) return `Rekkefølgen ${key} kom ${n} ganger av ${runs}, men skulle kommet rundt ${runs / 6}. Stokkingen er ikke rettferdig.`
      }
      const before = t.before('items')
      if (!Array.isArray(t.items) || t.items.length !== before.length || !before.every((n) => t.items.includes(n))) return '`items` skal ha de samme tingene etter stokkingen.'
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle',
  },
  {
    id: 'regnvann',
    title: 'Regnvann',
    level: 'vanskelig',
    topic: 'klassikere',
    text: `Verdiene er høyden på en rad med søyler. Når det regner, blir vannet liggende i dalene mellom søylene. Skriv \`function rain(items)\` som regner ut hvor mange ruter vann som blir liggende.

Over hver søyle står vannet like høyt som den laveste av de høyeste søylene på hver side, minus søylens egen høyde (eller 0).`,
    hints: [
      'For hver plass trenger du den høyeste søylen til venstre og den høyeste til høyre, begge med søylen selv.',
      'Lag to arrayer: maks fra venstre, og maks fra høyre. Vannet på plass `i` er `Math.min(left[i], right[i]) - h[i]`.',
      'Med to pekere fra hver ende går det uten de to arrayene: flytt alltid fra den siden som har den laveste maksen.',
    ],
    world: (r) => arrayWorld(Array.from({ length: 8 }, () => ({ value: int(r, 1, 9), color: 'cyan' }))),
    ting: PLAIN_TING,
    starter: `function rain(items) {
  // Hvor mye vann blir liggende?
  return 0
}

console.log(rain(items))
`,
    solution: `function rain(items) {
  const h = items.map((thing) => thing.value)
  let lo = 0
  let hi = h.length - 1
  let leftMax = 0
  let rightMax = 0
  let water = 0
  while (lo < hi) {
    if (h[lo] < h[hi]) {
      leftMax = Math.max(leftMax, h[lo])
      water += leftMax - h[lo]
      lo++
    } else {
      rightMax = Math.max(rightMax, h[hi])
      water += rightMax - h[hi]
      hi--
    }
  }
  return water
}

console.log(rain(items))
`,
    exports: ['rain'],
    check: (t) => {
      const rain = t.fn('rain')
      const want = (h: number[]) => {
        let water = 0
        for (let i = 0; i < h.length; i++) {
          const l = Math.max(...h.slice(0, i + 1))
          const r = Math.max(...h.slice(i))
          water += Math.min(l, r) - h[i]
        }
        return water
      }
      const rows = [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], [4, 2, 0, 3, 2, 5], [1, 2, 3], [3, 2, 1], [5], [], [2, 0, 2], [5, 1, 1, 9, 1, 1, 5]]
      for (const values of rows) {
        const got = rain(values.map((value) => t.ting({ value })))
        if (got !== want(values)) return `For høydene ${t.show(values)} gav rain ${t.show(got)}, men det blir ${want(values)} ruter vann.`
      }
      return true
    },
    source: 'https://leetcode.com/problems/trapping-rain-water/',
  },
  {
    id: 'en-fra-strommen',
    title: 'Én fra strømmen',
    level: 'vanskelig',
    topic: 'klassikere',
    text: `Tingene kommer én og én fra \`next()\`, som gir \`null\` når det ikke kommer flere. Ingen vet på forhånd hvor mange det blir. Skriv \`function pickOne(next)\` som velger én av dem, slik at alle har like stor sjanse, og som husker bare én kandidat om gangen.

Sjekken kjører den mange tusen ganger på strømmer av ulik lengde og teller hvem som blir valgt.`,
    hints: [
      'Den første tingen blir kandidat med en gang.',
      'Ting nummer `i` (fra 1) skal ta over som kandidat med sjanse `1 / i`: `Math.random() < 1 / i`.',
      'Da ender hver ting med sjanse `1 / n` til slutt (reservoir sampling).',
    ],
    world: (r) => arrayWorld(things(r, 6)),
    ting: PLAIN_TING,
    starter: `function pickOne(next) {
  let chosen = null
  // Les strømmen og velg én
  return chosen
}

let i = 0
console.log(pickOne(() => items[i++] ?? null))
`,
    solution: `function pickOne(next) {
  let chosen = null
  let seen = 0
  for (let thing = next(); thing !== null; thing = next()) {
    seen++
    if (Math.random() < 1 / seen) chosen = thing
  }
  return chosen
}

let i = 0
console.log(pickOne(() => items[i++] ?? null))
`,
    exports: ['pickOne'],
    check: (t) => {
      const pickOne = t.fn('pickOne')
      for (const n of [1, 2, 5]) {
        const counts = new Array(n).fill(0)
        const runs = 5000
        const stream = Array.from({ length: n }, (_, j) => t.ting({ value: j + 1 }))
        for (let k = 0; k < runs; k++) {
          let i = 0
          let ended = false
          const got = pickOne(() => {
            if (i < n) return stream[i++]
            ended = true
            return null
          })
          const at = stream.indexOf(got)
          if (at < 0) return `Med ${n} ting i strømmen gav pickOne ${t.show(got)}, ikke en av tingene.`
          if (!ended) return 'pickOne må lese hele strømmen, til next() gir null.'
          counts[at]++
        }
        for (let j = 0; j < n; j++) {
          if (counts[j] < runs / n * 0.85 || counts[j] > runs / n * 1.15) return `Med ${n} ting ble nummer ${j + 1} valgt ${counts[j]} ganger av ${runs}; det skulle vært rundt ${Math.round(runs / n)}.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Reservoir_sampling',
  },
  {
    id: 'josefus-uten-a-telle',
    title: 'Josefus uten å telle',
    level: 'vanskelig',
    topic: 'klassikere',
    text: `I Josefus-ringen med \`n\` ting går annenhver ut: nummer 2 går først, så nummer 4, og så videre rundt og rundt til én står igjen. Skriv \`function survivor(n)\` som gir tilbake nummeret (fra 1) til den som står igjen.

Sjekken spør om ringer med opptil en milliard ting, så du kan ikke telle deg gjennom. Prøv små ringer for hånd, og se etter mønsteret.`,
    hints: [
      'Skriv opp svaret for n = 1 til 16. Hva skjer hver gang n er en potens av 2?',
      'Når n er en potens av 2, står nummer 1 igjen. Er n litt større, må `n - 2^m` ting ut først (der `2^m` er den største toerpotensen som ikke er større enn n), og da er det den neste i ringen som står for tur.',
      'Svaret er `2 * (n - 2^m) + 1`. Den største toerpotensen finner du med en løkke som dobler, eller med `2 ** Math.floor(Math.log2(n))`.',
    ],
    world: (r) => {
      const items = things(r, 7)
      return makeWorld(items, { queue: items.map((_, i) => at(i)) })
    },
    ting: PLAIN_TING,
    starter: `function survivor(n) {
  // Hvem står igjen når annenhver går ut?
  return 1
}

console.log(survivor(queue.length), survivor(41))
`,
    solution: `function survivor(n) {
  let power = 1
  while (power * 2 <= n) power *= 2
  return 2 * (n - power) + 1
}

console.log(survivor(queue.length), survivor(41))
`,
    exports: ['survivor'],
    check: (t) => {
      const survivor = t.fn('survivor')
      const simulate = (n: number) => {
        const ring = Array.from({ length: n }, (_, i) => i + 1)
        let i = 0
        while (ring.length > 1) {
          i = (i + 1) % ring.length
          ring.splice(i, 1)
          i %= ring.length
        }
        return ring[0]
      }
      for (let n = 1; n <= 64; n++) {
        const got = survivor(n)
        if (got !== simulate(n)) return `survivor(${n}) gav ${t.show(got)}, men nummer ${simulate(n)} står igjen.`
      }
      for (const n of [1000000, 123456789, 1000000000]) {
        let power = 1
        while (power * 2 <= n) power *= 2
        const want = 2 * (n - power) + 1
        const got = survivor(n)
        if (got !== want) return `survivor(${n}) gav ${t.show(got)}, men svaret er ${want}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Josephus_problem#k=2',
  },
]
