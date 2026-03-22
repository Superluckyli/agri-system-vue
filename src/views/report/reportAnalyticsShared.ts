import type { EChartsOption } from 'echarts'

import type {
  CategoryCostShareItem,
  CropDistributionItem,
  HarvestTrendData,
  MaterialCostTopItem,
  OutputComparisonItem,
  PurchaseTrendData,
  ReportAnalyticsFilter,
  TaskAssigneeRankingItem,
  TaskStatusDistributionData,
  TaskTrendData,
} from '@/types/entity'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function toNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export function createDefaultReportAnalyticsFilter(now = new Date()): ReportAnalyticsFilter {
  const endDate = new Date(now)
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - 29)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    granularity: 'day',
  }
}

export function normalizeAnalyticsFilter(
  filter?: Partial<ReportAnalyticsFilter> | null,
  now = new Date(),
): ReportAnalyticsFilter {
  const defaults = createDefaultReportAnalyticsFilter(now)

  return {
    startDate: filter?.startDate || defaults.startDate,
    endDate: filter?.endDate || defaults.endDate,
    granularity: filter?.granularity || defaults.granularity,
    farmlandId: filter?.farmlandId,
    varietyId: filter?.varietyId,
    assigneeId: filter?.assigneeId,
    materialCategory: filter?.materialCategory || undefined,
    supplierId: filter?.supplierId,
  }
}

export function buildTaskTrendOption(data: TaskTrendData): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 4, data: ['创建数', '完成数', '逾期数'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.labels },
    yAxis: { type: 'value', name: '任务数' },
    series: [
      { name: '创建数', type: 'line', smooth: true, data: data.created },
      { name: '完成数', type: 'line', smooth: true, data: data.completed },
      { name: '逾期数', type: 'line', smooth: true, data: data.overdue },
    ],
  }
}

export function buildTaskStatusDistributionOption(data: TaskStatusDistributionData): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 4, data: data.series.map((item) => item.name) },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.labels },
    yAxis: { type: 'value', name: '任务数' },
    series: data.series.map((item) => ({
      name: item.name,
      type: 'bar',
      stack: 'status',
      data: item.data,
    })),
  }
}

export function buildAssigneeRankingOption(items: TaskAssigneeRankingItem[]): EChartsOption {
  const names = items.map((item) => item.assigneeName)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 4, data: ['完成率', '准时率', '逾期率'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', name: '%' },
    yAxis: { type: 'category', data: names },
    series: [
      { name: '完成率', type: 'bar', data: items.map((item) => toNumber(item.completionRate)) },
      { name: '准时率', type: 'bar', data: items.map((item) => toNumber(item.onTimeRate)) },
      { name: '逾期率', type: 'bar', data: items.map((item) => toNumber(item.overdueRate)) },
    ],
  }
}

export function buildCropDistributionOption(items: CropDistributionItem[]): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: items.map((item) => item.cropVariety) },
    yAxis: { type: 'value', name: '批次数' },
    series: [
      {
        name: '批次数',
        type: 'bar',
        data: items.map((item) => item.batchCount),
      },
    ],
  }
}

export function buildOutputComparisonOption(items: OutputComparisonItem[]): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 4, data: ['目标产量', '实际产量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: items.map((item) => item.batchNo) },
    yAxis: { type: 'value', name: '产量' },
    series: [
      { name: '目标产量', type: 'bar', data: items.map((item) => toNumber(item.targetOutput)) },
      { name: '实际产量', type: 'bar', data: items.map((item) => toNumber(item.actualOutput)) },
    ],
  }
}

export function buildHarvestTrendOption(data: HarvestTrendData): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 4, data: ['批次数', '预计产量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.labels },
    yAxis: [
      { type: 'value', name: '批次数' },
      { type: 'value', name: '预计产量', alignTicks: true },
    ],
    series: [
      { name: '批次数', type: 'bar', data: data.batchCount },
      { name: '预计产量', type: 'line', smooth: true, yAxisIndex: 1, data: data.estimatedOutput },
    ],
  }
}

export function buildPurchaseTrendOption(data: PurchaseTrendData): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 4, data: ['采购金额', '订单数'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.labels },
    yAxis: [
      { type: 'value', name: '金额' },
      { type: 'value', name: '订单数', alignTicks: true },
    ],
    series: [
      { name: '采购金额', type: 'bar', data: data.amount },
      { name: '订单数', type: 'line', smooth: true, yAxisIndex: 1, data: data.orderCount },
    ],
  }
}

export function buildMaterialCostTopOption(items: MaterialCostTopItem[]): EChartsOption {
  const names = items.map((item) => item.name)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 4, data: ['消耗数量', '消耗成本'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: names },
    series: [
      { name: '消耗数量', type: 'bar', data: items.map((item) => toNumber(item.consumedQty)) },
      { name: '消耗成本', type: 'bar', data: items.map((item) => toNumber(item.cost)) },
    ],
  }
}

export function buildCategoryCostShareOption(items: CategoryCostShareItem[]): EChartsOption {
  return {
    tooltip: { trigger: 'item' },
    legend: { top: 4 },
    series: [
      {
        name: '成本占比',
        type: 'pie',
        radius: ['45%', '70%'],
        label: { formatter: '{b}: {d}%' },
        data: items.map((item) => ({
          name: item.category,
          value: toNumber(item.cost),
        })),
      },
    ],
  }
}
