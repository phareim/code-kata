/*
 * Autocomplete for kata code. Four sources, merged by CodeMirror:
 *   - the names the code itself declares, in scope at the cursor (variables, functions, parameters, classes)
 *   - keywords and snippets
 *   - the globals the runner offers, with their members after a dot (Math.floor, JSON.stringify, console.log)
 *   - after a dot on anything else: the items' value/color/next, common array/string/number/promise members and the
 *     property names used in the code
 *   - the items' names: head, the class Monster and the letters A, B, C … of the world as it is now
 */
import {
  completeFromList,
  ifNotIn,
  snippetCompletion as snip,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete'
import { LanguageSupport, syntaxTree } from '@codemirror/language'
import {
  completionPath,
  javascriptLanguage,
  localCompletionSource,
  scopeCompletionSource,
  snippets as jsSnippets,
} from '@codemirror/lang-javascript'

const Identifier = /^[\w$\xa1-￿]*$/

// lang-javascript's list of nodes where completing makes no sense (strings, comments, names being defined).
const dontComplete = [
  'TemplateString', 'String', 'RegExp', 'LineComment', 'BlockComment',
  'VariableDefinition', 'TypeDefinition', 'Label', 'PropertyDefinition', 'PropertyName',
  'PrivatePropertyDefinition', 'PrivatePropertyName', '.', '?.',
]

const keyword = (label: string): Completion => ({ label, type: 'keyword' })

/** Keywords and literals; `for`, `if`, `function` and friends come as snippets instead. */
export const KEYWORDS: Completion[] = (
  'async await break case catch const continue default delete else extends false finally in instanceof let ' +
  'new null of return static super switch this throw true typeof undefined var void yield'
).split(' ').map(keyword)

// The runner has no modules, so the import snippets are left out.
export const SNIPPETS: Completion[] = [
  ...jsSnippets.filter((s) => s.label !== 'import'),
  snip('console.log(${})', { label: 'log', detail: 'console.log', type: 'text' }),
  snip('(${params}) => ${}', { label: '=>', detail: 'arrow function', type: 'keyword' }),
  snip('for (const ${key} in ${object}) {\n\t${}\n}', { label: 'for', detail: 'in loop', type: 'keyword' }),
]

const CONSOLE = [
  'log', 'info', 'debug', 'warn', 'error', 'dir', 'table', 'trace', 'assert',
  'count', 'countReset', 'time', 'timeLog', 'timeEnd', 'group', 'groupCollapsed', 'groupEnd', 'clear',
]

const GLOBALS = [
  'Array', 'ArrayBuffer', 'BigInt', 'Boolean', 'DataView', 'Date', 'Error', 'EvalError', 'Float32Array',
  'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Intl', 'JSON', 'Map', 'Math', 'Number', 'Object',
  'Promise', 'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set', 'String', 'Symbol',
  'SyntaxError', 'TypeError', 'URIError', 'Uint8Array', 'Uint16Array', 'Uint32Array', 'WeakMap', 'WeakRef',
  'WeakSet', 'AbortController', 'TextDecoder', 'TextEncoder', 'URL', 'URLSearchParams', 'atob', 'btoa',
  'clearInterval', 'clearTimeout', 'crypto', 'decodeURIComponent', 'encodeURIComponent', 'fetch', 'isFinite',
  'isNaN', 'parseFloat', 'parseInt', 'performance', 'queueMicrotask', 'setInterval', 'setTimeout',
  'structuredClone', 'Infinity', 'NaN',
]

/**
 * What the code can reach without declaring it: the worker's globals (named here, read from the page, which has
 * the same built-ins) and the runner's console. No prototype, so Object.prototype's members don't show up as names.
 */
export function kataScope(): Record<string, unknown> {
  const scope: Record<string, unknown> = Object.create(null)
  const g = globalThis as unknown as Record<string, unknown>
  for (const name of GLOBALS) if (name in g) scope[name] = g[name]
  const console: Record<string, unknown> = Object.create(null)
  for (const name of CONSOLE) console[name] = () => {}
  scope.console = console
  scope.globalThis = scope
  return scope
}

const method = (detail: string) => (label: string): Completion => ({ label, type: 'method', detail })
const prop = (detail: string) => (label: string): Completion => ({ label, type: 'property', detail })

/** Members most kata code reaches for, offered after a dot when the receiver's type is unknown. */
export const COMMON_MEMBERS: Completion[] = merge([
  ...['value', 'color', 'next'].map((label): Completion => ({ label, type: 'property', detail: 'monster', boost: 1 })),
  ...['length'].map(prop('array · string')),
  ...['at', 'concat', 'includes', 'indexOf', 'lastIndexOf', 'slice'].map(method('array · string')),
  ...[
    'map', 'filter', 'reduce', 'reduceRight', 'forEach', 'find', 'findIndex', 'findLast', 'findLastIndex', 'some',
    'every', 'push', 'pop', 'shift', 'unshift', 'splice', 'join', 'sort', 'reverse', 'flat', 'flatMap', 'fill',
    'keys', 'values', 'entries', 'toSorted', 'toReversed', 'toSpliced', 'with', 'copyWithin',
  ].map(method('array')),
  ...[
    'split', 'trim', 'trimStart', 'trimEnd', 'toUpperCase', 'toLowerCase', 'startsWith', 'endsWith', 'padStart',
    'padEnd', 'repeat', 'replace', 'replaceAll', 'charAt', 'charCodeAt', 'codePointAt', 'substring', 'match',
    'matchAll', 'search', 'localeCompare', 'normalize',
  ].map(method('string')),
  ...['toFixed', 'toPrecision', 'toString', 'toLocaleString', 'valueOf'].map(method('number · object')),
  ...['then', 'catch', 'finally'].map(method('promise')),
  ...['get', 'set', 'has', 'delete', 'add', 'clear'].map(method('map · set')),
  ...['size'].map(prop('map · set')),
])

function merge(list: Completion[]): Completion[] {
  const byLabel = new Map<string, Completion>()
  for (const c of list) if (!byLabel.has(c.label)) byLabel.set(c.label, c)
  return [...byLabel.values()]
}

/** Property names the code already uses (`obj.score`, `{ score: 0 }`), except the one being typed. */
function codeProperties(context: CompletionContext, typing: { from: number; to: number } | null): Completion[] {
  const names = new Set<string>()
  syntaxTree(context.state).iterate({
    enter(node) {
      if (node.name !== 'PropertyName' && node.name !== 'PropertyDefinition') return
      if (typing && node.from === typing.from && node.to === typing.to) return
      names.add(context.state.sliceDoc(node.from, node.to))
    },
  })
  return [...names].filter((n) => /^[\w$]+$/.test(n)).map((label) => ({ label, type: 'property', detail: 'i koden', boost: 1 }))
}

/** After a dot whose receiver isn't one of the known globals: common members and the code's own property names. */
export function memberSource(scope: Record<string, unknown>): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const inner = syntaxTree(context.state).resolveInner(context.pos, -1)
    let from: number
    let typing: { from: number; to: number } | null = null
    if (inner.name === 'PropertyName' && inner.parent?.name === 'MemberExpression') {
      from = inner.from
      typing = { from: inner.from, to: inner.to }
    } else if ((inner.name === '.' || inner.name === '?.') && inner.parent?.name === 'MemberExpression') {
      from = context.pos
    } else {
      return null
    }
    const path = completionPath(context)
    if (path && path.path.length && path.path[0] in scope) return null
    return { from, options: merge([...COMMON_MEMBERS, ...codeProperties(context, typing)]), validFor: Identifier }
  }
}

const WORLD_DETAILS: Record<string, Completion> = {
  Monster: { label: 'Monster', type: 'class', detail: 'klassen' },
  vis: { label: 'vis', type: 'function', detail: 'ta et bilde av monstrene' },
  head: { label: 'head', type: 'variable', detail: 'det første monsteret' },
  items: { label: 'items', type: 'variable', detail: 'array av monstre' },
  root: { label: 'root', type: 'variable', detail: 'roten i treet' },
}

/** The roots (head, items …), Monster, vis and the items' letters, read from the current world on every call. */
export function worldSource(names: () => string[]): CompletionSource {
  return (context) => {
    const path = completionPath(context)
    if (!path || path.path.length) return null
    return {
      from: context.pos - path.name.length,
      options: names().map((label) => ({
        ...(WORLD_DETAILS[label] ?? { label, type: 'variable', detail: /^[A-Z]\d*$/.test(label) ? 'monster' : 'global' }),
        boost: 2,
      })),
      validFor: Identifier,
    }
  }
}

/** The code's own names rank above keywords and globals that match equally well. */
const localNames: CompletionSource = (context) => {
  const result = localCompletionSource(context)
  return result && { ...result, options: result.options.map((o) => ({ ...o, boost: 1 })) }
}

/** JavaScript with kata completions, in place of lang-javascript's `javascript()`. */
export function kataJavascript(itemNames: () => string[] = () => []): LanguageSupport {
  const scope = kataScope()
  return new LanguageSupport(javascriptLanguage, [
    javascriptLanguage.data.of({ autocomplete: ifNotIn(dontComplete, completeFromList([...SNIPPETS, ...KEYWORDS])) }),
    javascriptLanguage.data.of({ autocomplete: localNames }),
    javascriptLanguage.data.of({ autocomplete: scopeCompletionSource(scope) }),
    javascriptLanguage.data.of({ autocomplete: memberSource(scope) }),
    javascriptLanguage.data.of({ autocomplete: worldSource(itemNames) }),
  ])
}
