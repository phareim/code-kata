# Kodekata

A small place for JavaScript katas: write a few lines, run them in the browser, read the console.
Neon Coast's pixel look from phareim.no (the night palette, Neon Shrine's 5×7 font, notched boxes).

Live: https://kata.phareim.no (public, no login; verified in Chrome and WebKit 2026-10-22).

## What it does

- **Editor**: CodeMirror 6 with JavaScript highlighting, bracket matching, search and undo.
- **Autocomplete** as you type, Tab or Enter to accept:
  - names the code declares and can see from the cursor: variables, functions, parameters, classes
  - keywords and snippets (`for`, `if`, `function`, `log` → `console.log()`, `=>`)
  - the globals the runner has (`Math`, `JSON`, `Map`, `setTimeout` …) and their members after a dot (`Math.floor`, `console.table`)
  - after a dot on anything else: common array, string, number, promise and map/set members, plus the property names the code already uses
- **Run** with «Kjør» or Cmd/Ctrl + Enter. Output is printed the way Node prints it (`{ a: 1 }`, `[ 1, 'x' ]`, `Map(1) { 'a' => 1 }`).
  An uncaught error shows its line and marks it in the editor.
- The code is saved in the browser's localStorage as you type.

## How code runs

`src/run/worker.js` is imported as text and started as a Web Worker from a `data:` URL, a fresh one per run:

- Off the main thread, so a loop that never ends can't freeze the page. «Stopp» ends a run, and so does a 10-second limit.
- On an opaque origin: the code can't read the site's storage, and its requests carry none of the visitor's
  `*.phareim.no` cookies.
- The code is the body of an async function in strict mode, so `await` works at the top level.
- A run ends when the code has returned and no `setTimeout`/`setInterval` is left. An uncaught error ends it too.
- Error lines come from the engine: Chrome names the code `kata.js` in the stack, WebKit sets `error.line`.
  The worker measures the engine's line offset once with a probe. Chrome reports a SyntaxError without a line,
  so the page takes the line where CodeMirror's parser fails. Firefox is untested; the worker reads its
  `lineNumber` too.

## Files

- `src/main.ts`: the page: buttons, status, console output, saving.
- `src/editor/editor.ts`: the CodeMirror setup, key bindings and the error-line mark.
- `src/editor/completion.ts`: the completion sources.
- `src/editor/theme.ts`: editor colours and syntax highlighting from the Neon Coast palette.
- `src/run/runner.ts`: starts, stops and times out the worker.
- `src/run/worker.js`: the worker: console capture, value formatting, timers, error lines.
- `src/starter.ts`: the code a first visit opens with.
- `public/fonts/neon-pixel.woff`: Neon Shrine's 5×7 pixel font, drawn for phareim.no.
- `scripts/smoke.mjs`: browser check in Chrome and WebKit, with screenshots.

## Develop

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # value formatting, error lines (V8), completions
npm run build      # typecheck + dist/
npm run preview    # serve dist/ on 4173
PLAYWRIGHT=/path/to/playwright-core/index.mjs CHROME_BIN=/path/to/chrome node scripts/smoke.mjs http://127.0.0.1:4173/
```

## Deploy

`dist/` is served as static assets by the Cloudflare Worker `code-kata` (`wrangler.jsonc`), with the custom domain
kata.phareim.no. A push to `main` builds, tests and deploys it from Petter's server; there is no GitHub Actions
workflow. By hand: `npm run build && npx wrangler deploy`.
