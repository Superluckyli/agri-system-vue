<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getReportDashboard } from '@/api/modules'
import type { DashboardData, NameValueItem } from '@/types/entity'
import TaskTrendChart from '@/components/dashboard/TaskTrendChart.vue'
import PageState from '@/components/page/PageState.vue'
import { usePageState } from '@/composables/usePageState'

const { loading, errorMessage, start, finish, fail } = usePageState()
const dashboardData = ref<DashboardData>()

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

function sumItems(items: NameValueItem[] | undefined): number {
  return (items ?? []).reduce((total, item) => total + toNumber(item.value), 0)
}

const overviewCards = computed(() => {
  const cropDistribution = dashboardData.value?.cropDistribution
  const envMonitor = dashboardData.value?.envMonitor

  return [
    {
      label: '作物分布项',
      value: (cropDistribution ?? []).length,
      suffix: '项',
    },
    {
      label: '作物总量',
      value: sumItems(cropDistribution),
      suffix: '',
    },
    {
      label: '环境监测项',
      value: (envMonitor ?? []).length,
      suffix: '项',
    },
    {
      label: '环境指标总值',
      value: sumItems(envMonitor),
      suffix: '',
    },
  ]
})

const isEmpty = computed(() => {
  const data = dashboardData.value
  if (!data) {
    return true
  }

  const hasCropData = (data.cropDistribution?.length ?? 0) > 0
  const hasEnvData = (data.envMonitor?.length ?? 0) > 0
  const hasTrendData = (data.taskTrend?.xAxis?.length ?? 0) > 0
  return !hasCropData && !hasEnvData && !hasTrendData
})

async function loadDashboard(): Promise<void> {
  start()
  try {
    dashboardData.value = await getReportDashboard()
    finish()
  } catch (error) {
    fail(error)
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <div class="page">
    <div class="page__header">
      <div>
        <h2>数据看板</h2>
        <p>对接 `/report/dashboard`，展示任务趋势与关键指标。</p>
      </div>
      <el-button type="primary" plain @click="loadDashboard">刷新</el-button>
    </div>

    <PageState
      :loading="loading"
      :error-message="errorMessage"
      :empty="isEmpty"
      empty-description="暂无看板数据"
      @retry="loadDashboard"
    >
      <div class="overview-grid">
        <el-card v-for="card in overviewCards" :key="card.label" class="overview-card">
          <p>{{ card.label }}</p>
          <strong>{{ card.value }}{{ card.suffix }}</strong>
        </el-card>
      </div>

      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <span>任务趋势</span>
            <small>来源：`dashboard.taskTrend`</small>
          </div>
        </template>
        <TaskTrendChart :chart-data="dashboardData?.taskTrend" />
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <span>环境监测</span>
            <small>来源：`dashboard.envMonitor`</small>
          </div>
        </template>
        <el-table :data="dashboardData?.envMonitor ?? []" border stripe>
          <el-table-column prop="name" label="指标名称" min-width="180" />
          <el-table-column prop="value" label="指标值" min-width="140" />
        </el-table>
      </el-card>
    </PageState>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
}

.page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.page__header h2 {
  margin: 0;
  font-size: 24px;
  color: #203427;
}

.page__header p {
  margin: 5px 0 0;
  color: var(--agri-text-muted);
  font-size: 14px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.overview-card p {
  margin: 0;
  color: var(--agri-text-muted);
  font-size: 13px;
}

.overview-card strong {
  margin-top: 10px;
  display: block;
  font-size: 28px;
  color: #243c2d;
  font-weight: 600;
}

.chart-card {
  border-radius: 14px;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.card-header small {
  color: var(--agri-text-muted);
}

@media (max-width: 1100px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
