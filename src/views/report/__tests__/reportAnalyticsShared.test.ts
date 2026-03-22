import { describe, expect, it } from 'vitest'

import type {
  CategoryCostShareItem,
  CropDistributionItem,
  HarvestTrendData,
  MaterialCostTopItem,
  OutputComparisonItem,
  PurchaseTrendData,
  TaskAssigneeRankingItem,
  TaskStatusDistributionData,
  TaskTrendData,
} from '@/types/entity'
import {
  buildAssigneeRankingOption,
  buildCategoryCostShareOption,
  buildCropDistributionOption,
  buildHarvestTrendOption,
  buildMaterialCostTopOption,
  buildOutputComparisonOption,
  buildPurchaseTrendOption,
  buildTaskStatusDistributionOption,
  buildTaskTrendOption,
  createDefaultReportAnalyticsFilter,
  normalizeAnalyticsFilter,
} from '../reportAnalyticsShared'

describe('createDefaultReportAnalyticsFilter', () => {
  it('builds a 30-day day-granularity default range', () => {
    const filter = createDefaultReportAnalyticsFilter(new Date('2026-03-30T00:00:00Z'))
    expect(filter).toEqual({
      startDate: '2026-03-01',
      endDate: '2026-03-30',
      granularity: 'day',
    })
  })
})

describe('normalizeAnalyticsFilter', () => {
  it('fills missing values with defaults while preserving provided filters', () => {
    const filter = normalizeAnalyticsFilter(
      { endDate: '2026-03-15', supplierId: 9, granularity: 'week' },
      new Date('2026-03-30T00:00:00Z'),
    )

    expect(filter).toEqual({
      startDate: '2026-03-01',
      endDate: '2026-03-15',
      granularity: 'week',
      farmlandId: undefined,
      varietyId: undefined,
      assigneeId: undefined,
      materialCategory: undefined,
      supplierId: 9,
    })
  })
})

describe('buildTaskTrendOption', () => {
  it('maps task trend labels and three series into a line chart option', () => {
    const data: TaskTrendData = {
      labels: ['03-01', '03-02'],
      created: [5, 6],
      completed: [2, 4],
      overdue: [1, 0],
    }

    const option = buildTaskTrendOption(data)

    expect(option.xAxis).toMatchObject({ type: 'category', data: ['03-01', '03-02'] })
    expect(option.series).toHaveLength(3)
  })
})

describe('buildTaskStatusDistributionOption', () => {
  it('creates stacked series for each task status', () => {
    const data: TaskStatusDistributionData = {
      labels: ['03-01', '03-02'],
      series: [
        { name: 'created', data: [2, 0] },
        { name: 'completed', data: [1, 3] },
      ],
    }

    const option = buildTaskStatusDistributionOption(data)

    expect(option.legend).toMatchObject({ data: ['created', 'completed'] })
    expect(option.series).toEqual([
      expect.objectContaining({ name: 'created', stack: 'status' }),
      expect.objectContaining({ name: 'completed', stack: 'status' }),
    ])
  })
})

describe('buildAssigneeRankingOption', () => {
  it('creates three rate series for assignee ranking', () => {
    const items: TaskAssigneeRankingItem[] = [
      { assigneeName: '王工人', assignedCount: 4, completedCount: 3, completionRate: 75, onTimeRate: 66.7, overdueRate: 25 },
    ]

    const option = buildAssigneeRankingOption(items)

    expect(option.yAxis).toMatchObject({ data: ['王工人'] })
    expect(option.series).toHaveLength(3)
  })
})

describe('production helpers', () => {
  it('builds crop distribution and output comparison options', () => {
    const cropItems: CropDistributionItem[] = [
      { cropVariety: '水稻', batchCount: 2 },
      { cropVariety: '小麦', batchCount: 1 },
    ]
    const outputItems: OutputComparisonItem[] = [
      { batchId: 1, batchNo: 'B-001', cropVariety: '水稻', targetOutput: 100, actualOutput: 85, achievementRate: 85 },
    ]

    const cropOption = buildCropDistributionOption(cropItems)
    const outputOption = buildOutputComparisonOption(outputItems)

    expect(cropOption.xAxis).toMatchObject({ data: ['水稻', '小麦'] })
    expect(outputOption.series).toHaveLength(2)
  })

  it('builds harvest trend option with batch count and estimated output', () => {
    const data: HarvestTrendData = {
      labels: ['2026-06'],
      batchCount: [2],
      estimatedOutput: [14000],
    }

    const option = buildHarvestTrendOption(data)

    expect(option.series).toEqual([
      expect.objectContaining({ name: '批次数', type: 'bar' }),
      expect.objectContaining({ name: '预计产量', type: 'line', yAxisIndex: 1 }),
    ])
  })
})

describe('cost helpers', () => {
  it('builds purchase trend and material cost top options', () => {
    const trend: PurchaseTrendData = {
      labels: ['03-01', '03-02'],
      amount: [1000, 300],
      orderCount: [2, 1],
    }
    const topItems: MaterialCostTopItem[] = [
      { materialId: 1, name: '复合肥料', category: '肥料', consumedQty: 120, cost: 288 },
    ]

    const trendOption = buildPurchaseTrendOption(trend)
    const topOption = buildMaterialCostTopOption(topItems)

    expect(trendOption.series).toHaveLength(2)
    expect(topOption.yAxis).toMatchObject({ data: ['复合肥料'] })
  })

  it('builds a donut option for category cost share', () => {
    const items: CategoryCostShareItem[] = [
      { category: '肥料', cost: 288, percent: 80 },
      { category: '农药', cost: 72, percent: 20 },
    ]

    const option = buildCategoryCostShareOption(items)
    const series = Array.isArray(option.series) ? option.series[0] : option.series

    expect(series).toMatchObject({
      type: 'pie',
      data: [
        { name: '肥料', value: 288 },
        { name: '农药', value: 72 },
      ],
    })
  })
})
