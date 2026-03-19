import { describe, expect, it } from 'vitest'

import {
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
