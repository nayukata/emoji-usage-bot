// メッセージ取得サービス - チャンネルからメッセージ履歴とリアクションを取得する
import type { Client, TextChannel, Collection, Message } from 'discord.js'
import type { ReactionData, MessageFetchResult } from '../types/index'
import { logger } from '../utils/logger'

/**
 * レート制限を考慮した待機処理
 */
async function rateLimitDelay(
  remaining: number,
  resetAfter: number
): Promise<void> {
  if (remaining < 5) {
    const delay = resetAfter * 1000 + 1000 // 1秒のバッファを追加
    logger.debug(`レート制限対策: ${delay}ms 待機中`)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}

/**
 * 指定期間内のメッセージを取得
 */
async function fetchMessagesInPeriod(
  channel: TextChannel,
  days: number
): Promise<Message[]> {
  const messages: Message[] = []
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  let lastMessageId: string | undefined = undefined
  let hasMoreMessages = true

  logger.debug(
    `チャンネル ${channel.name} から ${days}日間のメッセージを取得開始`
  )

  while (hasMoreMessages) {
    try {
      const options: { limit: number; before?: string } = { limit: 100 }
      if (lastMessageId) {
        options.before = lastMessageId
      }

      const fetchedMessages: Collection<string, Message> =
        await channel.messages.fetch(options)

      if (fetchedMessages.size === 0) {
        hasMoreMessages = false
        break
      }

      // 期間内のメッセージのみフィルタリング
      const validMessages = fetchedMessages.filter(
        (msg) => msg.createdAt >= cutoffDate
      )
      messages.push(...validMessages.values())

      // 期間外のメッセージが含まれている場合は終了
      if (validMessages.size < fetchedMessages.size) {
        hasMoreMessages = false
        break
      }

      lastMessageId = fetchedMessages.last()?.id

      // レート制限対策
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string }
      if (err.code === 50001) {
        logger.warn(`チャンネル ${channel.name} へのアクセス権限がありません`)
        break
      } else if (err.code === 50013) {
        logger.warn(`チャンネル ${channel.name} の履歴読み取り権限がありません`)
        break
      } else {
        logger.error(`メッセージ取得エラー (${channel.name})`, {
          error: err.message,
        })
        throw error
      }
    }
  }

  logger.debug(
    `チャンネル ${channel.name} から ${messages.length} 件のメッセージを取得完了`
  )
  return messages
}

/**
 * メッセージからリアクションデータを抽出
 */
function extractReactionsFromMessage(message: Message): ReactionData[] {
  const reactions: ReactionData[] = []

  if (!message.reactions || message.reactions.cache.size === 0) {
    return reactions
  }

  for (const reaction of message.reactions.cache.values()) {
    const emoji = reaction.emoji

    // 絵文字データを正規化
    const emojiData: ReactionData = {
      // 標準絵文字とカスタム絵文字の区別
      type: emoji.id ? 'custom' : 'unicode',
      // 一意識別子
      identifier: emoji.id || emoji.name || 'unknown',
      // 表示名
      name: emoji.name || 'unknown',
      // カスタム絵文字の場合の追加情報
      id: emoji.id,
      animated: emoji.animated || false,
      // 正しいDiscord形式（toString()を使用）
      discordFormat: emoji.toString(),
      // 絵文字のURL（カスタム絵文字の場合）
      url: emoji.id
        ? `https://cdn.discordapp.com/emojis/${emoji.id}.${
            emoji.animated ? 'gif' : 'png'
          }`
        : null,
      // リアクション数
      count: reaction.count,
      // メッセージ情報
      messageId: message.id,
      channelId: message.channelId,
      timestamp: message.createdAt,
    }

    // デバッグログ
    if (emoji.id) {
      logger.debug(`カスタム絵文字検出: ${emoji.name} -> ${emoji.toString()}`)
    }

    reactions.push(emojiData)
  }

  return reactions
}

/**
 * 複数チャンネルからメッセージとリアクションを取得
 */
export async function fetchMessagesAndReactions(
  client: Client<true>,
  channelIds: string[],
  days: number
): Promise<MessageFetchResult> {
  const allReactions: ReactionData[] = []
  let totalMessages = 0

  logger.logAnalysisStart(channelIds.length, days)

  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId)

      if (!channel) {
        logger.warn(`チャンネル ID ${channelId} が見つかりません`)
        continue
      }

      if (!channel.isTextBased()) {
        logger.warn(
          `チャンネル ${channel.name} はテキストチャンネルではありません`
        )
        continue
      }

      // TextChannelにキャスト（isTextBased()でチェック済み）
      const textChannel = channel as TextChannel

      logger.info(`📥 ${textChannel.name} からメッセージを取得中...`)

      const messages = await fetchMessagesInPeriod(textChannel, days)
      totalMessages += messages.length

      // 各メッセージからリアクションを抽出
      for (const message of messages) {
        const reactions = extractReactionsFromMessage(message)
        allReactions.push(...reactions)
      }

      logger.info(
        `✅ ${textChannel.name}: ${messages.length}件のメッセージ, ${allReactions.length}個のリアクション`
      )
    } catch (error: unknown) {
      logger.error(`チャンネル ${channelId} の処理エラー`, {
        error: (error as Error).message,
      })
      continue
    }
  }

  const totalReactions = allReactions.length
  const uniqueEmojis = new Set(allReactions.map((r) => r.identifier)).size

  logger.logAnalysisComplete(totalMessages, totalReactions, uniqueEmojis)

  return {
    reactions: allReactions,
    totalMessages,
    totalReactions,
    uniqueEmojis,
    actualDays: days, // 実際の分析日数を記録
  }
}
