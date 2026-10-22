/*
 * Runs src/run/worker.js the way the page does, in a Node vm context instead of a Worker: one context per run, the
 * same 'run' message in, the messages out passed through structuredClone as postMessage would.
 */
import vm from 'node:vm'
import source from '../src/run/worker.js?raw'
import type { Entry, TaskRun, Verdict } from '../src/run/runner'
import type { World } from '../src/world/world'

export interface WorkerRun {
  output: Entry[]
  world: World | null
  frames: World[]
  verdict: Verdict | null
  end: { type: 'done'; ms: number } | { type: 'error'; name: string; message: string; line: number | null; where: string | null; compile: boolean } | { type: 'timeout' }
}

export interface RunMessage {
  code: string
  classSource?: string
  world?: World
  task?: TaskRun
}

export function runWorker(msg: RunMessage, timeoutMs = 4000): Promise<WorkerRun> {
  const run: WorkerRun = { output: [], world: null, frames: [], verdict: null, end: { type: 'timeout' } }
  const intervals = new Set<ReturnType<typeof setInterval>>()
  const timeouts = new Set<ReturnType<typeof setTimeout>>()
  return new Promise((resolve) => {
    let over = false
    const finish = () => {
      if (over) return
      over = true
      clearTimeout(limit)
      for (const id of intervals) clearInterval(id)
      for (const id of timeouts) clearTimeout(id)
      resolve(run)
    }
    const limit = setTimeout(finish, timeoutMs)
    const sandbox = {
      postMessage(message: unknown) {
        if (over) return
        const m = structuredClone(message) as Record<string, any>
        switch (m.type) {
          case 'console': run.output.push(...m.entries); break
          case 'world': run.world = m.world; run.frames = m.frames; break
          case 'verdict': run.verdict = m as Verdict; break
          case 'done':
          case 'error':
            run.end = m as WorkerRun['end']
            finish()
        }
      },
      setTimeout(fn: () => void, ms?: number) {
        const id = setTimeout(() => { timeouts.delete(id); fn() }, ms)
        timeouts.add(id)
        return id
      },
      clearTimeout(id: ReturnType<typeof setTimeout>) { timeouts.delete(id); clearTimeout(id) },
      setInterval(fn: () => void, ms?: number) {
        const id = setInterval(fn, ms)
        intervals.add(id)
        return id
      },
      clearInterval(id: ReturnType<typeof setInterval>) { intervals.delete(id); clearInterval(id) },
      performance,
      structuredClone,
      addEventListener() {},
    }
    const context = vm.createContext(sandbox)
    vm.runInContext('globalThis.self = globalThis', context)
    vm.runInContext(`${source}\nstart()`, context)
    const onmessage = (context as unknown as { onmessage: (event: { data: unknown }) => void }).onmessage
    onmessage({ data: structuredClone({ type: 'run', ...msg }) })
  })
}
