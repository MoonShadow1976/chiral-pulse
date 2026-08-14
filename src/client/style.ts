/**
 * CHIRAL PULSE — the Death Stranding-styled sheet.
 *
 * Design language: a BB pod vital-signs monitor. Near-black chassis with an
 * amber hairline, HUD corner brackets, CRT scanlines, a faint chiral lattice
 * (60°/120° weave like the chiral carbon lattice), a radial amber bloom, and
 * a scrolling ECG line whose glow is the hero. Readouts sit in the DS
 * monitor idiom: wide-tracked uppercase micro-labels, monospace figures,
 * cyan secondary ink for the chiral clock.
 *
 * Every rule is scoped under `.cp-*` and the whole sheet rides one
 * <style data-plugin> tag the plugin owns (the loader removes it on unload).
 * The chassis paints its own dark surface, so the device reads correctly on
 * any app theme.
 */

export const CHIRAL_CSS = `
.cp-pod {
  --cp-amber: #ffb454;
  --cp-amber-bright: #ffd9a0;
  --cp-amber-faint: rgba(255, 180, 84, 0.22);
  --cp-cyan: #6fdbe2;
  --cp-ink: #0b0f14;
  --cp-ink-2: #10161d;
  --cp-text: #c9d3dc;
  --cp-dim: #64727f;
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 6px 0 2px;
  padding: 8px 12px 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--cp-amber-faint);
  background:
    radial-gradient(120% 200% at 0% 0%, rgba(255, 180, 84, 0.07), transparent 55%),
    radial-gradient(80% 160% at 100% 100%, rgba(111, 219, 226, 0.05), transparent 50%),
    linear-gradient(180deg, var(--cp-ink-2), var(--cp-ink));
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.45),
    0 6px 24px rgba(0, 0, 0, 0.35),
    inset 0 0 28px rgba(255, 180, 84, 0.05);
  color: var(--cp-text);
  font-family: ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, "Courier New", monospace;
  overflow: hidden;
}

/* HUD corner brackets */
.cp-pod::before,
.cp-pod::after {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
  z-index: 3;
}
.cp-pod::before {
  left: 5px;
  top: 5px;
  border-left: 2px solid var(--cp-amber);
  border-top: 2px solid var(--cp-amber);
  opacity: 0.65;
}
.cp-pod::after {
  right: 5px;
  bottom: 5px;
  border-right: 2px solid var(--cp-amber);
  border-bottom: 2px solid var(--cp-amber);
  opacity: 0.65;
}

/* CRT scanlines */
.cp-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.028) 0 1px,
    transparent 1px 3px
  );
  mix-blend-mode: overlay;
}

/* Chiral lattice weave */
.cp-lattice {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.55;
  background:
    repeating-linear-gradient(60deg, transparent 0 15px, rgba(255, 180, 84, 0.05) 15px 16px),
    repeating-linear-gradient(120deg, transparent 0 15px, rgba(111, 219, 226, 0.045) 15px 16px);
}

/* ── BB pod glyph (left) ─────────────────────────────────────────────── */
.cp-glyph {
  position: relative;
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(255, 180, 84, 0.4);
  background:
    radial-gradient(circle at 50% 38%, rgba(255, 180, 84, 0.18), rgba(10, 14, 19, 0.65) 72%);
  box-shadow: inset 0 0 12px rgba(255, 180, 84, 0.14);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.cp-glyph svg {
  width: 28px;
  height: 28px;
  filter: drop-shadow(0 0 6px rgba(255, 180, 84, 0.85));
}
.cp-glyphLabel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  text-align: center;
  font-size: 7px;
  letter-spacing: 1.5px;
  color: var(--cp-amber);
  opacity: 0.75;
  pointer-events: none;
}

/* ── ECG monitor (center, the hero) ──────────────────────────────────── */
.cp-ecgArea {
  position: relative;
  flex: 1 1 auto;
  min-width: 120px;
  height: 42px;
  border-radius: 6px;
  border: 1px solid rgba(255, 180, 84, 0.14);
  background:
    repeating-linear-gradient(0deg, rgba(255, 180, 84, 0.05) 0 1px, transparent 1px 21px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.18));
}
.cp-ecgCenterline {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(255, 180, 84, 0.16);
  pointer-events: none;
}
.cp-ecg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.cp-ecgLine {
  fill: none;
  stroke: var(--cp-amber);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 3px rgba(255, 180, 84, 0.9)) drop-shadow(0 0 9px rgba(255, 180, 84, 0.45));
}
.cp-ecgGhost {
  fill: none;
  stroke: var(--cp-cyan);
  stroke-width: 1;
  opacity: 0.22;
  filter: drop-shadow(0 0 4px rgba(111, 219, 226, 0.5));
}
.cp-ecgHead {
  fill: var(--cp-amber-bright);
  filter: drop-shadow(0 0 5px rgba(255, 180, 84, 1));
}
.cp-ecgHeadHalo {
  fill: rgba(255, 180, 84, 0.22);
}

/* ── Readouts (right) ────────────────────────────────────────────────── */
.cp-vitals {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  min-width: 150px;
}
.cp-bpm {
  font-size: 22px;
  line-height: 1;
  letter-spacing: 1px;
  color: var(--cp-amber-bright);
  text-shadow: 0 0 12px rgba(255, 180, 84, 0.55);
  font-variant-numeric: tabular-nums;
}
.cp-bpmUnit {
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--cp-dim);
  margin-left: 4px;
}
.cp-status {
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--cp-cyan);
  opacity: 0.9;
  white-space: nowrap;
}
.cp-clock {
  font-size: 9px;
  letter-spacing: 1.5px;
  color: var(--cp-dim);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Toggle ──────────────────────────────────────────────────────────── */
.cp-toggle {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--cp-amber-faint);
  background: rgba(255, 180, 84, 0.06);
  color: var(--cp-amber);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  padding: 0;
  transition: background 120ms ease, color 120ms ease;
}
.cp-toggle:hover {
  background: rgba(255, 180, 84, 0.16);
  color: var(--cp-amber-bright);
}
.cp-toggle:focus-visible {
  outline: 1px solid var(--cp-amber);
  outline-offset: 2px;
}
.cp-chevron {
  display: inline-block;
  transition: transform 180ms ease;
}
.cp-pod[data-cp-expanded="true"] .cp-chevron {
  transform: rotate(180deg);
}

/* ── Expanded vitals panel ───────────────────────────────────────────── */
.cp-panel {
  display: none;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 6px 18px;
  padding: 10px 14px 8px;
  border-top: 1px solid var(--cp-amber-faint);
  background: rgba(0, 0, 0, 0.22);
}
.cp-pod[data-cp-expanded="true"] {
  flex-wrap: wrap;
}
.cp-pod[data-cp-expanded="true"] .cp-panel {
  display: grid;
  flex-basis: 100%;
}
/* The odradek scan bar belongs to the expanded face only. */
.cp-pod:not([data-cp-expanded="true"]) .cp-ctx {
  display: none;
}
.cp-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.cp-fieldLabel {
  font-size: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--cp-dim);
}
.cp-fieldValue {
  font-size: 13px;
  letter-spacing: 1px;
  color: var(--cp-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cp-fieldValue strong {
  color: var(--cp-amber-bright);
  font-weight: 600;
}

/* Context-pressure bar: the odradek scan */
.cp-ctx {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-top: 1px solid var(--cp-amber-faint);
  flex-basis: 100%;
}
.cp-ctxLabel {
  font-size: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--cp-dim);
  flex: none;
}
.cp-ctxTrack {
  position: relative;
  flex: 1 1 auto;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 180, 84, 0.12);
  overflow: hidden;
}
.cp-ctxFill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(255, 180, 84, 0.5), var(--cp-amber));
  box-shadow: 0 0 8px rgba(255, 180, 84, 0.7);
  transition: width 400ms ease;
}
.cp-ctxFill[data-cp-hot="true"] {
  background: linear-gradient(90deg, rgba(255, 107, 74, 0.55), var(--cp-danger));
  box-shadow: 0 0 8px rgba(255, 107, 74, 0.7);
}
.cp-ctxValue {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--cp-amber-bright);
  flex: none;
  font-variant-numeric: tabular-nums;
  min-width: 38px;
  text-align: right;
}

/* Motion */
@media (prefers-reduced-motion: reduce) {
  .cp-glyph svg {
    filter: drop-shadow(0 0 3px rgba(255, 180, 84, 0.7));
  }
}
`
