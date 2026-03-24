<script setup lang="ts">
defineOptions({ name: 'ReportAnalyticsView' })

import { onMounted, reactive, ref, watch } from 'vue'

import ReportAiDrawer from '@/components/report/ReportAiDrawer.vue'
import ReportAiFab from '@/components/report/ReportAiFab.vue'

import PageState from '@/components/page/PageState.vue'
import CostAnalyticsPanel from '@/components/report/CostAnalyticsPanel.vue'
import ProductionAnalyticsPanel from '@/components/report/ProductionAnalyticsPanel.vue'
import ReportFilterBar from '@/components/report/ReportFilterBar.vue'
import ReportKpiRow from '@/components/report/ReportKpiRow.vue'
import TaskAnalyticsPanel from '@/components/report/TaskAnalyticsPanel.vue'
import {
  getReportAnalyticsCost,
  getReportAnalyticsOverview,
  getReportAnalyticsProduction,
  getReportAnalyticsTask,
} from '@/api/modules/report'
import type {
  CostAnalyticsData,
  ProductionAnalyticsData,
  ReportAnalyticsOverviewKpis,
  TaskAnalyticsData,
} from '@/types/entity'
import { createDefaultReportAnalyticsFilter, normalizeAnalyticsFilter } from './reportAnalyticsShared'
import { useReportAiSummary } from './useReportAiSummary'

type TabKey = 'task' | 'production' | 'cost'

const filter = reactive(createDefaultReportAnalyticsFilter())
const activeTab = ref<TabKey>('task')

const overviewLoading = ref(false)
const overviewError = ref('')
const kpis = ref<ReportAnalyticsOverviewKpis | null>(null)

const taskData = ref<TaskAnalyticsData | null>(null)
const productionData = ref<ProductionAnalyticsData | null>(null)
const costData = ref<CostAnalyticsData | null>(null)

const tabLoading = reactive<Record<TabKey, boolean>>({
  task: false,
  production: false,
  cost: false,
})

const tabError = reactive<Record<TabKey, string>>({
  task: '',
  production: '',
  cost: '',
})

const loadedTabs = reactive<Record<TabKey, boolean>>({
  task: false,
  production: false,
  cost: false,
})

const {
  fabProps,
  drawerProps,
  open: openReportAi,
  close: closeReportAi,
  setVisible: setReportAiVisible,
  abort: abortReportAi,
  clearCache: clearReportAiCache,
} = useReportAiSummary({
  getCurrentTab: () => activeTab.value,
  getFilters: requestParams,
})

function requestParams() {
  return normalizeAnalyticsFilter(filter)
}

function resetLoadedTabs(): void {
  loadedTabs.task = false
  loadedTabs.production = false
  loadedTabs.cost = false
}

async function loadOverview(): Promise<void> {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    const response = await getReportAnalyticsOverview(requestParams())
    kpis.value = response.kpis
  } catch (error) {
    overviewError.value = error instanceof Error ? error.message : '加载统计总览失败'
    kpis.value = null
  } finally {
    overviewLoading.value = false
  }
}

async function loadTaskData(force = false): Promise<void> {
  if (loadedTabs.task && !force) return
  tabLoading.task = true
  tabError.task = ''
  try {
    taskData.value = await getReportAnalyticsTask(requestParams())
    loadedTabs.task = true
  } catch (error) {
    tabError.task = error instanceof Error ? error.message : '加载任务运营分析失败'
  } finally {
    tabLoading.task = false
  }
}

async function loadProductionData(force = false): Promise<void> {
  if (loadedTabs.production && !force) return
  tabLoading.production = true
  tabError.production = ''
  try {
    productionData.value = await getReportAnalyticsProduction(requestParams())
    loadedTabs.production = true
  } catch (error) {
    tabError.production = error instanceof Error ? error.message : '加载种植产出分析失败'
  } finally {
    tabLoading.production = false
  }
}

async function loadCostData(force = false): Promise<void> {
  if (loadedTabs.cost && !force) return
  tabLoading.cost = true
  tabError.cost = ''
  try {
    costData.value = await getReportAnalyticsCost(requestParams())
    loadedTabs.cost = true
  } catch (error) {
    tabError.cost = error instanceof Error ? error.message : '加载成本采购分析失败'
  } finally {
    tabLoading.cost = false
  }
}

async function loadActiveTab(force = false): Promise<void> {
  if (activeTab.value === 'task') {
    await loadTaskData(force)
    return
  }
  if (activeTab.value === 'production') {
    await loadProductionData(force)
    return
  }
  await loadCostData(force)
}

async function refreshCurrentView(force = false): Promise<void> {
  await loadOverview()
  if (!overviewError.value) {
    await loadActiveTab(force)
  }
}

async function handleSearch(): Promise<void> {
  closeReportAi()
  abortReportAi()
  clearReportAiCache()
  resetLoadedTabs()
  await refreshCurrentView(true)
}

async function handleReset(): Promise<void> {
  closeReportAi()
  abortReportAi()
  clearReportAiCache()
  Object.assign(filter, createDefaultReportAnalyticsFilter())
  resetLoadedTabs()
  await refreshCurrentView(true)
}

watch(activeTab, async () => {
  closeReportAi()
  abortReportAi()
  await loadActiveTab()
})

onMounted(async () => {
  await refreshCurrentView()
})
</script>

<template>
  <div class="app-container">
    <ReportFilterBar :model-value="filter" :loading="overviewLoading" @search="handleSearch" @reset="handleReset" />

    <el-alert v-if="overviewError" type="error" :closable="false" style="margin-bottom: 16px">
      <template #title>总览加载失败：{{ overviewError }}</template>
      <el-button text type="primary" @click="refreshCurrentView(true)">点击重试</el-button>
    </el-alert>

    <div class="report-header">
      <div class="title">统计报表中心</div>
      <div class="subtitle">任务运营、种植产出、成本采购的分模块分析</div>
    </div>

    <ReportKpiRow :kpis="kpis" />

    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="任务运营" name="task">
          <PageState
            :loading="tabLoading.task"
            :error-message="tabError.task"
            :empty="!taskData"
            empty-description="暂无任务运营分析数据"
            @retry="loadTaskData(true)"
          >
            <TaskAnalyticsPanel v-if="taskData" :data="taskData" />
          </PageState>
        </el-tab-pane>
        <el-tab-pane label="种植产出" name="production">
          <PageState
            :loading="tabLoading.production"
            :error-message="tabError.production"
            :empty="!productionData"
            empty-description="暂无种植产出分析数据"
            @retry="loadProductionData(true)"
          >
            <ProductionAnalyticsPanel v-if="productionData" :data="productionData" />
          </PageState>
        </el-tab-pane>
        <el-tab-pane label="成本采购" name="cost">
          <PageState
            :loading="tabLoading.cost"
            :error-message="tabError.cost"
            :empty="!costData"
            empty-description="暂无成本采购分析数据"
            @retry="loadCostData(true)"
          >
            <CostAnalyticsPanel v-if="costData" :data="costData" />
          </PageState>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <ReportAiDrawer
      :visible="drawerProps.visible"
      :status="drawerProps.status"
      :sections="drawerProps.sections"
      :error="drawerProps.error"
      @close="closeReportAi"
      @retry="openReportAi"
      @update:visible="setReportAiVisible"
    />
    <ReportAiFab
      :usable="fabProps.usable"
      :loading="fabProps.loading"
      @click="openReportAi"
    />
  </div>
</template>

<style scoped>
.app-container {
  padding: 24px;
}

.report-header {
  margin-bottom: 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}
</style>
