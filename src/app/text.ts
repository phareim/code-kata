/*
 * A task's text as DOM: paragraphs split by a blank line, lines starting with "- " as a list, `code` in backticks.
 * Built node by node, never as HTML, so a task's text can hold any character.
 */

function inline(text: string): Node[] {
  return text.split('`').map((part, i) => {
    if (i % 2 === 0) return document.createTextNode(part)
    const code = document.createElement('code')
    code.textContent = part
    return code
  })
}

export function richText(text: string): DocumentFragment {
  const out = document.createDocumentFragment()
  for (const block of text.trim().split(/\n\s*\n/)) {
    // A run of "- " lines is a list, even straight after a sentence; the lines around it are paragraphs.
    let run: string[] = []
    let listed = false
    const end = () => {
      if (!run.length) return
      if (listed) {
        const list = document.createElement('ul')
        for (const line of run) {
          const li = document.createElement('li')
          li.append(...inline(line.slice(2)))
          list.append(li)
        }
        out.append(list)
      } else {
        const p = document.createElement('p')
        p.append(...inline(run.join(' ')))
        out.append(p)
      }
      run = []
    }
    for (const line of block.split('\n')) {
      const item = line.startsWith('- ')
      if (item !== listed) end()
      listed = item
      run.push(line)
    }
    end()
  }
  return out
}

/** `code`, **bold** and *emphasis* inside a line of a reply; nothing inside backticks is read as either. */
function inlineReply(text: string): Node[] {
  return text.split('`').flatMap((part, i) => {
    if (i % 2 === 1) {
      const code = document.createElement('code')
      code.textContent = part
      return [code]
    }
    return part.split(/(\*\*[^*]+\*\*|\*[^*\s](?:[^*]*[^*\s])?\*)/).map((piece): Node => {
      const bold = /^\*\*[^*]+\*\*$/.test(piece)
      if (!bold && !/^\*[^*\s](?:[^*]*[^*\s])?\*$/.test(piece)) return document.createTextNode(piece)
      const node = document.createElement(bold ? 'strong' : 'em')
      node.textContent = piece.slice(bold ? 2 : 1, bold ? -2 : -1)
      return node
    })
  })
}

/*
 * A reply from Claude as DOM: fenced code blocks, paragraphs, lists ("- " or "1. "), `code` and **bold**. Built node
 * by node like richText, and safe on half a reply: an open fence runs to the end.
 */
export function replyText(text: string): DocumentFragment {
  const out = document.createDocumentFragment()
  const pieces = text.split(/^```[^\n]*\n?/m)
  pieces.forEach((piece, i) => {
    if (i % 2 === 1) {
      const pre = document.createElement('pre')
      const code = document.createElement('code')
      code.textContent = piece.replace(/\n$/, '')
      pre.append(code)
      out.append(pre)
      return
    }
    for (const block of piece.trim().split(/\n\s*\n/)) {
      if (!block.trim()) continue
      let list: HTMLElement | null = null
      let para: string[] = []
      const endPara = () => {
        if (!para.length) return
        const p = document.createElement('p')
        p.append(...inlineReply(para.join(' ')))
        out.append(p)
        para = []
      }
      for (const line of block.split('\n')) {
        const item = /^\s*(?:[-*]|(\d+)[.)])\s+(.*)$/.exec(line)
        if (item) {
          endPara()
          const tag = item[1] ? 'ol' : 'ul'
          if (!list || list.tagName.toLowerCase() !== tag) {
            list = document.createElement(tag)
            out.append(list)
          }
          const li = document.createElement('li')
          li.append(...inlineReply(item[2]))
          list.append(li)
        } else {
          list = null
          para.push(line.trim())
        }
      }
      endPara()
    }
  })
  return out
}

/** Inline text only: a hint, a verdict. */
export function inlineText(text: string): DocumentFragment {
  const out = document.createDocumentFragment()
  out.append(...inline(text))
  return out
}

/** The words a search matches against, lower case and without accents. */
export function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
