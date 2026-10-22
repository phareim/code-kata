/*
 * docs/tasks.md ends with a table of every task, made from src/tasks/. This test fails when the table is out of
 * date; UPDATE_DOCS=1 rewrites it.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { TASKS, taskNumber } from '../src/tasks/index'
import { LEVELS, TOPICS, type Level, type Topic } from '../src/tasks/types'

const FILE = new URL('../docs/tasks.md', import.meta.url)
const START = '<!-- tasks:start -->'
const END = '<!-- tasks:end -->'

function table(): string {
  const levels = (Object.keys(LEVELS) as Level[]).map((level) => `${TASKS.filter((t) => t.level === level).length} ${level}`)
  const lines = [`${TASKS.length} tasks: ${levels.join(', ')}.`, '']
  for (const topic of Object.keys(TOPICS) as Topic[]) {
    const tasks = TASKS.filter((t) => t.topic === topic)
    if (!tasks.length) continue
    lines.push(`### ${TOPICS[topic]} (${tasks.length})`, '', '| # | Id | Title | Level | Source |', '|---|---|---|---|---|')
    for (const task of tasks) {
      const source = task.source ? `[link](${task.source})` : ''
      lines.push(`| ${taskNumber(task)} | \`${task.id}\` | ${task.title} | ${task.level} | ${source} |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

it('lists every task in docs/tasks.md', () => {
  const doc = readFileSync(FILE, 'utf8')
  const head = doc.slice(0, doc.indexOf(START) + START.length)
  const tail = doc.slice(doc.indexOf(END))
  const want = `${head}\n${table()}\n${tail}`
  if (process.env.UPDATE_DOCS) {
    writeFileSync(FILE, want)
    return
  }
  expect(doc, 'docs/tasks.md is out of date: UPDATE_DOCS=1 npx vitest run test/docs.test.ts').toBe(want)
})
