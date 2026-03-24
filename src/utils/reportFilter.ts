import type { ReportAnalyticsFilter } from '@/types/entity'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function createDefaultReportAnalyticsFilter(now = new Date()): ReportAnalyticsFilter {
  const endDate = new Date(now)
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - 29)

  // 默认口径统一为最近 30 天，避免图表、AI、缓存各自用不同的初始时间窗。
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

  // 所有请求都先走同一份归一化逻辑，确保页面查询、AI 请求和缓存 key 使用同一口径。
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
