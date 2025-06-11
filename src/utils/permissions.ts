// 権限チェックユーティリティ - BOTの権限状況を確認する
import {
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type GuildChannel,
  type Client,
  type GuildEmoji,
} from 'discord.js'
import { logger } from './logger'

/**
 * 権限チェック結果の型定義
 */
interface PermissionCheckResult {
  /** 全ての権限が揃っているか */
  hasAllPermissions: boolean
  /** 持っている権限一覧 */
  hasPermissions: string[]
  /** 不足している権限一覧 */
  missingPermissions: string[]
}

/**
 * 絵文字使用可能性チェック結果の型定義
 */
interface EmojiUsabilityResult {
  /** 使用可能かどうか */
  canUse: boolean
  /** 理由 */
  reason: string
  /** 絵文字オブジェクト（見つかった場合） */
  emoji: GuildEmoji | null
}

/**
 * 権限診断レポートの型定義
 */
interface PermissionReport {
  guild: {
    name: string
    id: string
    permissions: PermissionCheckResult
  }
  channel: {
    name: string
    id: string
    permissions: PermissionCheckResult
  }
  bot: {
    name: string
    id: string
    emojiCount: number
    guildCount: number
  }
}

/**
 * 必要な権限の定義
 */
const REQUIRED_PERMISSIONS = [
  { flag: PermissionFlagsBits.ViewChannel, name: 'チャンネルを見る' },
  { flag: PermissionFlagsBits.SendMessages, name: 'メッセージを送信' },
  {
    flag: PermissionFlagsBits.ReadMessageHistory,
    name: 'メッセージ履歴を読む',
  },
  { flag: PermissionFlagsBits.UseExternalEmojis, name: '外部絵文字を使用' },
  { flag: PermissionFlagsBits.EmbedLinks, name: 'リンクを埋め込む' },
] as const

/**
 * チャンネル固有の必要な権限の定義
 */
const CHANNEL_REQUIRED_PERMISSIONS = [
  { flag: PermissionFlagsBits.ViewChannel, name: 'チャンネルを見る' },
  { flag: PermissionFlagsBits.SendMessages, name: 'メッセージを送信' },
  { flag: PermissionFlagsBits.UseExternalEmojis, name: '外部絵文字を使用' },
  { flag: PermissionFlagsBits.EmbedLinks, name: 'リンクを埋め込む' },
] as const

/**
 * BOTの基本権限をチェック
 */
export function checkBotPermissions(
  guild: Guild,
  botMember: GuildMember
): PermissionCheckResult {
  const missingPermissions: string[] = []
  const hasPermissions: string[] = []

  for (const permission of REQUIRED_PERMISSIONS) {
    if (botMember.permissions.has(permission.flag)) {
      hasPermissions.push(permission.name)
    } else {
      missingPermissions.push(permission.name)
    }
  }

  return {
    hasAllPermissions: missingPermissions.length === 0,
    hasPermissions,
    missingPermissions,
  }
}

/**
 * チャンネル固有の権限をチェック
 */
export function checkChannelPermissions(
  channel: GuildChannel,
  botMember: GuildMember
): PermissionCheckResult {
  const channelPermissions = channel.permissionsFor(botMember)
  const missingPermissions: string[] = []
  const hasPermissions: string[] = []

  if (!channelPermissions) {
    return {
      hasAllPermissions: false,
      hasPermissions: [],
      missingPermissions: CHANNEL_REQUIRED_PERMISSIONS.map((p) => p.name),
    }
  }

  for (const permission of CHANNEL_REQUIRED_PERMISSIONS) {
    if (channelPermissions.has(permission.flag)) {
      hasPermissions.push(permission.name)
    } else {
      missingPermissions.push(permission.name)
    }
  }

  return {
    hasAllPermissions: missingPermissions.length === 0,
    hasPermissions,
    missingPermissions,
  }
}

/**
 * 絵文字使用可能性をチェック
 */
export function checkEmojiUsability(
  client: Client,
  emojiId: string
): EmojiUsabilityResult {
  const emoji = client.emojis.cache.get(emojiId)

  if (!emoji) {
    return {
      canUse: false,
      reason: '絵文字が見つかりません（BOTがそのサーバーのメンバーではない）',
      emoji: null,
    }
  }

  if (!emoji.available) {
    return {
      canUse: false,
      reason: '絵文字が利用できません（削除済みまたは制限中）',
      emoji,
    }
  }

  return {
    canUse: true,
    reason: '使用可能',
    emoji,
  }
}

/**
 * 権限診断レポートを生成
 */
export function generatePermissionReport(
  guild: Guild,
  channel: GuildChannel,
  botMember: GuildMember
): PermissionReport {
  logger.info('🔍 権限診断を実行中...')

  const guildPerms = checkBotPermissions(guild, botMember)
  const channelPerms = checkChannelPermissions(channel, botMember)

  const report: PermissionReport = {
    guild: {
      name: guild.name,
      id: guild.id,
      permissions: guildPerms,
    },
    channel: {
      name: channel.name,
      id: channel.id,
      permissions: channelPerms,
    },
    bot: {
      name: botMember.user.tag,
      id: botMember.id,
      emojiCount: botMember.client.emojis.cache.size,
      guildCount: botMember.client.guilds.cache.size,
    },
  }

  // ログ出力
  logger.info('📊 権限診断結果:')
  logger.info(
    `サーバー権限: ${guildPerms.hasAllPermissions ? '✅ 正常' : '❌ 不足'}`
  )
  logger.info(
    `チャンネル権限: ${channelPerms.hasAllPermissions ? '✅ 正常' : '❌ 不足'}`
  )

  if (guildPerms.missingPermissions.length > 0) {
    logger.warn(
      `サーバーで不足している権限: ${guildPerms.missingPermissions.join(', ')}`
    )
  }

  if (channelPerms.missingPermissions.length > 0) {
    logger.warn(
      `チャンネルで不足している権限: ${channelPerms.missingPermissions.join(
        ', '
      )}`
    )
  }

  return report
}

/**
 * 権限チェック結果を文字列で表示
 */
export function formatPermissionResult(result: PermissionCheckResult): string {
  const status = result.hasAllPermissions ? '✅ 正常' : '❌ 不足'
  let message = `権限状況: ${status}\n`

  if (result.hasPermissions.length > 0) {
    message += `✅ 有効: ${result.hasPermissions.join(', ')}\n`
  }

  if (result.missingPermissions.length > 0) {
    message += `❌ 不足: ${result.missingPermissions.join(', ')}`
  }

  return message.trim()
}
