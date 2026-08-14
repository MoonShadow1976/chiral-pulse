/**
 * HeartLine — the CHIRAL PULSE monitor strip, docked above the composer
 * (`conversation.input.dock`). A 26px "monitor paper feed": the scrolling
 * ECG waveform is the hero, flanked by the BPM read and the status word.
 * No duplicated figures — StatsLine already shows turns/tokens.
 *
 * The pulse is LIVE, not decorative:
 *  - `partial`  non-null → the model is thinking/generating → +38 BPM
 *  - `runningCalls` non-empty → a tool is executing → +52 BPM
 *  - `running` (session turn in flight) → +10 BPM
 *  - otherwise the 10s step-window activity rate sets the base (~42 idle)
 * The BPM target is smoothed with a lerp; the paper speed stays FIXED and
 * only the beat density changes — hospital monitor semantics.
 *
 * Rendering: a single <canvas> redrawn per rAF at full frame rate. Fixed
 * memory (one canvas the size of the strip), no DOM attribute churn, no
 * string building — the trace is ~width straight segments per frame, which
 * is far cheaper than SVG polyline swaps and cannot stutter from throttling.
 */
import { useEffect, useRef, useState } from 'react'
import type {
  PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionProjectionMap } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: merges the sessionStats key into SessionProjectionMap.
import type {} from '@deepseek-ai/dsh-session-stats/client'
import { ecgValue } from './ecg.ts'
import type { ChiralKey } from './locales.ts'
import { NS } from './locales.ts'

/** Full props: the input-dock runtime seat plus the locale seat. */
export type HeartLineProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<typeof NS>

/** Monitor view height, CSS px. */
const ECG_HEIGHT = 22
/**
 * FIXED paper speed in px/second — the real hospital-monitor invariant.
 * The trace scrolls at this absolute rate no matter the strip width; the
 * width only decides how much history fits on screen. A rate change (42→90)
 * therefore only densifies the beats — it never speeds the paper up, and
 * resizing the window cannot make the trace run faster either.
 */
const PAPER_SPEED_PX_PER_SECOND = 30
/** Activity window for the step-rate base, ms. */
const ACTIVITY_WINDOW_MS = 10_000
/** Rotating status lines (locale keys), one every STATUS_ROTATE_S ticks. */
const STATUS_KEYS: readonly ChiralKey[] = [
  'status.stable', 'status.bonded', 'status.chiral', 'status.doom',
  'status.keep', 'status.voidout', 'status.odradek',
]
const STATUS_ROTATE_S = 4
/** BPM boost while the model is streaming a partial (thinking/generating). */
const BOOST_THINKING = 38
/** BPM boost while a tool call is running. */
const BOOST_TOOL = 52
/** BPM boost while the session turn is simply in flight. */
const BOOST_RUNNING = 10
/** BPM floor (a resting BB) and ceiling. */
const BPM_FLOOR = 42
const BPM_CEIL = 150
/**
 * How fast the displayed heart rate ramps toward its target, in BPM/second.
 * A hospital monitor updates its HR figure on a ~2-3s rolling average and
 * the trace follows gradually — the rate change reads as a slow ramp, not a
 * snap: 42 → 90 takes (90-42)/6 = 8 seconds of visible densification.
 */
const BPM_RAMP_PER_SECOND = 6

/** Trace color by activity mode: idle amber, thinking cyan, tool orange, run warm. */
const MODE_COLOR = {
  idle: '#ffb454',
  think: '#6fdbe2',
  tool: '#ff7a4d',
  run: '#ffc46b',
  flat: '#c0483c',
} as const
type Mode = keyof typeof MODE_COLOR

/** One activity sample: (time, steps) at a projection update. */
interface StepSample {
  t: number
  steps: number
}

/** Tail of the model's in-flight output: last non-empty text/reasoning block, whitespace-flattened. */
function streamingTail(blocks: readonly { kind: string; text?: string }[]): string {
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i]
    const text = block.text
    if (text !== undefined && text.trim() !== '') {
      return text.replace(/\s+/g, ' ').trim()
    }
  }
  return ''
}

/**
 * The CHIRAL PULSE dock entry.
 * @param props - runtime seat (useSession, useProjection) plus the locale seat.
 * @returns the monitor strip.
 */
export function HeartLine({ useSession, useProjection, t }: HeartLineProps) {
  const stats = useProjection('sessionStats') as SessionProjectionMap['sessionStats'] | undefined
  // One primitive-returning selector per signal: each returns a stable value
  // (boolean / string / null), so the component only re-renders when that
  // signal actually changes — a single object selector re-rendered on every
  // snapshot flush, which is far too often while streaming.
  const partial = useSession(s => s.partial !== null)
  const partialText = useSession(s => (s.partial === null ? '' : streamingTail(s.partial.blocks)))
  const toolName = useSession(s => (s.runningCalls[0]?.name ?? null))
  const running = useSession(s => s.running)
  const error = useSession(s => s.lastAgentError)
  // Flatline only on a LIVE retry stall. The retry chain keeps every attempt;
  // older attempts can linger in 'scheduled' forever (a retry superseded
  // without a retry-started event), so only the LAST attempt counts, within a
  // freshness window — a session merely waiting for user input must never
  // read as a stopped heart. Back-to-front scan stops at the first retry node
  // (which is the last one), so cost is O(distance from the tail), not O(n).
  const retrying = useSession(s => {
    const nodes = s.chat.legacy.nodes
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const n = nodes[i]
      if (n.kind === 'model-retry') {
        return n.retryState === 'scheduled' && n.time > Date.now() - 120_000
      }
    }
    return false
  })
  const live = { partial, partialText, toolName, running, error, retrying }

  const steps = stats?.steps ?? 0

  // ── BPM engine: step-window base + live activity boost ────────────────
  // targetRef updates once per second (activity readout); bpmRef eases toward
  // it EVERY FRAME inside paint, so the trace phase never jumps — a stepped
  // BPM would snap the whole waveform sideways at every tick.
  const bpmRef = useRef(BPM_FLOOR)
  const targetRef = useRef(BPM_FLOOR)
  const samplesRef = useRef<StepSample[]>([])
  const lastStepsRef = useRef(steps)
  const liveRef = useRef(live)
  liveRef.current = live
  const modeRef = useRef<Mode>('idle')
  const [ui, setUi] = useState({ bpm: BPM_FLOOR, elapsed: 0, mode: 'idle' as Mode })
  useEffect(() => {
    if (steps !== lastStepsRef.current) {
      lastStepsRef.current = steps
      samplesRef.current.push({ t: performance.now(), steps })
    }
  }, [steps])

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now()
      const samples = samplesRef.current
      while (samples.length > 0 && now - samples[0].t > ACTIVITY_WINDOW_MS) samples.shift()
      const first = samples[0]
      const span = first === undefined ? 0 : now - first.t
      const delta = first === undefined ? 0 : lastStepsRef.current - first.steps
      const perMinute = span > 0 ? (delta / span) * 60_000 : 0
      const base = Math.min(BPM_CEIL, Math.max(BPM_FLOOR, 42 + perMinute * 6))
      const act = liveRef.current
      // Retry stall → flatline: target 0, the trace flattens and the whale's
      // heart stops until the retry starts.
      targetRef.current = act.retrying
        ? 0
        : Math.min(BPM_CEIL, Math.max(BPM_FLOOR, base
          + (act.toolName !== null ? BOOST_TOOL : 0)
          + (act.partial ? BOOST_THINKING : 0)
          + (act.running ? BOOST_RUNNING : 0)))
      const mode: Mode = act.retrying ? 'flat'
        : act.toolName !== null ? 'tool'
          : act.partial ? 'think'
            : act.running ? 'run' : 'idle'
      modeRef.current = mode
      setUi(current => ({
        bpm: Math.round(bpmRef.current),
        elapsed: current.elapsed + 1,
        mode,
      }))
    }, 1_000)
    return () => { window.clearInterval(id) }
  }, [])

  // ── Canvas trace: one fixed-size canvas, redrawn per rAF ──────────────
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const widthRef = useRef(640)
  const dprRef = useRef(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    ctxRef.current = ctx
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const applySize = (): void => {
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr
      canvas.width = Math.max(120, Math.round(widthRef.current * dpr))
      canvas.height = Math.round(ECG_HEIGHT * dpr)
    }
    applySize()
    const observer = new ResizeObserver((entries) => {
      const width = Math.max(120, Math.round(entries[0]?.contentRect.width ?? 640))
      if (width !== widthRef.current) {
        widthRef.current = width
        applySize()
        if (reduced) paint(performance.now()) // static mode repaints at the new width
      }
    })
    observer.observe(canvas)

    // Smooth display clock: the trace advances at most CLAMP_PER_FRAME worth
    // of time per frame, so a busy main thread (streaming markdown, mode
    // switches) that delays rAF can never make the paper jump forward.
    let displayNow = 0
    let lastPaintReal = 0
    // Refresh-synced display clock. Each NORMAL frame advances the trace by
    // exactly that frame's real interval — the paper speed is then a constant
    // 1× by construction, with zero lag. A DELAYED frame (busy main thread)
    // reuses the last normal interval instead, so the trace never jumps, just
    // runs a touch slow and resumes. No averaging: a smoothed period lags
    // frame-rate changes and the speed visibly surges when the frame rate
    // recovers (the "left edge accelerates then settles" artifact).
    let framePeriodMs = 16.7
    // Frozen pixel cache for true erase-bar rendering: the trace image is a
    // static buffer; only the pixels the sweep bar has just passed are
    // refreshed, everything else stays frozen. The image therefore never
    // scrolls, never jumps as a whole, and is frame-rate independent.
    let traceCache: number[] = []
    let lastScanX = -1
    // Continuous phase clock: the trace is ONE unbroken signal in absolute
    // time — the phase advances (bpm/60) per second, and each pixel samples
    // the signal at its own time. A ring of (time, phase) samples lets us
    // evaluate the phase at any sample time in the past, so a mid-sweep rate
    // change keeps the pixels crossed afterwards on the SAME phase function
    // as the ones before it: the new line continues the old one (old data is
    // never repainted, nothing is mixed).
    let phaseAcc = 0
    let phaseHistory: Array<{ t: number; phase: number }> = []
    // Phase at an arbitrary past sample time — linear interpolation over the
    // history (samples are ~a frame apart, so the error stays negligible even
    // while the rate ramps at 6 BPM/s).
    const phaseAt = (tX: number): number => {
      const arr = phaseHistory
      if (arr.length === 0) return 0
      if (tX <= arr[0].t) return arr[0].phase
      const last = arr[arr.length - 1]
      if (tX >= last.t) return last.phase
      let lo = 0
      let hi = arr.length - 1
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1
        if (arr[m].t <= tX) lo = m
        else hi = m
      }
      const a = arr[lo]
      const b = arr[hi]
      return a.phase + ((tX - a.t) / (b.t - a.t)) * (b.phase - a.phase)
    }
    const paint = (now: number): void => {
      if (lastPaintReal === 0) {
        lastPaintReal = now
        displayNow = now
      }
      const realDt = Math.max(0, (now - lastPaintReal) / 1_000)
      lastPaintReal = now
      if (realDt > 0 && realDt < 0.05) framePeriodMs = realDt * 1_000
      const dt = framePeriodMs / 1_000
      displayNow += dt * 1_000
      // Constant-rate ramp (hospital monitor cadence): the rate eases toward
      // its target at BPM_RAMP_PER_SECOND, so a rate change takes seconds and
      // the beat spacing visibly densifies beat by beat.
      const diff = targetRef.current - bpmRef.current
      const step = BPM_RAMP_PER_SECOND * dt
      if (diff > step) bpmRef.current += step
      else if (diff < -step) bpmRef.current -= step
      else bpmRef.current = targetRef.current
      const c = canvasRef.current
      const g = ctxRef.current
      if (c === null || g === null) return
      // Size is maintained by the ResizeObserver (widthRef / canvas.width);
      // paint reads it directly — no per-frame getBoundingClientRect, so no
      // forced synchronous layout. Fixed logical height keeps the amplitude
      // independent of the live layout (the first paint once saw height 0 and
      // collapsed the trace to a flat line).
      const dpr = dprRef.current
      const w = widthRef.current
      const h = ECG_HEIGHT
      const wantW = Math.round(w * dpr)
      const wantH = Math.round(h * dpr)
      if (c.width !== wantW || c.height !== wantH) {
        c.width = wantW
        c.height = wantH
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)

      const tNow = displayNow / 1_000
      // Absolute paper speed: px per second is constant, width-independent.
      const secondsPerPixel = 1 / PAPER_SPEED_PX_PER_SECOND
      const mid = h / 2
      const amp = h * 0.5
      const wander = 0.05 * Math.sin(tNow * 0.6) + 0.035 * Math.sin(tNow * 1.7 + 1.3)
      const bpm = bpmRef.current
      // Flatline is a MODE, not a smoothed value: as soon as the target is a
      // stopped heart, draw the line — don't wait for the 6 BPM/s ramp to
      // cross an arbitrary threshold.
      const flatline = targetRef.current === 0

      // Erase-bar sweep: the bar moves right → left; pixels it has just
      // passed are re-sampled (frozen update), the rest of the image is
      // untouched. The right edge is pinned to "now"; beat spacing is
      // width-independent (fixed paper speed).
      const sweepPeriod = w / PAPER_SPEED_PX_PER_SECOND
      const tInSweep = ((tNow % sweepPeriod) + sweepPeriod) % sweepPeriod
      const scanX = w - tInSweep * PAPER_SPEED_PX_PER_SECOND // w → 0
      const scanXInt = Math.round(scanX)

      // Advance the continuous phase clock by this frame's display time, and
      // keep enough history for the oldest pixel the strip can still show
      // (two sweep periods back). The first frame seeds a constant-rate
      // history — nothing can have changed before the very first paint — so
      // the initial full build is a coherent window.
      if (phaseHistory.length === 0) {
        phaseAcc = (tNow * bpm) / 60
        phaseHistory.push({
          t: tNow - 2 * sweepPeriod - 2,
          phase: ((tNow - 2 * sweepPeriod - 2) * bpm) / 60,
        })
        phaseHistory.push({ t: tNow, phase: phaseAcc })
      } else {
        phaseAcc += (bpm / 60) * dt
        phaseHistory.push({ t: tNow, phase: phaseAcc })
      }
      const lookback = 2 * sweepPeriod + 2
      while (phaseHistory.length > 2 && phaseHistory[0].t < tNow - lookback) {
        phaseHistory.shift()
      }
      const yNow = (x: number): number => {
        if (flatline) return mid // the whale's heart has stopped — a flat line
        let v = -Infinity
        // Sweep sample: pixel x is (re)written when the bar crosses it, so the
        // sample must be anchored to the sweep, not the frame. The frame-time
        // lookback `tNow - (w - x)·secondsPerPixel` evaluated at a crossing
        // cancels its own offset — the bar reaches x exactly (w - x) px into
        // the sweep, so the lookback always lands on the sweep-start instant
        // k·sweepPeriod and EVERY swept pixel receives the SAME sample → the
        // trace flattens to one level once the bar has crossed the strip.
        // Anchoring to the sweep start (`(tNow - tInSweep) - (w - x)·spp`, with
        // tNow - tInSweep = k·sweepPeriod) keeps the right edge pinned to the
        // sweep start ("now") and each pixel's sample x-dependent — the swept
        // region redraws as a real, time-normal waveform window.
        for (let i = 0; i < 4; i += 1) {
          const tX = (tNow - tInSweep) - (w - (x + i * 0.25)) * secondsPerPixel
          // Phase comes from the CONTINUOUS clock, not `tX * bpm/60`: the
          // product assumes a constant rate and tears the strip apart when
          // the rate changes mid-sweep (old pixels stay at the old rate, new
          // ones use the new rate). The clock makes every pixel — crossed
          // before or after the change — a sample of the SAME unbroken
          // signal, so the new line simply continues the old one.
          const phase = ((phaseAt(tX) % 1) + 1) % 1
          const s = ecgValue(phase)
          if (s > v) v = s
        }
        return mid - (v + wander) * amp
      }
      if (traceCache.length !== w + 1) {
        // Width changed: rebuild the buffer, right-anchored, repaint once.
        traceCache = new Array<number>(w + 1)
        for (let x = 0; x <= w; x += 1) traceCache[x] = yNow(x)
        lastScanX = scanXInt
      } else if (lastScanX > scanXInt) {
        // Refresh exactly the pixels the sweep has just passed.
        for (let x = scanXInt; x <= lastScanX && x <= w; x += 1) {
          traceCache[x] = yNow(x)
        }
        lastScanX = scanXInt
      } else if (lastScanX < scanXInt) {
        // Wrap: the bar jumped back to the right edge. Refresh its new head
        // pixel so the trace continues from the current instant instead of
        // leaving stale data at the right edge (the reported seam).
        traceCache[scanXInt] = yNow(scanXInt)
        lastScanX = scanXInt
      } else {
        lastScanX = scanXInt
      }

      // Chiral ghost over the frozen image, faint.
      g.beginPath()
      for (let x = 0; x <= w; x += 1) {
        const y = traceCache[x]
        if (x === 0) g.moveTo(x + 3, y)
        else g.lineTo(x + 3, y)
      }
      g.globalAlpha = 0.1
      g.strokeStyle = 'rgba(111, 219, 226, 1)'
      g.lineWidth = 1
      g.stroke()
      g.globalAlpha = 1

      // The frozen trace, whole window.
      g.beginPath()
      for (let x = 0; x <= w; x += 1) {
        const y = traceCache[x]
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.strokeStyle = MODE_COLOR[modeRef.current]
      g.lineWidth = 1.4
      g.lineJoin = 'round'
      g.lineCap = 'round'
      g.stroke()

      // The sweep bar itself: bright core + soft halo.
      g.fillStyle = 'rgba(255, 180, 84, 0.16)'
      g.fillRect(scanX - 5, 0, 10, h)
      g.fillStyle = 'rgba(255, 224, 190, 0.95)'
      g.fillRect(scanX - 1, 0, 2, h)
    }

    if (reduced) {
      paint(performance.now()) // one static frame
      return () => { observer.disconnect() }
    }
    let raf = 0
    const loop = (now: number): void => {
      raf = requestAnimationFrame(loop)
      paint(now)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  // Status word: real model state wins; the flavor rotation only plays while idle.
  const flavor = STATUS_KEYS[Math.floor(ui.elapsed / STATUS_ROTATE_S) % STATUS_KEYS.length]
  const status = live.error !== null
    ? `⚠ ${live.error.slice(0, 16)}`
    : live.retrying
      ? t('status.flatline')
      : live.toolName !== null
        ? `EXEC · ${live.toolName}`
        : live.partialText !== ''
          ? `⇢ ${live.partialText.slice(-18)}`
          : t(flavor)

  return (
    <div className="cp-line" role="group" aria-label={t('line.aria')} data-chiral-pulse data-mode={ui.mode} data-rev="20">
      <div className="cp-lineBpm">
        {ui.bpm}
      </div>

      <div className="cp-lineEcgWrap">
        <canvas ref={canvasRef} className="cp-lineEcg" aria-hidden />
      </div>

      <div className="cp-lineReadout">
        <div className="cp-lineStatus" title={status}>{status}</div>
      </div>
    </div>
  )
}
