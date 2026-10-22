/** What a first visit opens with; after that the editor keeps the visitor's own code. */
export const STARTER = `// Skriv JavaScript og trykk «Kjør» (Cmd/Ctrl + Enter).
// Koden lagres i nettleseren.

function reverseWords(sentence) {
  return sentence.split(' ').reverse().join(' ')
}

const words = ['kata', 'er', 'små', 'oppgaver']

console.log(reverseWords(words.join(' ')))
console.log({ antall: words.length, lengste: words.reduce((a, b) => (b.length > a.length ? b : a)) })
`
