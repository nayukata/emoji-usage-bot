// コマンド処理 - ユーザーからのコマンドを処理する
import type { Client, Message, TextChannel } from 'discord.js'
import type { AnalysisResult, TestAnalysisResult } from '../types/index'
import { fetchMessagesAndReactions } from '../services/message'
import { analyzeEmojiUsage } from '../services/emoji'
import { postRankingReport, createSimpleRankingText } from '../services/ranking'
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
        await textChannel.send('✨ 絵文字の分析を始めるね〜！お待ちください♪')
        if (message.client.isReady()) {
          await executeEmojiAnalysis(message.client)
        }
        break

      case 'days': {
        const days = validateNumberInput(args[1] || '', 1, 365)
        if (!days) {
          await textChannel.send(
            '❌ 日数は1〜365で指定してね！例: `!emoji days 30` だよ〜'
          )
          break
        }

        await textChannel.send(
          `過去${days}日間の絵文字を調べるね〜！ちょっと待ってて♪`
        )
        if (message.client.isReady()) {
          await executeCustomAnalysis(message.client, days, true)
        }
        break
      }

      case 'months': {
        const months = validateNumberInput(args[1] || '', 1, 12)
        if (!months) {
          await textChannel.send(
            '❌ 月数は1〜12で指定してね！例: `!emoji months 3` だよ〜'
          )
          break
        }

        const days = months * 30 // 概算
        await textChannel.send(
          `✨ 過去${months}ヶ月間（約${days}日間）の絵文字を調べるね〜！がんばる♪`
        )
        if (message.client.isReady()) {
          await executeCustomAnalysis(message.client, days, true)
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

      case 'help': {
        const helpText = `
**EMOJI 集計ちゃん - コマンド一覧だよ〜♪**

\`!emoji run\` - 設定期間で絵文字分析するよ〜！
\`!emoji days <日数>\` - 指定した日数分を調べるよ〜（例: \`!emoji days 30\`）
\`!emoji months <月数>\` - 指定した月数分を調べるよ〜（例: \`!emoji months 3\`）
\`!emoji test\` - テスト分析をやってみるよ〜（1日分）
\`!emoji help\` - このヘルプを表示するよ〜

💕 **集計ちゃんの設定**
**自動実行スケジュール**: ${config.schedule.cron}
**デフォルト集計期間**: ${config.analysis.days}日間
**対象チャンネル**: ${config.channels.targets.length}個

✨ **使用例:**
• \`!emoji days 7\` → 過去1週間の絵文字を調べるよ〜
• \`!emoji days 30\` → 過去1ヶ月の絵文字を調べるよ〜
• \`!emoji months 1\` → 過去1ヶ月の絵文字を調べるよ〜
• \`!emoji months 6\` → 過去6ヶ月の絵文字を調べるよ〜

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
