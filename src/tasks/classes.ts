/*
 * The Ting classes tasks start from. The items get the class's fields with their defaults, then the props the task
 * gives them, so each shape has a class with only the pointers it uses.
 */
import { TING_CLASS } from '../starter'

const tingClass = (fields: string[]) => `// Legg til eller ta bort et felt og trykk «Bruk».
class Ting {
${fields.map((f) => `  ${f}\n`).join('')}  constructor(props) { Object.assign(this, props) }
}`

/** value, color, next: a singly linked list. The playground's class. */
export const LIST_TING = TING_CLASS
/** value and color: items in an array, a stack, a queue or on pegs. */
export const PLAIN_TING = tingClass(['value = 0', "color = 'pink'"])
/** prev and next: a doubly linked list. */
export const DOUBLE_TING = tingClass(['value = 0', "color = 'pink'", 'prev = null', 'next = null'])
/** left and right: a binary tree. */
export const TREE_TING = tingClass(['value = 0', "color = 'pink'", 'left = null', 'right = null'])
/** neighbors: a graph. */
export const GRAPH_TING = tingClass(['value = 0', "color = 'pink'", 'neighbors = []'])
