/*
 * The Monster classes tasks start from. The items get the class's fields with their defaults, then the props the
 * task gives them, so each shape has a class with only the pointers it uses.
 */
import { MONSTER_CLASS } from '../starter'

const monsterClass = (fields: string[]) => `// Legg til eller ta bort et felt og trykk «Bruk».
class Monster {
${fields.map((f) => `  ${f}\n`).join('')}  constructor(props) { Object.assign(this, props) }
}`

const VALUE = 'value = 0'
const COLOR = "color = 'pink'"

/** value, color, next: a singly linked list. The playground's class. */
export const LIST_MONSTER = MONSTER_CLASS
/** value and color: items in an array, a stack, a queue or on pegs. */
export const PLAIN_MONSTER = monsterClass([VALUE, COLOR])
/** prev and next: a doubly linked list. */
export const DOUBLE_MONSTER = monsterClass([VALUE, COLOR, 'prev = null', 'next = null'])
/** left and right: a binary tree. */
export const TREE_MONSTER = monsterClass([VALUE, COLOR, 'left = null', 'right = null'])
/** neighbors: a graph. */
export const GRAPH_MONSTER = monsterClass([VALUE, COLOR, 'neighbors = []'])

/*
 * The same shapes without value, for a task that has no use for a number: its items are told apart by letter and
 * colour, and its world leaves value out too (`colored` in build.ts), or the class's default would put it back.
 */
export const COLOR_LIST_MONSTER = monsterClass([COLOR, 'next = null'])
export const COLOR_MONSTER = monsterClass([COLOR])
export const COLOR_DOUBLE_MONSTER = monsterClass([COLOR, 'prev = null', 'next = null'])
export const COLOR_TREE_MONSTER = monsterClass([COLOR, 'left = null', 'right = null'])
export const COLOR_GRAPH_MONSTER = monsterClass([COLOR, 'neighbors = []'])

/*
 * Letters and words: the value is the text under the monster, so it starts as '' rather than 0. A word monster is the
 * same class as a letter monster; its `value` is just longer (the stage shrinks a value over four characters).
 */
const TEXT = "value = ''"

/** value (a letter or a word) and color: items in an array. */
export const TEXT_MONSTER = monsterClass([TEXT, COLOR])
/** value (a letter or a word), color and next: a list. */
export const TEXT_LIST_MONSTER = monsterClass([TEXT, COLOR, 'next = null'])

/*
 * The same classes in Java: fields with their types, and no constructor, so `new Monster()` makes one at its defaults.
 * A field the visitor adds gets its default on every item, as in JavaScript.
 */
const javaClass = (fields: string[]) => `// Legg til eller ta bort et felt og trykk «Bruk».
class Monster {
${fields.map((f) => `    ${f};\n`).join('')}}`

const J_VALUE = 'int value = 0'
const J_COLOR = 'String color = "pink"'
const J_TEXT = 'String value = ""'
const J_NEXT = 'Monster next'
const J_PREV = 'Monster prev'
const J_TREE = ['Monster left', 'Monster right']
const J_GRAPH = 'List<Monster> neighbors = new ArrayList<>()'

/** The playground's class in Java: value, color, next. */
export const JAVA_LIST_MONSTER = javaClass([J_VALUE, J_COLOR, J_NEXT])

/** Each class above, in Java. */
export const JAVA_CLASSES = new Map<string, string>([
  [LIST_MONSTER, JAVA_LIST_MONSTER],
  [PLAIN_MONSTER, javaClass([J_VALUE, J_COLOR])],
  [DOUBLE_MONSTER, javaClass([J_VALUE, J_COLOR, J_PREV, J_NEXT])],
  [TREE_MONSTER, javaClass([J_VALUE, J_COLOR, ...J_TREE])],
  [GRAPH_MONSTER, javaClass([J_VALUE, J_COLOR, J_GRAPH])],
  [COLOR_LIST_MONSTER, javaClass([J_COLOR, J_NEXT])],
  [COLOR_MONSTER, javaClass([J_COLOR])],
  [COLOR_DOUBLE_MONSTER, javaClass([J_COLOR, J_PREV, J_NEXT])],
  [COLOR_TREE_MONSTER, javaClass([J_COLOR, ...J_TREE])],
  [COLOR_GRAPH_MONSTER, javaClass([J_COLOR, J_GRAPH])],
  [TEXT_MONSTER, javaClass([J_TEXT, J_COLOR])],
  [TEXT_LIST_MONSTER, javaClass([J_TEXT, J_COLOR, J_NEXT])],
])
