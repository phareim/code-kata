/*
 * The creatures the items are drawn as: 14×9 pixel figures in the item's colour (--c), drawn as crisp SVG rects.
 *   # body   s shade   h highlight   W eye   k mouth
 * An item's `shape` picks the figure (blob when it has none). Pupils are drawn on top: looking right along the
 * pointers, or down when the item is loose; they sit in each eye's right column or bottom row.
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
  return `<svg class="blob" viewBox="0 0 ${FIGURE_W} ${FIGURE_H}" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">`
    + `<path class="b" d="${path(cellsOf(rows, '#'))}"/>`
    + `<path class="s" d="${path(cellsOf(rows, 's'))}"/>`
    + `<path class="h" d="${path(cellsOf(rows, 'h'))}"/>`
    + `<path class="w" d="${path(eyes)}"/>`
    + `<path class="k" d="${path(cellsOf(rows, 'k'))}"/>`
    + `<path class="k look-right" d="${path(right)}"/>`
    + `<path class="k look-down" d="${path(down)}"/>`
    + '</svg>'
}

const SVGS = new Map(Object.entries(FIGURES).map(([name, rows]) => [name, figureSvg(rows)]))

/** The SVG for a shape name; anything unknown is a blob. */
export function creatureSvg(shape: unknown): string {
  return SVGS.get(typeof shape === 'string' ? shape : 'blob') ?? SVGS.get('blob')!
}
