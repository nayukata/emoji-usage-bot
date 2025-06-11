import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // TypeScript対応
    globals: true,
    environment: 'node',
    
    // テストファイル検索パターン
    include: ['src/**/*.{test,spec}.{ts,js}'],
    exclude: ['node_modules', 'dist', 'build'],
    
    // タイムアウト設定
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.d.ts',
        'src/types/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },
    
    // モック設定
    mockReset: true,
    restoreMocks: true,
    
    // 並列実行設定
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/bot': resolve(__dirname, './src/bot'),
      '@/services': resolve(__dirname, './src/services'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types')
    }
  }
})