<script setup lang="ts">
defineOptions({ name: 'ReportKpiRow' })

import { computed } from 'vue'

import type { ReportAnalyticsOverviewKpis } from '@/types/entity'

const props = defineProps<{
  kpis?: ReportAnalyticsOverviewKpis | null
}>()

const safeKpis = computed<ReportAnalyticsOverviewKpis>(() => props.kpis ?? {
  taskCompletionRate: 0,
  onTimeExecutionRate: 0,
  overdueTaskCount: 0,
  activeBatchCount: 0,
  outputAchievementRate: 0,
  purchaseAmount: 0,
  materialCost: 0,
})

function asMoney(value: number): string {
  return `¥${Number(value || 0).toLocaleString()}`
}
</script>

<template>
  <div class="report-kpi-row">
    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card shadow="hover">
          <div class="kpi-label">任务完成率</div>
          <div class="kpi-value">{{ safeKpis.taskCompletionRate }}%</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card shadow="hover">
          <div class="kpi-label">准时执行率</div>
          <div class="kpi-value">{{ safeKpis.onTimeExecutionRate }}%</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card shadow="hover">
          <div class="kpi-label">逾期任务数</div>
          <div class="kpi-value">{{ safeKpis.overdueTaskCount }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card shadow="hover">
          <div class="kpi-label">活跃批次数</div>
          <div class="kpi-value">{{ safeKpis.activeBatchCount }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card shadow="hover">
          <div class="kpi-label">产量达成率</div>
          <div class="kpi-value">{{ safeKpis.outputAchievementRate }}%</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <el-card shadow="hover">
          <div class="kpi-label">采购 / 消耗成本</div>
          <div class="kpi-value">{{ asMoney(safeKpis.purchaseAmount) }}</div>
          <div class="kpi-sub">消耗：{{ asMoney(safeKpis.materialCost) }}</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.report-kpi-row {
  margin-bottom: 16px;
}

.kpi-label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

.kpi-value {
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.kpi-sub {
  margin-top: 4px;
  color: #606266;
  font-size: 12px;
}
</style>
