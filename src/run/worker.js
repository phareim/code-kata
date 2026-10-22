/*
 * The kata runner. The page imports this file as text (`?raw`) and starts it as a Worker from a data: URL, so the
 * code runs off the main thread (a loop that never ends can be killed) and on an opaque origin: it cannot read
 * kata.phareim.no's storage, and requests it makes carry none of the visitor's *.phareim.no cookies.
 * Keep it self-contained: no imports, plain JavaScript.
 *
 *   page → worker  { type: 'run', code, classSource, world, task }   once per worker
 *                  task is optional: { check, exports }, the source of a task's check function and the names of
 *                  the functions the code should declare
 *   worker → page  { type: 'console', entries: [{ level, text }] }
 *                  { type: 'clear' }
 *                  { type: 'world', world, frames, dropped }   the items after the run, sent before done/error;
 *                                                frames are the snapshots vis() took (dropped: how many past the cap)
 *                  { type: 'verdict', ok, message, broken, line, where }
 *                                                a task's check, after world and before done; broken when the check
 *                                                itself failed, line/where when an error in the code was the reason
 *                  { type: 'done', ms }                         the code returned and no timer is left
 *                  { type: 'error', name, message, line, where, compile, ms }
 *                                                an uncaught error; line is 1-based in the editor `where` names
 *                                                ('kode' or 'ting'), both null when the engine doesn't say;
 *                                                compile is true when the code didn't parse
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
 * The world: the items, and the named globals that hold them ("roots": `head` for a list, `items` for an array,
 * `root` for a tree …). On the way in and out every item is a list of props, and a prop is one of
 *   { key, ref, text }           another item, by its slot
 *   { key, list, text }          an array that holds items; its elements are props too, keyed by index
 *   { key, raw, text }           a value that survives a structured clone
 *   { key, text, lossy: true }   a value that doesn't (a function, a symbol); the next run gets the text
 * A root is a prop keyed by its global's name.
 * Slots are memory: the items the page sent keep their slot, items the code made are appended in the order they are
 * found: from the roots, then along pointers (next, prev, left, right, parent) and through arrays of Ting. Slot i is
 * named label(i) (A, B, … Z, A1 …) as a fixed global.
 * Each item also carries `cls`, its constructor's name, and the world carries `fields`: the own properties a new Ting
 * had when the items were last built, so the next build knows which fields the class has dropped since.
 */
const WORLD_LIMIT = 64
const ARRAY_LIMIT = 256
const MAX_FRAMES = 240
const POINTERS = ['next', 'prev', 'left', 'right', 'parent']
const PALETTE = ['pink', 'cyan', 'gold', 'lime', 'violet', 'orange', 'red', 'teal']

function label(i) {
  return String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '')
}

function decoder(objs) {
  const decode = (p) => (p.ref !== undefined ? objs[p.ref] : p.list ? p.list.map(decode) : 'raw' in p ? p.raw : p.text)
  return decode
}

/**
 * The objects the page's world describes, linked to each other, and the roots as [name, value] pairs. With a class,
 * every item is a new Ting: it starts with the class's fields and defaults, then gets its stored props back, except
 * fields the class no longer has.
 */
function buildWorld(world, Ting) {
  const objs = world.items.map(() => (Ting ? new Ting() : {}))
  const fields = Ting ? Object.keys(objs[0] ?? new Ting()) : world.fields ?? []
  const dropped = new Set(Ting ? (world.fields ?? []).filter((f) => !fields.includes(f)) : [])
  const decode = decoder(objs)
  world.items.forEach((item, i) => {
    for (const p of item.props) if (!dropped.has(p.key)) objs[i][p.key] = decode(p)
  })
  return { objs, roots: (world.roots ?? []).map((p) => [p.key, decode(p)]), fields }
}

function read(o, key) {
  try {
    return o[key]
  } catch {
    return undefined // a getter that throws, a proxy that refuses
  }
}

function keysOf(o) {
  try {
    return Object.keys(o)
  } catch {
    return []
  }
}

/**
 * The world as the code left it. `known` holds the items so far in their slots; items found now are appended to it,
 * so an item keeps its slot from one vis() frame to the next and to the end. `roots` is [name, value] pairs;
 * `marked` are objects to light up, given as `marks` (slots).
 */
function snapshotWorld(known, roots, fields = [], Ting = undefined, marked = []) {
  const slot = new Map(known.map((o, i) => [o, i]))
  let truncated = false
  const add = (o) => {
    if (slot.has(o)) return
    if (known.length >= WORLD_LIMIT) { truncated = true; return }
    slot.set(o, known.length)
    known.push(o)
  }
  const isTing = (v) => {
    try {
      return typeof Ting === 'function' && v instanceof Ting
    } catch {
      return false
    }
  }
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
  const isPlain = (v) => {
    const proto = Object.getPrototypeOf(v)
    return proto === Object.prototype || proto === null
  }
  // An item: one we know, a Ting, or a plain object reached from a root or through a pointer.
  const isNode = (v) => isObject(v) && (slot.has(v) || isTing(v) || isPlain(v))
  const fromRoot = (v, depth) => {
    if (Array.isArray(v)) {
      if (depth < 3) for (const x of v.slice(0, ARRAY_LIMIT)) fromRoot(x, depth + 1)
    } else if (isNode(v)) add(v)
  }
  for (const [, v] of roots) fromRoot(v, 0)
  for (let i = 0; i < known.length; i++) {
    const o = known[i]
    for (const key of POINTERS) {
      const v = read(o, key)
      if (isNode(v)) add(v)
    }
    for (const key of keysOf(o)) {
      const v = read(o, key)
      if (Array.isArray(v)) for (const x of v.slice(0, ARRAY_LIMIT)) if (isObject(x) && isTing(x)) add(x)
    }
  }

  const holdsItem = (arr, depth) => depth < 3
    && arr.slice(0, ARRAY_LIMIT).some((x) => slot.has(x) || (Array.isArray(x) && holdsItem(x, depth + 1)))
  const encode = (key, v, depth = 0) => {
    if (slot.has(v)) return { key, ref: slot.get(v), text: label(slot.get(v)) }
    if (Array.isArray(v) && holdsItem(v, depth)) {
      if (v.length > ARRAY_LIMIT) truncated = true
      const list = Array.from(v.slice(0, ARRAY_LIMIT), (x, i) => encode(String(i), x, depth + 1))
      return { key, list, text: `[${list.map((p) => p.text).join(', ')}]` }
    }
    const text = format(v, 1, new Set())
    if (v === null || (typeof v !== 'object' && typeof v !== 'function' && typeof v !== 'symbol')) return { key, raw: v, text }
    try {
      structuredClone(v)
      return { key, raw: v, text }
    } catch {
      return { key, text, lossy: true }
    }
  }
  const items = known.map((o) => ({
    cls: constructorName(o),
    props: keysOf(o).map((key) => {
      let v
      try { v = o[key] } catch (err) { v = err }
      return encode(key, v)
    }),
  }))
  const world = { items, roots: roots.map(([name, v]) => encode(name, v)), fields, truncated }
  const marks = marked.filter((o) => slot.has(o)).map((o) => slot.get(o))
  if (marks.length) world.marks = [...new Set(marks)]
  return world
}

/*
 * The class and the code run as one source, so that `Ting` in the code is the class the items are made of:
 *   <class source>
 *   ;__kata_build__(Ting)      builds the items as Ting, then
 *   <code>
 *   ;return { name: … }        for a task with exports: the functions the code declared
 * place() turns a line in that source into a line in the editor it came from.
 */
function place(line, classLines) {
  if (line === null) return { line: null, where: null }
  if (!classLines) return { line, where: 'kode' }
  if (line <= classLines) return { line, where: 'ting' }
  if (line === classLines + 1) return { line: null, where: 'ting' }
  return { line: line - classLines - 1, where: 'kode' }
}

function exportsTrailer(names) {
  const safe = (names ?? []).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n))
  if (!safe.length) return ''
  return `\n;return { ${safe.map((n) => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} }`
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

/*
 * A task's check runs once the code and its timers are done, with one argument `t`:
 *   t.head, t.items, t.root …   the roots as the code left them
 *   t.slots                     the items the run started with (A, B …), the same objects
 *   t.start                     a plain copy of how the run started: { slots, head, items … }
 *   t.out                       the lines the code printed
 *   t.fn(name)                  a function the code declared (one of the task's exports)
 *   t.Ting                      the class
 *   t.chain(node, key)          the nodes from node along key ('next'), or null when it loops or hits a non-object
 *   t.values(node, key)         their values
 *   t.list(values, colors)      a new list of Ting; returns its head (null for none)
 *   t.ting(props)               a new Ting
 *   t.tree(spec)                a new tree of Ting from [value, left, right] (a bare value is a leaf)
 *   t.same(a, b)                deep equality for plain data, arrays, Maps and Sets
 *   t.show(v)                   text for a message: an item by its letter, strings quoted
 *   t.shuffle(array)            a shuffled copy
 * It returns true when the task is solved, or a string that says what is still wrong.
 */
const USER_ERROR = Symbol('kata user error')

function checkContext({ Ting, slots, start, roots, out, exported, slotOf }) {
  const userCall = (name, fn) => function (...args) {
    let r
    try {
      r = fn.apply(this, args)
    } catch (err) {
      throw { [USER_ERROR]: true, name, err }
    }
    if (r !== null && typeof r === 'object' && typeof r.then === 'function') {
      return r.then(undefined, (err) => { throw { [USER_ERROR]: true, name, err } })
    }
    return r
  }
  const make = userCall('Ting', (props) => {
    const o = typeof Ting === 'function' ? new Ting(props) : {}
    return Object.assign(o, props)
  })
  const chain = (node, key = 'next', max = 1000) => {
    const nodes = []
    const seen = new Set()
    while (node !== null && node !== undefined) {
      if (typeof node !== 'object' || seen.has(node) || nodes.length >= max) return null
      seen.add(node)
      nodes.push(node)
      node = read(node, key)
    }
    return nodes
  }
  const same = (a, b, depth = 0) => {
    if (Object.is(a, b)) return true
    if (depth > 40 || a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
    if (Array.isArray(a) !== Array.isArray(b)) return false
    if (a instanceof Map || b instanceof Map) {
      return a instanceof Map && b instanceof Map && a.size === b.size
        && [...a].every(([k, v]) => b.has(k) && same(v, b.get(k), depth + 1))
    }
    if (a instanceof Set || b instanceof Set) {
      return a instanceof Set && b instanceof Set && a.size === b.size && [...a].every((x) => b.has(x))
    }
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && same(a[k], b[k], depth + 1))
  }
  const show = (v, depth = 0) => {
    const s = slotOf(v)
    if (s !== undefined) return label(s)
    if (Array.isArray(v) && depth < 3) {
      const shown = v.slice(0, 20).map((x) => show(x, depth + 1))
      return `[${shown.join(', ')}${v.length > 20 ? ', …' : ''}]`
    }
    return format(v, 1, new Set())
  }
  const t = {
    Ting,
    slots,
    start,
    out,
    fn: (name) => (typeof exported[name] === 'function' ? userCall(name, exported[name]) : undefined),
    chain,
    values: (node, key = 'next') => chain(node, key)?.map((n) => read(n, 'value')) ?? null,
    list: (values, colors) => {
      let head = null
      for (let i = values.length - 1; i >= 0; i--) {
        head = make({ value: values[i], color: colors?.[i] ?? PALETTE[i % PALETTE.length], next: head })
      }
      return head
    },
    ting: (props) => make(props),
    tree: function tree(spec, i = 0) {
      if (spec === null || spec === undefined) return null
      const [value, left, right] = Array.isArray(spec) ? spec : [spec]
      return make({ value, color: PALETTE[i % PALETTE.length], left: tree(left, i + 1), right: tree(right, i + 2) })
    },
    same: (a, b) => same(a, b),
    show: (v) => show(v),
    shuffle: (array) => {
      const copy = [...array]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
  }
  for (const name of roots) {
    if (!(name in t)) Object.defineProperty(t, name, { get: () => self[name], enumerable: true })
  }
  return t
}

/** Runs a check's source against the context. Never throws: the verdict says what happened. */
async function judge(source, t, where) {
  let check
  try {
    check = new Function(`return (${source})\n//# sourceURL=sjekk.js`)()
  } catch (err) {
    return { ok: false, broken: true, message: `Sjekken kompilerer ikke: ${errorText(err)}` }
  }
  try {
    const result = await check(t)
    if (result === true) return { ok: true, message: '' }
    return { ok: false, message: typeof result === 'string' && result ? result : 'Ikke løst ennå.' }
  } catch (thrown) {
    if (thrown && thrown[USER_ERROR]) {
      const { name, err } = thrown
      const at = where(err)
      const what = err instanceof Error ? errorText(err) : `kastet ${format(err, 1, new Set())}`
      return { ok: false, message: `${name}: ${what}`, line: at.line, where: at.where }
    }
    const at = where(thrown)
    if (at.line !== null) {
      return { ok: false, message: errorText(thrown), line: at.line, where: at.where }
    }
    return { ok: false, broken: true, message: `Feil i sjekken: ${thrown instanceof Error ? errorText(thrown) : String(thrown)}` }
  }
}

function start() {
  const send = self.postMessage.bind(self)
  const realSetTimeout = self.setTimeout.bind(self)
  const realSetInterval = self.setInterval.bind(self)
  const realClearTimeout = self.clearTimeout.bind(self)

  let startedAt = 0
  let source = ''
  let classLines = 0
  let cal = null
  let mainDone = false
  let finished = false
  let task = null
  let exported = {}
  const printed = []

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
    printed.push(text)
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

  // The items, sent back as the code left them; not after a compile error, when no code ran.
  // `world` is { objs, roots (names), fields, Ting, start }; objs grows as the code makes new items.
  let world = null
  const readRoots = () => world.roots.map((name) => [name, self[name]])
  const snap = (marked) => snapshotWorld(world.objs, readRoots(), world.fields, world.Ting, marked)

  // vis(): a frame of the items as they are now, played back on the page after the run. Strings and numbers make
  // the frame's caption; items (or arrays of them) light up.
  const frames = []
  let dropped = 0
  Object.defineProperty(self, 'vis', {
    configurable: true,
    writable: true,
    value: (...args) => {
      if (!world || finished) return
      if (frames.length >= MAX_FRAMES) { dropped++; return }
      const note = args.filter((a) => typeof a === 'string' || typeof a === 'number').join(' ')
      const marked = args.flat().filter((a) => a !== null && typeof a === 'object')
      const frame = snap(marked)
      if (note) frame.note = note
      frames.push(frame)
    },
  })

  const sendWorld = () => {
    if (!world) return
    const final = snap([])
    try {
      send({ type: 'world', world: final, frames, dropped })
    } catch {
      try {
        send({ type: 'world', world: final, frames: [], dropped: 0 })
      } catch {
        // A value that passed the clone check but not postMessage: the page keeps the old items.
      }
    }
  }

  const where = (err) => place(errorLine(err, cal, false, source.split('\n').length), classLines)

  const fail = (err, compiling) => {
    if (finished) return
    flush()
    if (!compiling) sendWorld()
    finished = true
    const isError = err instanceof Error
    const at = place(errorLine(err, cal, compiling, source.split('\n').length), classLines)
    send({
      type: 'error',
      name: isError ? err.name || 'Error' : 'Uncaught',
      message: isError ? err.message : format(err, 0, new Set()),
      line: at.line,
      where: isError && err.kataWhere ? err.kataWhere : at.where,
      compile: compiling,
      ms: performance.now() - startedAt,
    })
  }

  // The run is over when the code has returned and no timer is left. Unawaited promises get the microtasks that
  // run before the next macrotask; anything slower than that is not waited for. A task's check runs then, with
  // `finished` set so its calls into the code print nothing and start no timers that count.
  const pending = new Set()
  const settle = () => {
    if (!mainDone || pending.size || finished) return
    realSetTimeout(async () => {
      if (!mainDone || pending.size || finished) return
      flush()
      sendWorld()
      finished = true
      if (task && world) {
        const t = checkContext({
          Ting: world.Ting,
          slots: world.objs.slice(0, world.start.objs.length),
          start: Object.assign({ slots: world.start.objs }, Object.fromEntries(world.start.roots)),
          roots: world.roots,
          out: printed.slice(),
          exported,
          slotOf: (v) => {
            const i = world.objs.indexOf(v)
            return i >= 0 ? i : undefined
          },
        })
        const missing = (task.exports ?? []).filter((name) => typeof exported[name] !== 'function')
        const verdict = missing.length
          ? { ok: false, message: `Fant ikke funksjonen ${missing[0]}. Skriv function ${missing[0]}(…) { … } i koden.` }
          : await judge(task.check, t, where)
        send({ type: 'verdict', broken: false, line: null, where: null, ...verdict })
      }
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
    task = msg.task && typeof msg.task.check === 'string' ? msg.task : null
    const code = String(msg.code) + (task ? exportsTrailer(task.exports) : '')
    const install = (Ting) => {
      if (!msg.world) return
      const built = buildWorld(msg.world, Ting)
      world = {
        objs: built.objs,
        roots: built.roots.map(([name]) => name),
        fields: built.fields,
        Ting,
        start: buildWorld(msg.world, undefined),
      }
      // The letters name slots, so they can't be reassigned (strict mode throws); the roots can.
      world.objs.forEach((obj, i) => {
        Object.defineProperty(self, label(i), { value: obj, writable: false, enumerable: true, configurable: true })
      })
      for (const [name, value] of built.roots) self[name] = value
    }
    if (typeof msg.classSource === 'string') {
      Object.defineProperty(self, '__kata_build__', {
        configurable: true,
        value: (Ting) => {
          if (typeof Ting !== 'function') {
            const err = new ReferenceError('Fant ingen class Ting over tingene.')
            err.kataWhere = 'ting'
            throw err
          }
          install(Ting)
        },
      })
      classLines = msg.classSource.split('\n').length
      source = `${msg.classSource}\n;__kata_build__(typeof Ting === 'function' ? Ting : undefined)\n${code}`
    } else {
      install(undefined)
      source = code
    }
    cal = await calibrate()
    let main
    try {
      main = compile(source)
    } catch (err) {
      return fail(err, true)
    }
    try {
      const result = await main()
      if (task && result !== null && typeof result === 'object') exported = result
    } catch (err) {
      return fail(err, false)
    }
    mainDone = true
    settle()
  }
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) start()
