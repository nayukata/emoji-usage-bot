// ランキング表示サービス - 絵文字使用率ランキングを美しく表示する
import { EmbedBuilder, type Client, type TextChannel } from 'discord.js'
import type {
  EmojiStats,
  TypeStats,
  ChannelStats,
  AnalysisResult,
  AnalysisInfo,
  AnalysisSummary,
} from '../types/index'
import { logger } from '../utils/logger'
import { config } from '../utils/config'

/**
 * ランキング順位の絵文字を取得
 */
function getRankEmoji(rank: number): string {
  const rankEmojis: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  }
  return rankEmojis[rank] || `${rank}.`
}

/**
 * 数値をフォーマット（カンマ区切り）
 */
function formatNumber(num: number): string {
  return num.toLocaleString('ja-JP')
}

/**
 * パーセンテージをフォーマット
 */
function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`
}

/**
 * ランキングアイテムを文字列で表現
 */
function formatRankingItem(emoji: EmojiStats, rank: number): string {
  const rankEmoji = getRankEmoji(rank)
  const percentage = formatPercentage(emoji.usageRate)
  const count = formatNumber(emoji.totalCount)

  // 絵文字の表示形式を決定
  const emojiDisplay = emoji.displayFormat

  return `${rankEmoji} ${emojiDisplay} **${count}回** (${percentage})`
}

/**
 * 絵文字ランキングのEmbedを作成
 */
function createRankingEmbed(
  emojiStats: EmojiStats[],
  typeStats: TypeStats,
  summary: AnalysisSummary,
  analysisInfo: AnalysisInfo
): EmbedBuilder {
  const topEmojis = emojiStats.slice(0, config.analysis.topCount)

  const embed = new EmbedBuilder()
    .setTitle('EMOJI 集計ちゃんの絵文字ランキング発表〜♪')
    .setColor(0xff69b4)
    .setTimestamp()

  // 分析期間の情報（実際の分析日数を表示）
  const actualDays = analysisInfo.actualDays || config.analysis.days
  const periodInfo =
    `**調べた期間**: ${actualDays}日間だよ〜\n` +
    `**対象チャンネル**: ${config.channels.targets.length}個\n` +
    `**調べたメッセージ数**: ${formatNumber(analysisInfo.totalMessages)}件`

  embed.addFields({ name: '集計ちゃんからの報告', value: periodInfo })

  // サマリー情報
  const summaryInfo =
    `**見つけたリアクション**: ${formatNumber(summary.totalReactions)}個！\n` +
    `**絵文字の種類**: ${formatNumber(summary.uniqueEmojis)}種類\n` +
    `**標準絵文字**: ${typeStats.unicode.count}種類 (${formatPercentage(
      typeStats.unicode.percentage
    )})\n` +
    `**カスタム絵文字**: ${typeStats.custom.count}種類 (${formatPercentage(
      typeStats.custom.percentage
    )})`

  embed.addFields({ name: '集計結果だよ〜', value: summaryInfo })

  // ランキング情報
  if (topEmojis.length === 0) {
    embed.addFields({
      name: 'ランキング発表〜',
      value: 'あれれ？リアクションが見つからなかったよ〜',
    })
  } else {
    // 上位10位
    const top10 = topEmojis.slice(0, 10)
    const top10Text = top10
      .map((emoji, index) => formatRankingItem(emoji, index + 1))
      .join('\n')

    embed.addFields({ name: 'TOP 10 発表〜♪', value: top10Text })

    // 11位～20位（存在する場合）
    if (topEmojis.length > 10) {
      const remaining = topEmojis.slice(10)
      const remainingText = remaining
        .map((emoji, index) => formatRankingItem(emoji, index + 11))
        .join('\n')

      embed.addFields({ name: 'TOP 11-20 も発表〜', value: remainingText })
    }

    // カスタム絵文字の情報
    const customEmojis = topEmojis.filter((e) => e.type === 'custom')
    if (customEmojis.length > 0) {
      const customInfo = `このサーバーではカスタム絵文字が${customEmojis.length}種類使われてるよ〜♪\n\n`

      embed.addFields({ name: 'カスタム絵文字について', value: customInfo })
    }
  }

  // 最も人気の絵文字
  if (summary.topEmoji) {
    const topEmoji = summary.topEmoji
    // カスタム絵文字もdisplayFormatを使用
    const topEmojiDisplay = topEmoji.displayFormat
    embed.addFields({
      name: '一番人気の絵文字は〜',
      value: `${topEmojiDisplay} **${formatNumber(
        topEmoji.totalCount
      )}回** も使われてる！すごいね〜♪`,
    })
  }

  embed.setFooter({
    text: `次回更新: ${getNextUpdateTime()} | EMOJI 集計ちゃん♪`,
  })

  return embed
}

/**
 * 次回更新時刻を取得
 */
function getNextUpdateTime(): string {
  // cron式から次回実行時刻を簡易計算（基本的な実装）
  const now = new Date()
  const nextWeek = new Date(now)
  nextWeek.setDate(now.getDate() + ((7 - now.getDay() + 1) % 7))
  nextWeek.setHours(10, 0, 0, 0)

  return nextWeek.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * チャンネル別ランキングEmbedを作成
 */
function createChannelRankingEmbed(
  channelStats: ChannelStats[],
  totalReactions: number
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('チャンネル別リアクションランキング')
    .setColor(0x57f287)
    .setTimestamp()

  if (channelStats.length === 0) {
    embed.addFields({
      name: 'チャンネルランキング',
      value: 'データがありません',
    })
    return embed
  }

  // TOP 5 チャンネル
  const top5Channels = channelStats.slice(0, 5)
  const channelRanking = top5Channels
    .map((channel, index) => {
      const percentage = (
        (channel.totalReactions / totalReactions) *
        100
      ).toFixed(1)
      const channelName =
        channel.channelName ||
        `未知のチャンネル (${channel.channelId.slice(0, 8)}...)`

      return (
        `${getRankEmoji(index + 1)} **${channelName}**\n` +
        `   リアクション数: ${formatNumber(
          channel.totalReactions
        )}個 (${percentage}%)\n` +
        `   絵文字種類: ${formatNumber(channel.uniqueEmojis)}種類\n` +
        `   メッセージ数: ${formatNumber(channel.messageCount)}件`
      )
    })
    .join('\n\n')

  embed.addFields({
    name: 'リアクション数 TOP 5',
    value: channelRanking,
  })

  // サマリー情報
  const summaryInfo =
    `**総チャンネル数**: ${channelStats.length}個\n` +
    `**最も活発なチャンネル**: ${channelStats[0]?.channelName || '不明'}\n` +
    `**平均リアクション/チャンネル**: ${formatNumber(
      Math.round(totalReactions / channelStats.length)
    )}個`

  embed.addFields({
    name: 'チャンネル統計',
    value: summaryInfo,
  })

  return embed
}

/**
 * ランキングレポートを投稿
 */
export async function postRankingReport(
  client: Client<true>,
  analysisResult: AnalysisResult,
  analysisInfo: AnalysisInfo,
  reportChannelId?: string
): Promise<void> {
  try {
    const { emojiStats, typeStats, channelStats, summary } = analysisResult

    // 投稿先チャンネルを取得（指定がなければ設定値を使用）
    const targetChannelId = reportChannelId || config.channels.report
    const channel = await client.channels.fetch(targetChannelId)
    if (!channel) {
      throw new Error(
        `投稿先チャンネル ${config.channels.report} が見つかりません`
      )
    }

    if (!channel.isTextBased()) {
      throw new Error('投稿先チャンネルがテキストチャンネルではありません')
    }

    const textChannel = channel as TextChannel

    logger.info(`ランキングレポートを ${textChannel.name} に投稿中...`)

    // メインのランキングEmbed
    const rankingEmbed = createRankingEmbed(
      emojiStats,
      typeStats,
      summary,
      analysisInfo
    )

    // チャンネルランキングEmbed（データがある場合のみ）
    const messages: { embeds: [EmbedBuilder] }[] = [{ embeds: [rankingEmbed] }]

    if (channelStats.length > 0) {
      const channelEmbed = createChannelRankingEmbed(
        channelStats,
        summary.totalReactions
      )
      messages.push({ embeds: [channelEmbed] })
    }

    // メッセージを投稿
    for (const message of messages) {
      await textChannel.send(message)
      await new Promise((resolve) => setTimeout(resolve, 1000)) // 1秒待機
    }

    logger.info('ランキングレポートの投稿が完了しました')
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string }
    logger.error('ランキングレポート投稿エラー', { error: err.message })

    // 権限エラーの場合はより詳細なメッセージ
    if (err.code === 50001 || err.message?.includes('Missing Access')) {
      throw new Error(
        '投稿先チャンネルへの送信権限がありません。BOTに「メッセージを送信」権限を付与してください。'
      )
    } else if (err.code === 50013) {
      throw new Error(
        '投稿先チャンネルへのアクセス権限がありません。BOTに必要な権限を付与してください。'
      )
    }

    throw error
  }
}

/**
 * ワーストランキングのEmbedを作成
 */
function createWorstRankingEmbed(
  emojiStats: EmojiStats[],
  typeStats: TypeStats,
  summary: AnalysisSummary,
  analysisInfo: AnalysisInfo
): EmbedBuilder {
  // 使用回数が1回以上ある絵文字から、使用率の低い順にソート
  const usedEmojis = emojiStats.filter(emoji => emoji.totalCount > 0)
  const worstEmojis = [...usedEmojis]
    .sort((a, b) => a.usageRate - b.usageRate)
    .slice(0, config.analysis.topCount)

  const embed = new EmbedBuilder()
    .setTitle('EMOJI 集計ちゃんのワーストランキング発表〜')
    .setColor(0x95a5a6)
    .setTimestamp()

  // 分析期間の情報
  const actualDays = analysisInfo.actualDays || config.analysis.days
  const periodInfo =
    `**調べた期間**: ${actualDays}日間だよ〜\n` +
    `**対象チャンネル**: ${config.channels.targets.length}個\n` +
    `**調べたメッセージ数**: ${formatNumber(analysisInfo.totalMessages)}件`

  embed.addFields({ name: '集計ちゃんからの報告', value: periodInfo })

  // サマリー情報
  const summaryInfo =
    `**見つけたリアクション**: ${formatNumber(summary.totalReactions)}個！\n` +
    `**絵文字の種類**: ${formatNumber(summary.uniqueEmojis)}種類\n` +
    `**標準絵文字**: ${typeStats.unicode.count}種類 (${formatPercentage(
      typeStats.unicode.percentage
    )})\n` +
    `**カスタム絵文字**: ${typeStats.custom.count}種類 (${formatPercentage(
      typeStats.custom.percentage
    )})`

  embed.addFields({ name: '集計結果だよ〜', value: summaryInfo })

  // ワーストランキング情報
  if (worstEmojis.length === 0) {
    embed.addFields({
      name: 'ワーストランキング発表〜',
      value: 'あれれ？使用された絵文字が見つからなかったよ〜',
    })
  } else {
    // ワースト10位
    const worst10 = worstEmojis.slice(0, 10)
    const worst10Text = worst10
      .map((emoji, index) => {
        const rank = index + 1
        const emojiDisplay = emoji.displayFormat
        const count = formatNumber(emoji.totalCount)
        const percentage = formatPercentage(emoji.usageRate)
        return `${rank}. ${emojiDisplay} **${count}回** (${percentage})`
      })
      .join('\n')

    embed.addFields({ 
      name: '使用率が少ない絵文字 TOP 10',
      value: worst10Text 
    })

    // 11位～20位（存在する場合）
    if (worstEmojis.length > 10) {
      const remaining = worstEmojis.slice(10)
      const remainingText = remaining
        .map((emoji, index) => {
          const rank = index + 11
          const emojiDisplay = emoji.displayFormat
          const count = formatNumber(emoji.totalCount)
          const percentage = formatPercentage(emoji.usageRate)
          return `${rank}. ${emojiDisplay} **${count}回** (${percentage})`
        })
        .join('\n')

      embed.addFields({ 
        name: 'ワースト 11-20 も発表〜',
        value: remainingText 
      })
    }
  }

  // 最も使用率の低い絵文字
  if (worstEmojis.length > 0) {
    const worstEmoji = worstEmojis[0]
    if (worstEmoji) {
      const worstEmojiDisplay = worstEmoji.displayFormat
      embed.addFields({
        name: '一番使用率が低い絵文字は〜',
        value: `${worstEmojiDisplay} **${formatNumber(
          worstEmoji.totalCount
        )}回** しか使われてない...もっと使ってあげて〜`,
      })
    }
  }

  embed.setFooter({
    text: `みんなでいろんな絵文字を使おうね〜♪ | EMOJI 集計ちゃん♪`,
  })

  return embed
}

/**
 * ワーストランキングレポートを投稿
 */
export async function postWorstRankingReport(
  client: Client<true>,
  analysisResult: AnalysisResult,
  analysisInfo: AnalysisInfo,
  reportChannelId?: string
): Promise<void> {
  try {
    const { emojiStats, typeStats, summary } = analysisResult

    // 投稿先チャンネルを取得（指定がなければ設定値を使用）
    const targetChannelId = reportChannelId || config.channels.report
    const channel = await client.channels.fetch(targetChannelId)
    if (!channel) {
      throw new Error(
        `投稿先チャンネル ${config.channels.report} が見つかりません`
      )
    }

    if (!channel.isTextBased()) {
      throw new Error('投稿先チャンネルがテキストチャンネルではありません')
    }

    const textChannel = channel as TextChannel

    logger.info(`ワーストランキングレポートを ${textChannel.name} に投稿中...`)

    // ワーストランキングEmbed
    const worstRankingEmbed = createWorstRankingEmbed(
      emojiStats,
      typeStats,
      summary,
      analysisInfo
    )

    // メッセージを投稿
    await textChannel.send({ embeds: [worstRankingEmbed] })

    logger.info('ワーストランキングレポートの投稿が完了しました')
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string }
    logger.error('ワーストランキングレポート投稿エラー', { error: err.message })

    // 権限エラーの場合はより詳細なメッセージ
    if (err.code === 50001 || err.message?.includes('Missing Access')) {
      throw new Error(
        '投稿先チャンネルへの送信権限がありません。BOTに「メッセージを送信」権限を付与してください。'
      )
    } else if (err.code === 50013) {
      throw new Error(
        '投稿先チャンネルへのアクセス権限がありません。BOTに必要な権限を付与してください。'
      )
    }

    throw error
  }
}

/**
 * 簡易ランキングテキストを作成（テスト用）
 */
export function createSimpleRankingText(
  emojiStats: EmojiStats[],
  summary: AnalysisSummary
): string {
  if (emojiStats.length === 0) {
    return '絵文字使用率ランキング\n\nリアクションが見つかりませんでした。'
  }

  const top10 = emojiStats.slice(0, 10)
  const rankingText = top10
    .map((emoji, index) => {
      const rank = index + 1
      // displayFormatを使用してカスタム絵文字も正しく表示
      const emojiDisplay = emoji.displayFormat
      return `${rank}. ${emojiDisplay} ${
        emoji.totalCount
      }回 (${formatPercentage(emoji.usageRate)})`
    })
    .join('\n')

  return (
    `**絵文字使用率ランキング (TOP 10)**\n\n${rankingText}\n\n` +
    `**総リアクション数**: ${formatNumber(summary.totalReactions)}個\n` +
    `**絵文字種類数**: ${formatNumber(summary.uniqueEmojis)}種類`
  )
}

/**
 * 簡易ワーストランキングテキストを作成（テスト用）
 */
export function createSimpleWorstRankingText(
  emojiStats: EmojiStats[],
  summary: AnalysisSummary
): string {
  if (emojiStats.length === 0) {
    return '絵文字使用率ワーストランキング\n\nリアクションが見つかりませんでした。'
  }

  // 使用回数が1回以上ある絵文字から、使用率の低い順にソート
  const usedEmojis = emojiStats.filter(emoji => emoji.totalCount > 0)
  const worstEmojis = [...usedEmojis]
    .sort((a, b) => a.usageRate - b.usageRate)
    .slice(0, 10)

  if (worstEmojis.length === 0) {
    return '絵文字使用率ワーストランキング\n\n使用された絵文字が見つかりませんでした。'
  }

  const rankingText = worstEmojis
    .map((emoji, index) => {
      const rank = index + 1
      const emojiDisplay = emoji.displayFormat
      return `${rank}. ${emojiDisplay} ${
        emoji.totalCount
      }回 (${formatPercentage(emoji.usageRate)})`
    })
    .join('\n')

  return (
    `**絵文字使用率ワーストランキング (TOP 10)**\n\n${rankingText}\n\n` +
    `**総リアクション数**: ${formatNumber(summary.totalReactions)}個\n` +
    `**絵文字種類数**: ${formatNumber(summary.uniqueEmojis)}種類`
  )
}
