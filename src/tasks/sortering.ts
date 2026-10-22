import { arrayWorld, things } from './build'
import { PLAIN_TING } from './classes'
import type { Task } from './types'

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
    starter: `const last = items.length - 1
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
    starter: `let swapped = true
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
]
