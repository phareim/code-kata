/*
 * The Monster classes tasks start from. The items get the class's fields with their defaults, then the props the
 * task gives them, so each shape has a class with only the pointers it uses.
 */
import { MONSTER_CLASS } from '../starter'

const monsterClass = (fields: string[]) => `// Legg til eller ta bort et felt og trykk «Bruk».
class Monster {
${fields.map((f) => `  ${f}\n`).join('')}  constructor(props) { Object.assign(this, props) }
}`

/** value, color, next: a singly linked list. The playground's class. */
export const LIST_MONSTER = MONSTER_CLASS
/** value and color: items in an array, a stack, a queue or on pegs. */
export const PLAIN_MONSTER = monsterClass(['value = 0', "color = 'pink'"])
/** prev and next: a doubly linked list. */
export const DOUBLE_MONSTER = monsterClass(['value = 0', "color = 'pink'", 'prev = null', 'next = null'])
/** left and right: a binary tree. */
export const TREE_MONSTER = monsterClass(['value = 0', "color = 'pink'", 'left = null', 'right = null'])
/** neighbors: a graph. */
export const GRAPH_MONSTER = monsterClass(['value = 0', "color = 'pink'", 'neighbors = []'])
