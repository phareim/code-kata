/*
 * The page's side of the Java compiler (compile-worker.js). The toolchain, about 8 MB, is fetched the first time a
 * visitor runs Java and kept in a worker of its own from then on; the worker starts from a data: URL, so it has an
 * opaque origin and the page hands it the files. What it compiled is kept by source for a few runs, so running the same
 * code again (on new items, say) doesn't compile it again.
 */
import compilerUrl from '@live-codes/java-wasm/dist/teavm/compiler.wasm?url'
import sdkUrl from '@live-codes/java-wasm/dist/teavm/compile-classlib-teavm.bin?url'
import classlibUrl from '@live-codes/java-wasm/dist/teavm/runtime-classlib-teavm.bin?url'
import deobfuscatorUrl from '@live-codes/java-wasm/dist/teavm/compiler.wasm-deobfuscator.wasm?url'
import workerBody from './compile-worker.js?raw'
import type { Diagnostic } from './diagnostics'
import { javaRuntime } from './runtime'

export interface Compiled {
  ok: boolean
  /** The module, and TeaVM's deobfuscator for the lines of its traps. */
  wasm: ArrayBuffer | null
  deobfuscator: ArrayBuffer
  diagnostics: Diagnostic[]
  ms: number
}

const WORKER_URL = `data:text/javascript;charset=utf-8,${encodeURIComponent(`const teavm = (function () {\n${javaRuntime}\n})();\n${workerBody}\n//# sourceURL=java-compiler.js`)}`
const KEPT = 6

let worker: Worker | null = null
let ready: Promise<void> | null = null
let deobfuscator: Promise<ArrayBuffer> | null = null
let next = 0
const waiting = new Map<number, (result: Omit<Compiled, 'deobfuscator'>) => void>()
const kept = new Map<string, Promise<Compiled>>()

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  return response.arrayBuffer()
}

/** Starts the compiler, fetching it the first time; `loading` hears that it is fetching. */
function start(loading: () => void): Promise<void> {
  if (ready) return ready
  loading()
  deobfuscator = fetchBytes(deobfuscatorUrl)
  ready = (async () => {
    const [compiler, sdk, classlib] = await Promise.all([compilerUrl, sdkUrl, classlibUrl].map(fetchBytes))
    const w = new Worker(WORKER_URL)
    await new Promise<void>((resolve, reject) => {
      w.onmessage = (event: MessageEvent) => {
        const msg = event.data
        if (msg?.type === 'ready') resolve()
        else if (msg?.type === 'broken') reject(new Error(msg.message))
        else if (msg?.type === 'compiled') {
          waiting.get(msg.id)?.(msg)
          waiting.delete(msg.id)
        }
      }
      w.onerror = (event) => {
        event.preventDefault()
        reject(new Error(event.message || 'Java-kompilatoren stoppet.'))
      }
      w.postMessage({ type: 'init', compiler, sdk, classlib }, [compiler, sdk, classlib])
    })
    worker = w
  })()
  ready.catch(() => {
    // The next run tries again.
    ready = null
    worker?.terminate()
    worker = null
  })
  return ready
}

/** Whether the compiler is up, so a run needn't say it is fetching Java. */
export const javaReady = () => worker !== null

/**
 * Compiles a source the bridge composed (compose.ts). `loading` is called when the toolchain has to be fetched first,
 * `compiling` when the compiler starts on it.
 */
export function compileJava(source: string, hooks: { loading: () => void; compiling: () => void }): Promise<Compiled> {
  const known = kept.get(source)
  if (known) {
    kept.delete(source)
    kept.set(source, known)
    return known
  }
  const result = (async (): Promise<Compiled> => {
    await start(hooks.loading)
    hooks.compiling()
    const id = ++next
    const compiled = await new Promise<Omit<Compiled, 'deobfuscator'>>((resolve) => {
      waiting.set(id, resolve)
      worker!.postMessage({ type: 'compile', id, source })
    })
    return { ...compiled, deobfuscator: (await deobfuscator!).slice(0) }
  })()
  kept.set(source, result)
  result.catch(() => kept.delete(source))
  while (kept.size > KEPT) kept.delete(kept.keys().next().value!)
  return result
}
