import { describe, expect, it } from 'vitest'
import {
  TASK_STATUS_V2,
  TASK_STATUS_MAP,
  TASK_PRIORITY,
  TASK_PRIORITY_MAP,
  FARMLAND_STATUS_MAP,
  SUPPLIER_STATUS_MAP,
  PURCHASE_STATUS_MAP,
  BATCH_STATUS_MAP,
} from '@/constants/task'

describe('TASK_STATUS_MAP', () => {
  it('should have an entry for every TASK_STATUS_V2 value', () => {
    const statusValues = Object.values(TASK_STATUS_V2)
    statusValues.forEach((status) => {
      expect(TASK_STATUS_MAP[status]).toBeDefined()
      expect(TASK_STATUS_MAP[status].text).toBeTruthy()
      expect(typeof TASK_STATUS_MAP[status].type).toBe('string')
    })
  })

  it('should cover 9 statuses', () => {
    expect(Object.keys(TASK_STATUS_MAP)).toHaveLength(9)
  })
})

describe('TASK_PRIORITY_MAP', () => {
  it('should map all priority values', () => {
    expect(TASK_PRIORITY_MAP[TASK_PRIORITY.HIGH].text).toBe('高')
    expect(TASK_PRIORITY_MAP[TASK_PRIORITY.MEDIUM].text).toBe('中')
    expect(TASK_PRIORITY_MAP[TASK_PRIORITY.LOW].text).toBe('低')
  })
})

describe('FARMLAND_STATUS_MAP', () => {
  it('should have 3 statuses', () => {
    expect(Object.keys(FARMLAND_STATUS_MAP)).toHaveLength(3)
  })

  it('should map 0=闲置, 1=使用中, 2=已停用', () => {
    expect(FARMLAND_STATUS_MAP[0].text).toBe('闲置')
    expect(FARMLAND_STATUS_MAP[1].text).toBe('使用中')
    expect(FARMLAND_STATUS_MAP[2].text).toBe('已停用')
  })
})

describe('SUPPLIER_STATUS_MAP', () => {
  it('should map 0=禁用, 1=正常', () => {
    expect(SUPPLIER_STATUS_MAP[0].text).toBe('禁用')
    expect(SUPPLIER_STATUS_MAP[1].text).toBe('正常')
  })
})

describe('PURCHASE_STATUS_MAP', () => {
  it('should have 6 statuses', () => {
    expect(Object.keys(PURCHASE_STATUS_MAP)).toHaveLength(6)
  })

  it('should include draft, confirmed, receiving, completed, cancelled', () => {
    expect(PURCHASE_STATUS_MAP['draft']).toBeDefined()
    expect(PURCHASE_STATUS_MAP['confirmed']).toBeDefined()
    expect(PURCHASE_STATUS_MAP['receiving']).toBeDefined()
    expect(PURCHASE_STATUS_MAP['completed']).toBeDefined()
    expect(PURCHASE_STATUS_MAP['cancelled']).toBeDefined()
  })
})

describe('BATCH_STATUS_MAP', () => {
  it('should have 6 batch statuses', () => {
    expect(Object.keys(BATCH_STATUS_MAP)).toHaveLength(6)
  })
})
