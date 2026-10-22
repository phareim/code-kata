# Kodekata: notes for agents

A JavaScript kata playground at kata.phareim.no. Read `README.md` first; it describes how code runs and where things live.

- UI text is Norwegian bokmål; code, comments and docs are English.
- The look is Neon Coast (phareim.no's pixel look). Palette colours only (`src/editor/theme.ts` `PAL`, `src/style.css` `:root`).
  Cyan is you (cursor, focus, the editor's edge), pink the call to action («Kjør»), violet the console, gold a warning,
  red an error, lime a finished run.
- The pixel font is for the chrome only, at whole multiples of 8 px, uppercase through `.px`. Code and console output
  stay in JetBrains Mono with ligatures off. Code is 16 px on touch screens, or iOS zooms in on focus.
- `src/run/worker.js` is imported with `?raw` and started from a `data:` URL: it must stay one self-contained plain
  JavaScript file. The opaque origin is the point; don't move it to a same-origin worker (`new URL(...)`, a blob URL).
- The worker's globals and the completion scope (`GLOBALS`, `CONSOLE` in `src/editor/completion.ts`) should match:
  a new console method or global goes in both.
- Before pushing: `npm test` and `npm run build`. After a change to the runner, the editor or the layout, also run
  `scripts/smoke.mjs` against `npm run preview` and look at the screenshots in `shots/` (desktop and phone).
- A push to `main` deploys.
