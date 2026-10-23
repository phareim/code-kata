/*
 * The task bank, in the order it is numbered: by topic, easy to hard within each file as it reads best.
 * A task's id is stored in visitors' progress: never rename one, retire it with `hidden: true`.
 */
import { tasks as grafer } from './grafer'
import { tasks as klassikere } from './klassikere'
import { tasks as lister } from './lister'
import { tasks as objekter } from './objekter'
import { tasks as rutenett } from './rutenett'
import { tasks as rydding } from './rydding'
import { tasks as sortering } from './sortering'
import { tasks as sprak } from './sprak'
import { tasks as stabler } from './stabler'
import { tasks as traer } from './traer'
import type { Task } from './types'

export const ALL_TASKS: Task[] = [
  ...lister,
  ...sortering,
  ...rydding,
  ...stabler,
  ...traer,
  ...grafer,
  ...rutenett,
  ...objekter,
  ...klassikere,
  ...sprak,
]

/** The tasks a visitor sees, numbered from 1 in this order. */
export const TASKS: Task[] = ALL_TASKS.filter((task) => !task.hidden)

const byId = new Map(TASKS.map((task) => [task.id, task]))

export function taskById(id: string): Task | undefined {
  return byId.get(id)
}

export function taskNumber(task: Task): number {
  return TASKS.indexOf(task) + 1
}
