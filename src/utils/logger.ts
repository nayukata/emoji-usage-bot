// ログ出力ユーティリティ - 統一されたログ形式で出力する
import type { User, Client } from 'discord.js'
import { config } from './config'

/**
 * ログレベル定義
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const

export type LogLevel = keyof typeof LOG_LEVELS

/**
 * ログデータの型定義
 */
export type LogData =
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null
  | undefined

/**
 * 現在時刻をフォーマットして取得
 */
function getTimestamp(): string {
  return new Date().toISOString()
}

/**
 * ログメッセージをフォーマット
 */
function formatMessage(
  level: LogLevel,
  message: string,
  data?: LogData
): string {
  const timestamp = getTimestamp()
  let logData = ''

  if (data !== null && data !== undefined) {
    if (typeof data === 'object') {
      logData = ` | ${JSON.stringify(data, null, 2)}`
    } else {
      logData = ` | ${data}`
    }
  }

  return `[${timestamp}] ${level.toUpperCase()}: ${message}${logData}`
}

/**
 * ログ出力クラス
 */
class Logger {
  /**
   * エラーログ出力
   */
  error(message: string, data?: LogData): void {
    console.error(formatMessage('ERROR', message, data))
  }

  /**
   * 警告ログ出力
   */
  warn(message: string, data?: LogData): void {
    console.warn(formatMessage('WARN', message, data))
  }

  /**
   * 情報ログ出力
   */
  info(message: string, data?: LogData): void {
    console.log(formatMessage('INFO', message, data))
  }

  /**
   * デバッグログ出力（開発モードの場合のみ）
   */
  debug(message: string, data?: LogData): void {
    if (config.development) {
      console.log(formatMessage('DEBUG', message, data))
    }
  }

  /**
   * BOT起動時の情報表示
   */
  logBotStart(botUser: User): void {
    const client = botUser.client as Client<true>

    this.info('='.repeat(50))
    this.info('✨ EMOJI 集計ちゃん 起動完了だよ〜！')
    this.info(`BOT名: ${botUser.tag}`)
    this.info(`サーバー数: ${client.guilds.cache.size}`)
    this.info(`集計対象チャンネル数: ${config.channels.targets.length}`)
    this.info(`集計期間: ${config.analysis.days}日間`)
    this.info(`スケジュール: ${config.schedule.cron}`)
    this.info(`開発モード: ${config.development ? 'ON' : 'OFF'}`)
    this.info('='.repeat(50))
  }

  /**
   * 集計開始時の情報表示
   */
  logAnalysisStart(channelCount: number, days: number): void {
    this.info('📊 絵文字の集計を始めるね〜！')
    this.info(`対象チャンネル: ${channelCount}個`)
    this.info(`集計期間: ${days}日間`)
  }

  /**
   * 集計完了時の情報表示
   */
  logAnalysisComplete(
    totalMessages: number,
    totalReactions: number,
    emojiCount: number
  ): void {
    this.info('✅ 絵文字集計が完了したよ〜！')
    this.info(`処理メッセージ数: ${totalMessages.toLocaleString('ja-JP')}件`)
    this.info(`総リアクション数: ${totalReactions.toLocaleString('ja-JP')}個`)
    this.info(`絵文字種類数: ${emojiCount}種類`)
  }

  /**
   * スケジュール実行時の情報表示
   */
  logScheduledRun(): void {
    this.info('⏰ 定期実行による絵文字集計を開始します')
  }

  /**
   * コマンド実行時の情報表示
   */
  logCommandExecution(
    commandName: string,
    userId: string,
    guildId: string
  ): void {
    this.info(`🎯 コマンド実行: /${commandName}`, {
      userId,
      guildId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * エラー詳細を構造化して出力
   */
  logError(error: Error, context?: string): void {
    this.error(`${context ? `[${context}] ` : ''}${error.message}`, {
      name: error.name,
      stack: error.stack,
      context,
    })
  }
}

export const logger = new Logger()
