import { arrayWorld, at, int, makeWorld, PALETTE, pick, shuffled, things, type Spec } from './build'
import { PLAIN_TING } from './classes'
import type { Task } from './types'

const descending = (row: Spec[]) => row.every((s, i) => i === 0 || (row[i - 1].value as number) >= (s.value as number))

/** n discs, the biggest at the bottom of pegs[0]. */
function tower(n: number) {
  const items = Array.from({ length: n }, (_, i) => ({ value: n - i, color: PALETTE[i] }))
  return makeWorld(items, { pegs: [items.map((_, i) => at(i)), [], []] })
}

const BRACKETS: Record<string, string> = { '(': 'violet', ')': 'teal', '[': 'pink', ']': 'cyan' }

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
  {
    id: 'tre-pa-en-av',
    title: 'Tre på, én av',
    level: 'lett',
    topic: 'stabler',
    text: `Tre ting, A, B og C, står i \`items\`, og ved siden av står en tom stabel, \`stack\`. På en stabel legger du til øverst med \`push\` og tar bort øverst med \`pop\`.

Legg A, B og C på stabelen, i den rekkefølgen, så de ikke lenger står i \`items\`. Ta så den øverste av stabelen igjen og legg den tilbake i \`items\`. Til slutt skal \`stack\` ha A og B, med B øverst, og \`items\` bare C.`,
    hints: [
      '`stack.push(x)` legger `x` øverst. `items.shift()` tar den første ut av `items` og gir den tilbake.',
      'Gjør `stack.push(items.shift())` tre ganger. Da ligger C øverst, og `items` er tom.',
      '`stack.pop()` tar den øverste av og gir den tilbake. Legg den i `items` med `items.push(…)`.',
    ],
    world: (r) => arrayWorld(things(r, 3), undefined, 'items', { stack: [] }),
    ting: PLAIN_TING,
    starter: `// 1. Flytt A, B og C fra items til stack, i den rekkefølgen
// 2. Ta den øverste av stack og legg den tilbake i items
console.log(items.length, stack.length)
`,
    solution: `while (items.length) {
  stack.push(items.shift())
  vis()
}
items.push(stack.pop())
vis()
`,
    check: (t) => {
      const [a, b, c] = t.before('items')
      if (!Array.isArray(t.items) || !Array.isArray(t.stack)) return '`items` og `stack` skal fortsatt være arrayer.'
      if (t.stack.length !== 2 || t.stack[0] !== a || t.stack[1] !== b) {
        return `Stabelen skal ha ${t.show([a, b])}, med ${t.show(b)} øverst, men har ${t.show(t.stack)}.`
      }
      if (t.items.length !== 1 || t.items[0] !== c) return `\`items\` skal bare ha ${t.show(c)}, men har ${t.show(t.items)}.`
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Stack_(abstract_data_type)',
  },
  {
    id: 'titt-pa-toppen',
    title: 'Titt på toppen',
    level: 'lett',
    topic: 'stabler',
    text: `Tingene i \`stack\` er en stabel: den øverste er den siste i arrayen, den som ble lagt på sist. Noen ganger vil du bare se hvem som ligger øverst, uten å ta den av.

Skriv \`function peek(stack)\` som gir tilbake den øverste tingen uten å fjerne den. Er stabelen tom, gir den tilbake \`undefined\`. Stabelen skal ha de samme tingene etterpå som før.`,
    hints: [
      'Den øverste er den siste i arrayen, på plass `stack.length - 1`.',
      '`stack[stack.length - 1]` er tingen. `pop()` ville tatt den av, så den skal du ikke bruke her.',
      'En tom array har ingen siste plass, og `stack[-1]` er `undefined`. Den samme linjen klarer altså også en tom stabel. `stack.at(-1)` gjør det samme.',
    ],
    world: (r) => arrayWorld(things(r, 5), undefined, 'stack'),
    ting: PLAIN_TING,
    starter: `function peek(stack) {
  // Hvem ligger øverst? Ikke ta den av.
}

console.log(peek(stack))
`,
    solution: `function peek(stack) {
  const top = stack[stack.length - 1]
  vis(top)
  return top
}

console.log(peek(stack))
`,
    exports: ['peek'],
    check: (t) => {
      const peek = t.fn('peek')
      const cases: number[][] = [[], [4], [3, 8, 1], [5, 5]]
      for (const values of cases) {
        const stack = values.map((value) => t.ting({ value }))
        const copy = [...stack]
        const got = peek(stack)
        const shown = `[${values.join(', ')}]`
        if (!values.length) {
          if (got !== undefined) return `peek gav ${t.show(got?.value)} for en tom stabel, men skal gi undefined.`
        } else if (got !== copy[copy.length - 1]) {
          return `peek(${shown}) gav ${got === undefined ? 'undefined' : t.show(got.value)}, men den øverste har ${values[values.length - 1]}.`
        }
        if (stack.length !== copy.length || stack.some((x, i) => x !== copy[i])) return `peek(${shown}) endret stabelen. Den skal bare se, ikke ta bort noe.`
      }
      return true
    },
  },
  {
    id: 'spokelset-bakerst',
    title: 'Spøkelset vil bakerst',
    level: 'lett',
    topic: 'stabler',
    text: `Tingene står i kø i \`queue\`: den første i arrayen er først i køen, og nye stiller seg bakerst. Spøkelset (\`shape: 'ghost'\`) står først, men vil heller stå bakerst.

Flytt spøkelset bakerst i køen. Bruk \`shift()\` til å ta ut den første, og \`push()\` til å stille den bakerst. De andre skal stå i samme rekkefølge som før.`,
    hints: [
      '`queue.shift()` tar den første ut av køen og gir den tilbake.',
      '`queue.push(x)` stiller `x` bakerst i køen.',
      'Sett de to sammen: `queue.push(queue.shift())`.',
    ],
    world: (r) => {
      const items = things(r, 6).map((spec, i) => ({ ...spec, shape: i === 0 ? 'ghost' : pick(r, ['blob', 'cat', 'bot']) }))
      return arrayWorld(items, undefined, 'queue')
    },
    ting: PLAIN_TING,
    starter: `// Spøkelset står først i køen. Send det bakerst.
console.log(queue[0].shape)
`,
    solution: `queue.push(queue.shift())
vis()
`,
    check: (t) => {
      const before = t.before('queue')
      const want = [...before.slice(1), before[0]]
      if (!Array.isArray(t.queue)) return '`queue` er ikke en array lenger.'
      if (t.queue.length !== want.length) return `Køen har ${t.queue.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.queue[i] !== want[i]) return `Plass ${i} i køen skal ha ${t.show(want[i])}, men har ${t.show(t.queue[i])}.`
      }
      return true
    },
  },
  {
    id: 'runde-for-runde',
    title: 'Runde for runde',
    level: 'middels',
    topic: 'stabler',
    text: `Tingene står i kø i \`queue\`, og hver har en \`value\` fra 1 til 4 som sier hvor mange runder den har igjen. Ved siden av står en tom array, \`removed\`, til de som blir ferdige.

Gjør runder til køen er tom. I hver runde tar du den første ut av køen og trekker 1 fra \`value\`. Er \`value\` fortsatt over 0, stiller tingen seg bakerst i køen igjen. Er den 0, er den ferdig, og den legges bakerst i \`removed\`.

Til slutt er \`queue\` tom, og \`removed\` har alle tingene i den rekkefølgen de ble ferdige. Alle har da \`value\` 0.`,
    hints: [
      '`while (queue.length)` går så lenge køen har noe i seg. Ta den første med `const thing = queue.shift()`.',
      'Trekk fra én med `thing.value--`.',
      'Er `thing.value > 0`, stiller du den bakerst med `queue.push(thing)`. Ellers legger du den i `removed` med `removed.push(thing)`.',
    ],
    world: (r) => {
      const values = shuffled(r, [1, 4, int(r, 1, 4), int(r, 1, 4), int(r, 1, 4), int(r, 1, 4)])
      const items = things(r, 6).map((spec, i) => ({ ...spec, value: values[i] }))
      return arrayWorld(items, undefined, 'queue', { removed: [] })
    },
    ting: PLAIN_TING,
    starter: `while (queue.length) {
  const thing = queue.shift()
  // Trekk 1 fra value. Bakerst i køen igjen, eller ferdig?
  removed.push(thing)
}
`,
    solution: `while (queue.length) {
  const thing = queue.shift()
  thing.value--
  if (thing.value > 0) queue.push(thing)
  else removed.push(thing)
  vis(thing)
}
`,
    check: (t) => {
      const live = t.before('queue')
      const left = t.start.queue.map((copy: any) => copy.value as number)
      const line = left.map((_: number, i: number) => i)
      const want: number[] = []
      for (let guard = 0; line.length && guard < 1000; guard++) {
        const i = line.shift() as number
        left[i]--
        if (left[i] > 0) line.push(i)
        else want.push(i)
      }
      if (!Array.isArray(t.queue) || !Array.isArray(t.removed)) return '`queue` og `removed` skal fortsatt være arrayer.'
      if (t.queue.length) return `Køen har ${t.queue.length} ting igjen; den skal være tom til slutt.`
      if (t.removed.length !== want.length) return `\`removed\` har ${t.removed.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.removed[i] !== live[want[i]]) {
          return `Som nummer ${i + 1} skal ${t.show(live[want[i]])} bli ferdig, men det ble ${t.show(t.removed[i])}.`
        }
      }
      for (const thing of live) {
        if (thing.value !== 0) return `${t.show(thing)} har \`value\` ${t.show(thing.value)}, men skal ha 0 når den er ferdig.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Round-robin_scheduling',
  },
  {
    id: 'parentesene',
    title: 'Går parentesene opp?',
    level: 'middels',
    topic: 'stabler',
    text: `Tingene i \`items\` er tegn i en rekke: violet er \`(\`, teal er \`)\`, pink er \`[\` og cyan er \`]\`. Rekka går opp hvis hver åpning blir lukket av riktig slags lukking, og de lukkes i motsatt rekkefølge av hvordan de ble åpnet: \`([])\` går opp, men \`([)]\` gjør det ikke.

Skriv \`function balanced(items)\` som gir tilbake \`true\` hvis rekka går opp, ellers \`false\`. En tom rekke går opp. Du ser bare på \`color\`, og funksjonen skal ikke endre rekka. Koden nederst prøver den på \`items\`.`,
    hints: [
      'Den som åpnet sist, må lukkes først. Det er akkurat slik en stabel oppfører seg.',
      'Gå gjennom rekka. Kommer en åpning (violet eller pink), legger du på stabelen hvilken lukking du venter på (teal eller cyan). Kommer en lukking, må den være den samme som øverst på stabelen: `pop()` den og sammenlign.',
      'Er stabelen tom når en lukking kommer, går ikke rekka opp. Er stabelen ikke tom etter siste ting, mangler det lukkinger. Ellers går den opp.',
    ],
    world: (r) => {
      const pattern = pick(r, ['([])()[]', '(()[]())', '[()][()]', '[[]]()()', '([)]()[]', '(()[]()[', ')(()[])]'])
      return arrayWorld(Array.from(pattern, (ch, i) => ({ value: i + 1, color: BRACKETS[ch] })))
    },
    ting: PLAIN_TING,
    starter: `function balanced(items) {
  const waiting = [] // lukkingene vi venter på
  for (const thing of items) {
    // Åpning (violet eller pink): legg lukkingen på waiting.
    // Lukking (teal eller cyan): den må være den øverste på waiting.
  }
  return true
}

console.log(balanced(items))
`,
    solution: `function balanced(items) {
  const closer = { violet: 'teal', pink: 'cyan' }
  const waiting = []
  for (const thing of items) {
    vis(thing)
    if (closer[thing.color]) waiting.push(closer[thing.color])
    else if (waiting.pop() !== thing.color) return false
  }
  return waiting.length === 0
}

console.log(balanced(items))
`,
    exports: ['balanced'],
    check: (t) => {
      const balanced = t.fn('balanced')
      const colorOf: Record<string, string> = { '(': 'violet', ')': 'teal', '[': 'pink', ']': 'cyan' }
      const cases: [string, boolean][] = [
        ['', true],
        ['()', true],
        ['[]', true],
        ['([])', true],
        ['()[]', true],
        ['(([[]]))', true],
        ['[()]()[]', true],
        ['(', false],
        [')', false],
        ['(()', false],
        ['())', false],
        ['([)]', false],
        ['[(])', false],
        [')(', false],
        ['][', false],
        ['([]', false],
        ['(]', false],
        ['[[]]]', false],
      ]
      for (const [text, want] of cases) {
        const row = Array.from(text, (ch, i) => t.ting({ value: i + 1, color: colorOf[ch] }))
        const got = balanced(row)
        const shown = text ? `«${text}»` : 'den tomme rekka'
        if (got !== want) return `balanced gav ${t.show(got)} for ${shown}, men svaret skal være ${want}.`
        if (row.length !== text.length) return 'balanced skal ikke endre rekka.'
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Bracket_matching',
  },
  {
    id: 'sorter-stabelen',
    title: 'Sorter stabelen',
    level: 'middels',
    topic: 'stabler',
    text: `Tingene i \`stack\` ligger i tilfeldig rekkefølge. Ved siden av står en tom stabel, \`spare\`. Sorter \`stack\` så den minste (\`value\`) ligger øverst, altså sist i arrayen, og den største nederst.

Bruk bare \`push\` og \`pop\` til å flytte tingene mellom de to stablene. Å titte på toppen, \`stack[stack.length - 1]\`, er greit. Ikke bruk \`sort\`, \`splice\` eller \`shift\`. Til slutt skal \`stack\` være sortert, og \`spare\` tom.`,
    hints: [
      'La `spare` være sortert hele tiden, med den største øverst. Ta én ting om gangen fra `stack`.',
      'Ta `const thing = stack.pop()`. Så lenge den øverste i `spare` er større enn `thing`, flytter du den tilbake til `stack`. Legg så `thing` på `spare`.',
      'Når `stack` er tom, ligger alt sortert i `spare`, med den største øverst. Flytt alt tilbake til `stack` med `pop` og `push`: da snur rekkefølgen, og den minste havner øverst.',
    ],
    world: (r) => {
      let items = shuffled(r, things(r))
      for (let tries = 0; tries < 100 && descending(items); tries++) items = shuffled(r, items)
      if (descending(items)) items.reverse()
      return arrayWorld(items, undefined, 'stack', { spare: [] })
    },
    ting: PLAIN_TING,
    views: { spare: 'stack' },
    starter: `while (stack.length) {
  const thing = stack.pop()
  // Legg thing på riktig plass i spare. Flytt noen tilbake til stack om det trengs.
  spare.push(thing)
}
// Og så alt tilbake til stack
`,
    solution: `while (stack.length) {
  const thing = stack.pop()
  while (spare.length && spare[spare.length - 1].value > thing.value) {
    stack.push(spare.pop())
  }
  spare.push(thing)
  vis(thing)
}
while (spare.length) {
  stack.push(spare.pop())
  vis()
}
`,
    check: (t) => {
      const want = t.before('stack').sort((a, b) => b.value - a.value)
      if (!Array.isArray(t.stack) || !Array.isArray(t.spare)) return '`stack` og `spare` skal fortsatt være arrayer.'
      if (t.spare.length) return `\`spare\` har ${t.spare.length} ting igjen; den skal være tom til slutt.`
      if (t.stack.length !== want.length) return `\`stack\` har ${t.stack.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.stack[i] !== want[i]) {
          return `Plass ${i} i stabelen skal ha ${t.show(want[i])} (${want[i].value}), men har ${t.show(t.stack[i])} (${t.stack[i]?.value}). Den minste skal ligge sist, øverst.`
        }
      }
      return true
    },
  },
  {
    id: 'minste-stabel',
    title: 'Stabelen som vet minst',
    level: 'middels',
    topic: 'stabler',
    text: `Tingene i \`items\` trenger en stabel som alltid vet hvilken verdi som er minst. Skriv \`class MinStack\` med disse:

- \`push(x)\` legger \`x\` øverst
- \`pop()\` tar den øverste av og gir den tilbake, eller \`undefined\` hvis stabelen er tom
- \`min()\` gir den minste verdien som ligger i stabelen akkurat nå, eller \`undefined\` hvis den er tom
- \`size\` er hvor mange det er i stabelen, en egenskap og ikke en metode: \`stack.size\`, skrevet som \`get size() { … }\`

Det vanskelige er \`min()\`: den skal svare med én gang og ikke lete gjennom alle verdiene hver gang. Sjekken passer på det, og prøver tilfeldige rekker med \`push\` og \`pop\`, også med like verdier. Koden nederst legger verdiene til tingene i \`items\` på en \`MinStack\`.`,
    hints: [
      'Legger du en ting på toppen, er den nye minste enten den nye tingen eller den som var minst fra før. Og tar du den av igjen, er den minste tilbake til det den var da: det kan du ha husket.',
      'Hold en parallell stabel, `mins`, der plass `i` husker den minste av de `i + 1` nederste. Ved `push(x)` legger du `Math.min(x, mins.at(-1))` på `mins` (eller `x` selv hvis den er tom).',
      '`pop()` tar da av begge stablene, og `min()` er bare toppen av `mins`. Ingen løkker, så det går like fort med en million ting.',
    ],
    world: (r) => arrayWorld(things(r, 6)),
    ting: PLAIN_TING,
    starter: `class MinStack {
  items = []

  push(x) {
    this.items.push(x)
  }

  pop() {
    return this.items.pop()
  }

  min() {
    // Svar uten å lete gjennom alle
    return this.items[0]
  }

  get size() {
    return this.items.length
  }
}

const minStack = new MinStack()
for (const thing of items) minStack.push(thing.value)
console.log(minStack.min(), minStack.size)
`,
    solution: `class MinStack {
  items = []
  mins = [] // mins[i] er den minste av de i + 1 nederste

  push(x) {
    this.items.push(x)
    this.mins.push(this.mins.length ? Math.min(x, this.mins[this.mins.length - 1]) : x)
  }

  pop() {
    this.mins.pop()
    return this.items.pop()
  }

  min() {
    return this.mins[this.mins.length - 1]
  }

  get size() {
    return this.items.length
  }
}

const minStack = new MinStack()
for (const thing of items) {
  minStack.push(thing.value)
  vis(thing)
}
console.log(minStack.min(), minStack.size)
`,
    exports: ['MinStack'],
    check: (t) => {
      const MinStack: any = t.fn('MinStack')
      let seed = 3
      const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
      const sizeOf = (s: any) => (typeof s.size === 'function' ? s.size() : s.size)
      const empty = new MinStack()
      if (sizeOf(empty) !== 0) return `En ny MinStack skal ha size 0, men har ${t.show(sizeOf(empty))}.`
      if (empty.min() !== undefined) return `min() på en tom stabel gav ${t.show(empty.min())}, men skal gi undefined.`
      if (empty.pop() !== undefined) return 'pop() på en tom stabel skal gi undefined.'
      for (const round of [0, 1]) {
        const stack = new MinStack()
        const ref: number[] = []
        const log: string[] = []
        for (let step = 0; step < 300; step++) {
          if (rnd() < (round ? 0.45 : 0.6)) {
            const x = Math.floor(rnd() * 10)
            stack.push(x)
            ref.push(x)
            log.push(`push(${x})`)
          } else {
            const got = stack.pop()
            const want = ref.pop()
            log.push('pop()')
            if (got !== want) return `Etter ${log.slice(-4).join(', ')} gav pop() ${t.show(got)}, men skal gi ${t.show(want)}.`
          }
          const wantMin = ref.length ? Math.min(...ref) : undefined
          const gotMin = stack.min()
          if (gotMin !== wantMin) return `Etter ${log.slice(-4).join(', ')} gav min() ${t.show(gotMin)}, men den minste er ${t.show(wantMin)}.`
          if (sizeOf(stack) !== ref.length) return `Etter ${log.slice(-4).join(', ')} har size ${t.show(sizeOf(stack))}, men skal ha ${ref.length}.`
        }
      }
      // min() must not look through the stack: count how often the values are read during min().
      let looks = 0
      const probe = (v: number) => ({ valueOf: () => { looks++; return v } })
      try {
        const big = new MinStack()
        for (let i = 0; i < 1000; i++) big.push(probe(Math.floor(rnd() * 100)))
        let worst = 0
        for (let i = 0; i < 20; i++) {
          big.pop()
          const before = looks
          big.min()
          worst = Math.max(worst, looks - before)
        }
        if (worst > 10) return `min() leter gjennom stabelen: den så på ${worst} verdier for ett svar. Husk den minste mens du legger på, så svarer min() med én gang.`
      } catch {
        // A class that can't take objects instead of numbers has already passed with numbers.
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Stack_(abstract_data_type)',
  },
  {
    id: 'ko-av-to-stabler',
    title: 'Kø av to stabler',
    level: 'vanskelig',
    topic: 'stabler',
    text: `En kø er først inn, først ut. Men si at du bare har stabler, arrayer der du bare bruker \`push\` og \`pop\`. Hvordan lager du en kø av dem?

Skriv \`class TwoStackQueue\` med disse:

- \`enqueue(x)\` stiller \`x\` bakerst i køen
- \`dequeue()\` tar den fremste ut og gir den tilbake, eller \`undefined\` hvis køen er tom
- \`size\` er hvor mange som står i køen, en egenskap og ikke en metode: \`queue.size\`, skrevet som \`get size() { … }\`

Bruk to arrayer som stabler, og bare \`push\` og \`pop\` på dem: \`shift\`, \`unshift\`, \`splice\` og \`reverse\` er forbudt. Sjekken prøver tilfeldige rekker med \`enqueue\` og \`dequeue\`, og passer også på at du ikke flytter alt fram og tilbake for hver ting. Koden nederst stiller tingene i \`items\` i køen.`,
    hints: [
      'En stabel snur rekkefølgen: det som legges inn først, kommer ut sist. Legger du alt over på en annen stabel, snur den igjen, og da kommer det første ut først.',
      '`inbox` tar imot alt fra `enqueue` med `push`. `dequeue` tar fra `outbox` med `pop`. Er `outbox` tom, flytter du først alt fra `inbox` over til `outbox`, med `pop` og `push`.',
      'Flytt bare over når `outbox` er tom, aldri ellers. Da blir hver ting flyttet høyst én gang, og alt går fort. `size` er lengden på begge stablene lagt sammen.',
    ],
    world: (r) => arrayWorld(things(r, 6)),
    ting: PLAIN_TING,
    starter: `class TwoStackQueue {
  inbox = [] // nye ting havner her
  outbox = [] // herfra tar du ut

  enqueue(x) {
    this.inbox.push(x)
  }

  dequeue() {
    // Er outbox tom? Flytt alt fra inbox over først.
    return this.outbox.pop()
  }

  get size() {
    return this.inbox.length + this.outbox.length
  }
}

const line = new TwoStackQueue()
for (const thing of items) line.enqueue(thing)
console.log(line.dequeue())
`,
    solution: `class TwoStackQueue {
  inbox = [] // nye ting havner her
  outbox = [] // herfra tar du ut

  enqueue(x) {
    this.inbox.push(x)
  }

  dequeue() {
    if (!this.outbox.length) {
      while (this.inbox.length) this.outbox.push(this.inbox.pop())
    }
    return this.outbox.pop()
  }

  get size() {
    return this.inbox.length + this.outbox.length
  }
}

const line = new TwoStackQueue()
for (const thing of items) {
  line.enqueue(thing)
  vis(thing)
}
console.log(line.dequeue())
`,
    exports: ['TwoStackQueue'],
    check: (t) => {
      const TwoStackQueue: any = t.fn('TwoStackQueue')
      let seed = 9
      const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
      // An operation is a number to enqueue, or -1 to dequeue.
      const randomOps = (n: number, chance: number): number[] => Array.from({ length: n }, () => (rnd() < chance ? Math.floor(rnd() * 100) : -1))
      const proto: any = Array.prototype
      const run = (ops: number[]) => {
        const queue = new TwoStackQueue()
        const got: unknown[] = new Array(ops.length)
        const sizes: unknown[] = new Array(ops.length)
        const real = { push: proto.push, pop: proto.pop, shift: proto.shift, unshift: proto.unshift, splice: proto.splice, reverse: proto.reverse }
        let calls = 0
        let banned = false
        const ban = () => {
          banned = true
          throw new Error('stopp')
        }
        proto.push = function (this: unknown, ...args: unknown[]) {
          calls++
          return real.push.apply(this, args)
        }
        proto.pop = function (this: unknown) {
          calls++
          return real.pop.apply(this)
        }
        proto.shift = ban
        proto.unshift = ban
        proto.splice = ban
        proto.reverse = ban
        try {
          for (let k = 0; k < ops.length; k++) {
            if (ops[k] >= 0) queue.enqueue(ops[k])
            else got[k] = queue.dequeue()
            const size = queue.size
            sizes[k] = typeof size === 'function' ? queue.size() : size
          }
        } catch (err) {
          if (!banned) throw err
        } finally {
          Object.assign(proto, real)
        }
        return { got, sizes, calls, banned }
      }
      const sequences: number[][] = [
        [-1, 5, -1, -1],
        [1, 2, 3, -1, -1, 4, -1, -1, -1, -1],
        randomOps(300, 0.55),
        randomOps(300, 0.4),
      ]
      for (const ops of sequences) {
        const res = run(ops)
        if (res.banned) return 'Du bruker `shift`, `unshift`, `splice` eller `reverse`. Her er bare `push` og `pop` lov, på to arrayer.'
        const line: number[] = []
        let head = 0
        for (let k = 0; k < ops.length; k++) {
          let want: number | undefined
          if (ops[k] >= 0) line.push(ops[k])
          else want = head < line.length ? line[head++] : undefined
          const history = ops
            .slice(Math.max(0, k - 3), k + 1)
            .map((op) => (op >= 0 ? `enqueue(${op})` : 'dequeue()'))
            .join(', ')
          if (ops[k] < 0 && res.got[k] !== want) return `Etter ${history} gav dequeue() ${t.show(res.got[k])}, men skal gi ${t.show(want)}.`
          if (res.sizes[k] !== line.length - head) return `Etter ${history} har size ${t.show(res.sizes[k])}, men skal ha ${line.length - head}.`
        }
      }
      // Moving everything back and forth for each call costs far more push and pop calls than a good queue.
      const long = [...Array.from({ length: 600 }, () => Math.floor(rnd() * 100)), ...Array.from({ length: 600 }, () => -1)]
      const res = run(long)
      if (res.banned) return 'Du bruker `shift`, `unshift`, `splice` eller `reverse`. Her er bare `push` og `pop` lov, på to arrayer.'
      if (res.calls > 6 * long.length + 20) {
        return `Med 600 ting inn og 600 ut brukte køen ${res.calls} kall til push og pop. Flytt bare mellom stablene når outbox er tom, så blir hver ting flyttet høyst én gang.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Queue_(abstract_data_type)#Queue_implementation',
  },
  {
    id: 'neste-storre',
    title: 'Neste som er større',
    level: 'middels',
    topic: 'stabler',
    text: `Hver ting i \`items\` vil vite hvem som er den første større tingen til høyre for den. Skriv \`function nextGreater(items)\` som gir tilbake en ny array med like mange tall: for hver plass \`value\` til den første tingen lenger til høyre som har større \`value\`, eller \`-1\` hvis ingen er større. Like verdier regnes ikke som større.

For verdiene 2, 7, 3, 5, 4, 6 er svaret 7, -1, 5, 6, 6, -1. Funksjonen skal ikke endre \`items\`. Det går an med én gjennomgang og en stabel, og sjekken prøver en lang rad, så det holder ikke å lete til høyre for hver eneste ting.`,
    hints: [
      'Gå fra venstre mot høyre, og la en stabel holde plassene som fortsatt venter på en større ting.',
      'Kommer en ny ting, er den svaret for alle på stabelen som er mindre enn den: `pop` dem og skriv `result[plass] = items[i].value`.',
      'Legg så plassen til den nye tingen på stabelen. De som er igjen når løkka er ferdig, får `-1`: fyll `result` med `-1` på forhånd.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    starter: `function nextGreater(items) {
  const result = items.map(() => -1)
  const waiting = [] // plassene som venter på en større
  for (let i = 0; i < items.length; i++) {
    // Er items[i] større enn de som venter? Da har de fått svaret sitt.
  }
  return result
}

console.log(nextGreater(items))
`,
    solution: `function nextGreater(items) {
  const result = items.map(() => -1)
  const waiting = []
  for (let i = 0; i < items.length; i++) {
    while (waiting.length && items[waiting[waiting.length - 1]].value < items[i].value) {
      result[waiting.pop()] = items[i].value
    }
    waiting.push(i)
    vis(items[i])
  }
  return result
}

console.log(nextGreater(items))
`,
    exports: ['nextGreater'],
    check: (t) => {
      const nextGreater = t.fn('nextGreater')
      const expected = (v: number[]) =>
        v.map((x, i) => {
          for (let j = i + 1; j < v.length; j++) if (v[j] > x) return v[j]
          return -1
        })
      const cases: number[][] = [[], [5], [1, 2, 3, 4], [4, 3, 2, 1], [2, 7, 3, 5, 4, 6], [3, 3, 3], [5, 1, 5, 1, 6], [1, 3, 2, 4, 2]]
      for (const values of cases) {
        const row = values.map((value) => t.ting({ value }))
        const got = nextGreater(row)
        const want = expected(values)
        if (!Array.isArray(got) || got.length !== want.length || got.some((g: unknown, i: number) => g !== want[i])) {
          return `nextGreater([${values.join(', ')}]) gav ${t.show(got)}, men skal gi [${want.join(', ')}].`
        }
        if (row.some((x, i) => x.value !== values[i])) return 'nextGreater skal ikke endre raden.'
      }
      // A long falling row is the worst case for looking right from every item: count the reads of value.
      const n = 3000
      let reads = 0
      const falling = Array.from({ length: n }, (_, i) => {
        const o = t.ting({ value: 0 })
        Object.defineProperty(o, 'value', { get() { reads++; return n - i } })
        return o
      })
      const got = nextGreater(falling)
      if (reads > 12 * n) {
        return `nextGreater så på verdiene ${reads} ganger blant ${n} ting. Med en stabel og én gjennomgang holder det med noen få per ting.`
      }
      if (!Array.isArray(got) || got.length !== n || got.some((g: unknown) => g !== -1)) return 'I en rad som bare synker, er ingen ting etterfulgt av en større. Svaret skal være -1 for alle.'
      return true
    },
    source: 'https://en.wikipedia.org/wiki/All_nearest_smaller_values',
  },
  {
    id: 'hanoi-for-hand',
    title: 'Tre skiver for hånd',
    level: 'lett',
    topic: 'stabler',
    text: `Tre skiver står på pinne 0 i \`pegs\`, den største nederst. De skal over på pinne 2. Du kan flytte én skive om gangen, fra toppen av en pinne til toppen av en annen, og aldri legge en større skive oppå en mindre.

Skriv \`function solve(move)\` som kaller \`move(from, to)\` med pinnenummer 0, 1 eller 2, én gang for hvert flytt, til tårnet står på pinne 2. Tre skiver går på sju flytt. Du kan skrive flyttene rett ut for hånd, ett kall per linje. Sjekken passer på at hvert flytt er lovlig og at tårnet ender på pinne 2. Koden nederst utfører flyttene på scenen.`,
    hints: [
      'Den største skiven må over på pinne 2 mens pinne 2 er tom. Da må de to minste ligge på pinne 1.',
      'Først de to minste over på pinne 1: `move(0, 2)`, `move(0, 1)`, `move(2, 1)`. Så den største: `move(0, 2)`.',
      'Til slutt skal de to minste fra pinne 1 over på den største. Det er det samme tricket baklengs, med pinne 0 som hjelper.',
    ],
    world: () => tower(3),
    ting: PLAIN_TING,
    starter: `function solve(move) {
  // Skriv flyttene her, ett per linje: move(0, 2) flytter øverste skive fra pinne 0 til pinne 2
}

solve((from, to) => {
  pegs[to].push(pegs[from].pop())
  vis()
})
`,
    solution: `function solve(move) {
  move(0, 2)
  move(0, 1)
  move(2, 1)
  move(0, 2)
  move(1, 0)
  move(1, 2)
  move(0, 2)
}

solve((from, to) => {
  pegs[to].push(pegs[from].pop())
  vis()
})
`,
    exports: ['solve'],
    check: (t) => {
      const solve = t.fn('solve')
      const pegs: number[][] = [[3, 2, 1], [], []]
      let moves = 0
      let bad = ''
      const move = (from: number, to: number) => {
        if (!bad) {
          const n = moves + 1
          if (!(Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from <= 2 && to >= 0 && to <= 2)) {
            bad = `Flytt ${n}: move(${String(from)}, ${String(to)}) passer ikke. Pinnene er 0, 1 og 2.`
          } else if (from === to) {
            bad = `Flytt ${n}: move(${from}, ${to}) flytter til samme pinne.`
          } else if (!pegs[from].length) {
            bad = `Flytt ${n}: pinne ${from} er tom.`
          } else {
            const disc = pegs[from][pegs[from].length - 1]
            const under = pegs[to][pegs[to].length - 1]
            if (under !== undefined && under < disc) bad = `Flytt ${n}: skive ${disc} kan ikke ligge oppå den mindre skiven ${under}.`
            else if (n > 7) bad = 'Tre skiver går på sju flytt, men du har gjort flere. Er det en omvei?'
          }
        }
        if (bad) throw new Error('stopp')
        moves++
        pegs[to].push(pegs[from].pop() as number)
      }
      try {
        solve(move)
      } catch (err) {
        if (!bad) throw err
      }
      if (bad) return bad
      const shown = pegs.map((peg, i) => `pinne ${i}: [${peg.join(', ')}]`).join(', ')
      if (pegs[2].join(',') !== '3,2,1') return `Etter ${moves} flytt står ikke tårnet på pinne 2 ennå (${shown}).`
      if (moves !== 7) return `Du brukte ${moves} flytt, men tre skiver går på sju.`
      const target = t.pegs?.[2]
      if (!Array.isArray(target) || target.length !== t.slots.length) return 'Tårnet på scenen står ikke på `pegs[2]` ennå. Kjør `solve` på scenen nederst.'
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Tower_of_Hanoi',
  },
  {
    id: 'hvor-mange-flytt',
    title: 'Hvor mange flytt?',
    level: 'lett',
    topic: 'stabler',
    text: `Hvor mange flytt trengs for å flytte et tårn med \`n\` skiver fra en pinne til en annen, når en større skive aldri får ligge oppå en mindre? Du trenger ikke flytte noe: tenk deg fram til svaret.

Skriv \`function hanoiMoves(n)\` som gir tilbake det minste antallet flytt for \`n\` skiver. For \`n = 0\` er svaret 0. Sjekken prøver alle \`n\` fra 0 til 20.`,
    hints: [
      'Tenk på den største skiven. Den må flyttes minst én gang, og da må alle de andre ligge samlet på den tredje pinnen.',
      'For å flytte tårnet må du flytte `n - 1` skiver bort, den største én gang, og så `n - 1` skiver oppå den. Altså `hanoiMoves(n) = 2 * hanoiMoves(n - 1) + 1`.',
      'Skriv det som en rekursiv funksjon som stopper på `n === 0`. Eller regn ut at svaret alltid er `2 ** n - 1`.',
    ],
    world: () => tower(4),
    ting: PLAIN_TING,
    starter: `function hanoiMoves(n) {
  if (n === 0) return 0
  // Hvor mange flytt går det på å flytte n - 1 skiver, én skive og så n - 1 skiver igjen?
  return 0
}

console.log(hanoiMoves(pegs[0].length))
`,
    solution: `function hanoiMoves(n) {
  if (n === 0) return 0
  return 2 * hanoiMoves(n - 1) + 1
}

console.log(hanoiMoves(pegs[0].length))
`,
    exports: ['hanoiMoves'],
    check: (t) => {
      const hanoiMoves = t.fn('hanoiMoves')
      for (let n = 0; n <= 20; n++) {
        const got = hanoiMoves(n)
        if (got !== 2 ** n - 1) return `hanoiMoves(${n}) gav ${t.show(got)}, men ${n} ${n === 1 ? 'skive går' : 'skiver går'} på ${2 ** n - 1} flytt.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Tower_of_Hanoi#Solution',
  },
  {
    id: 'bare-til-naboen',
    title: 'Bare til naboen',
    level: 'vanskelig',
    topic: 'stabler',
    text: `Hanois tårn med en ekstra regel: en skive får bare flyttes til pinnen ved siden av. Fra pinne 0 til 1, fra 1 til 0 eller 2, og fra 2 til 1, men aldri rett fra 0 til 2. Og som før: aldri en større skive oppå en mindre.

Skriv \`function neighborHanoi(n, move)\` som flytter et tårn på \`n\` skiver fra pinne 0 til pinne 2 og kaller \`move(from, to)\` for hvert flytt. Det går på \`3^n - 1\` flytt, og sjekken godtar ikke flere. Koden nederst kjører den på tårnet på scenen.`,
    hints: [
      'Tenk rekursivt, som i det vanlige tårnet: hvordan får du den største skiva fra 0 til 2 når den må innom pinne 1?',
      'Den største må gjøre to flytt: 0 → 1 og 1 → 2. Før hvert av dem må de `n - 1` andre ligge på pinnen den ikke skal til eller fra.',
      'Flytt `n - 1` fra 0 til 2, den største 0 → 1, `n - 1` fra 2 til 0, den største 1 → 2, og `n - 1` fra 0 til 2. Skriv en hjelper `go(n, from, to)` for et tårn mellom to ytterpinner.',
    ],
    world: () => {
      const items = [4, 3, 2, 1].map((value, i) => ({ value, color: PALETTE[i + 3] }))
      return makeWorld(items, { pegs: [items.map((_, i) => at(i)), [], []] })
    },
    ting: PLAIN_TING,
    starter: `function neighborHanoi(n, move) {
  // Flytt n skiver fra 0 til 2, bare mellom naboer
}

neighborHanoi(pegs[0].length, (from, to) => {
  pegs[to].push(pegs[from].pop())
  vis()
})
`,
    solution: `function neighborHanoi(n, move) {
  // A tower between the two outer pegs, always by way of the middle one.
  function go(k, from, to) {
    if (k === 0) return
    go(k - 1, from, to)
    move(from, 1)
    go(k - 1, to, from)
    move(1, to)
    go(k - 1, from, to)
  }
  go(n, 0, 2)
}

neighborHanoi(pegs[0].length, (from, to) => {
  pegs[to].push(pegs[from].pop())
  vis()
})
`,
    exports: ['neighborHanoi'],
    check: (t) => {
      const neighborHanoi = t.fn('neighborHanoi')
      for (const n of [1, 2, 3, 5]) {
        const pegs: number[][] = [Array.from({ length: n }, (_, i) => n - i), [], []]
        let moves = 0
        let bad = ''
        neighborHanoi(n, (from: number, to: number) => {
          moves++
          if (bad) return
          if (Math.abs(from - to) !== 1) { bad = `et flytt fra pinne ${from} til ${to}, som ikke er naboer`; return }
          if (!pegs[from]?.length) { bad = `et flytt fra den tomme pinnen ${from}`; return }
          const disc = pegs[from][pegs[from].length - 1]
          const top = pegs[to].at(-1)
          if (top !== undefined && top < disc) { bad = `${disc} ble lagt oppå ${top}`; return }
          pegs[to].push(pegs[from].pop()!)
        })
        if (bad) return `Med ${n} skiver: ${bad}.`
        if (pegs[2].length !== n) return `Med ${n} skiver står bare ${pegs[2].length} på pinne 2 til slutt.`
        if (moves !== 3 ** n - 1) return `Med ${n} skiver brukte du ${moves} flytt; det går på ${3 ** n - 1}.`
      }
      if (!Array.isArray(t.pegs?.[2]) || t.pegs[2].length !== t.slots.length) return 'Tårnet på scenen står ikke på `pegs[2]` ennå.'
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Tower_of_Hanoi#Variants',
  },
]
