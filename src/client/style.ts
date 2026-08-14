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
  /* machine body — blue-grey with air, not a black void */
  --dsw-alias-bg-base: rgb(13, 17, 23);
  --dsw-alias-bg-layer-1: rgb(17, 22, 29);
  --dsw-alias-bg-layer-2: rgb(21, 27, 35);
  --dsw-alias-bg-layer-3: rgb(26, 33, 42);
  --dsw-alias-bg-overlay: rgb(31, 40, 51);
  --dsw-alias-bg-mask-1: rgba(0, 0, 0, 0.5);
  --dsw-alias-bg-mask-2: rgba(0, 0, 0, 0.22);
  --dsw-alias-bg-mask-3: rgba(0, 0, 0, 0.5);
  --dsw-alias-bg-mask-drop: rgba(10, 14, 19, 0.72);
  --dsw-alias-bg-skeleton: rgba(150, 170, 200, 0.07);

  /* text: cold blue-grey */
  --dsw-alias-label-primary: rgb(235, 240, 246);
  --dsw-alias-label-secondary: rgb(178, 190, 205);
  --dsw-alias-label-tertiary: rgb(140, 153, 170);
  --dsw-alias-label-caption: rgb(108, 122, 141);
  --dsw-alias-label-dimmed: rgb(94, 108, 127);
  --dsw-alias-label-primary-dimmed: rgb(205, 213, 222);
  --dsw-alias-label-primary-inverted: rgb(235, 240, 246);
  --dsw-alias-label-primary-foreground: rgb(13, 17, 23);
  --dsw-alias-brand-text: rgb(235, 240, 246);
  --dsw-alias-brand-primary: rgb(103, 158, 254);

  /* hairlines: cold blue, readable against the body */
  --dsw-alias-border-l1: rgba(140, 170, 215, 0.15);
  --dsw-alias-border-l2: rgba(140, 170, 215, 0.24);
  --dsw-alias-border-l2-darkmode-thin: rgba(140, 170, 215, 0.19);
  --dsw-alias-border-l3: rgba(140, 170, 215, 0.34);
  --dsw-alias-border-l4: rgba(140, 170, 215, 0.46);
  --dsw-alias-border-inverted: rgba(255, 255, 255, 0.09);
  --dsw-alias-border-inverted2: rgba(255, 255, 255, 0.11);

  /* hovers: amber bloom, kept subtle */
  --dsw-alias-interactive-bg-hover: rgba(255, 180, 84, 0.08);
  --dsw-alias-interactive-bg-active: rgba(255, 180, 84, 0.12);
  --dsw-alias-interactive-bg-hover-accent: rgba(255, 180, 84, 0.14);
  --dsw-alias-interactive-bg-hover-solid: rgb(22, 29, 38);
  --dsw-alias-interactive-bg-hover-danger: rgba(242, 90, 90, 0.14);

  /* buttons: brand blue stays the primary action */
  --dsw-alias-button-primary-dimmed: rgb(30, 40, 53);
  --dsw-alias-button-primary-hover: rgb(124, 172, 255);
  --dsw-alias-button-ghost-active-fill: rgb(22, 29, 38);
  --dsw-alias-button-ghost-active-hover: rgb(27, 35, 46);
  --dsw-alias-button-ghost-active-border: rgb(140, 170, 215);
  --dsw-alias-button-floating-fill: rgb(19, 25, 33);
  --dsw-alias-button-floating-hover: rgb(24, 31, 41);
  --dsw-alias-button-elevated-fill: rgb(22, 29, 38);
  --dsw-alias-button-contrast-fill: rgb(205, 213, 222);
  --dsw-alias-button-tool-bar-fill: rgba(140, 170, 215, 0.24);
  --dsw-alias-button-tool-bar-fill-invisible: rgba(140, 170, 215, 0.13);
  --dsw-alias-button-tool-bar-hover: rgba(140, 170, 215, 0.32);

  /* surfaces */
  --dsw-specific-sidebar-fill: rgb(9, 12, 17);
  --dsw-specific-sidebar-nav-item-active: rgb(20, 27, 36);
  --dsw-specific-sidebar-nav-item-active-accent: rgb(27, 36, 48);
  --dsw-specific-sidebar-nav-item-hover: rgb(15, 20, 28);
  --dsw-specific-bubble: rgb(18, 24, 32);
  --dsw-specific-bubble-highlight: rgb(24, 32, 42);
  --dsw-specific-input-major: rgb(15, 20, 27);
  --dsw-specific-login-input: rgb(12, 16, 22);
  --dsw-specific-menu: rgb(21, 27, 35);
  --dsw-specific-selector: rgb(20, 26, 34);
  --dsw-specific-tip: rgb(16, 21, 28);
  --dsw-alias-markdown-code-block: rgb(10, 14, 19);
  --dsw-alias-markdown-code-block-banner: rgb(13, 17, 23);
  --dsw-alias-markdown-inline-code: rgb(18, 24, 32);
  --dsw-alias-markdown-code-segment-selected: rgb(16, 21, 28);
  --dsw-alias-markdown-code-segment-unselected: rgb(12, 16, 22);
  --dsw-alias-markdown-placeholder: rgb(16, 21, 28);
  --dsw-alias-markdown-tag: rgb(18, 24, 32);
  --dsw-alias-markdown-citation: rgb(22, 29, 38);

  /* floats */
  --dsw-alias-toast-bg: rgb(22, 29, 38);
  --dsw-alias-tooltip-bg: rgb(20, 26, 34);
  --dsw-alias-scrollbar-bg-l1: rgb(13, 18, 25);
  --dsw-alias-scrollbar-bg-l2: rgb(17, 23, 31);
  --dsw-alias-scrollbar-hover-l1: rgb(34, 44, 58);
  --dsw-alias-scrollbar-hover-l2: rgb(42, 54, 70);

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

/* Focus ring: amber, the DS highlight color. */
:focus-visible {
  outline: 1px solid rgba(255, 180, 84, 0.65) !important;
  outline-offset: 2px;
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
  border: 1px solid rgba(140, 170, 215, 0.26);
  border-radius: 0;
  background:
    linear-gradient(115deg, rgba(140, 190, 255, 0.06) 0%, transparent 30%),
    linear-gradient(180deg, rgba(14, 19, 26, 0.92), rgba(9, 13, 18, 0.94));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 16px rgba(103, 158, 254, 0.06);
  color: #c9d3dc;
  font-family: ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, "Courier New", monospace;
  overflow: hidden;
  clip-path: polygon(
    7px 0,
    100% 0,
    100% calc(100% - 7px),
    calc(100% - 7px) 100%,
    0 100%,
    0 7px
  );
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
  border-radius: 0;
  border: 1px solid rgba(140, 170, 215, 0.16);
  background:
    repeating-linear-gradient(0deg, rgba(140, 170, 215, 0.07) 0 1px, transparent 1px 11px),
    repeating-linear-gradient(90deg, rgba(140, 170, 215, 0.06) 0 1px, transparent 1px 11px),
    rgba(7, 10, 15, 0.55);
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

/* ────────────────────────────────────────────────────────────────────────
   ECG paper grid + activity-mode color coupling
   ──────────────────────────────────────────────────────────────────────── */
.cp-line[data-mode="think"] .cp-lineBpm {
  color: #7fe3e8;
  text-shadow: 0 0 10px rgba(111, 219, 226, 0.55);
}
.cp-line[data-mode="tool"] .cp-lineBpm {
  color: #ff9b7a;
  text-shadow: 0 0 10px rgba(255, 122, 77, 0.6);
}
.cp-line[data-mode="run"] .cp-lineBpm {
  color: #ffd9a0;
}
.cp-line[data-mode="think"] .cp-lineStatus,
.cp-line[data-mode="tool"] .cp-lineStatus {
  color: #9fe8ec;
}

/* ────────────────────────────────────────────────────────────────────────
   Message-flow dressing — DS glyphs on each node kind
   ──────────────────────────────────────────────────────────────────────── */
[data-chat-flow-kind] {
  position: relative;
}
[data-chat-flow-kind="assistant"] {
  padding-left: 18px;
}
[data-chat-flow-kind="assistant"]::before {
  content: "✦";
  position: absolute;
  left: 4px;
  top: 12px;
  color: rgba(255, 180, 84, 0.85);
  font-size: 11px;
  line-height: 1;
  text-shadow: 0 0 8px rgba(255, 180, 84, 0.6);
}
[data-chat-flow-kind="assistant"]::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 180, 84, 0.35), transparent);
}
[data-chat-flow-kind="user"],
[data-chat-flow-kind="steering"] {
  padding-right: 18px;
}
[data-chat-flow-kind="user"]::before,
[data-chat-flow-kind="steering"]::before {
  content: "▸▸";
  position: absolute;
  right: 2px;
  top: 4px;
  color: rgba(120, 150, 195, 0.75);
  font-size: 10px;
  line-height: 1;
  letter-spacing: -1px;
}
[data-chat-flow-kind="context"] {
  padding-left: 16px;
}
[data-chat-flow-kind="context"]::before {
  content: "⇢";
  position: absolute;
  left: 2px;
  top: 12px;
  color: rgba(111, 219, 226, 0.7);
  font-size: 11px;
  line-height: 1;
}
[data-variant="think"] {
  border-left: 2px solid rgba(111, 219, 226, 0.35);
  padding-left: 10px;
}

/* ────────────────────────────────────────────────────────────────────────
   Tool-card chassis — the ui-primitives block family gets a DS case
   ──────────────────────────────────────────────────────────────────────── */
[data-tool],
[data-search],
[data-read],
[data-web],
[data-diff],
[data-terminal],
[data-context-injection-body] {
  border: 1px solid rgba(140, 170, 215, 0.24) !important;
  border-radius: 0 !important;
  background:
    linear-gradient(115deg, rgba(140, 190, 255, 0.06) 0%, transparent 30%),
    linear-gradient(180deg, rgba(15, 20, 27, 0.88), rgba(9, 13, 18, 0.92)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 18px rgba(103, 158, 254, 0.05);
  position: relative;
  clip-path: polygon(
    7px 0,
    100% 0,
    100% calc(100% - 7px),
    calc(100% - 7px) 100%,
    0 100%,
    0 7px
  );
}
[data-terminal]::before {
  content: "❯_";
  position: absolute;
  right: 8px;
  top: 6px;
  color: rgba(111, 219, 226, 0.35);
  font-size: 10px;
  font-family: ui-monospace, Consolas, monospace;
}
[data-read]::before {
  content: "▤";
  position: absolute;
  right: 8px;
  top: 6px;
  color: rgba(120, 150, 195, 0.4);
  font-size: 11px;
}
[data-search]::before {
  content: "⌕";
  position: absolute;
  right: 8px;
  top: 5px;
  color: rgba(255, 180, 84, 0.4);
  font-size: 13px;
}
[data-web]::before {
  content: "⌖";
  position: absolute;
  right: 8px;
  top: 5px;
  color: rgba(111, 219, 226, 0.4);
  font-size: 12px;
}
[data-diff]::before {
  content: "⇄";
  position: absolute;
  right: 8px;
  top: 5px;
  color: rgba(120, 150, 195, 0.4);
  font-size: 12px;
}
[data-tool]::before {
  content: "⚙";
  position: absolute;
  right: 8px;
  top: 5px;
  color: rgba(255, 180, 84, 0.4);
  font-size: 11px;
}
[data-context-injection-body]::before {
  content: "⇢";
  position: absolute;
  right: 8px;
  top: 5px;
  color: rgba(111, 219, 226, 0.4);
  font-size: 11px;
}

/* ────────────────────────────────────────────────────────────────────────
   Composer details
   ──────────────────────────────────────────────────────────────────────── */
[data-composer-seat] textarea {
  caret-color: #ffb454;
  letter-spacing: 0.01em;
}
[data-composer-seat] textarea:focus {
  caret-color: #ffd9a0;
}
[data-composer-seat] {
  box-shadow:
    inset 0 0 0 1px rgba(140, 170, 215, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -12px 30px rgba(0, 0, 0, 0.25);
  border-radius: 0;
}

/* ────────────────────────────────────────────────────────────────────────
   Dialogs, menus, tooltips, toasts — the floating DS surfaces
   ──────────────────────────────────────────────────────────────────────── */
[role="dialog"] {
  border: 1px solid rgba(255, 180, 84, 0.32) !important;
  border-radius: 0 !important;
  background: linear-gradient(180deg, rgba(15, 20, 27, 0.98), rgba(10, 14, 19, 0.99)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 26px rgba(103, 158, 254, 0.06) !important;
}
[role="menu"] {
  border: 1px solid rgba(140, 170, 215, 0.3) !important;
  border-radius: 0 !important;
  background: rgba(13, 18, 25, 0.97) !important;
}
[role="menuitem"]:hover {
  background: rgba(255, 180, 84, 0.08) !important;
}
[role="tooltip"] {
  border: 1px solid rgba(140, 170, 215, 0.32) !important;
  border-radius: 0 !important;
  background: rgba(15, 20, 27, 0.97) !important;
}
[role="alert"] {
  border: 1px solid rgba(255, 180, 84, 0.38) !important;
  border-radius: 0 !important;
  background: rgba(15, 20, 27, 0.97) !important;
  clip-path: polygon(
    8px 0,
    100% 0,
    100% calc(100% - 8px),
    calc(100% - 8px) 100%,
    0 100%,
    0 8px
  );
}

/* ────────────────────────────────────────────────────────────────────────
   DS chamfer everywhere else: kill the round-corner language
   ──────────────────────────────────────────────────────────────────────── */
button,
input,
textarea,
select,
[role="tab"],
[role="menuitem"],
[role="treeitem"] {
  border-radius: 0 !important;
}

`
