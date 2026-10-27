/*
 * The editor's right-click menu and the refactorings behind it, with VS Code's shortcuts where the browser leaves
 * them free. A touch screen keeps the browser's own menu (copy, paste, select), which is what a long press is for.
 * The menu, the rename box and a notice are fixed to the page, outside the editor, so a pane's overflow can't clip them.
 */
import { copyLineDown, deleteLine, moveLineDown, moveLineUp, selectAll, toggleComment } from '@codemirror/commands'
import { syntaxTree } from '@codemirror/language'
import { selectNextOccurrence, selectSelectionMatches } from '@codemirror/search'
import { EditorSelection } from '@codemirror/state'
import { type Command, EditorView, type KeyBinding } from '@codemirror/view'
import { checkName, definitionOf, extractConstant, formatChanges, planRename, renameChanges, targetAt } from './refactor'

// The refactorings read JavaScript's tree; in Java (Lezer's tree starts at Program) only the line commands apply.
const inJavaScript = (view: EditorView) => syntaxTree(view.state).topNode.name !== 'Program'
const JS_ONLY = 'Det finnes bare for JavaScript ennå.'

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** A CodeMirror key name as VS Code shows it: Ctrl+Shift+K, or ⇧⌘K on a Mac. */
export function keyLabel(key: string): string {
  const parts = key.split('-')
  const last = parts.pop()!
  const name = ({ ArrowUp: '↑', ArrowDown: '↓' } as Record<string, string>)[last] ?? last.toUpperCase()
  if (MAC) {
    const order: [string, string][] = [['Ctrl', '⌃'], ['Alt', '⌥'], ['Shift', '⇧'], ['Mod', '⌘']]
    return order.filter(([m]) => parts.includes(m)).map(([, s]) => s).join('') + name
  }
  const order: [string, string][] = [['Mod', 'Ctrl'], ['Ctrl', 'Ctrl'], ['Shift', 'Shift'], ['Alt', 'Alt']]
  return [...order.filter(([m]) => parts.includes(m)).map(([, s]) => s), name].join('+')
}

let floating: { el: HTMLElement; close(): void } | null = null

function closeFloating(): void {
  floating?.close()
}

/** A box fixed to the page at a place in the editor, or at a point, kept inside the window. */
function float(el: HTMLElement, at: { left: number; top: number }, onClose: () => void, closeOnScroll = true): void {
  closeFloating()
  el.style.left = '0px'
  el.style.top = '0px'
  document.body.append(el)
  const box = el.getBoundingClientRect()
  el.style.left = `${Math.max(8, Math.min(at.left, innerWidth - box.width - 8))}px`
  el.style.top = `${Math.max(8, Math.min(at.top, innerHeight - box.height - 8))}px`
  const away = (event: Event) => {
    if (!el.contains(event.target as Node)) close()
  }
  // The rename box opens as the editor scrolls to the name (after an extraction), so a scroll doesn't close it.
  const scrolled = (event: Event) => {
    if (closeOnScroll) away(event)
  }
  const close = () => {
    if (floating?.el !== el) return
    floating = null
    el.remove()
    removeEventListener('pointerdown', away, true)
    removeEventListener('resize', close)
    removeEventListener('blur', close)
    document.removeEventListener('scroll', scrolled, true)
    onClose()
  }
  floating = { el, close }
  addEventListener('pointerdown', away, true)
  addEventListener('resize', close)
  addEventListener('blur', close)
  document.addEventListener('scroll', scrolled, true)
}

function below(view: EditorView, pos: number): { left: number; top: number } {
  const c = view.coordsAtPos(pos) ?? view.dom.getBoundingClientRect()
  return { left: c.left, top: c.bottom + 4 }
}

/** A short word near the cursor about why a command did nothing; it goes by itself. */
function notice(view: EditorView, message: string): void {
  const el = document.createElement('div')
  el.className = 'code-notice px-box'
  el.setAttribute('role', 'status')
  el.textContent = message
  float(el, below(view, view.state.selection.main.head), () => {})
  const timer = setTimeout(closeFloating, 3500)
  el.addEventListener('pointerdown', () => clearTimeout(timer))
}

export const renameSymbol: Command = (view) => {
  if (!inJavaScript(view)) {
    notice(view, JS_ONLY)
    return true
  }
  const pos = view.state.selection.main.head
  const plan = planRename(view.state, pos)
  if (!plan.ok) {
    notice(view, plan.message)
    return true
  }
  const box = document.createElement('form')
  box.className = 'code-rename px-box'
  const input = document.createElement('input')
  input.value = plan.target.name
  input.spellcheck = false
  input.autocapitalize = 'off'
  input.setAttribute('autocomplete', 'off')
  input.setAttribute('aria-label', `Nytt navn for ${plan.target.name}`)
  const note = document.createElement('p')
  note.className = 'code-rename-note'
  note.textContent = plan.target.kind === 'property'
    ? `Enter bytter navnet overalt i ${editorName(view)} (${plan.occurrences.length}), Esc avbryter.`
    : `Enter bytter navnet (${plan.occurrences.length} steder), Esc avbryter.`
  box.append(input, note)
  let done = false
  box.addEventListener('submit', (event) => {
    event.preventDefault()
    const next = input.value.trim()
    // Nothing can change the code while the box has focus, but a run may have marked a line: plan again anyway.
    const fresh = planRename(view.state, pos)
    if (!fresh.ok) return void (note.textContent = fresh.message)
    const problem = checkName(view.state, fresh, next)
    if (problem) {
      note.textContent = problem
      note.classList.add('is-error')
      return
    }
    done = true
    closeFloating()
    if (next !== fresh.target.name) {
      const changes = view.state.changes(renameChanges(fresh, next))
      const at = changes.mapPos(fresh.target.from, 1)
      view.dispatch({ changes, selection: EditorSelection.range(at, at + next.length), userEvent: 'input.rename', scrollIntoView: true })
    }
    view.focus()
  })
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeFloating()
    }
  })
  float(box, below(view, plan.target.from), () => {
    if (!done) view.focus()
  }, false)
  input.focus()
  input.select()
  return true
}

const editorName = (view: EditorView) => (view.dom.closest('#class-editor') ? 'klassen' : 'koden')

export const goToDefinition: Command = (view) => {
  if (!inJavaScript(view)) {
    notice(view, JS_ONLY)
    return true
  }
  const found = definitionOf(view.state, view.state.selection.main.head)
  if (!found) {
    notice(view, 'Fant ikke hvor navnet er deklarert.')
    return true
  }
  view.dispatch({ selection: EditorSelection.range(found.from, found.to), scrollIntoView: true })
  return true
}

export const extractToConstant: Command = (view) => {
  if (!inJavaScript(view)) {
    notice(view, JS_ONLY)
    return true
  }
  const { from, to } = view.state.selection.main
  const result = extractConstant(view.state, from, to)
  if (!result.ok) {
    notice(view, result.message)
    return true
  }
  view.dispatch({ changes: result.changes, selection: { anchor: result.at }, userEvent: 'input.extract', scrollIntoView: true })
  // As in VS Code: the new constant is named `value` and the rename box opens on it.
  requestAnimationFrame(() => renameSymbol(view))
  return true
}

export const formatDocument: Command = (view) => {
  const changes = formatChanges(view.state)
  if (!changes.empty) view.dispatch({ changes, userEvent: 'input.format' })
  return true
}

/** Ctrl+Shift+L: every match of the selection, or of the word at the cursor. */
const selectAllMatches: Command = (view) => {
  if (view.state.selection.main.empty) selectNextOccurrence(view)
  return selectSelectionMatches(view)
}

const selectedText = (view: EditorView) =>
  view.state.selection.ranges.filter((r) => !r.empty).map((r) => view.state.sliceDoc(r.from, r.to)).join('\n')

const copy: Command = (view) => {
  void navigator.clipboard?.writeText(selectedText(view)).catch(() => {})
  return true
}

const cut: Command = (view) => {
  const text = selectedText(view)
  void navigator.clipboard?.writeText(text).then(
    () => view.dispatch(view.state.replaceSelection(''), { userEvent: 'delete.cut' }),
    () => notice(view, 'Nettleseren slapp ikke til utklippstavlen. Bruk ' + keyLabel('Mod-x') + '.'),
  )
  return true
}

const paste: Command = (view) => {
  const read = navigator.clipboard?.readText?.()
  if (!read) {
    notice(view, 'Nettleseren slipper ikke menyen til utklippstavlen. Bruk ' + keyLabel('Mod-v') + '.')
    return true
  }
  read.then(
    (text) => {
      view.dispatch(view.state.replaceSelection(text), { userEvent: 'input.paste', scrollIntoView: true })
      view.focus()
    },
    () => notice(view, 'Nettleseren slapp ikke til utklippstavlen. Bruk ' + keyLabel('Mod-v') + '.'),
  )
  return true
}

/** The shortcuts the menu shows that CodeMirror's default keymaps don't already have. */
export const refactorKeymap: KeyBinding[] = [
  { key: 'F2', run: renameSymbol },
  { key: 'F12', run: goToDefinition },
  { key: 'Shift-Alt-f', run: formatDocument },
  { key: 'Mod-Shift-l', run: selectAllMatches },
]

type Item = { label: string; key?: string; run: Command; enabled?: (view: EditorView) => boolean } | 'line'

const hasName = (view: EditorView) => inJavaScript(view) && targetAt(view.state, view.state.selection.main.head) !== null
const hasSelection = (view: EditorView) => view.state.selection.ranges.some((r) => !r.empty)
const canExtract = (view: EditorView) => inJavaScript(view) && hasSelection(view)

const ITEMS: Item[] = [
  { label: 'Gi nytt navn', key: 'F2', run: renameSymbol, enabled: hasName },
  { label: 'Gå til definisjon', key: 'F12', run: goToDefinition, enabled: hasName },
  { label: 'Trekk ut til konstant', run: extractToConstant, enabled: canExtract },
  'line',
  { label: 'Formater', key: 'Shift-Alt-f', run: formatDocument },
  { label: 'Kommenter ut/inn', key: 'Mod-/', run: toggleComment },
  { label: 'Flytt linje opp', key: 'Alt-ArrowUp', run: moveLineUp },
  { label: 'Flytt linje ned', key: 'Alt-ArrowDown', run: moveLineDown },
  { label: 'Kopier linje ned', key: 'Shift-Alt-ArrowDown', run: copyLineDown },
  { label: 'Slett linje', key: 'Mod-Shift-k', run: deleteLine },
  { label: 'Merk alle like', key: 'Mod-Shift-l', run: selectAllMatches },
  'line',
  { label: 'Klipp ut', key: 'Mod-x', run: cut, enabled: hasSelection },
  { label: 'Kopier', key: 'Mod-c', run: copy, enabled: hasSelection },
  { label: 'Lim inn', key: 'Mod-v', run: paste },
  { label: 'Merk alt', key: 'Mod-a', run: selectAll },
]

function openMenu(view: EditorView, at: { left: number; top: number }, fromKeyboard: boolean): void {
  const menu = document.createElement('div')
  menu.className = 'code-menu px-box'
  menu.tabIndex = -1
  menu.setAttribute('role', 'menu')
  menu.setAttribute('aria-label', 'Kode')
  const buttons: HTMLButtonElement[] = []
  for (const item of ITEMS) {
    if (item === 'line') {
      const line = document.createElement('div')
      line.className = 'code-menu-line'
      line.setAttribute('role', 'separator')
      menu.append(line)
      continue
    }
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'code-menu-item'
    button.setAttribute('role', 'menuitem')
    button.tabIndex = -1
    button.disabled = item.enabled ? !item.enabled(view) : false
    const label = Object.assign(document.createElement('span'), { className: 'px', textContent: item.label })
    button.append(label)
    if (item.key) button.append(Object.assign(document.createElement('kbd'), { textContent: keyLabel(item.key) }))
    // The pointer moves the focus, so the item under it and the one the arrows move from are the same.
    button.addEventListener('pointermove', () => {
      if (!button.disabled && document.activeElement !== button) button.focus()
    })
    button.addEventListener('click', () => {
      closeFloating()
      view.focus()
      item.run(view)
    })
    menu.append(button)
    if (!button.disabled) buttons.push(button)
  }
  menu.addEventListener('keydown', (event) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const move = (to: number) => buttons[(to + buttons.length) % buttons.length]?.focus()
    if (event.key === 'ArrowDown') move(i + 1)
    else if (event.key === 'ArrowUp') move(i < 0 ? -1 : i - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(-1)
    else if (event.key === 'Escape' || event.key === 'Tab') {
      closeFloating()
      view.focus()
    } else return
    event.preventDefault()
  })
  menu.addEventListener('contextmenu', (event) => event.preventDefault())
  float(menu, at, () => {})
  // Opened by a click nothing is picked yet; by the menu key, the first item is.
  if (fromKeyboard) buttons[0]?.focus()
  else menu.focus()
}

export const editorMenu = EditorView.domEventHandlers({
  contextmenu(event, view) {
    if (matchMedia('(pointer: coarse)').matches) return false
    event.preventDefault()
    // As in VS Code: a right click outside the selection moves the cursor there first.
    const fromKeyboard = event.clientX === 0 && event.clientY === 0
    const pos = fromKeyboard ? null : view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos !== null && !view.state.selection.ranges.some((r) => r.from <= pos && pos <= r.to)) {
      view.dispatch({ selection: { anchor: pos } })
    }
    view.focus()
    const at = fromKeyboard ? below(view, view.state.selection.main.head) : { left: event.clientX, top: event.clientY }
    openMenu(view, at, fromKeyboard)
    return true
  },
})
