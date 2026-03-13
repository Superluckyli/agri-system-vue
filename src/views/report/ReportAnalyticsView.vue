<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'

import BaseChart from '@/components/BaseChart.vue'
import { listCropBatch } from '@/api/modules/crop'
import { listMaterialInfo, listMaterialStockLog } from '@/api/modules/material'
import { getReportDashboard } from '@/api/modules/report'
import { listTask } from '@/api/modules/task'
import type { AgriCropBatch, AgriTask, DashboardData, MaterialInfo, MaterialStockLog } from '@/types/entity'
import { TASK_STATUS_V2 } from '@/constants/task'

const loading = ref(false)
const loadError = ref('')
const dataTruncated = ref(false)

const dashboardData = ref<DashboardData | null>(null)
const taskRecords = ref<AgriTask[]>([])
const materialRecords = ref<MaterialInfo[]>([])
const materialLogRecords = ref<MaterialStockLog[]>([])
const batchRecords = ref<AgriCropBatch[]>([])

const useFrontendAggregation = computed(() => true)

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

async function fetchData(): Promise<void> {
  loading.value = true
  loadError.value = ''
  dataTruncated.value = false

  try {
    const [dashboardRes, taskRes, materialRes, materialLogRes, batchRes] = await Promise.all([
      getReportDashboard().catch(() => null),
      listTask({ pageNum: 1, pageSize: 500 }).catch(() => null),
      listMaterialInfo({ pageNum: 1, pageSize: 500 }).catch(() => null),
      listMaterialStockLog({ pageNum: 1, pageSize: 500 }).catch(() => null),
      listCropBatch({ pageNum: 1, pageSize: 500 }).catch(() => null),
    ])

    dashboardData.value = dashboardRes
    taskRecords.value = taskRes?.records || []
    materialRecords.value = materialRes?.records || []
    materialLogRecords.value = materialLogRes?.records || []
    batchRecords.value = batchRes?.records || []

    dataTruncated.value =
      toNumber(taskRes?.total) > taskRecords.value.length ||
      toNumber(materialRes?.total) > materialRecords.value.length ||
      toNumber(materialLogRes?.total) > materialLogRecords.value.length ||
      toNumber(batchRes?.total) > batchRecords.value.length
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载报表数据失败'
  } finally {
    loading.value = false
  }
}

const taskCompletionRate = computed(() => {
  const total = taskRecords.value.length
  if (total === 0) {
    return 0
  }
  const completed = taskRecords.value.filter((item) => item.statusV2 === TASK_STATUS_V2.COMPLETED).length
  return Math.round((completed / total) * 100)
})

const taskCompletionOption = computed<EChartsOption>(() => {
  const completed = taskRecords.value.filter((item) => item.statusV2 === TASK_STATUS_V2.COMPLETED).length
  const uncompleted = Math.max(taskRecords.value.length - completed, 0)

  return {
    title: {
      text: `${taskCompletionRate.value}%`,
      subtext: '任务完成率',
      left: 'center',
      top: '40%',
      textStyle: { fontSize: 28, fontWeight: 'bold' },
      subtextStyle: { fontSize: 13 },
    },
    tooltip: { trigger: 'item' },
    series: [
      {
        name: '任务完成率',
        type: 'pie',
        radius: ['58%', '78%'],
        center: ['50%', '46%'],
        label: { show: false },
        data: [
          { value: completed, name: '已完成' },
          { value: uncompleted, name: '未完成' },
        ],
      },
    ],
  }
})

const materialCostOption = computed<EChartsOption>(() => {
  const materialMap = materialRecords.value.reduce<Record<number, MaterialInfo>>((acc, item) => {
    if (item.materialId) {
      acc[item.materialId] = item
    }
    return acc
  }, {})

  const outLogs = materialLogRecords.value.filter((item) => item.changeType === 'task_out' || item.changeType === 'manual_out')
  const aggregate = outLogs.reduce<Record<number, { name: string; quantity: number; cost: number }>>(
    (acc, log) => {
      const materialId = Number(log.materialId || 0)
      if (!materialId) return acc

      const info = materialMap[materialId]
      const name = info?.name || `物料${materialId}`
      const quantity = toNumber(log.qty)
      const price = toNumber(info?.unitPrice)
      const cost = quantity * price

      if (!acc[materialId]) {
        acc[materialId] = { name, quantity: 0, cost: 0 }
      }

      acc[materialId]!.quantity += quantity
      acc[materialId]!.cost += cost
      return acc
    },
    {},
  )

  const items = Object.values(aggregate)
  const xAxis = items.map((item) => item.name)
  const quantitySeries = items.map((item) => Number(item.quantity.toFixed(2)))
  const costSeries = items.map((item) => Number(item.cost.toFixed(2)))

  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 4, data: ['消耗数量', '消耗成本'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: xAxis },
    yAxis: [
      { type: 'value', name: '数量' },
      { type: 'value', name: '成本', alignTicks: true },
    ],
    series: [
      {
        name: '消耗数量',
        type: 'bar',
        data: quantitySeries,
      },
      {
        name: '消耗成本',
        type: 'bar',
        yAxisIndex: 1,
        data: costSeries,
      },
    ],
  }
})

const batchCompareOption = computed<EChartsOption>(() => {
  const aggregate = batchRecords.value.reduce<Record<string, number>>((acc, item) => {
    const key = `品种ID:${item.varietyId || '-'}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const names = Object.keys(aggregate)
  const values = names.map((name) => aggregate[name])

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: '批次数量' },
    series: [
      {
        name: '批次数量',
        type: 'bar',
        data: values,
      },
    ],
  }
})

const trendOption = computed<EChartsOption>(() => {
  const xAxis = dashboardData.value?.taskTrend?.xAxis || []
  const seriesData = dashboardData.value?.taskTrend?.series || []

  return {
    title: { text: dashboardData.value?.taskTrend?.title || '任务趋势' },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: xAxis },
    yAxis: { type: 'value' },
    series: Array.isArray(seriesData)
      ? seriesData.map((item, index) => ({
          name: item.name || `序列${index + 1}`,
          type: 'line',
          smooth: true,
          data: Array.isArray(item.data) ? item.data : [],
        }))
      : [],
  }
})

onMounted(() => {
  void fetchData()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="title">统计报表中心</div>
          <div class="subtitle">任务、投入品、批次的综合统计分析</div>
        </div>
      </template>

      <el-alert
        v-if="useFrontendAggregation"
        type="warning"
        :closable="false"
        style="margin-bottom: 12px"
      >
        <template #title>前端聚合，仅用于演示：当前仅有 `/report/dashboard`，其余图表由 task/material/crop 列表聚合生成。</template>
      </el-alert>

      <el-alert v-if="dataTruncated" type="info" :closable="false" style="margin-bottom: 12px">
        <template #title>部分列表总量超过 500 条，当前报表按前 500 条聚合。</template>
      </el-alert>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchData">点击重试</el-button>
      </el-alert>

      <el-row :gutter="16">
        <el-col :xs="24" :lg="8">
          <el-card shadow="hover">
            <template #header>任务完成率</template>
            <BaseChart :options="taskCompletionOption" height="320px" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="16">
          <el-card shadow="hover">
            <template #header>投入品消耗与成本</template>
            <BaseChart :options="materialCostOption" height="320px" />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 12px">
        <el-col :xs="24" :lg="12">
          <el-card shadow="hover">
            <template #header>作物/批次对比</template>
            <BaseChart :options="batchCompareOption" height="320px" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-card shadow="hover">
            <template #header>任务趋势（报表接口）</template>
            <BaseChart :options="trendOption" height="320px" />
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<style scoped>
.app-container {
  padding: 24px;
}

.card-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-header .subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}
</style>
