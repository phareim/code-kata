/*
 * A task in Java: its class, its roots with their types, what the editor opens with, and its text and hints with the
 * code in them as Java says it. The items, the check and the prose are the task's own (types.ts, JavaTask).
 */
import type { Root } from '../java/compose'
import { codeMembers } from '../java/parse'
import { MONSTER_CLASS } from '../starter'
import type { Prop } from '../world/world'
import { seeded } from './build'
import { JAVA_CLASSES, JAVA_LIST_MONSTER } from './classes'
import { variables } from './opening'
import type { Task } from './types'

/** The class a task's items are made of, in Java. */
export function javaMonster(task: Task): string {
  return task.java?.monster ?? JAVA_CLASSES.get(task.monster ?? MONSTER_CLASS) ?? JAVA_LIST_MONSTER
}

/** A root's type from how it starts: a monster, a row of them, a grid of colours, a word. */
function typeOf(p: Prop): string {
  if (p.ref !== undefined) return 'Monster'
  if (p.list) return p.list.some((q) => q.list || (Array.isArray(q.raw) && !q.raw.length)) ? 'List<List<Monster>>' : 'List<Monster>'
  const v = p.raw
  if (v === null || v === undefined) return 'Monster'
  if (typeof v === 'string') return 'String'
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'double'
  if (typeof v === 'boolean') return 'boolean'
  if (Array.isArray(v)) {
    if (!v.length) return 'List<Monster>'
    if (v.every(Array.isArray)) return v.flat().every((x) => typeof x === 'number') ? 'int[][]' : 'String[][]'
    if (v.every((x) => typeof x === 'number')) return 'int[]'
    if (v.every((x) => typeof x === 'string')) return 'List<String>'
  }
  return 'Object'
}

const roots = new WeakMap<Task, Root[]>()

/** The roots and their types; every seed gives a task the same roots (tasks.test.ts). */
export function javaRoots(task: Task): Root[] {
  let found = roots.get(task)
  if (!found) {
    found = task.world(seeded(1)).roots.map((p) => ({ name: p.key, type: task.java?.roots?.[p.key] ?? typeOf(p) }))
    roots.set(task, found)
  }
  return found
}

// At column 0 only: an indented line is inside a declaration (a call in main), not one.
const DECLARATION = /^(?=\S)(?:(?:public|protected|private|static|final|abstract|sealed)\s+)*(?:(?:class|record|interface|enum)\s+([\w$]+)|(?:<[^>]*>\s*)?[\w$.<>[\], ?]+?\s+([\w$]+)\s*\()/

/**
 * The scaffold without the skeletons of the exports, a declaration running from column 0 to its closing brace at
 * column 0; the answer to a class task goes in the class, so its code stays whole.
 */
export function javaRunCode(task: Task): string {
  const java = task.java!
  if (java.opening !== undefined) return java.opening.trim()
  if (java.solutionMonster) return java.scaffold.trim()
  const exports = task.exports ?? []
  if (!exports.length) return MAIN
  const source = java.scaffold.split('\n')
  const kept: string[] = []
  for (let i = 0; i < source.length; i++) {
    const m = DECLARATION.exec(source[i])
    const name = m && (m[1] ?? m[2])
    if (name && exports.includes(name)) {
      if (!source[i].trimEnd().endsWith('}')) while (i < source.length && !source[i].startsWith('}')) i++
      continue
    }
    kept.push(source[i])
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** The place for code that isn't in a method of its own: `void main()`, which runs it. */
const MAIN = 'void main() {\n\n}'

const and = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} og ${names.at(-1)}`)

/** The code a task opens with in Java, and goes back to on «Start på nytt». */
export function javaOpening(task: Task): string {
  const code = javaRunCode(task)
  const used = (task.exports ?? []).filter((name) => new RegExp(`\\b${name}\\b`).test(code))
  const head = [variables(task)]
  if (used.length) head.push(`// Koden under bruker ${and(used)} når du har skrevet ${used.length > 1 ? 'dem' : 'den'}.`)
  return `${head.join('\n')}\n\n${code ? `${code}\n` : ''}`
}

export const javaScaffolded = (task: Task) => `${variables(task)}\n\n${task.java!.scaffold}`

export const javaHasScaffold = (task: Task) => javaRunCode(task) !== task.java!.scaffold.trim()

/** How the solution declares each export, for «Fant ikke metoden …»: `int count(Monster head)`. */
export function javaExpected(task: Task): Record<string, string> {
  const members = codeMembers(task.java?.solution ?? '')
  const out: Record<string, string> = {}
  for (const name of task.exports ?? []) {
    const m = members.methods.find((x) => x.name === name)
    const c = members.classes.find((x) => x.name === name)
    if (m) out[name] = `${m.isStatic ? 'static ' : ''}${m.ret} ${name}(${m.params.map((p) => `${p.type} ${p.name}`).join(', ')})`
    else if (c) out[name] = `${c.kind} ${name}`
  }
  return out
}

/** The code in backticks as the task says it in Java. */
function inJava(text: string, code: Record<string, string> | undefined): string {
  return code ? text.replace(/`([^`]+)`/g, (whole, span: string) => (code[span] !== undefined ? `\`${code[span]}\`` : whole)) : text
}

export const javaText = (task: Task) => task.java?.text ?? inJava(task.text, task.java?.code)

export const javaHints = (task: Task) => task.java?.hints ?? task.hints.map((hint) => inJava(hint, task.java?.code))
