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
  | 'line.aria'
  | 'status.stable'
  | 'status.bonded'
  | 'status.chiral'
  | 'status.doom'
  | 'status.keep'
  | 'status.voidout'
  | 'status.odradek'
  | 'status.flatline'

/** English dictionary. */
export const en: Record<ChiralKey, string> = {
  'line.aria': 'BB vital-signs strip — CHIRAL PULSE',
  'status.stable': 'LINK STABLE',
  'status.bonded': 'BB BONDED',
  'status.chiral': 'CHIRAL DENSITY: NOMINAL',
  'status.doom': 'DOOMS LEVEL: 0',
  'status.keep': 'KEEP ON KEEPING ON',
  'status.voidout': 'NO VOIDOUT DETECTED',
  'status.odradek': 'ODRADEK SYNC: OK',
  'status.flatline': '♥ FLATLINE',
}

/** Chinese dictionary. */
export const zh: Record<ChiralKey, string> = {
  'line.aria': 'BB 生命体征走纸 — CHIRAL PULSE 手性脉冲',
  'status.stable': '链路稳定',
  'status.bonded': 'BB 连接完成',
  'status.chiral': '手性密度:正常',
  'status.doom': 'DOOMS 等级:0',
  'status.keep': '继续前进 · KEEP ON KEEPING ON',
  'status.voidout': '未检测到虚爆',
  'status.odradek': '奥卓克同步:正常',
  'status.flatline': '♥ 心脏停跳',
}
