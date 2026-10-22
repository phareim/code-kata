/*
 * The row above the editor: HEAD → the items in list order → how the list ends, then the loose items.
 * Tokens are kept per label between renders, so when the pointers change the order each item glides from where it
 * was to where it is now (FLIP: measure, move in the DOM, animate the difference).
 */
import { blobSvg } from './blob'
import { itemColor, itemValue, label, walk, type End, type World } from './world'

const tokens = new Map<string, HTMLElement>()

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const arrow = () => el('span', 'arrow px', '→')

function token(world: World, slot: number, loose: boolean, animate: boolean): HTMLElement {
  const name = label(slot)
  const item = world.items[slot]
  let node = tokens.get(name)
  if (!node) {
    node = el('span', 'token')
    node.dataset.label = name
    node.style.setProperty('--delay', `${-(slot % 4) * 0.45}s`)
    node.append(el('span', 'token-label px', name), el('span', 'token-body'), el('span', 'token-value px'))
    ;(node.children[1] as HTMLElement).innerHTML = blobSvg()
    tokens.set(name, node)
  }
  const color = itemColor(item)
  node.style.setProperty('--c', color ?? '#5a5285')
  node.classList.toggle('is-loose', loose)
  node.classList.toggle('no-color', color === null)

  const value = itemValue(item)
  const valueNode = node.children[2] as HTMLElement
  valueNode.textContent = value
  valueNode.classList.toggle('is-long', value.length > 4)
  if (animate && node.dataset.value !== undefined && node.dataset.value !== value && !reducedMotion()) {
    valueNode.animate([{ transform: 'scale(1.6)' }, { transform: 'none' }], { duration: 260, easing: 'steps(4)' })
  }
  node.dataset.value = value
  node.title = `${name}: ${value}${loose ? ' (ikke i lista)' : ''}`
  return node
}

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

/** Draws the row. `animate`: glide items from their last place; false starts over (a new set of items). */
export function renderRow(row: HTMLElement, world: World, animate: boolean): void {
  if (!animate) tokens.clear()
  const motion = animate && !reducedMotion()
  const before = new Map<string, DOMRect>()
  if (motion) for (const [name, node] of tokens) if (node.isConnected) before.set(name, node.getBoundingClientRect())

  // Each arrow goes with what it points at, so a wrapped row starts a line with "→ D" and NULL keeps its arrow.
  const { chain, end, loose } = walk(world)
  const groups: HTMLElement[] = [el('span', 'head-tag px', 'head')]
  const pointer = (target: HTMLElement) => {
    const link = el('span', 'link')
    link.append(arrow(), target)
    groups.push(link)
  }
  for (const slot of chain) pointer(token(world, slot, false, animate))
  pointer(ending(end))
  if (loose.length) {
    const rest = el('span', 'loose')
    rest.append(el('span', 'loose-tag px', 'løse'), ...loose.map((slot) => token(world, slot, true, animate)))
    groups.push(rest)
  }
  row.replaceChildren(...groups)

  const shown = new Set([...chain, ...loose].map(label))
  for (const name of [...tokens.keys()]) if (!shown.has(name)) tokens.delete(name)
  if (!motion) return
  for (const [name, node] of tokens) {
    const old = before.get(name)
    if (!old) {
      node.animate([{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'ease-out' })
      continue
    }
    const now = node.getBoundingClientRect()
    const dx = old.left - now.left
    const dy = old.top - now.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
    node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: 520,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    })
  }
}
