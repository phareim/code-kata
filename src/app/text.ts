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
