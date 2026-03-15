<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import type { EChartsOption, LineSeriesOption } from 'echarts'

import BaseChart from '@/components/BaseChart.vue'
import { listIotData } from '@/api/modules/iot'
import { useIotSse } from '@/composables/useIotSse'
import type { IotSensorData } from '@/types/entity'

type TimeRange = '24h' | '7d'

interface QueryParams {
  plotId: string
  sensorType: string
  timeRange: TimeRange
  pageNum: number
  pageSize: number
}

interface SensorMeta {
  key: string
  label: string
  unit: string
  color: string
}

const SENSOR_META: SensorMeta[] = [
  { key: 'temperature', label: '温度', unit: '°C', color: '#f56c6c' },
  { key: 'humidity', label: '湿度', unit: '%', color: '#409eff' },
  { key: 'light', label: '光照', unit: 'lx', color: '#e6a23c' },
  { key: 'soil_moisture', label: '土壤水分', unit: '%', color: '#67c23a' },
  { key: 'ph', label: 'pH', unit: '', color: '#909399' },
  { key: 'ec', label: 'EC', unit: 'mS/cm', color: '#8e44ad' },
]

const SENSOR_LABEL_MAP = SENSOR_META.reduce<Record<string, string>>((acc, item) => {
  acc[item.key] = item.label
  return acc
}, {})

const SENSOR_UNIT_MAP = SENSOR_META.reduce<Record<string, string>>((acc, item) => {
  acc[item.key] = item.unit
  return acc
}, {})

const queryParams = reactive<QueryParams>({
  plotId: '',
  sensorType: '',
  timeRange: '24h',
  pageNum: 1,
  pageSize: 10,
})

const loading = ref(false)
const loadError = ref('')
const usingMock = ref(false)
const dataTruncated = ref(false)

const overviewRecords = ref<IotSensorData[]>([])
const tableRecords = ref<IotSensorData[]>([])

// SSE 实时数据订阅
const { connected: sseConnected, latestData: sseLatestData, connect: sseConnect } = useIotSse()

const MAX_RECORDS = 1000

watch(sseLatestData, (newData) => {
  if (!newData) return
  // 追加到 overview 和 table，保持最大记录数限制
  overviewRecords.value = [newData, ...overviewRecords.value].slice(0, MAX_RECORDS)
  const matchesFilter =
    (!queryParams.sensorType || normalizeSensorType(newData.sensorType) === queryParams.sensorType) &&
    (!queryParams.plotId || newData.plotId === queryParams.plotId)
  if (matchesFilter) {
    tableRecords.value = [newData, ...tableRecords.value].slice(0, MAX_RECORDS)
  }
})

function normalizeSensorType(sensorType?: string): string {
  const raw = (sensorType || '').toLowerCase().trim()
  if (raw === 'temperature' || raw === 'temp') return 'temperature'
  if (raw === 'humidity' || raw === 'air_humidity') return 'humidity'
  if (raw === 'light' || raw === 'illumination') return 'light'
  if (raw === 'soil_moisture' || raw === 'soilmoisture' || raw === 'moisture') return 'soil_moisture'
  if (raw === 'ph') return 'ph'
  if (raw === 'ec') return 'ec'
  return raw || 'unknown'
}

function parseTime(value?: string): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

function toNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function filterByTimeRange(records: IotSensorData[], timeRange: TimeRange): IotSensorData[] {
  const now = Date.now()
  const threshold = timeRange === '24h' ? now - 24 * 60 * 60 * 1000 : now - 7 * 24 * 60 * 60 * 1000
  return records.filter((item) => parseTime(item.createTime) >= threshold)
}

function makeMockData(plotId: string): IotSensorData[] {
  const now = Date.now()
  const generated: IotSensorData[] = []
  const sensors = SENSOR_META.map((item) => item.key)
  let id = 1

  for (let hour = 0; hour < 72; hour += 1) {
    const ts = new Date(now - hour * 60 * 60 * 1000).toISOString()
    sensors.forEach((sensor) => {
      const value = (() => {
        switch (sensor) {
          case 'temperature':
            return 18 + Math.random() * 10
          case 'humidity':
            return 45 + Math.random() * 30
          case 'light':
            return 1200 + Math.random() * 800
          case 'soil_moisture':
            return 30 + Math.random() * 25
          case 'ph':
            return 5.8 + Math.random() * 1.2
          case 'ec':
            return 0.8 + Math.random() * 1.4
          default:
            return Math.random() * 100
        }
      })()

      generated.push({
        dataId: id++,
        plotId: plotId || 'PLOT-A01',
        sensorType: sensor,
        value: Number(value.toFixed(2)),
        unit: SENSOR_UNIT_MAP[sensor] || '',
        createTime: ts,
      })
    })
  }

  return generated
}

async function fetchIotData(): Promise<void> {
  loading.value = true
  loadError.value = ''
  usingMock.value = false
  dataTruncated.value = false

  try {
    const [overviewRes, tableRes] = await Promise.all([
      listIotData({
        pageNum: 1,
        pageSize: 500,
        plotId: queryParams.plotId || undefined,
      }),
      listIotData({
        pageNum: 1,
        pageSize: 500,
        plotId: queryParams.plotId || undefined,
        sensorType: queryParams.sensorType || undefined,
      }),
    ])

    overviewRecords.value = overviewRes.items || []
    tableRecords.value = tableRes.items || []

    dataTruncated.value =
      Number(overviewRes.total || 0) > overviewRecords.value.length ||
      Number(tableRes.total || 0) > tableRecords.value.length

    queryParams.pageNum = 1
  } catch (error) {
    if (import.meta.env.DEV) {
      const mock = makeMockData(queryParams.plotId)
      overviewRecords.value = mock
      tableRecords.value = queryParams.sensorType
        ? mock.filter((item) => normalizeSensorType(item.sensorType) === queryParams.sensorType)
        : mock
      usingMock.value = true
      queryParams.pageNum = 1
      ElMessage.warning('IoT接口不可用，已切换为开发环境Mock数据')
    } else {
      overviewRecords.value = []
      tableRecords.value = []
      loadError.value = error instanceof Error ? error.message : '加载IoT监测数据失败'
    }
  } finally {
    loading.value = false
  }
}

const latestMetrics = computed(() => {
  const sorted = [...overviewRecords.value].sort((a, b) => parseTime(b.createTime) - parseTime(a.createTime))
  return SENSOR_META.map((meta) => {
    const found = sorted.find((item) => normalizeSensorType(item.sensorType) === meta.key)
    const val = toNumber(found?.value)
    return {
      key: meta.key,
      label: meta.label,
      color: meta.color,
      unit: found?.unit || meta.unit,
      value: val !== null ? val.toFixed(meta.key === 'light' ? 0 : 2) : '--',
      time: found?.createTime || '-',
    }
  })
})

const chartOption = computed<EChartsOption>(() => {
  const filtered = filterByTimeRange(overviewRecords.value, queryParams.timeRange)
  const sorted = [...filtered].sort((a, b) => parseTime(a.createTime) - parseTime(b.createTime))

  const series: LineSeriesOption[] = SENSOR_META
    .filter((meta) => !queryParams.sensorType || queryParams.sensorType === meta.key)
    .map((meta) => {
      const data: Array<[number, number]> = sorted
        .filter((item) => normalizeSensorType(item.sensorType) === meta.key)
        .map((item) => [parseTime(item.createTime), toNumber(item.value) ?? 0])
      return {
        name: meta.label,
        type: 'line' as const,
        smooth: true,
        showSymbol: false,
        emphasis: { focus: 'series' as const },
        data,
      }
    })
    .filter((item) => item.data.length > 0)

  return {
    color: SENSOR_META.map((item) => item.color),
    tooltip: { trigger: 'axis' },
    legend: { top: 4 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'time' },
    yAxis: { type: 'value' },
    series,
  }
})

const filteredTableRecords = computed(() => {
  const byTime = filterByTimeRange(tableRecords.value, queryParams.timeRange)
  return byTime.sort((a, b) => parseTime(b.createTime) - parseTime(a.createTime))
})

const tableTotal = computed(() => filteredTableRecords.value.length)

const pagedTableRecords = computed(() => {
  const start = (queryParams.pageNum - 1) * queryParams.pageSize
  return filteredTableRecords.value.slice(start, start + queryParams.pageSize)
})

function formatSensorType(sensorType?: string): string {
  const key = normalizeSensorType(sensorType)
  return SENSOR_LABEL_MAP[key] || sensorType || '-'
}

function formatSensorUnit(sensorType?: string, unit?: string): string {
  const key = normalizeSensorType(sensorType)
  return unit || SENSOR_UNIT_MAP[key] || '-'
}

function handleQuery(): void {
  void fetchIotData()
}

function resetQuery(): void {
  queryParams.plotId = ''
  queryParams.sensorType = ''
  queryParams.timeRange = '24h'
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  void fetchIotData()
}

function handleSizeChange(size: number): void {
  queryParams.pageSize = size
  queryParams.pageNum = 1
}

function handleCurrentChange(page: number): void {
  queryParams.pageNum = page
}

onMounted(() => {
  void fetchIotData()
  sseConnect()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <div class="title">IoT 监测数据看板</div>
            <div class="subtitle">实时环境指标、趋势分析与监测数据明细</div>
          </div>
          <div class="sse-status">
            <span class="sse-dot" :class="{ 'sse-online': sseConnected }" />
            <span class="sse-label">{{ sseConnected ? '实时连接中' : '离线' }}</span>
          </div>
        </div>
      </template>

      <el-form :model="queryParams" inline label-width="88px">
        <el-form-item label="地块编号">
          <el-input
            v-model="queryParams.plotId"
            placeholder="请输入地块编号"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="传感器类型">
          <el-select v-model="queryParams.sensorType" placeholder="全部类型" clearable style="width: 180px">
            <el-option v-for="item in SENSOR_META" :key="item.key" :label="item.label" :value="item.key" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="queryParams.timeRange" style="width: 150px">
            <el-option label="近24小时" value="24h" />
            <el-option label="近7天" value="7d" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="usingMock" type="warning" :closable="false" style="margin-bottom: 12px">
        <template #title>
          当前为开发环境 Mock 数据。TODO：后端稳定后仅保留 `/iot/data/list` 实时数据链路。
        </template>
      </el-alert>

      <el-alert v-if="dataTruncated" type="info" :closable="false" style="margin-bottom: 12px">
        <template #title>
          监测数据总量超过 500 条，当前仅展示最近抓取的 500 条用于图表与表格分析。
        </template>
      </el-alert>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchIotData">点击重试</el-button>
      </el-alert>

      <el-row :gutter="12" class="metric-row">
        <el-col v-for="item in latestMetrics" :key="item.key" :xs="12" :sm="8" :lg="4">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-label">{{ item.label }}</div>
            <div class="metric-value" :style="{ color: item.color }">
              {{ item.value }} <span class="metric-unit">{{ item.unit }}</span>
            </div>
            <div class="metric-time">{{ item.time }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="chart-card">
        <template #header>
          <div class="inner-title">趋势图（{{ queryParams.timeRange === '24h' ? '近24小时' : '近7天' }}）</div>
        </template>
        <el-empty
          v-if="!loading && (!chartOption.series || (Array.isArray(chartOption.series) && chartOption.series.length === 0))"
          description="暂无趋势数据"
        />
        <BaseChart v-else :options="chartOption" height="360px" />
      </el-card>

      <el-card shadow="never" class="table-card">
        <template #header>
          <div class="inner-title">传感器数据明细</div>
        </template>
        <el-table v-loading="loading" :data="pagedTableRecords" style="width: 100%">
          <el-table-column label="数据ID" prop="dataId" width="90" align="center" />
          <el-table-column label="地块编号" prop="plotId" width="140" align="center" />
          <el-table-column label="传感器类型" min-width="140">
            <template #default="scope">
              {{ formatSensorType(scope.row.sensorType) }}
            </template>
          </el-table-column>
          <el-table-column label="数值" width="140" align="center">
            <template #default="scope">
              {{ scope.row.value ?? '-' }} {{ formatSensorUnit(scope.row.sensorType, scope.row.unit) }}
            </template>
          </el-table-column>
          <el-table-column label="采集时间" prop="createTime" min-width="180" />
          <template #empty>
            <el-empty description="暂无监测数据" />
          </template>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-show="tableTotal > 0"
            v-model:current-page="queryParams.pageNum"
            v-model:page-size="queryParams.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="tableTotal"
            background
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </el-card>
  </div>
</template>

<style scoped>
.app-container {
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-header .subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.sse-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  background: #f5f7fa;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.sse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c0c4cc;
}

.sse-dot.sse-online {
  background: #67c23a;
  box-shadow: 0 0 4px rgba(103, 194, 58, 0.6);
}

.metric-row {
  margin-bottom: 12px;
}

.metric-card {
  min-height: 110px;
}

.metric-label {
  color: #909399;
  font-size: 13px;
}

.metric-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.metric-unit {
  font-size: 12px;
  font-weight: 400;
}

.metric-time {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.chart-card {
  margin-bottom: 12px;
}

.table-card {
  margin-bottom: 4px;
}

.inner-title {
  font-size: 15px;
  color: #303133;
  font-weight: 600;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
