import { arrayWorld, pick, shuffled, things } from './build'
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
]
