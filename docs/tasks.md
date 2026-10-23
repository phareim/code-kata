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
131 tasks: 49 lett, 59 middels, 23 vanskelig.

### Lister (20)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 1 | `tell-tingene` | Tell monstrene | lett |  |
| 2 | `snu-lista` | Snu lista | middels | [link](https://leetcode.com/problems/reverse-linked-list/) |
| 3 | `storst-forst` | Det største først | lett |  |
| 4 | `ut-med-de-rosa` | Ut med de rosa | middels | [link](https://leetcode.com/problems/remove-linked-list-elements/) |
| 5 | `legg-sammen` | Legg sammen | lett |  |
| 6 | `fra-liste-til-array` | Fra liste til array | lett |  |
| 7 | `ting-nummer-n` | Monster nummer n | lett |  |
| 8 | `g-vil-sta-forst` | G vil stå først | lett |  |
| 9 | `forst-blir-sist` | Det første blir sist | lett |  |
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

### Sortering (17)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 21 | `bytt-de-ytterste` | Bytt de ytterste | lett |  |
| 22 | `boblesortering` | Boblesortering | middels | [link](https://en.wikipedia.org/wiki/Bubble_sort) |
| 23 | `minst-forst` | Fra minst til størst | lett |  |
| 24 | `synkende` | Størst først | lett |  |
| 25 | `er-raden-sortert` | Er raden sortert? | lett |  |
| 26 | `en-boblerunde` | Én runde med bobler | lett | [link](https://en.wikipedia.org/wiki/Bubble_sort) |
| 27 | `utvalgssortering` | Utvalgssortering | lett | [link](https://en.wikipedia.org/wiki/Selection_sort) |
| 28 | `innstikksortering` | Innstikksortering | lett | [link](https://en.wikipedia.org/wiki/Insertion_sort) |
| 29 | `nissesortering` | Nissen som sorterer | lett | [link](https://en.wikipedia.org/wiki/Gnome_sort) |
| 30 | `pannekaker` | Pannekakestabelen | middels | [link](https://en.wikipedia.org/wiki/Pancake_sorting) |
| 31 | `flettesortering` | Flettesortering | middels | [link](https://en.wikipedia.org/wiki/Merge_sort) |
| 32 | `quicksort` | Quicksort | middels | [link](https://en.wikipedia.org/wiki/Quicksort) |
| 33 | `tellesortering` | Tellesortering | middels | [link](https://en.wikipedia.org/wiki/Counting_sort) |
| 34 | `haugsortering` | Haugsortering | vanskelig | [link](https://en.wikipedia.org/wiki/Heapsort) |
| 35 | `sorteringsnettverk` | Sorteringsnettverket | middels | [link](https://en.wikipedia.org/wiki/Sorting_network) |
| 36 | `farge-for-farge` | Farge for farge | middels | [link](https://en.wikipedia.org/wiki/Sorting_algorithm#Stability) |
| 37 | `hvor-mange-ma-flytte` | Hvor mange må flytte? | vanskelig | [link](https://en.wikipedia.org/wiki/Longest_increasing_subsequence) |

### Rydding og flytting (12)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 38 | `rosa-sammen` | De rosa vil stå sammen | middels |  |
| 39 | `sma-til-venstre` | Små til venstre | lett | [link](https://en.wikipedia.org/wiki/Quicksort#Lomuto_partition_scheme) |
| 40 | `spokelsene-bakerst` | Spøkelsene bakerst | lett |  |
| 41 | `tett-hullene` | Tett hullene | lett |  |
| 42 | `snu-raden` | Snu raden på stedet | lett |  |
| 43 | `en-av-hver-farge` | Ett av hver farge | lett |  |
| 44 | `roter-raden` | Roter raden | middels |  |
| 45 | `tre-farger` | Tre farger på rad | middels | [link](https://en.wikipedia.org/wiki/Dutch_national_flag_problem) |
| 46 | `bolgen` | Bølgen | middels |  |
| 47 | `like-naboer` | Like naboer slår seg sammen | middels |  |
| 48 | `neste-ordning` | Neste ordning | vanskelig | [link](https://en.wikipedia.org/wiki/Permutation#Generation_in_lexicographic_order) |
| 49 | `faerrest-bytter` | Færrest mulig bytter | vanskelig |  |

### Stabler og køer (14)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 50 | `snu-koen` | Snu køen med en stabel | lett |  |
| 51 | `hanois-tarn` | Hanois tårn | vanskelig | [link](https://en.wikipedia.org/wiki/Tower_of_Hanoi) |
| 52 | `tre-pa-en-av` | Tre på, ett av | lett | [link](https://en.wikipedia.org/wiki/Stack_(abstract_data_type)) |
| 53 | `titt-pa-toppen` | Titt på toppen | lett |  |
| 54 | `spokelset-bakerst` | Spøkelset vil bakerst | lett |  |
| 55 | `runde-for-runde` | Runde for runde | middels | [link](https://en.wikipedia.org/wiki/Round-robin_scheduling) |
| 56 | `parentesene` | Går parentesene opp? | middels | [link](https://en.wikipedia.org/wiki/Bracket_matching) |
| 57 | `sorter-stabelen` | Sorter stabelen | middels |  |
| 58 | `minste-stabel` | Stabelen som vet minst | middels | [link](https://en.wikipedia.org/wiki/Stack_(abstract_data_type)) |
| 59 | `ko-av-to-stabler` | Kø av to stabler | vanskelig | [link](https://en.wikipedia.org/wiki/Queue_(abstract_data_type)#Queue_implementation) |
| 60 | `neste-storre` | Neste som er større | middels | [link](https://en.wikipedia.org/wiki/All_nearest_smaller_values) |
| 61 | `hanoi-for-hand` | Tre skiver for hånd | lett | [link](https://en.wikipedia.org/wiki/Tower_of_Hanoi) |
| 62 | `hvor-mange-flytt` | Hvor mange flytt? | lett | [link](https://en.wikipedia.org/wiki/Tower_of_Hanoi#Solution) |
| 63 | `bare-til-naboen` | Bare til naboen | vanskelig | [link](https://en.wikipedia.org/wiki/Tower_of_Hanoi#Variants) |

### Trær (17)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 64 | `hvor-hoyt` | Hvor høyt er treet? | middels |  |
| 65 | `speil-treet` | Speil treet | middels | [link](https://leetcode.com/problems/invert-binary-tree/) |
| 66 | `tell-og-legg-sammen` | Tell og legg sammen | lett |  |
| 67 | `gull-pa-bladene` | Gull på bladene | lett |  |
| 68 | `i-orden` | I orden | lett | [link](https://en.wikipedia.org/wiki/Tree_traversal#In-order,_LNR) |
| 69 | `for-og-etter` | Før og etter | middels | [link](https://en.wikipedia.org/wiki/Tree_traversal#Depth-first_search) |
| 70 | `niva-for-niva` | Nivå for nivå | middels | [link](https://en.wikipedia.org/wiki/Breadth-first_search) |
| 71 | `finn-i-soketreet` | Finn i søketreet | lett | [link](https://en.wikipedia.org/wiki/Binary_search_tree#Searching) |
| 72 | `minst-og-storst` | Minst og størst | lett | [link](https://en.wikipedia.org/wiki/Binary_search_tree) |
| 73 | `inn-i-soketreet` | Inn i søketreet | middels | [link](https://en.wikipedia.org/wiki/Binary_search_tree#Insertion) |
| 74 | `er-det-et-soketre` | Er det et søketre? | middels | [link](https://en.wikipedia.org/wiki/Binary_search_tree) |
| 75 | `felles-forfar` | Nærmeste felles forfar | middels | [link](https://en.wikipedia.org/wiki/Lowest_common_ancestor) |
| 76 | `lengste-sti` | Den lengste stien | vanskelig | [link](https://en.wikipedia.org/wiki/Distance_(graph_theory)) |
| 77 | `ut-av-soketreet` | Ut av søketreet | vanskelig | [link](https://en.wikipedia.org/wiki/Binary_search_tree#Deletion) |
| 78 | `balansert-tre` | Bygg et balansert tre | middels | [link](https://en.wikipedia.org/wiki/Binary_search_tree#Optimal_binary_search_trees) |
| 79 | `treet-fra-to-turer` | Treet fra to turer | vanskelig | [link](https://en.wikipedia.org/wiki/Tree_traversal) |
| 80 | `brann-i-treet` | Brann i treet | vanskelig |  |

### Grafer (12)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 81 | `steg-fra-a` | Hvor mange steg unna? | middels | [link](https://en.wikipedia.org/wiki/Breadth-first_search) |
| 82 | `den-mest-populaere` | Det mest populære | lett |  |
| 83 | `er-vi-venner` | Er vi venner? | lett |  |
| 84 | `bli-kjent` | Bli kjent | lett |  |
| 85 | `forlat-gjengen` | Forlat gjengen | lett |  |
| 86 | `dybden-forst` | Dybden først | middels | [link](https://en.wikipedia.org/wiki/Depth-first_search) |
| 87 | `korteste-vei` | Korteste vei | middels | [link](https://en.wikipedia.org/wiki/Breadth-first_search) |
| 88 | `hvor-mange-gjenger` | Hvor mange gjenger? | middels | [link](https://en.wikipedia.org/wiki/Component_(graph_theory)) |
| 89 | `to-lag` | To lag | middels | [link](https://en.wikipedia.org/wiki/Bipartite_graph) |
| 90 | `hva-forst` | Hva må gjøres først? | middels | [link](https://en.wikipedia.org/wiki/Topological_sorting) |
| 91 | `billigste-vei` | Billigste vei | vanskelig | [link](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) |
| 92 | `venter-i-ring` | Venter i ring? | vanskelig | [link](https://en.wikipedia.org/wiki/Cycle_(graph_theory)#Cycle_detection) |

### Rutenett (13)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 93 | `malingsbotta` | Malingsbøtta | middels | [link](https://en.wikipedia.org/wiki/Flood_fill) |
| 94 | `mal-rammen` | Mal rammen | lett |  |
| 95 | `speilvend-brettet` | Speilvend brettet | lett |  |
| 96 | `bytt-rader-og-kolonner` | Bytt rader og kolonner | middels |  |
| 97 | `kvart-omdreining` | En kvart omdreining | middels |  |
| 98 | `spiralen` | Spiralen | middels |  |
| 99 | `tell-oyene` | Tell øyene | middels | [link](https://en.wikipedia.org/wiki/Connected-component_labeling) |
| 100 | `ut-av-labyrinten` | Ut av labyrinten | middels | [link](https://en.wikipedia.org/wiki/Breadth-first_search) |
| 101 | `livets-spill` | Ett steg i Livet | middels | [link](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) |
| 102 | `minesveiper` | Minesveiper | middels | [link](https://en.wikipedia.org/wiki/Minesweeper_(video_game)) |
| 103 | `langtons-maur` | Langtons maur | vanskelig | [link](https://en.wikipedia.org/wiki/Langton%27s_ant) |
| 104 | `slukk-lysene` | Slukk lysene | vanskelig | [link](https://en.wikipedia.org/wiki/Lights_Out_(game)) |
| 105 | `lysglimt` | Lysglimt | vanskelig | [link](https://adventofcode.com/2021/day/11) |

### Objekter og klassen (12)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 106 | `si-hvem-du-er` | Si hvem du er | lett |  |
| 107 | `er-den-stor` | Er det stort? | lett |  |
| 108 | `mellom-1-og-99` | Mellom 1 og 99 | middels |  |
| 109 | `ting-compare` | Monster.compare | lett |  |
| 110 | `katter-og-spokelser` | Katter og spøkelser | middels |  |
| 111 | `roboten-teller` | Roboten teller i det skjulte | middels |  |
| 112 | `tekst-og-tall` | Tekst og tall | middels |  |
| 113 | `fargetelling` | Fargetelling | lett |  |
| 114 | `hvor-mange-farger` | Hvor mange farger? | lett |  |
| 115 | `grupper-etter-farge` | Grupper etter farge | middels |  |
| 116 | `en-liste-du-kan-ga-gjennom` | En liste du kan gå gjennom | middels |  |
| 117 | `husk-de-tre-siste` | Husk de tre siste | vanskelig | [link](https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU) |

### Klassikere (14)

| # | Id | Title | Level | Source |
|---|---|---|---|---|
| 118 | `binaersok` | Binærsøk | middels | [link](https://en.wikipedia.org/wiki/Binary_search) |
| 119 | `to-som-blir-malet` | To som blir målet | lett | [link](https://leetcode.com/problems/two-sum/) |
| 120 | `kjop-lavt-selg-hoyt` | Kjøp lavt, selg høyt | lett | [link](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) |
| 121 | `den-som-mangler` | Den som mangler | lett |  |
| 122 | `balansepunktet` | Balansepunktet | lett | [link](https://leetcode.com/problems/find-pivot-index/) |
| 123 | `tre-pa-rad` | Tre på rad | lett |  |
| 124 | `fizzbuzz-i-farger` | FizzBuzz i farger | lett | [link](https://en.wikipedia.org/wiki/Fizz_buzz) |
| 125 | `josefus-ringen` | Josefus-ringen | middels | [link](https://en.wikipedia.org/wiki/Josephus_problem) |
| 126 | `flertallet` | Flertallet | middels | [link](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_majority_vote_algorithm) |
| 127 | `den-gladeste-strekningen` | Den gladeste strekningen | middels | [link](https://en.wikipedia.org/wiki/Maximum_subarray_problem) |
| 128 | `rettferdig-stokking` | Rettferdig stokking | middels | [link](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle) |
| 129 | `regnvann` | Regnvann | vanskelig | [link](https://leetcode.com/problems/trapping-rain-water/) |
| 130 | `en-fra-strommen` | Én fra strømmen | vanskelig | [link](https://en.wikipedia.org/wiki/Reservoir_sampling) |
| 131 | `josefus-uten-a-telle` | Josefus uten å telle | vanskelig | [link](https://en.wikipedia.org/wiki/Josephus_problem#k=2) |

<!-- tasks:end -->
