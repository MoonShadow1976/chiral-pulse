/**
 * CHIRAL PULSE — the Death Stranding sheet, two layers.
 *
 * LAYER 1 — the global skin. The whole app paints from `--dsw-*` variables
 * (ui-theme's design platform: alias tokens reference static tokens, so
 * remapping the static palette re-skins every component without touching its
 * structure). We remap the neutral-bluish scale to a DS blue-black (dark) or
 * container-sand (light), push hairline borders toward amber, tint hovers
 * with an amber bloom, and leave the deepseek brand blues untouched — the
 * whale mark stays DeepSeek blue.
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
   LAYER 1 · global DS skin — token remap
   ──────────────────────────────────────────────────────────────────────── */

/* Dark theme: DS blue-black machine body. */
body[data-ds-dark-theme] {
  --dsw-static-neutral-bluish-1000: rgb(13, 15, 19);
  --dsw-static-neutral-bluish-950: rgb(5, 7, 10);
  --dsw-static-neutral-bluish-900: rgb(8, 11, 15);
  --dsw-static-neutral-bluish-875: rgb(10, 13, 18);
  --dsw-static-neutral-bluish-850: rgb(12, 16, 22);
  --dsw-static-neutral-bluish-800: rgb(15, 20, 27);
  --dsw-static-neutral-bluish-750: rgb(19, 25, 33);
  --dsw-static-neutral-bluish-700: rgb(23, 30, 40);
  --dsw-static-neutral-bluish-600: rgb(66, 78, 92);
  --dsw-static-neutral-bluish-500: rgb(96, 110, 126);
  --dsw-static-neutral-bluish-400: rgb(122, 136, 152);
  --dsw-static-neutral-bluish-300: rgb(158, 172, 186);
  --dsw-static-neutral-bluish-250: rgb(177, 189, 201);
  --dsw-static-neutral-bluish-200: rgb(190, 200, 210);
  --dsw-static-neutral-bluish-150: rgb(205, 213, 221);
  --dsw-static-neutral-bluish-100: rgb(218, 224, 230);
  --dsw-static-neutral-bluish-75: rgb(228, 233, 238);
  --dsw-static-neutral-bluish-60: rgb(234, 238, 242);
  --dsw-static-neutral-bluish-50: rgb(239, 242, 245);
  --dsw-static-green-400: rgb(94, 222, 189);
  --dsw-static-green-500: rgb(52, 205, 168);
  --dsw-alias-border-l1: rgba(255, 180, 84, 0.10);
  --dsw-alias-border-l2: rgba(255, 180, 84, 0.16);
  --dsw-alias-border-l2-darkmode-thin: rgba(255, 180, 84, 0.12);
  --dsw-alias-border-l3: rgba(255, 180, 84, 0.24);
  --dsw-alias-border-l4: rgba(255, 180, 84, 0.32);
  --dsw-alias-bg-skeleton: rgba(255, 180, 84, 0.05);
  --dsw-alias-interactive-bg-hover: rgba(255, 180, 84, 0.07);
  --dsw-alias-interactive-bg-active: rgba(255, 180, 84, 0.12);
  --dsw-alias-interactive-bg-hover-accent: rgba(255, 180, 84, 0.14);
  --dsw-alias-scrollbar-bg-l1: rgb(15, 20, 27);
  --dsw-alias-scrollbar-bg-l2: rgb(19, 25, 33);
  --dsw-alias-scrollbar-hover-l1: rgb(61, 47, 26);
  --dsw-alias-scrollbar-hover-l2: rgb(74, 57, 31);
}

/* Light theme: sand-and-paper container yard (still DS). */
body:not([data-ds-dark-theme]) {
  --dsw-static-neutral-bluish-1000: rgb(10, 9, 8);
  --dsw-static-neutral-bluish-950: rgb(14, 13, 11);
  --dsw-static-neutral-bluish-900: rgb(20, 18, 16);
  --dsw-static-neutral-bluish-875: rgb(29, 27, 24);
  --dsw-static-neutral-bluish-850: rgb(35, 32, 28);
  --dsw-static-neutral-bluish-800: rgb(43, 40, 34);
  --dsw-static-neutral-bluish-750: rgb(53, 49, 42);
  --dsw-static-neutral-bluish-700: rgb(66, 61, 52);
  --dsw-static-neutral-bluish-600: rgb(91, 84, 72);
  --dsw-static-neutral-bluish-500: rgb(130, 120, 104);
  --dsw-static-neutral-bluish-400: rgb(157, 148, 127);
  --dsw-static-neutral-bluish-300: rgb(196, 186, 164);
  --dsw-static-neutral-bluish-250: rgb(207, 198, 178);
  --dsw-static-neutral-bluish-200: rgb(216, 208, 191);
  --dsw-static-neutral-bluish-150: rgb(224, 217, 201);
  --dsw-static-neutral-bluish-100: rgb(231, 225, 212);
  --dsw-static-neutral-bluish-75: rgb(236, 231, 219);
  --dsw-static-neutral-bluish-60: rgb(241, 237, 226);
  --dsw-static-neutral-bluish-50: rgb(244, 241, 232);
  --dsw-static-neutral-bluish-00: rgb(249, 247, 240);
  --dsw-alias-border-l1: rgba(176, 137, 66, 0.16);
  --dsw-alias-border-l2: rgba(176, 137, 66, 0.24);
  --dsw-alias-border-l2-darkmode-thin: rgba(176, 137, 66, 0.2);
  --dsw-alias-border-l3: rgba(176, 137, 66, 0.3);
  --dsw-alias-border-l4: rgba(176, 137, 66, 0.38);
  --dsw-alias-bg-skeleton: rgba(176, 137, 66, 0.08);
  --dsw-alias-interactive-bg-hover: rgba(176, 137, 66, 0.1);
  --dsw-alias-interactive-bg-active: rgba(176, 137, 66, 0.16);
  --dsw-alias-interactive-bg-hover-accent: rgba(176, 137, 66, 0.18);
}

/* Ambient bloom behind the app. */
body {
  background-image:
    radial-gradient(1100px 620px at 12% -8%, rgba(255, 180, 84, 0.05), transparent 60%),
    radial-gradient(900px 560px at 108% 112%, rgba(111, 219, 226, 0.04), transparent 60%);
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
    rgba(255, 255, 255, 0.026) 0 1px,
    transparent 1px 3px
  );
  mix-blend-mode: overlay;
}
.cp-atmo-lattice {
  opacity: 0.6;
  background:
    repeating-linear-gradient(60deg, transparent 0 17px, rgba(255, 180, 84, 0.035) 17px 18px),
    repeating-linear-gradient(120deg, transparent 0 17px, rgba(111, 219, 226, 0.03) 17px 18px);
}
.cp-atmo-vignette {
  background: radial-gradient(120% 100% at 50% 40%, transparent 55%, rgba(0, 0, 0, 0.22) 100%);
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
  border: 1px solid rgba(255, 180, 84, 0.14);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(255, 180, 84, 0.04), rgba(5, 7, 10, 0.55));
  box-shadow: inset 0 0 16px rgba(255, 180, 84, 0.05);
  color: #c9d3dc;
  font-family: ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, "Courier New", monospace;
  overflow: hidden;
}
body:not([data-ds-dark-theme]) .cp-line {
  background: linear-gradient(180deg, rgba(176, 137, 66, 0.08), rgba(249, 247, 240, 0.6));
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
