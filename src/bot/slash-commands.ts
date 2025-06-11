// スラッシュコマンド処理 - Discord スラッシュコマンドの定義と処理
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type CacheType,
} from 'discord.js'
import type { Client } from 'discord.js'
import {
  executeEmojiAnalysis,
  executeWorstRankingAnalysis,
  executeCustomAnalysis,
  executeCustomWorstAnalysis,
  executeTestAnalysis,
  executeUnusedEmojisAnalysis,
} from './commands'
import { config } from '../utils/config'
import { logger } from '../utils/logger'

/**
 * スラッシュコマンド定義
 *
 * @description
 * コマンド一覧
 * - /emoji run             デフォルト期間で絵文字分析を実行
 * - /emoji days <日数>      指定した日数で絵文字分析を実行
 * - /emoji months <月数>    指定した月数で絵文字分析を実行
 * - /emoji test            テスト用の簡易分析を実行（1日分）
 * - /emoji unused          未使用のカスタム絵文字を5個表示
 * - /emoji debug           絵文字表示のデバッグ情報を表示
 * - /emoji help            使い方とコマンド一覧を表示
 */
export const slashCommands = [
  new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('絵文字使用率分析機能')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('run')
        .setDescription('デフォルト期間で絵文字分析を実行')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('days')
        .setDescription('指定した日数で絵文字分析を実行')
        .addIntegerOption((option) =>
          option
            .setName('日数')
            .setDescription('分析する日数（1-365）')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(365)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('months')
        .setDescription('指定した月数で絵文字分析を実行')
        .addIntegerOption((option) =>
          option
            .setName('月数')
            .setDescription('分析する月数（1-12）')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('test')
        .setDescription('テスト用の簡易分析を実行（1日分）')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('unused')
        .setDescription('未使用のカスタム絵文字を5個表示')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('debug')
        .setDescription('絵文字表示のデバッグ情報を表示')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('help').setDescription('使い方とコマンド一覧を表示')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('worst')
        .setDescription('デフォルト期間でワーストランキングを実行')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('worst-days')
        .setDescription('指定した日数でワーストランキングを実行')
        .addIntegerOption((option) =>
          option
            .setName('日数')
            .setDescription('分析する日数（1-365）')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(365)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('worst-months')
        .setDescription('指定した月数でワーストランキングを実行')
        .addIntegerOption((option) =>
          option
            .setName('月数')
            .setDescription('分析する月数（1-12）')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12)
        )
    ),
] as const

/**
 * スラッシュコマンドの処理
 */
export async function handleSlashCommand(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  if (interaction.commandName !== 'emoji') {
    return
  }

  const subcommand = interaction.options.getSubcommand()
  const options = interaction.options

  // コマンド実行をログに記録
  logger.logCommandExecution(
    `emoji ${subcommand}`,
    interaction.user.id,
    interaction.guildId ?? 'DM'
  )

  try {
    switch (subcommand) {
      case 'run':
        await interaction.reply('絵文字の分析を始めるね〜！お待ちください♪')
        await executeEmojiAnalysis(interaction.client as Client<true>)
        break

      case 'days': {
        const days = options.getInteger('日数')
        if (!days) {
          await interaction.reply('❌ 日数の指定が正しくありません')
          break
        }

        await interaction.reply(
          `過去${days}日間の絵文字を調べるね〜！ちょっと待ってて♪`
        )
        await executeCustomAnalysis(
          interaction.client as Client<true>,
          days,
          true
        )
        break
      }

      case 'months': {
        const months = options.getInteger('月数')
        if (!months) {
          await interaction.reply('❌ 月数の指定が正しくありません')
          break
        }

        const days = months * 30 // 概算
        await interaction.reply(
          `過去${months}ヶ月間（約${days}日間）の絵文字を調べるね〜！がんばる♪`
        )
        await executeCustomAnalysis(
          interaction.client as Client<true>,
          days,
          true
        )
        break
      }

      case 'test': {
        await interaction.reply('🧪テスト分析をやってみるね〜！')
        const testResult = await executeTestAnalysis(
          interaction.client as Client<true>
        )

        // デバッグ情報も一緒に表示
        let debugInfo = ''
        if (testResult.analysisResult.emojiStats.length > 0) {
          const topEmoji = testResult.analysisResult.emojiStats[0]
          if (topEmoji) {
            debugInfo =
              `\n\n**🔍 デバッグ情報 (1位の絵文字)**\n` +
              `・名前: ${topEmoji.name}\n` +
              `・タイプ: ${topEmoji.type}\n` +
              `・ID: ${topEmoji.id || 'なし'}\n` +
              `・displayFormat: ${topEmoji.displayFormat}\n` +
              `・safeName: ${topEmoji.safeName}\n` +
              `・animated: ${topEmoji.animated}`
          }
        }

        // チャンネル統計情報も追加
        const { channelStats } = testResult.analysisResult
        if (channelStats.length > 0) {
          const topChannel = channelStats[0]
          if (topChannel) {
            debugInfo +=
              `\n\n**📢 チャンネル統計 (1位)**\n` +
              `・チャンネル名: ${topChannel.channelName || '不明'}\n` +
              `・リアクション数: ${topChannel.totalReactions}個\n` +
              `・絵文字種類: ${topChannel.uniqueEmojis}種類\n` +
              `・メッセージ数: ${topChannel.messageCount}件`
          }
        }

        // コードブロックを使わずに通常のメッセージとして送信
        await interaction.followUp(`${testResult.simpleText}${debugInfo}`)
        break
      }

      case 'debug': {
        await interaction.reply('🔍 絵文字表示のデバッグ情報を調べるよ〜！')

        // 基本的なBOT情報を表示
        const client = interaction.client as Client<true>
        const debugInfo =
          `**🤖 BOT情報**\n` +
          `・BOT名: ${client.user.tag}\n` +
          `・サーバー数: ${client.guilds.cache.size}\n` +
          `・絵文字キャッシュ数: ${client.emojis.cache.size}\n` +
          `・設定チャンネル数: ${config.channels.targets.length}\n\n` +
          `**⚙️ 設定情報**\n` +
          `・分析期間: ${config.analysis.days}日間\n` +
          `・ランキング件数: ${config.analysis.topCount}件\n` +
          `・スケジュール: ${config.schedule.cron}\n` +
          `・開発モード: ${config.development ? 'ON' : 'OFF'}\n\n` +
          `**🔧 簡易テスト**\n` +
          `スラッシュコマンド \`/emoji test\` でテスト分析を実行できるよ〜♪`

        await interaction.followUp(debugInfo)
        break
      }

      case 'worst':
        await interaction.reply(
          'ワーストランキングの分析を始めるね〜！お待ちください♪'
        )
        await executeWorstRankingAnalysis(interaction.client as Client<true>)
        break

      case 'worst-days': {
        const days = options.getInteger('日数')
        if (!days) {
          await interaction.reply('❌ 日数の指定が正しくありません')
          break
        }

        await interaction.reply(
          `過去${days}日間のワーストランキングを調べるね〜！ちょっと待ってて♪`
        )
        await executeCustomWorstAnalysis(
          interaction.client as Client<true>,
          days,
          true
        )
        break
      }

      case 'worst-months': {
        const months = options.getInteger('月数')
        if (!months) {
          await interaction.reply('❌ 月数の指定が正しくありません')
          break
        }

        const days = months * 30 // 概算
        await interaction.reply(
          `過去${months}ヶ月間（約${days}日間）のワーストランキングを調べるね〜！がんばる♪`
        )
        await executeCustomWorstAnalysis(
          interaction.client as Client<true>,
          days,
          true
        )
        break
      }

      case 'unused': {
        await interaction.reply('未使用のカスタム絵文字を調べるね〜！ちょっと待ってて♪')
        if (interaction.client.isReady()) {
          const result = await executeUnusedEmojisAnalysis(interaction.client)
          await interaction.followUp(result)
        }
        break
      }

      case 'help': {
        const helpText = `
✨ **EMOJI 集計ちゃん - 使い方だよ〜♪**

**🏆 通常ランキング:**
\`/emoji run\` - 設定期間で絵文字分析するよ〜！
\`/emoji days <日数>\` - 指定した日数分を調べるよ〜
\`/emoji months <月数>\` - 指定した月数分を調べるよ〜

**💔 ワーストランキング:**
\`/emoji worst\` - 設定期間でワーストランキングを調べるよ〜！
\`/emoji worst-days <日数>\` - 指定期間のワーストランキング
\`/emoji worst-months <月数>\` - 指定期間のワーストランキング

**🔍 その他の機能:**
\`/emoji unused\` - 未使用のカスタム絵文字を5個表示するよ〜！
\`/emoji test\` - テスト分析をやってみるよ〜（1日分）
\`/emoji debug\` - 絵文字表示のデバッグ情報を見るよ〜
\`/emoji help\` - この使い方を表示するよ〜

💕 **集計ちゃんの設定**
**自動実行スケジュール**: ${config.schedule.cron || '手動実行のみ'}
**デフォルト集計期間**: ${config.analysis.days}日間
**対象チャンネル**: ${config.channels.targets.length}個

**使用例:**
• \`/emoji days 7\` → 過去1週間の人気ランキング
• \`/emoji worst-days 7\` → 過去1週間のワーストランキング
• \`/emoji months 1\` → 過去1ヶ月の人気ランキング
• \`/emoji worst-months 1\` → 過去1ヶ月のワーストランキング
• \`/emoji unused\` → 最近使われていないカスタム絵文字を発見

頑張って集計するから、お気軽に声をかけてね〜♪
        `
        await interaction.reply({ content: helpText, ephemeral: true })
        break
      }

      default:
        await interaction.reply('❌ 不明なサブコマンドです')
    }
  } catch (error: unknown) {
    logger.logError(error as Error, 'スラッシュコマンド処理エラー')

    const errorMessage =
      '❌ あわわ...何かエラーが起きちゃった！ログを確認してもらえるかな？'

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage)
    } else {
      await interaction.reply(errorMessage)
    }
  }
}
