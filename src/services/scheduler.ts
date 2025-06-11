// スケジュール管理サービス - 定期実行機能を提供する
import cron, { type ScheduledTask } from 'node-cron'
import type { Client } from 'discord.js'
import { executeEmojiAnalysis } from '../bot/commands'
import { config } from '../utils/config'
import { logger } from '../utils/logger'

/**
 * スケジュール状態の型定義
 */
export interface ScheduleStatus {
  /** スケジュールがアクティブかどうか */
  isActive: boolean
  /** cron式 */
  cronExpression: string
  /** 次回実行時刻 */
  nextExecution: Date | null
  /** タイムゾーン */
  timezone: string
}

/**
 * スケジュールされたタスクの参照
 */
let scheduledTask: ScheduledTask | null = null

/**
 * 定期実行タスクの設定
 */
export function setupScheduledAnalysis(client: Client<true>): ScheduledTask {
  // 既存のタスクがあれば停止
  if (scheduledTask) {
    scheduledTask.stop()
    logger.info('既存のスケジュールタスクを停止しました')
  }

  logger.info(`⏰ 定期実行スケジュールを設定: ${config.schedule.cron}`)

  // cron式の妥当性を確認
  if (!cron.validate(config.schedule.cron)) {
    throw new Error(`無効なcron式: ${config.schedule.cron}`)
  }

  // スケジュールタスクを作成
  scheduledTask = cron.schedule(
    config.schedule.cron,
    async () => {
      logger.logScheduledRun()

      try {
        await executeEmojiAnalysis(client)
        logger.info('✅ スケジュールされた絵文字分析が完了')
      } catch (error: unknown) {
        logger.logError(error as Error, 'スケジュール実行エラー')
      }
    },
    {
      timezone: config.schedule.timezone,
    }
  )

  // タスクを開始
  scheduledTask.start()
  logger.info('✅ 定期実行スケジュールが正常に開始されました')

  return scheduledTask
}

/**
 * スケジュールタスクの停止
 */
export function stopScheduledAnalysis(): void {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    logger.info('⏹️  定期実行スケジュールを停止しました')
  }
}

/**
 * 次回実行時刻の取得
 */
export function getNextExecutionTime(): Date | null {
  if (!scheduledTask) {
    return null
  }

  // 簡易的な次回実行時刻計算（実際のcronライブラリの機能を使用することを推奨）
  const now = new Date()
  const cronExpression = config.schedule.cron

  // デフォルトの例（毎週月曜日10:00）での計算
  if (cronExpression === '0 10 * * 1') {
    const nextMonday = new Date(now)
    const daysUntilMonday = (1 + 7 - now.getDay()) % 7
    if (daysUntilMonday === 0 && now.getHours() >= 10) {
      nextMonday.setDate(now.getDate() + 7)
    } else {
      nextMonday.setDate(now.getDate() + daysUntilMonday)
    }
    nextMonday.setHours(10, 0, 0, 0)
    return nextMonday
  }

  // より複雑なcron式の場合は別のライブラリ（croner等）を使用することを推奨
  return null
}

/**
 * スケジュール状態の確認
 */
export function getScheduleStatus(): ScheduleStatus {
  return {
    isActive: scheduledTask !== null,
    cronExpression: config.schedule.cron,
    nextExecution: getNextExecutionTime(),
    timezone: config.schedule.timezone,
  }
}

/**
 * 手動でのスケジュール実行（テスト用）
 */
export async function executeScheduledTaskNow(
  client: Client<true>
): Promise<void> {
  logger.info('🧪 スケジュールタスクを手動実行します')

  try {
    await executeEmojiAnalysis(client)
    logger.info('✅ 手動実行による絵文字分析が完了')
  } catch (error: unknown) {
    logger.logError(error as Error, '手動実行エラー')
    throw error
  }
}
