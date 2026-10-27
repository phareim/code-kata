/*
 * The Java compiler: javac and TeaVM, themselves compiled to WebAssembly (@live-codes/java-wasm), in a worker of their
 * own. The page starts it from a data: URL, like the runner, with TeaVM's loader in front of this file as `teavm`
 * (src/java/compiler.ts), and keeps it between runs: starting it takes a second or two. It never runs the code it
 * compiles; the runner does, in a fresh worker each time.
 *
 *   page → worker  { type: 'init', compiler, sdk, classlib }   ArrayBuffers: compiler.wasm and its two class libraries
 *                  { type: 'compile', id, source }
 *   worker → page  { type: 'ready', ms } | { type: 'broken', message }
 *                  { type: 'compiled', id, ok, wasm, diagnostics, ms }   diagnostics: [{ severity, line, message }]
 */
let compiler = null
let diagnostics = []

async function init(msg) {
  const t0 = performance.now()
  const program = await teavm.load(new Uint8Array(msg.compiler), { noAutoImports: true })
  compiler = program.exports.createCompiler()
  compiler.setSdk(new Int8Array(msg.sdk))
  compiler.setTeaVMClasslib(new Int8Array(msg.classlib))
  compiler.onDiagnostic((d) => {
    const read = (key) => {
      try {
        const v = d[key]
        return typeof v === 'string' || typeof v === 'number' ? v : v == null ? null : String(v)
      } catch {
        return null
      }
    }
    diagnostics.push({ severity: read('severity'), file: read('fileName'), line: read('lineNumber'), message: read('message') })
  })
  return performance.now() - t0
}

function compile(source) {
  const t0 = performance.now()
  diagnostics = []
  compiler.clearSourceFiles()
  compiler.addSourceFile('Main.java', source)
  let ok = compiler.compile()
  let wasm = null
  if (ok) {
    ok = compiler.generateWebAssembly({ outputName: 'app', mainClass: 'KataMain', optimizationLevel: 'SIMPLE' })
    const out = ok ? compiler.getWebAssemblyOutputFile('app.wasm') : null
    if (out) wasm = new Uint8Array(out.buffer, out.byteOffset, out.byteLength).slice().buffer
    else ok = false
  }
  return { ok, wasm, diagnostics, ms: performance.now() - t0 }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg?.type === 'init') {
    try {
      self.postMessage({ type: 'ready', ms: await init(msg) })
    } catch (err) {
      self.postMessage({ type: 'broken', message: String(err?.message ?? err) })
    }
  } else if (msg?.type === 'compile') {
    let result
    try {
      result = compile(String(msg.source))
    } catch (err) {
      result = { ok: false, wasm: null, diagnostics: [{ severity: 'error', line: null, message: String(err?.message ?? err) }], ms: 0 }
    }
    self.postMessage({ type: 'compiled', id: msg.id, ...result }, result.wasm ? [result.wasm] : [])
  }
}
