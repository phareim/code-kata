# The task bank

What is in the bank, where the ideas came from, and how a task is put together. `README.md` «Writing a task» has the
format; this file is the overview. The table at the bottom is generated from `src/tasks/` (see below).

## How the bank was made (2026-10-22)

The bank started from a research pass over the sources below. It produced a menu of 180 candidate exercises, each
adapted to the creatures: what they start as, and what the code must leave or return. From that menu we picked tasks
that fit a view the stage can draw (list, array, stack, queue, pegs, tree, graph, grid) and that a check can verify
without guessing at the visitor's intent. Every task statement is written in our own Norwegian; a `source` on a
task links where an idea came from when it has a clear origin.

The levels:
- **lett**: a loop or two, one idea.
- **middels**: a known technique (two pointers, a stack, BFS, recursion on a tree).
- **vanskelig**: several steps, or a trick that has to be found (Floyd's loop start, Hanoi, heap sort, Lights Out).

A task that is about a technique tests the technique, not only the result:
- a sort gets a `swap(i, j)` or `flip(k)` from the check, which counts and validates the moves
- arrays whose `sort` throws keep a built-in from doing the work
- binary search counts the places it looks at
- a shuffle is run thousands of times and the orders are counted

## Sources consulted

Fetched 2026-10-22. They are for ideas only; no statement was copied.

- **Sorting:**
  - Rosetta Code, [Sorting algorithms](https://rosettacode.org/wiki/Category:Sorting_Algorithms) (bead, strand,
    patience, circle and sleep sort pages)
  - Wikipedia on [sorting algorithms](https://en.wikipedia.org/wiki/Sorting_algorithm),
    [sorting networks](https://en.wikipedia.org/wiki/Sorting_network), [gnome sort](https://en.wikipedia.org/wiki/Gnome_sort),
    [cycle sort](https://en.wikipedia.org/wiki/Cycle_sort), [pancake sorting](https://en.wikipedia.org/wiki/Pancake_sorting)
    and the [Dutch national flag](https://en.wikipedia.org/wiki/Dutch_national_flag_problem)
  - Sedgewick and Wayne, [Algorithms 2.0 Sorting](https://algs4.cs.princeton.edu/20sorting/)
- **Lists, stacks and queues:**
  - Wikipedia on [cycle detection](https://en.wikipedia.org/wiki/Cycle_detection), the
    [Tower of Hanoi](https://en.wikipedia.org/wiki/Tower_of_Hanoi) and the
    [Josephus problem](https://en.wikipedia.org/wiki/Josephus_problem)
  - Sedgewick and Wayne, [1.3 Stacks and queues](https://algs4.cs.princeton.edu/13stacks/)
  - GeeksforGeeks' lists for [linked lists](https://www.geeksforgeeks.org/dsa/top-50-linked-list-interview-question/)
    and [stacks](https://www.geeksforgeeks.org/dsa/stack-data-structure/)
  - Codewars' [linked-list kata](https://www.codewars.com/kata/search/javascript?q=&tags=Linked+Lists)
- **Trees and graphs:**
  - Wikipedia on [tree traversal](https://en.wikipedia.org/wiki/Tree_traversal),
    [binary search trees](https://en.wikipedia.org/wiki/Binary_search_tree),
    [breadth-first search](https://en.wikipedia.org/wiki/Breadth-first_search),
    [topological sorting](https://en.wikipedia.org/wiki/Topological_sorting) and
    [graph colouring](https://en.wikipedia.org/wiki/Graph_coloring)
  - GeeksforGeeks on [binary trees](https://www.geeksforgeeks.org/dsa/binary-tree-data-structure/) and
    [graphs](https://www.geeksforgeeks.org/dsa/graph-data-structure-and-algorithms/)
  - CS50's [Tideman](https://cs50.harvard.edu/x/2024/psets/3/tideman/)
- **Grids:**
  - Wikipedia on [flood fill](https://en.wikipedia.org/wiki/Flood_fill),
    [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life),
    [Langton's ant](https://en.wikipedia.org/wiki/Langton%27s_ant),
    [Lights Out](https://en.wikipedia.org/wiki/Lights_Out_(game)) and
    [maze generation](https://en.wikipedia.org/wiki/Maze_generation_algorithm)
  - GeeksforGeeks on [matrices](https://www.geeksforgeeks.org/dsa/matrix/)
  - Advent of Code ([2021 day 9](https://adventofcode.com/2021/day/9), [2021 day 11](https://adventofcode.com/2021/day/11),
    [2022 day 12](https://adventofcode.com/2022/day/12))
- **Classics and objects:**
  - Wikipedia on [Kadane's problem](https://en.wikipedia.org/wiki/Maximum_subarray_problem),
    [Boyer–Moore majority vote](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_majority_vote_algorithm),
    [Fisher–Yates](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle),
    [reservoir sampling](https://en.wikipedia.org/wiki/Reservoir_sampling) and
    [binary search](https://en.wikipedia.org/wiki/Binary_search)
  - GeeksforGeeks' [array problems](https://www.geeksforgeeks.org/dsa/top-50-array-coding-problems-for-interviews/)
  - NeetCode's [problem list](https://github.com/neetcode-gh/leetcode)
  - Exercism's [JavaScript track](https://github.com/exercism/javascript/tree/main/exercises/practice)
  - MDN on [classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
  - javascript.info on [array methods](https://javascript.info/array-methods)
- **Visuals:**
  - [VisuAlgo](https://visualgo.net/en): marking the items compared, a playback speed, captions per step
  - [CS Unplugged](https://www.csunplugged.org/en/topics/sorting-networks/)

LeetCode, Project Euler, neetcode.io, exercism.org and Bebras gave nothing usable to the fetcher (blocked or empty
pages); LeetCode links in `source` fields point at the problem a task resembles.

## Keeping the table current

`npm test` compares the table below with `src/tasks/`, and fails when a task is added, renamed or moved without it.
`UPDATE_DOCS=1 npx vitest run test/docs.test.ts` rewrites it.

<!-- tasks:start -->
54 tasks: 21 lett, 26 middels, 7 vanskelig.

### Lister (20)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 1 | `tell-tingene` | Tell tingene | lett |  |
| 2 | `snu-lista` | Snu lista | middels | [link](https://leetcode.com/problems/reverse-linked-list/) |
| 3 | `storst-forst` | Den største først | lett |  |
| 4 | `ut-med-de-rosa` | Ut med de rosa | middels | [link](https://leetcode.com/problems/remove-linked-list-elements/) |
| 5 | `legg-sammen` | Legg sammen | lett |  |
| 6 | `fra-liste-til-array` | Fra liste til array | lett |  |
| 7 | `ting-nummer-n` | Ting nummer n | lett |  |
| 8 | `g-vil-sta-forst` | G vil stå først | lett |  |
| 9 | `forst-blir-sist` | Den første blir sist | lett |  |
| 10 | `skilpadda-og-haren` | Skilpadda og haren | middels | [link](https://en.wikipedia.org/wiki/Cycle_detection#Floyd's_tortoise_and_hare) |
| 11 | `k-fra-slutten` | K fra slutten | middels |  |
| 12 | `naboer-bytter-plass` | Naboer bytter plass | middels | [link](https://leetcode.com/problems/swap-nodes-in-pairs/) |
| 13 | `flett-to-lister` | Flett to lister | middels | [link](https://en.wikipedia.org/wiki/Merge_algorithm) |
| 14 | `gar-lista-i-ring` | Går lista i ring? | middels | [link](https://en.wikipedia.org/wiki/Cycle_detection) |
| 15 | `der-ringen-begynner` | Der ringen begynner | vanskelig | [link](https://en.wikipedia.org/wiki/Cycle_detection) |
| 16 | `snu-tre-og-tre` | Snu tre og tre | vanskelig | [link](https://leetcode.com/problems/reverse-nodes-in-k-group/) |
| 17 | `der-listene-mots` | Der to lister møtes | vanskelig | [link](https://leetcode.com/problems/intersection-of-two-linked-lists/) |
| 18 | `sma-forst-i-lista` | Små først i lista | middels | [link](https://leetcode.com/problems/partition-list/) |
| 19 | `pekere-begge-veier` | Pekere begge veier | lett |  |
| 20 | `snu-dobbel-liste` | Snu en liste med to veier | middels |  |

### Sortering (2)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 21 | `bytt-de-ytterste` | Bytt de ytterste | lett |  |
| 22 | `boblesortering` | Boblesortering | middels | [link](https://en.wikipedia.org/wiki/Bubble_sort) |

### Rydding og flytting (1)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 23 | `rosa-sammen` | De rosa vil stå sammen | middels |  |

### Stabler og køer (2)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 24 | `snu-koen` | Snu køen med en stabel | lett |  |
| 25 | `hanois-tarn` | Hanois tårn | vanskelig | [link](https://en.wikipedia.org/wiki/Tower_of_Hanoi) |

### Trær (2)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 26 | `hvor-hoyt` | Hvor høyt er treet? | middels |  |
| 27 | `speil-treet` | Speil treet | middels | [link](https://leetcode.com/problems/invert-binary-tree/) |

### Grafer (1)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 28 | `steg-fra-a` | Hvor mange steg unna? | middels | [link](https://en.wikipedia.org/wiki/Breadth-first_search) |

### Rutenett (1)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 29 | `malingsbotta` | Malingsbøtta | middels | [link](https://en.wikipedia.org/wiki/Flood_fill) |

### Objekter og klassen (12)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 30 | `si-hvem-du-er` | Si hvem du er | lett |  |
| 31 | `er-den-stor` | Er den stor? | lett |  |
| 32 | `mellom-1-og-99` | Mellom 1 og 99 | middels |  |
| 33 | `ting-compare` | Ting.compare | lett |  |
| 34 | `katter-og-spokelser` | Katter og spøkelser | middels |  |
| 35 | `roboten-teller` | Roboten teller i det skjulte | middels |  |
| 36 | `tekst-og-tall` | Tekst og tall | middels |  |
| 37 | `fargetelling` | Fargetelling | lett |  |
| 38 | `hvor-mange-farger` | Hvor mange farger? | lett |  |
| 39 | `grupper-etter-farge` | Grupper etter farge | middels |  |
| 40 | `en-liste-du-kan-ga-gjennom` | En liste du kan gå gjennom | middels |  |
| 41 | `husk-de-tre-siste` | Husk de tre siste | vanskelig | [link](https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU) |

### Klassikere (13)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 42 | `binaersok` | Binærsøk | middels | [link](https://en.wikipedia.org/wiki/Binary_search) |
| 43 | `to-som-blir-malet` | To som blir målet | lett | [link](https://leetcode.com/problems/two-sum/) |
| 44 | `kjop-lavt-selg-hoyt` | Kjøp lavt, selg høyt | lett | [link](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) |
| 45 | `den-som-mangler` | Den som mangler | lett |  |
| 46 | `balansepunktet` | Balansepunktet | lett | [link](https://leetcode.com/problems/find-pivot-index/) |
| 47 | `tre-pa-rad` | Tre på rad | lett |  |
| 48 | `fizzbuzz-i-farger` | FizzBuzz i farger | lett | [link](https://en.wikipedia.org/wiki/Fizz_buzz) |
| 49 | `josefus-ringen` | Josefus-ringen | middels | [link](https://en.wikipedia.org/wiki/Josephus_problem) |
| 50 | `flertallet` | Flertallet | middels | [link](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_majority_vote_algorithm) |
| 51 | `den-gladeste-strekningen` | Den gladeste strekningen | middels | [link](https://en.wikipedia.org/wiki/Maximum_subarray_problem) |
| 52 | `rettferdig-stokking` | Rettferdig stokking | middels | [link](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle) |
| 53 | `regnvann` | Regnvann | vanskelig | [link](https://leetcode.com/problems/trapping-rain-water/) |
| 54 | `en-fra-strommen` | Én fra strømmen | vanskelig | [link](https://en.wikipedia.org/wiki/Reservoir_sampling) |

<!-- tasks:end -->
