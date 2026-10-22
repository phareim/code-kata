import workerSource from './worker.js?raw'

// A data: URL gives the worker an opaque origin (see worker.js). Built once; every run gets a fresh worker.
const WORKER_URL = `data:text/javascript;charset=utf-8,${encodeURIComponent(workerSource)}`

/** A run that hasn't ended by then is stopped: most likely a loop that never ends. */
export const TIME_LIMIT_MS = 10_000

export type Level = 'log' | 'info' | 'warn' | 'error'
export interface Entry { level: Level; text: string }

export type Outcome =
  | { kind: 'done'; ms: number }
  | { kind: 'error'; name: string; message: string; line: number | null; compile: boolean; ms: number }
  | { kind: 'stopped'; reason: 'user' | 'timeout' }

export interface RunHandlers {
  output(entries: Entry[]): void
  clear(): void
  end(outcome: Outcome): void
}

export class Runner {
  private finish: ((outcome: Outcome) => void) | null = null

  get running(): boolean {
    return this.finish !== null
  }

  run(code: string, handlers: RunHandlers): void {
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
        case 'done': finish({ kind: 'done', ms: msg.ms }); break
        case 'error': finish({ kind: 'error', name: msg.name, message: msg.message, line: msg.line, compile: msg.compile, ms: msg.ms }); break
      }
    }
    worker.onerror = (event) => {
      event.preventDefault()
      finish({ kind: 'error', name: 'Error', message: event.message || 'Kjøringen stoppet uventet.', line: null, compile: false, ms: 0 })
    }
    worker.postMessage({ type: 'run', code })
  }

  stop(): void {
    this.finish?.({ kind: 'stopped', reason: 'user' })
  }
}
