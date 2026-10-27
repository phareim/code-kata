// The way back to the town on phareim.no. Its KODING KATA stand opens this page with `?from=phareim`, and such a visit
// gets «Til byen» in the header; the town then stands the visitor at the stand again. Kept for the tab in
// sessionStorage, so a reload or a task link still shows it.
//
// The town can also show a game inside its installed app (phareim.no's docs/games/frame.md). It does not frame kata
// today, but this already speaks the frame's messages: hello at boot, the screen's safe edges back, ready once
// «Til byen» is on screen, and home on a press.
const TOWN = 'https://phareim.no'
const KEY = 'code-kata:from'

let fromTown = false
const framed = (() => { try { return window.parent !== window } catch { return true } })()

/** Call once at boot. */
export function joinTown(): void {
  const q = new URLSearchParams(location.search)
  try {
    if (q.get('from') === 'phareim') sessionStorage.setItem(KEY, 'phareim')
    fromTown = sessionStorage.getItem(KEY) === 'phareim' || q.get('from') === 'phareim'
  } catch { fromTown = q.get('from') === 'phareim' }
  if (!framed || !fromTown) return
  window.addEventListener('message', (e) => {
    if (e.origin !== TOWN || e.source !== window.parent) return
    const d = e.data as { type?: string; insets?: { top: number; right: number; bottom: number; left: number } }
    if (d?.type !== 'phareim:frame' || !d.insets) return
    const s = document.documentElement.style
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      s.setProperty(`--frame-${side}`, `${Math.max(0, Number(d.insets[side]) || 0)}px`)
    }
  })
  window.parent.postMessage({ type: 'phareim:hello' }, TOWN)
}

/** The visit came from the town: show «Til byen». */
export function cameFromTown(): boolean { return fromTown }

/** «Til byen» is on screen: the frame's own house can go. */
export function townReady(): void {
  if (framed && fromTown) window.parent.postMessage({ type: 'phareim:ready' }, TOWN)
}

/** Inside the town's frame, ask it to go home and return true; otherwise the link's own address does it. */
export function leaveThroughFrame(): boolean {
  if (!framed || !fromTown) return false
  window.parent.postMessage({ type: 'phareim:home' }, TOWN)
  return true
}

/** The town's front page, for the link. */
export const TOWN_URL = `${TOWN}/`
