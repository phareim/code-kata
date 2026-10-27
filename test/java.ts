/*
 * Java for the tests: the same compiler the page runs in its worker (src/java/compile-worker.js), here in Node, with
 * what it compiled kept in node_modules/.cache/kata-java by the source's hash, so a second `npm test` is quick. A run
 * goes through the real worker (harness.ts) with the module, as on the page.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compose, type ComposeInput, type Composed } from '../src/java/compose'
import { javaRuntime } from '../src/java/runtime'
import type { World } from '../src/world/world'
import { runWorker, type WorkerRun } from './harness'
import type { TaskRun } from '../src/run/runner'

const DIST = fileURLToPath(new URL('../node_modules/@live-codes/java-wasm/dist/teavm/', import.meta.url))
const CACHE = fileURLToPath(new URL('../node_modules/.cache/kata-java/', import.meta.url))

export interface Diagnostic { severity: string | null; line: number | null; message: string | null }
export interface Compiled { ok: boolean; wasm: Uint8Array | null; diagnostics: Diagnostic[] }

let compiler: Promise<any> | null = null
let diagnostics: Diagnostic[] = []

function start(): Promise<any> {
  compiler ??= (async () => {
    const { load } = await import(/* @vite-ignore */ `${DIST}compiler.wasm-runtime.js`)
    const program = await load(new Uint8Array(readFileSync(`${DIST}compiler.wasm`)), { noAutoImports: true })
    const c = program.exports.createCompiler()
    c.setSdk(new Int8Array(readFileSync(`${DIST}compile-classlib-teavm.bin`)))
    c.setTeaVMClasslib(new Int8Array(readFileSync(`${DIST}runtime-classlib-teavm.bin`)))
    c.onDiagnostic((d: any) => diagnostics.push({ severity: d.severity ?? null, line: d.lineNumber ?? null, message: d.message ?? null }))
    return c
  })()
  return compiler
}

export async function compileJava(source: string): Promise<Compiled> {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 32)
  const file = `${CACHE}${hash}.json`
  if (existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8'))
    return { ok: saved.ok, wasm: saved.wasm ? new Uint8Array(Buffer.from(saved.wasm, 'base64')) : null, diagnostics: saved.diagnostics }
  }
  const c = await start()
  diagnostics = []
  c.clearSourceFiles()
  c.addSourceFile('Main.java', source)
  let ok = c.compile()
  let wasm: Uint8Array | null = null
  if (ok) {
    ok = c.generateWebAssembly({ outputName: 'app', mainClass: 'KataMain', optimizationLevel: 'SIMPLE' })
    const out = ok ? c.getWebAssemblyOutputFile('app.wasm') : null
    if (out) wasm = new Uint8Array(out.buffer, out.byteOffset, out.byteLength).slice()
    else ok = false
  }
  const result = { ok, wasm, diagnostics: diagnostics.filter((d) => d.severity === 'error') }
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(file, JSON.stringify({ ok, wasm: wasm ? Buffer.from(wasm).toString('base64') : null, diagnostics: result.diagnostics }))
  return result
}

const deobfuscator = () => new Uint8Array(readFileSync(`${DIST}compiler.wasm-deobfuscator.wasm`))

export interface JavaRun extends WorkerRun {
  composed: Composed
  compiled: Compiled
}

/** Composes, compiles and runs Java code through the worker, as the page does; a compile error comes back as the end. */
export async function runJava(input: ComposeInput & { world: World; task?: TaskRun; expected?: Record<string, string> }, timeoutMs = 8000): Promise<JavaRun> {
  const composed = compose({ ...input, exports: input.exports ?? input.task?.exports })
  const compiled = await compileJava(composed.source)
  if (!compiled.ok || !compiled.wasm) {
    const first = compiled.diagnostics[0]
    return {
      composed,
      compiled,
      output: [],
      world: null,
      frames: [],
      verdict: null,
      end: { type: 'error', name: 'CompileError', message: first?.message ?? 'kompilerte ikke', line: first?.line ?? null, where: null, compile: true },
    }
  }
  const run = await runWorker({
    code: input.code,
    world: input.world,
    task: input.task,
    java: {
      wasm: compiled.wasm.buffer.slice(compiled.wasm.byteOffset, compiled.wasm.byteOffset + compiled.wasm.byteLength),
      deobfuscator: deobfuscator().buffer,
      runtime: javaRuntime,
      meta: composed.meta,
      lines: composed.lines,
      expected: input.expected,
    },
  }, timeoutMs)
  return { ...run, composed, compiled }
}
