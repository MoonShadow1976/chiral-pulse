/**
 * CHIRAL PULSE — dictionary namespace.
 *
 * The DS monitor idiom stays English in both locales (it is part of the
 * aesthetic: "LINK STABLE", "TIME TO COMPLETION"); the zh side translates
 * the labels a user actually reads.
 */

/** Dictionary namespace owned by this plugin. */
export const NS = 'chiral'

/** Dictionary keys of the `chiral` namespace (string-literal union). */
export type ChiralKey =
  | 'pod.aria'
  | 'bpm.unit'
  | 'status.stable'
  | 'status.bonded'
  | 'status.chiral'
  | 'status.doom'
  | 'status.keep'
  | 'status.voidout'
  | 'status.odradek'
  | 'clock.label'
  | 'field.turns'
  | 'field.steps'
  | 'field.ttft'
  | 'field.tps'
  | 'field.tokens'
  | 'field.cache'
  | 'field.knot'
  | 'field.ctx'
  | 'action.expand'
  | 'action.collapse'

/** English dictionary. */
export const en: Record<ChiralKey, string> = {
  'pod.aria': 'BB pod vital-signs monitor — CHIRAL PULSE',
  'bpm.unit': 'BPM',
  'status.stable': 'LINK STABLE',
  'status.bonded': 'BB BONDED',
  'status.chiral': 'CHIRAL DENSITY: NOMINAL',
  'status.doom': 'DOOMS LEVEL: 0',
  'status.keep': 'KEEP ON KEEPING ON',
  'status.voidout': 'NO VOIDOUT DETECTED',
  'status.odradek': 'ODRADEK SYNC: OK',
  'clock.label': 'TIME TO COMPLETION',
  'field.turns': 'TURNS',
  'field.steps': 'STEPS',
  'field.ttft': 'TTFT',
  'field.tps': 'TOK·S⁻¹',
  'field.tokens': 'IN / OUT',
  'field.cache': 'CACHE HIT',
  'field.knot': 'KNOT',
  'field.ctx': 'CONTEXT OCCUPANCY',
  'action.expand': 'Expand vitals',
  'action.collapse': 'Collapse vitals',
}

/** Chinese dictionary. */
export const zh: Record<ChiralKey, string> = {
  'pod.aria': 'BB 舱生命体征监视器 — CHIRAL PULSE 手性脉冲',
  'bpm.unit': '次/分',
  'status.stable': '链路稳定',
  'status.bonded': 'BB 连接完成',
  'status.chiral': '手性密度:正常',
  'status.doom': 'DOOMS 等级:0',
  'status.keep': '继续前进 · KEEP ON KEEPING ON',
  'status.voidout': '未检测到虚爆',
  'status.odradek': '奥卓克同步:正常',
  'clock.label': '完成倒计时',
  'field.turns': '轮次 TURNS',
  'field.steps': '步骤 STEPS',
  'field.ttft': '首字延迟 TTFT',
  'field.tps': '输出速率 TOK·S⁻¹',
  'field.tokens': '输入 / 输出',
  'field.cache': '缓存命中',
  'field.knot': '结 KNOT',
  'field.ctx': '上下文占用',
  'action.expand': '展开生命体征',
  'action.collapse': '收起生命体征',
}
