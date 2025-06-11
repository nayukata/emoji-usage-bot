// スラッシュコマンドのデプロイ - Discord API にコマンドを登録する
import {
  REST,
  Routes,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js'
import { slashCommands } from './slash-commands'
import { config, validateConfig } from '../utils/config'
import { logger } from '../utils/logger'

/**
 * スラッシュコマンドをDiscord APIに登録
 */
export async function deploySlashCommands(): Promise<unknown[]> {
  try {
    validateConfig()

    const rest = new REST().setToken(config.token)

    // コマンドデータを JSON 形式に変換
    const commandsData: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
      slashCommands.map((command) => command.toJSON())

    logger.info(`🔄 ${commandsData.length}個のスラッシュコマンドを登録中...`)

    // グローバルコマンドとして登録（ギルド設定が不要）
    let data: unknown[]
    try {
      data = (await rest.put(Routes.applicationCommands(config.applicationId), {
        body: commandsData,
      })) as unknown[]

      logger.info(
        `✅ ${data.length}個のスラッシュコマンドがグローバルに登録されました（反映まで最大1時間）`
      )
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string }

      if (err.code === 50001) {
        throw new Error(
          'BOTにapplication.commands権限がありません。Discord Developer Portalで権限を確認してください。'
        )
      } else if (err.code === 50013) {
        throw new Error(
          'Insufficient permissions: BOTにコマンド登録権限がありません。'
        )
      } else {
        throw error
      }
    }

    return data
  } catch (error: unknown) {
    logger.logError(error as Error, 'スラッシュコマンド登録エラー')
    throw error
  }
}

/**
 * 全てのスラッシュコマンドを削除
 */
export async function clearSlashCommands(): Promise<void> {
  try {
    validateConfig()

    const rest = new REST().setToken(config.token)

    logger.info('🗑️ スラッシュコマンドをクリア中...')

    // グローバルコマンドをクリア
    await rest.put(Routes.applicationCommands(config.applicationId), {
      body: [],
    })

    logger.info('✅ グローバルスラッシュコマンドのクリアが完了しました')
  } catch (error: unknown) {
    logger.logError(error as Error, 'スラッシュコマンドクリアエラー')
    throw error
  }
}

/**
 * 現在登録されているコマンドを一覧表示
 */
export async function listSlashCommands(): Promise<unknown[]> {
  try {
    validateConfig()

    const rest = new REST().setToken(config.token)

    logger.info('📋 登録済みスラッシュコマンドを取得中...')

    const commands = (await rest.get(
      Routes.applicationCommands(config.applicationId)
    )) as unknown[]

    logger.info(
      `📋 ${
        Array.isArray(commands) ? commands.length : 0
      }個のコマンドが登録されています`
    )

    if (Array.isArray(commands)) {
      for (const command of commands) {
        const cmd = command as {
          name?: string
          description?: string
          id?: string
        }
        logger.info(`  - ${cmd.name}: ${cmd.description} (ID: ${cmd.id})`)
      }
    }

    return commands
  } catch (error: unknown) {
    logger.logError(error as Error, 'コマンド一覧取得エラー')
    throw error
  }
}
