/**
 * HeartLine — the CHIRAL PULSE monitor strip, docked under the composer
 * stats (`conversation.composer.dock`), where the session's data already
 * lives. A 26px "monitor paper feed": the scrolling ECG waveform is the
 * hero, flanked by the BPM read and the status clock. No duplicated
 * figures — StatsLine already shows turns/tokens; this strip only carries
 * the pulse.
 *
 * The pulse is LIVE, not decorative:
 *  - `partial`  non-null → the model is thinking/generating → +38 BPM
 *  - `runningCalls` non-empty → a tool is executing → +52 BPM
 *  - `running` (session turn in flight) → +10 BPM
 *  - otherwise the 10s step-window activity rate sets the base (~42 idle)
 * The BPM target is smoothed with a lerp, so the rhythm accelerates the
 * moment a thought starts and eases back down when the work lands.
 *
 * Perf: the line is drawn by a rAF loop writing SVG attributes directly —
 * React re-renders only on snapshot/tick/resize changes.
 */
import { useEffect, useRef, useState } from 'react'
import type {
  PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionProjectionMap } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: merges the sessionStats key into SessionProjectionMap.
import type {} from '@deepseek-ai/dsh-session-stats/client'
import { buildEcgFrame, bpmForActivity } from './ecg.ts'
import type { ChiralKey } from './locales.ts'
import { NS } from './locales.ts'

/** Full props: the input-dock runtime seat plus the locale seat. */
export type HeartLineProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<typeof NS>

/** Monitor view height, user units (= CSS px). */
const ECG_HEIGHT = 22
/** Seconds of signal shown across the window (fixed paper speed). */
const ECG_WINDOW = 5
/** Sampling step, user units. */
const ECG_STEP = 1
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

/**
 * The CHIRAL PULSE dock entry.
 * @param props - runtime seat (useSession, useProjection) plus the locale seat.
 * @returns the monitor strip.
 */
export function HeartLine({ useSession, useProjection, t }: HeartLineProps) {
  const stats = useProjection('sessionStats') as SessionProjectionMap['sessionStats'] | undefined
  // Live activity: model streaming, tools executing, turn in flight.
  const activity = useSession(s => ({
    partial: s.partial !== null,
    calls: s.runningCalls.length,
    running: s.running,
  }))

  const steps = stats?.steps ?? 0

  // ── BPM engine: step-window base + live activity boost ────────────────
  const bpmRef = useRef(BPM_FLOOR)
  const samplesRef = useRef<StepSample[]>([])
  const lastStepsRef = useRef(steps)
  const activityRef = useRef(activity)
  activityRef.current = activity
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
      const base = bpmForActivity(perMinute)
      const act = activityRef.current
      const boost = (act.calls > 0 ? BOOST_TOOL : 0)
        + (act.partial ? BOOST_THINKING : 0)
        + (act.running ? BOOST_RUNNING : 0)
      const target = Math.min(BPM_CEIL, Math.max(BPM_FLOOR, base + boost))
      bpmRef.current += (target - bpmRef.current) * 0.14
      const mode: Mode = act.calls > 0 ? 'tool' : act.partial ? 'think' : act.running ? 'run' : 'idle'
      modeRef.current = mode
      setUi(current => ({
        bpm: Math.round(bpmRef.current),
        elapsed: current.elapsed + 1,
        mode,
      }))
    }, 1_000)
    return () => { window.clearInterval(id) }
  }, [])

  // ── ECG line: rAF loop writing SVG attributes directly ────────────────
  const svgRef = useRef<SVGSVGElement>(null)
  const lineRef = useRef<SVGPolylineElement>(null)
  const ghostRef = useRef<SVGPolylineElement>(null)
  const headRef = useRef<SVGCircleElement>(null)
  const haloRef = useRef<SVGCircleElement>(null)
  const widthRef = useRef(640)
  const [viewBox, setViewBox] = useState(`0 0 640 ${ECG_HEIGHT}`)

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null) return
    const observer = new ResizeObserver((entries) => {
      const width = Math.max(120, Math.round(entries[0]?.contentRect.width ?? 640))
      if (width !== widthRef.current) {
        widthRef.current = width
        setViewBox(`0 0 ${width} ${ECG_HEIGHT}`)
      }
    })
    observer.observe(svg)

    const paintedModeRef = { current: 'idle' as Mode }
    const paint = (now: number): void => {
      const frame = buildEcgFrame(now, bpmRef.current, widthRef.current, ECG_HEIGHT, ECG_WINDOW, ECG_STEP)
      lineRef.current?.setAttribute('points', frame.points)
      ghostRef.current?.setAttribute('points', frame.points)
      // Trace color follows the live activity mode; write it only when the
      // mode actually changes (attribute writes on unchanged values still cost).
      if (modeRef.current !== paintedModeRef.current) {
        paintedModeRef.current = modeRef.current
        const stroke = MODE_COLOR[modeRef.current]
        lineRef.current?.setAttribute('stroke', stroke)
        headRef.current?.setAttribute('fill', stroke)
        haloRef.current?.setAttribute('fill', `${stroke}33`)
      }
      const headX = widthRef.current - 2
      const headY = frame.headY.toFixed(1)
      headRef.current?.setAttribute('cx', String(headX))
      headRef.current?.setAttribute('cy', headY)
      haloRef.current?.setAttribute('cx', String(headX))
      haloRef.current?.setAttribute('cy', headY)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paint(performance.now()) // one static frame
      return () => { observer.disconnect() }
    }
    // No throttling: every rAF paints. A 33ms gate made frame intervals
    // alternate 16/33/50ms, which reads as stutter on a scrolling trace.
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

  const flavor = STATUS_KEYS[Math.floor(ui.elapsed / STATUS_ROTATE_S) % STATUS_KEYS.length]

  return (
    <div className="cp-line" role="group" aria-label={t('line.aria')} data-chiral-pulse data-mode={ui.mode}>
      <div className="cp-lineBpm">
        {ui.bpm}
        <span className="cp-lineBpmUnit">{t('bpm.unit')}</span>
      </div>

      <svg
        ref={svgRef}
        className="cp-lineEcg"
        viewBox={viewBox}
        preserveAspectRatio="none"
        aria-hidden
      >
        <polyline ref={ghostRef} className="cp-lineEcgGhost" transform="translate(3 0)" />
        <polyline ref={lineRef} className="cp-lineEcgLine" />
        <circle ref={haloRef} className="cp-lineEcgHeadHalo" cx="638" cy="11" r="5" />
        <circle ref={headRef} className="cp-lineEcgHead" cx="638" cy="11" r="1.6" />
      </svg>

      <div className="cp-lineReadout">
        <div className="cp-lineStatus">{t(flavor)}</div>
      </div>
    </div>
  )
}
