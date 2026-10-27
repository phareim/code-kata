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
 *                                                itself failed, line/where when an error in the code was the reason.
 *                                                Also before an error that is a call to an export never declared
 *                  { type: 'done', ms }                         the code returned and no timer is left
 *                  { type: 'error', name, message, line, where, compile, ms }
 *                                                an uncaught error; line is 1-based in the editor `where` names
 *                                                ('kode' or 'klasse'), both null when the engine doesn't say;
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
 * found: from the roots, then along pointers (next, prev, left, right, parent) and through arrays of Monster. Slot i is
 * named label(i) (A, B, … Z, A1 …) as a fixed global.
 * Each item also carries `cls`, its constructor's name, and the world carries `fields`: the own properties a new Monster
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
 * every item is a new Monster: it starts with the class's fields and defaults, then gets its stored props back, except
 * fields the class no longer has.
 */
function buildWorld(world, Monster) {
  const objs = world.items.map(() => (Monster ? new Monster() : {}))
  const fields = Monster ? Object.keys(objs[0] ?? new Monster()) : world.fields ?? []
  const dropped = new Set(Monster ? (world.fields ?? []).filter((f) => !fields.includes(f)) : [])
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

/** The fields the stage draws an item by; a getter in the class counts, though it isn't an own property. */
const SHOWN = ['value', 'color', 'shape']

function itemKeys(o) {
  const keys = keysOf(o)
  for (const key of SHOWN) {
    if (keys.includes(key)) continue
    for (let p = Object.getPrototypeOf(o); p && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
      if (Object.getOwnPropertyDescriptor(p, key)?.get) { keys.push(key); break }
    }
  }
  return keys
}

/**
 * The world as the code left it. `known` holds the items so far in their slots; items found now are appended to it,
 * so an item keeps its slot from one vis() frame to the next and to the end. `roots` is [name, value] pairs;
 * `marked` are objects to light up, given as `marks` (slots).
 */
function snapshotWorld(known, roots, fields = [], Monster = undefined, marked = []) {
  const slot = new Map(known.map((o, i) => [o, i]))
  let truncated = false
  const add = (o) => {
    if (slot.has(o)) return
    if (known.length >= WORLD_LIMIT) { truncated = true; return }
    slot.set(o, known.length)
    known.push(o)
  }
  const isMonster = (v) => {
    try {
      return typeof Monster === 'function' && v instanceof Monster
    } catch {
      return false
    }
  }
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
  const isPlain = (v) => {
    const proto = Object.getPrototypeOf(v)
    return proto === Object.prototype || proto === null
  }
  // An item: one we know, a Monster, or a plain object reached from a root or through a pointer.
  const isNode = (v) => isObject(v) && (slot.has(v) || isMonster(v) || isPlain(v))
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
      if (Array.isArray(v)) for (const x of v.slice(0, ARRAY_LIMIT)) if (isObject(x) && isMonster(x)) add(x)
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
    props: itemKeys(o).map((key) => {
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
 * The class and the code run as one source, so that `Monster` in the code is the class the items are made of:
 *   <class source>
 *   ;__kata_build__(Monster)   builds the items as Monster, then
 *   <code>
 *   ;return { name: … }        for a task with exports: the functions the code declared
 * place() turns a line in that source into a line in the editor it came from.
 */
function place(line, classLines) {
  if (line === null) return { line: null, where: null }
  if (!classLines) return { line, where: 'kode' }
  if (line <= classLines) return { line, where: 'klasse' }
  if (line === classLines + 1) return { line: null, where: 'klasse' }
  return { line: line - classLines - 1, where: 'kode' }
}

/*
 * The class was called Ting until 2026-10-23, and visitors have code and classes saved from then (`class Ting`,
 * `new Ting(…)`). The items are made of the class the class editor declares, Monster or else Ting, and the other
 * name is the same class.
 */
function classNames(classSource) {
  return !/\bclass\s+Monster\b/.test(classSource) && /\bclass\s+Ting\b/.test(classSource)
    ? ['Ting', 'Monster']
    : ['Monster', 'Ting']
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
 *   t.live(copy)                the item a copy in t.start stands for (null for null)
 *   t.before(root, key)         the items in the order a root held them at the start: an array's elements, or a
 *                               list along key ('next')
 *   t.out                       the lines the code printed
 *   t.fn(name)                  a function (or class, for `new`) the code declared, one of the task's exports
 *   t.Monster                   the class
 *   t.lang                      'js' or 'java': in Java the items are mirrors, so a check can't watch how they are read
 *   t.chain(node, key)          the nodes from node along key ('next'), or null when it loops or hits a non-object
 *   t.values(node, key)         their values
 *   t.list(values, colors)      a new list of Monster; returns its head (null for none)
 *   t.monster(props)            a new Monster
 *   t.tree(spec)                a new tree of Monster from [value, left, right] (a bare value is a leaf)
 *   t.same(a, b)                deep equality for plain data, arrays, Maps and Sets
 *   t.show(v)                   text for a message: an item by its letter, strings quoted
 *   t.shuffle(array)            a shuffled copy
 * It returns true when the task is solved, or a string that says what is still wrong.
 */
const USER_ERROR = Symbol('kata user error')

function checkContext({ lang, Monster, slots, start, roots, out, exported, slotOf }) {
  const userCall = (name, fn) => {
    const call = function (...args) {
      let r
      try {
        r = new.target ? Reflect.construct(fn, args) : fn.apply(this, args)
      } catch (err) {
        throw { [USER_ERROR]: true, name, err }
      }
      if (r !== null && typeof r === 'object' && typeof r.then === 'function') {
        return r.then(undefined, (err) => { throw { [USER_ERROR]: true, name, err } })
      }
      return r
    }
    // So `x instanceof t.fn('Bot')` asks about the class itself.
    if (fn.prototype) call.prototype = fn.prototype
    return call
  }
  const make = userCall('Monster', (props) => {
    const o = typeof Monster === 'function' ? new Monster(props) : {}
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
  const live = (copy) => {
    if (copy === null || copy === undefined) return null
    const i = start.slots.indexOf(copy)
    return i >= 0 ? slots[i] : undefined
  }
  const t = {
    lang,
    Monster,
    slots,
    start,
    out,
    live,
    before: (name = 'head', key = 'next') => {
      const v = start[name]
      return (Array.isArray(v) ? v : chain(v, key) ?? []).map(live)
    },
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
    monster: (props) => make(props),
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

/*
 * Java (src/java/): the page compiles the class, the code and the bridge (src/java/compose.ts, Kata.java) to
 * WebAssembly with TeaVM, and sends the module with TeaVM's loader. The Java objects are mirrored to JavaScript
 * objects here, by id (the `__kata` global the bridge calls): the world in and out, vis() and the check use the
 * mirrors as they use the items of a JavaScript run, and the check's calls into the code go through the bridge. An
 * exception in the code comes back with its class, its message and its line; a trap (a null, an index out of bounds)
 * is named as Java names it, and its line found with TeaVM's deobfuscator.
 */
const TRAPS = [
  [/null/i, 'NullPointerException'],
  [/out of bounds/i, 'ArrayIndexOutOfBoundsException'],
  [/divi\w* by zero/i, 'ArithmeticException'],
  [/call stack|stack overflow|too much recursion/i, 'StackOverflowError'],
  [/cast/i, 'ClassCastException'],
  [/memory/i, 'OutOfMemoryError'],
]

/** A line of the Java source as a line in the class editor or the code. */
function placeJava(line, lines) {
  if (typeof line !== 'number' || line < 1) return { line: null, where: null }
  if (line >= lines.classFrom && line <= lines.classTo) return { line: line - lines.classFrom + 1, where: 'klasse' }
  if (line >= lines.codeFrom && line <= lines.codeTo) return { line: line - lines.codeFrom + 1, where: 'kode' }
  return { line: null, where: null }
}

/**
 * The mirrors and the `__kata` functions the bridge calls. Each class the code's items are made of gets a JavaScript
 * class of the same name (one that extends the item class extends its mirror), with its methods calling back into
 * Java, so a check can call them on an item.
 */
function javaBridge(meta, slots, call, recording) {
  const byId = []
  const ids = new Map()
  const classes = new Map()
  const methods = (cls, names, statics) => {
    for (const m of names) {
      Object.defineProperty(cls.prototype, m, {
        configurable: true,
        writable: true,
        value(...args) { return call((p) => p.invoke(this, m, args)) },
      })
    }
    for (const m of statics) cls[m] = (...args) => call((p) => p.invokeStatic(cls.name, m, args))
  }
  const named = (name, Parent) => (Parent
    ? { [name]: class extends Parent {} }[name]
    : { [name]: class { constructor(props) { if (props && typeof props === 'object') Object.assign(this, props) } } }[name])
  const pending = [...meta.classes]
  while (pending.length) {
    const i = pending.findIndex((c) => !c.parent || classes.has(c.parent) || !pending.some((p) => p.name === c.parent))
    const c = pending.splice(i < 0 ? 0 : i, 1)[0]
    const cls = named(c.name, c.parent ? classes.get(c.parent) : undefined)
    methods(cls, c.methods, c.statics)
    classes.set(c.name, cls)
  }
  if (!classes.has(meta.itemClass)) classes.set(meta.itemClass, named(meta.itemClass))
  const callable = new Set(meta.classes.filter((c) => c.methods.length || c.statics.length).map((c) => c.name))
  const adopt = (v, id) => {
    ids.set(v, id)
    byId[id] = v
  }
  let thrown = null
  // An error a function of the check's threw while Java called it: thrown again, itself, once Java is out.
  const NONE = {}
  let jsError = NONE
  const api = {
    root: (name) => self[name],
    setRoot: (name, v) => { self[name] = v },
    slot: (i) => slots[i],
    kind: (v) => (v === null || v === undefined ? 0 : typeof v === 'string' ? 1 : typeof v === 'number' ? 2
      : typeof v === 'boolean' ? 3 : Array.isArray(v) ? 4 : v instanceof Map ? 5 : v instanceof Set ? 6
        : typeof v === 'object' ? 7 : 8),
    idOf: (v) => ids.get(v) ?? -1,
    clsOf: (v) => constructorName(v) ?? 'Object',
    adopt,
    mirror: (id, cls, kind) => {
      if (byId[id] !== undefined) return byId[id]
      // An item is of its class's mirror, and so is an object whose class has methods (a stack the code declared);
      // anything else (a record, the ant) is a plain object, as it would be in JavaScript.
      const v = kind === 0 ? new (classes.get(cls) ?? classes.get(meta.itemClass))()
        : kind === 1 ? (callable.has(cls) ? new (classes.get(cls))() : {})
          : kind === 2 ? [] : kind === 3 ? new Map() : new Set()
      adopt(v, id)
      return v
    },
    has: (o, k) => o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k),
    empty: (v) => {
      if (Array.isArray(v)) v.length = 0
      else if (v instanceof Map || v instanceof Set) v.clear()
      else for (const k of Object.keys(v)) delete v[k]
    },
    // A field, unless it holds the value already (a frozen monster of the check's, a getter, are left alone then).
    put: (o, k, v) => {
      const d = Object.getOwnPropertyDescriptor(o, k)
      if (d && ('value' in d ? Object.is(d.value, v) : !d.set)) return
      o[k] = v
    },
    fill: (a, values) => {
      if (a.length === values.length && values.every((v, i) => Object.is(a[i], v))) return
      a.length = 0
      a.push(...values)
    },
    vis: (args) => self.vis(...args),
    recording: () => recording(),
    show: (v) => format(v, 0, new Set()),
    thrown: (cls, message, line) => { thrown = { cls, message, line } },
    apply: (f, args) => {
      try {
        return f(...args)
      } catch (err) {
        jsError = err
        return undefined
      }
    },
    threw: () => jsError !== NONE,
    takeError: () => {
      const err = jsError
      jsError = NONE
      return err === NONE ? undefined : { err }
    },
    take: () => {
      const t = thrown
      thrown = null
      return t
    },
  }
  return { api, classes }
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
  // `world` is { objs, roots (names), fields, Monster, start }; objs grows as the code makes new items.
  let world = null
  const readRoots = () => world.roots.map((name) => [name, self[name]])
  const snap = (marked) => snapshotWorld(world.objs, readRoots(), world.fields, world.Monster, marked)

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

  // A Java error knows its place already (javaError, trap).
  const where = (err) => err?.kataPlace ?? place(errorLine(err, cal, false, source.split('\n').length), classLines)

  // A function or class the task wants and the code hasn't declared; a capital letter says class.
  // In Java, the task's solution says how it is declared (`expected`).
  let expected = null
  const missingExport = (name) => {
    if (expected) {
      const decl = expected[name] ?? (/^[A-Z]/.test(name) ? `class ${name}` : `${name}(…)`)
      return /^[A-Z]/.test(name)
        ? `Fant ikke klassen ${name}. Skriv \`${decl} { … }\` i koden.`
        : `Fant ikke metoden ${name}. Skriv \`${decl} { … }\` i koden.`
    }
    return /^[A-Z]/.test(name)
      ? `Fant ikke klassen ${name}. Skriv class ${name} { … } i koden.`
      : `Fant ikke funksjonen ${name}. Skriv function ${name}(…) { … } i koden.`
  }

  const fail = (err, compiling) => {
    if (finished) return
    flush()
    if (!compiling) sendWorld()
    finished = true
    // The code calls an export it never declared (V8 and Firefox say «x is not defined», WebKit «Can't find
    // variable: x»): the task's verdict says so, as when the check finds it missing.
    const undeclared = !compiling && task && err?.name === 'ReferenceError'
      && /^(?:(\S+) is not defined|Can't find variable: (\S+))$/.exec(String(err.message))
    const name = undeclared && (undeclared[1] ?? undeclared[2])
    if (name && (task.exports ?? []).includes(name)) {
      send({ type: 'verdict', ok: false, broken: false, line: null, where: null, message: missingExport(name) })
    }
    const isError = err instanceof Error
    const at = err?.kataPlace ?? place(errorLine(err, cal, compiling, source.split('\n').length), classLines)
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
          lang: expected ? 'java' : 'js',
          Monster: world.Monster,
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
          ? { ok: false, message: missingExport(missing[0]) }
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

  // Java: the module the page compiled, its loader, and what the bridge needs (msg.java). The items are mirrors of
  // the Java objects; once the code has run, the check runs as it does for JavaScript.
  const runJava = async (msg) => {
    const java = msg.java
    expected = java.expected ?? {}
    let program = null
    let deobfuscate = () => []
    const javaError = ({ cls, message, line }) => {
      const err = new Error(message ?? '')
      err.name = cls
      err.kataPlace = placeJava(line, java.lines)
      return err
    }
    const trap = (err) => {
      if (err === null || typeof err !== 'object' || err.kataPlace) return err
      const known = TRAPS.find(([re]) => re.test(String(err.message)))
      if (!known && !(err instanceof WebAssembly.RuntimeError)) return err
      const offsets = [...String(err.stack).matchAll(/wasm-function\[\d+\]:0x([0-9a-f]+)/g)].map((m) => parseInt(m[1], 16))
      let line = null
      try {
        for (const f of deobfuscate(offsets)) {
          if (f.file === 'Main.java' && f.line > 0 && !String(f.className).startsWith('Kata')) {
            line = f.line
            break
          }
        }
      } catch {
        // No line, then.
      }
      return javaError({ cls: known ? known[1] : 'Error', message: known ? '' : String(err.message), line })
    }
    const call = (f) => {
      bridge.api.take()
      let result
      try {
        result = f(program.exports)
      } catch (err) {
        throw trap(err)
      }
      const own = bridge.api.takeError()
      if (own) throw own.err
      const thrown = bridge.api.take()
      if (thrown) throw javaError(thrown)
      return result
    }

    const objs = []
    // Whether vis() still takes frames: not after the run, and past the cap it only counts (as vis() itself does).
    const recording = () => {
      if (finished) return false
      if (frames.length < MAX_FRAMES) return true
      dropped++
      return false
    }
    const bridge = javaBridge(java.meta, objs, call, recording)
    if (msg.world) {
      // Each item gets the fields its class has in Java; the class has dropped any other since the last run.
      const Item = bridge.classes.get(java.meta.itemClass)
      const fields = new Map(java.meta.classes.map((c) => [c.name, new Set(c.fields)]))
      objs.push(...msg.world.items.map((item) => new (bridge.classes.get(item.cls) ?? Item)()))
      const decode = decoder(objs)
      msg.world.items.forEach((item, i) => {
        const kept = fields.get(item.cls) ?? fields.get(java.meta.itemClass)
        for (const p of item.props) if (!kept || kept.has(p.key)) objs[i][p.key] = decode(p)
      })
      const roots = (msg.world.roots ?? []).map((p) => [p.key, decode(p)])
      world = {
        objs,
        roots: roots.map(([name]) => name),
        fields: java.meta.fields,
        Monster: Item,
        start: buildWorld(structuredClone(msg.world), undefined),
      }
      for (const [name, value] of roots) self[name] = value
    }
    self.__kata = bridge.api

    // System.out and System.err, a line at a time.
    const lines = { log: '', error: '' }
    const put = (level, c) => {
      if (c === 10) {
        emit(level, [lines[level]])
        lines[level] = ''
      } else lines[level] += String.fromCharCode(c & 0xffff)
    }
    const flushLines = () => {
      for (const level of ['log', 'error']) if (lines[level]) put(level, 10)
    }
    try {
      const teavm = new Function(java.runtime)()
      const deobfuscator = new Uint8Array(java.deobfuscator)
      program = await teavm.load(new Uint8Array(java.wasm), {
        noAutoImports: true,
        stackDeobfuscator: { enabled: true, path: deobfuscator },
        installImports(imports) {
          imports.teavmConsole = {
            ...imports.teavmConsole,
            putcharStdout: (c) => put('log', c),
            putcharStderr: (c) => put('error', c),
          }
        },
      })
      const own = await teavm.load(deobfuscator, { noAutoImports: true })
      const frames = own.exports.createForModule(program.module)
      deobfuscate = (offsets) => frames.deobfuscate(offsets)
    } catch (err) {
      const e = new Error(`Fikk ikke startet Java: ${errorText(err)}`)
      return fail(e, false)
    }
    try {
      call((p) => p.run())
    } catch (err) {
      flushLines()
      // A trap ends the code before the bridge sends the world back; the module still works, so ask it to.
      try { program.exports.sync() } catch { /* the world as it was */ }
      return fail(err, false)
    }
    flushLines()
    for (const name of java.meta.exports) {
      if (/^[A-Z]/.test(name)) {
        const cls = bridge.classes.get(name)
        const make = function (...args) { return call((p) => p.construct(name, args)) }
        if (cls) make.prototype = cls.prototype
        exported[name] = make
      } else exported[name] = (...args) => call((p) => p.call(name, args))
    }
    mainDone = true
    settle()
  }

  self.onmessage = async (event) => {
    const msg = event.data
    if (!msg || msg.type !== 'run' || startedAt) return
    startedAt = performance.now()
    task = msg.task && typeof msg.task.check === 'string' ? msg.task : null
    if (msg.java) return runJava(msg)
    const code = String(msg.code) + (task ? exportsTrailer(task.exports) : '')
    const install = (Monster) => {
      if (!msg.world) return
      const built = buildWorld(msg.world, Monster)
      world = {
        objs: built.objs,
        roots: built.roots.map(([name]) => name),
        fields: built.fields,
        Monster,
        // A copy of its own: raw values (a grid, a tag list) would otherwise be the code's to change.
        start: buildWorld(structuredClone(msg.world), undefined),
      }
      // The letters name slots, so they can't be reassigned (strict mode throws); the roots can.
      world.objs.forEach((obj, i) => {
        Object.defineProperty(self, label(i), { value: obj, writable: false, enumerable: true, configurable: true })
      })
      for (const [name, value] of built.roots) self[name] = value
    }
    if (typeof msg.classSource === 'string') {
      const [name, alias] = classNames(msg.classSource)
      Object.defineProperty(self, '__kata_build__', {
        configurable: true,
        value: (Monster) => {
          if (typeof Monster !== 'function') {
            const err = new ReferenceError('Fant ingen class Monster over monstrene.')
            err.kataWhere = 'klasse'
            throw err
          }
          // The other name is a global, so code that declares its own Ting (or Monster) keeps it.
          Object.defineProperty(self, alias, { value: Monster, writable: true, configurable: true })
          install(Monster)
        },
      })
      classLines = msg.classSource.split('\n').length
      source = `${msg.classSource}\n;__kata_build__(typeof ${name} === 'function' ? ${name} : undefined)\n${code}`
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
