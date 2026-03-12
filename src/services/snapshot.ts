// スナップショット保存 - AnalysisResult を DB に保存するブリッジ
import type {
  AnalysisResult,
  AnalysisInfo,
  DiversityReport,
  TursoConfig,
} from '../types/index'
import {
  insertSnapshot,
  insertEmojiSnapshots,
  insertChannelSnapshots,
} from './database'
import { calculateDiversityReport } from './diversity'
import { logger } from '../utils/logger'

/**
 * 分析結果をスナップショットとしてDBに保存する
 *
 * DB未設定時やエラー時は静かに失敗する（既存機能を妨げない）
 */
export async function saveAnalysisSnapshot(
  tursoConfig: TursoConfig | null,
  analysisResult: AnalysisResult,
  analysisInfo: AnalysisInfo
): Promise<void> {
  if (!tursoConfig) return

  try {
    const today = new Date().toISOString().slice(0, 10)
    const { emojiStats, typeStats, channelStats, summary } = analysisResult

    // 多様性指数を計算
    const counts = emojiStats.map((e) => e.totalCount)
    let diversity: DiversityReport | null = null
    if (counts.length > 0) {
      diversity = calculateDiversityReport(counts)
    }

    // snapshots テーブルに保存
    const snapshotId = await insertSnapshot(tursoConfig, {
      snapshot_date: today,
      period_days: analysisInfo.actualDays,
      total_messages: analysisInfo.totalMessages,
      total_reactions: summary.totalReactions,
      unique_emojis: summary.uniqueEmojis,
      unicode_count: typeStats.unicode.count,
      unicode_usage: typeStats.unicode.totalUsage,
      custom_count: typeStats.custom.count,
      custom_usage: typeStats.custom.totalUsage,
      diversity_entropy: diversity?.entropy ?? null,
      diversity_entropy_normalized: diversity?.entropyNormalized ?? null,
      diversity_gini: diversity?.gini ?? null,
    })

    if (snapshotId === null) return

    // emoji_snapshots に保存
    await insertEmojiSnapshots(
      tursoConfig,
      snapshotId,
      emojiStats.map((e) => ({
        identifier: e.identifier,
        name: e.name,
        type: e.type,
        emoji_id: e.id,
        animated: e.animated ? 1 : 0,
        total_count: e.totalCount,
        message_count: e.messageCount,
        usage_rate: e.usageRate,
        avg_per_message: e.avgPerMessage,
        display_format: e.displayFormat,
      }))
    )

    // channel_snapshots に保存
    await insertChannelSnapshots(
      tursoConfig,
      snapshotId,
      channelStats.map((c) => ({
        channel_id: c.channelId,
        channel_name: c.channelName,
        total_reactions: c.totalReactions,
        unique_emojis: c.uniqueEmojis,
        message_count: c.messageCount,
      }))
    )

    logger.info(
      `スナップショット保存完了 (date=${today}, emojis=${emojiStats.length}, channels=${channelStats.length})`
    )
  } catch (error) {
    logger.error('スナップショット保存に失敗しました', {
      error: String(error),
    })
  }
}
