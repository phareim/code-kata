/*
 * TeaVM's loader for the modules it compiles (an ES module), as the body of a function that returns its exports, so
 * the workers, which start from data: URLs and can't import, can have it: `new Function(javaRuntime)().load(…)`.
 */
import loader from '@live-codes/java-wasm/dist/teavm/compiler.wasm-runtime.js?raw'

function asBody(module: string): string {
  const m = /export\s*\{([^}]*)\}\s*;?\s*$/.exec(module)
  if (!m) throw new Error('TeaVM loader: no export list')
  const names = m[1].split(',').map((part) => {
    const [local, , name = local] = part.trim().split(/\s+/)
    return `${name}: ${local}`
  })
  return `${module.slice(0, m.index)}\nreturn { ${names.join(', ')} }`
}

export const javaRuntime = asBody(loader)
