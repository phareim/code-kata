import type { Root } from '../java/compose'
import type { World } from '../world/world'
import workerSource from './worker.js?raw'

// A data: URL gives the worker an opaque origin (see worker.js). Built once; every run gets a fresh worker.
const WORKER_URL = `data:text/javascript;charset=utf-8,${encodeURIComponent(workerSource)}`

/** A run that hasn't ended by then is stopped: most likely a loop that never ends. Compiling Java comes before. */
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

/** A run in Java: the roots' types, the task's own types, and how the solution declares each export. */
export interface JavaRun {
  roots: Root[]
  prelude?: string
  expected?: Record<string, string>
}

export interface Problem {
  message: string
  line: number | null
  where: Where | null
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
    /** More of the same: the rest of a compiler's errors. */
    more?: Problem[]
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
  /** Java: fetching the compiler (the first time), compiling, then running. */
  stage?(stage: 'loading' | 'compiling' | 'running'): void
  end(outcome: Outcome): void
}

export class Runner {
  private finish: ((outcome: Outcome) => void) | null = null

  get running(): boolean {
    return this.finish !== null
  }

  /**
   * Runs the Monster class, builds the items from it, then runs the code (empty: only rebuild the items); with a task,
   * then its check. In Java, the class and the code are compiled first.
   */
  run(code: string, classSource: string, world: World, handlers: RunHandlers, task?: TaskRun, java?: JavaRun): void {
    this.stop()
    let worker: Worker | null = null
    let timer = 0
    const started = performance.now()
    const finish = (outcome: Outcome) => {
      if (this.finish !== finish) return
      this.finish = null
      window.clearTimeout(timer)
      worker?.terminate()
      handlers.end(outcome)
    }
    this.finish = finish

    const go = (extra: Record<string, unknown>) => {
      if (this.finish !== finish) return
      handlers.stage?.('running')
      worker = new Worker(WORKER_URL)
      timer = window.setTimeout(() => finish({ kind: 'stopped', reason: 'timeout' }), TIME_LIMIT_MS)
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
      worker.postMessage({ type: 'run', code, classSource, world, task, ...extra })
    }

    if (!java) return go({})

    const compileError = (problems: Problem[]) => finish({
      kind: 'error',
      name: 'Kompileringsfeil',
      ...problems[0],
      compile: true,
      ms: performance.now() - started,
      more: problems.slice(1),
    })
    // The compiler and the bridge load the first time a visitor runs Java (src/java/run.ts).
    import('../java/run')
      .then(({ prepareJava }) => prepareJava(
        { classSource, code, world, exports: task?.exports, roots: java.roots, prelude: java.prelude, expected: java.expected },
        { loading: () => handlers.stage?.('loading'), compiling: () => handlers.stage?.('compiling') },
      ))
      .then(({ payload, errors, missing }) => {
        if (this.finish !== finish) return
        if (!payload) {
          if (missing && task) {
            const decl = java.expected?.[missing] ?? `${missing}(…)`
            const message = /^[A-Z]/.test(missing)
              ? `Fant ikke klassen ${missing}. Skriv \`${decl} { … }\` i koden.`
              : `Fant ikke metoden ${missing}. Skriv \`${decl} { … }\` i koden.`
            handlers.verdict?.({ ok: false, broken: false, message, line: null, where: null })
          }
          return compileError(errors ?? [{ message: 'Koden kompilerer ikke.', line: null, where: null }])
        }
        go({ java: payload })
      })
      .catch((err: unknown) => finish({
        kind: 'error',
        name: 'Java',
        message: `Fikk ikke startet Java-kompilatoren (${err instanceof Error ? err.message : String(err)}). Prøv igjen om litt.`,
        line: null,
        where: null,
        compile: true,
        ms: performance.now() - started,
      }))
  }

  stop(): void {
    this.finish?.({ kind: 'stopped', reason: 'user' })
  }
}
