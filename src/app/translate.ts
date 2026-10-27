/*
 * The page's side of a translation (worker/translate.ts): the code and the class in another language, or why not.
 * The page sends the task's id, the two languages, the code and the class; what the code fits into comes from the
 * bank in the Worker.
 */
import type { Lang } from '../tasks/lang'

export type Translation =
  | { ok: true; code: string; ting: string }
  | { ok: false; reason: 'off' | 'limit' | 'long' | 'failed' }

export async function translateCode(task: string, from: Lang, to: Lang, code: string, ting: string): Promise<Translation> {
  let res: Response
  try {
    res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, from, to, code, ting }),
      credentials: 'same-origin',
    })
  } catch {
    return { ok: false, reason: 'off' }
  }
  if (res.status === 503 || res.status === 404 || res.status === 405) return { ok: false, reason: 'off' }
  if (res.status === 429) return { ok: false, reason: 'limit' }
  if (res.status === 413) return { ok: false, reason: 'long' }
  if (!res.ok || !(res.headers.get('Content-Type') ?? '').includes('application/json')) return { ok: false, reason: 'failed' }
  try {
    const data = await res.json() as { code?: unknown; ting?: unknown }
    if (typeof data.code !== 'string' || !data.code.trim()) return { ok: false, reason: 'failed' }
    return { ok: true, code: data.code, ting: typeof data.ting === 'string' ? data.ting : '' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

/** A short fingerprint of code and class, to know whether a translation was made from what is there now. */
export function fingerprint(code: string, ting: string): string {
  let h = 2166136261
  for (const c of `${code}\u0000${ting}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0).toString(36)
}
