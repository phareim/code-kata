# Kodekata

Small JavaScript tasks where pixel creatures ask you to sort, tidy and move them: reverse a list, bubble-sort a row,
build a Tower of Hanoi, mirror a tree, find the way through a graph, flood-fill a grid. Write a few lines, run them in
the browser, and watch the creatures do what the code says. Neon Coast's pixel look from phareim.no (the night
palette, Neon Shrine's 5×7 font, notched boxes).

Live: https://kata.phareim.no (public; signing in is optional and only carries the progress along; 131 tasks, every one solved in Chrome and WebKit against the built site 2026-10-23).

## What it does

- **Tasks** (`#/<id>`): a bank of tasks, each with a text, hints one at a time, a level (lett, middels, vanskelig) and
  a topic (lister, sortering, rydding og flytting, stabler og køer, trær, grafer, rutenett, objekter og klassen,
  klassikere). «Kjør» runs the code and checks it: «Løst!» with confetti, a stamp and the creatures jumping, or
  «Ikke ennå» with what is still wrong. The editor opens with a comment that names the variables (`head`, `items` …)
  and, when the task asks for functions, the code below that runs them on the stage, but no skeleton of the answer:
  hint 1 has a button that puts one in («Sett inn et skjelett», asking first over the visitor's own code). The
  solution can be shown and put into the editor, after a «Sikker?».
- **The bank** («Oppgaver», or `/`): every task, searchable (title, text, topic, level), filtered by level, topic and
  «Bare uløste», with solved ones ticked. «Tilfeldig» picks one not solved yet, from the whole bank or from what the
  filters show.
- **Progress**: solved tasks, opened hints, the code and the class per task, and the seed of each task's items are
  kept in localStorage (`code-kata:progress`). The header counts what is solved.
- **On your account**: signed in at auth.phareim.no (the «Logg inn» link in the header, which becomes your name),
  the progress is kept on your account too and follows you to another browser (below).
- **Lekeplass** (`#/lekeplass`): the free playground, eight creatures in a list and no task (below).
- **Editor**: CodeMirror 6 with JavaScript highlighting, bracket matching, search and undo, and autocomplete as you
  type (Tab or Enter): the code's own names, the roots (`head`, `items`, `root` …), `Ting`, `vis` and the items'
  letters, keywords and snippets, the runner's globals with their members, and common members after any other dot.
- **Run** with «Kjør» or Cmd/Ctrl + Enter. Output is printed the way Node prints it (`{ a: 1 }`, `[ 1, 'x' ]`,
  `Map(1) { 'a' => 1 }`). An uncaught error shows its line and marks it in the editor.

## The stage

The creatures stand on the stage above the code. They are the task's items, each a `Ting` (a class the code can see
and change, at the top of the objects pane), held by named globals, the roots. Each root gets a panel drawn by its
shape:

| Root | Drawn as |
|---|---|
| `head` (or any root pointing at an item) | a list along `next`: HEAD → A → C → null; ⇄ where `prev` points back; «til X» for a loop |
| `items`, or any array of items | a row with the index under each |
| `stack`, `queue` | a stack standing up (top first), a queue with its front marked |
| `pegs` (an array of arrays) | poles with the items stacked from the bottom as discs, as wide as their `value` |
| `root` | a binary tree along `left` and `right` |
| `nodes` with `views: { nodes: 'graph' }` | a graph around a circle, an edge per `neighbors` pair (an arrow when one-way) |
| `grid` (an array of arrays of values) | squares: a colour name fills one, `'#'` is a wall |
| anything else | `name = value` |

- An item appears once on the stage; a second panel that holds it shows its letter. Items no panel draws come last,
  dimmed when no root reaches them. One token per item across the panels, so a creature glides (and hops, if it goes
  far) from where it was to where it is, even from one panel to another.
- An item's `shape` picks its creature: `blob` (the default), `ghost`, `cat` or `bot`. `color` is a palette name
  (`pink`, `cyan`, `gold`, `lime`, `violet`, `orange`, `red`, `teal`) or any CSS colour.
- **`vis()`** takes a snapshot. After the run the stage plays the snapshots, then the end, with a frame counter;
  «Hopp over» skips to the end and the speed button plays at 1x, 2x, 4x or 0,5x (remembered per browser). Strings
  and numbers in the call make the snapshot's caption, items (or arrays of them) light up gold:
  `vis('bytter', items[i], items[i + 1])`. At most 240 per run; a long run plays faster.
- A root with the `pointer` view (`slow`, `fast`, `guest` …) is a flag over the item it names, not a panel of its own.
- The objects pane writes the roots and the items as code, in slot order: `head = D`,
  `A = Ting { value: 7, color: 'pink', next: C }`. Pointing at an item lights it up everywhere.
- Letters are memory slots: A is the first item made, B the second. Items the code makes and links in (from a root,
  along `next`/`prev`/`left`/`right`/`parent`, or in an array of Ting) get the next letters. `A.next = C` works;
  `A = …` throws, because the letter names the item, not a variable.

In a task, every run starts from the task's items as they started (the same until «Nye» rolls new ones), so a run
can be tried again and again. In the playground each run starts from where the last one left the items, «Nullstill»
goes back and «Nye» makes eight new ones.

### The Ting class

The class the items are made of stands at the top of the objects pane. A task brings the class its shape needs
(`next` for a list, `left`/`right` for a tree, `neighbors` for a graph):

```js
class Ting {
  value = 0
  color = 'pink'
  next = null
  constructor(props) { Object.assign(this, props) }
}
```

Add a field and press «Bruk» (or Cmd/Ctrl + Enter in the class): every item gets it at its default. In the
playground, taking a field out takes it off every item. Methods in the class work on every item, and
`new Ting({ value: 5, color: 'gold', next: head })` makes a new one in the code. A `value`, `color` or `shape` that
comes from a getter is drawn like a field. In a task the class folds to a one-line summary
(`class Ting { value, color, next }`) unless the task is about the class or the visitor has changed it.

## How code runs

`src/run/worker.js` is imported as text and started as a Web Worker from a `data:` URL, a fresh one per run:

- Off the main thread, so a loop that never ends can't freeze the page. «Stopp» ends a run, and so does a 10-second limit.
- On an opaque origin: the code can't read the site's storage, and its requests carry none of the visitor's
  `*.phareim.no` cookies.
- The code is the body of an async function in strict mode, so `await` works at the top level. A run ends when the
  code has returned and no `setTimeout`/`setInterval` is left, or at an uncaught error.
- The class and the code run as one source: the class, a line that builds the items from it, then the code. So
  `Ting` in the code is the class the items are made of, and an error's line is placed back in the editor it came
  from (`linje 3` or `Ting linje 4`). A task that asks for functions gets a last line that returns them.
- The items go in and out as data (`src/world/world.ts`, and the comment at the top of the world section in
  `worker.js`): each property is another item by slot, an array of items, a value that survives a structured clone,
  or, for a function or a symbol, only its text.
- **The check.** After a task's code has run, the worker runs the task's check with one argument, `t`: the roots as
  the code left them (`t.head`, `t.items` …), the items it started with (`t.slots`), a plain copy of the start
  (`t.start`), what the code printed (`t.out`), the functions it declared (`t.fn('count')`), and helpers to build test
  lists and trees and to name items in a message. The check returns `true` or a sentence in Norwegian saying what is
  still wrong. An error in a function the code declared counts as the code's (with its line); an error in the check
  itself says so («Sjekken feilet»).
- Error lines come from the engine: Chrome names the code `kata.js` in the stack, WebKit sets `error.line`. The
  worker measures the engine's line offset once with a probe. Chrome reports a SyntaxError without a line, so the page
  takes the line where CodeMirror's parser fails. Firefox is untested; the worker reads its `lineNumber` too.

## Progress on the account

The page works from localStorage, signed in or not. A visitor signed in at auth.phareim.no (the `session_token`
cookie on `.phareim.no`) also has their progress on their account:

- When the page loads it asks `GET /api/progress`. A 401 shows «Logg inn» (a link to auth.phareim.no that comes back
  to the task); no API at all (`npm run dev`, an outage) hides the link and the page carries on from localStorage.
- Signed in, the account's tasks are merged into localStorage, and what the account lacks or has older goes up.
  Every change after that goes up about two seconds later (solving, a hint or the solution at once), in one
  `POST /api/progress` with the changed tasks; what is left when the tab is hidden or closed goes as a keepalive
  request. A failed request is tried again, and anything still not sent is found again on the next visit.
- The merge (`src/app/merge.ts`, the same on both sides): a solve keeps its first time, hints the most opened, a
  peek at the solution sticks, and the code and the class come together from whichever browser edited them last
  (`at`, set when either changes). The open task's editor takes the account's code when it is newer.
- Signing in on a browser that has progress from before adds that progress to the account. Signing out (on
  auth.phareim.no) leaves the browser's copy as it is.

The Worker (`worker/index.ts`) runs only for `/api/*`; everything else is static assets. It looks the session up
read-only in Reader's database (auth.phareim.no's accounts) and keeps each account's progress in its own SQLite
Durable Object (`ProgressStore`, one key per task, at most 500). There is no allowlist: an account only ever reaches
its own store. The visitor's code can't reach the API: it runs on an opaque origin whose requests carry no cookies,
and a write must come from the site's own origin as JSON. The store has no backup; a lost store costs the progress
on other browsers, not the copy in each browser. It becomes redundant if the phareim.no accounts get a shared
per-app store of their own.

## Writing a task

A task is an object in one of the topic files in `src/tasks/` (`types.ts` has the type, with comments):

- `id`: a slug, stable forever (progress is stored by it). Retire a task with `hidden: true`; never rename one.
- `title`, `level`, `topic`, `text` (Norwegian bokmål; a blank line starts a paragraph, `code` in backticks, lines
  starting with "- " make a list), and two or more `hints`, from a nudge to nearly the answer.
- `world(random)`: the items, from the builders in `src/tasks/build.ts` (`listWorld`, `arrayWorld`, `bstWorld`,
  `treeWorld`, `graphWorld`, `makeWorld`), with the seeded `random` it gets.
- `ting`: the class (`src/tasks/classes.ts`), when the items aren't a list.
- `scaffold`: a skeleton of the answer, behind hint 1's button, and `solution` (and `solutionTing` when the task is
  about the class). The editor opens with less (`src/tasks/opening.ts`): a comment that names the roots, and, for a
  task with `exports`, the scaffold without their declarations (a declaration runs from `function name` or
  `class Name` at column 0 to a `}` at column 0); a class task keeps its whole scaffold. `opening` overrides the code
  under the comment when the rest of the scaffold is part of the answer too.
- `check: (t) => …`: an arrow function that uses only `t` and JavaScript's globals. It travels to the worker as
  source text, so anything else it names is undefined there.
- `exports`: the functions the code must declare, for `t.fn`.
- `views`: a view for a root its shape doesn't give away, such as `{ nodes: 'graph' }`.

`npm test` runs every task through the real worker in Node: its solution must pass on three seeds, its opening and its
scaffold must not, and the check must not break. Code that calls an export it never declared gets «Fant ikke
funksjonen …» as its verdict, beside the error. It also keeps the table in `docs/tasks.md` in step with the bank
(`UPDATE_DOCS=1 npx vitest run test/docs.test.ts` rewrites it). `scripts/smoke-tasks.mjs` then solves every task in
the built site in Chrome and WebKit, which also covers the checks as minified source.

`docs/tasks.md` has how the bank was made, the sources its ideas came from, and the table of every task.

## Files

- `src/main.ts`: the page: what is open (a task or the playground), routing, runs, playback, verdicts, saving.
- `src/app/`: the bank (`bank.ts`), progress and its sync with the account (`progress.ts`), the merge the page and
  the Worker share (`merge.ts`), the success effect (`celebrate.ts`), task text (`text.ts`).
- `src/tasks/`: the task bank: one file per topic, `index.ts` (the order they are numbered in), `build.ts`
  (start worlds), `classes.ts` (the Ting classes), `opening.ts` (what the editor opens with), `types.ts`.
- `src/stage/`: the stage (`stage.ts`: panels, views, tokens, glides) and the creatures (`creatures.ts`).
- `src/world/world.ts`: the items' data, the palette, letters, random sets, walking a list, what the roots reach.
- `src/world/objects.ts`: the objects pane.
- `src/editor/`: the CodeMirror setup, completion sources and the theme.
- `src/run/runner.ts`: starts, stops and times out the worker.
- `src/run/worker.js`: the worker: console capture, value formatting, timers, error lines, the items in and out,
  `vis()`, the check.
- `src/starter.ts`: the playground's code and class (and the earlier starters it replaces).
- `worker/index.ts`: the Worker behind `/api/progress` and the account's store (`ProgressStore`).
- `test/harness.ts`: runs `worker.js` in a Node vm the way the page runs it; `test/tasks.test.ts` uses it for every
  task, `test/docs.test.ts` keeps `docs/tasks.md` current, `test/sync.test.ts` covers the merge,
  the Worker and the page's sync.
- `docs/tasks.md`: the bank's overview, sources and table.
- `scripts/smoke.mjs` (the playground) and `scripts/smoke-tasks.mjs` (the tasks): browser checks in Chrome and
  WebKit, with screenshots.

## Develop

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # formatting, error lines, completions, the items' round trip, the engine, every task
npm run build      # typecheck + dist/
npm run preview    # serve dist/ on 4173
PLAYWRIGHT=/path/to/playwright-core/index.mjs CHROME_BIN=/path/to/chrome node scripts/smoke-tasks.mjs http://127.0.0.1:4173/
```

## Deploy

`dist/` is served as static assets by the Cloudflare Worker `code-kata` (`wrangler.jsonc`), with the custom domain
kata.phareim.no. The same Worker runs `worker/index.ts` for `/api/*`, with Reader's `reader-service` D1 (read only)
and the `ProgressStore` Durable Object; `wrangler deploy` applies the Durable Object's migrations itself.
`npx wrangler dev` runs both locally on the built `dist/`, with an empty local D1. A push to `main` builds, tests and deploys it from Petter's server; there is no GitHub Actions
workflow. By hand: `npm run build && npx wrangler deploy`.
