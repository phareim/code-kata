/*
 * A task: what the blobs ask for, how they start, and how the worker checks the answer. The check runs in the
 * worker as source text (String(check)), so it must be a self-contained arrow function: it can use its argument `t`
 * and JavaScript's globals, nothing from this module or any other.
 */
import type { ViewKind } from '../stage/stage'
import type { World } from '../world/world'

export type Level = 'lett' | 'middels' | 'vanskelig'
export type Topic = 'lister' | 'sortering' | 'rydding' | 'stabler' | 'trær' | 'grafer' | 'rutenett' | 'objekter' | 'klassikere' | 'språk'

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
  språk: 'Språk',
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
  /**
   * The language the code is in. The items are the same either way (in Java, mirrors of the Java objects), but a
   * check that watches how the code works (a getter that counts reads, a ban on Array.prototype.sort) can only do so
   * in JavaScript.
   */
  lang: 'js' | 'java'
  /** The roots as the code left them: t.head, t.items, t.root … */
  [root: string]: any
  /** The items the run started with (A, B …), the same objects the code had. */
  slots: Node[]
  /** A plain copy of how the run started: { slots, head, items … }. */
  start: { slots: Node[]; [root: string]: any }
  /** The lines the code printed. */
  out: string[]
  /** The class the items are made of. */
  Monster: any
  /** A function or class the code declared (listed in the task's exports); an error in it counts as the code's. */
  fn(name: string): any
  /** The live item a copy in t.start stands for. */
  live(copy: Node | null | undefined): Node | null
  /** The items in the order a root held them at the start (an array's elements, or a list along key). */
  before(root?: string, key?: string): Node[]
  /** The nodes from node along key ('next'); null when it loops or meets something that isn't an object. */
  chain(node: Node | null | undefined, key?: string): Node[] | null
  values(node: Node | null | undefined, key?: string): any[] | null
  /** A new list of Monster with these values; its head. */
  list(values: any[], colors?: string[]): Node | null
  /** A new Monster with these props. */
  monster(props: Record<string, unknown>): Node
  /** A new tree of Monster from [value, left, right]; a bare value is a leaf. */
  tree(spec: unknown): Node | null
  same(a: unknown, b: unknown): boolean
  /** Text for a message: an item by its letter, strings quoted. */
  show(v: unknown): string
  shuffle<T>(list: T[]): T[]
}

export type CheckResult = true | string

/**
 * A task in Java (src/tasks/java.ts): the code it opens with, its skeleton and its solution, and how its text and hints
 * read in Java. The check, the items and the prose are the task's own.
 */
export interface JavaTask {
  scaffold: string
  solution: string
  /** As the task's `opening`: the code under the comment, when the scaffold's rest is part of the answer. */
  opening?: string
  /** The class, when it isn't the Java version of the task's JavaScript class (classes.ts, JAVA_CLASSES). */
  monster?: string
  solutionMonster?: string
  /** Types the task gives the code: a record a method returns, the ant's class. */
  prelude?: string
  /** A root's type, when its start doesn't tell (an empty row, null, an object): { stack: 'List<Monster>' }. */
  roots?: Record<string, string>
  /** The code in backticks in the text and the hints, as it reads in Java: { 'while (node)': 'while (node != null)' }. */
  code?: Record<string, string>
  /** The text or the hints, whole, where replacing the code in them isn't enough. */
  text?: string
  hints?: string[]
}

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
  /** The class the items are built from (the list Monster when left out). */
  monster?: string
  /** A skeleton of the answer, which the button under hint 1 puts in the editor. The editor opens with less (opening.ts). */
  scaffold: string
  /**
   * The code under the opening comment, when opening.ts takes the wrong part of the scaffold: it keeps what runs the
   * exported functions on the stage, or all of it when the answer goes in the class.
   */
  opening?: string
  solution: string
  /** The class the solution needs, when the task is about the class. */
  solutionMonster?: string
  check: (t: Check) => CheckResult | Promise<CheckResult>
  /** Functions the code must declare; the check reaches them with t.fn(name). */
  exports?: string[]
  /** A view for a root whose shape doesn't say which (stage.ts). */
  views?: Record<string, ViewKind>
  /** Where the idea came from, when it has a clear origin. */
  source?: string
  /** The task in Java; a task without it is in JavaScript only. */
  java?: JavaTask
  hidden?: boolean
}
