import { int, makeWorld, pick } from './build'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'malingsbotta',
    title: 'Malingsbøtta',
    level: 'middels',
    topic: 'rutenett',
    text: `\`grid\` er et rutenett av farger: \`grid[rad][kolonne]\`. Gjør som malingsbøtta i et tegneprogram: ruta i \`start\` (\`[rad, kolonne]\`) og alle ruter med samme farge som henger sammen med den, skal bli \`'pink'\`.

To ruter henger sammen når de ligger rett ved siden av hverandre: over, under, til venstre eller til høyre. Ikke på skrå.`,
    hints: [
      'Husk fargen som skal byttes: `const old = grid[r][c]`.',
      'Bruk en stabel av ruter som skal sjekkes. Ta én ut: står den utenfor rutenettet eller har en annen farge enn `old`, hopp over den.',
      'Ellers: mal den rosa, og legg de fire naboene på stabelen. Malte ruter er ikke `old` lenger, så du går ikke i ring.',
    ],
    world: (r) => {
      const rows = 8
      const cols = 10
      const colors = ['cyan', 'gold', 'violet']
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => pick(r, colors)))
      // A blob of one colour around the start, so there is something to fill.
      const sr = int(r, 2, rows - 3)
      const sc = int(r, 2, cols - 3)
      for (let k = 0; k < 14; k++) {
        const dr = int(r, -2, 2)
        const dc = int(r, -2, 2)
        grid[sr + Math.sign(dr) * Math.min(Math.abs(dr), 2)][sc + dc] = 'lime'
      }
      grid[sr][sc] = 'lime'
      return makeWorld([], { grid, start: [sr, sc] })
    },
    starter: `const [r, c] = start
const old = grid[r][c]
const todo = [[r, c]]
while (todo.length) {
  const [y, x] = todo.pop()
  // Er ruta innenfor og har fargen old? Mal den, og legg naboene i todo.
}
`,
    solution: `const [r, c] = start
const old = grid[r][c]
const todo = [[r, c]]
while (todo.length) {
  const [y, x] = todo.pop()
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) continue
  if (grid[y][x] !== old) continue
  grid[y][x] = 'pink'
  vis()
  todo.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1])
}
`,
    check: (t) => {
      const before = t.start.grid as string[][]
      const [r, c] = t.start.start as number[]
      const old = before[r][c]
      const want = before.map((row) => [...row])
      const todo = [[r, c]]
      while (todo.length) {
        const [y, x] = todo.pop()!
        if (y < 0 || y >= want.length || x < 0 || x >= want[y].length || want[y][x] !== old) continue
        want[y][x] = 'pink'
        todo.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1])
      }
      const grid = t.grid
      if (!Array.isArray(grid) || grid.length !== want.length) return '`grid` skal ha like mange rader som før.'
      for (let y = 0; y < want.length; y++) {
        for (let x = 0; x < want[y].length; x++) {
          if (grid[y]?.[x] !== want[y][x]) {
            return want[y][x] === 'pink'
              ? `Ruta [${y}][${x}] henger sammen med start og skal være 'pink', men er ${t.show(grid[y]?.[x])}.`
              : `Ruta [${y}][${x}] skal være ${t.show(want[y][x])} som før, men er ${t.show(grid[y]?.[x])}.`
          }
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Flood_fill',
  },
]
