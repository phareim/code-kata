/*
 * The success effect: square pixel confetti from the stage in the palette's colours, falling over the page, and a
 * «LØST!» stamp. Nothing moves when the visitor prefers reduced motion; the stamp still shows, briefly.
 */
const COLORS = ['#ff2fa0', '#2ff3ff', '#ffd23f', '#b6ff4a', '#9a4ff0', '#ff8a3d', '#3fd8b0', '#fff4ff']

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Bit {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  spin: number
}

let frame = 0

/** Bursts confetti from a rect (the stage); `big` for a first solve. */
export function confetti(canvas: HTMLCanvasElement, from: DOMRect, big: boolean): void {
  if (reducedMotion()) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const ratio = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(window.innerWidth * ratio)
  canvas.height = Math.round(window.innerHeight * ratio)
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  canvas.hidden = false

  const bits: Bit[] = []
  const count = big ? 160 : 60
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
    const speed = 5 + Math.random() * (big ? 9 : 6)
    bits.push({
      x: from.left + from.width * (0.2 + Math.random() * 0.6),
      y: from.top + from.height * 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 * (1 + Math.floor(Math.random() * 3)),
      color: COLORS[i % COLORS.length],
      spin: Math.random() * 6,
    })
  }
  cancelAnimationFrame(frame)
  const started = performance.now()
  const tick = (now: number) => {
    const t = now - started
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const b of bits) {
      b.vy += 0.32
      b.vx *= 0.99
      b.x += b.vx
      b.y += b.vy
      // Pixel confetti flickers between full and edge-on as it tumbles.
      const w = Math.abs(Math.cos(b.spin + t / 140)) > 0.4 ? b.size : b.size / 2
      ctx.fillStyle = b.color
      ctx.fillRect(Math.round(b.x), Math.round(b.y), w, b.size)
    }
    if (t < 2600) frame = requestAnimationFrame(tick)
    else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      canvas.hidden = true
    }
  }
  frame = requestAnimationFrame(tick)
}

let stamping: Animation | null = null

/** The «LØST!» stamp over a rect: slams in, holds, fades. A new one cuts the last one short. */
export function stamp(el: HTMLElement, over: DOMRect): void {
  stamping?.cancel()
  el.style.left = `${over.left + over.width / 2}px`
  el.style.top = `${over.top + over.height / 2}px`
  el.hidden = false
  const motion = !reducedMotion()
  const animation = el.animate(
    motion
      ? [
        { transform: 'translate(-50%, -50%) scale(3) rotate(-14deg)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(0.9) rotate(-8deg)', opacity: 1, offset: 0.18 },
        { transform: 'translate(-50%, -50%) scale(1) rotate(-8deg)', opacity: 1, offset: 0.75 },
        { transform: 'translate(-50%, -60%) scale(1) rotate(-8deg)', opacity: 0 },
      ]
      : [{ opacity: 1, transform: 'translate(-50%, -50%) rotate(-8deg)' }, { opacity: 0, transform: 'translate(-50%, -50%) rotate(-8deg)' }],
    { duration: motion ? 1800 : 1200, easing: 'ease-out' },
  )
  stamping = animation
  animation.onfinish = () => {
    if (stamping !== animation) return
    stamping = null
    el.hidden = true
  }
}
