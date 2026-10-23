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
