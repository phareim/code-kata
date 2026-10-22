/*
 * Every task in the bank, through the real worker: the solution passes on several start worlds, the starter does
 * not, and neither breaks the check.
 */
import { describe, expect, it } from 'vitest'
import { TING_CLASS } from '../src/starter'
import { seeded } from '../src/tasks/build'
import { ALL_TASKS, TASKS } from '../src/tasks/index'
import { LEVELS, TOPICS, type Task } from '../src/tasks/types'
import { runWorker } from './harness'

// Seeds far apart: neighbouring seeds give worlds that look alike.
const SEEDS = [1, 77, 4242]

function run(task: Task, code: string, ting: string, seed: number) {
  return runWorker({
    code,
    classSource: ting,
    world: task.world(seeded(seed)),
    task: { check: String(task.check), exports: task.exports },
  })
}

describe('the bank', () => {
  it('has unique ids that are slugs', () => {
    const ids = ALL_TASKS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('gives every task a title, a text, hints, a level and a topic', () => {
    for (const task of TASKS) {
      expect(task.title.length, task.id).toBeGreaterThan(2)
      expect(task.text.length, task.id).toBeGreaterThan(40)
      expect(task.hints.length, task.id).toBeGreaterThanOrEqual(2)
      expect(Object.keys(LEVELS), task.id).toContain(task.level)
      expect(Object.keys(TOPICS), task.id).toContain(task.topic)
    }
  })

  it('writes every check as a function expression the worker can compile', () => {
    for (const task of TASKS) {
      const source = String(task.check)
      expect(() => new Function(`return (${source})`)(), task.id).not.toThrow()
      expect(source, task.id).not.toMatch(/^check\s*\(/)
    }
  })

  it('makes the same start for the same seed', () => {
    for (const task of TASKS) expect(task.world(seeded(5)), task.id).toEqual(task.world(seeded(5)))
  })
})

describe.each(TASKS.map((task) => [task.id, task] as const))('%s', (_, task) => {
  const ting = task.ting ?? TING_CLASS

  it('is solved by its solution', async () => {
    for (const seed of SEEDS) {
      const result = await run(task, task.solution, task.solutionTing ?? ting, seed)
      expect(result.end, `seed ${seed}: ${JSON.stringify(result.end)}`).toMatchObject({ type: 'done' })
      expect(result.verdict, `seed ${seed}`).not.toBeNull()
      expect(result.verdict!.message, `seed ${seed}`).toBe('')
      expect(result.verdict!.ok).toBe(true)
    }
  })

  it('is not solved by its starter, and says why', async () => {
    for (const seed of SEEDS) {
      const result = await run(task, task.starter, ting, seed)
      if (result.end.type === 'error') continue
      expect(result.end.type, `seed ${seed}`).toBe('done')
      expect(result.verdict, `seed ${seed}`).not.toBeNull()
      expect(result.verdict!.broken, `seed ${seed}: ${result.verdict!.message}`).toBe(false)
      expect(result.verdict!.ok, `seed ${seed}`).toBe(false)
      expect(result.verdict!.message.length).toBeGreaterThan(5)
    }
  })
})
