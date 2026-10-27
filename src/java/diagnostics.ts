/*
 * What javac says, in the visitor's terms: each error on its line in the class editor or the code, a call to an
 * export the code has yet to declare as the task's «Fant ikke metoden …», and an error in the bridge (which the code
 * can only cause by leaving a brace open or closing one too many) as that.
 */
import type { Composed } from './compose'

export interface Diagnostic { severity: string | null; line: number | null; message: string | null }
export interface JavaError { message: string; line: number | null; where: 'kode' | 'klasse' | null }

/** A line of the source as a line in the class editor or the code (worker.js has the same, placeJava). */
export function place(composed: Composed, line: number | null): { line: number | null; where: 'kode' | 'klasse' | null } {
  const { classFrom, classTo, codeFrom, codeTo } = composed.lines
  if (line === null || line < 1) return { line: null, where: null }
  if (line >= classFrom && line <= classTo) return { line: line - classFrom + 1, where: 'klasse' }
  if (line >= codeFrom && line <= codeTo) return { line: line - codeFrom + 1, where: 'kode' }
  return { line: null, where: null }
}

/** javac's message on one line, without the location (always the code's class) and with the bridge's names out. */
function tidy(message: string): string {
  return message
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^location:/.test(l))
    .join(' · ')
    .replace(/\bMain\.KataGen\b|\bKataWorld\b/g, 'Main')
    .replace(/\s+/g, ' ')
}

function braces(code: string): number {
  // Close enough: strings and comments with braces in them are rare in a kata.
  const bare = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])'/g, '')
  let depth = 0
  for (const c of bare) depth += c === '{' ? 1 : c === '}' ? -1 : 0
  return depth
}

export interface Explained {
  errors: JavaError[]
  /** An export the code calls before declaring it: the verdict says to write it. */
  missing: string | null
}

export function explain(composed: Composed, diagnostics: Diagnostic[], code: string, classSource: string, exports: string[] = []): Explained {
  const errors: JavaError[] = []
  let missing: string | null = null
  let outside = false
  for (const d of diagnostics) {
    if (d.severity !== null && d.severity !== 'error' && d.severity !== 'ERROR') continue
    const text = String(d.message ?? 'kompilerer ikke')
    const at = place(composed, typeof d.line === 'number' ? d.line : null)
    const symbol = /symbol:\s+(?:method|class|variable)\s+([\w$]+)/.exec(text)?.[1]
    if (symbol && exports.includes(symbol) && at.where === 'kode') missing ??= symbol
    if (at.where === null) {
      outside = true
      continue
    }
    errors.push({ message: tidy(text), ...at })
  }
  if (!errors.length && outside) {
    const open = braces(code)
    const cls = braces(classSource)
    const message = open || cls
      ? `Klammeparentesene går ikke opp: ${Math.abs(open || cls)} ${(open || cls) > 0 ? '{ uten }' : '} for mye'} i ${open ? 'koden' : 'klassen'}.`
      : `Koden kompilerer ikke: ${tidy(String(diagnostics.find((d) => d.message)?.message ?? ''))}`
    errors.push({ message, line: null, where: open ? 'kode' : cls ? 'klasse' : null })
  }
  if (!errors.length) errors.push({ message: 'Koden kompilerer ikke.', line: null, where: null })
  return { errors, missing }
}
