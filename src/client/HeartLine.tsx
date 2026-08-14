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
  // Live activity + real model state: streaming output tail, running tool
  // name, turn in flight, and the last agent error.
  const live = useSession(s => ({
    partial: s.partial !== null,
    partialText: s.partial === null ? '' : streamingTail(s.partial.blocks),
    toolName: s.runningCalls[0]?.name ?? null,
    running: s.running,
    error: s.lastAgentError,
    // A failed step waiting on a model retry: the whale flatlines.
    retrying: s.chat.legacy.nodes.some(
      n => n.kind === 'model-retry' && n.retryState === 'scheduled',
    ),
  }))

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
      // Self-healing size: measure the live layout every frame so any
      // remount or hero resize is corrected within one frame, and the trace
      // always fills the visible strip.
      const dpr = window.devicePixelRatio || 1
      const rect = c.getBoundingClientRect()
      const w = Math.max(120, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      const wantW = Math.round(w * dpr)
      const wantH = Math.round(h * dpr)
      if (c.width !== wantW || c.height !== wantH) {
        c.width = wantW
        c.height = wantH
      }
      widthRef.current = w
      dprRef.current = dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)

      const tNow = displayNow / 1_000
      // Absolute paper speed: px per second is constant, width-independent.
      const secondsPerPixel = 1 / PAPER_SPEED_PX_PER_SECOND
      const mid = h / 2
      const amp = h * 0.44
      const wander = 0.05 * Math.sin(tNow * 0.6) + 0.035 * Math.sin(tNow * 1.7 + 1.3)
      const bpm = bpmRef.current
      const flatline = bpm < 1

      // Erase-bar sweep: the bar moves right → left; pixels it has just
      // passed are re-sampled (frozen update), the rest of the image is
      // untouched. The right edge is pinned to "now"; beat spacing is
      // width-independent (fixed paper speed).
      const sweepPeriod = w / PAPER_SPEED_PX_PER_SECOND
      const tInSweep = ((tNow % sweepPeriod) + sweepPeriod) % sweepPeriod
      const scanX = w - tInSweep * PAPER_SPEED_PX_PER_SECOND // w → 0
      const scanXInt = Math.round(scanX)
      const yNow = (x: number): number => {
        if (flatline) return mid // the whale's heart has stopped — a flat line
        let v = -Infinity
        for (let i = 0; i < 4; i += 1) {
          const tX = tNow - (w - (x + i * 0.25)) * secondsPerPixel
          const phase = ((tX * (bpm / 60)) % 1 + 1) % 1
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
      } else {
        // Sweep reset (bar jumped back to the right): no pixels refreshed.
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
    <div className="cp-line" role="group" aria-label={t('line.aria')} data-chiral-pulse data-mode={ui.mode} data-rev="18">
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
