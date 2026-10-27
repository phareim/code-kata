/*
 * A topic's tasks in Java, through the real compiler and worker: the solution passes on several start worlds, the
 * opening and the scaffold don't, and say why. One file per topic (java-<topic>.test.ts), so the topics compile side
 * by side; what they compiled is kept (java.ts), so only changed code compiles again.
 */
import { describe, expect, it } from 'vitest'
import { seeded } from '../src/tasks/build'
import { javaExpected, javaMonster, javaOpening, javaRoots, javaScaffolded } from '../src/tasks/java'
import type { Task } from '../src/tasks/types'
import { runJava } from './java'

const SEEDS = [1, 77, 4242]
const TIMEOUT = 120_000

export function runJavaTask(task: Task, code: string, cls: string, seed: number) {
  const world = task.world(seeded(seed))
  return runJava({
    classSource: cls,
    code,
    roots: javaRoots(task),
    items: world.items.length,
    prelude: task.java?.prelude,
    exports: task.exports,
    world,
    task: { check: String(task.check), exports: task.exports },
    expected: javaExpected(task),
  })
}

const errors = (run: Awaited<ReturnType<typeof runJavaTask>>) =>
  JSON.stringify(run.compiled.ok ? run.end : run.compiled.diagnostics.map((d) => `${d.line}: ${d.message}`))

export function javaSuite(tasks: Task[]): void {
  const inJava = tasks.filter((task) => task.java && !task.hidden)
  describe.each(inJava.map((task) => [task.id, task] as const))('%s in Java', (_, task) => {
    const cls = javaMonster(task)

    it('is solved by its solution', async () => {
      for (const seed of SEEDS) {
        const run = await runJavaTask(task, task.java!.solution, task.java!.solutionMonster ?? cls, seed)
        expect(run.end, `seed ${seed}: ${errors(run)}`).toMatchObject({ type: 'done' })
        expect(run.verdict, `seed ${seed}`).not.toBeNull()
        expect(run.verdict!.message, `seed ${seed}`).toBe('')
        expect(run.verdict!.ok).toBe(true)
      }
    }, TIMEOUT)

    it('is not solved by its opening, and says why', async () => {
      for (const seed of SEEDS) {
        const run = await runJavaTask(task, javaOpening(task), cls, seed)
        // An export the opening calls and the code has yet to declare: the page says to write it (runner.ts).
        if (!run.compiled.ok) {
          const missing = run.compiled.diagnostics.some((d) => (task.exports ?? []).some((name) => d.message?.includes(name)))
          expect(missing, `seed ${seed}: ${errors(run)}`).toBe(true)
          continue
        }
        if (run.end.type === 'error') continue
        expect(run.verdict, `seed ${seed}: ${JSON.stringify(run.end)}`).not.toBeNull()
        expect(run.verdict!.broken, `seed ${seed}: ${run.verdict!.message}`).toBe(false)
        expect(run.verdict!.ok, `seed ${seed}`).toBe(false)
        expect(run.verdict!.message.length).toBeGreaterThan(5)
      }
    }, TIMEOUT)

    it('is not solved by its scaffold, compiles, and says why', async () => {
      for (const seed of SEEDS) {
        const run = await runJavaTask(task, javaScaffolded(task), cls, seed)
        expect(run.compiled.ok, `seed ${seed}: ${errors(run)}`).toBe(true)
        if (run.end.type === 'error') continue
        expect(run.end.type, `seed ${seed}`).toBe('done')
        expect(run.verdict, `seed ${seed}`).not.toBeNull()
        expect(run.verdict!.broken, `seed ${seed}: ${run.verdict!.message}`).toBe(false)
        expect(run.verdict!.ok, `seed ${seed}`).toBe(false)
        expect(run.verdict!.message.length).toBeGreaterThan(5)
      }
    }, TIMEOUT)
  })
}
