import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type {
  CostAnalyticsData,
  ProductionAnalyticsData,
  ReportAnalyticsOverviewData,
  TaskAnalyticsData,
} from '@/types/entity'

const {
  mockGetReportAnalyticsOverview,
  mockGetReportAnalyticsTask,
  mockGetReportAnalyticsProduction,
  mockGetReportAnalyticsCost,
} = vi.hoisted(() => ({
  mockGetReportAnalyticsOverview: vi.fn(),
  mockGetReportAnalyticsTask: vi.fn(),
  mockGetReportAnalyticsProduction: vi.fn(),
  mockGetReportAnalyticsCost: vi.fn(),
}))

vi.mock('@/api/modules/report', () => ({
  getReportAnalyticsOverview: mockGetReportAnalyticsOverview,
  getReportAnalyticsTask: mockGetReportAnalyticsTask,
  getReportAnalyticsProduction: mockGetReportAnalyticsProduction,
  getReportAnalyticsCost: mockGetReportAnalyticsCost,
}))

const overviewFixture: ReportAnalyticsOverviewData = {
  filterContext: { startDate: '2026-03-01', endDate: '2026-03-31', granularity: 'day' },
  kpis: {
    taskCompletionRate: 80,
    onTimeExecutionRate: 75,
    overdueTaskCount: 2,
    activeBatchCount: 5,
    outputAchievementRate: 85,
    purchaseAmount: 1200,
    materialCost: 680,
    updatedAt: '2026-03-31 09:00:00',
  },
}

const taskFixture: TaskAnalyticsData = {
  filterContext: overviewFixture.filterContext,
  trend: { labels: ['03-01'], created: [5], completed: [3], overdue: [1] },
  statusDistribution: { labels: ['03-01'], series: [{ name: 'completed', data: [3] }] },
  assigneeRanking: [{ assigneeName: '王工人', assignedCount: 4, completedCount: 3, completionRate: 75, onTimeRate: 66.7, overdueRate: 25 }],
  abnormalTasks: [{ taskId: 1, taskName: '异常任务', overdueDays: 2 }],
}

const productionFixture: ProductionAnalyticsData = {
  filterContext: overviewFixture.filterContext,
  cropDistribution: [{ cropVariety: '水稻', batchCount: 2 }],
  outputComparison: [{ batchId: 1, batchNo: 'B-001', cropVariety: '水稻', targetOutput: 100, actualOutput: 85, achievementRate: 85 }],
  harvestTrend: { labels: ['2026-06'], batchCount: [2], estimatedOutput: [14000] },
  riskBatches: [],
}

const costFixture: CostAnalyticsData = {
  filterContext: overviewFixture.filterContext,
  purchaseTrend: { labels: ['03-01'], amount: [1000], orderCount: [2] },
  materialCostTopN: [{ materialId: 1, name: '复合肥料', consumedQty: 120, cost: 288 }],
  categoryCostShare: [{ category: '肥料', cost: 288, percent: 80 }],
  abnormalCostItems: [],
}

describe('ReportAnalyticsView', () => {
  it('renders fixed KPI cards and three analytics tabs after data loads', async () => {
    const ReportAnalyticsView = (await import('../ReportAnalyticsView.vue')).default

    mockGetReportAnalyticsOverview.mockResolvedValue(overviewFixture)
    mockGetReportAnalyticsTask.mockResolvedValue(taskFixture)
    mockGetReportAnalyticsProduction.mockResolvedValue(productionFixture)
    mockGetReportAnalyticsCost.mockResolvedValue(costFixture)

    const wrapper = mount(ReportAnalyticsView, {
      global: {
        stubs: {
          'el-card': { template: '<div class="el-card-stub"><slot name="header" /><slot /></div>' },
          'el-alert': { template: '<div class="el-alert-stub"><slot name="title" /><slot /></div>' },
          'el-button': { template: '<button><slot /></button>' },
          'el-tabs': { template: '<div class="el-tabs-stub"><slot /></div>' },
          'el-tab-pane': {
            props: ['label', 'name'],
            template: '<section class="el-tab-pane-stub">{{ label }}<slot /></section>',
          },
          ReportFilterBar: { name: 'ReportFilterBar', template: '<div class="filter-bar-stub" />' },
          ReportKpiRow: { name: 'ReportKpiRow', template: '<div class="kpi-row-stub">任务完成率</div>' },
          TaskAnalyticsPanel: { name: 'TaskAnalyticsPanel', template: '<div class="task-panel-stub">任务运营面板</div>' },
          ProductionAnalyticsPanel: { name: 'ProductionAnalyticsPanel', template: '<div class="production-panel-stub">种植产出面板</div>' },
          CostAnalyticsPanel: { name: 'CostAnalyticsPanel', template: '<div class="cost-panel-stub">成本采购面板</div>' },
          PageState: { name: 'PageState', template: '<div class="page-state-stub"><slot /></div>' },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('统计报表中心')
    expect(wrapper.text()).toContain('任务运营')
    expect(wrapper.text()).toContain('种植产出')
    expect(wrapper.text()).toContain('成本采购')
    expect(wrapper.text()).toContain('任务完成率')
    expect(wrapper.findComponent({ name: 'ReportKpiRow' }).exists()).toBe(true)
    expect(mockGetReportAnalyticsOverview).toHaveBeenCalledTimes(1)
    expect(mockGetReportAnalyticsTask).toHaveBeenCalledTimes(1)
  }, 15000)
})
