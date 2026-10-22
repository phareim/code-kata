import { arrayWorld, at, distinct, int, makeWorld, PALETTE, pick, shuffled, things } from './build'
import { PLAIN_TING } from './classes'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'rosa-sammen',
    title: 'De rosa vil stå sammen',
    level: 'middels',
    topic: 'rydding',
    text: `De rosa tingene vil stå sammen, først i \`items\`. Flytt alle rosa fram.

Både de rosa og de andre skal beholde rekkefølgen de hadde seg imellom.`,
    hints: [
      'Lag to nye arrayer: én med de rosa og én med resten, i den rekkefølgen de står.',
      '`items.filter((t) => t.color === \'pink\')` gir de rosa, i samme rekkefølge.',
      'Sett dem sammen igjen: `items = [...pink, ...rest]`.',
    ],
    world: (r) => {
      const items = things(r)
      const others = ['cyan', 'gold', 'lime', 'violet', 'teal', 'orange']
      const colors = shuffled(r, ['pink', 'pink', 'pink', pick(r, others), pick(r, others), pick(r, others), pick(r, others), pick(r, others)])
      items.forEach((s, i) => { s.color = colors[i] })
      return arrayWorld(items)
    },
    ting: PLAIN_TING,
    starter: `const pink = []
const rest = []
for (const thing of items) {
  // Legg thing i pink eller rest
}
`,
    solution: `const pink = items.filter((t) => t.color === 'pink')
const rest = items.filter((t) => t.color !== 'pink')
items = [...pink, ...rest]
`,
    check: (t) => {
      const before = t.before('items')
      const want = [...before.filter((n) => n.color === 'pink'), ...before.filter((n) => n.color !== 'pink')]
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) return `Plass ${i} skal ha ${t.show(want[i])}, men har ${t.show(t.items[i])}.`
      }
      return true
    },
  },
  {
    id: 'sma-til-venstre',
    title: 'Små til venstre',
    level: 'lett',
    topic: 'rydding',
    text: `Tingene i \`items\` har hver sin \`value\`. De små, med verdi under 50, vil stå til venstre, og de store, med 50 eller mer, til høyre.

Flytt tingene så alle de små står foran alle de store. Rekkefølgen inni hver gruppe spiller ingen rolle. Det skal være de samme tingene i \`items\`, ikke nye.`,
    hints: [
      'Hold styr på hvor neste lille ting skal stå: `let place = 0`. Alt til venstre for `place` er allerede små.',
      'Gå gjennom `items` med `i`. Er `items[i].value` under 50, bytt `items[i]` med `items[place]`.',
      'Etter byttet øker du `place` med én, så området med små vokser mot høyre.',
    ],
    world: (r) => {
      const small = distinct(r, int(r, 3, 5), 1, 49)
      const big = distinct(r, 8 - small.length, 50, 99)
      // A big one first and a small one last, so everything has to move.
      const middle = shuffled(r, [...small.slice(1), ...big.slice(1)])
      const values = [big[0], ...middle, small[0]]
      return arrayWorld(values.map((value) => ({ value, color: value < 50 ? 'cyan' : 'gold' })))
    },
    ting: PLAIN_TING,
    starter: `let place = 0
for (let i = 0; i < items.length; i++) {
  // Er items[i] liten (under 50)? Bytt den med items[place], og øk place.
}
`,
    solution: `let place = 0
for (let i = 0; i < items.length; i++) {
  if (items[i].value < 50) {
    ;[items[i], items[place]] = [items[place], items[i]]
    vis(items[i], items[place])
    place++
  }
}
`,
    check: (t) => {
      const before = t.before('items')
      const items = t.items
      if (!Array.isArray(items)) return '`items` er ikke en array lenger.'
      if (items.length !== before.length || before.some((n) => !items.includes(n))) {
        return 'Det skal være de samme tingene i `items` som før, ikke flere eller færre.'
      }
      let big: any = null
      for (const thing of items) {
        if (thing.value >= 50) big = big ?? thing
        else if (big) return `${t.show(thing)} (${thing.value}) er liten, men står bak ${t.show(big)} (${big.value}) som er stor.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Quicksort#Lomuto_partition_scheme',
  },
  {
    id: 'spokelsene-bakerst',
    title: 'Spøkelsene bakerst',
    level: 'lett',
    topic: 'rydding',
    text: `Noen av tingene i \`items\` er spøkelser: de har \`shape === 'ghost'\`. Spøkelser hører hjemme bakerst.

Flytt alle spøkelsene til slutten av \`items\`. De andre rykker fram. Både spøkelsene og de andre skal beholde rekkefølgen de hadde seg imellom.`,
    hints: [
      'Del tingene i to grupper: spøkelsene og de andre. `thing.shape === \'ghost\'` sier hvem som er hva.',
      'Gå gjennom `items` fra start til slutt og legg hver ting i riktig liste. Da holder rekkefølgen seg.',
      'Sett dem sammen til slutt, de andre først: `items = [...others, ...ghosts]`.',
    ],
    world: (r) => {
      const items = things(r)
      // Two or three ghosts, the first one near the front.
      const ghosts = new Set([int(r, 0, 3)])
      const count = int(r, 2, 3)
      while (ghosts.size < count) ghosts.add(int(r, 0, 7))
      for (const i of ghosts) items[i].shape = 'ghost'
      return arrayWorld(items)
    },
    ting: PLAIN_TING,
    starter: `const others = []
const ghosts = []
for (const thing of items) {
  // Er thing et spøkelse? Legg den i ghosts, ellers i others.
}
`,
    solution: `const others = []
const ghosts = []
for (const thing of items) {
  if (thing.shape === 'ghost') ghosts.push(thing)
  else others.push(thing)
  vis(thing)
}
items = [...others, ...ghosts]
vis(ghosts)
`,
    check: (t) => {
      const before = t.before('items')
      const want = [...before.filter((n) => n.shape !== 'ghost'), ...before.filter((n) => n.shape === 'ghost')]
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) {
          return `Plass ${i} skal ha ${t.show(want[i])}, men har ${t.show(t.items[i])}. Spøkelsene skal bakerst, og alle beholder rekkefølgen i sin gruppe.`
        }
      }
      return true
    },
  },
  {
    id: 'tett-hullene',
    title: 'Tett hullene',
    level: 'lett',
    topic: 'rydding',
    text: `I \`items\` står det ting, og innimellom er det hull: plasser som er \`null\`. Tingene vil stå tett i tett.

Skyv alle tingene mot venstre, i samme rekkefølge som før, så alle hullene havner bakerst. \`items\` skal ha like mange plasser som før.`,
    hints: [
      'Bruk to indekser: `read` går gjennom hele arrayen, og `write` er plassen neste ting skal stå på.',
      'Er `items[read]` ikke `null`, skal den til plass `write`. Øk så `write` med én.',
      'Bytt plass på dem: `[items[write], items[read]] = [items[read], items[write]]`. Da blir hullene liggende igjen bakerst av seg selv.',
    ],
    world: (r) => {
      const holes = int(r, 3, 4)
      // At least one hole sits between two items.
      const between = (k: boolean[]) => k.slice(k.indexOf(true) + 1, k.lastIndexOf(true)).includes(false)
      let kinds = shuffled(r, [...Array(8 - holes).fill(true), ...Array(holes).fill(false)])
      for (let tries = 0; tries < 20 && !between(kinds); tries++) kinds = shuffled(r, kinds)
      let next = 0
      return makeWorld(things(r, 8 - holes), { items: kinds.map((item) => (item ? at(next++) : null)) })
    },
    ting: PLAIN_TING,
    starter: `let write = 0
for (let read = 0; read < items.length; read++) {
  // Er items[read] en ting (ikke null)? Flytt den til plass write, og øk write.
}
`,
    solution: `let write = 0
for (let read = 0; read < items.length; read++) {
  if (items[read] !== null) {
    ;[items[write], items[read]] = [items[read], items[write]]
    vis(items[write])
    write++
  }
}
`,
    check: (t) => {
      const before = t.before('items')
      const want = [...before.filter((n) => n !== null), ...before.filter((n) => n === null)]
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} plasser, men skal ha ${want.length}, som før.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) {
          return `Plass ${i} skal ${want[i] === null ? 'være et hull (null)' : `ha ${t.show(want[i])}`}, men har ${t.show(t.items[i])}.`
        }
      }
      return true
    },
  },
  {
    id: 'snu-raden',
    title: 'Snu raden på stedet',
    level: 'lett',
    topic: 'rydding',
    text: `Skriv \`function reverseInPlace(items)\` som snur en array på stedet: den første tingen havner bakerst, den siste først, og så videre. Du skal endre arrayen du får inn, ikke lage en ny.

Sjekken stenger \`reverse()\`, \`toReversed()\`, \`slice()\`, \`splice()\` og \`sort()\` på arrayen den gir deg, så du må bytte plass på tingene selv. En tom array og en med én ting skal også gå bra. Koden nederst snur tingene på scenen.`,
    hints: [
      'Bytt den første og den siste, så den nest første og nest siste, og slik innover mot midten.',
      'Bruk to indekser: `i` fra start og `j` fra slutt. Bytt `items[i]` og `items[j]`, øk `i` og minsk `j`.',
      'Løkka går så lenge `i < j`. Da stopper den i midten, og en ting alene i midten trenger ikke flyttes.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    starter: `function reverseInPlace(items) {
  // Bytt første og siste, så nest første og nest siste, helt til du møter midten
}

reverseInPlace(items)
`,
    solution: `function reverseInPlace(items) {
  for (let i = 0, j = items.length - 1; i < j; i++, j--) {
    ;[items[i], items[j]] = [items[j], items[i]]
    vis(items[i], items[j])
  }
}

reverseInPlace(items)
`,
    exports: ['reverseInPlace'],
    check: (t) => {
      const reverseInPlace = t.fn('reverseInPlace')
      for (const n of [0, 1, 2, 5, 8]) {
        const original = Array.from({ length: n }, (_, i) => t.ting({ value: i + 1 }))
        const arr = [...original]
        for (const name of ['reverse', 'toReversed', 'slice', 'splice', 'sort']) {
          Object.defineProperty(arr, name, {
            value() {
              throw new Error(`${name}() er stengt i denne oppgaven: bytt plass på tingene selv.`)
            },
          })
        }
        const got = reverseInPlace(arr)
        if (arr.length !== n) return `Arrayen skulle fortsatt ha ${n} ting, men har ${arr.length}.`
        for (let i = 0; i < n; i++) {
          if (arr[i] !== original[n - 1 - i]) {
            const hint = Array.isArray(got) && got !== arr ? ' Du ga tilbake en ny array; endre den du fikk inn.' : ''
            return `Med ${n} ting skal plass ${i} ha tingen med verdi ${n - i}, men har ${t.show(arr[i]?.value)}.${hint}`
          }
        }
      }
      const before = t.before('items')
      if (!Array.isArray(t.items) || t.items.length !== before.length) return '`items` på scenen skal ha like mange ting som før.'
      for (let i = 0; i < before.length; i++) {
        const want = before[before.length - 1 - i]
        if (t.items[i] !== want) return `På scenen skal plass ${i} ha ${t.show(want)}, men har ${t.show(t.items[i])}. Kall funksjonen på \`items\` også.`
      }
      return true
    },
  },
  {
    id: 'en-av-hver-farge',
    title: 'Én av hver farge',
    level: 'lett',
    topic: 'rydding',
    text: `Flere av tingene i \`items\` har samme \`color\`. Nå vil bare én av hver farge være med videre: den som står først.

La \`items\` bare holde den første tingen av hver farge, i samme rekkefølge som før. De andre skal ut av \`items\`.`,
    hints: [
      'Du må huske hvilke farger du allerede har sett. Et `Set` passer: `seen.has(farge)` og `seen.add(farge)`.',
      'Gå gjennom `items` fra venstre. Er `thing.color` ikke i `seen` ennå, er det den første av sin farge.',
      'Legg de første i en ny array, `first`, og sett `items = first` etter løkka.',
    ],
    world: (r) => {
      const items = things(r)
      const colors = shuffled(r, PALETTE).slice(0, int(r, 3, 4))
      // Every colour at least once, the rest repeated.
      const list = shuffled(r, [...colors, ...Array.from({ length: 8 - colors.length }, () => pick(r, colors))])
      items.forEach((s, i) => { s.color = list[i] })
      return arrayWorld(items)
    },
    ting: PLAIN_TING,
    starter: `const seen = new Set()
const first = []
for (const thing of items) {
  // Har du sett thing.color før? Hvis ikke: husk fargen i seen, og legg thing i first.
}
`,
    solution: `const seen = new Set()
const first = []
for (const thing of items) {
  if (seen.has(thing.color)) {
    vis('har sett fargen', thing)
  } else {
    seen.add(thing.color)
    first.push(thing)
    vis('ny farge', thing)
  }
}
items = first
`,
    check: (t) => {
      const seen = new Set()
      const want = []
      for (const copy of t.start.items) {
        if (!seen.has(copy.color)) {
          seen.add(copy.color)
          want.push(t.live(copy))
        }
      }
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men det er ${want.length} farger, så det skal være ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) return `Plass ${i} skal ha ${t.show(want[i])}, den første av sin farge, men har ${t.show(t.items[i])}.`
      }
      return true
    },
  },
  {
    id: 'roter-raden',
    title: 'Roter raden',
    level: 'middels',
    topic: 'rydding',
    text: `Skriv \`function rotate(items, k)\` som flytter de siste \`k\` tingene fram foran de andre, på stedet. Med \`[A, B, C, D, E]\` og \`k = 2\` blir det \`[D, E, A, B, C]\`. Rekkefølgen skal ellers holde seg.

\`k\` kan være større enn antall ting (da går du rundt igjen) og den kan være 0. Sjekken prøver også en tom array. Endre arrayen du får inn, ikke lag en ny. Koden nederst roterer tingene på scenen med 3.`,
    hints: [
      'Å rotere med `k` er det samme som å rotere med `k % items.length`, så store tall går bare rundt. Pass på den tomme arrayen: der finnes ikke noe å dele på.',
      'Det går an uten ekstra array: snu hele raden, snu så de første `k`, og snu til slutt resten. Skriv en hjelpefunksjon `reverse(a, i, j)` som snur plassene `i` til `j`.',
      'Etter at hele raden er snudd, ligger de siste `k` først, men baklengs. Snu plassene `0` til `k - 1` og så `k` til `n - 1`, så står hver del rett vei igjen.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    starter: `function rotate(items, k) {
  const n = items.length
  // k kan være større enn n, og n kan være 0
}

rotate(items, 3)
`,
    solution: `function reverse(a, i, j) {
  while (i < j) {
    ;[a[i], a[j]] = [a[j], a[i]]
    vis(a[i], a[j])
    i++
    j--
  }
}

function rotate(items, k) {
  const n = items.length
  if (n === 0) return
  k %= n
  reverse(items, 0, n - 1)
  reverse(items, 0, k - 1)
  reverse(items, k, n - 1)
}

rotate(items, 3)
`,
    exports: ['rotate'],
    check: (t) => {
      const rotate = t.fn('rotate')
      const cases = [[0, 3], [1, 5], [2, 1], [5, 0], [5, 2], [5, 5], [5, 7], [8, 3], [8, 19], [8, 8]]
      for (const [n, k] of cases) {
        const original = Array.from({ length: n }, (_, i) => t.ting({ value: i + 1 }))
        const arr = [...original]
        rotate(arr, k)
        const shift = n ? k % n : 0
        const want = [...original.slice(n - shift), ...original.slice(0, n - shift)]
        if (arr.length !== n) return `Med ${n} ting og k = ${k} har arrayen ${arr.length} ting etterpå.`
        for (let i = 0; i < n; i++) {
          if (arr[i] !== want[i]) return `Med ${n} ting og k = ${k} skal plass ${i} ha tingen med verdi ${want[i].value}, men har ${t.show(arr[i]?.value)}.`
        }
      }
      const before = t.before('items')
      const cut = before.length - (3 % before.length)
      const onStage = [...before.slice(cut), ...before.slice(0, cut)]
      if (!Array.isArray(t.items) || t.items.length !== onStage.length) return '`items` på scenen skal ha like mange ting som før.'
      for (let i = 0; i < onStage.length; i++) {
        if (t.items[i] !== onStage[i]) return `På scenen skal plass ${i} ha ${t.show(onStage[i])}, men har ${t.show(t.items[i])}. Kall \`rotate(items, 3)\` også.`
      }
      return true
    },
  },
  {
    id: 'tre-farger',
    title: 'Tre farger på rad',
    level: 'middels',
    topic: 'rydding',
    text: `Tingene i \`items\` er røde (\`'red'\`), gule (\`'gold'\`) eller cyan (\`'cyan'\`). De vil stå i tre blokker: de røde først, så de gule, og til slutt de cyan.

Skriv \`function flag(items, swap)\` som ordner dem i én gjennomgang, med tre pekere. Du bytter plass med \`swap(i, j)\`, som du får inn; ikke skriv direkte i \`items\`. Sjekken teller byttene, og du skal klare deg med høyst like mange bytter som det er ting. Koden nederst kjører funksjonen på tingene på scenen.`,
    hints: [
      'Tenk deg tre områder: røde fremst, gule i midten, cyan bakerst. Hold styr på tre indekser: `low` (der neste røde skal stå), `mid` (den du ser på) og `high` (der neste cyan skal stå).',
      'Se på `items[mid]`. Er den rød: bytt den med `low`, og øk både `low` og `mid`. Er den gul: øk bare `mid`.',
      'Er den cyan: bytt den med `high` og minsk `high`, men ikke øk `mid`, for tingen du fikk fra `high` er ikke sett på ennå. Løkka går så lenge `mid <= high`.',
    ],
    world: (r) => {
      const items = things(r)
      const reds = int(r, 2, 3)
      const golds = int(r, 2, 3)
      const colors = shuffled(r, [...Array(reds).fill('red'), ...Array(golds).fill('gold'), ...Array(8 - reds - golds).fill('cyan')])
      // A cyan first and a red last, so there is work to do.
      const c = colors.indexOf('cyan')
      ;[colors[0], colors[c]] = [colors[c], colors[0]]
      const red = colors.lastIndexOf('red')
      ;[colors[7], colors[red]] = [colors[red], colors[7]]
      items.forEach((s, i) => { s.color = colors[i] })
      return arrayWorld(items)
    },
    ting: PLAIN_TING,
    starter: `function flag(items, swap) {
  let low = 0
  let mid = 0
  let high = items.length - 1
  // Se på items[mid]: rød skal til low, gul blir liggende, cyan skal til high
}

flag(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function flag(items, swap) {
  let low = 0
  let mid = 0
  let high = items.length - 1
  while (mid <= high) {
    const color = items[mid].color
    if (color === 'red') {
      swap(low, mid)
      low++
      mid++
    } else if (color === 'gold') {
      mid++
    } else {
      swap(mid, high)
      high--
    }
  }
}

flag(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['flag'],
    source: 'https://en.wikipedia.org/wiki/Dutch_national_flag_problem',
    check: (t) => {
      const flag = t.fn('flag')
      const rank: Record<string, number> = { red: 0, gold: 1, cyan: 2 }
      const names: Record<string, string> = { r: 'red', g: 'gold', c: 'cyan' }
      const cases = ['', 'r', 'c', 'cg', 'gr', 'rgc', 'cgr', 'rrrr', 'cccggg', 'cgrcgrcgr', 'rcgrcgrcgrcg', 'ggrrccgrcrgccrg']
      let seed = 7
      for (let k = 0; k < 4; k++) {
        let s = ''
        for (let i = 0; i < 12 + k; i++) {
          seed = (seed * 16807) % 2147483647
          s += 'rgc'[seed % 3]
        }
        cases.push(s)
      }
      const frozen = (e: unknown) => { throw new Error(`Bytt plass med swap(i, j), ikke ved å skrive i arrayen (${String(e)}).`) }
      for (const s of cases) {
        const original = [...s].map((ch, i) => Object.freeze(t.ting({ value: i + 1, color: names[ch] })))
        const arr = [...original]
        const view = new Proxy(arr, {
          set: (_, key) => frozen(String(key)),
          deleteProperty: (_, key) => frozen(String(key)),
        })
        let swaps = 0
        const swap = (i: number, j: number) => {
          if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= arr.length || j >= arr.length) {
            throw new Error(`swap(${t.show(i)}, ${t.show(j)}) peker utenfor arrayen med ${arr.length} ting.`)
          }
          swaps++
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        flag(view, swap)
        const colors = arr.map((x) => x.color).join(', ')
        for (let i = 1; i < arr.length; i++) {
          if (rank[arr[i].color] < rank[arr[i - 1].color]) {
            return `Med fargene [${original.map((x) => x.color).join(', ')}] ble det [${colors}]. Rødt skal først, så gull, så cyan.`
          }
        }
        if (swaps > arr.length) return `Antall bytter ble ${swaps} på ${arr.length} ting, men i én gjennomgang holder det med høyst ${arr.length}.`
      }
      const before = t.before('items')
      const items = t.items
      if (!Array.isArray(items) || items.length !== before.length || before.some((n) => !items.includes(n))) {
        return 'Det skal være de samme tingene i `items` som før.'
      }
      for (let i = 1; i < items.length; i++) {
        if (rank[items[i].color] < rank[items[i - 1].color]) {
          return `På scenen står ${t.show(items[i])} (${items[i].color}) bak ${t.show(items[i - 1])} (${items[i - 1].color}). Kall \`flag\` på \`items\` også.`
        }
      }
      return true
    },
  },
  {
    id: 'bolgen',
    title: 'Bølgen',
    level: 'middels',
    topic: 'rydding',
    text: `Tingene i \`items\` vil stå som en bølge, store og små om hverandre: \`items[0]\` ≥ \`items[1]\` ≤ \`items[2]\` ≥ \`items[3]\` ≤ … Annenhver ting er en topp, og de i mellom er daler. Det går bra at to naboer er like store.

Du trenger ikke sortere. Bare bytt plass til hver ting passer med naboene sine. Det skal være de samme tingene i \`items\` etterpå.`,
    hints: [
      'Se på ett par naboer om gangen: plassene 1, 3, 5 … skal ikke ha større verdi enn naboen foran, og plassene 2, 4, 6 … ikke mindre.',
      'Gå gjennom `items` fra plass 1. Står `items[i]` og `items[i - 1]` feil vei for plassen `i`, bytter du dem.',
      'For oddetall `i` bytter du hvis `items[i].value > items[i - 1].value`, for partall hvis `<`. Én gjennomgang holder, for et bytte ødelegger aldri det som allerede passet.',
    ],
    world: (r) => {
      const wave = (v: number[]) => v.every((x, i) => i === 0 || (i % 2 === 1 ? x <= v[i - 1] : x >= v[i - 1]))
      let values = distinct(r, 8)
      for (let tries = 0; tries < 50 && wave(values); tries++) values = shuffled(r, values)
      return arrayWorld(values.map((value) => ({ value, color: pick(r, PALETTE) })))
    },
    ting: PLAIN_TING,
    starter: `for (let i = 1; i < items.length; i++) {
  // Oddetall-plasser skal ikke være større enn plassen foran,
  // partall-plasser skal ikke være mindre. Står de feil vei? Bytt.
}
`,
    solution: `for (let i = 1; i < items.length; i++) {
  const wrong = i % 2 === 1
    ? items[i].value > items[i - 1].value
    : items[i].value < items[i - 1].value
  if (wrong) {
    ;[items[i - 1], items[i]] = [items[i], items[i - 1]]
    vis(items[i - 1], items[i])
  }
}
`,
    check: (t) => {
      const before = t.before('items')
      const items = t.items
      if (!Array.isArray(items)) return '`items` er ikke en array lenger.'
      if (items.length !== before.length || before.some((n) => !items.includes(n))) {
        return 'Det skal være de samme tingene i `items` som før, ikke flere eller færre.'
      }
      for (let i = 1; i < items.length; i++) {
        const a = items[i - 1]
        const b = items[i]
        if (i % 2 === 1 && b.value > a.value) return `Plass ${i} (${t.show(b)}, ${b.value}) er større enn plass ${i - 1} (${t.show(a)}, ${a.value}); den skal være mindre eller lik.`
        if (i % 2 === 0 && b.value < a.value) return `Plass ${i} (${t.show(b)}, ${b.value}) er mindre enn plass ${i - 1} (${t.show(a)}, ${a.value}); den skal være større eller lik.`
      }
      return true
    },
  },
  {
    id: 'like-naboer',
    title: 'Like naboer slår seg sammen',
    level: 'middels',
    topic: 'rydding',
    text: `Når to naboer i \`items\` har samme \`color\`, slår de seg sammen: den til venstre får summen av de to \`value\`, og den til høyre forlater \`items\`.

Gjenta til ingen naboer har samme farge. Tre like på rad blir altså til én ting med summen av alle tre. Alle som blir igjen, skal beholde rekkefølgen og fargen sin.`,
    hints: [
      'Gå gjennom `items` med en indeks `i`, og sammenlign `items[i]` med `items[i + 1]`.',
      'Har de samme `color`: legg verdien til den fremste, `items[i].value += items[i + 1].value`, og ta den bakerste ut med `items.splice(i + 1, 1)`.',
      'Etter en sammenslåing flytter du ikke `i`: den nye naboen kan ha samme farge også. Øk `i` bare når de to har ulik farge.',
    ],
    world: (r) => {
      const items = things(r)
      // Runs of one to three of a colour, side by side with a different colour.
      const colors = ['pink', 'cyan', 'gold', 'lime', 'violet', 'teal']
      let slot = 0
      let last = ''
      for (const length of shuffled(r, [2, 3, 1, 2])) {
        let color = pick(r, colors)
        while (color === last) color = pick(r, colors)
        last = color
        for (let k = 0; k < length; k++) items[slot++].color = color
      }
      return arrayWorld(items)
    },
    ting: PLAIN_TING,
    starter: `let i = 0
while (i + 1 < items.length) {
  // Har items[i] og items[i + 1] samme farge? Slå dem sammen.
  // Pass på: etter en sammenslåing kan den nye naboen ha samme farge også.
  i++
}
`,
    solution: `let i = 0
while (i + 1 < items.length) {
  if (items[i].color === items[i + 1].color) {
    items[i].value += items[i + 1].value
    items.splice(i + 1, 1)
    vis(items[i])
  } else {
    i++
  }
}
`,
    check: (t) => {
      // The groups of one colour in a row, from the start: the first item of each stands for the group.
      const groups: { first: any; value: number; color: string }[] = []
      for (const copy of t.start.items) {
        const last = groups[groups.length - 1]
        if (last && last.color === copy.color) last.value += copy.value
        else groups.push({ first: t.live(copy), value: copy.value, color: copy.color })
      }
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== groups.length) {
        return `\`items\` har ${t.items.length} ting, men skal ha ${groups.length}: én for hver gruppe av samme farge på rad.`
      }
      for (let i = 0; i < groups.length; i++) {
        const got = t.items[i]
        if (got !== groups[i].first) return `Plass ${i} skal ha ${t.show(groups[i].first)}, den fremste i sin gruppe, men har ${t.show(got)}.`
        if (got.value !== groups[i].value) return `${t.show(got)} skal ha verdien ${groups[i].value}, summen av gruppen, men har ${t.show(got.value)}.`
      }
      return true
    },
  },
  {
    id: 'neste-ordning',
    title: 'Neste ordning',
    level: 'vanskelig',
    topic: 'rydding',
    text: `Tingene i \`items\` kan stå i mange rekkefølger. Sorter alle rekkefølgene som i en ordbok, med \`value\` som bokstavene: først \`[1, 2, 3]\`, så \`[1, 3, 2]\`, så \`[2, 1, 3]\`, og slik videre til \`[3, 2, 1]\`.

Skriv \`function nextPermutation(items)\` som endrer rekkefølgen i \`items\` på stedet, så tingene står i rekkefølgen rett etter den de har nå. Står de i den siste (størst først), skal de gå rundt til den første (minst først). Samme verdi kan forekomme flere ganger, og en tom array eller én ting skal bli som den er. Koden nederst kjører funksjonen på tingene på scenen.`,
    hints: [
      'Endre så lite som mulig, helst bare slutten. Les fra høyre og finn den lengste halen som aldri går opp (hver ting er minst like stor som den bak); plassen rett foran den kaller vi `i`.',
      'Bytt `items[i]` med den minste tingen i halen som er større enn den. Leser du halen fra høyre, er det den første du møter som er større enn `items[i]`.',
      'Halen går fortsatt nedover; snu den ved å bytte fra endene mot midten, så blir den minst mulig. Fant du ingen `i`, er hele raden den siste, og da snur du alt.',
    ],
    world: (r) => {
      let values = distinct(r, 8)
      // The last two stand the wrong way, so the change reaches further back than the end.
      if (values[6] < values[7]) [values[6], values[7]] = [values[7], values[6]]
      if (values.every((v, i) => i === 0 || values[i - 1] > v)) values = [values[1], values[0], ...values.slice(2)]
      return arrayWorld(values.map((value) => ({ value, color: pick(r, PALETTE) })))
    },
    ting: PLAIN_TING,
    starter: `function nextPermutation(items) {
  // 1. Fra slutten: finn siste plass i der items[i] er mindre enn items[i + 1]
  // 2. Fra slutten: finn første j der items[j] er større enn items[i], og bytt dem
  // 3. Snu alt som står etter plass i
}

nextPermutation(items)
`,
    solution: `function nextPermutation(items) {
  let i = items.length - 2
  while (i >= 0 && items[i].value >= items[i + 1].value) i--
  if (i >= 0) {
    let j = items.length - 1
    while (items[j].value <= items[i].value) j--
    ;[items[i], items[j]] = [items[j], items[i]]
    vis(items[i], items[j])
  }
  for (let a = i + 1, b = items.length - 1; a < b; a++, b--) {
    ;[items[a], items[b]] = [items[b], items[a]]
    vis(items[a], items[b])
  }
}

nextPermutation(items)
`,
    exports: ['nextPermutation'],
    source: 'https://en.wikipedia.org/wiki/Permutation#Generation_in_lexicographic_order',
    check: (t) => {
      const nextPermutation = t.fn('nextPermutation')
      const run = (values: number[]) => {
        const original = values.map((value) => t.ting({ value }))
        const arr = [...original]
        nextPermutation(arr)
        return { original, arr, got: arr.map((x) => x?.value) }
      }
      const fixed: [number[], number[]][] = [
        [[], []],
        [[5], [5]],
        [[1, 2, 3], [1, 3, 2]],
        [[3, 2, 1], [1, 2, 3]],
        [[2, 3, 1], [3, 1, 2]],
        [[1, 1, 5], [1, 5, 1]],
        [[1, 5, 1], [5, 1, 1]],
        [[5, 1, 1], [1, 1, 5]],
        [[1, 2, 2, 3], [1, 2, 3, 2]],
        [[1, 3, 2, 2], [2, 1, 2, 3]],
        [[6, 8, 7, 4, 3, 2], [7, 2, 3, 4, 6, 8]],
        [[1, 2, 3, 6, 5, 4], [1, 2, 4, 3, 5, 6]],
      ]
      for (const [values, want] of fixed) {
        const { original, arr, got } = run(values)
        if (got.length !== want.length || got.some((v, i) => v !== want[i])) {
          return `Fra [${values.join(', ')}] ble det [${got.join(', ')}], men neste er [${want.join(', ')}].`
        }
        if (new Set(arr).size !== original.length || arr.some((x) => !original.includes(x))) return 'Det skal være de samme tingene etterpå, bare i en annen rekkefølge.'
      }
      // Every ordering of 3 and of 4 different values, in dictionary order; the last wraps round to the first.
      const orderings = (list: number[]): number[][] =>
        list.length <= 1 ? [list] : list.flatMap((x, i) => orderings([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [x, ...rest]))
      for (const n of [3, 4]) {
        const all = orderings(Array.from({ length: n }, (_, i) => i + 1))
        for (let k = 0; k < all.length; k++) {
          const want = all[(k + 1) % all.length]
          const { got } = run(all[k])
          if (got.length !== n || got.some((v, i) => v !== want[i])) {
            return `Fra [${all[k].join(', ')}] ble det [${got.join(', ')}], men neste er [${want.join(', ')}].`
          }
        }
      }
      // The stage: the next ordering of the values it started with.
      const v: number[] = t.start.items.map((c: { value: number }) => c.value)
      let i = v.length - 2
      while (i >= 0 && v[i] >= v[i + 1]) i--
      if (i >= 0) {
        let j = v.length - 1
        while (v[j] <= v[i]) j--
        ;[v[i], v[j]] = [v[j], v[i]]
      }
      const want = [...v.slice(0, i + 1), ...v.slice(i + 1).reverse()]
      const before = t.before('items')
      if (!Array.isArray(t.items) || t.items.length !== want.length || before.some((n) => !t.items.includes(n))) {
        return 'Det skal være de samme tingene i `items` som før.'
      }
      for (let k = 0; k < want.length; k++) {
        if (t.items[k].value !== want[k]) return `På scenen skal plass ${k} ha verdien ${want[k]}, men har ${t.items[k].value}. Kall funksjonen på \`items\` også.`
      }
      return true
    },
  },
  {
    id: 'faerrest-bytter',
    title: 'Færrest mulig bytter',
    level: 'vanskelig',
    topic: 'rydding',
    text: `Noen av tingene i \`items\` er cyan. De vil stå side om side, uten andre ting mellom seg. Hvor de ender, bestemmer du selv, men hvert bytte av to ting koster.

Skriv \`function groupCyan(items, swap)\` som samler alle cyan med færrest mulig bytter. Du bytter med \`swap(i, j)\`, som du får inn; ikke skriv direkte i \`items\`. Sjekken teller byttene og godtar bare det minste antallet som går an. Er det ingen cyan, eller bare én, eller de allerede står side om side, skal du ikke bytte noe. Koden nederst kjører funksjonen på tingene på scenen.`,
    hints: [
      'Tell først hvor mange cyan det er: `k`. De skal ende på `k` plasser på rad. Spørsmålet er hvilke `k` plasser.',
      'Velg stedet der det allerede står flest cyan. Gli et vindu med `k` plasser over `items` og tell cyan i vinduet underveis.',
      'Hver ting i vinduet som ikke er cyan, må byttes mot en cyan utenfor vinduet. Færrest bytter er altså `k` minus det største antallet cyan i et vindu.',
    ],
    world: (r) => {
      const k = int(r, 3, 4)
      const grouped = (f: boolean[]) => f.lastIndexOf(true) - f.indexOf(true) + 1 === k
      let flags = shuffled(r, [...Array(k).fill(true), ...Array(8 - k).fill(false)])
      for (let tries = 0; tries < 20 && grouped(flags); tries++) flags = shuffled(r, flags)
      const others = ['pink', 'gold', 'lime', 'violet', 'orange', 'red', 'teal']
      return arrayWorld(things(r).map((spec, i) => ({ ...spec, color: flags[i] ? 'cyan' : pick(r, others) })))
    },
    ting: PLAIN_TING,
    starter: `function groupCyan(items, swap) {
  // Hvor mange cyan er det? Hvilke plasser skal de stå på?
}

groupCyan(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function groupCyan(items, swap) {
  const k = items.filter((t) => t.color === 'cyan').length
  if (k < 2) return
  // Vinduet med k plasser som allerede har flest cyan
  let inside = 0
  for (let i = 0; i < k; i++) if (items[i].color === 'cyan') inside++
  let best = inside
  let start = 0
  for (let i = k; i < items.length; i++) {
    if (items[i].color === 'cyan') inside++
    if (items[i - k].color === 'cyan') inside--
    if (inside > best) {
      best = inside
      start = i - k + 1
    }
  }
  // Hver ikke-cyan i vinduet byttes mot en cyan utenfor
  const inWindow = (i) => i >= start && i < start + k
  let from = 0
  for (let to = start; to < start + k; to++) {
    if (items[to].color === 'cyan') continue
    while (inWindow(from) || items[from].color !== 'cyan') from++
    swap(to, from)
  }
}

groupCyan(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['groupCyan'],
    check: (t) => {
      const groupCyan = t.fn('groupCyan')
      const cases = ['', 'c', 'x', 'xcx', 'ccxx', 'cxcx', 'ccc', 'xxcccxxx', 'cxxxxxxc', 'xcxxcxxc', 'cxcxcxcx', 'ccxcxcc', 'xxxxccxxxcxxc', 'cxxcxxcxxcxxcxxc']
      const others = ['pink', 'gold', 'lime', 'violet', 'orange', 'red', 'teal']
      const frozen = (e: unknown) => { throw new Error(`Bytt plass med swap(i, j), ikke ved å skrive i arrayen (${String(e)}).`) }
      for (const s of cases) {
        const original = [...s].map((ch, i) => Object.freeze(t.ting({ value: i + 1, color: ch === 'c' ? 'cyan' : others[i % others.length] })))
        const k = original.filter((x) => x.color === 'cyan').length
        // The fewest swaps: each thing in the best window of k places that isn't cyan needs one swap.
        let inside = 0
        let best = 0
        for (let i = 0; i < original.length; i++) {
          if (original[i].color === 'cyan') inside++
          if (i >= k && original[i - k].color === 'cyan') inside--
          if (i >= k - 1) best = Math.max(best, inside)
        }
        const fewest = k ? k - best : 0
        const arr = [...original]
        const view = new Proxy(arr, {
          set: (_, key) => frozen(String(key)),
          deleteProperty: (_, key) => frozen(String(key)),
        })
        let swaps = 0
        const swap = (i: number, j: number) => {
          if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= arr.length || j >= arr.length) {
            throw new Error(`swap(${t.show(i)}, ${t.show(j)}) peker utenfor arrayen med ${arr.length} ting.`)
          }
          if (i !== j) swaps++
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        groupCyan(view, swap)
        const row = (list: { color: string }[]) => list.map((x) => (x.color === 'cyan' ? 'C' : '·')).join('')
        const first = arr.findIndex((x) => x.color === 'cyan')
        const last = arr.map((x) => x.color).lastIndexOf('cyan')
        if (k && last - first + 1 !== k) return `Raden ${row(original)} ble ${row(arr)}. Cyan (C) skal stå side om side.`
        if (swaps > fewest) return `Raden ${row(original)}: antall bytter ble ${swaps}, men det går med ${fewest}.`
      }
      const before = t.before('items')
      const items = t.items
      if (!Array.isArray(items) || items.length !== before.length || before.some((n) => !items.includes(n))) {
        return 'Det skal være de samme tingene i `items` som før.'
      }
      const colors = items.map((x: { color: string }) => x.color)
      const k = colors.filter((c: string) => c === 'cyan').length
      if (k && colors.lastIndexOf('cyan') - colors.indexOf('cyan') + 1 !== k) return 'På scenen står ikke cyan side om side ennå. Kall `groupCyan` på `items` også.'
      return true
    },
  },
]
