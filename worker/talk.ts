/*
 * «Snakk om det»: a conversation with Claude about a solved task, for a signed-in visitor (README → Talking about a
 * solution). The Worker holds the task's text and reference solution (src/tasks), so the page sends only the task
 * id, the visitor's code and what they write. The conversation is kept on the account (`ProgressStore`), and Claude
 * is only asked about a task the account has solved: the prompt carries the reference solution.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { BetaContentBlock, BetaMessageParam, BetaUsage } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { TASKS } from '../src/tasks/index'
import { LEVELS, TOPICS, type Task } from '../src/tasks/types'
import { MONSTER_CLASS } from '../src/starter'
import { OPENER } from '../src/app/talk'

export const MODEL = 'claude-opus-5-5'
/** Turns per account per day, and what all accounts together may spend a day (USD). */
export const TURNS_PER_DAY = 20
export const USD_PER_DAY = 2
/** Messages in one task's conversation (user and Claude), before it has to start over. */
export const MAX_MESSAGES = 24
const MAX_TEXT = 2000
const MAX_CODE = 64 * 1024

export { OPENER }

/** One line of the conversation as the page shows it. */
export interface Line {
  role: 'user' | 'assistant'
  text: string
}

/** A task's conversation on the account: what the API saw (append-only, thinking blocks and all) and the view. */
export interface Conversation {
  api: BetaMessageParam[]
  view: Line[]
  /** The code and class Claude last saw, so a turn sends them again only when they changed. */
  code: string
  ting: string
}

export const taskFor = (id: unknown): Task | undefined =>
  typeof id === 'string' ? TASKS.find((t) => t.id === id && !t.hidden) : undefined

/** The system prompt: the same for every turn of a task, so it caches. */
export function systemPrompt(task: Task): string {
  const cls = task.monster ?? MONSTER_CLASS
  return `You are a friendly, frank coding mentor inside Kodekata, a site of small JavaScript exercises where pixel monsters stand for the data: linked lists, arrays, stacks, trees, graphs, grids. The visitor has solved the task below and wants to talk about their solution.

Reply in natural Norwegian bokmål; code and identifiers stay as they are. Write like a person talking to someone who is learning: short paragraphs, plain words, a technical term explained once. No headings, no filler, no praise for its own sake. Keep a reply under about 250 words unless the visitor asks for more. Use fenced code blocks for code.

In your first reply:
- say in a sentence or two what their code does and why it works;
- give one to three real alternatives (another algorithm, a built-in, a different trick with the data structure), each with a short code sketch when that helps, and what it trades;
- end with a frank verdict, elegant, fine or clunky, and why: clarity, time and memory, edge cases. If it is clunky, say what would make it cleaner.

The reference solution is one way to solve it, not the answer; the visitor's way may be better. Don't rewrite their whole solution unless they ask. After the first reply, answer what they ask.

How the site runs code: the code is the body of an async function in a Web Worker. The roots (head, items, root, pegs, grid …) are globals; the items are instances of the class below, named by letter on the stage (A is the first item made); vis() takes a snapshot for the playback; console.log prints. A task that asks for functions checks them by name.

Stay with this task, JavaScript and programming. If they ask about something else, say briefly that you are here to talk about the task.

<task>
Title: ${task.title}
Level: ${LEVELS[task.level]} · Topic: ${TOPICS[task.topic]}

${task.text}

Hints the site gives:
${task.hints.map((h) => `- ${h}`).join('\n')}
</task>

<class>
${task.solutionMonster ?? cls}
</class>

<reference_solution>
${task.solution}
</reference_solution>`
}

/** The visitor's next message as the API sees it: their words, and their code when it changed. */
export function userMessage(task: Task, text: string, code: string, ting: string, before: Conversation | null): string {
  const parts = [text]
  if (!before || before.code !== code) parts.push(`<visitor_code>\n${code}\n</visitor_code>`)
  const cls = task.monster ?? MONSTER_CLASS
  if (ting !== (before ? before.ting : cls)) parts.push(`<visitor_class>\n${ting}\n</visitor_class>`)
  return parts.join('\n\n')
}

/** The body of a talk request, checked: null when it is not one. */
export function talkRequest(raw: unknown): { task: Task; text: string; code: string; ting: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const task = taskFor(r.task)
  if (!task || typeof r.code !== 'string' || r.code.length > MAX_CODE) return null
  const ting = typeof r.ting === 'string' && r.ting.length <= MAX_CODE ? r.ting : task.monster ?? MONSTER_CLASS
  const text = typeof r.text === 'string' ? r.text.trim().slice(0, MAX_TEXT) : ''
  return { task, text, code: r.code, ting }
}

/** What a turn cost, at the dearest of the models it may run on (a fallback can land on Opus 5). */
export function costOf(u: Pick<BetaUsage, 'input_tokens' | 'output_tokens' | 'cache_read_input_tokens' | 'cache_creation_input_tokens'>): number {
  return ((u.input_tokens ?? 0) * 5 + (u.cache_creation_input_tokens ?? 0) * 6.25
    + (u.cache_read_input_tokens ?? 0) * 0.5 + (u.output_tokens ?? 0) * 25) / 1e6
}

export const textOf = (content: BetaContentBlock[]) =>
  content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim()

export const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10)

/** One turn, streamed: `onText` gets the text as it comes; resolves with the finished message's content and usage. */
export async function ask(
  apiKey: string,
  task: Task,
  messages: BetaMessageParam[],
  onText: (text: string) => Promise<void>,
  fetchImpl?: typeof fetch,
): Promise<{ content: BetaContentBlock[]; usage: BetaUsage; refused: boolean }> {
  const client = new Anthropic({ apiKey, ...(fetchImpl ? { fetch: fetchImpl } : {}) })
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Chat: little thinking, a quick first word. Thinking stays on (it can't be turned off on this model).
    output_config: { effort: 'low' },
    cache_control: { type: 'ephemeral' },
    system: systemPrompt(task),
    messages,
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') await onText(event.delta.text)
  }
  const final = await stream.finalMessage()
  return { content: final.content, usage: final.usage, refused: final.stop_reason === 'refusal' }
}
