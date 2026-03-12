// トレンド計算 - 2スナップショット間の差分計算とラベル分類
import type {
  EmojiSnapshotRow,
  EmojiTrend,
  TrendLabel,
  TrendReport,
} from '../types/index'

/**
 * 使用率の差分からトレンドラベルを決定する
 */
export function classifyTrend(rateDiff: number): TrendLabel {
  if (rateDiff >= 3.0) return 'surge'
  if (rateDiff >= 1.0) return 'rising'
  if (rateDiff <= -3.0) return 'plunge'
  if (rateDiff <= -1.0) return 'declining'
  return 'stable'
}

/**
 * トレンドラベルの日本語表示
 */
export function trendLabelToDisplay(label: TrendLabel): string {
  const labels: Record<TrendLabel, string> = {
    surge: '急上昇',
    rising: '上昇',
    stable: '横ばい',
    declining: '下降',
    plunge: '急下降',
    new: 'NEW',
    gone: '消滅',
  }
  return labels[label]
}

/**
 * トレンドラベルのアイコン
 */
export function trendLabelToIcon(label: TrendLabel): string {
  const icons: Record<TrendLabel, string> = {
    surge: '🔥',
    rising: '📈',
    stable: '➡️',
    declining: '📉',
    plunge: '💀',
    new: '🆕',
    gone: '👻',
  }
  return icons[label]
}

/**
 * 2つのスナップショットからトレンドレポートを生成する
 *
 * @param currentEmojis - 最新スナップショットの絵文字データ
 * @param previousEmojis - 前回スナップショットの絵文字データ
 * @param currentDate - 最新スナップショットの日付
 * @param previousDate - 前回スナップショットの日付
 */
export function calculateTrends(
  currentEmojis: EmojiSnapshotRow[],
  previousEmojis: EmojiSnapshotRow[],
  currentDate: string,
  previousDate: string
): TrendReport {
  const previousMap = new Map<string, EmojiSnapshotRow>()
  for (const emoji of previousEmojis) {
    previousMap.set(emoji.identifier, emoji)
  }

  const currentMap = new Map<string, EmojiSnapshotRow>()
  for (const emoji of currentEmojis) {
    currentMap.set(emoji.identifier, emoji)
  }

  const trends: EmojiTrend[] = []

  // 現在のスナップショットに存在する絵文字
  for (const current of currentEmojis) {
    const previous = previousMap.get(current.identifier)

    if (previous) {
      const rateDiff = current.usage_rate - previous.usage_rate
      trends.push({
        identifier: current.identifier,
        name: current.name,
        displayFormat: current.display_format,
        currentCount: current.total_count,
        previousCount: previous.total_count,
        currentRate: current.usage_rate,
        previousRate: previous.usage_rate,
        rateDiff,
        label: classifyTrend(rateDiff),
      })
    } else {
      // 今回のみ存在 → NEW
      trends.push({
        identifier: current.identifier,
        name: current.name,
        displayFormat: current.display_format,
        currentCount: current.total_count,
        previousCount: 0,
        currentRate: current.usage_rate,
        previousRate: 0,
        rateDiff: current.usage_rate,
        label: 'new',
      })
    }
  }

  // 前回のみ存在する絵文字 → 消滅
  for (const previous of previousEmojis) {
    if (!currentMap.has(previous.identifier)) {
      trends.push({
        identifier: previous.identifier,
        name: previous.name,
        displayFormat: previous.display_format,
        currentCount: 0,
        previousCount: previous.total_count,
        currentRate: 0,
        previousRate: previous.usage_rate,
        rateDiff: -previous.usage_rate,
        label: 'gone',
      })
    }
  }

  // rateDiff の絶対値が大きい順にソート
  trends.sort((a, b) => Math.abs(b.rateDiff) - Math.abs(a.rateDiff))

  return { currentDate, previousDate, trends }
}
