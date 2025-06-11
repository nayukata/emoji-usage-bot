// ログ機能のテスト
import { describe, test, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import type { User, Client } from 'discord.js'

// コンソールメソッドをモック
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as const

vi.stubGlobal('console', mockConsole)

describe('logger.ts', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks()
  })

  describe('基本的なログ機能', () => {
    test('infoログが正しく出力される', async () => {
      const { logger } = await import('./logger')
      
      logger.info('テストメッセージ')
      
      expect(mockConsole.log).toHaveBeenCalledOnce()
      const logOutput = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls[0]?.[0]
      expect(logOutput).toContain('INFO: テストメッセージ')
      expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
    })

    test('errorログが正しく出力される', async () => {
      const { logger } = await import('./logger')
      
      logger.error('エラーメッセージ')
      
      expect(mockConsole.error).toHaveBeenCalledOnce()
      const errorOutput = (mockConsole.error as MockedFunction<typeof console.error>).mock.calls[0]?.[0]
      expect(errorOutput).toContain('ERROR: エラーメッセージ')
    })

    test('warnログが正しく出力される', async () => {
      const { logger } = await import('./logger')
      
      logger.warn('警告メッセージ')
      
      expect(mockConsole.warn).toHaveBeenCalledOnce()
      const warnOutput = (mockConsole.warn as MockedFunction<typeof console.warn>).mock.calls[0]?.[0]
      expect(warnOutput).toContain('WARN: 警告メッセージ')
    })

    test('データ付きログが正しく出力される', async () => {
      const { logger } = await import('./logger')
      
      const testData = { userId: '123', action: 'test' }
      logger.info('データ付きログ', testData)
      
      expect(mockConsole.log).toHaveBeenCalledOnce()
      const logOutput = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls[0]?.[0]
      expect(logOutput).toContain('INFO: データ付きログ')
      expect(logOutput).toContain(JSON.stringify(testData, null, 2))
    })
  })

  describe('開発モードでのデバッグログ', () => {
    test('開発モードONの場合、debugログが出力される', async () => {
      // モジュールをリセットしてからモック
      vi.resetModules()
      vi.doMock('./config', () => ({
        config: { development: true }
      }))

      const { logger } = await import('./logger')
      
      logger.debug('デバッグメッセージ')
      
      expect(mockConsole.log).toHaveBeenCalledOnce()
      const debugOutput = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls[0]?.[0]
      expect(debugOutput).toContain('DEBUG: デバッグメッセージ')
    })

    test('開発モードOFFの場合、debugログが出力されない', async () => {
      // モジュールをリセットしてからモック
      vi.resetModules()
      vi.doMock('./config', () => ({
        config: { development: false }
      }))

      const { logger } = await import('./logger')
      
      logger.debug('デバッグメッセージ')
      
      expect(mockConsole.log).not.toHaveBeenCalled()
    })
  })

  describe('特殊なログメソッド', () => {
    test('logBotStartが正しく動作する', async () => {
      vi.resetModules()
      vi.doMock('./config', () => ({
        config: {
          channels: { targets: ['1', '2', '3'] },
          analysis: { days: 7 },
          schedule: { cron: '0 10 * * 1' },
          development: false
        }
      }))

      const { logger } = await import('./logger')

      // モックのUser and Clientオブジェクトを作成
      const mockClient = {
        guilds: { cache: { size: 5 } }
      } as Client<true>

      const mockUser = {
        tag: 'TestBot#1234',
        client: mockClient
      } as User

      logger.logBotStart(mockUser)

      // 複数回のログ出力があることを確認
      expect(mockConsole.log).toHaveBeenCalledTimes(9) // 区切り線2回 + 情報7回
      
      // 特定の内容が含まれることを確認
      const allLogs = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls.map(call => call[0])
      expect(allLogs.some(log => log.includes('TestBot#1234'))).toBe(true)
      expect(allLogs.some(log => log.includes('サーバー数: 5'))).toBe(true)
      expect(allLogs.some(log => log.includes('集計対象チャンネル数: 3'))).toBe(true)
    })

    test('logAnalysisStartが正しく動作する', async () => {
      const { logger } = await import('./logger')
      
      logger.logAnalysisStart(5, 14)
      
      expect(mockConsole.log).toHaveBeenCalledTimes(3)
      const allLogs = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls.map(call => call[0])
      expect(allLogs.some(log => log.includes('対象チャンネル: 5個'))).toBe(true)
      expect(allLogs.some(log => log.includes('集計期間: 14日間'))).toBe(true)
    })

    test('logAnalysisCompleteが正しく動作する', async () => {
      const { logger } = await import('./logger')
      
      logger.logAnalysisComplete(1500, 250, 45)
      
      expect(mockConsole.log).toHaveBeenCalledTimes(4)
      const allLogs = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls.map(call => call[0])
      expect(allLogs.some(log => log.includes('処理メッセージ数: 1,500件'))).toBe(true)
      expect(allLogs.some(log => log.includes('総リアクション数: 250個'))).toBe(true)
      expect(allLogs.some(log => log.includes('絵文字種類数: 45種類'))).toBe(true)
    })

    test('logCommandExecutionが正しく動作する', async () => {
      const { logger } = await import('./logger')
      
      logger.logCommandExecution('emoji test', '123456789', '987654321')
      
      expect(mockConsole.log).toHaveBeenCalledOnce()
      const logOutput = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls[0]?.[0]
      expect(logOutput).toContain('INFO: 🎯 コマンド実行: /emoji test')
      expect(logOutput).toContain('123456789')
      expect(logOutput).toContain('987654321')
    })

    test('logErrorが構造化エラーを出力する', async () => {
      const { logger } = await import('./logger')
      
      const testError = new Error('テストエラー')
      testError.stack = 'Error: テストエラー\n  at test'
      
      logger.logError(testError, 'テストコンテキスト')
      
      expect(mockConsole.error).toHaveBeenCalledOnce()
      const errorOutput = (mockConsole.error as MockedFunction<typeof console.error>).mock.calls[0]?.[0]
      expect(errorOutput).toContain('[テストコンテキスト] テストエラー')
      expect(errorOutput).toContain('テストコンテキスト')
      expect(errorOutput).toContain('Error: テストエラー\\n  at test')
    })
  })

  describe('ログデータのフォーマット', () => {
    test('文字列データが正しくフォーマットされる', async () => {
      const { logger } = await import('./logger')
      
      logger.info('メッセージ', 'テストデータ')
      
      const logOutput = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls[0]?.[0]
      expect(logOutput).toContain('| テストデータ')
    })

    test('数値データが正しくフォーマットされる', async () => {
      const { logger } = await import('./logger')
      
      logger.info('メッセージ', 42)
      
      const logOutput = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls[0]?.[0]
      expect(logOutput).toContain('| 42')
    })

    test('nullやundefinedは適切に処理される', async () => {
      const { logger } = await import('./logger')
      
      logger.info('null test', null)
      logger.info('undefined test', undefined)
      
      expect(mockConsole.log).toHaveBeenCalledTimes(2)
      const logs = (mockConsole.log as MockedFunction<typeof console.log>).mock.calls.map(call => call[0])
      expect(logs[0]).toContain('INFO: null test')
      expect(logs[0]).not.toContain('|') // nullの場合はデータ部分なし
      expect(logs[1]).toContain('INFO: undefined test')
      expect(logs[1]).not.toContain('|') // undefinedの場合はデータ部分なし
    })
  })
})