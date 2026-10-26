import { javascript } from '@codemirror/lang-javascript'
import { indentUnit } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { checkName, definitionOf, extractConstant, formatChanges, planRename, renameChanges } from '../src/editor/refactor'

const stateOf = (doc: string) => EditorState.create({ doc, extensions: [javascript(), indentUnit.of('  ')] })

/** The document after renaming the name at `|` to `next`, or the message why not. */
function rename(text: string, next: string): string {
  const pos = text.indexOf('|')
  const state = stateOf(text.replace('|', ''))
  const plan = planRename(state, pos)
  if (!plan.ok) return `! ${plan.message}`
  const problem = checkName(state, plan, next)
  if (problem) return `! ${problem}`
  return state.update({ changes: renameChanges(plan, next) }).state.doc.toString()
}

describe('rename', () => {
  it('renames a variable and its uses, not another of the same name in an inner scope', () => {
    expect(rename('let |n = 1\nfunction f(n) { return n }\nn = n + f(n)', 'count'))
      .toBe('let count = 1\nfunction f(n) { return n }\ncount = count + f(count)')
  })

  it('renames a parameter from a use inside the body', () => {
    expect(rename('function f(node) {\n  while (node) node = no|de.next\n}\nf(node)', 'cur'))
      .toBe('function f(cur) {\n  while (cur) cur = cur.next\n}\nf(node)')
  })

  it('finds a function used before it is declared, and keeps a var in its function', () => {
    expect(rename('go|()\nfunction go() { for (var i = 0; i < 2; i++) {} return i }', 'run'))
      .toBe('run()\nfunction run() { for (var i = 0; i < 2; i++) {} return i }')
    expect(rename('function go() { for (var |i = 0; i < 2; i++) {} return i }', 'k'))
      .toBe('function go() { for (var k = 0; k < 2; k++) {} return k }')
  })

  it('keeps a shorthand object the same object', () => {
    expect(rename('const |a = 1\nconst o = { a }\nconst { b } = o', 'x')).toBe('const x = 1\nconst o = { a: x }\nconst { b } = o')
    expect(rename('const { |b } = o\nlog(b)', 'y')).toBe('const { b: y } = o\nlog(y)')
  })

  it('renames a property everywhere in the document', () => {
    expect(rename('class M {\n  |value = 0\n  grow() { this.value++ }\n}\nconst { value } = m\nm.value', 'size'))
      .toBe('class M {\n  size = 0\n  grow() { this.size++ }\n}\nconst { size: value } = m\nm.size')
  })

  it('says why not', () => {
    expect(rename('he|ad = head.next', 'x')).toMatch(/ikke deklarert/)
    expect(rename('const |a = 1, b = 2', 'b')).toMatch(/finnes allerede/)
    expect(rename('const |a = 1', 'class')).toMatch(/reservert/)
    expect(rename('const |a = 1', '2a')).toMatch(/gyldig/)
    expect(rename('1 + | 2', 'x')).toMatch(/markøren/)
  })
})

describe('definition', () => {
  it('goes to the declaration of a variable and of a method', () => {
    const doc = 'function f(a) { return a.grow() }\nclass M { grow() {} }'
    const state = stateOf(doc)
    expect(definitionOf(state, doc.indexOf('a.') + 1)).toEqual({ from: 11, to: 12 })
    expect(definitionOf(state, doc.indexOf('grow'))?.from).toBe(doc.lastIndexOf('grow'))
  })
})

describe('extract', () => {
  const extract = (doc: string, part: string) => {
    const state = stateOf(doc)
    const from = doc.indexOf(part)
    const result = extractConstant(state, from, from + part.length)
    if (!result.ok) return `! ${result.message}`
    const next = state.update({ changes: result.changes }).state.doc.toString()
    expect(next.slice(result.at, result.at + result.name.length)).toBe(result.name)
    return next
  }

  it('puts the expression in a constant before its statement', () => {
    expect(extract('function f(xs) {\n  return xs.length * 2\n}', 'xs.length'))
      .toBe('function f(xs) {\n  const value = xs.length\n  return value * 2\n}')
    expect(extract('const value = 1\nlog(value + 2)', 'value + 2')).toBe('const value = 1\nconst value2 = value + 2\nlog(value2)')
  })

  it('refuses what is not an expression, or would change what the code does', () => {
    expect(extract('const a = b + c', 'a = b')).toMatch(/helt uttrykk/)
    expect(extract('const f = (x) => x * 2', 'x * 2')).toMatch(/endre/)
    expect(extract('for (let i = 0; i < n; i++) {}', 'i < n')).toMatch(/endre/)
  })
})

describe('format', () => {
  it('indents again, drops trailing spaces and runs of empty lines', () => {
    const state = stateOf('function f() {\nif (a) {   \n        return 1\n}\n\n\n\n}\n')
    expect(state.update({ changes: formatChanges(state) }).state.doc.toString())
      .toBe('function f() {\n  if (a) {\n    return 1\n  }\n\n}\n')
  })
})
