// 絵文字分析サービスのテスト
import { describe, test, expect, beforeEach, vi } from 'vitest'
import type { ReactionData, EmojiStats } from '../types/index'
import { analyzeEmojiUsage, getTopEmojis } from './emoji'

// logger をモック
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('emoji.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeEmojiUsage関数', () => {
    test('空のリアクション配列で正しい初期値を返す', () => {
      const result = analyzeEmojiUsage([])

      expect(result.emojiStats).toEqual([])
      expect(result.typeStats.unicode.count).toBe(0)
      expect(result.typeStats.custom.count).toBe(0)
      expect(result.typeStats.total.count).toBe(0)
      expect(result.channelStats).toEqual([])
      expect(result.summary.totalReactions).toBe(0)
      expect(result.summary.uniqueEmojis).toBe(0)
      expect(result.summary.topEmoji).toBe(null)
    })

    test('Unicode絵文字のリアクションを正しく分析する', () => {
      const mockReactions: ReactionData[] = [
        {
          type: 'unicode',
          identifier: '👍',
          name: '👍',
          id: null,
          animated: false,
          discordFormat: '👍',
          url: null,
          count: 5,
          messageId: 'msg1',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        },
        {
          type: 'unicode',
          identifier: '❤️',
          name: '❤️',
          id: null,
          animated: false,
          discordFormat: '❤️',
          url: null,
          count: 3,
          messageId: 'msg2',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        },
        {
          type: 'unicode',
          identifier: '👍',
          name: '👍',
          id: null,
          animated: false,
          discordFormat: '👍',
          url: null,
          count: 2,
          messageId: 'msg3',
          channelId: 'ch2',
          timestamp: new Date('2024-01-01')
        }
      ]

      const result = analyzeEmojiUsage(mockReactions)

      // 総リアクション数
      expect(result.summary.totalReactions).toBe(10) // 5 + 3 + 2

      // 絵文字統計
      expect(result.emojiStats).toHaveLength(2)
      
      // 👍が1位（使用回数順でソート）
      expect(result.emojiStats[0]?.identifier).toBe('👍')
      expect(result.emojiStats[0]?.totalCount).toBe(7) // 5 + 2
      expect(result.emojiStats[0]?.messageCount).toBe(2) // 2つのメッセージ
      expect(result.emojiStats[0]?.usageRate).toBe(70) // 7/10 * 100
      expect(result.emojiStats[0]?.avgPerMessage).toBe(3.5) // 7/2

      // ❤️が2位
      expect(result.emojiStats[1]?.identifier).toBe('❤️')
      expect(result.emojiStats[1]?.totalCount).toBe(3)
      expect(result.emojiStats[1]?.usageRate).toBe(30) // 3/10 * 100

      // タイプ別統計
      expect(result.typeStats.unicode.count).toBe(2)
      expect(result.typeStats.unicode.totalUsage).toBe(10)
      expect(result.typeStats.unicode.percentage).toBe(100)
      expect(result.typeStats.custom.count).toBe(0)
      expect(result.typeStats.custom.totalUsage).toBe(0)
      expect(result.typeStats.custom.percentage).toBe(0)

      // 人気の絵文字
      expect(result.summary.topEmoji?.identifier).toBe('👍')
    })

    test('カスタム絵文字のリアクションを正しく分析する', () => {
      const mockReactions: ReactionData[] = [
        {
          type: 'custom',
          identifier: '123456789',
          name: 'kusa',
          id: '123456789',
          animated: false,
          discordFormat: '<:kusa:123456789>',
          url: 'https://cdn.discordapp.com/emojis/123456789.png',
          count: 8,
          messageId: 'msg1',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        },
        {
          type: 'custom',
          identifier: '987654321',
          name: 'poggers',
          id: '987654321',
          animated: true,
          discordFormat: '<a:poggers:987654321>',
          url: 'https://cdn.discordapp.com/emojis/987654321.gif',
          count: 4,
          messageId: 'msg2',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        }
      ]

      const result = analyzeEmojiUsage(mockReactions)

      expect(result.summary.totalReactions).toBe(12)
      expect(result.emojiStats).toHaveLength(2)

      // カスタム絵文字の表示形式が正しく設定される
      expect(result.emojiStats[0]?.displayFormat).toBe('<:kusa:123456789>')
      expect(result.emojiStats[1]?.displayFormat).toBe('<a:poggers:987654321>')

      // タイプ別統計
      expect(result.typeStats.custom.count).toBe(2)
      expect(result.typeStats.custom.totalUsage).toBe(12)
      expect(result.typeStats.custom.percentage).toBe(100)
      expect(result.typeStats.unicode.count).toBe(0)
    })

    test('Unicode絵文字とカスタム絵文字の混合で正しく分析する', () => {
      const mockReactions: ReactionData[] = [
        {
          type: 'unicode',
          identifier: '👍',
          name: '👍',
          id: null,
          animated: false,
          discordFormat: '👍',
          url: null,
          count: 6,
          messageId: 'msg1',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        },
        {
          type: 'custom',
          identifier: '123456789',
          name: 'kusa',
          id: '123456789',
          animated: false,
          discordFormat: '<:kusa:123456789>',
          url: 'https://cdn.discordapp.com/emojis/123456789.png',
          count: 4,
          messageId: 'msg2',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        }
      ]

      const result = analyzeEmojiUsage(mockReactions)

      expect(result.summary.totalReactions).toBe(10)
      
      // タイプ別統計の割合
      expect(result.typeStats.unicode.percentage).toBe(60) // 6/10 * 100
      expect(result.typeStats.custom.percentage).toBe(40) // 4/10 * 100
      expect(result.typeStats.total.totalUsage).toBe(10)
    })

    test('チャンネル別統計が正しく生成される', () => {
      const mockReactions: ReactionData[] = [
        {
          type: 'unicode',
          identifier: '👍',
          name: '👍',
          id: null,
          animated: false,
          discordFormat: '👍',
          url: null,
          count: 5,
          messageId: 'msg1',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        },
        {
          type: 'unicode',
          identifier: '❤️',
          name: '❤️',
          id: null,
          animated: false,
          discordFormat: '❤️',
          url: null,
          count: 3,
          messageId: 'msg2',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        },
        {
          type: 'unicode',
          identifier: '👍',
          name: '👍',
          id: null,
          animated: false,
          discordFormat: '👍',
          url: null,
          count: 2,
          messageId: 'msg3',
          channelId: 'ch2',
          timestamp: new Date('2024-01-01')
        }
      ]

      const result = analyzeEmojiUsage(mockReactions)

      expect(result.channelStats).toHaveLength(2)
      
      // リアクション数順でソートされている
      expect(result.channelStats[0]?.channelId).toBe('ch1')
      expect(result.channelStats[0]?.totalReactions).toBe(8) // 5 + 3
      expect(result.channelStats[0]?.uniqueEmojis).toBe(2) // 👍, ❤️
      expect(result.channelStats[0]?.messageCount).toBe(2)

      expect(result.channelStats[1]?.channelId).toBe('ch2')
      expect(result.channelStats[1]?.totalReactions).toBe(2)
      expect(result.channelStats[1]?.uniqueEmojis).toBe(1) // 👍のみ
      expect(result.channelStats[1]?.messageCount).toBe(1)
    })

    test('同じ絵文字を同じメッセージで複数回使用した場合', () => {
      const mockReactions: ReactionData[] = [
        {
          type: 'unicode',
          identifier: '👍',
          name: '👍',
          id: null,
          animated: false,
          discordFormat: '👍',
          url: null,
          count: 5,
          messageId: 'msg1',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        },
        {
          type: 'unicode',
          identifier: '👍',
          name: '👍',
          id: null,
          animated: false,
          discordFormat: '👍',
          url: null,
          count: 3,
          messageId: 'msg1', // 同じメッセージ
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        }
      ]

      const result = analyzeEmojiUsage(mockReactions)

      expect(result.emojiStats).toHaveLength(1)
      expect(result.emojiStats[0]?.totalCount).toBe(8) // 5 + 3
      expect(result.emojiStats[0]?.messageCount).toBe(2) // 2つのリアクションエントリ
      expect(result.emojiStats[0]?.reactions).toHaveLength(2)
    })
  })

  describe('getTopEmojis関数', () => {
    test('指定した数の絵文字が返される', () => {
      const mockEmojiStats: EmojiStats[] = Array.from({ length: 10 }, (_, i) => ({
        identifier: `emoji${i}`,
        name: `emoji${i}`,
        type: 'unicode' as const,
        id: null,
        animated: false,
        totalCount: 10 - i, // 降順
        messageCount: 1,
        reactions: [],
        usageRate: 0,
        avgPerMessage: 0,
        displayFormat: `emoji${i}`,
        safeName: `emoji${i}`
      }))

      const top5 = getTopEmojis(mockEmojiStats, 5)
      
      expect(top5).toHaveLength(5)
      expect(top5[0]?.identifier).toBe('emoji0')
      expect(top5[4]?.identifier).toBe('emoji4')
    })

    test('デフォルトで20個の絵文字が返される', () => {
      const mockEmojiStats: EmojiStats[] = Array.from({ length: 30 }, (_, i) => ({
        identifier: `emoji${i}`,
        name: `emoji${i}`,
        type: 'unicode' as const,
        id: null,
        animated: false,
        totalCount: 30 - i,
        messageCount: 1,
        reactions: [],
        usageRate: 0,
        avgPerMessage: 0,
        displayFormat: `emoji${i}`,
        safeName: `emoji${i}`
      }))

      const top = getTopEmojis(mockEmojiStats)
      
      expect(top).toHaveLength(20)
    })

    test('配列の長さが指定数より少ない場合は全て返される', () => {
      const mockEmojiStats: EmojiStats[] = Array.from({ length: 3 }, (_, i) => ({
        identifier: `emoji${i}`,
        name: `emoji${i}`,
        type: 'unicode' as const,
        id: null,
        animated: false,
        totalCount: 3 - i,
        messageCount: 1,
        reactions: [],
        usageRate: 0,
        avgPerMessage: 0,
        displayFormat: `emoji${i}`,
        safeName: `emoji${i}`
      }))

      const top10 = getTopEmojis(mockEmojiStats, 10)
      
      expect(top10).toHaveLength(3)
    })
  })

  describe('エッジケース', () => {
    test('使用回数が同じ絵文字は名前順でソートされる', () => {
      const mockReactions: ReactionData[] = [
        {
          type: 'unicode',
          identifier: 'zebra',
          name: 'zebra',
          id: null,
          animated: false,
          discordFormat: 'zebra',
          url: null,
          count: 5,
          messageId: 'msg1',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        },
        {
          type: 'unicode',
          identifier: 'apple',
          name: 'apple',
          id: null,
          animated: false,
          discordFormat: 'apple',
          url: null,
          count: 5, // 同じ使用回数
          messageId: 'msg2',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        }
      ]

      const result = analyzeEmojiUsage(mockReactions)

      expect(result.emojiStats[0]?.identifier).toBe('apple') // 名前順で先
      expect(result.emojiStats[1]?.identifier).toBe('zebra')
    })

    test('ゼロ使用回数では割り算エラーが発生しない', () => {
      const mockReactions: ReactionData[] = [
        {
          type: 'unicode',
          identifier: '👍',
          name: '👍',
          id: null,
          animated: false,
          discordFormat: '👍',
          url: null,
          count: 0, // ゼロ回数
          messageId: 'msg1',
          channelId: 'ch1',
          timestamp: new Date('2024-01-01')
        }
      ]

      expect(() => analyzeEmojiUsage(mockReactions)).not.toThrow()
      const result = analyzeEmojiUsage(mockReactions)
      expect(result.summary.totalReactions).toBe(0)
    })
  })
})