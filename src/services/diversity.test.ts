import { describe, it, expect } from 'vitest'
import {
  calculateShannonEntropy,
  normalizeEntropy,
  calculateGiniCoefficient,
  calculateDiversityReport,
} from './diversity'

describe('calculateShannonEntropy', () => {
  it('空配列は 0 を返す', () => {
    expect(calculateShannonEntropy([])).toBe(0)
  })

  it('全てゼロの配列は 0 を返す', () => {
    expect(calculateShannonEntropy([0, 0, 0])).toBe(0)
  })

  it('1種類のみの場合は 0 を返す', () => {
    expect(calculateShannonEntropy([100])).toBe(0)
  })

  it('均等分布は log2(N) を返す', () => {
    // 4種類均等 → log2(4) = 2.0
    const result = calculateShannonEntropy([25, 25, 25, 25])
    expect(result).toBeCloseTo(2.0, 10)
  })

  it('不均等分布は log2(N) 未満を返す', () => {
    const result = calculateShannonEntropy([90, 5, 3, 2])
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(2.0)
  })

  it('2種類均等で log2(2) = 1.0 を返す', () => {
    expect(calculateShannonEntropy([50, 50])).toBeCloseTo(1.0, 10)
  })
})

describe('normalizeEntropy', () => {
  it('1種類以下は 0 を返す', () => {
    expect(normalizeEntropy(1.0, 1)).toBe(0)
    expect(normalizeEntropy(0, 0)).toBe(0)
  })

  it('均等分布は 1.0 を返す', () => {
    const entropy = Math.log2(4)
    expect(normalizeEntropy(entropy, 4)).toBeCloseTo(1.0, 10)
  })

  it('0-1 の範囲内に収まる', () => {
    const result = normalizeEntropy(1.5, 8)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

describe('calculateGiniCoefficient', () => {
  it('空配列は 0 を返す', () => {
    expect(calculateGiniCoefficient([])).toBe(0)
  })

  it('全てゼロの配列は 0 を返す', () => {
    expect(calculateGiniCoefficient([0, 0, 0])).toBe(0)
  })

  it('完全均等は 0 を返す', () => {
    const result = calculateGiniCoefficient([10, 10, 10, 10])
    expect(result).toBeCloseTo(0, 10)
  })

  it('不均等なほど 1 に近づく', () => {
    const equal = calculateGiniCoefficient([25, 25, 25, 25])
    const unequal = calculateGiniCoefficient([97, 1, 1, 1])
    expect(unequal).toBeGreaterThan(equal)
  })

  it('1要素は 0 を返す', () => {
    expect(calculateGiniCoefficient([100])).toBeCloseTo(0, 10)
  })
})

describe('calculateDiversityReport', () => {
  it('空配列でも正しいレポートを返す', () => {
    const report = calculateDiversityReport([])
    expect(report.entropy).toBe(0)
    expect(report.entropyNormalized).toBe(0)
    expect(report.gini).toBe(0)
    expect(report.uniqueCount).toBe(0)
    expect(report.totalUsage).toBe(0)
  })

  it('ゼロのみの配列はフィルタされる', () => {
    const report = calculateDiversityReport([0, 0, 5, 10])
    expect(report.uniqueCount).toBe(2)
    expect(report.totalUsage).toBe(15)
  })

  it('全フィールドを正しく計算する', () => {
    const report = calculateDiversityReport([10, 10, 10, 10])
    expect(report.entropy).toBeCloseTo(2.0, 10)
    expect(report.entropyNormalized).toBeCloseTo(1.0, 10)
    expect(report.gini).toBeCloseTo(0, 10)
    expect(report.uniqueCount).toBe(4)
    expect(report.totalUsage).toBe(40)
  })
})
