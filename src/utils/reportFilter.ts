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
