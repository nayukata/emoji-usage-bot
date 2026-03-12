// データベース管理 - Turso (libSQL) 接続、スキーマ初期化、CRUD操作
import { createClient, type Client as LibSQLClient } from '@libsql/client'
import type {
  SnapshotRow,
  EmojiSnapshotRow,
  ChannelSnapshotRow,
  TursoConfig,
} from '../types/index'
import { logger } from '../utils/logger'

let db: LibSQLClient | null = null

/**
 * Tursoクライアントを初期化して返す
 * 設定が存在しない場合は null を返す
 */
export function getDatabase(tursoConfig: TursoConfig | null): LibSQLClient | null {
  if (db) return db
  if (!tursoConfig) return null

  try {
    db = createClient({
      url: tursoConfig.url,
      authToken: tursoConfig.authToken || undefined,
    })
    logger.info('Turso データベースに接続しました')
    return db
  } catch (error) {
    logger.error('Turso 接続エラー', { error: String(error) })
    return null
  }
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    logger.info('Turso データベース接続を閉じました')
  }
}

/**
 * スキーマを初期化する
 */
export async function initializeSchema(
  tursoConfig: TursoConfig | null
): Promise<void> {
  const client = getDatabase(tursoConfig)
  if (!client) return

  try {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_date TEXT NOT NULL,
        period_days INTEGER NOT NULL,
        total_messages INTEGER NOT NULL,
        total_reactions INTEGER NOT NULL,
        unique_emojis INTEGER NOT NULL,
        unicode_count INTEGER NOT NULL,
        unicode_usage INTEGER NOT NULL,
        custom_count INTEGER NOT NULL,
        custom_usage INTEGER NOT NULL,
        diversity_entropy REAL,
        diversity_entropy_normalized REAL,
        diversity_gini REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_date ON snapshots(snapshot_date);

      CREATE TABLE IF NOT EXISTS emoji_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
        identifier TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('unicode', 'custom')),
        emoji_id TEXT,
        animated INTEGER NOT NULL DEFAULT 0,
        total_count INTEGER NOT NULL,
        message_count INTEGER NOT NULL,
        usage_rate REAL NOT NULL,
        avg_per_message REAL NOT NULL,
        display_format TEXT NOT NULL,
        UNIQUE(snapshot_id, identifier)
      );
      CREATE INDEX IF NOT EXISTS idx_emoji_snap_id ON emoji_snapshots(snapshot_id);
      CREATE INDEX IF NOT EXISTS idx_emoji_snap_ident ON emoji_snapshots(identifier);

      CREATE TABLE IF NOT EXISTS channel_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
        channel_id TEXT NOT NULL,
        channel_name TEXT,
        total_reactions INTEGER NOT NULL,
        unique_emojis INTEGER NOT NULL,
        message_count INTEGER NOT NULL,
        UNIQUE(snapshot_id, channel_id)
      );
      CREATE INDEX IF NOT EXISTS idx_chan_snap_id ON channel_snapshots(snapshot_id);
    `)
    logger.info('データベーススキーマを初期化しました')
  } catch (error) {
    logger.error('スキーマ初期化エラー', { error: String(error) })
  }
}

/* ============================
 * Snapshot CRUD
 * ============================ */

/**
 * スナップショットを挿入し、生成されたIDを返す
 * 同日のスナップショットは UPSERT（置換）する
 */
export async function insertSnapshot(
  tursoConfig: TursoConfig | null,
  data: Omit<SnapshotRow, 'id' | 'created_at'>
): Promise<number | null> {
  const client = getDatabase(tursoConfig)
  if (!client) return null

  try {
    // 既存のスナップショットを削除（カスケードで子レコードも消える）
    await client.execute({
      sql: 'DELETE FROM snapshots WHERE snapshot_date = ?',
      args: [data.snapshot_date],
    })

    const result = await client.execute({
      sql: `INSERT INTO snapshots
        (snapshot_date, period_days, total_messages, total_reactions,
         unique_emojis, unicode_count, unicode_usage, custom_count,
         custom_usage, diversity_entropy, diversity_entropy_normalized,
         diversity_gini)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.snapshot_date,
        data.period_days,
        data.total_messages,
        data.total_reactions,
        data.unique_emojis,
        data.unicode_count,
        data.unicode_usage,
        data.custom_count,
        data.custom_usage,
        data.diversity_entropy,
        data.diversity_entropy_normalized,
        data.diversity_gini,
      ],
    })

    const id = Number(result.lastInsertRowid)
    logger.info(`スナップショットを保存しました (id=${id})`)
    return id
  } catch (error) {
    logger.error('スナップショット保存エラー', { error: String(error) })
    return null
  }
}

/**
 * 絵文字スナップショットを一括挿入
 */
export async function insertEmojiSnapshots(
  tursoConfig: TursoConfig | null,
  snapshotId: number,
  rows: Omit<EmojiSnapshotRow, 'id' | 'snapshot_id'>[]
): Promise<void> {
  const client = getDatabase(tursoConfig)
  if (!client) return

  try {
    for (const row of rows) {
      await client.execute({
        sql: `INSERT INTO emoji_snapshots
          (snapshot_id, identifier, name, type, emoji_id, animated,
           total_count, message_count, usage_rate, avg_per_message,
           display_format)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          snapshotId,
          row.identifier,
          row.name,
          row.type,
          row.emoji_id,
          row.animated,
          row.total_count,
          row.message_count,
          row.usage_rate,
          row.avg_per_message,
          row.display_format,
        ],
      })
    }
  } catch (error) {
    logger.error('絵文字スナップショット保存エラー', { error: String(error) })
  }
}

/**
 * チャンネルスナップショットを一括挿入
 */
export async function insertChannelSnapshots(
  tursoConfig: TursoConfig | null,
  snapshotId: number,
  rows: Omit<ChannelSnapshotRow, 'id' | 'snapshot_id'>[]
): Promise<void> {
  const client = getDatabase(tursoConfig)
  if (!client) return

  try {
    for (const row of rows) {
      await client.execute({
        sql: `INSERT INTO channel_snapshots
          (snapshot_id, channel_id, channel_name, total_reactions,
           unique_emojis, message_count)
          VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          snapshotId,
          row.channel_id,
          row.channel_name,
          row.total_reactions,
          row.unique_emojis,
          row.message_count,
        ],
      })
    }
  } catch (error) {
    logger.error('チャンネルスナップショット保存エラー', {
      error: String(error),
    })
  }
}

/* ============================
 * クエリ
 * ============================ */

/**
 * 最新のスナップショットを取得
 */
export async function getLatestSnapshot(
  tursoConfig: TursoConfig | null
): Promise<SnapshotRow | null> {
  const client = getDatabase(tursoConfig)
  if (!client) return null

  try {
    const result = await client.execute(
      'SELECT * FROM snapshots ORDER BY snapshot_date DESC LIMIT 1'
    )
    if (result.rows.length === 0) return null
    return result.rows[0] as unknown as SnapshotRow
  } catch (error) {
    logger.error('最新スナップショット取得エラー', { error: String(error) })
    return null
  }
}

/**
 * 直近2件のスナップショットを取得（トレンド計算用）
 */
export async function getLatestTwoSnapshots(
  tursoConfig: TursoConfig | null
): Promise<SnapshotRow[]> {
  const client = getDatabase(tursoConfig)
  if (!client) return []

  try {
    const result = await client.execute(
      'SELECT * FROM snapshots ORDER BY snapshot_date DESC LIMIT 2'
    )
    return result.rows as unknown as SnapshotRow[]
  } catch (error) {
    logger.error('スナップショット取得エラー', { error: String(error) })
    return []
  }
}

/**
 * 指定スナップショットIDの絵文字データを取得
 */
export async function getEmojiSnapshotsBySnapshotId(
  tursoConfig: TursoConfig | null,
  snapshotId: number
): Promise<EmojiSnapshotRow[]> {
  const client = getDatabase(tursoConfig)
  if (!client) return []

  try {
    const result = await client.execute({
      sql: 'SELECT * FROM emoji_snapshots WHERE snapshot_id = ? ORDER BY total_count DESC',
      args: [snapshotId],
    })
    return result.rows as unknown as EmojiSnapshotRow[]
  } catch (error) {
    logger.error('絵文字スナップショット取得エラー', { error: String(error) })
    return []
  }
}

/**
 * カスタム絵文字の全スナップショット履歴を取得（ROI用）
 */
export async function getCustomEmojiHistory(
  tursoConfig: TursoConfig | null
): Promise<
  Array<{
    snapshot_date: string
    identifier: string
    name: string
    display_format: string
    total_count: number
    usage_rate: number
  }>
> {
  const client = getDatabase(tursoConfig)
  if (!client) return []

  try {
    const result = await client.execute(`
      SELECT s.snapshot_date, e.identifier, e.name, e.display_format,
             e.total_count, e.usage_rate
      FROM emoji_snapshots e
      JOIN snapshots s ON s.id = e.snapshot_id
      WHERE e.type = 'custom'
      ORDER BY e.identifier, s.snapshot_date
    `)
    return result.rows as unknown as Array<{
      snapshot_date: string
      identifier: string
      name: string
      display_format: string
      total_count: number
      usage_rate: number
    }>
  } catch (error) {
    logger.error('カスタム絵文字履歴取得エラー', { error: String(error) })
    return []
  }
}

/**
 * スナップショットの総数を取得
 */
export async function getSnapshotCount(
  tursoConfig: TursoConfig | null
): Promise<number> {
  const client = getDatabase(tursoConfig)
  if (!client) return 0

  try {
    const result = await client.execute(
      'SELECT COUNT(*) as cnt FROM snapshots'
    )
    const row = result.rows[0]
    return row ? Number(row['cnt']) : 0
  } catch (error) {
    logger.error('スナップショット数取得エラー', { error: String(error) })
    return 0
  }
}

/**
 * 全スナップショットの多様性指数推移を取得
 */
export async function getDiversityHistory(
  tursoConfig: TursoConfig | null
): Promise<
  Array<{
    snapshot_date: string
    diversity_entropy: number | null
    diversity_entropy_normalized: number | null
    diversity_gini: number | null
  }>
> {
  const client = getDatabase(tursoConfig)
  if (!client) return []

  try {
    const result = await client.execute(`
      SELECT snapshot_date, diversity_entropy, diversity_entropy_normalized,
             diversity_gini
      FROM snapshots
      ORDER BY snapshot_date
    `)
    return result.rows as unknown as Array<{
      snapshot_date: string
      diversity_entropy: number | null
      diversity_entropy_normalized: number | null
      diversity_gini: number | null
    }>
  } catch (error) {
    logger.error('多様性履歴取得エラー', { error: String(error) })
    return []
  }
}
