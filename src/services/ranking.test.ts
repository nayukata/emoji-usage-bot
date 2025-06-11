// ランキング表示サービスのテスト
import { describe, test, expect, beforeEach, vi } from 'vitest'
import type { EmojiStats, AnalysisSummary, ChannelStats } from '../types/index'
import { createSimpleRankingText } from './ranking'

// logger をモック
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn()
  }
}))

// config をモック
vi.mock('../utils/config', () => ({
  config: {
    analysis: { topCount: 20 },
    channels: { targets: ['ch1', 'ch2'], report: 'report_ch' }
  }
}))

describe('ranking.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSimpleRankingText関数', () => {
    test('空の絵文字統計で適切なメッセージを返す', () => {
      const mockSummary: AnalysisSummary = {
        totalReactions: 0,
        uniqueEmojis: 0,
        topEmoji: null
      }

      const result = createSimpleRankingText([], mockSummary)

      expect(result).toBe('絵文字使用率ランキング\n\nリアクションが見つかりませんでした。')
    })

    test('正常な絵文字統計で正しいランキングテキストを生成する', () => {
      const mockEmojiStats: EmojiStats[] = [
        {
          identifier: 'thumbs_up',
          name: '👍',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 50,
          messageCount: 10,
          reactions: [],
          usageRate: 50.0,
          avgPerMessage: 5.0,
          displayFormat: '👍',
          safeName: '👍'
        },
        {
          identifier: '123456789',
          name: 'kusa',
          type: 'custom',
          id: '123456789',
          animated: false,
          totalCount: 30,
          messageCount: 6,
          reactions: [],
          usageRate: 30.0,
          avgPerMessage: 5.0,
          displayFormat: '<:kusa:123456789>',
          safeName: ':kusa:'
        },
        {
          identifier: 'heart',
          name: '❤️',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 20,
          messageCount: 8,
          reactions: [],
          usageRate: 20.0,
          avgPerMessage: 2.5,
          displayFormat: '❤️',
          safeName: '❤️'
        }
      ]

      const mockSummary: AnalysisSummary = {
        totalReactions: 100,
        uniqueEmojis: 3,
        topEmoji: mockEmojiStats[0] || null
      }

      const result = createSimpleRankingText(mockEmojiStats, mockSummary)

      // 基本構造の確認
      expect(result).toContain('✨ **絵文字使用率ランキング (TOP 10)**')
      expect(result).toContain('📊 **総リアクション数**: 100個')
      expect(result).toContain('🎨 **絵文字種類数**: 3種類')

      // ランキング内容の確認
      expect(result).toContain('1. 👍 50回 (50.0%)')
      expect(result).toContain('2. <:kusa:123456789> 30回 (30.0%)')
      expect(result).toContain('3. ❤️ 20回 (20.0%)')

      // 順序の確認
      const lines = result.split('\n')
      const rank1Index = lines.findIndex(line => line.includes('1. 👍'))
      const rank2Index = lines.findIndex(line => line.includes('2. <:kusa:123456789>'))
      const rank3Index = lines.findIndex(line => line.includes('3. ❤️'))
      
      expect(rank1Index).toBeLessThan(rank2Index)
      expect(rank2Index).toBeLessThan(rank3Index)
    })

    test('10個を超える絵文字でも上位10個のみ表示される', () => {
      const mockEmojiStats: EmojiStats[] = Array.from({ length: 15 }, (_, i) => ({
        identifier: `emoji${i}`,
        name: `emoji${i}`,
        type: 'unicode' as const,
        id: null,
        animated: false,
        totalCount: 15 - i, // 降順
        messageCount: 1,
        reactions: [],
        usageRate: (15 - i) * 10,
        avgPerMessage: 15 - i,
        displayFormat: `emoji${i}`,
        safeName: `emoji${i}`
      }))

      const mockSummary: AnalysisSummary = {
        totalReactions: 120,
        uniqueEmojis: 15,
        topEmoji: mockEmojiStats[0] || null
      }

      const result = createSimpleRankingText(mockEmojiStats, mockSummary)

      // 10個まで表示されることを確認
      expect(result).toContain('1. emoji0')
      expect(result).toContain('10. emoji9')
      expect(result).not.toContain('11. emoji10') // 11位以降は表示されない
    })

    test('カスタム絵文字の表示形式が正しく使用される', () => {
      const mockEmojiStats: EmojiStats[] = [
        {
          identifier: '123456789',
          name: 'animated_emoji',
          type: 'custom',
          id: '123456789',
          animated: true,
          totalCount: 25,
          messageCount: 5,
          reactions: [],
          usageRate: 100.0,
          avgPerMessage: 5.0,
          displayFormat: '<a:animated_emoji:123456789>',
          safeName: ':animated_emoji:'
        }
      ]

      const mockSummary: AnalysisSummary = {
        totalReactions: 25,
        uniqueEmojis: 1,
        topEmoji: mockEmojiStats[0] || null
      }

      const result = createSimpleRankingText(mockEmojiStats, mockSummary)

      // アニメーション絵文字の表示形式が正しく使用されることを確認
      expect(result).toContain('1. <a:animated_emoji:123456789> 25回 (100.0%)')
    })

    test('数値フォーマットが正しく適用される', () => {
      const mockEmojiStats: EmojiStats[] = [
        {
          identifier: 'popular',
          name: 'popular',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 12345,
          messageCount: 100,
          reactions: [],
          usageRate: 75.5,
          avgPerMessage: 123.45,
          displayFormat: '🔥',
          safeName: '🔥'
        }
      ]

      const mockSummary: AnalysisSummary = {
        totalReactions: 15000,
        uniqueEmojis: 1,
        topEmoji: mockEmojiStats[0] || null
      }

      const result = createSimpleRankingText(mockEmojiStats, mockSummary)

      // 数値が日本語ロケールでフォーマットされることを確認（カンマ区切りの有無どちらでも可）
      expect(result).toMatch(/🔥 12[,]?345回 \(75\.5%\)/)
      expect(result).toMatch(/\*\*総リアクション数\*\*: 15[,]?000個/)
    })

    test('パーセンテージが正しく小数点1桁で表示される', () => {
      const mockEmojiStats: EmojiStats[] = [
        {
          identifier: 'precise',
          name: 'precise',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 33,
          messageCount: 10,
          reactions: [],
          usageRate: 33.333333, // 多くの小数点
          avgPerMessage: 3.3,
          displayFormat: '📊',
          safeName: '📊'
        }
      ]

      const mockSummary: AnalysisSummary = {
        totalReactions: 100,
        uniqueEmojis: 1,
        topEmoji: mockEmojiStats[0] || null
      }

      const result = createSimpleRankingText(mockEmojiStats, mockSummary)

      // 小数点1桁で丸められることを確認
      expect(result).toContain('33回 (33.3%)')
    })
  })

  describe('フォーマッティング関数のテスト（間接的）', () => {
    test('ランク番号が正しく表示される', () => {
      const mockEmojiStats: EmojiStats[] = [
        {
          identifier: 'first',
          name: 'first',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 30,
          messageCount: 1,
          reactions: [],
          usageRate: 60.0,
          avgPerMessage: 30.0,
          displayFormat: '🥇',
          safeName: '🥇'
        },
        {
          identifier: 'second',
          name: 'second',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 20,
          messageCount: 1,
          reactions: [],
          usageRate: 40.0,
          avgPerMessage: 20.0,
          displayFormat: '🥈',
          safeName: '🥈'
        }
      ]

      const mockSummary: AnalysisSummary = {
        totalReactions: 50,
        uniqueEmojis: 2,
        topEmoji: mockEmojiStats[0] || null
      }

      const result = createSimpleRankingText(mockEmojiStats, mockSummary)

      expect(result).toContain('1. 🥇')
      expect(result).toContain('2. 🥈')
    })

    test('ゼロのケースが適切に処理される', () => {
      const mockEmojiStats: EmojiStats[] = [
        {
          identifier: 'zero',
          name: 'zero',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 0,
          messageCount: 1,
          reactions: [],
          usageRate: 0.0,
          avgPerMessage: 0.0,
          displayFormat: '⚪',
          safeName: '⚪'
        }
      ]

      const mockSummary: AnalysisSummary = {
        totalReactions: 0,
        uniqueEmojis: 1,
        topEmoji: mockEmojiStats[0] || null
      }

      const result = createSimpleRankingText(mockEmojiStats, mockSummary)

      expect(result).toContain('0回 (0.0%)')
      expect(result).toContain('0個')
      expect(result).toContain('1種類')
    })
  })

  describe('テキスト構造のテスト', () => {
    test('生成されるテキストが期待する構造を持つ', () => {
      const mockEmojiStats: EmojiStats[] = [
        {
          identifier: 'test',
          name: 'test',
          type: 'unicode',
          id: null,
          animated: false,
          totalCount: 10,
          messageCount: 1,
          reactions: [],
          usageRate: 100.0,
          avgPerMessage: 10.0,
          displayFormat: '🧪',
          safeName: '🧪'
        }
      ]

      const mockSummary: AnalysisSummary = {
        totalReactions: 10,
        uniqueEmojis: 1,
        topEmoji: mockEmojiStats[0] || null
      }

      const result = createSimpleRankingText(mockEmojiStats, mockSummary)
      const lines = result.split('\n')

      // 最低限の構造を持つことを確認
      expect(lines.length).toBeGreaterThan(5)
      expect(result).toMatch(/✨.*絵文字使用率ランキング.*TOP 10/)
      expect(result).toMatch(/📊.*総リアクション数.*個/)
      expect(result).toMatch(/🎨.*絵文字種類数.*種類/)
    })
  })
})