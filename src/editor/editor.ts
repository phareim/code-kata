import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, ensureSyntaxTree, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, type Extension, Prec, StateEffect, StateField } from '@codemirror/state'
import {
  crosshairCursor,
  Decoration,
  type DecorationSet,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view'
import type { Lang } from '../tasks/lang'
import { kataJava, kataJavascript } from './completion'
import { editorMenu, refactorKeymap } from './menu'
import { neonHighlight, neonTheme } from './theme'

export interface EditorOptions {
  doc: string
  lang?: Lang
  /** Mod-Enter. */
  onRun(): void
  onChange(doc: string): void
  /** head and the items' letters, for autocomplete. */
  itemNames(): string[]
}

// The line the last run failed on. It belongs to the code that ran, so any edit clears it.
const setErrorLine = StateEffect.define<number | null>()
const errorLine = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(marks, tr) {
    if (tr.docChanged) marks = Decoration.none
    for (const effect of tr.effects) {
      if (!effect.is(setErrorLine)) continue
      marks = effect.value === null
        ? Decoration.none
        : Decoration.set([Decoration.line({ class: 'cm-errorLine' }).range(tr.state.doc.line(effect.value).from)])
    }
    return marks
  },
  provide: (field) => EditorView.decorations.from(field),
})

const extensionsOf = new WeakMap<EditorView, Extension[]>()
const langOf = new WeakMap<EditorView, Lang>()
const language = new Compartment()
const itemNamesOf = new WeakMap<EditorView, () => string[]>()

/** The language, its completions and its indent: two spaces in JavaScript, four in Java, as each is usually written. */
function languageFor(lang: Lang, itemNames: () => string[]): Extension {
  return lang === 'java'
    ? [kataJava(itemNames), indentUnit.of('    '), EditorState.tabSize.of(4)]
    : [kataJavascript(itemNames), indentUnit.of('  '), EditorState.tabSize.of(2)]
}

export function createEditor(parent: HTMLElement, options: EditorOptions): EditorView {
  const lang = options.lang ?? 'js'
  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(neonHighlight),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    errorLine,
    neonTheme,
    // Mod-Enter is insertBlankLine in the default keymap; Tab takes an open completion before it indents.
    Prec.highest(keymap.of([
      { key: 'Mod-Enter', run: () => { options.onRun(); return true } },
      { key: 'Tab', run: acceptCompletion },
    ])),
    editorMenu,
    keymap.of([...refactorKeymap, ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, indentWithTab]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange(update.state.doc.toString())
    }),
    EditorView.contentAttributes.of({
      'aria-label': 'JavaScript-kode',
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
    }),
  ]
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc: options.doc, extensions: [...extensions, language.of(languageFor(lang, options.itemNames))] }),
  })
  extensionsOf.set(view, extensions)
  langOf.set(view, lang)
  itemNamesOf.set(view, options.itemNames)
  return view
}

/** Another document with a history of its own (another task's code); onChange doesn't fire for it. */
export function replaceDoc(view: EditorView, doc: string, lang: Lang = langOf.get(view) ?? 'js'): void {
  langOf.set(view, lang)
  const names = itemNamesOf.get(view) ?? (() => [])
  view.setState(EditorState.create({ doc, extensions: [...extensionsOf.get(view)!, language.of(languageFor(lang, names))] }))
  view.contentDOM.setAttribute('aria-label', lang === 'java' ? 'Java-kode' : 'JavaScript-kode')
}

/** The language an editor is in. */
export const editorLang = (view: EditorView): Lang => langOf.get(view) ?? 'js'

/** Marks the line an error came from (null clears it) and scrolls it into view. */
export function markErrorLine(view: EditorView, line: number | null): void {
  const valid = line !== null && line >= 1 && line <= view.state.doc.lines ? line : null
  view.dispatch({
    effects: valid === null
      ? [setErrorLine.of(null)]
      : [setErrorLine.of(valid), EditorView.scrollIntoView(view.state.doc.line(valid).from, { y: 'nearest' })],
  })
}

export function goToLine(view: EditorView, line: number): void {
  if (line < 1 || line > view.state.doc.lines) return
  view.dispatch({ selection: { anchor: view.state.doc.line(line).from }, scrollIntoView: true })
  view.focus()
}

/** Where the parser first gives up: the line for a SyntaxError the engine reports without one (Chrome does). */
export function firstSyntaxErrorLine(state: EditorState): number | null {
  const tree = ensureSyntaxTree(state, state.doc.length, 500)
  if (!tree) return null
  let pos: number | null = null
  tree.iterate({
    enter(node) {
      if (pos !== null) return false
      if (node.type.isError) {
        pos = node.from
        return false
      }
      return undefined
    },
  })
  return pos === null ? null : state.doc.lineAt(pos).number
}
