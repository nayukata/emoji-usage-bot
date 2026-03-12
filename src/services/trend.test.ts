import { describe, it, expect } from 'vitest'
import {
  classifyTrend,
  trendLabelToDisplay,
  trendLabelToIcon,
  calculateTrends,
} from './trend'
import type { EmojiSnapshotRow } from '../types/index'

describe('classifyTrend', () => {
  it('3.0以上は surge', () => {
    expect(classifyTrend(3.0)).toBe('surge')
    expect(classifyTrend(5.0)).toBe('surge')
  })

  it('1.0以上3.0未満は rising', () => {
    expect(classifyTrend(1.0)).toBe('rising')
    expect(classifyTrend(2.9)).toBe('rising')
  })

  it('-1.0〜1.0未満は stable', () => {
    expect(classifyTrend(0)).toBe('stable')
    expect(classifyTrend(0.9)).toBe('stable')
    expect(classifyTrend(-0.9)).toBe('stable')
  })

  it('-3.0超〜-1.0以下は declining', () => {
    expect(classifyTrend(-1.0)).toBe('declining')
    expect(classifyTrend(-2.9)).toBe('declining')
  })

  it('-3.0以下は plunge', () => {
    expect(classifyTrend(-3.0)).toBe('plunge')
    expect(classifyTrend(-5.0)).toBe('plunge')
  })
})

describe('trendLabelToDisplay', () => {
  it('全ラベルに日本語表示がある', () => {
    expect(trendLabelToDisplay('surge')).toBe('急上昇')
    expect(trendLabelToDisplay('rising')).toBe('上昇')
    expect(trendLabelToDisplay('stable')).toBe('横ばい')
    expect(trendLabelToDisplay('declining')).toBe('下降')
    expect(trendLabelToDisplay('plunge')).toBe('急下降')
    expect(trendLabelToDisplay('new')).toBe('NEW')
    expect(trendLabelToDisplay('gone')).toBe('消滅')
  })
})

describe('trendLabelToIcon', () => {
  it('全ラベルにアイコンがある', () => {
    expect(trendLabelToIcon('surge')).toBeTruthy()
    expect(trendLabelToIcon('new')).toBeTruthy()
    expect(trendLabelToIcon('gone')).toBeTruthy()
  })
})

function makeRow(
  overrides: Partial<EmojiSnapshotRow>
): EmojiSnapshotRow {
  return {
    id: 1,
    snapshot_id: 1,
    identifier: 'test',
    name: 'test',
    type: 'unicode',
    emoji_id: null,
    animated: 0,
    total_count: 10,
    message_count: 5,
    usage_rate: 5.0,
    avg_per_message: 2.0,
    display_format: 'test',
    ...overrides,
  }
}

describe('calculateTrends', () => {
  it('両方に存在する絵文字のトレンドを計算する', () => {
    const current = [makeRow({ identifier: 'a', usage_rate: 8.0 })]
    const previous = [makeRow({ identifier: 'a', usage_rate: 5.0 })]

    const report = calculateTrends(current, previous, '2026-03-12', '2026-03-05')
    expect(report.trends).toHaveLength(1)
    expect(report.trends[0]!.rateDiff).toBeCloseTo(3.0)
    expect(report.trends[0]!.label).toBe('surge')
  })

  it('今回のみ存在する絵文字は NEW', () => {
    const current = [makeRow({ identifier: 'new_one', usage_rate: 2.0 })]
    const previous: EmojiSnapshotRow[] = []

    const report = calculateTrends(current, previous, '2026-03-12', '2026-03-05')
    expect(report.trends[0]!.label).toBe('new')
  })

  it('前回のみ存在する絵文字は gone', () => {
    const current: EmojiSnapshotRow[] = []
    const previous = [makeRow({ identifier: 'old_one', usage_rate: 4.0 })]

    const report = calculateTrends(current, previous, '2026-03-12', '2026-03-05')
    expect(report.trends[0]!.label).toBe('gone')
  })

  it('トレンドは rateDiff の絶対値降順でソートされる', () => {
    const current = [
      makeRow({ identifier: 'a', usage_rate: 10.0 }),
      makeRow({ identifier: 'b', usage_rate: 5.5 }),
    ]
    const previous = [
      makeRow({ identifier: 'a', usage_rate: 5.0 }),
      makeRow({ identifier: 'b', usage_rate: 5.0 }),
    ]

    const report = calculateTrends(current, previous, '2026-03-12', '2026-03-05')
    expect(report.trends[0]!.identifier).toBe('a')
    expect(report.trends[1]!.identifier).toBe('b')
  })

  it('空の入力は空のトレンドを返す', () => {
    const report = calculateTrends([], [], '2026-03-12', '2026-03-05')
    expect(report.trends).toHaveLength(0)
  })
})
