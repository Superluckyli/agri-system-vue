<script setup lang="ts">
defineOptions({ name: 'ProductionAnalyticsPanel' })

import { computed } from 'vue'

import BaseChart from '@/components/BaseChart.vue'
import type { ProductionAnalyticsData } from '@/types/entity'
import {
  buildCropDistributionOption,
  buildHarvestTrendOption,
  buildOutputComparisonOption,
} from '@/views/report/reportAnalyticsShared'

const props = defineProps<{
  data: ProductionAnalyticsData
}>()

const cropDistributionOption = computed(() => buildCropDistributionOption(props.data.cropDistribution))
const outputComparisonOption = computed(() => buildOutputComparisonOption(props.data.outputComparison))
const harvestTrendOption = computed(() => buildHarvestTrendOption(props.data.harvestTrend))
</script>

<template>
  <div class="production-analytics-panel">
    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>作物 / 品种分布</template>
          <BaseChart :options="cropDistributionOption" height="280px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>目标产量 vs 实际产量</template>
          <BaseChart :options="outputComparisonOption" height="280px" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" class="panel-section">
      <template #header>预计收获趋势</template>
      <BaseChart :options="harvestTrendOption" height="300px" />
    </el-card>

    <el-card shadow="hover" class="panel-section">
      <template #header>风险批次</template>
      <el-table :data="props.data.riskBatches" style="width: 100%">
        <el-table-column prop="batchNo" label="批次编号" min-width="160" />
        <el-table-column prop="cropVariety" label="作物" min-width="120" />
        <el-table-column prop="farmlandName" label="地块" min-width="120" />
        <el-table-column prop="achievementRate" label="达成率" min-width="100" />
        <el-table-column prop="estimatedHarvestDate" label="预计收获" min-width="140" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.panel-section {
  margin-top: 16px;
}
</style>
