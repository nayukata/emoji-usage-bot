// 多様性指数計算 - Shannon entropy / Gini coefficient
import type { DiversityReport } from '../types/index'

/**
 * Shannon entropy を計算する
 *
 * H = -SUM(p_i * log2(p_i))
 *
 * @param counts - 各絵文字の使用回数配列
 * @returns エントロピー値 (bit)
 */
export function calculateShannonEntropy(counts: number[]): number {
  const total = counts.reduce((sum, c) => sum + c, 0)
  if (total === 0) return 0

  let entropy = 0
  for (const count of counts) {
    if (count === 0) continue
    const p = count / total
    entropy -= p * Math.log2(p)
  }
  return entropy
}

/**
 * 正規化エントロピーを計算する (0-1 スケール)
 *
 * H_normalized = H / log2(N)
 *
 * @param entropy - Shannon entropy
 * @param uniqueCount - ユニーク絵文字数
 */
export function normalizeEntropy(
  entropy: number,
  uniqueCount: number
): number {
  if (uniqueCount <= 1) return 0
  const maxEntropy = Math.log2(uniqueCount)
  return entropy / maxEntropy
}

/**
 * Gini coefficient を計算する
 *
 * G = (2 * SUM(i * x_i)) / (N * SUM(x_i)) - (N + 1) / N
 * x_i は昇順ソート済み、i は 1-indexed
 *
 * @param counts - 各絵文字の使用回数配列
 * @returns Gini coefficient (0 = 完全平等, 1 = 完全不平等)
 */
export function calculateGiniCoefficient(counts: number[]): number {
  if (counts.length === 0) return 0

  const sorted = [...counts].sort((a, b) => a - b)
  const n = sorted.length
  const totalSum = sorted.reduce((sum, c) => sum + c, 0)

  if (totalSum === 0) return 0

  let weightedSum = 0
  for (let i = 0; i < n; i++) {
    const value = sorted[i]
    if (value !== undefined) {
      weightedSum += (i + 1) * value
    }
  }

  return (2 * weightedSum) / (n * totalSum) - (n + 1) / n
}

/**
 * 多様性レポートを生成する
 *
 * @param counts - 各絵文字の使用回数配列
 */
export function calculateDiversityReport(counts: number[]): DiversityReport {
  const nonZeroCounts = counts.filter((c) => c > 0)
  const totalUsage = nonZeroCounts.reduce((sum, c) => sum + c, 0)
  const uniqueCount = nonZeroCounts.length

  const entropy = calculateShannonEntropy(nonZeroCounts)
  const entropyNormalized = normalizeEntropy(entropy, uniqueCount)
  const gini = calculateGiniCoefficient(nonZeroCounts)

  return {
    entropy,
    entropyNormalized,
    gini,
    uniqueCount,
    totalUsage,
  }
}
