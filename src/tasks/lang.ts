/*
 * The languages a task can be done in, and a task as it reads in one: JavaScript is the task itself, Java its `java`
 * part (java.ts). A language is a binding of the same task: the items, the check and the prose stay the task's own.
 */
import { MONSTER_CLASS } from '../starter'
import { javaHasScaffold, javaHints, javaMonster, javaOpening, javaScaffolded, javaText } from './java'
import { hasScaffold, opening, scaffolded } from './opening'
import type { Task } from './types'

export type Lang = 'js' | 'java'
export const LANGS: Lang[] = ['js', 'java']
export const LANG_NAMES: Record<Lang, string> = { js: 'JavaScript', java: 'Java' }

export const isLang = (v: unknown): v is Lang => v === 'js' || v === 'java'

/** Whether a task can be done in a language: every task in JavaScript, the ones with a `java` part in Java. */
export const hasLang = (task: Task, lang: Lang) => lang === 'js' || task.java !== undefined

export const openingIn = (task: Task, lang: Lang) => (lang === 'java' ? javaOpening(task) : opening(task))
export const scaffoldedIn = (task: Task, lang: Lang) => (lang === 'java' ? javaScaffolded(task) : scaffolded(task))
export const hasScaffoldIn = (task: Task, lang: Lang) => (lang === 'java' ? javaHasScaffold(task) : hasScaffold(task))
export const solutionIn = (task: Task, lang: Lang) => (lang === 'java' ? task.java!.solution : task.solution)
export const solutionMonsterIn = (task: Task, lang: Lang) => (lang === 'java' ? task.java!.solutionMonster : task.solutionMonster)
export const monsterIn = (task: Task, lang: Lang) => (lang === 'java' ? javaMonster(task) : task.monster ?? MONSTER_CLASS)
export const textIn = (task: Task, lang: Lang) => (lang === 'java' ? javaText(task) : task.text)
export const hintsIn = (task: Task, lang: Lang) => (lang === 'java' ? javaHints(task) : task.hints)
