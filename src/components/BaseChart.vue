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

const normalizeOption = (option: EChartsOption): EChartsOption => {
  const source = (option || {}) as Record<string, unknown>
  const normalized: Record<string, unknown> = { ...source }

  const rawSeries = source.series
  if (Array.isArray(rawSeries)) {
    normalized.series = rawSeries
      .filter((item) => !!item && typeof item === 'object' && typeof (item as { type?: unknown }).type === 'string')
      .map((item) => ({ ...(item as Record<string, unknown>) }))
  }

  const rawLegend = source.legend
  if (rawLegend && typeof rawLegend === 'object' && !Array.isArray(rawLegend)) {
    const legendObj = { ...(rawLegend as Record<string, unknown>) }
    const legendData = legendObj.data
    if (Array.isArray(legendData)) {
      legendObj.data = legendData.filter((name) => typeof name === 'string' && name.length > 0)
    }
    normalized.legend = legendObj
  }

  return normalized as EChartsOption
}

const safeSetOption = (option: EChartsOption, replaceMerge = false): void => {
  if (!chartInstance) {
    return
  }

  try {
    chartInstance.setOption(normalizeOption(option), replaceMerge)
  } catch (error) {
    console.error('Chart render failed:', error)
  }
}

const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    safeSetOption(props.options)
  }
}

const resizeHandler = () => {
  chartInstance?.resize()
}

watch(
  () => props.options,
  (newVal) => {
    safeSetOption(newVal, true)
  }
)

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  if (chartInstance) {
    try {
      if (!chartInstance.isDisposed()) {
        chartInstance.dispose()
      }
    } catch (error) {
      // Prevent chart dispose errors from interrupting route navigation.
      console.warn('Chart dispose failed during unmount:', error)
    } finally {
      chartInstance = null
    }
  }
  window.removeEventListener('resize', resizeHandler)
})
</script>

<template>
  <div ref="chartRef" class="base-chart" :style="{ height: height || '320px', width: width || '100%' }" />
</template>

<style scoped>
.base-chart {
  position: relative;
  z-index: 0;
  max-width: 100%;
  overflow: hidden;
}
</style>
