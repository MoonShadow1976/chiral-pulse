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
    + bump(phase, 0.335, 0.016, 1.0) // R spike (wide enough to survive sampling)
    - bump(phase, 0.375, 0.011, 0.34) // S dip
    + bump(phase, 0.52, 0.048, 0.26) // T wave
    + bump(phase, 0.80, 0.012, 0.05) // U ripple
  )
}
