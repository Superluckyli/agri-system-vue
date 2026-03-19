export interface IotSensorMeta {
  key: string
  label: string
  unit: string
  color: string
}

interface IotTrendRecord {
  sensorType?: string
  value?: number | string
  createTime?: string
}

interface BuildIotTrendConfigParams {
  records: IotTrendRecord[]
  sensorMeta: IotSensorMeta[]
  timeRange: '24h' | '7d'
  selectedSensor: string
}

export const IOT_SENSOR_META: IotSensorMeta[] = [
  { key: 'temperature', label: '温度', unit: '°C', color: '#f56c6c' },
  { key: 'humidity', label: '湿度', unit: '%', color: '#409eff' },
  { key: 'light', label: '光照', unit: 'lx', color: '#e6a23c' },
  { key: 'soil_moisture', label: '土壤水分', unit: '%', color: '#67c23a' },
  { key: 'ph', label: 'pH', unit: '', color: '#909399' },
]

export function normalizeIotSensorType(sensorType?: string): string {
  const raw = (sensorType || '').toLowerCase().trim()
  if (raw === 'temperature' || raw === 'temp') return 'temperature'
  if (raw === 'humidity' || raw === 'air_humidity') return 'humidity'
  if (raw === 'light' || raw === 'illumination') return 'light'
  if (raw === 'soil_moisture' || raw === 'soilmoisture' || raw === 'moisture') return 'soil_moisture'
  if (raw === 'ph') return 'ph'
  return raw || 'unknown'
}

export function isSupportedIotSensorType(sensorType?: string): boolean {
  const normalized = normalizeIotSensorType(sensorType)
  return IOT_SENSOR_META.some((item) => item.key === normalized)
}

export function filterSupportedIotSensorRecords<T extends { sensorType?: string }>(records: T[]): T[] {
  return records.filter((item) => isSupportedIotSensorType(item.sensorType))
}

function parseTime(value?: string): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function toNumber(value: unknown): number | null {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function filterByTimeRange(records: IotTrendRecord[], timeRange: '24h' | '7d'): IotTrendRecord[] {
  const now = Date.now()
  const threshold = timeRange === '24h' ? now - 24 * 60 * 60 * 1000 : now - 7 * 24 * 60 * 60 * 1000
  return records.filter((item) => parseTime(item.createTime) >= threshold)
}

export function buildIotTrendConfig({
  records,
  sensorMeta,
  timeRange,
  selectedSensor,
}: BuildIotTrendConfigParams) {
  const supportedRecords = filterSupportedIotSensorRecords(records)
  const filteredByRange = filterByTimeRange(supportedRecords, timeRange)
  const sorted = [...filteredByRange].sort((a, b) => parseTime(a.createTime) - parseTime(b.createTime))
  const visibleMeta = sensorMeta.filter((item) => !selectedSensor || selectedSensor === item.key)

  const yAxis = sensorMeta.map((meta, index) => ({
    type: 'value' as const,
    name: meta.label,
    scale: true,
    show: false,
    position: index % 2 === 0 ? 'left' as const : 'right' as const,
    offset: Math.floor(index / 2) * 48,
  }))

  const series = visibleMeta
    .map((meta) => {
      const data = sorted
        .filter((item) => normalizeIotSensorType(item.sensorType) === meta.key)
        .map((item) => [parseTime(item.createTime), toNumber(item.value) ?? 0])

      return {
        name: meta.label,
        type: 'line' as const,
        smooth: true,
        showSymbol: false,
        emphasis: { focus: 'series' as const },
        yAxisIndex: sensorMeta.findIndex((item) => item.key === meta.key),
        data,
      }
    })
    .filter((item) => item.data.length > 0)

  return {
    color: sensorMeta.map((item) => item.color),
    tooltip: { trigger: 'axis' as const },
    legend: { top: 4 },
    grid: { left: 12, right: 12, bottom: 20, containLabel: true },
    xAxis: {
      type: 'time' as const,
      minInterval: 5 * 60 * 1000,
      axisLabel: { formatter: '{HH}:{mm}' },
    },
    yAxis,
    series,
  }
}
