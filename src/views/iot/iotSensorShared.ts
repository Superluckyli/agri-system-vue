export interface IotSensorMeta {
  key: string
  label: string
  unit: string
  color: string
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
