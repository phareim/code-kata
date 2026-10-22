# Kodekata: notes for agents

A JavaScript kata playground at kata.phareim.no. Read `README.md` first; it describes how code runs and where things live.

- UI text is Norwegian bokmål; code, comments and docs are English.
- The look is Neon Coast (phareim.no's pixel look). Palette colours only (`src/editor/theme.ts` `PAL`, `src/style.css` `:root`).
  Cyan is you (cursor, focus, the editor's edge), pink the call to action («Kjør»), violet the console, teal the objects
  pane, gold a warning, red an error, lime a finished run.
- The items (README «The items») are a linked list the code changes. Letters are memory slots, not variables: slot
  order is kept by both sides, new items are appended, and `label()` exists twice (`src/world/world.ts`,
  `src/run/worker.js`) and must agree (a test checks). The format is described at the top of the world section in
  `worker.js`; a change there goes in `world.ts` and `test/world.test.ts` too.
- The page never mutates a `World`: every run returns a new one. `version` in `main.ts` drops a run's result when
  a later run, «Nye» or «Nullstill» came in between.
- A set always has eight items (`ITEM_COUNT`), Petter's call (2026-10-22: "gjør det enklere").
- The Ting class and the code compile as one source (`worker.js`: class, `__kata_build__`, code); `place()` maps a
  line back to its editor. Keep that order, or `Ting` in the code stops being the items' class.
- The pixel font is for the chrome only, at whole multiples of 8 px, uppercase through `.px`. Code and console output
  stay in JetBrains Mono with ligatures off. Code is 16 px on touch screens, or iOS zooms in on focus.
- `src/run/worker.js` is imported with `?raw` and started from a `data:` URL: it must stay one self-contained plain
  JavaScript file. The opaque origin is the point; don't move it to a same-origin worker (`new URL(...)`, a blob URL).
- The worker's globals and the completion scope (`GLOBALS`, `CONSOLE` in `src/editor/completion.ts`) should match:
  a new console method or global goes in both.
- Before pushing: `npm test` and `npm run build`. After a change to the runner, the editor, the items or the layout,
  also run `scripts/smoke.mjs` against `npm run preview` and look at the screenshots in `shots/` (desktop, phone, and
  `*-shapes.png` for loose items, a loop and a CSS colour).
- A new starter goes in `src/starter.ts` with the old one moved to `OLD_STARTERS`, byte for byte as it shipped, so
  visitors who never edited it get the new one.
- A push to `main` deploys.
