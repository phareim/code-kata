import { describe, expect, it } from 'vitest'
import source from '../src/run/worker.js?raw'

// worker.js is a classic script; in Node it defines its functions and starts nothing.
const worker = new Function(`${source}\nreturn { inspect, compile, calibrate, errorLine }`)() as {
  inspect(value: unknown): string
  compile(code: string): () => Promise<unknown>
  calibrate(): Promise<{ stack: number | null; line: number | null; file: unknown }>
  errorLine(err: unknown, cal: unknown, compiling: boolean, lineCount: number): number | null
}
const { inspect } = worker

describe('inspect', () => {
  it('prints primitives the way Node does', () => {
    expect(inspect('bare')).toBe('bare')
    expect(inspect(42)).toBe('42')
    expect(inspect(-0)).toBe('-0')
    expect(inspect(10n)).toBe('10n')
    expect(inspect(undefined)).toBe('undefined')
    expect(inspect(null)).toBe('null')
    expect(inspect(Symbol('s'))).toBe('Symbol(s)')
  })

  it('quotes strings inside structures', () => {
    expect(inspect(['a', "it's", 'line\nbreak'])).toBe(`[ 'a', "it's", 'line\\nbreak' ]`)
  })

  it('prints objects, arrays, maps and sets on one line when they fit', () => {
    expect(inspect({ antall: 4, lengste: 'oppgaver' })).toBe("{ antall: 4, lengste: 'oppgaver' }")
    expect(inspect([1, [2, 3], {}])).toBe('[ 1, [ 2, 3 ], {} ]')
    expect(inspect({ 'two words': 1 })).toBe("{ 'two words': 1 }")
    expect(inspect(new Map([['a', 1]]))).toBe("Map(1) { 'a' => 1 }")
    expect(inspect(new Set([1, 2]))).toBe('Set(2) { 1, 2 }')
    expect(inspect([])).toBe('[]')
    expect(inspect(new Uint8Array([1, 2]))).toBe('Uint8Array(2) [ 1, 2 ]')
  })

  it('breaks long structures over lines, indented by depth', () => {
    const long = { first: 'a'.repeat(30), second: 'b'.repeat(30), nested: { x: 1 } }
    expect(inspect(long)).toBe(`{\n  first: '${'a'.repeat(30)}',\n  second: '${'b'.repeat(30)}',\n  nested: { x: 1 }\n}`)
  })

  it('names functions, classes and instances', () => {
    function sum() {}
    class Kata {
      level = 1
    }
    expect(inspect(sum)).toBe('[Function: sum]')
    expect(inspect(() => {})).toBe('[Function (anonymous)]')
    expect(inspect(async function load() {})).toBe('[AsyncFunction: load]')
    expect(inspect(Kata)).toBe('[class Kata]')
    expect(inspect(new Kata())).toBe('Kata { level: 1 }')
    expect(inspect(Object.create(null))).toBe('[Object: null prototype] {}')
  })

  it('survives cycles, depth, holes and long arrays', () => {
    const a: Record<string, unknown> = { name: 'a' }
    a.self = a
    expect(inspect(a)).toBe("{ name: 'a', self: [Circular] }")
    expect(inspect({ a: { b: { c: { d: { e: 1 } } } } })).toBe('{ a: { b: { c: { d: [Object] } } } }')
    // eslint-disable-next-line no-sparse-arrays
    expect(inspect([1, , , 4])).toBe('[ 1, <2 empty items>, 4 ]')
    expect(inspect(Array.from({ length: 102 }, () => 0)).endsWith('... 2 more items\n]')).toBe(true)
  })

  it('prints errors, dates and regexps', () => {
    expect(inspect(new TypeError('nope'))).toBe('TypeError: nope')
    expect(inspect({ err: new Error('x') })).toBe('{ err: [Error: x] }')
    expect(inspect(new Date(Date.UTC(2026, 9, 22)))).toBe('2026-10-22T00:00:00.000Z')
    expect(inspect(/k+/g)).toBe('/k+/g')
  })
})

describe('error lines (V8)', () => {
  it('maps a runtime error to its line in the editor', async () => {
    const cal = await worker.calibrate()
    const code = 'const a = 1\n\nnull.boom()'
    const err = await worker.compile(code)().catch((e: unknown) => e)
    expect(worker.errorLine(err, cal, false, 3)).toBe(3)
  })

  it('finds the line of an error thrown inside a function', async () => {
    const cal = await worker.calibrate()
    const code = 'function f() {\n  throw new Error("x")\n}\nf()'
    const err = await worker.compile(code)().catch((e: unknown) => e)
    expect(worker.errorLine(err, cal, false, 4)).toBe(2)
  })

  it('has no line for a thrown string', async () => {
    const cal = await worker.calibrate()
    expect(worker.errorLine('oops', cal, false, 1)).toBe(null)
  })

  it('runs in strict mode with top-level await', async () => {
    expect(await worker.compile('return await Promise.resolve(7)')()).toBe(7)
    const err = await worker.compile('undeclared = 1')().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ReferenceError)
  })
})
