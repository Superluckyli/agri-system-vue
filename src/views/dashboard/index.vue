<script setup lang="ts">
import { markRaw, onBeforeUnmount, onMounted, ref } from 'vue'
import { DataAnalysis, Document, TrendCharts, Warning } from '@element-plus/icons-vue'

import { getReportDashboard } from '@/api/modules/report'
import type { DashboardData, NameValueItem } from '@/api/types/models'
import BaseChart from '@/components/BaseChart.vue'

const loading = ref(true)
const dashboardData = ref<DashboardData>({})

const stats = ref([
  { label: 'Pending Tasks', value: 0, icon: markRaw(Document), color: '#409EFF' },
  { label: 'Warnings Today', value: 0, icon: markRaw(Warning), color: '#E6A23C' },
  { label: 'Materials Inbound', value: 0, icon: markRaw(DataAnalysis), color: '#67C23A' },
  { label: 'Device Online Rate', value: '100%', icon: markRaw(TrendCharts), color: '#909399' },
])

const cropPieOption = ref<Record<string, unknown>>({})
const taskLineOption = ref<Record<string, unknown>>({})

type TaskSeries = {
  name: string
  type: 'line'
  data: Array<number | string>
  smooth: boolean
}

function normalizeTaskSeries(rawSeries: unknown): TaskSeries[] {
  if (!Array.isArray(rawSeries)) {
    return []
  }

  return rawSeries
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const source = item as { name?: unknown; data?: unknown }
      const data = Array.isArray(source.data)
        ? source.data.filter((value): value is number | string => typeof value === 'number' || typeof value === 'string')
        : []

      if (data.length === 0) {
        return null
      }

      const name = typeof source.name === 'string' && source.name.trim() ? source.name : `Series ${index + 1}`
      return {
        name,
        type: 'line' as const,
        data,
        smooth: true,
      }
    })
    .filter((item): item is TaskSeries => item !== null)
}

const fallbackTaskTrend = {
  title: 'Task Trend in Last 7 Days',
  xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [{ name: 'Completed Tasks', type: 'line', data: [120, 132, 101, 134, 90, 230, 210] }],
}

async function fetchData(): Promise<void> {
  try {
    loading.value = true
    const res = await getReportDashboard()
    dashboardData.value = res || {}

    if (res.envMonitor && res.envMonitor.length > 0 && stats.value[1]) {
      stats.value[1].value = Number(res.envMonitor[0]?.value) || 0
    }

    renderCharts()
  } catch (error) {
    console.error('Failed to load dashboard data', error)
  } finally {
    loading.value = false
  }
}

function renderCharts(): void {
  const data = dashboardData.value

  const cropData: NameValueItem[] = data.cropDistribution || [
    { name: 'Wheat', value: 120 },
    { name: 'Corn', value: 80 },
    { name: 'Soybean', value: 45 },
  ]

  cropPieOption.value = {
    title: { text: 'Crop Distribution', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: 'Area',
        type: 'pie',
        radius: '50%',
        data: cropData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }

  const taskTrend = data.taskTrend || fallbackTaskTrend
  const xAxisData = Array.isArray(taskTrend.xAxis) && taskTrend.xAxis.length > 0 ? taskTrend.xAxis : fallbackTaskTrend.xAxis
  const series = normalizeTaskSeries(taskTrend.series)
  const safeSeries = series.length > 0 ? series : normalizeTaskSeries(fallbackTaskTrend.series)

  taskLineOption.value = {
    title: { text: taskTrend.title || fallbackTaskTrend.title },
    tooltip: { trigger: 'axis' },
    legend: { data: safeSeries.map((item) => item.name) },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
    },
    yAxis: { type: 'value' },
    series: safeSeries,
  }
}

onMounted(() => {
  void fetchData()
})

onBeforeUnmount(() => {
  loading.value = false
})
</script>

<template>
  <div class="dashboard-container">
    <el-skeleton :loading="loading" animated :rows="10">
      <template #default>
        <el-row :gutter="20" class="panel-group">
          <el-col v-for="(item, index) in stats" :key="index" :xs="12" :sm="12" :lg="6">
            <el-card class="box-card" shadow="hover">
              <div class="card-content">
                <el-icon :class="['card-icon']" :color="item.color" :size="48">
                  <component :is="item.icon" />
                </el-icon>
                <div class="card-info">
                  <div class="card-title">{{ item.label }}</div>
                  <div class="card-value">{{ item.value }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :lg="10">
            <el-card shadow="hover">
              <div v-if="cropPieOption.series" class="chart-wrapper">
                <BaseChart :options="cropPieOption" height="350px" />
              </div>
              <el-empty v-else description="No chart data" />
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="14">
            <el-card shadow="hover">
              <div v-if="taskLineOption.series" class="chart-wrapper">
                <BaseChart :options="taskLineOption" height="350px" />
              </div>
              <el-empty v-else description="No trend data" />
            </el-card>
          </el-col>
        </el-row>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.dashboard-container {
  position: relative;
  z-index: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  padding: 24px;
}

.panel-group {
  margin-bottom: 24px;
}

.box-card {
  height: 108px;
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-icon {
  padding: 14px;
  border-radius: 6px;
  background-color: #f4f4f5;
  transition: all 0.3s ease-out;
}

.card-icon:hover {
  transform: scale(1.1);
}

.card-info {
  text-align: right;
}

.card-title {
  color: #8c8c8c;
  font-size: 14px;
  margin-bottom: 6px;
}

.card-value {
  color: #666;
  font-size: 24px;
  font-weight: bold;
}

.chart-wrapper {
  position: relative;
  z-index: 0;
  overflow: hidden;
  background: #fff;
}
</style>
