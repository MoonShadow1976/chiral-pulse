window.__ModuleLoader__.load({
	id: "chiral-pulse",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/ecg.ts
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
		function bump(phase, center, width, amp) {
			let d = phase - center;
			d -= Math.round(d);
			return amp * Math.exp(-(d * d) / (2 * width * width));
		}
		/**
		* Sample one cardiac cycle at beat phase in [0,1). Output range ≈ [-0.35, 1].
		* @param phase - beat phase, any real value (wrapping is internal).
		* @returns the waveform amplitude at that phase.
		*/
		function ecgValue(phase) {
			return bump(phase, .14, .03, .16) - bump(phase, .3, .011, .26) + bump(phase, .335, .016, 1) - bump(phase, .375, .011, .34) + bump(phase, .52, .048, .26) + bump(phase, .8, .012, .05);
		}
		//#endregion
		//#region src/client/HeartLine.tsx
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
		/** Monitor view height, CSS px. */
		const ECG_HEIGHT = 22;
		/**
		* FIXED paper speed in px/second — the real hospital-monitor invariant.
		* The trace scrolls at this absolute rate no matter the strip width; the
		* width only decides how much history fits on screen. A rate change (42→90)
		* therefore only densifies the beats — it never speeds the paper up, and
		* resizing the window cannot make the trace run faster either.
		*/
		const PAPER_SPEED_PX_PER_SECOND = 30;
		/** Activity window for the step-rate base, ms. */
		const ACTIVITY_WINDOW_MS = 1e4;
		/** Rotating status lines (locale keys), one every STATUS_ROTATE_S ticks. */
		const STATUS_KEYS = [
			"status.stable",
			"status.bonded",
			"status.chiral",
			"status.doom",
			"status.keep",
			"status.voidout",
			"status.odradek"
		];
		const STATUS_ROTATE_S = 4;
		/** BPM boost while the model is streaming a partial (thinking/generating). */
		const BOOST_THINKING = 38;
		/** BPM boost while a tool call is running. */
		const BOOST_TOOL = 52;
		/** BPM boost while the session turn is simply in flight. */
		const BOOST_RUNNING = 10;
		/** BPM floor (a resting BB) and ceiling. */
		const BPM_FLOOR = 42;
		const BPM_CEIL = 150;
		/**
		* How fast the displayed heart rate ramps toward its target, in BPM/second.
		* A hospital monitor updates its HR figure on a ~2-3s rolling average and
		* the trace follows gradually — the rate change reads as a slow ramp, not a
		* snap: 42 → 90 takes (90-42)/6 = 8 seconds of visible densification.
		*/
		const BPM_RAMP_PER_SECOND = 6;
		/** Trace color by activity mode: idle amber, thinking cyan, tool orange, run warm. */
		const MODE_COLOR = {
			idle: "#ffb454",
			think: "#6fdbe2",
			tool: "#ff7a4d",
			run: "#ffc46b",
			flat: "#c0483c"
		};
		/** Tail of the model's in-flight output: last non-empty text/reasoning block, whitespace-flattened. */
		function streamingTail(blocks) {
			for (let i = blocks.length - 1; i >= 0; i -= 1) {
				const text = blocks[i].text;
				if (text !== void 0 && text.trim() !== "") return text.replace(/\s+/g, " ").trim();
			}
			return "";
		}
		/**
		* The CHIRAL PULSE dock entry.
		* @param props - Session lifecycle, Chat, projection hooks, and locale seat.
		* @returns the monitor strip.
		*/
		function HeartLine({ useSession, useChat, useProjection, t }) {
			const stats = useProjection("sessionStats");
			const live = {
				partial: useChat((s) => s.legacy.partial !== null),
				partialText: useChat((s) => s.legacy.partial === null ? "" : streamingTail(s.legacy.partial.blocks)),
				toolName: useChat((s) => s.legacy.runningCalls[0]?.name ?? null),
				running: useSession((s) => s.running),
				error: useSession((s) => s.lastAgentError),
				retrying: useChat((s) => {
					const nodes = s.legacy.nodes;
					for (let i = nodes.length - 1; i >= 0; i -= 1) {
						const n = nodes[i];
						if (n.kind === "model-retry") return n.retryState === "scheduled" && n.time > Date.now() - 12e4;
					}
					return false;
				})
			};
			const steps = stats?.steps ?? 0;
			const bpmRef = (0, react.useRef)(BPM_FLOOR);
			const targetRef = (0, react.useRef)(BPM_FLOOR);
			const samplesRef = (0, react.useRef)([]);
			const lastStepsRef = (0, react.useRef)(steps);
			const liveRef = (0, react.useRef)(live);
			liveRef.current = live;
			const modeRef = (0, react.useRef)("idle");
			const [ui, setUi] = (0, react.useState)({
				bpm: BPM_FLOOR,
				elapsed: 0,
				mode: "idle"
			});
			(0, react.useEffect)(() => {
				if (steps !== lastStepsRef.current) {
					lastStepsRef.current = steps;
					samplesRef.current.push({
						t: performance.now(),
						steps
					});
				}
			}, [steps]);
			(0, react.useEffect)(() => {
				const id = window.setInterval(() => {
					const now = performance.now();
					const samples = samplesRef.current;
					while (samples.length > 0 && now - samples[0].t > ACTIVITY_WINDOW_MS) samples.shift();
					const first = samples[0];
					const span = first === void 0 ? 0 : now - first.t;
					const delta = first === void 0 ? 0 : lastStepsRef.current - first.steps;
					const perMinute = span > 0 ? delta / span * 6e4 : 0;
					const base = Math.min(BPM_CEIL, Math.max(BPM_FLOOR, 42 + perMinute * 6));
					const act = liveRef.current;
					targetRef.current = act.retrying ? 0 : Math.min(BPM_CEIL, Math.max(BPM_FLOOR, base + (act.toolName !== null ? BOOST_TOOL : 0) + (act.partial ? BOOST_THINKING : 0) + (act.running ? BOOST_RUNNING : 0)));
					const mode = act.retrying ? "flat" : act.toolName !== null ? "tool" : act.partial ? "think" : act.running ? "run" : "idle";
					modeRef.current = mode;
					setUi((current) => ({
						bpm: Math.round(bpmRef.current),
						elapsed: current.elapsed + 1,
						mode
					}));
				}, 1e3);
				return () => {
					window.clearInterval(id);
				};
			}, []);
			const canvasRef = (0, react.useRef)(null);
			const ctxRef = (0, react.useRef)(null);
			const widthRef = (0, react.useRef)(640);
			const dprRef = (0, react.useRef)(1);
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (canvas === null) return;
				const ctx = canvas.getContext("2d");
				if (ctx === null) return;
				ctxRef.current = ctx;
				const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				const applySize = () => {
					const dpr = window.devicePixelRatio || 1;
					dprRef.current = dpr;
					canvas.width = Math.max(120, Math.round(widthRef.current * dpr));
					canvas.height = Math.round(ECG_HEIGHT * dpr);
				};
				applySize();
				const observer = new ResizeObserver((entries) => {
					const width = Math.max(120, Math.round(entries[0]?.contentRect.width ?? 640));
					if (width !== widthRef.current) {
						widthRef.current = width;
						applySize();
						if (reduced) paint(performance.now());
					}
				});
				observer.observe(canvas);
				let displayNow = 0;
				let lastPaintReal = 0;
				let framePeriodMs = 16.7;
				let traceCache = [];
				let lastScanX = -1;
				let phaseAcc = 0;
				let phaseHistory = [];
				const phaseAt = (tX) => {
					const arr = phaseHistory;
					if (arr.length === 0) return 0;
					if (tX <= arr[0].t) return arr[0].phase;
					const last = arr[arr.length - 1];
					if (tX >= last.t) return last.phase;
					let lo = 0;
					let hi = arr.length - 1;
					while (hi - lo > 1) {
						const m = lo + hi >> 1;
						if (arr[m].t <= tX) lo = m;
						else hi = m;
					}
					const a = arr[lo];
					const b = arr[hi];
					return a.phase + (tX - a.t) / (b.t - a.t) * (b.phase - a.phase);
				};
				const paint = (now) => {
					if (lastPaintReal === 0) {
						lastPaintReal = now;
						displayNow = now;
					}
					const realDt = Math.max(0, (now - lastPaintReal) / 1e3);
					lastPaintReal = now;
					if (realDt > 0 && realDt < .05) framePeriodMs = realDt * 1e3;
					const dt = framePeriodMs / 1e3;
					displayNow += dt * 1e3;
					const diff = targetRef.current - bpmRef.current;
					const step = BPM_RAMP_PER_SECOND * dt;
					if (diff > step) bpmRef.current += step;
					else if (diff < -step) bpmRef.current -= step;
					else bpmRef.current = targetRef.current;
					const c = canvasRef.current;
					const g = ctxRef.current;
					if (c === null || g === null) return;
					const dpr = dprRef.current;
					const w = widthRef.current;
					const h = ECG_HEIGHT;
					const wantW = Math.round(w * dpr);
					const wantH = Math.round(h * dpr);
					if (c.width !== wantW || c.height !== wantH) {
						c.width = wantW;
						c.height = wantH;
					}
					g.setTransform(dpr, 0, 0, dpr, 0, 0);
					g.clearRect(0, 0, w, h);
					const tNow = displayNow / 1e3;
					const secondsPerPixel = 1 / PAPER_SPEED_PX_PER_SECOND;
					const mid = h / 2;
					const amp = h * .5;
					const wander = .05 * Math.sin(tNow * .6) + .035 * Math.sin(tNow * 1.7 + 1.3);
					const bpm = bpmRef.current;
					const flatline = targetRef.current === 0;
					const sweepPeriod = w / PAPER_SPEED_PX_PER_SECOND;
					const tInSweep = (tNow % sweepPeriod + sweepPeriod) % sweepPeriod;
					const scanX = w - tInSweep * PAPER_SPEED_PX_PER_SECOND;
					const scanXInt = Math.round(scanX);
					if (phaseHistory.length === 0) {
						phaseAcc = tNow * bpm / 60;
						phaseHistory.push({
							t: tNow - 2 * sweepPeriod - 2,
							phase: (tNow - 2 * sweepPeriod - 2) * bpm / 60
						});
						phaseHistory.push({
							t: tNow,
							phase: phaseAcc
						});
					} else {
						phaseAcc += bpm / 60 * dt;
						phaseHistory.push({
							t: tNow,
							phase: phaseAcc
						});
					}
					const lookback = 2 * sweepPeriod + 2;
					while (phaseHistory.length > 2 && phaseHistory[0].t < tNow - lookback) phaseHistory.shift();
					const yNow = (x) => {
						if (flatline) return mid;
						let v = -Infinity;
						for (let i = 0; i < 4; i += 1) {
							const s = ecgValue((phaseAt(tNow - tInSweep - (w - (x + i * .25)) * secondsPerPixel) % 1 + 1) % 1);
							if (s > v) v = s;
						}
						return mid - (v + wander) * amp;
					};
					if (traceCache.length !== w + 1) {
						traceCache = new Array(w + 1);
						for (let x = 0; x <= w; x += 1) traceCache[x] = yNow(x);
						lastScanX = scanXInt;
					} else if (lastScanX > scanXInt) {
						for (let x = scanXInt; x <= lastScanX && x <= w; x += 1) traceCache[x] = yNow(x);
						lastScanX = scanXInt;
					} else if (lastScanX < scanXInt) {
						traceCache[scanXInt] = yNow(scanXInt);
						lastScanX = scanXInt;
					} else lastScanX = scanXInt;
					g.beginPath();
					for (let x = 0; x <= w; x += 1) {
						const y = traceCache[x];
						if (x === 0) g.moveTo(x + 3, y);
						else g.lineTo(x + 3, y);
					}
					g.globalAlpha = .1;
					g.strokeStyle = "rgba(111, 219, 226, 1)";
					g.lineWidth = 1;
					g.stroke();
					g.globalAlpha = 1;
					g.beginPath();
					for (let x = 0; x <= w; x += 1) {
						const y = traceCache[x];
						if (x === 0) g.moveTo(x, y);
						else g.lineTo(x, y);
					}
					g.strokeStyle = MODE_COLOR[modeRef.current];
					g.lineWidth = 1.4;
					g.lineJoin = "round";
					g.lineCap = "round";
					g.stroke();
					g.fillStyle = "rgba(255, 180, 84, 0.16)";
					g.fillRect(scanX - 5, 0, 10, h);
					g.fillStyle = "rgba(255, 224, 190, 0.95)";
					g.fillRect(scanX - 1, 0, 2, h);
				};
				if (reduced) {
					paint(performance.now());
					return () => {
						observer.disconnect();
					};
				}
				let raf = 0;
				const loop = (now) => {
					raf = requestAnimationFrame(loop);
					paint(now);
				};
				raf = requestAnimationFrame(loop);
				return () => {
					observer.disconnect();
					cancelAnimationFrame(raf);
				};
			}, []);
			const flavor = STATUS_KEYS[Math.floor(ui.elapsed / STATUS_ROTATE_S) % STATUS_KEYS.length];
			const status = live.error !== null ? `⚠ ${live.error.slice(0, 16)}` : live.retrying ? t("status.flatline") : live.toolName !== null ? `EXEC · ${live.toolName}` : live.partialText !== "" ? `⇢ ${live.partialText.slice(-18)}` : t(flavor);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "cp-line",
				role: "group",
				"aria-label": t("line.aria"),
				"data-chiral-pulse": true,
				"data-mode": ui.mode,
				"data-rev": "20",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "cp-lineBpm",
						children: ui.bpm
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "cp-lineEcgWrap",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
							ref: canvasRef,
							className: "cp-lineEcg",
							"aria-hidden": true
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "cp-lineReadout",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "cp-lineStatus",
							title: status,
							children: status
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* CHIRAL PULSE — dictionary namespace.
		*
		* The DS monitor idiom stays English in both locales (it is part of the
		* aesthetic: "LINK STABLE", "TIME TO COMPLETION"); the zh side translates
		* the labels a user actually reads.
		*/
		/** Dictionary namespace owned by this plugin. */
		const NS = "chiral";
		/** English dictionary. */
		const en = {
			"line.aria": "BB vital-signs strip — CHIRAL PULSE",
			"status.stable": "LINK STABLE",
			"status.bonded": "BB BONDED",
			"status.chiral": "CHIRAL DENSITY: NOMINAL",
			"status.doom": "DOOMS LEVEL: 0",
			"status.keep": "KEEP ON KEEPING ON",
			"status.voidout": "NO VOIDOUT DETECTED",
			"status.odradek": "ODRADEK SYNC: OK",
			"status.flatline": "♥ FLATLINE"
		};
		/** Chinese dictionary. */
		const zh = {
			"line.aria": "BB 生命体征走纸 — CHIRAL PULSE 手性脉冲",
			"status.stable": "链路稳定",
			"status.bonded": "BB 连接完成",
			"status.chiral": "手性密度:正常",
			"status.doom": "DOOMS 等级:0",
			"status.keep": "继续前进 · KEEP ON KEEPING ON",
			"status.voidout": "未检测到虚爆",
			"status.odradek": "奥卓克同步:正常",
			"status.flatline": "♥ 心脏停跳"
		};
		//#endregion
		//#region src/client/style.ts
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
		const CHIRAL_CSS = `
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
  /* Setting rows / select chips (language, agent preset, model, permissions…)
     paint from these; without an override they stay the LIGHT theme's
     near-white and produce white-on-white text. */
  --dsw-alias-bg-module-platform: rgb(15, 20, 27);
  --dsw-alias-bg-multi-select: rgb(18, 24, 32);
  --dsw-alias-fill-tsp-secondary: rgb(18, 24, 32);

  /* text: cold blue-grey */
  --dsw-alias-label-primary: rgb(235, 240, 246);
  --dsw-alias-label-secondary: rgb(178, 190, 205);
  --dsw-alias-label-tertiary: rgb(140, 153, 170);
  --dsw-alias-label-caption: rgb(108, 122, 141);
  --dsw-alias-label-dimmed: rgb(94, 108, 127);
  --dsw-alias-label-primary-dimmed: rgb(205, 213, 222);
  --dsw-alias-label-primary-inverted: rgb(20, 26, 35);
  --dsw-alias-label-primary-foreground: rgb(13, 17, 23);
  --dsw-alias-label-primary-bluish: rgb(200, 214, 232);
  --dsw-alias-brand-text: rgb(235, 240, 246);
  --dsw-alias-brand-primary: rgb(103, 158, 254);
  --dsw-alias-brand-primary-invert: rgb(235, 240, 246);

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
  /* Contrast fill (attachment rail): pale case + DARK inverted ink — the
     wordmark badge and toasts also ride label-primary-inverted, so the pair
     (pale fill, dark ink) stays readable everywhere. */
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
  /* Business tint (hero "preview" badge et al.): dark case so the pale
     primary-bluish ink stays readable — the light-theme default is near-white. */
  --dsw-alias-state-business-tertiary: rgb(26, 34, 46);
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
  /* flex: none — the hero (blank-session) composer column squeezes its
     children on short viewports; the monitor strip must never shrink. */
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 26px;
  min-height: 26px;
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
  /* Fixed width: a 3-digit readout (42 → 150) must not widen the block and
     squeeze the paper area — that would shrink the trace window and pull the
     left edge rightward as the rate climbs. */
  flex: none;
  width: 48px;
  text-align: center;
  font-size: 16px;
  line-height: 1;
  letter-spacing: 0.5px;
  color: var(--cp-amber-bright);
  text-shadow: 0 0 10px rgba(255, 180, 84, 0.5);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cp-lineEcgWrap {
  /* basis 0 + grow: the paper area takes exactly the flex-allocated width;
     never shrink (a squeezed strip would shrink the canvas bitmap and make
     the trace speed depend on the window width). */
  flex: 1 1 0;
  min-width: 100px;
  height: 22px;
  position: relative;
  border-radius: 0;
  border: 1px solid rgba(140, 170, 215, 0.16);
  /* Static paper grid lives in CSS; the canvas above it only paints the trace. */
  background:
    repeating-linear-gradient(0deg, rgba(140, 170, 215, 0.07) 0 1px, transparent 1px 11px),
    repeating-linear-gradient(90deg, rgba(140, 170, 215, 0.06) 0 1px, transparent 1px 11px),
    rgba(7, 10, 15, 0.55);
}
/* The canvas fills its wrapper exactly (absolute), so its intrinsic size can
   never distort the flex layout or the trace during remounts. */
.cp-lineEcg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
  background: transparent;
}

.cp-lineReadout {
  flex: none;
  width: 132px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
}
.cp-lineStatus {
  font-size: 8px;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: var(--cp-cyan);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .cp-lineEcg {
    opacity: 0.9;
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
}
[data-composer-seat] textarea:focus {
  caret-color: #ffd9a0;
}
/* Composer seat: squared, no extra frame — a visible outline on the big hero
   card read as a jarring border. */
[data-composer-seat] {
  border-radius: 0;
}

/* ────────────────────────────────────────────────────────────────────────
   Dialogs, menus, tooltips, toasts — the floating DS surfaces
   ──────────────────────────────────────────────────────────────────────── */
[role="dialog"] {
  border: 1px solid rgba(255, 180, 84, 0.35) !important;
  /* Inner hairline frame — the DS double-cased panel. */
  outline: 1px solid rgba(140, 170, 215, 0.22);
  outline-offset: -6px;
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

/* Toast (the only alert portaled straight onto body): DS gold badge —
   amber case, dark ink, chamfered. Inline error rows keep the dark case
   above; this rule wins for the fixed top-center banner. */
body > [role="alert"] {
  border: 1px solid rgba(255, 196, 120, 0.7) !important;
  border-radius: 0 !important;
  background: linear-gradient(180deg, #ffbe6b, #e09a3c) !important;
  color: rgb(28, 18, 6) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    0 10px 32px rgba(0, 0, 0, 0.5) !important;
  clip-path: polygon(
    10px 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%,
    0 10px
  );
}

/* Session-header action + utility buttons (Session log, jobs…):
   DS chamfered buttons. Session log lives in .utilities, jobs in .actions. */
[data-slot="conversation.session.header.actions"] button,
[data-slot="conversation.session.header.utilities"] button {
  border-radius: 0 !important;
  clip-path: polygon(
    6px 0,
    100% 0,
    100% calc(100% - 6px),
    calc(100% - 6px) 100%,
    0 100%,
    0 6px
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Sidebar: DS hairline on the conversation-history column
   ──────────────────────────────────────────────────────────────────────── */
[data-sidebar-collapsed] > div:first-child {
  border-right: 1px solid rgba(140, 170, 215, 0.22);
  box-shadow: inset -1px 0 0 rgba(255, 180, 84, 0.06);
}

/* Sidebar buttons (New Session etc.): DS chamfered corners. */
[data-slot="sidebar"] button {
  border-radius: 0 !important;
  clip-path: polygon(
    6px 0,
    100% 0,
    100% calc(100% - 6px),
    calc(100% - 6px) 100%,
    0 100%,
    0 6px
  );
}

/* Workspace rows (workspaces, sessions, groups): DS chamfered entries. */
[role="treeitem"] {
  border-radius: 0 !important;
  clip-path: polygon(
    5px 0,
    100% 0,
    100% calc(100% - 5px),
    calc(100% - 5px) 100%,
    0 100%,
    0 5px
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

`;
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot registry and the locale service. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: register dictionaries, inject the DS sheet and the
		* atmosphere overlays, and dock the heartbeat strip under the composer.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "chiral-pulse: dictionaries");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "chiral-pulse";
				tag.textContent = CHIRAL_CSS;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, "chiral-pulse: styles");
			ctx.effect(() => {
				const nodes = [
					{
						className: "cp-atmo cp-atmo-scanlines",
						label: "scanlines"
					},
					{
						className: "cp-atmo cp-atmo-lattice",
						label: "lattice"
					},
					{
						className: "cp-atmo cp-atmo-vignette",
						label: "vignette"
					}
				].map(({ className }) => {
					const el = document.createElement("div");
					el.className = className;
					el.setAttribute("aria-hidden", "true");
					document.body.appendChild(el);
					return el;
				});
				return () => {
					for (const el of nodes) el.remove();
				};
			}, "chiral-pulse: atmosphere");
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "chiral-pulse",
				order: 20,
				locale: NS
			}, HeartLine));
		}
		//#endregion
		exports.HeartLine = HeartLine;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map