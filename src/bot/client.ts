// Discord BOTクライアント - BOTの初期化と基本設定を管理する
import { Client, GatewayIntentBits, type ClientOptions } from 'discord.js'
import { config, validateConfig } from '../utils/config'
import { logger } from '../utils/logger'

/**
 * Discord BOTクライアントを作成・設定
 */
export function createBotClient(): Client {
  const clientOptions: ClientOptions = {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildEmojisAndStickers, // カスタム絵文字用
    ],
  }

  const client = new Client(clientOptions)

  // BOT準備完了イベント
  client.once('ready', (readyClient) => {
    logger.logBotStart(readyClient.user)

    // 絵文字キャッシュのログ出力
    logger.info(
      `🎨 利用可能なカスタム絵文字: ${readyClient.emojis.cache.size}個`
    )

    // 絵文字の詳細情報をデバッグ出力
    if (config.development) {
      readyClient.emojis.cache.forEach((emoji) => {
        logger.debug(
          `絵文字: ${emoji.name} (${emoji.id}) - サーバー: ${emoji.guild?.name}`
        )
      })
    }
  })

  // メッセージイベント（従来の!コマンド処理用）
  client.on('messageCreate', async (message) => {
    try {
      const { handleManualCommand } = await import('./commands')
      await handleManualCommand(message)
    } catch (error: unknown) {
      logger.logError(error as Error, 'メッセージ処理エラー')
    }
  })

  // スラッシュコマンドイベント（/コマンド処理用）
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    try {
      const { handleSlashCommand } = await import('./slash-commands')
      await handleSlashCommand(interaction)
    } catch (error: unknown) {
      logger.logError(error as Error, 'スラッシュコマンド処理エラー')
    }
  })

  // エラーハンドリング
  client.on('error', (error) => {
    logger.logError(error, 'Discord クライアントエラー')
  })

  // 警告ハンドリング
  client.on('warn', (warning) => {
    logger.warn('Discord クライアント警告', { warning })
  })

  // デバッグハンドリング（開発モードのみ）
  if (config.development) {
    client.on('debug', (debug) => {
      logger.debug('Discord クライアントデバッグ', { debug })
    })
  }

  return client
}

/**
 * BOTをDiscordに接続
 */
export async function connectBot(): Promise<Client<true>> {
  try {
    // 設定値検証
    validateConfig()

    // クライアント作成
    const client = createBotClient()

    // Discord接続
    await client.login(config.token)

    // readyイベントを待ってからClient<true>として返す
    return new Promise<Client<true>>((resolve) => {
      client.once('ready', (readyClient) => {
        resolve(readyClient)
      })
    })
  } catch (error: unknown) {
    logger.logError(error as Error, 'BOT接続エラー')
    throw error
  }
}

/**
 * BOTを安全にシャットダウン
 */
export async function disconnectBot(client: Client): Promise<void> {
  try {
    logger.info('🛑 BOTをシャットダウン中...')

    if (client.isReady()) {
      client.destroy()
    }

    logger.info('✅ BOTが正常にシャットダウンされました')
  } catch (error: unknown) {
    logger.logError(error as Error, 'BOTシャットダウンエラー')
    throw error
  }
}
