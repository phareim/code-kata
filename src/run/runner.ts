import type { World } from '../world/world'
import workerSource from './worker.js?raw'

// A data: URL gives the worker an opaque origin (see worker.js). Built once; every run gets a fresh worker.
const WORKER_URL = `data:text/javascript;charset=utf-8,${encodeURIComponent(workerSource)}`

/** A run that hasn't ended by then is stopped: most likely a loop that never ends. */
export const TIME_LIMIT_MS = 10_000

export type Level = 'log' | 'info' | 'warn' | 'error'
/** Which editor a line belongs to: the kata code or the Monster class. */
export type Where = 'kode' | 'klasse'
export interface Entry { level: Level; text: string }

/** A task's check: solved, or what is still wrong; `broken` when the check itself failed. */
export interface Verdict {
  ok: boolean
  message: string
  broken: boolean
  line: number | null
  where: Where | null
}

/** What the worker needs to check a task: the check function's source and the functions the code should declare. */
export interface TaskRun {
  check: string
  exports?: string[]
}

export type Outcome =
  | { kind: 'done'; ms: number }
  | {
    kind: 'error'
    name: string
    message: string
    /** The line in the editor `where` names; both null when the engine doesn't say. */
    line: number | null
    where: Where | null
    compile: boolean
    ms: number
  }
  | { kind: 'stopped'; reason: 'user' | 'timeout' }

export interface RunHandlers {
  output(entries: Entry[]): void
  clear(): void
  /**
   * The items as the code left them, and the frames vis() took on the way (`dropped`: frames past the cap); comes
   * before end() unless the run was stopped or didn't compile.
   */
  world(world: World, frames: World[], dropped: number): void
  /** A task's verdict, after world() and before end(); end() is an error when the code called a missing export. */
  verdict?(verdict: Verdict): void
  end(outcome: Outcome): void
}

export class Runner {
  private finish: ((outcome: Outcome) => void) | null = null

  get running(): boolean {
    return this.finish !== null
  }

  /**
   * Runs the Monster class, builds the items from it, then runs the code (empty: only rebuild the items); with a task,
   * then its check.
   */
  run(code: string, classSource: string, world: World, handlers: RunHandlers, task?: TaskRun): void {
    this.stop()
    const worker = new Worker(WORKER_URL)
    const timer = window.setTimeout(() => finish({ kind: 'stopped', reason: 'timeout' }), TIME_LIMIT_MS)
    const finish = (outcome: Outcome) => {
      if (this.finish !== finish) return
      this.finish = null
      window.clearTimeout(timer)
      worker.terminate()
      handlers.end(outcome)
    }
    this.finish = finish

    worker.onmessage = (event: MessageEvent) => {
      if (this.finish !== finish) return
      const msg = event.data
      switch (msg?.type) {
        case 'console': handlers.output(msg.entries); break
        case 'clear': handlers.clear(); break
        case 'world': handlers.world(msg.world, msg.frames ?? [], msg.dropped ?? 0); break
        case 'verdict': handlers.verdict?.(msg); break
        case 'done': finish({ kind: 'done', ms: msg.ms }); break
        case 'error':
          finish({ kind: 'error', name: msg.name, message: msg.message, line: msg.line, where: msg.where, compile: msg.compile, ms: msg.ms })
          break
      }
    }
    worker.onerror = (event) => {
      event.preventDefault()
      finish({ kind: 'error', name: 'Error', message: event.message || 'Kjøringen stoppet uventet.', line: null, where: null, compile: false, ms: 0 })
    }
    worker.postMessage({ type: 'run', code, classSource, world, task })
  }

  stop(): void {
    this.finish?.({ kind: 'stopped', reason: 'user' })
  }
}
