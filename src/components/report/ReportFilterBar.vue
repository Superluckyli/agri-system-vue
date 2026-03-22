<script setup lang="ts">
defineOptions({ name: 'ReportFilterBar' })

import type { ReportAnalyticsFilter } from '@/types/entity'

const props = defineProps<{
  modelValue: ReportAnalyticsFilter
  loading?: boolean
}>()

const emit = defineEmits<{
  search: []
  reset: []
}>()
</script>

<template>
  <el-card shadow="never" class="report-filter-bar">
    <el-form :model="props.modelValue" inline label-width="80px">
      <el-form-item label="开始日期">
        <el-date-picker
          v-model="props.modelValue.startDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="开始日期"
          style="width: 160px"
        />
      </el-form-item>
      <el-form-item label="结束日期">
        <el-date-picker
          v-model="props.modelValue.endDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="结束日期"
          style="width: 160px"
        />
      </el-form-item>
      <el-form-item label="粒度">
        <el-select v-model="props.modelValue.granularity" style="width: 120px">
          <el-option label="按天" value="day" />
          <el-option label="按周" value="week" />
          <el-option label="按月" value="month" />
        </el-select>
      </el-form-item>
      <el-form-item label="地块ID">
        <el-input-number v-model="props.modelValue.farmlandId" :min="1" controls-position="right" style="width: 140px" />
      </el-form-item>
      <el-form-item label="品种ID">
        <el-input-number v-model="props.modelValue.varietyId" :min="1" controls-position="right" style="width: 140px" />
      </el-form-item>
      <el-form-item label="执行人">
        <el-input-number v-model="props.modelValue.assigneeId" :min="1" controls-position="right" style="width: 140px" />
      </el-form-item>
      <el-form-item label="物料分类">
        <el-input v-model="props.modelValue.materialCategory" clearable placeholder="如：肥料" style="width: 160px" />
      </el-form-item>
      <el-form-item label="供应商">
        <el-input-number v-model="props.modelValue.supplierId" :min="1" controls-position="right" style="width: 140px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="props.loading" @click="emit('search')">查询</el-button>
        <el-button :disabled="props.loading" @click="emit('reset')">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<style scoped>
.report-filter-bar {
  margin-bottom: 16px;
}
</style>
