/**
 * 絵文字タイプ - Unicode絵文字またはカスタム絵文字
 */
export type EmojiType = 'unicode' | 'custom'

/**
 * リアクションデータ - メッセージから抽出される基本的なリアクション情報
 */
export interface ReactionData {
  /** 絵文字の種類 */
  type: EmojiType
  /** 一意識別子（カスタム絵文字のIDまたはUnicode絵文字の名前） */
  identifier: string
  /** 絵文字の表示名 */
  name: string
  /** カスタム絵文字のID（カスタム絵文字の場合のみ） */
  id: string | null
  /** アニメーション絵文字かどうか */
  animated: boolean
  /** Discord形式の文字列（<:name:id>形式） */
  discordFormat: string
  /** 絵文字のURL（カスタム絵文字の場合のみ） */
  url: string | null
  /** このリアクションの数 */
  count: number
  /** メッセージID */
  messageId: string
  /** チャンネルID */
  channelId: string
  /** リアクションが付けられた時刻 */
  timestamp: Date
}

/**
 * 集計された絵文字統計 - 絵文字別に集計されたデータ
 */
export interface EmojiStats {
  /** 一意識別子 */
  identifier: string
  /** 絵文字の表示名 */
  name: string
  /** 絵文字の種類 */
  type: EmojiType
  /** カスタム絵文字のID */
  id: string | null
  /** アニメーション絵文字かどうか */
  animated: boolean
  /** 総使用回数 */
  totalCount: number
  /** リアクションが付いたメッセージ数 */
  messageCount: number
  /** この絵文字のリアクションデータ一覧 */
  reactions: ReactionData[]
  /** 使用率（％） */
  usageRate: number
  /** メッセージあたりの平均使用回数 */
  avgPerMessage: number
  /** 表示用フォーマット（実際に表示される形式） */
  displayFormat: string
  /** 安全な表示名（フォールバック用） */
  safeName: string
}

/**
 * チャンネル統計 - チャンネル別のリアクション統計
 */
export interface ChannelStats {
  /** チャンネルID */
  channelId: string
  /** チャンネル名（取得可能な場合） */
  channelName: string | null
  /** 総リアクション数 */
  totalReactions: number
  /** 使用された絵文字の種類数 */
  uniqueEmojis: number
  /** リアクションが付いたメッセージ数 */
  messageCount: number
}

/**
 * 絵文字タイプ別統計
 */
export interface TypeStats {
  /** Unicode絵文字の統計 */
  unicode: {
    /** 種類数 */
    count: number
    /** 総使用回数 */
    totalUsage: number
    /** 使用率（％） */
    percentage: number
  }
  /** カスタム絵文字の統計 */
  custom: {
    /** 種類数 */
    count: number
    /** 総使用回数 */
    totalUsage: number
    /** 使用率（％） */
    percentage: number
  }
  /** 合計統計 */
  total: {
    /** 総種類数 */
    count: number
    /** 総使用回数 */
    totalUsage: number
  }
}

/**
 * 分析結果のサマリー
 */
export interface AnalysisSummary {
  /** 総リアクション数 */
  totalReactions: number
  /** ユニークな絵文字の数 */
  uniqueEmojis: number
  /** 最も人気の絵文字 */
  topEmoji: EmojiStats | null
}

/**
 * 分析結果 - 完全な分析結果
 */
export interface AnalysisResult {
  /** 絵文字別統計（使用回数順） */
  emojiStats: EmojiStats[]
  /** 絵文字タイプ別統計 */
  typeStats: TypeStats
  /** チャンネル別統計 */
  channelStats: ChannelStats[]
  /** サマリー情報 */
  summary: AnalysisSummary
}

/**
 * 分析情報 - 分析の実行に関する情報
 */
export interface AnalysisInfo {
  /** 実際に分析した日数 */
  actualDays: number
  /** 分析したメッセージ総数 */
  totalMessages: number
  /** 分析開始時刻 */
  startTime?: Date
  /** 分析終了時刻 */
  endTime?: Date
}

/**
 * メッセージとリアクション取得結果
 */
export interface MessageFetchResult {
  /** 取得したリアクションデータ一覧 */
  reactions: ReactionData[]
  /** 総メッセージ数 */
  totalMessages: number
  /** 総リアクション数 */
  totalReactions: number
  /** ユニークな絵文字数 */
  uniqueEmojis: number
  /** 実際の分析日数 */
  actualDays: number
}

/**
 * 設定オブジェクト
 */
export interface BotConfig {
  /** Discord BOTトークン */
  token: string
  /** アプリケーションID */
  applicationId: string
  /** チャンネル設定 */
  channels: {
    /** 分析対象チャンネルのID一覧 */
    targets: string[]
    /** ランキング投稿先チャンネルID */
    report: string
  }
  /** 分析設定 */
  analysis: {
    /** デフォルト分析期間（日数） */
    days: number
    /** ランキング表示件数 */
    topCount: number
  }
  /** スケジュール設定 */
  schedule: {
    /** cron式（設定されていない場合はnull） */
    cron: string | null
    /** タイムゾーン */
    timezone: string
  }
  /** 開発モード */
  development: boolean
}

/**
 * テスト分析結果
 */
export interface TestAnalysisResult {
  /** 分析結果 */
  analysisResult: AnalysisResult
  /** 簡易テキスト */
  simpleText: string
  /** 分析情報 */
  analysisInfo: AnalysisInfo
}
