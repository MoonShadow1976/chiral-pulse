/**
 * CHIRAL PULSE — ECG waveform synthesis.
 *
 * A cardiac cycle is a pure function of beat phase in [0,1): the classic
 * P-QRS-T complex as a sum of wrapped gaussian bumps. The monitor line is a
 * scrolling window over the time axis: the right edge shows the current
 * instant, the window spans `cycles` beats of history. BPM is the phase
 * clock speed, so the whole rhythm accelerates and slows with activity.
 */

/** One wrapped gaussian bump: peak at `center` with `width`, amplitude `amp`. */
function bump(phase: number, center: number, width: number, amp: number): number {
  let d = phase - center
  d -= Math.round(d)
  return amp * Math.exp(-(d * d) / (2 * width * width))
}

/**
 * Sample one cardiac cycle at beat phase in [0,1). Output range ≈ [-0.35, 1].
 * @param phase - beat phase, any real value (wrapping is internal).
 * @returns the waveform amplitude at that phase.
 */
export function ecgValue(phase: number): number {
  return (
    bump(phase, 0.14, 0.030, 0.16) // P wave
    - bump(phase, 0.30, 0.011, 0.26) // Q dip
    + bump(phase, 0.335, 0.0075, 1.0) // R spike
    - bump(phase, 0.375, 0.011, 0.34) // S dip
    + bump(phase, 0.52, 0.048, 0.26) // T wave
    + bump(phase, 0.80, 0.012, 0.05) // U ripple
  )
}

/** One rendered frame of the scrolling monitor line. */
export interface EcgFrame {
  /** `x,y` pairs for an SVG polyline `points` attribute, rightmost = now. */
  points: string
  /** The y of the leading (rightmost) sample, in view units. */
  headY: number
}

/**
 * Build the polyline points for the scrolling window.
 * @param nowMs - wall-clock sample time (drives the phase clock).
 * @param bpm - current heart rate (phase clock speed).
 * @param width - view width in user units (x spans 0..width).
 * @param height - view height in user units.
 * @param cycles - how many beats the window shows.
 * @param step - x sampling step in user units.
 * @returns the frame.
 */
export function buildEcgFrame(
  nowMs: number,
  bpm: number,
  width: number,
  height: number,
  cycles: number,
  step = 2,
): EcgFrame {
  const mid = height / 2
  const amp = height * 0.44
  const beat = (nowMs / 1_000) * (bpm / 60)
  const headPhase = beat % 1
  const points: string[] = []
  let headY = mid
  for (let x = 0; x <= width; x += step) {
    const phase = ((headPhase - ((width - x) / width) * cycles) % 1 + 1) % 1
    const y = mid - ecgValue(phase) * amp
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    if (x === width - step) headY = y
  }
  return { points: points.join(' '), headY }
}

/**
 * Steady-state BPM for a measured activity rate.
 * @param stepsPerMinute - measured step cadence (steps / minute over a window).
 * @returns target BPM within [42, 150] — a resting BB sleeps at 42, full
 * sprint peaks at 150.
 */
export function bpmForActivity(stepsPerMinute: number): number {
  return Math.min(150, Math.max(42, 42 + stepsPerMinute * 6))
}
