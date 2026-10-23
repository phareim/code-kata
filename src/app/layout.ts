/*
 * The desk's layout, a per-browser convenience kept in localStorage (`code-kata:layout`), never on the account:
 * - every pane but the code folds to its bar (the chevron in the bar, or the title);
 * - on a wide screen the gaps are handles: the one between the columns sets their widths, the ones between panes
 *   their heights, and a double click on a handle puts that part back as it was;
 * - the code can fill the desk for a while (the button by «Kjør», a double click on the code's bar, Esc to leave).
 * Sizes are CSS custom properties (`--side`/`--work` on the desk, `--grow` on a pane), so the stylesheet decides
 * when they apply: only wide, and not while the code fills the desk.
 */

const KEY = 'code-kata:layout'
const WIDE = window.matchMedia('(min-width: 900px)')
// The columns' least widths; the same as the desk's grid in style.css.
const MIN_SIDE = 260
const MIN_WORK = 360
// The least a pane can be dragged to when the stylesheet gives it no min-height of its own.
const MIN_PANE = 96

type Saved = {
  /** The side column's share of the two columns' width. */
  side?: number
  /** Per column, each open pane's height when last dragged: the panes share the column in these proportions. */
  grow?: Record<string, Record<string, number>>
  folded?: string[]
}

function read(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

function write(saved: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // Private mode or blocked storage: the layout lasts as long as the tab.
  }
}

export type Layout = {
  readonly isMax: boolean
  setMax(on: boolean): void
}

export function initLayout(desk: HTMLElement, onMax: (on: boolean) => void): Layout {
  const saved = read()
  const panes = [...desk.querySelectorAll<HTMLElement>('.pane[data-pane]')]
  const columns = [...desk.querySelectorAll<HTMLElement>('.col[data-col]')]
  const sideColumn = desk.querySelector<HTMLElement>('.col--side')!
  const colHandle = desk.querySelector<HTMLElement>('.split--col')!
  const rowHandles = [...desk.querySelectorAll<HTMLElement>('.split--row')]
  const maxButton = desk.querySelector<HTMLButtonElement>('#maximize')!
  const name = (pane: HTMLElement) => pane.dataset.pane!
  const isFolded = (pane: HTMLElement) => pane.classList.contains('is-folded')
  const openPanes = (col: HTMLElement) =>
    [...col.querySelectorAll<HTMLElement>(':scope > .pane')].filter((pane) => !isFolded(pane))

  function applySide(): void {
    const side = saved.side
    if (typeof side === 'number' && side > 0 && side < 1) {
      desk.style.setProperty('--side', `${(side * 100).toFixed(2)}fr`)
      desk.style.setProperty('--work', `${((1 - side) * 100).toFixed(2)}fr`)
    } else {
      desk.style.removeProperty('--side')
      desk.style.removeProperty('--work')
    }
  }

  function applyRows(): void {
    for (const col of columns) {
      const grow = saved.grow?.[col.dataset.col!]
      col.classList.toggle('is-sized', !!grow)
      const open = openPanes(col)
      const known = open.map((pane) => grow?.[name(pane)]).filter((g): g is number => typeof g === 'number' && g > 0)
      // A pane unfolded into a sized column that never measured it gets an even share.
      const even = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1
      for (const pane of col.querySelectorAll<HTMLElement>(':scope > .pane')) {
        const g = grow?.[name(pane)]
        if (grow) pane.style.setProperty('--grow', String(typeof g === 'number' && g > 0 ? g : even))
        else pane.style.removeProperty('--grow')
      }
    }
    // A handle with no open pane on one side has nothing to resize.
    for (const handle of rowHandles) handle.classList.toggle('is-inert', !neighbours(handle))
  }

  function applyFolds(): void {
    const folded = new Set(saved.folded ?? [])
    for (const pane of panes) {
      const fold = pane.querySelector<HTMLButtonElement>('.fold')
      if (!fold) continue
      const on = folded.has(name(pane))
      pane.classList.toggle('is-folded', on)
      fold.setAttribute('aria-expanded', String(!on))
      fold.title = on ? fold.dataset.show! : fold.dataset.hide!
    }
    applyRows()
  }

  /** The nearest open pane above the handle and the nearest below, or null when either side has none. */
  function neighbours(handle: HTMLElement): [HTMLElement, HTMLElement] | null {
    const find = (step: 'previousElementSibling' | 'nextElementSibling') => {
      for (let node = handle[step]; node; node = node[step]) {
        if (node instanceof HTMLElement && node.matches('.pane') && !isFolded(node)) return node
      }
      return null
    }
    const above = find('previousElementSibling')
    const below = find('nextElementSibling')
    return above && below ? [above, below] : null
  }

  const minHeight = (pane: HTMLElement) => Math.max(MIN_PANE, parseFloat(getComputedStyle(pane).minHeight) || 0)

  /** Follows a drag from pointerdown until the pointer lets go; `done` saves. */
  function drag(handle: HTMLElement, down: PointerEvent, move: (event: PointerEvent) => void, done: () => void): void {
    down.preventDefault()
    handle.setPointerCapture(down.pointerId)
    document.body.classList.add('is-resizing')
    handle.classList.add('is-dragging')
    const end = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      document.body.classList.remove('is-resizing')
      handle.classList.remove('is-dragging')
      done()
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }

  colHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !WIDE.matches || layout.isMax) return
    const total = desk.clientWidth - colHandle.offsetWidth
    const from = sideColumn.getBoundingClientRect().width
    const x0 = event.clientX
    let moved = false
    drag(colHandle, event, (e) => {
      moved = true
      const width = Math.min(Math.max(from + e.clientX - x0, MIN_SIDE), total - MIN_WORK)
      saved.side = width / total
      applySide()
    }, () => { if (moved) write(saved) })
  })
  colHandle.addEventListener('dblclick', () => {
    delete saved.side
    applySide()
    write(saved)
  })

  for (const handle of rowHandles) {
    const col = handle.parentElement!
    const key = col.dataset.col!
    handle.addEventListener('pointerdown', (event) => {
      const pair = neighbours(handle)
      if (event.button !== 0 || !WIDE.matches || !pair) return
      const [above, below] = pair
      const y0 = event.clientY
      let grow: Record<string, number> | null = null
      let a0 = 0
      let sum = 0
      drag(handle, event, (e) => {
        // On the first move the heights as they are become the sizes, so a click alone changes nothing and the
        // drag doesn't jump.
        if (!grow) {
          grow = { ...saved.grow?.[key] }
          for (const pane of openPanes(col)) grow[name(pane)] = pane.getBoundingClientRect().height
          saved.grow = { ...saved.grow, [key]: grow }
          a0 = grow[name(above)]
          sum = a0 + grow[name(below)]
        }
        const lo = minHeight(above)
        const a = Math.min(Math.max(a0 + e.clientY - y0, lo), Math.max(lo, sum - minHeight(below)))
        grow[name(above)] = a
        grow[name(below)] = sum - a
        applyRows()
      }, () => { if (grow) write(saved) })
    })
    handle.addEventListener('dblclick', () => {
      if (saved.grow) delete saved.grow[key]
      applyRows()
      write(saved)
    })
  }

  for (const pane of panes) {
    pane.querySelector('.fold')?.addEventListener('click', () => {
      const folded = new Set(saved.folded ?? [])
      if (folded.has(name(pane))) folded.delete(name(pane))
      else folded.add(name(pane))
      saved.folded = [...folded]
      applyFolds()
      write(saved)
    })
  }

  const layout: Layout = {
    get isMax() {
      return desk.classList.contains('is-max')
    },
    setMax(on: boolean) {
      if (on === layout.isMax) return
      desk.classList.toggle('is-max', on)
      maxButton.setAttribute('aria-pressed', String(on))
      maxButton.title = on ? 'Vis alle vinduene igjen (Esc)' : 'Forstørr koden'
      maxButton.setAttribute('aria-label', on ? 'Vis alle vinduene igjen' : 'Forstørr koden')
      onMax(on)
    },
  }
  maxButton.addEventListener('click', () => layout.setMax(!layout.isMax))
  desk.querySelector('.editor-pane > .pane-bar')!.addEventListener('dblclick', (event) => {
    if (!(event.target as Element).closest('button')) layout.setMax(!layout.isMax)
  })

  applySide()
  applyFolds()
  return layout
}
