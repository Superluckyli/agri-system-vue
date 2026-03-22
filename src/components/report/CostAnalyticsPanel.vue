<script setup lang="ts">
defineOptions({ name: 'CostAnalyticsPanel' })

import { computed } from 'vue'

import BaseChart from '@/components/BaseChart.vue'
import type { CostAnalyticsData } from '@/types/entity'
import {
  buildCategoryCostShareOption,
  buildMaterialCostTopOption,
  buildPurchaseTrendOption,
} from '@/views/report/reportAnalyticsShared'

const props = defineProps<{
  data: CostAnalyticsData
}>()

const purchaseTrendOption = computed(() => buildPurchaseTrendOption(props.data.purchaseTrend))
const materialCostOption = computed(() => buildMaterialCostTopOption(props.data.materialCostTopN))
const categoryCostOption = computed(() => buildCategoryCostShareOption(props.data.categoryCostShare))
</script>

<template>
  <div class="cost-analytics-panel">
    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>采购趋势</template>
          <BaseChart :options="purchaseTrendOption" height="280px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>物料成本 TopN</template>
          <BaseChart :options="materialCostOption" height="280px" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" class="panel-section">
      <template #header>成本分类占比</template>
      <BaseChart :options="categoryCostOption" height="300px" />
    </el-card>

    <el-card shadow="hover" class="panel-section">
      <template #header>异常成本项</template>
      <el-table :data="props.data.abnormalCostItems" style="width: 100%">
        <el-table-column prop="materialName" label="物料" min-width="160" />
        <el-table-column prop="category" label="分类" min-width="120" />
        <el-table-column prop="cost" label="成本" min-width="120" />
        <el-table-column prop="supplierName" label="供应商" min-width="140" />
        <el-table-column prop="note" label="备注" min-width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.panel-section {
  margin-top: 16px;
}
</style>
