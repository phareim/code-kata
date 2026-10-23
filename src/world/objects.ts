/*
 * The objects pane: the roots, then the items in memory order (A, B, C …), written the way the code sees them.
 *   head = D
 *   A = Monster { value: 7, color: 'pink', next: C }
 * A pointer reads as the item's letter; an item no root reaches gets `// løs`.
 */
import { itemColor, label, reachable, type Prop, type World } from './world'

function span(className: string, text: string): HTMLSpanElement {
  const node = document.createElement('span')
  node.className = className
  node.textContent = text
  return node
}

function value(p: Prop, color: string | null): HTMLSpanElement {
  if (p.ref !== undefined) {
    const node = span('o-ref', label(p.ref))
    node.dataset.label = label(p.ref)
    return node
  }
  if (p.list) {
    const node = span('o-list', '[')
    p.list.forEach((q, i) => node.append(span('o-punct', i ? ', ' : ''), value(q, null)))
    node.append(span('o-punct', ']'))
    return node
  }
  if (p.lossy) {
    const node = span('o-lossy', p.text)
    node.title = 'Kan ikke tas med til neste kjøring; den får teksten.'
    return node
  }
  if (p.key === 'color' && color) {
    const node = span('o-color', p.text)
    node.style.color = color
    return node
  }
  const raw = p.raw
  const kind = typeof raw === 'number' || typeof raw === 'bigint' || typeof raw === 'boolean' ? 'o-num'
    : typeof raw === 'string' ? 'o-str'
    : raw === null || raw === undefined ? 'o-nil'
    : 'o-obj'
  return span(kind, p.text)
}

export function renderObjects(pane: HTMLElement, world: World): void {
  const reached = reachable(world)
  const lines: HTMLElement[] = []

  for (const p of world.roots) {
    const line = document.createElement('div')
    line.className = 'o-line'
    line.append(span('o-name', p.key), span('o-punct', ' = '), value(p, null))
    lines.push(line)
  }

  world.items.forEach((item, slot) => {
    const name = label(slot)
    const line = document.createElement('div')
    line.className = 'o-line'
    line.dataset.label = name
    line.append(span('o-name', name), span('o-punct', ' = '))
    if (item.cls && item.cls !== 'Object') line.append(span('o-class', `${item.cls} `))
    line.append(span('o-punct', '{'))
    const color = itemColor(item)
    item.props.forEach((p, i) => {
      line.append(span('o-punct', i ? ', ' : ' '), span('o-key', p.key), span('o-punct', ': '), value(p, color))
    })
    line.append(span('o-punct', item.props.length ? ' }' : '}'))
    if (!reached.has(slot)) line.append(span('o-comment', '  // løs'))
    lines.push(line)
  })

  if (world.truncated) {
    const note = document.createElement('div')
    note.className = 'o-line'
    note.append(span('o-comment', '// flere monstre enn dette vises ikke'))
    lines.push(note)
  }
  pane.replaceChildren(...lines)
}
