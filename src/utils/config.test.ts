// 設定管理のテスト
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

// dotenvをモックして.envファイルの影響を除外
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn()
  },
  config: vi.fn()
}))

describe('config.ts', () => {
  // 元の環境変数を保存
  const originalEnv = process.env

  beforeEach(() => {
    // 環境変数をリセット
    vi.resetModules()
    process.env = { ...originalEnv }
    
    // Discord関連の環境変数をクリア
    delete process.env.DISCORD_TOKEN
    delete process.env.CLIENT_ID
    delete process.env.TARGET_CHANNELS
    delete process.env.REPORT_CHANNEL
    delete process.env.ANALYSIS_DAYS
    delete process.env.TOP_EMOJI_COUNT
    delete process.env.SCHEDULE_CRON
    delete process.env.SCHEDULE_TIMEZONE
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv
  })

  describe('設定値の検証', () => {
    test('必須環境変数が設定されている場合は正常に動作する', async () => {
      // 必要な環境変数を設定
      process.env.DISCORD_TOKEN = 'test_token_1234567890'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '123456789012345678,987654321098765432'
      process.env.REPORT_CHANNEL = '111222333444555666'

      // 動的import でモジュールを読み込み
      const { config, validateConfig } = await import('./config')

      expect(config.token).toBe('test_token_1234567890')
      expect(config.applicationId).toBe('123456789012345678')
      expect(config.channels.targets).toEqual(['123456789012345678', '987654321098765432'])
      expect(config.channels.report).toBe('111222333444555666')
      expect(config.analysis.days).toBe(7) // デフォルト値
      expect(config.analysis.topCount).toBe(20) // デフォルト値

      // 検証関数が例外を投げないことを確認
      expect(() => validateConfig()).not.toThrow()
    })

    test('必須環境変数が不足している場合はエラーになる', async () => {
      // 必要な環境変数を設定しない
      delete process.env.DISCORD_TOKEN
      delete process.env.CLIENT_ID
      delete process.env.TARGET_CHANNELS
      delete process.env.REPORT_CHANNEL

      await expect(async () => {
        const { config } = await import('./config')
        return config // configオブジェクトにアクセスしてエラーを発生させる
      }).rejects.toThrow('必須の環境変数が設定されていません')
    })

    test('数値型環境変数が正しく処理される', async () => {
      // 必須環境変数を設定
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '123456789012345678'
      process.env.REPORT_CHANNEL = '111222333444555666'
      
      // 数値型環境変数を設定
      process.env.ANALYSIS_DAYS = '14'
      process.env.TOP_EMOJI_COUNT = '50'

      const { config } = await import('./config')

      expect(config.analysis.days).toBe(14)
      expect(config.analysis.topCount).toBe(50)
    })

    test('無効な数値が設定された場合はエラーになる', async () => {
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '123456789012345678'
      process.env.REPORT_CHANNEL = '111222333444555666'
      process.env.ANALYSIS_DAYS = 'invalid_number'

      await expect(async () => {
        await import('./config')
      }).rejects.toThrow('は数値である必要があります')
    })

    test('開発モードの設定が正しく処理される', async () => {
      // 必須環境変数を設定
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '123456789012345678'
      process.env.REPORT_CHANNEL = '111222333444555666'

      // 開発モードをテスト
      process.env.NODE_ENV = 'development'
      const { config: devConfig } = await import('./config')
      expect(devConfig.development).toBe(true)

      // モジュールをリセットして本番モードをテスト
      vi.resetModules()
      delete process.env.NODE_ENV
      const { config: prodConfig } = await import('./config')
      expect(prodConfig.development).toBe(false)
    })
  })

  describe('validateConfig関数', () => {
    test('無効なDiscord IDでエラーになる', async () => {
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = 'invalid_id' // 無効なID
      process.env.TARGET_CHANNELS = '123456789012345678'
      process.env.REPORT_CHANNEL = '111222333444555666'

      const { validateConfig } = await import('./config')
      expect(() => validateConfig()).toThrow('有効なDiscord IDである必要があります')
    })

    test('空のTARGET_CHANNELSでエラーになる', async () => {
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '' // 空
      process.env.REPORT_CHANNEL = '111222333444555666'

      const { validateConfig } = await import('./config')
      expect(() => validateConfig()).toThrow('少なくとも1つのチャンネルIDを設定してください')
    })

    test('無効な分析日数でエラーになる', async () => {
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '123456789012345678'
      process.env.REPORT_CHANNEL = '111222333444555666'
      process.env.ANALYSIS_DAYS = '0' // 無効な値

      const { validateConfig } = await import('./config')
      expect(() => validateConfig()).toThrow('1以上の数値である必要があります')
    })
  })

  describe('getConfigSummary関数', () => {
    test('設定サマリーが正しく生成される', async () => {
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '123456789012345678,987654321098765432'
      process.env.REPORT_CHANNEL = '111222333444555666'
      process.env.ANALYSIS_DAYS = '14'
      delete process.env.SCHEDULE_CRON // デフォルト値を使用
      delete process.env.NODE_ENV // 開発モードOFF

      const { getConfigSummary } = await import('./config')
      const summary = getConfigSummary()

      expect(summary).toEqual({
        applicationId: '123456789012345678',
        targetChannels: 2,
        reportChannel: '111222333444555666',
        analysisDays: 14,
        topCount: 20,
        schedule: '0 10 * * 1',
        development: false
      })
    })
  })

  describe('環境変数の配列処理', () => {
    test('カンマ区切りの値が正しく配列に変換される', async () => {
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '111111111111111111, 222222222222222222 , 333333333333333333'
      process.env.REPORT_CHANNEL = '111222333444555666'

      const { config } = await import('./config')

      expect(config.channels.targets).toEqual([
        '111111111111111111',
        '222222222222222222',
        '333333333333333333'
      ])
    })

    test('空の文字列や空白のみの値は除外される', async () => {
      process.env.DISCORD_TOKEN = 'test_token'
      process.env.CLIENT_ID = '123456789012345678'
      process.env.TARGET_CHANNELS = '111111111111111111,,   ,222222222222222222'
      process.env.REPORT_CHANNEL = '111222333444555666'

      const { config } = await import('./config')

      expect(config.channels.targets).toEqual([
        '111111111111111111',
        '222222222222222222'
      ])
    })
  })
})