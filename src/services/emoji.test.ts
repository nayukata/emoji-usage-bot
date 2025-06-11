// 絵文字分析サービスのテスト
import { describe, test, expect, beforeEach, vi } from 'vitest'
import type { ReactionData, EmojiStats } from '../types/index'
import type { Client } from 'discord.js'
import { analyzeEmojiUsage, getTopEmojis, getUnusedCustomEmojis } from './emoji'

// logger をモック
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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
          timestamp: new Date('2024-01-01'),
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
          timestamp: new Date('2024-01-01'),
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
          timestamp: new Date('2024-01-01'),
        },
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
          timestamp: new Date('2024-01-01'),
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
          timestamp: new Date('2024-01-01'),
        },
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
          timestamp: new Date('2024-01-01'),
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
          timestamp: new Date('2024-01-01'),
        },
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
          timestamp: new Date('2024-01-01'),
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
          timestamp: new Date('2024-01-01'),
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
          timestamp: new Date('2024-01-01'),
        },
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
          timestamp: new Date('2024-01-01'),
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
          timestamp: new Date('2024-01-01'),
        },
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
      const mockEmojiStats: EmojiStats[] = Array.from(
        { length: 10 },
        (_, i) => ({
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
          safeName: `emoji${i}`,
        })
      )

      const top5 = getTopEmojis(mockEmojiStats, 5)

      expect(top5).toHaveLength(5)
      expect(top5[0]?.identifier).toBe('emoji0')
      expect(top5[4]?.identifier).toBe('emoji4')
    })

    test('デフォルトで20個の絵文字が返される', () => {
      const mockEmojiStats: EmojiStats[] = Array.from(
        { length: 30 },
        (_, i) => ({
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
          safeName: `emoji${i}`,
        })
      )

      const top = getTopEmojis(mockEmojiStats)

      expect(top).toHaveLength(20)
    })

    test('配列の長さが指定数より少ない場合は全て返される', () => {
      const mockEmojiStats: EmojiStats[] = Array.from(
        { length: 3 },
        (_, i) => ({
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
          safeName: `emoji${i}`,
        })
      )

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
          timestamp: new Date('2024-01-01'),
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
          timestamp: new Date('2024-01-01'),
        },
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
          timestamp: new Date('2024-01-01'),
        },
      ]

      expect(() => analyzeEmojiUsage(mockReactions)).not.toThrow()
      const result = analyzeEmojiUsage(mockReactions)
      expect(result.summary.totalReactions).toBe(0)
    })
  })

  describe('getUnusedCustomEmojis関数', () => {
    // Discordクライアントのモック
    const createMockClient = (
      serverEmojis: Array<{
        id: string
        name: string
        animated?: boolean
      }>
    ): Client<true> => {
      const mockEmojis = new Map()

      serverEmojis.forEach((emoji) => {
        mockEmojis.set(emoji.id, {
          id: emoji.id,
          name: emoji.name,
          animated: emoji.animated || false,
        })
      })

      return {
        emojis: {
          cache: mockEmojis,
        },
      } as unknown as Client<true>
    }

    test('サーバーに登録されているが使用されていないカスタム絵文字を正しく検出する', () => {
      // サーバーの絵文字
      const client = createMockClient([
        { id: '123', name: 'test1', animated: false },
        { id: '456', name: 'test2', animated: true },
        { id: '789', name: 'test3', animated: false },
        { id: '999', name: 'test4', animated: false },
      ])

      // 使用済み絵文字（123のみ使用）
      const emojiStats: EmojiStats[] = [
        {
          identifier: '<:test1:123>',
          name: 'test1',
          type: 'custom',
          id: '123',
          animated: false,
          totalCount: 10,
          messageCount: 2,
          usageRate: 50.0,
          avgPerMessage: 5.0,
          displayFormat: '<:test1:123>',
          safeName: ':test1:',
          reactions: [],
        },
      ]

      const result = getUnusedCustomEmojis(client, emojiStats)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        id: '456',
        name: 'test2',
        displayFormat: '<a:test2:456>',
        animated: true,
      })
      expect(result[1]).toEqual({
        id: '789',
        name: 'test3',
        displayFormat: '<:test3:789>',
        animated: false,
      })
      expect(result[2]).toEqual({
        id: '999',
        name: 'test4',
        displayFormat: '<:test4:999>',
        animated: false,
      })
    })

    test('すべてのカスタム絵文字が使用されている場合は空配列を返す', () => {
      const client = createMockClient([
        { id: '123', name: 'test1', animated: false },
        { id: '456', name: 'test2', animated: true },
      ])

      const emojiStats: EmojiStats[] = [
        {
          identifier: '<:test1:123>',
          name: 'test1',
          type: 'custom',
          id: '123',
          animated: false,
          totalCount: 10,
          messageCount: 2,
          usageRate: 50.0,
          avgPerMessage: 5.0,
          displayFormat: '<:test1:123>',
          safeName: ':test1:',
          reactions: [],
        },
        {
          identifier: '<a:test2:456>',
          name: 'test2',
          type: 'custom',
          id: '456',
          animated: true,
          totalCount: 5,
          messageCount: 1,
          usageRate: 25.0,
          avgPerMessage: 5.0,
          displayFormat: '<a:test2:456>',
          safeName: ':test2:',
          reactions: [],
        },
      ]

      const result = getUnusedCustomEmojis(client, emojiStats)

      expect(result).toHaveLength(0)
    })

    test('サーバーにカスタム絵文字が登録されていない場合は空配列を返す', () => {
      const client = createMockClient([])

      const emojiStats: EmojiStats[] = []

      const result = getUnusedCustomEmojis(client, emojiStats)

      expect(result).toHaveLength(0)
    })

    test('最大5個まで返す', () => {
      // 10個の絵文字を登録
      const serverEmojis = Array.from({ length: 10 }, (_, i) => ({
        id: `emoji${i}`,
        name: `test${i}`,
        animated: false,
      }))

      const client = createMockClient(serverEmojis)

      // 使用済み絵文字なし（全て未使用）
      const emojiStats: EmojiStats[] = []

      const result = getUnusedCustomEmojis(client, emojiStats)

      expect(result).toHaveLength(5)
      expect(result[0]).toEqual({
        id: 'emoji0',
        name: 'test0',
        displayFormat: '<:test0:emoji0>',
        animated: false,
      })
    })

    test('アニメーション絵文字のdisplayFormatが正しく生成される', () => {
      const client = createMockClient([
        { id: '123', name: 'animated', animated: true },
        { id: '456', name: 'static', animated: false },
      ])

      const result = getUnusedCustomEmojis(client, [])

      expect(result).toHaveLength(2)
      expect(result[0]?.displayFormat).toBe('<a:animated:123>')
      expect(result[1]?.displayFormat).toBe('<:static:456>')
    })

    test('Unicode絵文字は検出対象外', () => {
      const client = createMockClient([
        { id: '123', name: 'custom', animated: false },
      ])

      const emojiStats: EmojiStats[] = [
        {
          identifier: '😊',
          name: '😊',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 10,
          messageCount: 2,
          usageRate: 50.0,
          avgPerMessage: 5.0,
          displayFormat: '😊',
          safeName: '😊',
          reactions: [],
        },
      ]

      const result = getUnusedCustomEmojis(client, emojiStats)

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('123')
    })
  })
})
