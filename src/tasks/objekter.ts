import { arrayWorld, listWorld, PALETTE, pick, things } from './build'
import { PLAIN_MONSTER } from './classes'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'si-hvem-du-er',
    title: 'Si hvem du er',
    level: 'lett',
    topic: 'objekter',
    text: `Monstrene vil kunne presentere seg. Gi klassen \`Monster\` (øverst i Objekter) en metode \`describe()\` som gir tilbake fargen og verdien som tekst, med mellomrom imellom: \`'pink 42'\`.

Koden går gjennom lista og spør hvert monster. Trykk «Kjør» når klassen har metoden.`,
    hints: [
      'En metode skrives inne i klassen, etter feltene: `describe() { … }`.',
      'Inne i metoden er monsteret selv `this`, så fargen er `this.color`.',
      "Sett sammen teksten: `return this.color + ' ' + this.value`.",
    ],
    world: (r) => listWorld(things(r, 6)),
    scaffold: `// Skriv describe() i klassen Monster øverst i Objekter.
for (let node = head; node; node = node.next) {
  console.log(node.describe())
}
`,
    solution: `for (let node = head; node; node = node.next) {
  console.log(node.describe())
}
`,
    solutionMonster: `class Monster {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
  describe() { return \`\${this.color} \${this.value}\` }
}`,
    java: {
      text: `Monstrene vil kunne presentere seg. Gi klassen \`Monster\` (øverst i Objekter) en metode \`String describe()\` som gir tilbake fargen og verdien som tekst, med mellomrom imellom: \`"pink 42"\`.

Koden går gjennom lista. Når klassen har metoden, tar du bort \`//\` foran \`IO.println\`, så spør koden hvert monster.`,
      hints: [
        'En metode skrives inne i klassen, etter feltene, med typen den gir tilbake foran navnet: `String describe() { … }`.',
        'Inne i metoden er monsteret selv `this`, så fargen er `this.color`. Java finner feltet også uten `this.`: bare `color`.',
        'Sett sammen teksten: `return color + " " + value;`. Tallet blir tekst når det legges til en tekst.',
      ],
      scaffold: `// Skriv describe() i klassen Monster øverst i Objekter, og ta så bort // under.
void main() {
    for (Monster node = head; node != null; node = node.next) {
        // IO.println(node.describe());
    }
}
`,
      solution: `void main() {
    for (Monster node = head; node != null; node = node.next) {
        IO.println(node.describe());
    }
}
`,
      solutionMonster: `class Monster {
    int value = 0;
    String color = "pink";
    Monster next;

    String describe() {
        return color + " " + value;
    }
}`,
    },
    check: (t) => {
      for (const node of t.slots) {
        if (typeof node.describe !== 'function') return 'Monstrene har ingen metode `describe` ennå. Den skal stå i klassen.'
        const want = `${node.color} ${node.value}`
        const got = node.describe()
        if (got !== want) return `${t.show(node)}.describe() gav ${t.show(got)}, men skal gi ${t.show(want)}.`
      }
      const fresh = t.monster({ value: 3, color: 'lime' })
      if (fresh.describe() !== 'lime 3') return 'Et nytt Monster skal også kunne si hvem det er.'
      return true
    },
  },
  {
    id: 'er-den-stor',
    title: 'Er det stort?',
    level: 'lett',
    topic: 'objekter',
    text: `Gi klassen \`Monster\` en getter \`big\` som er \`true\` når \`value\` er 50 eller mer, og ellers \`false\`. En getter leses som et felt, uten parenteser: \`A.big\`.

Den skal alltid stemme med verdien slik den er nå, også om verdien endres etterpå.`,
    hints: [
      'En getter skrives i klassen som en metode med `get` foran: `get big() { … }`.',
      'Inne i getteren er monsteret `this`.',
      'Et vanlig felt (`big = …`) regnes ut bare én gang, når monsteret lages. En getter regnes ut hver gang noen spør.',
    ],
    world: (r) => listWorld(things(r, 6)),
    scaffold: `// Skriv getteren big i klassen Monster øverst i Objekter.
for (let node = head; node; node = node.next) {
  console.log(node.value, node.big)
}
`,
    solution: `for (let node = head; node; node = node.next) {
  console.log(node.value, node.big)
}
`,
    solutionMonster: `class Monster {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
  get big() { return this.value >= 50 }
}`,
    java: {
      text: `Gi klassen \`Monster\` en metode \`boolean isBig()\` som gir \`true\` når \`value\` er 50 eller mer, og ellers \`false\`.

En getter i Java er en vanlig metode, og en som svarer ja eller nei, får gjerne et navn som begynner med \`is\`: \`A.isBig()\`. Den skal alltid stemme med verdien slik den er nå, også om verdien endres etterpå.`,
      hints: [
        'En metode som svarer ja eller nei, gir tilbake en `boolean`: `boolean isBig() { … }`.',
        'Inne i metoden er monsteret `this`, så verdien er `this.value`, eller bare `value`.',
        'Et felt (`boolean big = value >= 50;`) regnes ut bare én gang, når monsteret lages. En metode regner ut svaret hver gang noen spør.',
      ],
      scaffold: `// Skriv isBig() i klassen Monster øverst i Objekter, og ta så bort // under.
void main() {
    for (Monster node = head; node != null; node = node.next) {
        // IO.println(node.value + " " + node.isBig());
    }
}
`,
      solution: `void main() {
    for (Monster node = head; node != null; node = node.next) {
        IO.println(node.value + " " + node.isBig());
    }
}
`,
      solutionMonster: `class Monster {
    int value = 0;
    String color = "pink";
    Monster next;

    boolean isBig() {
        return value >= 50;
    }
}`,
    },
    check: (t) => {
      // Java has no getters that read as a field: there it is a method, isBig().
      if (t.lang === 'java') {
        const first = t.slots[0]
        if (typeof first.isBig !== 'function') return 'Monstrene har ingen metode `isBig()` ennå. Den skal stå i klassen.'
        for (const node of t.slots) {
          const big = node.isBig()
          if (big !== node.value >= 50) return `${t.show(node)} har value ${node.value}, men isBig() gir ${t.show(big)}.`
        }
        first.value = 10
        if (first.isBig() !== false) return `Når ${t.show(first)} får value 10, skal isBig() gi false.`
        first.value = 77
        if (first.isBig() !== true) return `Når ${t.show(first)} får value 77, skal isBig() gi true.`
        return true
      }
      let getter = false
      for (let p = Object.getPrototypeOf(t.slots[0]); p && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
        if (Object.getOwnPropertyDescriptor(p, 'big')?.get) getter = true
      }
      if (!getter) return '`big` skal være en getter i klassen (`get big() { … }`), ikke et felt eller en metode.'
      for (const node of t.slots) {
        if (node.big !== node.value >= 50) return `${t.show(node)} har value ${node.value}, men big er ${t.show(node.big)}.`
      }
      const fresh = t.monster({ value: 10 })
      if (fresh.big !== false) return 'Et nytt Monster med value 10 skal ha big = false.'
      fresh.value = 77
      if (fresh.big !== true) return 'Når value blir 77, skal big bli true.'
      return true
    },
  },
  {
    id: 'mellom-1-og-99',
    title: 'Mellom 1 og 99',
    level: 'middels',
    topic: 'objekter',
    text: `Monstrene tåler bare verdier fra 1 til 99. Gi klassen \`Monster\` en getter og en setter for \`value\`: setteren passer på at verdien aldri blir mindre enn 1 eller større enn 99. Settes den til 150, blir den 99; settes den til -3, blir den 1.

Verdien må lagres i et annet felt, for eksempel det private \`#value\`.`,
    hints: [
      'Skriv `#value = 1`, `get value() { return this.#value }` og `set value(v) { … }` i klassen.',
      'I setteren: `this.#value = Math.min(99, Math.max(1, v))`.',
      'Fjern feltet `value = 0`! Et vanlig felt med samme navn legger seg oppå getteren og setteren, så de aldri blir brukt.',
    ],
    world: (r) => listWorld(things(r, 6)),
    scaffold: `// Lag getter og setter for value i klassen Monster.
A.value = 150
B.value = -3
console.log(A.value, B.value)
`,
    solution: `A.value = 150
B.value = -3
console.log(A.value, B.value)
`,
    solutionMonster: `class Monster {
  #value = 1
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
  get value() { return this.#value }
  set value(v) { this.#value = Math.min(99, Math.max(1, v)) }
}`,
    java: {
      text: `Monstrene tåler bare verdier fra 1 til 99. Gjør feltet \`value\` i klassen \`Monster\` privat, og gi klassen en getter og en setter for det: \`getValue()\` gir verdien, og \`setValue(int v)\` passer på at den aldri blir mindre enn 1 eller større enn 99. Settes den til 150, blir den 99; settes den til -3, blir den 1.

Når feltet er privat, kommer ingen utenfor klassen til det, så \`A.value = 150\` i koden kompilerer ikke lenger: der må det stå \`A.setValue(150)\`.`,
      hints: [
        'Skriv `private int value = 1;`, `int getValue() { return value; }` og `void setValue(int v) { … }` i klassen.',
        'I setteren: `value = Math.min(99, Math.max(1, v));`.',
        'Uten `private` kan koden fortsatt skrive rett i feltet med `A.value = 150`, forbi setteren. Med `private` må alt gå gjennom `setValue` og `getValue`.',
      ],
      scaffold: `// Gjør value privat i klassen Monster, og gi den getValue() og setValue(int v).
void main() {
    A.value = 150;
    B.value = -3;
    IO.println(A.value + " " + B.value);
}
`,
      solution: `void main() {
    A.setValue(150);
    B.setValue(-3);
    IO.println(A.getValue() + " " + B.getValue());
}
`,
      solutionMonster: `class Monster {
    private int value = 1;
    String color = "pink";
    Monster next;

    int getValue() {
        return value;
    }

    void setValue(int v) {
        value = Math.min(99, Math.max(1, v));
    }
}`,
    },
    check: (t) => {
      const cases: [number, number][] = [[150, 99], [-3, 1], [42, 42], [99, 99], [1, 1], [0, 1], [100, 99]]
      // In Java the field is private and reached through getValue() and setValue(); a private field isn't mirrored.
      if (t.lang === 'java') {
        const [a, b] = t.slots
        if (typeof a.getValue !== 'function' || typeof a.setValue !== 'function') return 'Klassen har ikke både `getValue()` og `setValue(int v)` ennå.'
        if (Object.hasOwn(a, 'value')) return 'Feltet `value` synes utenfor klassen, så koden kan skrive rett i det, forbi setteren. Gjør det privat: `private int value`.'
        if (a.getValue() !== 99) return `A.getValue() skal være 99 etter A.setValue(150), men er ${t.show(a.getValue())}.`
        for (const [set, want] of cases) {
          b.setValue(set)
          const got = b.getValue()
          if (got !== want) return `Etter B.setValue(${set}) skal B.getValue() gi ${want}, men gir ${t.show(got)}.`
        }
        return true
      }
      for (const [set, want] of cases) {
        const node = t.monster({ value: set })
        if (node.value !== want) return `Et nytt Monster med value ${set} skal få ${want}, men fikk ${t.show(node.value)}.`
        node.value = set
        if (node.value !== want) return `Når value settes til ${set}, skal den bli ${want}, men ble ${t.show(node.value)}.`
      }
      if (t.slots[0].value !== 99) return `A.value skal være 99 etter A.value = 150, men er ${t.show(t.slots[0].value)}.`
      return true
    },
  },
  {
    id: 'ting-compare',
    title: 'Monster.compare',
    level: 'lett',
    topic: 'objekter',
    text: `Gi klassen \`Monster\` en statisk metode \`compare(a, b)\` som sammenligner to monstre etter \`value\`: et negativt tall når \`a\` er minst, et positivt når \`b\` er minst. Da kan koden sortere med \`items.sort(Monster.compare)\`.

Statisk betyr at metoden hører til klassen, ikke til hvert monster: den kalles \`Monster.compare\`, ikke \`A.compare\`.`,
    hints: [
      'Skriv `static compare(a, b) { … }` i klassen.',
      'Forskjellen `a.value - b.value` er negativ når `a` er minst, og positiv når `b` er minst.',
      'Koden i editoren sorterer allerede med den: trykk «Kjør» når klassen har den.',
    ],
    world: (r) => arrayWorld(things(r)),
    monster: PLAIN_MONSTER,
    scaffold: `// Skriv static compare(a, b) i klassen Monster.
items.sort(Monster.compare)
`,
    solution: `items.sort(Monster.compare)
`,
    solutionMonster: `class Monster {
  value = 0
  color = 'pink'
  constructor(props) { Object.assign(this, props) }
  static compare(a, b) { return a.value - b.value }
}`,
    java: {
      text: `Gi klassen \`Monster\` en statisk metode \`static int compare(Monster a, Monster b)\` som sammenligner to monstre etter \`value\`: et negativt tall når \`a\` er minst, et positivt når \`b\` er minst. Da kan koden sortere med \`items.sort(Monster::compare)\`.

Statisk betyr at metoden hører til klassen, ikke til hvert monster, så den kalles på klassen: \`Monster.compare(A, B)\`. Med \`Monster::compare\` gir koden selve metoden videre til \`sort\`.`,
      hints: [
        'Skriv `static int compare(Monster a, Monster b) { … }` i klassen.',
        'Forskjellen `a.value - b.value` er negativ når `a` er minst, og positiv når `b` er minst.',
        'Når klassen har metoden, tar du bort `//` foran `items.sort(Monster::compare);` i koden og trykker «Kjør».',
      ],
      scaffold: `// Skriv static compare(a, b) i klassen Monster, og ta så bort // under.
void main() {
    // items.sort(Monster::compare);
}
`,
      solution: `void main() {
    items.sort(Monster::compare);
}
`,
      solutionMonster: `class Monster {
    int value = 0;
    String color = "pink";

    static int compare(Monster a, Monster b) {
        return a.value - b.value;
    }
}`,
    },
    check: (t) => {
      const compare = t.Monster.compare
      if (typeof compare !== 'function') return 'Klassen har ingen statisk metode `compare` ennå.'
      if (typeof t.slots[0].compare === 'function') return '`compare` skal være statisk (`static compare`), ikke en metode på hvert monster.'
      const row = [40, 7, 93, 7, 12].map((value) => t.monster({ value }))
      const sorted = [...row].sort(compare).map((n) => n.value)
      if (!t.same(sorted, [7, 7, 12, 40, 93])) return `Sortert med Monster.compare ble raden ${t.show(sorted)}.`
      const want = t.before('items').sort((a, b) => a.value - b.value)
      if (!want.every((n, i) => t.items[i] === n)) return '`items` er ikke sortert etter value ennå.'
      return true
    },
  },
  {
    id: 'katter-og-spokelser',
    title: 'Katter og spøkelser',
    level: 'middels',
    topic: 'objekter',
    text: `Noen monstre vil være katter, og noen spøkelser. Skriv \`class Cat extends Monster\` og \`class Ghost extends Monster\` i koden:
- en \`Cat\` har \`shape = 'cat'\` og en metode \`speak()\` som gir \`'mjau'\`
- et \`Ghost\` har \`shape = 'ghost'\` og en \`speak()\` som gir \`'bø!'\`

Lag så én ny katt og ett nytt spøkelse, og sett dem først i lista: katten først, så spøkelset, så resten som før.`,
    hints: [
      'En underklasse får alt fra `Monster` og legger til sitt eget: `class Cat extends Monster { shape = \'cat\' … }`.',
      'Felt i underklassen settes etter at `Monster` er ferdig, så `shape` overstyrer det `Monster` ga monsteret.',
      'Lenk dem inn foran: `const ghost = new Ghost({ value: 13, next: head })`, så `head = new Cat({ value: 9, next: ghost })`.',
    ],
    world: (r) => listWorld(things(r, 6)),
    scaffold: `class Cat extends Monster {
  // shape og speak()
}

class Ghost extends Monster {
  // shape og speak()
}

// Lag en katt og et spøkelse, og sett dem først i lista
`,
    solution: `class Cat extends Monster {
  shape = 'cat'
  speak() { return 'mjau' }
}

class Ghost extends Monster {
  shape = 'ghost'
  speak() { return 'bø!' }
}

const ghost = new Ghost({ value: 13, color: 'violet', next: head })
head = new Cat({ value: 9, color: 'orange', next: ghost })
console.log(head.speak(), head.next.speak())
`,
    // Making the two and linking them in is part of the answer.
    opening: '',
    exports: ['Cat', 'Ghost'],
    java: {
      code: {
        "shape = 'cat'": 'String shape = "cat"',
        'speak()': 'String speak()',
        "'mjau'": '"mjau"',
        "shape = 'ghost'": 'String shape = "ghost"',
        "'bø!'": '"bø!"',
      },
      hints: [
        'En underklasse får alt fra `Monster` og legger til sitt eget: `class Cat extends Monster { String shape = "cat"; … }`.',
        '`speak()` finnes bare i `Cat` og `Ghost`, ikke i `Monster`. For å kalle den må variabelen ha den riktige typen: `Cat cat = new Cat();`, så `cat.speak()`.',
        'Lenk dem inn foran: lag `ghost` med `ghost.next = head`, så `cat` med `cat.next = ghost`, og til slutt `head = cat`.',
      ],
      scaffold: `class Cat extends Monster {
    // shape og speak()
}

class Ghost extends Monster {
    // shape og speak()
}

void main() {
    // Lag en katt og et spøkelse, og sett dem først i lista
}
`,
      solution: `class Cat extends Monster {
    String shape = "cat";

    String speak() {
        return "mjau";
    }
}

class Ghost extends Monster {
    String shape = "ghost";

    String speak() {
        return "bø!";
    }
}

void main() {
    Ghost ghost = new Ghost();
    ghost.value = 13;
    ghost.color = "violet";
    ghost.next = head;
    Cat cat = new Cat();
    cat.value = 9;
    cat.color = "orange";
    cat.next = ghost;
    head = cat;
    IO.println(cat.speak() + " " + ghost.speak());
}
`,
      opening: 'void main() {\n\n}',
    },
    check: (t) => {
      const Cat = t.fn('Cat')
      const Ghost = t.fn('Ghost')
      const cat = new Cat({ value: 3 })
      const ghost = new Ghost({ value: 4 })
      if (!(cat instanceof t.Monster) || !(ghost instanceof t.Monster)) return 'Cat og Ghost skal være underklasser av Monster (`extends Monster`).'
      if (cat.shape !== 'cat') return `En ny Cat skal ha shape 'cat', men har ${t.show(cat.shape)}.`
      if (ghost.shape !== 'ghost') return `Et nytt Ghost skal ha shape 'ghost', men har ${t.show(ghost.shape)}.`
      // In Java a monster is made with new Cat() and its fields set after, so there is no value to make it with.
      if (t.lang !== 'java' && cat.value !== 3) return 'En Cat skal få verdien den lages med, som andre monstre.'
      if (cat.speak?.() !== 'mjau') return `Cat sin speak() skal gi 'mjau'.`
      if (ghost.speak?.() !== 'bø!') return `Ghost sin speak() skal gi 'bø!'.`
      const list = t.chain(t.head)
      if (!list) return 'Lista går i ring.'
      if (list[0]?.shape !== 'cat' || list[1]?.shape !== 'ghost') return 'Først i lista skal det stå en katt, så et spøkelse.'
      const rest = t.before('head')
      if (list.length !== rest.length + 2 || rest.some((n, i) => list[i + 2] !== n)) return 'Etter katten og spøkelset skal resten av lista stå som før.'
      return true
    },
  },
  {
    id: 'roboten-teller',
    title: 'Roboten teller i det skjulte',
    level: 'middels',
    topic: 'objekter',
    text: `Skriv \`class Bot extends Monster\`: en robot (\`shape = 'bot'\`) som teller skrittene sine i et privat felt \`#steps\`. Metoden \`step()\` legger til ett skritt, og getteren \`steps\` viser hvor mange det er blitt. Ingen utenfor klassen skal kunne endre tallet: \`bot.steps = 100\` skal ikke virke.

La så en ny robot ta tre skritt, og sett den først i lista.`,
    hints: [
      'Private felt har `#` foran: `#steps = 0`. De finnes bare inne i klassen.',
      'Getteren gir tallet ut: `get steps() { return this.#steps }`. Uten en setter kan ingen skrive til `steps`.',
      '`step() { this.#steps++ }`. Lag roboten med `new Bot({ value: 1, next: head })`.',
    ],
    world: (r) => listWorld(things(r, 6)),
    scaffold: `class Bot extends Monster {
  shape = 'bot'
  // #steps, step() og getteren steps
}

const bot = new Bot({ value: 1, color: 'cyan', next: head })
// Tre skritt, og så først i lista
`,
    solution: `class Bot extends Monster {
  shape = 'bot'
  #steps = 0
  step() { this.#steps++ }
  get steps() { return this.#steps }
}

const bot = new Bot({ value: 1, color: 'cyan', next: head })
bot.step()
bot.step()
bot.step()
head = bot
console.log(bot.steps)
`,
    // Making the bot and moving it to the front is part of the answer.
    opening: '',
    exports: ['Bot'],
    java: {
      text: `Skriv \`class Bot extends Monster\`: en robot (\`String shape = "bot"\`) som teller skrittene sine i et privat felt, \`private int steps\`. Metoden \`step()\` legger til ett skritt, og getteren \`getSteps()\` viser hvor mange det er blitt. Ingen utenfor klassen skal kunne endre tallet, så det finnes ingen \`setSteps\`.

La så en ny robot ta tre skritt, og sett den først i lista.`,
      hints: [
        'Et privat felt har `private` foran: `private int steps = 0;`. Det er klassens eget, og bare metodene i klassen bruker det.',
        'Getteren gir tallet ut: `int getSteps() { return steps; }`. Uten en setter kan ingen andre skrive til det.',
        '`void step() { steps++; }`. Lag roboten med `new Bot()`, sett `bot.next = head`, og la `head` peke på den.',
      ],
      scaffold: `class Bot extends Monster {
    String shape = "bot";
    // steps, step() og getSteps()
}

void main() {
    Bot bot = new Bot();
    bot.value = 1;
    bot.color = "cyan";
    bot.next = head;
    // Tre skritt, og så først i lista
}
`,
      solution: `class Bot extends Monster {
    String shape = "bot";
    private int steps = 0;

    void step() {
        steps++;
    }

    int getSteps() {
        return steps;
    }
}

void main() {
    Bot bot = new Bot();
    bot.value = 1;
    bot.color = "cyan";
    bot.next = head;
    bot.step();
    bot.step();
    bot.step();
    head = bot;
    IO.println(bot.getSteps());
}
`,
      opening: 'void main() {\n\n}',
    },
    check: (t) => {
      const Bot = t.fn('Bot')
      // In Java the getter is a method, getSteps(), and a private field isn't mirrored.
      if (t.lang === 'java') {
        const bot = new Bot()
        if (bot.shape !== 'bot') return `En ny Bot skal ha shape 'bot'.`
        if (typeof bot.getSteps !== 'function') return 'En Bot skal ha getteren getSteps().'
        if (bot.getSteps() !== 0) return `En ny Bot skal ha 0 skritt, men getSteps() gir ${t.show(bot.getSteps())}.`
        if (typeof bot.step !== 'function') return 'En Bot skal ha en metode step().'
        bot.step()
        bot.step()
        if (bot.getSteps() !== 2) return `Etter to step() skal getSteps() gi 2, men gir ${t.show(bot.getSteps())}.`
        if (Object.keys(bot).some((k) => /step/i.test(k))) return 'Tellingen ligger i et felt som synes utenfor klassen. Gjør det privat: `private int steps`.'
        if (typeof bot.setSteps === 'function') return 'Ingen utenfor klassen skal kunne endre tallet, så Bot skal ikke ha noen setSteps.'
        const first = t.head
        if (!(first instanceof Bot)) return 'Først i lista skal det stå en Bot.'
        if (first.getSteps() !== 3) return `Roboten først i lista har tatt ${t.show(first.getSteps())} skritt; den skal ha tatt 3.`
        return true
      }
      const bot = new Bot({ value: 2 })
      if (bot.shape !== 'bot') return `En ny Bot skal ha shape 'bot'.`
      if (bot.steps !== 0) return `En ny Bot skal ha 0 skritt, men har ${t.show(bot.steps)}.`
      if (typeof bot.step !== 'function') return 'En Bot skal ha en metode step().'
      bot.step()
      bot.step()
      if (bot.steps !== 2) return `Etter to step() skal steps være 2, men er ${t.show(bot.steps)}.`
      try { bot.steps = 100 } catch { /* a getter without a setter refuses in strict code */ }
      if (bot.steps !== 2) return 'Det går an å endre steps utenfra. Bruk et privat felt (#steps) og bare en getter.'
      if (Object.keys(bot).some((k) => /step/i.test(k))) return 'Tellingen ligger i et vanlig felt som synes utenfra. Bruk #steps.'
      const first = t.head
      if (!(first instanceof Bot)) return 'Først i lista skal det stå en Bot.'
      if (first.steps !== 3) return `Roboten først i lista har tatt ${t.show(first.steps)} skritt; den skal ha tatt 3.`
      return true
    },
  },
  {
    id: 'tekst-og-tall',
    title: 'Tekst og tall',
    level: 'middels',
    topic: 'objekter',
    text: `Gi klassen \`Monster\` to metoder som JavaScript bruker av seg selv:
- \`toString()\` gir monsteret som tekst, farge og verdi med mellomrom: \`'pink 42'\`. Da virker \`\${A}\` i en mal-streng.
- \`valueOf()\` gir verdien som tall. Da virker \`A < B\` og \`A - B\` på verdiene.

Koden skriver ut monstrene og sorterer en rad med \`(a, b) => a - b\`.`,
    hints: [
      'Begge er vanlige metoder i klassen: `toString() { … }` og `valueOf() { … }`.',
      "`toString` kan sette sammen `this.color + ' ' + this.value`.",
      '`valueOf` gir bare `this.value`. JavaScript kaller det når monsteret brukes som et tall.',
    ],
    world: (r) => listWorld(things(r, 5)),
    scaffold: `// Skriv toString() og valueOf() i klassen Monster.
for (let node = head; node; node = node.next) console.log(\`\${node}\`)
`,
    solution: `for (let node = head; node; node = node.next) console.log(\`\${node}\`)
`,
    solutionMonster: `class Monster {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
  toString() { return \`\${this.color} \${this.value}\` }
  valueOf() { return this.value }
}`,
    java: {
      text: `Gi klassen \`Monster\` to metoder som Java bruker av seg selv:
- \`toString()\` gir monsteret som tekst, farge og verdi med mellomrom: \`"pink 42"\`. Da skriver \`IO.println(A)\` ut den teksten, og \`"" + A\` blir den.
- \`compareTo(Monster other)\` sammenligner monsteret med et annet etter verdien: et negativt tall når det selv er minst, et positivt når \`other\` er minst. Med \`class Monster implements Comparable<Monster>\` vet Java at monstrene kan sammenlignes, og \`Collections.sort(row)\` sorterer en liste av dem.

Koden skriver ut en liste med monstrene. Når klassen har begge, tar du bort \`//\` foran sorteringen.`,
      hints: [
        'Begge må være `public`, for de finnes fra før: `toString()` i alle klasser, `compareTo` i `Comparable`. Skriv `@Override` over dem, så sier Java fra om navnet ikke stemmer.',
        '`public String toString()` kan sette sammen `color + " " + value`.',
        '`public int compareTo(Monster other)` kan gi `value - other.value`: negativt når dette monsteret er minst.',
      ],
      scaffold: `// Skriv toString() og compareTo(Monster other) i klassen Monster, og ta så bort // under.
void main() {
    List<Monster> row = new ArrayList<>(List.of(A, B, C, D, E));
    // Collections.sort(row);
    IO.println(row);
}
`,
      solution: `void main() {
    List<Monster> row = new ArrayList<>(List.of(A, B, C, D, E));
    Collections.sort(row);
    IO.println(row);
}
`,
      solutionMonster: `class Monster implements Comparable<Monster> {
    int value = 0;
    String color = "pink";
    Monster next;

    @Override
    public String toString() {
        return color + " " + value;
    }

    @Override
    public int compareTo(Monster other) {
        return value - other.value;
    }
}`,
    },
    check: (t) => {
      // Java has no valueOf: an item compares itself with another through compareTo (Comparable).
      if (t.lang === 'java') {
        if (t.slots[0].toString === Object.prototype.toString) return 'Klassen har ingen `toString()` ennå.'
        for (const node of t.slots) {
          const text = `${node}`
          if (text !== `${node.color} ${node.value}`) return `${t.show(node)}.toString() gir ${t.show(text)}, men skal gi ${t.show(`${node.color} ${node.value}`)}.`
        }
        if (typeof t.slots[0].compareTo !== 'function') return 'Klassen har ingen `compareTo(Monster other)` ennå.'
        for (const a of t.slots) {
          for (const b of t.slots) {
            const got = a.compareTo(b)
            const want = Math.sign(a.value - b.value)
            if (typeof got !== 'number' || Math.sign(got) !== want) {
              return `${t.show(a)}.compareTo(${t.show(b)}) gav ${t.show(got)}, men med verdiene ${a.value} og ${b.value} skal det være ${want < 0 ? 'et negativt tall' : want > 0 ? 'et positivt tall' : '0'}.`
            }
          }
        }
        return true
      }
      for (const node of t.slots) {
        const text = `${node}`
        if (text !== `${node.color} ${node.value}`) return `${t.show(node)} som tekst blir ${t.show(text)}, men skal bli ${t.show(`${node.color} ${node.value}`)}.`
        if (+node !== node.value) return `${t.show(node)} som tall gir ${t.show(+node)}, men skal gi ${node.value}.`
      }
      const row = [30, 5, 77, 12].map((value) => t.monster({ value }))
      const sorted = [...row].sort((a: any, b: any) => a - b).map((n) => n.value)
      if (!t.same(sorted, [5, 12, 30, 77])) return `Sortert med (a, b) => a - b ble raden ${t.show(sorted)}.`
      if (!((row[1] as any) < (row[0] as any))) return 'Et monster med 5 skal være mindre enn ett med 30.'
      return true
    },
  },
  {
    id: 'fargetelling',
    title: 'Fargetelling',
    level: 'lett',
    topic: 'objekter',
    text: `Skriv \`function tally(items)\` som teller hvor mange monstre det er av hver farge, og gir tilbake en \`Map\` fra farge til antall: \`Map { 'pink' => 3, 'cyan' => 1, … }\`.

Bare farger som finnes, skal være med.`,
    hints: [
      'Begynn med `const counts = new Map()`.',
      'For hvert monster: `counts.set(color, (counts.get(color) ?? 0) + 1)`.',
      'Gi tilbake `counts` til slutt.',
    ],
    world: (r) => {
      const items = things(r)
      const colors = [pick(r, PALETTE), pick(r, PALETTE), pick(r, PALETTE)]
      items.forEach((s) => { s.color = pick(r, colors) })
      return arrayWorld(items)
    },
    monster: PLAIN_MONSTER,
    scaffold: `function tally(items) {
  const counts = new Map()
  // Tell fargene
  return counts
}

console.log(tally(items))
`,
    solution: `function tally(items) {
  const counts = new Map()
  for (const thing of items) counts.set(thing.color, (counts.get(thing.color) ?? 0) + 1)
  return counts
}

console.log(tally(items))
`,
    exports: ['tally'],
    java: {
      code: {
        'function tally(items)': 'Map<String, Integer> tally(List<Monster> items)',
        "Map { 'pink' => 3, 'cyan' => 1, … }": '{pink=3, cyan=1, …}',
      },
      hints: [
        'Begynn med `Map<String, Integer> counts = new HashMap<>()`.',
        'For hvert monster: `counts.put(color, counts.getOrDefault(color, 0) + 1)`. Eller kortere: `counts.merge(color, 1, Integer::sum)`.',
        'Gi tilbake `counts` til slutt.',
      ],
      scaffold: `Map<String, Integer> tally(List<Monster> items) {
    Map<String, Integer> counts = new HashMap<>();
    // Tell fargene
    return counts;
}

void main() {
    IO.println(tally(items));
}
`,
      solution: `Map<String, Integer> tally(List<Monster> items) {
    Map<String, Integer> counts = new HashMap<>();
    for (Monster monster : items) counts.merge(monster.color, 1, Integer::sum);
    return counts;
}

void main() {
    IO.println(tally(items));
}
`,
    },
    check: (t) => {
      const tally = t.fn('tally')
      const rows = [['pink', 'cyan', 'pink', 'gold', 'pink'], ['lime'], [], ['red', 'red', 'teal', 'teal']]
      for (const colors of rows) {
        const want = new Map()
        for (const c of colors) want.set(c, (want.get(c) ?? 0) + 1)
        const got = tally(colors.map((color, i) => t.monster({ value: i + 1, color })))
        if (!(got instanceof Map)) return `tally skal gi en Map, men gav ${t.show(got)}.`
        if (!t.same(got, want)) return `For fargene ${t.show(colors)} gav tally ${t.show(got)}.`
      }
      return true
    },
  },
  {
    id: 'hvor-mange-farger',
    title: 'Hvor mange farger?',
    level: 'lett',
    topic: 'objekter',
    text: `Skriv \`function colorCount(items)\` som gir tilbake hvor mange forskjellige farger monstrene har.

En \`Set\` holder hver verdi bare én gang, så den gjør det meste av jobben.`,
    hints: [
      'Lag en `Set` av fargene: `new Set(items.map((thing) => thing.color))`.',
      'En `Set` har `size`, ikke `length`.',
      'En tom array har 0 farger.',
    ],
    world: (r) => arrayWorld(things(r)),
    monster: PLAIN_MONSTER,
    scaffold: `function colorCount(items) {
  // Hvor mange forskjellige farger?
  return 0
}

console.log(colorCount(items))
`,
    solution: `function colorCount(items) {
  return new Set(items.map((thing) => thing.color)).size
}

console.log(colorCount(items))
`,
    exports: ['colorCount'],
    java: {
      code: { 'function colorCount(items)': 'int colorCount(List<Monster> items)' },
      hints: [
        'Lag en `Set` av fargene, `Set<String> colors = new HashSet<>()`, og legg til fargen til hvert monster med `colors.add`.',
        'En `Set` sier hvor mange den har med `size()`, som en liste.',
        'En tom liste har 0 farger.',
      ],
      scaffold: `int colorCount(List<Monster> items) {
    // Hvor mange forskjellige farger?
    return 0;
}

void main() {
    IO.println(colorCount(items));
}
`,
      solution: `int colorCount(List<Monster> items) {
    Set<String> colors = new HashSet<>();
    for (Monster monster : items) colors.add(monster.color);
    return colors.size();
}

void main() {
    IO.println(colorCount(items));
}
`,
    },
    check: (t) => {
      const colorCount = t.fn('colorCount')
      for (const colors of [['pink', 'pink', 'cyan'], ['gold'], ['red', 'teal', 'lime', 'violet', 'red'], ['cyan', 'cyan']]) {
        const want = new Set(colors).size
        const got = colorCount(colors.map((color, i) => t.monster({ value: i + 1, color })))
        if (got !== want) return `For fargene ${t.show(colors)} gav colorCount ${t.show(got)}, men det er ${want}.`
      }
      if (colorCount([]) !== 0) return `For en tom ${t.lang === 'java' ? 'liste' : 'array'} skal colorCount gi 0.`
      return true
    },
  },
  {
    id: 'grupper-etter-farge',
    title: 'Grupper etter farge',
    level: 'middels',
    topic: 'objekter',
    text: `Skriv \`function groupByColor(items)\` som gir tilbake en \`Map\` fra farge til en array med monstrene som har den fargen, i den rekkefølgen de står i \`items\`.

Det er monstrene selv som skal i arrayene, ikke bare verdiene.`,
    hints: [
      'For hvert monster: finnes fargen ikke i Map-en ennå, legg inn en tom array for den.',
      'Så `groups.get(color).push(thing)`.',
      'Rekkefølgen kommer av seg selv når du går gjennom `items` fra start til slutt.',
    ],
    world: (r) => {
      const items = things(r)
      const colors = [pick(r, PALETTE), pick(r, PALETTE), pick(r, PALETTE)]
      items.forEach((s) => { s.color = pick(r, colors) })
      return arrayWorld(items)
    },
    monster: PLAIN_MONSTER,
    scaffold: `function groupByColor(items) {
  const groups = new Map()
  // Legg hvert monster i gruppen for fargen sin
  return groups
}

console.log(groupByColor(items))
`,
    solution: `function groupByColor(items) {
  const groups = new Map()
  for (const thing of items) {
    if (!groups.has(thing.color)) groups.set(thing.color, [])
    groups.get(thing.color).push(thing)
  }
  return groups
}

console.log(groupByColor(items))
`,
    exports: ['groupByColor'],
    java: {
      text: `Skriv \`Map<String, List<Monster>> groupByColor(List<Monster> items)\` som gir tilbake en \`Map\` fra farge til en liste med monstrene som har den fargen, i den rekkefølgen de står i \`items\`.

Det er monstrene selv som skal i listene, ikke bare verdiene.`,
      hints: [
        'For hvert monster: finnes fargen ikke i Map-en ennå (`containsKey`), legg inn en tom liste for den.',
        'Så `groups.get(color).add(monster)`.',
        'Rekkefølgen kommer av seg selv når du går gjennom `items` fra start til slutt.',
      ],
      scaffold: `Map<String, List<Monster>> groupByColor(List<Monster> items) {
    Map<String, List<Monster>> groups = new HashMap<>();
    // Legg hvert monster i gruppen for fargen sin
    return groups;
}

void main() {
    IO.println(groupByColor(items));
}
`,
      solution: `Map<String, List<Monster>> groupByColor(List<Monster> items) {
    Map<String, List<Monster>> groups = new HashMap<>();
    for (Monster monster : items) {
        if (!groups.containsKey(monster.color)) groups.put(monster.color, new ArrayList<>());
        groups.get(monster.color).add(monster);
    }
    return groups;
}

void main() {
    IO.println(groupByColor(items));
}
`,
    },
    check: (t) => {
      const groupByColor = t.fn('groupByColor')
      const colors = ['pink', 'cyan', 'pink', 'gold', 'cyan', 'pink']
      const row = colors.map((color, i) => t.monster({ value: i + 1, color }))
      const got = groupByColor(row)
      const array = t.lang === 'java' ? 'liste' : 'array'
      if (!(got instanceof Map)) return `groupByColor skal gi en Map, men gav ${t.show(got)}.`
      for (const color of new Set(colors)) {
        const want = row.filter((n) => n.color === color)
        const group = got.get(color)
        if (!Array.isArray(group)) return `Map-en har ingen ${array} for ${t.show(color)}.`
        if (group.length !== want.length || group.some((n: unknown, i: number) => n !== want[i])) {
          return `Gruppen for ${t.show(color)} skal ha monstrene med verdiene ${t.show(want.map((n) => n.value))}, i den rekkefølgen.`
        }
      }
      if (got.size !== new Set(colors).size) return `Map-en har ${got.size} farger, men raden har ${new Set(colors).size}.`
      if (groupByColor([]).size !== 0) return `For en tom ${array} skal Map-en være tom.`
      return true
    },
  },
  {
    id: 'en-liste-du-kan-ga-gjennom',
    title: 'En liste du kan gå gjennom',
    level: 'middels',
    topic: 'objekter',
    text: `Skriv \`class Chain\` som pakker inn en lenket liste: \`new Chain(head)\`. Gi den en generator-metode \`*[Symbol.iterator]()\` som gir monstrene ett etter ett langs \`next\`.

Da virker \`for (const thing of new Chain(head))\` og \`[...new Chain(head)]\` som på en array. Lista selv skal ikke endres.`,
    hints: [
      'Konstruktøren husker starten: `constructor(head) { this.head = head }`.',
      'En generator skrives med stjerne og bruker `yield`: `*[Symbol.iterator]() { … }`.',
      'Gå gjennom lista og `yield node` for hvert monster.',
    ],
    world: (r) => listWorld(things(r, 6)),
    scaffold: `class Chain {
  constructor(head) {
    this.head = head
  }
  // *[Symbol.iterator]() { … }
}

for (const thing of new Chain(head)) console.log(thing.value)
`,
    solution: `class Chain {
  constructor(head) {
    this.head = head
  }
  *[Symbol.iterator]() {
    for (let node = this.head; node; node = node.next) yield node
  }
}

for (const thing of new Chain(head)) console.log(thing.value)
`,
    exports: ['Chain'],
    java: {
      text: `Skriv \`class Chain implements Iterable<Monster>\` som pakker inn en lenket liste: \`new Chain(head)\`. Metoden \`iterator()\` gir en ny \`ChainIterator\`, som går langs \`next\` og gir monstrene ett etter ett: \`hasNext()\` sier om det er flere igjen, og \`next()\` gir det neste.

Da virker \`for (Monster monster : new Chain(head))\` som på en liste. Lista selv skal ikke endres.`,
      hints: [
        'Konstruktøren husker starten: `Chain(Monster head) { this.head = head; }`. Så gir `iterator()` tilbake `new ChainIterator(head)`.',
        '`class ChainIterator implements Iterator<Monster>` har en peker `node` som starter på `head`. Det er flere igjen så lenge `node != null`. Metodene fra et interface må være `public`.',
        '`next()` husker `node`, flytter `node = node.next` og gir tilbake det den husket.',
      ],
      scaffold: `class Chain implements Iterable<Monster> {
    Monster head;

    Chain(Monster head) {
        this.head = head;
    }

    public Iterator<Monster> iterator() {
        return new ChainIterator(head);
    }
}

class ChainIterator implements Iterator<Monster> {
    Monster node;

    ChainIterator(Monster head) {
        node = head;
    }

    public boolean hasNext() {
        // Er det flere monstre igjen?
        return false;
    }

    public Monster next() {
        // Gi det neste, og gå ett hakk fram
        return null;
    }
}

void main() {
    for (Monster monster : new Chain(head)) IO.println(monster.value);
}
`,
      solution: `class Chain implements Iterable<Monster> {
    Monster head;

    Chain(Monster head) {
        this.head = head;
    }

    public Iterator<Monster> iterator() {
        return new ChainIterator(head);
    }
}

class ChainIterator implements Iterator<Monster> {
    Monster node;

    ChainIterator(Monster head) {
        node = head;
    }

    public boolean hasNext() {
        return node != null;
    }

    public Monster next() {
        Monster current = node;
        node = node.next;
        return current;
    }
}

void main() {
    for (Monster monster : new Chain(head)) IO.println(monster.value);
}
`,
      opening: `void main() {
    for (Monster monster : new Chain(head)) IO.println(monster.value);
}`,
    },
    check: (t) => {
      const Chain = t.fn('Chain')
      // A check can't run a Java for-each loop; it walks the iterator as the loop does, with hasNext() and next().
      if (t.lang === 'java') {
        const head = t.list([3, 1, 4, 1, 5])
        const nodes = t.chain(head)!
        const chain = new Chain(head)
        if (typeof chain.iterator !== 'function') return 'Chain har ingen metode `iterator()` ennå.'
        const it = chain.iterator()
        if (typeof it?.hasNext !== 'function' || typeof it.next !== 'function') return '`iterator()` skal gi tilbake en `ChainIterator`, med `hasNext()` og `next()`.'
        const got = []
        while (got.length <= nodes.length && it.hasNext()) got.push(it.next())
        if (got.length !== nodes.length || got.some((n, i) => n !== nodes[i])) return 'Gjennom iteratoren skal Chain gi monstrene i lista, ett etter ett, og så stoppe.'
        const again = chain.iterator()
        if (again === it || !again.hasNext() || again.next() !== nodes[0]) return 'En ny for-løkke skal begynne fra starten igjen: `iterator()` skal gi en ny `ChainIterator` hver gang.'
        if (!t.same(t.values(head), [3, 1, 4, 1, 5])) return 'Lista ble endret.'
        if (new Chain(null).iterator().hasNext()) return 'new Chain(null) skal ikke gi noen monstre: hasNext() skal gi false med en gang.'
        return true
      }
      const head = t.list([3, 1, 4, 1, 5])
      const nodes = t.chain(head)!
      let got
      try {
        got = [...new Chain(head)]
      } catch {
        return 'new Chain(head) kan ikke spres med [...]; den trenger *[Symbol.iterator]().'
      }
      if (got.length !== nodes.length || got.some((n, i) => n !== nodes[i])) return 'Spredt ut skal Chain gi monstrene i lista, ett etter ett.'
      let seen = 0
      for (const node of new Chain(head)) {
        seen++
        if (node.value === 4) break
      }
      if (seen !== 3) return 'Med break skal for … of stoppe der; Chain gav for mange.'
      if (!t.same(t.values(head), [3, 1, 4, 1, 5])) return 'Lista ble endret.'
      if ([...new Chain(null)].length !== 0) return 'new Chain(null) skal ikke gi noen monstre.'
      return true
    },
  },
  {
    id: 'husk-de-tre-siste',
    title: 'Husk de tre siste',
    level: 'vanskelig',
    topic: 'objekter',
    text: `Skriv \`class Shelf\`: en hylle med plass til et fast antall verdier, \`new Shelf(3)\`.
- \`put(key, value)\` legger noe på hylla.
- \`get(key)\` gir det tilbake, eller \`undefined\`.

Er hylla full når noe nytt skal på, må det som har ligget lengst uten å bli brukt, vike. Både \`get\` og \`put\` teller som å bruke noe.`,
    hints: [
      'En `Map` husker rekkefølgen nøklene ble lagt inn i. Den første nøkkelen er den eldste.',
      'Når noe brukes, flytter du det bakerst: `delete` og `set` på nytt.',
      'Når hylla er full, kaster du den første nøkkelen: `this.map.keys().next().value`.',
    ],
    world: (r) => arrayWorld(things(r, 5)),
    monster: PLAIN_MONSTER,
    scaffold: `class Shelf {
  constructor(size) {
    this.size = size
    this.map = new Map()
  }
  get(key) {
    return this.map.get(key)
  }
  put(key, value) {
    this.map.set(key, value)
  }
}

const shelf = new Shelf(3)
for (const thing of items) shelf.put(thing.value, thing)
console.log([...shelf.map.keys()])
`,
    solution: `class Shelf {
  constructor(size) {
    this.size = size
    this.map = new Map()
  }
  get(key) {
    if (!this.map.has(key)) return undefined
    const value = this.map.get(key)
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key)
    else if (this.map.size >= this.size) this.map.delete(this.map.keys().next().value)
    this.map.set(key, value)
  }
}

const shelf = new Shelf(3)
for (const thing of items) shelf.put(thing.value, thing)
console.log([...shelf.map.keys()])
`,
    exports: ['Shelf'],
    java: {
      code: { 'put(key, value)': 'void put(int key, String value)', 'get(key)': 'String get(int key)', undefined: 'null' },
      hints: [
        'En `LinkedHashMap` husker rekkefølgen nøklene ble lagt inn i. Den første nøkkelen er den eldste.',
        'Når noe brukes, flytter du det bakerst: `remove` og `put` på nytt.',
        'Når hylla er full, kaster du den første nøkkelen: `map.keySet().iterator().next()`.',
      ],
      scaffold: `class Shelf {
    final int size;
    final Map<Integer, String> map = new LinkedHashMap<>();

    Shelf(int size) {
        this.size = size;
    }

    String get(int key) {
        return map.get(key);
    }

    void put(int key, String value) {
        map.put(key, value);
    }
}

void main() {
    Shelf shelf = new Shelf(3);
    for (Monster monster : items) shelf.put(monster.value, monster.color);
    IO.println(shelf.map.keySet());
}
`,
      solution: `class Shelf {
    final int size;
    final Map<Integer, String> map = new LinkedHashMap<>();

    Shelf(int size) {
        this.size = size;
    }

    String get(int key) {
        if (!map.containsKey(key)) return null;
        String value = map.remove(key);
        map.put(key, value);
        return value;
    }

    void put(int key, String value) {
        if (map.containsKey(key)) map.remove(key);
        else if (map.size() >= size) map.remove(map.keySet().iterator().next());
        map.put(key, value);
    }
}

void main() {
    Shelf shelf = new Shelf(3);
    for (Monster monster : items) shelf.put(monster.value, monster.color);
    IO.println(shelf.map.keySet());
}
`,
    },
    check: (t) => {
      const Shelf = t.fn('Shelf')
      // Java's get gives null for a key that isn't there.
      const none = t.lang === 'java' ? null : undefined
      for (let round = 0; round < 40; round++) {
        const size = 1 + (round % 4)
        const shelf = new Shelf(size)
        const ref = new Map()
        const ops: string[] = []
        for (let i = 0; i < 30; i++) {
          const key = Math.floor(Math.random() * 6)
          if (Math.random() < 0.5) {
            ops.push(`put(${key})`)
            shelf.put(key, `v${i}`)
            if (ref.has(key)) ref.delete(key)
            else if (ref.size >= size) ref.delete(ref.keys().next().value)
            ref.set(key, `v${i}`)
          } else {
            ops.push(`get(${key})`)
            const got = shelf.get(key)
            const want = ref.has(key) ? ref.get(key) : none
            if (ref.has(key)) {
              ref.delete(key)
              ref.set(key, want)
            }
            if (got !== want) return `Med plass til ${size}, etter ${ops.slice(-6).join(', ')}: get(${key}) gav ${t.show(got)}, men skulle gi ${t.show(want)}.`
          }
        }
      }
      return true
    },
    source: 'https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU',
  },
]
