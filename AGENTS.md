# Kodekata: notes for agents

JavaScript tasks with pixel creatures at kata.phareim.no. Read `README.md` first; it describes the tasks, the stage,
how code runs and where things live.

- UI text and task texts are Norwegian bokmål, natural and in our own words (never copied from LeetCode, Codewars or
  the like; `source` links where an idea came from). Code, comments and docs are English.
- The look is Neon Coast (phareim.no's pixel look). Palette colours only (`src/editor/theme.ts` `PAL`, `src/style.css`
  `:root`). Cyan is you (cursor, focus, the editor's edge), pink the call to action («Kjør») and the task card, gold a
  hint, a warning and the stage, violet the console, teal the objects pane, red an error, lime solved. Levels: lett
  lime, middels gold, vanskelig pink.
- **Task ids are forever**: progress in visitors' browsers is stored by id. Retire a task with `hidden: true`; never
  rename or reuse an id.
- **A check is an arrow function that uses only `t` and JavaScript's globals.** It is sent to the worker as
  `String(check)`, so a helper from the module it sits in is undefined there. `npm test` catches that in Node; the
  minified build is only covered by `scripts/smoke-tasks.mjs`, so run it after adding or changing tasks.
- Every task has a solution that passes and a starter that doesn't (`test/tasks.test.ts`, three seeds). A world must
  look the same for the same seed. A check message says what is wrong in a sentence, naming items by letter
  (`t.show`). Don't let a check loop on data the code controls without a bound (the code can change anything).
- A root may not share a name with `t`'s own fields (`out`, `slots`, `start`, `fn` …): the check would read `t`'s.
  A plain object held by a root becomes an item on the stage; give it `color`/`shape` or prefer a Ting.
- After adding or renaming tasks: `UPDATE_DOCS=1 npx vitest run test/docs.test.ts` regenerates the table in
  `docs/tasks.md` (`npm test` fails until it matches).
- Items are memory slots, not variables: slot order is kept by both sides, new items are appended, and `label()`
  exists twice (`src/world/world.ts`, `src/run/worker.js`) and must agree (a test checks). The format is described at
  the top of the world section in `worker.js`; a change there goes in `world.ts` and `test/world.test.ts` too.
- The page never mutates a `World`: every run returns a new one. `version` in `main.ts` drops a run's result when
  a later run, «Nye», «Nullstill» or another task came in between.
- The playground keeps eight items (`ITEM_COUNT`), Petter's call (2026-10-22: "gjør det enklere"), and its storage
  keys from before the tasks (`code-kata:code`, `code-kata:ting`). Nothing may be saved before the first route
  (`mode` is null until then), or the empty editors overwrite the playground.
- The Ting class and the code compile as one source (`worker.js`: class, `__kata_build__`, code, exports); `place()`
  maps a line back to its editor. Keep that order, or `Ting` in the code stops being the items' class.
- The pixel font is for the chrome only, at whole multiples of 8 px, uppercase through `.px`. Code, console output and
  task text stay in JetBrains Mono with ligatures off. Code is 16 px on touch screens, or iOS zooms in on focus.
- `src/run/worker.js` is imported with `?raw` and started from a `data:` URL: it must stay one self-contained plain
  JavaScript file. The opaque origin is the point; don't move it to a same-origin worker (`new URL(...)`, a blob URL).
- The worker's globals and the completion scope (`GLOBALS`, `CONSOLE` in `src/editor/completion.ts`, `vis` and the
  roots in `worldSource`) should match: a new console method or global goes in both.
- Before pushing: `npm test` and `npm run build`. After a change to the runner, the editor, the stage or the layout,
  also run `scripts/smoke.mjs` (the playground) and `scripts/smoke-tasks.mjs` (every task solved in Chrome and
  WebKit) against the built site, and look at the screenshots in `shots/`.
- A new playground starter goes in `src/starter.ts` with the old one moved to `OLD_STARTERS`, byte for byte as it
  shipped, so visitors who never edited it get the new one.
- A push to `main` deploys.
