// メインエントリーポイント - アプリケーションの起動とエラーハンドリングを管理する
import { createServer, type Server } from 'http'
import type { Client } from 'discord.js'
import { connectBot, disconnectBot } from './bot/client'
import {
  setupScheduledAnalysis,
  stopScheduledAnalysis,
} from './services/scheduler'
import { logger } from './utils/logger'
import { config, getConfigSummary } from './utils/config'
import { initializeSchema, closeDatabase } from './services/database'

/**
 * ヘルスチェック情報の型定義
 */
interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  service: string
  timestamp: string
  version?: string
  uptime?: number
  config?: Record<string, unknown>
}

/**
 * ヘルスチェック用HTTPサーバーを作成
 */
function createHealthServer(): Server {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3050

  const server = createServer((req, res) => {
    const url = req.url || '/'

    if (url === '/health') {
      const healthData: HealthResponse = {
        status: 'healthy',
        service: 'EMOJI 集計ちゃん',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        uptime: process.uptime(),
        config: getConfigSummary(),
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(healthData, null, 2))
    } else if (url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(
        'EMOJI 集計ちゃん稼働中だよ〜♪\n\n/health エンドポイントでヘルスチェックができるよ〜'
      )
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 - ページが見つからないよ〜')
    }
  })

  server.listen(port, () => {
    logger.info(`HTTPサーバーがポート${port}で起動しました`)
  })

  return server
}

/**
 * アプリケーション開始
 */
async function startApplication(): Promise<void> {
  let client: Client<true> | null = null
  let server: Server | null = null

  try {
    logger.info('EMOJI 集計ちゃん v2.0.0 (TypeScript) を起動中だよ〜！')

    // ヘルスチェック用HTTPサーバー（デプロイ用）
    server = createHealthServer()

    // データベース初期化（Turso設定がある場合のみ）
    await initializeSchema(config.turso)

    // BOT接続
    client = await connectBot()

    // BOT準備完了後にスケジュール設定とスラッシュコマンド登録
    client?.once('ready', async (readyClient) => {
      try {
        // スラッシュコマンドの登録
        const { deploySlashCommands } = await import('./bot/deploy-commands')
        await deploySlashCommands()

        // スケジュール設定
        setupScheduledAnalysis(readyClient)

        logger.info('全ての初期設定が完了しました！')
      } catch (error: unknown) {
        logger.logError(error as Error, '初期設定エラー')
      }
    })

    // 正常終了時の処理
    const cleanup = async (signal?: string): Promise<void> => {
      logger.info(
        `集計ちゃんを終了するよ〜！また後でね〜♪ (${signal || 'unknown'})`
      )

      try {
        // スケジュール停止
        stopScheduledAnalysis()

        // データベース切断
        closeDatabase()

        // BOT切断
        if (client) {
          await disconnectBot(client)
        }

        // HTTPサーバー停止
        if (server) {
          server.close(() => {
            logger.info('HTTPサーバーを停止しました')
          })
        }

        // プロセス終了
        setTimeout(() => {
          process.exit(0)
        }, 1000)
      } catch (error: unknown) {
        logger.logError(error as Error, 'クリーンアップエラー')
        process.exit(1)
      }
    }

    // シグナルハンドラーの設定
    process.on('SIGINT', () => cleanup('SIGINT'))
    process.on('SIGTERM', () => cleanup('SIGTERM'))
  } catch (error: unknown) {
    logger.logError(error as Error, 'アプリケーション起動エラー')

    // クリーンアップを試行
    try {
      if (client) {
        await disconnectBot(client)
      }
      if (server) {
        server.close()
      }
    } catch (cleanupError: unknown) {
      logger.logError(cleanupError as Error, 'エラー時クリーンアップエラー')
    }

    process.exit(1)
  }
}

// 未処理の例外・Promise拒否をキャッチ
process.on('uncaughtException', (error: Error) => {
  logger.logError(error, '未処理の例外が発生しました')
  process.exit(1)
})

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('未処理のPromise拒否が発生しました', {
    reason: reason instanceof Error ? reason.message : String(reason),
  })
  process.exit(1)
})

// 開発環境での追加エラーハンドリング
if (config.development) {
  process.on('warning', (warning: Error) => {
    logger.warn('Node警告', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    })
  })
}

// アプリケーション開始
startApplication()
