import { listWorld, things } from './build'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'si-hvem-du-er',
    title: 'Si hvem du er',
    level: 'lett',
    topic: 'objekter',
    text: `Tingene vil kunne presentere seg. Gi klassen \`Ting\` (øverst i Objekter) en metode \`describe()\` som gir tilbake fargen og verdien som tekst, med mellomrom imellom: \`'pink 42'\`.

Koden går gjennom lista og spør hver ting. Trykk «Kjør» når klassen har metoden.`,
    hints: [
      'En metode skrives inne i klassen, etter feltene: `describe() { … }`.',
      'Inne i metoden er tingen selv `this`, så fargen er `this.color`.',
      "Sett sammen teksten: `return this.color + ' ' + this.value`.",
    ],
    world: (r) => listWorld(things(r, 6)),
    starter: `// Skriv describe() i klassen Ting øverst i Objekter.
for (let node = head; node; node = node.next) {
  console.log(node.describe())
}
`,
    solution: `for (let node = head; node; node = node.next) {
  console.log(node.describe())
}
`,
    solutionTing: `class Ting {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
  describe() { return \`\${this.color} \${this.value}\` }
}`,
    check: (t) => {
      for (const node of t.slots) {
        if (typeof node.describe !== 'function') return 'Tingene har ingen metode `describe` ennå. Den skal stå i klassen.'
        const want = `${node.color} ${node.value}`
        const got = node.describe()
        if (got !== want) return `${t.show(node)}.describe() gav ${t.show(got)}, men skal gi ${t.show(want)}.`
      }
      const fresh = t.ting({ value: 3, color: 'lime' })
      if (fresh.describe() !== 'lime 3') return 'En ny Ting skal også kunne si hvem den er.'
      return true
    },
  },
]
