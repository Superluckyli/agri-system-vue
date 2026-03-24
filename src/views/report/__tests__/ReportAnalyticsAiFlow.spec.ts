import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  CostAnalyticsData,
  ProductionAnalyticsData,
  ReportAiSummaryEvent,
  ReportAnalyticsOverviewData,
  TaskAnalyticsData,
} from '@/types/entity'

const {
  mockGetReportAnalyticsOverview,
  mockGetReportAnalyticsTask,
  mockGetReportAnalyticsProduction,
  mockGetReportAnalyticsCost,
  mockStreamReportAiSummary,
} = vi.hoisted(() => ({
  mockGetReportAnalyticsOverview: vi.fn(),
  mockGetReportAnalyticsTask: vi.fn(),
  mockGetReportAnalyticsProduction: vi.fn(),
  mockGetReportAnalyticsCost: vi.fn(),
  mockStreamReportAiSummary: vi.fn(),
}))

vi.mock('@/api/modules/report', () => ({
  getReportAnalyticsOverview: mockGetReportAnalyticsOverview,
  getReportAnalyticsTask: mockGetReportAnalyticsTask,
  getReportAnalyticsProduction: mockGetReportAnalyticsProduction,
  getReportAnalyticsCost: mockGetReportAnalyticsCost,
}))

vi.mock('@/api/reportAi', () => ({
  streamReportAiSummary: mockStreamReportAiSummary,
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

const ReportFilterBarStub = {
  name: 'ReportFilterBar',
  emits: ['search', 'reset'],
  template: `
    <div class="filter-bar-stub">
      <button data-testid="report-search" @click="$emit('search')">搜索</button>
      <button data-testid="report-reset" @click="$emit('reset')">重置</button>
    </div>
  `,
}

const ElTabsStub = {
  name: 'ElTabsStub',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <div class="el-tabs-stub">
      <button data-testid="tab-task" @click="$emit('update:modelValue', 'task')">任务运营</button>
      <button data-testid="tab-production" @click="$emit('update:modelValue', 'production')">种植产出</button>
      <button data-testid="tab-cost" @click="$emit('update:modelValue', 'cost')">成本采购</button>
      <slot />
    </div>
  `,
}

const ReportKpiRowStub = { name: 'ReportKpiRow', template: '<div class="kpi-row-stub">任务完成率</div>' }
const TaskAnalyticsPanelStub = { name: 'TaskAnalyticsPanel', template: '<div class="task-panel-stub">任务运营面板</div>' }
const ProductionAnalyticsPanelStub = { name: 'ProductionAnalyticsPanel', template: '<div class="production-panel-stub">种植产出面板</div>' }
const CostAnalyticsPanelStub = { name: 'CostAnalyticsPanel', template: '<div class="cost-panel-stub">成本采购面板</div>' }
const PageStateStub = { name: 'PageState', template: '<div class="page-state-stub"><slot /></div>' }

let ReportAnalyticsView: unknown

function mountView() {
  return mount(ReportAnalyticsView as never, {
    global: {
      stubs: {
        'el-card': { template: '<div class="el-card-stub"><slot /></div>' },
        'el-alert': { template: '<div class="el-alert-stub"><slot name="title" /><slot /></div>' },
        'el-button': {
          inheritAttrs: false,
          emits: ['click'],
          template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
        },
        'el-drawer': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div v-if="modelValue" data-testid="report-ai-drawer"><slot /></div>',
        },
        'el-empty': { template: '<div class="el-empty-stub"><slot /><slot name="description" /></div>' },
        'el-skeleton': { template: '<div class="el-skeleton-stub" />' },
        'el-tabs': ElTabsStub,
        'el-tab-pane': {
          props: ['label', 'name'],
          template: '<section class="el-tab-pane-stub" :data-name="name"><slot /></section>',
        },
        ReportFilterBar: ReportFilterBarStub,
        ReportKpiRow: ReportKpiRowStub,
        TaskAnalyticsPanel: TaskAnalyticsPanelStub,
        ProductionAnalyticsPanel: ProductionAnalyticsPanelStub,
        CostAnalyticsPanel: CostAnalyticsPanelStub,
        PageState: PageStateStub,
      },
    },
  })
}

beforeEach(async () => {
  vi.clearAllMocks()
  mockGetReportAnalyticsOverview.mockResolvedValue(overviewFixture)
  mockGetReportAnalyticsTask.mockResolvedValue(taskFixture)
  mockGetReportAnalyticsProduction.mockResolvedValue(productionFixture)
  mockGetReportAnalyticsCost.mockResolvedValue(costFixture)
  mockStreamReportAiSummary.mockResolvedValue(undefined)

  ReportAnalyticsView = (await import('../ReportAnalyticsView.vue')).default
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ReportAnalyticsView AI flow', () => {
  it('clicking the floating button opens the drawer and starts the stream for the active tab', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="report-ai-fab"]').exists()).toBe(true)

    await wrapper.find('[data-testid="report-ai-fab"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(true)
    expect(mockStreamReportAiSummary).toHaveBeenCalledTimes(1)
    expect(mockStreamReportAiSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTab: 'task',
        filters: expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
          granularity: 'day',
        }),
      }),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        onEvent: expect.any(Function),
      }),
    )
  })

  it('reuses a successful result for the same tab and closes on tab change', async () => {
    mockStreamReportAiSummary.mockImplementation(async (_request: unknown, options?: { onEvent?: (event: ReportAiSummaryEvent) => void }) => {
      options?.onEvent?.({ type: 'section-start', section: 'conclusion' })
      options?.onEvent?.({ type: 'section-chunk', section: 'conclusion', delta: '任务稳定。' })
      options?.onEvent?.({
        type: 'done',
        result: {
          summary: '完成',
          sections: {
            conclusion: { text: '任务稳定。', completed: true },
          },
        },
      })
    })

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="report-ai-fab"]').trigger('click')
    await flushPromises()
    expect(mockStreamReportAiSummary).toHaveBeenCalledTimes(1)

    await wrapper.find('[data-testid="report-ai-close"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(false)

    await wrapper.find('[data-testid="report-ai-fab"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(true)
    expect(mockStreamReportAiSummary).toHaveBeenCalledTimes(1)

    await wrapper.find('[data-testid="tab-production"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(false)
  })

  it('changing activeTab closes the drawer and aborts the current request', async () => {
    let activeSignal: AbortSignal | undefined
    mockStreamReportAiSummary.mockImplementation(async (_request: unknown, options?: { signal?: AbortSignal }) => {
      activeSignal = options?.signal
      return new Promise<void>((resolve) => {
        activeSignal?.addEventListener('abort', () => resolve(), { once: true })
      })
    })

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="report-ai-fab"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(true)
    expect(activeSignal?.aborted).toBe(false)

    await wrapper.find('[data-testid="tab-production"]').trigger('click')
    await flushPromises()
    expect(activeSignal?.aborted).toBe(true)
    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(false)
  })

  it('handleSearch and handleReset close the drawer and clear the active stream', async () => {
    let activeSignal: AbortSignal | undefined
    mockStreamReportAiSummary.mockImplementation(async (_request: unknown, options?: { signal?: AbortSignal }) => {
      activeSignal = options?.signal
      return new Promise<void>((resolve) => {
        activeSignal?.addEventListener('abort', () => resolve(), { once: true })
      })
    })

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="report-ai-fab"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(true)
    expect(activeSignal?.aborted).toBe(false)

    await wrapper.find('[data-testid="report-search"]').trigger('click')
    await flushPromises()
    expect(activeSignal?.aborted).toBe(true)
    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(false)

    await wrapper.find('[data-testid="report-ai-fab"]').trigger('click')
    await flushPromises()
    const resetSignal = mockStreamReportAiSummary.mock.calls[1]?.[1]?.signal as AbortSignal
    expect(resetSignal.aborted).toBe(false)

    await wrapper.find('[data-testid="report-reset"]').trigger('click')
    await flushPromises()
    expect(resetSignal.aborted).toBe(true)
    expect(wrapper.find('[data-testid="report-ai-drawer"]').exists()).toBe(false)
  })
})
