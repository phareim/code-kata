/*
 * What a task's editor opens with: a comment that names the variables, and the code that runs the answer on the
 * stage, without a skeleton of the answer. The skeleton (the task's scaffold) waits behind the button under hint 1.
 */
import { label } from '../world/world'
import { seeded } from './build'
import type { Task } from './types'

const and = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} og ${names.at(-1)}`)

const lines = new WeakMap<Task, string>()

/** «// Variabelen head er klar til bruk, og monstrene heter A–H.» Every seed gives a task the same roots. */
export function variables(task: Task): string {
  let line = lines.get(task)
  if (line !== undefined) return line
  const world = task.world(seeded(1))
  const roots = world.roots.map((p) => p.key)
  const n = world.items.length
  // Items that vary in number from seed to seed (the letters of a word, a list of 7 or 8) get no last letter. The
  // visitor's seed is random, so look at a few dozen.
  const varies = Array.from({ length: 31 }, (_, i) => i + 2).some((seed) => task.world(seeded(seed)).items.length !== n)
  const letters = !n ? '' : varies ? `${label(0)}, ${label(1)}, ${label(2)} …` : `${label(0)}–${label(n - 1)}`
  if (!roots.length) line = `// Monstrene heter ${letters}.`
  else {
    line = roots.length === 1 ? `// Variabelen ${roots[0]} er klar til bruk` : `// Variablene ${and(roots)} er klare til bruk`
    line += n ? `, og monstrene heter ${letters}.` : '.'
  }
  lines.set(task, line)
  return line
}

/**
 * The scaffold without the skeletons of the task's exports, a declaration running to its closing brace at column 0.
 * The answer to a class task goes in the class, so its code stays whole.
 */
export function runCode(task: Task): string {
  if (task.opening !== undefined) return task.opening.trim()
  if (task.solutionMonster) return task.scaffold.trim()
  const exports = task.exports ?? []
  if (!exports.length) return ''
  const source = task.scaffold.split('\n')
  const kept: string[] = []
  for (let i = 0; i < source.length; i++) {
    const name = /^(?:async\s+)?(?:function\s*\*?\s*|class\s+)([\w$]+)/.exec(source[i])?.[1]
    if (name && exports.includes(name)) {
      if (!source[i].trimEnd().endsWith('}')) while (i < source.length && !source[i].startsWith('}')) i++
      continue
    }
    kept.push(source[i])
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** The code a task opens with, and goes back to on «Start på nytt». */
export function opening(task: Task): string {
  const code = runCode(task)
  const used = (task.exports ?? []).filter((name) => new RegExp(`\\b${name}\\b`).test(code))
  const head = [variables(task)]
  if (used.length) head.push(`// Koden under bruker ${and(used)} når du har skrevet ${used.length > 1 ? 'dem' : 'den'}.`)
  return `${head.join('\n')}\n\n${code ? `${code}\n` : ''}`
}

/** What the button under hint 1 puts in the editor. */
export const scaffolded = (task: Task) => `${variables(task)}\n\n${task.scaffold}`

/** Whether the skeleton adds anything to the opening (a class task's code is all there from the start). */
export const hasScaffold = (task: Task) => runCode(task) !== task.scaffold.trim()
