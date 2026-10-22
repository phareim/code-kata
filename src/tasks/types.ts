/*
 * A task: what the blobs ask for, how they start, and how the worker checks the answer. The check runs in the
 * worker as source text (String(check)), so it must be a self-contained arrow function: it can use its argument `t`
 * and JavaScript's globals, nothing from this module or any other.
 */
import type { ViewKind } from '../stage/stage'
import type { World } from '../world/world'

export type Level = 'lett' | 'middels' | 'vanskelig'
export type Topic = 'lister' | 'sortering' | 'rydding' | 'stabler' | 'trær' | 'grafer' | 'rutenett' | 'objekter' | 'klassikere'

export const LEVELS: Record<Level, string> = { lett: 'Lett', middels: 'Middels', vanskelig: 'Vanskelig' }
export const TOPICS: Record<Topic, string> = {
  lister: 'Lister',
  sortering: 'Sortering',
  rydding: 'Rydding og flytting',
  stabler: 'Stabler og køer',
  trær: 'Trær',
  grafer: 'Grafer',
  rutenett: 'Rutenett',
  objekter: 'Objekter og klassen',
  klassikere: 'Klassikere',
}

/** An item as a check sees it. */
export interface Node {
  value: any
  color: any
  next?: Node | null
  prev?: Node | null
  left?: Node | null
  right?: Node | null
  neighbors?: Node[]
  [key: string]: any
}

/** The argument a check gets; the worker builds it (worker.js, «A task's check»). */
export interface Check {
  /** The roots as the code left them: t.head, t.items, t.root … */
  [root: string]: any
  /** The items the run started with (A, B …), the same objects the code had. */
  slots: Node[]
  /** A plain copy of how the run started: { slots, head, items … }. */
  start: { slots: Node[]; [root: string]: any }
  /** The lines the code printed. */
  out: string[]
  Ting: any
  /** A function or class the code declared (listed in the task's exports); an error in it counts as the code's. */
  fn(name: string): any
  /** The live item a copy in t.start stands for. */
  live(copy: Node | null | undefined): Node | null
  /** The items in the order a root held them at the start (an array's elements, or a list along key). */
  before(root?: string, key?: string): Node[]
  /** The nodes from node along key ('next'); null when it loops or meets something that isn't an object. */
  chain(node: Node | null | undefined, key?: string): Node[] | null
  values(node: Node | null | undefined, key?: string): any[] | null
  /** A new list of Ting with these values; its head. */
  list(values: any[], colors?: string[]): Node | null
  ting(props: Record<string, unknown>): Node
  /** A new tree of Ting from [value, left, right]; a bare value is a leaf. */
  tree(spec: unknown): Node | null
  same(a: unknown, b: unknown): boolean
  /** Text for a message: an item by its letter, strings quoted. */
  show(v: unknown): string
  shuffle<T>(list: T[]): T[]
}

export type CheckResult = true | string

export interface Task {
  /** Stable forever: progress is stored by it. Retire a task with `hidden`, never rename. */
  id: string
  title: string
  level: Level
  topic: Topic
  /** Paragraphs split by a blank line; `code` in backticks; lines starting with "- " make a list. */
  text: string
  hints: string[]
  /** How the items start. `random` is seeded: «Nye» rolls a new seed, and the tests are repeatable. */
  world: (random: () => number) => World
  /** The class the items are built from (the list Ting when left out). */
  ting?: string
  starter: string
  solution: string
  /** The class the solution needs, when the task is about the class. */
  solutionTing?: string
  check: (t: Check) => CheckResult | Promise<CheckResult>
  /** Functions the code must declare; the check reaches them with t.fn(name). */
  exports?: string[]
  /** A view for a root whose shape doesn't say which (stage.ts). */
  views?: Record<string, ViewKind>
  /** Where the idea came from, when it has a clear origin. */
  source?: string
  hidden?: boolean
}
