import { describe, expect, it } from 'vitest'

import {
  buildIotTrendConfig,
  IOT_SENSOR_META,
  filterSupportedIotSensorRecords,
  isSupportedIotSensorType,
  normalizeIotSensorType,
} from '../iotSensorShared'

describe('IOT_SENSOR_META', () => {
  it('only exposes the five supported sensor panels', () => {
    expect(IOT_SENSOR_META.map((item) => item.key)).toEqual([
      'temperature',
      'humidity',
      'light',
      'soil_moisture',
      'ph',
    ])
  })
})

describe('normalizeIotSensorType', () => {
  it('normalizes supported aliases but does not keep ec', () => {
    expect(normalizeIotSensorType('temp')).toBe('temperature')
    expect(normalizeIotSensorType('soilmoisture')).toBe('soil_moisture')
    expect(isSupportedIotSensorType('ec')).toBe(false)
  })
})

describe('filterSupportedIotSensorRecords', () => {
  it('filters unsupported sensor records out of the monitor dataset', () => {
    const filtered = filterSupportedIotSensorRecords([
      { sensorType: 'temperature' },
      { sensorType: 'light' },
      { sensorType: 'ec' },
    ])

    expect(filtered).toEqual([{ sensorType: 'temperature' }, { sensorType: 'light' }])
  })
})

describe('buildIotTrendConfig', () => {
  it('uses one y-axis per visible sensor and a 5-minute time interval', () => {
    const config = buildIotTrendConfig({
      records: [
        { sensorType: 'temperature', value: 18.5, createTime: '2026-03-19T10:00:00' },
        { sensorType: 'light', value: 1800, createTime: '2026-03-19T10:05:00' },
        { sensorType: 'ph', value: 6.1, createTime: '2026-03-19T10:10:00' },
      ],
      sensorMeta: IOT_SENSOR_META,
      timeRange: '24h',
      selectedSensor: '',
    })

    expect(config.xAxis.minInterval).toBe(5 * 60 * 1000)
    expect(Array.isArray(config.yAxis)).toBe(true)
    expect((config.yAxis as unknown[]).length).toBe(5)
    expect((config.series as Array<{ yAxisIndex: number }>).map((item) => item.yAxisIndex)).toEqual([0, 2, 4])
  })
})
