<script setup lang="ts">
import { computed } from 'vue'

import ReportAiSection from './ReportAiSection.vue'
import { REPORT_AI_SECTION_ORDER } from '@/views/report/reportAiSummaryShared'
import type { ReportAiDrawerSectionState, ReportAiDrawerState } from '@/views/report/reportAiSummaryShared'
import type { ReportAiSummarySection } from '@/types/entity'

const props = withDefaults(defineProps<{
  visible: boolean
  status: ReportAiDrawerState['status']
  sections: Record<ReportAiSummarySection, ReportAiDrawerSectionState>
  error?: string
  title?: string
  width?: string | number
}>(), {
  error: '',
  title: 'AI 智能解读',
  width: '440px',
})

const emit = defineEmits<{
  close: []
  retry: []
  'update:visible': [value: boolean]
}>()

const orderedSections = computed(() => REPORT_AI_SECTION_ORDER.map(section => props.sections[section]))

function shouldShowLoading(section: ReportAiDrawerSectionState): boolean {
  if (props.status !== 'streaming') {
    return false
  }

  return !section.text && section.evidence.length === 0
}

function handleVisibleChange(value: boolean): void {
  emit('update:visible', value)
  if (!value) {
    emit('close')
  }
}

function handleClose(): void {
  emit('update:visible', false)
  emit('close')
}
</script>

<template>
  <el-drawer
    :model-value="props.visible"
    :size="props.width"
    :with-header="false"
    append-to-body
    class="report-ai-drawer"
    @update:model-value="handleVisibleChange"
  >
    <div class="report-ai-drawer__header">
      <div>
        <h2 class="report-ai-drawer__title">{{ props.title }}</h2>
        <p class="report-ai-drawer__subtitle">基于当前报表数据的结构化解读</p>
      </div>
      <el-button data-testid="report-ai-close" text @click="handleClose">关闭</el-button>
    </div>

    <div v-if="props.status === 'error'" class="report-ai-drawer__error" role="alert">
      <el-empty description="AI 解读生成失败">
        <template #description>
          <p class="report-ai-drawer__error-text">{{ props.error || '请稍后重试。' }}</p>
        </template>
        <el-button data-testid="report-ai-retry" type="primary" @click="emit('retry')">重试</el-button>
      </el-empty>
    </div>

    <div v-else class="report-ai-drawer__sections">
      <ReportAiSection
        v-for="section in orderedSections"
        :key="section.key"
        :section="section"
        :loading="shouldShowLoading(section)"
      />
    </div>
  </el-drawer>
</template>

<style scoped>
.report-ai-drawer :deep(.el-drawer__body) {
  padding: 0;
}

.report-ai-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 12px;
  border-bottom: 1px solid #ebeef5;
}

.report-ai-drawer__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.report-ai-drawer__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
}

.report-ai-drawer__sections {
  display: grid;
  gap: 12px;
  padding: 16px 20px 20px;
}

.report-ai-drawer__error {
  padding: 32px 20px;
}

.report-ai-drawer__error-text {
  margin: 0;
  color: #f56c6c;
}
</style>
