<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    loading: boolean
    errorMessage: string
    empty: boolean
    emptyDescription?: string
    loadingRows?: number
  }>(),
  {
    emptyDescription: '暂无数据',
    loadingRows: 6,
  },
)

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div v-if="props.loading" class="page-state">
    <el-skeleton animated :rows="props.loadingRows" />
  </div>

  <div v-else-if="props.errorMessage" class="page-state" role="alert">
    <el-empty description="加载失败">
      <template #description>
        <p class="page-state__error">{{ props.errorMessage }}</p>
      </template>
      <el-button type="primary" @click="emit('retry')">重试</el-button>
    </el-empty>
  </div>

  <div v-else-if="props.empty" class="page-state">
    <el-empty :description="props.emptyDescription" />
  </div>

  <slot v-else />
</template>

<style scoped>
.page-state {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--agri-border);
  border-radius: 14px;
  background: var(--agri-surface-soft);
  padding: 16px;
}

.page-state__error {
  color: var(--agri-text);
  margin: 0;
}
</style>
