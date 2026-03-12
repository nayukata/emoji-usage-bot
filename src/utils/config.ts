// 設定管理ユーティリティ - 環境変数の読み込みと検証を行う
import dotenv from 'dotenv'
import type { BotConfig } from '../types/index'

dotenv.config()

/**
 * 環境変数の必須チェック
 */
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`必須の環境変数が設定されていません: ${key}`)
  }
  return value
}

/**
 * 数値型環境変数の取得（デフォルト値付き）
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (!value) return defaultValue

  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`環境変数 ${key} は数値である必要があります: ${value}`)
  }
  return parsed
}

/**
 * カンマ区切りの環境変数を配列として取得
 */
function getArrayEnv(key: string): string[] {
  const value = process.env[key]
  if (!value) return []

  return value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

/**
 * BOT設定オブジェクト
 */
export const config: BotConfig = {
  // Discord BOT設定
  token: requireEnv('DISCORD_TOKEN'),
  applicationId: requireEnv('CLIENT_ID'),

  // チャンネル設定
  channels: {
    targets: getArrayEnv('TARGET_CHANNELS'),
    report: requireEnv('REPORT_CHANNEL'),
  },

  // 集計設定
  analysis: {
    days: getNumberEnv('ANALYSIS_DAYS', 7),
    topCount: getNumberEnv('TOP_EMOJI_COUNT', 20),
  },

  // スケジュール設定（任意）
  schedule: {
    cron: process.env.SCHEDULE_CRON || null, // 設定されていない場合はnull
    timezone: process.env.SCHEDULE_TIMEZONE || 'Asia/Tokyo',
  },

  // 開発モード設定
  development: process.env.NODE_ENV === 'development',

  // Turso設定（オプショナル）
  turso: process.env.TURSO_DATABASE_URL
    ? {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      }
    : null,
}

/**
 * 設定値の検証
 */
export function validateConfig(): void {
  // 必須チェックは既にrequireEnv()で実行済み

  // 追加の検証
  if (config.channels.targets.length === 0) {
    throw new Error(
      'TARGET_CHANNELS に少なくとも1つのチャンネルIDを設定してください'
    )
  }

  if (config.analysis.days <= 0) {
    throw new Error('ANALYSIS_DAYS は1以上の数値である必要があります')
  }

  if (config.analysis.topCount <= 0) {
    throw new Error('TOP_EMOJI_COUNT は1以上の数値である必要があります')
  }

  // Discord IDの形式チェック（18-19桁の数字）
  const discordIdPattern = /^\d{17,19}$/

  if (!discordIdPattern.test(config.applicationId)) {
    throw new Error('CLIENT_ID は有効なDiscord IDである必要があります')
  }

  if (!discordIdPattern.test(config.channels.report)) {
    throw new Error(
      'REPORT_CHANNEL は有効なDiscord チャンネルIDである必要があります'
    )
  }

  for (const channelId of config.channels.targets) {
    if (!discordIdPattern.test(channelId)) {
      throw new Error(
        `TARGET_CHANNELS に無効なチャンネルIDが含まれています: ${channelId}`
      )
    }
  }
}

/**
 * 設定情報をログ出力用に整形
 */
export function getConfigSummary(): Record<string, unknown> {
  return {
    applicationId: config.applicationId,
    targetChannels: config.channels.targets.length,
    reportChannel: config.channels.report,
    analysisDays: config.analysis.days,
    topCount: config.analysis.topCount,
    schedule: config.schedule.cron || '手動実行のみ',
    development: config.development,
    turso: config.turso ? '接続済み' : '未設定',
  }
}
