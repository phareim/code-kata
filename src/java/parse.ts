/*
 * Java declarations, read with Lezer's Java parser: the classes at the top of a source (the class editor, a task's
 * prelude) and the members of code that is a class body (the code, which compose.ts makes the body of Main), with
 * their fields, methods and constructors as the bridge needs them. A method's body may not parse (Lezer's Java grammar
 * predates switch patterns); its declaration still does.
 */
import { parser } from '@lezer/java'
import type { SyntaxNode } from '@lezer/common'

export interface Param { type: string; name: string }
export interface Method {
  name: string
  ret: string
  params: Param[]
  isStatic: boolean
  isPrivate: boolean
  /** The method's own type parameters, each with its bound: what a cast to one says. */
  typeVars: Map<string, string>
}
export interface Field { name: string; type: string; isStatic: boolean; isPrivate: boolean; isFinal: boolean }
export interface JClass {
  name: string
  kind: 'class' | 'record' | 'enum' | 'interface'
  /** Declared in the code, as a member of Main (else at the top: the class editor, the prelude). */
  member: boolean
  isStatic: boolean
  isPrivate: boolean
  isAbstract: boolean
  extendsName: string | null
  fields: Field[]
  components: Param[]
  methods: Method[]
  ctors: Param[][]
  /** Where its closing brace is in the source it was read from; -1 when the body doesn't close. */
  close: number
}
export interface Members { classes: JClass[]; methods: Method[]; fields: Field[] }

const text = (src: string, n: SyntaxNode | null | undefined) => (n ? src.slice(n.from, n.to) : '')
const child = (n: SyntaxNode, name: string) => n.getChild(name)

function modifiers(src: string, n: SyntaxNode): string {
  return text(src, child(n, 'Modifiers'))
}

/** Splits at the commas that aren't inside <…>. */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const c of s) {
    if (c === '<') depth++
    if (c === '>') depth--
    if (c === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  if (cur.trim()) out.push(cur)
  return out
}

function cleanType(t: string): string {
  return t.replace(/@\w+(\([^)]*\))?/g, '').replace(/\bfinal\b/g, '').replace(/\s+/g, ' ').trim()
}

function params(src: string, n: SyntaxNode | null): Param[] {
  const inner = text(src, n).replace(/^\(/, '').replace(/\)$/, '')
  return splitTop(inner).map((p) => {
    const m = /^(.*?)([A-Za-z_$][\w$]*)\s*((?:\[\s*\])*)\s*$/s.exec(cleanType(p))
    return m ? { type: `${m[1].trim()}${m[3].replace(/\s/g, '')}`, name: m[2] } : { type: 'Object', name: 'x' }
  }).filter((p) => p.type)
}

function typeVars(src: string, n: SyntaxNode): Map<string, string> {
  const vars = new Map<string, string>()
  const tp = child(n, 'TypeParameters')
  if (!tp) return vars
  for (const part of splitTop(text(src, tp).slice(1, -1))) {
    const m = /^\s*(\w+)(?:\s+extends\s+([\w.]+))?/.exec(part)
    if (m) vars.set(m[1], m[2] ?? 'Object')
  }
  return vars
}

/** The text from after the modifiers (and type parameters) to where the name starts: a member's type. */
function typeBefore(src: string, n: SyntaxNode, end: number): string {
  const after = child(n, 'TypeParameters') ?? child(n, 'Modifiers')
  return cleanType(src.slice(after ? after.to : n.from, end))
}

function readClass(src: string, n: SyntaxNode, member: boolean): JClass {
  const kind = n.name === 'RecordDeclaration' ? 'record' : n.name === 'EnumDeclaration' ? 'enum'
    : n.name === 'InterfaceDeclaration' ? 'interface' : 'class'
  const mods = modifiers(src, n)
  const sup = child(n, 'Superclass')
  const body = child(n, 'ClassBody') ?? child(n, 'RecordBody') ?? child(n, 'EnumBody') ?? child(n, 'InterfaceBody')
  const inner = body ? readMembers(src, body, false) : { classes: [], methods: [], fields: [] }
  const ctors: Param[][] = []
  if (body) {
    for (let c = body.firstChild; c; c = c.nextSibling) {
      if (c.name === 'ConstructorDeclaration' && !/\bprivate\b/.test(modifiers(src, c))) ctors.push(params(src, child(c, 'FormalParameters')))
    }
  }
  const components: Param[] = []
  if (kind === 'record') {
    const list: SyntaxNode[] = []
    const walk = (x: SyntaxNode) => {
      for (let c = x.firstChild; c; c = c.nextSibling) {
        if (c.name === 'RecordComponent') list.push(c)
        else if (c.name !== 'ClassBody' && c.name !== 'RecordBody') walk(c)
      }
    }
    walk(n)
    for (const c of list) {
      const m = /^(.*?)([A-Za-z_$][\w$]*)\s*$/s.exec(cleanType(text(src, c)))
      if (m) components.push({ type: m[1].trim(), name: m[2] })
    }
  }
  return {
    name: text(src, child(n, 'Definition')),
    kind,
    member,
    isStatic: !member || /\bstatic\b/.test(mods) || kind !== 'class',
    isPrivate: /\bprivate\b/.test(mods),
    isAbstract: /\babstract\b/.test(mods),
    extendsName: sup ? text(src, sup).replace(/^extends\s+/, '').replace(/<.*$/s, '').trim() : null,
    fields: inner.fields,
    components,
    methods: inner.methods,
    ctors,
    close: body && src[body.to - 1] === '}' ? body.to - 1 : -1,
  }
}

const DECLARATIONS = ['ClassDeclaration', 'RecordDeclaration', 'EnumDeclaration', 'InterfaceDeclaration']

function readMembers(src: string, body: SyntaxNode, member: boolean): Members {
  const out: Members = { classes: [], methods: [], fields: [] }
  for (let c = body.firstChild; c; c = c.nextSibling) {
    if (DECLARATIONS.includes(c.name)) out.classes.push(readClass(src, c, member))
    else if (c.name === 'FieldDeclaration') {
      const mods = modifiers(src, c)
      const declarators = c.getChildren('VariableDeclarator')
      if (!declarators.length) continue
      const type = typeBefore(src, c, declarators[0].from)
      for (const d of declarators) {
        const name = /^[A-Za-z_$][\w$]*/.exec(text(src, d))?.[0]
        if (name) out.fields.push({ name, type, isStatic: /\bstatic\b/.test(mods), isPrivate: /\bprivate\b/.test(mods), isFinal: /\bfinal\b/.test(mods) })
      }
    } else if (c.name === 'MethodDeclaration') {
      const def = child(c, 'Definition')
      if (!def) continue
      const mods = modifiers(src, c)
      out.methods.push({
        name: text(src, def),
        ret: typeBefore(src, c, def.from),
        params: params(src, child(c, 'FormalParameters')),
        isStatic: /\bstatic\b/.test(mods),
        isPrivate: /\bprivate\b/.test(mods),
        typeVars: typeVars(src, c),
      })
    }
  }
  return out
}

/** The classes declared at the top of a source (the class editor, a prelude). */
export function topClasses(source: string): JClass[] {
  const tree = parser.parse(source)
  const out: JClass[] = []
  for (let c = tree.topNode.firstChild; c; c = c.nextSibling) if (DECLARATIONS.includes(c.name)) out.push(readClass(source, c, false))
  return out
}

/** The members of code that is the body of a class: its methods, fields and classes. */
export function codeMembers(code: string): Members {
  const src = `class Main {\n${code}\n}`
  const tree = parser.parse(src)
  const main = tree.topNode.getChild('ClassDeclaration')
  const body = main && child(main, 'ClassBody')
  return body ? readMembers(src, body, true) : { classes: [], methods: [], fields: [] }
}
