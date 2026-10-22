import { distinct, int, makeWorld, PALETTE, pick, shuffled, type Random } from './build'
import type { Task } from './types'

const blank = (rows: number, cols: number): string[][] => Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'))

/** How many separate patches of '#' a grid has, joined up, down, left and right. */
function patches(grid: string[][]): number {
  const seen = grid.map((row) => row.map(() => false))
  let count = 0
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== '#' || seen[y][x]) continue
      count++
      const todo = [[y, x]]
      while (todo.length) {
        const [a, b] = todo.pop()!
        if (grid[a]?.[b] !== '#' || seen[a][b]) continue
        seen[a][b] = true
        todo.push([a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1])
      }
    }
  }
  return count
}

/** A maze of walls and open ground (rows and cols odd): 'S' top left, 'E' bottom right, and a few loops knocked in. */
function maze(r: Random, rows: number, cols: number): string[][] {
  const g = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '#'))
  g[1][1] = '.'
  const stack: [number, number][] = [[1, 1]]
  while (stack.length) {
    const [y, x] = stack[stack.length - 1]
    const free = shuffled(r, [[-2, 0], [2, 0], [0, -2], [0, 2]]).filter(
      ([dy, dx]) => y + dy > 0 && y + dy < rows - 1 && x + dx > 0 && x + dx < cols - 1 && g[y + dy][x + dx] === '#',
    )
    if (!free.length) { stack.pop(); continue }
    const [dy, dx] = free[0]
    g[y + dy / 2][x + dx / 2] = '.'
    g[y + dy][x + dx] = '.'
    stack.push([y + dy, x + dx])
  }
  // A wall between two open cells that is knocked out makes a second way round.
  for (let tries = 0, made = 0; tries < 60 && made < 4; tries++) {
    const y = int(r, 1, rows - 2)
    const x = int(r, 1, cols - 2)
    if (g[y][x] !== '#' || y % 2 === x % 2) continue
    const open = y % 2 === 1 ? g[y][x - 1] === '.' && g[y][x + 1] === '.' : g[y - 1][x] === '.' && g[y + 1][x] === '.'
    if (open) { g[y][x] = '.'; made++ }
  }
  g[1][1] = 'S'
  g[rows - 2][cols - 2] = 'E'
  return g
}

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
  {
    id: 'mal-rammen',
    title: 'Mal rammen',
    level: 'lett',
    topic: 'rutenett',
    text: `\`grid\` er et rutenett med 6 rader og 8 kolonner: \`grid[rad][kolonne]\`. Alle rutene er tomme (\`'.'\`).

Mal en ramme: alle rutene ytterst, altså første og siste rad og første og siste kolonne, skal bli \`'gold'\`. Rutene inni skal stå tomme.`,
    hints: [
      'Gå gjennom alle rutene med to løkker: én for radene `r` og én for kolonnene `c`.',
      'En rute ligger ytterst når raden er den første eller den siste, eller kolonnen er den første eller den siste.',
      '`if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) grid[r][c] = \'gold\'`, med `rows = grid.length` og `cols = grid[0].length`.',
    ],
    world: () => makeWorld([], { grid: blank(6, 8) }),
    starter: `const rows = grid.length
const cols = grid[0].length
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    // Ligger ruta [r][c] ytterst? Mal den 'gold'.
  }
}
`,
    solution: `const rows = grid.length
const cols = grid[0].length
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
      grid[r][c] = 'gold'
      vis()
    }
  }
}
`,
    check: (t) => {
      const before = t.start.grid as string[][]
      const grid = t.grid
      if (!Array.isArray(grid) || grid.length !== before.length) return '`grid` skal ha like mange rader som før.'
      for (let r = 0; r < before.length; r++) {
        for (let c = 0; c < before[r].length; c++) {
          const edge = r === 0 || r === before.length - 1 || c === 0 || c === before[r].length - 1
          const want = edge ? 'gold' : before[r][c]
          if (grid[r]?.[c] !== want) {
            return edge
              ? `Ruta [${r}][${c}] ligger ytterst og skal være 'gold', men er ${t.show(grid[r]?.[c])}.`
              : `Ruta [${r}][${c}] ligger inni og skal stå tom som før, men er ${t.show(grid[r]?.[c])}.`
          }
        }
      }
      return true
    },
  },
  {
    id: 'speilvend-brettet',
    title: 'Speilvend brettet',
    level: 'lett',
    topic: 'rutenett',
    text: `\`grid\` er et rutenett: \`grid[rad][kolonne]\`. Venstre og høyre side vil bytte plass, som om brettet ble holdt opp mot et speil.

Speilvend hver rad, så den første ruta i raden havner sist og den siste først. Radene blir stående i samme rekkefølge.`,
    hints: [
      'Gjør én rad om gangen: `for (const row of grid) { … }`.',
      'I en rad bytter du den første og den siste ruta, så den nest første og den nest siste, og slik innover til du møter midten.',
      'Bytt `row[i]` og `row[row.length - 1 - i]` for `i` i første halvdel av raden. Eller bruk `row.reverse()`, som snur en array på stedet.',
    ],
    world: (r) => {
      // A bar of one colour from the left edge in every row, so the flip is easy to see.
      const grid = Array.from({ length: 6 }, () => {
        const color = pick(r, PALETTE)
        const length = int(r, 1, 6)
        return Array.from({ length: 8 }, (_, c) => (c < length ? color : '.'))
      })
      return makeWorld([], { grid })
    },
    starter: `for (const row of grid) {
  // Bytt første og siste i raden, så nest første og nest siste …
}
`,
    solution: `for (const row of grid) {
  for (let i = 0, j = row.length - 1; i < j; i++, j--) {
    ;[row[i], row[j]] = [row[j], row[i]]
  }
  vis()
}
`,
    check: (t) => {
      const before = t.start.grid as string[][]
      const grid = t.grid
      if (!Array.isArray(grid) || grid.length !== before.length) return '`grid` skal ha like mange rader som før.'
      for (let r = 0; r < before.length; r++) {
        const cols = before[r].length
        for (let c = 0; c < cols; c++) {
          const want = before[r][cols - 1 - c]
          if (grid[r]?.[c] !== want) return `Ruta [${r}][${c}] skal være ${t.show(want)}, den som stod i [${r}][${cols - 1 - c}], men er ${t.show(grid[r]?.[c])}.`
        }
      }
      return true
    },
  },
  {
    id: 'bytt-rader-og-kolonner',
    title: 'Bytt rader og kolonner',
    level: 'middels',
    topic: 'rutenett',
    text: `\`grid\` er et kvadrat på 6 × 6 ruter. Bytt rader og kolonner: det som står i rad \`r\`, kolonne \`c\`, skal flyttes til rad \`c\`, kolonne \`r\`. Første rad blir første kolonne, andre rad blir andre kolonne, og så videre. (Det kalles å transponere.)

Rutene på diagonalen, fra øverst til venstre til nederst til høyre, blir stående. Rutenettet skal fortsatt være 6 × 6 og ligge i \`grid\`.`,
    hints: [
      'Ruta i `grid[r][c]` og ruta i `grid[c][r]` skal bytte plass.',
      'Bytter du alle rutene, bytter du hvert par to ganger og ender der du begynte. Bytt bare de over diagonalen: de der `c > r`.',
      'To løkker: `for (let r = 0; r < n; r++)` og inni den `for (let c = r + 1; c < n; c++)`, med `[grid[r][c], grid[c][r]] = [grid[c][r], grid[r][c]]`.',
    ],
    world: (r) => {
      const grid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => (r() < 0.55 ? pick(r, ['cyan', 'gold', 'pink']) : '.')))
      // Not the same mirrored in the diagonal, so something has to move.
      grid[0][5] = 'pink'
      grid[5][0] = '.'
      return makeWorld([], { grid })
    },
    starter: `const n = grid.length
for (let r = 0; r < n; r++) {
  // Bytt grid[r][c] og grid[c][r] for rutene over diagonalen (c > r)
}
`,
    solution: `const n = grid.length
for (let r = 0; r < n; r++) {
  for (let c = r + 1; c < n; c++) {
    ;[grid[r][c], grid[c][r]] = [grid[c][r], grid[r][c]]
    vis()
  }
}
`,
    check: (t) => {
      const before = t.start.grid as string[][]
      const grid = t.grid
      if (!Array.isArray(grid) || grid.length !== before.length) return '`grid` skal fortsatt ha 6 rader.'
      for (let r = 0; r < before.length; r++) {
        for (let c = 0; c < before.length; c++) {
          const want = before[c][r]
          if (grid[r]?.[c] !== want) return `Ruta [${r}][${c}] skal være ${t.show(want)}, den som stod i [${c}][${r}], men er ${t.show(grid[r]?.[c])}.`
        }
      }
      return true
    },
  },
  {
    id: 'kvart-omdreining',
    title: 'En kvart omdreining',
    level: 'middels',
    topic: 'rutenett',
    text: `\`grid\` er et kvadrat på 6 × 6 ruter. Drei hele brettet en kvart omdreining med klokka: ruta øverst til venstre havner øverst til høyre, ruta øverst til høyre havner nederst til høyre, og så videre. Den øverste raden blir til den høyre kolonnen.

Rutenettet skal fortsatt være 6 × 6 og ligge i \`grid\`.`,
    hints: [
      'Del jobben i to enkle steg. Hva skjer om du først bytter rader og kolonner, og så speilvender hver rad?',
      'Første steg: bytt `grid[r][c]` og `grid[c][r]` for `c > r`, så rader blir til kolonner.',
      'Andre steg: snu hver rad med `row.reverse()`. Ruta som stod øverst til venstre, havner da øverst til høyre.',
    ],
    world: (r) => {
      const grid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => (r() < 0.4 ? pick(r, ['cyan', 'gold', 'lime']) : '.')))
      // A pink corner that must move, and an empty one it moves to.
      grid[0][0] = 'pink'
      grid[0][5] = '.'
      return makeWorld([], { grid })
    },
    starter: `const n = grid.length
// 1. Bytt rader og kolonner
// 2. Speilvend hver rad
`,
    solution: `const n = grid.length
for (let r = 0; r < n; r++) {
  for (let c = r + 1; c < n; c++) {
    ;[grid[r][c], grid[c][r]] = [grid[c][r], grid[r][c]]
  }
}
vis('rader og kolonner byttet')
for (const row of grid) {
  row.reverse()
  vis()
}
`,
    check: (t) => {
      const before = t.start.grid as string[][]
      const n = before.length
      const grid = t.grid
      if (!Array.isArray(grid) || grid.length !== n) return '`grid` skal fortsatt ha 6 rader.'
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const want = before[n - 1 - c][r]
          if (grid[r]?.[c] !== want) return `Ruta [${r}][${c}] skal være ${t.show(want)}, den som stod i [${n - 1 - c}][${r}], men er ${t.show(grid[r]?.[c])}.`
        }
      }
      return true
    },
  },
  {
    id: 'spiralen',
    title: 'Spiralen',
    level: 'middels',
    topic: 'rutenett',
    text: `\`grid\` er et rutenett av tall. Skriv \`function spiral(grid)\` som gir tilbake verdiene i en spiral: start øverst til venstre, gå til høyre langs øverste rad, ned langs høyre kant, til venstre langs nederste rad og opp langs venstre kant. Fortsett innover, med klokka, til alle rutene er med, hver nøyaktig én gang. Et rutenett på 3 × 3 med tallene 1 til 9 gir \`[1, 2, 3, 6, 9, 8, 7, 4, 5]\`.

Rutenettet kan være bare én rad eller bare én kolonne, og det kan være tomt (\`[]\` eller \`[[]]\`). Da skal du gi tilbake alle verdiene på rad, eller en tom array. Koden nederst skriver ut spiralen for rutenettet på scenen.`,
    hints: [
      'Hold styr på fire kanter: `top`, `bottom`, `left` og `right`. Først går du langs øverste rad, fra `left` til `right`.',
      'Trekk kanten inn etter hver side: `top++` etter øverste rad. Så ned langs høyre kant (`right--` etterpå), bakover langs nederste rad (`bottom--`) og opp langs venstre kant (`left++`).',
      'Pass på enkeltrader og enkeltkolonner: før du går bakover langs nederste rad, sjekk at `top <= bottom`, og før du går opp, at `left <= right`. Ellers tar du de samme rutene to ganger.',
    ],
    world: (r) => {
      const rows = int(r, 3, 5)
      const cols = int(r, 3, 6)
      return makeWorld([], { grid: Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => y * cols + x + 1)) })
    },
    starter: `function spiral(grid) {
  const out = []
  let top = 0
  let bottom = grid.length - 1
  let left = 0
  let right = grid.length ? grid[0].length - 1 : -1
  // Så lenge det er noe igjen: øverst mot høyre, høyre kant nedover,
  // nederst mot venstre, venstre kant oppover. Trekk kantene inn.
  return out
}

console.log(spiral(grid))
`,
    solution: `function spiral(grid) {
  const out = []
  let top = 0
  let bottom = grid.length - 1
  let left = 0
  let right = grid.length ? grid[0].length - 1 : -1
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(grid[top][c])
    top++
    for (let r = top; r <= bottom; r++) out.push(grid[r][right])
    right--
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(grid[bottom][c])
      bottom--
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(grid[r][left])
      left++
    }
  }
  return out
}

console.log(spiral(grid))
`,
    exports: ['spiral'],
    check: (t) => {
      const spiral = t.fn('spiral')
      const make = (rows: number, cols: number) =>
        Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => y * cols + x + 1))
      // The right answer: walk, and turn right at an edge or at a square already visited.
      const walk = (g: number[][]) => {
        const out: number[] = []
        const rows = g.length
        const cols = rows ? g[0].length : 0
        const seen = g.map((line) => line.map(() => false))
        const dr = [0, 1, 0, -1]
        const dc = [1, 0, -1, 0]
        let r = 0
        let c = 0
        let d = 0
        for (let k = 0; k < rows * cols; k++) {
          out.push(g[r][c])
          seen[r][c] = true
          let nr = r + dr[d]
          let nc = c + dc[d]
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
            d = (d + 1) % 4
            nr = r + dr[d]
            nc = c + dc[d]
          }
          r = nr
          c = nc
        }
        return out
      }
      const sizes = [[3, 3], [4, 5], [1, 4], [4, 1], [1, 1], [2, 2], [5, 2], [2, 6], [6, 6], [0, 0], [1, 0]]
      for (const [rows, cols] of sizes) {
        const want = walk(make(rows, cols))
        const got = spiral(make(rows, cols))
        if (!t.same(got, want)) {
          const what = rows === 0 ? 'et tomt rutenett' : cols === 0 ? 'et rutenett med én tom rad' : `et rutenett på ${rows} × ${cols} med tallene 1 til ${rows * cols}`
          return `spiral gav ${t.show(got)} for ${what}, men det skal bli ${t.show(want)}.`
        }
      }
      return true
    },
  },
  {
    id: 'tell-oyene',
    title: 'Tell øyene',
    level: 'middels',
    topic: 'rutenett',
    text: `I \`grid\` er \`'#'\` land og \`'.'\` er vann. En øy er landruter som henger sammen: ruter som ligger rett over, under, til venstre eller til høyre for hverandre. To ruter som bare møtes på skrå, er ikke samme øy.

Skriv \`function islands(grid)\` som gir tilbake hvor mange øyer det er. Et rutenett uten land har 0 øyer, og det kan være tomt (\`[]\`). Du kan gjerne male øyene underveis, for sjekken gir deg et nytt rutenett hver gang. Koden nederst skriver ut antallet for rutenettet på scenen.`,
    hints: [
      'Gå gjennom alle rutene. Hver gang du treffer land du ikke har telt, har du funnet en ny øy: øk telleren.',
      'Da må du få med hele øya, så du ikke teller den igjen. Bruk en stabel av ruter som skal sjekkes, som i malingsbøtta: land blir malt, og de fire naboene legges på stabelen.',
      'Mal øya med en farge, for eksempel `grid[y][x] = \'pink\'`: malt land er ikke `\'#\'` lenger, så det telles ikke på nytt. Pass på kanten: `grid[y]?.[x]` gir `undefined` utenfor.',
    ],
    world: (r) => {
      let grid = blank(8, 10)
      for (let tries = 0; tries < 60; tries++) {
        grid = Array.from({ length: 8 }, () => Array.from({ length: 10 }, () => (r() < 0.38 ? '#' : '.')))
        const n = patches(grid)
        if (n >= 4 && n <= 7) break
      }
      return makeWorld([], { grid })
    },
    starter: `function islands(grid) {
  let count = 0
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      // Er ruta land ('#') du ikke har talt? Tell en øy, og mal hele øya.
    }
  }
  return count
}

console.log(islands(grid))
`,
    solution: `function islands(grid) {
  const colors = ['pink', 'cyan', 'gold', 'lime', 'violet', 'orange', 'red', 'teal']
  let count = 0
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== '#') continue
      const color = colors[count % colors.length]
      count++
      const todo = [[r, c]]
      while (todo.length) {
        const [y, x] = todo.pop()
        if (grid[y]?.[x] !== '#') continue
        grid[y][x] = color
        todo.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1])
      }
      vis('ny øy', count)
    }
  }
  return count
}

console.log(islands(grid))
`,
    exports: ['islands'],
    source: 'https://en.wikipedia.org/wiki/Connected-component_labeling',
    check: (t) => {
      const islands = t.fn('islands')
      // The right count: take each patch of land once and wipe it out.
      const count = (rows: string[]) => {
        const g = rows.map((row) => row.split(''))
        let n = 0
        for (let y = 0; y < g.length; y++) {
          for (let x = 0; x < g[y].length; x++) {
            if (g[y][x] !== '#') continue
            n++
            const todo = [[y, x]]
            while (todo.length) {
              const [a, b] = todo.pop()!
              if (g[a]?.[b] !== '#') continue
              g[a][b] = '.'
              todo.push([a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1])
            }
          }
        }
        return n
      }
      const boards: string[][] = [
        [],
        ['.'],
        ['#'],
        ['....', '....'],
        ['####'],
        ['#.#.#'],
        ['#', '.', '#', '#'],
        ['#.', '.#'],
        ['.#.', '#.#', '.#.'],
        ['###', '#.#', '###'],
        ['#####', '#...#', '#.#.#', '#...#', '#####'],
        ['##..#', '#...#', '..#..', '#...#', '#..##'],
        ['#.#.#.#', '.#.#.#.', '#.#.#.#'],
      ]
      let seed = 3
      for (let k = 0; k < 5; k++) {
        const rows: string[] = []
        for (let y = 0; y < 7; y++) {
          let line = ''
          for (let x = 0; x < 9; x++) {
            seed = (seed * 16807) % 2147483647
            line += seed % 10 < 4 ? '#' : '.'
          }
          rows.push(line)
        }
        boards.push(rows)
      }
      for (const rows of boards) {
        const want = count(rows)
        const got = islands(rows.map((row) => row.split('')))
        if (got !== want) {
          return `islands gav ${t.show(got)} for ${rows.length ? `dette brettet (${rows.join(' / ')})` : 'et tomt rutenett'}, men det er ${want === 1 ? 'én øy' : `${want} øyer`}.`
        }
      }
      return true
    },
  },
  {
    id: 'ut-av-labyrinten',
    title: 'Ut av labyrinten',
    level: 'middels',
    topic: 'rutenett',
    text: `I \`grid\` er \`'#'\` en vegg og \`'.'\` åpen vei. \`'S'\` er start og \`'E'\` er utgangen. Du går ett steg om gangen: opp, ned, til venstre eller til høyre, aldri på skrå og aldri gjennom vegger.

Skriv \`function steps(grid)\` som gir tilbake det minste antallet steg fra \`'S'\` til \`'E'\`, eller \`-1\` hvis det ikke finnes noen vei. Står \`'E'\` rett ved siden av \`'S'\`, er svaret 1. Du kan gjerne male de rutene du har vært på, så ser du hvordan du leter deg fram; sjekken gir deg nye rutenett. Koden nederst skriver ut svaret for labyrinten på scenen.`,
    hints: [
      'Finn først `S`, og let utover i ringer: alle ruter ett steg unna, så to steg unna, og så videre. Første gang du treffer `E`, har du den korteste veien.',
      'Bruk en kø med `[rad, kolonne, steg]`: ta ut den fremste og legg naboene bakerst. Merk ruter du har vært på, for eksempel ved å male dem, så du ikke går i ring.',
      'For hver nabo: er det `E`, gi tilbake `steg + 1`; er det `\'.\'`, mal den og legg den i køen med `steg + 1`. Er køen tom uten at du fant `E`, gi tilbake `-1`.',
    ],
    world: (r) => makeWorld([], { grid: maze(r, 9, 11) }),
    starter: `function steps(grid) {
  // Finn S, og let utover derfra ett steg om gangen
  return -1
}

console.log(steps(grid))
`,
    solution: `function steps(grid) {
  let start = null
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 'S') start = [r, c, 0]
    }
  }
  if (!start) return -1
  const queue = [start]
  while (queue.length) {
    const [r, c, d] = queue.shift()
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const y = r + dr
      const x = c + dc
      const cell = grid[y]?.[x]
      if (cell === 'E') return d + 1
      if (cell !== '.') continue
      grid[y][x] = 'cyan'
      queue.push([y, x, d + 1])
      vis()
    }
  }
  return -1
}

console.log(steps(grid))
`,
    exports: ['steps'],
    source: 'https://en.wikipedia.org/wiki/Breadth-first_search',
    check: (t) => {
      const steps = t.fn('steps')
      // The right answer: ring after ring from S.
      const shortest = (rows: string[]) => {
        const g = rows.map((row) => row.split(''))
        const queue: number[][] = []
        const dist = new Map<string, number>()
        for (let y = 0; y < g.length; y++) {
          for (let x = 0; x < g[y].length; x++) {
            if (g[y][x] === 'S') { queue.push([y, x]); dist.set(`${y},${x}`, 0) }
          }
        }
        for (let q = 0; q < queue.length; q++) {
          const [y, x] = queue[q]
          for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const cell = g[y + dy]?.[x + dx]
            const key = `${y + dy},${x + dx}`
            if (cell === undefined || cell === '#' || dist.has(key)) continue
            dist.set(key, dist.get(`${y},${x}`)! + 1)
            if (cell === 'E') return dist.get(key)!
            queue.push([y + dy, x + dx])
          }
        }
        return -1
      }
      const boards: string[][] = [
        ['SE'],
        ['S.E'],
        ['E.S'],
        ['S#E'],
        ['S.', '.E'],
        ['S#', '#E'],
        ['S...', '###.', 'E...'],
        ['S.#', '.#E', '...'],
        ['S.#', '..#', '##E'],
        ['S....', '.....', '.....', '.....', '....E'],
        ['S.....', '.####.', '.#E...', '.#.##.', '......'],
        ['S.#.....', '#.#.###.', '#.#...#.', '#.###.#.', '#.....#E'],
      ]
      let seed = 5
      for (let k = 0; k < 6; k++) {
        const rows: string[] = []
        for (let y = 0; y < 8; y++) {
          let line = ''
          for (let x = 0; x < 8; x++) {
            seed = (seed * 16807) % 2147483647
            line += y === 0 && x === 0 ? 'S' : y === 7 && x === 7 ? 'E' : seed % 10 < 3 ? '#' : '.'
          }
          rows.push(line)
        }
        boards.push(rows)
      }
      for (const rows of boards) {
        const want = shortest(rows)
        const got = steps(rows.map((row) => row.split('')))
        if (got !== want) {
          return `steps gav ${t.show(got)} for ${rows.join(' / ')}, men ${want < 0 ? 'det finnes ingen vei, så svaret skal være -1' : `den korteste veien er ${want} steg`}.`
        }
      }
      return true
    },
  },
  {
    id: 'livets-spill',
    title: 'Ett steg i Livet',
    level: 'middels',
    topic: 'rutenett',
    text: `\`grid\` er et lite samfunn av celler: \`'lime'\` er levende og \`'.'\` er død. Hver celle har åtte naboer, også på skrå, og alle bytter tilstand samtidig:

- en levende celle med to eller tre levende naboer lever videre, ellers dør den
- en død celle med nøyaktig tre levende naboer våkner til liv

Gjør ett steg. Alle rutene avgjøres ut fra rutenettet slik det var før steget, ikke slik det blir underveis. Utenfor kanten er alle døde. Etterpå skal \`grid\` vise det nye samfunnet, med \`'lime'\` og \`'.'\`.`,
    hints: [
      'Du kan ikke endre `grid` mens du teller: en rute som skifter, ville ødelegge tellingen for naboene. Lag en kopi, `next`, og skriv den nye tilstanden dit.',
      'Tell de levende naboene med to løkker, `dr` og `dc` fra -1 til 1, og hopp over (0, 0). Pass på kanten: `grid[r + dr]?.[c + dc]` gir `undefined` utenfor.',
      'Levende med 2 eller 3 levende naboer og død med akkurat 3 blir levende, alt annet blir dødt. Til slutt `grid = next`.',
    ],
    world: (r) => {
      const grid = blank(10, 10)
      // A glider in the upper left, a blinker down by the edge.
      const gr = int(r, 1, 2)
      const gc = int(r, 1, 3)
      for (const [y, x] of [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]]) grid[gr + y][gc + x] = 'lime'
      const br = int(r, 8, 9)
      const bc = int(r, 4, 7)
      for (let x = 0; x < 3; x++) grid[br][bc + x] = 'lime'
      return makeWorld([], { grid })
    },
    starter: `const next = grid.map((row) => [...row])
for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    // Tell de levende naboene (åtte ruter) til [r][c] i grid
    // og skriv den nye tilstanden i next[r][c]
  }
}
grid = next
`,
    solution: `const next = grid.map((row) => [...row])
for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    let alive = 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dr || dc) && grid[r + dr]?.[c + dc] === 'lime') alive++
      }
    }
    const lives = grid[r][c] === 'lime' ? alive === 2 || alive === 3 : alive === 3
    next[r][c] = lives ? 'lime' : '.'
  }
}
grid = next
vis('ett steg')
`,
    source: 'https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life',
    check: (t) => {
      const before = t.start.grid as string[][]
      const grid = t.grid
      if (!Array.isArray(grid) || grid.length !== before.length) return '`grid` skal ha like mange rader som før.'
      for (let r = 0; r < before.length; r++) {
        for (let c = 0; c < before[r].length; c++) {
          let alive = 0
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if ((dr || dc) && before[r + dr]?.[c + dc] === 'lime') alive++
            }
          }
          const was = before[r][c] === 'lime'
          const want = (was ? alive === 2 || alive === 3 : alive === 3) ? 'lime' : '.'
          if (grid[r]?.[c] !== want) {
            return `Ruta [${r}][${c}] ${was ? 'levde' : 'var død'} og har ${alive} levende ${alive === 1 ? 'nabo' : 'naboer'}, så den skal være ${t.show(want)}, men er ${t.show(grid[r]?.[c])}.`
          }
        }
      }
      return true
    },
  },
  {
    id: 'minesveiper',
    title: 'Minesveiper',
    level: 'middels',
    topic: 'rutenett',
    text: `I \`grid\` er \`'*'\` en mine, og de andre rutene er tomme (\`'.'\`). Skriv inn hvor farlig hver tomme rute er: bytt ut hver \`'.'\` med antall miner blant de åtte naboene, også de på skrå. Tallet er et tall (\`3\`, ikke \`'3'\`), og en rute uten miner rundt seg får tallet \`0\`.

Minene selv blir stående som de er.`,
    hints: [
      'Gå gjennom alle rutene. Bare de tomme (`\'.\'`) skal endres; hopp over minene.',
      'For en tom rute: gå gjennom naboene med `dr` og `dc` fra -1 til 1, og tell dem som er `\'*\'`. Selve ruta er tom, så den teller aldri med.',
      'Ruter utenfor kanten finnes ikke: `grid[r + dr]?.[c + dc]` gir `undefined` der, og det er ikke en mine. Skriv tallet i ruta når du har telt ferdig.',
    ],
    world: (r) => {
      const grid = blank(8, 10)
      for (const i of distinct(r, 12, 0, 79)) grid[Math.floor(i / 10)][i % 10] = '*'
      return makeWorld([], { grid })
    },
    starter: `for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    // Er ruta tom ('.')? Tell minene ('*') rundt den, og skriv tallet i ruta.
  }
}
`,
    solution: `for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    if (grid[r][c] !== '.') continue
    let mines = 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (grid[r + dr]?.[c + dc] === '*') mines++
      }
    }
    grid[r][c] = mines
  }
  vis()
}
`,
    source: 'https://en.wikipedia.org/wiki/Minesweeper_(video_game)',
    check: (t) => {
      const before = t.start.grid as string[][]
      const grid = t.grid
      if (!Array.isArray(grid) || grid.length !== before.length) return '`grid` skal ha like mange rader som før.'
      for (let r = 0; r < before.length; r++) {
        for (let c = 0; c < before[r].length; c++) {
          if (before[r][c] === '*') {
            if (grid[r]?.[c] !== '*') return `Ruta [${r}][${c}] er en mine og skal stå som '*', men er ${t.show(grid[r]?.[c])}.`
            continue
          }
          let mines = 0
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (before[r + dr]?.[c + dc] === '*') mines++
            }
          }
          if (grid[r]?.[c] !== mines) return `Ruta [${r}][${c}] har ${mines} ${mines === 1 ? 'mine' : 'miner'} rundt seg og skal være tallet ${mines}, men er ${t.show(grid[r]?.[c])}.`
        }
      }
      return true
    },
  },
  {
    id: 'langtons-maur',
    title: 'Langtons maur',
    level: 'vanskelig',
    topic: 'rutenett',
    text: `En maur går rundt på \`grid\`, et rutenett på 15 × 15 tomme ruter. Hvor den står og hvilken vei den ser, ligger i \`ant\`: \`ant.row\`, \`ant.col\` og \`ant.dir\`, der 0 er opp, 1 høyre, 2 ned og 3 venstre. (\`color\` og \`shape\` i \`ant\` er bare for at du skal se maura på scenen.)

Hvert steg gjør maura dette, ut fra ruta den står på. Er den \`'.'\`: sving til høyre, mal ruta \`'violet'\` og gå ett steg fram. Er den \`'violet'\`: sving til venstre, mal ruta \`'.'\` og gå ett steg fram. Går maura ut over kanten, kommer den inn på motsatt side.

Gjør 200 steg. Til slutt skal \`grid\` vise det maura har malt, og \`ant\` skal vise hvor den står og ser.`,
    hints: [
      'Én runde i løkka er ett steg: les ruta maura står på (`grid[ant.row][ant.col]`), sving og mal, og flytt så.',
      'Sving til høyre er `ant.dir = (ant.dir + 1) % 4`, og sving til venstre `(ant.dir + 3) % 4`. For å gå fram trenger du hvor mye rad og kolonne endrer seg for hver retning: `[-1, 0, 1, 0]` og `[0, 1, 0, -1]` for retning 0 til 3.',
      'Mal ruta du står på før du flytter deg. Og kanten: `ant.row = (ant.row + dr[ant.dir] + n) % n` tar deg rundt, med `n = 15`.',
    ],
    // color and shape are only for the stage: a plain object in a root is drawn as an item, and this one gets a face.
    world: () => makeWorld([], { grid: blank(15, 15), ant: { row: 3, col: 3, dir: 0, color: 'red', shape: 'bot' } }),
    views: { ant: 'value' },
    starter: `const n = grid.length
for (let step = 1; step <= 200; step++) {
  // På '.': sving høyre og mal 'violet'. På 'violet': sving venstre og mal '.'.
  // Gå så ett steg fram i retningen ant.dir, og rund kanten.
}
`,
    solution: `const dr = [-1, 0, 1, 0]
const dc = [0, 1, 0, -1]
const n = grid.length
for (let step = 1; step <= 200; step++) {
  if (grid[ant.row][ant.col] === '.') {
    ant.dir = (ant.dir + 1) % 4
    grid[ant.row][ant.col] = 'violet'
  } else {
    ant.dir = (ant.dir + 3) % 4
    grid[ant.row][ant.col] = '.'
  }
  ant.row = (ant.row + dr[ant.dir] + n) % n
  ant.col = (ant.col + dc[ant.dir] + n) % n
  if (step % 10 === 0) vis('steg', step)
}
`,
    source: 'https://en.wikipedia.org/wiki/Langton%27s_ant',
    check: (t) => {
      const start = t.start.grid as string[][]
      const from = t.start.ant as { row: number; col: number; dir: number }
      const n = start.length
      const grid = t.grid
      const ant = t.ant
      if (!Array.isArray(grid) || grid.length !== n) return '`grid` skal fortsatt ha 15 rader.'
      if (ant === null || typeof ant !== 'object') return '`ant` skal fortsatt være et objekt med `row`, `col` og `dir`.'
      // The right answer: walk the ant 200 steps, and go on to 400 to see whether the code stopped early or late.
      const dr = [-1, 0, 1, 0]
      const dc = [0, 1, 0, -1]
      const sim = start.map((line) => [...line])
      let row = from.row
      let col = from.col
      let dir = from.dir
      let want: { sim: string[][]; row: number; col: number; dir: number } | null = null
      let other = -1
      for (let s = 0; s <= 400; s++) {
        if (s === 200) {
          want = { sim: sim.map((line) => [...line]), row, col, dir }
        } else if (other < 0 && ant.row === row && ant.col === col && ant.dir === dir && sim.every((line, y) => line.every((v, x) => grid[y]?.[x] === v))) {
          other = s
        }
        if (sim[row][col] === '.') {
          dir = (dir + 1) % 4
          sim[row][col] = 'violet'
        } else {
          dir = (dir + 3) % 4
          sim[row][col] = '.'
        }
        row = (row + dr[dir] + n) % n
        col = (col + dc[dir] + n) % n
      }
      const right = want!
      const late = other < 0 ? '' : other < 200 ? ` Det ser ut som maura bare tok ${other} steg.` : ` Det ser ut som maura tok ${other} steg.`
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (grid[y]?.[x] !== right.sim[y][x]) {
            return `Ruta [${y}][${x}] skal være ${t.show(right.sim[y][x])} etter 200 steg, men er ${t.show(grid[y]?.[x])}.${late}`
          }
        }
      }
      if (ant.row !== right.row || ant.col !== right.col || ant.dir !== right.dir) {
        return `Rutenettet stemmer, men maura skal stå på [${right.row}][${right.col}] og se i retning ${right.dir}, ikke på [${t.show(ant.row)}][${t.show(ant.col)}] i retning ${t.show(ant.dir)}.`
      }
      return true
    },
  },
  {
    id: 'slukk-lysene',
    title: 'Slukk lysene',
    level: 'vanskelig',
    topic: 'rutenett',
    text: `\`grid\` er et brett med 5 × 5 lamper: \`'gold'\` er tent og \`'.'\` er slukket. Trykker du på en lampe, skifter den og de fire lampene rett over, under, til venstre og til høyre for den (de som finnes) tilstand. Tent blir slukket, og slukket blir tent.

Skriv \`function solve(grid)\` som gir tilbake en liste med trykk, \`[rad, kolonne]\`, som slukker alle lampene. Rekkefølgen spiller ingen rolle, og er alt allerede slukket, gir du en tom liste. \`solve\` skal ikke endre rutenettet den får. Alle brett sjekken gir deg, kan løses. Koden nederst gjør trykkene på brettet på scenen.`,
    hints: [
      'Rekkefølgen på trykkene betyr ingenting, og å trykke på samme lampe to ganger er det samme som ikke å trykke. Så for hver lampe er spørsmålet bare: trykk, eller ikke.',
      'Velg trykkene i øverste rad først: 5 lamper, trykk eller ikke, gir 32 muligheter. Radene under rydder så opp: er lampen rett over ruta (r, c) tent, må du trykke (r, c), for ingenting senere kan slukke den.',
      'Prøv alle 32 mulighetene for øverste rad, hver på en kopi av brettet. Er nederste rad slukket når du har ryddet nedover, har du løsningen: gi tilbake trykkene dine.',
    ],
    world: (r) => {
      const grid = blank(5, 5)
      const press = (y: number, x: number) => {
        for (const [a, b] of [[y, x], [y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]]) {
          if (grid[a]?.[b] !== undefined) grid[a][b] = grid[a][b] === 'gold' ? '.' : 'gold'
        }
      }
      // Made by pressing, so it can be solved.
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (r() < 0.5) press(y, x)
      if (grid.every((row) => row.every((v) => v === '.'))) press(2, 2)
      return makeWorld([], { grid })
    },
    starter: `// Trykk på (r, c): den og de fire naboene skifter tilstand
function press(grid, r, c) {
  for (const [y, x] of [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
    if (grid[y]?.[x] === undefined) continue
    grid[y][x] = grid[y][x] === 'gold' ? '.' : 'gold'
  }
}

function solve(grid) {
  const presses = []
  // Finn trykkene på en kopi: grid.map((row) => [...row])
  return presses
}

for (const [r, c] of solve(grid)) {
  press(grid, r, c)
  vis()
}
`,
    solution: `// Trykk på (r, c): den og de fire naboene skifter tilstand
function press(grid, r, c) {
  for (const [y, x] of [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
    if (grid[y]?.[x] === undefined) continue
    grid[y][x] = grid[y][x] === 'gold' ? '.' : 'gold'
  }
}

function solve(grid) {
  const n = grid.length
  for (let mask = 0; mask < 2 ** n; mask++) {
    const copy = grid.map((row) => [...row])
    const presses = []
    // Øverste rad etter mønsteret i mask
    for (let c = 0; c < n; c++) {
      if (mask & (1 << c)) {
        press(copy, 0, c)
        presses.push([0, c])
      }
    }
    // Radene under slukker det som lyser rett over
    for (let r = 1; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (copy[r - 1][c] === 'gold') {
          press(copy, r, c)
          presses.push([r, c])
        }
      }
    }
    if (copy[n - 1].every((cell) => cell !== 'gold')) return presses
  }
  return null
}

for (const [r, c] of solve(grid)) {
  press(grid, r, c)
  vis()
}
`,
    exports: ['solve'],
    source: 'https://en.wikipedia.org/wiki/Lights_Out_(game)',
    check: (t) => {
      const solve = t.fn('solve')
      const press = (g: string[][], r: number, c: number) => {
        for (const [y, x] of [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
          if (g[y]?.[x] !== undefined) g[y][x] = g[y][x] === 'gold' ? '.' : 'gold'
        }
      }
      const made = (presses: number[][]) => {
        const g = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => '.'))
        for (const [r, c] of presses) press(g, r, c)
        return g
      }
      // Boards made by pressing, so each one can be solved.
      const boards = [made([]), made([[2, 2]]), made([[0, 0]]), made([[0, 4], [4, 4]]), made([[1, 1], [1, 2], [3, 0]])]
      let seed = 11
      for (let k = 0; k < 8; k++) {
        const presses: number[][] = []
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            seed = (seed * 16807) % 2147483647
            if (seed % 2) presses.push([r, c])
          }
        }
        boards.push(made(presses))
      }
      const show = (g: string[][]) => g.map((row) => row.map((v) => (v === 'gold' ? 'X' : '.')).join('')).join(' / ')
      for (const board of boards) {
        const given = board.map((row) => [...row])
        const answer = solve(given)
        if (JSON.stringify(given) !== JSON.stringify(board)) return 'solve endret rutenettet den fikk. Arbeid på en kopi.'
        if (!Array.isArray(answer) || answer.length > 100) return `solve skal gi tilbake en liste med trykk, ikke ${t.show(answer)}, for brettet ${show(board)} (X er tent).`
        const g = board.map((row) => [...row])
        for (const p of answer) {
          if (!Array.isArray(p) || !Number.isInteger(p[0]) || !Number.isInteger(p[1]) || p[0] < 0 || p[0] > 4 || p[1] < 0 || p[1] > 4) {
            return `Hvert trykk skal være [rad, kolonne] med tall fra 0 til 4, men fikk ${t.show(p)}.`
          }
          press(g, p[0], p[1])
        }
        if (g.some((row) => row.some((v) => v !== '.'))) {
          return `Brettet ${show(board)} (X er tent) er ikke slukket etter trykkene dine. Det står igjen: ${show(g)}`
        }
      }
      const lit = t.grid
      if (!Array.isArray(lit) || lit.some((row: unknown) => !Array.isArray(row) || row.some((v: unknown) => v !== '.'))) {
        return 'Brettet på scenen er ikke slukket ennå. Gjør trykkene på `grid` også.'
      }
      return true
    },
  },
]
