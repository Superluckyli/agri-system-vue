import { describe, expect, it, vi } from 'vitest'

import type { MaterialInfo, PurchaseOrder, PurchaseOrderItem } from '@/types/entity'
import {
  applyMaterialDefaultsToPurchaseItem,
  getLatestPurchaseOrderState,
  getLowStockPurchaseQuantity,
  getMaterialDefaultUnitPrice,
  mapLowStockMaterialsToPurchaseItems,
  saveDraftPurchaseOrderEdit,
  type EditablePurchaseItem,
} from '../purchaseOrderShared'

describe('saveDraftPurchaseOrderEdit', () => {
  it('updates both the order header and its items when editing a draft order', async () => {
    const updatePurchase = vi.fn<() => Promise<void>>().mockResolvedValue()
    const updatePurchaseItems = vi.fn<() => Promise<void>>().mockResolvedValue()

    const items: EditablePurchaseItem[] = [
      { materialId: 11, purchaseQty: 2, unitPrice: 8.5, lineAmount: 17 },
      { materialId: 12, purchaseQty: 4, unitPrice: 3.25, lineAmount: 13 },
    ]

    await saveDraftPurchaseOrderEdit(
      {
        id: 5,
        supplierId: 9,
        payMethod: 'bank_transfer',
        remark: 'updated',
        items,
      },
      { updatePurchase, updatePurchaseItems },
    )

    expect(updatePurchase).toHaveBeenCalledWith({
      id: 5,
      supplierId: 9,
      payMethod: 'bank_transfer',
      remark: 'updated',
    })
    expect(updatePurchaseItems).toHaveBeenCalledWith(5, [
      { materialId: 11, purchaseQty: 2, unitPrice: 8.5 },
      { materialId: 12, purchaseQty: 4, unitPrice: 3.25 },
    ])
  })
})

describe('getLatestPurchaseOrderState', () => {
  it('replaces the current order with the refreshed list version so totalAmount stays current', () => {
    const currentOrder: PurchaseOrder = { id: 8, orderNo: 'PO-8', totalAmount: 10, status: 'draft' }
    const latestOrders: PurchaseOrder[] = [
      { id: 8, orderNo: 'PO-8', totalAmount: 42, status: 'draft' },
    ]

    expect(
      getLatestPurchaseOrderState({
        currentOrder,
        latestOrders,
        latestItems: [],
      }),
    ).toEqual(latestOrders[0])
  })

  it('falls back to recalculating totalAmount from order items when the refreshed list is unavailable', () => {
    const currentOrder: PurchaseOrder = { id: 8, orderNo: 'PO-8', totalAmount: 10, status: 'draft' }
    const latestItems: PurchaseOrderItem[] = [
      { materialId: 1, lineAmount: 12.5 },
      { materialId: 2, lineAmount: 7.5 },
    ]

    expect(
      getLatestPurchaseOrderState({
        currentOrder,
        latestOrders: [],
        latestItems,
      }),
    ).toMatchObject({ id: 8, totalAmount: 20 })
  })
})

describe('getMaterialDefaultUnitPrice', () => {
  it('returns the material default price for the selected material', () => {
    const materials: MaterialInfo[] = [
      { materialId: 11, unitPrice: 12.8 },
      { materialId: 12, unitPrice: 6.5 },
    ]

    expect(getMaterialDefaultUnitPrice(12, materials)).toBe(6.5)
  })

  it('returns null when the material has no default price', () => {
    const materials: MaterialInfo[] = [{ materialId: 11 }]

    expect(getMaterialDefaultUnitPrice(11, materials)).toBeNull()
    expect(getMaterialDefaultUnitPrice(99, materials)).toBeNull()
  })
})

describe('applyMaterialDefaultsToPurchaseItem', () => {
  it('fills purchase item price from the material default price and recalculates line amount', () => {
    const item: EditablePurchaseItem = {
      materialId: 11,
      purchaseQty: 3,
      unitPrice: null,
      lineAmount: 0,
    }
    const materials: MaterialInfo[] = [{ materialId: 11, unitPrice: 4.2 }]

    expect(applyMaterialDefaultsToPurchaseItem(item, materials)).toEqual({
      materialId: 11,
      purchaseQty: 3,
      unitPrice: 4.2,
      lineAmount: 12.6,
    })
  })

  it('preserves an existing manual price when the selected material has no default price', () => {
    const item: EditablePurchaseItem = {
      materialId: 11,
      purchaseQty: 3,
      unitPrice: 8.5,
      lineAmount: 0,
    }
    const materials: MaterialInfo[] = [{ materialId: 11 }]

    expect(applyMaterialDefaultsToPurchaseItem(item, materials)).toEqual({
      materialId: 11,
      purchaseQty: 3,
      unitPrice: 8.5,
      lineAmount: 25.5,
    })
  })
})

describe('low-stock purchase mapping', () => {
  it('computes replenishment quantity from the safety threshold plus 30 percent', () => {
    expect(getLowStockPurchaseQuantity({ safeThreshold: 100, currentStock: 92 })).toBe(38)
  })

  it('uses ceiling when shortage is fractional', () => {
    expect(getLowStockPurchaseQuantity({ safeThreshold: 10, currentStock: 6.2 })).toBe(7)
  })

  it('clamps replenishment quantity to a minimum of 1', () => {
    expect(getLowStockPurchaseQuantity({ safeThreshold: 10, currentStock: 100 })).toBe(1)
  })

  it('maps low-stock materials into editable draft purchase items', () => {
    const lowStock: MaterialInfo[] = [
      { materialId: 11, safeThreshold: 100, currentStock: 92, unitPrice: 5.5 },
    ]

    expect(mapLowStockMaterialsToPurchaseItems(lowStock)).toEqual([
      { materialId: 11, purchaseQty: 38, unitPrice: 5.5, lineAmount: 209 },
    ])
  })

  it('keeps unit price null when missing and sets line amount to 0', () => {
    const lowStock: MaterialInfo[] = [
      { materialId: 22, safeThreshold: 50, currentStock: 10 },
    ]

    expect(mapLowStockMaterialsToPurchaseItems(lowStock)).toEqual([
      { materialId: 22, purchaseQty: 55, unitPrice: null, lineAmount: 0 },
    ])
  })
})
