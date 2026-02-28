<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const props = defineProps<{
  options: EChartsOption
  height?: string
  width?: string
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    chartInstance.setOption(props.options)
  }
}

const resizeHandler = () => {
  chartInstance?.resize()
}

watch(
  () => props.options,
  (newVal) => {
    chartInstance?.setOption(newVal, true)
  },
  { deep: true }
)

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', resizeHandler)
})
</script>

<template>
  <div ref="chartRef" :style="{ height: height || '320px', width: width || '100%' }" />
</template>
