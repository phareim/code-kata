/** What a first visit opens with; after that the editor keeps the visitor's own code. */
export const STARTER = `// Monstrene over koden er en lenket liste av Monster: klassen står over monstrene.
// Hvert monster har value, color og next, og next peker på neste. head peker på det første.
// Bokstavene A, B, C … er monstrene selv; head kan du flytte.

let node = head
while (node) {
  console.log(node.value, node.color)
  node = node.next
}

// Prøv: head = head.next, A.color = 'gold'
// eller head = new Monster({ value: 5, color: 'lime', next: head })
`

/** The class every item is made of, until the visitor changes it. */
export const MONSTER_CLASS = `// Legg til eller ta bort et felt og trykk «Bruk».
class Monster {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
}`

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
  `// Tingene over koden er en lenket liste. Hver ting har value, color og next,
// og next peker på neste ting. head peker på den første.
// Bokstavene A, B, C … er tingene selv; head kan du flytte.

let node = head
while (node) {
  console.log(node.value, node.color)
  node = node.next
}

// Prøv: head = head.next, A.next = null eller A.color = 'gold'
`,
  `// Tingene over koden er en lenket liste av Ting: klassen står over tingene.
// Hver har value, color og next, og next peker på neste. head peker på den første.
// Bokstavene A, B, C … er tingene selv; head kan du flytte.

let node = head
while (node) {
  console.log(node.value, node.color)
  node = node.next
}

// Prøv: head = head.next, A.color = 'gold'
// eller head = new Ting({ value: 5, color: 'lime', next: head })
`,
]

/** The playground's class from before the items were monsters (until 2026-10-23); saved unchanged, it gets the new one. */
export const OLD_CLASSES = [
  `// Legg til eller ta bort et felt og trykk «Bruk».
class Ting {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
}`,
]

/** What the playground opens with in Java; the class is classes.ts' JAVA_LIST_MONSTER. */
export const JAVA_STARTER = `// Monstrene over koden er en lenket liste av Monster: klassen står over monstrene.
// Hvert monster har value, color og next, og next peker på neste. head peker på det første.
// Bokstavene A, B, C … er monstrene selv; head kan du flytte.

void main() {
    Monster node = head;
    while (node != null) {
        IO.println(node.value + " " + node.color);
        node = node.next;
    }
}

// Prøv: head = head.next; eller A.color = "gold";
// eller Monster m = new Monster(); m.value = 5; m.next = head; head = m;
`
