/*
 * The kata runner. The page imports this file as text (`?raw`) and starts it as a Worker from a data: URL, so the
 * code runs off the main thread (a loop that never ends can be killed) and on an opaque origin: it cannot read
 * kata.phareim.no's storage, and requests it makes carry none of the visitor's *.phareim.no cookies.
 * Keep it self-contained: no imports, plain JavaScript.
 *
 *   page → worker  { type: 'run', code }                       once per worker
 *   worker → page  { type: 'console', entries: [{ level, text }] }
 *                  { type: 'clear' }
 *                  { type: 'done', ms }                         the code returned and no timer is left
 *                  { type: 'error', name, message, line, compile, ms }
 *                                                an uncaught error; line is 1-based or null, compile is true
 *                                                when the code didn't parse
 *
 * `done` and `error` end the run; the page then terminates the worker.
 */

const MAX_DEPTH = 3
const MAX_ITEMS = 100
const LINE_WIDTH = 72
const TEXT_LIMIT = 20000
const LINE_LIMIT = 1000

/** Node-style text for a value, as console.log prints it: strings bare at the top, quoted inside. */
function inspect(value) {
  return typeof value === 'string' ? value : format(value, 0, new Set())
}

function format(v, depth, seen) {
  switch (typeof v) {
    case 'string': return quote(v)
    case 'number': return Object.is(v, -0) ? '-0' : String(v)
    case 'bigint': return `${v}n`
    case 'boolean':
    case 'undefined': return String(v)
    case 'symbol': return v.toString()
    case 'function': return formatFunction(v)
  }
  if (v === null) return 'null'
  if (seen.has(v)) return '[Circular]'
  if (v instanceof Error) return depth === 0 ? errorText(v) : `[${errorText(v)}]`
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? 'Invalid Date' : v.toISOString()
  if (v instanceof RegExp) return String(v)
  if (v instanceof Promise) return 'Promise { … }'
  if (v instanceof WeakMap || v instanceof WeakSet) return `${tag(v)} { <items unknown> }`
  if (depth > MAX_DEPTH) return Array.isArray(v) ? '[Array]' : `[${constructorName(v) ?? 'Object'}]`

  seen.add(v)
  try {
    if (Array.isArray(v)) return wrap('', '[', arrayItems(v, depth, seen), ']', depth)
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
      return wrap(`${tag(v)}(${v.length}) `, '[', arrayItems(v, depth, seen), ']', depth)
    }
    if (v instanceof Map) {
      const items = limit([...v].map(([k, val]) => `${format(k, depth + 1, seen)} => ${format(val, depth + 1, seen)}`))
      return wrap(`Map(${v.size}) `, '{', items, '}', depth)
    }
    if (v instanceof Set) {
      return wrap(`Set(${v.size}) `, '{', limit([...v].map((item) => format(item, depth + 1, seen))), '}', depth)
    }
    const name = constructorName(v)
    const prefix = name === 'Object' ? '' : name === null ? '[Object: null prototype] ' : `${name} `
    return wrap(prefix, '{', objectItems(v, depth, seen), '}', depth)
  } finally {
    seen.delete(v)
  }
}

/** One line when it fits, else one item per line, indented two spaces per level. */
function wrap(prefix, open, items, close, depth) {
  if (items.length === 0) return `${prefix}${open}${close}`
  const single = `${prefix}${open} ${items.join(', ')} ${close}`
  if (single.length + depth * 2 <= LINE_WIDTH && !single.includes('\n')) return single
  const indent = '  '.repeat(depth + 1)
  return `${prefix}${open}\n${items.map((item) => indent + item).join(',\n')}\n${'  '.repeat(depth)}${close}`
}

function arrayItems(arr, depth, seen) {
  const out = []
  let holes = 0
  const n = Math.min(arr.length, MAX_ITEMS)
  const flushHoles = () => {
    if (holes) out.push(`<${holes} empty item${holes > 1 ? 's' : ''}>`)
    holes = 0
  }
  for (let i = 0; i < n; i++) {
    if (!(i in arr)) { holes++; continue }
    flushHoles()
    out.push(format(arr[i], depth + 1, seen))
  }
  flushHoles()
  if (arr.length > MAX_ITEMS) out.push(`... ${arr.length - MAX_ITEMS} more item${arr.length - MAX_ITEMS > 1 ? 's' : ''}`)
  return out
}

function objectItems(obj, depth, seen) {
  const keys = Object.keys(obj)
  const out = keys.slice(0, MAX_ITEMS).map((key) => `${formatKey(key)}: ${property(obj, key, depth, seen)}`)
  for (const sym of Object.getOwnPropertySymbols(obj)) {
    if (Object.getOwnPropertyDescriptor(obj, sym)?.enumerable) out.push(`[${sym.toString()}]: ${property(obj, sym, depth, seen)}`)
  }
  if (keys.length > MAX_ITEMS) out.push(`... ${keys.length - MAX_ITEMS} more properties`)
  return out
}

function property(obj, key, depth, seen) {
  const desc = Object.getOwnPropertyDescriptor(obj, key)
  if (desc && desc.get) return desc.set ? '[Getter/Setter]' : '[Getter]'
  if (desc && desc.set) return '[Setter]'
  return format(desc ? desc.value : undefined, depth + 1, seen)
}

function limit(items) {
  return items.length > MAX_ITEMS ? [...items.slice(0, MAX_ITEMS), `... ${items.length - MAX_ITEMS} more items`] : items
}

function formatKey(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key)
}

function quote(s) {
  const q = !s.includes("'") ? "'" : !s.includes('"') ? '"' : !s.includes('`') ? '`' : "'"
  let body = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  if (s.includes(q)) body = body.split(q).join(`\\${q}`)
  return q + body + q
}

function formatFunction(f) {
  if (/^class\b/.test(Function.prototype.toString.call(f))) return `[class ${f.name || '(anonymous)'}]`
  const kind = ['AsyncFunction', 'GeneratorFunction', 'AsyncGeneratorFunction'].includes(f.constructor?.name)
    ? f.constructor.name : 'Function'
  return f.name ? `[${kind}: ${f.name}]` : `[${kind} (anonymous)]`
}

function constructorName(obj) {
  const proto = Object.getPrototypeOf(obj)
  if (proto === null) return null
  const ctor = proto.constructor
  return typeof ctor === 'function' && ctor.name ? ctor.name : 'Object'
}

function tag(v) {
  return Object.prototype.toString.call(v).slice(8, -1)
}

function errorText(e) {
  const name = e.name || 'Error'
  return e.message ? `${name}: ${e.message}` : name
}

/*
 * The code runs as the body of an async function, so `await` works at the top. The sourceURL names it kata.js in
 * Chrome's and Firefox's stacks; WebKit ignores it but sets `line` on the error instead. How many lines the engine's
 * wrapper adds differs, so calibrate() measures it once with a probe compiled the same way.
 */
const AsyncFunction = (async () => {}).constructor

function compile(code) {
  return new AsyncFunction(`'use strict';${code}\n//# sourceURL=kata.js`)
}

async function calibrate() {
  const probe = await compile('return new Error()')()
  const m = /kata\.js:(\d+)/.exec(String(probe.stack))
  const line = probe.line ?? probe.lineNumber
  return {
    stack: m ? Number(m[1]) - 1 : null,
    line: typeof line === 'number' ? line - 1 : null,
    file: probe.sourceURL ?? probe.fileName,
  }
}

/** The editor line an error came from, or null when the engine doesn't say. */
function errorLine(err, cal, compiling, lineCount) {
  if (err === null || typeof err !== 'object') return null
  let line = null
  const m = /kata\.js:(\d+)/.exec(String(err.stack))
  const raw = err.line ?? err.lineNumber
  if (m && cal.stack !== null) line = Number(m[1]) - cal.stack
  else if (typeof raw === 'number' && cal.line !== null && (compiling || (err.sourceURL ?? err.fileName) === cal.file)) {
    line = raw - cal.line
  }
  return line !== null && line >= 1 && line <= lineCount ? line : null
}

function start() {
  const send = self.postMessage.bind(self)
  const realSetTimeout = self.setTimeout.bind(self)
  const realSetInterval = self.setInterval.bind(self)
  const realClearTimeout = self.clearTimeout.bind(self)

  let startedAt = 0
  let code = ''
  let cal = null
  let mainDone = false
  let finished = false

  // Console output goes out in batches: every 50 entries, or on the next free moment.
  let queue = []
  let flushTimer = null
  let lines = 0
  const flush = () => {
    if (flushTimer !== null) realClearTimeout(flushTimer)
    flushTimer = null
    if (queue.length) send({ type: 'console', entries: queue })
    queue = []
  }
  let groupDepth = 0
  const emit = (level, args) => {
    if (finished) return
    lines++
    if (lines > LINE_LIMIT) {
      if (lines === LINE_LIMIT + 1) {
        queue.push({ level: 'warn', text: `Over ${LINE_LIMIT} linjer utskrift; resten vises ikke.` })
        flush()
      }
      return
    }
    let text = args.map(inspect).join(' ')
    if (text.length > TEXT_LIMIT) text = `${text.slice(0, TEXT_LIMIT)}… (${text.length - TEXT_LIMIT} tegn til)`
    if (groupDepth) text = text.replace(/^/gm, '  '.repeat(groupDepth))
    queue.push({ level, text })
    if (queue.length >= 50) flush()
    else if (flushTimer === null) flushTimer = realSetTimeout(flush, 16)
  }

  const counts = new Map()
  const timers = new Map()
  const elapsed = (label, rest, end) => {
    const t = timers.get(label)
    if (t === undefined) return emit('warn', [`Timer '${label}' does not exist`])
    if (end) timers.delete(label)
    emit('log', [`${label}: ${(performance.now() - t).toFixed(2)} ms`, ...rest])
  }
  self.console = {
    log: (...args) => emit('log', args),
    info: (...args) => emit('info', args),
    debug: (...args) => emit('log', args),
    warn: (...args) => emit('warn', args),
    error: (...args) => emit('error', args),
    dir: (value) => emit('log', [format(value, 0, new Set())]),
    table: (...args) => emit('log', args),
    trace: (...args) => emit('log', ['Trace:', ...args]),
    assert: (ok, ...args) => { if (!ok) emit('error', ['Assertion failed', ...args]) },
    count: (label = 'default') => {
      const n = (counts.get(`${label}`) ?? 0) + 1
      counts.set(`${label}`, n)
      emit('log', [`${label}: ${n}`])
    },
    countReset: (label = 'default') => { counts.delete(`${label}`) },
    time: (label = 'default') => { timers.set(`${label}`, performance.now()) },
    timeLog: (label = 'default', ...rest) => elapsed(`${label}`, rest, false),
    timeEnd: (label = 'default') => elapsed(`${label}`, [], true),
    group: (...args) => { if (args.length) emit('log', args); groupDepth++ },
    groupCollapsed: (...args) => { if (args.length) emit('log', args); groupDepth++ },
    groupEnd: () => { groupDepth = Math.max(0, groupDepth - 1) },
    clear: () => { queue = []; send({ type: 'clear' }) },
  }

  const fail = (err, compiling) => {
    if (finished) return
    flush()
    finished = true
    const isError = err instanceof Error
    send({
      type: 'error',
      name: isError ? err.name || 'Error' : 'Uncaught',
      message: isError ? err.message : format(err, 0, new Set()),
      line: errorLine(err, cal, compiling, code.split('\n').length),
      compile: compiling,
      ms: performance.now() - startedAt,
    })
  }

  // The run is over when the code has returned and no timer is left. Unawaited promises get the microtasks that
  // run before the next macrotask; anything slower than that is not waited for.
  const pending = new Set()
  const settle = () => {
    if (!mainDone || pending.size || finished) return
    realSetTimeout(() => {
      if (!mainDone || pending.size || finished) return
      flush()
      finished = true
      send({ type: 'done', ms: performance.now() - startedAt })
    }, 0)
  }
  const call = (fn, args) => {
    if (typeof fn !== 'function' || finished) return
    try { fn(...args) } catch (err) { fail(err, false) }
  }
  self.setTimeout = (fn, ms, ...args) => {
    const id = realSetTimeout(() => { pending.delete(id); call(fn, args); settle() }, ms)
    pending.add(id)
    return id
  }
  self.setInterval = (fn, ms, ...args) => {
    const id = realSetInterval(() => call(fn, args), ms)
    pending.add(id)
    return id
  }
  self.clearTimeout = self.clearInterval = (id) => {
    pending.delete(id)
    realClearTimeout(id)
    settle()
  }
  self.addEventListener('unhandledrejection', (event) => {
    event.preventDefault()
    fail(event.reason, false)
  })

  self.onmessage = async (event) => {
    const msg = event.data
    if (!msg || msg.type !== 'run' || startedAt) return
    startedAt = performance.now()
    code = String(msg.code)
    cal = await calibrate()
    let main
    try {
      main = compile(code)
    } catch (err) {
      return fail(err, true)
    }
    try {
      await main()
    } catch (err) {
      return fail(err, false)
    }
    mainDone = true
    settle()
  }
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) start()
