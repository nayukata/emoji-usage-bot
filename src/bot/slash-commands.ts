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
  executeTrendAnalysis,
  executeDiversityAnalysis,
  executeROIAnalysis,
} from './commands'
import {
  trendLabelToDisplay,
  trendLabelToIcon,
} from '../services/trend'
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
        .setName('trend')
        .setDescription('前回と今回の比較トレンドレポートを表示')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('diversity')
        .setDescription('絵文字使用の多様性指数を表示')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('roi')
        .setDescription('カスタム絵文字の採用状況を表示')
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

  const channelId = interaction.channelId

  try {
    switch (subcommand) {
      case 'run':
        await interaction.reply('絵文字の分析を始めるね〜！お待ちください♪')
        await executeEmojiAnalysis(interaction.client as Client<true>, channelId)
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
          true,
          channelId
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
          true,
          channelId
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

      case 'trend': {
        await interaction.reply('トレンドレポートを作成するね〜！')
        const trendReport = await executeTrendAnalysis()

        if (!trendReport) {
          await interaction.followUp(
            'まだデータが足りないよ。2回以上の分析実行後に使えるようになるよ〜'
          )
          break
        }

        const surgeAndRising = trendReport.trends.filter(
          (t) => t.label === 'surge' || t.label === 'rising' || t.label === 'new'
        ).slice(0, 10)
        const decliningAndPlunge = trendReport.trends.filter(
          (t) => t.label === 'plunge' || t.label === 'declining' || t.label === 'gone'
        ).slice(0, 10)

        let trendText =
          `**期間**: ${trendReport.previousDate} → ${trendReport.currentDate}\n\n`

        if (surgeAndRising.length > 0) {
          trendText += '**上昇トレンド**\n'
          trendText += surgeAndRising
            .map(
              (t) =>
                `${trendLabelToIcon(t.label)} ${t.displayFormat} ${trendLabelToDisplay(t.label)} (${t.rateDiff >= 0 ? '+' : ''}${t.rateDiff.toFixed(1)}%)`
            )
            .join('\n')
          trendText += '\n\n'
        }

        if (decliningAndPlunge.length > 0) {
          trendText += '**下降トレンド**\n'
          trendText += decliningAndPlunge
            .map(
              (t) =>
                `${trendLabelToIcon(t.label)} ${t.displayFormat} ${trendLabelToDisplay(t.label)} (${t.rateDiff.toFixed(1)}%)`
            )
            .join('\n')
        }

        if (surgeAndRising.length === 0 && decliningAndPlunge.length === 0) {
          trendText += '全体的に横ばいだよ〜'
        }

        await interaction.followUp(`📊 **絵文字トレンドレポート**\n\n${trendText}`)
        break
      }

      case 'diversity': {
        await interaction.reply('多様性指数を計算するね〜！')
        const { report, history } = await executeDiversityAnalysis(
          interaction.client as Client<true>
        )

        let diversityText =
          `**Shannon Entropy**: ${report.entropy.toFixed(3)} bit\n` +
          `**正規化エントロピー**: ${report.entropyNormalized.toFixed(3)} (0=偏り / 1=均等)\n` +
          `**Gini係数**: ${report.gini.toFixed(3)} (0=平等 / 1=不平等)\n` +
          `**ユニーク絵文字数**: ${report.uniqueCount}\n` +
          `**総使用回数**: ${report.totalUsage}\n`

        // 解釈テキスト
        if (report.entropyNormalized >= 0.8) {
          diversityText += '\n多様な絵文字が満遍なく使われてるよ〜！'
        } else if (report.entropyNormalized >= 0.5) {
          diversityText += '\nまずまずの多様性だね〜'
        } else {
          diversityText += '\n特定の絵文字に偏ってるかも〜もっといろんな絵文字使ってみて！'
        }

        // 推移データがあれば追加
        if (history.length > 1) {
          diversityText += '\n\n**推移**\n'
          for (const h of history.slice(-5)) {
            const norm = h.diversity_entropy_normalized
            diversityText += `${h.snapshot_date}: 正規化エントロピー ${norm !== null ? norm.toFixed(3) : 'N/A'} / Gini ${h.diversity_gini !== null ? h.diversity_gini.toFixed(3) : 'N/A'}\n`
          }
        }

        await interaction.followUp(`🌈 **絵文字多様性レポート**\n\n${diversityText}`)
        break
      }

      case 'roi': {
        await interaction.reply('カスタム絵文字のROIを調べるね〜！')
        const roiReport = await executeROIAnalysis()

        if (!roiReport || roiReport.emojis.length === 0) {
          await interaction.followUp(
            'まだデータが足りないよ。分析を実行してスナップショットを蓄積してね〜'
          )
          break
        }

        const top10 = roiReport.emojis.slice(0, 10)
        const bottom5 = roiReport.emojis.slice(-5).reverse()

        let roiText = `**スナップショット数**: ${roiReport.snapshotCount}\n\n`

        roiText += '**よく使われてるカスタム絵文字 TOP10**\n'
        roiText += top10
          .map(
            (e, i) =>
              `${i + 1}. ${e.displayFormat} ${e.latestCount}回 (${e.latestRate.toFixed(1)}%)`
          )
          .join('\n')

        if (bottom5.length > 0) {
          roiText += '\n\n**あまり使われていないカスタム絵文字**\n'
          roiText += bottom5
            .map(
              (e) =>
                `${e.displayFormat} ${e.latestCount}回 (${e.latestRate.toFixed(1)}%)`
            )
            .join('\n')
        }

        // 履歴があれば推移を表示（上位3件のみ）
        const withHistory = roiReport.emojis
          .filter((e) => e.history.length > 1)
          .slice(0, 3)

        if (withHistory.length > 0) {
          roiText += '\n\n**採用推移**\n'
          for (const e of withHistory) {
            const sparkline = e.history
              .slice(-5)
              .map((h) => `${h.date}: ${h.count}回`)
              .join(' → ')
            roiText += `${e.displayFormat}: ${sparkline}\n`
          }
        }

        await interaction.followUp(`📈 **カスタム絵文字 ROI レポート**\n\n${roiText}`)
        break
      }

      case 'worst':
        await interaction.reply(
          'ワーストランキングの分析を始めるね〜！お待ちください♪'
        )
        await executeWorstRankingAnalysis(interaction.client as Client<true>, channelId)
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
          true,
          channelId
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
          true,
          channelId
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

**📊 分析機能:**
\`/emoji trend\` - 前回と今回の比較トレンドレポート
\`/emoji diversity\` - 絵文字使用の多様性指数を表示
\`/emoji roi\` - カスタム絵文字の採用状況を表示

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
