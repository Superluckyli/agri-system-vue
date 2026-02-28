<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption, SetOptionOpts } from 'echarts'

const props = defineProps<{
  options: EChartsOption
  height?: string
  width?: string
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

function toPlainObject<T>(value: T): T {
  const raw = toRaw(value)
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(raw)
    }
  } catch {
    // Fallback below.
  }
  return JSON.parse(JSON.stringify(raw)) as T
}

function normalizeOption(option: EChartsOption): EChartsOption {
  const source = (option || {}) as Record<string, unknown>
  const normalized: Record<string, unknown> = toPlainObject(source)

  const rawSeries = normalized.series
  if (Array.isArray(rawSeries)) {
    normalized.series = rawSeries.filter(
      (item) => item && typeof item === 'object' && typeof (item as { type?: unknown }).type === 'string',
    )
  }

  const rawLegend = normalized.legend
  if (rawLegend && typeof rawLegend === 'object' && !Array.isArray(rawLegend)) {
    const legendObj = rawLegend as Record<string, unknown>
    const legendData = legendObj.data
    if (Array.isArray(legendData)) {
      legendObj.data = legendData.filter((name) => typeof name === 'string' && name.trim().length > 0)
    }
  }

  return normalized as EChartsOption
}

function safeSetOption(option: EChartsOption): void {
  if (!chartInstance) return

  try {
    const sanitized = normalizeOption(option)
    const setOpts: SetOptionOpts = {
      notMerge: true,
      lazyUpdate: true,
      silent: true,
    }
    chartInstance.setOption(sanitized, setOpts)
  } catch (error) {
    console.error('[BaseChart] render failed:', error)
  }
}

function initChart(): void {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  safeSetOption(props.options)
}

function resizeChart(): void {
  chartInstance?.resize()
}

onMounted(async () => {
  await nextTick()
  initChart()

  if (chartRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      resizeChart()
    })
    resizeObserver.observe(chartRef.value)
  } else {
    window.addEventListener('resize', resizeChart)
  }
})

watch(
  () => props.options,
  (newOption) => {
    safeSetOption(newOption)
  },
  { deep: true, flush: 'post' },
)

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  } else {
    window.removeEventListener('resize', resizeChart)
  }

  if (chartInstance) {
    try {
      if (!chartInstance.isDisposed()) {
        chartInstance.dispose()
      }
    } catch (error) {
      console.warn('[BaseChart] dispose failed:', error)
    } finally {
      chartInstance = null
    }
  }
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
