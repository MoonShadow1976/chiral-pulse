/**
 * CHIRAL PULSE, browser half: the Death Stranding skin plus the BB
 * vital-signs strip above the composer.
 *
 * Two contributions:
 *  1. The global DS skin — a `--dsw-*` token remap (blue-black machine body,
 *     amber hairlines, sand-paper light variant), the DeepSeek whale mark's
 *     brand blues untouched, plus three pointer-transparent atmosphere
 *     overlays (CRT scanlines, chiral lattice, vignette).
 *  2. The heartbeat strip on `conversation.input.dock` — a 26px monitor
 *     paper feed whose scrolling ECG is the hero and whose BPM follows the
 *     session's live activity (model streaming, tools executing).
 *
 * The plugin owns no state of its own beyond the component's local beat
 * engine; every figure arrives through the session standard kit. All styles
 * ride one owned <style data-plugin> tag so the loader removes them on
 * unload/reload.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer.dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { HeartLine } from './HeartLine.tsx'
import { en, NS, zh, type ChiralKey } from './locales.ts'
import { CHIRAL_CSS } from './style.ts'

export { HeartLine } from './HeartLine.tsx'
export type { HeartLineProps } from './HeartLine.tsx'
export type { ChiralKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The BB monitor strip's copy. */
    chiral: ChiralKey
  }
}

/** Required services: the slot registry and the locale service. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register dictionaries, inject the DS sheet and the
 * atmosphere overlays, and dock the heartbeat strip under the composer.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'chiral-pulse: dictionaries')

  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'chiral-pulse'
    tag.textContent = CHIRAL_CSS
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'chiral-pulse: styles')

  // Atmosphere overlays: scanlines + chiral lattice + vignette, all
  // pointer-transparent, riding the top of the stacking order.
  ctx.effect(() => {
    const layers = [
      { className: 'cp-atmo cp-atmo-scanlines', label: 'scanlines' },
      { className: 'cp-atmo cp-atmo-lattice', label: 'lattice' },
      { className: 'cp-atmo cp-atmo-vignette', label: 'vignette' },
    ]
    const nodes = layers.map(({ className }) => {
      const el = document.createElement('div')
      el.className = className
      el.setAttribute('aria-hidden', 'true')
      document.body.appendChild(el)
      return el
    })
    return () => {
      for (const el of nodes) el.remove()
    }
  }, 'chiral-pulse: atmosphere')

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'chiral-pulse',
    // Above the composer card, under the goal strip: the pulse feed rides
    // with the input it monitors.
    order: 20,
    locale: NS,
  }, HeartLine))
}
