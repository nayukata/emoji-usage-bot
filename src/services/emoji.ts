// 絵文字集計サービス - リアクションデータから絵文字使用率を計算する
import type { Client } from 'discord.js'
import type {
  ReactionData,
  EmojiStats,
  TypeStats,
  ChannelStats,
  AnalysisResult,
  AnalysisSummary,
} from '../types/index'
import { logger } from '../utils/logger'

/**
 * リアクションデータを絵文字別に集計
 */
function aggregateReactionsByEmoji(
  reactions: ReactionData[]
): Omit<
  EmojiStats,
  'usageRate' | 'avgPerMessage' | 'displayFormat' | 'safeName'
>[] {
  const emojiMap = new Map<
    string,
    Omit<
      EmojiStats,
      'usageRate' | 'avgPerMessage' | 'displayFormat' | 'safeName'
    >
  >()

  for (const reaction of reactions) {
    const key = reaction.identifier

    if (emojiMap.has(key)) {
      const existing = emojiMap.get(key)!
      existing.totalCount += reaction.count
      existing.messageCount += 1
      existing.reactions.push(reaction)
    } else {
      emojiMap.set(key, {
        identifier: reaction.identifier,
        name: reaction.name,
        type: reaction.type,
        id: reaction.id,
        animated: reaction.animated,
        totalCount: reaction.count,
        messageCount: 1,
        reactions: [reaction],
      })
    }
  }

  return Array.from(emojiMap.values())
}

/**
 * 絵文字の表示形式を取得
 */
function getEmojiDisplayFormat(
  emoji: Omit<
    EmojiStats,
    'usageRate' | 'avgPerMessage' | 'displayFormat' | 'safeName'
  >,
  client?: Client<true>
): string {
  if (emoji.type === 'unicode') {
    // 標準Unicode絵文字
    return emoji.name
  } else {
    // カスタム絵文字 - 集計データからdiscordFormatを取得
    if (
      emoji.reactions &&
      emoji.reactions.length > 0 &&
      emoji.reactions[0]?.discordFormat
    ) {
      return emoji.reactions[0].discordFormat
    }

    // フォールバック: 手動で形式を作成
    const animatedPrefix = emoji.animated ? 'a' : ''
    return `<${animatedPrefix}:${emoji.name}:${emoji.id}>`
  }
}

/**
 * 絵文字の安全な表示名を取得（Discordメッセージで表示可能な形式）
 */
function getEmojiSafeName(
  emoji: Omit<
    EmojiStats,
    'usageRate' | 'avgPerMessage' | 'displayFormat' | 'safeName'
  >
): string {
  if (emoji.type === 'unicode') {
    return emoji.name
  } else {
    return `:${emoji.name}:`
  }
}

/**
 * 使用率の計算
 */
function calculateUsageStats(
  aggregatedEmojis: Omit<
    EmojiStats,
    'usageRate' | 'avgPerMessage' | 'displayFormat' | 'safeName'
  >[],
  totalReactions: number,
  client?: Client<true>
): EmojiStats[] {
  return aggregatedEmojis.map((emoji) => {
    const usageRate = (emoji.totalCount / totalReactions) * 100
    const avgPerMessage = emoji.totalCount / emoji.messageCount
    const displayFormat = getEmojiDisplayFormat(emoji, client)

    // デバッグログ
    if (emoji.type === 'custom') {
      logger.debug(`絵文字表示形式: ${emoji.name} -> ${displayFormat}`)
    }

    return {
      ...emoji,
      usageRate,
      avgPerMessage,
      displayFormat,
      safeName: getEmojiSafeName(emoji),
    }
  })
}

/**
 * 絵文字をソート（使用回数降順）
 */
function sortEmojisByUsage(emojiStats: EmojiStats[]): EmojiStats[] {
  return emojiStats.sort((a, b) => {
    // 使用回数で降順ソート
    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount
    }
    // 使用回数が同じ場合は名前でソート
    return a.name.localeCompare(b.name)
  })
}

/**
 * 絵文字タイプ別の統計情報を生成
 */
function generateTypeStats(emojiStats: EmojiStats[]): TypeStats {
  const unicodeEmojis = emojiStats.filter((e) => e.type === 'unicode')
  const customEmojis = emojiStats.filter((e) => e.type === 'custom')

  const unicodeTotal = unicodeEmojis.reduce((sum, e) => sum + e.totalCount, 0)
  const customTotal = customEmojis.reduce((sum, e) => sum + e.totalCount, 0)
  const total = unicodeTotal + customTotal

  return {
    unicode: {
      count: unicodeEmojis.length,
      totalUsage: unicodeTotal,
      percentage: total > 0 ? (unicodeTotal / total) * 100 : 0,
    },
    custom: {
      count: customEmojis.length,
      totalUsage: customTotal,
      percentage: total > 0 ? (customTotal / total) * 100 : 0,
    },
    total: {
      count: emojiStats.length,
      totalUsage: total,
    },
  }
}

/**
 * チャンネル別リアクション数を集計
 */
function aggregateReactionsByChannel(
  reactions: ReactionData[],
  client?: Client<true>
): ChannelStats[] {
  const channelMap = new Map<
    string,
    Omit<ChannelStats, 'uniqueEmojis'> & { uniqueEmojis: Set<string> }
  >()

  for (const reaction of reactions) {
    const channelId = reaction.channelId

    if (channelMap.has(channelId)) {
      const existing = channelMap.get(channelId)!
      existing.totalReactions += reaction.count
      existing.uniqueEmojis.add(reaction.identifier)
      existing.messageCount += 1
    } else {
      channelMap.set(channelId, {
        channelId,
        channelName: null, // 後で設定
        totalReactions: reaction.count,
        uniqueEmojis: new Set([reaction.identifier]),
        messageCount: 1,
      })
    }
  }

  // Set を数値に変換してチャンネル名を取得
  const channelStats: ChannelStats[] = Array.from(channelMap.values()).map(
    (stat) => ({
      ...stat,
      uniqueEmojis: stat.uniqueEmojis.size,
    })
  )

  // チャンネル名を取得（可能な場合）
  if (client) {
    for (const stat of channelStats) {
      try {
        const channel = client.channels.cache.get(stat.channelId)
        if (channel && 'name' in channel) {
          stat.channelName = channel.name
        }
      } catch (error) {
        logger.debug(`チャンネル名取得エラー: ${stat.channelId}`)
      }
    }
  }

  return channelStats.sort((a, b) => b.totalReactions - a.totalReactions)
}

/**
 * 絵文字使用率分析のメイン処理
 */
export function analyzeEmojiUsage(
  reactions: ReactionData[],
  client?: Client<true>
): AnalysisResult {
  logger.info('📊 絵文字使用率の分析を開始')

  if (reactions.length === 0) {
    logger.warn('分析対象のリアクションが見つかりませんでした')
    return {
      emojiStats: [],
      typeStats: generateTypeStats([]),
      channelStats: [],
      summary: {
        totalReactions: 0,
        uniqueEmojis: 0,
        topEmoji: null,
      },
    }
  }

  // 絵文字別に集計
  const aggregatedEmojis = aggregateReactionsByEmoji(reactions)
  logger.debug(`${aggregatedEmojis.length} 種類の絵文字を発見`)

  // 使用率計算
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0)
  const emojiStats = calculateUsageStats(
    aggregatedEmojis,
    totalReactions,
    client
  )

  // ソート
  const sortedEmojiStats = sortEmojisByUsage(emojiStats)

  // タイプ別統計
  const typeStats = generateTypeStats(sortedEmojiStats)

  // チャンネル別統計
  const channelStats = aggregateReactionsByChannel(reactions, client)

  // サマリー情報
  const summary: AnalysisSummary = {
    totalReactions,
    uniqueEmojis: sortedEmojiStats.length,
    topEmoji: sortedEmojiStats.length > 0 ? sortedEmojiStats[0] || null : null,
  }

  logger.info('✅ 絵文字使用率の分析が完了')
  logger.debug('分析結果', {
    totalReactions: summary.totalReactions,
    uniqueEmojis: summary.uniqueEmojis,
    unicodeCount: typeStats.unicode.count,
    customCount: typeStats.custom.count,
    channelCount: channelStats.length,
  })

  return {
    emojiStats: sortedEmojiStats,
    typeStats,
    channelStats,
    summary,
  }
}

/**
 * 上位N個の絵文字を取得
 */
export function getTopEmojis(
  emojiStats: EmojiStats[],
  count = 20
): EmojiStats[] {
  return emojiStats.slice(0, count)
}
