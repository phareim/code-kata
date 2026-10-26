/*
 * Rename, go to definition, extract to a constant and format, read off the Lezer tree of the one document (the code
 * and the class are separate editors and know nothing of each other). A variable is resolved through its scopes the
 * way JavaScript does it, hoisting included; a property or method has no scope here, so every property of that name
 * in the document is one.
 */
import { ensureSyntaxTree, indentRange } from '@codemirror/language'
import { ChangeSet, type ChangeSpec, type EditorState } from '@codemirror/state'
import type { SyntaxNode, Tree } from '@lezer/common'

export type Target = {
  kind: 'variable' | 'property'
  name: string
  from: number
  to: number
}

type Occurrence = {
  from: number
  to: number
  /** A shorthand (`{ a }`, `const { a } = o`) is both a property and a variable: renaming one side writes `a: b`. */
  shorthand: boolean
  /** The node is the name's property side (a key, a member, a method), not a binding. */
  property: boolean
}

export type RenamePlan =
  | { ok: true; target: Target; occurrences: Occurrence[] }
  | { ok: false; message: string }

const SCOPES = new Set([
  'Script', 'Block', 'ForStatement', 'FunctionDeclaration', 'FunctionExpression', 'ArrowFunction',
  'MethodDeclaration', 'CatchClause', 'ClassExpression', 'StaticBlock',
])
const FUNCTIONS = new Set(['Script', 'FunctionDeclaration', 'FunctionExpression', 'ArrowFunction', 'MethodDeclaration'])
const STATEMENT_PARENTS = new Set(['Script', 'Block', 'SwitchBody'])

const RESERVED = new Set(`break case catch class const continue debugger default delete do else export extends false
finally for function if import in instanceof new null return super switch this throw true try typeof var void while
with yield let static enum await implements package protected interface private public arguments eval undefined`
  .split(/\s+/))
const IDENTIFIER = /^[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*$/u

function tree(state: EditorState): Tree | null {
  return ensureSyntaxTree(state, state.doc.length, 1000)
}

const text = (state: EditorState, node: { from: number; to: number }) => state.sliceDoc(node.from, node.to)

function isShorthandProperty(node: SyntaxNode): boolean {
  const parent = node.parent
  return node.name === 'PropertyDefinition' && parent?.name === 'Property' && parent.firstChild?.to === parent.lastChild?.to
}

function isShorthandPattern(node: SyntaxNode): boolean {
  return node.name === 'VariableDefinition' && node.parent?.name === 'PatternProperty' && node.prevSibling === null
}

function isBinding(node: SyntaxNode): boolean {
  return node.name === 'VariableName' || node.name === 'VariableDefinition' || isShorthandProperty(node)
}

function isProperty(node: SyntaxNode): boolean {
  return node.name === 'PropertyName' || node.name === 'PropertyDefinition' || isShorthandPattern(node)
}

function enclosingScope(node: SyntaxNode, pick: Set<string> = SCOPES): SyntaxNode | null {
  for (let up = node.parent; up; up = up.parent) if (pick.has(up.name)) return up
  return null
}

/** The scope a VariableDefinition declares its name in. */
function declaringScope(def: SyntaxNode): SyntaxNode | null {
  const parent = def.parent
  // A function's or class's name lives where the declaration stands, not inside it.
  if (parent && (parent.name === 'FunctionDeclaration' || parent.name === 'ClassDeclaration')) return enclosingScope(parent)
  for (let up = def.parent; up; up = up.parent) {
    if (up.name === 'VariableDeclaration') {
      if (up.firstChild?.name === 'var') return enclosingScope(up, FUNCTIONS)
      break
    }
    if (SCOPES.has(up.name)) break
  }
  return enclosingScope(def)
}

type Definition = { name: string; node: SyntaxNode; scope: SyntaxNode | null }

function definitions(state: EditorState, t: Tree): Definition[] {
  const out: Definition[] = []
  t.iterate({
    enter(ref) {
      if (ref.name !== 'VariableDefinition') return
      const node = ref.node
      out.push({ name: text(state, node), node, scope: declaringScope(node) })
    },
  })
  return out
}

const same = (a: SyntaxNode | null, b: SyntaxNode | null) => !!a && !!b && a.from === b.from && a.to === b.to && a.name === b.name

/** The definition a binding refers to, or null for a global (a root, `Math`, a name never declared). */
function resolve(node: SyntaxNode, name: string, defs: Definition[]): Definition | null {
  if (node.name === 'VariableDefinition') return defs.find((d) => d.node.from === node.from) ?? null
  for (let scope = enclosingScope(node); scope; scope = enclosingScope(scope)) {
    const found = defs.find((d) => d.name === name && same(d.scope, scope))
    if (found) return found
  }
  return null
}

function nodeAt(t: Tree, pos: number): SyntaxNode | null {
  for (const side of [1, -1] as const) {
    const node = t.resolveInner(pos, side)
    if (isBinding(node) || isProperty(node) || node.name === 'Label') return node
  }
  return null
}

/** What sits under the cursor that can be renamed, if anything. */
export function targetAt(state: EditorState, pos: number): Target | null {
  const t = tree(state)
  if (!t) return null
  const node = nodeAt(t, pos)
  if (!node || node.name === 'Label') return null
  const kind = isBinding(node) ? 'variable' : 'property'
  return { kind, name: text(state, node), from: node.from, to: node.to }
}

export function planRename(state: EditorState, pos: number): RenamePlan {
  const t = tree(state)
  if (!t) return { ok: false, message: 'Koden er for lang til å lese ferdig.' }
  const node = nodeAt(t, pos)
  if (!node || node.name === 'Label') return { ok: false, message: 'Sett markøren på et navn først.' }
  const name = text(state, node)
  const target: Target = { kind: isBinding(node) ? 'variable' : 'property', name, from: node.from, to: node.to }
  const occurrences: Occurrence[] = []

  if (target.kind === 'property') {
    if (name === 'constructor') return { ok: false, message: '«constructor» må hete det den heter.' }
    t.iterate({
      enter(ref) {
        const n = ref.node
        if (!isProperty(n) || text(state, n) !== name) return
        occurrences.push({ from: n.from, to: n.to, property: true, shorthand: isShorthandPattern(n) || isShorthandProperty(n) })
      },
    })
    return { ok: true, target, occurrences }
  }

  const defs = definitions(state, t)
  const def = resolve(node, name, defs)
  if (!def) return { ok: false, message: `«${name}» er ikke deklarert i koden, så navnet kan ikke byttes her.` }
  t.iterate({
    enter(ref) {
      const n = ref.node
      if (!isBinding(n) || text(state, n) !== name) return
      if (resolve(n, name, defs) !== def) return
      occurrences.push({ from: n.from, to: n.to, property: false, shorthand: isShorthandProperty(n) || isShorthandPattern(n) })
    },
  })
  return { ok: true, target, occurrences }
}

/** Why a name won't do, or null when it will. */
export function checkName(state: EditorState, plan: RenamePlan & { ok: true }, next: string): string | null {
  if (!IDENTIFIER.test(next)) return `«${next}» er ikke et gyldig navn i JavaScript.`
  if (RESERVED.has(next)) return `«${next}» er et reservert ord.`
  if (plan.target.kind === 'property' || next === plan.target.name) return null
  const t = tree(state)
  if (!t) return null
  const defs = definitions(state, t)
  const node = nodeAt(t, plan.target.from)
  const def = node && resolve(node, plan.target.name, defs)
  if (def && defs.some((d) => d.name === next && same(d.scope, def.scope))) return `«${next}» finnes allerede der.`
  return null
}

export function renameChanges(plan: RenamePlan & { ok: true }, next: string): ChangeSpec[] {
  const old = plan.target.name
  return plan.occurrences.map((o) => {
    if (!o.shorthand) return { from: o.from, to: o.to, insert: next }
    // `{ a }` stays the same object: the side that is not renamed keeps the old name.
    const insert = plan.target.kind === 'property' ? `${next}: ${old}` : `${old}: ${next}`
    return { from: o.from, to: o.to, insert }
  })
}

/** Where the name under the cursor is declared: the variable's definition, or the first method or key of that name. */
export function definitionOf(state: EditorState, pos: number): { from: number; to: number } | null {
  const t = tree(state)
  if (!t) return null
  const node = nodeAt(t, pos)
  if (!node || node.name === 'Label') return null
  const name = text(state, node)
  if (isBinding(node)) {
    const def = resolve(node, name, definitions(state, t))
    return def ? { from: def.node.from, to: def.node.to } : null
  }
  let found: { from: number; to: number } | null = null
  t.iterate({
    enter(ref) {
      if (found) return false
      if (ref.name === 'PropertyDefinition' && text(state, ref) === name) found = { from: ref.from, to: ref.to }
      return undefined
    },
  })
  return found
}

export type Extraction =
  | { ok: true; changes: ChangeSpec[]; name: string; /** Where the new name's definition lands, after the changes. */ at: number }
  | { ok: false; message: string }

/** Moves the selected expression into `const value = …` on a line of its own before the statement it is in. */
export function extractConstant(state: EditorState, from: number, to: number): Extraction {
  const raw = state.sliceDoc(from, to)
  from += raw.length - raw.trimStart().length
  to -= raw.length - raw.trimEnd().length
  if (from >= to) return { ok: false, message: 'Merk et uttrykk først.' }
  const t = tree(state)
  if (!t) return { ok: false, message: 'Koden er for lang til å lese ferdig.' }
  // The outermost node that covers exactly the selection.
  let expr: SyntaxNode | null = null
  for (let n: SyntaxNode | null = t.resolveInner(from, 1); n && n.from >= from && n.to <= to; n = n.parent) {
    if (n.from === from && n.to === to) expr = n
  }
  if (!expr || expr.type.isError || /Statement|Declaration|Block|Spec|Body|^(Script|ParamList)$/.test(expr.name)) {
    return { ok: false, message: 'Merk et helt uttrykk, som `a + b` eller `items.length`.' }
  }
  if (expr.name === 'VariableDefinition' || expr.name === 'PropertyDefinition' || expr.name === 'PropertyName') {
    return { ok: false, message: 'Merk et helt uttrykk, som `a + b` eller `items.length`.' }
  }
  if (expr.parent?.name === 'AssignmentExpression' && expr.parent.firstChild?.from === expr.from) {
    return { ok: false, message: 'Det som tildeles, kan ikke trekkes ut.' }
  }
  let statement: SyntaxNode | null = expr
  for (; statement; statement = statement.parent) {
    const parent: SyntaxNode | null = statement.parent
    if (!parent || STATEMENT_PARENTS.has(parent.name)) break
    if (/Function|^MethodDeclaration$|^ClassBody$|Spec$/.test(parent.name)) {
      return { ok: false, message: 'Uttrykket kan ikke flyttes ut herfra uten å endre hva koden gjør.' }
    }
  }
  if (!statement || !statement.parent) return { ok: false, message: 'Fant ikke setningen uttrykket står i.' }

  const doc = state.doc.toString()
  let name = 'value'
  for (let i = 2; new RegExp(`(^|[^\\w$])${name}($|[^\\w$])`, 'u').test(doc); i++) name = `value${i}`
  const line = state.doc.lineAt(statement.from)
  const indent = /^\s*/.exec(line.text)![0]
  const head = `${indent}const ${name} = `
  const insert = `${head}${state.sliceDoc(from, to)}\n`
  return {
    ok: true,
    name,
    at: line.from + indent.length + 'const '.length,
    changes: [{ from: line.from, insert }, { from, to, insert: name }],
  }
}

/** Indents every line again, drops trailing spaces and keeps at most one empty line in a row. */
export function formatChanges(state: EditorState): ChangeSet {
  tree(state)
  const indented = indentRange(state, 0, state.doc.length)
  const doc = indented.apply(state.doc)
  const tidy: ChangeSpec[] = []
  let blank = false
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const trailing = /[ \t]+$/.exec(line.text)
    if (line.text.trim() === '') {
      // A second empty line in a row goes with the line break before it.
      if (blank) tidy.push({ from: line.from - 1, to: line.to })
      else if (line.length) tidy.push({ from: line.from, to: line.to })
      blank = true
      continue
    }
    blank = false
    if (trailing) tidy.push({ from: line.from + trailing.index, to: line.to })
  }
  return indented.compose(ChangeSet.of(tidy, doc.length))
}
