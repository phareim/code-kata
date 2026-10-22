import { graphWorld, things } from './build'
import { GRAPH_TING } from './classes'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'steg-fra-a',
    title: 'Hvor mange steg unna?',
    level: 'middels',
    topic: 'grafer',
    text: `Tingene i \`nodes\` er venner, og vennene til hver ting står i \`neighbors\`. A vil vite hvor langt unna de andre er.

Gi hver ting et felt \`steps\`: hvor mange vennskap det er fra A til den, den korteste veien. A selv har \`steps = 0\`.

Gå bredden først: A, så alle vennene til A, så vennene deres, og så videre.`,
    hints: [
      'Bruk en kø: start med `A.steps = 0` og `const queue = [A]`.',
      'Ta den første ut av køen. For hver venn som ikke har `steps` ennå: sett `steps` én høyere, og still vennen bakerst i køen.',
      'Gi gjerne tingene farge etter avstanden, for eksempel `node.color = [\'pink\', \'cyan\', \'gold\', \'lime\'][node.steps]`, så ser du lagene.',
    ],
    world: (r) => graphWorld(r, things(r, 8), 3),
    ting: GRAPH_TING,
    views: { nodes: 'graph' },
    starter: `A.steps = 0
const queue = [A]
while (queue.length) {
  const node = queue.shift()
  // Gi vennene til node steps, og still dem i køen
}
`,
    solution: `const colors = ['pink', 'cyan', 'gold', 'lime', 'violet', 'orange', 'red', 'teal']
A.steps = 0
const queue = [A]
while (queue.length) {
  const node = queue.shift()
  node.color = colors[node.steps]
  vis(node)
  for (const friend of node.neighbors) {
    if (friend.steps === undefined) {
      friend.steps = node.steps + 1
      queue.push(friend)
    }
  }
}
`,
    check: (t) => {
      const start = t.slots[0]
      const dist = new Map([[start, 0]])
      const queue = [start]
      while (queue.length) {
        const node = queue.shift()!
        for (const friend of node.neighbors ?? []) {
          if (!dist.has(friend)) {
            dist.set(friend, dist.get(node)! + 1)
            queue.push(friend)
          }
        }
      }
      for (const [node, want] of dist) {
        if (node.steps !== want) return `${t.show(node)} har steps ${t.show(node.steps)}, men den er ${want} steg fra A.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Breadth-first_search',
  },
]
