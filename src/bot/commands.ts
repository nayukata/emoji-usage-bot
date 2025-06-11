// コマンド処理 - ユーザーからのコマンドを処理する
import type { Client, Message, TextChannel } from 'discord.js'
import type { AnalysisResult, TestAnalysisResult } from '../types/index'
import { fetchMessagesAndReactions } from '../services/message'
import { analyzeEmojiUsage, getUnusedCustomEmojis } from '../services/emoji'
import {
  postRankingReport,
  postWorstRankingReport,
  createSimpleRankingText,
  createSimpleWorstRankingText,
} from '../services/ranking'
import { config } from '../utils/config'
import { logger } from '../utils/logger'

/**
 * 絵文字使用率分析の実行
 */
export async function executeEmojiAnalysis(
  client: Client<true>
): Promise<AnalysisResult> {
  try {
    logger.info('🎯 絵文字使用率分析を実行中...')

    // メッセージとリアクションの取得
    const analysisInfo = await fetchMessagesAndReactions(
      client,
      config.channels.targets,
      config.analysis.days
    )

    // 絵文字使用率の分析
    const analysisResult = analyzeEmojiUsage(analysisInfo.reactions, client)

    // ランキングレポートの投稿
    await postRankingReport(client, analysisResult, analysisInfo)

    logger.info('🎉 絵文字使用率分析が正常に完了しました')
    return analysisResult
  } catch (error: unknown) {
    logger.logError(error as Error, '絵文字使用率分析エラー')
    throw error
  }
}

/**
 * ワーストランキング分析の実行
 */
export async function executeWorstRankingAnalysis(
  client: Client<true>
): Promise<AnalysisResult> {
  try {
    logger.info('🎯 ワーストランキング分析を実行中...')

    // メッセージとリアクションの取得
    const analysisInfo = await fetchMessagesAndReactions(
      client,
      config.channels.targets,
      config.analysis.days
    )

    // 絵文字使用率の分析
    const analysisResult = analyzeEmojiUsage(analysisInfo.reactions, client)

    // ワーストランキングレポートの投稿
    await postWorstRankingReport(client, analysisResult, analysisInfo)

    logger.info('🎉 ワーストランキング分析が正常に完了しました')
    return analysisResult
  } catch (error: unknown) {
    logger.logError(error as Error, 'ワーストランキング分析エラー')
    throw error
  }
}

/**
 * カスタム期間での絵文字分析実行
 */
export async function executeCustomAnalysis(
  client: Client<true>,
  days: number,
  postToChannel = true
): Promise<TestAnalysisResult> {
  try {
    logger.info(`📊 過去${days}日間の絵文字分析を実行中...`)

    const analysisInfo = await fetchMessagesAndReactions(
      client,
      config.channels.targets,
      days
    )

    const analysisResult = analyzeEmojiUsage(analysisInfo.reactions, client)

    if (postToChannel) {
      await postRankingReport(client, analysisResult, analysisInfo)
    }

    logger.info('✅ カスタム期間分析が完了')
    return {
      analysisResult,
      analysisInfo,
      simpleText: createSimpleRankingText(
        analysisResult.emojiStats,
        analysisResult.summary
      ),
    }
  } catch (error: unknown) {
    logger.logError(error as Error, 'カスタム期間分析エラー')
    throw error
  }
}

/**
 * カスタム期間でのワーストランキング分析実行
 */
export async function executeCustomWorstAnalysis(
  client: Client<true>,
  days: number,
  postToChannel = true
): Promise<TestAnalysisResult> {
  try {
    logger.info(`📊 過去${days}日間のワーストランキング分析を実行中...`)

    const analysisInfo = await fetchMessagesAndReactions(
      client,
      config.channels.targets,
      days
    )

    const analysisResult = analyzeEmojiUsage(analysisInfo.reactions, client)

    if (postToChannel) {
      await postWorstRankingReport(client, analysisResult, analysisInfo)
    }

    logger.info('✅ カスタム期間ワースト分析が完了')
    return {
      analysisResult,
      analysisInfo,
      simpleText: createSimpleWorstRankingText(
        analysisResult.emojiStats,
        analysisResult.summary
      ),
    }
  } catch (error: unknown) {
    logger.logError(error as Error, 'カスタム期間ワースト分析エラー')
    throw error
  }
}

/**
 * テスト用の簡易分析実行
 */
export async function executeTestAnalysis(
  client: Client<true>,
  channelId?: string,
  days = 1
): Promise<TestAnalysisResult> {
  try {
    logger.info('🧪 テスト用絵文字分析を実行中...')

    const targetChannels = channelId
      ? [channelId]
      : config.channels.targets.slice(0, 1)

    const analysisInfo = await fetchMessagesAndReactions(
      client,
      targetChannels,
      days
    )

    const analysisResult = analyzeEmojiUsage(analysisInfo.reactions, client)

    logger.info('✅ テスト分析が完了')
    return {
      analysisResult,
      analysisInfo,
      simpleText: createSimpleRankingText(
        analysisResult.emojiStats,
        analysisResult.summary
      ),
    }
  } catch (error: unknown) {
    logger.logError(error as Error, 'テスト分析エラー')
    throw error
  }
}

/**
 * 未使用カスタム絵文字の表示実行
 */
export async function executeUnusedEmojisAnalysis(
  client: Client<true>
): Promise<string> {
  try {
    logger.info('🔍 未使用カスタム絵文字の検出を実行中...')

    // メッセージとリアクションの取得（過去7日間）
    const analysisInfo = await fetchMessagesAndReactions(
      client,
      config.channels.targets,
      config.analysis.days
    )

    // 絵文字使用率の分析
    const analysisResult = analyzeEmojiUsage(analysisInfo.reactions, client)

    // 未使用カスタム絵文字の取得
    const unusedEmojis = getUnusedCustomEmojis(
      client,
      analysisResult.emojiStats
    )

    if (unusedEmojis.length === 0) {
      return '🎉 すごい！すべてのカスタム絵文字が使われてるよ〜！'
    }

    const emojiList = unusedEmojis
      .map(
        (emoji, index) => `${index + 1}. ${emoji.displayFormat} :${emoji.name}:`
      )
      .join('\n')

    return (
      `😢 **最近使われていないカスタム絵文字たち（${unusedEmojis.length}個見つかったよ〜）**\n\n` +
      `${emojiList}\n\n` +
      `この子たちにも愛を注いであげてね🥺\n` +
      `過去${config.analysis.days}日間のデータを調べたよ〜`
    )
  } catch (error: unknown) {
    logger.logError(error as Error, '未使用絵文字検出エラー')
    throw error
  }
}

/**
 * 数値入力の検証
 */
function validateNumberInput(
  input: string,
  min: number,
  max: number
): number | null {
  const num = parseInt(input, 10)
  if (isNaN(num) || num < min || num > max) {
    return null
  }
  return num
}

/**
 * 手動実行コマンドの処理
 */
export async function handleManualCommand(message: Message): Promise<void> {
  const { content, author, channel } = message

  // BOT自身のメッセージは無視
  if (author.bot) return

  // コマンドプレフィックス
  const prefix = '!emoji'
  if (!content.startsWith(prefix)) return

  // TextChannelかどうかチェック
  if (!channel.isTextBased()) {
    logger.warn('コマンドがテキストチャンネル以外で実行されました')
    return
  }

  const textChannel = channel as TextChannel
  const args = content.slice(prefix.length).trim().split(/ +/)
  const command = args[0]

  try {
    switch (command) {
      case 'run':
        await textChannel.send('絵文字の分析を始めるね〜！お待ちください♪')
        if (message.client.isReady()) {
          await executeEmojiAnalysis(message.client)
        }
        break

      case 'worst':
        await textChannel.send(
          'ワーストランキングを分析するね〜！お待ちください♪'
        )
        if (message.client.isReady()) {
          await executeWorstRankingAnalysis(message.client)
        }
        break

      case 'days': {
        const days = validateNumberInput(args[1] || '', 1, 365)
        const isWorst = args[2] === 'worst'

        if (!days) {
          await textChannel.send(
            '❌ 日数は1〜365で指定してね！例: `!emoji days 30` だよ〜\n' +
              'ワーストランキングを見たい場合は `!emoji days 30 worst` だよ〜'
          )
          break
        }

        if (isWorst) {
          await textChannel.send(
            `過去${days}日間のワーストランキングを調べるね〜！ちょっと待ってて♪`
          )
          if (message.client.isReady()) {
            await executeCustomWorstAnalysis(message.client, days, true)
          }
        } else {
          await textChannel.send(
            `過去${days}日間の絵文字を調べるね〜！ちょっと待ってて♪`
          )
          if (message.client.isReady()) {
            await executeCustomAnalysis(message.client, days, true)
          }
        }
        break
      }

      case 'months': {
        const months = validateNumberInput(args[1] || '', 1, 12)
        const isWorst = args[2] === 'worst'

        if (!months) {
          await textChannel.send(
            '❌ 月数は1〜12で指定してね！例: `!emoji months 3` だよ〜\n' +
              'ワーストランキングを見たい場合は `!emoji months 3 worst` だよ〜'
          )
          break
        }

        const days = months * 30 // 概算

        if (isWorst) {
          await textChannel.send(
            `過去${months}ヶ月間（約${days}日間）のワーストランキングを調べるね〜！がんばる♪`
          )
          if (message.client.isReady()) {
            await executeCustomWorstAnalysis(message.client, days, true)
          }
        } else {
          await textChannel.send(
            `過去${months}ヶ月間（約${days}日間）の絵文字を調べるね〜！がんばる♪`
          )
          if (message.client.isReady()) {
            await executeCustomAnalysis(message.client, days, true)
          }
        }
        break
      }

      case 'test': {
        await textChannel.send('✨ テスト分析をやってみるね〜！')
        if (message.client.isReady()) {
          const testResult = await executeTestAnalysis(message.client)
          await textChannel.send(testResult.simpleText)
        }
        break
      }

      case 'unused': {
        await textChannel.send(
          '未使用のカスタム絵文字を調べるね〜！ちょっと待ってて♪'
        )
        if (message.client.isReady()) {
          const result = await executeUnusedEmojisAnalysis(message.client)
          await textChannel.send(result)
        }
        break
      }

      case 'help': {
        const helpText = `
**EMOJI 集計ちゃん - コマンド一覧だよ〜♪**

**🏆 通常ランキング:**
\`!emoji run\` - 設定期間で絵文字分析するよ〜！
\`!emoji days <日数>\` - 指定した日数分を調べるよ〜（例: \`!emoji days 30\`）
\`!emoji months <月数>\` - 指定した月数分を調べるよ〜（例: \`!emoji months 3\`）

**💔 ワーストランキング:**
\`!emoji worst\` - 設定期間でワーストランキングを調べるよ〜！
\`!emoji days <日数> worst\` - 指定期間のワーストランキング（例: \`!emoji days 30 worst\`）
\`!emoji months <月数> worst\` - 指定期間のワーストランキング（例: \`!emoji months 3 worst\`）

**🔍 その他の機能:**
\`!emoji unused\` - 未使用のカスタム絵文字を5個表示するよ〜！
\`!emoji test\` - テスト分析をやってみるよ〜（1日分）
\`!emoji help\` - このヘルプを表示するよ〜

💕 **集計ちゃんの設定**
**自動実行スケジュール**: ${config.schedule.cron || '手動実行のみ'}
**デフォルト集計期間**: ${config.analysis.days}日間
**対象チャンネル**: ${config.channels.targets.length}個

✨ **使用例:**
• \`!emoji days 7\` → 過去1週間の人気ランキング
• \`!emoji days 7 worst\` → 過去1週間のワーストランキング
• \`!emoji months 1\` → 過去1ヶ月の人気ランキング
• \`!emoji months 1 worst\` → 過去1ヶ月のワーストランキング
• \`!emoji unused\` → 最近使われていないカスタム絵文字を発見

頑張って集計するから、お気軽に声をかけてね〜♪
        `
        await textChannel.send(helpText)
        break
      }

      default:
        await textChannel.send(
          '💦 そのコマンドはわからないよ〜。`!emoji help` で確認してね♪'
        )
    }
  } catch (error: unknown) {
    logger.logError(error as Error, 'コマンド処理エラー')
    await textChannel.send(
      '❌ あわわ...何かエラーが起きちゃった！ログを確認してもらえるかな？'
    )
  }
}
