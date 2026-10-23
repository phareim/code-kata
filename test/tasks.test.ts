/*
 * Every task in the bank, through the real worker: the solution passes on several start worlds, the opening and the
 * scaffold behind hint 1 do not, and none of them breaks the check.
 */
import { describe, expect, it } from 'vitest'
import { MONSTER_CLASS } from '../src/starter'
import { seeded } from '../src/tasks/build'
import { ALL_TASKS, TASKS } from '../src/tasks/index'
import { hasScaffold, opening, scaffolded, variables } from '../src/tasks/opening'
import { LEVELS, TOPICS, type Task } from '../src/tasks/types'
import { runWorker } from './harness'

// Seeds far apart: neighbouring seeds give worlds that look alike.
const SEEDS = [1, 77, 4242]

function run(task: Task, code: string, cls: string, seed: number) {
  return runWorker({
    code,
    classSource: cls,
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

  it('gives the items a value exactly when the class has one', () => {
    // A class with value over items without puts 0 under every monster; a task with no use for a number has neither.
    for (const task of TASKS) {
      const field = /^\s*value\s*=/m.test(task.monster ?? MONSTER_CLASS)
      for (const seed of SEEDS) {
        for (const item of task.world(seeded(seed)).items) {
          expect(item.props.some((p) => p.key === 'value'), task.id).toBe(field)
        }
      }
    }
  })

  it('gives every seed the same roots, which the opening names', () => {
    for (const task of TASKS) {
      const keys = task.world(seeded(SEEDS[0])).roots.map((p) => p.key)
      for (const seed of SEEDS) expect(task.world(seeded(seed)).roots.map((p) => p.key), task.id).toEqual(keys)
      for (const key of keys) expect(variables(task), task.id).toMatch(new RegExp(`\\b${key}\\b`))
    }
  })

  it('names the monsters A–H only when every seed has that many; a word of letters gets A, B, C …', () => {
    for (const task of TASKS) {
      const counts = new Set(SEEDS.map((seed) => task.world(seeded(seed)).items.length))
      const range = /heter A–([A-Z]+)\./.exec(variables(task))
      if (range) expect(counts.size, task.id).toBe(1)
    }
    expect(variables(TASKS.find((t) => t.id === 'les-beskjeden')!)).toContain('monstrene heter A, B, C …')
  })

  it('opens without the skeletons of the exports, which the scaffold has', () => {
    for (const task of TASKS) {
      for (const name of task.exports ?? []) {
        const declared = new RegExp(`^(function|class)\\s+${name}\\b`, 'm')
        expect(task.scaffold, `${task.id}: ${name}`).toMatch(declared)
        expect(opening(task), `${task.id}: ${name}`).not.toMatch(declared)
      }
      if (!task.solutionMonster) expect(hasScaffold(task), task.id).toBe(true)
    }
  })
})

describe.each(TASKS.map((task) => [task.id, task] as const))('%s', (_, task) => {
  const cls = task.monster ?? MONSTER_CLASS

  it('is solved by its solution', async () => {
    for (const seed of SEEDS) {
      const result = await run(task, task.solution, task.solutionMonster ?? cls, seed)
      expect(result.end, `seed ${seed}: ${JSON.stringify(result.end)}`).toMatchObject({ type: 'done' })
      expect(result.verdict, `seed ${seed}`).not.toBeNull()
      expect(result.verdict!.message, `seed ${seed}`).toBe('')
      expect(result.verdict!.ok).toBe(true)
    }
  })

  // A class saved before the rename (2026-10-23) says Ting: the code, which says Monster, runs with it all the same.
  it('is solved with the class named Ting, as visitors may have it saved', async () => {
    const old = (task.solutionMonster ?? cls).replace(/\bclass Monster\b/, 'class Ting')
    expect(old).toMatch(/\bclass Ting\b/)
    const result = await run(task, task.solution, old, SEEDS[0])
    expect(result.end, JSON.stringify(result.end)).toMatchObject({ type: 'done' })
    expect(result.verdict!.message).toBe('')
  })

  it('is not solved by its opening, and says why', async () => {
    for (const seed of SEEDS) {
      const result = await run(task, opening(task), cls, seed)
      // A call to an export the code has yet to declare gets a verdict too; another error (a class task's code
      // calling a method the class lacks) is the code's own.
      if (result.end.type === 'error' && result.end.name !== 'ReferenceError') continue
      expect(result.verdict, `seed ${seed}: ${JSON.stringify(result.end)}`).not.toBeNull()
      expect(result.verdict!.broken, `seed ${seed}: ${result.verdict!.message}`).toBe(false)
      expect(result.verdict!.ok, `seed ${seed}`).toBe(false)
      expect(result.verdict!.message.length).toBeGreaterThan(5)
    }
  })

  it('is not solved by its scaffold, and says why', async () => {
    for (const seed of SEEDS) {
      const result = await run(task, scaffolded(task), cls, seed)
      if (result.end.type === 'error') continue
      expect(result.end.type, `seed ${seed}`).toBe('done')
      expect(result.verdict, `seed ${seed}`).not.toBeNull()
      expect(result.verdict!.broken, `seed ${seed}: ${result.verdict!.message}`).toBe(false)
      expect(result.verdict!.ok, `seed ${seed}`).toBe(false)
      expect(result.verdict!.message.length).toBeGreaterThan(5)
    }
  })
})
