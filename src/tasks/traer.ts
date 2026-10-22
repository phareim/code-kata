import { bstWorld, things, treeWorld } from './build'
import { TREE_TING } from './classes'
import type { Task } from './types'

export const tasks: Task[] = [
  {
    id: 'hvor-hoyt',
    title: 'Hvor høyt er treet?',
    level: 'middels',
    topic: 'trær',
    text: `Tingene står i et tre som starter i \`root\`. Hver ting har \`left\` og \`right\`, som peker på en ny ting eller er \`null\`.

Skriv \`function height(node)\` som gir tilbake hvor mange nivåer treet under \`node\` har. Et tomt tre (\`null\`) har høyde 0, og en ting uten barn har høyde 1.`,
    hints: [
      'Et tre er en ting med to mindre trær under seg. Spør dem!',
      'Høyden er 1 pluss den høyeste av `height(node.left)` og `height(node.right)`.',
      'Husk stoppen først: `if (!node) return 0`.',
    ],
    world: (r) => treeWorld(r, things(r, 9)),
    ting: TREE_TING,
    starter: `function height(node) {
  if (!node) return 0
  // Hvor høye er de to trærne under node?
  return 1
}

console.log(height(root))
`,
    solution: `function height(node) {
  if (!node) return 0
  return 1 + Math.max(height(node.left), height(node.right))
}

console.log(height(root))
`,
    exports: ['height'],
    check: (t) => {
      const height = t.fn('height')
      const cases: [unknown, number][] = [
        [null, 0],
        [5, 1],
        [[5, 3, null], 2],
        [[5, [3, 1, [4, null, 4.5]], 8], 4],
        [[1, null, [2, null, [3, null, [4, null, 5]]]], 5],
      ]
      for (const [spec, want] of cases) {
        const got = height(t.tree(spec))
        if (got !== want) return `height gav ${t.show(got)} for et tre som er ${want} høyt.`
      }
      return true
    },
  },
  {
    id: 'speil-treet',
    title: 'Speil treet',
    level: 'middels',
    topic: 'trær',
    text: `Treet vil se seg selv i speilet. Bytt \`left\` og \`right\` på hver eneste ting i treet, så det blir speilvendt.

\`root\` skal peke på den samme tingen som før.`,
    hints: [
      'Lag en funksjon `mirror(node)` som gjør jobben for ett tre, og kall den på `root`.',
      'For én ting: bytt `node.left` og `node.right`, og speil så begge barna.',
      'Stopp når `node` er `null`.',
    ],
    world: (r) => bstWorld(things(r, 9)),
    ting: TREE_TING,
    starter: `function mirror(node) {
  if (!node) return
  // Bytt left og right, og speil barna
}

mirror(root)
`,
    solution: `function mirror(node) {
  if (!node) return
  ;[node.left, node.right] = [node.right, node.left]
  mirror(node.left)
  mirror(node.right)
}

mirror(root)
`,
    check: (t) => {
      if (t.root !== t.live(t.start.root)) return '`root` skal fortsatt peke på den samme tingen.'
      const stack = [t.start.root]
      while (stack.length) {
        const copy = stack.pop()
        if (!copy) continue
        const node = t.live(copy)!
        if (node.left !== t.live(copy.right) || node.right !== t.live(copy.left)) {
          return `${t.show(node)} er ikke speilet: left skal være ${t.show(t.live(copy.right))} og right ${t.show(t.live(copy.left))}.`
        }
        stack.push(copy.left, copy.right)
      }
      return true
    },
    source: 'https://leetcode.com/problems/invert-binary-tree/',
  },
]
