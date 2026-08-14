/**
 * CHIRAL PULSE — the Death Stranding sheet, two layers.
 *
 * LAYER 1 — the global skin. The whole app paints from `--dsw-*` variables
 * (ui-theme's design platform: alias tokens reference static tokens, so
 * remapping the palette re-skins every component without touching its
 * structure). This sheet FORCES the DS look under BOTH theme modes: a deep
 * blue-black machine body, cold blue-grey hairlines, amber reserved for
 * emphasis (the heartbeat waveform, hover blooms) — and the deepseek brand
 * blues are left untouched, so the whale mark stays DeepSeek blue.
 *
 * LAYER 2 — the atmosphere. A fixed full-viewport CRT scanline weave, a
 * faint chiral lattice, and a vignette, all pointer-transparent. Plus the
 * BB vital-signs strip that docks under the composer stats: a 26px monitor
 * paper feed whose scrolling ECG is the hero, with the BPM and status read.
 *
 * Every rule is scoped under `.cp-*` (except the token remap, which must
 * target `body`), rides one owned <style data-plugin> tag, and the loader
 * removes it on unload.
 */

export const CHIRAL_CSS = `
/* ────────────────────────────────────────────────────────────────────────
   LAYER 1 · global DS skin — dark blue-black, both theme modes
   ──────────────────────────────────────────────────────────────────────── */

/* Alias-level remap: independent of the static scale's role flip between
   themes, so the DS look is identical under light and dark settings. */
body[data-ds-dark-theme],
body:not([data-ds-dark-theme]) {
  /* machine body */
  --dsw-alias-bg-base: rgb(5, 7, 10);
  --dsw-alias-bg-layer-1: rgb(8, 11, 15);
  --dsw-alias-bg-layer-2: rgb(10, 14, 20);
  --dsw-alias-bg-layer-3: rgb(13, 18, 25);
  --dsw-alias-bg-overlay: rgb(19, 25, 33);
  --dsw-alias-bg-mask-1: rgba(0, 0, 0, 0.5);
  --dsw-alias-bg-mask-2: rgba(0, 0, 0, 0.22);
  --dsw-alias-bg-mask-3: rgba(0, 0, 0, 0.5);
  --dsw-alias-bg-mask-drop: rgba(8, 11, 15, 0.72);
  --dsw-alias-bg-skeleton: rgba(150, 170, 200, 0.06);

  /* text: cold blue-grey */
  --dsw-alias-label-primary: rgb(232, 237, 243);
  --dsw-alias-label-secondary: rgb(168, 180, 195);
  --dsw-alias-label-tertiary: rgb(124, 138, 156);
  --dsw-alias-label-caption: rgb(104, 118, 136);
  --dsw-alias-label-dimmed: rgb(88, 101, 118);
  --dsw-alias-label-primary-dimmed: rgb(200, 208, 218);
  --dsw-alias-label-primary-inverted: rgb(232, 237, 243);
  --dsw-alias-label-primary-foreground: rgb(10, 14, 20);
  --dsw-alias-brand-text: rgb(232, 237, 243);
  --dsw-alias-brand-primary: rgb(103, 158, 254);

  /* hairlines: cold blue, amber only as a faint blush */
  --dsw-alias-border-l1: rgba(120, 150, 195, 0.12);
  --dsw-alias-border-l2: rgba(120, 150, 195, 0.2);
  --dsw-alias-border-l2-darkmode-thin: rgba(120, 150, 195, 0.16);
  --dsw-alias-border-l3: rgba(120, 150, 195, 0.3);
  --dsw-alias-border-l4: rgba(120, 150, 195, 0.4);
  --dsw-alias-border-inverted: rgba(255, 255, 255, 0.08);
  --dsw-alias-border-inverted2: rgba(255, 255, 255, 0.1);

  /* hovers: amber bloom, kept subtle */
  --dsw-alias-interactive-bg-hover: rgba(255, 180, 84, 0.07);
  --dsw-alias-interactive-bg-active: rgba(255, 180, 84, 0.11);
  --dsw-alias-interactive-bg-hover-accent: rgba(255, 180, 84, 0.13);
  --dsw-alias-interactive-bg-hover-solid: rgb(16, 22, 30);
  --dsw-alias-interactive-bg-hover-danger: rgba(242, 90, 90, 0.14);

  /* buttons: brand blue stays the primary action */
  --dsw-alias-button-primary-dimmed: rgb(24, 32, 44);
  --dsw-alias-button-primary-hover: rgb(124, 172, 255);
  --dsw-alias-button-ghost-active-fill: rgb(16, 22, 30);
  --dsw-alias-button-ghost-active-hover: rgb(20, 27, 37);
  --dsw-alias-button-ghost-active-border: rgb(120, 150, 195);
  --dsw-alias-button-floating-fill: rgb(13, 18, 25);
  --dsw-alias-button-floating-hover: rgb(18, 24, 33);
  --dsw-alias-button-elevated-fill: rgb(16, 22, 30);
  --dsw-alias-button-contrast-fill: rgb(200, 208, 218);
  --dsw-alias-button-tool-bar-fill: rgba(120, 150, 195, 0.22);
  --dsw-alias-button-tool-bar-fill-invisible: rgba(120, 150, 195, 0.12);
  --dsw-alias-button-tool-bar-hover: rgba(120, 150, 195, 0.3);

  /* surfaces */
  --dsw-specific-sidebar-fill: rgb(6, 9, 13);
  --dsw-specific-sidebar-nav-item-active: rgb(16, 22, 30);
  --dsw-specific-sidebar-nav-item-active-accent: rgb(22, 30, 41);
  --dsw-specific-sidebar-nav-item-hover: rgb(12, 17, 24);
  --dsw-specific-bubble: rgb(11, 15, 21);
  --dsw-specific-bubble-highlight: rgb(16, 22, 30);
  --dsw-specific-input-major: rgb(10, 14, 20);
  --dsw-specific-login-input: rgb(8, 11, 16);
  --dsw-specific-menu: rgb(13, 18, 25);
  --dsw-specific-selector: rgb(15, 20, 28);
  --dsw-specific-tip: rgb(10, 14, 20);
  --dsw-alias-markdown-code-block: rgb(7, 10, 14);
  --dsw-alias-markdown-code-block-banner: rgb(9, 12, 17);
  --dsw-alias-markdown-inline-code: rgb(13, 18, 25);
  --dsw-alias-markdown-code-segment-selected: rgb(10, 14, 20);
  --dsw-alias-markdown-code-segment-unselected: rgb(8, 11, 16);
  --dsw-alias-markdown-placeholder: rgb(10, 14, 20);
  --dsw-alias-markdown-tag: rgb(13, 18, 25);
  --dsw-alias-markdown-citation: rgb(16, 22, 30);

  /* floats */
  --dsw-alias-toast-bg: rgb(17, 23, 31);
  --dsw-alias-tooltip-bg: rgb(15, 20, 28);
  --dsw-alias-scrollbar-bg-l1: rgb(10, 14, 20);
  --dsw-alias-scrollbar-bg-l2: rgb(13, 18, 25);
  --dsw-alias-scrollbar-hover-l1: rgb(30, 38, 50);
  --dsw-alias-scrollbar-hover-l2: rgb(38, 48, 63);

  /* status: amber stays the warn/emphasis hue; success leans chiral cyan */
  --dsw-alias-state-warn-primary: rgb(245, 158, 11);
  --dsw-alias-state-warn-secondary: rgb(247, 173, 49);
  --dsw-alias-state-warn-label: rgb(221, 134, 41);
  --dsw-alias-state-warn-tertiary: rgb(39, 36, 31);
  --dsw-alias-state-success-primary: rgb(52, 205, 168);
  --dsw-alias-state-success-secondary: rgb(94, 222, 189);
  --dsw-alias-state-success-tertiary: rgb(12, 28, 24);
  --dsw-static-green-400: rgb(94, 222, 189);
  --dsw-static-green-500: rgb(52, 205, 168);
}

/* Ambient bloom behind the app. */
body {
  background-image:
    radial-gradient(1100px 620px at 12% -8%, rgba(111, 219, 226, 0.04), transparent 60%),
    radial-gradient(900px 560px at 108% 112%, rgba(103, 158, 254, 0.05), transparent 60%);
  background-attachment: fixed;
}

/* ────────────────────────────────────────────────────────────────────────
   LAYER 2 · atmosphere overlays (injected as fixed elements)
   ──────────────────────────────────────────────────────────────────────── */
.cp-atmo {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483000;
}
.cp-atmo-scanlines {
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.024) 0 1px,
    transparent 1px 3px
  );
  mix-blend-mode: overlay;
}
.cp-atmo-lattice {
  opacity: 0.55;
  background:
    repeating-linear-gradient(60deg, transparent 0 17px, rgba(103, 158, 254, 0.03) 17px 18px),
    repeating-linear-gradient(120deg, transparent 0 17px, rgba(111, 219, 226, 0.028) 17px 18px);
}
.cp-atmo-vignette {
  background: radial-gradient(120% 100% at 50% 40%, transparent 55%, rgba(0, 0, 0, 0.24) 100%);
}

/* ────────────────────────────────────────────────────────────────────────
   BB vital-signs strip · the heartbeat paper feed
   ──────────────────────────────────────────────────────────────────────── */
.cp-line {
  --cp-amber: #ffb454;
  --cp-amber-bright: #ffd9a0;
  --cp-cyan: #6fdbe2;
  --cp-dim: #64727f;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 26px;
  margin: 3px 0 4px;
  padding: 0 10px;
  border: 1px solid rgba(120, 150, 195, 0.22);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(10, 14, 20, 0.9), rgba(5, 7, 10, 0.92));
  box-shadow: inset 0 0 16px rgba(103, 158, 254, 0.06);
  color: #c9d3dc;
  font-family: ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, "Courier New", monospace;
  overflow: hidden;
}

.cp-lineBpm {
  flex: none;
  min-width: 58px;
  font-size: 13px;
  line-height: 1;
  letter-spacing: 1px;
  color: var(--cp-amber-bright);
  text-shadow: 0 0 10px rgba(255, 180, 84, 0.5);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.cp-lineBpmUnit {
  font-size: 8px;
  letter-spacing: 1.5px;
  color: var(--cp-dim);
  margin-left: 3px;
}

.cp-lineEcg {
  flex: 1 1 auto;
  min-width: 100px;
  height: 22px;
  display: block;
}
.cp-lineEcgLine {
  fill: none;
  stroke: var(--cp-amber);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 3px rgba(255, 180, 84, 0.85)) drop-shadow(0 0 8px rgba(255, 180, 84, 0.4));
}
.cp-lineEcgGhost {
  fill: none;
  stroke: var(--cp-cyan);
  stroke-width: 1;
  opacity: 0.2;
  filter: drop-shadow(0 0 4px rgba(111, 219, 226, 0.45));
}
.cp-lineEcgHead {
  fill: var(--cp-amber-bright);
  filter: drop-shadow(0 0 5px rgba(255, 180, 84, 1));
}
.cp-lineEcgHeadHalo {
  fill: rgba(255, 180, 84, 0.2);
}

.cp-lineReadout {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
  min-width: 118px;
}
.cp-lineStatus {
  font-size: 8px;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: var(--cp-cyan);
  white-space: nowrap;
}
.cp-lineClock {
  font-size: 8px;
  letter-spacing: 1.2px;
  color: var(--cp-dim);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .cp-lineEcgLine,
  .cp-lineEcgHead {
    filter: drop-shadow(0 0 2px rgba(255, 180, 84, 0.6));
  }
}
`
