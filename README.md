# Kodekata

A small place for JavaScript katas: write a few lines, run them in the browser, read the console, and watch a row of
items change as the code moves their pointers around.
Neon Coast's pixel look from phareim.no (the night palette, Neon Shrine's 5×7 font, notched boxes).

Live: https://kata.phareim.no (public, no login; verified in Chrome and WebKit 2026-10-22).

## What it does

- **Items**: a row of 4 to 8 pixel creatures above the editor, a linked list to play with (below).
- **Editor**: CodeMirror 6 with JavaScript highlighting, bracket matching, search and undo.
- **Autocomplete** as you type, Tab or Enter to accept:
  - names the code declares and can see from the cursor: variables, functions, parameters, classes
  - `head` and the items' letters (`A`, `B` …)
  - keywords and snippets (`for`, `if`, `function`, `log` → `console.log()`, `=>`)
  - the globals the runner has (`Math`, `JSON`, `Map`, `setTimeout` …) and their members after a dot (`Math.floor`, `console.table`)
  - after a dot on anything else: `value`, `color`, `next`, common array, string, number, promise and map/set members,
    and the property names the code already uses
- **Run** with «Kjør» or Cmd/Ctrl + Enter. Output is printed the way Node prints it (`{ a: 1 }`, `[ 1, 'x' ]`, `Map(1) { 'a' => 1 }`).
  An uncaught error shows its line and marks it in the editor.
- The code is saved in the browser's localStorage as you type.

## The items

Each item is an object `{ value, color, next }`: a number 1–99, a colour name and a pointer to the next item (or
`null`). Every visit makes a new set of 4 to 8, with different values, colours from the palette (`pink`, `cyan`,
`gold`, `lime`, `violet`, `orange`, `red`, `teal`) and the list in a shuffled order.

- In the code, `head` points at the first item and can be moved (`head = head.next`). Each item is also a fixed global
  named by its letter, so `A.next = C` works; `A = …` throws, because the letter names the item, not a variable.
- The letters are memory slots: A is the first item made, B the second, and so on. Items the code makes and links in
  from `head` along `next` get the next letters.
- The row shows the list as the pointers make it: HEAD, then each item along `next`, then how it ends: NULL, a pink
  «til X» when `next` points back into the list (a loop), or a red «?» when `next` isn't an item. Items not in the list
  stand apart as «løse», looking down. When a run changes the order, the creatures glide to their new places.
- The objects pane on the right writes the same items as code, in slot order: `head = D`,
  `A = { value: 7, color: 'pink', next: C }`. Extra properties the code adds show up there too. Pointing at an item
  lights it up in the row and the pane.
- `color` can be any CSS colour (`'hotpink'`, `'#0f0'`); one that isn't gets a grey creature and a red «?».
- Each run starts from the items as they are shown, and what the code leaves becomes the new state, so running a
  reversal twice gives the first order back. «Nullstill» goes back to the set this visit started with; «Nye» makes a
  new one. A run that is stopped (or hits the time limit) leaves the items as they were.

## How code runs

`src/run/worker.js` is imported as text and started as a Web Worker from a `data:` URL, a fresh one per run:

- Off the main thread, so a loop that never ends can't freeze the page. «Stopp» ends a run, and so does a 10-second limit.
- On an opaque origin: the code can't read the site's storage, and its requests carry none of the visitor's
  `*.phareim.no` cookies.
- The code is the body of an async function in strict mode, so `await` works at the top level.
- A run ends when the code has returned and no `setTimeout`/`setInterval` is left. An uncaught error ends it too.
- The items go in and out as data: each property is another item by slot, a value that survives a structured clone,
  or, for a function or a symbol, only its text. The worker sends them back before it reports the end of the run,
  also after a runtime error (whatever the code changed before it failed).
- Error lines come from the engine: Chrome names the code `kata.js` in the stack, WebKit sets `error.line`.
  The worker measures the engine's line offset once with a probe. Chrome reports a SyntaxError without a line,
  so the page takes the line where CodeMirror's parser fails. Firefox is untested; the worker reads its
  `lineNumber` too.

## Files

- `src/main.ts`: the page: buttons, status, console output, saving, the items' state.
- `src/editor/editor.ts`: the CodeMirror setup, key bindings and the error-line mark.
- `src/editor/completion.ts`: the completion sources.
- `src/editor/theme.ts`: editor colours and syntax highlighting from the Neon Coast palette.
- `src/run/runner.ts`: starts, stops and times out the worker.
- `src/run/worker.js`: the worker: console capture, value formatting, timers, error lines, the items in and out.
- `src/world/world.ts`: the items' data, the palette, letters, random sets, and walking the list.
- `src/world/row.ts`, `src/world/blob.ts`: the row and its creatures.
- `src/world/objects.ts`: the objects pane.
- `src/starter.ts`: the code a first visit opens with (and the earlier starters it replaces).
- `public/fonts/neon-pixel.woff`: Neon Shrine's 5×7 pixel font, drawn for phareim.no.
- `scripts/smoke.mjs`: browser check in Chrome and WebKit, with screenshots.

## Develop

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # value formatting, error lines (V8), completions, the items' round trip
npm run build      # typecheck + dist/
npm run preview    # serve dist/ on 4173
PLAYWRIGHT=/path/to/playwright-core/index.mjs CHROME_BIN=/path/to/chrome node scripts/smoke.mjs http://127.0.0.1:4173/
```

## Deploy

`dist/` is served as static assets by the Cloudflare Worker `code-kata` (`wrangler.jsonc`), with the custom domain
kata.phareim.no. A push to `main` builds, tests and deploys it from Petter's server; there is no GitHub Actions
workflow. By hand: `npm run build && npx wrangler deploy`.
