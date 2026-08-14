/**
 * BBPod — the CHIRAL PULSE monitor, docked above the message composer.
 *
 * The scrolling ECG waveform is the hero. Its heart rate is not decoration:
 * a 10-second sliding window over the session's `sessionStats` step counter
 * drives the BPM — a resting BB sleeps at ~42, a session mid-sprint peaks at
 * 150 — and every real step lands a visible beat. The chassis speaks Death
 * Stranding: HUD corner brackets, scanlines, a chiral lattice, a chiral
 * countdown clock, and a KNOT readout bound to the session id.
 *
 * Data arrives entirely through the session standard kit (useProjection),
 * so the plugin owns no store, no refresh chain, and no event listener.
 * Perf: the line is drawn by a rAF loop writing SVG attributes directly —
 * React re-renders only on projection/tick/resize changes.
 */
import { useEffect, useRef, useState } from 'react'
import type {
  PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionProjectionMap } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: merges the sessionStats key into SessionProjectionMap.
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type {
  ContextPressureProjection, TokenUsageProjection,
} from '@deepseek-ai/dsh-token-meter/client'
import { buildEcgFrame, bpmForActivity } from './ecg.ts'
import type { ChiralKey } from './locales.ts'
import { NS } from './locales.ts'

/** Full props: the input-dock runtime seat plus the locale seat. */
export type BBPodProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<typeof NS>

/** Monitor view height, user units (= CSS px). */
const ECG_HEIGHT = 40
/** Beats visible in the scrolling window. */
const ECG_CYCLES = 2.5
/** Sampling step, user units. */
const ECG_STEP = 2
/** Activity window for BPM estimation, ms. */
const ACTIVITY_WINDOW_MS = 10_000
/** The DS countdown origin: 19:49:19. */
const COUNTDOWN_TOTAL = 19 * 3_600 + 49 * 60 + 19
/** Rotating status lines (locale keys), one every STATUS_ROTATE_S ticks. */
const STATUS_KEYS: readonly ChiralKey[] = [
  'status.stable', 'status.bonded', 'status.chiral', 'status.doom',
  'status.keep', 'status.voidout', 'status.odradek',
]
const STATUS_ROTATE_S = 4
/** Expanded-panel preference key. */
const STORAGE_KEY = 'chiral-pulse.expanded.v1'
/** The R-spike phase in the cardiac cycle; beats fire when it crosses the leading edge. */
const R_PHASE = 0.335

/** Compact token count: 517 / 12.2K / 517K / 1.2M. */
function formatCompact(n: number): string {
  if (n < 1_000) return String(n)
  const scaled = n < 1_000_000 ? n / 1_000 : n / 1_000_000
  const digits = scaled >= 100 ? String(Math.round(scaled)) : String(Math.round(scaled * 10) / 10)
  return `${digits}${n < 1_000_000 ? 'K' : 'M'}`
}

/** Billed input = the three disjoint prompt-side buckets. */
function billedInputTokens(usage: TokenUsageProjection): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

/** Context occupancy percent, or null until both values are known. */
function contextPercent(pressure: ContextPressureProjection | undefined): number | null {
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens
  if (used === undefined || pressure?.contextWindow === undefined) return null
  return Math.min(100, Math.round((used / pressure.contextWindow) * 100))
}

/** HH:MM:SS with zero padding, DS countdown style. */
function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3_600)
  const m = Math.floor((totalSeconds % 3_600) / 60)
  const s = totalSeconds % 60
  const pad = (v: number): string => String(v).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** One activity sample: (time, steps) at a projection update. */
interface StepSample {
  t: number
  steps: number
}

/**
 * The CHIRAL PULSE dock entry.
 * @param props - runtime seat (sessionId, useProjection) plus the locale seat.
 * @returns the monitor pod.
 */
export function BBPod({ sessionId, useProjection, t }: BBPodProps) {
  const stats = useProjection('sessionStats') as SessionProjectionMap['sessionStats'] | undefined
  const usage = useProjection('tokenUsage') as TokenUsageProjection | undefined
  const pressure = useProjection('contextPressure') as ContextPressureProjection | undefined

  const steps = stats?.steps ?? 0

  // ── BPM engine: sliding window over the step counter ──────────────────
  const bpmRef = useRef(48)
  const samplesRef = useRef<StepSample[]>([])
  const lastStepsRef = useRef(steps)
  const [ui, setUi] = useState({ bpm: 48, elapsed: 0 })
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
      const target = bpmForActivity(perMinute)
      bpmRef.current += (target - bpmRef.current) * 0.12
      setUi(current => ({
        bpm: Math.round(bpmRef.current),
        elapsed: current.elapsed + 1,
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
  const glyphRef = useRef<SVGSVGElement>(null)
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

    let lastPaint = 0
    const paint = (now: number): void => {
      const frame = buildEcgFrame(now, bpmRef.current, widthRef.current, ECG_HEIGHT, ECG_CYCLES, ECG_STEP)
      lineRef.current?.setAttribute('points', frame.points)
      ghostRef.current?.setAttribute('points', frame.points)
      const headX = widthRef.current - 2
      const headY = frame.headY.toFixed(1)
      headRef.current?.setAttribute('cx', String(headX))
      headRef.current?.setAttribute('cy', headY)
      haloRef.current?.setAttribute('cx', String(headX))
      haloRef.current?.setAttribute('cy', headY)
      // Beat-synced glyph thump: fire as the R spike crosses the leading edge.
      const beats = (now / 1_000) * (bpmRef.current / 60)
      const phase = beats % 1
      const dtBeats = lastPaint === 0 ? 0 : ((now - lastPaint) / 1_000) * (bpmRef.current / 60)
      const prevPhase = (phase - dtBeats + 1) % 1
      lastPaint = now
      if (prevPhase < R_PHASE && phase >= R_PHASE && glyphRef.current !== null) {
        for (const animation of glyphRef.current.getAnimations()) animation.cancel()
        glyphRef.current.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.16)', filter: 'brightness(1.8)' },
            { transform: 'scale(1)' },
          ],
          { duration: 460, easing: 'ease-out' },
        )
      }
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paint(performance.now()) // one static frame
      return () => { observer.disconnect() }
    }
    let raf = 0
    let last = 0
    const loop = (now: number): void => {
      raf = requestAnimationFrame(loop)
      if (now - last < 33) return // ~30 fps
      last = now
      paint(now)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  // ── Expanded state (persisted) ────────────────────────────────────────
  const [expanded, setExpanded] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) !== '0' } catch { return true }
  })
  const toggle = (): void => {
    setExpanded(current => {
      const next = !current
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch { /* private mode */ }
      return next
    })
  }

  // ── Vitals derivation ─────────────────────────────────────────────────
  const ttft = stats !== undefined && stats.ttftSteps > 0
    ? `${(stats.ttftMs / stats.ttftSteps / 1_000).toFixed(1)}s`
    : '—'
  const tps = stats !== undefined && stats.decodeMs > 0
    ? (stats.decodeTokens / (stats.decodeMs / 1_000)).toFixed(1)
    : '—'
  const billed = usage === undefined ? 0 : billedInputTokens(usage)
  const tokens = usage !== undefined && (billed > 0 || usage.outputTokens > 0)
    ? `${formatCompact(billed)} / ${formatCompact(usage.outputTokens)}`
    : '—'
  const cacheHit = usage !== undefined && billed > 0
    ? `${Math.round((usage.cacheReadTokens / billed) * 100)}%`
    : '—'
  const ctxPct = contextPercent(pressure)
  const clock = COUNTDOWN_TOTAL - (ui.elapsed % (COUNTDOWN_TOTAL + 1))
  const flavor = STATUS_KEYS[Math.floor(ui.elapsed / STATUS_ROTATE_S) % STATUS_KEYS.length]

  return (
    <div className="cp-pod" data-cp-expanded={expanded} role="group" aria-label={t('pod.aria')} data-chiral-pulse>
      <div className="cp-scanlines" aria-hidden />
      <div className="cp-lattice" aria-hidden />

      <button
        type="button"
        className="cp-glyph"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? t('action.collapse') : t('action.expand')}
        title={expanded ? t('action.collapse') : t('action.expand')}
      >
        <svg ref={glyphRef} viewBox="0 0 24 28" aria-hidden>
          <path
            d="M1 14 H6.5 L9 6.5 L12.5 21.5 L15 14 H23"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="cp-glyphLabel">BB</span>
      </button>

      <div className="cp-ecgArea" aria-hidden>
        <div className="cp-ecgCenterline" />
        <svg
          ref={svgRef}
          className="cp-ecg"
          viewBox={viewBox}
          preserveAspectRatio="none"
        >
          <polyline ref={ghostRef} className="cp-ecgGhost" transform="translate(4 0)" />
          <polyline ref={lineRef} className="cp-ecgLine" />
          <circle ref={haloRef} className="cp-ecgHeadHalo" cx="638" cy="20" r="6" />
          <circle ref={headRef} className="cp-ecgHead" cx="638" cy="20" r="1.8" />
        </svg>
      </div>

      <div className="cp-vitals">
        <div className="cp-bpm">
          {ui.bpm}
          <span className="cp-bpmUnit">{t('bpm.unit')}</span>
        </div>
        <div className="cp-status">{t(flavor)}</div>
        <div className="cp-clock">
          {t('clock.label')} {formatCountdown(clock)}
        </div>
      </div>

      <button
        type="button"
        className="cp-toggle"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? t('action.collapse') : t('action.expand')}
      >
        <span className="cp-chevron" aria-hidden>▾</span>
      </button>

      <div className="cp-panel">
        <div className="cp-field">
          <span className="cp-fieldLabel">{t('field.turns')}</span>
          <span className="cp-fieldValue"><strong>{stats?.turns ?? 0}</strong></span>
        </div>
        <div className="cp-field">
          <span className="cp-fieldLabel">{t('field.steps')}</span>
          <span className="cp-fieldValue"><strong>{stats?.steps ?? 0}</strong></span>
        </div>
        <div className="cp-field">
          <span className="cp-fieldLabel">{t('field.ttft')}</span>
          <span className="cp-fieldValue">{ttft}</span>
        </div>
        <div className="cp-field">
          <span className="cp-fieldLabel">{t('field.tps')}</span>
          <span className="cp-fieldValue">{tps}</span>
        </div>
        <div className="cp-field">
          <span className="cp-fieldLabel">{t('field.tokens')}</span>
          <span className="cp-fieldValue">{tokens}</span>
        </div>
        <div className="cp-field">
          <span className="cp-fieldLabel">{t('field.cache')}</span>
          <span className="cp-fieldValue">{cacheHit}</span>
        </div>
        <div className="cp-field">
          <span className="cp-fieldLabel">{t('field.knot')}</span>
          <span className="cp-fieldValue">{sessionId.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {ctxPct !== null && (
        <div className="cp-ctx">
          <span className="cp-ctxLabel">{t('field.ctx')}</span>
          <div className="cp-ctxTrack" role="meter" aria-valuenow={ctxPct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="cp-ctxFill"
              data-cp-hot={ctxPct >= 85}
              style={{ width: `${ctxPct}%` }}
            />
          </div>
          <span className="cp-ctxValue">{ctxPct}%</span>
        </div>
      )}
    </div>
  )
}
