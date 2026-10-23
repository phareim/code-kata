import { arrayWorld, int, pick, PALETTE, shuffled, things, type Random, type Spec } from './build'
import { PLAIN_TING } from './classes'
import type { Task } from './types'

const val = (s: Spec) => s.value as number
const ascending = (row: Spec[]) => row.every((s, i) => i === 0 || val(row[i - 1]) <= val(s))
const descending = (row: Spec[]) => row.every((s, i) => i === 0 || val(row[i - 1]) >= val(s))

/** The specs in a shuffled order that `done` doesn't accept, so a task never starts solved. */
function scrambled(r: Random, specs: Spec[], done: (row: Spec[]) => boolean): Spec[] {
  let row = shuffled(r, specs)
  for (let tries = 0; tries < 100 && done(row); tries++) row = shuffled(r, row)
  return done(row) ? [...row].reverse() : row
}

/** The row after one bubble pass from left to right. */
function onePass(row: Spec[]): Spec[] {
  const copy = [...row]
  for (let i = 0; i + 1 < copy.length; i++) {
    if (val(copy[i]) > val(copy[i + 1])) {
      const tmp = copy[i]
      copy[i] = copy[i + 1]
      copy[i + 1] = tmp
    }
  }
  return copy
}

const color = (s: Spec) => s.color as string
const byColor = (row: Spec[]) => row.every((s, i) => i === 0 || color(row[i - 1]) <= color(s))

/** True when selection sort by colour (swapping) happens to leave alike colours in their old order. */
function keepsOrder(row: Spec[]): boolean {
  const stable = row.map((s, i) => ({ s, i })).sort((a, b) => (color(a.s) < color(b.s) ? -1 : color(a.s) > color(b.s) ? 1 : a.i - b.i)).map((e) => e.s)
  const copy = [...row]
  for (let i = 0; i + 1 < copy.length; i++) {
    let min = i
    for (let j = i + 1; j < copy.length; j++) if (color(copy[j]) < color(copy[min])) min = j
    const tmp = copy[i]
    copy[i] = copy[min]
    copy[min] = tmp
  }
  return copy.every((s, i) => s === stable[i])
}

/** n items with values 1 to 9 where some are alike, in a row that is not sorted. */
function smallValues(r: Random, n = 8): Spec[] {
  let specs: Spec[] = []
  for (let tries = 0; tries < 50; tries++) {
    specs = Array.from({ length: n }, () => ({ value: int(r, 1, 9), color: pick(r, PALETTE) }))
    if (new Set(specs.map(val)).size < n) break
  }
  return scrambled(r, specs, ascending)
}

export const tasks: Task[] = [
  {
    id: 'bytt-de-ytterste',
    title: 'Bytt de ytterste',
    level: 'lett',
    topic: 'sortering',
    text: `Tingene står i arrayen \`items\`, med plassnummeret under hver. Den første og den siste vil bytte plass.

Bytt \`items[0]\` og den siste, og la de andre stå der de står.`,
    hints: [
      'Den siste står på plass `items.length - 1`.',
      'Ta vare på den ene i en variabel før du skriver over plassen: `const first = items[0]`.',
      'Eller bytt begge på én gang: `[items[0], items[last]] = [items[last], items[0]]`.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    scaffold: `const last = items.length - 1
const first = items[0]
// Flytt den siste fram, og den første bakerst
`,
    solution: `const last = items.length - 1
const first = items[0]
items[0] = items[last]
items[last] = first
`,
    check: (t) => {
      const before = t.before('items')
      const want = [before.at(-1), ...before.slice(1, -1), before[0]]
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) return `Plass ${i} skal ha ${t.show(want[i])}, men har ${t.show(t.items[i])}.`
      }
      return true
    },
  },
  {
    id: 'boblesortering',
    title: 'Boblesortering',
    level: 'middels',
    topic: 'sortering',
    text: `Sorter tingene i \`items\` etter \`value\`, minst først, med boblesortering: gå gjennom arrayen fra start til slutt, og bytt to naboer som står feil vei. Gjør det igjen og igjen, til en hel runde går uten ett eneste bytte.

Kall \`vis(items[i], items[i + 1])\` etter hvert bytte, så ser du de store boble seg bakover.`,
    hints: [
      'To naboer står feil vei når `items[i].value > items[i + 1].value`.',
      'Bytt dem med `[items[i], items[i + 1]] = [items[i + 1], items[i]]`, og sett `swapped = true`.',
      'Den ytre løkka går så lenge noe ble byttet i forrige runde.',
    ],
    world: (r) => arrayWorld(things(r)),
    ting: PLAIN_TING,
    scaffold: `let swapped = true
while (swapped) {
  swapped = false
  for (let i = 0; i + 1 < items.length; i++) {
    // Står items[i] og items[i + 1] feil vei? Bytt dem.
  }
}
`,
    solution: `let swapped = true
while (swapped) {
  swapped = false
  for (let i = 0; i + 1 < items.length; i++) {
    if (items[i].value > items[i + 1].value) {
      ;[items[i], items[i + 1]] = [items[i + 1], items[i]]
      swapped = true
      vis(items[i], items[i + 1])
    }
  }
}
`,
    check: (t) => {
      const want = t.before('items').sort((a, b) => a.value - b.value)
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) {
          return `Plass ${i} skal ha ${t.show(want[i])} (${want[i].value}), men har ${t.show(t.items[i])} (${t.items[i]?.value}).`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Bubble_sort',
  },
  {
    id: 'minst-forst',
    title: 'Fra minst til størst',
    level: 'lett',
    topic: 'sortering',
    text: `Tingene i \`items\` står i tilfeldig rekkefølge, men de vil stå fra minst til størst, etter \`value\`.

Sorter \`items\` så den minste står først og den største sist. Du velger metoden selv: \`sort\` er helt greit, og en løkke også. Til slutt skal det være de samme tingene i raden, bare i ny rekkefølge.`,
    hints: [
      '`sort` tar en funksjon som får to ting, `a` og `b`. Den skal gi et negativt tall hvis `a` skal stå foran `b`.',
      'Du sammenligner verdiene, ikke tingene: `(a, b) => a.value - b.value`.',
      'Hele løsningen er `items.sort((a, b) => a.value - b.value)`. Vil du heller sortere selv, kan du bruke boblesortering.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `// Sorter items etter value, minst først.
// items.sort(…) tar en funksjon som sammenligner to ting: (a, b) => …
console.log(items.map((thing) => thing.value))
`,
    solution: `items.sort((a, b) => a.value - b.value)
vis('sortert')
`,
    check: (t) => {
      const want = t.before('items').sort((a, b) => a.value - b.value)
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) {
          return `Plass ${i} skal ha ${t.show(want[i])} (${want[i].value}), men har ${t.show(t.items[i])} (${t.items[i]?.value}).`
        }
      }
      return true
    },
  },
  {
    id: 'synkende',
    title: 'Størst først',
    level: 'lett',
    topic: 'sortering',
    text: `Nå vil tingene stå motsatt vei: den med størst \`value\` først og den minste sist.

Sorter \`items\` fra størst til minst. Det skal være de samme tingene i raden, bare i ny rekkefølge.`,
    hints: [
      'Samme grep som når du sorterer minst først, men sammenligningen går motsatt vei.',
      'Funksjonen du gir til `sort` skal gi et negativt tall når `a` skal stå foran `b`. Skal den største stå først, er det `b.value - a.value`.',
      'Hele løsningen er `items.sort((a, b) => b.value - a.value)`.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), descending)),
    ting: PLAIN_TING,
    scaffold: `// Sorter items etter value, størst først.
console.log(items.map((thing) => thing.value))
`,
    solution: `items.sort((a, b) => b.value - a.value)
vis('størst først')
`,
    check: (t) => {
      const want = t.before('items').sort((a, b) => b.value - a.value)
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) {
          return `Plass ${i} skal ha ${t.show(want[i])} (${want[i].value}), men har ${t.show(t.items[i])} (${t.items[i]?.value}).`
        }
      }
      return true
    },
  },
  {
    id: 'er-raden-sortert',
    title: 'Er raden sortert?',
    level: 'lett',
    topic: 'sortering',
    text: `Før tingene tar seg bryet med å sortere, vil de vite om raden allerede er i orden. Skriv \`function isSorted(items)\` som tar en array av ting og gir tilbake \`true\` hvis \`value\` aldri blir mindre fra en ting til den neste, ellers \`false\`.

To like verdier ved siden av hverandre er greit. En tom rad og en rad med én ting er sortert. Funksjonen skal bare se på raden, ikke endre den. Koden nederst prøver den på \`items\`.`,
    hints: [
      'Du trenger bare se på ett par naboer om gangen: `items[i]` og `items[i + 1]`.',
      'Finner du et par der `items[i].value > items[i + 1].value`, kan du svare `false` med én gang.',
      'Kommer løkka til slutten uten å finne noe galt, er svaret `true`. Det gjelder også den tomme raden, for da går løkka aldri.',
    ],
    world: (r) => {
      const row = things(r).sort((a, b) => val(a) - val(b))
      const k = int(r, 0, row.length - 2)
      const tmp = row[k]
      row[k] = row[k + 1]
      row[k + 1] = tmp
      return arrayWorld(row)
    },
    ting: PLAIN_TING,
    scaffold: `function isSorted(items) {
  // Se på parene av naboer. Står noen feil vei?
  return true
}

console.log(isSorted(items))
`,
    solution: `function isSorted(items) {
  for (let i = 0; i + 1 < items.length; i++) {
    vis(items[i], items[i + 1])
    if (items[i].value > items[i + 1].value) return false
  }
  return true
}

console.log(isSorted(items))
`,
    exports: ['isSorted'],
    check: (t) => {
      const isSorted = t.fn('isSorted')
      const cases: [number[], boolean][] = [
        [[], true],
        [[7], true],
        [[1, 2, 3, 4, 5], true],
        [[5, 4, 3, 2, 1], false],
        [[1, 2, 3, 5, 4], false],
        [[2, 1, 3, 4, 5], false],
        [[3, 3, 3], true],
        [[1, 2, 2, 3], true],
        [[1, 3, 2, 2], false],
        [[9, 10], true],
        [[10, 9], false],
      ]
      for (const [values, want] of cases) {
        const row = values.map((value) => t.ting({ value }))
        const got = isSorted(row)
        if (got !== want) return `isSorted gav ${t.show(got)} for raden [${values.join(', ')}], men svaret skal være ${want}.`
        if (row.length !== values.length || row.some((x, i) => x.value !== values[i])) return 'isSorted skal ikke endre raden.'
      }
      return true
    },
  },
  {
    id: 'en-boblerunde',
    title: 'Én runde med bobler',
    level: 'lett',
    topic: 'sortering',
    text: `Boblesortering gjør runde etter runde. Her vil tingene bare ha den første runden.

Gå gjennom \`items\` fra venstre mot høyre, én eneste gang. For hvert par naboer, \`items[i]\` og \`items[i + 1]\`, skal de bytte plass hvis den venstre har størst \`value\`. Ikke gjenta runden. Etter én runde har den største havnet helt til høyre, men resten er ikke nødvendigvis i orden.`,
    hints: [
      'Løkka går fra `i = 0` så lenge det finnes en nabo: `i + 1 < items.length`.',
      'Et par står feil vei når `items[i].value > items[i + 1].value`. Bytt dem med `[items[i], items[i + 1]] = [items[i + 1], items[i]]`.',
      'Én `for`-løkke er nok, uten noe `while` rundt. Sammenlign alltid raden slik den ser ut nå: tingen du nettopp flyttet til høyre, møter neste nabo.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), (row) => ascending(row) || ascending(onePass(row)))),
    ting: PLAIN_TING,
    scaffold: `for (let i = 0; i + 1 < items.length; i++) {
  // Står items[i] og items[i + 1] feil vei? Bytt dem.
}
`,
    solution: `for (let i = 0; i + 1 < items.length; i++) {
  if (items[i].value > items[i + 1].value) {
    ;[items[i], items[i + 1]] = [items[i + 1], items[i]]
    vis(items[i], items[i + 1])
  }
}
`,
    check: (t) => {
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      const want = t.before('items')
      for (let i = 0; i + 1 < want.length; i++) {
        if (want[i].value > want[i + 1].value) {
          const tmp = want[i]
          want[i] = want[i + 1]
          want[i + 1] = tmp
        }
      }
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) {
          const sorted = [...want].sort((a, b) => a.value - b.value)
          if (sorted.every((x, k) => t.items[k] === x)) return 'Raden er helt sortert, men du skal bare gjøre én runde.'
          return `Etter én runde skal plass ${i} ha ${t.show(want[i])} (${want[i].value}), men har ${t.show(t.items[i])} (${t.items[i]?.value}).`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Bubble_sort',
  },
  {
    id: 'utvalgssortering',
    title: 'Utvalgssortering',
    level: 'lett',
    topic: 'sortering',
    text: `Utvalgssortering finner den minste tingen og setter den først, finner den nest minste og setter den på plass to, og så videre.

Skriv \`function selectionSort(items, swap)\`. Du får ikke flytte på tingene selv: den eneste måten er å kalle \`swap(i, j)\`, som bytter plassene \`i\` og \`j\` i \`items\`. For hver plass \`i\` fra venstre: finn plassen til den minste av de som er igjen (fra \`i\` og utover), og bytt den dit.

Raden skal ende sortert etter \`value\`, minst først, med høyst \`n - 1\` bytter for \`n\` ting. Koden nederst kjører funksjonen på \`items\`.`,
    hints: [
      'Den ytre løkka går over plassene `i`. Inni den leter en indre løkke fra `i + 1` og utover etter plassen til den minste, `min`.',
      'Husk plassen, ikke tingen: `if (items[j].value < items[min].value) min = j`.',
      'Etter den indre løkka bytter du den minste til plass `i` med `swap(i, min)`. Den ytre løkka trenger bare gå til nest siste plass.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `function selectionSort(items, swap) {
  for (let i = 0; i < items.length - 1; i++) {
    // Finn plassen til den minste fra i og utover, og bytt den til plass i med swap(i, min)
  }
}

selectionSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function selectionSort(items, swap) {
  for (let i = 0; i < items.length - 1; i++) {
    let min = i
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].value < items[min].value) min = j
    }
    if (min !== i) swap(i, min)
  }
}

selectionSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['selectionSort'],
    check: (t) => {
      const selectionSort = t.fn('selectionSort')
      const cases: number[][] = [[], [4], [2, 1], [1, 2, 3, 4], [5, 4, 3, 2, 1], [3, 1, 2], [4, 1, 3, 1, 2], [8, 3, 9, 1, 7, 2, 6, 4, 5, 10]]
      for (const values of cases) {
        const arr = values.map((value) => t.ting({ value }))
        const shadow = [...arr]
        const n = arr.length
        let calls = 0
        let swaps = 0
        let bad = ''
        const swap = (i: number, j: number) => {
          if (!bad && !(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < n && j < n)) {
            bad = `swap(${t.show(i)}, ${t.show(j)}) peker utenfor raden, som har ${n} ting.`
          }
          if (!bad && ++calls > n * n + 10) bad = 'swap ble kalt altfor mange ganger. Går en løkke i ring?'
          if (bad) throw new Error('stopp')
          if (i !== j) swaps++
          const a = arr[i]
          arr[i] = arr[j]
          arr[j] = a
          const b = shadow[i]
          shadow[i] = shadow[j]
          shadow[j] = b
        }
        try {
          selectionSort(arr, swap)
        } catch (err) {
          if (!bad) throw err
        }
        if (bad) return bad
        const shown = `[${values.join(', ')}]`
        if (arr.length !== n || arr.some((x, i) => x !== shadow[i])) {
          return `Etter selectionSort(${shown}) er raden endret på annen måte enn med swap. Flytt bare med swap(i, j).`
        }
        for (let i = 1; i < n; i++) {
          if (arr[i - 1].value > arr[i].value) return `selectionSort(${shown}) endte med [${arr.map((x) => x.value).join(', ')}], som ikke er sortert.`
        }
        if (swaps > Math.max(0, n - 1)) return `selectionSort(${shown}) brukte ${swaps} bytter på ${n} ting, men det går på ${n - 1}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Selection_sort',
  },
  {
    id: 'innstikksortering',
    title: 'Innstikksortering',
    level: 'lett',
    topic: 'sortering',
    text: `Innstikksortering tar tingene i tur og orden og stikker hver av dem inn på riktig plass blant de som står til venstre. Alt til venstre for den du jobber med, er allerede sortert.

Skriv \`function insertionSort(items, swap)\`. Du får bare bytte to naboer, med \`swap(j - 1, j)\`. Ta én ting om gangen fra plass 1 og utover, og la den bytte seg bakover (mot venstre) så lenge tingen foran har større \`value\`.

Sjekken teller byttene: det skal være like mange som det er par som står feil vei, ikke ett mer. Står to like ved siden av hverandre, skal de ikke bytte.`,
    hints: [
      'Den ytre løkka går fra `i = 1`. For hver `i` lar du `j = i` og flytter bakover så lenge det går.',
      'Løkka `while (j > 0 && items[j - 1].value > items[j].value)` gjør jobben: inni den bytter du med `swap(j - 1, j)` og går ett skritt bakover med `j--`.',
      'Bruk `>`, ikke `>=`: like verdier skal bli stående. Hvert bytte retter opp nøyaktig ett par som stod feil vei.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `function insertionSort(items, swap) {
  for (let i = 1; i < items.length; i++) {
    // La items[i] bytte seg bakover med swap(j - 1, j) så lenge tingen foran er større
  }
}

insertionSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function insertionSort(items, swap) {
  for (let i = 1; i < items.length; i++) {
    let j = i
    while (j > 0 && items[j - 1].value > items[j].value) {
      swap(j - 1, j)
      j--
    }
  }
}

insertionSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['insertionSort'],
    check: (t) => {
      const insertionSort = t.fn('insertionSort')
      const cases: number[][] = [[], [3], [1, 2, 3], [3, 2, 1], [2, 3, 1, 5, 4], [3, 1, 3, 1], [5, 5, 5], [4, 1, 3, 1, 2], [9, 4, 7, 1, 8, 2, 6, 3, 10, 5, 12, 11]]
      for (const values of cases) {
        const arr = values.map((value) => t.ting({ value }))
        const shadow = [...arr]
        const n = arr.length
        let inversions = 0
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (values[i] > values[j]) inversions++
        let swaps = 0
        let bad = ''
        const swap = (i: number, j: number) => {
          if (!bad && !(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < n && j < n)) {
            bad = `swap(${t.show(i)}, ${t.show(j)}) peker utenfor raden, som har ${n} ting.`
          }
          if (!bad && Math.abs(i - j) !== 1) bad = `swap(${i}, ${j}) er ikke to naboer. Her kan du bare bytte ting som står ved siden av hverandre.`
          if (!bad && ++swaps > n * n + 10) bad = 'swap ble kalt altfor mange ganger. Går en løkke i ring?'
          if (bad) throw new Error('stopp')
          const a = arr[i]
          arr[i] = arr[j]
          arr[j] = a
          const b = shadow[i]
          shadow[i] = shadow[j]
          shadow[j] = b
        }
        try {
          insertionSort(arr, swap)
        } catch (err) {
          if (!bad) throw err
        }
        if (bad) return bad
        const shown = `[${values.join(', ')}]`
        if (arr.length !== n || arr.some((x, i) => x !== shadow[i])) {
          return `Etter insertionSort(${shown}) er raden endret på annen måte enn med swap. Flytt bare med swap(j - 1, j).`
        }
        for (let i = 1; i < n; i++) {
          if (arr[i - 1].value > arr[i].value) return `insertionSort(${shown}) endte med [${arr.map((x) => x.value).join(', ')}], som ikke er sortert.`
        }
        if (swaps !== inversions) return `insertionSort(${shown}) brukte ${swaps} bytter, men ${inversions} par stod feil vei. Hvert bytte skal rette opp ett par, og like ting skal ikke bytte.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Insertion_sort',
  },
  {
    id: 'nissesortering',
    title: 'Nissen som sorterer',
    level: 'lett',
    topic: 'sortering',
    text: `En nisse sorterer tingene på sin egen måte. Han står ved en plass, \`pos\`, og ser på tingen der og tingen foran. Står de i riktig rekkefølge, går han ett skritt fram. Gjør de ikke det, bytter han dem og går ett skritt tilbake. Ved plass 0 er det ingen ting foran, så der går han bare fram. Når han kommer forbi den siste plassen, er alt sortert.

Skriv \`function gnomeSort(items, swap)\` med nissens regler. \`pos\` starter på 0, og du får bare bytte to naboer, med \`swap(pos - 1, pos)\`. Raden skal ende sortert etter \`value\`, minst først. To like er i riktig rekkefølge.`,
    hints: [
      'Hold styr på plassen i en variabel: `let pos = 0`. Løkka er `while (pos < items.length)`.',
      'Er `pos` lik 0, eller er `items[pos - 1].value <= items[pos].value`? Da er alt i orden her: `pos++`.',
      'Ellers står de feil vei: `swap(pos - 1, pos)` og så `pos--`. Det er hele algoritmen.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `function gnomeSort(items, swap) {
  let pos = 0
  while (pos < items.length) {
    // Står tingen på pos og den foran i riktig rekkefølge? Gå fram.
    // Ellers: swap(pos - 1, pos) og gå tilbake.
    pos++
  }
}

gnomeSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function gnomeSort(items, swap) {
  let pos = 0
  while (pos < items.length) {
    if (pos === 0 || items[pos - 1].value <= items[pos].value) {
      pos++
    } else {
      swap(pos - 1, pos)
      pos--
    }
  }
}

gnomeSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['gnomeSort'],
    check: (t) => {
      const gnomeSort = t.fn('gnomeSort')
      const cases: number[][] = [[], [3], [1, 2, 3], [3, 2, 1], [2, 3, 1, 5, 4], [3, 1, 3, 1], [5, 5, 5], [4, 1, 3, 1, 2], [9, 4, 7, 1, 8, 2, 6, 3, 10, 5, 12, 11]]
      for (const values of cases) {
        const arr = values.map((value) => t.ting({ value }))
        const shadow = [...arr]
        const n = arr.length
        let swaps = 0
        let bad = ''
        const swap = (i: number, j: number) => {
          if (!bad && !(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < n && j < n)) {
            bad = `swap(${t.show(i)}, ${t.show(j)}) peker utenfor raden, som har ${n} ting.`
          }
          if (!bad && Math.abs(i - j) !== 1) bad = `swap(${i}, ${j}) er ikke to naboer. Her kan du bare bytte ting som står ved siden av hverandre.`
          if (!bad && ++swaps > n * n + 10) bad = 'swap ble kalt altfor mange ganger. Går nissen i ring?'
          if (bad) throw new Error('stopp')
          const a = arr[i]
          arr[i] = arr[j]
          arr[j] = a
          const b = shadow[i]
          shadow[i] = shadow[j]
          shadow[j] = b
        }
        try {
          gnomeSort(arr, swap)
        } catch (err) {
          if (!bad) throw err
        }
        if (bad) return bad
        const shown = `[${values.join(', ')}]`
        if (arr.length !== n || arr.some((x, i) => x !== shadow[i])) {
          return `Etter gnomeSort(${shown}) er raden endret på annen måte enn med swap. Flytt bare med swap(pos - 1, pos).`
        }
        for (let i = 1; i < n; i++) {
          if (arr[i - 1].value > arr[i].value) return `gnomeSort(${shown}) endte med [${arr.map((x) => x.value).join(', ')}], som ikke er sortert.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Gnome_sort',
  },
  {
    id: 'pannekaker',
    title: 'Pannekakestabelen',
    level: 'middels',
    topic: 'sortering',
    text: `Kokken har en stabel pannekaker i ulik størrelse (\`value\`) og bare ett redskap: en stekespade. Stikker han spaden under de \`k\` øverste, snur han alle på én gang. Pannekakene står i raden \`items\`, og plass 0 er øverst.

Skriv \`function pancakeSort(items, flip)\`. Du får bare endre raden med \`flip(k)\`, som snur de \`k\` første. Til slutt skal den minste ligge øverst, på plass 0, og den største nederst.

Trikset er å få den største ned først: én vending henter den opp øverst, og en til sender den ned på bunnen. Så tar du den nest største, uten å røre den som allerede ligger riktig. Sjekken godtar høyst \`2n - 3\` vendinger for \`n\` pannekaker.`,
    hints: [
      'La `size` gå fra `items.length` ned til 2. Hver runde skal den største blant de `size` første havne på plass `size - 1`.',
      'Finn plassen `big` til den største blant de `size` første. `flip(big + 1)` fører den øverst, og `flip(size)` sender den ned til plass `size - 1`.',
      'Ligger den allerede på plass `size - 1`, gjør du ingenting. Ligger den øverst (`big === 0`), hopper du over den første vendingen. Da holder det med `2n - 3`.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `function pancakeSort(items, flip) {
  for (let size = items.length; size > 1; size--) {
    // Finn den største blant de size første, og få den ned på plass size - 1 med flip
  }
}

pancakeSort(items, (k) => {
  const top = items.splice(0, k).reverse()
  items.unshift(...top)
  vis(top)
})
`,
    solution: `function pancakeSort(items, flip) {
  for (let size = items.length; size > 1; size--) {
    let big = 0
    for (let i = 1; i < size; i++) {
      if (items[i].value > items[big].value) big = i
    }
    if (big === size - 1) continue
    if (big > 0) flip(big + 1)
    flip(size)
  }
}

pancakeSort(items, (k) => {
  const top = items.splice(0, k).reverse()
  items.unshift(...top)
  vis(top)
})
`,
    exports: ['pancakeSort'],
    check: (t) => {
      const pancakeSort = t.fn('pancakeSort')
      const cases: number[][] = [[], [1], [2, 1], [1, 2], [3, 1, 2], [5, 4, 3, 2, 1], [1, 2, 3, 4, 5], [4, 1, 3, 2], [7, 3, 9, 1, 8, 2, 6, 4, 5]]
      const reverse = (a: unknown[], k: number) => {
        for (let x = 0, y = k - 1; x < y; x++, y--) {
          const tmp = a[x]
          a[x] = a[y]
          a[y] = tmp
        }
      }
      for (const values of cases) {
        const arr = values.map((value) => t.ting({ value }))
        const shadow = [...arr]
        const n = arr.length
        const limit = Math.max(0, 2 * n - 3)
        let flips = 0
        let bad = ''
        const flip = (k: number) => {
          if (!bad && !(Number.isInteger(k) && k >= 0 && k <= n)) {
            bad = `flip(${String(k)}) passer ikke: k må være et helt tall fra 0 til ${n}, for raden har ${n} pannekaker.`
          }
          if (!bad && ++flips > limit) bad = `Flere vendinger enn de ${limit} som er tillatt (2n - 3) for ${n} pannekaker. Hopp over vendinger som ikke trengs.`
          if (bad) throw new Error('stopp')
          reverse(arr, k)
          reverse(shadow, k)
        }
        try {
          pancakeSort(arr, flip)
        } catch (err) {
          if (!bad) throw err
        }
        const shown = `[${values.join(', ')}]`
        if (bad) return `Med ${shown}: ${bad}`
        if (arr.length !== n || arr.some((x, i) => x !== shadow[i])) {
          return `Etter pancakeSort(${shown}) er raden endret på annen måte enn med flip. Endre den bare med flip(k).`
        }
        for (let i = 1; i < n; i++) {
          if (arr[i - 1].value > arr[i].value) return `pancakeSort(${shown}) endte med [${arr.map((x) => x.value).join(', ')}], som ikke er sortert.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Pancake_sorting',
  },
  {
    id: 'flettesortering',
    title: 'Flettesortering',
    level: 'middels',
    topic: 'sortering',
    text: `Flettesortering deler raden i to, sorterer hver halvdel for seg, og fletter dem sammen igjen. Å flette to sorterte rader er lett: se på den første i hver, ta den minste, og gjenta til den ene raden er tom.

Skriv \`function mergeSort(items)\` som gir tilbake en ny array med de samme tingene, sortert etter \`value\`, minst først. Arrayen du får inn, skal stå urørt. \`sort\` er forbudt: sjekken stopper deg hvis du prøver. En rad med null eller én ting er allerede sortert.

Sjekken prøver også en rad med flere tusen ting, så en treg metode klarer seg ikke. Koden nederst setter \`items\` til den sorterte raden.`,
    hints: [
      'Del raden på midten med `slice`, sorter hver halvdel ved å kalle `mergeSort` på den, og flett resultatene. En rad med færre enn to ting trenger ikke deles.',
      'Å flette: hold en plass i hver av de to sorterte radene, `a` og `b`. Så lenge begge har noe igjen, legger du den med minst `value` i resultatet og går ett skritt fram i den raden.',
      'Er den ene raden tom, legger du resten av den andre til sist. Ved like verdier tar du den fra venstre rad, så like ting beholder rekkefølgen.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `function mergeSort(items) {
  if (items.length <= 1) return [...items]
  // Del på midten, sorter hver halvdel med mergeSort, og flett dem
  return [...items]
}

items = mergeSort(items)
`,
    solution: `function mergeSort(items) {
  if (items.length <= 1) return [...items]
  const mid = Math.floor(items.length / 2)
  const left = mergeSort(items.slice(0, mid))
  const right = mergeSort(items.slice(mid))
  const merged = []
  let a = 0
  let b = 0
  while (a < left.length && b < right.length) {
    if (left[a].value <= right[b].value) merged.push(left[a++])
    else merged.push(right[b++])
  }
  merged.push(...left.slice(a), ...right.slice(b))
  vis(merged)
  return merged
}

items = mergeSort(items)
`,
    exports: ['mergeSort'],
    check: (t) => {
      const mergeSort = t.fn('mergeSort')
      let seed = 7
      const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
      const proto: any = Array.prototype
      const trial = (values: number[], readLimit: number): string => {
        const n = values.length
        let reads = 0
        const arr = values.map((value) => {
          const o = t.ting({ value: 0 })
          Object.defineProperty(o, 'value', { get() { reads++; return value } })
          return o
        })
        const copy = [...arr]
        let banned = false
        const ban = () => {
          banned = true
          throw new Error('stopp')
        }
        const real = { sort: proto.sort, toSorted: proto.toSorted }
        let got: any
        proto.sort = ban
        proto.toSorted = ban
        try {
          got = mergeSort(arr)
        } catch (err) {
          if (!banned) throw err
        } finally {
          proto.sort = real.sort
          proto.toSorted = real.toSorted
        }
        if (banned) return 'Du bruker `sort`, men det er forbudt her. Sorter selv, ved å dele og flette.'
        const shown = n > 12 ? `en rad med ${n} ting` : `[${values.join(', ')}]`
        if (!Array.isArray(got)) return `mergeSort(${shown}) gav ${t.show(got)}, men skal gi en array.`
        if (arr.length !== n || arr.some((x, i) => x !== copy[i])) return 'mergeSort skal ikke endre arrayen den får inn.'
        if (n >= 2 && got === arr) return 'mergeSort skal gi tilbake en ny array, ikke den du fikk inn.'
        if (got.length !== n) return `mergeSort(${shown}) gav en array med ${got.length} ting, men skal gi ${n}.`
        const seen = new Set(got)
        if (seen.size !== n || copy.some((x) => !seen.has(x))) return `mergeSort(${shown}) skal gi tilbake de samme tingene, hver én gang.`
        if (readLimit && reads > readLimit) {
          return `mergeSort så på verdiene ${reads} ganger blant ${n} ting. Det er altfor mye: med flettesortering holder det rundt ${Math.round(2 * n * Math.log2(n))}.`
        }
        for (let i = 1; i < n; i++) {
          if (got[i - 1].value > got[i].value) return `mergeSort(${shown}) endte med ${t.show(got.map((x: any) => x.value))}, som ikke er sortert.`
        }
        return ''
      }
      const cases: number[][] = [
        [],
        [5],
        [2, 1],
        [1, 2, 3, 4, 5, 6],
        [6, 5, 4, 3, 2, 1],
        [3, 1, 3, 2, 1, 2],
        Array.from({ length: 8 }, () => Math.floor(rnd() * 100)),
        Array.from({ length: 37 }, () => Math.floor(rnd() * 20)),
      ]
      for (const values of cases) {
        const msg = trial(values, 0)
        if (msg) return msg
      }
      const n = 2000
      return trial(Array.from({ length: n }, () => Math.floor(rnd() * 1000)), 20 * n * Math.log2(n)) || true
    },
    source: 'https://en.wikipedia.org/wiki/Merge_sort',
  },
  {
    id: 'quicksort',
    title: 'Quicksort',
    level: 'middels',
    topic: 'sortering',
    text: `Quicksort velger en ting som skilletegn, pivoten, og flytter alle mindre ting til venstre for den og alle større til høyre. Da står pivoten på sin endelige plass. Så gjør quicksort det samme med hver side.

Skriv \`function quickSort(items, swap)\` som sorterer \`items\` på stedet, etter \`value\`, minst først. Du får bare flytte ting med \`swap(i, j)\`, og \`sort\` er forbudt. Det lønner seg med en hjelpefunksjon inni som tar et område, for eksempel \`sortRange(lo, hi)\`.

Sjekken prøver også en rad med flere tusen ting, så metoden må være rask.`,
    hints: [
      'Et område med færre enn to ting er ferdig. Ellers velger du en pivot, for eksempel den siste tingen i området, og husker verdien.',
      'Gå gjennom området og hold en plass `store` der neste ting som er mindre enn pivoten skal stå. Finner du en mindre på `j`, bytter du `swap(store, j)` og øker `store`. Til slutt `swap(store, hi)` så pivoten havner på plass.',
      'Pivoten står nå riktig på `store`. Sorter området fra `lo` til `store - 1` og området fra `store + 1` til `hi` på samme måte.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `function quickSort(items, swap) {
  function sortRange(lo, hi) {
    if (lo >= hi) return
    // Velg pivot, flytt de mindre til venstre med swap, og sorter begge sider
  }
  sortRange(0, items.length - 1)
}

quickSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function quickSort(items, swap) {
  function sortRange(lo, hi) {
    if (lo >= hi) return
    const pivot = items[hi].value
    let store = lo
    for (let j = lo; j < hi; j++) {
      if (items[j].value < pivot) {
        swap(store, j)
        store++
      }
    }
    swap(store, hi)
    sortRange(lo, store - 1)
    sortRange(store + 1, hi)
  }
  sortRange(0, items.length - 1)
}

quickSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['quickSort'],
    check: (t) => {
      const quickSort = t.fn('quickSort')
      let seed = 11
      const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
      const proto: any = Array.prototype
      const trial = (values: number[], readLimit: number): string => {
        const n = values.length
        let reads = 0
        const arr = values.map((value) => {
          const o = t.ting({ value: 0 })
          Object.defineProperty(o, 'value', { get() { reads++; return value } })
          return o
        })
        const shadow = [...arr]
        const cap = Math.min(n * n + 10, 100 * n + 100)
        let calls = 0
        let bad = ''
        let banned = false
        const swap = (i: number, j: number) => {
          if (!bad && !(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < n && j < n)) {
            bad = `swap(${String(i)}, ${String(j)}) peker utenfor raden, som har ${n} ting.`
          }
          if (!bad && ++calls > cap) bad = 'swap ble kalt altfor mange ganger. Går en løkke i ring?'
          if (bad) throw new Error('stopp')
          const a = arr[i]
          arr[i] = arr[j]
          arr[j] = a
          const b = shadow[i]
          shadow[i] = shadow[j]
          shadow[j] = b
        }
        const ban = () => {
          banned = true
          throw new Error('stopp')
        }
        const real = { sort: proto.sort, toSorted: proto.toSorted }
        proto.sort = ban
        proto.toSorted = ban
        try {
          quickSort(arr, swap)
        } catch (err) {
          if (!bad && !banned) throw err
        } finally {
          proto.sort = real.sort
          proto.toSorted = real.toSorted
        }
        if (banned) return 'Du bruker `sort`, men det er forbudt her. Sorter selv, med pivot og swap.'
        if (bad) return bad
        const shown = n > 12 ? `en rad med ${n} ting` : `[${values.join(', ')}]`
        if (arr.length !== n || arr.some((x, i) => x !== shadow[i])) {
          return `Etter quickSort(${shown}) er raden endret på annen måte enn med swap. Flytt bare med swap(i, j).`
        }
        if (readLimit && reads > readLimit) {
          return `quickSort så på verdiene ${reads} ganger blant ${n} ting. Det er altfor mye: med quicksort holder det rundt ${Math.round(3 * n * Math.log2(n))}.`
        }
        for (let i = 1; i < n; i++) {
          if (arr[i - 1].value > arr[i].value) return `quickSort(${shown}) endte med ${t.show(arr.map((x) => x.value))}, som ikke er sortert.`
        }
        return ''
      }
      const cases: number[][] = [
        [],
        [5],
        [2, 1],
        [1, 2, 3, 4, 5, 6, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1],
        [3, 1, 3, 2, 1, 2, 3],
        [5, 5, 5, 5],
        Array.from({ length: 8 }, () => Math.floor(rnd() * 100)),
        Array.from({ length: 40 }, () => Math.floor(rnd() * 20)),
      ]
      for (const values of cases) {
        const msg = trial(values, 0)
        if (msg) return msg
      }
      const n = 2000
      return trial(Array.from({ length: n }, () => Math.floor(rnd() * 1000)), 20 * n * Math.log2(n)) || true
    },
    source: 'https://en.wikipedia.org/wiki/Quicksort',
  },
  {
    id: 'tellesortering',
    title: 'Tellesortering',
    level: 'middels',
    topic: 'sortering',
    text: `Alle tingene har en \`value\` fra 1 til 9, og flere kan ha samme verdi. Da trenger ikke tingene sammenligne seg med hverandre: du kan telle hvor mange det er av hver verdi, og regne ut hvor hver av dem skal stå.

Skriv \`function countingSort(items)\` som gir tilbake en ny array med de samme tingene, sortert etter \`value\`, minst først. Arrayen du får inn, skal stå urørt, og \`sort\` er forbudt. Koden nederst setter \`items\` til den sorterte raden.`,
    hints: [
      'Lag en array `counts` med ti plasser, alle 0, og tell: for hver ting øker du `counts[thing.value]`.',
      'Regn ut hvor den første tingen med hver verdi skal stå: `start[v]` er summen av `counts` for alle mindre verdier.',
      'Gå gjennom `items` og legg hver ting på plassen `start[thing.value]` i resultatet, og øk den plassen med én. Slik beholder like ting rekkefølgen.',
    ],
    world: (r) => arrayWorld(smallValues(r)),
    ting: PLAIN_TING,
    scaffold: `function countingSort(items) {
  const counts = new Array(10).fill(0)
  // Tell hvor mange det er av hver verdi, og legg tingene på riktig plass i result
  const result = [...items]
  return result
}

items = countingSort(items)
`,
    solution: `function countingSort(items) {
  const counts = new Array(10).fill(0)
  for (const thing of items) counts[thing.value]++
  // start[v] er plassen til den første tingen med verdi v
  const start = new Array(10).fill(0)
  for (let v = 1; v < 10; v++) start[v] = start[v - 1] + counts[v - 1]
  const result = new Array(items.length)
  for (const thing of items) {
    result[start[thing.value]++] = thing
    vis(thing)
  }
  return result
}

items = countingSort(items)
`,
    exports: ['countingSort'],
    check: (t) => {
      const countingSort = t.fn('countingSort')
      let seed = 5
      const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
      const proto: any = Array.prototype
      const cases: number[][] = [
        [],
        [5],
        [9, 1],
        [3, 3, 3],
        [2, 9, 2, 1, 9, 5],
        [9, 8, 7, 6, 5, 4, 3, 2, 1],
        Array.from({ length: 40 }, () => 1 + Math.floor(rnd() * 9)),
      ]
      for (const values of cases) {
        const n = values.length
        const arr = values.map((value) => t.ting({ value }))
        const copy = [...arr]
        let banned = false
        const ban = () => {
          banned = true
          throw new Error('stopp')
        }
        const real = { sort: proto.sort, toSorted: proto.toSorted }
        let got: any
        proto.sort = ban
        proto.toSorted = ban
        try {
          got = countingSort(arr)
        } catch (err) {
          if (!banned) throw err
        } finally {
          proto.sort = real.sort
          proto.toSorted = real.toSorted
        }
        if (banned) return 'Du bruker `sort`, men det er forbudt her. Sorter ved å telle.'
        const shown = n > 12 ? `en rad med ${n} ting` : `[${values.join(', ')}]`
        if (!Array.isArray(got)) return `countingSort(${shown}) gav ${t.show(got)}, men skal gi en array.`
        if (arr.length !== n || arr.some((x, i) => x !== copy[i])) return 'countingSort skal ikke endre arrayen den får inn.'
        if (n >= 2 && got === arr) return 'countingSort skal gi tilbake en ny array, ikke den du fikk inn.'
        if (got.length !== n) return `countingSort(${shown}) gav en array med ${got.length} ting, men skal gi ${n}.`
        const seen = new Set(got)
        if (seen.size !== n || copy.some((x) => !seen.has(x))) return `countingSort(${shown}) skal gi tilbake de samme tingene, hver én gang.`
        for (let i = 1; i < n; i++) {
          if (got[i - 1].value > got[i].value) return `countingSort(${shown}) endte med ${t.show(got.map((x: any) => x.value))}, som ikke er sortert.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Counting_sort',
  },
  {
    id: 'haugsortering',
    title: 'Haugsortering',
    level: 'vanskelig',
    topic: 'sortering',
    text: `En haug er en rad som du ser på som et tre: tingen på plass \`i\` har barna sine på plass \`2 * i + 1\` og \`2 * i + 2\`. I en maks-haug er hver ting minst like stor (\`value\`) som barna sine, så den største alltid ligger på plass 0.

Skriv \`function heapSort(items, swap)\` som sorterer \`items\` på stedet, minst først, og bare flytter ting med \`swap(i, j)\`. Først bygger du en maks-haug av hele raden. Så bytter du den største (plass 0) bakerst, lar haugen bli én ting kortere, og lar den nye toppen synke ned til den står riktig. Gjenta til haugen er tom.

\`sort\` er forbudt, og sjekken prøver en rad med flere tusen ting, så en tregere metode klarer seg ikke.`,
    hints: [
      'Skriv en hjelper `siftDown(i, size)` som lar tingen på plass `i` synke: finn den største av den selv og barna på `2 * i + 1` og `2 * i + 2` (bare plasser under `size`). Er det et barn, bytter du med det og fortsetter derfra.',
      'Bygg haugen ved å kalle `siftDown(i, n)` for `i` fra `Math.floor(n / 2) - 1` ned til 0.',
      'Så for `end` fra `n - 1` ned til 1: `swap(0, end)` flytter den største bakerst, og `siftDown(0, end)` får den nye toppen på plass i den korte haugen.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `function heapSort(items, swap) {
  const n = items.length
  function siftDown(i, size) {
    // La tingen på plass i synke ned til den er minst like stor som barna
  }
  // 1. Bygg en maks-haug
  // 2. Flytt toppen bakerst, og la den nye toppen synke
}

heapSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function heapSort(items, swap) {
  const n = items.length
  function siftDown(i, size) {
    while (true) {
      let big = i
      const left = 2 * i + 1
      const right = left + 1
      if (left < size && items[left].value > items[big].value) big = left
      if (right < size && items[right].value > items[big].value) big = right
      if (big === i) return
      swap(i, big)
      i = big
    }
  }
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(i, n)
  for (let end = n - 1; end > 0; end--) {
    swap(0, end)
    siftDown(0, end)
  }
}

heapSort(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['heapSort'],
    check: (t) => {
      const heapSort = t.fn('heapSort')
      let seed = 13
      const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
      const proto: any = Array.prototype
      const trial = (values: number[], readLimit: number): string => {
        const n = values.length
        let reads = 0
        const arr = values.map((value) => {
          const o = t.ting({ value: 0 })
          Object.defineProperty(o, 'value', { get() { reads++; return value } })
          return o
        })
        const shadow = [...arr]
        const cap = Math.min(n * n + 10, 100 * n + 100)
        let calls = 0
        let bad = ''
        let banned = false
        const swap = (i: number, j: number) => {
          if (!bad && !(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < n && j < n)) {
            bad = `swap(${String(i)}, ${String(j)}) peker utenfor raden, som har ${n} ting.`
          }
          if (!bad && ++calls > cap) bad = 'swap ble kalt altfor mange ganger. Går en løkke i ring?'
          if (bad) throw new Error('stopp')
          const a = arr[i]
          arr[i] = arr[j]
          arr[j] = a
          const b = shadow[i]
          shadow[i] = shadow[j]
          shadow[j] = b
        }
        const ban = () => {
          banned = true
          throw new Error('stopp')
        }
        const real = { sort: proto.sort, toSorted: proto.toSorted }
        proto.sort = ban
        proto.toSorted = ban
        try {
          heapSort(arr, swap)
        } catch (err) {
          if (!bad && !banned) throw err
        } finally {
          proto.sort = real.sort
          proto.toSorted = real.toSorted
        }
        if (banned) return 'Du bruker `sort`, men det er forbudt her. Sorter selv, med en haug og swap.'
        if (bad) return bad
        const shown = n > 12 ? `en rad med ${n} ting` : `[${values.join(', ')}]`
        if (arr.length !== n || arr.some((x, i) => x !== shadow[i])) {
          return `Etter heapSort(${shown}) er raden endret på annen måte enn med swap. Flytt bare med swap(i, j).`
        }
        if (readLimit && reads > readLimit) {
          return `heapSort så på verdiene ${reads} ganger blant ${n} ting. Det er altfor mye: med en haug holder det rundt ${Math.round(4 * n * Math.log2(n))}.`
        }
        for (let i = 1; i < n; i++) {
          if (arr[i - 1].value > arr[i].value) return `heapSort(${shown}) endte med ${t.show(arr.map((x) => x.value))}, som ikke er sortert.`
        }
        return ''
      }
      const cases: number[][] = [
        [],
        [5],
        [2, 1],
        [1, 2, 3, 4, 5, 6, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1],
        [3, 1, 3, 2, 1, 2, 3],
        [5, 5, 5, 5],
        Array.from({ length: 8 }, () => Math.floor(rnd() * 100)),
        Array.from({ length: 40 }, () => Math.floor(rnd() * 20)),
      ]
      for (const values of cases) {
        const msg = trial(values, 0)
        if (msg) return msg
      }
      const n = 2000
      return trial(Array.from({ length: n }, () => Math.floor(rnd() * 1000)), 20 * n * Math.log2(n)) || true
    },
    source: 'https://en.wikipedia.org/wiki/Heapsort',
  },
  {
    id: 'sorteringsnettverk',
    title: 'Sorteringsnettverket',
    level: 'middels',
    topic: 'sortering',
    text: `Et sorteringsnettverk sorterer uten å se på verdiene. Det er en fast liste over par av plasser, og for hvert par bytter vi bare hvis de står feil vei. Er listen smart nok, ender alt i orden, uansett hvordan tingene sto.

Skriv \`function network(cmpSwap)\` som sorterer fire ting, på plassene 0, 1, 2 og 3, bare ved å kalle \`cmpSwap(i, j)\`. Den bytter plass \`i\` og \`j\` hvis tingen på \`i\` er større enn den på \`j\`, ellers skjer ingenting. Du får ikke se verdiene, så listen over kall blir den samme hver gang.

Sjekken prøver alle 24 rekkefølgene av fire ting, og du får kalle \`cmpSwap\` høyst 5 ganger.`,
    hints: [
      'Start med to par som hver for seg kommer i orden: `cmpSwap(0, 1)` og `cmpSwap(2, 3)`.',
      'Nå ligger den minste av alle fire på plass 0 eller 2, og den største på 1 eller 3. `cmpSwap(0, 2)` og `cmpSwap(1, 3)` setter den minste på plass 0 og den største på plass 3.',
      'Bare de to i midten kan fortsatt stå feil vei: `cmpSwap(1, 2)` er det femte og siste kallet.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r, 4), ascending)),
    ting: PLAIN_TING,
    scaffold: `function network(cmpSwap) {
  // Hvilke par vil du sammenligne? cmpSwap(0, 1) bytter plass 0 og 1 hvis de står feil vei.
}

network((i, j) => {
  if (items[i].value > items[j].value) {
    ;[items[i], items[j]] = [items[j], items[i]]
    vis(items[i], items[j])
  }
})
`,
    solution: `function network(cmpSwap) {
  cmpSwap(0, 1)
  cmpSwap(2, 3)
  cmpSwap(0, 2)
  cmpSwap(1, 3)
  cmpSwap(1, 2)
}

network((i, j) => {
  vis(items[i], items[j])
  if (items[i].value > items[j].value) {
    ;[items[i], items[j]] = [items[j], items[i]]
    vis(items[i], items[j])
  }
})
`,
    exports: ['network'],
    check: (t) => {
      const network = t.fn('network')
      const perms: number[][] = []
      const build = (rest: number[], chosen: number[]): void => {
        if (!rest.length) {
          perms.push(chosen)
          return
        }
        for (let k = 0; k < rest.length; k++) build([...rest.slice(0, k), ...rest.slice(k + 1)], [...chosen, rest[k]])
      }
      build([1, 2, 3, 4], [])
      for (const perm of perms) {
        const arr = [...perm]
        let calls = 0
        let bad = ''
        const cmpSwap = (i: number, j: number) => {
          if (!bad && !(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < 4 && j < 4 && i !== j)) {
            bad = `cmpSwap(${String(i)}, ${String(j)}) passer ikke: bruk to ulike plasser fra 0 til 3.`
          }
          if (!bad && ++calls > 5) bad = 'Nettverket kaller cmpSwap mer enn 5 ganger. Det går an med fem.'
          if (bad) throw new Error('stopp')
          if (arr[i] > arr[j]) {
            const tmp = arr[i]
            arr[i] = arr[j]
            arr[j] = tmp
          }
        }
        try {
          network(cmpSwap)
        } catch (err) {
          if (!bad) throw err
        }
        if (bad) return bad
        if (arr.join(',') !== '1,2,3,4') return `Med rekkefølgen ${perm.join(', ')} ble resultatet ${arr.join(', ')}, som ikke er sortert.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Sorting_network',
  },
  {
    id: 'farge-for-farge',
    title: 'Farge for farge',
    level: 'middels',
    topic: 'sortering',
    text: `Tingene vil stå sammen med dem som har samme farge, og fargene vil stå i alfabetisk rekkefølge: \`'cyan'\` før \`'gold'\`, \`'gold'\` før \`'lime'\`, og så videre. \`color\` er en tekst, og tekster kan du sammenligne med \`<\` og \`>\` eller med \`localeCompare\`.

Sorter \`items\` etter \`color\`. De som har samme farge, skal beholde rekkefølgen de hadde før: sorteringen skal være stabil. Raden har flere ting i hver farge, så du ser tydelig om de holder rekkefølgen.`,
    hints: [
      '`a.color.localeCompare(b.color)` gir et negativt tall, null eller et positivt tall, akkurat slik `sort` vil ha det.',
      'Sammenligner du selv med `<` og `>`, må funksjonen gi 0 når fargene er like. Da vet `sort` at de skal beholde rekkefølgen.',
      '`sort` er stabil i JavaScript: like ting holder rekkefølgen. Sorterer du selv, bytter du to naboer bare når den venstre er strengt større.',
    ],
    world: (r) => {
      const names = shuffled(r, PALETTE).slice(0, 3)
      const colors = [names[0], names[0], names[0], names[1], names[1], names[1], names[2], names[2]]
      const specs = things(r).map((spec, i) => ({ ...spec, color: colors[i] }))
      return arrayWorld(scrambled(r, specs, (row) => byColor(row) || keepsOrder(row)))
    },
    ting: PLAIN_TING,
    scaffold: `// Sorter items etter color, a til å. Like farger beholder rekkefølgen.
console.log(items.map((thing) => thing.color))
`,
    solution: `items.sort((a, b) => a.color.localeCompare(b.color))
vis('sortert etter farge')
`,
    check: (t) => {
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      const want = t
        .before('items')
        .map((x, i) => ({ x, i }))
        .sort((a, b) => (a.x.color < b.x.color ? -1 : a.x.color > b.x.color ? 1 : a.i - b.i))
        .map((e) => e.x)
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} ting, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        const got = t.items[i]
        if (got === want[i]) continue
        if (got && got.color === want[i].color) {
          return `${t.show(got)} og ${t.show(want[i])} har samme farge (${want[i].color}) og skal stå i samme rekkefølge som før: plass ${i} skal ha ${t.show(want[i])}.`
        }
        return `Plass ${i} skal ha ${t.show(want[i])} (${want[i].color}), men har ${t.show(got)} (${got?.color}).`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Sorting_algorithm#Stability',
  },
  {
    id: 'hvor-mange-ma-flytte',
    title: 'Hvor mange må flytte?',
    level: 'vanskelig',
    topic: 'sortering',
    text: `Tingene i \`items\` vil stå sortert etter \`value\`, men så få som mulig vil reise seg. En ting som flytter seg, kan settes ned hvor som helst. De som blir sittende, må allerede stå i riktig rekkefølge seg imellom.

Skriv \`function fewestMoves(items)\` som gir tilbake det minste antallet ting som må flytte seg. Funksjonen skal bare regne, ikke flytte noe. Sjekken prøver også en rad med flere tusen ting.`,
    hints: [
      'De som blir sittende, er en stigende rekke med hull i: verdiene øker fra venstre mot høyre, men står ikke nødvendigvis ved siden av hverandre. Jo lengre en slik rekke, jo færre må flytte.',
      'Svaret er antall ting minus lengden av den lengste stigende rekka. For hver plass kan du regne ut den lengste stigende rekka som slutter der, ved å se på alle plassene til venstre. Det er raskt nok for 8, men ikke for flere tusen.',
      'Raskere: hold en array `tails`, der `tails[k]` er den minste sluttverdien en stigende rekke med lengde `k + 1` kan ha. For hver verdi finner du med binærsøk den første i `tails` som er minst like stor, og bytter den ut, eller legger verdien til bakerst.',
    ],
    world: (r) => arrayWorld(scrambled(r, things(r), ascending)),
    ting: PLAIN_TING,
    scaffold: `function fewestMoves(items) {
  // Hvor lang er den lengste stigende rekka?
  return items.length
}

console.log(fewestMoves(items))
`,
    solution: `function fewestMoves(items) {
  const tails = []
  for (const thing of items) {
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tails[mid] < thing.value) lo = mid + 1
      else hi = mid
    }
    tails[lo] = thing.value
  }
  return items.length - tails.length
}

console.log(fewestMoves(items))
`,
    exports: ['fewestMoves'],
    check: (t) => {
      const fewestMoves = t.fn('fewestMoves')
      const lis = (v: number[]) => {
        const tails: number[] = []
        for (const x of v) {
          let lo = 0
          let hi = tails.length
          while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (tails[mid] < x) lo = mid + 1
            else hi = mid
          }
          tails[lo] = x
        }
        return tails.length
      }
      const rows = [[3, 1, 2], [1, 2, 3, 4], [4, 3, 2, 1], [], [7], [10, 9, 2, 5, 3, 7, 101, 18], [5, 1, 6, 2, 7, 3]]
      for (const values of rows) {
        const got = fewestMoves(values.map((value) => t.ting({ value })))
        const want = values.length - lis(values)
        if (got !== want) return `For ${t.show(values)} gav fewestMoves ${t.show(got)}, men det holder at ${want} flytter seg.`
      }
      const long = Array.from({ length: 4000 }, (_, i) => (i * 7919) % 4001)
      const got = fewestMoves(long.map((value) => t.ting({ value })))
      if (got !== long.length - lis(long)) return `For en lang rad på 4000 ting gav fewestMoves ${t.show(got)}, men svaret er ${long.length - lis(long)}.`
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Longest_increasing_subsequence',
  },
]
