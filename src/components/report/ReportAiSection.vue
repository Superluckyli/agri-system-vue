<script setup lang="ts">
import type { ReportAiDrawerSectionState } from '@/views/report/reportAiSummaryShared'

const props = withDefaults(defineProps<{
  section: ReportAiDrawerSectionState
  loading?: boolean
}>(), {
  loading: false,
})

function formatEvidenceValue(value?: string | number, unit?: string): string {
  if (value === undefined || value === null || value === '') {
    return unit ?? ''
  }
  return `${value}${unit ?? ''}`
}
</script>

<template>
  <section :data-testid="`report-ai-section-${props.section.key}`" class="report-ai-section">
    <div class="report-ai-section__header">
      <h3 class="report-ai-section__title">{{ props.section.label }}</h3>
    </div>

    <div v-if="props.loading" data-testid="report-ai-section-skeleton" class="report-ai-section__skeleton">
      <el-skeleton animated :rows="3" />
    </div>

    <p v-else-if="props.section.text" class="report-ai-section__text">
      {{ props.section.text }}
    </p>

    <p v-else class="report-ai-section__placeholder">正在生成分析内容...</p>

    <ul v-if="props.section.evidence.length" class="report-ai-section__evidence">
      <li
        v-for="(item, index) in props.section.evidence"
        :key="`${props.section.key}-${index}-${item.label ?? 'evidence'}`"
        class="report-ai-section__evidence-item"
      >
        <span class="report-ai-section__evidence-label">{{ item.label }}</span>
        <span class="report-ai-section__evidence-value">{{ formatEvidenceValue(item.value, item.unit) }}</span>
        <span v-if="item.detail" class="report-ai-section__evidence-detail">{{ item.detail }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.report-ai-section {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}

.report-ai-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.report-ai-section__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.report-ai-section__text,
.report-ai-section__placeholder {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #606266;
  white-space: pre-wrap;
}

.report-ai-section__placeholder {
  color: #909399;
}

.report-ai-section__skeleton {
  margin-top: 8px;
}

.report-ai-section__evidence {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.report-ai-section__evidence-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f7fa;
  font-size: 13px;
  color: #606266;
}

.report-ai-section__evidence-label {
  font-weight: 600;
  color: #303133;
}

.report-ai-section__evidence-value {
  color: #409eff;
}

.report-ai-section__evidence-detail {
  color: #909399;
}
</style>
