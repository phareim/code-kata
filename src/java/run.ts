/*
 * What a run in Java does before the runner's worker starts: compose the source (compose.ts), compile it
 * (compiler.ts), and either hand the worker the module or say what javac said. The page loads this module the first
 * time a visitor runs Java, so a visit in JavaScript never fetches it.
 */
import { compose, type Root } from './compose'
import { compileJava } from './compiler'
import { explain, type JavaError } from './diagnostics'
import { javaRuntime } from './runtime'
import type { World } from '../world/world'

export interface Prepared {
  /** What the worker gets as msg.java. */
  payload?: Record<string, unknown>
  /** The compiler's errors, each on its line; and an export the code calls before declaring it. */
  errors?: JavaError[]
  missing?: string | null
}

export async function prepareJava(
  input: { classSource: string; code: string; world: World; exports?: string[]; roots: Root[]; prelude?: string; expected?: Record<string, string> },
  hooks: { loading: () => void; compiling: () => void },
): Promise<Prepared> {
  const composed = compose({
    classSource: input.classSource,
    code: input.code,
    roots: input.roots,
    items: input.world.items.length,
    prelude: input.prelude,
    exports: input.exports,
  })
  if (composed.problem) return { errors: [{ message: composed.problem, line: null, where: 'klasse' }] }
  const compiled = await compileJava(composed.source, hooks)
  if (!compiled.ok || !compiled.wasm) {
    const { errors, missing } = explain(composed, compiled.diagnostics, input.code, input.classSource, input.exports)
    return { errors, missing }
  }
  return {
    payload: {
      wasm: compiled.wasm,
      deobfuscator: compiled.deobfuscator,
      runtime: javaRuntime,
      meta: composed.meta,
      lines: composed.lines,
      expected: input.expected ?? {},
    },
  }
}
