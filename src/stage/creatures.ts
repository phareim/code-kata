/*
 * The creatures the items are drawn as: 14×9 pixel figures in the item's colour (--c), drawn as crisp SVG rects.
 *   # body   s shade   h highlight   W eye   k mouth   g gold
 * An item's `shape` picks the figure. Pupils are drawn on top: looking right along the pointers, or down when the
 * item is loose; they sit in each eye's right column or bottom row.
 */
const FIGURES: Record<string, string[]> = {
  blob: [
    '....######....',
    '..##########..',
    '.#hh#######ss.',
    '.#h#WW##WW##s.',
    '####WW##WW##ss',
    '############ss',
    '######kk####ss',
    's##########sss',
    '.ss.ss..ss.ss.',
  ],
  ghost: [
    '....######....',
    '..#hh#######..',
    '.#h########ss.',
    '.##WW###WW##s.',
    '###WW###WW###s',
    '######kk#####s',
    '############ss',
    '############ss',
    '#.##.####.##.s',
  ],
  cat: [
    '.#.......#....',
    '.##.....##....',
    '.#h######s....',
    '.#WW###WW#....',
    '.#WW###WW#...#',
    '.####k###s..#.',
    '.##h#######s#.',
    '.#########ss..',
    '.#.#.....#.s..',
  ],
  bot: [
    '......h.......',
    '......#.......',
    '..#hh######s..',
    '..#WW####WW#..',
    '..#WW####WW#..',
    '..##kkkkkk#s..',
    '.#h#########s.',
    '.###########s.',
    '..##......#s..',
  ],
}
export const SHAPES = Object.keys(FIGURES)
export const FIGURE_W = 14
export const FIGURE_H = 9

/*
 * The blob family: an item with no shape of its own is a blob, and a blob gets a look of its own from its letter and
 * its value. The face (rows 3–6) is the same on all of them. The head is the first blob's dome, or a lower head with
 * something on top (horns, an antenna, a sprout, a tuft, ears); the feet and a few spots vary too. About a quarter
 * look like the first blob, and now and then one stands out: a crown, a gold antenna, one big eye.
 * A look is a name, `blob.<top>.<bottom>.<mark>`; plain `blob` is the first one.
 */
const DOME = ['....######....', '..##########..', '.#hh#######ss.']
const LOW = '..#hh######s..'
const TOPS: Record<string, string[]> = {
  dome: DOME,
  horns: ['.h..........s.', '..#........s..', LOW],
  antenna: ['......hh......', '.......s......', LOW],
  sprout: ['....hh.ss.....', '......#.......', LOW],
  tuft: ['....#.#.#.....', '.....#.#.#....', LOW],
  ears: ['..............', '.##........ss.', LOW],
  crown: ['...g..gg..g...', '...gggggggg...', LOW],
  star: ['......gg......', '.......s......', LOW],
}
const BOTTOMS: Record<string, string[]> = {
  drips: ['s##########sss', '.ss.ss..ss.ss.'],
  feet: ['s##########sss', '.sss......sss.'],
  round: ['.##########ss.', '..ssssssssss..'],
}
/** Cells drawn over the body: [x, y, ch]. */
const MARKS: Record<string, [number, number, string][]> = {
  none: [],
  spots: [[2, 6, 's'], [4, 7, 's'], [10, 6, 's'], [11, 3, 's']],
  cyclops: [[4, 3, '#'], [5, 3, 'W'], [6, 3, 'W'], [7, 3, 'W'], [8, 3, '#'], [9, 3, '#'],
    [4, 4, '#'], [5, 4, 'W'], [6, 4, 'W'], [7, 4, 'W'], [8, 4, '#'], [9, 4, '#']],
}

function blobRows(top: string, bottom: string, mark: string): string[] {
  const rows = [...(TOPS[top] ?? DOME), ...FIGURES.blob.slice(3, 7), ...(BOTTOMS[bottom] ?? BOTTOMS.drips)].map((r) => [...r])
  for (const [x, y, ch] of MARKS[mark] ?? []) rows[y][x] = ch
  return rows.map((r) => r.join(''))
}

/** A number from a text, the same every time (FNV-1a, then mixed). */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  return h >>> 0
}

function pick<T extends string>(n: number, weights: [T, number][]): T {
  const total = weights.reduce((sum, [, w]) => sum + w, 0)
  let at = n % total
  for (const [name, w] of weights) {
    if (at < w) return name
    at -= w
  }
  return weights[0][0]
}

/**
 * The look of a blob with no shape of its own, from what it is called and its value when it first shows (the stage
 * passes its colour instead when it has no value).
 */
export function blobLook(name: string, value: string): string {
  const h = hash(`${name}:${value}`)
  const rare = pick(h % 100, [['', 91], ['crown', 3], ['star', 3], ['cyclops', 3]])
  const top = rare === 'crown' || rare === 'star' ? rare
    : pick((h >>> 8) % 100, [['dome', 50], ['horns', 10], ['antenna', 10], ['sprout', 10], ['tuft', 10], ['ears', 10]])
  const bottom = pick((h >>> 16) % 100, [['drips', 60], ['feet', 20], ['round', 20]])
  const mark = rare === 'cyclops' ? 'cyclops' : pick((h >>> 24) % 100, [['none', 85], ['spots', 15]])
  return top === 'dome' && bottom === 'drips' && mark === 'none' ? 'blob' : `blob.${top}.${bottom}.${mark}`
}

function path(cells: number[][]): string {
  return cells.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')
}

function cellsOf(rows: string[], ch: string): number[][] {
  const cells: number[][] = []
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) cells.push([x, y]) }))
  return cells
}

function figureSvg(rows: string[]): string {
  const eyes = cellsOf(rows, 'W')
  const isEye = (x: number, y: number) => rows[y]?.[x] === 'W'
  const right = eyes.filter(([x, y]) => !isEye(x + 1, y))
  const down = eyes.filter(([x, y]) => !isEye(x, y + 1))
  const gold = cellsOf(rows, 'g')
  return `<svg class="blob" viewBox="0 0 ${FIGURE_W} ${FIGURE_H}" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">`
    + `<path class="b" d="${path(cellsOf(rows, '#'))}"/>`
    + `<path class="s" d="${path(cellsOf(rows, 's'))}"/>`
    + `<path class="h" d="${path(cellsOf(rows, 'h'))}"/>`
    + (gold.length ? `<path class="g" d="${path(gold)}"/>` : '')
    + `<path class="w" d="${path(eyes)}"/>`
    + `<path class="k" d="${path(cellsOf(rows, 'k'))}"/>`
    + `<path class="k look-right" d="${path(right)}"/>`
    + `<path class="k look-down" d="${path(down)}"/>`
    + '</svg>'
}

const SVGS = new Map(Object.entries(FIGURES).map(([name, rows]) => [name, figureSvg(rows)]))

/** The SVG for a shape name or a blob look; anything unknown is a blob. */
export function creatureSvg(shape: unknown): string {
  const name = typeof shape === 'string' ? shape : 'blob'
  let svg = SVGS.get(name)
  if (svg === undefined && /^blob\.\w+\.\w+\.\w+$/.test(name)) {
    const [, top, bottom, mark] = name.split('.')
    svg = figureSvg(blobRows(top, bottom, mark))
    SVGS.set(name, svg)
  }
  return svg ?? SVGS.get('blob')!
}
