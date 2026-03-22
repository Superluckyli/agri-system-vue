<script setup lang="ts">
defineOptions({ name: 'TaskAnalyticsPanel' })

import { computed } from 'vue'

import BaseChart from '@/components/BaseChart.vue'
import type { TaskAnalyticsData } from '@/types/entity'
import {
  buildAssigneeRankingOption,
  buildTaskStatusDistributionOption,
  buildTaskTrendOption,
} from '@/views/report/reportAnalyticsShared'

const props = defineProps<{
  data: TaskAnalyticsData
}>()

const trendOption = computed(() => buildTaskTrendOption(props.data.trend))
const statusOption = computed(() => buildTaskStatusDistributionOption(props.data.statusDistribution))
const assigneeOption = computed(() => buildAssigneeRankingOption(props.data.assigneeRanking))
</script>

<template>
  <div class="task-analytics-panel">
    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card shadow="hover">
          <template #header>任务趋势</template>
          <BaseChart :options="trendOption" height="320px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-card shadow="hover" style="margin-bottom: 16px">
              <template #header>任务状态分布</template>
              <BaseChart :options="statusOption" height="150px" />
            </el-card>
          </el-col>
          <el-col :span="24">
            <el-card shadow="hover">
              <template #header>执行人排行</template>
              <BaseChart :options="assigneeOption" height="150px" />
            </el-card>
          </el-col>
        </el-row>
      </el-col>
    </el-row>

    <el-card shadow="hover" class="panel-table">
      <template #header>异常任务</template>
      <el-table :data="props.data.abnormalTasks" style="width: 100%">
        <el-table-column prop="taskName" label="任务名称" min-width="180" />
        <el-table-column prop="assigneeName" label="执行人" min-width="120" />
        <el-table-column prop="statusV2" label="状态" min-width="120" />
        <el-table-column prop="deadlineAt" label="截止时间" min-width="180" />
        <el-table-column prop="overdueDays" label="逾期天数" min-width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.panel-table {
  margin-top: 16px;
}
</style>
