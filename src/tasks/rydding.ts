import { arrayWorld, at, colored, distinct, int, makeWorld, PALETTE, pick, shuffled, things } from './build'
import { COLOR_MONSTER, PLAIN_MONSTER } from './classes'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'rosa-sammen',
    title: 'De rosa vil stå sammen',
    level: 'middels',
    topic: 'rydding',
    text: `De rosa monstrene vil stå sammen, først i \`items\`. Flytt alle rosa fram.

Både de rosa og de andre skal beholde rekkefølgen de hadde seg imellom.`,
    hints: [
      'Lag to nye arrayer: én med de rosa og én med resten, i den rekkefølgen de står.',
      '`items.filter((t) => t.color === \'pink\')` gir de rosa, i samme rekkefølge.',
      'Sett dem sammen igjen: `items = [...pink, ...rest]`.',
    ],
    world: (r) => {
      const items = colored(r)
      const others = ['cyan', 'gold', 'lime', 'violet', 'teal', 'orange']
      const colors = shuffled(r, ['pink', 'pink', 'pink', pick(r, others), pick(r, others), pick(r, others), pick(r, others), pick(r, others)])
      items.forEach((s, i) => { s.color = colors[i] })
      return arrayWorld(items)
    },
    monster: COLOR_MONSTER,
    scaffold: `const pink = []
const rest = []
for (const thing of items) {
  // Legg thing i pink eller rest
}
`,
    solution: `const pink = items.filter((t) => t.color === 'pink')
const rest = items.filter((t) => t.color !== 'pink')
items = [...pink, ...rest]
`,
    java: {
      hints: [
        'Lag to nye lister: én med de rosa og én med resten, i den rekkefølgen de står.',
        'Gå gjennom `items` og legg hvert monster i riktig liste: `thing.color.equals("pink")` sier om det er rosa.',
        'Sett dem sammen igjen: `items = new ArrayList<>(pink)`, og så `items.addAll(rest)`.',
      ],
      scaffold: `void main() {
    List<Monster> pink = new ArrayList<>();
    List<Monster> rest = new ArrayList<>();
    for (Monster thing : items) {
        // Legg thing i pink eller rest
    }
}
`,
      solution: `void main() {
    List<Monster> pink = new ArrayList<>();
    List<Monster> rest = new ArrayList<>();
    for (Monster thing : items) {
        if (thing.color.equals("pink")) pink.add(thing);
        else rest.add(thing);
    }
    items = new ArrayList<>(pink);
    items.addAll(rest);
}
`,
    },
    check: (t) => {
      const before = t.before('items')
      const want = [...before.filter((n) => n.color === 'pink'), ...before.filter((n) => n.color !== 'pink')]
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} monstre, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) return `Plass ${i} skal ha ${t.show(want[i])}, men har ${t.show(t.items[i])}.`
      }
      return true
    },
  },
  {
    id: 'sma-til-venstre',
    title: 'Små til venstre',
    level: 'lett',
    topic: 'rydding',
    text: `Monstrene i \`items\` har hver sin \`value\`. De små, med verdi under 50, vil stå til venstre, og de store, med 50 eller mer, til høyre.

Flytt monstrene så alle de små står foran alle de store. Rekkefølgen inni hver gruppe spiller ingen rolle. Det skal være de samme monstrene i \`items\`, ikke nye.`,
    hints: [
      'Hold styr på hvor neste lille monster skal stå: `let place = 0`. Alt til venstre for `place` er allerede små.',
      'Gå gjennom `items` med `i`. Er `items[i].value` under 50, bytt `items[i]` med `items[place]`.',
      'Etter byttet øker du `place` med én, så området med små vokser mot høyre.',
    ],
    world: (r) => {
      const small = distinct(r, int(r, 3, 5), 1, 49)
      const big = distinct(r, 8 - small.length, 50, 99)
      // A big one first and a small one last, so everything has to move.
      const middle = shuffled(r, [...small.slice(1), ...big.slice(1)])
      const values = [big[0], ...middle, small[0]]
      return arrayWorld(values.map((value) => ({ value, color: value < 50 ? 'cyan' : 'gold' })))
    },
    monster: PLAIN_MONSTER,
    scaffold: `let place = 0
for (let i = 0; i < items.length; i++) {
  // Er items[i] lite (under 50)? Bytt det med items[place], og øk place.
}
`,
    solution: `let place = 0
for (let i = 0; i < items.length; i++) {
  if (items[i].value < 50) {
    ;[items[i], items[place]] = [items[place], items[i]]
    vis(items[i], items[place])
    place++
  }
}
`,
    java: {
      hints: [
        'Hold styr på hvor neste lille monster skal stå: `int place = 0`. Alt til venstre for `place` er allerede små.',
        'Gå gjennom `items` med `i`. Er `items.get(i).value` under 50, bytter du det med monsteret på plass `place`: `Collections.swap(items, i, place)`.',
        'Etter byttet øker du `place` med én, så området med små vokser mot høyre.',
      ],
      scaffold: `void main() {
    int place = 0;
    for (int i = 0; i < items.size(); i++) {
        // Er items.get(i) lite (under 50)? Bytt det med monsteret på plass place, og øk place.
    }
}
`,
      solution: `void main() {
    int place = 0;
    for (int i = 0; i < items.size(); i++) {
        if (items.get(i).value < 50) {
            Collections.swap(items, i, place);
            vis(items.get(i), items.get(place));
            place++;
        }
    }
}
`,
    },
    check: (t) => {
      const before = t.before('items')
      const items = t.items
      if (!Array.isArray(items)) return '`items` er ikke en array lenger.'
      if (items.length !== before.length || before.some((n) => !items.includes(n))) {
        return 'Det skal være de samme monstrene i `items` som før, ikke flere eller færre.'
      }
      let big: any = null
      for (const thing of items) {
        if (thing.value >= 50) big = big ?? thing
        else if (big) return `${t.show(thing)} (${thing.value}) er liten, men står bak ${t.show(big)} (${big.value}) som er stor.`
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Quicksort#Lomuto_partition_scheme',
  },
  {
    id: 'spokelsene-bakerst',
    title: 'Spøkelsene bakerst',
    level: 'lett',
    topic: 'rydding',
    text: `Noen av monstrene i \`items\` er spøkelser: de har \`shape === 'ghost'\`. Spøkelser hører hjemme bakerst.

Flytt alle spøkelsene til slutten av \`items\`. De andre rykker fram. Både spøkelsene og de andre skal beholde rekkefølgen de hadde seg imellom.`,
    hints: [
      'Del monstrene i to grupper: spøkelsene og de andre. `thing.shape === \'ghost\'` sier hvem som er hva.',
      'Gå gjennom `items` fra start til slutt og legg hvert monster i riktig liste. Da holder rekkefølgen seg.',
      'Sett dem sammen til slutt, de andre først: `items = [...others, ...ghosts]`.',
    ],
    world: (r) => {
      const items = colored(r)
      // Two or three ghosts, the first one near the front.
      const ghosts = new Set([int(r, 0, 3)])
      const count = int(r, 2, 3)
      while (ghosts.size < count) ghosts.add(int(r, 0, 7))
      for (const i of ghosts) items[i].shape = 'ghost'
      return arrayWorld(items)
    },
    monster: COLOR_MONSTER,
    scaffold: `const others = []
const ghosts = []
for (const thing of items) {
  // Er thing et spøkelse? Legg det i ghosts, ellers i others.
}
`,
    solution: `const others = []
const ghosts = []
for (const thing of items) {
  if (thing.shape === 'ghost') ghosts.push(thing)
  else others.push(thing)
  vis(thing)
}
items = [...others, ...ghosts]
vis(ghosts)
`,
    java: {
      // The items' shape is a field, or it wouldn't come back from Java; the others have none (null), as in JavaScript.
      monster: `// Legg til eller ta bort et felt og trykk «Bruk».
class Monster {
    String color = "pink";
    String shape;
}`,
      code: { "shape === 'ghost'": 'shape = "ghost"' },
      hints: [
        'Del monstrene i to grupper: spøkelsene og de andre. `"ghost".equals(thing.shape)` sier hvem som er hva; de andre har `shape = null`, så `thing.shape.equals(…)` går ikke for dem.',
        'Gå gjennom `items` fra start til slutt og legg hvert monster i riktig liste. Da holder rekkefølgen seg.',
        'Sett dem sammen til slutt, de andre først: `items = new ArrayList<>(others)`, og så `items.addAll(ghosts)`.',
      ],
      scaffold: `void main() {
    List<Monster> others = new ArrayList<>();
    List<Monster> ghosts = new ArrayList<>();
    for (Monster thing : items) {
        // Er thing et spøkelse? Legg det i ghosts, ellers i others.
    }
}
`,
      solution: `void main() {
    List<Monster> others = new ArrayList<>();
    List<Monster> ghosts = new ArrayList<>();
    for (Monster thing : items) {
        if ("ghost".equals(thing.shape)) ghosts.add(thing);
        else others.add(thing);
        vis(thing);
    }
    items = new ArrayList<>(others);
    items.addAll(ghosts);
    vis(ghosts);
}
`,
    },
    check: (t) => {
      const before = t.before('items')
      const want = [...before.filter((n) => n.shape !== 'ghost'), ...before.filter((n) => n.shape === 'ghost')]
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} monstre, men skal ha ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) {
          return `Plass ${i} skal ha ${t.show(want[i])}, men har ${t.show(t.items[i])}. Spøkelsene skal bakerst, og alle beholder rekkefølgen i sin gruppe.`
        }
      }
      return true
    },
  },
  {
    id: 'tett-hullene',
    title: 'Tett hullene',
    level: 'lett',
    topic: 'rydding',
    text: `I \`items\` står det monstre, og innimellom er det hull: plasser som er \`null\`. Monstrene vil stå tett i tett.

Skyv alle monstrene mot venstre, i samme rekkefølge som før, så alle hullene havner bakerst. \`items\` skal ha like mange plasser som før.`,
    hints: [
      'Bruk to indekser: `read` går gjennom hele arrayen, og `write` er plassen neste monster skal stå på.',
      'Er `items[read]` ikke `null`, skal det til plass `write`. Øk så `write` med én.',
      'Bytt plass på dem: `[items[write], items[read]] = [items[read], items[write]]`. Da blir hullene liggende igjen bakerst av seg selv.',
    ],
    world: (r) => {
      const holes = int(r, 3, 4)
      // At least one hole sits between two items.
      const between = (k: boolean[]) => k.slice(k.indexOf(true) + 1, k.lastIndexOf(true)).includes(false)
      let kinds = shuffled(r, [...Array(8 - holes).fill(true), ...Array(holes).fill(false)])
      for (let tries = 0; tries < 20 && !between(kinds); tries++) kinds = shuffled(r, kinds)
      let next = 0
      return makeWorld(colored(r, 8 - holes), { items: kinds.map((item) => (item ? at(next++) : null)) })
    },
    monster: COLOR_MONSTER,
    scaffold: `let write = 0
for (let read = 0; read < items.length; read++) {
  // Er items[read] et monster (ikke null)? Flytt det til plass write, og øk write.
}
`,
    solution: `let write = 0
for (let read = 0; read < items.length; read++) {
  if (items[read] !== null) {
    ;[items[write], items[read]] = [items[read], items[write]]
    vis(items[write])
    write++
  }
}
`,
    java: {
      hints: [
        'Bruk to indekser: `read` går gjennom hele lista, og `write` er plassen neste monster skal stå på.',
        'Er `items.get(read)` ikke `null`, skal det til plass `write`. Øk så `write` med én.',
        'Bytt plass på dem: `Collections.swap(items, write, read)`. Da blir hullene liggende igjen bakerst av seg selv.',
      ],
      scaffold: `void main() {
    int write = 0;
    for (int read = 0; read < items.size(); read++) {
        // Er items.get(read) et monster (ikke null)? Flytt det til plass write, og øk write.
    }
}
`,
      solution: `void main() {
    int write = 0;
    for (int read = 0; read < items.size(); read++) {
        if (items.get(read) != null) {
            Collections.swap(items, write, read);
            vis(items.get(write));
            write++;
        }
    }
}
`,
    },
    check: (t) => {
      const before = t.before('items')
      const want = [...before.filter((n) => n !== null), ...before.filter((n) => n === null)]
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} plasser, men skal ha ${want.length}, som før.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) {
          return `Plass ${i} skal ${want[i] === null ? 'være et hull (null)' : `ha ${t.show(want[i])}`}, men har ${t.show(t.items[i])}.`
        }
      }
      return true
    },
  },
  {
    id: 'snu-raden',
    title: 'Snu raden på stedet',
    level: 'lett',
    topic: 'rydding',
    text: `Skriv \`function reverseInPlace(items)\` som snur en array på stedet: det første monsteret havner bakerst, det siste først, og så videre. Du skal endre arrayen du får inn, ikke lage en ny.

Sjekken stenger \`reverse()\`, \`toReversed()\`, \`slice()\`, \`splice()\` og \`sort()\` på arrayen den gir deg, så du må bytte plass på monstrene selv. En tom array og en med ett monster skal også gå bra. Koden nederst snur monstrene på scenen.`,
    hints: [
      'Bytt det første og det siste, så det nest første og nest siste, og slik innover mot midten.',
      'Bruk to indekser: `i` fra start og `j` fra slutt. Bytt `items[i]` og `items[j]`, øk `i` og minsk `j`.',
      'Løkka går så lenge `i < j`. Da stopper den i midten, og et monster alene i midten trenger ikke flyttes.',
    ],
    world: (r) => arrayWorld(things(r)),
    monster: PLAIN_MONSTER,
    scaffold: `function reverseInPlace(items) {
  // Bytt første og siste, så nest første og nest siste, helt til du møter midten
}

reverseInPlace(items)
`,
    solution: `function reverseInPlace(items) {
  for (let i = 0, j = items.length - 1; i < j; i++, j--) {
    ;[items[i], items[j]] = [items[j], items[i]]
    vis(items[i], items[j])
  }
}

reverseInPlace(items)
`,
    exports: ['reverseInPlace'],
    java: {
      text: `Skriv \`void reverseInPlace(List<Monster> items)\` som snur en liste på stedet: det første monsteret havner bakerst, det siste først, og så videre. Du skal endre lista du får inn, ikke lage en ny.

Her er poenget å bytte plass på monstrene selv, så la \`Collections.reverse\` ligge. En tom liste og en med ett monster skal også gå bra. Koden nederst snur monstrene på scenen.`,
      hints: [
        'Bytt det første og det siste, så det nest første og nest siste, og slik innover mot midten.',
        'Bruk to indekser: `i` fra start og `j` fra slutt. Bytt dem med `Collections.swap(items, i, j)`, øk `i` og minsk `j`.',
        'Løkka går så lenge `i < j`. Da stopper den i midten, og et monster alene i midten trenger ikke flyttes.',
      ],
      scaffold: `void reverseInPlace(List<Monster> items) {
    // Bytt første og siste, så nest første og nest siste, helt til du møter midten
}

void main() {
    reverseInPlace(items);
}
`,
      solution: `void reverseInPlace(List<Monster> items) {
    for (int i = 0, j = items.size() - 1; i < j; i++, j--) {
        Collections.swap(items, i, j);
        vis(items.get(i), items.get(j));
    }
}

void main() {
    reverseInPlace(items);
}
`,
    },
    check: (t) => {
      const reverseInPlace = t.fn('reverseInPlace')
      for (const n of [0, 1, 2, 5, 8]) {
        const original = Array.from({ length: n }, (_, i) => t.monster({ value: i + 1 }))
        const arr = [...original]
        for (const name of ['reverse', 'toReversed', 'slice', 'splice', 'sort']) {
          Object.defineProperty(arr, name, {
            value() {
              throw new Error(`${name}() er stengt i denne oppgaven: bytt plass på monstrene selv.`)
            },
          })
        }
        const got = reverseInPlace(arr)
        if (arr.length !== n) return `Arrayen skulle fortsatt ha ${n} monstre, men har ${arr.length}.`
        for (let i = 0; i < n; i++) {
          if (arr[i] !== original[n - 1 - i]) {
            const hint = Array.isArray(got) && got !== arr ? ' Du ga tilbake en ny array; endre den du fikk inn.' : ''
            return `Med ${n} monstre skal plass ${i} ha monsteret med verdi ${n - i}, men har ${t.show(arr[i]?.value)}.${hint}`
          }
        }
      }
      const before = t.before('items')
      if (!Array.isArray(t.items) || t.items.length !== before.length) return '`items` på scenen skal ha like mange monstre som før.'
      for (let i = 0; i < before.length; i++) {
        const want = before[before.length - 1 - i]
        if (t.items[i] !== want) return `På scenen skal plass ${i} ha ${t.show(want)}, men har ${t.show(t.items[i])}. Kall funksjonen på \`items\` også.`
      }
      return true
    },
  },
  {
    id: 'en-av-hver-farge',
    title: 'Ett av hver farge',
    level: 'lett',
    topic: 'rydding',
    text: `Flere av monstrene i \`items\` har samme \`color\`. Nå vil bare ett av hver farge være med videre: det som står først.

La \`items\` bare holde det første monsteret av hver farge, i samme rekkefølge som før. De andre skal ut av \`items\`.`,
    hints: [
      'Du må huske hvilke farger du allerede har sett. Et `Set` passer: `seen.has(farge)` og `seen.add(farge)`.',
      'Gå gjennom `items` fra venstre. Er `thing.color` ikke i `seen` ennå, er monsteret det første av sin farge.',
      'Legg de første i en ny array, `first`, og sett `items = first` etter løkka.',
    ],
    world: (r) => {
      const items = colored(r)
      const colors = shuffled(r, PALETTE).slice(0, int(r, 3, 4))
      // Every colour at least once, the rest repeated.
      const list = shuffled(r, [...colors, ...Array.from({ length: 8 - colors.length }, () => pick(r, colors))])
      items.forEach((s, i) => { s.color = list[i] })
      return arrayWorld(items)
    },
    monster: COLOR_MONSTER,
    scaffold: `const seen = new Set()
const first = []
for (const thing of items) {
  // Har du sett thing.color før? Hvis ikke: husk fargen i seen, og legg thing i first.
}
`,
    solution: `const seen = new Set()
const first = []
for (const thing of items) {
  if (seen.has(thing.color)) {
    vis('har sett fargen', thing)
  } else {
    seen.add(thing.color)
    first.push(thing)
    vis('ny farge', thing)
  }
}
items = first
`,
    java: {
      hints: [
        'Du må huske hvilke farger du allerede har sett. Et `Set<String>` passer: `seen.contains(farge)` og `seen.add(farge)`.',
        'Gå gjennom `items` fra venstre. Er `thing.color` ikke i `seen` ennå, er monsteret det første av sin farge.',
        'Legg de første i en ny liste, `first`, og sett `items = first` etter løkka.',
      ],
      scaffold: `void main() {
    Set<String> seen = new HashSet<>();
    List<Monster> first = new ArrayList<>();
    for (Monster thing : items) {
        // Har du sett thing.color før? Hvis ikke: husk fargen i seen, og legg thing i first.
    }
}
`,
      solution: `void main() {
    Set<String> seen = new HashSet<>();
    List<Monster> first = new ArrayList<>();
    for (Monster thing : items) {
        if (seen.contains(thing.color)) {
            vis("har sett fargen", thing);
        } else {
            seen.add(thing.color);
            first.add(thing);
            vis("ny farge", thing);
        }
    }
    items = first;
}
`,
    },
    check: (t) => {
      const seen = new Set()
      const want = []
      for (const copy of t.start.items) {
        if (!seen.has(copy.color)) {
          seen.add(copy.color)
          want.push(t.live(copy))
        }
      }
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== want.length) return `\`items\` har ${t.items.length} monstre, men det er ${want.length} farger, så det skal være ${want.length}.`
      for (let i = 0; i < want.length; i++) {
        if (t.items[i] !== want[i]) return `Plass ${i} skal ha ${t.show(want[i])}, det første av sin farge, men har ${t.show(t.items[i])}.`
      }
      return true
    },
  },
  {
    id: 'roter-raden',
    title: 'Roter raden',
    level: 'middels',
    topic: 'rydding',
    text: `Skriv \`function rotate(items, k)\` som flytter de siste \`k\` monstrene fram foran de andre, på stedet. Med \`[A, B, C, D, E]\` og \`k = 2\` blir det \`[D, E, A, B, C]\`. Rekkefølgen skal ellers holde seg.

\`k\` kan være større enn antall monstre (da går du rundt igjen) og den kan være 0. Sjekken prøver også en tom array. Endre arrayen du får inn, ikke lag en ny. Koden nederst roterer monstrene på scenen med 3.`,
    hints: [
      'Å rotere med `k` er det samme som å rotere med `k % items.length`, så store tall går bare rundt. Pass på den tomme arrayen: der finnes ikke noe å dele på.',
      'Det går an uten ekstra array: snu hele raden, snu så de første `k`, og snu til slutt resten. Skriv en hjelpefunksjon `reverse(a, i, j)` som snur plassene `i` til `j`.',
      'Etter at hele raden er snudd, ligger de siste `k` først, men baklengs. Snu plassene `0` til `k - 1` og så `k` til `n - 1`, så står hver del rett vei igjen.',
    ],
    world: (r) => arrayWorld(things(r)),
    monster: PLAIN_MONSTER,
    scaffold: `function rotate(items, k) {
  const n = items.length
  // k kan være større enn n, og n kan være 0
}

rotate(items, 3)
`,
    solution: `function reverse(a, i, j) {
  while (i < j) {
    ;[a[i], a[j]] = [a[j], a[i]]
    vis(a[i], a[j])
    i++
    j--
  }
}

function rotate(items, k) {
  const n = items.length
  if (n === 0) return
  k %= n
  reverse(items, 0, n - 1)
  reverse(items, 0, k - 1)
  reverse(items, k, n - 1)
}

rotate(items, 3)
`,
    exports: ['rotate'],
    java: {
      text: `Skriv \`void rotate(List<Monster> items, int k)\` som flytter de siste \`k\` monstrene fram foran de andre, på stedet. Med \`[A, B, C, D, E]\` og \`k = 2\` blir det \`[D, E, A, B, C]\`. Rekkefølgen skal ellers holde seg.

\`k\` kan være større enn antall monstre (da går du rundt igjen) og den kan være 0. Sjekken prøver også en tom liste. Endre lista du får inn, ikke lag en ny. Java har \`Collections.rotate\`, men her skal du gjøre det selv. Koden nederst roterer monstrene på scenen med 3.`,
      hints: [
        'Å rotere med `k` er det samme som å rotere med `k % items.size()`, så store tall går bare rundt. Pass på den tomme lista: der finnes ikke noe å dele på.',
        'Det går an uten ekstra liste: snu hele raden, snu så de første `k`, og snu til slutt resten. Skriv en hjelpemetode `void reverse(List<Monster> a, int i, int j)` som snur plassene `i` til `j`.',
        'Etter at hele raden er snudd, ligger de siste `k` først, men baklengs. Snu plassene `0` til `k - 1` og så `k` til `n - 1`, så står hver del rett vei igjen.',
      ],
      scaffold: `void rotate(List<Monster> items, int k) {
    int n = items.size();
    // k kan være større enn n, og n kan være 0
}

void main() {
    rotate(items, 3);
}
`,
      solution: `void reverse(List<Monster> a, int i, int j) {
    while (i < j) {
        Collections.swap(a, i, j);
        vis(a.get(i), a.get(j));
        i++;
        j--;
    }
}

void rotate(List<Monster> items, int k) {
    int n = items.size();
    if (n == 0) return;
    k %= n;
    reverse(items, 0, n - 1);
    reverse(items, 0, k - 1);
    reverse(items, k, n - 1);
}

void main() {
    rotate(items, 3);
}
`,
    },
    check: (t) => {
      const rotate = t.fn('rotate')
      const cases = [[0, 3], [1, 5], [2, 1], [5, 0], [5, 2], [5, 5], [5, 7], [8, 3], [8, 19], [8, 8]]
      for (const [n, k] of cases) {
        const original = Array.from({ length: n }, (_, i) => t.monster({ value: i + 1 }))
        const arr = [...original]
        rotate(arr, k)
        const shift = n ? k % n : 0
        const want = [...original.slice(n - shift), ...original.slice(0, n - shift)]
        if (arr.length !== n) return `Med ${n} monstre og k = ${k} har arrayen ${arr.length} monstre etterpå.`
        for (let i = 0; i < n; i++) {
          if (arr[i] !== want[i]) return `Med ${n} monstre og k = ${k} skal plass ${i} ha monsteret med verdi ${want[i].value}, men har ${t.show(arr[i]?.value)}.`
        }
      }
      const before = t.before('items')
      const cut = before.length - (3 % before.length)
      const onStage = [...before.slice(cut), ...before.slice(0, cut)]
      if (!Array.isArray(t.items) || t.items.length !== onStage.length) return '`items` på scenen skal ha like mange monstre som før.'
      for (let i = 0; i < onStage.length; i++) {
        if (t.items[i] !== onStage[i]) return `På scenen skal plass ${i} ha ${t.show(onStage[i])}, men har ${t.show(t.items[i])}. Kall \`rotate(items, 3)\` også.`
      }
      return true
    },
  },
  {
    id: 'tre-farger',
    title: 'Tre farger på rad',
    level: 'middels',
    topic: 'rydding',
    text: `Monstrene i \`items\` er røde (\`'red'\`), gule (\`'gold'\`) eller cyan (\`'cyan'\`). De vil stå i tre blokker: de røde først, så de gule, og til slutt de cyan.

Skriv \`function flag(items, swap)\` som ordner dem i én gjennomgang, med tre pekere. Du bytter plass med \`swap(i, j)\`, som du får inn; ikke skriv direkte i \`items\`. Sjekken teller byttene, og du skal klare deg med høyst like mange bytter som det er monstre. Koden nederst kjører funksjonen på monstrene på scenen.`,
    hints: [
      'Tenk deg tre områder: røde fremst, gule i midten, cyan bakerst. Hold styr på tre indekser: `low` (der neste røde skal stå), `mid` (monsteret du ser på) og `high` (der neste cyan skal stå).',
      'Se på `items[mid]`. Er det rødt: bytt det med `low`, og øk både `low` og `mid`. Er det gult: øk bare `mid`.',
      'Er det cyan: bytt det med `high` og minsk `high`, men ikke øk `mid`, for monsteret du fikk fra `high` er ikke sett på ennå. Løkka går så lenge `mid <= high`.',
    ],
    world: (r) => {
      const items = things(r)
      const reds = int(r, 2, 3)
      const golds = int(r, 2, 3)
      const colors = shuffled(r, [...Array(reds).fill('red'), ...Array(golds).fill('gold'), ...Array(8 - reds - golds).fill('cyan')])
      // A cyan first and a red last, so there is work to do.
      const c = colors.indexOf('cyan')
      ;[colors[0], colors[c]] = [colors[c], colors[0]]
      const red = colors.lastIndexOf('red')
      ;[colors[7], colors[red]] = [colors[red], colors[7]]
      items.forEach((s, i) => { s.color = colors[i] })
      return arrayWorld(items)
    },
    monster: PLAIN_MONSTER,
    scaffold: `function flag(items, swap) {
  let low = 0
  let mid = 0
  let high = items.length - 1
  // Se på items[mid]: rød skal til low, gul blir liggende, cyan skal til high
}

flag(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function flag(items, swap) {
  let low = 0
  let mid = 0
  let high = items.length - 1
  while (mid <= high) {
    const color = items[mid].color
    if (color === 'red') {
      swap(low, mid)
      low++
      mid++
    } else if (color === 'gold') {
      mid++
    } else {
      swap(mid, high)
      high--
    }
  }
}

flag(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['flag'],
    source: 'https://en.wikipedia.org/wiki/Dutch_national_flag_problem',
    java: {
      text: `Monstrene i \`items\` er røde (\`"red"\`), gule (\`"gold"\`) eller cyan (\`"cyan"\`). De vil stå i tre blokker: de røde først, så de gule, og til slutt de cyan.

Skriv \`void flag(List<Monster> items, BiConsumer<Integer, Integer> swap)\` som ordner dem i én gjennomgang, med tre pekere. Du bytter plass med \`swap.accept(i, j)\`; ikke skriv direkte i \`items\`. Sjekken teller byttene, og du skal klare deg med høyst like mange bytter som det er monstre. Koden nederst kjører metoden på monstrene på scenen.`,
      code: { 'items[mid]': 'items.get(mid)' },
      scaffold: `void flag(List<Monster> items, BiConsumer<Integer, Integer> swap) {
    int low = 0;
    int mid = 0;
    int high = items.size() - 1;
    // Se på items.get(mid): rød skal til low, gul blir liggende, cyan skal til high
}

void main() {
    flag(items, (i, j) -> {
        Collections.swap(items, i, j);
        vis(items.get(i), items.get(j));
    });
}
`,
      solution: `void flag(List<Monster> items, BiConsumer<Integer, Integer> swap) {
    int low = 0;
    int mid = 0;
    int high = items.size() - 1;
    while (mid <= high) {
        String color = items.get(mid).color;
        if (color.equals("red")) {
            swap.accept(low, mid);
            low++;
            mid++;
        } else if (color.equals("gold")) {
            mid++;
        } else {
            swap.accept(mid, high);
            high--;
        }
    }
}

void main() {
    flag(items, (i, j) -> {
        Collections.swap(items, i, j);
        vis(items.get(i), items.get(j));
    });
}
`,
    },
    check: (t) => {
      const flag = t.fn('flag')
      const rank: Record<string, number> = { red: 0, gold: 1, cyan: 2 }
      const names: Record<string, string> = { r: 'red', g: 'gold', c: 'cyan' }
      const cases = ['', 'r', 'c', 'cg', 'gr', 'rgc', 'cgr', 'rrrr', 'cccggg', 'cgrcgrcgr', 'rcgrcgrcgrcg', 'ggrrccgrcrgccrg']
      let seed = 7
      for (let k = 0; k < 4; k++) {
        let s = ''
        for (let i = 0; i < 12 + k; i++) {
          seed = (seed * 16807) % 2147483647
          s += 'rgc'[seed % 3]
        }
        cases.push(s)
      }
      const frozen = (e: unknown) => { throw new Error(`Bytt plass med swap(i, j), ikke ved å skrive i arrayen (${String(e)}).`) }
      for (const s of cases) {
        const original = [...s].map((ch, i) => Object.freeze(t.monster({ value: i + 1, color: names[ch] })))
        const arr = [...original]
        const view = new Proxy(arr, {
          set: (_, key) => frozen(String(key)),
          deleteProperty: (_, key) => frozen(String(key)),
        })
        let swaps = 0
        const swap = (i: number, j: number) => {
          if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= arr.length || j >= arr.length) {
            throw new Error(`swap(${t.show(i)}, ${t.show(j)}) peker utenfor arrayen med ${arr.length} monstre.`)
          }
          swaps++
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        flag(view, swap)
        const colors = arr.map((x) => x.color).join(', ')
        for (let i = 1; i < arr.length; i++) {
          if (rank[arr[i].color] < rank[arr[i - 1].color]) {
            return `Med fargene [${original.map((x) => x.color).join(', ')}] ble det [${colors}]. Rødt skal først, så gull, så cyan.`
          }
        }
        if (swaps > arr.length) return `Antall bytter ble ${swaps} på ${arr.length} monstre, men i én gjennomgang holder det med høyst ${arr.length}.`
      }
      const before = t.before('items')
      const items = t.items
      if (!Array.isArray(items) || items.length !== before.length || before.some((n) => !items.includes(n))) {
        return 'Det skal være de samme monstrene i `items` som før.'
      }
      for (let i = 1; i < items.length; i++) {
        if (rank[items[i].color] < rank[items[i - 1].color]) {
          return `På scenen står ${t.show(items[i])} (${items[i].color}) bak ${t.show(items[i - 1])} (${items[i - 1].color}). Kall \`flag\` på \`items\` også.`
        }
      }
      return true
    },
  },
  {
    id: 'bolgen',
    title: 'Bølgen',
    level: 'middels',
    topic: 'rydding',
    text: `Monstrene i \`items\` vil stå som en bølge, store og små om hverandre: \`items[0]\` ≥ \`items[1]\` ≤ \`items[2]\` ≥ \`items[3]\` ≤ … Annethvert monster er en topp, og de i mellom er daler. Det går bra at to naboer er like store.

Du trenger ikke sortere. Bare bytt plass til hvert monster passer med naboene sine. Det skal være de samme monstrene i \`items\` etterpå.`,
    hints: [
      'Se på ett par naboer om gangen: plassene 1, 3, 5 … skal ikke ha større verdi enn naboen foran, og plassene 2, 4, 6 … ikke mindre.',
      'Gå gjennom `items` fra plass 1. Står `items[i]` og `items[i - 1]` feil vei for plassen `i`, bytter du dem.',
      'For oddetall `i` bytter du hvis `items[i].value > items[i - 1].value`, for partall hvis `<`. Én gjennomgang holder, for et bytte ødelegger aldri det som allerede passet.',
    ],
    world: (r) => {
      const wave = (v: number[]) => v.every((x, i) => i === 0 || (i % 2 === 1 ? x <= v[i - 1] : x >= v[i - 1]))
      let values = distinct(r, 8)
      for (let tries = 0; tries < 50 && wave(values); tries++) values = shuffled(r, values)
      return arrayWorld(values.map((value) => ({ value, color: pick(r, PALETTE) })))
    },
    monster: PLAIN_MONSTER,
    scaffold: `for (let i = 1; i < items.length; i++) {
  // Oddetall-plasser skal ikke være større enn plassen foran,
  // partall-plasser skal ikke være mindre. Står de feil vei? Bytt.
}
`,
    solution: `for (let i = 1; i < items.length; i++) {
  const wrong = i % 2 === 1
    ? items[i].value > items[i - 1].value
    : items[i].value < items[i - 1].value
  if (wrong) {
    ;[items[i - 1], items[i]] = [items[i], items[i - 1]]
    vis(items[i - 1], items[i])
  }
}
`,
    java: {
      code: {
        'items[0]': 'items.get(0)',
        'items[1]': 'items.get(1)',
        'items[2]': 'items.get(2)',
        'items[3]': 'items.get(3)',
        'items[i]': 'items.get(i)',
        'items[i - 1]': 'items.get(i - 1)',
        'items[i].value > items[i - 1].value': 'items.get(i).value > items.get(i - 1).value',
      },
      scaffold: `void main() {
    for (int i = 1; i < items.size(); i++) {
        // Oddetall-plasser skal ikke være større enn plassen foran,
        // partall-plasser skal ikke være mindre. Står de feil vei? Bytt.
    }
}
`,
      solution: `void main() {
    for (int i = 1; i < items.size(); i++) {
        boolean wrong = i % 2 == 1
                ? items.get(i).value > items.get(i - 1).value
                : items.get(i).value < items.get(i - 1).value;
        if (wrong) {
            Collections.swap(items, i - 1, i);
            vis(items.get(i - 1), items.get(i));
        }
    }
}
`,
    },
    check: (t) => {
      const before = t.before('items')
      const items = t.items
      if (!Array.isArray(items)) return '`items` er ikke en array lenger.'
      if (items.length !== before.length || before.some((n) => !items.includes(n))) {
        return 'Det skal være de samme monstrene i `items` som før, ikke flere eller færre.'
      }
      for (let i = 1; i < items.length; i++) {
        const a = items[i - 1]
        const b = items[i]
        if (i % 2 === 1 && b.value > a.value) return `Plass ${i} (${t.show(b)}, ${b.value}) er større enn plass ${i - 1} (${t.show(a)}, ${a.value}); den skal være mindre eller lik.`
        if (i % 2 === 0 && b.value < a.value) return `Plass ${i} (${t.show(b)}, ${b.value}) er mindre enn plass ${i - 1} (${t.show(a)}, ${a.value}); den skal være større eller lik.`
      }
      return true
    },
  },
  {
    id: 'like-naboer',
    title: 'Like naboer slår seg sammen',
    level: 'middels',
    topic: 'rydding',
    text: `Når to naboer i \`items\` har samme \`color\`, slår de seg sammen: det til venstre får summen av de to \`value\`, og det til høyre forlater \`items\`.

Gjenta til ingen naboer har samme farge. Tre like på rad blir altså til ett monster med summen av alle tre. Alle som blir igjen, skal beholde rekkefølgen og fargen sin.`,
    hints: [
      'Gå gjennom `items` med en indeks `i`, og sammenlign `items[i]` med `items[i + 1]`.',
      'Har de samme `color`: legg verdien til det fremste, `items[i].value += items[i + 1].value`, og ta det bakerste ut med `items.splice(i + 1, 1)`.',
      'Etter en sammenslåing flytter du ikke `i`: den nye naboen kan ha samme farge også. Øk `i` bare når de to har ulik farge.',
    ],
    world: (r) => {
      const items = things(r)
      // Runs of one to three of a colour, side by side with a different colour.
      const colors = ['pink', 'cyan', 'gold', 'lime', 'violet', 'teal']
      let slot = 0
      let last = ''
      for (const length of shuffled(r, [2, 3, 1, 2])) {
        let color = pick(r, colors)
        while (color === last) color = pick(r, colors)
        last = color
        for (let k = 0; k < length; k++) items[slot++].color = color
      }
      return arrayWorld(items)
    },
    monster: PLAIN_MONSTER,
    scaffold: `let i = 0
while (i + 1 < items.length) {
  // Har items[i] og items[i + 1] samme farge? Slå dem sammen.
  // Pass på: etter en sammenslåing kan den nye naboen ha samme farge også.
  i++
}
`,
    solution: `let i = 0
while (i + 1 < items.length) {
  if (items[i].color === items[i + 1].color) {
    items[i].value += items[i + 1].value
    items.splice(i + 1, 1)
    vis(items[i])
  } else {
    i++
  }
}
`,
    java: {
      code: {
        'items[i]': 'items.get(i)',
        'items[i + 1]': 'items.get(i + 1)',
        'items[i].value += items[i + 1].value': 'items.get(i).value += items.get(i + 1).value',
        'items.splice(i + 1, 1)': 'items.remove(i + 1)',
      },
      scaffold: `void main() {
    int i = 0;
    while (i + 1 < items.size()) {
        // Har items.get(i) og items.get(i + 1) samme farge? Slå dem sammen.
        // Pass på: etter en sammenslåing kan den nye naboen ha samme farge også.
        i++;
    }
}
`,
      solution: `void main() {
    int i = 0;
    while (i + 1 < items.size()) {
        if (items.get(i).color.equals(items.get(i + 1).color)) {
            items.get(i).value += items.get(i + 1).value;
            items.remove(i + 1);
            vis(items.get(i));
        } else {
            i++;
        }
    }
}
`,
    },
    check: (t) => {
      // The groups of one colour in a row, from the start: the first item of each stands for the group.
      const groups: { first: any; value: number; color: string }[] = []
      for (const copy of t.start.items) {
        const last = groups[groups.length - 1]
        if (last && last.color === copy.color) last.value += copy.value
        else groups.push({ first: t.live(copy), value: copy.value, color: copy.color })
      }
      if (!Array.isArray(t.items)) return '`items` er ikke en array lenger.'
      if (t.items.length !== groups.length) {
        return `\`items\` har ${t.items.length} monstre, men skal ha ${groups.length}: ett for hver gruppe av samme farge på rad.`
      }
      for (let i = 0; i < groups.length; i++) {
        const got = t.items[i]
        if (got !== groups[i].first) return `Plass ${i} skal ha ${t.show(groups[i].first)}, det fremste i sin gruppe, men har ${t.show(got)}.`
        if (got.value !== groups[i].value) return `${t.show(got)} skal ha verdien ${groups[i].value}, summen av gruppen, men har ${t.show(got.value)}.`
      }
      return true
    },
  },
  {
    id: 'neste-ordning',
    title: 'Neste ordning',
    level: 'vanskelig',
    topic: 'rydding',
    text: `Monstrene i \`items\` kan stå i mange rekkefølger. Sorter alle rekkefølgene som i en ordbok, med \`value\` som bokstavene: først \`[1, 2, 3]\`, så \`[1, 3, 2]\`, så \`[2, 1, 3]\`, og slik videre til \`[3, 2, 1]\`.

Skriv \`function nextPermutation(items)\` som endrer rekkefølgen i \`items\` på stedet, så monstrene står i rekkefølgen rett etter den de har nå. Står de i den siste (størst først), skal de gå rundt til den første (minst først). Samme verdi kan forekomme flere ganger, og en tom array eller ett monster skal bli som den er. Koden nederst kjører funksjonen på monstrene på scenen.`,
    hints: [
      'Endre så lite som mulig, helst bare slutten. Les fra høyre og finn den lengste halen som aldri går opp (hvert monster er minst like stort som det bak); plassen rett foran den kaller vi `i`.',
      'Bytt `items[i]` med det minste monsteret i halen som er større enn det. Leser du halen fra høyre, er det det første du møter som er større enn `items[i]`.',
      'Halen går fortsatt nedover; snu den ved å bytte fra endene mot midten, så blir den minst mulig. Fant du ingen `i`, er hele raden den siste, og da snur du alt.',
    ],
    world: (r) => {
      let values = distinct(r, 8)
      // The last two stand the wrong way, so the change reaches further back than the end.
      if (values[6] < values[7]) [values[6], values[7]] = [values[7], values[6]]
      if (values.every((v, i) => i === 0 || values[i - 1] > v)) values = [values[1], values[0], ...values.slice(2)]
      return arrayWorld(values.map((value) => ({ value, color: pick(r, PALETTE) })))
    },
    monster: PLAIN_MONSTER,
    scaffold: `function nextPermutation(items) {
  // 1. Fra slutten: finn siste plass i der items[i] er mindre enn items[i + 1]
  // 2. Fra slutten: finn første j der items[j] er større enn items[i], og bytt dem
  // 3. Snu alt som står etter plass i
}

nextPermutation(items)
`,
    solution: `function nextPermutation(items) {
  let i = items.length - 2
  while (i >= 0 && items[i].value >= items[i + 1].value) i--
  if (i >= 0) {
    let j = items.length - 1
    while (items[j].value <= items[i].value) j--
    ;[items[i], items[j]] = [items[j], items[i]]
    vis(items[i], items[j])
  }
  for (let a = i + 1, b = items.length - 1; a < b; a++, b--) {
    ;[items[a], items[b]] = [items[b], items[a]]
    vis(items[a], items[b])
  }
}

nextPermutation(items)
`,
    exports: ['nextPermutation'],
    source: 'https://en.wikipedia.org/wiki/Permutation#Generation_in_lexicographic_order',
    java: {
      text: `Monstrene i \`items\` kan stå i mange rekkefølger. Sorter alle rekkefølgene som i en ordbok, med \`value\` som bokstavene: først \`[1, 2, 3]\`, så \`[1, 3, 2]\`, så \`[2, 1, 3]\`, og slik videre til \`[3, 2, 1]\`.

Skriv \`void nextPermutation(List<Monster> items)\` som endrer rekkefølgen i \`items\` på stedet, så monstrene står i rekkefølgen rett etter den de har nå. Står de i den siste (størst først), skal de gå rundt til den første (minst først). Samme verdi kan forekomme flere ganger, og en tom liste eller ett monster skal bli som den er. Koden nederst kjører metoden på monstrene på scenen.`,
      code: { 'items[i]': 'items.get(i)' },
      scaffold: `void nextPermutation(List<Monster> items) {
    // 1. Fra slutten: finn siste plass i der items.get(i) er mindre enn items.get(i + 1)
    // 2. Fra slutten: finn første j der items.get(j) er større enn items.get(i), og bytt dem
    // 3. Snu alt som står etter plass i
}

void main() {
    nextPermutation(items);
}
`,
      solution: `void nextPermutation(List<Monster> items) {
    int i = items.size() - 2;
    while (i >= 0 && items.get(i).value >= items.get(i + 1).value) i--;
    if (i >= 0) {
        int j = items.size() - 1;
        while (items.get(j).value <= items.get(i).value) j--;
        Collections.swap(items, i, j);
        vis(items.get(i), items.get(j));
    }
    for (int a = i + 1, b = items.size() - 1; a < b; a++, b--) {
        Collections.swap(items, a, b);
        vis(items.get(a), items.get(b));
    }
}

void main() {
    nextPermutation(items);
}
`,
    },
    check: (t) => {
      const nextPermutation = t.fn('nextPermutation')
      const run = (values: number[]) => {
        const original = values.map((value) => t.monster({ value }))
        const arr = [...original]
        nextPermutation(arr)
        return { original, arr, got: arr.map((x) => x?.value) }
      }
      const fixed: [number[], number[]][] = [
        [[], []],
        [[5], [5]],
        [[1, 2, 3], [1, 3, 2]],
        [[3, 2, 1], [1, 2, 3]],
        [[2, 3, 1], [3, 1, 2]],
        [[1, 1, 5], [1, 5, 1]],
        [[1, 5, 1], [5, 1, 1]],
        [[5, 1, 1], [1, 1, 5]],
        [[1, 2, 2, 3], [1, 2, 3, 2]],
        [[1, 3, 2, 2], [2, 1, 2, 3]],
        [[6, 8, 7, 4, 3, 2], [7, 2, 3, 4, 6, 8]],
        [[1, 2, 3, 6, 5, 4], [1, 2, 4, 3, 5, 6]],
      ]
      for (const [values, want] of fixed) {
        const { original, arr, got } = run(values)
        if (got.length !== want.length || got.some((v, i) => v !== want[i])) {
          return `Fra [${values.join(', ')}] ble det [${got.join(', ')}], men neste er [${want.join(', ')}].`
        }
        if (new Set(arr).size !== original.length || arr.some((x) => !original.includes(x))) return 'Det skal være de samme monstrene etterpå, bare i en annen rekkefølge.'
      }
      // Every ordering of 3 and of 4 different values, in dictionary order; the last wraps round to the first.
      const orderings = (list: number[]): number[][] =>
        list.length <= 1 ? [list] : list.flatMap((x, i) => orderings([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [x, ...rest]))
      for (const n of [3, 4]) {
        const all = orderings(Array.from({ length: n }, (_, i) => i + 1))
        for (let k = 0; k < all.length; k++) {
          const want = all[(k + 1) % all.length]
          const { got } = run(all[k])
          if (got.length !== n || got.some((v, i) => v !== want[i])) {
            return `Fra [${all[k].join(', ')}] ble det [${got.join(', ')}], men neste er [${want.join(', ')}].`
          }
        }
      }
      // The stage: the next ordering of the values it started with.
      const v: number[] = t.start.items.map((c: { value: number }) => c.value)
      let i = v.length - 2
      while (i >= 0 && v[i] >= v[i + 1]) i--
      if (i >= 0) {
        let j = v.length - 1
        while (v[j] <= v[i]) j--
        ;[v[i], v[j]] = [v[j], v[i]]
      }
      const want = [...v.slice(0, i + 1), ...v.slice(i + 1).reverse()]
      const before = t.before('items')
      if (!Array.isArray(t.items) || t.items.length !== want.length || before.some((n) => !t.items.includes(n))) {
        return 'Det skal være de samme monstrene i `items` som før.'
      }
      for (let k = 0; k < want.length; k++) {
        if (t.items[k].value !== want[k]) return `På scenen skal plass ${k} ha verdien ${want[k]}, men har ${t.items[k].value}. Kall funksjonen på \`items\` også.`
      }
      return true
    },
  },
  {
    id: 'faerrest-bytter',
    title: 'Færrest mulig bytter',
    level: 'vanskelig',
    topic: 'rydding',
    text: `Noen av monstrene i \`items\` er cyan. De vil stå side om side, uten andre monstre mellom seg. Hvor de ender, bestemmer du selv, men hvert bytte av to monstre koster.

Skriv \`function groupCyan(items, swap)\` som samler alle cyan med færrest mulig bytter. Du bytter med \`swap(i, j)\`, som du får inn; ikke skriv direkte i \`items\`. Sjekken teller byttene og godtar bare det minste antallet som går an. Er det ingen cyan, eller bare ett, eller de allerede står side om side, skal du ikke bytte noe. Koden nederst kjører funksjonen på monstrene på scenen.`,
    hints: [
      'Tell først hvor mange cyan det er: `k`. De skal ende på `k` plasser på rad. Spørsmålet er hvilke `k` plasser.',
      'Velg stedet der det allerede står flest cyan. Gli et vindu med `k` plasser over `items` og tell cyan i vinduet underveis.',
      'Hvert monster i vinduet som ikke er cyan, må byttes mot et cyan monster utenfor vinduet. Færrest bytter er altså `k` minus det største antallet cyan i et vindu.',
    ],
    world: (r) => {
      const k = int(r, 3, 4)
      const grouped = (f: boolean[]) => f.lastIndexOf(true) - f.indexOf(true) + 1 === k
      let flags = shuffled(r, [...Array(k).fill(true), ...Array(8 - k).fill(false)])
      for (let tries = 0; tries < 20 && grouped(flags); tries++) flags = shuffled(r, flags)
      const others = ['pink', 'gold', 'lime', 'violet', 'orange', 'red', 'teal']
      return arrayWorld(things(r).map((spec, i) => ({ ...spec, color: flags[i] ? 'cyan' : pick(r, others) })))
    },
    monster: PLAIN_MONSTER,
    scaffold: `function groupCyan(items, swap) {
  // Hvor mange cyan er det? Hvilke plasser skal de stå på?
}

groupCyan(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    solution: `function groupCyan(items, swap) {
  const k = items.filter((t) => t.color === 'cyan').length
  if (k < 2) return
  // Vinduet med k plasser som allerede har flest cyan
  let inside = 0
  for (let i = 0; i < k; i++) if (items[i].color === 'cyan') inside++
  let best = inside
  let start = 0
  for (let i = k; i < items.length; i++) {
    if (items[i].color === 'cyan') inside++
    if (items[i - k].color === 'cyan') inside--
    if (inside > best) {
      best = inside
      start = i - k + 1
    }
  }
  // Hvert monster i vinduet som ikke er cyan, byttes mot et cyan utenfor
  const inWindow = (i) => i >= start && i < start + k
  let from = 0
  for (let to = start; to < start + k; to++) {
    if (items[to].color === 'cyan') continue
    while (inWindow(from) || items[from].color !== 'cyan') from++
    swap(to, from)
  }
}

groupCyan(items, (i, j) => {
  ;[items[i], items[j]] = [items[j], items[i]]
  vis(items[i], items[j])
})
`,
    exports: ['groupCyan'],
    java: {
      text: `Noen av monstrene i \`items\` er cyan. De vil stå side om side, uten andre monstre mellom seg. Hvor de ender, bestemmer du selv, men hvert bytte av to monstre koster.

Skriv \`void groupCyan(List<Monster> items, BiConsumer<Integer, Integer> swap)\` som samler alle cyan med færrest mulig bytter. Du bytter med \`swap.accept(i, j)\`; ikke skriv direkte i \`items\`. Sjekken teller byttene og godtar bare det minste antallet som går an. Er det ingen cyan, eller bare ett, eller de allerede står side om side, skal du ikke bytte noe. Koden nederst kjører metoden på monstrene på scenen.`,
      scaffold: `void groupCyan(List<Monster> items, BiConsumer<Integer, Integer> swap) {
    // Hvor mange cyan er det? Hvilke plasser skal de stå på?
}

void main() {
    groupCyan(items, (i, j) -> {
        Collections.swap(items, i, j);
        vis(items.get(i), items.get(j));
    });
}
`,
      solution: `void groupCyan(List<Monster> items, BiConsumer<Integer, Integer> swap) {
    int k = 0;
    for (Monster m : items) if (m.color.equals("cyan")) k++;
    if (k < 2) return;
    // Vinduet med k plasser som allerede har flest cyan
    int inside = 0;
    for (int i = 0; i < k; i++) if (items.get(i).color.equals("cyan")) inside++;
    int best = inside;
    int start = 0;
    for (int i = k; i < items.size(); i++) {
        if (items.get(i).color.equals("cyan")) inside++;
        if (items.get(i - k).color.equals("cyan")) inside--;
        if (inside > best) {
            best = inside;
            start = i - k + 1;
        }
    }
    // Hvert monster i vinduet som ikke er cyan, byttes mot et cyan utenfor
    int end = start + k;
    int from = 0;
    for (int to = start; to < end; to++) {
        if (items.get(to).color.equals("cyan")) continue;
        while ((from >= start && from < end) || !items.get(from).color.equals("cyan")) from++;
        swap.accept(to, from);
    }
}

void main() {
    groupCyan(items, (i, j) -> {
        Collections.swap(items, i, j);
        vis(items.get(i), items.get(j));
    });
}
`,
    },
    check: (t) => {
      const groupCyan = t.fn('groupCyan')
      const cases = ['', 'c', 'x', 'xcx', 'ccxx', 'cxcx', 'ccc', 'xxcccxxx', 'cxxxxxxc', 'xcxxcxxc', 'cxcxcxcx', 'ccxcxcc', 'xxxxccxxxcxxc', 'cxxcxxcxxcxxcxxc']
      const others = ['pink', 'gold', 'lime', 'violet', 'orange', 'red', 'teal']
      const frozen = (e: unknown) => { throw new Error(`Bytt plass med swap(i, j), ikke ved å skrive i arrayen (${String(e)}).`) }
      for (const s of cases) {
        const original = [...s].map((ch, i) => Object.freeze(t.monster({ value: i + 1, color: ch === 'c' ? 'cyan' : others[i % others.length] })))
        const k = original.filter((x) => x.color === 'cyan').length
        // The fewest swaps: each thing in the best window of k places that isn't cyan needs one swap.
        let inside = 0
        let best = 0
        for (let i = 0; i < original.length; i++) {
          if (original[i].color === 'cyan') inside++
          if (i >= k && original[i - k].color === 'cyan') inside--
          if (i >= k - 1) best = Math.max(best, inside)
        }
        const fewest = k ? k - best : 0
        const arr = [...original]
        const view = new Proxy(arr, {
          set: (_, key) => frozen(String(key)),
          deleteProperty: (_, key) => frozen(String(key)),
        })
        let swaps = 0
        const swap = (i: number, j: number) => {
          if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= arr.length || j >= arr.length) {
            throw new Error(`swap(${t.show(i)}, ${t.show(j)}) peker utenfor arrayen med ${arr.length} monstre.`)
          }
          if (i !== j) swaps++
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        groupCyan(view, swap)
        const row = (list: { color: string }[]) => list.map((x) => (x.color === 'cyan' ? 'C' : '·')).join('')
        const first = arr.findIndex((x) => x.color === 'cyan')
        const last = arr.map((x) => x.color).lastIndexOf('cyan')
        if (k && last - first + 1 !== k) return `Raden ${row(original)} ble ${row(arr)}. Cyan (C) skal stå side om side.`
        if (swaps > fewest) return `Raden ${row(original)}: antall bytter ble ${swaps}, men det går med ${fewest}.`
      }
      const before = t.before('items')
      const items = t.items
      if (!Array.isArray(items) || items.length !== before.length || before.some((n) => !items.includes(n))) {
        return 'Det skal være de samme monstrene i `items` som før.'
      }
      const colors = items.map((x: { color: string }) => x.color)
      const k = colors.filter((c: string) => c === 'cyan').length
      if (k && colors.lastIndexOf('cyan') - colors.indexOf('cyan') + 1 !== k) return 'På scenen står ikke cyan side om side ennå. Kall `groupCyan` på `items` også.'
      return true
    },
  },
]
