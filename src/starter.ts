/** What a first visit opens with; after that the editor keeps the visitor's own code. */
export const STARTER = `// Tingene over koden er en lenket liste. Hver ting har value, color og next,
// og next peker på neste ting. head peker på den første.
// Bokstavene A, B, C … er tingene selv; head kan du flytte.

let node = head
while (node) {
  console.log(node.value, node.color)
  node = node.next
}

// Prøv: head = head.next, A.next = null eller A.color = 'gold'
`

/** Starters from earlier versions: a visitor whose saved code is still one of these gets the new one. */
export const OLD_STARTERS = [
  `// Skriv JavaScript og trykk «Kjør» (Cmd/Ctrl + Enter).
// Koden lagres i nettleseren.

function reverseWords(sentence) {
  return sentence.split(' ').reverse().join(' ')
}

const words = ['kata', 'er', 'små', 'oppgaver']

console.log(reverseWords(words.join(' ')))
console.log({ antall: words.length, lengste: words.reduce((a, b) => (b.length > a.length ? b : a)) })
`,
]
