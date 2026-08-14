/**
 * CHIRAL PULSE, browser half: the BB pod vital-signs monitor docked above
 * the message composer (`conversation.input.dock`).
 *
 * The plugin owns no state of its own beyond the component's local beat
 * engine: every figure arrives through the session standard kit
 * (useProjection over sessionStats / tokenUsage / contextPressure), and the
 * locale seat renders the dictionaries registered here. The stylesheet is
 * injected under one owned <style data-plugin> tag so the loader removes it
 * on unload/reload.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the input.dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { BBPod } from './BBPod.tsx'
import { en, NS, zh, type ChiralKey } from './locales.ts'
import { CHIRAL_CSS } from './style.ts'

export { BBPod } from './BBPod.tsx'
export type { BBPodProps } from './BBPod.tsx'
export type { ChiralKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The BB pod monitor's copy. */
    chiral: ChiralKey
  }
}

/** Required services: the slot registry and the locale service. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register dictionaries, inject the stylesheet, and dock
 * the monitor above the composer.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'chiral-pulse: dictionaries')

  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = '@dsh-plugins/chiral-pulse'
    tag.textContent = CHIRAL_CSS
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'chiral-pulse: styles')

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'chiral-pulse',
    order: 30,
    locale: NS,
  }, BBPod))
}
