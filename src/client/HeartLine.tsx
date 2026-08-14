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
/** Seconds of signal shown across the window (fixed paper speed). */
const ECG_WINDOW = 5
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

/** Trace color by activity mode: idle amber, thinking cyan, tool orange, run warm. */
const MODE_COLOR = {
  idle: '#ffb454',
  think: '#6fdbe2',
  tool: '#ff7a4d',
  run: '#ffc46b',
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
  }))

  const steps = stats?.steps ?? 0

  // ── BPM engine: step-window base + live activity boost ────────────────
  const bpmRef = useRef(BPM_FLOOR)
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
      const boost = (act.toolName !== null ? BOOST_TOOL : 0)
        + (act.partial ? BOOST_THINKING : 0)
        + (act.running ? BOOST_RUNNING : 0)
      const target = Math.min(BPM_CEIL, Math.max(BPM_FLOOR, base + boost))
      bpmRef.current += (target - bpmRef.current) * 0.14
      const mode: Mode = act.toolName !== null ? 'tool' : act.partial ? 'think' : act.running ? 'run' : 'idle'
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
      }
    })
    observer.observe(canvas)

    const paint = (now: number): void => {
      const c = canvasRef.current
      const g = ctxRef.current
      if (c === null || g === null) return
      const w = widthRef.current
      const h = ECG_HEIGHT
      const dpr = dprRef.current
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)

      const tNow = now / 1_000
      const secondsPerPixel = ECG_WINDOW / w
      const mid = h / 2
      const amp = h * 0.44
      const wander = 0.05 * Math.sin(tNow * 0.6) + 0.035 * Math.sin(tNow * 1.7 + 1.3)
      const bpm = bpmRef.current
      const yAt = (x: number): number => {
        const tX = tNow - (w - x) * secondsPerPixel
        const phase = ((tX * (bpm / 60)) % 1 + 1) % 1
        return mid - (ecgValue(phase) + wander) * amp
      }

      // Chiral ghost: the same trace offset by 3px, faint cyan.
      g.beginPath()
      for (let x = 0; x <= w; x += 1) {
        const y = yAt(x)
        if (x === 0) g.moveTo(x + 3, y)
        else g.lineTo(x + 3, y)
      }
      g.strokeStyle = 'rgba(111, 219, 226, 0.18)'
      g.lineWidth = 1
      g.stroke()

      // Main trace.
      g.beginPath()
      for (let x = 0; x <= w; x += 1) {
        const y = yAt(x)
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.strokeStyle = MODE_COLOR[modeRef.current]
      g.lineWidth = 1.4
      g.lineJoin = 'round'
      g.lineCap = 'round'
      g.stroke()

      // Scan head: halo + dot at the leading edge.
      const headY = yAt(w)
      g.fillStyle = MODE_COLOR[modeRef.current]
      g.globalAlpha = 0.22
      g.beginPath()
      g.arc(w - 2, headY, 5, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      g.beginPath()
      g.arc(w - 2, headY, 1.6, 0, Math.PI * 2)
      g.fill()
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    : live.toolName !== null
      ? `EXEC · ${live.toolName}`
      : live.partialText !== ''
        ? `⇢ ${live.partialText.slice(-18)}`
        : t(flavor)

  return (
    <div className="cp-line" role="group" aria-label={t('line.aria')} data-chiral-pulse data-mode={ui.mode}>
      <div className="cp-lineBpm">
        {ui.bpm}
        <span className="cp-lineBpmUnit">{t('bpm.unit')}</span>
      </div>

      <canvas ref={canvasRef} className="cp-lineEcg" aria-hidden />

      <div className="cp-lineReadout">
        <div className="cp-lineStatus" title={status}>{status}</div>
      </div>
    </div>
  )
}
