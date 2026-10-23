# Kodekata: notes for agents

JavaScript tasks with pixel monsters at kata.phareim.no. Read `README.md` first; it describes the tasks, the stage,
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
- Every task has a solution that passes, and an opening and a scaffold that don't (`test/tasks.test.ts`, three
  seeds). A world must look the same for the same seed, with the same roots.
- A task opens without a skeleton (Petter, 2026-10-23: the starters gave too much and steered the answer): a comment
  naming the roots, plus the code that runs the exports on the stage (`src/tasks/opening.ts`). The skeleton is the
  task's `scaffold`, behind a button in hint 1. Write the scaffold's exports at column 0 with the closing `}` at
  column 0 and the code that calls them after; set `opening` when the rest of the scaffold is part of the answer. A check message says what is wrong in a sentence, naming items by letter
  (`t.show`). Don't let a check loop on data the code controls without a bound (the code can change anything).
- A root may not share a name with `t`'s own fields (`out`, `slots`, `start`, `fn` …): the check would read `t`'s.
  A plain object held by a root becomes an item on the stage; give it `color`/`shape` or prefer a Monster.
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
- The Monster class and the code compile as one source (`worker.js`: class, `__kata_build__`, code, exports); `place()`
  maps a line back to its editor. Keep that order, or `Monster` in the code stops being the items' class.
- The creatures are «monstre» (Petter, 2026-10-23; «ting» before). «Monster» is neuter: et monster, monsteret,
  monstre, monstrene, so «det første», «hvert monster», «ett av dem», «et stort monster». Saved code and classes still
  say `Ting`: the worker builds from whichever the class editor declares (Monster first) and gives the other name to
  the same class (`classNames()` in `worker.js`; `test/engine.test.ts` and every task's solution with a `class Ting`
  check it). The `ting` storage key and progress field are data and keep their names.
- A blob's look (`blobLook` in `src/stage/creatures.ts`) is the stage's: from its letter and value when first drawn,
  never written to the item. A task's `shape` wins; checks read only `shape` and `color`.
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
- Progress lives in localStorage and, for a visitor signed in at auth.phareim.no, on their account (`worker/index.ts`,
  one SQLite Durable Object per account; README → Progress on the account). A new `TaskState` field goes in
  `src/app/merge.ts` too (`mergeTask`, `sameTask`, `cleanTask`), or the Worker drops it. The Worker reads Reader's
  `reader-service` D1 and never writes to it; writes must come from the site's own origin, which the opaque-origin
  runner never is.
- A push to `main` deploys.
