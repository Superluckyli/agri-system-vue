<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption, LineSeriesOption } from 'echarts'

import type { ChartDataVO, DashboardSeriesItem } from '@/types/entity'

const props = defineProps<{
  chartData: ChartDataVO | undefined
}>()

const chartEl = ref<HTMLDivElement>()

let chart: echarts.ECharts | null = null

function normalizeSeries(series: DashboardSeriesItem[] | undefined): LineSeriesOption[] {
  if (!series || series.length === 0) {
    return []
  }

  return series.map((item, index) => {
    const rawData = item.data
    const data = Array.isArray(rawData)
      ? rawData.map((value) => {
          if (typeof value === 'number' || typeof value === 'string') {
            return value
          }

          return 0
        })
      : []

    return {
      type: 'line',
      smooth: true,
      name: item.name || `序列${index + 1}`,
      data,
    }
  })
}

function buildOption(data: ChartDataVO | undefined): EChartsOption {
  const series = normalizeSeries(data?.series)

  if (!data || series.length === 0) {
    return {
      title: {
        text: '暂无趋势数据',
        left: 'center',
        top: 'middle',
        textStyle: {
          color: '#6e7b6a',
          fontWeight: 500,
          fontSize: 16,
        },
      },
      xAxis: {
        type: 'category',
        data: [],
      },
      yAxis: {
        type: 'value',
      },
      series: [],
    }
  }

  return {
    color: ['#2f8a4c', '#7d9f35', '#ca8e2f'],
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      top: 8,
    },
    grid: {
      left: 18,
      right: 18,
      top: 52,
      bottom: 16,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.xAxis ?? [],
      axisLine: {
        lineStyle: {
          color: '#c7d2bc',
        },
      },
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: '#e7ede0',
        },
      },
    },
    series,
  }
}

function renderChart(): void {
  if (!chart) {
    return
  }

  chart.setOption(buildOption(props.chartData), true)
}

function handleResize(): void {
  chart?.resize()
}

onMounted(() => {
  if (chartEl.value) {
    chart = echarts.init(chartEl.value)
    renderChart()
    window.addEventListener('resize', handleResize)
  }
})

watch(
  () => props.chartData,
  () => {
    renderChart()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="chartEl" class="trend-chart" />
</template>

<style scoped>
.trend-chart {
  width: 100%;
  height: 320px;
}
</style>
