/*
 * The stage: the items as the roots hold them. Each root gets a panel, drawn by its shape (or by the task's views):
 *   list    head → A → C → null: a root that points at an item, followed along next (⇄ where prev points back)
 *   array   items = [A, C, B] with the index under each; a stack stands up (top first), a queue has a front
 *   pegs    an array of arrays, such as Hanoi's three pegs, each drawn bottom-up with the items as discs
 *   tree    root, with left and right
 *   graph   an array of items whose `neighbors` are the edges, around a circle
 *   grid    an array of arrays of values: a colour name fills its cell, '#' is a wall
 *   value   anything else: name = value
 * Items no panel shows come last, dimmed when no root reaches them. An item appears once: a second panel that holds
 * it shows its letter. There is one token per item across the panels, so an item glides from one place to the next,
 * even from one panel to another (FLIP: measure, move in the DOM, animate the difference).
 */
import { creatureSvg } from './creatures'
import { COLORS, itemColor, itemValue, label, prop, reachable, walk, type End, type Prop, type World } from '../world/world'

export type ViewKind = 'list' | 'array' | 'stack' | 'queue' | 'pegs' | 'tree' | 'graph' | 'grid' | 'value'

export interface RenderOptions {
  /** Glide from the last render; false starts over (a new set of items, another task). */
  animate: boolean
  /** How long a glide takes, in ms; shorter while frames play. */
  duration?: number
  /** A view for a root whose shape doesn't say (a graph's `nodes`, a pointer that is only a name). */
  views?: Record<string, ViewKind>
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const SVG_NS = 'http://www.w3.org/2000/svg'
function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  return node
}

/** The view a root gets from its shape. */
export function kindOf(p: Prop): ViewKind {
  if (p.key === 'root') return 'tree'
  if (p.key === 'stack') return 'stack'
  if (p.key === 'queue') return 'queue'
  if (p.list) return p.list.some((q) => q.list || Array.isArray(q.raw)) ? 'pegs' : 'array'
  if (Array.isArray(p.raw)) return p.raw.length && p.raw.every(Array.isArray) ? 'grid' : 'array'
  if (p.ref !== undefined || p.key === 'head') return 'list'
  return 'value'
}

interface Panel {
  node: HTMLElement
  body: HTMLElement
}

type Layout = () => void

export class Stage {
  private tokens = new Map<string, HTMLElement>()
  private panels = new Map<string, Panel>()
  private claimed = new Set<number>()
  private world: World | null = null

  constructor(private readonly el: HTMLElement) {}

  render(world: World, opts: RenderOptions): void {
    if (!opts.animate) {
      this.tokens.clear()
      this.panels.clear()
    }
    const motion = opts.animate && !reducedMotion()
    const before = new Map<string, DOMRect>()
    if (motion) for (const [name, node] of this.tokens) if (node.isConnected) before.set(name, node.getBoundingClientRect())

    this.world = world
    this.claimed = new Set()
    const used = new Map<string, Panel>()
    const layouts: Layout[] = []
    for (const p of world.roots) {
      const kind = opts.views?.[p.key] ?? kindOf(p)
      const panel = this.panel(used, `${p.key}:${kind}`, p.key, kind)
      const layout = DRAW[kind](this, panel.body, world, p)
      if (layout) layouts.push(layout)
    }
    const reach = reachable(world)
    const rest = world.items.map((_, i) => i).filter((i) => !this.claimed.has(i))
    if (rest.length) {
      const panel = this.panel(used, 'rest', 'løse', 'rest')
      panel.node.querySelector('.panel-tag')!.textContent = rest.some((i) => reach.has(i)) ? 'andre' : 'løse'
      panel.body.replaceChildren(...rest.map((i) => this.claim(i, { loose: !reach.has(i) })))
    }
    this.panels = used
    this.el.replaceChildren(...[...used.values()].map((p) => p.node))
    for (const layout of layouts) layout()

    const marks = new Set((world.marks ?? []).map(label))
    for (const node of this.el.querySelectorAll<HTMLElement>('[data-label]')) {
      node.classList.toggle('is-marked', marks.has(node.dataset.label!))
    }
    const shown = new Set([...this.claimed].map(label))
    for (const name of [...this.tokens.keys()]) if (!shown.has(name)) this.tokens.delete(name)
    if (motion) this.flip(before, opts.duration ?? 520)
  }

  private panel(used: Map<string, Panel>, key: string, name: string, kind: string): Panel {
    let panel = this.panels.get(key)
    if (!panel) {
      const node = el('section', `panel panel--${kind}`)
      node.append(el('span', 'panel-tag px', name), el('div', 'panel-body'))
      panel = { node, body: node.lastElementChild as HTMLElement }
    }
    used.set(key, panel)
    return panel
  }

  /** The item's token, the first time a render asks for it; its letter after that. */
  claim(slot: number, opts: { loose?: boolean; disc?: boolean } = {}): HTMLElement {
    const name = label(slot)
    if (this.claimed.has(slot)) {
      const chip = el('span', 'ref-chip px', name)
      chip.dataset.label = name
      chip.title = `${name} står et annet sted på scenen`
      return chip
    }
    this.claimed.add(slot)
    const item = this.world!.items[slot]
    let node = this.tokens.get(name)
    if (!node) {
      node = el('span', 'token')
      node.dataset.label = name
      node.style.setProperty('--delay', `${-(slot % 4) * 0.45}s`)
      node.append(el('span', 'token-label px', name), el('span', 'token-body'), el('span', 'token-value px'))
      this.tokens.set(name, node)
    }
    const shape = prop(item, 'shape')?.raw
    const shapeName = typeof shape === 'string' ? shape : 'blob'
    if (node.dataset.shape !== shapeName) {
      node.dataset.shape = shapeName
      ;(node.children[1] as HTMLElement).innerHTML = creatureSvg(shapeName)
    }
    const color = itemColor(item)
    node.style.setProperty('--c', color ?? '#5a5285')
    // Tree and graph place their tokens themselves; anywhere else a token flows with the panel.
    node.classList.remove('is-placed')
    node.style.left = ''
    node.style.top = ''
    node.classList.toggle('is-loose', !!opts.loose)
    node.classList.toggle('is-disc', !!opts.disc)
    node.classList.toggle('no-color', color === null)
    const value = itemValue(item)
    const raw = prop(item, 'value')?.raw
    node.style.setProperty('--w', String(typeof raw === 'number' && raw > 0 ? Math.min(raw, 12) : 3))

    const valueNode = node.children[2] as HTMLElement
    valueNode.textContent = value
    valueNode.classList.toggle('is-long', value.length > 4)
    if (node.isConnected && node.dataset.value !== undefined && node.dataset.value !== value && !reducedMotion()) {
      valueNode.animate([{ transform: 'scale(1.6)' }, { transform: 'none' }], { duration: 260, easing: 'steps(4)' })
    }
    node.dataset.value = value
    node.title = `${name}: ${value}${opts.loose ? ' (ingen peker hit)' : ''}`
    return node
  }

  /** Every token glides from where it was; one that travels far hops on the way, a new one pops in. */
  private flip(before: Map<string, DOMRect>, duration: number): void {
    for (const [name, node] of this.tokens) {
      if (!node.isConnected) continue
      const old = before.get(name)
      if (!old) {
        node.animate([{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'ease-out' })
        continue
      }
      const now = node.getBoundingClientRect()
      const dx = old.left - now.left
      const dy = old.top - now.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      const lift = Math.min(32, Math.hypot(dx, dy) / 5)
      node.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px)`, offset: 0.5 },
        { transform: 'none' },
      ], { duration, easing: 'cubic-bezier(0.3, 0.6, 0.3, 1)' })
    }
  }

  /** A wave of jumps across the stage: the task is solved. */
  cheer(): void {
    if (reducedMotion()) return
    const blobs = [...this.el.querySelectorAll<HTMLElement>('.token .blob, .grid-cell.is-fill')]
    blobs.forEach((node, i) => {
      node.animate([
        { transform: 'none' },
        { transform: 'translateY(-14px) scale(1.08, 0.94)', offset: 0.35 },
        { transform: 'translateY(2px) scale(0.94, 1.06)', offset: 0.7 },
        { transform: 'none' },
      ], { duration: 560, delay: i * 55, iterations: 2, easing: 'ease-out' })
    })
  }

  /** A head shake: not solved yet. */
  shake(): void {
    if (reducedMotion()) return
    for (const node of this.el.querySelectorAll<HTMLElement>('.token .blob')) {
      node.animate([
        { transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' },
        { transform: 'translateX(-3px)' }, { transform: 'translateX(2px)' }, { transform: 'none' },
      ], { duration: 420, easing: 'steps(6)' })
    }
  }
}

const arrow = (text = '→') => el('span', 'arrow px', text)

function ending(end: End): HTMLElement {
  if (end.kind === 'null') return el('span', 'end px', end.text)
  if (end.kind === 'loop') {
    const node = el('span', 'end end--loop px', `til ${label(end.to)}`)
    node.dataset.label = label(end.to)
    node.title = `next peker tilbake på ${label(end.to)}: lista går i ring`
    return node
  }
  const node = el('span', 'end end--bad px', '?')
  node.title = `next er ${end.text}, ikke en ting`
  return node
}

/** A value that is not an item, in a box: an array's number, a stack's string. */
function valueBox(p: Prop): HTMLElement {
  const text = typeof p.raw === 'string' ? p.raw : p.text
  const node = el('span', 'value-box px', text.length > 6 ? `${text.slice(0, 5)}…` : text)
  node.title = p.text
  if (typeof p.raw === 'string' && p.raw in COLORS) node.style.setProperty('--c', COLORS[p.raw])
  return node
}

function element(stage: Stage, p: Prop, disc = false): HTMLElement {
  if (p.ref !== undefined) return stage.claim(p.ref, { disc })
  if (p.list) return el('span', 'value-box px', `[${p.list.length}]`)
  return valueBox(p)
}

/** The props an array root holds: its list, or its raw elements. */
function elements(p: Prop): Prop[] | null {
  if (p.list) return p.list
  if (Array.isArray(p.raw)) return p.raw.map((v, i) => ({ key: String(i), raw: v, text: typeof v === 'string' ? `'${v}'` : String(v) }))
  return null
}

type Draw = (stage: Stage, body: HTMLElement, world: World, p: Prop) => Layout | void

function drawList(stage: Stage, body: HTMLElement, world: World, p: Prop): void {
  const { chain, end } = walk(world, p)
  const groups: HTMLElement[] = []
  let prevSlot: number | null = null
  for (const slot of chain) {
    const back = prop(world.items[slot], 'prev')
    const link = el('span', 'link')
    link.append(arrow(prevSlot !== null && back?.ref === prevSlot ? '⇄' : '→'), stage.claim(slot))
    groups.push(link)
    prevSlot = slot
  }
  const last = el('span', 'link')
  last.append(arrow(), ending(end))
  groups.push(last)
  body.replaceChildren(...groups)
}

function drawArray(stage: Stage, body: HTMLElement, _world: World, p: Prop): void {
  const list = elements(p)
  if (!list) return drawValue(stage, body, _world, p)
  const cells = list.map((q, i) => {
    const cell = el('span', 'cell')
    cell.append(element(stage, q), el('span', 'cell-index px', String(i)))
    return cell
  })
  if (!cells.length) cells.push(el('span', 'empty px', 'tom'))
  body.replaceChildren(el('span', 'bracket px', '['), ...cells, el('span', 'bracket px', ']'))
}

function drawPegs(stage: Stage, body: HTMLElement, _world: World, p: Prop): void {
  const pegs = elements(p) ?? []
  body.replaceChildren(...pegs.map((q, i) => {
    const peg = el('div', 'peg')
    const stack = el('div', 'peg-stack')
    stack.append(...(elements(q) ?? [q]).map((d) => element(stage, d, true)))
    peg.append(el('div', 'peg-pole'), stack, el('span', 'cell-index px', String(i)))
    return peg
  }))
}

function drawValue(stage: Stage, body: HTMLElement, _world: World, p: Prop): void {
  if (p.ref !== undefined) {
    body.replaceChildren(stage.claim(p.ref))
    return
  }
  if (p.list) {
    body.replaceChildren(el('span', 'bracket px', '['), ...p.list.map((q) => element(stage, q)), el('span', 'bracket px', ']'))
    return
  }
  const node = el('span', 'value-text', p.text)
  body.replaceChildren(el('span', 'arrow px', '='), node)
}

/** Center of a token's creature, in the body's coordinates. */
function center(token: HTMLElement): [number, number] {
  const blob = token.querySelector<HTMLElement>('.token-body') ?? token
  return [token.offsetLeft + blob.offsetLeft + blob.offsetWidth / 2, token.offsetTop + blob.offsetTop + blob.offsetHeight / 2]
}

function place(token: HTMLElement, x: number, y: number): void {
  token.style.left = `${Math.round(x - token.offsetWidth / 2)}px`
  token.style.top = `${Math.round(y)}px`
}

function drawTree(stage: Stage, body: HTMLElement, world: World, p: Prop): Layout | void {
  const nodes: { slot: number; depth: number; x: number; token: HTMLElement }[] = []
  const edges: [number, number][] = []
  const seen = new Set<number>()
  let order = 0
  const visit = (q: Prop | undefined, depth: number, parent: number | null) => {
    if (!q || q.ref === undefined || seen.has(q.ref) || seen.size >= 64) return
    const slot = q.ref
    seen.add(slot)
    if (parent !== null) edges.push([parent, slot])
    const item = world.items[slot]
    visit(prop(item, 'left'), depth + 1, slot)
    nodes.push({ slot, depth, x: order++, token: stage.claim(slot) })
    visit(prop(item, 'right'), depth + 1, slot)
  }
  visit(p, 0, null)
  if (!nodes.length) {
    body.replaceChildren(el('span', 'empty px', p.ref === undefined ? p.text : 'tomt'))
    return
  }
  const svg = svgEl('svg', { class: 'edges', 'aria-hidden': 'true' })
  body.replaceChildren(svg, ...nodes.map((n) => n.token))
  for (const n of nodes) n.token.classList.add('is-placed')
  return () => {
    const width = body.clientWidth
    const depth = Math.max(...nodes.map((n) => n.depth))
    const cell = Math.min(76, width / nodes.length)
    const level = 74
    body.style.height = `${(depth + 1) * level}px`
    const left = (width - cell * nodes.length) / 2
    for (const n of nodes) place(n.token, left + (n.x + 0.5) * cell, n.depth * level + 4)
    drawEdges(svg, body, nodes, edges, false)
  }
}

function drawGraph(stage: Stage, body: HTMLElement, world: World, p: Prop): Layout | void {
  const list = (p.list ?? []).filter((q) => q.ref !== undefined)
  const slots = [...new Set(list.map((q) => q.ref!))]
  const nodes = slots.map((slot) => ({ slot, token: stage.claim(slot) }))
  const inGraph = new Set(slots)
  const edges: [number, number][] = []
  const directed = new Set<string>()
  for (const a of slots) {
    for (const q of prop(world.items[a], 'neighbors')?.list ?? []) {
      if (q.ref === undefined || !inGraph.has(q.ref)) continue
      edges.push([a, q.ref])
      directed.add(`${a}>${q.ref}`)
    }
  }
  // One line per pair; an arrow where only one of the two points at the other.
  const pairs: [number, number][] = []
  const oneWay = new Set<string>()
  for (const [a, b] of edges) {
    if (directed.has(`${b}>${a}`)) {
      if (a < b) pairs.push([a, b])
    } else {
      pairs.push([a, b])
      oneWay.add(`${a}>${b}`)
    }
  }
  const svg = svgEl('svg', { class: 'edges', 'aria-hidden': 'true' })
  body.replaceChildren(svg, ...nodes.map((n) => n.token))
  for (const n of nodes) n.token.classList.add('is-placed')
  return () => {
    const width = body.clientWidth
    const height = Math.round(Math.min(340, Math.max(240, width * 0.5)))
    body.style.height = `${height}px`
    const r = Math.min(width / 2 - 44, height / 2 - 48)
    nodes.forEach((n, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, nodes.length)
      place(n.token, width / 2 + r * Math.cos(angle), height / 2 + r * Math.sin(angle) - 40)
    })
    drawEdges(svg, body, nodes, pairs, oneWay)
  }
}

function drawEdges(
  svg: SVGElement,
  body: HTMLElement,
  nodes: { slot: number; token: HTMLElement }[],
  edges: [number, number][],
  oneWay: Set<string> | false,
): void {
  svg.setAttribute('width', String(body.clientWidth))
  svg.setAttribute('height', String(body.clientHeight))
  const at = new Map(nodes.map((n) => [n.slot, center(n.token)]))
  const lines: SVGElement[] = []
  for (const [a, b] of edges) {
    const [x1, y1] = at.get(a)!
    const [x2, y2] = at.get(b)!
    lines.push(svgEl('line', { x1, y1, x2, y2, class: 'edge' }))
    if (oneWay && oneWay.has(`${a}>${b}`)) {
      // An arrowhead two thirds of the way along.
      const len = Math.hypot(x2 - x1, y2 - y1) || 1
      const ux = (x2 - x1) / len
      const uy = (y2 - y1) / len
      const tx = x1 + (x2 - x1) * 0.66
      const ty = y1 + (y2 - y1) * 0.66
      const pts = [[tx + ux * 7, ty + uy * 7], [tx - uy * 6, ty + ux * 6], [tx + uy * 6, ty - ux * 6]]
      lines.push(svgEl('polygon', { points: pts.map((pt) => pt.join(',')).join(' '), class: 'edge-head' }))
    }
  }
  svg.replaceChildren(...lines)
}

function drawGrid(_stage: Stage, body: HTMLElement, _world: World, p: Prop): void {
  const rows = (p.raw as unknown[][]).slice(0, 40).map((row) => (Array.isArray(row) ? row.slice(0, 40) : []))
  const cols = Math.max(1, ...rows.map((r) => r.length))
  let grid = body.firstElementChild as HTMLElement | null
  if (!grid || !grid.classList.contains('grid')) {
    grid = el('div', 'grid')
    body.replaceChildren(grid)
  }
  grid.style.setProperty('--cols', String(cols))
  const cells = [...grid.children] as HTMLElement[]
  const want = rows.length * cols
  while (cells.length < want) {
    const cell = el('span', 'grid-cell')
    grid.append(cell)
    cells.push(cell)
  }
  while (cells.length > want) cells.pop()!.remove()
  rows.forEach((row, r) => {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c]
      const v = row[c]
      const color = typeof v === 'string' ? COLORS[v] ?? null : null
      cell.className = 'grid-cell'
      cell.textContent = ''
      cell.style.removeProperty('--c')
      if (color) {
        cell.classList.add('is-fill')
        cell.style.setProperty('--c', color)
      } else if (v === '#') {
        cell.classList.add('is-wall')
      } else if (v === undefined || v === null || v === '.' || v === ' ' || v === '') {
        cell.classList.add('is-empty')
      } else {
        cell.textContent = String(v).slice(0, 2)
      }
      cell.title = `[${r}][${c}] = ${typeof v === 'string' ? `'${v}'` : String(v)}`
    }
  })
}

const DRAW: Record<ViewKind, Draw> = {
  list: drawList,
  array: drawArray,
  stack: drawArray,
  queue: drawArray,
  pegs: drawPegs,
  tree: drawTree,
  graph: drawGraph,
  grid: drawGrid,
  value: drawValue,
}
