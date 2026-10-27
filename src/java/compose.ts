/*
 * Java code as one source for the compiler: the class editor's classes, the task's own types (its prelude), the code
 * as the body of `final class Main` (as in a Java 25 compact source file: fields, methods and `void main()`), then the
 * bridge to the page. KataWorld holds the roots and the letters as static fields Main inherits; Main.KataGen, nested in
 * Main so it reaches the code's own classes, converts each class's fields and calls what the check asks for. Kata.java
 * is the fixed half of the bridge. The page compiles it to WebAssembly (src/java/compiler.ts) and the worker runs it
 * (src/run/worker.js, javaBridge).
 */
import bridge from './Kata.java?raw'
import { codeMembers, topClasses, type JClass, type Method, type Param } from './parse'

/** A root: its name, and its type in Java. */
export interface Root { name: string; type: string }

export interface ComposeInput {
  classSource: string
  code: string
  roots: Root[]
  /** How many items the world has: with any, the letters A … Z are fields of the item class. */
  items: number
  /** Types the task gives the code (a record a function returns, the ant's class). */
  prelude?: string
  /** The functions and classes the task's check calls. */
  exports?: string[]
}

/** What the worker needs to mirror the classes and answer the check. */
export interface JavaMeta {
  /** The classes the bridge mirrors: items (the item class and what extends it) and others, with their methods. */
  classes: { name: string; item: boolean; parent: string | null; fields: string[]; methods: string[]; statics: string[] }[]
  /** The item class's fields, in order: the world's `fields`. */
  fields: string[]
  itemClass: string
  /** The task's exports the code declares. */
  exports: string[]
}

export interface Composed {
  source: string
  /** Where the class editor and the code are in the source, by line (1-based, inclusive). */
  lines: { classFrom: number; classTo: number; codeFrom: number; codeTo: number }
  meta: JavaMeta
  /** Something to say before compiling: the code can't work with the bridge as it is. */
  problem: string | null
}

const IMPORT = /^\s*import\s+(?:static\s+)?[\w.]+(?:\.\*)?\s*;\s*$/
const DEFAULT_IMPORTS = ['import java.util.*;', 'import java.util.function.*;', 'import java.util.stream.*;']

/** Imports go to the top of the source; their lines stay, empty, so the other lines keep their numbers. */
function hoist(source: string, into: string[]): string[] {
  return source.split('\n').map((line) => {
    if (!IMPORT.test(line)) return line
    into.push(line.trim())
    return ''
  })
}

/** A type without its type arguments, and a type variable as its bound: what a cast can say anywhere. */
function erased(type: string, vars: Map<string, string> = new Map()): string {
  let t = type.replace(/<.*>/s, '').replace(/\.\.\.$/, '[]').trim()
  const base = /^[\w.$]+/.exec(t)?.[0] ?? 'Object'
  if (vars.has(base)) t = t.replace(base, vars.get(base)!)
  return t
}

const BOXED: Record<string, string> = {
  int: 'Integer', long: 'Long', short: 'Short', byte: 'Byte', double: 'Double', float: 'Float', char: 'Character', boolean: 'Boolean',
}

const quote = (s: string) => JSON.stringify(s)

/** The Java the compiler gets, and what the worker needs to know about it. */
export function compose(input: ComposeInput): Composed {
  const imports = [...DEFAULT_IMPORTS]
  let classLines = hoist(input.classSource, imports)
  const codeLines = hoist(input.code, imports)
  const prelude = input.prelude?.trim() ?? ''

  const top = topClasses(classLines.join('\n'))
  const preludeClasses = prelude ? topClasses(prelude) : []
  const members = codeMembers(codeLines.join('\n'))
  const itemTop = top.find((c) => c.name === 'Monster') ?? top.find((c) => c.kind === 'class')
  const itemClass = itemTop?.name ?? 'Monster'
  // An item prints as the console prints it (`Monster { value: 7, color: 'pink', next: … }`), not as Monster@1b6d3586,
  // unless its class says otherwise. On the line of the class's closing brace, so the lines stay where they are.
  if (itemTop && itemTop.close >= 0 && !itemTop.methods.some((m) => m.name === 'toString' && !m.params.length)) {
    const joined = classLines.join('\n')
    classLines = `${joined.slice(0, itemTop.close)} public String toString() { return KataBridge.show(this); } ${joined.slice(itemTop.close)}`.split('\n')
  }

  const known = [...top, ...preludeClasses, ...members.classes].filter((c) => c.kind === 'class' || c.kind === 'record')
  const byName = new Map(known.map((c) => [c.name, c]))
  const ancestors = (c: JClass): JClass[] => {
    const chain: JClass[] = []
    for (let x: JClass | undefined = c; x && !chain.includes(x); x = x.extendsName ? byName.get(x.extendsName) : undefined) chain.push(x)
    return chain
  }
  const isItem = (c: JClass) => ancestors(c).some((x) => x.name === itemClass && !x.member)
  // Subclasses before the classes they extend, so `instanceof` picks the most specific.
  const ordered = [...known].sort((a, b) => ancestors(b).length - ancestors(a).length)
  const visible = ordered.filter((c) => !c.isPrivate)
  const ref = (c: JClass) => c.name

  const types: string[] = []
  const tyOf = (t: string) => {
    let i = types.indexOf(t)
    if (i < 0) i = types.push(t) - 1
    return `T${i}`
  }
  const arrays = new Set<string>()
  const noteArray = (t: string) => {
    for (let s = t.replace(/<.*>/s, ''); /\[\]$/.test(s); s = s.slice(0, -2)) {
      const elem = s.slice(0, -2)
      if (/^[A-Z]/.test(elem)) arrays.add(elem)
    }
  }

  const fieldsOf = (c: JClass, settable: boolean) => ancestors(c).flatMap((x) => (x.kind === 'record' ? [] : x.fields))
    .filter((f) => !f.isPrivate && !f.isStatic && (!settable || !f.isFinal))

  const gen: string[] = []
  gen.push('static final class KataGen {')
  gen.push('  static String cls(Object o) {')
  for (const c of visible) gen.push(`    if (o instanceof ${ref(c)}) return ${quote(c.name)};`)
  gen.push('    return null;')
  gen.push('  }')
  const items = visible.filter(isItem).map((c) => c.name)
  gen.push(`  static boolean isItem(String c) { return ${items.length ? items.map((n) => `c.equals(${quote(n)})`).join(' || ') : 'false'}; }`)

  gen.push('  static Object make(String c) {')
  gen.push('    switch (c) {')
  for (const c of visible) {
    if (c.kind !== 'class' || c.isAbstract) continue
    if (c.ctors.length && !c.ctors.some((p) => p.length === 0)) continue
    const create = c.member && !c.isStatic ? `KataBridge.code.new ${c.name}()` : `new ${ref(c)}()`
    gen.push(`      case ${quote(c.name)}: return ${create};`)
  }
  gen.push('      default: return null;')
  gen.push('    }')
  gen.push('  }')

  gen.push('  static void out(Object o, org.teavm.jso.JSObject js) {')
  visible.forEach((c, i) => {
    const puts = c.kind === 'record'
      ? c.components.map((p) => `KataBridge.put(js, ${quote(p.name)}, KataBridge.out(x.${p.name}()));`)
      : fieldsOf(c, false).map((f) => `KataBridge.put(js, ${quote(f.name)}, KataBridge.out(x.${f.name}));`)
    gen.push(`    ${i ? 'else ' : ''}if (o instanceof ${ref(c)} x) { ${puts.join(' ')} }`)
  })
  gen.push('  }')

  gen.push('  static void in(Object o, org.teavm.jso.JSObject js) {')
  let first = true
  for (const c of visible) {
    if (c.kind === 'record') continue
    const vars = new Map(ancestors(c).flatMap((x) => [...x.typeVars]))
    const sets = fieldsOf(c, true).map((f) => {
      noteArray(f.type)
      const read = `KataBridge.in(KataBridge.get(js, ${quote(f.name)}), ${tyOf(f.type)})`
      const boxed = BOXED[f.type]
      const assign = boxed ? `if (v != null) x.${f.name} = (${boxed}) v;` : `x.${f.name} = (${erased(f.type, vars)}) v;`
      return `if (KataBridge.has(js, ${quote(f.name)})) { Object v = ${read}; ${assign} }`
    })
    gen.push(`    ${first ? '' : 'else '}if (o instanceof ${ref(c)} x) { ${sets.join(' ')} }`)
    first = false
  }
  gen.push('  }')

  // A call's arguments, converted as the method's parameters ask.
  const callArgs = (m: Method) => m.params.map((p, i) => {
    noteArray(p.type)
    const boxed = BOXED[p.type]
    const read = `KataBridge.arg(a, ${i}, ${tyOf(p.type)})`
    return boxed ? `(${boxed}) ${read}` : `(${erased(p.type, m.typeVars)}) ${read}`
  }).join(', ')
  const invoke = (target: string, m: Method) => (m.ret === 'void'
    ? `{ ${target}.${m.name}(${callArgs(m)}); return KataBridge.VOID; }`
    : `return ${target}.${m.name}(${callArgs(m)});`)
  /** Cases for methods by name, and by the number of arguments when one name has several. */
  const dispatch = (methods: Method[], target: (m: Method) => string, indent: string) => {
    const names = [...new Set(methods.map((m) => m.name))]
    const lines: string[] = []
    for (const name of names) {
      const same = methods.filter((m) => m.name === name)
      lines.push(`${indent}case ${quote(name)}:`)
      if (same.length === 1) lines.push(`${indent}  ${invoke(target(same[0]), same[0])}`)
      else {
        for (const m of same) lines.push(`${indent}  if (n == ${m.params.length}) ${invoke(target(m), m)}`)
        lines.push(`${indent}  break;`)
      }
    }
    return lines
  }

  const wanted = input.exports ?? []
  const exportedMethods = members.methods.filter((m) => wanted.includes(m.name) && !m.isPrivate)
  const exportedClasses = members.classes.filter((c) => wanted.includes(c.name) && c.kind !== 'interface' && !c.isPrivate)
  gen.push('  static Object call(String name, org.teavm.jso.JSObject a) {')
  gen.push('    int n = KataBridge.len(a);')
  gen.push('    switch (name) {')
  gen.push(...dispatch(exportedMethods, () => 'KataBridge.code', '      '))
  gen.push('      default: break;')
  gen.push('    }')
  gen.push('    return KataBridge.VOID;')
  gen.push('  }')

  gen.push('  static Object construct(String name, org.teavm.jso.JSObject a) {')
  gen.push('    int n = KataBridge.len(a);')
  gen.push('    switch (name) {')
  for (const c of exportedClasses) {
    if (c.kind === 'enum' || c.isAbstract) continue
    const create = (ps: Param[]) => {
      const m: Method = { name: c.name, ret: c.name, params: ps, isStatic: false, isPrivate: false, isAbstract: false, typeVars: c.typeVars }
      return c.member && !c.isStatic ? `KataBridge.code.new ${c.name}(${callArgs(m)})` : `new ${c.name}(${callArgs(m)})`
    }
    const ctors = c.kind === 'record' ? [c.components] : c.ctors.length ? c.ctors : [[]]
    gen.push(`      case ${quote(c.name)}:`)
    if (ctors.length === 1) gen.push(`        return ${create(ctors[0])};`)
    else {
      for (const ps of ctors) gen.push(`        if (n == ${ps.length}) return ${create(ps)};`)
      gen.push('        break;')
    }
  }
  gen.push('      default: break;')
  gen.push('    }')
  gen.push('    return KataBridge.VOID;')
  gen.push('  }')

  gen.push('  static Object invoke(Object self, String name, org.teavm.jso.JSObject a) {')
  gen.push('    int n = KataBridge.len(a);')
  for (const c of visible) {
    const own = c.methods.filter((m) => !m.isStatic && !m.isPrivate)
    if (!own.length) continue
    gen.push(`    if (self instanceof ${ref(c)} x) {`)
    gen.push('      switch (name) {')
    gen.push(...dispatch(own, () => 'x', '        '))
    gen.push('        default: break;')
    gen.push('      }')
    gen.push('    }')
  }
  gen.push('    return KataBridge.VOID;')
  gen.push('  }')

  gen.push('  static Object invokeStatic(String c, String name, org.teavm.jso.JSObject a) {')
  gen.push('    int n = KataBridge.len(a);')
  for (const c of visible) {
    const statics = c.methods.filter((m) => m.isStatic && !m.isPrivate)
    if (!statics.length) continue
    gen.push(`    if (c.equals(${quote(c.name)})) {`)
    gen.push('      switch (name) {')
    gen.push(...dispatch(statics, () => ref(c), '        '))
    gen.push('        default: break;')
    gen.push('      }')
    gen.push('    }')
  }
  gen.push('    return KataBridge.VOID;')
  gen.push('  }')

  // A function from the check as one of the code's (or the task's) interfaces with a single abstract method.
  const interfaces = [...top, ...preludeClasses, ...members.classes].filter((c) => c.kind === 'interface' && !c.isPrivate)
  gen.push('  static Object fn(String t, KataBridge.Fn f) {')
  gen.push('    switch (t) {')
  for (const c of interfaces) {
    const abstract = c.methods.filter((m) => m.isAbstract)
    if (abstract.length !== 1) continue
    const m = abstract[0]
    const ps = m.params.map((p) => `${erased(p.type, m.typeVars)} ${p.name}`).join(', ')
    const pass = ['', ...m.params.map((p) => p.name)].join(', ')
    const ret = erased(m.ret, m.typeVars)
    const body = m.ret === 'void'
      ? `f.call(KataBridge.VOID_TY${pass});`
      : `return (${BOXED[m.ret] ?? ret}) f.call(${tyOf(m.ret)}${pass});`
    gen.push(`      case ${quote(c.name)}: return new ${c.name}() { public ${ret} ${m.name}(${ps}) { ${body} } };`)
  }
  gen.push('      default: return null;')
  gen.push('    }')
  gen.push('  }')

  const main = members.methods.find((m) => m.name === 'main' && m.params.length === 0)
    ?? members.methods.find((m) => m.name === 'main' && m.params.length === 1 && /String\s*(\[\]|\.\.\.)/.test(m.params[0].type))
  gen.push(`  static void main() { ${!main ? '' : main.params.length ? 'KataBridge.code.main(new String[0]);' : 'KataBridge.code.main();'} }`)

  for (const r of input.roots) noteArray(r.type)
  gen.push('  static Object newArray(String t, int n) {')
  gen.push('    switch (t) {')
  for (const elem of arrays) {
    if (byName.get(elem.replace(/\[\]/g, ''))?.isPrivate) continue
    gen.push(`      case ${quote(elem)}: return new ${elem.replace(/^([^[]+)/, '$1[n]')};`)
  }
  gen.push('      default: return null;')
  gen.push('    }')
  gen.push('  }')
  types.forEach((t, i) => gen.push(`  static final KataBridge.Ty T${i} = KataBridge.ty(${quote(t)});`))
  gen.push('}')

  const world: string[] = ['abstract class KataWorld {']
  if (input.items > 0 && itemTop) {
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i)
      world.push(`  static final ${itemClass} ${letter} = (${itemClass}) KataBridge.slot(${i}, ${quote(itemClass)});`)
    }
  }
  for (const r of input.roots) {
    const boxed = BOXED[r.type]
    world.push(`  static ${r.type} ${r.name} = (${boxed ?? erased(r.type)}) KataBridge.root(${quote(r.name)}, ${quote(r.type)});`)
  }
  world.push('  static void start() {}')
  world.push(`  static void rootsOut() { ${input.roots.map((r) => `KataBridge.setRoot(${quote(r.name)}, KataBridge.out(${r.name}));`).join(' ')} }`)
  world.push('  static void vis(Object... marks) { KataBridge.vis(marks); }')
  world.push('}')

  const head = [...new Set(imports)]
  const lines: string[] = [...head]
  const classFrom = lines.length + 1
  lines.push(...classLines)
  const classTo = lines.length
  if (prelude) lines.push(prelude)
  lines.push('final class Main extends KataWorld {')
  const codeFrom = lines.length + 1
  lines.push(...codeLines)
  const codeTo = lines.length
  lines.push(...gen, '}', ...world, bridge)

  let problem: string | null = null
  if (input.items > 0 && !itemTop) problem = 'Fant ingen klasse over monstrene. Skriv class Monster { … } i klassen.'
  else if (itemTop && itemTop.ctors.length && !itemTop.ctors.some((p) => p.length === 0)) {
    problem = `${itemClass} trenger en konstruktør uten parametere, så monstrene kan bygges: ${itemClass}() { }`
  }

  const meta: JavaMeta = {
    classes: visible.map((c) => ({
      name: c.name,
      item: isItem(c),
      parent: c.extendsName && byName.has(c.extendsName) ? c.extendsName : null,
      fields: c.kind === 'record' ? c.components.map((p) => p.name) : fieldsOf(c, false).map((f) => f.name),
      methods: [...new Set(c.methods.filter((m) => !m.isStatic && !m.isPrivate).map((m) => m.name))],
      statics: [...new Set(c.methods.filter((m) => m.isStatic && !m.isPrivate).map((m) => m.name))],
    })),
    fields: itemTop ? fieldsOf(itemTop, false).map((f) => f.name) : [],
    itemClass,
    exports: [...exportedMethods.map((m) => m.name), ...exportedClasses.map((c) => c.name)].filter((n, i, all) => all.indexOf(n) === i),
  }
  return { source: lines.join('\n'), lines: { classFrom, classTo, codeFrom, codeTo }, meta, problem }
}
