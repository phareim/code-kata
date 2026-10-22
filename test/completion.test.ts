import { CompletionContext, type CompletionResult, type CompletionSource } from '@codemirror/autocomplete'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { kataJavascript } from '../src/editor/completion'
import { firstSyntaxErrorLine } from '../src/editor/editor'

/** Labels every completion source offers with the cursor at `|`, as CodeMirror would gather them. */
async function labels(text: string, explicit = false): Promise<string[]> {
  const pos = text.indexOf('|')
  const doc = text.replace('|', '')
  const state = EditorState.create({ doc, selection: { anchor: pos }, extensions: [kataJavascript(() => ['head', 'Ting', 'A', 'B'])] })
  ensureSyntaxTree(state, doc.length, 1000)
  const sources = state.languageDataAt<CompletionSource>('autocomplete', pos)
  const context = new CompletionContext(state, pos, explicit)
  const results = await Promise.all(sources.map((source) => source(context)))
  return results
    .filter((r): r is CompletionResult => !!r)
    .flatMap((r) => r.options.map((o) => o.label))
}

describe('completion', () => {
  it('offers the variables, functions and parameters in scope', async () => {
    const got = await labels('const total = 0\nfunction sumAll(numbers) {\n  return num|\n}')
    expect(got).toEqual(expect.arrayContaining(['total', 'sumAll', 'numbers']))
  })

  it('offers keywords and snippets, without import', async () => {
    const got = await labels('ret|')
    expect(got).toEqual(expect.arrayContaining(['return', 'const', 'function', 'for', 'log']))
    expect(got).not.toContain('import')
  })

  it('offers the runner globals by name', async () => {
    const got = await labels('Ma|')
    expect(got).toEqual(expect.arrayContaining(['Math', 'Map', 'console', 'JSON', 'setTimeout']))
    expect(got).not.toContain('document')
    expect(got).not.toContain('hasOwnProperty')
  })

  it('offers the members of a known global after a dot', async () => {
    expect(await labels('Math.fl|')).toEqual(expect.arrayContaining(['floor', 'max', 'random']))
    expect(await labels('console.|')).toEqual(expect.arrayContaining(['log', 'error', 'table']))
    expect(await labels('Math.|')).not.toContain('filter')
  })

  it('offers common members and the code’s own properties after a dot on anything else', async () => {
    const got = await labels('const player = { score: 0 }\nconst list = [1, 2]\nlist.|')
    expect(got).toEqual(expect.arrayContaining(['map', 'filter', 'reduce', 'length', 'split', 'score']))
    expect(await labels('"kata".toUp|')).toContain('toUpperCase')
  })

  it('offers head and the items by letter', async () => {
    expect(await labels('he|')).toContain('head')
    expect(await labels('A|')).toEqual(expect.arrayContaining(['A', 'B', 'head']))
    expect(await labels('new Ti|')).toContain('Ting')
  })

  it('offers value, color and next after a dot on an item or a plain variable', async () => {
    expect(await labels('head.next.|')).toEqual(expect.arrayContaining(['value', 'color', 'next']))
    expect(await labels('let node = head\nnode.ne|')).toContain('next')
    const got = await labels('const after = x.next\nnode.|')
    expect(got.filter((l) => l === 'next').length).toBe(1)
  })

  it('stays quiet inside strings and comments', async () => {
    expect(await labels("const s = 'Ma|'")).toEqual([])
    expect(await labels('// Ma|')).toEqual([])
  })
})

describe('firstSyntaxErrorLine', () => {
  it('finds the line the parser gives up on', () => {
    expect(firstSyntaxErrorLine(EditorState.create({ doc: 'let a = 1\nlet b = ;\n', extensions: [kataJavascript()] }))).toBe(2)
    expect(firstSyntaxErrorLine(EditorState.create({ doc: 'let a = 1\n', extensions: [kataJavascript()] }))).toBe(null)
  })
})
