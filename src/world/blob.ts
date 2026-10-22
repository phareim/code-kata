/*
 * The item creature: a 14×9 pixel blob in the item's colour (--c), drawn as crisp SVG rects.
 *   # body   s shade   h highlight   W eye   k mouth
 * Pupils are drawn on top: looking right at the next item, or down when the item is loose.
 */
const BLOB = [
  '....######....',
  '..##########..',
  '.#hh#######ss.',
  '.#h#WW##WW##s.',
  '####WW##WW##ss',
  '############ss',
  '######kk####ss',
  's##########sss',
  '.ss.ss..ss.ss.',
]
export const BLOB_W = 14
export const BLOB_H = BLOB.length

const LOOK_RIGHT = [[5, 3], [5, 4], [9, 3], [9, 4]]
const LOOK_DOWN = [[4, 4], [5, 4], [8, 4], [9, 4]]

function path(cells: number[][]): string {
  return cells.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')
}

function cellsOf(ch: string): number[][] {
  const cells: number[][] = []
  BLOB.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) cells.push([x, y]) }))
  return cells
}

const SVG = `<svg class="blob" viewBox="0 0 ${BLOB_W} ${BLOB_H}" shape-rendering="crispEdges" aria-hidden="true">`
  + `<path class="b" d="${path(cellsOf('#'))}"/>`
  + `<path class="s" d="${path(cellsOf('s'))}"/>`
  + `<path class="h" d="${path(cellsOf('h'))}"/>`
  + `<path class="w" d="${path(cellsOf('W'))}"/>`
  + `<path class="k" d="${path(cellsOf('k'))}"/>`
  + `<path class="k look-right" d="${path(LOOK_RIGHT)}"/>`
  + `<path class="k look-down" d="${path(LOOK_DOWN)}"/>`
  + '</svg>'

export function blobSvg(): string {
  return SVG
}
