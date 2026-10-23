/*
 * Språk: words and text in Norwegian. The letters of a word are monsters in a list or a row (their value is the
 * letter), words are monsters too, and tasks about plain text get a string in a root and no monsters at all.
 * The Norwegian alphabet is a–z, then æ ø å; the vowels are a e i o u y æ ø å (y counts). A check can't use anything
 * from this module, so each one that needs the alphabet or the vowels writes them out.
 */
import { arrayWorld, at, int, letters, listWorld, makeWorld, pick, shuffled, worded } from './build'
import { TEXT_LIST_MONSTER, TEXT_MONSTER } from './classes'
import type { Task } from './types'

const SPELLED = ['elg', 'ørn', 'bjørn', 'hjerte', 'blåbær', 'regnbue', 'sjøhest', 'ærlig', 'månelys', 'eventyr', 'snømann', 'jordbær', 'vårluft', 'frøken']

const PALINDROMES = ['reker', 'rotor', 'radar', 'regninger', 'sus', 'ebbe', 'Anna', 'Otto', 'madam', 'gag']
const NOT_PALINDROMES = ['katt', 'regnbue', 'radio', 'rotte', 'sirkus', 'fisk', 'monster', 'rakett', 'rolig', 'sokk']

const SENTENCES = [
  'Syv sure sjøløver sang i havgapet',
  'Ørnen svevde over Ålesund',
  'Blåbærene modnet i Østmarka',
  'Gryta bobler på komfyren',
  'Måneskinnet lå som sølv på sjøen',
  'Hytta ligger bak det store fjellet',
]

const ROVER_TEXTS = ['Kalle spiser rømmegrøt', 'Møt meg ved brua klokka 7', 'Hemmelig melding!', 'God tur, Ola Nordmann', 'Ørnen bor på fjellet']

const PHRASES = ['Den norske turistforening', 'Norsk rikskringkasting', 'Norges statsbaner', 'sør-øst for månen', 'Ola og Kari ved fjorden']

const NOUNS = ['bil', 'bakke', 'stol', 'hund', 'katt', 'ape', 'stige', 'fisk', 'hest', 'tur', 'bjørn', 'bølge']

const SORT_PLAIN = ['ape', 'bie', 'dag', 'elg', 'hav', 'is', 'kyr', 'lam', 'mus', 'sau', 'tre', 'ugle', 'vann', 'ost']
const SORT_YZ = ['yr', 'yoga', 'zoo', 'zoom', 'yte', 'yngel']
const SORT_AE = ['ære', 'æsj', 'ærlig']
const SORT_OE = ['ørn', 'øre', 'øy', 'ørret', 'øl']
const SORT_AA = ['ål', 'åre', 'åker', 'åpen']

const ANAGRAMS: [string, string][] = [['lampe', 'palme'], ['ost', 'sto'], ['lyst', 'sylt'], ['ål', 'lå'], ['lås', 'sål'], ['stein', 'sinte'], ['sol', 'los']]
const NEAR_MISSES: [string, string][] = [['seks', 'sekk'], ['lampe', 'lamme'], ['ball', 'bal'], ['sko', 'skog']]

// Groups that rhyme by the task's rule (equal from the last vowel): no two groups share an ending, but several
// end on the same letter (l, t, g, n), so colouring by the last letter alone doesn't pass.
const RHYMES = [
  ['katt', 'hatt', 'matt', 'skatt'],
  ['fest', 'hest', 'vest', 'test'],
  ['kost', 'post', 'ost'],
  ['sol', 'stol', 'fiol', 'pol'],
  ['bil', 'fil', 'pil', 'mil'],
  ['ball', 'hall', 'stall', 'fall'],
  ['ring', 'ting', 'sving'],
  ['sang', 'gang', 'tang'],
  ['mann', 'vann', 'brann'],
  ['stein', 'bein', 'rein'],
  ['mus', 'hus', 'lus', 'grus'],
  ['sjø', 'snø', 'frø', 'tø'],
]

// Each chain: every word starts with the last letter of the one before, the first letters are all different, and
// the last word ends on a letter no word starts with, so there is only one way to put the words in a row.
const CHAINS = [
  ['ape', 'elg', 'gris', 'sau', 'ulv', 'vann'],
  ['sjø', 'ørn', 'nese', 'egg', 'gull', 'lam'],
  ['dør', 'rev', 'vott', 'tå', 'ål', 'lys'],
  ['ekorn', 'nål', 'lam', 'mus', 'sko', 'ost'],
  ['fisk', 'katt', 'tiger', 'rotte', 'elg', 'gås'],
]

const CAESAR_TEXTS = ['Hemmelig melding', 'Møt meg ved brua klokka 7', 'God tur til Ålesund!', 'Ørnen så ut over fjorden']

const TYPOS: [string, string[]][] = [
  ['bjorn', ['bjørn', 'bjørk', 'bjelle', 'bjelke']],
  ['kirsebaer', ['kirke', 'kirsebær', 'kjerne', 'kirurg']],
  ['sjohest', ['sjøhest', 'sjørøver', 'sjømann', 'sjokolade']],
  ['reganbue', ['regnbue', 'regnbyge', 'regjering', 'regning']],
]

export const tasks: Task[] = [
  {
    id: 'les-beskjeden',
    title: 'Les beskjeden',
    level: 'lett',
    topic: 'språk',
    text: `Monstrene i lista \`head\` har hver sin bokstav, og sammen staver de et ord. Skriv \`function readWord(head)\` som går gjennom lista og gir ordet tilbake som en tekst, for eksempel \`'elg'\`.

En tom liste (\`null\`) har ingen bokstaver. Da skal du gi tilbake en tom tekst, \`''\`.`,
    hints: [
      "Start med en tom tekst, `let word = ''`, og gå gjennom lista med `let node = head`.",
      'For hvert monster: legg bokstaven `node.value` bakerst i teksten (`word += node.value`), og gå videre med `node = node.next`.',
      'Løkka går så lenge `node` finnes. Til slutt gir du tilbake `word`. For en tom liste går løkka aldri, så du får den tomme teksten uten å gjøre noe mer.',
    ],
    world: (r) => listWorld(letters(pick(r, SPELLED))),
    monster: TEXT_LIST_MONSTER,
    scaffold: `function readWord(head) {
  // Gå gjennom lista og sett bokstavene sammen til et ord
  return ''
}

console.log(readWord(head))
`,
    solution: `function readWord(head) {
  let word = ''
  let node = head
  while (node) {
    word += node.value
    vis(word, node)
    node = node.next
  }
  return word
}

console.log(readWord(head))
`,
    exports: ['readWord'],
    check: (t) => {
      const readWord = t.fn('readWord')
      const spelled = t.values(t.start.head)
      const cases: string[][] = [spelled ?? [], ['s', 'o', 'l'], ['b', 'l', 'å', 'b', 'æ', 'r'], ['æ', 'r', 'l', 'i', 'g'], ['ø'], []]
      for (const spelling of cases) {
        const head = t.list(spelling)
        const want = spelling.join('')
        const got = readWord(head)
        if (got !== want) {
          const what = spelling.length ? `lista ${t.show(spelling)}` : 'en tom liste (null)'
          return `For ${what} skal readWord gi ${t.show(want)}, men gav ${t.show(got)}.`
        }
        if (t.values(head)?.join('') !== want) return 'readWord skal bare lese lista, ikke endre på den.'
      }
      return true
    },
  },
  {
    id: 'palindrom',
    title: 'Palindrom',
    level: 'lett',
    topic: 'språk',
    text: `Et palindrom leses likt forlengs og baklengs: «radar» er «radar» også baklengs. Monstrene i \`items\` staver et ord, med én bokstav på hvert. Skriv \`function isPalindrome(items)\` som gir \`true\` hvis ordet er et palindrom, og \`false\` hvis ikke.

Store og små bokstaver regnes som like, så «Anna» er et palindrom. Et ord med én bokstav er det også, og en tom rad.`,
    hints: [
      'Sammenlign bokstavene fra hver sin ende: den første med den siste, den andre med den nest siste, og så videre.',
      'Du trenger bare gå halve veien: `for (let i = 0; i < items.length / 2; i++)`. Det motsatte monsteret står på plass `items.length - 1 - i`.',
      'Er `items[i].value.toLowerCase()` ulik bokstaven på motsatt side, er svaret `false` med en gang. Kommer du gjennom hele løkka, er svaret `true`.',
    ],
    world: (r) => arrayWorld(letters(pick(r, r() < 0.5 ? PALINDROMES : NOT_PALINDROMES))),
    monster: TEXT_MONSTER,
    scaffold: `function isPalindrome(items) {
  // Sammenlign første med siste, andre med nest siste …
  return true
}

console.log(isPalindrome(items))
`,
    solution: `function isPalindrome(items) {
  for (let i = 0; i < items.length / 2; i++) {
    const left = items[i]
    const right = items[items.length - 1 - i]
    vis(left, right)
    if (left.value.toLowerCase() !== right.value.toLowerCase()) return false
  }
  return true
}

console.log(isPalindrome(items))
`,
    exports: ['isPalindrome'],
    check: (t) => {
      const isPalindrome = t.fn('isPalindrome')
      const shown = (t.start.items ?? []).map((m: { value: string }) => m.value).join('')
      const words = [shown, '', 'a', 'sus', 'Anna', 'Radar', 'reKer', 'regninger', 'ebbe', 'ææ', 'øæø', 'katt', 'ab', 'åø', 'rotor', 'rotte', 'ebba', 'monster', 'Otto', 'ot', 'abca']
      for (const word of words) {
        const small = [...word.toLowerCase()]
        const want = small.join('') === small.reverse().join('')
        const items = [...word].map((value) => t.monster({ value, color: 'pink' }))
        const copy = items.slice()
        const got = isPalindrome(items)
        if (got !== want) return `For ${t.show(word)} skal isPalindrome gi ${want}, men gav ${t.show(got)}.`
        if (items.length !== copy.length || items.some((m: unknown, i: number) => m !== copy[i])) {
          return 'isPalindrome skal ikke flytte på monstrene i raden. Se på dem, men la dem stå som de er.'
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Palindrome',
  },
  {
    id: 'tell-vokalene',
    title: 'Tell vokalene',
    level: 'lett',
    topic: 'språk',
    text: `\`text\` er en setning. Skriv \`function vowels(text)\` som teller vokalene i en tekst, både store og små. På norsk er vokalene \`a e i o u y æ ø å\`: ni stykker, og det er lett å glemme y og de tre siste.

Konsonanter, mellomrom, tall og tegn teller ikke.`,
    hints: [
      'Gjør teksten liten med `text.toLowerCase()`, så du bare trenger å se etter små bokstaver.',
      'Gå gjennom bokstavene med `for (const letter of ...)`, og tell opp en teller hver gang bokstaven er en vokal.',
      "Er den en vokal? `'aeiouyæøå'.includes(letter)` svarer på det. Til slutt gir du tilbake telleren.",
    ],
    world: (r) => makeWorld([], { text: pick(r, SENTENCES) }),
    scaffold: `function vowels(text) {
  // Tell vokalene: a e i o u y æ ø å
  return 0
}

console.log(vowels(text))
`,
    solution: `function vowels(text) {
  let count = 0
  for (const letter of text.toLowerCase()) {
    if ('aeiouyæøå'.includes(letter)) count++
  }
  return count
}

console.log(vowels(text))
`,
    exports: ['vowels'],
    check: (t) => {
      const vowels = t.fn('vowels')
      const count = (s: string) => [...s.toLowerCase()].filter((c) => 'aeiouyæøå'.includes(c)).length
      const texts = [t.start.text, '', 'bcdfg', 'aeiouyæøå', 'AEIOUYÆØÅ', 'Hei på deg!', 'Syv sure sjøløver', 'Ørnen svevde over Ålesund', 'xyz', 'Å', 'Hytte', 'Tre 7-åringer i 2 kyr', 'æ ø å']
      for (const s of texts) {
        const got = vowels(s)
        const want = count(s)
        if (got !== want) {
          const tip = typeof got === 'number' && got < want && /[yæøå]/i.test(s) ? ' Husk at y, æ, ø og å også er vokaler.' : ''
          return `vowels(${t.show(s)}) gav ${t.show(got)}, men teksten har ${want} vokaler.${tip}`
        }
      }
      return true
    },
  },
  {
    id: 'roverspraket',
    title: 'Røverspråket',
    level: 'lett',
    topic: 'språk',
    text: `I Astrid Lindgrens bøker om Kalle Blomkvist snakker barna et hemmelig språk: Hver konsonant (en bokstav som ikke er en vokal) skrives to ganger, med en \`o\` imellom. «Kalle» blir «KoKalollole»: K blir \`KoK\`, a står som den er, og hver l blir \`lol\`.

Skriv \`function rover(text)\` som gjør en tekst om til røverspråket. Vokalene (\`a e i o u y æ ø å\`), mellomrom, tall og tegn står som de er. De to kopiene av en konsonant har samme store eller lille bokstav som originalen, mens \`o\`-en imellom alltid er liten.`,
    hints: [
      "Bygg opp svaret bokstav for bokstav: `let out = ''`, og `for (const letter of text)`.",
      "Konsonantene er `bcdfghjklmnpqrstvwxz`. Gjør bokstaven liten og se om den står der: `'bcdfghjklmnpqrstvwxz'.includes(letter.toLowerCase())`.",
      "Er den en konsonant, legg til `letter + 'o' + letter`; ellers legger du til bokstaven som den er. Bruk den originale bokstaven begge steder, så blir en stor bokstav stor begge ganger.",
    ],
    world: (r) => makeWorld([], { text: pick(r, ROVER_TEXTS) }),
    scaffold: `function rover(text) {
  // Hver konsonant c blir c + 'o' + c
  return text
}

console.log(rover(text))
`,
    solution: `function rover(text) {
  let out = ''
  for (const letter of text) {
    if ('bcdfghjklmnpqrstvwxz'.includes(letter.toLowerCase())) out += letter + 'o' + letter
    else out += letter
  }
  return out
}

console.log(rover(text))
`,
    exports: ['rover'],
    check: (t) => {
      const rover = t.fn('rover')
      const make = (s: string) => [...s].map((c) => ('bcdfghjklmnpqrstvwxz'.includes(c.toLowerCase()) ? c + 'o' + c : c)).join('')
      const texts = [t.start.text, 'Kalle', '', 'a', 'ABC', 'Hei, på deg!', '1+1=2', 'ÆØÅ', 'xyz', 'Ola Nordmann 42', 'Hemmelig melding']
      for (const s of texts) {
        const got = rover(s)
        const want = make(s)
        if (got !== want) return `rover(${t.show(s)}) gav ${t.show(got)}, men skal gi ${t.show(want)}.`
      }
      return true
    },
    source: 'https://no.wikipedia.org/wiki/R%C3%B8verspr%C3%A5ket',
  },
  {
    id: 'forkortelser',
    title: 'Forkortelser',
    level: 'lett',
    topic: 'språk',
    text: `Skriv \`function acronym(phrase)\` som lager en forkortelse av en frase: den første bokstaven i hvert ord, med stor bokstav. «Den norske turistforening» blir \`'DNT'\`.

Ord skilles av mellomrom eller bindestrek, så «tur-retur» blir \`'TR'\`. Ekstra mellomrom i starten, i slutten eller midt i frasen skal ikke gi flere bokstaver.`,
    hints: [
      'Del frasen i ord med `phrase.split(...)`. Et uttrykk som `/[ -]+/` skiller på mellomrom og bindestreker, og flere på rad teller som ett skille.',
      'Begynner frasen med et mellomrom, får du et tomt ord først. Hopp over tomme ord i løkka, eller fjern dem med `.filter(Boolean)`.',
      "For hvert ord som er igjen: `word[0].toUpperCase()`. Legg bokstavene etter hverandre i en tekst, eller samle dem i en array og avslutt med `.join('')`.",
    ],
    world: (r) => makeWorld([], { phrase: pick(r, PHRASES) }),
    scaffold: `function acronym(phrase) {
  // Del frasen i ord og ta den første bokstaven i hvert
  return ''
}

console.log(acronym(phrase))
`,
    solution: `function acronym(phrase) {
  let result = ''
  for (const word of phrase.split(/[ -]+/)) {
    if (word) result += word[0].toUpperCase()
  }
  return result
}

console.log(acronym(phrase))
`,
    exports: ['acronym'],
    check: (t) => {
      const acronym = t.fn('acronym')
      const make = (s: string) => s.split(/[ -]+/).filter((w) => w !== '').map((w) => w[0].toUpperCase()).join('')
      const phrases = [t.start.phrase, 'Den norske turistforening', 'tur-retur', 'Norsk rikskringkasting', '  mange   mellomrom  ', 'sør-øst', 'ørret og ål', 'a - b', '', 'ja', ' - ', 'stor- og småfisk']
      for (const s of phrases) {
        const got = acronym(s)
        const want = make(s)
        if (got !== want) return `acronym(${t.show(s)}) gav ${t.show(got)}, men skal gi ${t.show(want)}.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Acronym',
  },
  {
    id: 'boy-ordet',
    title: 'Bøy ordet',
    level: 'lett',
    topic: 'språk',
    text: `Norske navneord bøyes etter regler. Skriv \`function inflect(noun)\` for vanlige hankjønnsord («en bil», «en bakke»). Den gir tilbake en array med fire former: ubestemt entall («bil»), bestemt entall («bilen»), ubestemt flertall («biler») og bestemt flertall («bilene»).

- \`'bil'\` gir \`['bil', 'bilen', 'biler', 'bilene']\`
- ender ordet på \`e\`, legger du til litt mindre: \`'bakke'\` gir \`['bakke', 'bakken', 'bakker', 'bakkene']\`

Regelen passer ikke for alle ord. «Et monster» blir «monsteret», «monstre» og «monstrene», og der faller en \`e\` bort. Slike ord må man lære utenat, og \`inflect\` klarer seg uten dem.`,
    hints: [
      "Det er to tilfeller: ord som slutter på `e` (`noun.endsWith('e')`), og alle de andre.",
      "Alle andre ord får `en`, `er` og `ene` etter seg: bil, bilen, biler, bilene.",
      "Ord på `e` får bare `n`, `r` og `ne`: bakke, bakken, bakker, bakkene. Svaret er `[noun, noun + 'n', …]` i den ene eller den andre utgaven.",
    ],
    world: (r) => makeWorld([], { noun: pick(r, NOUNS) }),
    scaffold: `function inflect(noun) {
  // Ender ordet på e eller ikke?
  return [noun, noun, noun, noun]
}

console.log(inflect(noun))
`,
    solution: `function inflect(noun) {
  if (noun.endsWith('e')) return [noun, noun + 'n', noun + 'r', noun + 'ne']
  return [noun, noun + 'en', noun + 'er', noun + 'ene']
}

console.log(inflect(noun))
`,
    exports: ['inflect'],
    check: (t) => {
      const inflect = t.fn('inflect')
      const make = (n: string) => (n.endsWith('e') ? [n, n + 'n', n + 'r', n + 'ne'] : [n, n + 'en', n + 'er', n + 'ene'])
      const nouns = [t.start.noun, 'bil', 'bakke', 'stol', 'hund', 'katt', 'ape', 'stige', 'fugl', 'tur', 'bjørn', 'dag', 'ball']
      for (const n of nouns) {
        const got = inflect(n)
        const want = make(n)
        if (!Array.isArray(got)) return `inflect(${t.show(n)}) skal gi en array med fire former, men gav ${t.show(got)}.`
        if (!t.same(got, want)) return `inflect(${t.show(n)}) gav ${t.show(got)}, men skal gi ${t.show(want)}.`
      }
      return true
    },
  },
  {
    id: 'ae-oe-aa',
    title: 'Æ, Ø og Å',
    level: 'middels',
    topic: 'språk',
    text: `Monstrene i \`items\` har hvert sitt ord. Det norske alfabetet går fra \`a\` til \`z\` og slutter med \`æ\`, \`ø\` og \`å\`, i den rekkefølgen. Skriv \`function compare(a, b)\` som sammenligner to ord i norsk alfabetisk rekkefølge: et negativt tall hvis \`a\` skal stå foran \`b\`, 0 hvis ordene er like, og et positivt tall ellers.

Ordene sammenlignes bokstav for bokstav, og et ord som er begynnelsen på et lengre ord, kommer først: «ape» foran «apekatt». Koden under bruker \`compare\` til å sortere monstrene.

Vanlig \`sort()\` og \`<\` ser på tegnenes kode, og der kommer \`å\` før \`æ\` og \`ø\`. Det blir feil rekkefølge på norsk.`,
    hints: [
      "Alfabetet kan du ha som en tekst: `'abcdefghijklmnopqrstuvwxyzæøå'`. Plassen til en bokstav i den er `alphabet.indexOf(letter)`.",
      'Gå gjennom bokstavene i begge ord så langt det korteste ordet rekker. Første plass der de er ulike avgjør: forskjellen mellom bokstavenes plasser i alfabetet er svaret. Er alle like, avgjør lengden: det korteste ordet kommer først.',
      "Snarveien er `a.localeCompare(b, 'nb')`, som kan norsk rekkefølge. Prøv den gjerne etter at du har skrevet din egen.",
    ],
    world: (r) => {
      const ae = shuffled(r, SORT_AE)
      const oe = shuffled(r, SORT_OE)
      const aa = shuffled(r, SORT_AA)
      const extra = pick(r, [...ae.slice(1), ...oe.slice(1), ...aa.slice(1)])
      const words = [ae[0], oe[0], aa[0], extra, pick(r, SORT_YZ), ...shuffled(r, SORT_PLAIN).slice(0, 3)]
      return arrayWorld(worded(r, shuffled(r, words)))
    },
    monster: TEXT_MONSTER,
    scaffold: `function compare(a, b) {
  // Negativt hvis a skal stå foran b, 0 hvis like, positivt ellers
  return 0
}

items.sort((x, y) => compare(x.value, y.value))
`,
    solution: `function compare(a, b) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzæøå'
  const shortest = Math.min(a.length, b.length)
  for (let i = 0; i < shortest; i++) {
    const diff = alphabet.indexOf(a[i]) - alphabet.indexOf(b[i])
    if (diff !== 0) return diff
  }
  return a.length - b.length
}

items.sort((x, y) => compare(x.value, y.value))
`,
    exports: ['compare'],
    check: (t) => {
      const compare = t.fn('compare')
      const alphabet = 'abcdefghijklmnopqrstuvwxyzæøå'
      const order = (a: string, b: string) => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          if (a[i] !== b[i]) return alphabet.indexOf(a[i]) < alphabet.indexOf(b[i]) ? -1 : 1
        }
        return Math.sign(a.length - b.length)
      }
      const words = ['', 'a', 'ape', 'ål', 'åle', 'åker', 'zoom', 'zoo', 'ærfugl', 'ære', 'ørn', 'øre', 'øy', 'yr', 'yngel', 'sau', 'sjø', 'ø', 'æ', 'å', 'z', 'y', 'ba', 'b']
      for (const a of words) {
        for (const b of words) {
          const got = compare(a, b)
          if (typeof got !== 'number' || Number.isNaN(got)) return `compare(${t.show(a)}, ${t.show(b)}) skal gi et tall, men gav ${t.show(got)}.`
          const want = order(a, b)
          if (Math.sign(got) !== want) {
            const how = want < 0 ? 'et negativt tall' : want > 0 ? 'et positivt tall' : '0'
            return `compare(${t.show(a)}, ${t.show(b)}) skal gi ${how}, men gav ${t.show(got)}.`
          }
        }
      }
      const before = t.before('items')
      if (!Array.isArray(t.items) || t.items.length !== before.length || before.some((m: unknown) => !t.items.includes(m))) {
        return 'Alle monstrene skal bli i `items`, bare i en annen rekkefølge.'
      }
      for (let i = 0; i + 1 < t.items.length; i++) {
        const x = t.items[i]
        const y = t.items[i + 1]
        if (order(x.value, y.value) > 0) {
          return `«${x.value}» (${t.show(x)}) står foran «${y.value}» (${t.show(y)}), men skal stå etter. Er monstrene sortert med compare?`
        }
      }
      return true
    },
    source: 'https://no.wikipedia.org/wiki/Det_dansk-norske_alfabetet',
  },
  {
    id: 'anagrammer',
    title: 'Anagrammer',
    level: 'middels',
    topic: 'språk',
    text: `Ord som er laget av de samme bokstavene i en annen rekkefølge, kalles anagrammer: «lampe» og «palme». Skriv \`function isAnagram(a, b)\` som gir \`true\` hvis de to tekstene er anagrammer, og \`false\` hvis ikke.

Store og små bokstaver er like, og mellomrom teller ikke. Bokstavene må brukes like mange ganger: «seks» og «sekk» har de samme bokstavene, men ikke like mange av hver.`,
    hints: [
      "Først rydder du opp: gjør begge tekstene små og ta bort mellomrom, for eksempel `a.toLowerCase().replaceAll(' ', '')`.",
      "To tekster er anagrammer hvis bokstavene deres blir samme tekst når du sorterer dem: `[...x].sort().join('')`.",
      'Sammenlign de to sorterte tekstene med `===`. Du kan også telle hver bokstav med en `Map`; da trenger du ikke sortere.',
    ],
    world: (r) => {
      const [first, second] = r() < 0.5 ? pick(r, ANAGRAMS) : pick(r, NEAR_MISSES)
      return r() < 0.5 ? makeWorld([], { first, second }) : makeWorld([], { first: second, second: first })
    },
    scaffold: `function isAnagram(a, b) {
  // Gjør teksten ren, og se om bokstavene er de samme like mange ganger
  return false
}

console.log(isAnagram(first, second))
`,
    solution: `function isAnagram(a, b) {
  const clean = (text) => [...text.toLowerCase().replaceAll(' ', '')].sort().join('')
  return clean(a) === clean(b)
}

console.log(isAnagram(first, second))
`,
    exports: ['isAnagram'],
    check: (t) => {
      const isAnagram = t.fn('isAnagram')
      const key = (s: string) => [...s.toLowerCase().replaceAll(' ', '')].sort().join('')
      const pairs: [string, string][] = [
        [t.start.first, t.start.second], ['lampe', 'palme'], ['Lampe', 'palme'], ['ost', 'sto'], ['lyst', 'sylt'], ['lyst sol', 'sylt los'],
        ['ål', 'lå'], ['ås', 'så'], ['lås', 'sål'], ['Ole', 'Leo'], ['stein', 'sinte'], ['seks', 'sekk'], ['ring', 'ringe'], ['ball', 'bal'],
        ['lampe', 'lamme'], ['ål', 'ås'], ['', 'a'], ['sol', 'sjø'],
      ]
      for (const word of ['bjørnebær', 'regnbue', 'sjøhest', 'måneskinn', 'eventyr']) {
        const letters = [...word]
        pairs.push([word, t.shuffle(letters).join('')])
        // The same letters, but one of the repeated ones swapped for another letter of the word: same length, other counts.
        const repeat = letters.findIndex((c, i) => letters.indexOf(c) !== i)
        const other = letters.find((c) => c !== letters[repeat])
        if (repeat >= 0 && other !== undefined) {
          const changed = [...letters]
          changed[repeat] = other
          pairs.push([word, t.shuffle(changed).join('')])
        }
      }
      for (const [a, b] of pairs) {
        const want = key(a) === key(b)
        for (const [x, y] of [[a, b], [b, a]]) {
          const got = isAnagram(x, y)
          if (got !== want) {
            return `isAnagram(${t.show(x)}, ${t.show(y)}) gav ${t.show(got)}, men tekstene ${want ? 'er anagrammer' : 'er ikke anagrammer'}.`
          }
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Anagram',
  },
  {
    id: 'rimord',
    title: 'Rimord',
    level: 'middels',
    topic: 'språk',
    text: `Monstrene i \`items\` har hvert sitt ord, og alle har samme farge. Gi monstre som rimer samme farge, og la ord som ikke rimer få hver sin farge.

Her rimer to ord når de er like fra den siste vokalen og ut til slutten av ordet: «katt» og «hatt» ender begge på \`att\`, «stol» og «sol» på \`ol\`, og «sjø» ender på \`ø\`. Vokalene er \`a e i o u y æ ø å\`.

Fargene kan være \`'pink'\`, \`'cyan'\`, \`'gold'\`, \`'lime'\`, \`'violet'\`, \`'orange'\`, \`'red'\` og \`'teal'\`, eller en annen CSS-farge. Ordene skal bli som de er, bare fargen endres.`,
    hints: [
      'Finn rimdelen til et ord: gå bakfra til du står på den siste vokalen. Rimdelen er fra den bokstaven og ut ordet.',
      'Bruk en `Map` fra rimdel til farge. Har du ikke sett rimdelen før, gir du den en ny farge fra en liste; ellers bruker du fargen du lagret.',
      "Gå gjennom `items`: finn rimdelen til `item.value`, hent eller lag fargen, og sett `item.color = ...`. Du trenger bare så mange farger som det er grupper, aldri flere enn fire her.",
    ],
    world: (r) => {
      // Two groups whose words end on the same letter, then one or two more.
      const families = new Map<string, string[][]>()
      for (const group of RHYMES) families.set(group[0].at(-1)!, [...(families.get(group[0].at(-1)!) ?? []), group])
      const pair = shuffled(r, shuffled(r, [...families.values()].filter((f) => f.length > 1))[0]).slice(0, 2)
      const groups = [...pair, ...shuffled(r, RHYMES.filter((g) => !pair.includes(g))).slice(0, int(r, 1, 2))]
      const each = groups.length === 3 ? int(r, 2, 3) : 2
      const picked = groups.flatMap((group) => shuffled(r, group).slice(0, each))
      return arrayWorld(shuffled(r, picked).map((value) => ({ value, color: 'teal' })))
    },
    monster: TEXT_MONSTER,
    scaffold: `const vowels = 'aeiouyæøå'

for (const item of items) {
  // Finn rimdelen: fra den siste vokalen og ut ordet
  // Gi monsteret en farge som hører til rimdelen: item.color = …
}
`,
    solution: `const vowels = 'aeiouyæøå'

function ending(word) {
  let i = word.length - 1
  while (i > 0 && !vowels.includes(word[i])) i--
  return word.slice(i)
}

const colors = ['pink', 'cyan', 'gold', 'lime']
const colorOf = new Map()
for (const item of items) {
  const key = ending(item.value)
  if (!colorOf.has(key)) colorOf.set(key, colors[colorOf.size])
  item.color = colorOf.get(key)
  vis(item)
}
`,
    check: (t) => {
      const vowels = 'aeiouyæøå'
      const ending = (word: string) => {
        let i = word.length - 1
        while (i > 0 && !vowels.includes(word[i])) i--
        return word.slice(i)
      }
      const before = t.before('items')
      if (!Array.isArray(t.items) || t.items.length !== before.length || before.some((m: unknown) => !t.items.includes(m))) {
        return 'Alle monstrene skal bli i `items`; bare fargen skal endres.'
      }
      for (let i = 0; i < t.slots.length; i++) {
        if (t.slots[i].value !== t.start.slots[i].value) return `Ordet til ${t.show(t.slots[i])} skal ikke endres.`
      }
      const colorOf = (m: { color: unknown }) => (typeof m.color === 'string' ? m.color.trim().toLowerCase() : '')
      for (const m of t.items) if (colorOf(m) === '') return `${t.show(m)} har ingen farge. Fargen skal være en tekst, som 'pink'.`
      for (let i = 0; i < t.items.length; i++) {
        for (let j = i + 1; j < t.items.length; j++) {
          const a = t.items[i]
          const b = t.items[j]
          const rhyme = ending(a.value) === ending(b.value)
          const same = colorOf(a) === colorOf(b)
          if (rhyme && !same) return `«${a.value}» (${t.show(a)}) og «${b.value}» (${t.show(b)}) rimer, men har ikke samme farge.`
          if (!rhyme && same) return `«${a.value}» (${t.show(a)}) og «${b.value}» (${t.show(b)}) rimer ikke, men begge er ${colorOf(a)}.`
        }
      }
      return true
    },
  },
  {
    id: 'caesar-pa-norsk',
    title: 'Cæsar på norsk',
    level: 'middels',
    topic: 'språk',
    text: `I Cæsar-chifferet flyttes hver bokstav et fast antall plasser fram i alfabetet. Her bruker vi det norske alfabetet, \`abcdefghijklmnopqrstuvwxyzæøå\`, som har 29 bokstaver. Kommer du til slutten, begynner du på \`a\` igjen: \`z\` flyttet én plass blir \`æ\`, og \`å\` flyttet én plass blir \`a\`.

Skriv \`function caesar(text, shift)\`. Store bokstaver forblir store, og alt som ikke er en av de 29 bokstavene (mellomrom, tall og tegn) står som det er. Er \`shift\` negativt, flytter du bakover, og da kan du lese en melding som er gjort hemmelig.`,
    hints: [
      'Finn plassen til en bokstav med `alphabet.indexOf(letter.toLowerCase())`. Gir det `-1`, er det ikke en bokstav i alfabetet, og da skal tegnet bare stå som det er.',
      'Ny plass er `(index + shift) % 29`. Et negativt tall kan gi en negativ rest i JavaScript, så bruk `((index + shift) % 29 + 29) % 29`.',
      'Var bokstaven stor (`letter !== letter.toLowerCase()`), gjør du den nye bokstaven stor igjen med `toUpperCase()`. Legg alt sammen i en tekst, bokstav for bokstav.',
    ],
    world: (r) => makeWorld([], { message: pick(r, CAESAR_TEXTS) }),
    scaffold: `function caesar(text, shift) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzæøå'
  // Flytt hver bokstav shift plasser, og begynn på a igjen etter å
  return text
}

console.log(caesar(message, 3))
`,
    solution: `function caesar(text, shift) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzæøå'
  let out = ''
  for (const letter of text) {
    const index = alphabet.indexOf(letter.toLowerCase())
    if (index === -1) {
      out += letter
      continue
    }
    const moved = alphabet[(((index + shift) % 29) + 29) % 29]
    out += letter === letter.toLowerCase() ? moved : moved.toUpperCase()
  }
  return out
}

console.log(caesar(message, 3))
`,
    exports: ['caesar'],
    check: (t) => {
      const caesar = t.fn('caesar')
      const alphabet = 'abcdefghijklmnopqrstuvwxyzæøå'
      const make = (s: string, shift: number) =>
        [...s]
          .map((c) => {
            const i = alphabet.indexOf(c.toLowerCase())
            if (i < 0) return c
            const moved = alphabet[(i + (shift % 29) + 29) % 29]
            return c === c.toLowerCase() ? moved : moved.toUpperCase()
          })
          .join('')
      const cases: [string, number][] = [
        [t.start.message, 3], ['abc', 1], ['z', 1], ['å', 1], ['Å', 1], ['a', -1], ['A', -1], ['Hei, Verden!', 3], ['abc', 0], ['abc', 29],
        ['abc', -29], ['abc', 58], ['abc', -30], ['ÆØÅ', 2], ['Møt meg 7. mai!', 5], ['', 4], ['xyzæøå', 3], ['café', 1],
      ]
      for (const [s, shift] of cases) {
        const got = caesar(s, shift)
        const want = make(s, shift)
        if (got !== want) return `caesar(${t.show(s)}, ${shift}) gav ${t.show(got)}, men skal gi ${t.show(want)}.`
      }
      for (const s of ['Hemmelig melding', 'Ørnen så ut over fjorden!', 'Å, æ og ø 2026']) {
        for (const shift of [1, 3, 13, 28, 29, 30, -5]) {
          const back = caesar(caesar(s, shift), -shift)
          if (back !== s) return `caesar(caesar(${t.show(s)}, ${shift}), ${-shift}) skal gi teksten tilbake, men gav ${t.show(back)}.`
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Caesar_cipher',
  },
  {
    id: 'ordkjeden',
    title: 'Ordkjeden',
    level: 'middels',
    topic: 'språk',
    text: `I leken «siste bokstav» sier du et ord som begynner på den bokstaven forrige ord sluttet på. Monstrene i \`items\` har hvert sitt ord, i tilfeldig rekkefølge, og ordene kan settes i en rekke der hvert ord begynner med den siste bokstaven i ordet foran.

Lenk monstrene sammen med \`next\` i den rekkefølgen, og la \`head\` peke på det første. Det siste monsteret har \`next\` lik \`null\`. Alle skal være med. Ingen to ord begynner på samme bokstav, så det finnes bare én måte å gjøre det på.`,
    hints: [
      'Det første ordet er det som begynner med en bokstav ingen av ordene slutter på. Finn det, og sett `head` til det monsteret.',
      'Fra et ord finner du neste ved å lete etter monsteret som begynner med ordets siste bokstav. Den siste bokstaven er `word[word.length - 1]`.',
      'Gå i en løkke fra `head`: `node.next = items.find(...)`, og fortsett med `node = node.next`. Når ingen begynner med den siste bokstaven, er du ved slutten, og `next` kan stå som `null`.',
    ],
    world: (r) => {
      const items = worded(r, shuffled(r, pick(r, CHAINS)))
      return makeWorld(items.map((spec) => ({ ...spec, next: null })), { head: null, items: items.map((_, i) => at(i)) })
    },
    monster: TEXT_LIST_MONSTER,
    scaffold: `// Finn det første ordet: ingen andre ord slutter på bokstaven det begynner med
// Lenk så hvert ord til ordet som begynner med dets siste bokstav, og la head peke på det første
`,
    solution: `const lastLetter = (word) => word[word.length - 1]

head = items.find((m) => !items.some((other) => lastLetter(other.value) === m.value[0]))

let node = head
while (node) {
  node.next = items.find((m) => m.value[0] === lastLetter(node.value)) ?? null
  if (node.next) vis(node, node.next)
  node = node.next
}
`,
    check: (t) => {
      const items = t.before('items')
      const last = (m: { value: string }) => m.value[m.value.length - 1]
      const first = items.find((m) => !items.some((o) => last(o) === m.value[0]))
      if (!first) return 'Sjekken fant ikke noe første ord.'
      const want = [first]
      while (want.length < items.length) {
        const next = items.find((m) => m.value[0] === last(want[want.length - 1]))
        if (!next) break
        want.push(next)
      }
      if (t.head === null || t.head === undefined) return `\`head\` peker ikke på noe. Den skal peke på det første ordet, «${first.value}» (${t.show(first)}).`
      const got = t.chain(t.head)
      if (got === null) return 'Lista fra `head` går i ring, eller `next` peker på noe som ikke er et monster. Den skal ende i `null`.'
      for (let i = 0; i < want.length; i++) {
        if (got[i] !== want[i]) {
          if (i === 0) return `\`head\` skal peke på ${t.show(want[0])} («${want[0].value}»), det første ordet, men peker på ${t.show(got[0])}.`
          return `Etter «${want[i - 1].value}» (${t.show(want[i - 1])}) skal «${want[i].value}» (${t.show(want[i])}) komme, men der står ${got[i] ? t.show(got[i]) : 'ingenting'}.`
        }
      }
      if (got.length > want.length) return `Lista er for lang: den har ${got.length} monstre, men det er bare ${want.length} ord.`
      return true
    },
  },
  {
    id: 'tall-med-ord',
    title: 'Tall med bokstaver',
    level: 'vanskelig',
    topic: 'språk',
    text: `Skriv \`function inWords(n)\` som gir et tall fra 0 til 999 skrevet med bokstaver, slik det står i en norsk bokmålstekst. Formene er:

- 0 er \`null\`, og 1 til 12 er \`en\`, \`to\`, \`tre\`, \`fire\`, \`fem\`, \`seks\`, \`sju\` (ikke «syv»), \`åtte\`, \`ni\`, \`ti\`, \`elleve\`, \`tolv\`
- 13 til 19 er \`tretten\`, \`fjorten\`, \`femten\`, \`seksten\`, \`sytten\`, \`atten\`, \`nitten\`
- tierne er \`tjue\`, \`tretti\`, \`førti\`, \`femti\`, \`seksti\`, \`sytti\`, \`åtti\`, \`nitti\`, og en tier og en ener skrives i ett ord: \`tjueen\`, \`førtito\`, \`nittini\`
- hundrene er \`hundre\` (ikke «ett hundre»), \`to hundre\`, \`tre hundre\` og så videre. Står det noe etter hundrene, kommer \`og\` først: \`hundre og fem\`, \`hundre og ti\`, \`tre hundre og førtito\`, \`ni hundre og nittini\``,
    hints: [
      "Tallene under 20 har hvert sitt ord. Legg dem i en array (`['null', 'en', 'to', …]`) og slå opp med `small[n]`.",
      'For 20 til 99 trenger du tierordet, `tens[Math.floor(n / 10)]`, og, hvis `n % 10` ikke er 0, ordet for enerne rett bak uten mellomrom: `tjue` + `en`.',
      'For 100 til 999: hundrene er `small[Math.floor(n / 100)] + " hundre"`, bortsett fra 1, som bare er `hundre`. Er resten (`n % 100`) ikke 0, legger du til `" og "` og resten skrevet med bokstaver: la `inWords` kalle seg selv.',
    ],
    world: (r) => makeWorld([], { number: int(r, 100, 999) }),
    scaffold: `function inWords(n) {
  // Under 20: et eget ord. 20–99: tier + ener. 100–999: hundrer, og, resten
  return ''
}

console.log(inWords(number))
`,
    solution: `function inWords(n) {
  const small = ['null', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti', 'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten']
  const tens = ['', '', 'tjue', 'tretti', 'førti', 'femti', 'seksti', 'sytti', 'åtti', 'nitti']
  if (n < 20) return small[n]
  if (n < 100) {
    const ones = n % 10
    return tens[Math.floor(n / 10)] + (ones ? small[ones] : '')
  }
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const start = hundreds === 1 ? 'hundre' : small[hundreds] + ' hundre'
  return rest ? start + ' og ' + inWords(rest) : start
}

console.log(inWords(number))
`,
    exports: ['inWords'],
    check: (t) => {
      const inWords = t.fn('inWords')
      const ones = 'null en to tre fire fem seks sju åtte ni ti elleve tolv tretten fjorten femten seksten sytten atten nitten'.split(' ')
      const tierWords = 'tjue tretti førti femti seksti sytti åtti nitti'.split(' ')
      const below100 = (n: number) => (n < 20 ? ones[n] : tierWords[Math.floor(n / 10) - 2] + (n % 10 ? ones[n % 10] : ''))
      const make = (n: number) => {
        if (n < 100) return below100(n)
        const h = Math.floor(n / 100)
        const start = h === 1 ? 'hundre' : ones[h] + ' hundre'
        return n % 100 ? start + ' og ' + below100(n % 100) : start
      }
      let wrong = 0
      let first = ''
      for (let n = 0; n <= 999; n++) {
        const got = inWords(n)
        if (got !== make(n)) {
          wrong++
          if (!first) first = `inWords(${n}) gav ${t.show(got)}, men skal gi ${t.show(make(n))}.`
        }
      }
      if (wrong) return `${first}${wrong > 1 ? ` (${wrong} av 1000 tall er feil.)` : ''}`
      return true
    },
  },
  {
    id: 'mente-du',
    title: 'Mente du …?',
    level: 'vanskelig',
    topic: 'språk',
    text: `Søkemotorer spør «mente du …?» når du skriver et ord feil. De måler hvor nær to ord er hverandre ved å telle rettelser: å sette inn en bokstav, ta bort en bokstav eller bytte en bokstav med en annen. «katt» til «hatt» er én rettelse, og «sol» til «sjø» er to. Det minste antallet rettelser som gjør ett ord om til et annet, kalles Levenshtein-avstanden.

Skriv to funksjoner:

- \`function distance(a, b)\` gir den minste avstanden mellom \`a\` og \`b\`.
- \`function closest(word, words)\` gir ordet i \`words\` som er nærmest \`word\`. Er flere like nær, gir du det første av dem.

En vanlig måte å regne ut avstanden på er en tabell: rute \`[i][j]\` er avstanden mellom de \`i\` første bokstavene i \`a\` og de \`j\` første i \`b\`.`,
    hints: [
      'Tenk på de siste bokstavene i to ord. Er de like, koster de ingenting. Er de ulike, kan du slette, sette inn eller bytte. Velg den billigste veien.',
      'Lag en tabell `d[i][j]`. Første rad og første kolonne er enkle: å gå fra et tomt ord til `j` bokstaver koster `j` innsettinger, og motsatt. Resten fyller du ut rute for rute.',
      'Rute `[i][j]` er det minste av `d[i-1][j] + 1`, `d[i][j-1] + 1` og `d[i-1][j-1]` (pluss 1 hvis bokstavene `a[i-1]` og `b[j-1]` er ulike). Svaret står i hjørnet. I `closest` bytter du bare ut det beste ordet når du finner et som er strengt nærmere.',
    ],
    world: (r) => {
      const [word, words] = pick(r, TYPOS)
      return makeWorld([], { word, words })
    },
    views: { words: 'value' },
    scaffold: `function distance(a, b) {
  // Fyll ut en tabell d[i][j] med avstanden mellom de i første bokstavene i a og de j første i b
  return 0
}

function closest(word, words) {
  // Gå gjennom ordene og husk det med minst avstand
  return null
}

console.log(closest(word, words))
`,
    solution: `function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const change = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + change)
    }
  }
  return d[a.length][b.length]
}

function closest(word, words) {
  let best = null
  let bestDistance = Infinity
  for (const other of words) {
    const far = distance(word, other)
    if (far < bestDistance) {
      best = other
      bestDistance = far
    }
  }
  return best
}

console.log(closest(word, words))
`,
    exports: ['distance', 'closest'],
    check: (t) => {
      const distance = t.fn('distance')
      const closest = t.fn('closest')
      const edits = (a: string, b: string) => {
        let row = Array.from({ length: b.length + 1 }, (_, j) => j)
        for (let i = 1; i <= a.length; i++) {
          const next = [i]
          for (let j = 1; j <= b.length; j++) {
            next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
          }
          row = next
        }
        return row[b.length]
      }
      const pairs: [string, string][] = [
        [t.start.word, t.start.words[0]], ['', ''], ['', 'abc'], ['abc', ''], ['katt', 'hatt'], ['katt', 'katt'], ['sol', 'sjø'], ['kitten', 'sitting'],
        ['flaw', 'lawn'], ['ørn', 'orn'], ['blåbær', 'blabær'], ['intention', 'execution'], ['sykkel', 'sykle'], ['å', 'æ'], ['ab', 'ba'],
      ]
      let seed = 7
      const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
      const word = (n: number) => Array.from({ length: n }, () => 'abæøå'[Math.floor(random() * 5)]).join('')
      for (let k = 0; k < 60; k++) pairs.push([word(Math.floor(random() * 8)), word(Math.floor(random() * 8))])
      for (const [a, b] of pairs) {
        const got = distance(a, b)
        const want = edits(a, b)
        if (got !== want) return `distance(${t.show(a)}, ${t.show(b)}) gav ${t.show(got)}, men det minste antallet rettelser er ${want}.`
        if (distance(b, a) !== want) return `distance(${t.show(b)}, ${t.show(a)}) gav ${t.show(distance(b, a))}, men det er ${want}, det samme som motsatt vei.`
      }
      const lists: [string, string[]][] = [
        [t.start.word, t.start.words],
        ['kata', ['bil', 'kate', 'katt', 'kake']],
        ['sjøhest', ['sjørøver', 'sjøhest', 'sjømann']],
        ['bjorn', ['bjørn', 'bjørk', 'bjelke']],
        ['x', ['yy', 'z', 'w']],
        ['hus', ['mus']],
        ['ål', ['åle', 'ål', 'åker']],
        ['ørn', ['arn', 'orn', 'ørret']],
      ]
      for (const [target, words] of lists) {
        let best = words[0]
        for (const w of words) if (edits(target, w) < edits(target, best)) best = w
        const got = closest(target, words)
        if (got !== best) return `closest(${t.show(target)}, ${t.show(words)}) gav ${t.show(got)}, men ${t.show(best)} er nærmest.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Levenshtein_distance',
  },
]
