<script setup lang="ts">
const props = withDefaults(defineProps<{
  usable?: boolean
  loading?: boolean
  label?: string
}>(), {
  usable: false,
  loading: false,
  label: 'AI 解读',
})

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <div v-if="props.usable" class="report-ai-fab">
    <el-button
      data-testid="report-ai-fab"
      class="report-ai-fab__button"
      type="primary"
      circle
      :loading="props.loading"
      @click="emit('click')"
    >
      {{ props.label }}
    </el-button>
  </div>
</template>

<style scoped>
.report-ai-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2000;
}

.report-ai-fab__button {
  width: 56px;
  height: 56px;
  box-shadow: 0 12px 24px rgb(64 158 255 / 28%);
}
</style>
